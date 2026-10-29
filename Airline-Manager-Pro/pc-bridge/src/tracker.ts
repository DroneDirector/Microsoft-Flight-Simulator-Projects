// Turns a stream of snapshots into flight phases and events: blocks off, take-off, touchdown
// (landing rate, G, pitch), blocks on, crash and damage the simulator can actually detect.

import { EventEmitter } from 'events';
import { distNm } from './geo';
import type { RawSnapshot } from './sim';
import type { FlightEvent, FlightPhase, SimSnapshot, LegSummary, Airport } from './protocol';

interface Limits { tailStrikeDeg: number; hardFpm: number; damageFpm: number; heavy: boolean }

/** Rough limits by aircraft size, from empty weight. */
function limitsFor(emptyKg: number): Limits {
  if (emptyKg > 90000) return { tailStrikeDeg: 10.5, hardFpm: 500, damageFpm: 750, heavy: true };     // widebodies
  if (emptyKg > 30000) return { tailStrikeDeg: 11, hardFpm: 500, damageFpm: 700, heavy: true };       // A320/737 class
  if (emptyKg > 9000) return { tailStrikeDeg: 12, hardFpm: 600, damageFpm: 800, heavy: false };       // regional
  return { tailStrikeDeg: 15, hardFpm: 700, damageFpm: 1000, heavy: false };                          // GA and bush
}

export class FlightTracker extends EventEmitter {
  phase: FlightPhase = 'idle';
  private last: RawSnapshot = null;
  private airports: Airport[] = [];
  // leg data
  private legStart = 0; private airStart = 0; private airEnd = 0; private fromIcao = ''; private fuelAtStart = 0;
  private distance = 0; private lastPos: [number, number] = null;
  private touchdown: FlightEvent = null; private bounces = 0; private groundSince = 0; private stoppedSince = 0;
  private pax = 0; private cargoKg = 0;
  // detection memory
  private gWindow: { t: number; g: number }[] = [];
  private flags: { [k: string]: number } = {};
  private reported: { [k: string]: boolean } = {};
  private peakG = 1; private peakPitch = 0;
  private crashed = false;

  setAirports(list: Airport[]) {
    const known: { [k: string]: boolean } = {};
    this.airports.forEach(a => known[a.icao] = true);
    for (const a of list) if (!known[a.icao]) { this.airports.push(a); known[a.icao] = true; }
    if (this.airports.length > 4000) this.airports.splice(0, this.airports.length - 4000);
  }

  nearestAirport(lat: number, lon: number, maxNm = 6): string {
    let best = '', bd = maxNm;
    for (const a of this.airports) { const d = distNm(lat, lon, a.lat, a.lon); if (d < bd) { bd = d; best = a.icao; } }
    return best;
  }

  crash(s: RawSnapshot) {
    if (this.crashed || !s) return;
    this.crashed = true;
    this.fire({ type: 'crash', t: Date.now(), lat: s.lat, lon: s.lon, airport: this.nearestAirport(s.lat, s.lon, 15),
      fpm: Math.round(Math.abs(s.vsFpm)), g: round(this.peakG, 2), detail: s.onGround ? 'Impact on the ground' : 'Impact during flight' });
    this.reset('idle');
  }

