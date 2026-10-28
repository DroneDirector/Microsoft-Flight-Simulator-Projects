// A simulated flight for testing without Flight Simulator: EKVG to EKCH in an A320,
// with options for a hard landing, a tail strike, flap overspeed and severe turbulence.

import { EventEmitter } from 'events';
import { SimSource, RawSnapshot, emptySnapshot } from './sim';
import type { Airport } from './protocol';

export interface FakeOptions { speed?: number; hard?: boolean; tailStrike?: boolean; flapOverspeed?: boolean; turbulence?: boolean; crash?: boolean; gsx?: boolean }

const EKVG = { lat: 62.0636, lon: -7.2772 }, EKCH = { lat: 55.6181, lon: 12.6561 };
export const FAKE_AIRPORTS: Airport[] = [
  { icao: 'EKVG', lat: EKVG.lat, lon: EKVG.lon }, { icao: 'EKCH', lat: EKCH.lat, lon: EKCH.lon },
  { icao: 'EKRK', lat: 55.5856, lon: 12.1314 }, { icao: 'ENBR', lat: 60.2934, lon: 5.218 },
];

export class FakeSim extends EventEmitter implements SimSource {
  private timer: any = null; private t = 0;
  constructor(private o: FakeOptions = {}) { super(); }
  start() {
    this.emit('status', true, 'Connected to MSFS 2024 (simulated flight)');
    setTimeout(() => this.emit('airports', FAKE_AIRPORTS), 50);
    const dt = 0.25;                       // simulated seconds per tick
    const speed = this.o.speed || 120;     // simulation runs this many times faster than real time
    this.timer = setInterval(() => { for (let i = 0; i < 4; i++) { this.t += dt; const s = this.at(this.t); if (s) this.emit('snapshot', s); else { this.stop(); this.emit('done'); return; } } }, Math.max(1, Math.round(dt * 4 * 1000 / speed)));
  }
  stop() { clearInterval(this.timer); }
  requestAirports() { this.emit('airports', FAKE_AIRPORTS); }

  /** State of the flight at time t (seconds). Returns null when the flight is over. */
  at(t: number): RawSnapshot {
    const s = emptySnapshot();
    Object.assign(s, { connected: true, sim: 'MSFS 2024', inFlight: true, title: 'FenixA320 CFM - Atlantic North', atcId: 'OY-ANA', atcModel: 'A320', atcType: 'AIRBUS',
      engines: 2, emptyKg: 42600, mtowKg: 78000, t: 1700000000000 + t * 1000 });
    const boarded = Math.min(168, Math.floor(t / 2));
    s.gsx = { running: !!this.o.gsx, boardingState: t < 340 ? 6 : 7, paxBoarded: this.o.gsx ? boarded : 0, paxTotal: 168, cargoPct: Math.min(100, t / 3.4) };
    s.stations = [{ name: 'Passengers zone A', kg: boarded * 42 }, { name: 'Passengers zone B', kg: boarded * 42 }, { name: 'Forward cargo', kg: 1150 }, { name: 'Aft baggage', kg: 2520 }];
    const fuel0 = 6840;
    const legNm = 726, cruiseKt = 450;
    const T_PARK = 360, T_TAXI = 480, T_ROLL = 520, T_CLIMB = 520 + 1200, cruiseSec = (legNm - 230) / cruiseKt * 3600, T_DESC = T_CLIMB + cruiseSec, T_LAND = T_DESC + 1500, T_TAXI_IN = T_LAND + 300, T_END = T_TAXI_IN + 30;
    s.fuelKg = fuel0 - Math.max(0, t - T_TAXI) * 0.85;
    s.totalKg = s.emptyKg + s.fuelKg + s.stations.reduce((a, b) => a + b.kg, 0);
    const frac = (x: number) => Math.max(0, Math.min(1, x));
    const pos = (f: number) => ({ lat: EKVG.lat + (EKCH.lat - EKVG.lat) * f, lon: EKVG.lon + (EKCH.lon - EKVG.lon) * f });
    if (t > T_END) return null;
    let f = 0;
    s.onGround = true; s.parkingBrake = t < T_PARK || t > T_TAXI_IN; s.enginesRunning = t > T_PARK - 120 && t < T_TAXI_IN + 20 ? 2 : 0;
    if (t < T_PARK) { s.gs = 0; }
    else if (t < T_TAXI) { s.gs = 15; f = 0.0005 * (t - T_PARK) / 120; }
    else if (t < T_ROLL) { s.gs = 20 + 140 * (t - T_TAXI) / 40; s.ias = s.gs; f = 0.001; }
    else if (t < T_CLIMB) { const k = (t - T_ROLL) / (T_CLIMB - T_ROLL); s.onGround = false; s.altFt = 35000 * k; s.aglFt = s.altFt; s.vsFpm = 1750; s.ias = 250; s.gs = 380; s.pitch = 7; f = 115 / legNm * k; }
    else if (t < T_DESC) { s.onGround = false; s.altFt = 35000; s.aglFt = 35000; s.ias = 270; s.gs = cruiseKt; f = (115 + (t - T_CLIMB) / cruiseSec * (legNm - 230)) / legNm; s.pitch = 2.5; }
    else if (t < T_LAND) { const k = (t - T_DESC) / (T_LAND - T_DESC); s.onGround = false; s.altFt = 35000 * (1 - k); s.aglFt = s.altFt; s.vsFpm = this.o.hard && k > 0.995 ? -820 : -1400 * (1 - k) - 180; s.ias = 160 + 120 * (1 - k); s.gs = s.ias; s.pitch = this.o.tailStrike && k > 0.99 ? 12.5 : 3; f = 1 - 115 / legNm * (1 - k); s.flapsIndex = k > 0.8 ? 4 : 0; s.gearDown = k > 0.85; }
    else if (t < T_TAXI_IN) { s.gs = Math.max(15, 140 - (t - T_LAND) * 2); f = 1; s.vsFpm = 0; }
    else { s.gs = 0; f = 1; }
    if (t >= T_LAND && t < T_LAND + 1) { (s as any)._tdFpm = this.o.hard ? 820 : 172; (s as any)._tdPitch = this.o.tailStrike ? 12.5 : 4.6; s.g = this.o.hard ? 1.92 : 1.12; s.pitch = this.o.tailStrike ? 12.5 : 4.6; }
    if (this.o.flapOverspeed && t > T_LAND - 400 && t < T_LAND - 380) { (s as any)._flapOverspeed = true; s.ias = 245; }
    if (this.o.turbulence && t > T_CLIMB + 300 && t < T_CLIMB + 340) { s.g = Math.sin(t * 6) > 0 ? 2.3 : -0.4; }
    if (this.o.crash && t > T_LAND - 3) { this.emit('crash'); return null; }
    const p = pos(f); s.lat = p.lat; s.lon = p.lon; s.hdg = 125;
    return s;
  }
}
