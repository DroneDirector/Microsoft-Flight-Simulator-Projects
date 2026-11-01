/* The cabin window views (3D view → Window L / Window R): you sit in a window seat over the wing and look
 * out of the side window, with the wing tip in the middle of the window. Around it, the cabin: the wall
 * panel with the window's deep rounded frame, the pulled-up shade, the overhead bin above, the seat in
 * front and the armrest. Built once for the aircraft type and side, simply enough for any tablet. */

const V3dCabin: any = { key: '', grp: null };

/** How each family's cabin looks, after the real ones (our own drawing, no makers' designs copied):
 *  window size (m) and corner rounding, the shade, the overhead bins, the walls' and seats' colours and the
 *  mood light. */
interface CabinStyle { ww: number; wh: number; round: number; shade: 'blind' | 'dim' | 'none'; bin: 'square' | 'sculpted' | 'pivot' | 'small' | 'none'; wall: number; trim: number; seat: number; head: number; mood: number; ceil: number }
const CABIN_STYLES: { [k: string]: CabinStyle } = {
  airbus: { ww: 0.23, wh: 0.33, round: 0.4, shade: 'blind', bin: 'square', wall: 0xE4E2DD, trim: 0x9AA0A8, seat: 0x2B3E5C, head: 0xA9B9CC, mood: 0xFFE9C8, ceil: 2.15 },     // A320 family: tall flat-sided bins, squarer windows
  a350: { ww: 0.28, wh: 0.39, round: 0.45, shade: 'blind', bin: 'sculpted', wall: 0xECEBE7, trim: 0xB3B8BE, seat: 0x33475F, head: 0xB7C4D2, mood: 0xF2E6FF, ceil: 2.3 },   // wide body, larger windows, smooth bins, softer mood light
  b737: { ww: 0.25, wh: 0.35, round: 0.48, shade: 'blind', bin: 'pivot', wall: 0xE9E8E4, trim: 0x8E949C, seat: 0x23324A, head: 0x9FB3CA, mood: 0xBFD8FF, ceil: 2.1 },     // sculpted sidewalls, pivoting bins, blue-white sky lighting
  b777: { ww: 0.26, wh: 0.38, round: 0.5, shade: 'blind', bin: 'sculpted', wall: 0xE7E5E0, trim: 0xA1A6AD, seat: 0x2A3A55, head: 0xA6B6C9, mood: 0xFFF0DA, ceil: 2.35 },
  b787: { ww: 0.27, wh: 0.47, round: 0.5, shade: 'dim', bin: 'sculpted', wall: 0xEEEDEA, trim: 0xAAB0B7, seat: 0x2E3D57, head: 0xB0C0D2, mood: 0xD9E6FF, ceil: 2.4 },       // the tall windows with electronic dimming, no blinds
  b747: { ww: 0.25, wh: 0.36, round: 0.5, shade: 'blind', bin: 'sculpted', wall: 0xE6E3DD, trim: 0x9EA3AA, seat: 0x2C3A52, head: 0xA4B4C7, mood: 0xFFEFD8, ceil: 2.35 },
  crj: { ww: 0.21, wh: 0.29, round: 0.48, shade: 'blind', bin: 'small', wall: 0xE2E0DB, trim: 0x8F959C, seat: 0x313B48, head: 0x9AA6B4, mood: 0xFFE8CC, ceil: 1.9 },         // regional jet: low ceiling, small bins
  atr: { ww: 0.24, wh: 0.3, round: 0.45, shade: 'blind', bin: 'small', wall: 0xE5E3DE, trim: 0x8F959C, seat: 0x2B4060, head: 0xA0B2C6, mood: 0xFFE8CC, ceil: 1.95 },         // turboprop: wing above, small bins
  utility: { ww: 0.36, wh: 0.3, round: 0.35, shade: 'none', bin: 'none', wall: 0xC9CCD0, trim: 0x6C7178, seat: 0x3C3F44, head: 0x5A5E64, mood: 0xFFFFFF, ceil: 1.45 },
  ga: { ww: 0.42, wh: 0.34, round: 0.3, shade: 'none', bin: 'none', wall: 0xBFC3C8, trim: 0x5F646B, seat: 0x4A3E33, head: 0x5E5145, mood: 0xFFFFFF, ceil: 1.25 },
};
function cabinStyle(s: ShapeSpec): CabinStyle { return CABIN_STYLES[s.cockpit] || CABIN_STYLES.airbus; }

/** The eye and the window, in the model's own coordinates (aircraft axes: x back from the nose, y right, z up). */
function cabinGeometry(s: ShapeSpec, sy: number, measured?: number[]): { eye: number[]; tip: number[]; win: number[] } {
  const W = s.wing, semi = s.span / 2, rootY = s.w / 2 * 0.9;
  const tipX = W.x + (semi - rootY) * Math.tan(W.sweep * D2R) + W.tip * 0.5;
  const tipZ = s.ground + W.z * s.h + (semi - rootY) * Math.tan(W.dih * D2R) + 0.2;
  // the seat: a little ahead of the wing tip's line, inside the window row, set back from the wall
  const seatX = clamp(tipX - semi * 0.5, s.win.from + 0.8, s.win.to - 0.8), eyeY = sy * Math.max(0.3, s.w / 2 - 1.0), eyeZ = s.ground + s.h * 0.57;
  const eye = [seatX, eyeY, eyeZ], tip = measured || [tipX, sy * semi, tipZ];
  if (measured) eye[0] = clamp(measured[0] - Math.abs(measured[1]) * 0.5, s.win.from + 0.8, s.win.to - 0.8);
  // the window: where the line from the eye to the wing tip passes through the cabin wall
  const wallY = sy * (s.w / 2 - 0.22), t = (wallY - eye[1]) / (tip[1] - eye[1]);
  const win = [eye[0] + (tip[0] - eye[0]) * t, wallY, eye[2] + (tip[2] - eye[2]) * t];
  return { eye, tip, win };
}

