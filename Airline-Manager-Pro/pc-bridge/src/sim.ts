// Reads the user's aircraft from Microsoft Flight Simulator through SimConnect.
// Uses node-simconnect (LGPL-3.0), which speaks the SimConnect protocol directly:
// no SDK and no SimConnect.dll are needed on the PC.

import { EventEmitter } from 'events';
import { LB_TO_KG } from './geo';
import type { SimSnapshot, Airport } from './protocol';

export type RawSnapshot = Omit<SimSnapshot, 'phase' | 'from'>;

/** Anything that produces snapshots: the real sim, or a recorded/simulated flight for testing. */
export interface SimSource extends EventEmitter {
  start(): void;
  stop(): void;
  requestAirports(): void;
  // events: 'snapshot' (RawSnapshot), 'crash', 'airports' (Airport[]), 'status' (connected: boolean, text: string)
}

const MAX_STATIONS = 20;

enum Def { MAIN = 1, TEXT = 2, STATIONS = 3, STATION_NAMES = 4, GSX = 5 }
enum Req { MAIN = 1, TEXT = 2, STATIONS = 3, STATION_NAMES = 4, GSX = 5 }
enum Evt { CRASHED = 1, PAUSE = 2, SIM = 3, FLIGHT_LOADED = 4 }
const AIRPORT_REQ = 10;

// [name, unit] read as FLOAT64, in this exact order
const MAIN_VARS: [string, string][] = [
  ['PLANE LATITUDE', 'degrees'], ['PLANE LONGITUDE', 'degrees'], ['PLANE ALTITUDE', 'feet'], ['PLANE ALT ABOVE GROUND', 'feet'],
  ['PLANE HEADING DEGREES TRUE', 'degrees'], ['AIRSPEED INDICATED', 'knots'], ['GROUND VELOCITY', 'knots'], ['VERTICAL SPEED', 'feet per minute'],
  ['G FORCE', 'GForce'], ['PLANE PITCH DEGREES', 'degrees'], ['SIM ON GROUND', 'bool'], ['BRAKE PARKING POSITION', 'bool'],
  ['NUMBER OF ENGINES', 'number'], ['GENERAL ENG COMBUSTION:1', 'bool'], ['GENERAL ENG COMBUSTION:2', 'bool'], ['GENERAL ENG COMBUSTION:3', 'bool'], ['GENERAL ENG COMBUSTION:4', 'bool'],
  ['ENG FAILED:1', 'bool'], ['ENG FAILED:2', 'bool'], ['ENG FAILED:3', 'bool'], ['ENG FAILED:4', 'bool'],
  ['FLAPS HANDLE INDEX', 'number'], ['GEAR HANDLE POSITION', 'bool'], ['FLAP SPEED EXCEEDED', 'bool'], ['GEAR SPEED EXCEEDED', 'bool'],
  ['FUEL TOTAL QUANTITY WEIGHT', 'pounds'], ['EMPTY WEIGHT', 'pounds'], ['TOTAL WEIGHT', 'pounds'], ['MAX GROSS WEIGHT', 'pounds'],
  ['PLANE TOUCHDOWN NORMAL VELOCITY', 'feet per second'], ['PLANE TOUCHDOWN PITCH DEGREES', 'degrees'], ['PAYLOAD STATION COUNT', 'number'],
  // weather around the aircraft
  ['AMBIENT WIND DIRECTION', 'degrees'], ['AMBIENT WIND VELOCITY', 'knots'], ['AMBIENT VISIBILITY', 'meters'], ['AMBIENT TEMPERATURE', 'celsius'],
  ['SEA LEVEL PRESSURE', 'millibars'], ['AMBIENT PRECIP STATE', 'mask'], ['AMBIENT PRECIP RATE', 'millimeters of water'], ['AMBIENT IN CLOUD', 'bool'],
];
const GSX_VARS: [string, string][] = [
  ['L:FSDT_GSX_COUATL_STARTED', 'number'], ['L:FSDT_GSX_BOARDING_STATE', 'number'],
  ['L:FSDT_GSX_NUMPASSENGERS_BOARDING_TOTAL', 'number'], ['L:FSDT_GSX_NUMPASSENGERS', 'number'], ['L:FSDT_GSX_BOARDING_CARGO_PERCENT', 'number'],
  // the other ground services, so the phone can charge what was actually used
  ['L:FSDT_GSX_DEBOARDING_STATE', 'number'], ['L:FSDT_GSX_CATERING_STATE', 'number'], ['L:FSDT_GSX_REFUELING_STATE', 'number'],
  ['L:FSDT_GSX_DEPARTURE_STATE', 'number'], ['L:FSDT_GSX_DEICING_STATE', 'number'], ['L:FSDT_GSX_FUELHOSE_CONNECTED', 'number'],
];

