// Badge reveal: when you earn a badge, and when you tap one to look at it again, it's revealed like a
// special card: the screen dims, beams of light in the badge's colour sweep up, the card drops in face
// down, spins and flips to show the badge, a shine runs across it and sparks fly; then its details.
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
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('go')));
  const end = setTimeout(() => el.classList.add('done'), dur);
  let closing = false;
  el.addEventListener('click', () => {
    if (!el.classList.contains('done')) { clearTimeout(end); el.classList.add('done', 'skip'); return; }   // first tap: straight to the end
    if (closing) return; closing = true;
    el.classList.add('out'); setTimeout(() => { el.remove(); badgeRevealNext(); }, 380);
  });
}
ACTIONS['badge-open'] = el => { const b = badgeDefs().filter(x => x.id === el.getAttribute('data-id'))[0]; if (b) badgeReveal([b]); };
