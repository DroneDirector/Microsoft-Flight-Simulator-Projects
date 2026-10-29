// How long a real flight takes, minute by minute: taxi, take-off, climb on the real speed schedule
// (250 kt below 10,000 ft, then climb speed and Mach), cruise at a flight level that suits the
// distance and direction, descent and approach. Distances follow airways and departure/arrival
// procedures rather than the straight line, and the jet stream speeds up eastbound flights and
// slows down westbound ones. Hired pilots' flights are flown along this profile on the real clock.

interface PerfSpec {
  maxAlt: number;        // highest usual cruise altitude (ft)
  jet: boolean;
  mach: number;          // cruise Mach (jets)
  climbIas: number; climbMach: number; descIas: number;
  rocSL: number; rocTop: number;   // climb rate near the ground and near cruise altitude (ft/min)
  rod: number;           // descent rate (ft/min)
  appKt: number;         // final approach speed
  taxiOut: number; taxiIn: number; // minutes
  airway: number;        // distance flown along airways compared with the straight line
  procNm: number;        // extra miles for departure and arrival procedures
  climbPerNm: number; altBase: number; // cruise altitude for short legs: altBase + distance × climbPerNm
}

interface ProfilePoint { s: number; d: number; alt: number; gs: number; ph: string }
interface FlightProfile { pts: ProfilePoint[]; totalS: number; routeNm: number; cruiseAlt: number; airS: number }

// International Standard Atmosphere: speed of sound and true airspeed from indicated airspeed
function _isaTheta(h: number) { return Math.max(0.7519, 1 - 6.8756e-6 * h); }
function soundKt(h: number) { return 661.47 * Math.sqrt(_isaTheta(h)); }
function iasToTas(ias: number, h: number) {
  const sigma = h <= 36089 ? Math.pow(1 - 6.8756e-6 * h, 4.2559) : 0.2971 * Math.exp(-(h - 36089) / 20806);
  return ias / Math.sqrt(sigma);
}

function perfFor(t: AircraftType): PerfSpec {
  const kt = t.cruiseKt;
  // heavy four-engine and 777-size aircraft start lower and step-climb later; the newer twins go higher sooner
  if (t.cls === 'widebody') return { maxAlt: t.seats >= 350 ? 35000 : 37000, jet: true, mach: kt / soundKt(36000), climbIas: 310, climbMach: 0.84, descIas: 290, rocSL: 2800, rocTop: 800, rod: 2300, appKt: 148, taxiOut: 17, taxiIn: 8, airway: 1.06, procNm: 28, climbPerNm: 85, altBase: 9000 };
  if (t.cls === 'airliner') return { maxAlt: 37000, jet: true, mach: kt / soundKt(36000), climbIas: 290, climbMach: 0.76, descIas: 280, rocSL: 3000, rocTop: 1000, rod: 2300, appKt: 138, taxiOut: 14, taxiIn: 7, airway: 1.045, procNm: 22, climbPerNm: 85, altBase: 9000 };
  if (t.cls === 'regional') return { maxAlt: 35000, jet: true, mach: kt / soundKt(35000), climbIas: 290, climbMach: 0.74, descIas: 280, rocSL: 3300, rocTop: 900, rod: 2200, appKt: 138, taxiOut: 11, taxiIn: 6, airway: 1.04, procNm: 16, climbPerNm: 90, altBase: 8000 };
  if (t.cls === 'turboprop' || kt >= 250) return { maxAlt: t.cls === 'turboprop' ? 25000 : 26000, jet: false, mach: 0, climbIas: 170, climbMach: 0, descIas: 235, rocSL: 1700, rocTop: 500, rod: 1500, appKt: 112, taxiOut: 9, taxiIn: 5, airway: 1.03, procNm: 10, climbPerNm: 80, altBase: 4000 };
  // piston singles, Caravans, Otters and Beavers: low, slow and mostly direct
  const top = clamp(Math.round((kt - 100) * 110 / 500) * 500 + 3500, 4500, 12500);
  return { maxAlt: top, jet: false, mach: 0, climbIas: Math.round(kt * 0.62), climbMach: 0, descIas: Math.round(kt * 1.02), rocSL: kt > 160 ? 1000 : 700, rocTop: kt > 160 ? 550 : 400, rod: 600, appKt: Math.round(kt * 0.55), taxiOut: 5, taxiIn: 3, airway: 1.015, procNm: 2, climbPerNm: 60, altBase: 2500 };
}

/** Cruise true airspeed at an altitude: the cruise Mach for jets, the book cruise speed (a little slower down low) for propellers. */
function cruiseTas(P: PerfSpec, t: AircraftType, h: number) {
  if (P.jet) return Math.min(P.mach * soundKt(h), iasToTas(h < 10000 ? 250 : 320, h));
  return t.cruiseKt * clamp(1 - 0.018 * (P.maxAlt - h) / 1000, 0.75, 1.02);
}

