// Real-world airways from the simulator's own navigation data (SimConnect facility data): every waypoint, VOR and
// NDB with the airways through it (name, high or low, the next and previous waypoint on it). A route between two
// airports is found along them the way flight planners do it: from where the departures end to where the
// arrivals begin, on the high airways (jet routes) for airliners and cargo jets and the low airways for
// turboprops and light aircraft, as short as possible with few changes of airway. What is read is kept in the
// PC app's data folder, so the same parts of the network are read only once.

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface AwyNode { k: string; id: string; reg: string; t: string; lat: number; lon: number; r: AwyEdge[] }
export interface AwyEdge { awy: string; cls: number; k: string; id: string; lat: number; lon: number }   // cls: 1 low, 2 high, 3 both
export interface AwyFix { id: string; lat: number; lon: number; via: string }

const DEF_WPT = 7600, DEF_VOR = 7601, DEF_NDB = 7602;
const ROUTE_FIELDS = ['NAME', 'TYPE', 'NEXT_ICAO', 'NEXT_REGION', 'NEXT_TYPE', 'NEXT_LATITUDE', 'NEXT_LONGITUDE', 'NEXT_ALTITUDE', 'PREV_ICAO', 'PREV_REGION', 'PREV_TYPE', 'PREV_LATITUDE', 'PREV_LONGITUDE', 'PREV_ALTITUDE'];
const D2R = Math.PI / 180;
function gcNm(a: number[], b: number[]) { const f1 = a[1] * D2R, f2 = b[1] * D2R, dl = (b[0] - a[0]) * D2R; return 3440.065 * Math.acos(Math.min(1, Math.sin(f1) * Math.sin(f2) + Math.cos(f1) * Math.cos(f2) * Math.cos(dl))); }
function str(v: any): string { return String(v || '').replace(/\0.*$/, '').trim(); }
const typeChar = (n: number) => n > 31 && n < 127 ? String.fromCharCode(n) : 'W';

export class AirwayReader extends EventEmitter {
  private defined = false; private nextReq = 20000;
  private pending: { [req: number]: { node: AwyNode; done: (n: AwyNode | null) => void; timer: any } } = {};
  private nodes: { [k: string]: AwyNode } = {};
  private file = ''; private dirty = false; private saveT: any = null;
  private routes: { [k: string]: { at: number; fixes: AwyFix[] } } = {};

  constructor(private h: any, dataDir: string, private lib: any) {
    super();
    h.on('facilityData', (r: any) => this.onData(r));
    h.on('facilityDataEnd', (r: any) => this.onEnd(r.userRequestId));
    this.file = path.join(dataDir, 'airways.json');
    try { const j = JSON.parse(fs.readFileSync(this.file, 'utf8')); this.nodes = j.nodes || {}; this.routes = j.routes || {}; } catch (e) { /* none yet */ }
  }
  private save() {
    this.dirty = true; if (this.saveT) return;
    this.saveT = setTimeout(() => { this.saveT = null; if (!this.dirty) return; this.dirty = false; try { fs.writeFileSync(this.file + '.tmp', JSON.stringify({ nodes: this.nodes, routes: this.routes })); fs.renameSync(this.file + '.tmp', this.file); } catch (e) { /* read-only */ } }, 5000);
  }

  private define() {
    if (this.defined) return; this.defined = true;
    for (const [def, kind] of [[DEF_WPT, 'WAYPOINT'], [DEF_VOR, 'VOR'], [DEF_NDB, 'NDB']] as [number, string][]) {
      const add = (f: string) => this.h.addToFacilityDefinition(def, f);
      add('OPEN ' + kind);
      if (kind === 'WAYPOINT') { add('LATITUDE'); add('LONGITUDE'); add('N_ROUTES'); add('OPEN ROUTE'); ROUTE_FIELDS.forEach(add); add('CLOSE ROUTE'); }
      else { add('LATITUDE'); add('LONGITUDE'); }
      add('CLOSE ' + kind);
    }
  }

  /** A waypoint (or a VOR or NDB) and its airways, from the cache or the simulator. */
  node(id: string, reg: string, t: string): Promise<AwyNode> {
    const k = `${t}:${reg}:${id}`;
    if (this.nodes[k]) return Promise.resolve(this.nodes[k]);
    return new Promise(resolve => {
      try { this.define(); } catch (e) { return resolve(null); }
      const req = this.nextReq++, node: AwyNode = { k, id, reg, t, lat: 0, lon: 0, r: [] };
      const done = (n: AwyNode | null) => { const p = this.pending[req]; if (p) clearTimeout(p.timer); delete this.pending[req]; if (n && (n.lat || n.lon)) { this.nodes[k] = n; this.save(); } resolve(n && (n.lat || n.lon) ? n : null); };
      this.pending[req] = { node, done, timer: setTimeout(() => done(null), 6000) };
      // waypoints carry the airways; a VOR or an NDB on an airway also exists as a waypoint of the same name
      try {
        if (typeof this.h.requestFacilityDataEX1 === 'function') this.h.requestFacilityDataEX1(DEF_WPT, req, id, reg, 'W');
        else this.h.requestFacilityData(DEF_WPT, req, id, reg);
      } catch (e) { done(null); }
    });
  }

