// Flight recordings: what Flight Simulator reported during a flight, saved to a file so the flight can be
// played back later through the PC app (--replay) and through the tests, exactly as the simulator sent it.
//
// One file per flight in Documents\Airline Manager Pro\Recordings, one JSON object per line:
//   {"k":"head", ...}               the PC app version and the first full reading
//   {"k":"s","t":ms, ...changes}    a reading: only the values that changed since the line before
//   {"k":"airports","t":ms,"list"}  the airports the simulator listed around the aircraft
//   {"k":"crash","t":ms}            the simulator reported a crash
//   {"k":"event","t":ms,"e"}        what the PC app made of it at the time (blocks off, touchdown …)
// Readings are kept at full rate near the ground, in turbulence and whenever something switches
// (gear, flaps, engines, brakes), and once a second the rest of the time.

import * as fs from 'fs';
import * as path from 'path';
import type { RawSnapshot } from './sim';
import type { Airport } from './protocol';

export const RECORDING_FORMAT = 1;

/** Values that switch: a change in any of these is always written. */
const SWITCHES = ['onGround', 'parkingBrake', 'enginesRunning', 'engines', 'flapsIndex', 'gearDown', 'paused', 'inFlight', 'connected', '_flapOverspeed', '_gearOverspeed', 'title'];

function round(k: string, v: any): any {
  if (typeof v !== 'number' || !isFinite(v)) return v;
  if (k === 'lat' || k === 'lon') return Math.round(v * 1e6) / 1e6;
  if (k === 't') return Math.round(v);
  return Math.round(v * 100) / 100;
}

/** A reading as plain data with rounded numbers (nested objects compared as JSON). */
function flat(s: any): { [k: string]: any } {
  const o: { [k: string]: any } = {};
  for (const k of Object.keys(s)) {
    const v = s[k];
    if (k === 'phase' || k === 'from') continue;
    o[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v, (kk, vv) => round(kk, vv))) : round(k, v);
  }
  return o;
}

const same = (a: any, b: any) => a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));

export class Recorder {
  file = '';
  private fd = -1;
  private prev: { [k: string]: any } = null;
  private t0 = 0; private lastWrite = 0; private lastSeen = 0;
  private title = '';
  constructor(private dir: string, private version: string, private keep = 30) {}

  /** A reading from the simulator. Starts a new file for a new aircraft or after a long gap. */
  snapshot(raw: RawSnapshot) {
    if (!raw || !raw.connected || !raw.inFlight) return;
    const now = raw.t || Date.now();
    if (this.fd >= 0 && ((raw.title && this.title && raw.title !== this.title) || now - this.lastSeen > 10 * 60000)) this.close();
    this.lastSeen = now;
    const cur = flat(raw);
    if (this.fd < 0) { this.open(raw, cur); return; }
    if (raw.title) this.title = raw.title;
    const changed: { [k: string]: any } = {};
    let n = 0, switched = false;
    for (const k of Object.keys(cur)) if (!same(cur[k], this.prev[k])) { changed[k] = cur[k]; n++; if (SWITCHES.indexOf(k) >= 0) switched = true; }
    if (!n) return;
    const r: any = raw;
    const busy = switched || r.aglFt < 1500 || (r.onGround && r.gs > 0.5) || Math.abs((r.g || 1) - 1) > 0.2 || '_tdFpm' in changed;
    if (!busy && now - this.lastWrite < 1000) return;
    // keep everything the line leaves out equal to what a reader of the file will have
    for (const k of Object.keys(changed)) this.prev[k] = changed[k];
    delete changed.t;
    this.write(Object.assign({ k: 's', t: now - this.t0 }, changed));
    this.lastWrite = now;
  }

  airports(list: Airport[]) {
    if (this.fd < 0 || !list || !list.length) return;
    this.write({ k: 'airports', t: Date.now() - this.t0, list: list.map(a => [a.icao, round('lat', a.lat), round('lon', a.lon)]) });
  }
  crash() { if (this.fd >= 0) this.write({ k: 'crash', t: Date.now() - this.t0 }); }
  event(e: any) { if (this.fd >= 0) this.write({ k: 'event', t: Date.now() - this.t0, e }); }

  close() {
    if (this.fd < 0) return;
    try { fs.closeSync(this.fd); } catch (e) { /* already closed */ }
    this.fd = -1; this.prev = null; this.title = '';
  }

  private open(raw: RawSnapshot, cur: { [k: string]: any }) {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      this.prune();
      const d = new Date(raw.t || Date.now()), p = (n: number) => String(n).padStart(2, '0');
      const tag = String(raw.atcId || raw.atcModel || 'flight').replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) || 'flight';
      this.file = path.join(this.dir, `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${tag}.jsonl`);
      this.fd = fs.openSync(this.file, 'a');
      this.t0 = raw.t || Date.now(); this.lastWrite = this.t0; this.title = raw.title || '';
      this.prev = Object.assign({}, cur);
      const first = Object.assign({}, cur); delete first.t;
      this.write({ k: 'head', format: RECORDING_FORMAT, app: this.version, start: new Date(this.t0).toISOString(), s: first });
    } catch (e) { this.fd = -1; this.file = ''; }
  }

  private write(o: any) {
    try { fs.writeSync(this.fd, JSON.stringify(o) + '\n'); } catch (e) { this.close(); }
  }

  /** Keep the newest recordings only. */
  private prune() {
    try {
      const files = fs.readdirSync(this.dir).filter(f => /\.jsonl(\.gz)?$/.test(f)).sort();
      for (const f of files.slice(0, Math.max(0, files.length - this.keep + 1))) fs.unlinkSync(path.join(this.dir, f));
    } catch (e) { /* nothing to prune */ }
  }
}
