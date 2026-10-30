// Voices for the people who talk to you in the app: the mechanic, the gate agent, the head of operations.
// Natural neural voices (Kokoro-82M, Apache License 2.0), run on this device: on the phone natively on its
// processor cores, on the PC in the app window. The voice pack (about 100 MB) is downloaded once from
// Settings → Voices. Until then, the phone's or PC's own voice reads the lines.
// Each line is spoken exactly as it is written on screen. Lines are prepared in the background as soon as
// they are known, sentence by sentence, so the first words play quickly and later ones follow on.

interface Speaker { voice: string; accent: 'a' | 'b'; speed: number; pitch: number; title: string }
const SPEAKERS: { [k: string]: Speaker } = {
  mechanic: { voice: 'bm_george', accent: 'b', speed: 1.0, pitch: 0.92, title: 'Mechanic' },
  gate: { voice: 'bf_emma', accent: 'b', speed: 1.02, pitch: 1.05, title: 'Gate agent' },
  ops: { voice: 'af_heart', accent: 'a', speed: 1.0, pitch: 1.0, title: 'Head of operations' },
};
const VOICE_PACK_BASE = 'https://github.com/DroneDirector/Microsoft-Flight-Simulator-Projects/releases/download/amp-voice-pack-1/';
const VOICE_MODEL = 'kokoro-v1.0-q8.onnx';
// the model's sound numbers (its vocabulary), from the model's config
const KOKORO_IDS: { [c: string]: number } = {";":1,":":2,",":3,".":4,"!":5,"?":6,"—":9,"…":10,"\"":11,"(":12,")":13,"“":14,"”":15," ":16,"̃":17,"ʣ":18,"ʥ":19,"ʦ":20,"ʨ":21,"ᵝ":22,"ꭧ":23,"A":24,"I":25,"O":31,"Q":33,"S":35,"T":36,"W":39,"Y":41,"ᵊ":42,"a":43,"b":44,"c":45,"d":46,"e":47,"f":48,"h":50,"i":51,"j":52,"k":53,"l":54,"m":55,"n":56,"o":57,"p":58,"q":59,"r":60,"s":61,"t":62,"u":63,"v":64,"w":65,"x":66,"y":67,"z":68,"ɑ":69,"ɐ":70,"ɒ":71,"æ":72,"β":75,"ɔ":76,"ɕ":77,"ç":78,"ɖ":80,"ð":81,"ʤ":82,"ə":83,"ɚ":85,"ɛ":86,"ɜ":87,"ɟ":90,"ɡ":92,"ɥ":99,"ɨ":101,"ɪ":102,"ʝ":103,"ɯ":110,"ɰ":111,"ŋ":112,"ɳ":113,"ɲ":114,"ɴ":115,"ø":116,"ɸ":118,"θ":119,"œ":120,"ɹ":123,"ɾ":125,"ɻ":126,"ʁ":128,"ɽ":129,"ʂ":130,"ʃ":131,"ʈ":132,"ʧ":133,"ʊ":135,"ʋ":136,"ʌ":138,"ɣ":139,"ɤ":140,"χ":142,"ʎ":143,"ʒ":147,"ʔ":148,"ˈ":156,"ˌ":157,"ː":158,"ʰ":162,"ʲ":164,"↓":169,"→":171,"↗":172,"↘":173,"ᵻ":177};

