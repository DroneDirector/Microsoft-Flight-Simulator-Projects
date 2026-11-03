// Your lounges, in 3D. Walk into the lounge you have built at a base and see it as it is at its level:
//  - Lounge: a bright, comfortable room with fabric armchairs, a good carpet and a refreshment corner.
//  - Business lounge: larger, walnut walls, leather armchairs, a bar with stools, pendant lights and a richer carpet.
//  - Flagship lounge: the largest, with marble, velvet chairs on gold legs, chandeliers, a fireplace, a grand piano,
//    art on the walls and the finest carpet of all.
// Every level has the refreshment corner (an espresso machine, a tea urn, cups and saucers, napkins, a fruit bowl
// and a glass-fronted fridge of soft drinks and snacks), a departures screen with your flights from that base and a
// wall of windows onto the apron, with the sky as it is there now. Guests sit, chat and wait for their flights.
// Every piece of furniture and equipment has a file name in www/models/lounge-props/ (see www/models/README.md):
// a .glb there takes its place.

const LoungeRoom: any = { on: false };
interface LgSpec { W: number; D: number; H: number; guests: number; name: string }
const LG_SPECS: LgSpec[] = [
  { W: 16, D: 11, H: 3.4, guests: 4, name: 'Lounge' },
  { W: 22, D: 14, H: 3.9, guests: 7, name: 'Business lounge' },
  { W: 28, D: 17, H: 4.6, guests: 10, name: 'Flagship lounge' },
];
function lgPropSwap(g: any, name: string) { try { Models.swap(g, 'lounge-props/' + name + '.glb', false); } catch (e) { /* the app's own */ } }

/** Your lounges: where you have one, at what level. */
function lgList(): { k: string; lvl: number; name: string }[] {
  let L: any = null; try { L = loyalty(); } catch (e) { L = null; }
  if (!L || !L.lounges) return [];
  return Object.keys(L.lounges).map(k => ({ k, lvl: clamp(L.lounges[k].lvl || 0, 0, 2), name: L.lounges[k].name || LG_SPECS[L.lounges[k].lvl || 0].name }));
}
SCREENS.lounges = {
  title: 'Lounges', icon: 'star', nav: false,
  render() {
    const list = lgList();
    return `<div class="screen-head"><div><button class="back-btn" data-act="go" data-screen="ops">${icon('chevron', 'flip')}<span>Overview</span></button>
      <h1>Lounges</h1><p class="sub">${list.length ? `${list.length} ${list.length === 1 ? 'lounge' : 'lounges'}: walk in and see them as they are at their level` : 'You have no lounge yet'}</p></div></div>
      ${list.length ? `<div class="hg-list">${list.map(l => { const A: any = apt(l.k);
        return `<div class="card hg-card"><div class="hg-ac"><span><b>${esc(LG_SPECS[l.lvl].name)} at ${esc(l.k)}${A ? ' · ' + esc(A.city || A.name) : ''}</b><small>Level ${l.lvl + 1} of 3 · ${LG_SPECS[l.lvl].W} × ${LG_SPECS[l.lvl].D} m</small></span>
          <button class="btn sm primary" data-act="lounge-visit" data-k="${esc(l.k)}">${icon('star')}Walk in</button></div></div>`; }).join('')}</div>` : ''}
      ${typeof loungesCardHtml === 'function' ? loungesCardHtml() : ''}`;
  },
};

/* ---------- drawn pictures ---------- */
function lgCarpet(lvl: number): HTMLCanvasElement {
  const N = DESKTOP ? 2048 : 1024, [c, x] = ctCanvas(N, N), r = ctRng(91 + lvl), s = N / 1024;
  if (lvl === 0) {
    x.fillStyle = '#4C5A6B'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < 60000 * s; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.06})`; x.fillRect(r() * N, r() * N, 1.5 * s, 1.5 * s); }
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 2 * s; for (let i = 0; i <= 16; i++) { x.beginPath(); x.moveTo(i * N / 16, 0); x.lineTo(i * N / 16, N); x.moveTo(0, i * N / 16); x.lineTo(N, i * N / 16); x.stroke(); }
    x.strokeStyle = '#2E3946'; x.lineWidth = 26 * s; x.strokeRect(13 * s, 13 * s, N - 26 * s, N - 26 * s);
  } else if (lvl === 1) {
    x.fillStyle = '#1C2C4A'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < 80000 * s; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '120,150,200' : '0,0,0'},${r() * 0.07})`; x.fillRect(r() * N, r() * N, 1.5 * s, 1.5 * s); }
    x.strokeStyle = 'rgba(201,165,91,.75)'; x.lineWidth = 3 * s; const g = N / 12;
    for (let i = -12; i <= 24; i++) { x.beginPath(); x.moveTo(i * g, 0); x.lineTo(i * g + N, N); x.stroke(); x.beginPath(); x.moveTo(i * g, N); x.lineTo(i * g + N, 0); x.stroke(); }
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { x.fillStyle = 'rgba(201,165,91,.85)'; x.beginPath(); x.arc((i + 0.5) * g, (j + 0.5) * g, 5 * s, 0, 6.3); x.fill(); }
    x.strokeStyle = '#C9A55B'; x.lineWidth = 10 * s; x.strokeRect(30 * s, 30 * s, N - 60 * s, N - 60 * s); x.strokeStyle = '#0E1729'; x.lineWidth = 50 * s; x.strokeRect(0, 0, N, N);
  } else {
    // the finest: a burgundy field, a gold and navy medallion, a patterned double border, a hand-knotted look
    x.fillStyle = '#5A1622'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < 120000 * s; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,200,170' : '20,0,0'},${r() * 0.06})`; x.fillRect(r() * N, r() * N, 1.2 * s, 1.2 * s); }
    const C = N / 2, gold = '#D4AF37', navy = '#16224A';
    for (let k = 9; k > 0; k--) { x.fillStyle = k % 2 ? navy : gold; x.globalAlpha = k % 2 ? 0.9 : 0.85; x.beginPath(); for (let a = 0; a <= 64; a++) { const t = a / 64 * Math.PI * 2, rr = k * 34 * s * (1 + 0.12 * Math.cos(t * 8)); a ? x.lineTo(C + Math.cos(t) * rr, C + Math.sin(t) * rr) : x.moveTo(C + Math.cos(t) * rr, C + Math.sin(t) * rr); } x.fill(); }
    x.globalAlpha = 1;
    for (let q = 0; q < 4; q++) { x.save(); x.translate(q % 2 ? N - 170 * s : 170 * s, q < 2 ? 170 * s : N - 170 * s); for (let k = 4; k > 0; k--) { x.fillStyle = k % 2 ? gold : navy; x.beginPath(); x.arc(0, 0, k * 22 * s, 0, 6.3); x.fill(); } x.restore(); }
    x.strokeStyle = 'rgba(212,175,55,.35)'; x.lineWidth = 2 * s; for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; x.beginPath(); x.moveTo(C + Math.cos(t) * 330 * s, C + Math.sin(t) * 330 * s); x.lineTo(C + Math.cos(t) * 440 * s, C + Math.sin(t) * 440 * s); x.stroke(); }
    for (const [o, w, col] of [[0, 60, navy], [60, 14, gold], [74, 40, '#3E0E18'], [114, 8, gold]] as any[]) { x.strokeStyle = col; x.lineWidth = w * s; x.strokeRect((o + w / 2) * s, (o + w / 2) * s, N - (2 * o + w) * s, N - (2 * o + w) * s); }
    x.fillStyle = gold; for (let i = 0; i < 40; i++) { const p = 80 * s + i * (N - 160 * s) / 39; for (const [X, Y] of [[p, 30 * s], [p, N - 30 * s], [30 * s, p], [N - 30 * s, p]]) { x.save(); x.translate(X, Y); x.rotate(Math.PI / 4); x.fillRect(-7 * s, -7 * s, 14 * s, 14 * s); x.restore(); } }
  }
  return c;
}
/** The view from the windows: the apron and the runway beyond, aircraft at their stands, the sky as it is there now. */
function lgView(S: any): HTMLCanvasElement {
  const [c, x] = ctCanvas(2048, 512), r = ctRng(17), co = company(), night = S.alt < -6, low = S.alt < 8;
  const sky = S.sky.clone(), top = sky.clone().multiplyScalar(0.75), hz = sky.clone().lerp(new THREE.Color(low && !night ? 0xFFB070 : 0xDCE8F4), night ? 0.05 : low ? 0.6 : 0.35);
  const g = x.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, '#' + top.getHexString()); g.addColorStop(1, '#' + hz.getHexString()); x.fillStyle = g; x.fillRect(0, 0, 2048, 512);
  if (night) for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; x.fillRect(r() * 2048, r() * 260, 1.5, 1.5); }
  x.fillStyle = night ? '#1A2027' : '#6E7880'; x.fillRect(0, 300, 2048, 40);
  for (let i = 0; i < 6; i++) { x.fillStyle = night ? '#232A33' : '#8C969F'; const X = 80 + i * 340, w = 220 + r() * 80; x.fillRect(X, 260 - r() * 30, w, 80); }
  x.fillStyle = night ? '#16191E' : '#5C636B'; x.fillRect(0, 340, 2048, 172);
  x.strokeStyle = night ? '#C9A227' : '#E8D27A'; x.lineWidth = 3; x.setLineDash([24, 18]); x.beginPath(); x.moveTo(0, 420); x.lineTo(2048, 400); x.stroke(); x.setLineDash([]);
  // aircraft at their stands, in your colours
  for (let i = 0; i < 4; i++) { const X = 160 + i * 480, Y = 395 - i * 4, k = 0.8 + r() * 0.3; x.save(); x.translate(X, Y); x.scale(k, k);
    x.fillStyle = night ? '#9AA4AE' : '#F2F4F6'; x.beginPath(); x.ellipse(0, 0, 150, 16, 0, 0, 6.3); x.fill();
    x.fillStyle = co.color || '#2C8CFF'; x.beginPath(); x.moveTo(110, -6); x.lineTo(150, -70); x.lineTo(168, -70); x.lineTo(150, -4); x.fill();
    x.fillStyle = night ? '#7A848E' : '#D3D9DF'; x.beginPath(); x.moveTo(-20, 6); x.lineTo(70, 34); x.lineTo(90, 34); x.lineTo(30, 4); x.fill();
    if (night) { x.fillStyle = '#FFE9A8'; for (let w = 0; w < 18; w++) x.fillRect(-110 + w * 11, -4, 5, 4); x.fillStyle = '#FF3B30'; x.fillRect(-2, -18, 4, 4); }
    x.restore(); }
  if (night) for (let i = 0; i < 40; i++) { x.fillStyle = i % 3 ? '#4FA3FF' : '#FFD27A'; x.fillRect(i * 52 + 10, 345, 4, 3); }
  return c;
}
function lgDepartures(c: HTMLCanvasElement, base: string) {
  const x = c.getContext('2d') as CanvasRenderingContext2D, W = c.width, H = c.height; x.fillStyle = '#0A1220'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#F2C230'; x.font = '700 40px Inter, Arial, sans-serif'; x.fillText(`Departures · ${base}`, 30, 60);
  let rows: any[] = []; try { rows = scheduleBlocks().filter((b: any) => b.kind === 'flight' && b.from === base && !b.cancelled).sort((a: any, b: any) => a.start - b.start); } catch (e) { rows = []; }
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  rows = rows.filter(b => b.start >= nm - 20).slice(0, 7);
  x.font = '600 32px Inter, Arial, sans-serif';
  rows.forEach((b, i) => { const y = 120 + i * 52; x.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,0)'; x.fillRect(0, y - 36, W, 52);
    x.fillStyle = '#EAF2FA'; x.fillText(hm(b.start), 30, y); const A: any = apt(b.to); x.fillText(`${b.to}${A ? '  ' + (A.city || '').slice(0, 14) : ''}`, 160, y); x.fillStyle = '#9FB6CC'; x.fillText(b.reg, W - 420, y);
    const late = (b.delayMin || 0) >= 5; x.fillStyle = late ? '#F2B544' : b.start <= nm + 40 ? '#3FD0A0' : '#7FC4F5'; x.fillText(late ? `+${b.delayMin} min` : b.start <= nm + 40 ? 'Boarding' : 'On time', W - 230, y); });
  if (!rows.length) { x.fillStyle = '#9FB6CC'; x.fillText('No more departures today', 30, 140); }
}

