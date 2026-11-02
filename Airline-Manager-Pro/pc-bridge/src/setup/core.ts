// Installing and removing the PC app on Windows: the drives and folders you can choose from, the files
// unpacked into a folder named after the app (made inside whatever folder you pick), a desktop shortcut (always;
// any older one is replaced, wherever Windows keeps your desktop, OneDrive included), the Start menu, and the
// entry in Settings > Apps so Windows can remove it. Removing takes away every file, the shortcuts, the entry
// and the folder itself; your airline is kept (in your app data and Documents) unless you choose to delete it too.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { execFile, spawn } from 'child_process';

export const APP_NAME = 'Airline Manager Pro';
export const EXE = 'AirlineManagerPro-PC.exe';
export const UNINSTALL_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AirlineManagerPro';
export const MANIFEST = 'install.json';

export interface PayloadFile { p: string; size: number; csize: number; off: number }
export interface Payload { version: string; publisher: string; total: number; files: PayloadFile[]; data: Buffer }

/** The packed app inside the Setup program: a header (the list of files) and each file deflated after it. */
export function readPayload(buf: Buffer): Payload {
  const n = buf.readUInt32LE(0), head = JSON.parse(buf.subarray(4, 4 + n).toString('utf8'));
  return { version: head.version, publisher: head.publisher || '', total: head.total, files: head.files, data: buf.subarray(4 + n) };
}

