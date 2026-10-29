// Published departures (SIDs), arrivals (STARs) and approaches straight from the simulator (SimConnect
// facility data), as the simulator's navigation data has them. The phone asks for an airport's procedures
// when its hired or co-op pilots fly there; they are read once per airport and session.
//
// Field names, types and order follow the SDK (SimConnect_AddToFacilityDefinition). Every leg comes with
// its fix's name and position. Each message also says which object it belongs to (its parent), which is
// how legs are put under the right transition.

import { EventEmitter } from 'events';

export interface ProcLeg { t: number; fix: string; lat: number; lon: number; alt: number; crs: number; dist: number; turn: number; arcLat?: number; arcLon?: number }
export interface ProcTransition { name: string; rwy?: string; legs: ProcLeg[] }
export interface Procedure { name: string; kind: 'sid' | 'star' | 'app'; type?: number; suffix?: string; rwy?: string; common: ProcLeg[]; runways: ProcTransition[]; enroute: ProcTransition[] }
export interface AirportProcedures { icao: string; lat: number; lon: number; sids: Procedure[]; stars: Procedure[]; apps: Procedure[] }

const DEF_PROC = 7300;
const DESIGNATOR = ['', 'L', 'R', 'C', 'W', 'A', 'B', ''];
const T = { AIRPORT: 0, APPROACH: 5, APPROACH_TRANSITION: 6, APPROACH_LEG: 7, FINAL_APPROACH_LEG: 8, MISSED_APPROACH_LEG: 9, DEPARTURE: 10, ARRIVAL: 11, RUNWAY_TRANSITION: 12, ENROUTE_TRANSITION: 13 };
const LEG_FIELDS = ['TYPE', 'FIX_ICAO', 'FIX_LATITUDE', 'FIX_LONGITUDE', 'COURSE', 'ROUTE_DISTANCE', 'ALTITUDE1', 'TURN_DIRECTION', 'ARC_CENTER_FIX_LATITUDE', 'ARC_CENTER_FIX_LONGITUDE'];

function rwyName(n: number, d: number): string { return n > 0 && n <= 36 ? String(n).padStart(2, '0') + (DESIGNATOR[d] || '') : ''; }
function str(v: any): string { return String(v || '').replace(/\0.*$/, '').trim(); }

export class ProcReader extends EventEmitter {
  private defined = false;
  private nextReq = 7400;
  private pending: { [req: number]: { icao: string; out: AirportProcedures; byId: { [id: number]: any }; last: any; lastProc: any; lastTrans: any; done: (p: AirportProcedures | null, err?: string) => void; timer: any } } = {};
  private cache: { [icao: string]: AirportProcedures } = {};

  constructor(private h: any) {
    super();
    h.on('facilityData', (r: any) => this.onData(r));
    h.on('facilityDataEnd', (r: any) => this.onEnd(r.userRequestId));
  }

  private define() {
    if (this.defined) return; this.defined = true;
    const add = (f: string) => this.h.addToFacilityDefinition(DEF_PROC, f);
    const legs = (open: string) => { add('OPEN ' + open); LEG_FIELDS.forEach(add); add('CLOSE ' + open); };
    const sidStar = (kind: string) => {
      add('OPEN ' + kind); ['NAME', 'N_RUNWAY_TRANSITIONS', 'N_ENROUTE_TRANSITIONS', 'N_APPROACH_LEGS'].forEach(add);
      add('OPEN RUNWAY_TRANSITION'); ['RUNWAY_NUMBER', 'RUNWAY_DESIGNATOR', 'N_APPROACH_LEGS'].forEach(add); legs('APPROACH_LEG'); add('CLOSE RUNWAY_TRANSITION');
      add('OPEN ENROUTE_TRANSITION'); ['NAME', 'N_APPROACH_LEGS'].forEach(add); legs('APPROACH_LEG'); add('CLOSE ENROUTE_TRANSITION');
      legs('APPROACH_LEG');
      add('CLOSE ' + kind);
    };
    add('OPEN AIRPORT');
    ['LATITUDE', 'LONGITUDE', 'N_DEPARTURES', 'N_ARRIVALS', 'N_APPROACHES'].forEach(add);
    sidStar('DEPARTURE');
    sidStar('ARRIVAL');
    add('OPEN APPROACH'); ['TYPE', 'SUFFIX', 'RUNWAY_NUMBER', 'RUNWAY_DESIGNATOR', 'N_TRANSITIONS', 'N_FINAL_APPROACH_LEGS', 'N_MISSED_APPROACH_LEGS'].forEach(add);
    add('OPEN APPROACH_TRANSITION'); ['NAME', 'N_APPROACH_LEGS'].forEach(add); legs('APPROACH_LEG'); add('CLOSE APPROACH_TRANSITION');
    legs('FINAL_APPROACH_LEG');
    add('CLOSE APPROACH');
    add('CLOSE AIRPORT');
  }