function bearingDeg(a: number[], b: number[]) {
  const r = Math.PI / 180, f1 = a[1] * r, f2 = b[1] * r, dl = (b[0] - a[0]) * r;
  const y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}

/** West-to-east jet stream: strongest around 40-45° latitude, at cruise altitude and in winter. Returns the tailwind in knots. */
function tailwindKt(h: number, lat: number, track: number, month: number) {
  const north = lat >= 0, season = 1 + 0.35 * Math.cos(2 * Math.PI * ((north ? month : month + 6) % 12) / 12);
  const w = 60 * Math.pow(clamp(h / 34000, 0, 1.15), 1.3) * Math.exp(-Math.pow((Math.abs(lat) - 42) / 16, 2)) * season;
  return w * Math.sin(track * Math.PI / 180);
}

// Large hubs with long taxi routes (minutes added to taxi out and taxi in)
const BIG_HUBS: { [icao: string]: number } = { EGLL: 9, KJFK: 10, EDDF: 7, LFPG: 8, EHAM: 8, OMDB: 7, KBOS: 4, CYYZ: 6, KSEA: 4, LEMD: 5, LIRF: 4, EKCH: 3, ESSA: 3, ENGM: 3 };

const _profiles: { [k: string]: FlightProfile } = {};

/** The whole flight from off-blocks to on-blocks, sampled about every 20 seconds. */
function flightProfile(typeId: string, from: string, to: string, when?: number): FlightProfile {
  const month = new Date(when || Date.now()).getMonth();
  const key = typeId + '|' + from + '|' + to + '|' + month;
  if (_profiles[key]) return _profiles[key];
  const t = acType(typeId) || AIRCRAFT[0], P = perfFor(t), A = apt(from), B = apt(to);
  const gc = A && B ? gcDistanceNm(A.pos, B.pos) : 200;
  const routeNm = Math.max(3, gc * P.airway + (gc > 40 ? P.procNm : gc * 0.05));
  const track0 = A && B ? bearingDeg(A.pos, B.pos) : 90;
  const latAt = (frac: number) => A && B ? gcInterpolate(A.pos, B.pos, clamp(frac, 0, 1))[1] : 50;
  const trackAt = (frac: number) => A && B && gc > 5 ? bearingDeg(gcInterpolate(A.pos, B.pos, clamp(frac, 0, 0.99)), B.pos) : track0;
  const wind = (h: number, d: number) => tailwindKt(h, latAt(d / routeNm), trackAt(d / routeNm), month);

  // descent, worked backwards from the runway: how far and how long from each altitude down
  const descFrom = (top: number) => {
    let h = 0, d = 0, s = 0; const tbl: number[][] = [[0, 0, 0]];
    while (h < top) {
      const dh = Math.min(250, top - h);
      let ias: number, rate: number;
      if (h < 2000) { ias = P.appKt; rate = 0; }
      else if (h < 4000) { ias = Math.min(P.appKt + 50, 210); rate = Math.min(P.rod, 1200); }
      else if (h < 10000) { ias = Math.min(250, P.descIas); rate = P.rod * 0.85; }
      else { ias = P.descIas; rate = P.rod; }
      let tas = P.jet ? Math.min(iasToTas(ias, h), P.mach * soundKt(h)) : (h > 4000 ? Math.min(iasToTas(ias, h), cruiseTas(P, t, h) * 1.05) : iasToTas(ias, h));
      const gs = Math.max(50, tas + wind(h, routeNm - d) * 0.9);
      if (!rate) rate = gs * 101.27 * Math.tan(3 * Math.PI / 180); // the 3° glide path
      const dt = dh / rate * 60;
      s += dt; d += gs * dt / 3600; h += dh;
      tbl.push([h, d, s]);
    }
    return tbl;
  };
  const climbTo = (top: number) => {
    let h = 0, d = 0, s = 0;
    while (h < top) {
      const dh = Math.min(250, top - h);
      const ias = h < 10000 ? Math.min(250, P.climbIas) : P.climbIas;
      let tas = iasToTas(ias, h);
      if (P.jet && P.climbMach) tas = Math.min(tas, P.climbMach * soundKt(h));
      if (!P.jet) tas = Math.min(tas, cruiseTas(P, t, h));
      const rate = P.rocSL + (P.rocTop - P.rocSL) * clamp(h / Math.max(P.maxAlt, 1), 0, 1);
      const gs = Math.max(50, tas + wind(h, d) * 0.9);
      const dt = dh / rate * 60; s += dt; d += gs * dt / 3600; h += dh;
    }
    return { d, s };
  };

  // cruise level: lower on short legs; odd thousands eastbound and even westbound (the semicircular rule)
  let cruise = Math.min(P.maxAlt, P.altBase + gc * P.climbPerNm);
  const east = track0 < 180;
  const level = (h: number) => {
    let k = Math.floor(h / 1000);
    if (h >= 3000 && (k % 2 === 1) !== east) k -= 1;
    return Math.max(k * 1000 + (P.jet || h >= 18000 ? 0 : 500), 1500);
  };
  cruise = level(cruise);
  let up = climbTo(cruise), down = descFrom(cruise);
  while (up.d + down[down.length - 1][1] > routeNm * 0.92 && cruise > 2500) {
    cruise = level(cruise - 2000); up = climbTo(cruise); down = descFrom(cruise);
  }

  // fly it forwards
  const pts: ProfilePoint[] = [];
  let s = 0, d = 0, h = 0;
  const push = (ph: string, gs: number) => pts.push({ s, d: Math.min(d, routeNm), alt: Math.round(h), gs: Math.round(gs), ph });
  const taxiOut = P.taxiOut + (P.jet ? BIG_HUBS[from] || 0 : 0), taxiIn = P.taxiIn + (P.jet ? (BIG_HUBS[to] || 0) * 0.5 : 0);
  push('Taxi out', 0);
  s += taxiOut * 60; push('Taxi out', 12);
  const rollS = P.jet ? 40 : 25; s += rollS; d += 0.6; push('Takeoff', P.appKt);
  const STEP = 20;
  // climb
  while (h < cruise) {
    const ias = h < 10000 ? Math.min(250, P.climbIas) : P.climbIas;
    let tas = iasToTas(ias, h);
    if (P.jet && P.climbMach) tas = Math.min(tas, P.climbMach * soundKt(h));
    if (!P.jet) tas = Math.min(tas, cruiseTas(P, t, h));
    const rate = P.rocSL + (P.rocTop - P.rocSL) * clamp(h / Math.max(P.maxAlt, 1), 0, 1);
    const gs = Math.max(50, tas + wind(h, d) * 0.9);
    s += STEP; d += gs * STEP / 3600; h = Math.min(cruise, h + rate * STEP / 60);
    push('Climb', gs);
  }
  // cruise until the top of descent
  const todNm = down[down.length - 1][1];
  while (d < routeNm - todNm) {
    const gs = Math.max(60, cruiseTas(P, t, h) + wind(h, d));
    const step = Math.min(gs * STEP / 3600, routeNm - todNm - d);
    s += step / gs * 3600; d += step; push('Cruise', gs);
    if (step < 1e-6) break;
  }
  // descent and approach, following the table from the top down
  for (let i = down.length - 2; i >= 0; i--) {
    const [hh, dd, ss] = down[i], [, dd1, ss1] = down[i + 1];
    const dt = ss1 - ss, dd2 = dd1 - dd;
    s += dt; d += dd2; h = hh;
    const ph = hh <= 2000 ? 'Final' : hh < 4000 ? 'Approach' : 'Descent';
    if (i % 3 === 0 || hh <= 2000) push(ph, dd2 / dt * 3600);
  }
  d = routeNm; h = 0; s += 45; push('Landing', 25);
  s += taxiIn * 60; push('Taxi in', 0);
  const airS = s - taxiOut * 60 - taxiIn * 60;
  const prof = { pts, totalS: s, routeNm, cruiseAlt: cruise, airS };
  _profiles[key] = prof;
  return prof;
}