function cabinBuild(s: ShapeSpec, sy: number, win: number[]): any {
  const T = THREE, g = new T.Group(), st = cabinStyle(s);
  const ww = st.ww, wh = st.wh, r = Math.min(ww, wh) * st.round;
  const rr = (w: number, h: number, rad: number) => { const p = new T.Path(); p.moveTo(-w / 2 + rad, -h / 2); p.lineTo(w / 2 - rad, -h / 2); p.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad); p.lineTo(w / 2, h / 2 - rad); p.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2); p.lineTo(-w / 2 + rad, h / 2); p.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad); p.lineTo(-w / 2, -h / 2 + rad); p.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2); return p; };
  const shapeWith = (outer: any, hole: any) => { const sh = new T.Shape(outer.getPoints(12)); sh.holes.push(new T.Path(hole.getPoints(12))); return sh; };
  const mat = (c: number, rough: number, em?: number) => { const m = new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, side: T.DoubleSide, envMapIntensity: 0.25 }); if (em) { m.emissive = new T.Color(0xFFE2B8); m.emissiveIntensity = em; } m.userData.noDim = true; return m; };
  const mWall = mat(st.wall, 0.85), mBezel = mat(0xF3F1EC, 0.5), mReveal = mat(new T.Color(st.wall).multiplyScalar(0.94).getHex(), 0.9), mShade = mat(0xEDEAE3, 0.7), mBin = mat(new T.Color(st.wall).lerp(new T.Color(0xFFFFFF), 0.35).getHex(), 0.6), mSeat = mat(st.seat, 0.95), mTrim = mat(st.trim, 0.45), mDark = mat(0x3A3D42, 0.8);
  // the wall: a large panel with the window cut out, its frame going back through the wall's thickness
  const wall = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(4.2, 2.6, 0.08), rr(ww + 0.12, wh + 0.15, r + 0.06)), { depth: 0.02, bevelEnabled: false }), mWall);
  wall.position.z = 0.02; g.add(wall);
  const bezel = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(ww + 0.13, wh + 0.16, r + 0.065), rr(ww + 0.02, wh + 0.03, r + 0.01)), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }), mBezel);
  bezel.position.z = 0.015; g.add(bezel);
  const reveal = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(ww + 0.04, wh + 0.05, r + 0.02), rr(ww, wh, r)), { depth: 0.13, bevelEnabled: false }), mReveal);
  reveal.position.z = -0.11; g.add(reveal);
  // the pane: a faint tint and a hint of the cabin's reflection
  const pane = new T.Mesh(new T.ShapeGeometry(new T.Shape(rr(ww, wh, r).getPoints(12))), new T.MeshBasicMaterial({ color: 0x9FB4C8, transparent: true, opacity: 0.08, depthWrite: false, side: T.DoubleSide }));
  pane.material.userData.noDim = true; pane.position.z = -0.1; g.add(pane);
  // the shade, pushed up most of the way, its pull lip showing at the top of the window
  if (st.shade === 'blind') {
    const shade = new T.Mesh(new T.BoxGeometry(ww + 0.01, 0.05, 0.012), mShade); shade.position.set(0, wh / 2 - 0.01, -0.02); g.add(shade);
    const lip = new T.Mesh(new T.BoxGeometry(ww * 0.45, 0.018, 0.022), mTrim); lip.position.set(0, wh / 2 - 0.035, -0.008); g.add(lip);
  } else if (st.shade === 'dim') {   // the dimming button under the window
    const btn = new T.Mesh(new T.BoxGeometry(0.03, 0.06, 0.012), mat(0x2C3138, 0.4, 0.4)); btn.position.set(0, -wh / 2 - 0.09, 0.01); g.add(btn);
  }
  // the overhead bin: above the window, coming out over the seats, with its lower lip and a reading-light strip
  if (st.bin !== 'none') {
    const big = st.bin === 'small' ? 0.7 : 1, binH = 0.42 * big, binD = 0.62 * big;
    let bin: any;
    if (st.bin === 'sculpted' || st.bin === 'pivot') {   // a rounded, curving bin door
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(binD, 0); sh.quadraticCurveTo(binD + 0.04, binH * 0.55, binD * 0.72, binH); sh.lineTo(0, binH); sh.lineTo(0, 0);
      const geo = new T.ExtrudeGeometry(sh, { depth: 4.2, bevelEnabled: false }); geo.translate(0, 0, -2.1); geo.rotateY(Math.PI / 2);
      bin = new T.Mesh(geo, mBin); bin.position.set(0, wh / 2 + 0.4, 0.02);
    } else { bin = new T.Mesh(new T.BoxGeometry(4.2, binH, binD), mBin); bin.position.set(0, wh / 2 + 0.4 + binH / 2, 0.02 + binD / 2); }
    g.add(bin);
    // the door seams of the bins and the passenger service strip with its reading lights
    for (let k = -1; k <= 1; k++) { const seam = new T.Mesh(new T.BoxGeometry(0.008, binH * 0.9, 0.01), mTrim); seam.position.set(k * 0.85, wh / 2 + 0.4 + binH * 0.5, binD + 0.035); g.add(seam); }
    const psu = new T.Mesh(new T.BoxGeometry(4.2, 0.03, 0.2), mat(0xDCD8D0, 0.6, 0.25)); psu.position.set(0, wh / 2 + 0.39, binD * 0.75); g.add(psu);
    const strip = new T.Mesh(new T.BoxGeometry(4.2, 0.012, 0.03), new T.MeshBasicMaterial({ color: st.mood })); strip.material.userData.noDim = true; strip.position.set(0, wh / 2 + 0.38, 0.06); g.add(strip);
    V3dCabin.mood = strip;
  }
  // the sidewall's lower part and the armrest, the seat in front (its back and headrest)
  const dado = new T.Mesh(new T.BoxGeometry(4.2, 0.5, 0.06), mWall); dado.position.set(0, -wh / 2 - 0.62, 0.06); dado.rotation.x = 0.15; g.add(dado);
  const arm = new T.Mesh(new T.BoxGeometry(0.62, 0.08, 0.1), mDark); arm.position.set(0.05, -wh / 2 - 0.3, 0.17); g.add(arm);
  const seatBack = new T.Mesh(new T.BoxGeometry(0.12, 0.95, 0.5), mSeat); void mShade; seatBack.position.set(-0.62, -wh / 2 - 0.12, 0.42); g.add(seatBack);
  const head = new T.Mesh(new T.BoxGeometry(0.14, 0.24, 0.42), mat(st.head, 0.95)); head.position.set(-0.62, -wh / 2 + 0.38, 0.42); g.add(head);
  // the next window along, on both sides (part of the row)
  for (const dx of [-1, 1]) {
    const pitch = Math.max(0.5, s.win.pitch || 0.53), bz = new T.Mesh(bezel.geometry, mBezel); bz.position.set(dx * pitch * 1.95, 0, 0.015); g.add(bz);
    const dk = new T.Mesh(new T.ShapeGeometry(new T.Shape(rr(ww, wh, r).getPoints(12))), mat(0xB8C4D0, 0.3)); dk.position.set(dx * pitch * 1.95, 0, -0.02); g.add(dk);
  }
  // place it: the panel's x along the fuselage, y up, z into the cabin (aircraft axes → the model's)
  const ex = _av(1, 0, 0), ey = _av(0, 0, 1), ez = _av(0, -sy, 0), o = _av(win[0], win[1], win[2]);
  const M = new T.Matrix4().makeBasis(ex, ey, ez); M.setPosition(o);
  g.matrixAutoUpdate = false; g.matrix.copy(M);
  g.traverse((m: any) => { m.renderOrder = 40; m.frustumCulled = false; });
  return g;
}

