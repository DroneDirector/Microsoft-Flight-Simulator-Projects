// Airport layouts for the airport view, best first:
//  1. Linked to the simulator: the simulator's own layout through the PC app (runways, taxiways, stands
//     and gates exactly as Microsoft Flight Simulator has them, add-on scenery included).
//  2. The real airport from OpenStreetMap (© OpenStreetMap contributors, ODbL): runways, taxiways,
//     taxilanes, aprons, terminals and numbered stands. Downloaded once per airport (usually 20-300 KB)
//     and kept on the device, so it is only fetched again after three months.
//  3. Offline, or where OpenStreetMap has nothing: the airport's real runways from the world airport data.

interface AirportLayout {
  icao: string; name: string; lat: number; lon: number; alt: number; magvar: number;
  runways: { lat: number; lon: number; hdg: number; len: number; wid: number; surf: number; a: string; b: string }[];
  points: number[][];   // [east m, north m, type]
  parks: number[][];    // [east m, north m, heading, radius m, type, name code, number]
  paths: number[][];    // [type, width m, start, end, name index, runway number, runway designator]
  names: string[];
  parkNames?: string[];                                  // stand names ("A12", "214") where known
  areas?: { k: 'apron' | 'terminal'; pts: number[][] }[]; // aprons and terminal buildings (metres)
  source: 'sim' | 'osm' | 'runways';
}

