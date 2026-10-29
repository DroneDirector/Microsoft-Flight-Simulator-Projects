// Live world map: dot-matrix land, great-circle routes and moving aircraft on a canvas.
// Canvas 2D only, so it also runs inside the simulator's toolbar panel.

const MAP_LAT_MAX = 84, MAP_LAT_MIN = -58;

// Optional online base maps (MapLibre), chosen with the layer button on the map.
// Classic dot map stays the default and the offline fallback.
const EOX_ATTRIB = 'Sentinel-2 cloudless 2016 by <a href="https://cloudless.eox.at">EOX IT Services GmbH</a> (contains modified Copernicus Sentinel data 2016)';
function baseMapStyle(): any {
  switch (State.settings.mapStyle) {
    case 'street': return 'https://tiles.openfreemap.org/styles/liberty';
    case 'satellite': return {
      version: 8,
      sources: { s2: { type: 'raster', tileSize: 256, maxzoom: 14, attribution: EOX_ATTRIB,
        tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'] } },
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0A1A2E' } }, { id: 's2', type: 'raster', source: 's2' }],
    };
    default: return null;
  }
}

// Familiar light street-map colours applied on top of the OpenStreetMap style.
function streetLook(map: any) {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  const set = (id: string, k: string, v: any) => { try { map.setPaintProperty(id, k, v); } catch (e) { /* property not on this layer */ } };
  for (const l of layers) {
    const id = String(l.id).toLowerCase();
    if (l.type === 'background') set(l.id, 'background-color', '#F8F7F3');
    else if (l.type === 'fill') {
      if (/water|ocean|sea|lake|river/.test(id)) set(l.id, 'fill-color', '#9CC0F9');
      else if (/park|wood|forest|grass|wetland|scrub|garden|green|cemetery|golf|pitch/.test(id)) set(l.id, 'fill-color', '#CEEAD6');
      else if (/glacier|ice|snow/.test(id)) set(l.id, 'fill-color', '#FFFFFF');
      else if (/sand|beach|bare|rock/.test(id)) set(l.id, 'fill-color', '#F1EADB');
      else if (/building/.test(id)) { set(l.id, 'fill-color', '#EEEDEA'); set(l.id, 'fill-outline-color', '#E0DED9'); }
      else if (/aeroway|airport/.test(id)) set(l.id, 'fill-color', '#E6E8EC');
      else if (/residential|landuse|urban|industrial|commercial|retail|school|hospital/.test(id)) set(l.id, 'fill-color', '#F1F0EC');
    } else if (l.type === 'fill-extrusion') { set(l.id, 'fill-extrusion-color', '#EEEDEA'); }
    else if (l.type === 'line') {
      if (/water|river|stream|canal/.test(id)) set(l.id, 'line-color', '#9CC0F9');
      else if (/boundary|admin/.test(id)) set(l.id, 'line-color', '#A8ABB0');
      else if (/motorway|trunk/.test(id)) set(l.id, 'line-color', /casing|outline/.test(id) ? '#E9B949' : '#FDE293');
      else if (/road|street|highway|primary|secondary|tertiary|minor|service|link|bridge|tunnel/.test(id)) set(l.id, 'line-color', /casing|outline/.test(id) ? '#DADCE0' : '#FFFFFF');
      else if (/rail/.test(id)) set(l.id, 'line-color', '#C9CCD1');
      else if (/aeroway|runway|taxiway/.test(id)) set(l.id, 'line-color', '#D3D6DB');
    } else if (l.type === 'symbol') {
      set(l.id, 'text-halo-color', '#FFFFFF'); set(l.id, 'text-halo-width', 1.4);
      set(l.id, 'text-color', /water|ocean|sea|lake|river/.test(id) ? '#4C79B8' : /park|poi/.test(id) ? '#3E7E52' : /country|continent/.test(id) ? '#202124' : '#3C4043');
    }
  }
}

function baseMapAvailable(): boolean { return !!(window as any).maplibregl && navigator.onLine !== false && !!baseMapStyle(); }
function millerY(lat: number): number { const p = lat * D2R; return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p)); }
const MY_MAX = millerY(MAP_LAT_MAX), MY_MIN = millerY(MAP_LAT_MIN);