/* ---------- places ---------- */
export interface Drive { root: string; label: string; free: number; size: number; kind: string }
export function drives(): Drive[] {
  const out: Drive[] = [];
  for (let c = 67; c <= 90; c++) {   // C: to Z:
    const root = String.fromCharCode(c) + ':\\';
    try { if (!fs.existsSync(root)) continue; const s: any = (fs as any).statfsSync(root); out.push({ root, label: '', free: s.bavail * s.bsize, size: s.blocks * s.bsize, kind: 'fixed' }); }
    catch (e) { /* not ready (an empty card reader) */ }
  }
  return out;
}
/** The names Windows shows for the drives (Local Disk, Games, …): asked once, in the background. */
export function driveLabels(): Promise<{ [root: string]: { label: string; kind: string } }> {
  return new Promise(res => {
    if (process.platform !== 'win32') return res({});
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_LogicalDisk | ForEach-Object { "$($_.DeviceID)|$($_.VolumeName)|$($_.DriveType)" }'], { windowsHide: true, timeout: 15000 }, (e, so) => {
      const m: any = {}; String(so || '').split(/\r?\n/).forEach(l => { const [id, name, t] = l.trim().split('|'); if (id) m[id + '\\'] = { label: name || '', kind: t === '2' ? 'removable' : t === '4' ? 'network' : 'fixed' }; });
      res(m);
    });
  });
}
/** The folders inside a folder (hidden and system ones left out). */
export function folders(dir: string): { name: string; path: string }[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && !/^(\$|System Volume Information$|Recovery$|Config\.Msi$|PerfLogs$|\.)/i.test(d.name))
      .map(d => ({ name: d.name, path: path.join(dir, d.name) })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) { return []; }
}
/** Wherever you choose, the app goes into a folder of its own named after it. */
export function finalDir(chosen: string): string {
  let d = path.resolve(String(chosen || '').trim() || defaultDir());
  if (path.basename(d).toLowerCase() !== APP_NAME.toLowerCase()) d = path.join(d, APP_NAME);
  return d;
}
export function defaultDir(): string { return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', APP_NAME); }
/** Can we write there (without asking Windows for administrator rights)? */
export function writable(dir: string): boolean {
  let probe = dir; while (!fs.existsSync(probe) && path.dirname(probe) !== probe) probe = path.dirname(probe);
  const t = path.join(probe, '.amp-write-test-' + process.pid);
  try { fs.writeFileSync(t, 'x'); fs.unlinkSync(t); return true; } catch (e) { return false; }
}
export function freeSpace(dir: string): number {
  try { const s: any = (fs as any).statfsSync(path.parse(path.resolve(dir)).root); return s.bavail * s.bsize; } catch (e) { return -1; }
}

/* ---------- what is installed ---------- */
function reg(args: string[]): Promise<string> {
  return new Promise(res => execFile('reg.exe', args, { windowsHide: true, timeout: 15000 }, (e, so) => res(e ? '' : String(so || ''))));
}
export async function installed(): Promise<{ dir: string; version: string } | null> {
  if (process.platform !== 'win32') return null;
  const out = await reg(['query', UNINSTALL_KEY]);
  const val = (k: string) => { const m = new RegExp('^\\s*' + k + '\\s+REG_\\w+\\s+(.*)$', 'mi').exec(out); return m ? m[1].trim() : ''; };
  const dir = val('InstallLocation');
  return dir && fs.existsSync(path.join(dir, EXE)) ? { dir, version: val('DisplayVersion') } : null;
}
/** Is the PC app running (it must close before its files are replaced or removed)? */
export function appRunning(): Promise<boolean> {
  return new Promise(res => execFile('tasklist.exe', ['/FI', `IMAGENAME eq ${EXE}`, '/NH'], { windowsHide: true }, (e, so) => {
    const mine = String(process.pid); res(!e && String(so || '').split(/\r?\n/).some(l => l.toLowerCase().indexOf(EXE.toLowerCase()) >= 0 && l.indexOf(' ' + mine + ' ') < 0));
  }));
}
export function closeApp(): Promise<void> {
  // every copy of the PC app except this one (the uninstaller runs as the PC app)
  return new Promise(res => execFile('taskkill.exe', ['/F', '/IM', EXE, '/FI', `PID ne ${process.pid}`], { windowsHide: true }, () => setTimeout(res, 800)));
}

/* ---------- installing ---------- */
export interface Progress { pct: number; step: string; file: string; done: number; total: number; rate: number }
export interface InstallOpts { dir: string; startMenu: boolean; launch: boolean }

export async function install(pl: Payload, o: InstallOpts, report: (p: Progress) => void, exeBytes?: Buffer): Promise<string> {
  const dir = finalDir(o.dir), t0 = Date.now();
  const say = (pct: number, step: string, file = '', done = 0) => report({ pct, step, file, done, total: pl.total, rate: done / Math.max(0.2, (Date.now() - t0) / 1000) });
  say(1, 'Getting the folder ready');
  fs.mkdirSync(dir, { recursive: true });
  // what an older version left that this one no longer has
  try { const old = JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8')); const now = new Set(pl.files.map(f => f.p.toLowerCase()));
    for (const f of old.files || []) if (!now.has(String(f).toLowerCase())) { try { fs.unlinkSync(path.join(dir, f)); } catch (e) { /* gone */ } } } catch (e) { /* a new install */ }
  // the files, each unpacked as it is written, with the bytes counted for the progress bar (5 … 88%)
  let done = 0, last = 0;
  for (const f of pl.files) {
    const to = path.join(dir, f.p); fs.mkdirSync(path.dirname(to), { recursive: true });
    await new Promise<void>((ok, bad) => {
      const inf = zlib.createInflateRaw(), out = fs.createWriteStream(to);
      inf.on('data', (c: Buffer) => { done += c.length; const now = Date.now(); if (now - last > 60) { last = now; say(5 + 83 * done / pl.total, 'Copying the files', f.p, done); } });
      inf.on('error', bad); out.on('error', bad); out.on('finish', () => ok());
      inf.pipe(out); inf.end(pl.data.subarray(f.off, f.off + f.csize));
    });
  }
  say(88, 'Copying the files', '', pl.total);
  fs.writeFileSync(path.join(dir, MANIFEST), JSON.stringify({ app: APP_NAME, version: pl.version, at: new Date().toISOString(), files: pl.files.map(f => f.p) }, null, 1));
  // the shortcuts and the entry in Settings > Apps
  say(91, 'Placing the shortcut on your desktop');
  await shortcuts(dir, o.startMenu);
  say(96, 'Registering with Windows');
  await register(dir, pl.version, pl.publisher, Math.round(pl.total / 1024));
  say(100, 'Installed', '', pl.total);
  if (o.launch) launch(dir);
  return dir;
}
export function launch(dir: string) {
  try { const ch = spawn(path.join(dir, EXE), [], { cwd: dir, detached: true, stdio: 'ignore' }); ch.unref(); } catch (e) { /* started by hand */ }
}

/** Run a PowerShell script with values passed in the environment (no quoting problems with any folder name). */
function ps(script: string, env: { [k: string]: string }): Promise<string> {
  return new Promise(res => {
    if (process.platform !== 'win32') return res('');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true, timeout: 60000, env: Object.assign({}, process.env, env) }, (e, so, se) => res(String(so || '') + (e ? '\n' + String(se || e) : '')));
  });
}
// Old shortcuts to the app are found by where they point (any name), and by the app's name; on your desktop and the
// shared one, in the Start menu; then the new ones are made. Windows is asked for the desktop folder itself, so a
// desktop moved to OneDrive or another drive is found; if there is none, it is made.
const SHORTCUTS_PS = `
$ErrorActionPreference = 'SilentlyContinue'
$ws = New-Object -ComObject WScript.Shell
$exe = $env:AMP_EXE; $dir = $env:AMP_DIR; $ico = $env:AMP_ICO; $name = $env:AMP_NAME
$places = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory'), [Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('CommonPrograms'))
foreach ($p in $places) { if ($p -and (Test-Path -LiteralPath $p)) {
  Get-ChildItem -LiteralPath $p -Filter *.lnk -Recurse -Depth 1 | ForEach-Object {
    $l = $ws.CreateShortcut($_.FullName)
    if (($l.TargetPath -like '*\\AirlineManagerPro-PC.exe') -or ($_.BaseName -eq $name)) { Remove-Item -LiteralPath $_.FullName -Force }
  } } }
$desk = [Environment]::GetFolderPath('Desktop')
if (-not $desk) { $desk = Join-Path $env:USERPROFILE 'Desktop' }
if (-not (Test-Path -LiteralPath $desk)) { New-Item -ItemType Directory -Force -Path $desk | Out-Null }
$make = { param($at) $s = $ws.CreateShortcut($at); $s.TargetPath = $exe; $s.WorkingDirectory = $dir; $s.IconLocation = "$ico,0"; $s.Description = $name; $s.Save() }
& $make (Join-Path $desk "$name.lnk")
if ($env:AMP_START -eq '1') { $pr = [Environment]::GetFolderPath('Programs'); if ($pr) { & $make (Join-Path $pr "$name.lnk") } }
Start-Process -FilePath "$env:SystemRoot\\System32\\ie4uinit.exe" -ArgumentList '-show' -WindowStyle Hidden
Write-Output "desktop=$desk"
`;
export function shortcuts(dir: string, startMenu: boolean): Promise<string> {
  return ps(SHORTCUTS_PS, { AMP_EXE: path.join(dir, EXE), AMP_DIR: dir, AMP_ICO: path.join(dir, 'app.ico'), AMP_NAME: APP_NAME, AMP_START: startMenu ? '1' : '0' });
}
const REMOVE_SHORTCUTS_PS = `
$ErrorActionPreference = 'SilentlyContinue'
$ws = New-Object -ComObject WScript.Shell
foreach ($p in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory'), [Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('CommonPrograms'))) { if ($p -and (Test-Path -LiteralPath $p)) {
  Get-ChildItem -LiteralPath $p -Filter *.lnk -Recurse -Depth 1 | ForEach-Object { $l = $ws.CreateShortcut($_.FullName); if (($l.TargetPath -like '*\\AirlineManagerPro-PC.exe') -or ($_.BaseName -eq $env:AMP_NAME)) { Remove-Item -LiteralPath $_.FullName -Force } } } }
`;
export async function register(dir: string, version: string, publisher: string, kb: number) {
  if (process.platform !== 'win32') return;
  const set = (name: string, type: string, data: string) => reg(['add', UNINSTALL_KEY, '/v', name, '/t', type, '/d', data, '/f']);
  await set('DisplayName', 'REG_SZ', APP_NAME);
  await set('DisplayVersion', 'REG_SZ', version);
  if (publisher) await set('Publisher', 'REG_SZ', publisher);
  await set('DisplayIcon', 'REG_SZ', path.join(dir, 'app.ico'));
  await set('InstallLocation', 'REG_SZ', dir);
  await set('UninstallString', 'REG_SZ', `"${path.join(dir, EXE)}" --uninstall`);
  await set('QuietUninstallString', 'REG_SZ', `"${path.join(dir, EXE)}" --uninstall --silent`);
  await set('EstimatedSize', 'REG_DWORD', String(kb));
  await set('NoModify', 'REG_DWORD', '1');
  await set('NoRepair', 'REG_DWORD', '1');
  await set('InstallDate', 'REG_SZ', new Date().toISOString().slice(0, 10).replace(/-/g, ''));
}

