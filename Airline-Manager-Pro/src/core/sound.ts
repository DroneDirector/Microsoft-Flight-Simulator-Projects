// All sounds are synthesised in code (Web Audio), so there are no third-party audio files to license.
let _ctx: AudioContext = null;
function audio(): AudioContext {
  if (State.settings.muteAll) return null;
  if (!_ctx) {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    _ctx = new C();
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
  /** Paying a bill or fine: coins sliding out, a falling two-note chime and a soft low thud. */
  payOut() {
    if (!State.settings.paySound) return;
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const bus = ctx.createGain(); bus.gain.value = 0.85; bus.connect(ctx.destination);
    noiseBurst(ctx, t, 0.18, 0.18, 2600);
    for (let i = 0; i < 4; i++) tone(ctx, 3200 - i * 260, t + 0.02 + i * 0.035, 0.07, 0.05, 'triangle', bus);
    const bell = (f: number, st: number, g: number) => { tone(ctx, f, st, 0.7, g, 'sine', bus); tone(ctx, f * 2.4, st, 0.35, g * 0.3, 'sine', bus); };
    bell(987.8, t + 0.18, 0.26);
    bell(739.99, t + 0.34, 0.3);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t + 0.34); o.frequency.exponentialRampToValueAtTime(55, t + 0.6);
    g.gain.setValueAtTime(0.0001, t + 0.34); g.gain.exponentialRampToValueAtTime(0.35, t + 0.36); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(g); g.connect(bus); o.start(t + 0.34); o.stop(t + 0.7);
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

// Mechanic voice. The finished app ships recorded lines plus an offline neural voice pack;
// this mockup uses the device's own speech engine as a stand-in so the flow can be tried.
const Voice = {
  speaking: false,
  speak(text: string, onEnd?: () => void) {
    const s = (window as any).speechSynthesis;
    if (!s || State.settings.muteAll) { if (onEnd) onEnd(); return false; }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.pitch = 0.92;
    const v = s.getVoices().filter((x: SpeechSynthesisVoice) => /en[-_](GB|IE|US)/i.test(x.lang));
    if (v.length) u.voice = v[0];
    u.onend = () => { this.speaking = false; if (onEnd) onEnd(); };
    this.speaking = true;
    s.speak(u);
    return true;
  },
  stop() { const s = (window as any).speechSynthesis; if (s) s.cancel(); this.speaking = false; },
};