interface MapOpts { interactive?: boolean; labels?: boolean; onSelect?: (id: string) => void; compact?: boolean; insetRight?: number }

/** Where a flight is now: its real position when it comes from the simulator, otherwise along its route. */
function flightPos(f: LiveFlight): number[] {
  if (f.pos) return f.pos;
  return gcInterpolate(apt(f.from).pos, apt(f.to).pos, f.t);
}

class WorldMap {
  el: HTMLElement; cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  base: HTMLCanvasElement; baseDirty = true;
  w = 0; h = 0; dpr = 1;
  cx = 0; cy = 0; R = 200; // view centre in radians-space, pixels per radian
  opts: MapOpts; selected: string = null; raf = 0; alive = true; last = 0;
  ptrs: { [id: number]: { x: number; y: number } } = {}; pinch0 = 0; R0 = 0; moved = false;
  anim: any = null; colors: any; lastFit: any = null; userMoved = false;
  ro: any; ml: any = null; mlHost: HTMLElement = null;
  following: string = null; followT = 0;

  constructor(el: HTMLElement, opts?: MapOpts) {
    this.el = el; this.opts = opts || {};
    this.cv = document.createElement('canvas');
    this.cv.className = 'map-canvas';
    el.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    if (baseMapAvailable()) this.initBaseMap();
    this.base = document.createElement('canvas');
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    this.colors = { bg: v('--map-bg'), dot: v('--map-dot'), dotHi: v('--map-dot-hi'), grid: v('--map-grid'), mag: v('--magenta'), cyan: v('--cyan'), ink: v('--ink'), dim: v('--ink-2'), green: v('--green'), amber: v('--amber') };
    this.resize();
    const ResizeObs = (window as any).ResizeObserver;
    if (ResizeObs) { this.ro = new ResizeObs(() => this.resize()); this.ro.observe(el); }
    else window.addEventListener('resize', () => this.resize());
    if (this.ml) { /* MapLibre handles pan, zoom and taps */ }
    else if (this.opts.interactive) this.bindInput();
    else this.cv.addEventListener('click', e => this.tapAt(e.offsetX, e.offsetY));
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() { this.alive = false; cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); if (this.ml) { try { this.ml.remove(); } catch (e) { /* already gone */ } this.ml = null; } }

  initBaseMap() {
    const ML = (window as any).maplibregl;
    this.mlHost = document.createElement('div');
    this.mlHost.className = 'ml-host';
    this.el.insertBefore(this.mlHost, this.cv);
    this.cv.classList.add('overlay');
    try {
      this.ml = new ML.Map({
        container: this.mlHost, style: baseMapStyle(), center: [-10, 58], zoom: 2,
        attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, touchPitch: false,
        renderWorldCopies: false, interactive: !!this.opts.interactive,
      });
      this.ml.touchZoomRotate.disableRotation();
      this.ml.on('move', () => { this.baseDirty = true; });
      this.ml.on('dragstart', () => { this.userMoved = true; this.following = null; });
      this.ml.on('zoomstart', (e: any) => { if (e.originalEvent) this.userMoved = true; });
      this.ml.on('click', (e: any) => this.tapAt(e.point.x, e.point.y));
      this.ml.on('error', () => { /* tiles failing (offline): the overlay keeps working */ });
      if (State.settings.mapStyle === 'street') this.ml.on('style.load', () => streetLook(this.ml));
    } catch (e) {
      this.ml = null; this.mlHost.remove(); this.cv.classList.remove('overlay');
    }
  }

