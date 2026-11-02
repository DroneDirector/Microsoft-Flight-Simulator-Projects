// Runs the Setup window (installing, or removing from the installed app): a small web server on this PC only,
// shown in a Microsoft Edge app window (no address bar, the app's own icon), falling back to the default browser.
// The window is closed and the program ends when you finish, or when the window is closed.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as http from 'http';
import * as zlib from 'zlib';
import { spawn, execFile } from 'child_process';
import * as C from './core';
import { setupHtml } from './ui';

export interface SetupCtx { mode: 'install' | 'uninstall'; version: string; payload?: C.Payload; dir?: string; auto?: boolean; startMenu?: boolean; launch?: boolean }

export async function runSetupWindow(ctx: SetupCtx) {
  const inst = ctx.mode === 'install' ? await C.installed() : null;
  const startDir = ctx.mode === 'uninstall' ? (ctx.dir || path.dirname(process.execPath)) : (ctx.dir || (inst && inst.dir) || C.defaultDir());
  let progress: any = { pct: 0, step: '', file: '', done: 0, total: 0, rate: 0, finished: false, error: '' }, working = false, lastPing = 0, win: any = null, labels: any = null;
  const icon = (): Buffer | null => {
    try {
      if (ctx.payload) { const f = ctx.payload.files.filter(x => x.p.toLowerCase() === 'app.ico')[0]; if (f) return zlib.inflateRawSync(ctx.payload.data.subarray(f.off, f.off + f.csize)); }
      return fs.readFileSync(path.join(path.dirname(process.execPath), 'app.ico'));
    } catch (e) { return null; }
  };
  const quit = () => { try { if (win && win.pid) execFile('taskkill.exe', ['/PID', String(win.pid), '/T', '/F'], { windowsHide: true }); } catch (e) { /* closed */ } setTimeout(() => process.exit(0), 400); };
  const body = (req: http.IncomingMessage): Promise<any> => new Promise(r => { let b = ''; req.on('data', d => b += d); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch (e) { r({}); } }); });
  const json = (res: http.ServerResponse, o: any) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url || '/', 'http://x'), p = u.pathname;
    try {
      if (p === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(setupHtml(ctx.mode, C.APP_NAME, ctx.version)); }
      if (p === '/icon.ico') { const b = icon(); res.writeHead(b ? 200 : 404, { 'Content-Type': 'image/x-icon' }); return res.end(b || ''); }
      if (p === '/api/ping') { lastPing = Date.now(); return json(res, { ok: true }); }
      if (p === '/api/state') return json(res, { mode: ctx.mode, version: ctx.version, dir: startDir, installed: inst, need: ctx.payload ? ctx.payload.total : 0, drives: C.drives(), running: await C.appRunning(), auto: !!ctx.auto });
      if (p === '/api/labels') { if (!labels) labels = await C.driveLabels(); return json(res, labels); }
      if (p === '/api/running') return json(res, { running: await C.appRunning() });
      const b = req.method === 'POST' ? await body(req) : {};
      if (p === '/api/list') {
        let d = path.resolve(String(b.dir || startDir)); while (!fs.existsSync(d) && path.dirname(d) !== d) d = path.dirname(d);
        const parent = path.dirname(d) !== d ? path.dirname(d) : '';
        return json(res, { dir: d, parent, folders: C.folders(d) });
      }
      if (p === '/api/check') { const final = C.finalDir(b.dir || startDir); return json(res, { final, writable: C.writable(final), free: C.freeSpace(final), root: path.parse(final).root }); }
      if (p === '/api/mkdir') {
        const name = String(b.name || '').trim();
        if (!name || /[<>:"/\\|?*]/.test(name)) return json(res, { error: 'A folder name can\'t contain < > : " / \\ | ? or *.' });
        const d = path.join(path.resolve(String(b.dir || startDir)), name);
        try { fs.mkdirSync(d, { recursive: true }); return json(res, { dir: d }); } catch (e) { return json(res, { error: 'Windows didn\'t allow a new folder here. Pick another place.' }); }
      }
      if (p === '/api/closeapp') { await C.closeApp(); return json(res, { ok: true }); }
      if (p === '/api/admin') {
        const ok = await C.relaunchAsAdmin(['--dir', String(b.dir || startDir), '--auto', ...(b.startMenu === false ? ['--no-start-menu'] : []), ...(b.launch === false ? ['--no-launch'] : [])]);
        json(res, { ok }); if (ok) setTimeout(quit, 600); return;
      }
      if (p === '/api/install' && ctx.payload && !working) {
        working = true; progress = { pct: 0, step: 'Getting ready', finished: false, error: '' };
        C.install(ctx.payload, { dir: String(b.dir || startDir), startMenu: b.startMenu !== false, launch: !!b.launch }, g => { progress = Object.assign({}, g, { finished: false, error: '' }); })
          .then(() => { progress.pct = 100; progress.finished = true; working = false; }, e => { progress.error = String(e && e.message || e); working = false; });
        return json(res, { ok: true });
      }
      if (p === '/api/uninstall' && ctx.mode === 'uninstall' && !working) {
        working = true; progress = { pct: 0, step: 'Getting ready', finished: false, error: '' };
        C.uninstall({ dir: startDir, deleteData: !!b.deleteData }, g => { progress = Object.assign({}, g, { finished: false, error: '' }); })
          .then(() => { progress.pct = 100; progress.finished = true; working = false; }, e => { progress.error = String(e && e.message || e); working = false; });
        return json(res, { ok: true });
      }
      if (p === '/api/progress') return json(res, progress);
      if (p === '/api/launch') { C.launch(C.finalDir(String(b.dir || startDir))); return json(res, { ok: true }); }
      if (p === '/api/quit') { json(res, { ok: true }); setTimeout(quit, 300); return; }
      res.writeHead(404); res.end();
    } catch (e) { json(res, { error: String(e && (e as any).message || e) }); }
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as any).port, url = `http://127.0.0.1:${port}/`;
  win = openWindow(url);
  // the window was closed (no word from it for a while): end, unless something is still being written
  setInterval(() => { if (lastPing && Date.now() - lastPing > 6000 && !working) quit(); }, 1000);
  setTimeout(() => { if (!lastPing) { /* no window ever came: the default browser shows it; wait longer */ } }, 30000);
}

