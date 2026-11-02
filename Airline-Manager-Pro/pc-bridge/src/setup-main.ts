// Entry point of the Setup program (AirlineManagerPro-PC-Setup-<version>.exe): the whole PC app packed inside it.
//   (nothing)                 the Setup window
//   --dir <folder>            where to install (a folder named after the app is made inside it)
//   --silent                  install without the window (keeps the folder it is installed in already)
//   --auto                    open the window and start installing straight away (after asking for administrator rights)
//   --no-start-menu           no Start menu entry      --no-launch / --launch   start the app afterwards or not
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { readPayload } from './setup/core';
import { runSetupWindow, runSilent } from './setup/server';

const argv = process.argv, has = (n: string) => argv.indexOf(n) >= 0, val = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const log = (m: string) => { try { fs.appendFileSync(path.join(os.tmpdir(), 'amp-setup.log'), `${new Date().toISOString()} ${m}\r\n`); } catch (e) { /* no log */ } };
/** Setup has no console window: a problem is shown in a Windows message box (and written to the log). */
function oops(m: string) {
  log(m);
  if (process.platform === 'win32') execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show($env:AMP_MSG, "Airline Manager Pro Setup", "OK", "Error") | Out-Null'],
    { windowsHide: true, env: Object.assign({}, process.env, { AMP_MSG: m }) }, () => process.exit(1));
  else process.exit(1);
}
process.on('uncaughtException', e => oops('Setup stopped: ' + String(e && (e as any).stack || e)));

let payload: any;
try {
  const sea = require('node:sea');
  payload = readPayload(Buffer.from(sea.getRawAsset('payload')));
} catch (e) { oops('This Setup file is damaged or incomplete. Download it again. (' + String((e as any) && (e as any).message || e) + ')'); }

if (payload) {
  const ctx = { mode: 'install' as const, version: payload.version, payload, dir: val('--dir'), auto: has('--auto'), startMenu: !has('--no-start-menu'), launch: has('--silent') ? has('--launch') : !has('--no-launch') };
  if (has('--silent')) runSilent(ctx).then(code => process.exit(code));
  else runSetupWindow(ctx).catch(e => oops('Setup couldn\'t open its window: ' + String(e && e.message || e)));
}