/** After the app updated itself: the shortcut and the entry in Settings > Apps follow the new version. */
export async function refreshAfterUpdate(version: string) {
  if (process.platform !== 'win32') return;
  const dir = path.dirname(process.execPath), mf = path.join(dir, MANIFEST);
  let m: any; try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (e) { return; }   // not installed by Setup (unzipped by hand)
  if (m.version === version) return;
  m.version = version; m.at = new Date().toISOString();
  try { fs.writeFileSync(mf, JSON.stringify(m, null, 1)); } catch (e) { /* read-only */ }
  await shortcuts(dir, true);
  await reg(['add', UNINSTALL_KEY, '/v', 'DisplayVersion', '/t', 'REG_SZ', '/d', version, '/f']);
}

/* ---------- removing ---------- */
export interface RemoveOpts { dir: string; deleteData: boolean }
export async function uninstall(o: RemoveOpts, report: (p: Progress) => void): Promise<void> {
  const dir = path.resolve(o.dir), say = (pct: number, step: string, file = '') => report({ pct, step, file, done: 0, total: 0, rate: 0 });
  // only ever the app's own folder: named after the app, with the Setup's list of files in it
  if (path.basename(dir).toLowerCase() !== APP_NAME.toLowerCase() || !fs.existsSync(path.join(dir, MANIFEST))) throw new Error(`${dir} isn't a folder that Setup installed ${APP_NAME} in.`);
  say(5, 'Removing the shortcuts');
  await ps(REMOVE_SHORTCUTS_PS, { AMP_NAME: APP_NAME });
  say(15, 'Removing it from Windows\' list of apps');
  await reg(['delete', UNINSTALL_KEY, '/f']);
  // every file, except the running program itself (it goes with the folder once it has closed)
  const all: string[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else all.push(p); } };
  try { walk(dir); } catch (e) { /* partly gone */ }
  const self = path.resolve(process.execPath).toLowerCase();
  let i = 0;
  for (const f of all) {
    i++; if (f.toLowerCase() === self) continue;
    try { fs.rmSync(f, { force: true }); } catch (e) { /* in use: removed with the folder */ }
    if (i % 40 === 0) { say(20 + 60 * i / all.length, 'Removing the files', path.relative(dir, f)); await new Promise(r => setImmediate(r)); }
  }
  try { for (const e of fs.readdirSync(dir)) { const p = path.join(dir, e); if (p.toLowerCase() !== self) fs.rmSync(p, { recursive: true, force: true }); } } catch (e) { /* the rest after closing */ }
  if (o.deleteData) {
    say(85, 'Deleting your saved airline and settings');
    for (const d of [path.join(process.env.APPDATA || '', APP_NAME), path.join(os.homedir(), 'Documents', APP_NAME)]) try { if (path.basename(d) === APP_NAME) fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* in use */ }
  }
  say(95, 'Removing the folder');
  removeFolderAfterExit(dir);
  say(100, 'Removed');
}
/** The folder (and the program still running from it) goes once this program has closed. */
export function removeFolderAfterExit(dir: string) {
  if (process.platform !== 'win32') { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* gone */ } return; }
  // a hidden PowerShell: waits for this program to close, then removes the folder, trying again every second for a
  // minute (Windows lets go of a program's own file a moment after it closes); what it did goes to amp-remove.log
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$log = Join-Path $env:TEMP 'amp-remove.log'",
    "Add-Content $log ((Get-Date -Format o) + ' waiting for ' + $env:AMP_PID)",
    "Wait-Process -Id ([int]$env:AMP_PID) -Timeout 120",
    "Set-Location $env:TEMP",
    "for ($i = 0; $i -lt 60 -and (Test-Path -LiteralPath $env:AMP_DIR); $i++) { Remove-Item -LiteralPath $env:AMP_DIR -Recurse -Force; if (Test-Path -LiteralPath $env:AMP_DIR) { Start-Sleep -Seconds 1 } }",
    "Add-Content $log ((Get-Date -Format o) + ' ' + $env:AMP_DIR + ' gone: ' + (-not (Test-Path -LiteralPath $env:AMP_DIR)) + ' after ' + $i + ' tries')",
  ].join('; ');
  const ch = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { detached: true, stdio: 'ignore', windowsHide: true, cwd: os.tmpdir(), env: Object.assign({}, process.env, { AMP_PID: String(process.pid), AMP_DIR: dir }) });
  ch.unref();
}

/** Run this Setup again with administrator rights (for Program Files and other protected folders). */
export function relaunchAsAdmin(args: string[]): Promise<boolean> {
  const a = args.map(x => '"' + x.replace(/"/g, '') + '"').join(' ');
  return ps(`try { Start-Process -FilePath $env:AMP_SELF -ArgumentList $env:AMP_ARGS -Verb RunAs; 'ok' } catch { 'no' }`, { AMP_SELF: process.execPath, AMP_ARGS: a }).then(o => /ok/.test(o));
}
