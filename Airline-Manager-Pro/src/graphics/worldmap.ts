// Live world map: dot-matrix land, great-circle routes and moving aircraft on a canvas.
// Canvas 2D only, so it also runs inside the simulator's toolbar panel.

const MAP_LAT_MAX = 84, MAP_LAT_MIN = -58;
function millerY(lat: number): number { const p = lat * D2R; return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p)); }
const MY_MAX = millerY(MAP_LAT_MAX), MY_MIN = millerY(MAP_LAT_MIN);

interface MapOpts { interactive?: boolean; labels?: boolean; onSelect?: (id: string) => void; compact?: boolean; insetRight?: number }

class WorldMap {
  el: HTMLElement; cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  base: HTMLCanvasElement; baseDirty = true;
  w = 0; h = 0; dpr = 1;
  cx = 0; cy = 0; R = 200; // view centre in radians-space, pixels per radian
  opts: MapOpts; selected: string = null; raf = 0; alive = true; last = 0;
  ptrs: { [id: number]: { x: number; y: number } } = {}; pinch0 = 0; R0 = 0; moved = false;
  anim: any = null; colors: any; lastFit: any = null; userMoved = false;
  ro: any;

  constructor(el: HTMLElement, opts?: MapOpts) {
    this.el = el; this.opts = opts || {};
    this.cv = document.createElement('canvas');
    this.cv.className = 'map-canvas';
    el.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.base = document.createElement('canvas');
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    this.colors = { bg: v('--map-bg'), dot: v('--map-dot'), dotHi: v('--map-dot-hi'), grid: v('--map-grid'), mag: v('--magenta'), cyan: v('--cyan'), ink: v('--ink'), dim: v('--ink-2'), green: v('--green'), amber: v('--amber') };
    this.resize();
    const ResizeObs = (window as any).ResizeObserver;
    if (ResizeObs) { this.ro = new ResizeObs(() => this.resize()); this.ro.observe(el); }
    else window.addEventListener('resize', () => this.resize());
    if (this.opts.interactive) this.bindInput();
    else this.cv.addEventListener('click', e => this.tapAt(e.offsetX, e.offsetY));
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() { this.alive = false; cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); }

