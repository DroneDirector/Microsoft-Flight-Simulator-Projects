/* Sound in the 3D view, made in code (no recordings): the engines of the aircraft near the camera (jets:
 * a roar and a turbine whine; propellers: the beat of the blades), louder with power and nearer, and
 * thunder after lightning. Sound takes about 3 seconds a kilometre (5 seconds a mile) to arrive, and thunder
 * is heard out to about 16 km (10 miles); far away it is a low rumble, close by a sharp crack first.
 * Settings → Sound and feel: each can be switched off, and the volume set. */

const V3dSound: any = {
  ctx: null as AudioContext, master: null as GainNode, jet: null as any, prop: null as any, at: 0,

  vol(): number { const v = (State.settings as any).v3dVol; return clamp(v == null ? 0.7 : +v, 0, 1); },
  on(k: string): boolean { return (State.settings as any)[k] !== false; },

  /** The output for the 3D view's sounds (null when sound is off). */
  out(): GainNode {
    const ctx = audio(); if (!ctx) return null;
    if (this.ctx !== ctx || !this.master) { this.ctx = ctx; this.master = ctx.createGain(); this.master.connect(ctx.destination); this.jet = this.prop = null; }
    this.master.gain.setTargetAtTime(this.vol(), ctx.currentTime, 0.1);
    return this.master;
  },

  noise(ctx: AudioContext, secs: number, brown: boolean): AudioBuffer {
    const n = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return buf;
  },

  /** Thunder for a flash `d` metres away (a bolt to the ground is louder and sharper). */
  thunder(d: number, cg: boolean) {
    if (!this.on('v3dThunder') || d > 16000 || document.hidden) return;
    const out = this.out(); if (!out) return;
    const ctx = this.ctx, delay = d / 343, k = Math.pow(1 - d / 16000, 1.6) * (cg ? 1 : 0.6), t0 = ctx.currentTime + delay;
    const dur = 4 + d / 2500 + Math.random() * 3;
    const src = ctx.createBufferSource(); src.buffer = this.noise(ctx, dur, true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120 + 1600 * Math.pow(1 - d / 16000, 2.5);   // the air takes the high notes away with distance
    const g = ctx.createGain(), pan = (ctx as any).createStereoPanner ? (ctx as any).createStereoPanner() : null;
    g.gain.setValueAtTime(0.0001, t0);
    if (d < 3000 && cg) { g.gain.exponentialRampToValueAtTime(1.6 * k, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.5 * k, t0 + 0.6); }   // the crack
    else g.gain.exponentialRampToValueAtTime(0.9 * k + 0.0002, t0 + 0.5 + d / 8000);   // a rolling rumble
    // rolls on, rising and falling, then dies away
    for (let t = 1; t < dur - 1; t += 0.6 + Math.random()) g.gain.linearRampToValueAtTime((0.3 + Math.random() * 0.6) * k + 0.0002, t0 + t);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp); lp.connect(g);
    if (pan) { pan.pan.value = (Math.random() - 0.5) * 1.2; g.connect(pan); pan.connect(out); } else g.connect(out);
    src.start(t0); src.stop(t0 + dur + 0.1);
  },

  /** A running engine voice: its noise and tone sources, with gains and filters set every frame. */
  voice(prop: boolean): any {
    const ctx = this.ctx, out = this.master;
    const n = ctx.createBufferSource(); n.buffer = this.noise(ctx, 3, false); n.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ctx.createGain(); ng.gain.value = 0;
    n.connect(lp); lp.connect(ng); ng.connect(out); n.start();
    const o = ctx.createOscillator(); o.type = prop ? 'sawtooth' : 'sine'; o.frequency.value = prop ? 90 : 3200;
    const of = ctx.createBiquadFilter(); of.type = prop ? 'lowpass' : 'bandpass'; of.frequency.value = prop ? 420 : 3200; (of as any).Q.value = prop ? 0.7 : 6;
    const og = ctx.createGain(); og.gain.value = 0;
    o.connect(of); of.connect(og); og.connect(out); o.start();
    let lfo: OscillatorNode = null;
    if (prop) { lfo = ctx.createOscillator(); lfo.frequency.value = 18; const lg = ctx.createGain(); lg.gain.value = 0.25; lfo.connect(lg); lg.connect(og.gain); lfo.start(); }
    return { n, lp, ng, o, of, og, lfo };
  },

  /** Each frame in the 3D view: the engines near the camera. */
  step(now: number) {
    if (!V3d.open || !V3d.cam || document.hidden || !this.on('v3dEngines')) { this.quiet(); return; }
    if (now - this.at < 100) return; this.at = now;
    const out = this.out(); if (!out) return;
    const ctx = this.ctx, cam = V3d.cam.position, inside = V3d.mode === 'fwd';
    let jetL = 0, propL = 0, jetN = 0, propN = 0;
    for (const id in V3d.planes || {}) {
      const P: any = (V3d.planes as any)[id]; if (!P || !P.pos || P.model && !P.model.visible) continue;
      const d = P.pos.distanceTo(cam); if (d > 4000) continue;
      const ph = String(P.ph || ''), kt = P.kt || 0;
      // power: full for take-off, then climb, cruise, approach, taxi; idle at the stand
      const pw = /take-?off|lift-?off/.test(ph) ? 1 : /climb|initial|departure/.test(ph) ? 0.8 : /cruise/.test(ph) ? 0.55 : /descent|approach|final/.test(ph) ? 0.4
        : /landing|roll|touchdown/.test(ph) ? (kt > 60 ? 0.75 : 0.3) : /taxi|push/.test(ph) ? 0.22 : /board|gate|park|turn/.test(ph) ? 0.06 : kt > 30 ? 0.35 : 0.08;
      const loud = pw / (1 + Math.pow(d / 120, 2));   // falls off with distance (about the inverse square past the first hundred metres)
      let prop = false; try { const t: any = acType(P.type); prop = !!t && /bush|turboprop|ga/.test(t.cls); } catch (e) { /* jet */ }
      if (prop) { propL += loud; propN = Math.max(propN, pw); } else { jetL += loud; jetN = Math.max(jetN, pw); }
    }
    const T = ctx.currentTime, set = (p: AudioParam, v: number) => p.setTargetAtTime(v, T, 0.25);
    if (jetL > 0.0005 && !this.jet) this.jet = this.voice(false);
    if (propL > 0.0005 && !this.prop) this.prop = this.voice(true);
    const muffle = inside ? 0.45 : 1;
    if (this.jet) {
      const J = this.jet, l = Math.min(1, jetL) * muffle;
      set(J.ng.gain, l * 0.55); set(J.lp.frequency, (inside ? 500 : 700) + 1600 * jetN);
      set(J.og.gain, l * 0.05 * (0.4 + jetN)); set(J.o.frequency, 2400 + 1800 * jetN); set(J.of.frequency, 2400 + 1800 * jetN);
    }
    if (this.prop) {
      const Pv = this.prop, l = Math.min(1, propL) * muffle;
      set(Pv.ng.gain, l * 0.25); set(Pv.lp.frequency, 500 + 900 * propN);
      set(Pv.og.gain, l * 0.22); set(Pv.o.frequency, 60 + 55 * propN); if (Pv.lfo) set(Pv.lfo.frequency, 12 + 14 * propN);
    }
  },

  /** Engines silent (the view closed, hidden, or switched off). */
  quiet() {
    if (!this.ctx) return;
    const T = this.ctx.currentTime;
    for (const v of [this.jet, this.prop]) if (v) { v.ng.gain.setTargetAtTime(0, T, 0.2); v.og.gain.setTargetAtTime(0, T, 0.2); }
  },
  stop() {
    this.quiet();
    const ctx = this.ctx; if (!ctx) return;
    setTimeout(() => { for (const k of ['jet', 'prop']) { const v = (this as any)[k]; if (!v) continue; try { v.n.stop(); v.o.stop(); if (v.lfo) v.lfo.stop(); } catch (e) { /* stopped */ } (this as any)[k] = null; } }, 800);
  },
};
