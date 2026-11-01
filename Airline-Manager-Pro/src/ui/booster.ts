/* Game Booster (Settings → Game Booster). Off unless switched on; the choice is kept by the app and by the
 * device (the phone remembers it natively, the PC app in its own settings), so it is back in force at the
 * next start. When on:
 *  - the 3D view runs at up to 60 pictures a second on the fast graphics chip, and while it is open the map
 *    behind it stops drawing and caches are trimmed, so the device's time and memory go to the view;
 *  - on the phone: the screen stays on, the processor is held at a steady sustained speed where the phone
 *    supports it, and the app is a game to Android, so the system's own game mode and the phone maker's
 *    game booster can run it in performance mode;
 *  - on the PC: the app window runs on the high-performance graphics card with nothing slowed down in the
 *    background, and the PC app and its window run at a higher priority than other programs.
 * It gives the app every resource the system allows; no app can take memory from the system itself. */

function gameBoost(): boolean { return !!(State.settings as any).gameBoost; }
function fullScreenOn(): boolean { return (State.settings as any).fullScreen !== false; }

/** The device's own side: the phone's native settings, or the PC app's. Called at start and on every change. */
function boosterSync(): Promise<any> {
  try {
    if (typeof DESKTOP !== 'undefined' && DESKTOP) { Desk.save({ boost: gameBoost() }); return Promise.resolve({ pc: true }); }
    const t = appTools(); if (!t || !t.display) return Promise.resolve(null);
    return t.display({ fullScreen: fullScreenOn(), boost: gameBoost() }).then((r: any) => { (window as any).__boostInfo = r; return r; }).catch(() => null);
  } catch (e) { return Promise.resolve(null); }
}
/** Memory the app can give back at once: pictures and caches that are made again when needed. */
function boosterTrim() {
  try { if (typeof Clouds2d !== 'undefined' && Clouds2d.cv) { for (const c of Clouds2d.cv) { c.width = 1; c.height = 1; } Clouds2d.cv = null; Clouds2d.key = ''; } } catch (e) { /* nothing to trim */ }
  try { const m: any = _curMap(); if (m && m.scenes) for (const k of Object.keys(m.scenes)) { const sc = m.scenes[k]; if (sc && sc.timedCache) sc.timedCache = null; } } catch (e) { /* nothing to trim */ }
}

ACTIONS['boost-toggle'] = () => {
  const S: any = State.settings; S.gameBoost = !S.gameBoost; Store.save();
  try { if (S.gameBoost) { Haptics.success(); boosterTrim(); } else Sound.tick(); } catch (e) { /* quiet */ }
  boosterSync().then(() => rerenderSettingsBody());
  const el = document.querySelector('.boost-hero'); if (el) { el.classList.toggle('on', !!S.gameBoost); if (S.gameBoost) { el.classList.remove('surge'); void (el as HTMLElement).offsetWidth; el.classList.add('surge'); } }
  boostAnim();
};
ACTIONS['fullscreen-toggle'] = () => { const S: any = State.settings; S.fullScreen = S.fullScreen === false; Store.save(); Sound.tick(); boosterSync(); rerenderSettingsBody(); };

/** The Game Booster page: an engine core that spins up, speed lines, a surge of sparks and a gauge filling to full. */
function boosterHtml(): string {
  const on = gameBoost(), info: any = (window as any).__boostInfo || {}, pc = typeof DESKTOP !== 'undefined' && DESKTOP;
  const facts = pc
    ? ['The app window on the high-performance graphics card', 'Nothing in the window slowed down in the background', 'The PC app and its window at a higher priority than other programs', '3D view at up to 60 pictures a second']
    : ['3D view at up to 60 pictures a second on the fast graphics chip', 'The screen stays on while you play', info.sustained ? 'The processor held at a steady, sustained speed (this phone supports it)' : 'Steady processor speed where the phone supports it', 'A game to Android: the system\'s game mode and your phone\'s game booster can run it in performance mode'];
  const mode = ['', 'Standard', 'Performance', 'Battery saving'][info.gameMode || 0];
  return `<div class="boost-hero ${on ? 'on' : ''}${State.settings.reduceMotion ? ' calm' : ''}">
      <canvas class="boost-cv" aria-hidden="true"></canvas>
      <div class="boost-core"><div class="bc-ring r1"></div><div class="bc-ring r2"></div><div class="bc-ring r3"></div>
        <div class="bc-fan">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * (360 / 14)}deg"></i>`).join('')}</div><div class="bc-hub"></div></div>
      <div class="boost-side">
        <b class="boost-title">GAME BOOSTER</b>
        <span class="boost-state">${on ? 'BOOST ACTIVE' : 'Standby'}</span>
        <div class="boost-gauge"><i></i></div>
        <button class="boost-btn" data-act="boost-toggle" role="switch" aria-checked="${on}">${icon('power')}<span>${on ? 'Turn off' : 'Boost'}</span></button>
      </div>
    </div>
    <div class="set-card col"><div class="sc-h">${icon('info')}<span><b>What it does</b><small>Off unless you switch it on. Your choice is remembered by the app and by this ${pc ? 'PC' : 'device'}, so the boost is back the next time you open the app.</small></span></div>
      <ul class="boost-list">${facts.map(f => `<li>${icon('check')}${esc(f)}</li>`).join('')}<li>${icon('check')}While the 3D view is open, the map behind it stops drawing and caches are trimmed, so the time and memory go to the view</li></ul>
      ${mode ? `<small class="muted">Android's game mode for this app right now: ${mode}. You can change it in your phone's game settings.</small>` : ''}
      <p class="v3d-note">${icon('info')}It gives the app every resource ${pc ? 'Windows' : 'Android'} allows, but no app can take memory away from the system itself. More speed uses more battery and makes the ${pc ? 'computer' : 'phone'} warmer.</p></div>`;
}

/** The particles behind the core: drifting slowly in standby, streaking past at speed when boosted. */
function boostAnim() {
  const cv = document.querySelector('.boost-cv') as HTMLCanvasElement; if (!cv || (cv as any)._run) return;
  (cv as any)._run = true;
  const g = cv.getContext('2d'); if (!g) return;
  const P: number[][] = Array.from({ length: 140 }, () => [Math.random(), Math.random(), Math.random()]);
  let speed = gameBoost() ? 1 : 0.06, last = performance.now();
  const step = (now: number) => {
    if (!cv.isConnected) { (cv as any)._run = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const want = gameBoost() ? 1 : 0.06; speed += (want - speed) * Math.min(1, dt * 1.6);
    const calm = State.settings.reduceMotion;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const cx = w * 0.3, cy = h * 0.5;
    for (const p of P) {
      p[0] += dt * (0.05 + p[2] * 0.6) * speed * (calm ? 0.2 : 1);
      if (p[0] > 1) { p[0] -= 1; p[1] = Math.random(); }
      // from the core outwards along rays, faster further out, like being pulled into a jet intake in reverse
      const a = p[1] * Math.PI * 2, r = Math.pow(p[0], 1.6) * Math.max(w, h) * 0.9, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.6;
      const len = 2 + speed * (6 + p[2] * 34) * p[0];
      const hue = gameBoost() ? 185 + p[2] * 50 : 205;
      g.strokeStyle = `hsla(${hue}, 100%, ${60 + p[2] * 25}%, ${(0.15 + 0.7 * p[0]) * (0.35 + speed * 0.65)})`;
      g.lineWidth = 1 + p[2] * 1.6 * speed;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * len, y - Math.sin(a) * len * 0.6); g.stroke();
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