/** Microsoft Edge (part of Windows) as an app window of its own, the right size, in the middle of the screen. */
function openWindow(url: string): any {
  const pf = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', pf2 = process.env.ProgramFiles || 'C:\\Program Files', la = process.env.LOCALAPPDATA || '';
  const exe = [path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(pf2, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(pf2, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(la, 'Google', 'Chrome', 'Application', 'chrome.exe')].filter(c => fs.existsSync(c))[0];
  const profile = path.join(os.tmpdir(), 'amp-setup-window');
  if (exe) {
    const ch = spawn(exe, [`--app=${url}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-features=Translate,msUndersideButton', '--window-size=1040,700', '--window-position=center'], { detached: true, stdio: 'ignore' });
    ch.unref(); return ch;
  }
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return null;
}

/** Without a window: for the in-app updater, scripted installs (--silent) and the build's own test. */
export async function runSilent(ctx: SetupCtx): Promise<number> {
  try {
    if (ctx.mode === 'install' && ctx.payload) {
      const inst = await C.installed();
      if (await C.appRunning()) await C.closeApp();
      const dir = await C.install(ctx.payload, { dir: ctx.dir || (inst && inst.dir) || C.defaultDir(), startMenu: ctx.startMenu !== false, launch: !!ctx.launch }, () => { /* quiet */ });
      try { fs.appendFileSync(path.join(os.tmpdir(), 'amp-setup.log'), `${new Date().toISOString()} installed ${ctx.version} in ${dir}\r\n`); } catch (e) { /* no log */ }
      return 0;
    }
    if (ctx.mode === 'uninstall') { await C.uninstall({ dir: ctx.dir || path.dirname(process.execPath), deleteData: false }, () => { /* quiet */ }); return 0; }
  } catch (e) { try { fs.appendFileSync(path.join(os.tmpdir(), 'amp-setup.log'), `${new Date().toISOString()} ${String((e as any) && (e as any).stack || e)}\r\n`); } catch (x) { /* no log */ } return 1; }
  return 1;
}