/* ---------- opening ---------- */
const LG_EMBLEM = `<svg class="ctl-scales lg-emb" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="lgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0C8"/><stop offset=".55" stop-color="#D4AF37"/><stop offset="1" stop-color="#7A5A12"/></linearGradient></defs>
  <circle cx="100" cy="100" r="94" fill="#160E10" stroke="url(#lgG)" stroke-width="4"/>
  <path d="M60 120 Q60 92 82 92 L118 92 Q140 92 140 120 L140 132 L60 132 Z" fill="none" stroke="url(#lgG)" stroke-width="5" stroke-linejoin="round"/>
  <path d="M52 112 L52 136 L148 136 L148 112" fill="none" stroke="url(#lgG)" stroke-width="5"/><path class="lg-steam" d="M96 58 q-6 -8 0 -16 q6 -8 0 -16 M108 58 q-6 -8 0 -16 q6 -8 0 -16" stroke="url(#lgG)" stroke-width="3" fill="none" opacity=".8"/>
  <text x="100" y="168" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="15" fill="url(#lgG)" letter-spacing="5">LOUNGE</text></svg>`;

LoungeRoom.open = function (k: string) {
  const R = LoungeRoom; if (R.on) return;
  const T = THREE; if (!T) { toast('3D is not available on this device', 'warn'); return; }
  const it = lgList().filter(l => l.k === k)[0] || lgList()[0]; if (!it) { toast('Build a lounge first (Lounges)', 'info'); return; }
  for (const X of [typeof OfficeRoom !== 'undefined' ? OfficeRoom : null, typeof OpsRoom !== 'undefined' ? OpsRoom : null, typeof HangarRoom !== 'undefined' ? HangarRoom : null]) { try { if (X && X.on) X.close(true); } catch (e) { /* none */ } }
  R.on = true; R.loading = true; R.k = it.k; R.lvl = it.lvl; R.spec = LG_SPECS[it.lvl]; R.keys = {}; R.stick = [0, 0]; R.last = 0; R.loadT0 = performance.now(); R.overlay = null;
  const q = Gfx.roomQ(), co: any = company(), A: any = apt(it.k);
  const root = document.createElement('div'); root.className = 'court3d office3d ops3d hg3d lg3d'; R.root = root;
  root.innerHTML = `<canvas></canvas>
    <div class="ct-top"><div><small>${esc(co.name)} · ${esc(it.k)}${A ? ' · ' + esc(A.city || A.name) : ''}</small><b>${esc(R.spec.name)}</b></div></div>
    <button class="ct-leave" data-op="leave">${icon('close')}<span>Leave the lounge</span><kbd>Esc</kbd></button>
    <div class="ct-spots of-spots op-spots hg-spots" hidden></div><div class="of-aim op-aim" hidden></div><div class="walk-pad ct-pad op-pad" hidden><i></i></div><div class="of-aim op-dot" hidden>+</div><div class="hg-fade"></div>
    ${ctLoaderHtml(R.spec.name, 'Opening the doors…', LG_EMBLEM)}`;
  document.body.appendChild(root);
  setTimeout(() => { if (R.on && R.root === root) lgOpen2(root, q); }, 80);
};

