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
interface FlightPath { pts: number[][]; cum: number[]; len: number; parts: ProcPart[]; dep: RunwayEnd; arr: RunwayEnd }

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
  return { dir: _hashStr(icao + new Date().toDateString()) % 360, kt: 6 + (_hashStr(icao) % 12), real: false };
}

const _rwyCache: { [k: string]: RunwayEnd } = {};
/** The runway end in use at an airport (landing and take-off into the wind, longer runways preferred). */
function activeRunway(icao: string): RunwayEnd {
  const a: any = apt(icao); if (!a) return null;
  const wind = airportWind(icao, a.pos), key = icao + '|' + Math.round(wind.dir / 10);
  if (_rwyCache[key] !== undefined) return _rwyCache[key];
  const rows: any[] = ((World.runways || {})[icao] || []) as any[];
  let best: RunwayEnd = null, bs = -1e9;
  for (const r of rows) {
    const [id1, id2, lenFt, , surf, la1, lo1, la2, lo2, hdg1] = r;
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
        const ils = paved && lenM >= 1800 && (a.size === 2 || (a.size === 1 && lenM >= 2200) || !!AIRPORTS[icao]);
        best = { icao, name: String(dir ? id2 : id1 || ''), other: String(dir ? id1 : id2 || ''), thr: dir ? e2 : e1, end: dir ? e1 : e2, hdg: hd, lenM, ils };
      }
    }
  }
  return (_rwyCache[key] = best);
}

/** Round off the corners of a polyline (two passes of corner cutting), keeping the end points. */
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

const _paths: { [k: string]: FlightPath } = {};
/** The whole path of a flight from runway to runway (cached). Null when the runways aren't known. */
function flightPathFor(from: string, to: string): FlightPath {
  if (!from || !to || from === to || !World.runways) return null;
  const dep = activeRunway(from), arr = activeRunway(to);
  if (!dep || !arr) return null;
  const key = from + '>' + to + '|' + dep.name + '>' + arr.name;
  if (_paths[key]) return _paths[key];
  // departure: along the runway, straight ahead for 4 nm, then a turn onto the route
  const toDest = geoBrg(dep.end, arr.thr);
  const sidA = geoDest(dep.end, dep.hdg, 4);
  const turn = angDiff(dep.hdg, geoBrg(sidA, arr.thr));
  const sidPts: number[][] = [sidA];
  const steps = Math.max(1, Math.round(Math.abs(turn) / 15));
  for (let i = 1; i <= steps; i++) { const prev = sidPts[sidPts.length - 1], h = dep.hdg + turn * i / steps; sidPts.push(geoDest(prev, h, 1.1)); }
  sidPts.push(geoDest(sidPts[sidPts.length - 1], geoBrg(sidPts[sidPts.length - 1], arr.thr), 8));
  // approach: intermediate fix 10 nm out, final approach fix 5.5 nm out, on the extended centre line
  const back = (arr.hdg + 180) % 360, IF = geoDest(arr.thr, back, 10), FAF = geoDest(arr.thr, back, 5.5);
  // arrival: straight in when coming from roughly behind the final, otherwise downwind and base
  const sidEnd = sidPts[sidPts.length - 1];
  const inbound = geoBrg(sidEnd, IF), off = angDiff(arr.hdg, inbound);
  let star: number[][];
  if (Math.abs(off) <= 50) star = [geoDest(IF, (inbound + 180) % 360, 22), geoDest(IF, (inbound + 180) % 360, 8)];
  else {
    const side = off > 0 ? -1 : 1;   // the side of the final the flight comes from
    const abeam = geoDest(geoDest(arr.thr, (arr.hdg + 90 * side + 360) % 360, 4.5), arr.hdg, 3);   // downwind, abeam the field
    const base = geoDest(geoDest(IF, (arr.hdg + 90 * side + 360) % 360, 4.5), back, 1.5);           // base turn
    const entry = geoDest(abeam, geoBrg(sidEnd, abeam) + 180, 14);
    star = [entry, abeam, base];
  }
  const starSmooth = smoothPath(star.concat([IF]), 2);
  // the route between, along a great circle
  const enroute: number[][] = [];
  const a0 = sidEnd, b0 = starSmooth[0], legNm = gcDistanceNm(a0, b0), n = Math.max(2, Math.min(64, Math.round(legNm / 40)));
  for (let i = 1; i < n; i++) enroute.push(gcInterpolate(a0, b0, i / n));
  const sid = smoothPath([dep.thr, dep.end].concat(sidPts), 1);
  const pts = sid.concat(enroute, starSmooth, [FAF, arr.thr]);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcDistanceNm(pts[i - 1], pts[i]));
  const at = (p: number[]) => { let bi = 0, bd = 1e9; pts.forEach((q, i) => { const d = Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]); if (d < bd) { bd = d; bi = i; } }); return cum[bi]; };
  const appName = `${arr.ils ? 'ILS' : 'RNP'} ${arr.name}`;
  const parts: ProcPart[] = [
    { kind: 'sid', name: `${dep.name} departure`, from: 0, to: at(sidEnd) },
    { kind: 'route', name: '', from: at(sidEnd), to: at(starSmooth[0]) },
    { kind: 'star', name: `${arr.name} arrival`, from: at(starSmooth[0]), to: at(IF) },
    { kind: 'app', name: appName, from: at(IF), to: cum[cum.length - 1] },
  ];
  return (_paths[key] = { pts, cum, len: cum[cum.length - 1], parts, dep, arr });
}

/** The point `d` nm along a path, and the direction of travel there. */
function pathAt(fp: FlightPath, d: number): { pos: number[]; hdg: number } {
  const c = fp.cum, p = fp.pts; d = clamp(d, 0, fp.len);
  let i = 1; while (i < c.length - 1 && c[i] < d) i++;
  const seg = c[i] - c[i - 1] || 1e-9, k = clamp((d - c[i - 1]) / seg, 0, 1);
  return { pos: [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k], hdg: geoBrg(p[i - 1], p[i]) };
}

/** Where a hired or co-op pilot's flight is right now along its procedures (null: not on a known path). */
function flightPathPos(f: any, now?: number): { pos: number[]; hdg: number; d: number; fp: FlightPath } {
  if (!f || !f.depAt || f.real && f.you) return null;
  const fp = flightPathFor(f.from, f.noDest ? null : f.to); if (!fp) return null;
  now = now || Date.now();
  const prof: FlightProfile = f.coop ? flightProfile(f.typeId, f.from, f.to, f.depAt) : aiProfile(f);
  const el = Math.max(0, (now - f.depAt) * (f.coop ? 1 : (f.spd || 1)) / 1000), q = profileAt(prof, el);
  // the profile's distance (along airways) mapped onto this path
  const d = prof.routeNm > 0 ? q.d / prof.routeNm * fp.len : 0;
  const r = pathAt(fp, d);
  return { pos: r.pos, hdg: r.hdg, d, fp };
}