  resize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    for (const c of [this.cv, this.base]) { c.width = Math.round(this.w * this.dpr); c.height = Math.round(this.h * this.dpr); }
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
    this.baseDirty = true;
    if (this.lastFit && !this.userMoved) this.fit(this.lastFit.points, this.lastFit.pad, false, true);
  }

  // lon/lat -> screen
  px(lon: number, lat: number): number[] {
    const x = lon * D2R, y = millerY(clamp(lat, MAP_LAT_MIN, MAP_LAT_MAX));
    return [(x - this.cx) * this.R + this.w / 2, (this.cy - y) * this.R + this.h / 2];
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
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const p of points) { const x = p[0] * D2R, y = millerY(p[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const ins = this.w > 600 ? (this.opts.insetRight || 0) : 0;
    const R = Math.min((this.w - ins - pad * 2) / Math.max(x1 - x0, 0.02), (this.h - pad * 2) / Math.max(y1 - y0, 0.02));
    const Rc = clamp(R, this.minR(), 2600);
    const target = { cx: (x0 + x1) / 2 + ins / 2 / Rc, cy: (y0 + y1) / 2, R: Rc };
    if (animate && !reducedMotion()) this.anim = { from: { cx: this.cx, cy: this.cy, R: this.R }, to: target, t0: performance.now(), dur: 900 };
    else { this.cx = target.cx; this.cy = target.cy; this.R = target.R; this.clampView(); this.baseDirty = true; }
  }

  zoomBy(f: number, ax?: number, ay?: number) {
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
        if (Math.abs(dx) + Math.abs(dy) > 3) { this.moved = true; this.userMoved = true; }
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
      const p = this.px.apply(this, gcInterpolate(apt(f.from).pos, apt(f.to).pos, f.t));
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bd) { bd = d; best = f.id; }
    }
    this.selected = best;
    if (this.opts.onSelect) this.opts.onSelect(best);
  }

  drawBase() {
    const c = this.base.getContext('2d'), col = this.colors;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = col.bg; c.fillRect(0, 0, this.w, this.h);
    // graticule every 15°
    c.strokeStyle = col.grid; c.lineWidth = 1;
    c.beginPath();
    for (let lon = -180; lon <= 180; lon += 15) { const a = this.px(lon, MAP_LAT_MIN), b = this.px(lon, MAP_LAT_MAX); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    for (let lat = -45; lat <= 75; lat += 15) { const a = this.px(-180, lat), b = this.px(180, lat); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    c.stroke();
    // land dots
    const degPx = this.R * D2R;
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
    // company airports
    const used: { [k: string]: boolean } = {};
    for (const rt of State.routes) if (rt.companyId === State.companyId) for (const l of rt.legs) used[l] = true;
    used[company().hub] = true;
    c.font = '600 10px Inter, sans-serif';
    for (const k in used) {
      const a = apt(k); if (!a) continue;
      const p = this.px(a.pos[0], a.pos[1]);
      const hub = k === company().hub;
      c.save(); c.translate(p[0], p[1]); c.rotate(Math.PI / 4);
      c.fillStyle = col.bg; c.strokeStyle = hub ? col.cyan : col.dim; c.lineWidth = 1.4;
      const s = hub ? 4.2 : 3;
      c.fillRect(-s, -s, s * 2, s * 2); c.strokeRect(-s, -s, s * 2, s * 2);
      c.restore();
      if (degPx > 1.4 && this.opts.labels !== false) { c.fillStyle = hub ? col.cyan : col.dim; c.fillText(k, p[0] + 7, p[1] + 3.5); }
    }
    this.baseDirty = false;
  }

  loop(now: number) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.el.isConnected) { this.destroy(); return; }
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0; this.last = now;
    if (this.anim) {
      const k = clamp((now - this.anim.t0) / this.anim.dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      this.cx = this.anim.from.cx + (this.anim.to.cx - this.anim.from.cx) * e;
      this.cy = this.anim.from.cy + (this.anim.to.cy - this.anim.from.cy) * e;
      this.R = this.anim.from.R * Math.pow(this.anim.to.R / this.anim.from.R, e);
      this.clampView(); this.baseDirty = true;
      if (k >= 1) this.anim = null;
    }
    if (!this.w) return;
    if (this.baseDirty) this.drawBase();
    const c = this.ctx, col = this.colors;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.base, 0, 0);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const degPx = this.R * D2R;
    for (const f of liveOf()) {
      f.t = f.t + f.rate * dt * (State.settings.reduceMotion ? 0 : 1);
      if (f.t > 1) f.t = 0.02;
      const a = apt(f.from).pos, b = apt(f.to).pos;
      const N = 48;
      const pts: number[][] = [];
      for (let i = 0; i <= N; i++) pts.push(this.px.apply(this, gcInterpolate(a, b, i / N)));
      const sel = this.selected === f.id, mine = !!f.you;
      // remaining route: dashed
      c.setLineDash([4, 5]); c.lineWidth = 1.2; c.strokeStyle = mine ? col.cyan : col.mag; c.globalAlpha = 0.45;
      c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
      // flown part: solid
      c.setLineDash([]); c.globalAlpha = 1; c.lineWidth = sel || mine ? 2.4 : 1.8;
      const cut = Math.max(1, Math.floor(f.t * N));
      c.beginPath(); for (let i = 0; i <= cut; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]);
      const here = this.px.apply(this, gcInterpolate(a, b, f.t));
      c.lineTo(here[0], here[1]); c.stroke();
      // heading from a point just ahead
      const ah = this.px.apply(this, gcInterpolate(a, b, Math.min(f.t + 0.01, 1)));
      const hdg = Math.atan2(ah[0] - here[0], -(ah[1] - here[1])) / D2R;
      const t = acType(plane(f.reg).typeId);
      const prop = t.cls === 'bush' || t.cls === 'turboprop' || t.cls === 'ga';
      if (sel || mine) {
        const pulse = (now / 1000) % 1.6 / 1.6;
        c.beginPath(); c.arc(here[0], here[1], 10 + pulse * 16, 0, Math.PI * 2);
        c.strokeStyle = mine ? col.cyan : col.mag; c.globalAlpha = 0.5 * (1 - pulse); c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1;
      }
      drawPlaneGlyph(c, here[0], here[1], hdg, mine ? 22 : 18, prop, mine ? col.cyan : col.ink, col.bg);
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