  private onData(r: any) {
    const p = this.pending[r.userRequestId]; if (!p) return;
    const d = r.data, n = p.node;
    try {
      // the waypoint itself (facility data type 21), then one message for each airway through it (type 22)
      if (r.type === 21 || (r.type !== 22 && !n.lat && !n.lon)) { n.lat = d.readFloat64(); n.lon = d.readFloat64(); d.readInt32(); }
      else if (r.type === 22) {
        const awy = str(d.readString32()), cls = d.readInt32();
        const nid = str(d.readString8()), nreg = str(d.readString8()), nt = typeChar(d.readInt32()), nlat = d.readFloat64(), nlon = d.readFloat64(); d.readFloat32();
        const pid = str(d.readString8()), preg = str(d.readString8()), pt = typeChar(d.readInt32()), plat = d.readFloat64(), plon = d.readFloat64(); d.readFloat32();
        if (nid) n.r.push({ awy, cls, k: `W:${nreg}:${nid}`, id: nid, lat: nlat, lon: nlon });
        if (pid) n.r.push({ awy, cls, k: `W:${preg}:${pid}`, id: pid, lat: plat, lon: plon });
        void nt; void pt;
      }
    } catch (e) { this.emit('note', `Airways ${n.id}: ${String(e)}`); }
  }
  private onEnd(req: number) { const p = this.pending[req]; if (p) p.done(p.node); }

  /**
   * The route between two sets of fixes (where the departures end, where the arrivals begin), on high (2) or low
   * (1) airways. A* over the airway network, read from the simulator as it goes: the cost is the distance plus a
   * little for each change of airway; a fix close enough to the goal may go direct.
   */
  async route(key: string, starts: { id: string; reg: string; lat: number; lon: number }[], goals: { id: string; reg: string; lat: number; lon: number }[], want: number, budgetMs = 90000): Promise<AwyFix[] | null> {
    const kept = this.routes[key]; if (kept && Date.now() - kept.at < 28 * 864e5) return kept.fixes;
    if (!starts.length || !goals.length) return null;
    const t0 = Date.now(), goalK: { [k: string]: any } = {}; for (const g of goals) goalK[`W:${g.reg}:${g.id}`] = g;
    const h = (p: number[]) => Math.min(...goals.map(g => gcNm(p, [g.lon, g.lat])));
    type Q = { k: string; id: string; reg: string; lat: number; lon: number; g: number; f: number; awy: string; prev: Q | null };
    const open: Q[] = [], best: { [k: string]: number } = {};
    for (const s of starts) { const q: Q = { k: `W:${s.reg}:${s.id}`, id: s.id, reg: s.reg, lat: s.lat, lon: s.lon, g: 0, f: h([s.lon, s.lat]), awy: '', prev: null }; open.push(q); best[q.k] = 0; }
    let n = 0;
    while (open.length && n < 6000 && Date.now() - t0 < budgetMs) {
      open.sort((a, b) => a.f - b.f); const cur = open.shift();
      if (cur.g > (best[cur.k] ?? 1e18)) continue;
      // arrived: at a goal fix, or near enough to go direct to one (a short gap in the network)
      const gNear = goalK[cur.k] ? goalK[cur.k] : goals.filter(g => gcNm([cur.lon, cur.lat], [g.lon, g.lat]) < 25)[0];
      if (gNear) {
        const out: AwyFix[] = []; let q: Q = cur; while (q) { out.unshift({ id: q.id, lat: q.lat, lon: q.lon, via: q.awy }); q = q.prev; }
        if (!goalK[cur.k]) out.push({ id: gNear.id, lat: gNear.lat, lon: gNear.lon, via: 'DCT' });
        this.routes[key] = { at: Date.now(), fixes: out }; this.save();
        return out;
      }
      n++;
      const node = await this.node(cur.id, cur.reg, 'W'); if (!node) continue;
      const edges = node.r.filter(e => (e.cls & want) || e.cls === 0);
      const use = edges.length ? edges : node.r;   // no airway of the wanted kind here: any to get onto the network
      for (const e of use) {
        const step = gcNm([cur.lon, cur.lat], [e.lon, e.lat]); if (!isFinite(step) || step <= 0) continue;
        const g = cur.g + step + (cur.awy && cur.awy !== e.awy ? 15 : 0) + (edges.length ? 0 : 40);
        if (g >= (best[e.k] ?? 1e18)) continue;
        best[e.k] = g; const reg = e.k.split(':')[1];
        open.push({ k: e.k, id: e.id, reg, lat: e.lat, lon: e.lon, g, f: g + h([e.lon, e.lat]), awy: e.awy, prev: cur });
      }
    }
    return null;
  }
}