/* ---------- the voice pack: where it is, downloading it ---------- */
const VoicePack = {
  state: 'unknown' as 'unknown' | 'none' | 'partial' | 'downloading' | 'ready' | 'error',
  done: 0, total: 0, error: '', dir: '', manifest: null as any, files: {} as { [k: string]: number },
  native(): any { const cap = (window as any).Capacitor; return cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Voice; },
  /** Where a file of the pack is read from by the app. */
  url(name: string): string {
    if (this.native()) { const cap = (window as any).Capacitor; return cap.convertFileSrc('file://' + this.dir + '/' + name); }
    if (DESKTOP) return '/voicepack/' + name;
    return ((window as any).__VOICE_BASE || 'voicepack/') + name;
  },
  async check(): Promise<string> {
    try {
      if (this.native()) { const r = await this.native().status(); this.dir = r.dir; this.files = r.files || {}; }
      else if (DESKTOP) { const r = await (await fetch('/api/voicepack')).json(); this.files = r.files || {}; if (r.busy) { this.state = 'downloading'; this.done = r.done; this.total = r.total; this.poll(); return this.state; } if (r.error) this.error = r.error; }
      else { this.files = (window as any).__VOICE_FILES || {}; }
    } catch (e) { this.files = {}; }
    const need = [VOICE_MODEL, 'lexicon-gb.json.gz', 'lexicon-us.json.gz'].concat(Object.keys(SPEAKERS).map(k => 'voice-' + SPEAKERS[k].voice + '.bin'));
    const have = need.filter(f => this.files[f] > 0).length;
    this.state = have === need.length ? 'ready' : have ? 'partial' : 'none';
    return this.state;
  },
  /** Download the pack (or the rest of it). */
  async download(): Promise<void> {
    if (this.state === 'downloading') return;
    this.state = 'downloading'; this.error = ''; this.done = 0; this.total = 0; voiceUiChanged();
    try {
      // the list of files and their sizes
      let man: any = null;
      if (this.native()) {
        if (!this.dir) await this.check();
        await this.native().download({ base: VOICE_PACK_BASE, files: [['pack.json', -1]] }).catch(() => null);
      }
      man = await this.manifestFetch();
      const list = Object.keys(man.files).map(k => [k, man.files[k]]);
      this.total = list.reduce((t, x) => t + (x[1] as number), 0);
      if (this.native()) {
        const h = await this.native().addListener('progress', (p: any) => { this.done = p.done; this.total = p.total; voiceUiChanged(); });
        try { await this.native().download({ base: VOICE_PACK_BASE, files: list }); } finally { try { h.remove(); } catch (e) { /* gone */ } }
      } else if (DESKTOP) {
        await fetch('/api/voicepack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base: VOICE_PACK_BASE, files: list }) });
        await new Promise<void>((ok, bad) => { const t = setInterval(async () => {
          try { const r = await (await fetch('/api/voicepack')).json(); this.done = r.done; this.total = r.total || this.total; voiceUiChanged();
            if (!r.busy) { clearInterval(t); r.error ? bad(new Error(r.error)) : ok(); } } catch (e) { /* try again */ } }, 700); });
      }
      await this.check();
      if (this.state !== 'ready') throw new Error('Some files are missing. Try again.');
      try { Sound.chime(); toast('The voices are ready', 'ok'); } catch (e) { /* ignore */ }
    } catch (e: any) {
      this.state = 'error'; this.error = (e && e.message) || String(e);
      try { ErrorLog.add('voice', 'The voices couldn\'t be downloaded', this.error); } catch (er) { /* ignore */ }
    }
    voiceUiChanged();
  },
  /** pack.json: the files in the pack and their sizes (from the download, or the phone's copy). */
  async manifestFetch(): Promise<any> {
    if (this.manifest) return this.manifest;
    let txt = '';
    if (this.native()) txt = await (await fetch(this.url('pack.json'))).text();
    else if (DESKTOP) { const r = await Net.request(VOICE_PACK_BASE + 'pack.json'); if (r.status >= 400) throw new Error('The voice pack isn\'t available right now (' + r.status + ')'); txt = r.text; }
    else txt = await (await fetch(this.url('pack.json'))).text();
    this.manifest = JSON.parse(txt);
    return this.manifest;
  },
  poll() { const t = setInterval(async () => { try { const r = await (await fetch('/api/voicepack')).json(); this.done = r.done; this.total = r.total; if (!r.busy) { clearInterval(t); await this.check(); } voiceUiChanged(); } catch (e) { clearInterval(t); } }, 900); },
  async remove() {
    Voice.stop(); VoiceEngine.reset();
    try { if (this.native()) await this.native().remove(); else if (DESKTOP) await fetch('/api/voicepack', { method: 'DELETE' }); } catch (e) { /* ignore */ }
    await this.check(); voiceUiChanged();
  },
  sizeText(): string { const m = this.manifest; const t = m ? Object.keys(m.files).reduce((s, k) => s + m.files[k], 0) : 101e6; return Math.round(t / 1e6) + ' MB'; },
};

/* ---------- running the voice model ---------- */
const VoiceEngine = {
  loading: null as Promise<void>, worker: null as Worker, kind: '' as '' | 'native' | 'worker',
  voicesLoaded: {} as { [v: string]: Promise<any> }, seq: 0, waits: {} as { [id: number]: (a: any) => void },
  reset() { if (this.worker) this.worker.terminate(); this.worker = null; this.loading = null; this.kind = ''; this.voicesLoaded = {}; },
  async ready(): Promise<void> {
    if (!this.loading) this.loading = (async () => {
      await Promise.all(['a', 'b'].map(async (ac: 'a' | 'b') => {
        if (G2P.lex[ac]) return;
        const r = await fetch(VoicePack.url(`lexicon-${ac === 'b' ? 'gb' : 'us'}.json.gz`));
        const ds = new (window as any).DecompressionStream('gzip');
        G2P.lex[ac] = await new Response(r.body.pipeThrough(ds)).json();
      }));
      const N = VoicePack.native();
      if (N) { await N.load({ model: VOICE_MODEL }); this.kind = 'native'; return; }
      const base = location.href.replace(/[^/]*$/, '');
      this.worker = new Worker('tts-worker.js');
      this.worker.onmessage = e => { const m = e.data; const w = this.waits[m.id]; if (w) { delete this.waits[m.id]; w(m); } };
      await this.call({ type: 'init', base, model: new URL(VoicePack.url(VOICE_MODEL), location.href).toString() }, ++this.seq);
      this.kind = 'worker';
    })().catch(e => { this.loading = null; throw e; });
    return this.loading;
  },
  call(m: any, id: number): Promise<any> {
    return new Promise((ok, bad) => { this.waits[id] = (r: any) => r.type === 'error' ? bad(new Error(r.error)) : ok(r); this.worker.postMessage(Object.assign({ id }, m)); });
  },
  voice(name: string): Promise<any> {
    if (this.kind === 'native') return Promise.resolve();
    if (!this.voicesLoaded[name]) {
      this.voicesLoaded[name] = this.call({ type: 'voice', name, url: new URL(VoicePack.url('voice-' + name + '.bin'), location.href).toString() }, ++this.seq);
      this.voicesLoaded[name].catch(() => { delete this.voicesLoaded[name]; });
    }
    return this.voicesLoaded[name];
  },
  /** One sentence of phonemes to audio (24 kHz). */
  async synth(ps: string, sp: Speaker): Promise<Float32Array> {
    await this.ready();
    const ids: number[] = []; for (const ch of ps) { const i = KOKORO_IDS[ch]; if (i != null) ids.push(i); }
    if (!ids.length) return new Float32Array(0);
    if (this.kind === 'native') {
      const r = await VoicePack.native().synth({ ids, voice: sp.voice, speed: sp.speed });
      const bin = atob(r.pcm), n = bin.length >> 1, out = new Float32Array(n);
      for (let i = 0; i < n; i++) { let v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8); if (v > 32767) v -= 65536; out[i] = v / 32767; }
      return out;
    }
    await this.voice(sp.voice);
    const id = ++this.seq, r = await this.call({ type: 'synth', ids, voice: sp.voice, speed: sp.speed }, id);
    return r.audio;
  },
};