/* ---------- the room ---------- */
function lgBuild(scene: any, q: number): any {
  const R = LoungeRoom, T = THREE, sp: LgSpec = R.spec, lv = R.lvl, W = sp.W, D = sp.D, H = sp.H, co: any = company();
  const A: any = { hits: [], blocks: [] as number[][], flames: [], steam: [] };
  const root = new T.Group(); scene.add(root); A.root = root;
  const shadow = q >= 1;
  const M = (o: any) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.6 }, o));
  const add = (g: any, m: any, x: number, y: number, z: number, ry?: number) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; o.castShadow = shadow; o.receiveShadow = true; root.add(o); return o; };
  const bx = (w: number, h: number, d: number, m: any, x: number, y: number, z: number, ry?: number) => add(new T.BoxGeometry(w, h, d), m, x, y, z, ry);
  const block = (x0: number, z0: number, x1: number, z1: number) => A.blocks.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  const prop = (name: string, x: number, z: number, ry: number, build: () => void) => {
    const n0 = root.children.length; build();
    const g = new T.Group(); g.name = name; g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); g.updateMatrixWorld(true);
    for (const o of root.children.slice(n0)) if (o !== g) g.attach(o);
    lgPropSwap(g, name); return g;
  };
  const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
  // materials by level
  const gold = M({ color: 0xD4AF37, metalness: 1, roughness: 0.25 }), brass = M({ color: 0xB08D57, metalness: 0.9, roughness: 0.3 }), chrome = M({ color: 0xDDE2E8, metalness: 1, roughness: 0.15 });
  const walnut = M({ map: ctTex(ctWood('#6B4428', '#2E1A0E', 5)), roughness: 0.4 }), oak = M({ map: ctTex(ctWood('#B89466', '#7A5A36', 6)), roughness: 0.5 });
  const marble = M({ map: ctTex(lgMarble()), roughness: 0.15, metalness: 0.05 }), porcelain = M({ color: 0xF7F5F0, roughness: 0.2 }), black = M({ color: 0x15171B, roughness: 0.4 });
  const fabric = [M({ color: 0x3E6A8A, roughness: 0.95 }), M({ map: ctTex(ctLeather('#7A3F22')), roughness: 0.45 }), M({ color: 0x1F5C4A, roughness: 0.85 })][lv];
  const legM = [M({ color: 0x2A2D33, metalness: 0.6, roughness: 0.4 }), black, gold][lv];
  // floor, walls, ceiling
  { const floorM = lv === 2 ? marble : lv === 1 ? walnut : M({ map: ctTex(ctNoise('#8A8F96', 0.08, 3), 6, 4), roughness: 0.7 });
    if (floorM.map) { floorM.map.repeat.set(W / 3, D / 3); }
    const f = new T.Mesh(new T.PlaneGeometry(W, D), floorM); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; root.add(f);
    const ce = new T.Mesh(new T.PlaneGeometry(W, D), M({ color: lv === 2 ? 0xF4EFE6 : 0xEDEEF0, roughness: 0.9 })); ce.rotation.x = Math.PI / 2; ce.position.y = H; root.add(ce);
    const wallM = lv === 0 ? M({ color: 0xE3E6EA, roughness: 0.9 }) : lv === 1 ? walnut : M({ color: 0xEDE6DA, roughness: 0.8 });
    for (const [w, x, z, ry] of [[W, 0, z1, Math.PI], [D, x0, 0, Math.PI / 2], [D, x1, 0, -Math.PI / 2]] as number[][]) { const p = new T.Mesh(new T.PlaneGeometry(w, H), wallM); p.position.set(x, H / 2, z); p.rotation.y = ry; p.receiveShadow = true; root.add(p); }
    if (lv === 2) for (const [w, x, z, ry] of [[W, 0, z1 - 0.02, Math.PI], [D, x0 + 0.02, 0, Math.PI / 2], [D, x1 - 0.02, 0, -Math.PI / 2]] as number[][]) { const p = new T.Mesh(new T.PlaneGeometry(w, 1.1), marble); p.position.set(x, 0.55, z); p.rotation.y = ry; root.add(p); const t = new T.Mesh(new T.BoxGeometry(w, 0.04, 0.03), gold); t.position.set(x, 1.12, z); t.rotation.y = ry; root.add(t); }
    // the carpet (its own model file per level)
    const cw = W * 0.62, cd = D * 0.55;
    prop(['carpet-lounge', 'carpet-business', 'carpet-flagship'][lv], 0, 0.6, 0, () => { const cp = new T.Mesh(new T.BoxGeometry(cw, 0.012, cd), M({ map: ctTex(lgCarpet(lv)), roughness: 1 })); cp.position.set(0, 0.006, 0.6); cp.receiveShadow = true; root.add(cp); });
  }
  // the window wall onto the apron (−z): tall panes, mullions, the view beyond
  { const view = new T.Mesh(new T.PlaneGeometry(W * 2.4, W * 0.6), new T.MeshBasicMaterial({ map: ctTex(lgView(hgSun(R.k))), toneMapped: false })); view.position.set(0, W * 0.15 - 2, z0 - 14); root.add(view); A.view = view;
    const n = Math.round(W / 2.2); for (let i = 0; i <= n; i++) bx(0.09, H, 0.14, lv === 2 ? brass : black, x0 + i * W / n, H / 2, z0);
    bx(W, 0.12, 0.2, lv === 2 ? brass : black, 0, 0.06, z0); bx(W, 0.2, 0.2, lv === 2 ? brass : black, 0, H - 0.1, z0);
    const gl = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshPhysicalMaterial({ color: 0xCFE2F2, transparent: true, opacity: 0.12, roughness: 0.03, depthWrite: false })); gl.position.set(0, H / 2, z0 + 0.01); gl.renderOrder = 3; root.add(gl);
    block(x0, z0 - 1, x1, z0 + 0.4); }
  block(x0 - 1, z0, x0 + 0.35, z1); block(x1 - 0.35, z0, x1 + 1, z1); block(x0, z1 - 0.35, x1, z1 + 1);
  // the way in: a glass door on the front wall, the reception desk beside it
  { const dx = W * 0.3; const fr = bx(1.9, 2.3, 0.08, lv === 2 ? brass : black, dx, 1.15, z1 - 0.04); void fr;
    const dg = new T.Mesh(new T.PlaneGeometry(1.7, 2.2), new T.MeshPhysicalMaterial({ color: 0xBFD6E8, transparent: true, opacity: 0.35, roughness: 0.05 })); dg.position.set(dx, 1.12, z1 - 0.09); dg.rotation.y = Math.PI; root.add(dg);
    const hit = new T.Mesh(new T.BoxGeometry(1.8, 2.3, 0.4), new T.MeshBasicMaterial({ visible: false })); hit.position.set(dx, 1.15, z1 - 0.2); hit.userData.act = 'door'; root.add(hit); A.hits.push(hit); A.door = new T.Vector3(dx, 0, z1 - 1.4);
    prop('reception-desk', dx - 2.6, z1 - 1.6, Math.PI, () => {
      const top = lv === 2 ? marble : lv === 1 ? walnut : M({ color: 0xE9E4DA, roughness: 0.35 });
      bx(2.2, 1.05, 0.6, lv === 0 ? M({ color: 0x3C5A72 }) : walnut, dx - 2.6, 0.525, z1 - 1.6); bx(2.3, 0.05, 0.75, top, dx - 2.6, 1.07, z1 - 1.6);
      const [lc, lx] = ctCanvas(512, 128); lx.fillStyle = co.color || '#2C8CFF'; lx.fillRect(0, 0, 512, 128); lx.fillStyle = '#fff'; lx.font = '700 48px Georgia, serif'; lx.textAlign = 'center'; lx.textBaseline = 'middle'; lx.fillText(co.name, 256, 66);
      const logo = new T.Mesh(new T.PlaneGeometry(1.6, 0.4), new T.MeshBasicMaterial({ map: ctTex(lc) })); logo.position.set(dx - 2.6, 0.6, z1 - 1.91); logo.rotation.y = Math.PI; root.add(logo); });
    block(dx - 3.8, z1 - 2.0, dx - 1.4, z1 - 1.2);
    A.desk = new T.Vector3(dx - 2.6, 0, z1 - 1.0); }
  // seating: groups of armchairs (and a sofa) round coffee tables on the carpet
  const seats: any[] = [];
  const armchair = (x: number, z: number, ry: number) => prop(['armchair-fabric', 'armchair-leather', 'armchair-velvet'][lv], x, z, ry, () => {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const o = (w: number, h: number, d: number, m: any, X: number, Y: number, Z: number) => { const k = new T.Mesh(new T.BoxGeometry(w, h, d), m); k.position.set(X, Y, Z); k.castShadow = shadow; k.receiveShadow = true; g.add(k); return k; };
    o(0.8, 0.16, 0.72, fabric, 0, 0.38, 0.02); o(0.8, 0.62, 0.16, fabric, 0, 0.72, -0.3).rotation.x = -0.08; for (const s of [-1, 1]) o(0.14, 0.32, 0.72, fabric, s * 0.4, 0.55, 0);
    o(0.66, 0.12, 0.6, fabric, 0, 0.5, 0.04);
    for (const [X, Z] of [[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.3], [0.34, 0.3]]) { const l = new T.Mesh(new T.CylinderGeometry(0.025, 0.018, 0.3, 10), legM); l.position.set(X, 0.15, Z); g.add(l); } });
  const table = (x: number, z: number) => prop(['coffee-table-oak', 'coffee-table-walnut', 'coffee-table-marble'][lv], x, z, 0, () => {
    const top = [oak, walnut, marble][lv]; add(new T.CylinderGeometry(0.5, 0.5, 0.05, 40), top, x, 0.42, z);
    if (lv === 2) { for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283; const l = add(new T.CylinderGeometry(0.02, 0.02, 0.4, 8), gold, x + Math.cos(a) * 0.3, 0.2, z + Math.sin(a) * 0.3); l.rotation.z = Math.cos(a) * 0.2; l.rotation.x = -Math.sin(a) * 0.2; } }
    else add(new T.CylinderGeometry(0.06, 0.2, 0.4, 16), legM, x, 0.2, z); });
  const clusters: number[][] = [];
  { const nx = lv === 0 ? 2 : lv === 1 ? 3 : 4; for (let i = 0; i < nx; i++) for (let j = 0; j < (lv === 0 ? 1 : 2); j++) clusters.push([-W * 0.3 + (i + 0.5) * W * 0.6 / nx, z0 + 2.6 + j * 3.3]); }
  clusters.forEach((c, ci) => {
    table(c[0], c[1]); block(c[0] - 0.55, c[1] - 0.55, c[0] + 0.55, c[1] + 0.55);
    for (const [dx, dz, ry] of [[0, -1.0, 0], [0, 1.0, Math.PI], [-1.0, 0, Math.PI / 2], [1.0, 0, -Math.PI / 2]] as number[][]) {
      if (ci % 2 && dx === 0 && dz < 0) continue;
      armchair(c[0] + dx, c[1] + dz, ry); block(c[0] + dx - 0.45, c[1] + dz - 0.45, c[0] + dx + 0.45, c[1] + dz + 0.45);
      seats.push({ x: c[0] + dx, z: c[1] + dz, ry });
    }
    // cups and napkins on the tables
    prop(ci % 2 ? 'teacup-and-saucer' : 'coffee-cup-and-saucer', c[0] + 0.18, c[1] + 0.1, 0, () => lgCup(add, porcelain, lv === 2 ? gold : null, c[0] + 0.18, 0.445, c[1] + 0.1, ci % 2 === 1, ci % 2 ? 0x7A3E14 : 0x3A1F0E));
    prop('napkin-stack', c[0] - 0.2, c[1] - 0.08, 0.3, () => lgNapkins(add, c[0] - 0.2, 0.445, c[1] - 0.08, 4, lv));
  });
  A.seats = seats;
  // a sofa against each side wall
  for (const s of [-1, 1]) { const x = s * (W / 2 - 0.65), z = z0 + D * 0.42;
    prop(['sofa-fabric', 'sofa-leather', 'sofa-velvet'][lv], x, z, -s * Math.PI / 2, () => { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = -s * Math.PI / 2; root.add(g);
      const o = (w: number, h: number, d: number, m: any, X: number, Y: number, Z: number) => { const k = new T.Mesh(new T.BoxGeometry(w, h, d), m); k.position.set(X, Y, Z); k.castShadow = shadow; k.receiveShadow = true; g.add(k); return k; };
      o(2.2, 0.18, 0.8, fabric, 0, 0.36, 0.02); o(2.2, 0.6, 0.18, fabric, 0, 0.72, -0.32); for (const t of [-1, 1]) o(0.16, 0.34, 0.8, fabric, t * 1.1, 0.55, 0); for (let k = -1; k <= 1; k++) o(0.68, 0.12, 0.64, fabric, k * 0.7, 0.5, 0.05); });
    block(x - 0.5, z - 1.2, x + 0.5, z + 1.2);
    // a floor lamp and a plant beside it
    prop('floor-lamp', x, z + 1.6, 0, () => { add(new T.CylinderGeometry(0.16, 0.18, 0.03, 20), lv === 2 ? brass : black, x, 0.015, z + 1.6); add(new T.CylinderGeometry(0.015, 0.015, 1.5, 8), lv === 2 ? brass : black, x, 0.76, z + 1.6); const sh = add(new T.CylinderGeometry(0.18, 0.25, 0.3, 24, 1, true), new T.MeshStandardMaterial({ color: 0xF4ECD8, emissive: 0xFFE2A8, emissiveIntensity: 0.6, side: T.DoubleSide }), x, 1.55, z + 1.6); void sh; });
    prop('potted-plant', x, z - 1.7, 0, () => lgPlant(add, x, z - 1.7, lv));
    block(x - 0.35, z + 1.3, x + 0.35, z - 2.05);
  }
  // the refreshment corner (back right): counter, espresso machine, tea urn, teapot, cups, napkins, fruit, the fridge
  { const cx = x1 - 3.0, cz = z1 - 1.0, top = lv === 2 ? marble : lv === 1 ? M({ color: 0x2B2F36, roughness: 0.25 }) : M({ color: 0xE9E4DA, roughness: 0.35 });
    prop('buffet-counter', cx, cz, Math.PI, () => { bx(3.2, 0.88, 0.7, lv === 0 ? M({ color: 0x3C5A72 }) : walnut, cx, 0.44, cz); bx(3.3, 0.05, 0.78, top, cx, 0.905, cz); });
    block(cx - 1.7, cz - 0.45, cx + 1.7, z1);
    prop('espresso-machine', cx - 1.1, cz, Math.PI, () => { bx(0.5, 0.42, 0.42, chrome, cx - 1.1, 1.14, cz); bx(0.46, 0.08, 0.38, black, cx - 1.1, 1.39, cz); for (const s of [-1, 1]) { add(new T.CylinderGeometry(0.03, 0.03, 0.12, 12), black, cx - 1.1 + s * 0.12, 1.05, cz - 0.24); } bx(0.4, 0.02, 0.16, chrome, cx - 1.1, 0.94, cz - 0.24); });
    prop('tea-urn', cx - 0.35, cz, 0, () => lgUrn(add, lv === 0 ? chrome : brass, black, cx - 0.35, 0.93, cz, lv));
    prop('teapot', cx + 0.2, cz - 0.1, 0.6, () => lgTeapot(add, lv === 2 ? porcelain : lv === 1 ? M({ color: 0x1E2F4F, roughness: 0.25 }) : porcelain, lv === 2 ? gold : null, cx + 0.2, 0.93, cz - 0.1));
    for (let i = 0; i < 4; i++) prop(i % 2 ? 'teacup-and-saucer' : 'coffee-cup-and-saucer', cx + 0.55 + (i % 2) * 0.2, cz - 0.15 + Math.floor(i / 2) * 0.22, 0, () => lgCup(add, porcelain, lv === 2 ? gold : null, cx + 0.55 + (i % 2) * 0.2, 0.93, cz - 0.15 + Math.floor(i / 2) * 0.22, i % 2 === 1, 0));
    prop('napkin-stack', cx + 1.0, cz, 0, () => lgNapkins(add, cx + 1.0, 0.93, cz, 10, lv));
    prop('fruit-bowl', cx + 1.38, cz - 0.05, 0, () => lgFruit(add, lv === 2 ? gold : porcelain, cx + 1.38, 0.93, cz - 0.05));
    const hit = new T.Mesh(new T.BoxGeometry(2.0, 0.7, 0.8), new T.MeshBasicMaterial({ visible: false })); hit.position.set(cx - 0.7, 1.2, cz); hit.userData.act = 'coffee'; root.add(hit); A.hits.push(hit); A.coffeeAt = new T.Vector3(cx - 1.1, 0.93, cz - 0.24);
    // the fridge: glass front, lit shelves of drinks and snack bars (the same products as the hangars' machine)
    const fx = x1 - 0.55, fz = cz - 1.6;
    prop('drinks-fridge', fx, fz, -Math.PI / 2, () => { const g = new T.Group(); g.position.set(fx, 0, fz); g.rotation.y = -Math.PI / 2; root.add(g);
      const o = (w: number, h: number, d: number, m: any, X: number, Y: number, Z: number) => { const k = new T.Mesh(new T.BoxGeometry(w, h, d), m); k.position.set(X, Y, Z); k.castShadow = shadow; g.add(k); return k; };
      const body = M({ color: lv === 0 ? 0xD8DCE0 : 0x1E2126, metalness: 0.4, roughness: 0.4 });
      o(0.8, 1.9, 0.04, body, 0, 0.95, -0.33); for (const s of [-1, 1]) o(0.04, 1.9, 0.7, body, s * 0.38, 0.95, 0); o(0.8, 0.04, 0.7, body, 0, 1.88, 0); o(0.8, 0.12, 0.7, body, 0, 0.06, 0);
      o(0.72, 1.7, 0.01, new T.MeshStandardMaterial({ color: 0xEAF4FF, emissive: 0xBFD8F0, emissiveIntensity: 0.7 }), 0, 0.98, -0.3);
      const kinds = ['cola', 'lemon', 'orange', 'water', 'icedtea', 'choco', 'peanut', 'oat', 'caramel'];
      [0.3, 0.72, 1.14, 1.56].forEach((y, si) => { o(0.72, 0.015, 0.6, chrome, 0, y, 0); for (let i = 0; i < 6; i++) { const k = kinds[(si * 3 + i) % kinds.length], it = hgItemMesh(k, 0, 1), p = hgProd(k); it.position.set(-0.29 + i * 0.116, y + (p.type === 'can' ? HG_CAN.h / 2 : HG_BAR.l / 2) + 0.01, 0.12); g.add(it); const it2 = hgItemMesh(k, 0, 1); it2.position.copy(it.position); it2.position.z -= 0.15; g.add(it2); } });
      const door = new T.Mesh(new T.PlaneGeometry(0.76, 1.78), new T.MeshPhysicalMaterial({ color: 0xDDEEFF, transparent: true, opacity: 0.18, roughness: 0.04, depthWrite: false })); door.position.set(0, 0.97, 0.351); door.renderOrder = 4; g.add(door);
      o(0.02, 0.6, 0.03, chrome, 0.33, 1.0, 0.37);
      const L = new T.PointLight(0xEAF4FF, 0.8, 1.6, 2); L.position.set(0, 1.4, 0.1); g.add(L); });
    block(fx - 0.45, fz - 0.45, x1, fz + 0.45); }
  // a magazine rack by the door, the departures screen on the front wall
  { const mx = x0 + 1.2, mz = z1 - 0.5;
    prop('magazine-rack', mx, mz, Math.PI, () => { bx(0.7, 1.0, 0.3, lv === 0 ? M({ color: 0x3C5A72 }) : walnut, mx, 0.5, mz); const cols = [0xC0392B, 0x2E5C8A, 0xF2B544, 0x2F6B4A, 0x8E44AD, 0xE67E22]; for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) { const m = new T.Mesh(new T.PlaneGeometry(0.26, 0.3), M({ color: cols[(r * 2 + i) % cols.length] })); m.position.set(mx - 0.16 + i * 0.32, 0.3 + r * 0.3, mz - 0.17); m.rotation.set(0.15, Math.PI, 0); root.add(m); } });
    block(mx - 0.45, mz - 0.3, mx + 0.45, z1);
    const [c] = ctCanvas(1024, 512); A.depCv = c; lgDepartures(c, R.k); A.depTex = ctTex(c);
    prop('departures-screen', -W * 0.05, z1 - 0.06, Math.PI, () => { bx(2.1, 1.12, 0.06, black, -W * 0.05, 2.0, z1 - 0.05); });
    const scr = new T.Mesh(new T.PlaneGeometry(2.0, 1.0), new T.MeshBasicMaterial({ map: A.depTex, toneMapped: false })); scr.position.set(-W * 0.05, 2.0, z1 - 0.09); scr.rotation.y = Math.PI; scr.userData.keep = true; root.add(scr); }
  // Business and Flagship: the bar with stools and a shelf of bottles (back left)
  if (lv >= 1) { const bxp = x0 + 3.2, bz = z1 - 1.2;
    prop('bar-counter', bxp, bz, Math.PI, () => { bx(3.6, 1.08, 0.6, walnut, bxp, 0.54, bz); bx(3.8, 0.06, 0.8, lv === 2 ? marble : M({ color: 0x1A1C20, roughness: 0.2 }), bxp, 1.1, bz); if (lv === 2) bx(3.62, 0.04, 0.02, gold, bxp, 0.2, bz - 0.31); });
    block(bxp - 1.9, bz - 0.5, bxp + 1.9, z1);
    for (let i = 0; i < 4; i++) { const sx = bxp - 1.3 + i * 0.86, sz = bz - 0.75;
      prop('bar-stool', sx, sz, 0, () => { add(new T.CylinderGeometry(0.2, 0.2, 0.08, 20), fabric, sx, 0.78, sz); add(new T.CylinderGeometry(0.025, 0.025, 0.74, 10), lv === 2 ? gold : chrome, sx, 0.38, sz); add(new T.TorusGeometry(0.16, 0.012, 8, 24), lv === 2 ? gold : chrome, sx, 0.3, sz).rotation.x = Math.PI / 2; add(new T.CylinderGeometry(0.2, 0.22, 0.02, 20), lv === 2 ? gold : chrome, sx, 0.01, sz); });
      block(sx - 0.25, sz - 0.25, sx + 0.25, sz + 0.25); }
    prop('bottle-shelf', bxp, z1 - 0.2, Math.PI, () => { for (const y of [1.4, 1.8, 2.2]) { bx(3.0, 0.03, 0.25, lv === 2 ? brass : walnut, bxp, y, z1 - 0.2); for (let i = 0; i < 12; i++) { const h = 0.22 + (i % 3) * 0.04, col = [0x2F6B34, 0x7A3E14, 0xD9D2C0, 0x4A1A20, 0xC9A55B][i % 5]; const b = add(new T.CylinderGeometry(0.035, 0.04, h, 12), new T.MeshPhysicalMaterial({ color: col, roughness: 0.1, transparent: true, opacity: 0.85 }), bxp - 1.35 + i * 0.245, y + 0.015 + h / 2, z1 - 0.2); b.castShadow = false; add(new T.CylinderGeometry(0.012, 0.015, 0.06, 8), new T.MeshPhysicalMaterial({ color: col, roughness: 0.1 }), bxp - 1.35 + i * 0.245, y + 0.045 + h, z1 - 0.2); } } }); }
  // Flagship: a fireplace, a grand piano, art and a champagne bucket
  if (lv === 2) {
    const fx = x0 + 0.3, fz = z0 + D * 0.72;
    prop('fireplace', fx, fz, Math.PI / 2, () => { bx(0.5, 1.3, 2.2, marble, fx + 0.1, 0.65, fz); bx(0.62, 0.08, 2.4, marble, fx + 0.14, 1.34, fz); bx(0.2, 0.6, 1.2, black, fx + 0.26, 0.45, fz);
      const fl = new T.Mesh(new T.PlaneGeometry(1.0, 0.4), new T.MeshBasicMaterial({ map: ctTex(lgFlame()), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); fl.position.set(fx + 0.37, 0.42, fz); fl.rotation.y = Math.PI / 2; root.add(fl); A.flames.push(fl);
      const L = new T.PointLight(0xFF8A3C, 1.6, 6, 2); L.position.set(fx + 0.8, 0.5, fz); root.add(L); A.fireL = L; });
    block(fx - 0.5, fz - 1.3, fx + 0.7, fz + 1.3);
    const px = W * 0.28, pz = z0 + D * 0.2;
    prop('grand-piano', px, pz, -0.5, () => { const g = new T.Group(); g.position.set(px, 0, pz); g.rotation.y = -0.5; root.add(g); const pm = M({ color: 0x0A0A0C, roughness: 0.08, metalness: 0.2 });
      const sh = new T.Shape(); sh.moveTo(-0.75, -0.8); sh.lineTo(0.75, -0.8); sh.lineTo(0.75, 0.2); sh.bezierCurveTo(0.75, 0.9, 0.1, 1.0, -0.1, 1.1); sh.bezierCurveTo(-0.6, 1.2, -0.75, 0.9, -0.75, 0.6); sh.lineTo(-0.75, -0.8);
      const bd = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: false }), pm); bd.rotation.x = -Math.PI / 2; bd.position.y = 0.62; bd.castShadow = shadow; g.add(bd);
      const lid = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }), pm); lid.rotation.x = -Math.PI / 2 - 0.6; lid.position.set(0, 0.96, -0.78); g.add(lid);
      const keys = new T.Mesh(new T.BoxGeometry(1.42, 0.03, 0.16), porcelain); keys.position.set(0, 0.8, -0.88); g.add(keys);
      for (const [X, Z] of [[-0.6, -0.65], [0.6, -0.65], [0, 0.85]]) { const l = new T.Mesh(new T.CylinderGeometry(0.05, 0.04, 0.62, 10), pm); l.position.set(X, 0.31, Z); g.add(l); }
      const bench = new T.Mesh(new T.BoxGeometry(0.8, 0.08, 0.36), pm); bench.position.set(0, 0.48, -1.35); g.add(bench); for (const s of [-1, 1]) { const l = new T.Mesh(new T.BoxGeometry(0.05, 0.46, 0.3), pm); l.position.set(s * 0.35, 0.23, -1.35); g.add(l); } });
    block(px - 1.1, pz - 1.3, px + 1.1, pz + 1.0);
    for (const s of [-1, 1]) prop('wall-art', s * (W / 2 - 0.04), z0 + D * 0.25, -s * Math.PI / 2, () => { const [c, x] = ctCanvas(512, 384), r = ctRng(s > 0 ? 3 : 7); x.fillStyle = '#E9E2D2'; x.fillRect(0, 0, 512, 384); for (let i = 0; i < 9; i++) { x.fillStyle = ['#16224A', '#D4AF37', '#5A1622', '#2F6B4A', '#E07B39'][i % 5]; x.globalAlpha = 0.75; x.beginPath(); x.arc(r() * 512, r() * 384, 30 + r() * 110, 0, 6.3); x.fill(); } x.globalAlpha = 1;
      const pic = new T.Mesh(new T.PlaneGeometry(1.6, 1.2), new T.MeshStandardMaterial({ map: ctTex(c), roughness: 0.6 })); pic.position.set(s * (W / 2 - 0.06), 2.0, z0 + D * 0.25); pic.rotation.y = -s * Math.PI / 2; root.add(pic); bx(0.04, 1.32, 1.72, gold, s * (W / 2 - 0.03), 2.0, z0 + D * 0.25); });
    { const cx = x0 + 3.2 + 1.2, cz = z1 - 1.2; prop('champagne-bucket', cx, cz, 0, () => { add(new T.CylinderGeometry(0.11, 0.08, 0.22, 20, 1, true), chrome, cx, 1.24, cz); const b = add(new T.CylinderGeometry(0.035, 0.04, 0.3, 12), M({ color: 0x1F3A20, roughness: 0.1 }), cx, 1.3, cz); b.rotation.z = 0.25; add(new T.CylinderGeometry(0.015, 0.02, 0.06, 8), gold, cx + 0.04, 1.48, cz); }); }
  }
  // the lights
  { const lamp = new T.MeshBasicMaterial({ color: 0xFFF3DC });
    if (lv === 0) for (let i = -1; i <= 1; i++) for (const z of [z0 + D * 0.3, z0 + D * 0.7]) { const p = new T.Mesh(new T.PlaneGeometry(1.2, 0.6), lamp); p.rotation.x = Math.PI / 2; p.position.set(i * W * 0.3, H - 0.01, z); root.add(p); }
    if (lv === 1) for (const c of clusters) prop('pendant-light', c[0], c[1], 0, () => { add(new T.CylinderGeometry(0.006, 0.006, 1.2, 6), black, c[0], H - 0.6, c[1]); add(new T.ConeGeometry(0.28, 0.3, 24, 1, true), brass, c[0], H - 1.3, c[1]); const b = new T.Mesh(new T.SphereGeometry(0.08, 12, 8), lamp); b.position.set(c[0], H - 1.38, c[1]); root.add(b); });
    if (lv === 2) for (const c of [[-W * 0.2, z0 + D * 0.45], [W * 0.2, z0 + D * 0.45]]) prop('chandelier', c[0], c[1], 0, () => { const cy = H - 1.1; add(new T.CylinderGeometry(0.01, 0.01, 0.8, 6), gold, c[0], H - 0.4, c[1]); for (const [rr, y] of [[0.7, cy], [0.45, cy + 0.25], [0.22, cy + 0.45]]) { add(new T.TorusGeometry(rr, 0.02, 8, 40), gold, c[0], y, c[1]).rotation.x = Math.PI / 2; const n = Math.round(rr * 22); for (let i = 0; i < n; i++) { const a = i / n * 6.283; const cr = add(new T.OctahedronGeometry(0.035), new T.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0, transmission: 0.6, thickness: 0.05, emissive: 0xFFF3DC, emissiveIntensity: 0.3 }), c[0] + Math.cos(a) * rr, y - 0.08, c[1] + Math.sin(a) * rr); cr.castShadow = false; } } const b = new T.Mesh(new T.SphereGeometry(0.15, 16, 10), lamp); b.position.set(c[0], cy + 0.1, c[1]); root.add(b); });
  }
  return A;
}
function lgMarble(): HTMLCanvasElement {
  const [c, x] = ctCanvas(1024, 1024), r = ctRng(55); x.fillStyle = '#EEEAE3'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(${90 + r() * 40},${90 + r() * 40},${100 + r() * 40},${0.15 + r() * 0.25})`; x.lineWidth = 1 + r() * 3; x.beginPath(); let X = r() * 1024, Y = 0; x.moveTo(X, Y); while (Y < 1024) { X += (r() - 0.5) * 60; Y += 20 + r() * 40; x.lineTo(X, Y); } x.stroke(); }
  x.strokeStyle = 'rgba(0,0,0,.08)'; x.lineWidth = 2; x.strokeRect(0, 0, 1024, 1024);
  return c;
}
function lgFlame(): HTMLCanvasElement {
  const [c, x] = ctCanvas(256, 128); for (let i = 0; i < 9; i++) { const X = 20 + i * 27, g = x.createRadialGradient(X, 120, 2, X, 90, 60); g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.35, 'rgba(255,150,40,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(X, 95, 16, 34 + (i % 3) * 8, 0, 0, 6.3); x.fill(); }
  return c;
}
/** A cup on its saucer (a teacup is wider and lower), with coffee or tea in it if col. */
function lgCup(add: any, por: any, rim: any, x: number, y: number, z: number, tea: boolean, col: number) {
  const T = THREE, sau = add(new T.CylinderGeometry(0.075, 0.06, 0.012, 28), por, x, y + 0.006, z); void sau;
  const prof = tea ? [[0.03, 0], [0.04, 0.005], [0.05, 0.03], [0.055, 0.055]] : [[0.025, 0], [0.035, 0.006], [0.04, 0.04], [0.04, 0.075]];
  const cup = new T.Mesh(new T.LatheGeometry(prof.map(p => new T.Vector2(p[0], p[1])), 28), por); cup.material = por.clone(); cup.material.side = T.DoubleSide; cup.position.set(x, y + 0.012, z); cup.castShadow = true;
  const g = add(new T.CylinderGeometry(0.0001, 0.0001, 0.0001, 3), por, x, y, z); g.parent.add(cup);
  const h = add(new T.TorusGeometry(tea ? 0.016 : 0.014, 0.004, 6, 14, Math.PI * 1.2), por, x + (tea ? 0.058 : 0.044), y + 0.045, z); h.rotation.z = -Math.PI / 2;
  if (rim) { const rm = add(new T.TorusGeometry(tea ? 0.055 : 0.04, 0.0025, 6, 28), rim, x, y + 0.012 + (tea ? 0.055 : 0.075), z); rm.rotation.x = Math.PI / 2; }
  if (col) { const d = add(new T.CircleGeometry(tea ? 0.05 : 0.037, 24), new T.MeshStandardMaterial({ color: col, roughness: 0.15 }), x, y + 0.012 + (tea ? 0.045 : 0.065), z); d.rotation.x = -Math.PI / 2; }
}
function lgNapkins(add: any, x: number, y: number, z: number, n: number, lv: number) {
  const T = THREE, m = new T.MeshStandardMaterial({ color: [0xF4F4F0, 0xEDE4D0, 0xF7F1E3][lv], roughness: 0.95 });
  for (let i = 0; i < n; i++) { const k = add(new T.BoxGeometry(0.16, 0.004, 0.16), m, x, y + 0.003 + i * 0.005, z); k.rotation.y = i * 0.05; }
  if (lv === 2) { const b = add(new T.BoxGeometry(0.17, 0.006, 0.03), new T.MeshStandardMaterial({ color: 0xD4AF37, metalness: 1, roughness: 0.3 }), x, y + n * 0.005 + 0.004, z); void b; }
}
function lgFruit(add: any, bowlM: any, x: number, y: number, z: number) {
  const T = THREE, bowl = new T.Mesh(new T.LatheGeometry([[0.04, 0], [0.12, 0.02], [0.17, 0.08], [0.18, 0.09]].map(p => new T.Vector2(p[0], p[1])), 32), bowlM.clone()); bowl.material.side = T.DoubleSide; bowl.position.set(x, y, z);
  const g = add(new T.CylinderGeometry(0.0001, 0.0001, 0.0001, 3), bowlM, x, y, z); g.parent.add(bowl);
  const cols = [0xF28C28, 0xC0392B, 0x8BC34A, 0xF2D13A, 0xF28C28, 0xC0392B, 0x8BC34A]; cols.forEach((col, i) => { const a = i / cols.length * 6.283, rr = i < 5 ? 0.08 : 0.02; add(new T.SphereGeometry(0.038, 14, 10), new T.MeshStandardMaterial({ color: col, roughness: 0.4 }), x + Math.cos(a) * rr, y + 0.07 + (i >= 5 ? 0.05 : 0), z + Math.sin(a) * rr); });
}
function lgUrn(add: any, metal: any, dark: any, x: number, y: number, z: number, lv: number) {
  const T = THREE, prof = lv === 0 ? [[0.12, 0], [0.13, 0.05], [0.13, 0.4], [0.1, 0.45], [0.05, 0.47]] : [[0.1, 0], [0.12, 0.03], [0.08, 0.08], [0.16, 0.2], [0.17, 0.32], [0.12, 0.44], [0.07, 0.48], [0.08, 0.52], [0.03, 0.58]];
  const u = new T.Mesh(new T.LatheGeometry(prof.map(p => new T.Vector2(p[0], p[1])), 32), metal); u.position.set(x, y, z); u.castShadow = true;
  const g = add(new T.CylinderGeometry(0.0001, 0.0001, 0.0001, 3), metal, x, y, z); g.parent.add(u);
  const tap = add(new T.BoxGeometry(0.03, 0.03, 0.09), metal, x, y + 0.12, z - 0.17); void tap; add(new T.BoxGeometry(0.02, 0.05, 0.02), dark, x, y + 0.15, z - 0.21);
  if (lv) for (const s of [-1, 1]) add(new T.TorusGeometry(0.035, 0.008, 6, 14), metal, x + s * 0.18, y + 0.3, z).rotation.y = Math.PI / 2;
}
function lgTeapot(add: any, por: any, rim: any, x: number, y: number, z: number) {
  const T = THREE, b = new T.Mesh(new T.LatheGeometry([[0.05, 0], [0.09, 0.03], [0.1, 0.08], [0.08, 0.13], [0.04, 0.15], [0.015, 0.17]].map(p => new T.Vector2(p[0], p[1])), 28), por); b.position.set(x, y, z); b.castShadow = true;
  const g = add(new T.CylinderGeometry(0.0001, 0.0001, 0.0001, 3), por, x, y, z); g.parent.add(b);
  const sp = add(new T.CylinderGeometry(0.01, 0.02, 0.12, 10), por, x + 0.12, y + 0.09, z); sp.rotation.z = -0.9;
  add(new T.TorusGeometry(0.045, 0.01, 6, 14, Math.PI), por, x - 0.1, y + 0.08, z).rotation.z = Math.PI / 2;
  if (rim) add(new T.TorusGeometry(0.08, 0.003, 6, 28), rim, x, y + 0.13, z).rotation.x = Math.PI / 2;
}
function lgPlant(add: any, x: number, z: number, lv: number) {
  const T = THREE, pot = add(new T.CylinderGeometry(0.24, 0.19, 0.5, 24), new T.MeshStandardMaterial({ color: lv === 2 ? 0xD4AF37 : lv === 1 ? 0x2B2F36 : 0xE8E4DC, metalness: lv === 2 ? 0.9 : 0, roughness: lv === 2 ? 0.3 : 0.6 }), x, 0.25, z); void pot;
  const r = ctRng(Math.round(x * 13 + z * 7)), leaf = new T.MeshStandardMaterial({ color: 0x2F6B34, roughness: 0.7, side: T.DoubleSide });
  for (let i = 0; i < 26; i++) { const lf = add(new T.PlaneGeometry(0.12, 0.6), leaf, x, 0.5 + 0.3 + r() * 0.6, z); const a = r() * 6.3, t = 0.4 + r() * 0.7; lf.position.x += Math.cos(a) * 0.1; lf.position.z += Math.sin(a) * 0.1; lf.rotation.set(-t * Math.cos(a) * 0.8, a, t * 0.8 * Math.sin(a)); lf.castShadow = false; }
}

/* ---------- guests ---------- */
function lgGuests() {
  const R = LoungeRoom, T = THREE, A = R.A, seats = (A.seats || []).slice(), r = ctRng(7 + R.lvl * 31 + R.k.length);
  R.guests = [];
  // shuffle the seats, sit some guests down; one or two stand at the window with a cup
  for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = seats[i]; seats[i] = seats[j]; seats[j] = t; }
  const n = R.spec.guests, q = R.q >= 2 ? 0.6 : 0.4;
  for (let i = 0; i < n; i++) {
    const sex: 'm' | 'f' = r() < 0.5 ? 'm' : 'f', look = ctLook('lounge-' + R.k + i, sex, i % 3 ? 'public' : 'lay');
    let m: any = null; try { m = Human.build(dressed(look, 'fa' as any), 'fa', '#2C8CFF', av3Style(), q); } catch (e) { m = null; } if (!m) continue;
    const pivot = new T.Group(), holder = new T.Group(); holder.add(m.root); pivot.add(holder); A.root.add(pivot);
    m.root.traverse((o: any) => { if (o.isMesh) { o.castShadow = R.q >= 1; o.receiveShadow = true; } });
    const s = seats[i]; const standing = !s || i >= n - 2;
    if (!standing) { pivot.position.set(s.x + Math.sin(s.ry) * 0.06, 0.45, s.z + Math.cos(s.ry) * 0.06); pivot.rotation.y = s.ry; holder.position.y = -(m.top || 1.75) * 0.52; }
    else { const x = -R.spec.W * 0.3 + r() * R.spec.W * 0.6, z = -R.spec.D / 2 + 0.9; pivot.position.set(x, 0, z); pivot.rotation.y = Math.PI + (r() - 0.5) * 0.8; A.blocks.push([x - 0.3, z - 0.3, x + 0.3, z + 0.3]); }
    R.guests.push({ m, pivot, sit: !standing, seed: r() * 10 });
  }
}

/* ---------- the loop ---------- */
function lgOpen2(root: HTMLElement, q: number) {
  const R = LoungeRoom, T = THREE, cv = root.querySelector('canvas') as HTMLCanvasElement; R.q = q;
  const ren = new T.WebGLRenderer({ canvas: cv, antialias: q >= 1, powerPreference: 'high-performance' }); R.ren = ren;
  ren.setPixelRatio(Gfx.pr(Math.min(window.devicePixelRatio || 1, q >= 3 ? 2 : q >= 2 ? 1.5 : 1))); ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.0;
  ren.shadowMap.enabled = q >= 2; ren.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); R.scene = scene; scene.background = new T.Color(0x0B121B);
  const cam = new T.PerspectiveCamera(62, 1, 0.03, 200); R.cam = cam;
  const S = hgSun(R.k); R.hemi = new T.HemisphereLight(0xFFF4E6, 0x40362E, 0.55 + 0.35 * S.k); scene.add(R.hemi);
  ctProgress(15, 'Laying the carpet…', R);
  setTimeout(() => {
    if (!R.on) return;
    try { const pm = new T.PMREMGenerator(ren), env = new T.Scene(); env.add(new T.Mesh(new T.BoxGeometry(10, 5, 10), new T.MeshBasicMaterial({ color: 0x6A5E52, side: T.BackSide }))); const l = new T.Mesh(new T.PlaneGeometry(6, 1), new T.MeshBasicMaterial({ color: 0xFFFFFF })); l.position.set(0, 2.4, -4); env.add(l); scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose(); } catch (e) { /* no reflections */ }
    ctProgress(35, 'Setting out the cups…', R);
    let A: any = null; try { A = lgBuild(scene, q); } catch (e) { console.error(e); }
    if (!A) { toast('The lounge could not be built on this device', 'warn'); LoungeRoom.close(); return; }
    R.A = A; R.glow = new AimGlow(scene);
    // daylight through the windows, warm lamps inside
    const sp: LgSpec = R.spec, sunK = S.k;
    const win = new T.DirectionalLight(0xEAF2FF, 1.2 * sunK + 0.1); win.position.set(0, sp.H * 1.5, -sp.D * 1.5); win.target.position.set(0, 0, 0); if (q >= 2) { win.castShadow = true; win.shadow.mapSize.set(DESKTOP ? 2048 : 1024, DESKTOP ? 2048 : 1024); const c = win.shadow.camera; c.left = -sp.W / 2; c.right = sp.W / 2; c.top = sp.D; c.bottom = -sp.D; } scene.add(win); scene.add(win.target);
    const nL = DESKTOP ? 6 : q >= 2 ? 4 : 2;
    for (let i = 0; i < nL; i++) { const L = new T.PointLight(0xFFE6C4, (R.lvl === 2 ? 9 : 7) * (1.2 - 0.5 * sunK), 12, 1.6); L.position.set(-sp.W * 0.35 + (i % 3) * sp.W * 0.35, sp.H - 0.4, -sp.D * 0.2 + Math.floor(i / 3) * sp.D * 0.45); scene.add(L); }
    ctProgress(60, 'The guests are arriving…', R);
    try { lgGuests(); } catch (e) { R.guests = []; }
    const fit = () => { const w = root.clientWidth, h = root.clientHeight; ren.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
    fit(); R.fit = fit; window.addEventListener('resize', fit);
    R.free = { x: A.door.x - 0.2, z: A.door.z - 0.6, v: 0, bob: 0 }; R.look = { yaw: 0.25, pitch: -0.04 };
    lgInput(root, cv);
    ctProgress(85, 'Opening the doors…', R);
    setTimeout(() => {
      if (!R.on) return;
      try { ren.compile(scene, cam); } catch (e) { /* first frame */ }
      R.loading = false; lgFrame(); ctProgress(100, 'Ready', R);
      const wait = Math.max(300, 5000 - (performance.now() - R.loadT0));   // at least 5 seconds, and until it is all here
      setTimeout(() => { const L = R.root && R.root.querySelector('.ct-loader') as HTMLElement; if (L) { L.classList.add('out'); setTimeout(() => L.remove(), 800); } lgUi(true); }, wait);
    }, 40);
    R.iv = setInterval(() => { if (R.on && !document.hidden && R.A) { lgDepartures(R.A.depCv, R.k); R.A.depTex.needsUpdate = true; } }, 30000);
    R.perf = Perf.state();
    const loop = () => { if (!R.on) return; R.raf = requestAnimationFrame(loop); if (!R.loading && !Perf.skip(R.perf)) lgFrame(); };
    R.raf = requestAnimationFrame(loop);
  }, 30);
}
function lgInput(root: HTMLElement, cv: HTMLCanvasElement) {
  const R = LoungeRoom; let drag: any = null, moved = 0, justLocked = false;
  cv.addEventListener('pointerdown', e => { if (DESKTOP && e.pointerType === 'mouse') { drag = null; if (!aimLocked(cv)) { justLocked = true; aimLock(cv); } return; } drag = { x: e.clientX, y: e.clientY, yaw: R.look.yaw, pitch: R.look.pitch }; moved = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* none */ } });
  R.mm$ = (e: MouseEvent) => { if (R.on && aimLocked(cv)) aimTurn(R.look, e, -1.2, 1.0); }; document.addEventListener('mousemove', R.mm$);
  cv.addEventListener('pointermove', e => { if (drag) { moved = Math.max(moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y)); R.look.yaw = drag.yaw - (e.clientX - drag.x) * 0.004; R.look.pitch = clamp(drag.pitch - (e.clientY - drag.y) * 0.003, -1.2, 1.0); } });
  cv.addEventListener('pointerup', e => { if (aimLocked(cv)) { if (justLocked) justLocked = false; else lgClickAt(); return; } justLocked = false; if (drag && moved < 6) lgClickAt(e); drag = null; });
  { const pad = root.querySelector('.op-pad') as HTMLElement, knob = pad && pad.firstElementChild as HTMLElement; let id = -1;
    if (pad) { const mv = (e: PointerEvent) => { const r = pad.getBoundingClientRect(), Rr = r.width / 2; let dx = (e.clientX - r.left - Rr) / Rr, dy = (e.clientY - r.top - Rr) / Rr; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } R.stick = [dx, -dy]; knob.style.transform = `translate(${dx * Rr * 0.55}px, ${dy * Rr * 0.55}px)`; };
      pad.addEventListener('pointerdown', e => { e.stopPropagation(); id = e.pointerId; pad.setPointerCapture(id); mv(e); }); pad.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
      const up = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; R.stick = [0, 0]; knob.style.transform = ''; }; pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); } }
  root.addEventListener('click', ev => { const b = (ev.target as HTMLElement).closest('[data-op]') as HTMLElement; if (!b) return; ev.stopPropagation(); const k = b.getAttribute('data-op');
    if (k === 'leave') lgLeave(); else if (k === 'goto') lgGoto(b.getAttribute('data-k')); });
  R.key$ = (e: KeyboardEvent) => { if (!R.on) return; const k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); if (aimLocked()) { aimUnlock(); return; } if (aimEscUsed()) return; lgLeave(); return; }
    if (/^arrow\w+$/.test(k) || /^(w|a|s|d|shift)$/.test(k)) { R.keys[k] = true; e.preventDefault(); e.stopImmediatePropagation(); } };
  R.ku$ = (e: KeyboardEvent) => { if (R.on) R.keys[e.key.toLowerCase()] = false; };
  window.addEventListener('keydown', R.key$, true); window.addEventListener('keyup', R.ku$, true);
}
function lgBlocked(x: number, z: number): boolean { const R = LoungeRoom, sp: LgSpec = R.spec, r = 0.25; if (x < -sp.W / 2 + 0.4 || x > sp.W / 2 - 0.4 || z < -sp.D / 2 + 0.45 || z > sp.D / 2 - 0.4) return true; for (const b of R.A.blocks) if (x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r) return true; return false; }
function lgFrame() {
  const R = LoungeRoom, T = THREE, now = performance.now() / 1000, dt = Math.min(0.05, now - (R.last || now)); R.last = now;
  const K = R.keys || {}, F = R.free;
  if (K.arrowleft) R.look.yaw += dt * 1.6; if (K.arrowright) R.look.yaw -= dt * 1.6;
  if (!R.meTried) { R.meTried = true; const mk = () => { try { if (!R.on || !R.scene) return; const me: any = myPilot(); R.me = selfBody(R.scene, me && me.look ? Object.assign({}, me.look, { hat: 'none' }) : ctLook('me', 'm', 'public'), company().color); } catch (e) { R.me = null; } }; if (Human.ready) mk(); else Human.load().then(mk, () => { /* without */ }); }
  const f = (K.w || K.arrowup ? 1 : 0) - (K.s || K.arrowdown ? 1 : 0) + R.stick[1], rr = (K.d ? 1 : 0) - (K.a ? 1 : 0) + R.stick[0];
  const mag = Math.min(1, Math.hypot(f, rr)), vmax = K.shift ? 2.4 : 1.2; F.v += ((mag > 0.05 ? vmax * mag : 0) - F.v) * Math.min(1, dt * 6);
  const yaw = R.look.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let mx = fx * f + rx * rr, mz = fz * f + rz * rr; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml; const step = F.v * dt;
  if (step > 0) { const nx = F.x + mx * step, nz = F.z + mz * step; if (!lgBlocked(nx, nz)) { F.x = nx; F.z = nz; } else if (!lgBlocked(nx, F.z)) F.x = nx; else if (!lgBlocked(F.x, nz)) F.z = nz; F.bob += step; }
  try { Sound.steps(F, F.bob, 'carpet', F.v); } catch (e) { /* quiet */ }
  const bobY = Math.sin(F.bob / 0.65 * Math.PI) * 0.016 * Math.min(1, F.v / 1.1);
  R.cam.position.set(F.x, 1.64 + bobY, F.z);
  if (R.me) { try { const S = R.me, yb = yaw + Math.PI, o = selfEyeOff(S, yb, 0); S.pitch = R.look.pitch; const eye = selfPose(S, new T.Vector3(F.x - o.x, S.hipY, F.z - o.z), yb, 0, 0, F.v, F.bob, now, dt); R.cam.position.set(eye.x, eye.y + bobY, eye.z); } catch (e) { R.me = null; } }
  const p = R.look.pitch; R.cam.lookAt(R.cam.position.clone().add(new T.Vector3(fx * Math.cos(p), Math.sin(p), fz * Math.cos(p))));
  // guests: sitting back, talking now and then, sipping; the fire flickers; steam rises from fresh cups
  for (const G of R.guests || []) { const t = now + G.seed; let g = humanGesture(null, t); if (G.sit) g = cabinLerpG(g, humanGesture({ kind: 'sit', v: 0 }, t), 1); try { G.m.pose({ t, yaw: 0, gaze: [Math.sin(t * 0.3) * 0.3, 0], blink: (t % 4.2) < 0.12 ? 1 : 0, g, talk: Math.sin(t * 0.21) > 0.6 ? humanSpeech('Our flight leaves at ten, there is time for another coffee.', (G.seed * 1000) | 0, ((t * 1000) | 0)) : 0 }); } catch (e) { /* still */ } }
  for (const fl of R.A.flames) { fl.scale.y = 0.85 + 0.25 * Math.abs(Math.sin(now * 7.3) * Math.sin(now * 3.1)); fl.material.opacity = 0.8 + 0.2 * Math.sin(now * 11); }
  if (R.A.fireL) R.A.fireL.intensity = 1.4 + 0.5 * Math.sin(now * 9) * Math.sin(now * 4.7);
  for (let i = R.A.steam.length - 1; i >= 0; i--) { const s = R.A.steam[i]; s.t += dt; s.m.position.y += dt * 0.08; s.m.material.opacity = Math.max(0, 0.35 * (1 - s.t / 4)); s.m.scale.setScalar(1 + s.t * 0.6); if (s.t > 4) { R.A.root.remove(s.m); R.A.steam.splice(i, 1); } }
  // what you look at glows
  const obj = lgAimedObj(), hint = obj ? obj.userData.act : '', dot = R.root.querySelector('.op-dot') as HTMLElement;
  if (R.glow) { if (obj) R.glow.showObj(obj); else R.glow.hide(); R.glow.step(dt); }
  if (dot) { const tx = hint === 'door' ? 'The door: click to leave the lounge' : hint === 'coffee' ? 'Click for a coffee or a tea' : ''; dot.hidden = !tx && !aimLocked(); dot.textContent = tx || '·'; dot.classList.toggle('on', !!tx); }
  FrameGen.draw(R.perf, R.ren, R.scene, R.cam); Perf.frame(R.perf, R.ren);
}
function lgAimedObj(e?: PointerEvent): any {
  const R = LoungeRoom, T = THREE, rc = new T.Raycaster();
  if (e && !aimLocked()) { const r = (R.root.querySelector('canvas') as HTMLElement).getBoundingClientRect(); rc.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), R.cam); }
  else rc.setFromCamera(new T.Vector2(0, 0), R.cam);
  const h = R.A ? rc.intersectObjects(R.A.hits, false)[0] : null; return h && h.distance < 3.2 ? h.object : null;
}
function lgClickAt(e?: PointerEvent) {
  const R = LoungeRoom; if (R.loading) return; const o = lgAimedObj(e), a = o ? o.userData.act : '';
  if (a === 'door') { roomExitMenu(R.root, 'lounges', to => lgLeave(to)); return; }
  if (a === 'coffee') lgPour();
}
/** A fresh cup: the machine hums, a cup on its saucer appears under the spout, steaming. */
function lgPour() {
  const R = LoungeRoom, T = THREE, A = R.A; if (!A || !A.coffeeAt) return;
  Sound.tick(); try { hgSnd('motor'); } catch (e) { /* quiet */ }
  setTimeout(() => {
    if (!R.on) return; const p = A.coffeeAt, tea = Math.random() < 0.4;
    const add = (g: any, m: any, x: number, y: number, z: number) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); A.root.add(o); return o; };
    lgCup(add, new T.MeshStandardMaterial({ color: 0xF7F5F0, roughness: 0.2 }), R.lvl === 2 ? new T.MeshStandardMaterial({ color: 0xD4AF37, metalness: 1, roughness: 0.25 }) : null, p.x + (Math.random() - 0.5) * 0.1, p.y, p.z, tea, tea ? 0x7A3E14 : 0x3A1F0E);
    for (let i = 0; i < 6; i++) { const s = new T.Mesh(new T.SphereGeometry(0.02, 8, 6), new T.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.35, depthWrite: false })); s.position.set(p.x + (Math.random() - 0.5) * 0.03, p.y + 0.09 + i * 0.03, p.z); A.root.add(s); A.steam.push({ m: s, t: i * 0.5 }); }
    toast(tea ? 'A cup of tea, fresh from the urn' : 'A fresh espresso', 'ok');
  }, 1500);
}
function lgUi(first?: boolean) {
  const R = LoungeRoom; if (!R.on) return;
  const sp = R.root.querySelector('.hg-spots') as HTMLElement; sp.hidden = false;
  sp.innerHTML = `<button data-op="goto" data-k="seats">The seats</button><button data-op="goto" data-k="coffee">Coffee and tea</button>${R.lvl >= 1 ? '<button data-op="goto" data-k="bar">The bar</button>' : ''}<button data-op="goto" data-k="window">The window</button>`;
  const pad = R.root.querySelector('.op-pad') as HTMLElement; if (pad) pad.hidden = DESKTOP;
  const hint = R.root.querySelector('.op-aim') as HTMLElement;
  if (hint && first) { hint.hidden = false; hint.classList.add('op-hint'); hint.textContent = DESKTOP ? 'W A S D to walk · the mouse looks around · click what glows' : 'Stick to walk · drag to look · tap what glows'; setTimeout(() => { if (hint) hint.hidden = true; }, 6000); }
}
function lgGoto(where: string) {
  const R = LoungeRoom, sp: LgSpec = R.spec, fd = R.root.querySelector('.hg-fade') as HTMLElement;
  const to = where === 'coffee' ? { x: sp.W / 2 - 3.3, z: sp.D / 2 - 2.4, yaw: Math.PI, pitch: -0.3 } : where === 'bar' ? { x: -sp.W / 2 + 3.2, z: sp.D / 2 - 3.2, yaw: Math.PI, pitch: -0.15 } : where === 'window' ? { x: 0, z: -sp.D / 2 + 1.6, yaw: 0, pitch: 0.02 } : { x: 0, z: sp.D * 0.18, yaw: 0.2, pitch: -0.12 };
  Sound.tick(); aimUnlock(); if (fd) fd.classList.add('on');
  setTimeout(() => { if (!lgBlocked(to.x, to.z)) { R.free.x = to.x; R.free.z = to.z; } R.look = { yaw: to.yaw, pitch: to.pitch }; if (fd) fd.classList.remove('on'); }, 260);
}

/* ---------- leaving ---------- */
LoungeRoom.close = function (quiet?: boolean) {
  const R = LoungeRoom; if (!R.on) return; R.on = false;
  cancelAnimationFrame(R.raf); clearInterval(R.iv); window.removeEventListener('keydown', R.key$, true); window.removeEventListener('keyup', R.ku$, true); window.removeEventListener('resize', R.fit);
  document.removeEventListener('mousemove', R.mm$); aimUnlock();
  try { FrameGen.dispose(R.perf); } catch (e) { /* none */ }
  exitFreeRenderer(R.ren, R.scene); R.ren = null; R.scene = null; R.A = null; R.glow = null; R.me = null; R.meTried = false; R.guests = [];
  if (R.root) R.root.remove();
  if (!quiet) { try { refresh(); } catch (e) { /* ignore */ } }
};
function lgLeave(to?: string) {
  if (!LoungeRoom.on || ExitSplash.on) return;
  exitSplash('lounge', 'Leaving the ' + (LoungeRoom.spec ? LoungeRoom.spec.name.toLowerCase() : 'lounge'), [
    { pct: 30, step: 'Closing the lounge…', run: () => LoungeRoom.close(true) },
    { pct: 55, step: 'Clearing the room from memory…', run: exitFreeMemory },
    { pct: 85, step: to && to !== 'lounges' ? 'On your way…' : 'Loading your lounges…', run: () => { try { roomGoTo(to || 'lounges'); } catch (e) { refresh(); } } },
  ]);
}
ACTIONS['lounge-visit'] = el => { const k = el && el.getAttribute ? el.getAttribute('data-k') || '' : ''; if (roomLeaveFor('lvisit:' + k)) return; closeAll(); LoungeRoom.open(k); };
