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
function cabinGeometry(s: ShapeSpec, sy: number): { eye: number[]; tip: number[]; win: number[] } {
  const W = s.wing, semi = s.span / 2, rootY = s.w / 2 * 0.9;
  const tipX = W.x + (semi - rootY) * Math.tan(W.sweep * D2R) + W.tip * 0.5;
  const tipZ = s.ground + W.z * s.h + (semi - rootY) * Math.tan(W.dih * D2R) + 0.2;
  // the seat: a little ahead of the wing tip's line, inside the window row, set back from the wall
  const seatX = clamp(tipX - semi * 0.5, s.win.from + 0.8, s.win.to - 0.8), eyeY = sy * Math.max(0.35, s.w / 2 - 0.85), eyeZ = s.ground + s.h * 0.57;
  const eye = [seatX, eyeY, eyeZ], tip = [tipX, sy * semi, tipZ];
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
  const wall = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(2.6, 1.9, 0.08), rr(ww + 0.16, wh + 0.2, r + 0.08)), { depth: 0.02, bevelEnabled: false }), mWall);
  wall.position.z = 0.02; g.add(wall);
  const bezel = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(ww + 0.17, wh + 0.21, r + 0.085), rr(ww + 0.02, wh + 0.03, r + 0.01)), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }), mBezel);
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
      const geo = new T.ExtrudeGeometry(sh, { depth: 2.6, bevelEnabled: false }); geo.translate(0, 0, -1.3); geo.rotateY(Math.PI / 2);
      bin = new T.Mesh(geo, mBin); bin.position.set(0, wh / 2 + 0.4, 0.02);
    } else { bin = new T.Mesh(new T.BoxGeometry(2.6, binH, binD), mBin); bin.position.set(0, wh / 2 + 0.4 + binH / 2, 0.02 + binD / 2); }
    g.add(bin);
    // the door seams of the bins and the passenger service strip with its reading lights
    for (let k = -1; k <= 1; k++) { const seam = new T.Mesh(new T.BoxGeometry(0.008, binH * 0.9, 0.01), mTrim); seam.position.set(k * 0.85, wh / 2 + 0.4 + binH * 0.5, binD + 0.035); g.add(seam); }
    const psu = new T.Mesh(new T.BoxGeometry(2.6, 0.03, 0.2), mat(0xDCD8D0, 0.6, 0.25)); psu.position.set(0, wh / 2 + 0.39, binD * 0.75); g.add(psu);
    const strip = new T.Mesh(new T.BoxGeometry(2.6, 0.012, 0.03), new T.MeshBasicMaterial({ color: st.mood })); strip.material.userData.noDim = true; strip.position.set(0, wh / 2 + 0.38, 0.06); g.add(strip);
    V3dCabin.mood = strip;
  }
  // the sidewall's lower part and the armrest, the seat in front (its back and headrest)
  const dado = new T.Mesh(new T.BoxGeometry(2.6, 0.5, 0.06), mWall); dado.position.set(0, -wh / 2 - 0.62, 0.06); dado.rotation.x = 0.15; g.add(dado);
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

/** Each frame in a window view: the camera at the seat, fixed, aimed at the wing tip; the cabin around it. */
function v3dCabinCam(P: any, mode: string) {
  const T = THREE, s = shapeOf(P.type), sy = mode === 'winL' ? -1 : 1, body = P.model.userData.body; if (!body) return;
  const G = cabinGeometry(s, sy), key = P.id + '|' + P.type + '|' + sy;
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
  V3dCabin.grp.traverse((m: any) => { if (m.material && m.material.isMeshStandardMaterial) { if (!m.material.userData.c0) m.material.userData.c0 = m.material.color.clone(); m.material.color.copy(m.material.userData.c0).multiplyScalar(0.35 + 0.65 * Math.min(1, amb)); m.material.emissive = m.material.emissive || new T.Color(); m.material.emissive.setHex(0x5A4A36); m.material.emissiveIntensity = 0.12 + 0.5 * night; } });
}
/** Leaving a window view: the aircraft as it was, the camera's near limit back. */
function v3dCabinLeave(P: any) {
  if (V3dCabin.grp) V3dCabin.grp.visible = false;
  const body = P && P.model && P.model.userData.body;
  if (body) { body.traverse((o: any) => { if (o.userData && o.userData.fus) o.visible = true; }); if (body.userData.cabin) body.userData.cabin.visible = true; }
  if ((V3d as any).nearWas) { V3d.cam.near = (V3d as any).nearWas; (V3d as any).nearWas = 0; V3d.cam.updateProjectionMatrix(); }
}
