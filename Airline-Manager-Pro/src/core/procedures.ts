// Departures and arrivals. Every flight of a hired or co-op pilot follows one path, used by the world map
// and by the airports alike (so an aircraft never jumps between the two):
//   runway in use → departure (SID): straight ahead on runway heading, then a turn onto the route
//   → the route → arrival (STAR): straight in, or via downwind and base, depending on where the flight comes
//   from → approach: ILS (longer paved runways at larger airports) or RNP, intermediate fix at 10 nm, final
//   approach fix at 5.5 nm, down the final to the runway.
// The runway in use follows the wind (the simulator's when linked, otherwise an estimate for the day),
// the same choice the airports make. These are generated to real procedure geometry; published SIDs,
// STARs and approaches from the simulator replace them where available.

interface RunwayEnd { icao: string; name: string; other: string; thr: number[]; end: number[]; hdg: number; lenM: number; ils: boolean }
interface ProcPart { kind: 'sid' | 'route' | 'star' | 'app'; name: string; from: number; to: number }   // distances along the path (nm)
interface FlightPath { pts: number[][]; cum: number[]; len: number; parts: ProcPart[]; dep: RunwayEnd; arr: RunwayEnd; wpD?: { [id: string]: number } }

const NM = 1852;

/** A point `dist` nm from [lon, lat] on true bearing `brg`. */
function geoDest(p: number[], brg: number, dist: number): number[] {
  const d = dist / 3440.065, b = brg * D2R, la1 = p[1] * D2R, lo1 = p[0] * D2R;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [((lo2 / D2R + 540) % 360) - 180, la2 / D2R];
}
function geoBrg(a: number[], b: number[]): number {
  const la1 = a[1] * D2R, la2 = b[1] * D2R, dl = (b[0] - a[0]) * D2R;
  return (Math.atan2(Math.sin(dl) * Math.cos(la2), Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dl)) / D2R + 360) % 360;
}
function angDiff(a: number, b: number): number { return ((b - a + 540) % 360) - 180; }

/** The wind at an airport: the simulator's when it is nearby, otherwise an estimate for the day. */
function airportWind(icao: string, pos: number[]): { dir: number; kt: number; real: boolean } {
  const s: any = Link.sim;
  if (s && s.wx && s.lat && gcDistanceNm([s.lon, s.lat], pos) < 60) return { dir: s.wx.windDir, kt: Math.round(s.wx.windKt), real: true };
  // the real weather report (METAR) for the airport, when live weather is on
  try { const m = typeof LiveWx !== 'undefined' ? LiveWx.get(icao) : null; if (m && m.dir >= 0) return { dir: m.dir, kt: Math.round(m.kt), real: true }; } catch (e) { /* not loaded */ }
  return { dir: _hashStr(icao + new Date().toDateString()) % 360, kt: 6 + (_hashStr(icao) % 12), real: false };
}

