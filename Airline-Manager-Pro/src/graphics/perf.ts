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
    if (cap && FrameGen.on()) { st.last = t; return false; }   // frame generation fills the frames in between instead
    if (cap && st.last && t - st.last < 1000 / cap - 3) return true;
    st.last = t; return false;
  },
  /** After drawing: count the frame and set the renderer's sharpness for the frame rate it manages
   *  (top: the most frames a second this view ever draws, when it has a cap of its own). */
  frame(st: any, r: any, top?: number) {
    if (!st || !r) return;
    if (!st.base) st.base = r.getPixelRatio();
    const now = performance.now(); if (st.gen && FrameGen.on() && Perf.fpsCap() && st.lastReal === st.real) return; st.lastReal = st.real; st.n++;   // with frame generation, only the real frames count
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

/* ---------- frame generation: an in-between frame made from the last one, for smoother turning ---------- */
// With the frame rate held at 30 (warm, battery saver), the scene is drawn 30 times a second into a picture with
// its depth; on the screen's other frames that picture is shifted to where the camera is now (each point moved by
// its own distance), so looking around and walking stay as smooth as the screen. Things that move by themselves
// still move 30 times a second; edges uncovered by the shift take the nearest colour.
const FrameGen = {
  /** Switched on? Off by default; Automatic follows automatic performance. */
  on(): boolean { const v = (State.settings as any).frameGen; return v === 'on' || (v === 'auto' && Perf.on()); },
  /** Draw this frame: the real scene when its turn has come, otherwise an in-between frame. */
  draw(st: any, ren: any, scene: any, cam: any, now?: number): boolean {
    const t = now == null ? performance.now() : now, cap = Perf.fpsCap() || (st && st.genCap) || 0;
    if (!st || !this.on() || !cap) { ren.render(scene, cam); return true; }
    const G = st.gen || (st.gen = this.make());
    if (!G) { ren.render(scene, cam); return true; }
    const T = THREE, sz = ren.getDrawingBufferSize(new T.Vector2());
    if (G.rt.width !== sz.x || G.rt.height !== sz.y) { G.rt.setSize(sz.x, sz.y); G.fresh = false; }
    cam.updateMatrixWorld();
    const real = !G.fresh || !st.realAt || t - st.realAt >= 1000 / cap - 3;
    if (real) {
      // the real frame: drawn into the picture, with the camera it was drawn from
      ren.setRenderTarget(G.rt); ren.render(scene, cam); ren.setRenderTarget(null);
      G.prevVP.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); G.fresh = true; st.realAt = t; st.real = (st.real || 0) + 1;
    } else st.made = (st.made || 0) + 1;
    // on the screen: the picture, shifted from the camera it was drawn from to the camera now
    const U = G.mat.uniforms;
    U.uPrevVP.value.copy(G.prevVP);
    U.uInvVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
    U.uNear.value = cam.near; U.uFar.value = cam.far; U.uLog.value = ren.capabilities && ren.capabilities.logarithmicDepthBuffer ? 1 : 0; U.uP22.value = cam.projectionMatrix.elements[10]; U.uP32.value = cam.projectionMatrix.elements[14];
    ren.render(G.scene, G.cam);
    return real;
  },
  make(): any {
    try {
      const T = THREE, rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType });
      rt.depthTexture = new T.DepthTexture(4, 4); rt.depthTexture.type = T.UnsignedIntType;
      const mat = new T.ShaderMaterial({
        uniforms: { tCol: { value: rt.texture }, tDep: { value: rt.depthTexture }, uPrevVP: { value: new T.Matrix4() }, uInvVP: { value: new T.Matrix4() }, uNear: { value: 0.1 }, uFar: { value: 100 }, uLog: { value: 0 }, uP22: { value: -1 }, uP32: { value: -0.2 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `uniform sampler2D tCol; uniform sampler2D tDep; uniform mat4 uPrevVP; uniform mat4 uInvVP; uniform float uFar, uLog, uP22, uP32; varying vec2 vUv;
          // a logarithmic depth buffer (the long-range 3D view) back to the ordinary depth this shift works with
          float dep(vec2 uv) { float d = texture2D(tDep, uv).x; if (uLog < 0.5) return d; float w = exp2(d * log2(uFar + 1.0)) - 1.0; return ((uP22 * -w + uP32) / w) * 0.5 + 0.5; }
          vec2 back(vec2 uv, float d) { vec4 w = uInvVP * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); w /= w.w; vec4 p = uPrevVP * vec4(w.xyz, 1.0); return p.xy / p.w * 0.5 + 0.5; }
          void main() {
            // where this point was in the drawn picture: guess with the depth here, then once more with the depth found there
            float d = dep(vUv); vec2 s = back(vUv, d);
            d = dep(clamp(s, 0.0, 1.0)); s = back(vUv, d);
            d = min(d, dep(clamp(s, 0.0, 1.0))); s = back(vUv, d);
            vec2 sc = clamp(s, vec2(0.0005), vec2(0.9995));
            gl_FragColor = texture2D(tCol, sc);
            // the background colour is never tone-mapped when drawn straight to the screen, so not here either
            #if defined( TONE_MAPPING )
            if (texture2D(tDep, sc).x < 0.999999) gl_FragColor.rgb = toneMapping(gl_FragColor.rgb);
            #endif
            #include <colorspace_fragment>
          }`,
        depthTest: false, depthWrite: false,
      });
      const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), q = new T.Mesh(new T.PlaneGeometry(2, 2), mat); q.frustumCulled = false; scene.add(q);
      return { rt, mat, scene, cam, prevVP: new T.Matrix4(), fresh: false };
    } catch (e) { return null; }
  },
  dispose(st: any) { const G = st && st.gen; if (!G) return; try { G.rt.dispose(); G.mat.dispose(); } catch (e) { /* gone */ } st.gen = null; },
};