/* ---------- speaking ---------- */
// sentences already spoken or prepared, kept for a while (the same line again plays straight away)
const _voiceCache = new Map<string, Promise<Float32Array>>();
function voiceSentence(ps: string, sp: Speaker): Promise<Float32Array> {
  const k = sp.voice + '|' + sp.speed + '|' + ps;
  let p = _voiceCache.get(k);
  if (!p) {
    p = VoiceEngine.synth(ps, sp); _voiceCache.set(k, p);
    p.catch(() => _voiceCache.delete(k));
    if (_voiceCache.size > 160) _voiceCache.delete(_voiceCache.keys().next().value);
  }
  return p;
}

const Voice = {
  speaking: false, preparing: false, token: 0, sources: [] as AudioBufferSourceNode[], onEnd: null as () => void,
  natural(): boolean { return (State.settings as any).voiceEngine !== 'device' && VoicePack.state === 'ready'; },
  sentences(text: string, sp: Speaker): string[] { return G2P.phonemize(text, sp.accent); },
  /** Get a line ready in the background, so it plays at once when it's needed. */
  prepare(text: string, who?: string) {
    if (!this.natural() || !text) return;
    const sp = SPEAKERS[who || 'mechanic'] || SPEAKERS.mechanic;
    VoiceEngine.ready().then(() => { for (const s of this.sentences(text, sp)) voiceSentence(s, sp).catch(() => { /* tried again when played */ }); }).catch(() => { /* not ready */ });
  },
  /** Speak a line. Returns false when nothing can be played (muted). */
  speak(text: string, onEnd?: () => void, who?: string): boolean {
    this.stop();
    if (State.settings.muteAll || !text) { if (onEnd) onEnd(); return false; }
    const sp = SPEAKERS[who || 'mechanic'] || SPEAKERS.mechanic, tok = ++this.token;
    this.onEnd = onEnd || null; this.speaking = true;
    if (!this.natural()) { this.device(text, sp, tok); return true; }
    this.preparing = true; voiceUiChanged();
    (async () => {
      let ctx: AudioContext;
      try {
        await VoiceEngine.ready();
        ctx = audio(); if (ctx.state !== 'running') await ctx.resume();
        const parts = this.sentences(text, sp).map(s => voiceSentence(s, sp));
        let at = 0;
        for (let i = 0; i < parts.length; i++) {
          const pcm = await parts[i];
          if (tok !== this.token) return;
          if (i === 0) { this.preparing = false; voiceUiChanged(); }
          if (!pcm.length) continue;
          const buf = ctx.createBuffer(1, pcm.length, 24000); buf.copyToChannel(pcm as any, 0);
          const src = ctx.createBufferSource(); src.buffer = buf;
          const g = ctx.createGain(); g.gain.value = 1.15; src.connect(g); g.connect(ctx.destination);
          at = Math.max(at, ctx.currentTime + 0.05);
          src.start(at); at += buf.duration + 0.18;
          this.sources.push(src);
          if (i === parts.length - 1) src.onended = () => { if (tok === this.token) this.finish(); };
        }
        if (!parts.length) this.finish();
      } catch (e: any) {
        if (tok !== this.token) return;
        try { ErrorLog.add('voice', 'The voice couldn\'t speak', (e && e.message) || String(e)); } catch (er) { /* ignore */ }
        this.device(text, sp, tok);   // the device's own voice instead
      }
    })();
    return true;
  },
  /** The phone's or PC's own voice. */
  device(text: string, sp: Speaker, tok: number) {
    this.preparing = false; voiceUiChanged();
    const N = VoicePack.native();
    if (N && N.speakDevice) {
      const h = N.addListener('deviceDone', () => { Promise.resolve(h).then((x: any) => x && x.remove()); if (tok === this.token) this.finish(); });
      N.speakDevice({ text, pitch: sp.pitch, rate: sp.speed, lang: sp.accent === 'b' ? 'en-GB' : 'en-US' }).catch(() => { if (tok === this.token) this.finish(); });
      return;
    }
    const s = (window as any).speechSynthesis;
    if (!s) { this.finish(); return; }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = sp.speed; u.pitch = sp.pitch; u.lang = sp.accent === 'b' ? 'en-GB' : 'en-US';
    const v = s.getVoices().filter((x: SpeechSynthesisVoice) => x.lang.replace('_', '-').indexOf(u.lang) === 0);
    if (v.length) u.voice = v[0];
    u.onend = () => { if (tok === this.token) this.finish(); };
    s.speak(u);
  },
  finish() { this.speaking = false; this.preparing = false; this.sources = []; const f = this.onEnd; this.onEnd = null; voiceUiChanged(); if (f) f(); },
  stop() {
    this.token++;
    for (const s of this.sources) try { s.onended = null; s.stop(); } catch (e) { /* not started */ }
    this.sources = [];
    try { const s = (window as any).speechSynthesis; if (s) s.cancel(); } catch (e) { /* none */ }
    try { const N = VoicePack.native(); if (N && N.stopDevice) N.stopDevice(); } catch (e) { /* none */ }
    const was = this.speaking; this.speaking = false; this.preparing = false; this.onEnd = null;
    if (was) voiceUiChanged();
  },
};

