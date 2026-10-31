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
import { Recorder } from './recorder';
import { ReplaySim, loadRecording } from './replay';
export { VERSION };

export function dataDir(): string {
  const base = process.env.APPDATA || path.join(os.homedir(), '.config');
  return path.join(base, 'Airline Manager Pro');
}

/** Airport layouts read from the simulator (its own SDK facility data), kept on this PC so they are there
 *  again later, also while the simulator isn't running. Only on this PC: never shared or uploaded. */
const LayoutStore = {
  dir(): string { return path.join(dataDir(), 'layouts'); },
  file(icao: string): string { return path.join(this.dir(), icao.replace(/[^A-Z0-9]/g, '') + '.json'); },
  get(icao: string): { at: number; l: any } | null { try { return JSON.parse(fs.readFileSync(this.file(icao), 'utf8')); } catch (e) { return null; } },
  put(icao: string, l: any) { try { fs.mkdirSync(this.dir(), { recursive: true }); fs.writeFileSync(this.file(icao), JSON.stringify({ at: Date.now(), l })); } catch (e) { /* disk full or read-only: it is fetched again next time */ } },
};

/** Wire a sim source, the tracker and the link server together. Used by the app and the tests. */
export function run(source: SimSource, server: LinkServer, log: (s: string) => void) {
  const tracker = new FlightTracker();
  let lastSent = 0, last = emptySnapshot();
  let airports: Airport[] = [];
  let simOk = false;
  // airports the phone wants ready (its bases, routes, destinations): read from the simulator one at a time
  const want: { c: any; icao: string }[] = [];
  let fetching = false;
  const nextWanted = () => {
    if (fetching || !want.length || !simOk || !source.getLayout) return;
    const w = want.shift()!; fetching = true;
    source.getLayout(w.icao).then(l => { if (l && (l.runways || []).length) { LayoutStore.put(w.icao, l); try { w.c.send({ type: 'layout', icao: w.icao, layout: l }); } catch (e) { /* phone gone */ } } }, () => { /* not in the simulator */ })
      .then(() => { fetching = false; setTimeout(nextWanted, 1200); });
  };

  source.on('status', (ok: boolean, text: string) => { log(text); simOk = ok; if (ok) setTimeout(nextWanted, 3000); });
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
    } else if (m.type === 'layout') {
      // from the simulator when it runs (and kept on this PC); otherwise the copy kept from before
      const icao = String(m.icao || '').toUpperCase().slice(0, 8), kept = LayoutStore.get(icao);
      const fromStore = (why: string) => kept && kept.l ? c.send({ type: 'layout', icao, layout: kept.l }) : c.send({ type: 'layout', icao, error: why });
      if (!source.getLayout || !simOk) fromStore('No simulator layouts');
      else source.getLayout(icao).then(l => { if (l && (l.runways || []).length) { LayoutStore.put(icao, l); c.send({ type: 'layout', icao, layout: l }); } else fromStore('Not in the simulator'); }, (e: any) => fromStore(String(e && e.message || e)));
    } else if (m.type === 'layout-prefetch' && Array.isArray(m.list)) {
      // the phone's list: kept ones go straight back, the rest are read from the simulator in the background
      let n = 0;
      for (const raw of m.list.slice(0, 600)) {
        const icao = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); if (!icao) continue;
        const kept = LayoutStore.get(icao);
        if (kept && kept.l && Date.now() - kept.at < 60 * 864e5) { c.send({ type: 'layout', icao, layout: kept.l }); continue; }
        if (!want.some(w => w.icao === icao)) { want.push({ c, icao }); n++; }
      }
      if (n) log(`Reading ${n} airport layouts from the simulator for ${c.device}`);
      nextWanted();
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

/** Where flights are recorded (Documents, so they survive reinstalling and are easy to find). */
export function recordingsDir(): string { return path.join(os.homedir(), 'Documents', 'Airline Manager Pro', 'Recordings'); }

export async function main(replay?: { file: string; speed: number }) {
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
  let source: SimSource;
  if (replay) {
    try { source = new ReplaySim(loadRecording(replay.file), replay.speed); } catch (e) { fatal('That flight recording can\'t be read: ' + replay.file, e); return; }
  } else {
    let lib: any;
    try { lib = loadSimConnect(); } catch (e) { fatal('The SimConnect library is missing or damaged. Unzip the PC app again, keeping the lib folder next to the .exe.', e); return; }
    source = new SimConnectSource(lib);
  }
  source.on('status', (ok: boolean, text: string) => { if (text !== status) writeLog('Flight Simulator: ' + text); status = text; redraw(); });
  source.on('note', (t: string) => writeLog(t));
  server.on('clients', (n: number) => { phones = n; redraw(); });
  server.on('code', redraw);
  const tracker = run(source, server, log);
  // every real flight is recorded, so it can be played back exactly as the simulator sent it
  if (!replay && process.argv.indexOf('--no-record') < 0) {
    const rec = new Recorder(recordingsDir(), VERSION);
    let lastFile = '';
    source.on('snapshot', (s: any) => { rec.snapshot(s); if (rec.file && rec.file !== lastFile) { lastFile = rec.file; log('Recording this flight: ' + path.basename(rec.file)); } });
    source.on('airports', (l: Airport[]) => rec.airports(l));
    source.on('crash', () => rec.crash());
    tracker.on('event', (e: any) => rec.event(e));
    process.on('exit', () => rec.close());
  }
  source.start();
  redraw();
  // the app on this PC
  if (process.argv.indexOf('--no-window') < 0 && desktop.prefs.open && desktop.appDir()) setTimeout(() => { if (desktop.openWindow()) log('Opened Airline Manager Pro on this PC'); }, 800);
  process.stdin.on('data', d => { if (/^\s*a/i.test(String(d)) && desktop.appDir()) desktop.openWindow(); });
  process.on('SIGINT', () => { source.stop(); server.stop(); process.exit(0); });
}

/** node-simconnect is shipped next to the .exe as its own unmodified library (LGPL-3.0). */
export function loadSimConnect(): any {
  const { createRequire } = require('module');
  const here = path.dirname(process.execPath);
  for (const p of [path.join(here, 'lib', 'node_modules', 'node-simconnect'), path.join(__dirname, '..', 'node_modules', 'node-simconnect')]) {
    if (fs.existsSync(p)) return createRequire(path.join(here, 'x.js'))(p);
  }
  return require('node-simconnect');
}

