// The PC app with its own browser engine (Electron, MIT licence, which brings Chromium). The same app as in
// the Edge window, in a window of its own: the same engine on every PC (an Edge update can't change how the
// game looks or runs), WebGPU features switched on, no slowing down when Flight Simulator has the focus, and
// the simulator link, files and backups in the same program.
//
// The parts that aren't the game (removing the app, the sim check, playing back a recording, the demo) run in
// AirlineManagerPro-Tools.exe next to this program: a plain program without the browser engine, so for example
// removing the app can take this whole folder away.
import * as fs from 'fs';
import * as path from 'path';
import { spawn, execFileSync } from 'child_process';
import { main, dataDir } from './main';
import { Desktop, DesktopPrefs } from './desktop';
import { writeLog, FatalHook } from './errors';

const E: any = require('electron');
const { app, BrowserWindow, Menu, Tray, shell, dialog } = E;

// a stopping error: a Windows message box with the details and where the log is (this program has no console)
FatalHook.show = (title, detail, log) => {
  dialog.showErrorBox('Airline Manager Pro', `The app stopped because of an error:\n\n${title}\n\n${detail.split('\n').slice(0, 8).join('\n')}${log ? `\n\nThe details are saved in:\n${log}` : ''}`);
  app.exit(1);
};

const args = process.argv.slice(app.isPackaged ? 1 : 2);
const has = (n: string) => args.indexOf(n) >= 0;
const here = path.dirname(process.execPath);

function prefsNow(): DesktopPrefs {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir(), 'desktop.json'), 'utf8')); } catch (e) { return {} as any; }
}

/** Everything that isn't the game goes to the tools program. */
function toTools(): boolean {
  if (!['--uninstall', '--check', '--replay', '--demo'].some(has)) return false;
  const tools = path.join(here, 'AirlineManagerPro-Tools.exe');
  // started outside the app's folder, so removing the app can take the whole folder away
  if (fs.existsSync(tools)) { try { spawn(tools, args, { cwd: require('os').tmpdir(), detached: true, stdio: 'ignore' }).unref(); } catch (e) { /* not started */ } }
  app.exit(0);
  return true;
}

/** Graphics and speed settings for the engine (they apply from the start of the program). */
function engineSwitches(p: DesktopPrefs) {
  const sw = (k: string, v?: string) => app.commandLine.appendSwitch(k, v);
  sw('autoplay-policy', 'no-user-gesture-required');
  // WebGPU: exact timing per effect on the graphics card, and the full adapter details for the automatic quality choice
  sw('enable-webgpu-developer-features');
  // full speed while another window (Flight Simulator) has the focus or covers this one
  sw('disable-renderer-backgrounding'); sw('disable-background-timer-throttling'); sw('disable-backgrounding-occluded-windows');
  sw('disable-features', 'CalculateNativeWinOcclusion,UseEcoQoSForBackgroundProcess');
  if (p.gpu === 'high' || (p.boost && p.gpu !== 'low')) sw('force_high_performance_gpu');
  if (p.gpu === 'low') sw('force_low_power_gpu');
  if (p.boost) { sw('enable-gpu-rasterization'); sw('enable-zero-copy'); sw('ignore-gpu-blocklist'); }
}

/** The airline saved by the Edge window (versions before this one) comes along: copied, never moved, so the
 *  Edge window keeps its own copy. Only the first time. */
function bringSavedData(engineDir: string): string {
  const mark = path.join(engineDir, '.from-edge');
  if (fs.existsSync(mark)) return '';
  let note = '';
  const edge = path.join(dataDir(), 'window', 'Default');
  try {
    fs.mkdirSync(engineDir, { recursive: true });
    if (fs.existsSync(edge) && !fs.existsSync(path.join(engineDir, 'Local Storage'))) {
      // an Edge window still open holds its files: close it first
      if (process.platform === 'win32') {
        const prof = path.join(dataDir(), 'window').replace(/'/g, "''");
        try { execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command',
          `$p = '${prof}'; Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'msedge.exe' -or $_.Name -eq 'chrome.exe') -and $_.CommandLine -and $_.CommandLine.Contains($p) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 800`],
          { windowsHide: true, timeout: 15000 }); } catch (e) { /* none open */ }
      }
      for (const part of ['Local Storage', 'IndexedDB']) {
        const from = path.join(edge, part);
        if (fs.existsSync(from)) fs.cpSync(from, path.join(engineDir, part), { recursive: true, filter: s => path.basename(s) !== 'LOCK' });
      }
      note = 'Brought the airline saved by the Edge window into the app\'s own window';
    }
    fs.writeFileSync(mark, new Date().toISOString());
  } catch (e) { note = 'Couldn\'t bring the Edge window\'s saved data along: ' + String((e as any) && (e as any).message || e) + ' (the backup in Documents is offered instead)'; }
  return note;
}

let win: any = null, tray: any = null, last: { url: string; prefs: DesktopPrefs } | null = null, hidden = false;