/** The wing tips as built (aircraft axes), measured from the model itself: the outermost part of each wing. */
function cabinTips(body: any): number[][] {
  const wingMat = (_acMats as any).wing, out: number[][] = [null, null], v = new THREE.Vector3();
  body.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
  for (const side of [0, 1]) {
    let best = -1e9; const pts: number[][] = [];
    body.traverse((o: any) => {
      if (!o.isMesh || o.material !== wingMat) return;
      const pos = o.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(M); const span = side ? -v.z : v.z; if (span > best - 0.6) { pts.push([v.x, -v.z, v.y, span]); if (span > best) best = span; } }
    });
    const tipPts = pts.filter(p => p[3] > best - 0.6);
    if (tipPts.length) out[side] = [tipPts.reduce((a, p) => a + p[0], 0) / tipPts.length, tipPts.reduce((a, p) => a + p[1], 0) / tipPts.length, tipPts.reduce((a, p) => a + p[2], 0) / tipPts.length];
  }
  return out;
}

/** Each frame in a window view: the camera at the seat, fixed, aimed at the wing tip; the cabin around it. */
function v3dCabinCam(P: any, mode: string) {
  const T = THREE, s = shapeOf(P.type), sy = mode === 'winL' ? -1 : 1, body = P.model.userData.body; if (!body) return;
  const key = P.id + '|' + P.type + '|' + sy;
  if (!body.userData.tips) body.userData.tips = cabinTips(body);
  const G = cabinGeometry(s, sy, body.userData.tips[sy < 0 ? 0 : 1]);
  if (V3dCabin.key !== key || !V3dCabin.grp || V3dCabin.grp.parent !== body) {
    if (V3dCabin.grp && V3dCabin.grp.parent) V3dCabin.grp.parent.remove(V3dCabin.grp);
    V3dCabin.grp = cabinBuild(s, sy, G.win); V3dCabin.key = key; body.add(V3dCabin.grp);
  }
  V3dCabin.grp.visible = true;
  // the aircraft's outside skin and its window glow would sit right in front of the eye: hidden from in here
  body.traverse((o: any) => { if (o.userData && o.userData.fus) o.visible = false; });
  if (body.userData.cabin) body.userData.cabin.visible = false;
  P.model.updateMatrixWorld(true);
  const at = body.localToWorld(_av(G.eye[0], G.eye[1], G.eye[2])), to = body.localToWorld(_av(G.tip[0], G.tip[1], G.tip[2]));
  // a small look around within the window (drag), back to the wing tip on its own
  const q = P.model.getWorldQuaternion(new T.Quaternion()), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
  const dir = to.clone().sub(at).normalize(), side = new T.Vector3().crossVectors(dir, up).normalize();
  const yaw = clamp(V3d.yaw, -0.35, 0.35), pit = clamp(V3d.pitch, -0.3, 0.3);
  dir.applyAxisAngle(up, -yaw).applyAxisAngle(side, pit);
  V3d.cam.position.copy(at); V3d.cam.up.copy(up); V3d.cam.lookAt(at.clone().add(dir)); V3d.cam.up.set(0, 1, 0);
  if (V3d.cam.fov !== 62 || V3d.cam.near > 0.03) { V3d.cam.fov = 62; (V3d as any).nearWas = (V3d as any).nearWas || V3d.cam.near; V3d.cam.near = 0.02; V3d.cam.updateProjectionMatrix(); }
  // the cabin's light: daylight from the window, warm cabin lights at night
  const night = (V3dSky as any).U ? (V3dSky as any).U.uNight.value : 0, amb = (V3dSky as any).amb || 1;
  const warm = new T.Color(0xFFD9A8);
  V3dCabin.grp.traverse((m: any) => {
    const mt = m.material; if (!mt || !mt.isMeshStandardMaterial) return;
    if (!mt.userData.c0) mt.userData.c0 = mt.color.clone();
    // daylight through the windows by day, the cabin's own warm lights at night
    mt.color.copy(mt.userData.c0).multiplyScalar(0.55 + 0.45 * Math.min(1, amb));
    mt.emissive.copy(mt.userData.c0).lerp(warm, 0.35 + 0.4 * night); mt.emissiveIntensity = 0.32 + 0.2 * night;
  });
}
/** Leaving a window view: the aircraft as it was, the camera's near limit back. */
function v3dCabinLeave(P: any) {
  if (V3dCabin.grp) V3dCabin.grp.visible = false;
  const body = P && P.model && P.model.userData.body;
  if (body) { body.traverse((o: any) => { if (o.userData && o.userData.fus) o.visible = true; }); if (body.userData.cabin) body.userData.cabin.visible = true; }
  if ((V3d as any).nearWas) { V3d.cam.near = (V3d as any).nearWas; (V3d as any).nearWas = 0; V3d.cam.updateProjectionMatrix(); }
}