const _rwyCache: { [k: string]: RunwayEnd } = {};
/** The runway end in use at an airport (landing and take-off into the wind, longer runways preferred). */
function activeRunway(icao: string): RunwayEnd {
  const a: any = apt(icao); if (!a) return null;
  const wind = airportWind(icao, a.pos), key = icao + '|' + Math.round(wind.dir / 10) + '|' + new Date().toISOString().slice(0, 10);
  if (_rwyCache[key] !== undefined) return _rwyCache[key];
  const rows: any[] = ((World.runways || {})[icao] || []) as any[];
  let best: RunwayEnd = null, bs = -1e9;
  for (const r of rows) {
    const [id1, id2, lenFt, , surf, la1, lo1, la2, lo2, hdg1] = r;
    try { if (rows.length > 1 && notamRwyClosed(icao, id1, id2)) continue; } catch (e) { /* no NOTAMs yet */ }
    let e1: number[], e2: number[], h: number;
    if (la1 != null && la2 != null) { e1 = [lo1, la1]; e2 = [lo2, la2]; h = geoBrg(e1, e2); }
    else { h = hdg1 != null ? hdg1 : (parseInt(id1, 10) || 0) * 10; const half = (lenFt || 6000) * 0.3048 / 2 / NM; e1 = geoDest(a.pos, h + 180, half); e2 = geoDest(a.pos, h, half); }
    const lenM = (lenFt || 0) * 0.3048 || gcDistanceNm(e1, e2) * NM;
    const paved = /ASP|CON|BIT|PEM|ASF/i.test(surf || '');
    for (const dir of [0, 1]) {
      const hd = dir ? (h + 180) % 360 : h, head = Math.cos((wind.dir - hd) * D2R);
      const score = head * 2 + Math.min(lenM, 4000) / 1500 + (paved ? 0.5 : 0);
      if (score > bs) {
        bs = score;
        const ils = paved && lenM >= 1800 && (a.size === 2 || (a.size === 1 && lenM >= 2200) || !!AIRPORTS[icao]) && !(() => { try { return notamIlsOut(icao, String(dir ? id2 : id1)); } catch (e) { return false; } })();
        best = { icao, name: String(dir ? id2 : id1 || ''), other: String(dir ? id1 : id2 || ''), thr: dir ? e2 : e1, end: dir ? e1 : e2, hdg: hd, lenM, ils };
      }
    }
  }
  return (_rwyCache[key] = best);
}

/** Round off the corners of a polyline (two passes of corner cutting), keeping the end points. */
/** Round every corner of a route with a circular arc of the given radius (nm; 0 keeps the corner), the way an
 *  aircraft flies by a waypoint. Returns the new points and, for each old point, the index of its new point. */
function flyByArcs(p: number[][], radiusNm: (i: number) => number): { pts: number[][]; map: number[] } {
  const out: number[][] = [p[0]], map = [0];
  for (let i = 1; i < p.length - 1; i++) {
    const R = radiusNm(i), a = p[i - 1], b = p[i], c = p[i + 1];
    const l1 = gcDistanceNm(a, b), l2 = gcDistanceNm(b, c);
    const h1 = geoBrg(a, b), h2 = geoBrg(b, c);
    let turn = ((h2 - h1 + 540) % 360) - 180;
    if (!R || l1 < 0.05 || l2 < 0.05 || Math.abs(turn) < 2) { map.push(out.length); out.push(b); continue; }
    // the arc starts and ends where it meets each leg: R·tan(turn/2) before and after the waypoint, at most
    // 45% of each leg (a tighter turn when the legs are short)
    const th = Math.abs(turn) * Math.PI / 180;
    let t = R * Math.tan(th / 2); const tMax = Math.min(l1, l2) * 0.45;
    let r = R; if (t > tMax) { t = tMax; r = t / Math.tan(th / 2); }
    const p0 = geoDest(b, (h1 + 180) % 360, t), side = turn > 0 ? 1 : -1;
    const ctr = geoDest(p0, (h1 + 90 * side + 360) % 360, r);
    const steps = Math.max(3, Math.ceil(Math.abs(turn) / 2.5));   // a smooth curve: a point every 2.5° of turn
    const start = (h1 - 90 * side + 360) % 360;   // from the centre to the start of the arc
    map.push(out.length + Math.floor(steps / 2));
    for (let k = 0; k <= steps; k++) out.push(geoDest(ctr, (start + turn * k / steps + 360) % 360, r));
  }
  map.push(out.length); out.push(p[p.length - 1]);
  return { pts: out, map };
}

function smoothPath(p: number[][], passes = 2): number[][] {
  let q = p;
  for (let k = 0; k < passes; k++) {
    if (q.length < 3) return q;
    const out = [q[0]];
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i], b = q[i + 1];
      if (i > 0) out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      if (i < q.length - 2) out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(q[q.length - 1]); q = out;
  }
  return q;
}

