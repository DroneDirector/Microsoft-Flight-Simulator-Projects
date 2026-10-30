// All sounds are synthesised in code (Web Audio), so there are no third-party audio files to license.
let _ctx: AudioContext = null;
/** The sound output. Voices ask with voice = true: "only the voices" keeps them while every other sound is off. */
function audio(voice?: boolean): AudioContext {
  if (State.settings.muteAll || (!voice && (State.settings as any).onlyVoices)) return null;
  if (!_ctx) {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    _ctx = new C();
    // on the PC: the sound output chosen in Settings → Display
    const sink = (window as any).__audioSink; if (sink && sink !== 'default' && (_ctx as any).setSinkId) (_ctx as any).setSinkId(sink).catch(() => { /* device gone */ });
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(ctx: AudioContext, freq: number, start: number, dur: number, gain: number, type?: OscillatorType, out?: AudioNode) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(out || ctx.destination);
  o.start(start); o.stop(start + dur + 0.05);
}

function noiseBurst(ctx: AudioContext, start: number, dur: number, gain: number, hp: number) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  src.start(start);
}

const Sound = {
  /** Cash-register style "cha-ching" played when an aircraft is bought. */
  purchase() {
    if (!State.settings.purchaseSound) return;
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(ctx.destination);
    // drawer slide + latch
    noiseBurst(ctx, t, 0.12, 0.25, 1800);
    tone(ctx, 140, t + 0.02, 0.09, 0.25, 'triangle', bus);
    // two bell strikes with inharmonic partials
    const bell = (f: number, s: number, g: number) => {
      tone(ctx, f, s, 1.1, g, 'sine', bus);
      tone(ctx, f * 2.76, s, 0.6, g * 0.45, 'sine', bus);
      tone(ctx, f * 5.4, s, 0.3, g * 0.22, 'sine', bus);
    };
    bell(1568, t + 0.14, 0.32);
    bell(2093, t + 0.27, 0.36);
    noiseBurst(ctx, t + 0.27, 0.05, 0.12, 6000);
  },
  /** Paying a bill or fine: register drawer clunk, a falling minor "wah-wah" and a low thud. Clearly a loss. */
  payOut() {
    if (!State.settings.paySound) return;
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(ctx.destination);
    // drawer clunk
    noiseBurst(ctx, t, 0.09, 0.35, 900);
    tone(ctx, 110, t, 0.12, 0.45, 'triangle', bus);
    // falling minor phrase with a slight pitch sag on each note
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(bus);
    const notes = [659.25, 523.25, 440, 349.23];
    notes.forEach((f, i) => {
      const st = t + 0.12 + i * 0.16, dur = i === notes.length - 1 ? 0.75 : 0.2;
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.detune.value = det;
        o.frequency.setValueAtTime(f, st); o.frequency.exponentialRampToValueAtTime(f * 0.94, st + dur);
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.16, st + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g); g.connect(lp); o.start(st); o.stop(st + dur + 0.05);
      }
    });
    // low thud under the last note
    const end = t + 0.12 + 3 * 0.16;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, end); o.frequency.exponentialRampToValueAtTime(45, end + 0.35);
    g.gain.setValueAtTime(0.0001, end); g.gain.exponentialRampToValueAtTime(0.6, end + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.4);
    o.connect(g); g.connect(bus); o.start(end); o.stop(end + 0.45);
  },
  /** Soft tick for toggles and taps. */
  tick() {
    if (!State.settings.uiSounds) return;
    const ctx = audio(); if (!ctx) return;
    tone(ctx, 1900, ctx.currentTime, 0.05, 0.05, 'sine');
  },
  /** Two-tone chime when a new message arrives. */
  chime() {
    if (!State.settings.uiSounds) return;
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 880, t, 0.35, 0.08); tone(ctx, 1318.5, t + 0.12, 0.5, 0.08);
  },
};

const Haptics = {
  pulse(ms?: number) {
    if (!State.settings.haptics) return;
    const cap = (window as any).Capacitor;
    try {
      if (cap && cap.Plugins && cap.Plugins.Haptics) { cap.Plugins.Haptics.impact({ style: ms && ms > 30 ? 'HEAVY' : 'LIGHT' }); return; }
    } catch (e) { /* fall through */ }
    if (navigator.vibrate) navigator.vibrate(ms || 12);
  },
  success() {
    if (!State.settings.haptics) return;
    if (navigator.vibrate) navigator.vibrate([18, 60, 30]);
    else this.pulse(40);
  },
};

// The people's voices are in voice.ts.