/* ---------- the cabin, looking forward ---------- */
// From the back of the cabin, standing in the aisle: every row of seats as the aircraft is laid out
// (the same seat numbers as the passenger list), the overhead bins, the windows and the lights, and the
// passengers in their own seats, each with their own look (skin, hair, clothes; children smaller), with
// pets travelling in the cabin on their owners' laps. People are drawn in a handful of shared shapes
// (instanced), so even a full wide-body stays quick. Settings → Graphics → Passengers in the cabin.

const V3dCabinF: any = { key: '', grp: null };
const _people: any = {};
function cabinPeopleOn(): boolean { return (State.settings as any).v3dCabinPax !== false; }

/** Seats across, in blocks between the aisles, for a cabin this wide (matching the passenger list's letters). */
function cabinBlocks(abreast: number): number[] { return abreast >= 10 ? [3, 4, 3] : abreast === 9 ? [3, 3, 3] : abreast === 8 ? [2, 4, 2] : abreast === 7 ? [2, 3, 2] : abreast === 6 ? [3, 3] : abreast === 5 ? [2, 3] : abreast === 4 ? [2, 2] : abreast === 3 ? [1, 2] : [1, 1]; }

function cabinFwdBuild(P: any, s: ShapeSpec, f: any): any {
  const T = THREE, g = new T.Group(), st = cabinStyle(s), t: any = acType(P.type) || {};
  const abreast = (t.seats || 150) > 250 ? 9 : (t.seats || 150) > 100 ? 6 : (t.seats || 150) > 40 ? 4 : (t.seats || 150) > 12 ? 3 : 2, blocks = cabinBlocks(abreast), letters = 'ABCDEFGHJK'.slice(0, abreast);
  const zc = s.ground + s.h / 2, ri = Math.min(s.w, s.h) / 2 - 0.12, zf = zc - ri * 0.55, x0 = Math.max(s.nose * 0.7, s.win.from - 0.6), x1 = s.win.to + 0.4, len = x1 - x0;
  const V = (x: number, y: number, z: number) => _av(x, y, z);
  const mat = (c: number, rough: number) => { const m = new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, envMapIntensity: 0.2, fog: false }); m.userData.noDim = true; return m; };
  // the shell: side walls and ceiling (seen from inside), the floor with its aisle carpet, the front wall
  const shell = new T.Mesh(new T.CylinderGeometry(ri, ri, len, 40, 1, true), mat(st.wall, 0.85)); shell.material.side = T.BackSide;
  shell.rotation.z = Math.PI / 2; shell.position.copy(V(x0 + len / 2, 0, zc)); g.add(shell);
  const floor = new T.Mesh(new T.PlaneGeometry(len, ri * 1.9).rotateX(-Math.PI / 2), mat(0x3B4250, 0.95)); floor.position.copy(V(x0 + len / 2, 0, zf)); g.add(floor);
  const front = new T.Mesh(new T.CircleGeometry(ri, 40), mat(new T.Color(st.wall).multiplyScalar(0.97).getHex(), 0.8)); front.position.copy(V(x0 + 0.01, 0, zc)); front.rotation.y = Math.PI / 2; g.add(front);
  const door = new T.Mesh(new T.PlaneGeometry(0.8, 1.9), mat(st.trim, 0.6)); door.position.copy(V(x0 + 0.03, 0, zf + 0.95)); door.rotation.y = Math.PI / 2; g.add(door);
  const exitSign = new T.Mesh(new T.BoxGeometry(0.02, 0.1, 0.32), new T.MeshBasicMaterial({ color: 0x18E070 })); exitSign.material.userData.noDim = true; exitSign.position.copy(V(x0 + 0.05, 0, zf + 2.05)); g.add(exitSign);
  // the overhead bins on both sides, with their light strip
  const M0 = new T.Matrix4(), lam2 = (c: number) => { const m = new T.MeshLambertMaterial({ color: c, fog: false }); m.userData.noDim = true; return m; };
  const binH = st.bin === 'small' ? 0.3 : 0.42, binD = st.bin === 'small' ? 0.42 : 0.6, mBin = mat(new T.Color(st.wall).lerp(new T.Color(0xFFFFFF), 0.35).getHex(), 0.6);
  if (st.bin !== 'none') for (const side of [-1, 1]) {
    const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(binD, 0); if (st.bin === 'square') sh.lineTo(binD, binH); else sh.quadraticCurveTo(binD + 0.05, binH * 0.6, binD * 0.75, binH); sh.lineTo(0, binH); sh.lineTo(0, 0);
    const geo = new T.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
    const m = new T.Mesh(geo, mBin); mBin.side = T.DoubleSide; mBin.fog = false;
    // the profile in the plane across the cabin (x inwards from the wall, y up), drawn out along the fuselage
    const wallY = ri * 0.86, zb = zc + ri * 0.28, Mb = new T.Matrix4().makeBasis(_av(0, -side, 0), new T.Vector3(0, 1, 0), new T.Vector3(1, 0, 0));
    Mb.setPosition(V(x0, side * wallY, zb)); m.matrixAutoUpdate = false; m.matrix.copy(Mb);
    g.add(m);
    const strip = new T.Mesh(new T.BoxGeometry(len, 0.015, 0.03), new T.MeshBasicMaterial({ color: st.mood })); strip.material.userData.noDim = true;
    strip.position.copy(V(x0 + len / 2, side * (wallY - binD - 0.02), zb + binH + 0.02)); g.add(strip);
    // the bins' doors: a seam every 1.5 m, and the latch strip along the lower edge
    const seams = new T.InstancedMesh(new T.BoxGeometry(0.012, binH * 0.92, 0.012), lam2(st.trim), Math.ceil(len / 1.5));
    for (let i = 0; i < seams.count; i++) { M0.compose(V(x0 + 0.75 + i * 1.5, side * (wallY - binD - 0.01), zb + binH * 0.5), new T.Quaternion(), new T.Vector3(1, 1, 1)); seams.setMatrixAt(i, M0); }
    g.add(seams);
    const latch = new T.Mesh(new T.BoxGeometry(len, 0.03, 0.03), lam2(st.trim)); latch.position.copy(V(x0 + len / 2, side * (wallY - binD + 0.01), zb + 0.04)); g.add(latch);
  }
  // the windows along both walls
  const pitch = Math.max(0.45, s.win.pitch || 0.53), nW = Math.floor((s.win.to - s.win.from) / pitch), zW = zf + 0.95;
  if (!V3dCabinF.winTex) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 96); x.fillStyle = '#fff'; x.beginPath(); (x as any).roundRect ? (x as any).roundRect(4, 4, 56, 88, 24) : x.rect(4, 4, 56, 88); x.fill(); V3dCabinF.winTex = new T.CanvasTexture(cv); }
  const winGeo = new T.PlaneGeometry(st.ww * 1.25, st.wh * 1.2), winMat = new T.MeshBasicMaterial({ color: 0xBFD6EE, alphaMap: V3dCabinF.winTex, transparent: true, fog: false }); winMat.userData.noDim = true;
  const wins = new T.InstancedMesh(winGeo, winMat, nW * 2), M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(1, 1, 1);
  let wi = 0;
  for (let i = 0; i < nW; i++) for (const side of [-1, 1]) {
    const wy = Math.sqrt(Math.max(0, ri * ri - (zW - zc) * (zW - zc))) - 0.02;
    Q.setFromEuler(new T.Euler(0, side > 0 ? 0 : Math.PI, 0)); M.compose(V(s.win.from + i * pitch, side * wy, zW), Q, S); wins.setMatrixAt(wi++, M);
  }
  g.add(wins); g.userData.wins = wins;
  // the seats, row by row, from the passenger list's layout (first class and business at the front, wider)
  const list: PaxSeat[] = f ? (() => { try { return manifestOf(f); } catch (e) { return []; } })() : [];
  const rowCls: { [r: number]: string } = {}; let maxRow = 0;
  for (const p of list) { const r = parseInt(p.seat, 10); if (r > maxRow) maxRow = r; if (!rowCls[r] || p.cls !== 'Y') rowCls[r] = p.cls; }
  const pitchOf = (c: string) => c === 'F' ? 1.5 : c === 'J' ? 1.0 : 0.79;
  let rows = Math.max(maxRow, 1), x = x0 + 1.4; const rowX: number[] = [], rowsCls: string[] = [];
  // empty seats too: as many rows as fit
  for (let r = 1; x < x1 - 1.6; r++) { const c = rowCls[r] || (r > maxRow ? 'Y' : 'Y'); rowX[r] = x; rowsCls[r] = c; x += pitchOf(c); rows = r; }
  const width = ri * 2 * 0.9, aisles = blocks.length - 1, aisleW = 0.5, seatW = (width - aisles * aisleW) / abreast;
  const seatY: number[] = []; let yy = -width / 2;
  blocks.forEach((b, bi) => { for (let k = 0; k < b; k++) { seatY.push(yy + seatW * (k + 0.5)); } yy += b * seatW + (bi < aisles ? aisleW : 0); });
  const aisleY = blocks.length > 1 ? -width / 2 + blocks[0] * seatW + aisleW / 2 : 0;
  const seatColor = new T.Color(st.seat), premColor = new T.Color(st.seat).lerp(new T.Color(0x6B5A44), 0.45), headColor = new T.Color(st.head);
  const nSeats = rows * abreast;
  // a seat seen from the side (forward is −x): cushion, a back curving to a rounded top, the shell behind;
  // drawn out across the seat's width, its edges softly rounded
  if (!V3dCabinF.seatGeo) {
    const pr = [[-0.25, 0.4], [-0.25, 0.52], [0.14, 0.56], [0.19, 0.62], [0.24, 1.06], [0.28, 1.13], [0.34, 1.14], [0.38, 1.08], [0.35, 0.6], [0.3, 0.38], [0.24, 0.12], [0.2, 0.12], [0.16, 0.36]];
    const sh = new T.Shape(pr.map(p => new T.Vector2(p[0], p[1])));
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.86, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 4 });
    geo.translate(0, 0, -0.43); geo.scale(1, 1, 1 / 0.93);   // centred across, one metre wide before scaling
    V3dCabinF.seatGeo = geo;
    const hg = new T.ExtrudeGeometry(new T.Shape([[0.15, 0.86], [0.2, 1.06], [0.235, 1.1], [0.205, 0.86]].map(p => new T.Vector2(p[0], p[1]))), { depth: 0.5, bevelEnabled: false }); hg.translate(-0.012, 0, -0.25);
    V3dCabinF.headGeo = hg;
  }
  const lam = (c: number) => { const m = new T.MeshLambertMaterial({ color: c, fog: false }); m.userData.noDim = true; return m; };
  const cush = new T.InstancedMesh(V3dCabinF.seatGeo, lam(0xFFFFFF), nSeats);
  const back = new T.InstancedMesh(new T.BoxGeometry(0.42, 0.05, 0.05), lam(0x2A2D33), nSeats * 2);   // armrests, along the seat
  const head = new T.InstancedMesh(V3dCabinF.headGeo, lam(0xFFFFFF), nSeats);
  let k = 0; const seatAt: { [k: string]: any } = {};
  for (let r = 1; r <= rows; r++) {
    const c = rowsCls[r], prem = c !== 'Y', n = prem ? Math.max(2, abreast - 2) : abreast;
    for (let i = 0; i < abreast; i++) {
      // premium rows leave out middle seats (wider seats at the window and aisle)
      const skip = prem && n < abreast && ((abreast === 6 && (i === 1 || i === 4)) || (abreast === 4 && false) || (abreast >= 9 && (i === 1 || i === abreast - 2)));
      if (skip) continue;
      const sy = seatY[i] + (prem && abreast === 6 ? (i < 3 ? 0.12 : -0.12) * (i === 0 || i === 5 ? -1 : 1) : 0), wS = prem ? seatW * 1.35 : seatW * 0.94, X = rowX[r];
      const q = new T.Quaternion(), pk = prem ? 1.25 : 1;
      M.compose(V(X, sy, zf), q, new T.Vector3(pk, pk, wS)); cush.setMatrixAt(k, M); cush.setColorAt(k, prem ? premColor : seatColor);
      M.compose(V(X, sy, zf), q, new T.Vector3(pk, pk, wS * 0.94)); head.setMatrixAt(k, M); head.setColorAt(k, headColor);
      for (const sd of [-1, 1]) { M.compose(V(X - 0.02, sy + sd * wS * 0.5, zf + 0.68), q, new T.Vector3(1, 1, 1)); back.setMatrixAt(k * 2 + (sd > 0 ? 1 : 0), M); back.setColorAt(k * 2 + (sd > 0 ? 1 : 0), new T.Color(0x2A2D33)); }
      seatAt[r + letters[i]] = { x: X, y: sy, prem }; k++;
    }
  }
  cush.count = head.count = k; back.count = k * 2;
  g.add(cush, back, head);
  // the passengers
  if (cabinPeopleOn() && list.length) g.add(cabinPeople(list, seatAt, zf, V));
  g.traverse((m: any) => { m.frustumCulled = false; m.renderOrder = 40; });
  g.userData.eye = [x1 - 0.3, aisleY, zf + 1.7]; g.userData.look = [x0 + 2, aisleY, zf + 0.7];
  return g;
}

