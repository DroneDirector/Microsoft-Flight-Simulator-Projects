// The app on Windows. The PC app serves the same app the phone runs (from the "app" folder next to the
// .exe) to this PC only, and opens it in its own window using Microsoft Edge in app mode (installed on
// every Windows 10 and 11 PC): no browser bars, its own saved data, window, borderless or full screen.
// The app on this PC talks straight to Flight Simulator through the PC app, so no phone is needed; a
// phone can still be linked at the same time.
//
// Also here: backups to Documents\Airline Manager Pro (they survive reinstalling), the list of graphics
// cards with a choice of which one the app window uses, and the window settings.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as http from 'http';
import { spawn, execFile } from 'child_process';
import * as https from 'https';
import { saveFlightPlan } from './installed';
import { LINK_PORT } from './protocol';

const TYPES: { [ext: string]: string } = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.bin': 'application/octet-stream', '.wasm': 'application/wasm', '.mjs': 'text/javascript; charset=utf-8', '.onnx': 'application/octet-stream', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

export interface DesktopPrefs { open: boolean; mode: 'window' | 'borderless' | 'fullscreen'; gpu: 'auto' | 'high' | 'low'; width: number; height: number }
const DEFAULTS: DesktopPrefs = { open: true, mode: 'window', gpu: 'auto', width: 1600, height: 900 };

export class Desktop {
  prefs: DesktopPrefs;
  private file: string;
  constructor(private dataDir: string) {
    this.file = path.join(dataDir, 'desktop.json');
    try { this.prefs = Object.assign({}, DEFAULTS, JSON.parse(fs.readFileSync(this.file, 'utf8'))); } catch (e) { this.prefs = Object.assign({}, DEFAULTS); }
  }
  save() { try { fs.writeFileSync(this.file, JSON.stringify(this.prefs, null, 2)); } catch (e) { /* read-only */ } }

  /** Where the app's files are: next to the .exe when packaged, the web build when run from source. */
  appDir(): string {
    for (const p of [path.join(path.dirname(process.execPath), 'app'), path.join(__dirname, '..', '..', 'www')]) if (fs.existsSync(path.join(p, 'index.html'))) return p;
    return '';
  }

  backupDir(): string { return path.join(os.homedir(), 'Documents', 'Airline Manager Pro'); }