  /** Feed one snapshot; returns it with the current phase. */
  update(s: RawSnapshot): SimSnapshot {
    const p = this.last;
    this.last = s;
    if (s.wx) s = Object.assign({}, s, { wx: Object.assign({}, s.wx, { turb: this.turbulence(s) }) });
    if (!s.connected || !s.inFlight) { if (this.phase !== 'idle') this.reset('idle'); return Object.assign({}, s, { phase: this.phase, from: '' }); }
    if (s.paused) return Object.assign({}, s, { phase: this.phase, from: this.fromIcao });
    const now = s.t, L = limitsFor(s.emptyKg);
    // distance flown
    if (this.lastPos && !s.onGround) this.distance += distNm(this.lastPos[0], this.lastPos[1], s.lat, s.lon);
    this.lastPos = [s.lat, s.lon];
    // load: GSX if running, else payload stations
    const stationsKg = s.stations.reduce((a, b) => a + b.kg, 0);
    if (s.gsx.running && s.gsx.paxBoarded > 0) this.pax = s.gsx.paxBoarded;
    else if (!s.gsx.running) this.pax = Math.max(this.pax, estimatePax(s.stations));
    this.cargoKg = Math.max(this.cargoKg, s.stations.filter(x => /cargo|bag|freight|mail|hold/i.test(x.name)).reduce((a, b) => a + b.kg, 0) || 0);
    void stationsKg;

    if (this.phase === 'idle') {
      this.crashed = false;
      this.phase = s.onGround ? (s.gs < 2 ? 'parked' : 'taxi-out') : 'cruise';
      if (!s.onGround) this.startLeg(s, true);
    }

    // ground phases
    if (this.phase === 'parked' && s.onGround && s.gs > 3 && !s.parkingBrake) { this.startLeg(s, false); this.phase = 'taxi-out'; this.fire(this.evt('blocks-off', s, { airport: this.fromIcao })); }
    if (this.phase === 'taxi-out' && s.onGround && s.gs > 40) this.phase = 'takeoff';
    if ((this.phase === 'taxi-out' || this.phase === 'takeoff' || this.phase === 'parked') && !s.onGround && s.aglFt > 20) {
      if (!this.legStart) this.startLeg(s, false);
      this.airStart = now; this.phase = 'climb'; this.peakG = 1;
      this.fire(this.evt('takeoff', s, { airport: this.fromIcao }));
    }

    // airborne phases
    if (!s.onGround && ['climb', 'cruise', 'descent', 'approach', 'landed'].indexOf(this.phase) >= 0) {
      if (this.phase === 'landed') { this.bounces++; this.phase = 'approach'; }
      else if (s.vsFpm > 400) this.phase = 'climb';
      else if (s.vsFpm < -400) this.phase = s.aglFt < 3000 ? 'approach' : 'descent';
      else if (s.aglFt > 3000) this.phase = 'cruise';
      this.detectAirborne(s, p, L);
    }

    // touchdown
    if (s.onGround && p && !p.onGround && this.airStart && (this.phase === 'approach' || this.phase === 'descent' || this.phase === 'cruise' || this.phase === 'climb')) {
      const fpm = Math.round((s as any)._tdFpm || Math.abs(p.vsFpm));
      const pitch = Math.max((s as any)._tdPitch || -90, p.pitch, s.pitch);
      const g = Math.max(this.recentG(now, 1500), s.g);
      if (!this.touchdown) {
        this.touchdown = this.evt('touchdown', s, { fpm, g: round(g, 2), pitch: round(pitch, 1), bounces: 0, airport: this.nearestAirport(s.lat, s.lon, 4) });
        this.airEnd = now;
        this.fire(this.touchdown);
        if (pitch >= L.tailStrikeDeg) this.damage(s, 'tail-strike', 'grounding', `Pitch ${pitch.toFixed(1)}° at touchdown`);
        if (fpm >= L.damageFpm || g >= 2.6) this.damage(s, 'hard-landing', fpm >= L.damageFpm * 1.4 ? 'grounding' : 'major', `${fpm} fpm, ${g.toFixed(2)} g at touchdown`);
        else if (fpm >= L.hardFpm) this.damage(s, 'hard-landing', 'minor', `${fpm} fpm at touchdown: inspection recommended`);
      }
      this.phase = 'landed'; this.groundSince = now;
    }
    if (this.phase === 'landed' && s.onGround && s.gs < 30 && now - this.groundSince > 4000) this.phase = 'taxi-in';
    if (this.touchdown) this.touchdown.bounces = this.bounces;

    // blocks on: stopped with parking brake set or engines off
    if (this.phase === 'taxi-in' && s.onGround) {
      if (s.gs < 1 && (s.parkingBrake || s.enginesRunning === 0)) {
        if (!this.stoppedSince) this.stoppedSince = now;
        if (now - this.stoppedSince > 3000) this.finishLeg(s);
      } else this.stoppedSince = 0;
    }
    // engines failing at any time
    const failed: boolean[] = (s as any)._failed || [];
    failed.forEach((f, i) => { if (f) this.onlyOnce('eng' + i, () => this.damage(s, 'engine-failure', failed.filter(x => x).length > 1 ? 'grounding' : 'major', `Engine ${i + 1} failed`)); });

    return Object.assign({}, s, { phase: this.phase, from: this.phase === 'parked' ? this.nearestAirport(s.lat, s.lon, 5) : this.fromIcao });
  }

  private detectAirborne(s: RawSnapshot, p: RawSnapshot, L: Limits) {
    const now = s.t;
    this.gWindow.push({ t: now, g: s.g });
    while (this.gWindow.length && now - this.gWindow[0].t > 90000) this.gWindow.shift();
    this.peakG = Math.max(this.peakG, s.g);
    // flap / gear overspeed held for more than 3 seconds
    this.held('flap', !!(s as any)._flapOverspeed, now, 3000, () => this.damage(s, 'flap-overspeed', 'minor', `Flaps extended above their limit speed (${Math.round(s.ias)} kt)`));
    this.held('gear', !!(s as any)._gearOverspeed, now, 3000, () => this.damage(s, 'gear-overspeed', 'minor', `Gear extended above its limit speed (${Math.round(s.ias)} kt)`));
    // structural overstress
    const gMax = L.heavy ? 2.5 : 3.8, gMin = L.heavy ? -1.0 : -1.52;
    if (s.g > gMax || s.g < gMin) this.onlyOnce('overstress', () => this.damage(s, 'overstress', 'grounding', `Load factor ${s.g.toFixed(2)} g in flight`));
    // severe turbulence: repeated large swings in load factor within a minute, away from take-off and landing
    if (s.aglFt > 2500) {
      const w = this.gWindow.filter(x => now - x.t < 60000);
      let swings = 0, prev = 0;
      for (const x of w) { const dir = x.g > 1.8 ? 1 : x.g < 0.2 ? -1 : 0; if (dir && dir !== prev) { swings++; prev = dir; } }
      if (swings >= 6) this.onlyOnce('turbulence', () => {
        const peak = Math.max.apply(null, w.map(x => x.g)), low = Math.min.apply(null, w.map(x => x.g));
        this.fire(this.evt('turbulence', s, { code: 'severe-turbulence', severity: 'major', g: round(peak, 2), detail: `Severe turbulence: +${peak.toFixed(1)} g / ${low.toFixed(1)} g at ${Math.round(s.altFt / 100) * 100} ft` }));
      });
    }
    void p;
  }