const AirportLayouts = {
  cache: {} as { [icao: string]: AirportLayout },
  waiting: {} as { [icao: string]: { ok: (l: AirportLayout) => void; timer: any }[] },

  get(icao: string): Promise<AirportLayout> {
    icao = String(icao || '').toUpperCase();
    const c = this.cache[icao];
    // a layout from the simulator is the best there is; others are replaced by it when linked
    if (c && (c.source === 'sim' || (Link.status !== 'connected' && c.source === 'osm'))) return Promise.resolve(c);
    return new Promise(ok => {
      if (Link.status === 'connected' && linkSend({ type: 'layout', icao })) {
        const w = { ok, timer: setTimeout(() => this.received(icao, null, 'timeout'), 15000) };
        (this.waiting[icao] = this.waiting[icao] || []).push(w);
      } else this.fallback(icao).then(ok);
    });
  },

  /** Without the simulator: OpenStreetMap, else the runways. */
  fallback(icao: string): Promise<AirportLayout> {
    return this.fromOsm(icao).then(l => l || this.fromRunways(icao)).catch(() => this.fromRunways(icao));
  },

  /** The PC app answered (a layout, or why there isn't one). */
  received(icao: string, layout: any, error?: string) {
    icao = String(icao || '').toUpperCase();
    const ws = this.waiting[icao] || []; delete this.waiting[icao];
    ws.forEach(w => clearTimeout(w.timer));
    const done = (l: AirportLayout) => ws.forEach(w => w.ok(l));
    if (layout && (layout.runways || []).length) {
      const l: AirportLayout = Object.assign({ points: [], parks: [], paths: [], names: [] }, layout, { icao, source: 'sim' as const });
      this.cache[icao] = l; done(l);
    } else this.fallback(icao).then(done);
  },

  /** A layout with the airport's real runways (world airport data), when the simulator can't give one. */
  fromRunways(icao: string): Promise<AirportLayout> {
    return World.loadRunways().then(rw => {
      const a: any = apt(icao);
      const l: AirportLayout = { icao, name: a ? a.name : icao, lat: a ? a.pos[1] : 0, lon: a ? a.pos[0] : 0, alt: a && a.elev ? a.elev * 0.3048 : 0, magvar: 0,
        runways: [], points: [], parks: [], paths: [], names: [], source: 'runways' };
      for (const r of (rw[icao] || []) as any[]) {
        const [id1, id2, lenFt, widFt, surf, la1, lo1, la2, lo2, hdg1] = r;
        let lat: number, lon: number, hdg: number, len = (lenFt || 0) * 0.3048;
        if (la1 != null && la2 != null) {
          lat = (la1 + la2) / 2; lon = (lo1 + lo2) / 2;
          const k = Math.cos(lat * Math.PI / 180), dx = (lo2 - lo1) * k, dy = la2 - la1;
          hdg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
          if (!len) len = Math.hypot(dx, dy) * 111120;
        } else if (a && (hdg1 != null || /^\d{1,2}/.test(id1))) {
          // no runway ends in the data: centred on the airport, heading from its number
          lat = a.pos[1]; lon = a.pos[0]; hdg = hdg1 != null ? hdg1 : (parseInt(id1, 10) || 0) * 10;
        } else continue;
        if (!len) continue;
        l.runways.push({ lat, lon, hdg, len, wid: Math.max(18, (widFt || 100) * 0.3048), surf: /ASP|CON|BIT|PEM/i.test(surf || '') ? 4 : /GRS|TURF|GRASS/i.test(surf || '') ? 1 : /WAT/i.test(surf || '') ? 9 : 2, a: String(id1 || ''), b: String(id2 || '') });
      }
      this.cache[icao] = l;
      return l;
    });
  },

  /* ---------- OpenStreetMap ---------- */
  OSM_SERVERS: ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'],
  OSM_KEEP_MS: 90 * 864e5,

  fromOsm(icao: string): Promise<AirportLayout> {
    const key = 'amp-osm:' + icao;
    try { const k = JSON.parse(localStorage.getItem(key) || 'null'); if (k && k.l && Date.now() - k.at < this.OSM_KEEP_MS) { this.cache[icao] = k.l; return Promise.resolve(k.l); } } catch (e) { /* not kept */ }
    if (navigator.onLine === false) return Promise.resolve(null);
    const a: any = apt(icao); if (!a) return Promise.resolve(null);
    return World.loadRunways().then(() => this.osmFetch(icao, a, key));
  },

  osmFetch(icao: string, a: any, key: string): Promise<AirportLayout> {
    const kinds = '^(runway|taxiway|taxilane|apron|parking_position|terminal)$';
    const byArea = `[out:json][timeout:40];area["aeroway"="aerodrome"]["icao"="${icao}"]->.a;(way["aeroway"~"${kinds}"](area.a);node["aeroway"~"^(parking_position|gate)$"](area.a););out body geom qt;`;
    const r = a.size === 2 ? 5000 : 3000;
    const around = `[out:json][timeout:40];(way["aeroway"~"${kinds}"](around:${r},${a.pos[1]},${a.pos[0]});node["aeroway"~"^(parking_position|gate)$"](around:${r},${a.pos[1]},${a.pos[0]}););out body geom qt;`;
    return this.overpass(byArea).then(d => d && d.elements && d.elements.some((e: any) => e.tags && e.tags.aeroway === 'runway') ? d : this.overpass(around)).then(d => {
      const l = d ? this.parseOsm(icao, a, d.elements || []) : null;
      if (!l) return null;
      this.cache[icao] = l;
      this.keep(key, l);
      return l;
    });
  },

  overpass(q: string, n = 0): Promise<any> {
    const url = this.OSM_SERVERS[n]; if (!url) return Promise.resolve(null);
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), 30000);
    return fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl ? ctl.signal : undefined } as any)
      .then(r => { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(() => { clearTimeout(t); return this.overpass(q, n + 1); });
  },

  /** Keep up to 30 airports on the device, the oldest go first. */
  keep(key: string, l: AirportLayout) {
    try {
      const idx: string[] = JSON.parse(localStorage.getItem('amp-osm-index') || '[]').filter((k: string) => k !== key);
      idx.push(key);
      while (idx.length > 30) localStorage.removeItem(idx.shift());
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), l }));
      localStorage.setItem('amp-osm-index', JSON.stringify(idx));
    } catch (e) { /* storage full: kept for this session only */ }
  },

  /** Runways mapped in several pieces become one; short unnamed pieces lying on a runway (pads, displaced
   *  thresholds) are dropped. */
  joinRunways(list: AirportLayout['runways']): AirportLayout['runways'] {
    const k = Math.cos((list[0] ? list[0].lat : 0) * Math.PI / 180);
    const ends = (r: any) => { const h = r.hdg * Math.PI / 180, dLat = Math.cos(h) * r.len / 2 / 110540, dLon = Math.sin(h) * r.len / 2 / (111320 * k); return [[r.lat - dLat, r.lon - dLon], [r.lat + dLat, r.lon + dLon]]; };
    const groups: { [key: string]: any[] } = {}, loose: any[] = [];
    for (const r of list) { const key = [r.a, r.b].filter(Boolean).sort().join('|'); if (key) (groups[key] = groups[key] || []).push(r); else loose.push(r); }
    // unnamed pieces lying in line with a named runway are part of it
    const named = Object.keys(groups).map(key => ({ key, r: groups[key].slice().sort((x, y) => y.len - x.len)[0] }));
    const lying = (r: any, o: any) => { const dx = (r.lon - o.lon) * 111320 * k, dy = (r.lat - o.lat) * 110540, h = o.hdg * Math.PI / 180;
      const along = dx * Math.sin(h) + dy * Math.cos(h), across = Math.abs(dx * Math.cos(h) - dy * Math.sin(h));
      const par = Math.abs((((r.hdg - o.hdg) % 180) + 270) % 180 - 90) < 5;
      return par && across < Math.max(30, o.wid) && Math.abs(along) < o.len / 2 + r.len / 2 + 80; };
    for (const r of loose.slice()) { const n = named.filter(x => lying(r, x.r))[0]; if (n) { groups[n.key].push(r); loose.splice(loose.indexOf(r), 1); } }
    const out: any[] = [];
    for (const key of Object.keys(groups)) {
      const g = groups[key]; if (g.length === 1) { out.push(g[0]); continue; }
      const pts: number[][] = []; g.forEach(r => pts.push.apply(pts, ends(r)));
      let A = pts[0], B = pts[1], best = 0;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = (pts[i][0] - pts[j][0]) ** 2 + ((pts[i][1] - pts[j][1]) * k) ** 2; if (d > best) { best = d; A = pts[i]; B = pts[j]; } }
      const ref = g.slice().sort((x, y) => y.len - x.len)[0];
      let hdg = (Math.atan2((B[1] - A[1]) * k, B[0] - A[0]) * 180 / Math.PI + 360) % 360;
      if (Math.abs((((hdg - ref.hdg) % 360) + 540) % 360 - 180) > 90) { const t = A; A = B; B = t; hdg = (hdg + 180) % 360; }
      out.push(Object.assign({}, ref, { lat: (A[0] + B[0]) / 2, lon: (A[1] + B[1]) / 2, hdg, len: Math.round(Math.sqrt(best) * 110540), wid: Math.max.apply(null, g.map(r => r.wid)) }));
    }
    // other unnamed pieces: kept when long enough to be a runway of their own
    for (const r of loose) if (r.len >= 600 && !out.some(o => lying(r, o))) out.push(r);
    return out;
  },

  /** OpenStreetMap elements → layout, in metres east and north of the airport's reference point. */
  parseOsm(icao: string, a: any, els: any[]): AirportLayout {
    const lat0 = a.pos[1], lon0 = a.pos[0], k = Math.cos(lat0 * Math.PI / 180);
    const xy = (g: any) => [Math.round((g.lon - lon0) * 111320 * k * 10) / 10, Math.round((g.lat - lat0) * 110540 * 10) / 10];
    const l: AirportLayout = { icao, name: a.name, lat: lat0, lon: lon0, alt: a.elev ? a.elev * 0.3048 : 0, magvar: 0, runways: [], points: [], parks: [], paths: [], names: [''], parkNames: [], areas: [], source: 'osm' };
    const pIdx: { [id: string]: number } = {}, use: { [id: string]: number } = {};
    const ways = els.filter(e => e.type === 'way' && e.geometry && e.geometry.length >= 2 && e.tags);
    ways.forEach(w => (w.nodes || []).forEach((n: number) => use[n] = (use[n] || 0) + 1));
    const pt = (id: number, g: any, type: number) => { const key = String(id); if (pIdx[key] == null) { l.points.push(xy(g).concat([type])); pIdx[key] = l.points.length - 1; } return pIdx[key]; };
    const widthOf = (w: any, d: number) => { const v = parseFloat(String((w.tags.width || '')).replace(',', '.')); return v > 3 && v < 120 ? v : d; };
    const nameIdx = (n: string) => { if (!n) return 0; let i = l.names.indexOf(n); if (i < 0) { l.names.push(n); i = l.names.length - 1; } return i; };
    const closed = (w: any) => w.nodes && w.nodes.length > 3 && w.nodes[0] === w.nodes[w.nodes.length - 1];
    const addPark = (x: number, y: number, hdg: number, ref: string, big: boolean) => { l.parks.push([x, y, Math.round(((hdg % 360) + 360) % 360), big ? 20 : 12, big ? 9 : 2, 0, 0]); l.parkNames.push(ref || ''); return l.parks.length - 1; };
    for (const w of ways) {
      const t = w.tags.aeroway, g = w.geometry;
      if (t === 'runway') {
        let A = g[0], B = g[g.length - 1];
        if (closed(w)) { let best = 0; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const d = (g[i].lat - g[j].lat) ** 2 + ((g[i].lon - g[j].lon) * k) ** 2; if (d > best) { best = d; A = g[i]; B = g[j]; } } }
        const pa = xy(A), pb = xy(B), len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]); if (len < 150) continue;
        let hdg = (Math.atan2(pb[0] - pa[0], pb[1] - pa[1]) * 180 / Math.PI + 360) % 360;
        const refs = String(w.tags.ref || '').split('/').map((x: string) => x.trim());
        let ra = refs[0] || '', rb = refs[1] || '';
        const num = parseInt(ra, 10);
        // the end called "09" is the one you take off from heading about 090
        if (num && Math.abs((((num * 10 - hdg) % 360) + 540) % 360 - 180) > 90) { const tt = ra; ra = rb; rb = tt; }
        const surf = String(w.tags.surface || 'asphalt');
        l.runways.push({ lat: (A.lat + B.lat) / 2, lon: (A.lon + B.lon) / 2, hdg, len: Math.round(len), wid: widthOf(w, 45), surf: /grass|ground|dirt|gravel|sand/.test(surf) ? 1 : /water/.test(surf) ? 9 : 4, a: ra, b: rb });
        if (!closed(w)) for (let i = 1; i < g.length; i++) l.paths.push([2, widthOf(w, 45), pt(w.nodes[i - 1], g[i - 1], 2), pt(w.nodes[i], g[i], 2), 0, 0, 0]);
      } else if (t === 'taxiway' || t === 'taxilane') {
        if (closed(w)) continue;   // a taxiway drawn as an area
        const wid = widthOf(w, t === 'taxiway' ? 23 : 15), ni = nameIdx(w.tags.ref || '');
        for (let i = 1; i < g.length; i++) l.paths.push([t === 'taxiway' ? 1 : 4, wid, pt(w.nodes[i - 1], g[i - 1], 1), pt(w.nodes[i], g[i], 1), ni, 0, 0]);
      } else if (t === 'parking_position') {
        if (closed(w)) { const c = g.reduce((s2: number[], q: any) => [s2[0] + q.lat / g.length, s2[1] + q.lon / g.length], [0, 0]); const p = xy({ lat: c[0], lon: c[1] }); addPark(p[0], p[1], 0, w.tags.ref || w.tags.name || '', true); continue; }
        // the stand is at the end that doesn't join a taxilane
        const n0 = w.nodes[0], n1 = w.nodes[w.nodes.length - 1], atEnd = (use[n1] || 0) <= (use[n0] || 0);
        const gs = atEnd ? g[g.length - 1] : g[0], gp = atEnd ? g[g.length - 2] : g[1];
        const ps = xy(gs), pp = xy(gp), hdg = Math.atan2(ps[0] - pp[0], ps[1] - pp[1]) * 180 / Math.PI;
        for (let i = 1; i < g.length; i++) l.paths.push([4, 12, pt(w.nodes[i - 1], g[i - 1], 1), pt(w.nodes[i], g[i], 1), 0, 0, 0]);
        const pk = addPark(ps[0], ps[1], hdg, w.tags.ref || w.tags.name || '', true);
        l.paths.push([3, 12, pt(atEnd ? n1 : n0, gs, 1), pk, 0, 0, 0]);
      } else if ((t === 'apron' || t === 'terminal') && closed(w)) {
        l.areas.push({ k: t, pts: g.map(xy) });
      }
    }
    // stands mapped as single points (and gates without a stand): joined to the nearest taxi point
    const nodes = els.filter(e => e.type === 'node' && e.tags);
    const near = (p: number[], max: number) => { let best = -1, bd = max * max; l.points.forEach((q, i) => { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; best = i; } }); return best; };
    for (const n of nodes) {
      const p = xy(n), ref = n.tags.ref || n.tags.name || '';
      if (n.tags.aeroway === 'gate' && l.parks.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 60)) continue;
      if (n.tags.aeroway === 'gate' && !l.parks.length) continue;
      if (pIdx[String(n.id)] != null && l.parks.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 3)) continue;
      const j = near(p, 250);
      const hdg = j >= 0 ? Math.atan2(p[0] - l.points[j][0], p[1] - l.points[j][1]) * 180 / Math.PI : 0;
      const pk = addPark(p[0], p[1], hdg, ref, true);
      if (j >= 0) l.paths.push([3, 12, j, pk, 0, 0, 0]);
    }
    l.runways = this.joinRunways(l.runways);
    // the official runway length where the map's differs (stopways and pads are often drawn as runway)
    const official = (World.runways || {})[icao] || [];
    for (const r of l.runways) {
      const o = official.filter((x: any) => [x[0], x[1]].sort().join('|') === [r.a, r.b].sort().join('|'))[0];
      const len = o && o[2] ? o[2] * 0.3048 : 0;
      if (len > 300 && Math.abs(len - r.len) / len > 0.02) r.len = Math.round(len);
      if (o && o[3] > 0 && r.wid === 45) r.wid = Math.max(18, o[3] * 0.3048);
    }
    if (!l.runways.length) return null;
    return l;
  },
};