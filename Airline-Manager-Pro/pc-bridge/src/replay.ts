// Plays a flight recording (see recorder.ts) back as if Flight Simulator were sending it: through the
// PC app to the phone (--replay <file> [speed]) and through the tracker in the tests.

import * as fs from 'fs';
import * as zlib from 'zlib';
import { EventEmitter } from 'events';
import { SimSource, RawSnapshot } from './sim';
import type { Airport } from './protocol';

export type ReplayItem =
  | { k: 's'; t: number; s: RawSnapshot }
  | { k: 'airports'; t: number; list: Airport[] }
  | { k: 'crash'; t: number }
  | { k: 'event'; t: number; e: any };

export interface Recording { app: string; start: string; items: ReplayItem[] }

/** Reads a recording (.jsonl or .jsonl.gz) into full readings, oldest first. */
export function loadRecording(file: string): Recording {
  let buf = fs.readFileSync(file);
  if (/\.gz$/i.test(file)) buf = zlib.gunzipSync(buf);
  const lines = buf.toString('utf8').split('\n');
  let cur: any = null, t0 = 0, app = '', start = '';
  const items: ReplayItem[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    let o: any;
    try { o = JSON.parse(line); } catch (e) { continue; }   // a line cut short when the PC app was closed
    if (o.k === 'head') {
      app = o.app || ''; start = o.start || ''; t0 = Date.parse(start) || 0;
      cur = Object.assign({}, o.s, { t: t0 });
      items.push({ k: 's', t: 0, s: copy(cur) });
    } else if (!cur) continue;
    else if (o.k === 's') {
      const { k, t, ...changes } = o;
      Object.assign(cur, changes, { t: t0 + t });
      items.push({ k: 's', t, s: copy(cur) });
    } else if (o.k === 'airports') items.push({ k: 'airports', t: o.t, list: (o.list || []).map((a: any) => ({ icao: a[0], lat: a[1], lon: a[2] })) });
    else if (o.k === 'crash') items.push({ k: 'crash', t: o.t });
    else if (o.k === 'event') items.push({ k: 'event', t: o.t, e: o.e });
  }
  if (!cur) throw new Error('Not a flight recording: ' + file);
  return { app, start, items };
}

function copy(s: any): RawSnapshot { return JSON.parse(JSON.stringify(s)); }

/** A recorded flight as a simulator source. */
export class ReplaySim extends EventEmitter implements SimSource {
  private i = 0; private timer: any = null; private airports: Airport[] = [];
  constructor(private rec: Recording, private speed = 1) { super(); }
  start() {
    this.emit('status', true, `Playing back a recorded flight (${this.speed}x)`);
    const step = () => {
      const it = this.rec.items[this.i++];
      if (!it) { this.emit('status', false, 'Recorded flight finished'); this.emit('done'); return; }
      if (it.k === 's') this.emit('snapshot', Object.assign({}, it.s, { t: Date.now() }));
      else if (it.k === 'airports') { this.airports = it.list; this.emit('airports', it.list); }
      else if (it.k === 'crash') this.emit('crash');
      const next = this.rec.items[this.i];
      this.timer = setTimeout(step, next ? Math.max(0, (next.t - it.t) / this.speed) : 0);
    };
    step();
  }
  stop() { clearTimeout(this.timer); }
  requestAirports() { if (this.airports.length) this.emit('airports', this.airports); }
}
