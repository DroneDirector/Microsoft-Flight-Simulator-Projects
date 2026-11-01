/* Your office, in 3D. A warm, panelled corner office: a walnut executive desk with a leather top, your laptop
 * showing the airline, a banker's lamp, the phone, a notepad, coffee, a model of one of your aircraft in the
 * company colours, your nameplate, and a photo of you with your family; a big window over the airport and the
 * mountains, bookshelves, aviation posters, your route map, a propeller on the wall, a leather sofa, a globe
 * and your trophies.
 *  - Visit it any time (My office): sit in your chair, look at the paintings, the window, the route map, or
 *    walk about freely (W A S D, or the stick); click your chair to sit, click the door to leave.
 *  - Invite a crew member in over a conduct report: they knock, come in, sit down across the desk facing you
 *    and you question them. They answer honestly, defensively, dismissively or lie, in their own words each
 *    time (a library of answers), and their body shows it. Then you keep them, discipline them or dismiss them.
 *    You stay seated (you can look around); their answers can be played aloud, or play by themselves if
 *    Settings → Conduct → Play answers aloud in the office is on.
 * Everything is our own: drawn textures and simple shapes. People, airlines and the family are made up. */

const OfficeRoom: any = { on: false };

/* ---------- drawn pictures for the office ---------- */
function ofPoster(seed: number, co: any, city: string): HTMLCanvasElement {
  const [c, x] = ctCanvas(384, 576), r = ctRng(seed);
  const top = ['#F3C27A', '#9FC6E0', '#F0A87A'][seed % 3], bot = ['#E9DDC2', '#E4E9E6', '#F2E2C8'][seed % 3];
  const g = x.createLinearGradient(0, 0, 0, 400); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, 384, 576);
  x.fillStyle = 'rgba(255,240,200,.85)'; x.beginPath(); x.arc(270, 150, 46, 0, 6.3); x.fill();
  for (let k = 0; k < 3; k++) { x.fillStyle = ['#7C8C7A', '#5A6C5E', '#3E4E44'][k]; x.beginPath(); x.moveTo(0, 420); let y = 250 + k * 45; for (let X = 0; X <= 384; X += 32) { y += (r() - 0.5) * 70; x.lineTo(X, Math.max(200 + k * 40, Math.min(400, y))); } x.lineTo(384, 420); x.fill(); }
  x.fillStyle = '#2F5468'; x.fillRect(0, 400, 384, 40);
  // a jet climbing out, drawn flat in the airline's colours
  x.save(); x.translate(150, 210); x.rotate(-0.22); x.fillStyle = co.color || '#2C8CFF';
  x.beginPath(); x.ellipse(0, 0, 92, 11, 0, 0, 6.3); x.fill();
  x.beginPath(); x.moveTo(-10, 2); x.lineTo(-58, 46); x.lineTo(-38, 46); x.lineTo(30, 4); x.fill();
  x.beginPath(); x.moveTo(-66, -4); x.lineTo(-92, -40); x.lineTo(-78, -40); x.lineTo(-50, -6); x.fill();
  x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 9; i++) x.fillRect(-46 + i * 11, -4, 5, 4);
  x.restore();
  x.fillStyle = '#1E2A33'; x.fillRect(0, 440, 384, 136);
  x.fillStyle = '#F2D18A'; x.font = '700 40px Georgia, serif'; x.textAlign = 'center'; x.fillText(seed % 2 ? 'FLY TO' : 'DISCOVER', 192, 495);
  x.fillStyle = '#FFFFFF'; x.font = '700 34px Inter, Arial, sans-serif'; x.fillText(String(city || 'the North').toUpperCase(), 192, 540);
  x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '600 16px Inter, Arial, sans-serif'; x.fillText(co.name.toUpperCase(), 192, 566);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(80,50,20,${0.05 * r()})`; x.fillRect(r() * 384, r() * 576, 2, 2); }
  return c;
}
/** The airline's route map: every route of the network on a dark chart, the hub marked. */
function ofRouteMap(co: any): HTMLCanvasElement {
  const [c, x] = ctCanvas(1024, 576), g = x.createLinearGradient(0, 0, 0, 576); g.addColorStop(0, '#0F2338'); g.addColorStop(1, '#0A1828'); x.fillStyle = g; x.fillRect(0, 0, 1024, 576);
  const pts: number[][] = [];
  for (const rt of (State.routes || []) as any[]) if (rt.companyId === co.id || !rt.companyId) for (const k of rt.legs || []) { const A = apt(k); if (A) pts.push(A.pos); }
  const H = apt(co.hub); if (H) pts.push(H.pos);
  let x0 = -30, x1 = 40, y0 = 35, y1 = 72;
  if (pts.length) { x0 = Math.min(...pts.map(p => p[0])) - 8; x1 = Math.max(...pts.map(p => p[0])) + 8; y0 = Math.min(...pts.map(p => p[1])) - 5; y1 = Math.max(...pts.map(p => p[1])) + 5; }
  const k = Math.min(1024 / (x1 - x0), 576 / (y1 - y0)), ox = (1024 - (x1 - x0) * k) / 2, oy = (576 - (y1 - y0) * k) / 2;
  const P = (p: number[]) => [ox + (p[0] - x0) * k, 576 - oy - (p[1] - y0) * k];
  x.strokeStyle = 'rgba(120,160,200,.12)'; x.lineWidth = 1;
  for (let lo = Math.ceil(x0 / 10) * 10; lo < x1; lo += 10) { const a = P([lo, y0]), b = P([lo, y1]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
  for (let la = Math.ceil(y0 / 5) * 5; la < y1; la += 5) { const a = P([x0, la]), b = P([x1, la]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
  x.strokeStyle = co.color || '#3FD0E8'; x.lineWidth = 2.4; x.globalAlpha = 0.85;
  for (const rt of (State.routes || []) as any[]) { if (rt.companyId && rt.companyId !== co.id) continue; const L = (rt.legs || []).map((k2: string) => apt(k2)).filter(Boolean); for (let i = 1; i < L.length; i++) { const a = P(L[i - 1].pos), b = P(L[i].pos), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.18; x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(mx, my, b[0], b[1]); x.stroke(); } }
  x.globalAlpha = 1; x.fillStyle = '#EAF2FA';
  for (const p of pts) { const q = P(p); x.beginPath(); x.arc(q[0], q[1], 4, 0, 6.3); x.fill(); }
  if (H) { const q = P(H.pos); x.fillStyle = '#F2D18A'; x.beginPath(); x.arc(q[0], q[1], 9, 0, 6.3); x.fill(); x.font = '700 22px Inter, Arial, sans-serif'; x.fillText(H.city || co.hub, q[0] + 14, q[1] + 7); }
  x.fillStyle = '#F2D18A'; x.font = '700 30px Georgia, serif'; x.fillText(co.name + ' · Route network', 32, 52);
  return c;
}
/** The view from the window: the airport below the mountains, an aircraft on the runway. */
function ofView(): HTMLCanvasElement {
  const [c, x] = ctCanvas(1024, 512), g = x.createLinearGradient(0, 0, 0, 300), r = ctRng(4);
  g.addColorStop(0, '#7FA7CC'); g.addColorStop(1, '#E7E4D8'); x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(255,255,255,.55)'; const cx = r() * 1024, cy = 40 + r() * 120; for (let j = 0; j < 6; j++) { x.beginPath(); x.ellipse(cx + j * 22, cy + Math.sin(j) * 6, 40, 14, 0, 0, 6.3); x.fill(); } }
  for (let kk = 0; kk < 3; kk++) { x.fillStyle = ['#8C9A9E', '#6A7A72', '#4F5F52'][kk]; x.beginPath(); x.moveTo(0, 340); let y = 170 + kk * 45; for (let X = 0; X <= 1024; X += 40) { y += (r() - 0.5) * 80; x.lineTo(X, Math.max(130 + kk * 40, Math.min(330, y))); } x.lineTo(1024, 340); x.fill(); }
  x.fillStyle = '#5E7050'; x.fillRect(0, 330, 1024, 182);
  x.fillStyle = '#3B3F43'; x.beginPath(); x.moveTo(0, 410); x.lineTo(1024, 380); x.lineTo(1024, 410); x.lineTo(0, 446); x.fill();
  x.strokeStyle = '#F2F2F2'; x.lineWidth = 3; x.setLineDash([22, 18]); x.beginPath(); x.moveTo(0, 428); x.lineTo(1024, 395); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#DDE3E8'; x.beginPath(); x.ellipse(600, 392, 46, 6, -0.03, 0, 6.3); x.fill(); x.fillRect(588, 380, 4, 12); x.beginPath(); x.moveTo(598, 392); x.lineTo(580, 404); x.lineTo(620, 392); x.fill();
  x.fillStyle = '#C9CFD4'; x.fillRect(120, 300, 220, 40); x.fillStyle = '#8FA3B5'; for (let i = 0; i < 10; i++) x.fillRect(128 + i * 21, 310, 14, 18);
  return c;
}
/** The laptop's screen: the airline at a glance. */
function ofLaptop(co: any): HTMLCanvasElement {
  const [c, x] = ctCanvas(512, 320); x.fillStyle = '#0B1A2F'; x.fillRect(0, 0, 512, 320);
  x.fillStyle = co.color || '#2C8CFF'; x.fillRect(0, 0, 512, 36); x.fillStyle = '#fff'; x.font = '700 18px Inter, Arial, sans-serif'; x.fillText(co.name, 14, 24);
  x.fillStyle = '#8FA6BD'; x.font = '13px Inter, Arial, sans-serif'; x.fillText('Balance', 16, 66); x.fillText('Fleet', 200, 66); x.fillText('Popularity', 340, 66);
  x.fillStyle = '#EAF2FA'; x.font = '700 22px Inter, Arial, sans-serif'; x.fillText(money(co.balance), 16, 92); x.fillText(String(fleetOf(co.id).length), 200, 92); x.fillText(Math.round(co.reputation || 50) + '%', 340, 92);
  x.strokeStyle = '#3FD0E8'; x.lineWidth = 3; x.beginPath(); const r = ctRng(2); let y = 250; for (let X = 16; X < 496; X += 24) { y = Math.max(140, Math.min(290, y - 6 + (r() - 0.4) * 30)); X === 16 ? x.moveTo(X, y) : x.lineTo(X, y); } x.stroke();
  x.fillStyle = 'rgba(63,208,232,.12)'; x.lineTo(496, 300); x.lineTo(16, 300); x.fill();
  return c;
}
/** The report on the desk, for the interview. */
function ofReport(inc: any, p: any): HTMLCanvasElement {
  const [c, x] = ctCanvas(384, 512); x.fillStyle = '#F7F4EC'; x.fillRect(0, 0, 384, 512);
  x.fillStyle = '#7A1E22'; x.font = '700 26px Georgia, serif'; x.fillText('CONDUCT REPORT', 28, 52);
  x.fillStyle = '#222'; x.font = '600 18px Inter, Arial, sans-serif'; x.fillText(p.name, 28, 92); x.font = '16px Inter, Arial, sans-serif'; x.fillText(inc.title, 28, 118);
  x.fillStyle = '#999'; for (let i = 0; i < 12; i++) x.fillRect(28, 150 + i * 26, 300 - (i % 3) * 40, 3);
  x.strokeStyle = '#7A1E22'; x.lineWidth = 3; x.strokeRect(250, 420, 100, 46); x.fillStyle = '#7A1E22'; x.font = '700 15px Inter, Arial, sans-serif'; x.fillText('OPEN', 278, 449);
  return c;
}
function ofBooks(): HTMLCanvasElement {
  const [c, x] = ctCanvas(512, 128), r = ctRng(31); x.fillStyle = '#2A1A0E'; x.fillRect(0, 0, 512, 128);
  let X = 2; while (X < 510) { const w = 8 + r() * 14, h = 80 + r() * 44; x.fillStyle = ['#6B1F22', '#1F3B5A', '#2E4A2E', '#8A6A2A', '#3A2A4A', '#5A4A3A', '#1A1A1A', '#7A4A2A'][Math.floor(r() * 8)]; x.fillRect(X, 128 - h, w, h); x.fillStyle = 'rgba(230,200,120,.6)'; x.fillRect(X + 1, 128 - h + 10, w - 2, 2); x.fillRect(X + 1, 128 - h + 16, w - 2, 1); X += w + 1; if (r() < 0.06) X += 14; }
  return c;
}
function ofRug(): HTMLCanvasElement {
  const [c, x] = ctCanvas(512, 512); x.fillStyle = '#6B1E26'; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = '#C9A25A'; x.lineWidth = 10; x.strokeRect(22, 22, 468, 468); x.lineWidth = 3; x.strokeRect(44, 44, 424, 424);
  x.fillStyle = '#1F2E4A'; x.fillRect(48, 48, 416, 416); x.fillStyle = '#6B1E26'; x.beginPath(); x.moveTo(256, 90); x.lineTo(420, 256); x.lineTo(256, 422); x.lineTo(92, 256); x.closePath(); x.fill();
  x.strokeStyle = '#C9A25A'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#C9A25A'; x.beginPath(); x.arc(256, 256, 30, 0, 6.3); x.fill();
  const r = ctRng(8); for (let i = 0; i < 14000; i++) { x.fillStyle = `rgba(0,0,0,${0.12 * r()})`; x.fillRect(r() * 512, r() * 512, 1, 1); }
  return c;
}

/* ---------- the room ---------- */
function ofBuild(scene: any, q: number) {
  const T = THREE, A: any = { hits: [] }, co = company(), me: any = myPilot();
  const M = (o: any) => new T.MeshPhysicalMaterial(Object.assign({ roughness: 0.6, envMapIntensity: 0.75 }, o));
  const tex = { walnut: ctTex(ctWood('#5A3519', '#2A160A', 3)), oak: ctTex(ctWood('#9A6E42', '#4A2E16', 5)), parquet: ctTex(ctParquet(), 3, 3) };
  const mat = {
    walnut: M({ map: tex.walnut, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.18 }), walnutM: M({ map: tex.walnut, roughness: 0.5 }),
    oak: M({ map: tex.oak, roughness: 0.45, clearcoat: 0.3 }), parquet: M({ map: tex.parquet, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    wall: M({ color: 0x23344A, roughness: 0.85 }), wallLight: M({ map: ctTex(ctNoise('#E9E1D0', 0.06, 9), 4, 2), roughness: 0.9 }), ceiling: M({ color: 0xF1EBDD, roughness: 0.9 }),
    leather: M({ map: ctTex(ctLeather('#4A2414')), roughness: 0.42, sheen: 0.5, sheenColor: new T.Color(0x8A4A2A) }), leatherG: M({ map: ctTex(ctLeather('#23402F')), roughness: 0.45 }),
    inlay: M({ map: ctTex(ctNoise('#1E3A2A', 0.15, 3)), roughness: 0.55 }),
    brass: M({ color: 0xC9A04E, metalness: 1, roughness: 0.25 }), chrome: M({ color: 0xDDE2E8, metalness: 1, roughness: 0.15 }), black: M({ color: 0x141619, roughness: 0.45 }),
    paper: M({ color: 0xF4F1E8, roughness: 0.9 }), glass: M({ color: 0xDDEEFF, roughness: 0.05, transparent: true, opacity: 0.2, clearcoat: 1 }),
    greenGlass: M({ color: 0x1F6B3A, roughness: 0.15, transmission: 0, emissive: 0x2E8A4A, emissiveIntensity: 0.6, clearcoat: 1 }),
    white: M({ color: 0xF2F2F0, roughness: 0.3 }), co: M({ color: new T.Color(co.color || '#2C8CFF'), roughness: 0.3, clearcoat: 0.8 }), plant: M({ color: 0x2F6B34, roughness: 0.7, side: T.DoubleSide }), pot: M({ color: 0xD8D2C6, roughness: 0.6 }),
  };
  const root = new T.Group(); scene.add(root); A.root = root;
  const add = (g: any, m: any, x: number, y: number, z: number, ry?: number, par?: any) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; (par || root).add(o); return o; };
  const bx = (w: number, h: number, d: number, m: any, x: number, y: number, z: number, ry?: number, par?: any) => add(new T.BoxGeometry(w, h, d), m, x, y, z, ry, par);
  const slab = (w: number, d: number, h: number, r: number, m: any, x: number, yTop: number, z: number, ry?: number, par?: any) => {
    const s = new T.Shape(), hw = w / 2 - r, hd = d / 2 - r;
    s.moveTo(-hw, -d / 2); s.lineTo(hw, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -hd); s.lineTo(w / 2, hd); s.quadraticCurveTo(w / 2, d / 2, hw, d / 2); s.lineTo(-hw, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, hd); s.lineTo(-w / 2, -hd); s.quadraticCurveTo(-w / 2, -d / 2, -hw, -d / 2);
    const bv = Math.min(0.012, h * 0.3), g = new T.ExtrudeGeometry(s, { depth: h - bv * 2, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(Math.PI / 2); g.translate(0, -bv, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, uv.getY(i) * 0.6);
    return add(g, m, x, yTop, z, ry, par);
  };
  const plane = (w: number, h: number, m: any, x: number, y: number, z: number, ry: number) => { const o = new T.Mesh(new T.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry; o.receiveShadow = true; root.add(o); return o; };
  const frame = (w: number, h: number, picMat: any, x: number, y: number, z: number, ry: number, fm?: any) => {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
    const pic = new T.Mesh(new T.PlaneGeometry(w, h), picMat); pic.position.z = 0.025; g.add(pic);
    const f = fm || mat.brass, t = 0.05;
    for (const [fw, fh, fx, fy] of [[w + t * 2, t, 0, h / 2 + t / 2], [w + t * 2, t, 0, -h / 2 - t / 2], [t, h, w / 2 + t / 2, 0], [t, h, -w / 2 - t / 2, 0]]) bx(fw, fh, 0.05, f, fx, fy, 0.02, 0, g);
    return g;
  };
  // the room: 6.4 m by 6.4 m, 3 m high; you sit at the desk facing the door side (−z)
  const X0 = -3.2, X1 = 3.2, Z0 = -3.4, Z1 = 3.0, HH = 3.0; A.box = [X0, Z0, X1, Z1];
  const fl = plane(X1 - X0, Z1 - Z0, mat.parquet, 0, 0, (Z0 + Z1) / 2, 0); fl.rotation.x = -Math.PI / 2;
  const rug = plane(3.6, 3.0, M({ map: ctTex(ofRug()), roughness: 1 }), 0, 0.006, 0, 0); rug.rotation.x = -Math.PI / 2;
  const ce = plane(X1 - X0, Z1 - Z0, mat.ceiling, 0, HH, (Z0 + Z1) / 2, 0); ce.rotation.x = Math.PI / 2;
  // walls: deep blue above oak panelling, the window wall in light plaster
  plane(X1 - X0, HH, mat.wall, 0, HH / 2, Z0, 0); plane(X1 - X0, HH, mat.wall, 0, HH / 2, Z1, Math.PI); plane(Z1 - Z0, HH, mat.wall, X0, HH / 2, (Z0 + Z1) / 2, Math.PI / 2); plane(Z1 - Z0, HH, mat.wallLight, X1, HH / 2, (Z0 + Z1) / 2, -Math.PI / 2);
  const pan: [number, number, number, number, number][] = [[0, Z0 + 0.03, X1 - X0, 0, 0], [0, Z1 - 0.03, X1 - X0, Math.PI, 0], [X0 + 0.03, (Z0 + Z1) / 2, Z1 - Z0, Math.PI / 2, 0]];
  for (const [x, z, len, ry] of pan) { bx(len, 1.0, 0.04, mat.oak, x, 0.5, z, ry); bx(len, 0.06, 0.07, mat.walnut, x, 1.02, z, ry); bx(len, 0.12, 0.05, mat.walnut, x, 0.06, z, ry); }
  for (const [x, z, ry] of [[0, Z0 + 0.02, 0], [0, Z1 - 0.02, Math.PI], [X0 + 0.02, (Z0 + Z1) / 2, Math.PI / 2], [X1 - 0.02, (Z0 + Z1) / 2, -Math.PI / 2]] as number[][]) { const len = Math.abs(ry) === Math.PI / 2 ? Z1 - Z0 : X1 - X0; bx(len, 0.12, 0.1, mat.ceiling, x, HH - 0.06, z, ry); }
  // the big window over the airport (right wall)
  const view = new T.MeshBasicMaterial({ map: ctTex(ofView()), toneMapped: false });
  plane(4.0, 1.9, view, X1 - 0.01, 1.85, -0.4, -Math.PI / 2);
  for (const z of [-2.4, -1.07, 0.27, 1.6]) bx(0.08, 1.95, 0.07, mat.black, X1 - 0.05, 1.85, z);
  bx(0.08, 0.07, 4.06, mat.black, X1 - 0.05, 2.82, -0.4); bx(0.3, 0.06, 4.2, mat.walnut, X1 - 0.15, 0.88, -0.4);
  const sun = new T.DirectionalLight(0xFFE8C8, 2.2); sun.position.set(9, 5, -1.5); sun.target.position.set(0, 0.5, 0); sun.castShadow = q >= 1; sun.shadow.mapSize.set(q >= 2 ? 2048 : 1024, q >= 2 ? 2048 : 1024);
  const sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 25; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; scene.add(sun); scene.add(sun.target);
  // the door (left wall, at the far end), with a brass handle; it swings open for visitors
  const door = new T.Group(); door.position.set(X0 + 0.04, 0, -2.6); root.add(door); A.door = door;
  const dl = new T.Group(); door.add(dl); dl.position.z = 0.5;
  bx(0.05, 2.15, 1.0, mat.walnutM, 0, 1.075, -0.5, 0, dl);
  for (const [y, h] of [[1.55, 0.8], [0.6, 0.8]]) bx(0.02, h, 0.72, mat.walnut, 0.035, y, -0.5, 0, dl);
  add(new T.SphereGeometry(0.035, 14, 10), mat.brass, 0.07, 1.0, -0.88, 0, dl);
  bx(0.08, 2.25, 0.08, mat.walnut, X0 + 0.05, 1.12, -2.08); bx(0.08, 2.25, 0.08, mat.walnut, X0 + 0.05, 1.12, -3.12); bx(0.08, 0.1, 1.1, mat.walnut, X0 + 0.05, 2.2, -2.6);
  const doorHit = bx(0.3, 2.2, 1.0, new T.MeshBasicMaterial({ visible: false }), X0 + 0.15, 1.1, -2.6); doorHit.userData.act = 'door'; A.hits.push(doorHit); A.doorLeaf = dl;
  // the desk: walnut with a green leather top, two pedestals of drawers; the front is set back so a visitor's knees fit
  slab(2.1, 0.95, 0.05, 0.03, mat.walnut, 0, 0.77, 0);
  const inl = plane(1.7, 0.6, mat.inlay, 0, 0.7725, 0.06, 0); inl.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) { bx(0.5, 0.72, 0.85, mat.walnutM, s * 0.78, 0.36, 0); for (let i = 0; i < 3; i++) { bx(0.44, 0.2, 0.02, mat.walnut, s * 0.78, 0.13 + i * 0.23, 0.43); bx(0.1, 0.018, 0.03, mat.brass, s * 0.78, 0.17 + i * 0.23, 0.45); } }
  bx(1.06, 0.5, 0.03, mat.walnutM, 0, 0.45, -0.12);   // modesty panel, set back
  // things on the desk
  const lt = new T.Group(); lt.position.set(0.45, 0.775, 0.22); lt.rotation.y = -0.45; root.add(lt);
  bx(0.34, 0.015, 0.24, mat.chrome, 0, 0.008, 0, 0, lt); const scr = new T.Group(); scr.position.set(0, 0.015, -0.115); scr.rotation.x = -0.28; lt.add(scr);
  bx(0.34, 0.23, 0.008, mat.chrome, 0, 0.115, 0, 0, scr);
  const lsm = new T.Mesh(new T.PlaneGeometry(0.31, 0.2), new T.MeshBasicMaterial({ map: ctTex(ofLaptop(co)), toneMapped: false })); lsm.position.set(0, 0.115, 0.006); scr.add(lsm);
  // the banker's lamp: brass stand, green glass shade, a warm light
  add(new T.CylinderGeometry(0.07, 0.08, 0.02, 24), mat.brass, -0.72, 0.785, -0.18); add(new T.CylinderGeometry(0.008, 0.008, 0.3, 8), mat.brass, -0.72, 0.94, -0.18);
  const shade = add(new T.CylinderGeometry(0.035, 0.14, 0.09, 24, 1, true, 0, Math.PI), mat.greenGlass, -0.72, 1.1, -0.17); shade.rotation.set(0, Math.PI, Math.PI / 2); shade.rotation.order = 'YXZ'; shade.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  bx(0.3, 0.02, 0.1, mat.greenGlass, -0.72, 1.1, -0.17);
  const lampL = new T.PointLight(0xFFD7A0, 1.6, 3, 1.6); lampL.position.set(-0.72, 1.05, -0.12); root.add(lampL);
  // the family photo, the phone, notes, coffee, pens
  A.photoAt = new T.Group(); A.photoAt.position.set(-0.42, 0.775, 0.3); A.photoAt.rotation.y = 0.5;   // turned towards you root.add(A.photoAt);
  bx(0.24, 0.015, 0.17, mat.white, 0.2 - 0.2, 0.008, 0.33, 0.1);   // a notepad
  add(new T.CylinderGeometry(0.006, 0.006, 0.15, 8), mat.black, 0.06, 0.79, 0.3).rotation.set(Math.PI / 2, 0, 0.6);
  add(new T.CylinderGeometry(0.04, 0.035, 0.09, 20), mat.white, 0.78, 0.82, 0.32); add(new T.TorusGeometry(0.025, 0.007, 8, 16), mat.white, 0.82, 0.82, 0.32).rotation.y = 0;
  add(new T.CylinderGeometry(0.036, 0.036, 0.004, 20), M({ color: 0x3A2216 }), 0.78, 0.862, 0.32);
  bx(0.2, 0.05, 0.22, mat.black, 0.75, 0.8, -0.1, 0.3); bx(0.18, 0.025, 0.05, mat.black, 0.73, 0.84, -0.18, 0.3);
  add(new T.CylinderGeometry(0.035, 0.035, 0.1, 18), mat.brass, -0.85, 0.825, 0.25); for (let i = 0; i < 4; i++) add(new T.CylinderGeometry(0.004, 0.004, 0.15, 6), [mat.black, mat.co, mat.brass, mat.black][i], -0.85 + (i - 1.5) * 0.012, 0.9, 0.25 + (i % 2) * 0.01).rotation.z = (i - 1.5) * 0.08;
  // your nameplate, facing the visitor
  { const [c, x] = ctCanvas(512, 96); x.fillStyle = '#1A120A'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#F2D18A'; x.font = '600 34px Georgia, serif'; x.textAlign = 'center'; x.fillText((me && me.name) || 'Chief Executive', 256, 46); x.font = '18px Inter, Arial, sans-serif'; x.fillText('Chief Executive · ' + co.name, 256, 78);
    const np = new T.Group(); np.position.set(0, 0.775, -0.38); root.add(np); const pr = new T.Mesh(new T.BoxGeometry(0.42, 0.08, 0.05), mat.walnut); pr.position.y = 0.04; pr.rotation.x = -0.35; np.add(pr);
    const pl = new T.Mesh(new T.PlaneGeometry(0.4, 0.075), M({ map: ctTex(c), roughness: 0.3, metalness: 0.3 })); pl.position.set(0, 0.045, -0.028); pl.rotation.set(-0.35, Math.PI, 0); np.add(pl); }
  // a model of one of your aircraft on a stand, in the company colours
  { const g = new T.Group(); g.position.set(0.78, 0.775, -0.32); g.rotation.y = 0.9; root.add(g);
    add(new T.CylinderGeometry(0.05, 0.06, 0.015, 20), mat.walnut, 0, 0.008, 0, 0, g); add(new T.CylinderGeometry(0.004, 0.004, 0.16, 8), mat.chrome, 0, 0.09, 0, 0, g);
    const p = new T.Group(); p.position.y = 0.18; p.rotation.z = 0.1; g.add(p);
    const fu = add(new T.CapsuleGeometry(0.018, 0.26, 6, 16), mat.white, 0, 0, 0, 0, p); fu.rotation.z = Math.PI / 2;
    const ws = new T.Shape(); ws.moveTo(0.03, 0); ws.lineTo(-0.04, 0.17); ws.lineTo(-0.075, 0.17); ws.lineTo(-0.045, 0); ws.lineTo(-0.075, -0.17); ws.lineTo(-0.04, -0.17); ws.closePath();
    const wg = new T.ExtrudeGeometry(ws, { depth: 0.006, bevelEnabled: false }); const w = add(wg, mat.white, 0, -0.006, 0, 0, p); w.rotation.x = Math.PI / 2;
    const ts = new T.Shape(); ts.moveTo(-0.11, 0); ts.lineTo(-0.16, 0.075); ts.lineTo(-0.135, 0.075); ts.lineTo(-0.085, 0); ts.closePath(); add(new T.ExtrudeGeometry(ts, { depth: 0.004, bevelEnabled: false }), mat.co, 0, 0.012, -0.002, 0, p);
    const hs = new T.Shape(); hs.moveTo(-0.115, 0); hs.lineTo(-0.15, 0.06); hs.lineTo(-0.135, 0.06); hs.lineTo(-0.1, 0); hs.lineTo(-0.135, -0.06); hs.lineTo(-0.15, -0.06); hs.closePath(); const h = add(new T.ExtrudeGeometry(hs, { depth: 0.004, bevelEnabled: false }), mat.white, 0, 0.004, 0, 0, p); h.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const e = add(new T.CylinderGeometry(0.012, 0.011, 0.05, 14), mat.co, 0.0, -0.022, s * 0.065, 0, p); e.rotation.z = Math.PI / 2; }
    bx(0.24, 0.006, 0.0372, mat.co, -0.01, -0.004, 0, 0, p).scale.set(1, 1, 1); }
  // your chair: a high-backed executive chair in brown leather on a five-star base
  { const g = new T.Group(); g.position.set(0, 0, 0.98); g.rotation.y = Math.PI; root.add(g); A.myChair = g;
    slab(0.6, 0.56, 0.1, 0.06, mat.leather, 0, 0.5, 0.03, 0, g);
    const back = slab(0.6, 0.12, 0.95, 0.06, mat.leather, 0, 1.55, -0.27, 0, g); back.rotation.x = 0; back.position.y = 1.5;
    const hb = new T.Mesh(new T.BoxGeometry(0.62, 0.95, 0.1), mat.leather); hb.position.set(0, 1.05, -0.3); hb.rotation.x = -0.12; hb.castShadow = true; g.add(hb); g.remove(back);
    for (const s of [-1, 1]) { bx(0.07, 0.05, 0.42, mat.leather, s * 0.34, 0.72, 0.02, 0, g); bx(0.04, 0.22, 0.04, mat.chrome, s * 0.34, 0.6, 0.12, 0, g); }
    add(new T.CylinderGeometry(0.03, 0.03, 0.3, 12), mat.chrome, 0, 0.3, 0, 0, g);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = bx(0.33, 0.04, 0.05, mat.chrome, Math.cos(a) * 0.16, 0.1, Math.sin(a) * 0.16, -a, g); void leg; add(new T.SphereGeometry(0.03, 10, 8), mat.black, Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32, 0, g); }
    const hit = bx(0.7, 1.4, 0.7, new T.MeshBasicMaterial({ visible: false }), 0, 0.7, 0, 0, g); hit.userData.act = 'sit'; A.hits.push(hit); }
  // the visitor's chair (nice, if not as nice as yours), facing you across the desk
  ctChair(root, add, bx, slab, mat, 0, 0, -0.98, 0, false); A.visitor = { x: 0, y: 0, z: -0.98, yaw: 0 };
  // bookshelves along the back wall, the route map between them, posters
  for (const s of [-1, 1]) {
    const x = s * 2.35, g = new T.Group(); g.position.set(x, 0, Z0 + 0.2); root.add(g);
    bx(1.4, 2.5, 0.04, mat.walnutM, 0, 1.25, -0.16, 0, g); for (const sx of [-0.68, 0.68]) bx(0.04, 2.5, 0.36, mat.walnut, sx, 1.25, 0, 0, g);
    const bm = M({ map: ctTex(ofBooks()), roughness: 0.8 });
    for (let i = 0; i < 6; i++) { bx(1.36, 0.03, 0.34, mat.walnut, 0, 0.1 + i * 0.45, 0, 0, g); if (i < 5) { const b = new T.Mesh(new T.PlaneGeometry(1.3, 0.34), bm); b.position.set(0, 0.29 + i * 0.45, 0.06); g.add(b); } }
  }
  frame(1.9, 1.07, new T.MeshStandardMaterial({ map: ctTex(ofRouteMap(co)), roughness: 0.5 }), 0, 1.75, Z0 + 0.05, 0, mat.walnut);
  frame(0.62, 0.93, M({ map: ctTex(ofPoster(1, co, (apt(co.hub) || {} as any).city)), roughness: 0.5 }), X0 + 0.05, 1.75, -0.4, Math.PI / 2, mat.black);
  frame(0.62, 0.93, M({ map: ctTex(ofPoster(2, co, 'Reykjavík')), roughness: 0.5 }), X0 + 0.05, 1.75, 0.6, Math.PI / 2, mat.black);
  frame(0.9, 0.6, M({ map: ctTex(ctPainting(5)), roughness: 0.6 }), X0 + 0.05, 1.8, 2.0, Math.PI / 2, mat.brass);
  // a wooden propeller on the wall behind you, a credenza with a globe and trophies
  { const g = new T.Group(); g.position.set(0, 2.15, Z1 - 0.08); g.rotation.y = Math.PI; root.add(g);
    add(new T.CylinderGeometry(0.06, 0.06, 0.08, 20), mat.brass, 0, 0, 0, 0, g).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const sh = new T.Shape(); sh.moveTo(0, -0.04); sh.quadraticCurveTo(0.45, -0.07, 0.85, -0.02); sh.quadraticCurveTo(0.9, 0, 0.85, 0.02); sh.quadraticCurveTo(0.45, 0.07, 0, 0.04); sh.closePath(); const b = add(new T.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008 }), mat.walnut, 0, 0, 0, 0, g); b.rotation.z = s > 0 ? 0.15 : Math.PI + 0.15; } }
  slab(2.4, 0.5, 0.06, 0.02, mat.walnut, 0, 0.78, Z1 - 0.3); bx(2.36, 0.72, 0.46, mat.walnutM, 0, 0.36, Z1 - 0.3);
  for (let i = 0; i < 4; i++) bx(0.54, 0.62, 0.02, mat.walnut, -0.885 + i * 0.59, 0.38, Z1 - 0.53);
  { const gl = new T.Group(); gl.position.set(-0.7, 0.81, Z1 - 0.3); root.add(gl); add(new T.CylinderGeometry(0.07, 0.09, 0.03, 20), mat.walnut, 0, 0.015, 0, 0, gl); add(new T.CylinderGeometry(0.01, 0.01, 0.1, 8), mat.brass, 0, 0.08, 0, 0, gl);
    const [c, x] = ctCanvas(512, 256); x.fillStyle = '#C9B88A'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#7A8A5A'; const r = ctRng(12); for (let i = 0; i < 40; i++) { x.beginPath(); x.ellipse(r() * 512, 30 + r() * 196, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 6.3); x.fill(); } x.strokeStyle = 'rgba(80,60,30,.4)'; for (let i = 1; i < 12; i++) { x.beginPath(); x.moveTo(i * 42, 0); x.lineTo(i * 42, 256); x.stroke(); }
    add(new T.SphereGeometry(0.15, 32, 20), M({ map: ctTex(c), roughness: 0.4, clearcoat: 0.6 }), 0, 0.3, 0, 0, gl); add(new T.TorusGeometry(0.17, 0.008, 8, 40, Math.PI * 1.4), mat.brass, 0, 0.3, 0, 0, gl).rotation.y = Math.PI / 2; }
  for (const [x, h] of [[0.3, 0.26], [0.55, 0.2], [0.8, 0.3]]) { add(new T.CylinderGeometry(0.04, 0.05, 0.04, 16), mat.walnut, x, 0.83, Z1 - 0.3); const cup = add(new T.LatheGeometry([[0, 0], [0.02, 0], [0.012, 0.06], [0.012, h * 0.5], [0.06, h * 0.75], [0.07, h]].map(p => new T.Vector2(p[0], p[1])), 20), mat.brass, x, 0.85, Z1 - 0.3); void cup; }
  // a leather sofa and a low table (left), a plant in the corner
  { const sx = X0 + 0.55, sz = 1.2; bx(0.8, 0.4, 1.9, mat.leather, sx, 0.25, sz); bx(0.25, 0.75, 1.9, mat.leather, X0 + 0.25, 0.5, sz); for (const s of [-1, 1]) bx(0.8, 0.6, 0.2, mat.leather, sx, 0.4, sz + s * 1.0);
    slab(0.6, 1.0, 0.04, 0.03, mat.walnut, X0 + 1.45, 0.42, sz); for (const s of [-1, 1]) bx(0.5, 0.38, 0.04, mat.walnutM, X0 + 1.45, 0.2, sz + s * 0.42); }
  { const px = X1 - 0.45, pz = Z0 + 0.45; add(new T.CylinderGeometry(0.22, 0.17, 0.45, 24), mat.pot, px, 0.225, pz); const r = ctRng(5);
    for (let i = 0; i < 26; i++) { const lf = new T.Mesh(new T.PlaneGeometry(0.12, 0.55), mat.plant); const a = r() * 6.3, t = 0.4 + r() * 0.7; lf.position.set(px + Math.cos(a) * 0.12, 0.45 + 0.25 + r() * 0.6, pz + Math.sin(a) * 0.12); lf.rotation.set(-t * Math.cos(a) * 0.8, a, t * 0.8 * Math.sin(a)); lf.castShadow = true; root.add(lf); } }
  // ceiling lights
  const dm = new T.MeshBasicMaterial({ color: 0xFFF1D8, toneMapped: false });
  for (const [x, z] of [[-1.6, -1.8], [1.6, -1.8], [-1.6, 1.4], [1.6, 1.4], [0, -0.2]]) { const d = new T.Mesh(new T.CircleGeometry(0.08, 20), dm); d.rotation.x = Math.PI / 2; d.position.set(x, HH - 0.005, z); root.add(d); const L = new T.SpotLight(0xFFE4C0, 5, 7, 0.9, 0.7, 1.6); L.position.set(x, HH - 0.05, z); L.target.position.set(x, 0, z); root.add(L); root.add(L.target); }
  return A;
}

/** A photo of you with your family on the desk: taken once, with the figures, and kept. */
function ofFamilyPhoto(ren: any, done: (tex: any) => void) {
  const T = THREE, R = OfficeRoom, me: any = myPilot();
  const key = JSON.stringify(me && me.look || {});
  if (R.photo && R.photo.key === key) { done(ctTex(R.photo.cv)); return; }
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 4 / 3, 0.1, 30);
  const [bg] = ctCanvas(512, 384); { const x = bg.getContext('2d') as CanvasRenderingContext2D, g = x.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, '#8DB7D9'); g.addColorStop(0.55, '#DCE7E8'); g.addColorStop(0.56, '#4E7F9A'); g.addColorStop(0.7, '#5D8C5A'); g.addColorStop(1, '#3E6A3A'); x.fillStyle = g; x.fillRect(0, 0, 512, 384); }
  const bp = new T.Mesh(new T.PlaneGeometry(9, 6.75), new T.MeshBasicMaterial({ map: ctTex(bg) })); bp.position.set(0, 1.4, -3); scene.add(bp);
  scene.add(new T.HemisphereLight(0xFFF6E8, 0x6A7A5A, 1.4)); const sl = new T.DirectionalLight(0xFFF0DC, 2.2); sl.position.set(2, 4, 5); scene.add(sl);
  const meL = me && me.look ? Object.assign({}, me.look, { civil: true, top: 'shirt', uniform: 4, hat: 'none', neck: 'open', bottom: 'trousers' }) : ctLook('me', 'm', 'public');
  const partnerSex: 'm' | 'f' = meL.sex === 'f' ? 'm' : 'f', base = (me && me.id) || 'me';
  const fam = [{ L: meL, x: -0.38, s: 1 }, { L: Object.assign(ctLook('partner-' + base, partnerSex, 'public'), { top: partnerSex === 'f' ? 'blouse' : 'shirt' }), x: 0.38, s: 0.97 },
    { L: ctLook('kid1-' + base, 'f', 'public'), x: -0.2, s: 0.66, z: 0.45 }, { L: ctLook('kid2-' + base, 'm', 'public'), x: 0.24, s: 0.56, z: 0.5 }];
  const built: any[] = [];
  try {
    for (const f of fam) { const m = Human.build(f.L, 'exec', '#2C8CFF', av3Style(), 0.5); m.root.position.set(f.x, 0, f.z || 0); m.root.scale.setScalar(f.s); scene.add(m.root); m.pose({ t: 1, yaw: 0, gaze: [0, 0], blink: 0, g: humanGesture(null, 1) }); built.push(m); }
  } catch (e) { /* the photo without people */ }
  cam.position.set(0, 1.15, 3.6); cam.lookAt(0, 1.0, 0);
  const rt = new T.WebGLRenderTarget(512, 384, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
  ren.setRenderTarget(rt); ren.render(scene, cam); ren.setRenderTarget(null);
  // keep it as a picture (so the figures aren't built again next time)
  const px = new Uint8Array(512 * 384 * 4); try { ren.readRenderTargetPixels(rt, 0, 0, 512, 384, px); } catch (e) { /* the picture stays on the card */ }
  const [cv, x] = ctCanvas(512, 384), id = x.createImageData(512, 384);
  for (let y = 0; y < 384; y++) id.data.set(px.subarray((383 - y) * 512 * 4, (384 - y) * 512 * 4), y * 512 * 4);
  x.putImageData(id, 0, 0);
  R.photo = { key, cv }; rt.dispose();
  scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
  done(ctTex(cv));
}

/* ---------- opening the office ---------- */
const OF_WINGS = `<svg class="ctl-scales" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="ofG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DB8E"/><stop offset=".55" stop-color="#C8963E"/><stop offset="1" stop-color="#8A5E22"/></linearGradient></defs>
  <circle cx="100" cy="100" r="94" fill="#13213A" stroke="url(#ofG)" stroke-width="4"/><g fill="url(#ofG)" class="ctl-beam">
  <path d="M100 82 C80 80 50 76 18 64 C30 78 46 86 62 90 C48 92 36 92 24 90 C38 100 60 104 82 102 C70 106 60 108 48 108 C64 116 84 114 100 108 Z"/>
  <path d="M100 82 C120 80 150 76 182 64 C170 78 154 86 138 90 C152 92 164 92 176 90 C162 100 140 104 118 102 C130 106 140 108 152 108 C136 116 116 114 100 108 Z"/>
  <circle cx="100" cy="95" r="16"/><circle cx="100" cy="95" r="10" fill="#13213A"/></g><text x="100" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="url(#ofG)" letter-spacing="3">OFFICE</text></svg>`;

OfficeRoom.open = function (inc?: any) {
  const R = OfficeRoom; if (R.on) R.close(true);
  const T = THREE; if (!T) { toast('3D is not available on this device', 'warn'); return; }
  const p: any = inc ? staffById(inc.staffId) : null; if (inc && !p) { toast('This person no longer works for you', 'info'); return; }
  R.on = true; R.inc = inc || null; R.p = p; R.mode = inc ? 'interview' : 'visit'; R.keys = {}; R.stick = [0, 0]; R.pct = 0; R.asked = []; R.answers = 0; R.decided = false; R.loadT0 = performance.now();
  const q = typeof cabinQ === 'function' ? cabinQ() : 2, co = company();
  const root = document.createElement('div'); root.className = 'court3d office3d'; R.root = root;
  root.innerHTML = `<canvas></canvas>
    <div class="ct-top"><div><small>${esc(co.name)}</small><b>${inc ? `Your office: ${esc(p.name)}, ${esc(inc.title.toLowerCase())}` : 'Your office'}</b></div></div>
    <button class="ct-leave" data-of="leave">${icon('close')}<span>Leave the office</span><kbd>Esc</kbd></button>
    <div class="ct-box" hidden><div class="ct-who"><b></b><small></small></div><p class="ct-text"></p><p class="of-tell"></p><div class="ct-say"></div><div class="ct-opts"></div><div class="ct-ctl"></div></div>
    <div class="ct-spots of-spots" hidden></div><div class="ct-hint" hidden></div><div class="walk-pad ct-pad" hidden><i></i></div><div class="of-aim" hidden>+</div>
    ${ctLoaderHtml('Your office', inc ? `${p.name} is on the way up…` : 'Unlocking the door…', OF_WINGS)}`;
  document.body.appendChild(root);
  setTimeout(() => { if (R.on && R.root === root) ofOpen2(root, q); }, 80);
};
function ofOpen2(root: HTMLElement, q: number) {
  const R = OfficeRoom, T = THREE, cv = root.querySelector('canvas') as HTMLCanvasElement;
  const ren = new T.WebGLRenderer({ canvas: cv, antialias: q >= 1, powerPreference: 'high-performance' }); R.ren = ren;
  ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, q >= 3 ? 2 : q >= 2 ? 1.5 : 1)); ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.0;
  ren.shadowMap.enabled = q >= 1; ren.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); R.scene = scene; scene.background = new T.Color(0x101820);
  const cam = new T.PerspectiveCamera(58, 1, 0.03, 40); R.cam = cam;
  scene.add(new T.HemisphereLight(0xFFF3E2, 0x3A2A1A, 0.85));
  try {
    const pm = new T.PMREMGenerator(ren), env = new T.Scene(), b = new T.Mesh(new T.BoxGeometry(6, 3, 6), new T.MeshBasicMaterial({ color: 0x3A3020, side: T.BackSide })); env.add(b);
    const w = new T.Mesh(new T.PlaneGeometry(4, 1.9), new T.MeshBasicMaterial({ color: 0xFFF6E6 })); w.position.set(2.9, 0.3, 0); w.rotation.y = -Math.PI / 2; env.add(w);
    scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
  } catch (e) { /* no reflections */ }
  ctProgress(15, 'Arranging the desk…', R);
  const A = ofBuild(scene, q); R.A = A;
  ctProgress(40, 'Hanging the pictures…', R);
  const fit = () => { const w = root.clientWidth, h = root.clientHeight; ren.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
  fit(); R.fit = fit; window.addEventListener('resize', fit);
  // looking: drag (or the mouse once the view has it on the PC), the arrow keys in the chair
  R.look = { yaw: 0, pitch: -0.08 }; R.seat = true; R.free = { x: 0, z: 0.98, v: 0, bob: 0 };
  let drag: any = null, moved = 0;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: R.look.yaw, pitch: R.look.pitch }; moved = 0; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; moved = Math.max(moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y)); R.look.yaw = drag.yaw - (e.clientX - drag.x) * 0.004; R.look.pitch = clamp(drag.pitch - (e.clientY - drag.y) * 0.003, -1.25, 0.9); if (R.seat) R.look.yaw = clamp(R.look.yaw, -2.6, 2.6); });
  cv.addEventListener('pointerup', e => { if (drag && moved < 6) ofClickAt(e); drag = null; });
  root.addEventListener('click', ev => { const b = (ev.target as HTMLElement).closest('[data-of]') as HTMLElement; if (b) ofClick(b); });
  R.key$ = (e: KeyboardEvent) => {
    if (!R.on) return; const k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); ofLeave(); return; }
    if (/^(w|a|s|d|arrow\w+|shift)$/.test(k)) { R.keys[k] = true; e.preventDefault(); e.stopImmediatePropagation(); }
  };
  R.ku$ = (e: KeyboardEvent) => { if (R.on) R.keys[e.key.toLowerCase()] = false; };
  window.addEventListener('keydown', R.key$, true); window.addEventListener('keyup', R.ku$, true);
  ofPad();
  // the family photo, then (for an interview) the crew member
  const next = () => {
    ctProgress(70, R.inc ? `${R.p.name} is at the door…` : 'Opening the blinds…', R);
    if (R.inc) {
      const go = () => { try { ofVisitor(); } catch (e) { /* no one comes in */ } ofReady(); };
      if (Human.ready) setTimeout(go, 30); else Human.load().then(() => setTimeout(go, 30), () => ofReady());
    } else ofReady();
  };
  const photo = () => ofFamilyPhoto(ren, tex => {
    const T2 = THREE, fr = new T2.Group(); A.photoAt.add(fr);
    const bk = new T2.Mesh(new T2.BoxGeometry(0.2, 0.155, 0.012), new T2.MeshPhysicalMaterial({ color: 0xC9A04E, metalness: 1, roughness: 0.25 })); bk.position.set(0, 0.09, 0); bk.rotation.x = -0.15; fr.add(bk);
    const ph = new T2.Mesh(new T2.PlaneGeometry(0.18, 0.135), new T2.MeshStandardMaterial({ map: tex, roughness: 0.35 })); ph.position.set(0, 0.09, 0.0065); ph.rotation.x = -0.15; fr.add(ph);
    const st = new T2.Mesh(new T2.BoxGeometry(0.03, 0.12, 0.008), new T2.MeshPhysicalMaterial({ color: 0x8A6A2A, metalness: 1, roughness: 0.3 })); st.position.set(0, 0.06, -0.04); st.rotation.x = 0.4; fr.add(st);
    next();
  });
  if (Human.ready) setTimeout(photo, 30); else Human.load().then(() => setTimeout(photo, 30), () => next());
  R.loading = true;
  const loop = () => { if (!R.on) return; R.raf = requestAnimationFrame(loop); if (!R.loading) ofFrame(); };
  R.raf = requestAnimationFrame(loop);
}
function ofReady() {
  const R = OfficeRoom; if (!R.on) return;
  ctProgress(92, 'Turning on the lamp…', R);
  setTimeout(() => {
    if (!R.on) return;
    try { R.ren.compile(R.scene, R.cam); } catch (e) { /* first frame */ }
    R.loading = false; R.t0 = performance.now(); try { ofFrame(); } catch (e) { /* next */ }
    ctProgress(100, 'Ready', R);
    const wait = Math.max(300, 2400 - (performance.now() - R.loadT0));
    setTimeout(() => { const L = R.root && R.root.querySelector('.ct-loader') as HTMLElement; if (L) { L.classList.add('out'); setTimeout(() => L.remove(), 800); }
      if (R.mode === 'interview') { ofKnock(); setTimeout(() => ofEnter(), 900); } else ofVisitUi(); }, wait);
  }, 40);
}
OfficeRoom.close = function (quiet?: boolean) {
  const R = OfficeRoom; if (!R.on) return; R.on = false;
  cancelAnimationFrame(R.raf); window.removeEventListener('keydown', R.key$, true); window.removeEventListener('keyup', R.ku$, true); window.removeEventListener('resize', R.fit);
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* none */ }
  try { Voice.stop(); } catch (e) { /* ignore */ }
  try { R.scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); }); R.ren.dispose(); } catch (e) { /* ignore */ }
  R.root.remove(); R.vis = null;
  if (!quiet) { try { refresh(); } catch (e) { /* ignore */ } }
};
function ofLeave() {
  const R = OfficeRoom;
  if (R.mode === 'interview' && R.vis && !R.decided && R.vis.state !== 'gone') {
    // leaving mid-conversation: the report stays open
    OfficeRoom.close(); toast(`${R.p.name} goes back to work. The report is still open.`, 'info'); return;
  }
  OfficeRoom.close();
}

/* ---------- the visitor ---------- */
function ofVisitor() {
  const R = OfficeRoom, T = THREE, p = R.p, role = personRole(p);
  const m = Human.build(p.look, role, company().color || '#2C8CFF', av3Style(), 0.85);
  const pivot = new T.Group(), holder = new T.Group(); pivot.rotation.order = 'YXZ'; holder.add(m.root); pivot.add(holder); R.A.root.add(pivot);
  m.root.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  R.vis = { m, pivot, holder, x: -2.75, z: -2.6, yaw: Math.PI / 2, sitK: 0, wantSit: 0, dist: 0, v: 0, path: [], state: 'outside', mood: null, g: null, talkUntil: 0, attitude: ofAttitude(p) };
  pivot.visible = false;
}
/** How they'll be in the room: honest, defensive, dismissive or lying; from who they are and how they feel. */
function ofAttitude(p: any): string {
  const mood = typeof p.mood === 'number' ? p.mood : 60, w = p.warnings || 0, rt = p.rating || 3.5;
  const W: [string, number][] = [['honest', 0.38 + (rt - 3.5) * 0.15], ['defensive', 0.26 + w * 0.04], ['dismissive', 0.14 + Math.max(0, 50 - mood) / 160 + (p.stubborn || 0) * 0.06], ['lying', 0.2 + w * 0.03]];
  let tot = W.reduce((s, x) => s + Math.max(0.02, x[1]), 0), r = Math.random() * tot;
  for (const [k, v] of W) { r -= Math.max(0.02, v); if (r <= 0) return k; }
  return 'honest';
}
function ofKnock() {
  try {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext, ac = OfficeRoom.ac || (OfficeRoom.ac = new AC());
    [0, 0.22, 0.44].forEach(dl => { const t = ac.currentTime + 0.05 + dl, n = ac.createBuffer(1, 4410, 44100), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 380); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0.9; s.buffer = n; s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); });
  } catch (e) { /* no sound */ }
  ofSay('', 'Come in.', 'A knock at the door');
}
/** In they come: the door swings open, they walk to the chair, turn, and sit down facing you. */
function ofEnter() {
  const R = OfficeRoom, V = R.vis; if (!V) return;
  V.pivot.visible = true; V.state = 'walking'; R.doorT = 1;
  V.path = [[-2.2, -2.45], [-1.2, -1.55], [-0.35, -0.82], [0, -0.86]]; V.after = 'sit';
  setTimeout(() => { R.doorT = 0; }, 3800);
}
function ofExit() {
  const R = OfficeRoom, V = R.vis; if (!V) return;
  V.wantSit = 0; V.state = 'standing';
  setTimeout(() => { if (!R.on || !R.vis) return; R.doorT = 1; V.state = 'walking'; V.path = [[-0.35, -0.82], [-1.2, -1.55], [-2.3, -2.5], [-3.6, -2.6]]; V.after = 'gone'; }, 1300);
}

/* ---------- every frame ---------- */
function ofFrame() {
  const R = OfficeRoom, T = THREE, now = (performance.now() - (R.t0 || 0)) / 1000, dt = Math.min(0.05, now - (R.last || now)); R.last = now;
  // the door
  if (R.A.doorLeaf) { const want = R.doorT ? -1.25 : 0; R.A.doorLeaf.rotation.y += (want - R.A.doorLeaf.rotation.y) * Math.min(1, dt * 2.5); }
  const V = R.vis;
  if (V && V.pivot.visible) {
    const top = V.m.top || 1.7, t = now + 3;
    if (V.state === 'walking' && V.path.length) {
      const [tx, tz] = V.path[0], dx = tx - V.x, dz = tz - V.z, d = Math.hypot(dx, dz);
      const vWant = Math.min(1.0, Math.sqrt(2 * 1.4 * (d + (V.path.length > 1 ? 1 : 0)))); V.v += Math.max(-1.4 * dt, Math.min(1.4 * dt, vWant - V.v));
      const step = Math.min(d, V.v * dt); if (d > 1e-4) { V.x += dx / d * step; V.z += dz / d * step; V.dist += step; }
      const yawT = Math.atan2(dx, dz); let dy = yawT - V.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; V.yaw += dy * Math.min(1, dt * 5);
      if (d < 0.03) { V.path.shift(); if (!V.path.length) { V.v = 0; if (V.after === 'sit') { V.state = 'turning'; } else { V.state = 'gone'; V.pivot.visible = false; setTimeout(() => { R.doorT = 0; ofVisitUi(true); }, 600); } } }
    } else if (V.state === 'turning') {
      let dy = 0 - V.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; V.yaw += dy * Math.min(1, dt * 3.5);
      if (Math.abs(dy) < 0.04) { V.yaw = 0; V.state = 'sitting'; V.wantSit = 1; }
    }
    V.sitK += Math.sign(V.wantSit - V.sitK) * Math.min(Math.abs(V.wantSit - V.sitK), dt * 1.0);
    const sk = V.sitK * V.sitK * (3 - 2 * V.sitK);
    if (V.state === 'sitting' && sk > 0.99 && !R.started) { R.started = true; ofInterviewStart(); }
    // back into the chair as they sit (they stood just in front of it)
    const zz = V.state === 'walking' ? V.z : V.z + (R.A.visitor.z - V.z) * sk;
    V.pivot.position.set(V.x, sk * 0.49, zz); V.holder.position.y = -sk * top * 0.52; V.pivot.rotation.y = V.yaw;
    const seated = sk > 0.5;
    V.pivot.rotation.x = (seated ? 1 : 1.2) * (0.011 * Math.sin(t * 0.37) + 0.005 * Math.sin(t * 0.91 + 1));
    V.pivot.rotation.z = (seated ? 1 : 1.2) * (0.012 * Math.sin(t * 0.29 + 2) + 0.004 * Math.sin(t * 0.77));
    const talking = R.talkUntil > now;
    let gT = V.state === 'walking' ? cabinLerpG(humanGesture(null, t), humanGesture({ kind: 'walk', v: 1 }, V.dist / 1.25), Math.min(1, V.v / 0.6)) : humanGesture(null, t);
    gT = cabinLerpG(gT, humanGesture({ kind: 'sit', v: 0 }, t), sk);
    // body language: how they feel about what they say
    const att = V.say || V.attitude;
    if (seated && V.state === 'sitting') {
      if (att === 'dismissive') { gT.L = [0.62, 0.12, 0.95, 2.05]; gT.R = [0.56, 0.12, 0.9, 2.0]; gT.lean = -0.04; gT.tilt = 0.06; }
      else if (att === 'honest') { gT.nod += 0.1; }
      else if (att === 'lying') { gT.shake += 0.32 * Math.sin(t * 0.7) * (talking ? 1 : 0.6); }
      else if (att === 'defensive' && talking) { gT.L = [0.55 + 0.1 * Math.sin(t * 2), 0.25, -0.1, 1.1]; gT.R = [0.55 + 0.1 * Math.sin(t * 2 + 1), 0.25, -0.1, 1.1]; }
      if (talking) { gT.nod += 0.05 * Math.sin(t * 3.3); gT.shake += 0.04 * Math.sin(t * 1.3); }
      if (R.flush) gT.flush = 0.35;
    }
    // they look at you (your eyes), unless they're avoiding them
    if (V.state === 'sitting') { const ey = R.cam.position, h = new T.Vector3(V.x, 1.25, zz); gT.nod += clamp(-(ey.y - h.y) / Math.max(0.5, Math.hypot(ey.x - h.x, ey.z - h.z)), -0.3, 0.3) * 0.6; }
    V.g = V.g ? cabinLerpG(V.g, gT, Math.min(1, dt * 6)) : gT;
    V.m.pose({ t, yaw: 0, gaze: [0, 0.05], blink: (t % 4.1) < 0.12 ? 1 : 0, g: V.g });
  }
  // you: in your chair (look around), or walking about
  if (R.seat) {
    R.cam.position.set(0, 1.2, 1.02);
    const yaw = Math.PI + R.look.yaw;   // facing −z
    const k = R.keys || {}; if (k.arrowleft) R.look.yaw = clamp(R.look.yaw + dt * 1.4, -2.6, 2.6); if (k.arrowright) R.look.yaw = clamp(R.look.yaw - dt * 1.4, -2.6, 2.6); if (k.arrowup) R.look.pitch = clamp(R.look.pitch + dt, -1.25, 0.9); if (k.arrowdown) R.look.pitch = clamp(R.look.pitch - dt, -1.25, 0.9);
    const p = R.look.pitch; R.cam.lookAt(R.cam.position.clone().add(new T.Vector3(Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p))));
  } else ofWalk(dt);
  R.ren.render(R.scene, R.cam);
}
function ofBlocked(x: number, z: number): boolean {
  if (x < -2.9 || x > 2.9 || z < -3.1 || z > 2.7) return true;
  const B = [[-1.3, -0.7, 1.3, 0.7], [-0.45, 0.6, 0.45, 1.4], [-0.45, -1.4, 0.45, -0.6], [-3.2, 0.1, -1.6, 2.3], [-1.4, 2.25, 1.4, 3.0], [-3.1, -3.4, -1.5, -2.85], [1.5, -3.4, 3.1, -2.85], [2.5, -3.2, 3.2, -2.5]];
  for (const r of B) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return true;
  return false;
}
function ofWalk(dt: number) {
  const R = OfficeRoom, F = R.free, K = R.keys || {}, T = THREE;
  const f = (K.w || K.arrowup ? 1 : 0) - (K.s || K.arrowdown ? 1 : 0) + R.stick[1], r = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0) + R.stick[0];
  const mag = Math.min(1, Math.hypot(f, r)), vmax = K.shift ? 2.0 : 1.2; F.v += ((mag > 0.05 ? vmax * mag : 0) - F.v) * Math.min(1, dt * 6);
  const yaw = R.look.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let mx = fx * f + rx * r, mz = fz * f + rz * r; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml; const step = F.v * dt;
  if (step > 0) { const nx = F.x + mx * step, nz = F.z + mz * step; if (!ofBlocked(nx, nz)) { F.x = nx; F.z = nz; } else if (!ofBlocked(nx, F.z)) F.x = nx; else if (!ofBlocked(F.x, nz)) F.z = nz; F.bob += step; }
  R.cam.position.set(F.x, 1.64 + Math.sin(F.bob / 0.65 * Math.PI) * 0.016 * Math.min(1, F.v / 1.1), F.z);
  const p = R.look.pitch; R.cam.lookAt(R.cam.position.clone().add(new T.Vector3(fx * Math.cos(p), Math.sin(p), fz * Math.cos(p))));
  // what's in front of you: the chair (sit) or the door (leave)
  const aim = R.root.querySelector('.of-aim') as HTMLElement, hint = ofAimed();
  if (aim) { aim.hidden = false; aim.textContent = hint === 'sit' ? 'Click to sit in your chair' : hint === 'door' ? 'Click the door to leave the office' : '+'; aim.classList.toggle('on', !!hint); }
}
function ofAimed(e?: PointerEvent): string {
  const R = OfficeRoom, T = THREE, rc = new T.Raycaster();
  if (e) { const r = (R.root.querySelector('canvas') as HTMLElement).getBoundingClientRect(); rc.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), R.cam); }
  else rc.setFromCamera(new T.Vector2(0, 0), R.cam);
  const h = rc.intersectObjects(R.A.hits, false)[0];
  return h && h.distance < 2.6 ? h.object.userData.act : '';
}
function ofClickAt(e: PointerEvent) {
  const R = OfficeRoom; if (R.seat || R.loading) return;
  const a = ofAimed(e) || ofAimed();
  if (a === 'sit') ofSit(); else if (a === 'door') { Sound.tick(); R.doorT = 1; setTimeout(() => OfficeRoom.close(), 650); }
}
function ofSit() { const R = OfficeRoom; R.seat = true; R.look = { yaw: 0, pitch: -0.08 }; const aim = R.root.querySelector('.of-aim') as HTMLElement; if (aim) aim.hidden = true; ofVisitUi(); Sound.tick(); }
function ofPad() {
  const R = OfficeRoom, pad = R.root.querySelector('.ct-pad') as HTMLElement; if (!pad) return;
  const knob = pad.firstElementChild as HTMLElement; let id = -1;
  const move = (e: PointerEvent) => { const r = pad.getBoundingClientRect(), Rr = r.width / 2; let dx = (e.clientX - r.left - Rr) / Rr, dy = (e.clientY - r.top - Rr) / Rr; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } R.stick = [dx, -dy]; knob.style.transform = `translate(${dx * Rr * 0.6}px, ${dy * Rr * 0.6}px)`; };
  pad.addEventListener('pointerdown', e => { e.stopPropagation(); id = e.pointerId; pad.setPointerCapture(id); move(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const up = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; R.stick = [0, 0]; knob.style.transform = ''; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
}

/* ---------- visiting: places to look, free mode ---------- */
function ofVisitUi(afterInterview?: boolean) {
  const R = OfficeRoom; if (!R.on) return;
  R.mode = 'visit';
  const sp = R.root.querySelector('.of-spots') as HTMLElement, box = R.root.querySelector('.ct-box') as HTMLElement, pad = R.root.querySelector('.ct-pad') as HTMLElement, hint = R.root.querySelector('.ct-hint') as HTMLElement;
  if (!afterInterview) box.hidden = true;
  sp.hidden = false;
  sp.innerHTML = [['sit', 'Sit in my chair'], ['paint', 'The paintings'], ['window', 'The window'], ['map', 'The route map'], ['photo', 'The family photo'], ['free', 'Free mode']].map(x => `<button data-of="spot" data-k="${x[0]}" class="${(x[0] === 'free' && !R.seat) || (x[0] === 'sit' && R.seat && R.view !== 'photo') ? 'on' : ''}">${x[1]}</button>`).join('');
  pad.hidden = R.seat;
  if (!R.seat) { hint.hidden = false; hint.classList.remove('fade'); hint.textContent = DESKTOP ? 'W A S D to walk · drag to look · click your chair to sit · click the door to leave' : 'Stick to walk · drag to look · tap your chair to sit · tap the door to leave'; setTimeout(() => hint.classList.add('fade'), 6000); }
  else hint.hidden = true;
}
function ofSpot(k: string) {
  const R = OfficeRoom; Sound.tick(); R.view = k; const box = R.root.querySelector('.ct-box') as HTMLElement; box.hidden = true;
  if (k === 'sit') { R.seat = true; R.look = { yaw: 0, pitch: -0.08 }; }
  else if (k === 'photo') { R.seat = true; R.look = { yaw: -0.33, pitch: -0.62 }; }
  else if (k === 'free') { R.seat = false; R.free = { x: 0.9, z: 1.6, v: 0, bob: 0 }; R.look = { yaw: 0.25, pitch: -0.05 }; }
  else { R.seat = false; const S: any = { paint: [-1.4, 0.4, Math.PI / 2 - 0.05, 0.05], window: [1.6, -0.4, -Math.PI / 2, -0.04], map: [0, -2.1, 0, 0.08] }[k]; R.free = { x: S[0], z: S[1], v: 0, bob: 0 }; R.look = { yaw: S[2], pitch: S[3] }; }
  ofVisitUi(true);
  const aim = R.root.querySelector('.of-aim') as HTMLElement; if (aim) aim.hidden = R.seat;
}

/* ---------- the interview ---------- */
const OF_Q: [string, string][] = [['what', 'Tell me, in your own words, what happened.'], ['claim', 'The report says: {did} Is that true?'], ['why', 'Why did it happen?'], ['again', 'How do I know it won\'t happen again?'], ['keep', 'Give me one good reason to keep you.']];
// what they did, as they'd say it themselves; the excuse they reach for; what they'd claim instead
const OF_ADMIT: { [t: string]: [string, string, string] } = {
  'Rude to a passenger': ['was short and rude with a passenger during the meal service', 'The cabin was a crew member short and that passenger had been at me the whole flight.', 'was perfectly polite to everyone on that flight'],
  'Late for duty': ['came in late for the briefing', 'The staff bus from the hotel was late, and nobody told us.', 'was there on time, the briefing started early'],
  'Skipped a safety check': ['signed off the safety check without doing all of it', 'The turnaround was impossibly tight and the captain wanted to board early.', 'checked every piece of equipment, like I always do'],
  'Argument with a colleague': ['lost my temper with a colleague in the galley', 'My colleague criticised me in front of passengers first.', 'had a normal conversation with a colleague, nothing more'],
  'Late for the turnaround': ['got to the aircraft late', 'The vehicle wouldn\'t start and I had to fetch another one.', 'was at the stand when the aircraft came in'],
  'Drove too fast on the apron': ['drove too fast on the apron', 'I was late for the next flight because we\'re short of drivers.', 'was well within the speed limit'],
  'Hit an aircraft with a vehicle': ['hit the aircraft with the vehicle', 'The guide gave me the signal to keep reversing.', 'never touched that aircraft'],
  'Threw passengers\' bags': ['threw passengers\' bags', 'The bags were heavy and the loading was running late.', 'handled every bag with care'],
  'Left a vehicle unattended': ['left the vehicle running and walked off', 'I was gone for a minute, and I thought the brake was on.', 'never left the vehicle'],
  'Missed a deadline': ['started the inspection far too late', 'The night shift handed the job over late, and there was no one to help.', 'finished the work on time; the delay was somebody else\'s'],
  'Tools left on the apron': ['left my toolbox on the apron', 'I was called away to another aircraft in the middle of the job.', 'signed every tool back in'],
  'Paperwork not signed': ['returned the aircraft to service without the paperwork', 'It was the end of a very long shift, and the work itself was done right.', 'signed all the paperwork'],
  'Late for shift': ['turned up late for my shift', 'I\'d worked a double shift the day before and fell asleep.', 'was on time; the clock-in system is wrong'],
  'Late for the flight': ['reported late for the flight', 'The crew car was stuck in traffic.', 'was on time; the captain was early'],
  'Checklist shortcuts': ['skipped part of the checklist', 'The tower was pushing for a quick departure.', 'read every line of the checklist'],
  'Unprofessional radio calls': ['was unprofessional on the radio', 'The frequency was busy and the controller kept cutting me off.', 'was completely professional on the radio'],
};
const OF_A: { [q: string]: { [att: string]: string[] } } = {
  what: {
    honest: ['I\'ll be straight with you. I {admit}. It happened the way the report says, and I\'m not proud of it.', 'It\'s true. I {admit}. I knew better, and I let the team down.', 'I messed up. There\'s no other way to put it: I {admit}, and it\'s on me.'],
    defensive: ['It wasn\'t how it sounds. {excuse} I did what I could.', 'There\'s more to it than what\'s in that report. {excuse}', 'Look, I\'m not saying it was perfect. But {excuseL}'],
    dismissive: ['Honestly? It was nothing. Someone\'s making a big deal out of a bad day.', 'Is this really why I\'m here? Everybody does it now and then.', 'I don\'t see the problem. The job got done, didn\'t it?'],
    lying: ['That\'s not what happened. I {deny}.', 'Whoever wrote that report got it wrong. I {deny}.', 'I have no idea where that came from. I {deny}, ask anyone.'],
  },
  claim: {
    honest: ['Yes. That\'s exactly what happened.', 'It\'s true. I\'m sorry.', 'Yes, it is. I won\'t pretend otherwise.'],
    defensive: ['Partly. But {excuseL}', 'Technically, yes. But {excuseL}', 'The facts are right, but not the picture. {excuse}'],
    dismissive: ['If you say so.', 'Sure. And?', 'Maybe. I don\'t really remember, it wasn\'t a big deal.'],
    lying: ['No. Absolutely not.', 'No, that never happened. Ask anyone who was on shift.', 'That\'s a lie, and I\'d like to know who\'s spreading it.'],
  },
  why: {
    honest: ['I was tired and I cut a corner. That\'s the truth.', 'I let the stress get the better of me. It\'s no excuse.', 'I wasn\'t paying attention the way I should have been.'],
    defensive: ['{excuse} Anyone would have struggled.', 'We\'re short of people. Everyone\'s stretched, and it was bound to happen to someone.', '{excuse} I\'m not the only one to blame here.'],
    dismissive: ['Things happen. It\'s an airline, not a monastery.', 'Why does anything happen? Bad luck.', 'Ask the people who make the rosters.'],
    lying: ['It didn\'t happen, so there\'s no "why".', 'There\'s nothing to explain. I did my job properly.', 'I really don\'t know what you want me to say. I did nothing wrong.'],
  },
  again: {
    honest: ['Because I\'ve learned from it. You have my word, and you\'ll see it in my work.', 'I\'ll prove it. Watch me over the next weeks, and if I slip, you can let me go.', 'I\'ve already talked to the team about it. It won\'t happen again.'],
    defensive: ['It won\'t, as long as the conditions are fair.', 'If we get the staff we need, it won\'t.', 'It won\'t. But I can\'t control everything around me.'],
    dismissive: ['You don\'t. Nobody can promise that.', 'I guess you\'ll have to trust me.', 'Does it matter? You\'ve already made up your mind.'],
    lying: ['It can\'t happen again, because it never happened in the first place.', 'There\'s nothing to repeat. My record speaks for itself.', 'It won\'t, because I\'ve always done this right.'],
  },
  keep: {
    honest: ['Because I care about this airline, and I\'m good at what I do when I do it right. I\'m asking for a second chance.', 'Because I own my mistakes. You won\'t find many who do.', 'Because I\'ve been here {years}, and this is the first time I\'ve let you down like this.'],
    defensive: ['Because I\'m one of the few who actually turns up and works hard. Look at the others.', 'Because you\'d struggle to replace me. You know that.', 'Because I\'m not the problem here. The system is.'],
    dismissive: ['Do what you want. There are other airlines.', 'I don\'t have to beg for my job.', 'If you don\'t want me here, just say so.'],
    lying: ['Because I\'ve never done anything wrong, and I\'m not going to start now.', 'Because my record is spotless, and this report is a mistake.', 'Because everyone will tell you I\'m the best on the team.'],
  },
};
const OF_TELL: { [att: string]: string[] } = {
  honest: ['Looks you in the eye.', 'Lowers their head for a moment.', 'Speaks quietly, without hesitating.'],
  defensive: ['Spreads their hands.', 'Shifts in the chair.', 'Talks a little faster.'],
  dismissive: ['Leans back with their arms crossed.', 'Shrugs.', 'Glances at the window, bored.'],
  lying: ['Glances away as they answer.', 'Answers a little too quickly.', 'Touches their face, then looks back at you.'],
};
const OF_REACT: { [d: string]: { [att: string]: string[] } } = {
  keep: { honest: ['Thank you. I won\'t let you down.', 'Thank you for hearing me out. It means a lot.'], defensive: ['Thank you. I\'m glad you see it my way.', 'Good. Thank you.'], dismissive: ['Right. Can I go now?', 'Fine.'], lying: ['Thank you. I knew you\'d see it was a mistake.', 'Good. I told you, there was nothing to it.'] },
  discipline: { honest: ['I understand. I deserved that.', 'That\'s fair. Thank you for the chance.'], defensive: ['I think that\'s unfair, but I\'ll accept it.', 'If you say so. I still think it\'s not all on me.'], dismissive: ['Whatever.', 'Fine. Write it down, then.'], lying: ['This is wrong. But fine.', 'You\'re making a mistake, but I\'ll sign it.'] },
  dismiss: { honest: ['I understand. I\'m sorry it ended like this.', 'I see. Thank you for the years.'], defensive: ['You\'re making a mistake. This place won\'t run without people like me.', 'That\'s it? After everything?'], dismissive: ['Good. I was leaving anyway.', 'Your loss.'], lying: ['You\'ll regret this.', 'I did nothing wrong, and you know it.'] },
};
function ofPick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function ofFill(s: string): string {
  const R = OfficeRoom, inc = R.inc, p = R.p, ad = OF_ADMIT[inc.title] || ['did what the report says', 'It was a difficult day.', 'did nothing wrong'];
  const det = typeof conductDetail === 'function' ? conductDetail(inc, p) : null, yrs = Math.max(1, Math.round(serviceYears(p)));
  const did = det && det.did ? det.did.charAt(0).toLowerCase() + det.did.slice(1) : inc.text.charAt(0).toLowerCase() + inc.text.slice(1);
  return s.replace(/\{admit\}/g, ad[0]).replace(/\{excuseL\}/g, ad[1].charAt(0).toLowerCase() + ad[1].slice(1)).replace(/\{excuse\}/g, ad[1]).replace(/\{deny\}/g, ad[2])
    .replace(/\{years\}/g, `${yrs} ${yrs === 1 ? 'year' : 'years'}`).replace(/\{did\}/g, did.replace(/\.$/, '.'));
}
function ofSay(who: string, text: string, title?: string, tell?: string) {
  const R = OfficeRoom, b = R.root.querySelector('.ct-box') as HTMLElement; b.hidden = false;
  (b.querySelector('.ct-who b') as HTMLElement).textContent = who === 'you' ? 'You' : who || ''; (b.querySelector('.ct-who small') as HTMLElement).textContent = title || '';
  (b.querySelector('.ct-text') as HTMLElement).textContent = text; (b.querySelector('.of-tell') as HTMLElement).textContent = tell || '';
  (b.querySelector('.ct-say') as HTMLElement).innerHTML = ''; (b.querySelector('.ct-opts') as HTMLElement).innerHTML = ''; (b.querySelector('.ct-ctl') as HTMLElement).innerHTML = '';
}
function ofInterviewStart() {
  const R = OfficeRoom, p = R.p;
  ofSay(p.name, R.vis.attitude === 'dismissive' ? 'You wanted to see me.' : R.vis.attitude === 'honest' ? 'Thank you for seeing me. I think I know what this is about.' : 'You wanted to see me?', `${ROLE_NAMES[personRole(p)]}, ${p.base}`);
  ofQuestions();
}
function ofQuestions() {
  const R = OfficeRoom, b = R.root.querySelector('.ct-box') as HTMLElement;
  const left = OF_Q.filter(q => R.asked.indexOf(q[0]) < 0);
  (b.querySelector('.ct-opts') as HTMLElement).innerHTML = left.map(q => `<button class="ct-opt" data-of="ask" data-k="${q[0]}">${esc(ofFill(q[1]))}</button>`).join('');
  const p = R.p, strong = (p.warnings || 0) >= 1;
  (b.querySelector('.ct-ctl') as HTMLElement).innerHTML = R.answers >= 1 ? `<span class="of-dec">Your decision:</span><button class="btn ghost" data-of="dec" data-k="keep">Keep them, no warning</button><button class="btn ghost" data-of="dec" data-k="discipline">${strong ? 'Final warning' : 'Discipline'}</button><button class="btn danger" data-of="dec" data-k="dismiss">Dismiss</button>` : '';
}
function ofAsk(k: string) {
  const R = OfficeRoom, V = R.vis, p = R.p; if (!V) return;
  R.asked.push(k); R.answers++;
  // they mostly stay in character, but not always
  const base = V.attitude, stay = base === 'honest' ? 0.85 : 0.72;
  const att = Math.random() < stay ? base : ofPick(['honest', 'defensive', 'dismissive', 'lying'].filter(a => a !== base));
  V.say = att;
  const lines = OF_A[k][att], text = ofFill(ofPick(lines)), tell = ofPick(OF_TELL[att]);
  ofSay(p.name, text, `${ROLE_NAMES[personRole(p)]}, ${p.base}`, tell);
  R.talkUntil = (performance.now() - R.t0) / 1000 + Math.max(2.5, text.split(/\s+/).length * 0.36);
  R.flush = att === 'dismissive' || (att === 'defensive' && Math.random() < 0.4);
  const voice = `pax|${p.sex === 'f' ? 'f' : 'm'}|${att === 'honest' ? 'sorry' : att === 'dismissive' ? 'angry' : 'neutral'}|${p.name}`;
  (R.root.querySelector('.ct-say') as HTMLElement).innerHTML = voiceButton(text, voice, 'Play');
  if ((State.settings as any).officeAutoVoice) { try { Voice.stop(); Voice.speak(text, undefined, voice); } catch (e) { /* no voice */ } }
  (R.inc as any).interview = { attitude: base, answers: R.answers, at: Date.now() };
  ofQuestions();
}
function ofDecide(k: string) {
  const R = OfficeRoom, inc = R.inc, p = R.p, V = R.vis; if (R.decided) return; R.decided = true; Voice.stop();
  const att = (V && V.attitude) || 'defensive', text = ofPick(OF_REACT[k][att]);
  ofSay(p.name, text, k === 'keep' ? 'Kept on, no warning' : k === 'discipline' ? ((p.warnings || 0) >= 1 ? 'Final warning' : 'Disciplined') : 'Dismissed');
  if (V) V.say = att;
  R.talkUntil = (performance.now() - R.t0) / 1000 + 3; R.flush = k !== 'keep' && att !== 'honest';
  const voice = `pax|${p.sex === 'f' ? 'f' : 'm'}|${k === 'dismiss' && att !== 'honest' ? 'angry' : att === 'honest' ? 'sorry' : 'neutral'}|${p.name}`;
  (R.root.querySelector('.ct-say') as HTMLElement).innerHTML = voiceButton(text, voice, 'Play');
  if ((State.settings as any).officeAutoVoice) { try { Voice.speak(text, undefined, voice); } catch (e) { /* no voice */ } }
  // the decision itself, as on the report
  const el = { getAttribute: (a: string) => a === 'data-id' ? inc.id : a === 'data-strong' ? ((p.warnings || 0) >= 1 ? '1' : '0') : null } as any;
  const keepToast = toast; void keepToast;
  try {
    if (k === 'keep') { inc.status = 'excused' as any; try { staffMoodAdd(p, att === 'honest' ? 8 : 4); } catch (e) { /* ignore */ } Store.save(); }
    else if (k === 'discipline') { const ca = closeAll; (window as any).closeAll = () => { /* stay in the office */ }; try { ACTIONS.discipline(el, null); } finally { (window as any).closeAll = ca; } if (att === 'honest') { p.learned = (p.learned || 0) + 1; Store.save(); } }
    else { const ca = closeAll; (window as any).closeAll = () => { /* stay in the office */ }; try { ACTIONS['dismiss-inc'](el, null); } finally { (window as any).closeAll = ca; } }
  } catch (e) { /* decided anyway */ }
  try { closeAll(); } catch (e) { /* none */ }
  setTimeout(() => ofExit(), 2600);
  (R.root.querySelector('.ct-ctl') as HTMLElement).innerHTML = '';
}
function ofClick(b: HTMLElement) {
  const k = b.getAttribute('data-of');
  if (k === 'leave') ofLeave();
  else if (k === 'ask') { Voice.stop(); ofAsk(b.getAttribute('data-k')); }
  else if (k === 'dec') ofDecide(b.getAttribute('data-k'));
  else if (k === 'spot') { const s = b.getAttribute('data-k'); if (s === 'sit') ofSit(); else ofSpot(s); }
}

ACTIONS['office-open'] = () => { closeAll(); OfficeRoom.open(); };
ACTIONS['office-invite'] = el => { const inc = ((State as any).incidents || []).filter((x: any) => x.id === el.getAttribute('data-id'))[0]; if (!inc) return; closeAll(); OfficeRoom.open(inc); };
