// Badge reveal: when you earn a badge, and when you tap one to look at it again, it's revealed like a
// special card: the screen dims, beams of light in the badge's colour sweep up, the card drops in face
// down, spins and flips to show the badge, a shine runs across it, sparks fly and confetti bursts out; then its details.
// Higher tiers get a longer, brighter show. Our own design; tap anywhere to skip to the end.

const TIER_LOOK: [string, string, string][] = [   // main colour, deep colour, glow
  ['#D08A4E', '#5A2E12', 'rgba(232,150,80,.75)'],     // bronze
  ['#D8E1EA', '#56616E', 'rgba(220,232,245,.8)'],     // silver
  ['#F6CF55', '#6B4A08', 'rgba(255,210,80,.85)'],     // gold
  ['#9FE8F5', '#1F5966', 'rgba(150,235,250,.85)'],    // platinum
  ['#B9A6FF', '#2C1E6B', 'rgba(190,170,255,.9)'],     // diamond
  ['#FF7AD1', '#5B0F4B', 'rgba(255,120,210,.95)'],    // legendary
];
let _revealQ: BadgeDef[] = [], _revealing = false;
/** Show one or more badges, one after the other (best first). */
function badgeReveal(list: BadgeDef[]) {
  _revealQ = _revealQ.concat(list.slice().sort((a, b) => b.tier - a.tier));
  if (!_revealing) badgeRevealNext();
}
function badgeRevealNext() {
  const b = _revealQ.shift(); if (!b) { _revealing = false; return; }
  _revealing = true;
  const S: any = State, t = clamp(b.tier, 0, TIER_LOOK.length - 1), L = TIER_LOOK[t], at = (S.badges || {})[b.id];
  const calm = State.settings.reduceMotion, dur = calm ? 300 : 2600 + t * 450;   // the reveal takes longer for rarer badges
  const el = document.createElement('div'); el.className = `bdr t${t}${calm ? ' calm' : ''}`;
  el.style.setProperty('--c', L[0]); el.style.setProperty('--d', L[1]); el.style.setProperty('--g', L[2]); el.style.setProperty('--T', dur + 'ms');
  el.innerHTML = `<div class="bdr-dim"></div>
    <div class="bdr-beams">${Array.from({ length: 7 + t * 2 }, (_, i) => `<i style="--k:${i};--r:${(i - (7 + t * 2) / 2) * (12 - t)}deg"></i>`).join('')}</div>
    <div class="bdr-tier">${esc(TIER_NAMES[t])}</div>
    <div class="bdr-card"><div class="bdr-in">
      <div class="bdr-back"><span>${brandMark()}</span></div>
      <div class="bdr-front"><div class="bdr-shine"></div>
        <span class="bdr-rank">${esc(TIER_NAMES[t]).toUpperCase()}</span>
        <span class="bdr-ic">${icon(b.icon)}</span>
        <b class="bdr-title">${esc(b.title)}</b>
        <small class="bdr-desc">${esc(b.desc)}</small>
        <em class="bdr-date">${at ? 'Earned ' + esc(dateStr(new Date(at)).slice(0, 10)) : ''}</em>
      </div></div></div>
    <div class="bdr-sparks">${Array.from({ length: 18 + t * 6 }, (_, i) => `<i style="--a:${(i * 137.5) % 360}deg;--s:${0.5 + ((i * 7) % 10) / 10};--w:${(i % 5) * 60}ms"></i>`).join('')}</div>
    <div class="bdr-tap">Tap to continue</div>`;
  document.body.appendChild(el);
  try { Sound.tick(); setTimeout(() => { try { Sound.purchase(); } catch (e) { /* ignore */ } }, dur * 0.62); } catch (e) { /* no sound */ }
  try { Haptics.success(); } catch (e) { /* no haptics */ }
  if (!calm) setTimeout(() => { if (el.isConnected) badgeConfetti(el, L[0], t); }, dur * 0.62);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('go')));
  const end = setTimeout(() => el.classList.add('done'), dur);
  let closing = false;
  el.addEventListener('click', () => {
    if (!el.classList.contains('done')) { clearTimeout(end); el.classList.add('done', 'skip'); return; }   // first tap: straight to the end
    if (closing) return; closing = true;
    el.classList.add('out'); setTimeout(() => { el.remove(); badgeRevealNext(); }, 380);
  });
}
/** Confetti bursting out from behind the card as it turns over: paper pieces that flutter, spin and fall. */
function badgeConfetti(host: HTMLElement, main: string, tier: number) {
  const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
  cv.className = 'bdr-confetti'; cv.width = W * dpr; cv.height = H * dpr;
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
  host.appendChild(cv);
  const g = cv.getContext('2d'); if (!g) return; g.scale(dpr, dpr);
  const cols = [main, main, '#FFFFFF', '#FFD34D', '#FF6B6B', '#4DD8FF', '#7CF29A', '#B9A6FF'];
  const n = 90 + tier * 40, cx = W / 2, cy = H * 0.45, P: any[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 6 + Math.random() * (9 + tier * 1.5);
    P.push({ x: cx + Math.cos(a) * 20, y: cy + Math.sin(a) * 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5 - Math.random() * 5, r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.4,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)], f: Math.random() * 6.3, round: Math.random() < 0.25 });
  }
  const t0 = performance.now(), life = 3200 + tier * 300;
  const step = (now: number) => {
    const k = now - t0; if (!cv.isConnected || k > life) { cv.remove(); return; }
    g.clearRect(0, 0, W, H);
    const fade = 1 - Math.max(0, (k - life * 0.7) / (life * 0.3));
    for (const p of P) {
      p.vx *= 0.975; p.vy = p.vy * 0.975 + 0.32; p.f += 0.12;
      p.x += p.vx + Math.sin(p.f) * 0.9; p.y += p.vy; p.r += p.vr;
      g.save(); g.globalAlpha = fade; g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.abs(Math.cos(p.f)) * 0.9 + 0.1);
      g.fillStyle = p.c;
      if (p.round) { g.beginPath(); g.arc(0, 0, p.h * 0.8, 0, Math.PI * 2); g.fill(); } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      g.restore();
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
ACTIONS['badge-open'] = el => { const b = badgeDefs().filter(x => x.id === el.getAttribute('data-id'))[0]; if (b) badgeReveal([b]); };