  /** An airport's procedures from the simulator (kept after the first time). */
  get(icao: string): Promise<AirportProcedures> {
    icao = String(icao || '').toUpperCase();
    if (this.cache[icao]) return Promise.resolve(this.cache[icao]);
    return new Promise((resolve, reject) => {
      try { this.define(); } catch (e) { return reject(new Error('This version of the simulator can\'t give procedures')); }
      const req = this.nextReq++;
      const out: AirportProcedures = { icao, lat: 0, lon: 0, sids: [], stars: [], apps: [] };
      const done = (res: AirportProcedures | null, err?: string) => { const p = this.pending[req]; if (p) clearTimeout(p.timer); delete this.pending[req]; if (res) { this.cache[icao] = res; resolve(res); } else reject(new Error(err || 'No procedures')); };
      this.pending[req] = { icao, out, byId: {}, last: null, lastProc: null, lastTrans: null, done, timer: setTimeout(() => done(out.sids.length || out.stars.length || out.apps.length ? out : null, 'The simulator didn\'t answer'), 20000) };
      try { this.h.requestFacilityData(DEF_PROC, req, icao); } catch (e) { done(null, String(e)); }
    });
  }

  private leg(d: any): ProcLeg {
    const t = d.readInt32(), fix = str(d.readString8()), lat = d.readFloat64(), lon = d.readFloat64(), crs = d.readFloat32(), dist = d.readFloat32(), alt = d.readFloat32(), turn = d.readInt32();
    const arcLat = d.readFloat64(), arcLon = d.readFloat64();
    const l: ProcLeg = { t, fix, lat: round6(lat), lon: round6(lon), alt: Math.round(alt), crs: Math.round(crs * 10) / 10, dist: Math.round(dist * 100) / 100, turn };
    if (Math.abs(arcLat) > 1e-6 || Math.abs(arcLon) > 1e-6) { l.arcLat = round6(arcLat); l.arcLon = round6(arcLon); }
    return l;
  }

  private onData(r: any) {
    const p = this.pending[r.userRequestId]; if (!p) return;
    const d = r.data, out = p.out;
    // the object this one belongs to: by the parent id the simulator sends, else the last one of that kind
    const parent = r.parentUniqueRequestId != null && p.byId[r.parentUniqueRequestId] ? p.byId[r.parentUniqueRequestId] : null;
    const keep = (o: any) => { if (r.uniqueRequestId != null) p.byId[r.uniqueRequestId] = o; return o; };
    try {
      switch (r.type) {
        case T.AIRPORT: out.lat = d.readFloat64(); out.lon = d.readFloat64(); d.readInt32(); d.readInt32(); d.readInt32(); break;
        case T.DEPARTURE: case T.ARRIVAL: {
          const name = str(d.readString8()); d.readInt32(); d.readInt32(); d.readInt32();
          const pr: Procedure = keep({ name, kind: r.type === T.DEPARTURE ? 'sid' : 'star', common: [], runways: [], enroute: [] });
          (r.type === T.DEPARTURE ? out.sids : out.stars).push(pr); p.lastProc = pr; p.lastTrans = null; break;
        }
        case T.APPROACH: {
          const type = d.readInt32(), suffix = d.readInt32(), rn = d.readInt32(), rd = d.readInt32(); d.readInt32(); d.readInt32(); d.readInt32();
          const pr: Procedure = keep({ name: '', kind: 'app', type, suffix: suffix > 0 ? String.fromCharCode(suffix) : '', rwy: rwyName(rn, rd), common: [], runways: [], enroute: [] });
          out.apps.push(pr); p.lastProc = pr; p.lastTrans = null; break;
        }
        case T.RUNWAY_TRANSITION: {
          const rn = d.readInt32(), rd = d.readInt32(); d.readInt32();
          const tr: ProcTransition = keep({ name: '', rwy: rwyName(rn, rd), legs: [] });
          const pr = parent || p.lastProc; if (pr) pr.runways.push(tr); p.lastTrans = tr; break;
        }
        case T.ENROUTE_TRANSITION: case T.APPROACH_TRANSITION: {
          const name = str(d.readString8()); d.readInt32();
          const tr: ProcTransition = keep({ name, legs: [] });
          const pr = parent || p.lastProc; if (pr) pr.enroute.push(tr); p.lastTrans = tr; break;
        }
        case T.APPROACH_LEG: case T.FINAL_APPROACH_LEG: {
          const l = this.leg(d);
          // under a transition, or directly under the procedure (its common part / the final approach)
          if (parent) (parent.legs || parent.common).push(l);
          else if (r.type === T.FINAL_APPROACH_LEG) { if (p.lastProc) p.lastProc.common.push(l); }
          else if (p.lastTrans) p.lastTrans.legs.push(l);
          else if (p.lastProc) p.lastProc.common.push(l);
          break;
        }
      }
    } catch (e) { this.emit('note', `Procedures ${p.icao}: ${String(e)}`); }
  }

  private onEnd(req: number) {
    const p = this.pending[req]; if (!p) return;
    const o = p.out;
    if (!o.sids.length && !o.stars.length && !o.apps.length) return p.done(null, 'The simulator has no procedures for ' + p.icao);
    p.done(o);
  }
}

function round6(v: number) { return Math.round(v * 1e6) / 1e6; }