/** Keep every play button and the settings in step with the voice. */
function voiceUiChanged() {
  for (const b of Array.from(document.querySelectorAll('.voice-btn')) as HTMLElement[]) {
    const mine = b.getAttribute('data-playing') === '1';
    const on = mine && Voice.speaking;
    b.classList.toggle('on', on); b.classList.toggle('prep', on && Voice.preparing);
    const ic = b.querySelector('.vb-ic'); if (ic) ic.innerHTML = icon(on ? 'stop' : 'play');
    if (!on) b.setAttribute('data-playing', '0');
  }
  try { if (typeof _setSection !== 'undefined' && _setSection === 'voice' && document.querySelector('.settings')) rerenderSettingsBody(); } catch (e) { /* not open */ }
}

/** A play button for someone's words; data-say holds the line, data-who the speaker. */
function voiceButton(text: string, who: string, label: string): string {
  return `<button class="voice-btn" data-act="say" data-who="${esc(who)}" data-say="${esc(text)}" aria-label="${esc(label)}">
    <span class="vb-ic">${icon('play')}</span><span class="wave">${'<i></i>'.repeat(14)}</span></button>`;
}
function voiceNote(): string {
  if (State.settings.muteAll) return 'All sounds are muted';
  if (!State.settings.mechanicVoice) return 'Voices are off in Settings';
  if ((State.settings as any).voiceEngine === 'device') return 'Voice: this device\'s own voice';
  if (VoicePack.state === 'ready') return 'Natural voice';
  if (VoicePack.state === 'downloading') return `Downloading the voices… ${VoicePack.total ? Math.round(VoicePack.done / VoicePack.total * 100) : 0}%`;
  return 'Device voice. Natural voices: Settings → Voices';
}
ACTIONS.say = el => {
  if (Voice.speaking && el.getAttribute('data-playing') === '1') { Voice.stop(); return; }
  Voice.stop();
  el.setAttribute('data-playing', '1');
  Voice.speak(el.getAttribute('data-say') || '', () => { el.setAttribute('data-playing', '0'); voiceUiChanged(); }, el.getAttribute('data-who') || 'mechanic');
  voiceUiChanged();
};

function startVoices() {
  // older saves: "recorded lines" and "neural voice pack" both mean the natural voices now
  const S: any = State.settings;
  if (S.voiceEngine !== 'device') S.voiceEngine = 'neural';
  VoicePack.check().then(st => { voiceUiChanged(); if (st === 'ready') setTimeout(() => VoiceEngine.ready().catch(() => { /* loads on first use */ }), 4000); });
}