/* ---------- Published procedures from the simulator (through the PC app, when linked) ---------- */
interface SimLeg { t: number; fix: string; lat: number; lon: number; alt: number; crs: number; dist: number; turn: number; arcLat?: number; arcLon?: number }
interface SimProc { name: string; kind: string; type?: number; suffix?: string; rwy?: string; common: SimLeg[]; runways: { name: string; rwy?: string; legs: SimLeg[] }[]; enroute: { name: string; legs: SimLeg[] }[] }
interface SimProcs { icao: string; sids: SimProc[]; stars: SimProc[]; apps: SimProc[] }

const SimProcedures = {
  data: {} as { [icao: string]: SimProcs | false },
  asked: {} as { [icao: string]: boolean },
  get(icao: string): SimProcs {
    const d = this.data[icao]; if (d) return d; if (d === false) return null;
    try { const k = JSON.parse(localStorage.getItem('amp-proc:' + icao) || 'null'); if (k && k.l) return (this.data[icao] = k.l); } catch (e) { /* none */ }
    this.ask(icao);
    return null;
  },
  ask(icao: string) {
    if (this.asked[icao] || Link.status !== 'connected') return;
    this.asked[icao] = true;
    try { linkSend({ type: 'procs', icao }); } catch (e) { /* not linked */ }
  },
  received(icao: string, procs: any, error?: string) {
    icao = String(icao || '').toUpperCase();
    if (!procs || error) { this.data[icao] = false; return; }
    this.data[icao] = procs;
    try { AirportLayouts.keep('amp-proc:' + icao, procs as any); } catch (e) { /* storage full */ }
    // only flights that start from now on use them: a flight never changes its path in the air
    for (const k of Object.keys(_paths)) if (k.indexOf(icao) >= 0) delete _paths[k];
  },
};

/* ---------- Real-world airways (from the simulator, through the PC app) ---------- */
// Airliners and cargo jets fly the high airways, turboprops and light aircraft the low ones, between where
// their departures end and their arrivals begin, as in real life. A route is asked for once per city pair and
// kind and kept on this device; until it is known (or without the simulator) flights fly the great circle.
interface AwyFixA { id: string; lat: number; lon: number; via: string }
const AirwayRoutes = {
  data: {} as { [k: string]: { at: number; route: AwyFixA[] } | false }, asked: {} as { [k: string]: number }, busy: 0,
  key(from: string, to: string, cls: string) { return `${from}-${to}-${cls}`; },
  get(from: string, to: string, cls: string): AwyFixA[] {
    if (!from || !to || from === to || (State.settings as any).realAirways === false) return null;
    const k = this.key(from, to, cls), d = this.data[k];
    if (d) return d.route; if (d === false) return null;
    try { const j = JSON.parse(localStorage.getItem('amp-awy:' + k) || 'null'); if (j && j.route) { this.data[k] = j; return j.route; } } catch (e) { /* none */ }
    this.ask(from, to, cls);
    return null;
  },
  sig(from: string, to: string, cls: string): string { const r = this.get(from, to, cls); return r ? '|awy' + cls + r.length : ''; },
  ask(from: string, to: string, cls: string) {
    const k = this.key(from, to, cls), now = Date.now();
    if ((this.asked[k] && now - this.asked[k] < 30 * 60e3) || Link.status !== 'connected' || this.busy > 2) return;
    const A = apt(from), B = apt(to); if (!A || !B || gcDistanceNm(A.pos, B.pos) < 100) { this.data[k] = false; return; }
    this.asked[k] = now; this.busy++;
    try { linkSend({ type: 'awy', from, to, cls } as any); } catch (e) { this.busy--; }
  },
  received(from: string, to: string, cls: string, route: AwyFixA[], error?: string) {
    this.busy = Math.max(0, this.busy - 1);
    const k = this.key(from, to, cls);
    if (!route || error || route.length < 2) { this.data[k] = false; try { if (PlannerUi.awyWait === k) { PlannerUi.awyWait = ''; toast(error || 'No airway route found', 'warn'); } } catch (e) { /* not open */ } return; }
    const v = { at: Date.now(), route: route.filter(x => x && isFinite(x.lat) && isFinite(x.lon)) };
    this.data[k] = v;
    try { localStorage.setItem('amp-awy:' + k, JSON.stringify(v)); } catch (e) { /* storage full */ }
    // flights that start from now on fly it (a flight never changes its path in the air)
    for (const pk of Object.keys(_paths)) if (pk.indexOf(from + '>' + to) === 0) delete _paths[pk];
    try { for (const pk in _profiles) if (pk.indexOf('|' + from + '|' + to + '|') >= 0) delete _profiles[pk]; } catch (e) { /* none */ }
    try { if (PlannerUi.awyWait === k) { PlannerUi.awyWait = ''; plFillAirways(v.route); } else plPanelRedraw(); } catch (e) { /* not open */ }
  },
};
/** High airways for airliners and cargo jets, low ones for turboprops and light aircraft. */
function awyClass(typeId: string): 'H' | 'L' {
  const t = acType(typeId); if (!t) return 'H';
  const P: any = perfFor(t); return P.jet && P.maxAlt >= 25000 ? 'H' : 'L';
}