/** The people in their seats: torso, arms, neck, head and hair, in a few shared shapes. */
function cabinPeople(list: PaxSeat[], seatAt: any, zf: number, V: (x: number, y: number, z: number) => any): any {
  const T = THREE, g = new T.Group();
  if (!_people.torso) {
    _people.torso = new T.LatheGeometry([[0.0, 0], [0.16, 0.02], [0.17, 0.2], [0.18, 0.4], [0.17, 0.5], [0.12, 0.56], [0.05, 0.58]].map(p => new T.Vector2(p[0], p[1])), 14).scale(0.68, 1, 1);   // shoulders wide across, slimmer front to back
    _people.head = new T.SphereGeometry(0.105, 16, 12).scale(0.9, 1.1, 1);
    _people.hair = new T.SphereGeometry(0.112, 16, 10, 0, Math.PI * 2, 0, 1.75).scale(0.92, 1.1, 1.02);
    _people.long = new T.CylinderGeometry(0.1, 0.12, 0.26, 12, 1, true, -Math.PI * 0.55, Math.PI * 1.1);
    _people.arm = new T.CylinderGeometry(0.045, 0.04, 0.44, 8);
    _people.neck = new T.CylinderGeometry(0.045, 0.05, 0.1, 8);
    _people.thigh = new T.CylinderGeometry(0.07, 0.06, 0.42, 8);
    _people.petBody = new T.SphereGeometry(0.1, 12, 8).scale(1.5, 0.9, 0.9);
    _people.petHead = new T.SphereGeometry(0.065, 12, 8);
    _people.ear = new T.ConeGeometry(0.025, 0.06, 6);
  }
  const ok = list.filter(p => seatAt[p.seat]);
  const n = ok.length, mk = (geo: any, count: number) => { const m = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ roughness: 0.8, metalness: 0, envMapIntensity: 0.2 }), Math.max(1, count)); m.material.userData.noDim = true; m.count = 0; g.add(m); return m; };
  const torso = mk(_people.torso, n), headM = mk(_people.head, n), hairM = mk(_people.hair, n), longM = mk(_people.long, n), arms = mk(_people.arm, n * 2), neck = mk(_people.neck, n), thighs = mk(_people.thigh, n * 2);
  const pets = ok.filter(p => p.pet && !p.pet.left && p.pet.where === 'cabin'), petB = mk(_people.petBody, pets.length), petH = mk(_people.petHead, pets.length), ears = mk(_people.ear, pets.length * 2);
  const M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), one = new T.Vector3(1, 1, 1), C = new T.Color();
  const put = (m: any, pos: any, rot: number[], sc: any, col: any) => { E.set(rot[0], rot[1], rot[2]); Q.setFromEuler(E); M.compose(pos, Q, sc); m.setMatrixAt(m.count, M); m.setColorAt(m.count, col); m.count++; };
  for (const p of ok) {
    const at = seatAt[p.seat], L = p.look || {}, kid = p.age < 12 ? 0.72 : p.age < 16 ? 0.88 : 1, fem = p.sex === 'f' ? 0.93 : 1, sc = kid * fem;
    const skin = new T.Color(SKIN_TONES[L.skin == null ? 2 : L.skin] || '#D9A07A'), hairC = new T.Color(HAIR_COLORS[L.hairColor == null ? 1 : L.hairColor] || '#3A2A1E');
    const cloth = new T.Color(UNIFORM_COLORS[L.uniform || 0] || '#2F5D8C').lerp(new T.Color(cloudHash(p.key.length * 7, p.age, 3) < 0.5 ? 0xD8D2C4 : 0x5E6A78), 0.25 + cloudHash(p.key.length, p.age, 9) * 0.4);
    const seatZ = zf + 0.5, lean = -0.17;   // leaning back into the seat
    const bx = at.x + 0.12, y = at.y;
    put(torso, V(bx, y, seatZ), [0, 0, lean], new T.Vector3(sc * (p.sex === 'f' ? 0.92 : 1), sc, sc), cloth);
    const shoulderZ = seatZ + 0.56 * sc, headX = bx + Math.sin(-lean) * 0.6 * sc;
    put(neck, V(headX, y, shoulderZ + 0.05 * sc), [0, 0, lean], new T.Vector3(sc, sc, sc), skin);
    const hp = V(headX - 0.01, y, shoulderZ + 0.16 * sc);
    put(headM, hp, [0, 0, lean * 0.5], new T.Vector3(sc, sc, sc), skin);
    if (L.hair !== 'bald' && L.hair !== 'buzz') {
      put(hairM, V(headX + 0.012, y, shoulderZ + 0.175 * sc), [0, 0, lean * 0.5 - 0.25], new T.Vector3(sc * (L.hair === 'afro' ? 1.25 : 1), sc * (L.hair === 'afro' ? 1.2 : 1), sc * (L.hair === 'afro' ? 1.25 : 1)), hairC);
      if (/long|wavy|braids|ponytail|curly/.test(L.hair || '') && p.sex === 'f') put(longM, V(headX + 0.05, y, shoulderZ + 0.04 * sc), [0, 0, lean], new T.Vector3(sc, sc, sc), hairC);
    } else if (L.hair === 'buzz') put(hairM, V(headX + 0.012, y, shoulderZ + 0.17 * sc), [0, 0, lean * 0.5 - 0.25], new T.Vector3(sc * 0.97, sc * 0.97, sc * 0.97), C.copy(hairC).lerp(skin, 0.4));
    for (const sd of [-1, 1]) {
      put(arms, V(bx - 0.06, y + sd * 0.2 * sc, seatZ + 0.3 * sc), [sd * 0.08, 0, -0.5], new T.Vector3(sc, sc, sc), cloth);
      put(thighs, V(at.x - 0.12, y + sd * 0.09 * sc, seatZ + 0.03), [0, 0, Math.PI / 2], new T.Vector3(sc, sc, sc), C.set(0x2E3540));
    }
    // a pet on the lap, looking about
    if (p.pet && !p.pet.left && p.pet.where === 'cabin') {
      const pc = new T.Color(p.pet.color || '#8B5A2B'), dog = p.pet.kind === 'dog';
      put(petB, V(at.x - 0.18, y, seatZ + 0.17), [0, 0.4, 0], new T.Vector3(dog ? 1 : 0.85, 1, 1), pc);
      put(petH, V(at.x - 0.3, y + 0.04, seatZ + 0.27), [0, 0, 0], one, pc);
      for (const sd of [-1, 1]) put(ears, V(at.x - 0.3, y + 0.04 + sd * 0.04, seatZ + 0.34), [dog ? sd * 0.5 : 0, 0, 0], new T.Vector3(1, dog ? 0.8 : 1.1, 1), pc);
    }
  }
  for (const m of g.children) { if (m.instanceMatrix) m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  return g;
}

