// Log file and error handling for the PC app. Everything shown in the window is also written to
// pc-app.log, and if the app stops on an error the window stays open with the details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { VERSION } from './version';

let logPath = '';

export function logFile(): string { return logPath; }

export function openLog(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    logPath = path.join(dir, 'pc-app.log');
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 1024 * 1024) fs.renameSync(logPath, logPath + '.old');
    writeLog(`--- PC app ${VERSION} started on ${os.hostname()}, ${os.type()} ${os.release()}, Node ${process.versions.node}`);
  } catch (e) { logPath = ''; }
}

export function writeLog(line: string) {
  if (!logPath) return;
  try { fs.appendFileSync(logPath, `${new Date().toISOString().replace('T', ' ').slice(0, 19)}  ${line}\n`); } catch (e) { /* disk full or read-only */ }
}

/** Shows the error, saves it to the log and keeps the window open until Enter is pressed. */
export function fatal(title: string, err?: any): never {
  const detail = err ? (err.stack || err.message || String(err)) : '';
  writeLog(`ERROR ${title}${detail ? '\n' + detail : ''}`);
  const out = [
    '',
    '  AIRLINE MANAGER PRO  ·  PC app ' + VERSION,
    '  ' + '─'.repeat(52),
    '',
    '  The PC app stopped because of an error:',
    '',
    '  ' + title,
    ...(detail ? ['', ...detail.split('\n').slice(0, 14).map((l: string) => '    ' + l)] : []),
    '',
    logPath ? `  The details are saved in:\n  ${logPath}` : '',
    '  Copy this window or send that file so the problem can be looked at.',
    '',
    '  Press Enter to close.',
  ];
  process.stdout.write('\n' + out.join('\n') + '\n');
  try {
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(1));
    // keep running until Enter is pressed (or the window is closed)
    setInterval(() => { /* waiting */ }, 1 << 30);
  } catch (e) { process.exit(1); }
  return undefined as never;
}

export function catchEverything() {
  process.on('uncaughtException', e => fatal('Unexpected error: ' + (e && e.message ? e.message : String(e)), e));
  process.on('unhandledRejection', (e: any) => fatal('Unexpected error: ' + (e && e.message ? e.message : String(e)), e));
}