/** While linked to Flight Simulator: the published departures, arrivals and approaches (real-world navigation
 *  data, as the simulator has it) for the airports your airline flies to, where its aircraft are, and the
 *  Faroe Islands, Iceland, Greenland and Scandinavia, fetched one airport every few seconds and kept on this
 *  device, so flights there follow the real procedures (also later, when not linked). */
const ProcPrefetch = { queue: [] as string[], started: false, timer: 0 as any };
function procPrefetchStart() {
  if (ProcPrefetch.started) return; ProcPrefetch.started = true;
  ProcPrefetch.timer = setInterval(() => {
    if (Link.status !== 'connected') return;
    if (!ProcPrefetch.queue.length) {
      const want: { [k: string]: number } = {};
      const add = (k: string, pr: number) => { if (k && /^[A-Z0-9]{4}$/.test(k)) want[k] = Math.max(want[k] || 0, pr); };
      try { for (const r of State.routes || []) for (const l of (r as any).legs || []) add(l, 3); } catch (e) { /* none */ }
      try { for (const f of State.live || []) { add(f.from, 3); add(f.to, 3); } for (const a of State.fleet || []) add((a as any).location, 2); } catch (e) { /* none */ }
      try { for (const a of World.list || []) if (/^(EK|EN|ES|EF|BI|BG)/.test(a.icao) && (a as any).size >= 1) add(a.icao, /^(EKVG|EKKA|EKCH|ENGM|ENBR|ESSA|EFHK|BIKF|BGSF)$/.test(a.icao) ? 3 : 1); } catch (e) { /* not loaded */ }
      const have = (k: string) => { try { return !!localStorage.getItem('amp-proc:' + k) || SimProcedures.data[k] !== undefined; } catch (e) { return false; } };
      ProcPrefetch.queue = Object.keys(want).filter(k => !have(k)).sort((a, b) => want[b] - want[a]).slice(0, 400);
      if (!ProcPrefetch.queue.length) return;
    }
    const k = ProcPrefetch.queue.shift(); if (k) SimProcedures.ask(k);
  }, 4000);
}

const APP_TYPES: { [t: number]: string } = { 1: 'GPS', 2: 'VOR', 3: 'NDB', 4: 'ILS', 5: 'LOC', 6: 'SDF', 7: 'LDA', 8: 'VOR/DME', 9: 'NDB/DME', 10: 'RNAV', 11: 'LOC BC' };
const hasFix = (l: SimLeg) => !!l && (Math.abs(l.lat) > 1e-6 || Math.abs(l.lon) > 1e-6);

