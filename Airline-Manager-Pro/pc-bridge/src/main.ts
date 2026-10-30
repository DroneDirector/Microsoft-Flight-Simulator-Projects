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
import { Desktop } from './desktop';
import { installedAircraft, saveFlightPlan } from './installed';
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
  // the airport view asks for an airport's layout; the airport search for every airport in the sim
  server.on('message', (c: any, m: any) => {
    if (m.type === 'procs') {
      const icao = String(m.icao || '').toUpperCase().slice(0, 8);
      if (!source.getProcedures) c.send({ type: 'procs', icao, error: 'No simulator procedures' });
      else source.getProcedures(icao).then(p => c.send({ type: 'procs', icao, procs: p }), (e: any) => c.send({ type: 'procs', icao, error: String(e && e.message || e) }));
    } else if (m.type === 'layout' && !source.getLayout) c.send({ type: 'layout', icao: String(m.icao || '').toUpperCase().slice(0, 8), error: 'No simulator layouts' });
    else if (m.type === 'layout' && source.getLayout) {
      const icao = String(m.icao || '').toUpperCase().slice(0, 8);
      source.getLayout(icao).then(l => c.send({ type: 'layout', icao, layout: l }), (e: any) => c.send({ type: 'layout', icao, error: String(e && e.message || e) }));
    } else if (m.type === 'flightplan') {
      try { const p = saveFlightPlan(m.name, m.text); c.send({ type: 'flightplan-saved', path: p }); log(`Flight plan saved: ${p}`); }
      catch (e: any) { c.send({ type: 'flightplan-saved', error: String(e && e.message || e) }); }
    } else if (m.type === 'aircraft-list') {
      installedAircraft().then(list => { c.send({ type: 'aircraft-list', list }); log(`${list.length} aircraft packages found in the simulator`); },
        (e: any) => c.send({ type: 'aircraft-list', list: [], error: String(e && e.message || e) }));
    } else if (m.type === 'all-airports' && source.allAirports) {
      source.allAirports().then(list => {
        const rows: [string, number, number][] = list.map(a => [a.icao, Math.round(a.lat * 1e5) / 1e5, Math.round(a.lon * 1e5) / 1e5]);
        const size = 4000, parts = Math.max(1, Math.ceil(rows.length / size));
        for (let i = 0; i < parts; i++) c.send({ type: 'all-airports', list: rows.slice(i * size, (i + 1) * size), part: i, parts, total: rows.length });
        log(`Sent ${rows.length} simulator airports to ${c.device}`);
      }, (e: any) => log(`Airport list: ${String(e && e.message || e)}`));
    }
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
    '  The app on this PC: type A and press Enter to open its window again.',
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
  const desktop = new Desktop(dir);
  server.web = (req, res) => desktop.handle(req, res);
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
  // the app on this PC
  if (process.argv.indexOf('--no-window') < 0 && desktop.prefs.open && desktop.appDir()) setTimeout(() => { if (desktop.openWindow()) log('Opened Airline Manager Pro on this PC'); }, 800);
  process.stdin.on('data', d => { if (/^\s*a/i.test(String(d)) && desktop.appDir()) desktop.openWindow(); });
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