/** Where a flight is after `elapsedS` seconds from off-blocks. */
function profileAt(p: FlightProfile, elapsedS: number) {
  const pts = p.pts;
  if (elapsedS <= 0) return { d: 0, alt: 0, gs: 0, ph: 'Taxi out', left: p.routeNm, toGoS: p.totalS };
  if (elapsedS >= p.totalS) return { d: p.routeNm, alt: 0, gs: 0, ph: 'Arrived', left: 0, toGoS: 0 };
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= elapsedS) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], k = b.s > a.s ? (elapsedS - a.s) / (b.s - a.s) : 0;
  const d = a.d + (b.d - a.d) * k;
  return { d, alt: Math.round((a.alt + (b.alt - a.alt) * k) / 10) * 10, gs: Math.round(a.gs + (b.gs - a.gs) * k), ph: b.ph, left: Math.max(0, p.routeNm - d), toGoS: p.totalS - elapsedS };
}

/** Elapsed seconds at which a flight has covered a share `frac` of its route (used to place flights from older saves). */
function profileTimeAtFrac(p: FlightProfile, frac: number) {
  const target = frac * p.routeNm;
  for (let i = 1; i < p.pts.length; i++) if (p.pts[i].d >= target && p.pts[i].ph !== 'Taxi out') {
    const a = p.pts[i - 1], b = p.pts[i], k = b.d > a.d ? (target - a.d) / (b.d - a.d) : 0;
    return a.s + (b.s - a.s) * k;
  }
  return p.totalS * frac;
}
