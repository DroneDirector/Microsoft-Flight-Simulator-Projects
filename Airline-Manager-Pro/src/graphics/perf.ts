// Automatic performance for the 3D views and rooms on phones and tablets (and on the PC when switched on).
// Each renderer keeps its own small state; every frame it asks whether to draw now (a frame-rate cap when the
// device is warm or saving battery) and how sharp to draw (the resolution goes down step by step while the
// frame rate is low, and back up when there is room). The device's own temperature and battery saver are read
// every 20 seconds on Android.

const PERF_MIN_K = 0.55;
const Perf = {
  thermal: 0, saver: false, polled: 0, polling: false,
  /** Switched on? Automatic on phones and tablets, chosen on the PC. */
  on(): boolean {
    const v = (State.settings as any).perfAuto;
    return v == null ? !DESKTOP : v !== false && v !== 'off';
  },
  /** The device's temperature level (Android: 0 cool … 6 shutting down) and battery saver, every 20 s. */
  poll() {
    const now = Date.now(); if (this.polling || now - this.polled < 20000) return; this.polled = now;
    const c: any = (window as any).Capacitor, T = c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.AppTools;
    if (!T || !T.boostStats) return;
    this.polling = true;
    T.boostStats().then((r: any) => { this.thermal = +(r && r.thermal) || 0; this.saver = !!(r && r.powerSave); }).catch(() => { /* no readings */ }).then(() => { this.polling = false; });
  },
  /** The highest frame rate worth drawing now: 30 while warm or saving battery, otherwise as fast as the screen. */
  fpsCap(): number { return this.on() && (this.thermal >= 2 || this.saver) ? 30 : 0; },
  /** The sharpest it may draw now (warm: less, hot: less again). */
  kMax(): number { return !this.on() ? 1 : this.thermal >= 4 ? 0.6 : this.thermal >= 3 ? 0.7 : this.thermal >= 2 ? 0.85 : 1; },
  /** A renderer's own state. */
  state(): any { return { t0: 0, n: 0, k: 1, base: 0, last: 0 }; },
  /** Skip this frame? (Call first each frame; with a cap of 30, every other frame of a 60 Hz screen is skipped.) */
  skip(st: any, now?: number): boolean {
    if (!st) return false;
    this.poll();
    const cap = this.fpsCap(), t = now == null ? performance.now() : now;
    if (cap && st.last && t - st.last < 1000 / cap - 3) return true;
    st.last = t; return false;
  },
  /** After drawing: count the frame and set the renderer's sharpness for the frame rate it manages
   *  (top: the most frames a second this view ever draws, when it has a cap of its own). */
  frame(st: any, r: any, top?: number) {
    if (!st || !r) return;
    if (!st.base) st.base = r.getPixelRatio();
    const now = performance.now(); st.n++;
    if (!st.t0) { st.t0 = now; st.n = 0; return; }
    if (now - st.t0 < 1500) return;
    const lim = Math.min(this.fpsCap() || 999, top || 999), full = lim < 999 ? lim : 0;
    const fps = st.n * 1000 / (now - st.t0), goal = full ? Math.min(28, full * 0.88) : 28; st.n = 0; st.t0 = now;
    if (!this.on()) st.k = 1;
    else if (fps < goal) st.k = Math.max(PERF_MIN_K, st.k - 0.1);
    else if (fps > (full ? full * 0.95 : 42)) st.k = Math.min(1, st.k + 0.05);
    st.k = Math.min(st.k, this.kMax());
    st.fps = Math.round(fps);
    const want = Math.max(0.5, st.base * st.k);
    if (Math.abs(r.getPixelRatio() - want) > 0.02) { r.setPixelRatio(want); try { r.domElement && r.domElement.dispatchEvent(new Event('perf')); } catch (e) { /* ignore */ } }
    Perf.lastK = st.k; Perf.lastFps = st.fps;
  },
  lastK: 1, lastFps: 0,
  /** What it is doing now, for Settings. */
  label(): string {
    if (!this.on()) return 'Off: the 3D views always draw at full sharpness and frame rate.';
    const why = this.thermal >= 3 ? 'the device is hot' : this.thermal >= 2 ? 'the device is warm' : this.saver ? 'battery saver is on' : '';
    const cap = this.fpsCap();
    return `${why ? `Now: ${why}, so ` : 'Now: '}${cap ? `up to ${cap} frames a second` : 'as smooth as the screen allows'}, drawn at ${Math.round(this.lastK * 100)}% sharpness${this.lastFps ? ` (last seen: ${this.lastFps} frames a second)` : ''}.`;
  },
};
