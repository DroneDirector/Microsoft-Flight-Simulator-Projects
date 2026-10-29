// The app on Windows (opened by the PC app): the same screens, scaled to the window. Everything grows
// with the window height, keeping its proportions, and the layouts use the extra width, so wide,
// ultrawide and super-ultrawide screens are filled without stretching anything. Settings → Display has
// the window mode, the size of everything, the graphics card and the sound output.

const Desk = {
  prefs: null as any,
  gpus: [] as { name: string; vendor: string; kind: string; vramMb: number }[],
  outputs: [] as MediaDeviceInfo[],

  init() {
    if (!DESKTOP) return;
    document.documentElement.classList.add('desktop');
    const fit = () => {
      const k = +(State.settings as any).uiSize || 1;
      const z = clamp(Math.min(innerHeight / 560, innerWidth / 900), 0.8, 6) * k;
      (window as any).__uiZoom = z;
      (document.documentElement.style as any).zoom = String(z);
    };
    fit(); window.addEventListener('resize', fit); (window as any).__deskFit = fit;
    fetch('/api/desktop').then(r => r.json()).then(p => { this.prefs = p; }).catch(() => { /* PC app older */ });
    fetch('/api/gpus').then(r => r.json()).then(r => { this.gpus = r.gpus || []; }).catch(() => { /* none */ });
    this.applySink();
    // F11 and Esc work as in any Windows app
    document.addEventListener('keydown', e => { if (e.key === 'F11') { e.preventDefault(); this.toggleFullscreen(); } });
  },

  save(p: any) {
    this.prefs = Object.assign(this.prefs || {}, p);
    fetch('/api/desktop', { method: 'PUT', body: JSON.stringify(p) }).catch(() => { /* PC app closed */ });
  },

  toggleFullscreen(on?: boolean) {
    const d: any = document, fs = !!d.fullscreenElement;
    const want = on == null ? !fs : on;
    try { if (want && !fs) d.documentElement.requestFullscreen(); else if (!want && fs) d.exitFullscreen(); } catch (e) { /* not allowed here */ }
  },

  /** Sound outputs connected to Windows. Their names are only shown once the app may use audio devices. */
  async listOutputs(ask?: boolean) {
    const md = navigator.mediaDevices; if (!md || !md.enumerateDevices) return [];
    let list = (await md.enumerateDevices()).filter(d => d.kind === 'audiooutput');
    if (ask && list.every(d => !d.label)) {
      try { const s = await md.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); } catch (e) { /* declined */ }
      list = (await md.enumerateDevices()).filter(d => d.kind === 'audiooutput');
    }
    this.outputs = list;
    return list;
  },

  /** Send the app's sounds to the chosen device (speakers, headphones, Bluetooth…). */
  applySink() {
    const id = (State.settings as any).audioOut || '';
    const ctx: any = (typeof _ctx !== 'undefined') ? _ctx : null;
    if (ctx && ctx.setSinkId) ctx.setSinkId(id === 'default' ? '' : id).catch(() => { /* gone */ });
    (window as any).__audioSink = id;
  },
};

ACTIONS['desk-mode'] = el => {
  const m = el.getAttribute('data-v'); Sound.tick();
  Desk.save({ mode: m });
  if (m === 'window') Desk.toggleFullscreen(false); else Desk.toggleFullscreen(true);
  rerenderSettingsBody();
};
ACTIONS['desk-size'] = el => { (State.settings as any).uiSize = el.getAttribute('data-v'); Store.save(); Sound.tick(); const f = (window as any).__deskFit; if (f) f(); rerenderSettingsBody(); };
ACTIONS['desk-gpu'] = el => { Desk.save({ gpu: el.getAttribute('data-v') }); Sound.tick(); rerenderSettingsBody(); toast('The graphics card is used from the next time the app opens', 'info'); };
ACTIONS['desk-open'] = el => { Desk.save({ open: !(Desk.prefs && Desk.prefs.open) }); Sound.tick(); rerenderSettingsBody(); };
ACTIONS['desk-audio-find'] = () => { Desk.listOutputs(true).then(() => rerenderSettingsBody()); };
ACTIONS['desk-audio'] = el => { (State.settings as any).audioOut = el.getAttribute('data-v'); Store.save(); Desk.applySink(); Sound.tick(); rerenderSettingsBody(); };

/** Settings → Display, on the PC only. */
function desktopSettingsHtml(): string {
  const p = Desk.prefs || { mode: 'window', gpu: 'auto', open: true }, S: any = State.settings;
  const seg = (act: string, cur: string, opts: string[][]) => `<div class="seg">${opts.map(o => `<button class="${cur === o[0] ? 'on' : ''}" data-act="${act}" data-v="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>`;
  const gpus = Desk.gpus;
  const outs = Desk.outputs.length ? Desk.outputs : [];
  return `
    <div class="ch-row"><span><b>Window</b><small>Full screen and borderless fill the screen; press F11 to switch at any time.</small></span>${seg('desk-mode', p.mode, [['window', 'Window'], ['borderless', 'Borderless'], ['fullscreen', 'Full screen']])}</div>
    <div class="ch-row"><span><b>Size of everything</b><small>Everything scales with the window and keeps its shape, from small windows to super-ultrawide screens.</small></span>${seg('desk-size', String(S.uiSize || '1'), [['0.85', 'Smaller'], ['1', 'Normal'], ['1.15', 'Larger'], ['1.3', 'Largest']])}</div>
    <div class="ch-row"><span><b>Graphics card</b><small>${gpus.length ? gpus.map(g => esc(g.name) + (g.vramMb > 0 ? ` (${g.vramMb >= 1024 ? Math.round(g.vramMb / 1024) + ' GB' : g.vramMb + ' MB'})` : '')).join(', ') : 'The graphics cards in this PC'}. Takes effect the next time the app opens.</small></span>
      ${seg('desk-gpu', p.gpu, [['auto', 'Windows decides']].concat(gpus.some(g => g.kind === 'dedicated') ? [['high', gpus.filter(g => g.kind === 'dedicated')[0].name.replace(/^(NVIDIA|AMD)\s+/i, '')]] : [['high', 'High performance']]).concat(gpus.some(g => g.kind === 'integrated') ? [['low', gpus.filter(g => g.kind === 'integrated')[0].name.replace(/^Intel\(R\)\s+/i, '')]] : [['low', 'Power saving']]))}</div>
    <div class="ch-row"><span><b>Sound output</b><small>${outs.length && outs.some(o => o.label) ? 'Speakers, headphones and Bluetooth devices connected to Windows.' : 'Find the speakers, headphones and Bluetooth devices connected to Windows. Windows may show the microphone symbol for a moment while the list is read.'}</small></span>
      ${outs.some(o => o.label) ? seg('desk-audio', S.audioOut || 'default', outs.map(o => [o.deviceId, o.label || 'Device'])) : `<button class="btn ghost sm" data-act="desk-audio-find">${icon('volume')}Find devices</button>`}</div>
    <div class="ch-row"><span><b>Open when the PC app starts</b><small>Turn off to use only the phone with the PC app.</small></span><button class="tg ${p.open !== false ? 'on' : ''}" data-act="desk-open" role="switch" aria-checked="${p.open !== false}"><i></i></button></div>`;
}
