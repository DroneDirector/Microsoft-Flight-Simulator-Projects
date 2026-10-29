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
import { LINK_PORT } from './protocol';

const TYPES: { [ext: string]: string } = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
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
    const dir = this.appDir(); if (!dir) return false;
    let rel = decodeURIComponent(url === '/' ? '/index.html' : url);
    const file = path.normalize(path.join(dir, rel));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
    return true;
  }

  private api(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method === 'PUT') return readBody(req, b => { try { const p = JSON.parse(b); for (const k of Object.keys(DEFAULTS)) if (k in p) (this.prefs as any)[k] = p[k]; this.save(); } catch (e) { /* ignore */ } json(res, this.prefs); });
    json(res, Object.assign({ desktop: true, backupDir: this.backupDir() }, this.prefs));
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

function json(res: http.ServerResponse, o: any) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); }
function readBody(req: http.IncomingMessage, cb: (b: string) => void) { const parts: Buffer[] = []; let n = 0; req.on('data', d => { n += d.length; if (n < 50e6) parts.push(d); }); req.on('end', () => cb(Buffer.concat(parts).toString('utf8'))); }

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