/** Legs to points: fixes where they have one, a short climb on course for course-to-altitude legs, arcs drawn round their centre. */
function legPoints(legs: SimLeg[], start: number[]): number[][] {
  const out: number[][] = []; let last = start;
  for (const l of legs || []) {
    if (hasFix(l)) {
      const p = [l.lon, l.lat];
      if (l.t === 17 && l.arcLat != null && last) {   // RF: constant-radius arc to the fix
        const c = [l.arcLon, l.arcLat], r = gcDistanceNm(c, p), b0 = geoBrg(c, last), b1 = geoBrg(c, p);
        let sweep = angDiff(b0, b1); if (l.turn === 1 && sweep > 0) sweep -= 360; if (l.turn === 2 && sweep < 0) sweep += 360;
        const n = Math.max(2, Math.round(Math.abs(sweep) / 10));
        for (let i = 1; i < n; i++) out.push(geoDest(c, b0 + sweep * i / n, r));
      }
      out.push(p); last = p;
    } else if ([2, 3, 5, 8, 19, 20, 21].indexOf(l.t) >= 0 && last && l.crs) {   // CA, CD, CI, FA, VA, VD, VI
      last = geoDest(last, l.crs, 3); out.push(last);
    }
  }
  return out;
}
function rwyMatch(a: string, b: string) { return !!a && !!b && a.replace(/^0/, '') === b.replace(/^0/, ''); }

/** The published departure for the runway in use that heads best towards the destination. */
function simDeparture(dep: RunwayEnd, dest: number[]): { pts: number[][]; name: string } {
  const sp = SimProcedures.get(dep.icao); if (!sp || !sp.sids.length) return null;
  const want = geoBrg(dep.end, dest);
  let best: any = null, bs = 1e9;
  for (const sid of sp.sids) {
    const rt = sid.runways.filter(r => rwyMatch(r.rwy, dep.name))[0];
    if (sid.runways.length && !rt) continue;
    const ens = sid.enroute.length ? sid.enroute : [{ name: '', legs: [] }];
    for (const en of ens) {
      const pts = legPoints((rt ? rt.legs : []).concat(sid.common, en.legs), dep.end); if (!pts.length) continue;
      const exit = pts[pts.length - 1], score = Math.abs(angDiff(want, geoBrg(dep.end, exit))) + gcDistanceNm(exit, dest) * 0.02;
      if (score < bs) { bs = score; best = { pts, name: sid.name + (en.name ? '.' + en.name : '') }; }
    }
  }
  return best;
}

/** The published arrival and approach for the landing runway, joined the way the flight comes in. */
function simArrival(arr: RunwayEnd, from: number[]): { star: number[][]; app: number[][]; starName: string; appName: string } {
  const sp = SimProcedures.get(arr.icao); if (!sp || !sp.apps.length) return null;
  const rank = (t: number) => t === 4 ? 0 : t === 10 || t === 1 ? 1 : 2;
  const apps = sp.apps.filter(a => rwyMatch(a.rwy, arr.name)).sort((a, b) => rank(a.type) - rank(b.type));
  if (!apps.length) return null;
  const app = apps[0];
  // the arrival: the one whose way in suits the direction the flight comes from
  let star: any = null, ss = 1e9;
  for (const st of sp.stars) {
    const rt = st.runways.filter(r => rwyMatch(r.rwy, arr.name))[0];
    if (st.runways.length && !rt) continue;
    const ens = st.enroute.length ? st.enroute : [{ name: '', legs: [] }];
    for (const en of ens) {
      const pts = legPoints(en.legs.concat(st.common, rt ? rt.legs : []), null); if (!pts.length) continue;
      const score = gcDistanceNm(from, pts[0]) + pts.reduce((t, q, i) => i ? t + gcDistanceNm(pts[i - 1], q) : 0, 0) * 0.5;
      if (score < ss) { ss = score; star = { pts, name: (en.name ? en.name + '.' : '') + st.name }; }
    }
  }
  // the approach transition nearest where the arrival ends (or where the flight comes from)
  const joinAt = star ? star.pts[star.pts.length - 1] : from;
  let tr: any = null, ts = 1e9;
  for (const t of app.enroute) { const p = legPoints(t.legs, null); if (!p.length) continue; const d = gcDistanceNm(joinAt, p[0]); if (d < ts) { ts = d; tr = p; } }
  const final = legPoints(app.common, tr ? tr[tr.length - 1] : joinAt);
  if (!final.length) return null;
  const name = `${APP_TYPES[app.type] || 'APP'} ${arr.name}${app.suffix ? ' ' + app.suffix : ''}`;
  return { star: star ? star.pts : [], app: (tr || []).concat(final), starName: star ? star.name : '', appName: name };
}