/** Each frame in the cabin view: the camera at the back of the aisle, looking forward; a drag looks around a little. */
function v3dCabinFwdCam(P: any) {
  const T = THREE, s = shapeOf(P.type), body = P.model.userData.body; if (!body) return;
  const f = State.live.filter(x => x.id === P.id)[0] || null, key = P.id + '|' + P.type + '|' + (f ? f.pax : 0) + '|' + cabinPeopleOn();
  if (V3dCabinF.key !== key || !V3dCabinF.grp || V3dCabinF.grp.parent !== body) {
    if (V3dCabinF.grp && V3dCabinF.grp.parent) V3dCabinF.grp.parent.remove(V3dCabinF.grp);
    V3dCabinF.grp = cabinFwdBuild(P, s, f); V3dCabinF.key = key; body.add(V3dCabinF.grp);
  }
  const G = V3dCabinF.grp; G.visible = true;
  // inside, the clouds and the rain outside can't be seen (the windows show the light outside)
  try { if (V3dClouds.mesh) V3dClouds.mesh.visible = false; if (V3dWx.rain) V3dWx.rain.visible = false; if (V3dWx.snow) V3dWx.snow.visible = false; if (V3dSky.flare) (V3dSky.flare as HTMLElement).style.opacity = '0'; } catch (e) { /* none */ }
  // inside, only the cabin is drawn: the outside of this aircraft is hidden
  for (const c of body.children) if (c !== G && c.visible) { c.visible = false; (c.userData as any).hiddenForCabin = true; }
  P.model.updateMatrixWorld(true);
  const e = G.userData.eye, l = G.userData.look, at = body.localToWorld(_av(e[0], e[1], e[2])), to = body.localToWorld(_av(l[0], l[1], l[2]));
  const q = P.model.getWorldQuaternion(new T.Quaternion()), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
  const dir = to.clone().sub(at).normalize(), side = new T.Vector3().crossVectors(dir, up).normalize();
  dir.applyAxisAngle(up, -clamp(V3d.yaw, -0.9, 0.9)).applyAxisAngle(side, clamp(V3d.pitch, -0.4, 0.3));
  V3d.cam.position.copy(at); V3d.cam.up.copy(up); V3d.cam.lookAt(at.clone().add(dir)); V3d.cam.up.set(0, 1, 0);
  if (V3d.cam.fov !== 70 || V3d.cam.near > 0.03) { V3d.cam.fov = 70; (V3d as any).nearWas = (V3d as any).nearWas || V3d.cam.near; V3d.cam.near = 0.02; V3d.cam.updateProjectionMatrix(); }
  // light: daylight in the windows by day, dark windows and warm cabin light at night
  const night = (V3dSky as any).U ? (V3dSky as any).U.uNight.value : 0, amb = (V3dSky as any).amb || 1, warm = new T.Color(0xFFD9A8);
  G.traverse((m: any) => {
    const mt = m.material; if (!mt) return;
    if (mt.isMeshLambertMaterial) { if (!mt.emissive) return; mt.emissive.setRGB(0.1 + 0.12 * night, 0.09 + 0.1 * night, 0.08 + 0.07 * night); return; }
    if (!mt.isMeshStandardMaterial) return;
    if (!mt.userData.c0) mt.userData.c0 = mt.color.clone();
    mt.color.copy(mt.userData.c0).multiplyScalar(0.7 + 0.3 * Math.min(1, amb)); mt.emissive.copy(mt.userData.c0).lerp(warm, 0.3 + 0.4 * night); mt.emissiveIntensity = 0.22 + 0.15 * night;
  });
  if (G.userData.wins) { const sky = night > 0.5 ? new T.Color(0x0B1220) : new T.Color(0xBFD6EE).multiplyScalar(Math.max(0.3, Math.min(1, amb))); G.userData.wins.material.color.copy(sky); }
}
function v3dCabinFwdLeave(P: any) {
  if (V3dCabinF.grp) V3dCabinF.grp.visible = false;
  const body = P && P.model && P.model.userData.body;
  if (body) for (const c of body.children) if ((c.userData as any).hiddenForCabin) { c.visible = true; (c.userData as any).hiddenForCabin = false; }
  if ((V3d as any).nearWas) { V3d.cam.near = (V3d as any).nearWas; (V3d as any).nearWas = 0; V3d.cam.updateProjectionMatrix(); }
}