function openWindow(url: string, prefs: DesktopPrefs): boolean {
  last = { url, prefs };
  if (win && !win.isDestroyed()) {
    // quit earlier (running unseen): opening the app again starts it afresh, from the start screen
    if (hidden) { hidden = false; win.setSkipTaskbar(false); win.loadURL(url); win.once('ready-to-show', () => { win.show(); win.focus(); }); setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible()) { win.show(); win.focus(); } }, 4000); return true; }
    if (win.isMinimized()) win.restore(); win.show(); win.focus(); return true;
  }
  const icon = path.join(here, 'app.ico');
  win = new BrowserWindow({
    width: prefs.width || 1600, height: prefs.height || 900, minWidth: 960, minHeight: 600, center: true, show: false,
    title: 'Airline Manager Pro', icon: fs.existsSync(icon) ? icon : undefined, backgroundColor: '#06111F', autoHideMenuBar: true,
    fullscreen: prefs.mode === 'borderless', kiosk: prefs.mode === 'fullscreen',
    webPreferences: { backgroundThrottling: false, contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, webviewTag: true },
  });
  win.once('ready-to-show', () => win.show());
  const wc = win.webContents, origin = new URL(url).origin;
  // links to other sites open in the normal browser, never inside the app
  wc.setWindowOpenHandler((d: any) => { if (/^https?:/i.test(d.url) || /^ms-settings:(bluetooth|sound)$/i.test(d.url)) shell.openExternal(d.url); return { action: 'deny' }; });
  wc.on('will-navigate', (ev: any, to: string) => { if (new URL(to).origin !== origin) { ev.preventDefault(); if (/^https?:/i.test(to)) shell.openExternal(to); } });
  // the laptop's web browser (a <webview> in the office): web pages only, sandboxed, nothing of the app's own powers;
  // signed-in sites stay signed in (its own saved partition)
  wc.on('will-attach-webview', (_e: any, prefs: any, params: any) => {
    delete prefs.preload; prefs.nodeIntegration = false; prefs.contextIsolation = true; prefs.sandbox = true; prefs.webSecurity = true;
    if (!/^https?:/i.test(params.src || '')) params.src = 'about:blank';
    params.partition = 'persist:laptop';
  });
  wc.on('did-attach-webview', (_e: any, guest: any) => {
    guest.setWindowOpenHandler((d: any) => { if (/^https?:/i.test(d.url)) guest.loadURL(d.url); return { action: 'deny' }; });   // links that open a new window open in the same page
    guest.on('will-navigate', (ev: any, to: string) => { if (!/^https?:/i.test(to)) ev.preventDefault(); });
  });
  // F11 switches full screen, as in the Edge window
  wc.on('before-input-event', (ev: any, i: any) => { if (i.type === 'keyDown' && i.key === 'F11') { ev.preventDefault(); win.setFullScreen(!win.isFullScreen()); } });
  // the drawing part stopped (a graphics driver reset, out of memory): note it and load the app again
  wc.on('render-process-gone', (_e: any, d: any) => { writeLog(`ENG-01 The app window's drawing stopped (${d && d.reason}, code ${d && d.exitCode}); reopened`); if (d && d.reason !== 'clean-exit') setTimeout(() => { if (win && !win.isDestroyed()) win.loadURL(url); }, 800); });
  win.on('closed', () => { win = null; afterClose(); });
  win.loadURL(url);
  if (tray) { tray.destroy(); tray = null; }
  return true;
}

/** Window closed: the app ends, unless a phone is linked; then it keeps linking it, with an icon by the clock. */
function afterClose() {
  if (Desktop.phones <= 0) { app.quit(); return; }
  try {
    tray = new Tray(path.join(here, 'app.ico'));
    tray.setToolTip('Airline Manager Pro: still linked to your phone');
    const reopen = () => { if (last) openWindow(last.url, last.prefs); };
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open Airline Manager Pro', click: reopen }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]));
    tray.on('click', reopen);
  } catch (e) { app.quit(); }
}

if (!toTools()) {
  if (!app.requestSingleInstanceLock()) app.exit(0);
  else {
    const engineDir = path.join(dataDir(), 'engine');
    app.setPath('userData', engineDir);
    engineSwitches(prefsNow());
    Menu.setApplicationMenu(null);
    app.on('second-instance', () => { if (last) openWindow(last.url, last.prefs); });
    app.on('window-all-closed', () => { /* decided in afterClose */ });
    app.on('will-quit', () => { setTimeout(() => process.exit(0), 300); });
    app.whenReady().then(() => {
      const note = bringSavedData(engineDir);
      Desktop.host = { exe: path.basename(process.execPath, '.exe').toLowerCase(), open: openWindow, close: () => { if (win && !win.isDestroyed()) win.destroy(); }, pid: () => process.pid,
        hide: () => { if (win && !win.isDestroyed()) { hidden = true; win.setSkipTaskbar(true); win.hide(); writeLog('Quit from the app: running unseen, the airline carries on'); } },
        show: () => { if (win && !win.isDestroyed()) { hidden = false; win.setSkipTaskbar(false); win.show(); win.focus(); } } };
      main();   // opens the log first thing
      writeLog(`Own browser engine: Electron ${process.versions.electron}, Chromium ${process.versions.chrome}`);
      if (note) writeLog(note);
    });
  }
}