  /** Turbulence as pilots report it, from the swing in load factor over the last 10 seconds (peak to peak):
   *  light under about 0.5 g, moderate 0.5-1.0 g, severe above 1.0 g. */
  private turbWin: { t: number; g: number }[] = [];
  private turbulence(s: RawSnapshot): 'none' | 'light' | 'moderate' | 'severe' {
    if (s.onGround || !s.inFlight) { this.turbWin = []; return 'none'; }
    this.turbWin.push({ t: s.t, g: s.g });
    while (this.turbWin.length && s.t - this.turbWin[0].t > 10000) this.turbWin.shift();
    if (this.turbWin.length < 4) return 'none';
    let hi = -9, lo = 9; for (const x of this.turbWin) { if (x.g > hi) hi = x.g; if (x.g < lo) lo = x.g; }
    const pp = hi - lo;
    return pp > 1.0 ? 'severe' : pp > 0.5 ? 'moderate' : pp > 0.15 ? 'light' : 'none';
  }

  private held(key: string, on: boolean, now: number, ms: number, fn: () => void) {
    if (!on) { this.flags[key] = 0; return; }
    if (!this.flags[key]) this.flags[key] = now;
    if (now - this.flags[key] >= ms) this.onlyOnce(key, fn);
  }
  private onlyOnce(key: string, fn: () => void) { if (this.reported[key]) return; this.reported[key] = true; fn(); }
  private recentG(now: number, ms: number): number { let m = 1; for (const x of this.gWindow) if (now - x.t <= ms) m = Math.max(m, x.g); return m; }

  private damage(s: RawSnapshot, code: FlightEvent['code'], severity: FlightEvent['severity'], detail: string) {
    this.fire(this.evt('damage', s, { code, severity, detail }));
  }

  private startLeg(s: RawSnapshot, airborne: boolean) {
    this.legStart = s.t; this.airStart = airborne ? s.t : 0; this.fromIcao = this.nearestAirport(s.lat, s.lon, airborne ? 0 : 5);
    this.fuelAtStart = s.fuelKg; this.distance = 0; this.lastPos = [s.lat, s.lon];
    this.touchdown = null; this.bounces = 0; this.reported = {}; this.flags = {}; this.gWindow = []; this.pax = 0; this.cargoKg = 0; this.peakG = 1;
  }

  private finishLeg(s: RawSnapshot) {
    const to = this.nearestAirport(s.lat, s.lon, 5);
    const summary: LegSummary = {
      from: this.fromIcao, to, blockMin: Math.round((s.t - this.legStart) / 60000), airMin: Math.round(((this.airEnd || s.t) - (this.airStart || this.legStart)) / 60000),
      distanceNm: Math.round(this.distance), fuelUsedKg: Math.max(0, Math.round(this.fuelAtStart - s.fuelKg)),
      landingFpm: this.touchdown ? this.touchdown.fpm : 0, landingG: this.touchdown ? this.touchdown.g : 0, pax: this.pax, cargoKg: Math.round(this.cargoKg),
      aircraftTitle: s.title, atcId: s.atcId,
    };
    this.fire(this.evt('blocks-on', s, { airport: to, summary }));
    this.reset('arrived');
  }

  private reset(phase: FlightPhase) {
    this.phase = phase; this.legStart = 0; this.airStart = 0; this.airEnd = 0; this.touchdown = null; this.stoppedSince = 0;
    if (phase === 'arrived') setTimeout(() => { if (this.phase === 'arrived') this.phase = 'parked'; }, 5000);
  }

  private evt(type: FlightEvent['type'], s: RawSnapshot, extra?: Partial<FlightEvent>): FlightEvent {
    return Object.assign({ type, t: s.t, lat: round(s.lat, 5), lon: round(s.lon, 5) }, extra || {});
  }
  private fire(e: FlightEvent) { this.emit('event', e); }

  /** Legs flown with the aircraft already in the air (app started mid-flight). */
  get legFrom(): string { return this.fromIcao; }
}

function estimatePax(stations: { name: string; kg: number }[]): number {
  const kg = stations.filter(x => /pax|passenger|seat|row|cabin|business|economy|first|zone/i.test(x.name) && !/pilot|crew|copilot|co-pilot/i.test(x.name)).reduce((a, b) => a + b.kg, 0);
  return Math.round(kg / 84);
}
function round(n: number, d: number): number { const f = Math.pow(10, d); return Math.round(n * f) / f; }