const _paths: { [k: string]: FlightPath } = {};
/** The whole path of a flight from runway to runway (cached). Null when the runways aren't known. */
function flightPathFor(from: string, to: string, noSim?: boolean, cls?: 'H' | 'L'): FlightPath {
  if (!from || !to || from === to || !World.runways) return null;
  const dep = activeRunway(from), arr = activeRunway(to);
  if (!dep || !arr) return null;
  const PL0 = flightPlanFor(from, to);   // a flight plan from the planner: its waypoints instead of the great circle
  // otherwise the real airways (high or low) from the simulator, when known
  const AW = !PL0 && cls && !noSim ? AirwayRoutes.get(from, to, cls) : null;
  const PL: { wps: { id: string; lat: number; lon: number }[] } = PL0 || (AW ? { wps: AW.map((x, i) => ({ id: 'awy' + i, lat: x.lat, lon: x.lon })) } : null);
  const key = from + '>' + to + '|' + dep.name + '>' + arr.name + (noSim ? '|own' : '') + planSig(from, to) + (AW ? '|awy' + cls + AW.length : '');
  if (_paths[key]) return _paths[key];
  // departure: the published one from the simulator, or straight ahead for 4 nm and a turn onto the route
  let sidPts: number[][], sidName: string;
  // the simulator's procedures, when every point of them is near the airport (a point in the wrong place
  // would send the path on a huge detour, and the aircraft along it far too fast)
  const near = (pts: number[][], c: number[], nm: number) => pts.every(q => q && isFinite(q[0]) && isFinite(q[1]) && gcDistanceNm(q, c) < nm);
  let sd = noSim ? null : simDeparture(dep, arr.thr); if (sd && !near(sd.pts, dep.thr, 120)) sd = null;
  if (sd) { sidPts = sd.pts; sidName = sd.name; }
  else {
    const sidA = geoDest(dep.end, dep.hdg, 4), turn = angDiff(dep.hdg, geoBrg(sidA, arr.thr));
    sidPts = [sidA];
    const steps = Math.max(1, Math.round(Math.abs(turn) / 15));
    for (let i = 1; i <= steps; i++) { const prev = sidPts[sidPts.length - 1], h = dep.hdg + turn * i / steps; sidPts.push(geoDest(prev, h, 1.1)); }
    sidPts.push(geoDest(sidPts[sidPts.length - 1], geoBrg(sidPts[sidPts.length - 1], arr.thr), 8));
    sidName = `${dep.name} departure`;
  }
  const sidEnd = sidPts[sidPts.length - 1];
  // arrival and approach: published ones, or generated (straight in, or downwind and base; IF 10 nm, FAF 5.5 nm)
  let starPts: number[][], appPts: number[][], starName: string, appName: string;
  let sa = noSim ? null : simArrival(arr, sidEnd); if (sa && !near((sa.star || []).concat(sa.app || []), arr.thr, 200)) sa = null;
  if (sa) {
    starPts = sa.star; appPts = sa.app; starName = sa.starName || `${arr.name} arrival`; appName = sa.appName;
    if (!starPts.length) starPts = [geoDest(appPts[0], geoBrg(appPts[0], sidEnd), 15)];
    const lastApp = appPts[appPts.length - 1];
    if (gcDistanceNm(lastApp, arr.thr) > 0.05) appPts = appPts.concat([arr.thr]);
  } else {
    const back = (arr.hdg + 180) % 360, IF = geoDest(arr.thr, back, 10), FAF = geoDest(arr.thr, back, 5.5);
    const inbound = geoBrg(sidEnd, IF), off = angDiff(arr.hdg, inbound);
    let star: number[][];
    if (Math.abs(off) <= 50) star = [geoDest(IF, (inbound + 180) % 360, 22), geoDest(IF, (inbound + 180) % 360, 8)];
    else {
      const side = off > 0 ? -1 : 1;
      const abeam = geoDest(geoDest(arr.thr, (arr.hdg + 90 * side + 360) % 360, 4.5), arr.hdg, 3);
      const base = geoDest(geoDest(IF, (arr.hdg + 90 * side + 360) % 360, 4.5), back, 1.5);
      star = [geoDest(abeam, geoBrg(sidEnd, abeam) + 180, 14), abeam, base];
    }
    const sm = smoothPath(star.concat([IF]), 2);
    starPts = sm.slice(0, -1); appPts = [IF, FAF, arr.thr];
    starName = `${arr.name} arrival`; appName = `${arr.ils ? 'ILS' : 'RNP'} ${arr.name}`;
  }
  // the route between: along a great circle, or through the plan's waypoints (great circles between them)
  const enroute: number[][] = [], wpRaw: { [id: string]: number } = {};
  if (PL) {
    const nodes: number[][] = [sidEnd], ids: string[] = [''];
    for (const w of PL.wps) { const q = [w.lon, w.lat]; if (gcDistanceNm(q, sidEnd) < 12 || gcDistanceNm(q, starPts[0]) < 12) continue; nodes.push(q); ids.push(w.id); }
    nodes.push(starPts[0]);
    for (let j = 1; j < nodes.length; j++) {
      const a = nodes[j - 1], b = nodes[j], m = Math.max(1, Math.min(32, Math.round(gcDistanceNm(a, b) / 40)));
      for (let i = 1; i < m; i++) enroute.push(gcInterpolate(a, b, i / m));
      if (j < nodes.length - 1) { enroute.push(b); wpRaw[ids[j]] = enroute.length - 1; }
    }
  } else {
    const a0 = sidEnd, b0 = starPts[0], legNm = gcDistanceNm(a0, b0), n = Math.max(2, Math.min(64, Math.round(legNm / 40)));
    for (let i = 1; i < n; i++) enroute.push(gcInterpolate(a0, b0, i / n));
  }
  const sid = sd ? [dep.thr, dep.end].concat(sidPts) : smoothPath([dep.thr, dep.end].concat(sidPts), 1);
  const raw = sid.concat(enroute, starPts, appPts);
  // turns are flown as round fly-by arcs, as a real aircraft turns: the radius its speed gives at the bank
  // airliners use (about 25°): about 1.5 nm in the departure and arrival, 3.5-4 nm joining and leaving the
  // route, about 7 nm at cruise speed; never wider than the legs allow, so it still follows the route.
  // The runway and the final stay straight.
  const iS = sid.length - 1, iR = iS + enroute.length + 1, iA = iR + starPts.length;
  const radius = (i: number) => i <= 1 || i >= raw.length - 2 ? 0 : i <= iS ? 1.4 : i < iR ? (i - iS <= 1 ? 3.5 : iR - i <= 1 ? 4 : 7) : i < iA ? 1.8 : 1.2;
  const sm = flyByArcs(raw, radius), pts = sm.pts, map = sm.map;
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcDistanceNm(pts[i - 1], pts[i]));
  const idx = (k: number) => cum[Math.min(cum.length - 1, k)];
  const iSidEnd = map[sid.length - 1], iStar = map[sid.length - 1 + enroute.length + 1], iApp = map[sid.length + enroute.length + starPts.length];
  const parts: ProcPart[] = [
    { kind: 'sid', name: sidName, from: 0, to: idx(iSidEnd) },
    { kind: 'route', name: '', from: idx(iSidEnd), to: idx(iStar) },
    { kind: 'star', name: starName, from: idx(iStar), to: idx(iApp) },
    { kind: 'app', name: appName, from: idx(iApp), to: cum[cum.length - 1] },
  ];
  const len = cum[cum.length - 1], gc = gcDistanceNm(dep.thr, arr.thr);
  // where each of the plan's waypoints is along the path (for its levels and speeds)
  const wpD: { [id: string]: number } = {}; for (const id in wpRaw) wpD[id] = idx(map[sid.length + wpRaw[id]]);
  // still much longer than the trip itself: the app's own departure and arrival instead
  if ((sd || sa) && !noSim && len > gc * 1.35 + (PL ? 400 : 120)) { const own = flightPathFor(from, to, true); if (own) return (_paths[key] = own); }
  return (_paths[key] = { pts, cum, len, parts, dep, arr, sim: !!(sd || sa), wpD, awy: AW || null } as any);
}