  /** HTTP requests for the app on this PC. Returns true when handled. Only this PC may use them. */
  handle(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    const ip = String(req.socket.remoteAddress || '').replace('::ffff:', '');
    if (ip !== '127.0.0.1' && ip !== '::1') return false;
    const url = (req.url || '/').split('?')[0];
    if (url === '/api/desktop') return this.api(req, res), true;
    if (url === '/api/backup') return this.backup(req, res), true;
    if (url === '/api/gpus') { listGpus().then(g => json(res, { gpus: g })); return true; }
    if (url === '/api/device') { machineId().then(id => json(res, { id, name: os.hostname() })); return true; }
    if (url === '/api/licence') return this.licence(req, res), true;
    if (url === '/api/fetch') return relay(req, res), true;
    if (url === '/api/voicepack') return this.voicePack(req, res), true;
    if (url.indexOf('/voicepack/') === 0) {
      const f = path.join(this.voiceDir(), path.basename(decodeURIComponent(url.slice(11))));
      if (!fs.existsSync(f) || /\.part$/.test(f)) { res.writeHead(404); res.end(); return true; }
      res.writeHead(200, isolate({ 'Content-Type': 'application/octet-stream', 'Content-Length': String(fs.statSync(f).size), 'Cache-Control': 'no-cache' }));
      fs.createReadStream(f).pipe(res); return true;
    }
    if (url === '/api/flightplan') return readBody(req, b => { try { const p = JSON.parse(b); json(res, { ok: true, path: saveFlightPlan(p.name, p.text) }); } catch (e: any) { json(res, { ok: false, error: String(e && e.message || e) }); } }), true;
    const dir = this.appDir(); if (!dir) return false;
    let rel = decodeURIComponent(url === '/' ? '/index.html' : url);
    const file = path.normalize(path.join(dir, rel));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
    res.writeHead(200, isolate({ 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' }));
    fs.createReadStream(file).pipe(res);
    return true;
  }

  private api(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method === 'PUT') return readBody(req, b => { try { const p = JSON.parse(b); for (const k of Object.keys(DEFAULTS)) if (k in p) (this.prefs as any)[k] = p[k]; this.save(); } catch (e) { /* ignore */ } json(res, this.prefs); });
    json(res, Object.assign({ desktop: true, backupDir: this.backupDir() }, this.prefs));
  }

  /** The registration, kept by the PC app too, so it survives clearing the app window's data. */
  private licence(req: http.IncomingMessage, res: http.ServerResponse) {
    const f = path.join(this.dataDir, 'registration.json');
    if (req.method === 'PUT') return readBody(req, b => { try { const l = JSON.parse(b); if (l && l.fp) fs.writeFileSync(f, JSON.stringify(l)); json(res, { ok: true }); } catch (e) { res.writeHead(400); res.end(); } });
    try { json(res, JSON.parse(fs.readFileSync(f, 'utf8'))); } catch (e) { json(res, {}); }
  }

  private backup(req: http.IncomingMessage, res: http.ServerResponse) {
    const dir = this.backupDir(), f = path.join(dir, 'backup.json');
    if (req.method === 'PUT') return readBody(req, b => {
      try {
        JSON.parse(b);
        fs.mkdirSync(dir, { recursive: true });
        if (fs.existsSync(f)) fs.copyFileSync(f, path.join(dir, 'backup-previous.json'));
        fs.writeFileSync(f + '.tmp', b); fs.renameSync(f + '.tmp', f);
        json(res, { ok: true, at: Date.now(), dir });
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    if (!fs.existsSync(f)) return json(res, { data: '' });
    json(res, { data: fs.readFileSync(f, 'utf8'), at: fs.statSync(f).mtimeMs, dir });
  }

  /* ---------- Voices: the voice pack, downloaded once into the PC app's data folder ---------- */
  voiceDir(): string { const d = path.join(this.dataDir, 'voice'); fs.mkdirSync(d, { recursive: true }); return d; }
  private vp = { busy: false, done: 0, total: 0, file: '', error: '', cancel: false };
  private voicePack(req: http.IncomingMessage, res: http.ServerResponse) {
    const dir = this.voiceDir();
    const files = () => { const o: any = {}; for (const f of fs.readdirSync(dir)) if (!/\.part$/.test(f)) o[f] = fs.statSync(path.join(dir, f)).size; return o; };
    if (req.method === 'DELETE') { this.vp.cancel = true; for (const f of fs.readdirSync(dir)) try { fs.unlinkSync(path.join(dir, f)); } catch (e) { /* in use */ } return json(res, { ok: true }); }
    if (req.method === 'POST') return readBody(req, b => {
      let o: any; try { o = JSON.parse(b); } catch (e) { res.writeHead(400); res.end(); return; }
      const base = String(o.base || ''), list: [string, number][] = (o.files || []).filter((x: any) => Array.isArray(x) && typeof x[0] === 'string' && !/[\\/]|\.\./.test(x[0]));
      if (!/^https:\/\/github\.com\/DroneDirector\//.test(base)) { res.writeHead(403); res.end('Address not allowed'); return; }
      if (!this.vp.busy) this.downloadVoices(base, list);
      json(res, { ok: true });
    });
    json(res, Object.assign({ files: files() }, this.vp));
  }
  private async downloadVoices(base: string, list: [string, number][]) {
    const dir = this.voiceDir(), vp = this.vp;
    Object.assign(vp, { busy: true, done: 0, total: list.reduce((t, x) => t + (+x[1] || 0), 0), error: '', cancel: false });
    try {
      for (const [name, size] of list) {
        if (vp.cancel) break;
        const f = path.join(dir, name);
        if (fs.existsSync(f) && fs.statSync(f).size === size) { vp.done += size; continue; }
        vp.file = name;
        await getFile(base + name, f + '.part', n => { vp.done += n; }, () => vp.cancel);
        if (vp.cancel) { try { fs.unlinkSync(f + '.part'); } catch (e) { /* gone */ } break; }
        if (fs.statSync(f + '.part').size !== size) throw new Error(name + ' was cut off');
        fs.renameSync(f + '.part', f);
      }
    } catch (e: any) { vp.error = String(e && e.message || e); }
    vp.busy = false; vp.file = '';
  }

  /** Open the app window (Microsoft Edge in app mode, falling back to Chrome or the default browser). */
  openWindow() {
    const url = `http://127.0.0.1:${LINK_PORT}/`;
    const profile = path.join(this.dataDir, 'window');
    const args = [`--app=${url}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-features=Translate,msUndersideButton',
      `--window-size=${this.prefs.width},${this.prefs.height}`, '--autoplay-policy=no-user-gesture-required'];
    if (this.prefs.mode === 'borderless') args.push('--start-fullscreen');
    if (this.prefs.mode === 'fullscreen') args.push('--kiosk', '--edge-kiosk-type=fullscreen');
    if (this.prefs.gpu === 'high') args.push('--force_high_performance_gpu');
    if (this.prefs.gpu === 'low') args.push('--force_low_power_gpu');
    const pf = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', pf2 = process.env.ProgramFiles || 'C:\\Program Files', la = process.env.LOCALAPPDATA || '';
    const candidates = [path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(pf2, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf2, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(la, 'Google', 'Chrome', 'Application', 'chrome.exe')];
    const exe = candidates.filter(c => c && fs.existsSync(c))[0];
    try {
      if (exe) spawn(exe, args, { detached: true, stdio: 'ignore' }).unref();
      else if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
      return !!exe;
    } catch (e) { return false; }
  }
}

/** The app window may use several processor cores for the voices (cross-origin isolation). */
function isolate(h: any) { return Object.assign(h, { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' }); }

/** Download a file over HTTPS, following redirects (GitHub hands downloads on to its file servers). */
function getFile(url: string, to: string, onData: (n: number) => void, stop: () => boolean, hops = 0): Promise<void> {
  return new Promise((ok, bad) => {
    https.get(url, { headers: { 'User-Agent': 'AirlineManagerPro' }, timeout: 60000 }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && hops < 5) { r.resume(); getFile(new URL(r.headers.location, url).toString(), to, onData, stop, hops + 1).then(ok, bad); return; }
      if (r.statusCode !== 200) { r.resume(); bad(new Error('the server answered ' + r.statusCode)); return; }
      const out = fs.createWriteStream(to);
      r.on('data', (d: Buffer) => { onData(d.length); if (stop()) { r.destroy(); out.end(); ok(); } });
      r.pipe(out); out.on('finish', () => ok()); out.on('error', bad); r.on('error', bad);
    }).on('error', bad).on('timeout', function (this: any) { this.destroy(new Error('timeout')); });
  });
}

function json(res: http.ServerResponse, o: any) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); }
function readBody(req: http.IncomingMessage, cb: (b: string) => void) { const parts: Buffer[] = []; let n = 0; req.on('data', d => { n += d.length; if (n < 50e6) parts.push(d); }); req.on('end', () => cb(Buffer.concat(parts).toString('utf8'))); }

/** The online services the app works with (SimBrief, weather, VATSIM, IVAO, Hoppie ACARS, Discord),
 *  requested by the PC app for the app window. Only these addresses, only over HTTPS. */
const RELAY_HOSTS = ['www.simbrief.com', 'simbrief.com', 'aviationweather.gov', 'data.vatsim.net', 'api.ivao.aero', 'www.hoppie.nl', 'discord.com', 'discordapp.com'];
function relay(req: http.IncomingMessage, res: http.ServerResponse) {
  readBody(req, b => {
    let o: any; try { o = JSON.parse(b); } catch (e) { res.writeHead(400); res.end('Bad request'); return; }
    const go = (u: string, hops: number) => {
      let url: URL; try { url = new URL(u); } catch (e) { res.writeHead(400); res.end('Bad address'); return; }
      if (url.protocol !== 'https:' || RELAY_HOSTS.indexOf(url.hostname) < 0) { res.writeHead(403); res.end('Address not allowed'); return; }
      const method = String(o.method || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET';
      const headers: any = { 'User-Agent': 'AirlineManagerPro', Accept: '*/*' };
      if (o.headers && o.headers['Content-Type']) headers['Content-Type'] = String(o.headers['Content-Type']);
      const r = https.request(url, { method, headers, timeout: 20000 }, up => {
        if (up.statusCode >= 300 && up.statusCode < 400 && up.headers.location && hops < 3) { up.resume(); go(new URL(up.headers.location, url).toString(), hops + 1); return; }
        const parts: Buffer[] = []; let n = 0;
        up.on('data', (d: Buffer) => { n += d.length; if (n < 40e6) parts.push(d); });
        up.on('end', () => { res.writeHead(up.statusCode || 502, { 'Content-Type': String(up.headers['content-type'] || 'text/plain'), 'Cache-Control': 'no-store' }); res.end(Buffer.concat(parts)); });
      });
      r.on('timeout', () => r.destroy(new Error('timeout')));
      r.on('error', (e: any) => { if (!res.headersSent) { res.writeHead(502); res.end(String(e && e.message || e)); } });
      if (method === 'POST' && o.body) r.write(String(o.body));
      r.end();
    };
    go(String(o.url || ''), 0);
  });
}

/** Graphics cards in this PC, from Windows. */
let _gpus: any[] = null;
export function listGpus(): Promise<{ name: string; vendor: string; kind: 'integrated' | 'dedicated' | 'other'; vramMb: number }[]> {
  if (_gpus) return Promise.resolve(_gpus);
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve([]);
    execFile('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object Name,AdapterCompatibility,AdapterRAM | ConvertTo-Json -Compress'], { timeout: 8000, windowsHide: true }, (err, out) => {
      if (err) return resolve([]);
      try {
        let a = JSON.parse(String(out || '[]')); if (!Array.isArray(a)) a = [a];
        _gpus = a.filter((g: any) => g && g.Name && !/basic display|remote|virtual|parsec|meta/i.test(g.Name)).map((g: any) => {
          const name = String(g.Name).trim(), vendor = String(g.AdapterCompatibility || '').trim();
          const kind = /intel/i.test(name + vendor) && !/arc/i.test(name) ? 'integrated' : /radeon\(tm\) graphics|vega \d+ graphics|680m|780m|890m/i.test(name) ? 'integrated' : /nvidia|geforce|rtx|gtx|quadro|radeon|arc/i.test(name + vendor) ? 'dedicated' : 'other';
          return { name, vendor, kind, vramMb: Math.round((Number(g.AdapterRAM) || 0) / 1048576) };
        });
        resolve(_gpus);
      } catch (e) { resolve([]); }
    });
  });
}

/** Windows' own ID for this installation (new when Windows is installed again), or the network cards' addresses. */
let _machineId: Promise<string> = null;
export function machineId(): Promise<string> {
  if (_machineId) return _machineId;
  const fallback = () => os.hostname() + '|' + Object.values(os.networkInterfaces()).reduce((a: any[], l) => a.concat(l || []), []).filter((n: any) => !n.internal && n.mac && n.mac !== '00:00:00:00:00:00').map((n: any) => n.mac).sort().join(',');
  _machineId = new Promise(ok => {
    if (process.platform !== 'win32') return ok(fallback());
    execFile('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', '/reg:64'], { windowsHide: true, timeout: 5000 }, (err, out) => {
      const m = /MachineGuid\s+REG_SZ\s+([0-9a-f-]+)/i.exec(String(out || ''));
      ok(m ? 'win:' + m[1].toLowerCase() : fallback());
    });
  });
  return _machineId;
}