  resize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    for (const c of [this.cv, this.base]) { c.width = Math.round(this.w * this.dpr); c.height = Math.round(this.h * this.dpr); }
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
    this.baseDirty = true;
    if (this.ml) this.ml.resize();
    if (this.lastFit && !this.userMoved) this.fit(this.lastFit.points, this.lastFit.pad, false, true);
  }

  // lon/lat -> screen
  px(lon: number, lat: number): number[] {
    if (this.ml) { const p = this.ml.project([lon, lat]); return [p.x, p.y]; }
    const x = lon * D2R, y = millerY(clamp(lat, MAP_LAT_MIN, MAP_LAT_MAX));
    return [(x - this.cx) * this.R + this.w / 2, (this.cy - y) * this.R + this.h / 2];
  }
  /** Screen pixels per degree of longitude at the current view. */
  degPx(): number {
    if (this.ml) { const a = this.ml.project([0, 50]), b = this.ml.project([1, 50]); return Math.abs(b.x - a.x); }
    return this.R * D2R;
  }
  minR() { return Math.max(this.w / (2 * Math.PI), this.h / (MY_MAX - MY_MIN)); }
  clampView() {
    this.R = clamp(this.R, this.minR(), 4200);
    const hw = this.w / 2 / this.R, hh = this.h / 2 / this.R;
    this.cx = clamp(this.cx, -Math.PI + hw, Math.PI - hw);
    this.cy = clamp(this.cy, MY_MIN + hh, MY_MAX - hh);
  }

  /** Frame a set of points with padding. */
  fit(points: number[][], pad?: number, animate?: boolean, keep?: boolean) {
    if (!keep) { this.lastFit = { points, pad }; this.userMoved = false; }
    if (!this.w) return;
    pad = pad == null ? 60 : pad;
    if (this.ml) {
      let a = 999, b = 999, c = -999, d = -999;
      for (const p of points) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }
      const insR = this.w > 600 ? (this.opts.insetRight || 0) : 0;
      this.ml.resize();
      this.ml.fitBounds([[a, b], [c, d]], { padding: { top: pad, bottom: pad, left: pad, right: pad + insR }, duration: animate && !reducedMotion() ? 900 : 0, maxZoom: 7 });
      return;
    }
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const p of points) { const x = p[0] * D2R, y = millerY(p[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const ins = this.w > 600 ? (this.opts.insetRight || 0) : 0;
    const R = Math.min((this.w - ins - pad * 2) / Math.max(x1 - x0, 0.02), (this.h - pad * 2) / Math.max(y1 - y0, 0.02));
    const Rc = clamp(R, this.minR(), 2600);
    const target = { cx: (x0 + x1) / 2 + ins / 2 / Rc, cy: (y0 + y1) / 2, R: Rc };
    if (animate && !reducedMotion()) this.anim = { from: { cx: this.cx, cy: this.cy, R: this.R }, to: target, t0: performance.now(), dur: 900 };
    else { this.cx = target.cx; this.cy = target.cy; this.R = target.R; this.clampView(); this.baseDirty = true; }
  }

  /** Zoom in on a flight and keep it centred while it moves (until you drag the map). */
  follow(id: string) {
    const f = State.live.filter(x => x.id === id)[0]; if (!f) return;
    this.following = id; this.selected = id;
    const p = flightPos(f);
    const span = 3.2;
    this.fit([[p[0] - span * 1.6, p[1] - span], [p[0] + span * 1.6, p[1] + span]], 40, true);
    this.userMoved = false;
  }

  zoomBy(f: number, ax?: number, ay?: number) {
    if (this.ml) { this.userMoved = true; this.ml.easeTo({ zoom: this.ml.getZoom() + Math.log(f) / Math.LN2, duration: 300 }); return; }
    ax = ax == null ? this.w / 2 : ax; ay = ay == null ? this.h / 2 : ay;
    const wx = this.cx + (ax - this.w / 2) / this.R, wy = this.cy - (ay - this.h / 2) / this.R;
    this.R *= f; this.clampView();
    this.cx = wx - (ax - this.w / 2) / this.R; this.cy = wy + (ay - this.h / 2) / this.R;
    this.clampView(); this.baseDirty = true;
  }

  bindInput() {
    const cv = this.cv;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      this.ptrs[e.pointerId] = { x: e.offsetX, y: e.offsetY }; this.moved = false; this.anim = null;
      const ids = Object.keys(this.ptrs);
      if (ids.length === 2) { const a = this.ptrs[+ids[0]], b = this.ptrs[+ids[1]]; this.pinch0 = Math.hypot(a.x - b.x, a.y - b.y); this.R0 = this.R; }
    });
    cv.addEventListener('pointermove', e => {
      const p = this.ptrs[e.pointerId]; if (!p) return;
      const ids = Object.keys(this.ptrs);
      if (ids.length === 1) {
        const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) { this.moved = true; this.userMoved = true; this.following = null; }
        this.cx -= dx / this.R; this.cy += dy / this.R; this.clampView(); this.baseDirty = true;
      }
      p.x = e.offsetX; p.y = e.offsetY;
      if (ids.length === 2) {
        const a = this.ptrs[+ids[0]], b = this.ptrs[+ids[1]];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const f = (this.R0 * d / this.pinch0) / this.R;
        this.zoomBy(f, (a.x + b.x) / 2, (a.y + b.y) / 2); this.moved = true; this.userMoved = true;
      }
    });
    const up = (e: PointerEvent) => {
      if (!this.moved && Object.keys(this.ptrs).length === 1) this.tapAt(e.offsetX, e.offsetY);
      delete this.ptrs[e.pointerId];
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', e => { delete this.ptrs[e.pointerId]; });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.userMoved = true; this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY); }, { passive: false } as any);
    cv.addEventListener('dblclick', e => this.zoomBy(1.8, e.offsetX, e.offsetY));
  }

  tapAt(x: number, y: number) {
    let best: string = null, bd = 28;
    for (const f of liveOf()) {
      const p = this.px.apply(this, flightPos(f));
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bd) { bd = d; best = f.id; }
    }
    this.selected = best;
    if (this.opts.onSelect) this.opts.onSelect(best);
  }

  drawBase() {
    const c = this.base.getContext('2d'), col = this.colors;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    if (!this.ml) { c.fillStyle = col.bg; c.fillRect(0, 0, this.w, this.h); }
    if (!this.ml) {
      // graticule every 15°
      c.strokeStyle = col.grid; c.lineWidth = 1;
      c.beginPath();
      for (let lon = -180; lon <= 180; lon += 15) { const a = this.px(lon, MAP_LAT_MIN), b = this.px(lon, MAP_LAT_MAX); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      for (let lat = -45; lat <= 75; lat += 15) { const a = this.px(-180, lat), b = this.px(180, lat); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      c.stroke();
      // land dots
      const degPx = this.degPx();
      const step = degPx > 26 ? 0.25 : degPx > 9 ? 0.5 : degPx > 4 ? 1 : 2;
      const r = clamp(degPx * step * 0.2, 0.55, 2.1);
      c.fillStyle = col.dot;
      c.beginPath();
      for (const d of landDots(step)) {
        const p = this.px(d[0], d[1]);
        if (p[0] < -4 || p[1] < -4 || p[0] > this.w + 4 || p[1] > this.h + 4) continue;
        c.moveTo(p[0] + r, p[1]); c.arc(p[0], p[1], r, 0, Math.PI * 2);
      }
      c.fill();
    }
    // company airports
    const used: { [k: string]: boolean } = {};
    for (const rt of State.routes) if (rt.companyId === State.companyId) for (const l of rt.legs) used[l] = true;
    used[company().hub] = true;
    c.font = '600 10px Inter, sans-serif';
    const degPx2 = this.degPx();
    for (const k in used) {
      const a = apt(k); if (!a) continue;
      const p = this.px(a.pos[0], a.pos[1]);
      const hub = k === company().hub;
      c.save(); c.translate(p[0], p[1]); c.rotate(Math.PI / 4);
      c.fillStyle = col.bg; c.strokeStyle = hub ? col.cyan : col.dim; c.lineWidth = 1.4;
      const s = hub ? 4.2 : 3;
      c.fillRect(-s, -s, s * 2, s * 2); c.strokeRect(-s, -s, s * 2, s * 2);
      c.restore();
      if (degPx2 > 1.4 && this.opts.labels !== false) {
        if (this.ml) { c.lineWidth = 3; c.lineJoin = 'round'; c.strokeStyle = 'rgba(5,15,28,.85)'; c.strokeText(k, p[0] + 7, p[1] + 3.5); }
        c.fillStyle = hub ? col.cyan : (this.ml ? col.ink : col.dim); c.fillText(k, p[0] + 7, p[1] + 3.5);
      }
    }
    this.baseDirty = false;
  }

  loop(now: number) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.el.isConnected) { this.destroy(); return; }
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0; this.last = now;
    if (this.anim && !this.ml) {
      const k = clamp((now - this.anim.t0) / this.anim.dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      this.cx = this.anim.from.cx + (this.anim.to.cx - this.anim.from.cx) * e;
      this.cy = this.anim.from.cy + (this.anim.to.cy - this.anim.from.cy) * e;
      this.R = this.anim.from.R * Math.pow(this.anim.to.R / this.anim.from.R, e);
      this.clampView(); this.baseDirty = true;
      if (k >= 1) this.anim = null;
    }
    if (!this.w) return;
    if (this.following && !this.anim && now - this.followT > 250) {
      this.followT = now;
      const ff = State.live.filter(x => x.id === this.following)[0];
      if (ff) {
        const p = flightPos(ff);
        const ins = this.w > 600 ? (this.opts.insetRight || 0) : 0;
        if (this.ml) { if (!this.ml.isMoving()) this.ml.easeTo({ center: p, offset: [-ins / 2, 0], duration: 240, easing: (x: number) => x }); }
        else { this.cx = p[0] * D2R + ins / 2 / this.R; this.cy = millerY(p[1]); this.clampView(); this.baseDirty = true; }
      }
    }
    if (this.baseDirty) this.drawBase();
    const c = this.ctx, col = this.colors;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.ml) c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.drawImage(this.base, 0, 0);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const degPx = this.degPx();
    for (const f of liveOf()) {
      if (!f.real && !aiOn(f)) { f.t = f.t + f.rate * dt * (State.settings.reduceMotion ? 0 : 1); if (f.t > 1) f.t = 0.02; }
      const a = apt(f.from).pos, b = apt(f.to).pos;
      const N = 48;
      const pts: number[][] = [];
      if (!f.noDest) for (let i = 0; i <= N; i++) pts.push(this.px.apply(this, gcInterpolate(a, b, i / N)));
      const sel = this.selected === f.id, mine = !!f.you;
      const here = this.px.apply(this, flightPos(f));
      if (pts.length) {
        // remaining route: dashed
        c.setLineDash([4, 5]); c.lineWidth = 1.2; c.strokeStyle = mine ? col.cyan : col.mag; c.globalAlpha = 0.45;
        c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
        // flown part: solid
        c.setLineDash([]); c.globalAlpha = 1; c.lineWidth = sel || mine ? 2.4 : 1.8;
        const cut = Math.max(1, Math.floor(f.t * N));
        c.beginPath(); for (let i = 0; i <= cut; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]);
        c.lineTo(here[0], here[1]); c.stroke();
      }
      c.setLineDash([]); c.globalAlpha = 1;
      // heading: the real one for your flight, otherwise from a point just ahead on the route
      let hdg: number;
      if (f.real && f.hdg != null) hdg = f.hdg;
      else { const ah = this.px.apply(this, gcInterpolate(a, b, Math.min(f.t + 0.01, 1))); hdg = Math.atan2(ah[0] - here[0], -(ah[1] - here[1])) / D2R; }
      const t = acType(plane(f.reg).typeId);
      const prop = t.cls === 'bush' || t.cls === 'turboprop' || t.cls === 'ga';
      if (sel || mine) {
        const pulse = (now / 1000) % 1.6 / 1.6;
        c.beginPath(); c.arc(here[0], here[1], 10 + pulse * 16, 0, Math.PI * 2);
        c.strokeStyle = mine ? col.cyan : col.mag; c.globalAlpha = 0.5 * (1 - pulse); c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1;
      }
      const light = this.ml && State.settings.mapStyle === 'street';
      drawPlaneGlyph(c, here[0], here[1], hdg, mine ? 22 : 18, prop, mine ? (light ? '#0B8FB0' : col.cyan) : (light ? '#14243A' : col.ink), light ? '#FFFFFF' : col.bg);
      if (this.opts.labels !== false && (degPx > 3.2 || sel || mine)) {
        c.font = '600 11px Inter, sans-serif';
        const label = f.callsign, w = c.measureText(label).width;
        const lx = here[0] + 14, ly = here[1] - 12;
        c.fillStyle = 'rgba(6,16,30,.82)'; c.fillRect(lx - 4, ly - 11, w + 8, 16);
        c.fillStyle = mine ? col.cyan : col.ink; c.fillText(label, lx, ly + 1);
      }
    }
  }
}
