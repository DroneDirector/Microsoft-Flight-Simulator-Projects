// Airport layouts straight from the simulator (SimConnect facility data): runways, taxiways, parking
// stands and gates exactly as the simulator has them, add-on scenery included. The phone and the app on
// Windows ask for an airport when you open it in the airport view; layouts are kept, so each airport is
// read only once per session.
//
// Field names, types and order follow the SDK (SimConnect_AddToFacilityDefinition). The data arrives in
// the order it is defined, one message per airport, runway, taxi point, stand, taxi path and taxi name.

import { EventEmitter } from 'events';

export interface AirportLayout {
  icao: string; name: string; lat: number; lon: number; alt: number; magvar: number;
  /** centre, true heading, length and width (metres), surface, both ends ("09L", "27R") */
  runways: { lat: number; lon: number; hdg: number; len: number; wid: number; surf: number; a: string; b: string }[];
  /** taxi points: [east m, north m, type] */
  points: number[][];
  /** stands: [east m, north m, heading, radius m, type, name code, number] */
  parks: number[][];
  /** taxi paths: [type, width m, start, end, name index, runway number, runway designator] */
  paths: number[][];
  names: string[];
}

const DEF_LAYOUT = 7100;
const DESIGNATOR = ['', 'L', 'R', 'C', 'W', 'A', 'B', ''];

export class LayoutReader extends EventEmitter {
  private defined = false;
  private nextReq = 7200;
  private pending: { [req: number]: { icao: string; l: AirportLayout; done: (l: AirportLayout | null, err?: string) => void; timer: any } } = {};
  private cache: { [icao: string]: AirportLayout } = {};

  constructor(private h: any) {
    super();
    h.on('facilityData', (r: any) => this.onData(r));
    h.on('facilityDataEnd', (r: any) => this.onEnd(r.userRequestId));
  }

  private define() {
    if (this.defined) return; this.defined = true;
    const add = (f: string) => this.h.addToFacilityDefinition(DEF_LAYOUT, f);
    add('OPEN AIRPORT');
    ['LATITUDE', 'LONGITUDE', 'ALTITUDE', 'MAGVAR', 'NAME', 'N_RUNWAYS', 'N_TAXI_POINTS', 'N_TAXI_PARKINGS', 'N_TAXI_PATHS', 'N_TAXI_NAMES'].forEach(add);
    add('OPEN RUNWAY'); ['LATITUDE', 'LONGITUDE', 'HEADING', 'LENGTH', 'WIDTH', 'SURFACE', 'PRIMARY_NUMBER', 'PRIMARY_DESIGNATOR', 'SECONDARY_NUMBER', 'SECONDARY_DESIGNATOR'].forEach(add); add('CLOSE RUNWAY');
    add('OPEN TAXI_POINT'); ['TYPE', 'BIAS_X', 'BIAS_Z'].forEach(add); add('CLOSE TAXI_POINT');
    add('OPEN TAXI_PARKING'); ['TYPE', 'NAME', 'NUMBER', 'HEADING', 'RADIUS', 'BIAS_X', 'BIAS_Z'].forEach(add); add('CLOSE TAXI_PARKING');
    add('OPEN TAXI_PATH'); ['TYPE', 'WIDTH', 'RUNWAY_NUMBER', 'RUNWAY_DESIGNATOR', 'START', 'END', 'NAME_INDEX'].forEach(add); add('CLOSE TAXI_PATH');
    add('OPEN TAXI_NAME'); add('NAME'); add('CLOSE TAXI_NAME');
    add('CLOSE AIRPORT');
  }

  /** The airport's layout from the simulator (kept after the first time). */
  get(icao: string): Promise<AirportLayout> {
    icao = String(icao || '').toUpperCase();
    if (this.cache[icao]) return Promise.resolve(this.cache[icao]);
    return new Promise((resolve, reject) => {
      try { this.define(); } catch (e) { return reject(new Error('This version of the simulator can\'t give airport layouts')); }
      const req = this.nextReq++;
      const l: AirportLayout = { icao, name: '', lat: 0, lon: 0, alt: 0, magvar: 0, runways: [], points: [], parks: [], paths: [], names: [] };
      const done = (res: AirportLayout | null, err?: string) => { clearTimeout(this.pending[req] && this.pending[req].timer); delete this.pending[req]; if (res) { this.cache[icao] = res; resolve(res); } else reject(new Error(err || 'No layout')); };
      this.pending[req] = { icao, l, done, timer: setTimeout(() => done(l.lat || l.runways.length ? l : null, 'The simulator didn\'t answer'), 15000) };
      try { this.h.requestFacilityData(DEF_LAYOUT, req, icao); } catch (e) { done(null, String(e)); }
    });
  }

  private onData(r: any) {
    const p = this.pending[r.userRequestId]; if (!p) return;
    const d = r.data, l = p.l;
    try {
      switch (r.type) {
        case 0: { // AIRPORT
          l.lat = d.readFloat64(); l.lon = d.readFloat64(); l.alt = d.readFloat64(); l.magvar = d.readFloat32();
          l.name = String(d.readString32() || '').replace(/\0.*$/, '').trim();
          d.readInt32(); d.readInt32(); d.readInt32(); d.readInt32(); d.readInt32();
          break;
        }
        case 1: { // RUNWAY
          const lat = d.readFloat64(), lon = d.readFloat64(), hdg = d.readFloat32(), len = d.readFloat32(), wid = d.readFloat32(), surf = d.readInt32();
          const pn = d.readInt32(), pd = d.readInt32(), sn = d.readInt32(), sd = d.readInt32();
          const name = (n: number, des: number) => n > 0 && n <= 36 ? String(n).padStart(2, '0') + (DESIGNATOR[des] || '') : n === 37 ? 'N' : n === 38 ? 'NE' : n === 39 ? 'E' : n === 40 ? 'SE' : n === 41 ? 'S' : n === 42 ? 'SW' : n === 43 ? 'W' : n === 44 ? 'NW' : '';
          if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && len > 0 && len < 10000) l.runways.push({ lat, lon, hdg, len, wid, surf, a: name(pn, pd), b: name(sn, sd) });
          break;
        }
        case 14: { // TAXI_POINT
          const type = d.readInt32(), x = d.readFloat32(), z = d.readFloat32();
          l.points.push([round1(x), round1(z), type]);
          break;
        }
        case 15: { // TAXI_PARKING
          const type = d.readInt32(), name = d.readInt32(), number = d.readUint32(), hdg = d.readFloat32(), radius = d.readFloat32(), x = d.readFloat32(), z = d.readFloat32();
          l.parks.push([round1(x), round1(z), Math.round(hdg), round1(radius), type, name, number]);
          break;
        }
        case 16: { // TAXI_PATH
          const type = d.readInt32(), width = d.readFloat32(), rn = d.readInt32(), rd = d.readInt32(), start = d.readInt32(), end = d.readInt32(), ni = d.readUint32();
          l.paths.push([type, round1(width), start, end, ni, rn, rd]);
          break;
        }
        case 17: { // TAXI_NAME
          l.names.push(String(d.readString32() || '').replace(/\0.*$/, '').trim());
          break;
        }
      }
    } catch (e) { this.emit('note', `Airport layout ${p.icao}: ${String(e)}`); }
  }

  private onEnd(req: number) {
    const p = this.pending[req]; if (!p) return;
    const l = p.l;
    // a sanity check: a layout with a position and at least one runway
    if (!l.lat && !l.lon) return p.done(null, 'The simulator has no airport ' + p.icao);
    p.done(l);
  }
}

function round1(v: number) { return Math.round(v * 10) / 10; }