/** The point `d` nm along a path, and the direction of travel there. */
function pathAt(fp: FlightPath, d: number): { pos: number[]; hdg: number } {
  const c = fp.cum, p = fp.pts; d = clamp(d, 0, fp.len);
  let i = 1; while (i < c.length - 1 && c[i] < d) i++;
  const seg = c[i] - c[i - 1] || 1e-9, k = clamp((d - c[i - 1]) / seg, 0, 1);
  return { pos: [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k], hdg: geoBrg(p[i - 1], p[i]) };
}

const _flightPaths: { [k: string]: FlightPath } = {};
/** Where a hired or co-op pilot's flight is right now along its procedures (null: not on a known path). */
function flightPathPos(f: any, now?: number): { pos: number[]; hdg: number; d: number; fp: FlightPath } {
  if (!f || !f.depAt || f.real && f.you) return null;
  const pk = f.id + '|' + f.from + '>' + f.to + '|' + f.depAt + planSig(f.from, f.to);
  let fp = _flightPaths[pk];
  const cls = awyClass(f.typeId || (plane(f.reg) || {} as any).typeId);
  if (!fp) { fp = flightPathFor(f.from, f.noDest ? null : f.to, false, cls); if (!fp) return null; _flightPaths[pk] = fp; }
  now = now || Date.now();
  const prof: FlightProfile = f.coop || f.tfc ? flightProfile(f.typeId, f.from, f.to, f.depAt) : aiProfile(f);
  // the simulator's procedures much longer than the trip the times are worked out for: the app's own ones instead
  if ((fp as any).sim && !flightPlanFor(f.from, f.to) && prof.routeNm > 0 && fp.len > prof.routeNm * 1.4 + 40) { const own = flightPathFor(f.from, f.noDest ? null : f.to, true); if (own) fp = _flightPaths[pk] = own; }
  const fe = flightEl(f, now), q = profileAt(prof, fe.el);
  // the profile's distance (along airways) mapped onto this path
  const d = prof.routeNm > 0 ? q.d / prof.routeNm * fp.len : 0;
  const r = pathAt(fp, d);
  // a holding pattern, or a go-around and a circuit back to the final: circling to the right, a turn about every 4 minutes
  if (fe.hold && (fe.hold.kind === 'air' || fe.hold.kind === 'goaround')) {
    const R = fe.hold.kind === 'air' ? 2.6 : 1.8, ang = (fe.inHold / 240) * 360;
    const ctr = geoDest(r.pos, r.hdg + 90, R), pos = geoDest(ctr, r.hdg - 90 + ang, R);
    return { pos, hdg: (r.hdg + ang + 360) % 360, d, fp };
  }
  return { pos: r.pos, hdg: r.hdg, d, fp };
}
