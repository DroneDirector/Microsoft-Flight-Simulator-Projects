// Local Wi-Fi link to the phone: a small WebSocket server (RFC 6455, no extra libraries),
// UDP discovery replies, and pairing with a 6-digit code.

import * as http from 'http';
import * as dgram from 'dgram';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { LINK_PORT, DISCOVERY_PORT, PROTOCOL_VERSION, ToPc, ToPhone } from './protocol';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class Client extends EventEmitter {
  paired = false; device = ''; alive = true;
  private buf = Buffer.alloc(0);
  private frags: Buffer[] = [];
  constructor(public sock: any, public ip: string) {
    super();
    sock.setNoDelay(true);
    sock.on('data', (d: Buffer) => this.onData(d));
    sock.on('close', () => { this.alive = false; this.emit('close'); });
    sock.on('error', () => { this.alive = false; try { sock.destroy(); } catch (e) { /* gone */ } });
  }
  send(m: ToPhone) { this.sendText(JSON.stringify(m)); }
  sendText(text: string) {
    if (!this.alive) return;
    const payload = Buffer.from(text, 'utf8'), n = payload.length;
    const head = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 0x81; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
    try { this.sock.write(Buffer.concat([head, payload])); } catch (e) { this.alive = false; }
  }
  close() { try { this.sock.write(Buffer.from([0x88, 0])); this.sock.end(); } catch (e) { /* gone */ } }

  private onData(d: Buffer) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1], op = b0 & 15, fin = (b0 & 128) !== 0, masked = (b1 & 128) !== 0;
      let len = b1 & 127, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) { this.sock.destroy(); return; }
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.slice(off + (masked ? 4 : 0), need);
      if (masked) { const k = this.buf.slice(off, off + 4); payload = Buffer.from(payload.map((x, i) => x ^ k[i & 3])); }
      this.buf = this.buf.slice(need);
      if (op === 8) { this.close(); return; }
      if (op === 9) { try { this.sock.write(Buffer.concat([Buffer.from([0x8A, payload.length]), payload])); } catch (e) { /* gone */ } continue; }
      if (op === 10) continue;
      if (op === 1 || op === 0) {
        this.frags.push(payload);
        if (fin) { const text = Buffer.concat(this.frags).toString('utf8'); this.frags = []; try { this.emit('message', JSON.parse(text)); } catch (e) { /* not JSON */ } }
      }
    }
  }
}

interface Paired { token: string; device: string; since: number }

export class LinkServer extends EventEmitter {
  clients: Client[] = [];
  code = '';
  pcName = os.hostname();
  private http: http.Server = null;
  private udp: dgram.Socket = null;
  private devices: Paired[] = [];
  private store: string;
  /** Extra HTTP handler (the app on this PC); returns true when it answered. */
  web: (req: http.IncomingMessage, res: http.ServerResponse) => boolean = null;

  constructor(dataDir: string, public version: string) {
    super();
    this.store = path.join(dataDir, 'paired-devices.json');
    try { this.devices = JSON.parse(fs.readFileSync(this.store, 'utf8')); } catch (e) { this.devices = []; }
    this.newCode();
  }

  newCode() { this.code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); this.emit('code', this.code); }
  get pairedDevices(): Paired[] { return this.devices.slice(); }
  forget(token: string) { this.devices = this.devices.filter(d => d.token !== token); this.saveDevices(); }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http = http.createServer((req, res) => {
        if (req.url === '/info') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(this.info()));
        } else if (!(this.web && this.web(req, res))) { res.writeHead(404); res.end(); }
      });
      this.http.on('upgrade', (req, sock) => {
        const key = req.headers['sec-websocket-key'];
        if (!key || req.headers.upgrade !== 'websocket') { sock.destroy(); return; }
        const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
        sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
        const ip = String(req.socket.remoteAddress || '').replace('::ffff:', '');
        const c = new Client(sock, ip);
        this.clients.push(c);
        c.send({ type: 'welcome', pcName: this.pcName, version: this.version, protocol: PROTOCOL_VERSION, paired: false });
        c.on('message', (m: ToPc) => this.onMessage(c, m));
        c.on('close', () => { this.clients = this.clients.filter(x => x !== c); this.emit('clients', this.pairedClients().length); });
      });
      this.http.on('error', reject);
      this.http.listen(LINK_PORT, '0.0.0.0', () => resolve());
      // discovery: phones broadcast "AMP?" and get our details back
      this.udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.udp.on('message', (msg, rinfo) => {
        if (msg.toString('utf8', 0, 4) !== 'AMP?') return;
        const reply = Buffer.from('AMP!' + JSON.stringify(Object.assign(this.info(), { ip: localAddressFor(rinfo.address) })));
        this.udp.send(reply, rinfo.port, rinfo.address);
      });
      this.udp.on('error', () => { /* port in use: manual connection still works */ });
      this.udp.bind(DISCOVERY_PORT, '0.0.0.0');
    });
  }

  stop() { this.clients.forEach(c => c.close()); try { this.http.close(); this.udp.close(); } catch (e) { /* closed */ } }

  info() { return { app: 'Airline Manager Pro', pcName: this.pcName, version: this.version, protocol: PROTOCOL_VERSION, port: LINK_PORT, addresses: localAddresses() }; }

  broadcast(m: ToPhone) { const t = JSON.stringify(m); for (const c of this.pairedClients()) c.sendText(t); }
  pairedClients(): Client[] { return this.clients.filter(c => c.paired && c.alive); }

  private onMessage(c: Client, m: ToPc) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'hello') {
      c.device = String(m.device || 'Phone').slice(0, 60);
      // the app window on this same PC is trusted without a code
      if ((m as any).local && (c.ip === '127.0.0.1' || c.ip === '::1')) { c.paired = true; c.device = 'This PC'; c.send({ type: 'pair-result', ok: true, token: 'local' }); this.emit('paired', c); this.emit('clients', this.pairedClients().length); return; }
      if (m.token && this.devices.some(d => d.token === m.token)) { c.paired = true; c.send({ type: 'pair-result', ok: true, token: m.token }); this.emit('paired', c); }
    } else if (m.type === 'pair') {
      if (String(m.code).replace(/\D/g, '') === this.code) {
        const token = crypto.randomBytes(24).toString('hex');
        this.devices.push({ token, device: String(m.device || 'Phone').slice(0, 60), since: Date.now() });
        this.saveDevices();
        c.paired = true; c.device = String(m.device || 'Phone');
        c.send({ type: 'pair-result', ok: true, token });
        this.newCode();
        this.emit('paired', c);
      } else c.send({ type: 'pair-result', ok: false, reason: 'That code doesn\'t match. Check the code shown on the PC.' });
    } else if (m.type === 'ping') c.send({ type: 'pong', t: m.t });
    else if (c.paired) this.emit('message', c, m);
    this.emit('clients', this.pairedClients().length);
  }

  private saveDevices() { try { fs.mkdirSync(path.dirname(this.store), { recursive: true }); fs.writeFileSync(this.store, JSON.stringify(this.devices, null, 2)); } catch (e) { /* read-only */ } }
}

export function localAddresses(): string[] {
  const out: string[] = [];
  const ifs = os.networkInterfaces();
  for (const k of Object.keys(ifs)) for (const a of ifs[k] || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  return out;
}
function localAddressFor(remote: string): string {
  const r = remote.split('.').slice(0, 3).join('.');
  return localAddresses().filter(a => a.split('.').slice(0, 3).join('.') === r)[0] || localAddresses()[0] || '';
}
