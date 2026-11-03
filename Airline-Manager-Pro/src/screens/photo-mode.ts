// Photo mode in the 3D view: the controls go away, and a strip at the bottom offers a look (natural, warm,
// cinematic, black and white, vivid, vintage), black bars for a wide-screen frame and a caption. Move the
// camera as usual (the free camera goes anywhere), then take the picture: it is kept with your screenshots (on
// your laptop and in the flight log), and you can send it to the papers as the photo of the day.

const PHOTO_LOOKS: [string, string, string][] = [
  ['none', 'Natural', ''], ['warm', 'Warm', 'sepia(.22) saturate(1.15) brightness(1.04)'], ['cine', 'Cinematic', 'contrast(1.18) saturate(.82) brightness(.96) hue-rotate(-6deg)'],
  ['bw', 'Black and white', 'grayscale(1) contrast(1.22)'], ['vivid', 'Vivid', 'saturate(1.45) contrast(1.08)'], ['vintage', 'Vintage', 'sepia(.55) contrast(.9) brightness(1.06) saturate(.8)'],
];
const Photo: any = { on: false, look: 'none', bars: false, cap: '' };
function photoFilter(): string { return (PHOTO_LOOKS.filter(l => l[0] === Photo.look)[0] || PHOTO_LOOKS[0])[2]; }
function photoBarHtml(): string {
  return `<div class="ph-bar">${PHOTO_LOOKS.map(l => `<button class="ph-look ${Photo.look === l[0] ? 'on' : ''}" data-act="photo-look" data-l="${l[0]}">${esc(l[1])}</button>`).join('')}
    <button class="ph-look ${Photo.bars ? 'on' : ''}" data-act="photo-bars">${icon('sliders')}Wide frame</button>
    <input class="ph-cap" placeholder="Caption (optional)" value="${esc(Photo.cap)}" maxlength="80" aria-label="Caption">
    <button class="ph-shoot" data-act="photo-shoot" aria-label="Take the picture">${icon('camera')}</button>
    <button class="ph-exit" data-act="photo-mode" aria-label="Leave photo mode">${icon('close')}</button></div>`;
}
function photoApply() {
  if (!V3d.root) return;
  V3d.root.classList.toggle('photo-on', Photo.on); V3d.root.classList.toggle('photo-bars', Photo.on && Photo.bars);
  if (V3d.cv) V3d.cv.style.filter = Photo.on ? photoFilter() : '';
  let bar = V3d.root.querySelector('.ph-wrap') as HTMLElement;
  if (!Photo.on) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.className = 'ph-wrap'; V3d.root.appendChild(bar); }
  bar.innerHTML = photoBarHtml();
  const inp = bar.querySelector('.ph-cap') as HTMLInputElement; if (inp) inp.addEventListener('input', () => { Photo.cap = inp.value; });
}
ACTIONS['photo-mode'] = () => { if (!V3d.open) return; Photo.on = !Photo.on; Sound.tick(); photoApply(); };
ACTIONS['photo-look'] = el => { Photo.look = el.getAttribute('data-l'); photoApply(); };
ACTIONS['photo-bars'] = () => { Photo.bars = !Photo.bars; photoApply(); };
ACTIONS['photo-shoot'] = () => {
  if (!V3d.open || !V3d.r || !V3d.cv) return;
  try {
    V3d.r.render(V3d.scene, V3d.cam);
    const src = V3d.cv, k = Math.min(1, 2560 / Math.max(src.width, src.height)), W = Math.round(src.width * k), H0 = Math.round(src.height * k);
    const bars = Photo.bars ? Math.round(Math.max(0, H0 - W / 2.39) / 2) : 0, H = H0 - bars * 2;
    const big = document.createElement('canvas'); big.width = W; big.height = H; const g = big.getContext('2d') as CanvasRenderingContext2D;
    g.filter = photoFilter() || 'none'; g.drawImage(src, 0, bars / k, src.width, src.height - bars * 2 / k, 0, 0, W, H); g.filter = 'none';
    if (Photo.look === 'vintage' || Photo.look === 'cine') { const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    if (Photo.cap) { const fs = Math.round(H / 26); g.font = `600 ${fs}px Inter, sans-serif`; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H - fs * 2.2, W, fs * 2.2); g.fillStyle = '#fff'; g.fillText(Photo.cap, fs, H - fs * 0.8); }
    const th = document.createElement('canvas'), t = 320 / Math.max(W, H); th.width = Math.round(W * t); th.height = Math.round(H * t); (th.getContext('2d') as CanvasRenderingContext2D).drawImage(big, 0, 0, th.width, th.height);
    const f: any = State.live.filter(x => x.id === V3d.target)[0], cap = Photo.cap || `3D view${f ? ` · ${f.reg}, ${f.from} to ${f.to}` : V3d.icao ? ` · ${V3d.icao}` : ''}`;
    const flash = document.createElement('div'); flash.className = 'v3d-flash'; V3d.root.appendChild(flash); setTimeout(() => flash.remove(), 600);
    try { Sound.tick(); } catch (e) { /* quiet */ }
    const small = document.createElement('canvas'), s2 = 960 / Math.max(W, H); small.width = Math.round(W * s2); small.height = Math.round(H * s2); (small.getContext('2d') as CanvasRenderingContext2D).drawImage(big, 0, 0, small.width, small.height);
    Photo.last = { data: small.toDataURL('image/jpeg', 0.8), cap, reg: f ? f.reg : '', from: f ? f.from : '', to: f ? f.to : '' };
    PhotoDb.put({ id: uid(), log: '3d', at: Date.now(), data: big.toDataURL('image/jpeg', 0.92), thumb: th.toDataURL('image/jpeg', 0.75), w: W, h: H, cap, mode: Mode.coop() ? 'coop' : 'solo' })
      .then(() => toast('Photo saved with your screenshots', 'ok', { label: 'To the papers', act: 'photo-news' })).catch(() => toast('The photo could not be saved', 'warn'));
  } catch (e) { toast('The photo could not be taken', 'warn'); }
};
/** The last photo as the papers' photo of the day (one a day). */
ACTIONS['photo-news'] = () => {
  const L = Photo.last, S: any = State; if (!L) return;
  const day = new Date().toDateString(); if (S.photoNewsDay === day) { toast('The papers have already printed one of your photos today', 'info'); return; }
  S.photoNewsDay = day; const c: any = company();
  try { newsPublish({ paper: newsPaper((apt(c.hub) as any || {}).country || ''), section: 'Photo of the day', place: (apt(c.hub) as any || {}).city || '', headline: L.cap || `${c.name} in pictures`, standfirst: `A reader's photograph${L.reg ? ` of ${L.reg}` : ''}${L.from ? `, ${L.from} to ${L.to}` : ''}.`, body: ['Sent in by ' + ((myPilot() as any).name || 'a reader') + '.'], art: { kind: 'photo', data: L.data } as any, companyId: c.id } as any); } catch (e) { /* no paper */ }
};
document.addEventListener('keydown', (e: KeyboardEvent) => { if (V3d && V3d.open && (e.key === 'h' || e.key === 'H') && !(e.target as HTMLElement).closest('input, textarea')) ACTIONS['photo-mode'](null as any, null as any); });