export class SimConnectSource extends EventEmitter implements SimSource {
  private handle: any = null;
  private lib: any = null;
  private timer: any = null;
  private retry: any = null;
  private stopped = false;
  private snap: RawSnapshot = emptySnapshot();
  private stationCount = 0;
  private stationNames: string[] = [];

  constructor(lib: any) { super(); this.lib = lib; }

  start() { this.stopped = false; this.connect(); }

  stop() {
    this.stopped = true;
    clearInterval(this.timer); clearTimeout(this.retry);
    try { if (this.handle) this.handle.close(); } catch (e) { /* already closed */ }
    this.handle = null;
  }

  requestAirports() {
    if (!this.handle) return;
    try { this.handle.requestFacilitiesList(this.lib.FacilityListType.AIRPORT, AIRPORT_REQ); } catch (e) { /* not supported */ }
  }

  private async connect() {
    if (this.stopped) return;
    const L = this.lib;
    this.emit('status', false, 'Looking for Microsoft Flight Simulator…');
    let res: any = null;
    for (const proto of [L.Protocol.KittyHawk, L.Protocol.FSX_SP2]) {
      try { res = await L.open('Airline Manager Pro', proto); break; } catch (e) { res = null; }
    }
    if (!res) { this.retry = setTimeout(() => this.connect(), 5000); return; }
    const h = this.handle = res.handle;
    const simName = res.recvOpen && res.recvOpen.applicationName || 'Microsoft Flight Simulator';
    this.snap = emptySnapshot();
    this.snap.connected = true;
    this.snap.sim = /2024/.test(simName) || (res.recvOpen && res.recvOpen.applicationVersionMajor >= 12) ? 'MSFS 2024' : simName.replace('KittyHawk', 'MSFS 2020');
    this.emit('status', true, `Connected to ${this.snap.sim}`);

    const F64 = L.SimConnectDataType.FLOAT64;
    for (const [n, u] of MAIN_VARS) h.addToDataDefinition(Def.MAIN, n, u, F64);
    h.addToDataDefinition(Def.TEXT, 'TITLE', null, L.SimConnectDataType.STRING256);
    h.addToDataDefinition(Def.TEXT, 'ATC ID', null, L.SimConnectDataType.STRING32);
    h.addToDataDefinition(Def.TEXT, 'ATC MODEL', null, L.SimConnectDataType.STRING32);
    h.addToDataDefinition(Def.TEXT, 'ATC TYPE', null, L.SimConnectDataType.STRING32);
    h.addToDataDefinition(Def.TEXT, 'GPS APPROACH AIRPORT ID', null, L.SimConnectDataType.STRING32);
    for (let i = 1; i <= MAX_STATIONS; i++) h.addToDataDefinition(Def.STATIONS, `PAYLOAD STATION WEIGHT:${i}`, 'pounds', F64);
    for (let i = 1; i <= MAX_STATIONS; i++) h.addToDataDefinition(Def.STATION_NAMES, `PAYLOAD STATION NAME:${i}`, null, L.SimConnectDataType.STRING64);
    for (const [n, u] of GSX_VARS) h.addToDataDefinition(Def.GSX, n, u, F64);

    const USER = L.SimConnectConstants.OBJECT_ID_USER, P = L.SimConnectPeriod;
    // about 6–10 times a second, so touchdowns and G spikes aren't missed
    h.requestDataOnSimObject(Req.MAIN, Def.MAIN, USER, P.SIM_FRAME, 0, 0, 5);
    h.requestDataOnSimObject(Req.TEXT, Def.TEXT, USER, P.SECOND, 0, 0, 5);
    h.requestDataOnSimObject(Req.STATIONS, Def.STATIONS, USER, P.SECOND, 0, 0, 2);
    h.requestDataOnSimObject(Req.STATION_NAMES, Def.STATION_NAMES, USER, P.SECOND, 0, 0, 30);
    h.requestDataOnSimObject(Req.GSX, Def.GSX, USER, P.SECOND);

    h.subscribeToSystemEvent(Evt.CRASHED, 'Crashed');
    h.subscribeToSystemEvent(Evt.PAUSE, 'Pause');
    h.subscribeToSystemEvent(Evt.SIM, 'Sim');
    h.subscribeToSystemEvent(Evt.FLIGHT_LOADED, 'FlightLoaded');

    h.on('simObjectData', (r: any) => this.onData(r));
    h.on('event', (e: any) => {
      if (e.clientEventId === Evt.CRASHED) this.emit('crash');
      if (e.clientEventId === Evt.PAUSE) this.snap.paused = e.data === 1;
      if (e.clientEventId === Evt.SIM) this.snap.inFlight = e.data === 1;
      if (e.clientEventId === Evt.FLIGHT_LOADED) this.requestAirports();
    });
    h.on('airportList', (r: any) => {
      const list: Airport[] = (r.airports || []).map((a: any) => ({ icao: String(a.icao).trim(), lat: a.latitude, lon: a.longitude }))
        .filter((a: Airport) => /^[A-Z0-9]{3,5}$/.test(a.icao));
      this.emit('airports', list);
    });
    // usually a variable this aircraft doesn't have: carry on, but note it in the log
    const seenEx: { [k: string]: boolean } = {};
    h.on('exception', (x: any) => {
      const key = `${x && x.exception}/${x && x.sendId}/${x && x.index}`;
      if (seenEx[key]) return; seenEx[key] = true;
      this.emit('note', `SimConnect exception ${x && x.exception} (send ${x && x.sendId}, index ${x && x.index})`);
    });
    const lost = () => {
      if (this.handle !== h) return;
      this.handle = null; clearInterval(this.timer);
      this.snap = emptySnapshot();
      this.emit('status', false, 'Flight Simulator closed. Waiting for it to start…');
      this.emit('snapshot', Object.assign({}, this.snap));
      this.retry = setTimeout(() => this.connect(), 5000);
    };
    h.on('quit', lost);
    h.on('close', lost);
    h.on('error', (e: any) => { this.emit('note', 'SimConnect connection error: ' + (e && e.message ? e.message : String(e))); lost(); });

    this.requestAirports();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.requestAirports(), 30000);
  }

  private onData(r: any) {
    const d = r.data, s = this.snap;
    if (r.requestID === Req.MAIN) {
      const v: number[] = MAIN_VARS.map(() => d.readFloat64());
      let i = 0;
      s.lat = v[i++]; s.lon = v[i++]; s.altFt = v[i++]; s.aglFt = v[i++]; s.hdg = v[i++]; s.ias = v[i++]; s.gs = v[i++]; s.vsFpm = v[i++];
      s.g = v[i++]; s.pitch = -v[i++]; s.onGround = v[i++] > 0.5; s.parkingBrake = v[i++] > 0.5;
      s.engines = Math.round(v[i++]);
      const comb = [v[i++], v[i++], v[i++], v[i++]], failed = [v[i++], v[i++], v[i++], v[i++]];
      s.enginesRunning = comb.slice(0, Math.max(1, s.engines)).filter(x => x > 0.5).length;
      (s as any)._failed = failed.slice(0, Math.max(1, s.engines)).map(x => x > 0.5);
      s.flapsIndex = v[i++]; s.gearDown = v[i++] > 0.5;
      (s as any)._flapOverspeed = v[i++] > 0.5; (s as any)._gearOverspeed = v[i++] > 0.5;
      s.fuelKg = v[i++] * LB_TO_KG; s.emptyKg = v[i++] * LB_TO_KG; s.totalKg = v[i++] * LB_TO_KG; s.mtowKg = v[i++] * LB_TO_KG;
      (s as any)._tdFpm = Math.abs(v[i++] * 60); (s as any)._tdPitch = -v[i++];
      this.stationCount = Math.min(MAX_STATIONS, Math.round(v[i++]));
      const wDir = v[i++], wKt = v[i++], vis = v[i++], temp = v[i++], qnh = v[i++], pState = v[i++], pRate = v[i++], cloud = v[i++];
      // precipitation state is a bit mask: 2 none, 4 rain, 8 snow
      s.wx = { windDir: Math.round(wDir), windKt: Math.round(wKt), visM: Math.round(vis), tempC: Math.round(temp), qnhHpa: Math.round(qnh),
        precip: (pState & 8) ? 'snow' : (pState & 4) ? 'rain' : 'none', precipMm: Math.round(pRate * 10) / 10, inCloud: cloud > 0.5, turb: 'none' };
      if (!s.inFlight && (s.lat !== 0 || s.lon !== 0) && s.totalKg > 0) s.inFlight = true;
      s.t = Date.now();
      this.emit('snapshot', Object.assign({}, s, { stations: s.stations.slice() }));
    } else if (r.requestID === Req.TEXT) {
      s.title = d.readString256().trim(); s.atcId = d.readString32().trim(); s.atcModel = d.readString32().trim();
      s.atcType = d.readString32().trim(); s.approachAirport = d.readString32().trim();
    } else if (r.requestID === Req.STATIONS) {
      const w: number[] = []; for (let k = 0; k < MAX_STATIONS; k++) w.push(d.readFloat64() * LB_TO_KG);
      s.stations = w.slice(0, this.stationCount).map((kg, k) => ({ name: this.stationNames[k] || `Station ${k + 1}`, kg }));
    } else if (r.requestID === Req.STATION_NAMES) {
      const n: string[] = []; for (let k = 0; k < MAX_STATIONS; k++) n.push(d.readString64().trim());
      this.stationNames = n;
    } else if (r.requestID === Req.GSX) {
      const g: number[] = GSX_VARS.map(() => d.readFloat64());
      s.gsx = { running: g[0] > 0.5, boardingState: Math.round(g[1]), paxBoarded: Math.round(g[2]), paxTotal: Math.round(g[3]), cargoPct: g[4],
        deboarding: Math.round(g[5]), catering: Math.round(g[6]), refueling: Math.round(g[7]), departure: Math.round(g[8]), deicing: Math.round(g[9]), fuelHose: g[10] > 0.5 };
    }
  }
}

export function emptySnapshot(): RawSnapshot {
  return {
    t: Date.now(), connected: false, sim: '', inFlight: false, paused: false, title: '', atcId: '', atcModel: '', atcType: '',
    lat: 0, lon: 0, altFt: 0, aglFt: 0, hdg: 0, ias: 0, gs: 0, vsFpm: 0, g: 1, pitch: 0, onGround: true, parkingBrake: true,
    enginesRunning: 0, engines: 0, flapsIndex: 0, gearDown: true, fuelKg: 0, emptyKg: 0, totalKg: 0, mtowKg: 0, stations: [],
    gsx: { running: false, boardingState: 0, paxBoarded: 0, paxTotal: 0, cargoPct: 0 }, approachAirport: '',
    wx: { windDir: 0, windKt: 0, visM: 0, tempC: 15, qnhHpa: 1013, precip: 'none', precipMm: 0, inCloud: false, turb: 'none' },
  };
}
