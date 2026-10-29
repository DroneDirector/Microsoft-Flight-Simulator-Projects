// Airline Manager Pro PC app: links Microsoft Flight Simulator to the Android app over Wi-Fi.

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { LinkServer, localAddresses } from './server';
import { FlightTracker } from './tracker';
import { SimConnectSource, SimSource, emptySnapshot } from './sim';
import { LINK_PORT } from './protocol';
import type { Airport } from './protocol';

import { VERSION } from './version';
import { openLog, writeLog, fatal, catchEverything, logFile } from './errors';
export { VERSION };

export function dataDir(): string {
  const base = process.env.APPDATA || path.join(os.homedir(), '.config');
  return path.join(base, 'Airline Manager Pro');
}

/** Wire a sim source, the tracker and the link server together. Used by the app and the tests. */
export function run(source: SimSource, server: LinkServer, log: (s: string) => void) {
  const tracker = new FlightTracker();
  let lastSent = 0, last = emptySnapshot();
  let airports: Airport[] = [];

  source.on('status', (ok: boolean, text: string) => { log(text); });
  source.on('airports', (list: Airport[]) => {
    tracker.setAirports(list);
    const seen: { [k: string]: boolean } = {};
    airports = list.concat(airports).filter(a => !seen[a.icao] && (seen[a.icao] = true)).slice(0, 400);
    server.broadcast({ type: 'airports', list });
  });
  source.on('snapshot', (raw: any) => {
    last = raw;
    const s = tracker.update(raw);
    const now = Date.now();
    if (now - lastSent >= 1000) { lastSent = now; server.broadcast({ type: 'state', s: clean(s) }); }
  });
  source.on('crash', () => tracker.crash(last));
  tracker.on('event', (e: any) => {
    log(describe(e));
    server.broadcast({ type: 'event', e });
  });
  server.on('paired', (c: any) => {
    log(`Phone linked: ${c.device} (${c.ip})`);
    c.send({ type: 'state', s: clean(tracker.update(last)) });
    if (airports.length) c.send({ type: 'airports', list: airports });
  });
  return tracker;
}

function clean(s: any) { const o: any = {}; for (const k of Object.keys(s)) if (k[0] !== '_') o[k] = s[k]; return o; }

function describe(e: any): string {
  switch (e.type) {
    case 'blocks-off': return `Blocks off${e.airport ? ' at ' + e.airport : ''}`;
    case 'takeoff': return `Take-off${e.airport ? ' from ' + e.airport : ''}`;
    case 'touchdown': return `Touchdown${e.airport ? ' at ' + e.airport : ''}: ${e.fpm} fpm, ${e.g} g`;
    case 'blocks-on': return `Blocks on${e.airport ? ' at ' + e.airport : ''}: ${e.summary.blockMin} min, ${e.summary.distanceNm} nm`;
    case 'crash': return 'Crash detected';
    default: return e.detail || e.type;
  }
}

/* ---------- Console window ---------- */
function banner(server: LinkServer, status: string, phones: number, lines: string[]) {
  const ips = localAddresses();
  const out = [
    '',
    '  AIRLINE MANAGER PRO  ·  PC app ' + VERSION,
    '  ' + '─'.repeat(52),
    `  Flight Simulator : ${status}`,
    `  This PC          : ${server.pcName}  ${ips.join(', ') || 'no network'}  (port ${LINK_PORT})`,
    `  Phones linked    : ${phones}`,
    '',
    `  Pairing code     :  ${server.code.slice(0, 3)} ${server.code.slice(3)}`,
    '  On your phone: tap the link button at the top or Settings → Simulator link,',
    '  pick this PC and enter the code. Phone and PC must be on the same Wi-Fi,',
    '  or this PC connected to your phone\'s hotspot (it then uses mobile data).',
    '',
    '  Recent:',
    ...lines.slice(-8).map(l => '   ' + l),
    '',
    '  Keep this window open while you fly. Press Ctrl+C to quit.',
    logFile() ? '  Log file: ' + logFile() : '',
  ];
  process.stdout.write('\x1b[2J\x1b[H' + out.join('\n') + '\n');
}

export async function main() {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  openLog(dir);
  catchEverything();
  const lines: string[] = [];
  let status = 'Starting…', phones = 0;
  const server = new LinkServer(dir, VERSION);
  const redraw = () => banner(server, status, phones, lines);
  const log = (s: string) => { writeLog(s); lines.push(new Date().toTimeString().slice(0, 8) + '  ' + s); if (lines.length > 200) lines.shift(); redraw(); };
  try { await server.start(); }
  catch (e) { fatal(`Port ${LINK_PORT} is in use. Is the PC app already running?`, e); return; }
  let lib: any;
  try { lib = loadSimConnect(); } catch (e) { fatal('The SimConnect library is missing or damaged. Unzip the PC app again, keeping the lib folder next to the .exe.', e); return; }
  const source = new SimConnectSource(lib);
  source.on('status', (ok: boolean, text: string) => { if (text !== status) writeLog('Flight Simulator: ' + text); status = text; redraw(); });
  source.on('note', (t: string) => writeLog(t));
  server.on('clients', (n: number) => { phones = n; redraw(); });
  server.on('code', redraw);
  run(source, server, log);
  source.start();
  redraw();
  process.on('SIGINT', () => { source.stop(); server.stop(); process.exit(0); });
}

/** node-simconnect is shipped next to the .exe as its own unmodified library (LGPL-3.0). */
function loadSimConnect(): any {
  const { createRequire } = require('module');
  const here = path.dirname(process.execPath);
  for (const p of [path.join(here, 'lib', 'node_modules', 'node-simconnect'), path.join(__dirname, '..', 'node_modules', 'node-simconnect')]) {
    if (fs.existsSync(p)) return createRequire(path.join(here, 'x.js'))(p);
  }
  return require('node-simconnect');
}

