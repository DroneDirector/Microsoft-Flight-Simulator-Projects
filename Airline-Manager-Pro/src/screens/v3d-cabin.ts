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
  // the seat: inside the window row, set back from the wall
  const seatX = clamp(tipX - semi * 0.5, s.win.from + 0.8, s.win.to - 0.8), eyeY = sy * Math.max(0.3, s.w / 2 - 1.0), eyeZ = s.ground + s.h * 0.57;
  const eye = [seatX, eyeY, eyeZ], tip = measured || [tipX, sy * semi, tipZ];
  // the seat right abeam the wing tip: looking straight out through the window, square to it, with the tip in the middle
  eye[0] = clamp(tip[0], s.win.from + 0.8, s.win.to - 0.8);
  // the window: where the line from the eye to the wing tip passes through the cabin wall
  const wallY = sy * (s.w / 2 - 0.22), t = (wallY - eye[1]) / (tip[1] - eye[1]);
  const win = [eye[0] + (tip[0] - eye[0]) * t, wallY, eye[2] + (tip[2] - eye[2]) * t];
  return { eye, tip, win };
}

function cabinBuild(s: ShapeSpec, sy: number, win: number[]): any {
  const T = THREE, g = new T.Group(), st = cabinStyle(s);
  const ww = st.ww, wh = st.wh, r = Math.min(ww, wh) * st.round;
  const rr = (w: number, h: number, rad: number) => { const p = new T.Path(); p.moveTo(-w / 2 + rad, -h / 2); p.lineTo(w / 2 - rad, -h / 2); p.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad); p.lineTo(w / 2, h / 2 - rad); p.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2); p.lineTo(-w / 2 + rad, h / 2); p.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad); p.lineTo(-w / 2, -h / 2 + rad); p.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2); return p; };
  const shapeWith = (outer: any, hole: any) => { const n = cabinQv([12, 24, 40, 64]), sh = new T.Shape(outer.getPoints(n)); sh.holes.push(new T.Path(hole.getPoints(n))); return sh; };
  const mat = (c: number, rough: number, em?: number) => { const m = cabinMat(c, { side: T.DoubleSide }); if (em) { m.emissive = new T.Color(0xFFE2B8); m.emissiveIntensity = em; } void rough; return m; };
  const mWall = cabinMat(st.wall, { side: T.DoubleSide, map: (() => { const t = cabinSatinTex().clone(); t.needsUpdate = true; t.repeat.set(6, 3.4); return t; })() }), mBezel = mat(0xF3F1EC, 0.5), mReveal = mat(new T.Color(st.wall).multiplyScalar(0.94).getHex(), 0.9), mShade = mat(0xEDEAE3, 0.7), mBin = cabinMat(new T.Color(st.wall).lerp(new T.Color(0xFFFFFF), 0.35).getHex(), { side: T.DoubleSide, map: cabinSatinTex() }), mSeat = cabinMat(st.seat, { side: T.DoubleSide, map: cabinFabricTex() }), mTrim = mat(st.trim, 0.45), mDark = mat(0x3A3D42, 0.8);
  // the wall: a large panel with the window cut out, its frame going back through the wall's thickness
  const wall = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(8, 4.6, 0.01), rr(ww + 0.12, wh + 0.15, r + 0.06)), { depth: 0.02, bevelEnabled: false }), mWall);
  // the rest of the cabin around the seat, closed all round (only the window looks out), so no sky shows through a gap
  const roomM = [mWall, mWall, cabinMat(0xEDEEEF, { side: T.BackSide }), cabinMat(0x3A3F48, { side: T.BackSide, map: cabinCarpetTex() }), mWall, new T.MeshBasicMaterial({ visible: false })];
  const room = new T.Mesh(new T.BoxGeometry(8, 4, 3), roomM); room.position.set(0, 0.3, 0.03 + 1.5); g.add(room);
  wall.position.z = 0.02; g.add(wall);
  const bezel = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(ww + 0.13, wh + 0.16, r + 0.065), rr(ww + 0.02, wh + 0.03, r + 0.01)), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }), mBezel);
  bezel.position.z = 0.015; g.add(bezel);
  const reveal = new T.Mesh(new T.ExtrudeGeometry(shapeWith(rr(ww + 0.04, wh + 0.05, r + 0.02), rr(ww, wh, r)), { depth: 0.13, bevelEnabled: false }), mReveal);
  reveal.position.z = -0.11; g.add(reveal);
  // the pane: a faint tint and a hint of the cabin's reflection
  const pane = new T.Mesh(new T.ShapeGeometry(new T.Shape(rr(ww, wh, r).getPoints(cabinQv([12, 24, 40, 64])))), new T.MeshBasicMaterial({ color: 0x9FB4C8, transparent: true, opacity: 0.08, depthWrite: false, side: T.DoubleSide }));
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
      const geo = new T.ExtrudeGeometry(sh, { depth: 8, bevelEnabled: false, curveSegments: cabinQv([6, 12, 24, 48]) }); geo.translate(0, 0, -4); geo.rotateY(Math.PI / 2);
      bin = new T.Mesh(geo, mBin); bin.position.set(0, wh / 2 + 0.4, 0.02);
    } else { bin = new T.Mesh(new T.BoxGeometry(8, binH, binD), mBin); bin.position.set(0, wh / 2 + 0.4 + binH / 2, 0.02 + binD / 2); }
    g.add(bin);
    // the door seams of the bins and the passenger service strip with its reading lights
    for (let k = -1; k <= 1; k++) { const seam = new T.Mesh(new T.BoxGeometry(0.008, binH * 0.9, 0.01), mTrim); seam.position.set(k * 0.85, wh / 2 + 0.4 + binH * 0.5, binD + 0.035); g.add(seam); }
    const psu = new T.Mesh(new T.BoxGeometry(8, 0.03, 0.2), mat(0xDCD8D0, 0.6, 0.25)); psu.position.set(0, wh / 2 + 0.39, binD * 0.75); g.add(psu);
    const strip = new T.Mesh(new T.BoxGeometry(8, 0.012, 0.03), new T.MeshBasicMaterial({ color: st.mood })); strip.material.userData.noDim = true; strip.position.set(0, wh / 2 + 0.38, 0.06); g.add(strip);
    V3dCabin.mood = strip;
  }
  // the sidewall's lower part and the armrest, the seat in front (its back and headrest)
  const dado = new T.Mesh(new T.BoxGeometry(8, 0.5, 0.06), mWall); dado.position.set(0, -wh / 2 - 0.62, 0.06); dado.rotation.x = 0.15; g.add(dado);
  const arm = new T.Mesh(new T.BoxGeometry(0.62, 0.08, 0.1), mDark); arm.position.set(0.05, -wh / 2 - 0.3, 0.17); g.add(arm);
  const seatBack = new T.Mesh(new T.BoxGeometry(0.12, 0.95, 0.5), mSeat); void mShade; seatBack.position.set(-0.62, -wh / 2 - 0.12, 0.42); g.add(seatBack);
  const head = new T.Mesh(new T.BoxGeometry(0.14, 0.24, 0.42), cabinMat(st.head, { map: cabinLeatherTex() })); head.position.set(-0.62, -wh / 2 + 0.38, 0.42); g.add(head);
  // the next window along, on both sides (part of the row)
  for (const dx of [-1, 1]) {
    const pitch = Math.max(0.5, s.win.pitch || 0.53), bz = new T.Mesh(bezel.geometry, mBezel); bz.position.set(dx * pitch * 1.95, 0, 0.015); g.add(bz);
    const dk = new T.Mesh(new T.ShapeGeometry(new T.Shape(rr(ww, wh, r).getPoints(cabinQv([12, 24, 40, 64])))), mat(0xB8C4D0, 0.3)); dk.position.set(dx * pitch * 1.95, 0, -0.02); g.add(dk);
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

/** How close to the window you sit in the window views: 0 in your seat, 1 as close as it goes (kept). */
function cabinWinZoom(): number { const v = (State.settings as any).v3dWinZoom; return v == null ? 0 : clamp(+v, 0, 1); }
function cabinWinZoomSet(v: number) {
  (State.settings as any).v3dWinZoom = clamp(v, 0, 1); Store.soon();
  const el = V3d.root && V3d.root.querySelector('.v3d-wz') as HTMLInputElement; if (el && document.activeElement !== el) el.value = String(Math.round(cabinWinZoom() * 100));
}
document.addEventListener('input', e => { const el = e.target as HTMLInputElement; if (el && el.classList && el.classList.contains('v3d-wz')) cabinWinZoomSet(+el.value / 100); });

/** Each frame in a window view: the camera at the seat, fixed, aimed at the wing tip; the cabin around it. */
function v3dCabinCam(P: any, mode: string) {
  const T = THREE, s = shapeOf(P.type), sy = mode === 'winL' ? -1 : 1, body = P.model.userData.body; if (!body) return;
  const key = P.id + '|' + P.type + '|' + sy + '|' + cabinQ();
  if (!body.userData.tips) body.userData.tips = cabinTips(body);
  const G = cabinGeometry(s, sy, body.userData.tips[sy < 0 ? 0 : 1]);
  if (V3dCabin.key !== key || !V3dCabin.grp || V3dCabin.grp.parent !== body) {
    if (V3dCabin.grp && V3dCabin.grp.parent) V3dCabin.grp.parent.remove(V3dCabin.grp);
    V3dCabin.grp = cabinBuild(s, sy, G.win); V3dCabin.key = key; body.add(V3dCabin.grp);
  }
  V3dCabin.grp.visible = true; cabinSharp(true);
  // the aircraft's outside skin and its window glow would sit right in front of the eye: hidden from in here
  body.traverse((o: any) => { if (o.userData && o.userData.fus) o.visible = false; });
  if (body.userData.cabin) body.userData.cabin.visible = false;
  P.model.updateMatrixWorld(true);
  // the zoom (slider, pinch or scroll): the seat moves up to the window along the line to the wing tip, and
  // stops a hand's width short of it, so you can never go through the window
  const perp = Math.abs(G.win[1] - G.eye[1]), kMax = perp > 0.3 ? 1 - 0.2 / perp : 0, k = cabinWinZoom() * kMax;
  const ey = [G.eye[0] + (G.win[0] - G.eye[0]) * k, G.eye[1] + (G.win[1] - G.eye[1]) * k, G.eye[2] + (G.win[2] - G.eye[2]) * k];
  const at = body.localToWorld(_av(ey[0], ey[1], ey[2])), to = body.localToWorld(_av(G.tip[0], G.tip[1], G.tip[2]));
  // a small look around within the window (drag), back to the wing tip on its own
  const q = P.model.getWorldQuaternion(new T.Quaternion()), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
  const dir = to.clone().sub(at).normalize(), side = new T.Vector3().crossVectors(dir, up).normalize();
  const yaw = clamp(V3d.yaw, -0.35, 0.35), pit = clamp(V3d.pitch, -0.3, 0.3);
  dir.applyAxisAngle(up, -yaw).applyAxisAngle(side, pit);
  V3d.cam.position.copy(at); V3d.cam.up.copy(up); V3d.cam.lookAt(at.clone().add(dir)); V3d.cam.up.set(0, 1, 0);
  if (V3d.cam.fov !== 62 || V3d.cam.near > 0.03) { V3d.cam.fov = 62; (V3d as any).nearWas = (V3d as any).nearWas || V3d.cam.near; V3d.cam.near = 0.02; V3d.cam.updateProjectionMatrix(); }
  // the cabin's light: daylight from the window, warm cabin lights at night
  const night = (V3dSky as any).U ? (V3dSky as any).U.uNight.value : 0, amb = (V3dSky as any).amb || 1;
  CabinLight.self.value = 0.55 + 0.2 * night + 0.0 * amb; CabinLight.warm.value.setRGB(1, 0.97 - 0.06 * night, 0.92 - 0.14 * night);

}
/** Leaving a window view: the aircraft as it was, the camera's near limit back. */
/** A cabin is only made while you look at it: leaving the view takes it out of the scene and frees its memory
 *  on the graphics chip (shared textures stay ready, so going back in is quick). */
function cabinFree(G: any) {
  if (!G) return;
  if (G.parent) G.parent.remove(G);
  G.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => m.dispose()); });
}
function v3dCabinLeave(P: any) {
  cabinFree(V3dCabin.grp); V3dCabin.grp = null; V3dCabin.key = ''; cabinSharp(false);
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
/** A cabin surface: lit by the cabin's own lights in its own colour (people, seats, walls keep their colours),
 *  with a little shading from the light outside on top. */
const CabinLight = { self: { value: 0.8 }, warm: { value: new THREE.Color(1, 1, 1) } };
function cabinMat(color: number, o?: any): any {
  const m = new THREE.MeshLambertMaterial(Object.assign({ color, fog: false }, o || {}));
  m.userData.noDim = true;
  // the sharpest texture filtering the graphics chip has at extreme quality (cloth and leather stay crisp at a slant)
  try { if (m.map && V3d.r) { const an = cabinQ() === 3 ? V3d.r.capabilities.getMaxAnisotropy() : cabinQ() === 2 ? 4 : 1; if (m.map.anisotropy !== an) { m.map.anisotropy = an; m.map.needsUpdate = true; } } } catch (e) { /* default filtering */ }
  m.onBeforeCompile = (sh: any) => {
    sh.uniforms.uSelf = CabinLight.self; sh.uniforms.uWarm = CabinLight.warm;
    sh.fragmentShader = 'uniform float uSelf; uniform vec3 uWarm;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uWarm * uSelf;');
  };
  return m;
}
const _people: any = {};
/** Cabin quality (Settings → Graphics → Cabin): 0 low, 1 medium, 2 high, 3 extreme. It sets how finely the
 *  curves of the bins, walls, seats, headrests and people are made, and at extreme the cabin is also drawn at
 *  the screen's full sharpness with the sharpest texture filtering. */
const CABIN_Q_NAMES = ['Low', 'Medium', 'High', 'Extreme'];
function cabinQ(): number { const v = (State.settings as any).v3dCabinQ; return v == null ? 2 : clamp(Math.round(+v), 0, 3); }
function cabinQv(v: number[]): number { return v[cabinQ()]; }
/** A smooth closed outline through the points (or the plain outline at low quality). */
function cabinSmooth(pts: number[][], n: number): any {
  const T = THREE;
  if (n <= pts.length) return pts.map(p => new T.Vector2(p[0], p[1]));
  const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], 0)), true, 'centripetal');
  return c.getSpacedPoints(n).slice(0, n).map((v: any) => new T.Vector2(v.x, v.y));
}
/** A profile drawn out in a straight line (the bins): smooth shading across the curve, so a curved door
 *  looks curved rather than a row of flat strips. pts run from the wall over the door and back underneath. */
function cabinSweep(pts: number[][], len: number): any {
  const T = THREE, n = pts.length, pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  let run = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    if (i) run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (const w of [0, len]) { pos.push(pts[i][0], pts[i][1], w); nor.push(-ty / tl, tx / tl, 0); uv.push(w / 1.2, run / 1.2); }
  }
  for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  return geo;
}
/** At extreme quality the cabin is drawn at the screen's full sharpness while you are in it. */
function cabinSharp(on: boolean) {
  const r = V3d.r; if (!r) return;
  const want = on && cabinQ() === 3 ? Math.min(window.devicePixelRatio || 1, 3) : 0;
  if (want && !(V3d as any).dprWas) { (V3d as any).dprWas = r.getPixelRatio(); r.setPixelRatio(Math.max(want, (V3d as any).dprWas)); }
  else if (!want && (V3d as any).dprWas) { r.setPixelRatio((V3d as any).dprWas); (V3d as any).dprWas = 0; }
}
function cabinPeopleOn(): boolean { return (State.settings as any).v3dCabinPax !== false; }

/** Seats across, in blocks between the aisles, for a cabin this wide (matching the passenger list's letters). */
function cabinBlocks(abreast: number): number[] { return abreast >= 10 ? [3, 4, 3] : abreast === 9 ? [3, 3, 3] : abreast === 8 ? [2, 4, 2] : abreast === 7 ? [2, 3, 2] : abreast === 6 ? [3, 3] : abreast === 5 ? [2, 3] : abreast === 4 ? [2, 2] : abreast === 3 ? [1, 2] : [1, 1]; }

function cabinFwdBuild(P: any, s: ShapeSpec, f: any): any {
  const T = THREE, g = new T.Group(), st = cabinStyle(s), t: any = acType(P.type) || {};
  const abreast = (t.seats || 150) > 250 ? 9 : (t.seats || 150) > 100 ? 6 : (t.seats || 150) > 40 ? 4 : (t.seats || 150) > 12 ? 3 : 2, blocks = cabinBlocks(abreast), letters = 'ABCDEFGHJK'.slice(0, abreast);
  const zc = s.ground + s.h / 2, ri = Math.min(s.w, s.h) / 2 - 0.12, zf = zc - ri * 0.55, x0 = Math.max(s.nose * 0.7, s.win.from - 0.6), x1 = s.win.to + 0.4, len = x1 - x0;
  const V = (x: number, y: number, z: number) => _av(x, y, z);
  const mat = (c: number, rough: number) => cabinMat(c); void 0;
  // the shell: side walls and ceiling (seen from inside), the floor with its aisle carpet, the front wall
  const shell = new T.Mesh(new T.CylinderGeometry(ri, ri, len, cabinQv([32, 64, 112, 192]), 1, true), cabinMat(0xFFFFFF, { map: cabinShellTex(st.wall, len) })); shell.material.side = T.BackSide;
  shell.rotation.z = Math.PI / 2; shell.position.copy(V(x0 + len / 2, 0, zc)); g.add(shell);
  const carpet = cabinCarpetTex().clone(); carpet.needsUpdate = true; carpet.repeat.set(len / 0.6, ri * 1.9 / 0.6);
  const floor = new T.Mesh(new T.PlaneGeometry(len, ri * 1.9).rotateX(-Math.PI / 2), cabinMat(0xFFFFFF, { map: carpet })); floor.position.copy(V(x0 + len / 2, 0, zf)); g.add(floor);
  const front = new T.Mesh(new T.CircleGeometry(ri, cabinQv([24, 40, 64, 96])), mat(0xE2E4E6, 0.8)); front.position.copy(V(x0 + 0.01, 0, zc)); front.rotation.y = Math.PI / 2; g.add(front);
  if (!V3dCabinF.curtTex) V3dCabinF.curtTex = cabinCanvas(128, 32, (gg, img, d) => { for (let y = 0; y < 32; y++) for (let x2 = 0; x2 < 128; x2++) { const v = 200 + 34 * Math.sin(x2 / 128 * Math.PI * 2 * 9) + 6 * (cloudHash(x2, y, 91) - 0.5), i = (y * 128 + x2) * 4; d[i] = v * 0.98; d[i + 1] = v * 0.94; d[i + 2] = v * 0.86; d[i + 3] = 255; } gg.putImageData(img, 0, 0); });
  const door = new T.Mesh(new T.PlaneGeometry(1.0, 1.95), cabinMat(0xFFFFFF, { map: V3dCabinF.curtTex })); door.position.copy(V(x0 + 0.05, 0, zf + 0.98)); door.rotation.y = Math.PI / 2; g.add(door);   // the galley curtain
  const exitSign = new T.Mesh(new T.BoxGeometry(0.02, 0.1, 0.32), new T.MeshBasicMaterial({ color: 0x18E070 })); exitSign.material.userData.noDim = true; exitSign.position.copy(V(x0 + 0.05, 0, zf + 2.05)); g.add(exitSign);
  // the overhead bins on both sides, with their light strip
  const M0 = new T.Matrix4(), lam2 = (c: number) => cabinMat(c);
  const binH = st.bin === 'small' ? 0.3 : 0.42, binD = st.bin === 'small' ? 0.42 : 0.6, mBin = cabinMat(0xF6F7F8, { map: cabinSatinTex() });
  if (st.bin !== 'none') for (const side of [-1, 1]) {
    // the bin: a big rounded door bulging into the cabin from the ceiling down to a lip over the seats
    const bh = binH * 1.2, bd = binD * 1.04, N = cabinQv([6, 12, 24, 48]), prof: number[][] = [];
    const bez = (p0: number[], p1: number[], p2: number[], p3: number[], m: number, first: boolean) => { for (let i = first ? 0 : 1; i <= m; i++) { const t = i / m, u = 1 - t; prof.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } };
    // up in the ceiling, then the door's long convex sweep down into the cabin, a rounded lip, and the flat underside back to the wall
    bez([0, bh + 0.07], [bd * 0.12, bh + 0.07], [bd * 0.22, bh + 0.065], [bd * 0.32, bh + 0.05], Math.max(2, N >> 2), true);
    bez([bd * 0.32, bh + 0.05], [bd * 0.78, bh * 0.98], [bd * 1.03, bh * 0.62], [bd, bh * 0.16], N, false);
    bez([bd, bh * 0.16], [bd * 0.995, bh * 0.04], [bd * 0.985, 0], [bd * 0.92, 0], Math.max(3, N >> 1), false);
    prof.push([bd * 0.5, 0], [0, 0]);
    const geo = cabinSweep(prof, len);
    const m = new T.Mesh(geo, mBin); mBin.side = T.DoubleSide; mBin.fog = false;
    // the bins' lower edge about 1.8 m above the floor (head room over the seats), lower in small cabins; they
    // meet the wall where the curved wall is at that height
    const zb = Math.min(zf + 1.8, zc + ri * 0.48), wallY = Math.min(ri * 0.9, Math.sqrt(Math.max(0.01, ri * ri - (zb - zc) * (zb - zc))) - 0.02), Mb = new T.Matrix4().makeBasis(_av(0, -side, 0), new T.Vector3(0, 1, 0), new T.Vector3(1, 0, 0));
    Mb.setPosition(V(x0, side * wallY, zb)); m.matrixAutoUpdate = false; m.matrix.copy(Mb);
    g.add(m);
    // underneath: the grey passenger service panel, with a pair of reading lights and air vents over every row
    const psu = new T.Mesh(new T.BoxGeometry(len, 0.035, bd * 0.95), lam2(0xA4A9AF)); psu.position.copy(V(x0 + len / 2, side * (wallY - bd * 0.475), zb)); g.add(psu);
    const nL = Math.floor(len / 0.79), rl = new T.InstancedMesh(new T.CylinderGeometry(0.022, 0.022, 0.01, 12), new T.MeshBasicMaterial({ color: 0xF2F4F6 }), nL * 2);
    const vent = new T.InstancedMesh(new T.CylinderGeometry(0.018, 0.022, 0.012, 10), lam2(0x5A6068), nL * 2); rl.material.userData.noDim = true;
    for (let i = 0; i < nL; i++) for (let j = 0; j < 2; j++) {
      M0.compose(V(x0 + 1.2 + i * 0.79 + j * 0.08, side * (wallY - bd * 0.62 - j * 0.07), zb - 0.02), new T.Quaternion(), new T.Vector3(1, 1, 1)); rl.setMatrixAt(i * 2 + j, M0);
      M0.compose(V(x0 + 1.32 + i * 0.79 + j * 0.06, side * (wallY - bd * 0.3), zb - 0.02), new T.Quaternion(), new T.Vector3(1, 1, 1)); vent.setMatrixAt(i * 2 + j, M0);
    }
    g.add(rl, vent);
    // the bin door's edge (a darker latch strip with a handle on each door) and the joints between doors
    // the joints between doors, following the door's curve
    const doorPts = prof.filter(p => p[0] > bd * 0.34 && p[1] > 0.002).map((p, i, arr) => { const a2 = arr[Math.max(0, i - 1)], b2 = arr[Math.min(arr.length - 1, i + 1)], tx = b2[0] - a2[0], ty = b2[1] - a2[1], tl = Math.hypot(tx, ty) || 1; return [p[0] - ty / tl * 0.003, p[1] + tx / tl * 0.003]; });
    const seams = new T.InstancedMesh(cabinSweep(doorPts, 0.012), lam2(0xBEC3C9), Math.ceil(len / 1.5)); seams.material.side = T.DoubleSide;
    for (let i = 0; i < seams.count; i++) { M0.copy(Mb).multiply(new T.Matrix4().makeTranslation(0, 0, 0.75 + i * 1.5)); seams.setMatrixAt(i, M0); }
    seams.matrixAutoUpdate = false; g.add(seams);
    const handles = new T.InstancedMesh(new T.BoxGeometry(0.2, 0.035, 0.02), lam2(0x8E949B), Math.ceil(len / 1.5));
    for (let i = 0; i < handles.count; i++) { M0.compose(V(x0 + 1.5 + i * 1.5, side * (wallY - bd - 0.008), zb + bh * 0.2), new T.Quaternion(), new T.Vector3(1, 1, 1)); handles.setMatrixAt(i, M0); }
    g.add(handles);
    // light: a bright line where the bin meets the ceiling, and one along the wall above the windows
    const glow = new T.MeshBasicMaterial({ color: 0xFFFFFF }); glow.userData.noDim = true;
    const up = new T.Mesh(new T.BoxGeometry(len, 0.02, 0.05), glow); up.position.copy(V(x0 + len / 2, side * (wallY - bd * 0.35), zb + bh + 0.06)); g.add(up);
    const wl = new T.Mesh(new T.BoxGeometry(len, 0.018, 0.03), glow); wl.position.copy(V(x0 + len / 2, side * (wallY - 0.02), zb - 0.04)); g.add(wl);
    if (side === -1) V3dCabin.mood = up;
  }
  // the windows along both walls
  const pitch = Math.max(0.45, s.win.pitch || 0.53), nW = Math.floor((s.win.to - s.win.from) / pitch), zW = Math.min(zf + 1.12, zc + ri * 0.2);   // window middle about 1.1 m above the floor, as in real cabins
  if (!V3dCabinF.winTex) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 96); x.fillStyle = '#fff'; x.beginPath(); (x as any).roundRect ? (x as any).roundRect(4, 4, 56, 88, 24) : x.rect(4, 4, 56, 88); x.fill(); V3dCabinF.winTex = new T.CanvasTexture(cv); }
  const winGeo = new T.PlaneGeometry(st.ww * 1.25, st.wh * 1.2), winMat = new T.MeshBasicMaterial({ color: 0xFFFFFF, map: cabinSkyTex(), alphaMap: V3dCabinF.winTex, transparent: true, fog: false }); winMat.userData.noDim = true;
  const wins = new T.InstancedMesh(winGeo, winMat, nW * 2), M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(1, 1, 1);
  let wi = 0;
  for (let i = 0; i < nW; i++) for (const side of [-1, 1]) {
    const wy = Math.sqrt(Math.max(0, ri * ri - (zW - zc) * (zW - zc))) - 0.02;
    Q.setFromEuler(new T.Euler(0, side > 0 ? 0 : Math.PI, 0)); M.compose(V(s.win.from + i * pitch, side * wy, zW), Q, S); wins.setMatrixAt(wi++, M);
  }
  g.add(wins); g.userData.wins = wins;
  if (!V3dCabinF.bezTex) { const cv = document.createElement('canvas'); cv.width = 96; cv.height = 128; const x = cv.getContext('2d'); const rr = (a: number, b: number, w: number, h: number, r: number) => { x.beginPath(); (x as any).roundRect ? (x as any).roundRect(a, b, w, h, r) : x.rect(a, b, w, h); };
    x.fillStyle = '#E4E6E8'; rr(2, 2, 92, 124, 40); x.fill(); const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(0,0,0,.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(255,255,255,.2)'); x.fillStyle = gr; rr(2, 2, 92, 124, 40); x.fill();
    x.globalCompositeOperation = 'destination-out'; rr(18, 18, 60, 92, 26); x.fill(); V3dCabinF.bezTex = new T.CanvasTexture(cv); V3dCabinF.bezTex.colorSpace = T.SRGBColorSpace; }
  const bez = new T.InstancedMesh(new T.PlaneGeometry(st.ww * 1.9, st.wh * 1.65), cabinMat(0xFFFFFF, { map: V3dCabinF.bezTex, transparent: true, alphaTest: 0.5 }), nW * 2);
  for (let i = 0; i < nW * 2; i++) { wins.getMatrixAt(i, M); const e = new T.Matrix4().makeTranslation(0, 0, 0.012); M.multiply(e); bez.setMatrixAt(i, M); }
  g.add(bez);
  // the seats, row by row, from the passenger list's layout (first class and business at the front, wider)
  const list: PaxSeat[] = f ? (() => { try { return manifestOf(f); } catch (e) { return []; } })() : [];
  const rowCls: { [r: number]: string } = {}; let maxRow = 0;
  for (const p of list) { const r = parseInt(p.seat, 10); if (r > maxRow) maxRow = r; if (!rowCls[r] || p.cls !== 'Y') rowCls[r] = p.cls; }
  const pitchOf = (c: string) => c === 'F' ? 1.5 : c === 'J' ? 1.0 : 0.79;
  // every passenger on the list has a seat: the rows fit the cabin, with the seats a little closer together
  // where needed (down to 28 inches); only beyond that is a passenger left out (never without a seat)
  let need = 0; for (let r = 1; r <= maxRow; r++) need += pitchOf(rowCls[r] || 'Y');
  const room = (x1 - 1.6) - (x0 + 1.4), squeeze = need > room ? Math.max(0.89, room / need) : 1;
  let rows = Math.max(maxRow, 1), x = x0 + 1.4; const rowX: number[] = [], rowsCls: string[] = [];
  // empty seats too: as many rows as fit
  for (let r = 1; x < x1 - 1.6 + 0.01; r++) { const c = rowCls[r] || 'Y'; rowX[r] = x; rowsCls[r] = c; x += pitchOf(c) * squeeze; rows = r; }
  const width = ri * 2 * 0.9, aisles = blocks.length - 1, aisleW = 0.5, seatW = (width - aisles * aisleW) / abreast;
  const seatY: number[] = []; let yy = -width / 2;
  blocks.forEach((b, bi) => { for (let k = 0; k < b; k++) { seatY.push(yy + seatW * (k + 0.5)); } yy += b * seatW + (bi < aisles ? aisleW : 0); });
  const aisleY = blocks.length > 1 ? -width / 2 + blocks[0] * seatW + aisleW / 2 : 0;
  const seatColor = new T.Color(0x34373D), premColor = new T.Color(st.seat).lerp(new T.Color(0x1C2433), 0.4), headColor = new T.Color(st.head); void headColor;
  const nSeats = rows * abreast;
  // a seat seen from the side (forward is −x): cushion, a back curving to a rounded top, the shell behind;
  // drawn out across the seat's width, its edges softly rounded
  if (!V3dCabinF.seatGeo || V3dCabinF.seatQ !== cabinQ()) {
    V3dCabinF.seatQ = cabinQ();
    const pr = [[-0.25, 0.4], [-0.26, 0.5], [-0.2, 0.54], [0.12, 0.55], [0.17, 0.6], [0.21, 0.98], [0.24, 1.05], [0.3, 1.06], [0.32, 1.0], [0.3, 0.62], [0.27, 0.4], [0.22, 0.12], [0.19, 0.12], [0.15, 0.36]];
    const sh = new T.Shape(cabinSmooth(pr, cabinQv([0, 36, 60, 96])));
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.86, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: cabinQv([1, 2, 3, 4]), curveSegments: 4 });
    geo.translate(0, 0, -0.43); geo.scale(1, 1, 1 / 0.93);   // centred across, one metre wide before scaling
    { const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > 0.75) P.setZ(i, P.getZ(i) * (1 - 0.12 * (y - 0.75) / 0.31)); } geo.computeVertexNormals(); }   // the back narrows towards the shoulders
    V3dCabinF.seatGeo = geo;
    // the headrest: padded, with wings at the sides, seen from behind as in a real cabin
    const hs = new T.Shape(); hs.moveTo(-0.22, 0); hs.lineTo(0.22, 0); hs.quadraticCurveTo(0.27, 0.02, 0.27, 0.1); hs.lineTo(0.26, 0.2); hs.quadraticCurveTo(0.25, 0.26, 0.18, 0.26); hs.lineTo(-0.18, 0.26); hs.quadraticCurveTo(-0.25, 0.26, -0.26, 0.2); hs.lineTo(-0.27, 0.1); hs.quadraticCurveTo(-0.27, 0.02, -0.22, 0);
    const hg = new T.ExtrudeGeometry(hs, { depth: 0.11, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: cabinQv([1, 3, 5, 8]), curveSegments: cabinQv([3, 8, 14, 24]) });
    hg.rotateY(-Math.PI / 2); hg.translate(0.28, 1.0, 0); hg.scale(1, 1, 1.5 / 0.93);
    V3dCabinF.headGeo = hg;
  }
  const lam = (c: number) => cabinMat(c);
  const cush = new T.InstancedMesh(V3dCabinF.seatGeo, cabinMat(0xFFFFFF, { map: cabinLeatherTex() }), nSeats);
  const back = new T.InstancedMesh(new T.BoxGeometry(0.42, 0.06, 0.05), lam(0xFFFFFF), nSeats * 2);   // armrests, along the seat: light grey with a dark pad
  const pad = new T.InstancedMesh(new T.BoxGeometry(0.36, 0.022, 0.055), cabinMat(0x2A2D33, { map: cabinLeatherTex() }), nSeats * 2);
  // the cloth cover over the back of each headrest, in a pattern of your airline's own colour
  const coverTex = cabinCoverTex(company().color || '#C8102E');
  const cover = new T.InstancedMesh(new T.PlaneGeometry(0.26, 0.21), cabinMat(0xFFFFFF, { map: coverTex, side: T.DoubleSide }), nSeats);
  const head = new T.InstancedMesh(V3dCabinF.headGeo, cabinMat(0xFFFFFF, { map: cabinLeatherTex() }), nSeats);
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
      M.compose(V(X, sy, zf), q, new T.Vector3(pk, pk, wS * 0.98)); head.setMatrixAt(k, M); head.setColorAt(k, prem ? premColor : seatColor);
      M.compose(V(X + 0.312 * pk, sy, zf + 1.13 * pk), new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI / 2, 0)), new T.Vector3(wS / 0.4, 1, 1)); cover.setMatrixAt(k, M);
      for (const sd of [-1, 1]) { const ai = k * 2 + (sd > 0 ? 1 : 0); M.compose(V(X - 0.02, sy + sd * wS * 0.5, zf + 0.66), q, new T.Vector3(1, 1, 1)); back.setMatrixAt(ai, M); back.setColorAt(ai, new T.Color(0xC9CDD2)); M.compose(V(X - 0.02, sy + sd * wS * 0.5, zf + 0.7), q, new T.Vector3(1, 1, 1)); pad.setMatrixAt(ai, M); }
      seatAt[r + letters[i]] = { x: X, y: sy, prem }; k++;
    }
  }
  cush.count = head.count = cover.count = k; back.count = pad.count = k * 2; g.add(pad, cover);
  // the back of every seat: the tray table and its latch, the pocket, and on long-haul cabins the screen
  const longHaul = abreast >= 7 || /a350|b777|b787|b747/.test(s.cockpit);
  const tray = new T.InstancedMesh(new T.BoxGeometry(0.014, 0.3, 0.36), cabinMat(0x9EA3AA, { map: cabinSatinTex() }), k);
  const latch = new T.InstancedMesh(new T.BoxGeometry(0.02, 0.025, 0.05), cabinMat(0x3A3D42), k);
  const pocket = new T.InstancedMesh(new T.BoxGeometry(0.02, 0.2, 0.38), cabinMat(0x2A2E35, { map: cabinFabricTex() }), k);
  const scr = longHaul ? new T.InstancedMesh(new T.BoxGeometry(0.012, 0.15, 0.24), new T.MeshBasicMaterial({ color: 0x1D4E7A, fog: false }), k) : null;
  if (scr) scr.material.userData.noDim = true;
  let t2 = 0; const one = new T.Vector3(1, 1, 1), q0 = new T.Quaternion().setFromEuler(new T.Euler(0, 0, -0.07));
  for (const key in seatAt) {
    const a = seatAt[key], bx = a.x + (a.prem ? 0.43 : 0.335);
    M.compose(V(bx, a.y, zf + (scr ? 0.72 : 0.82)), q0, one); tray.setMatrixAt(t2, M);
    M.compose(V(bx + 0.006, a.y, zf + (scr ? 0.86 : 0.96)), q0, one); latch.setMatrixAt(t2, M);
    M.compose(V(bx - 0.03, a.y, zf + 0.5), q0, one); pocket.setMatrixAt(t2, M);
    if (scr) { M.compose(V(bx + 0.012, a.y, zf + 0.98), q0, one); scr.setMatrixAt(t2, M); }
    t2++;
  }
  tray.count = latch.count = pocket.count = t2; if (scr) scr.count = t2;
  g.add(tray, latch, pocket); if (scr) g.add(scr);
  g.add(cush, back, head);
  // the passengers
  if (cabinPeopleOn() && list.length) g.add(cabinPeople(list, seatAt, zf, V));
  g.userData.pax = { list: list.length, seated: list.filter(p => seatAt[p.seat]).length };
  g.traverse((m: any) => { m.frustumCulled = false; m.renderOrder = 40; });
  g.userData.eye = [x1 - 0.3, aisleY, zf + 1.7]; g.userData.look = [x0 + 2, aisleY, zf + 0.7];
  return g;
}

/** The people in their seats: torso, arms, neck, head and hair, in a few shared shapes. */
function cabinPeople(list: PaxSeat[], seatAt: any, zf: number, V: (x: number, y: number, z: number) => any): any {
  const T = THREE, g = new T.Group();
  if (!_people.torso || _people.q !== cabinQ()) {
    _people.q = cabinQ(); const sg = cabinQv([8, 14, 22, 32]);
    _people.torso = new T.LatheGeometry([[0.0, 0], [0.16, 0.02], [0.17, 0.2], [0.18, 0.4], [0.17, 0.5], [0.12, 0.56], [0.05, 0.58]].map(p => new T.Vector2(p[0], p[1])), sg).scale(0.68, 1, 1);   // shoulders wide across, slimmer front to back
    _people.head = new T.SphereGeometry(0.105, sg + 2, Math.round(sg * 0.75)).scale(0.9, 1.1, 1);
    _people.hair = new T.SphereGeometry(0.112, sg + 2, Math.round(sg * 0.65), 0, Math.PI * 2, 0, 1.75).scale(0.92, 1.1, 1.02);
    _people.long = new T.CylinderGeometry(0.1, 0.12, 0.26, 12, 1, true, -Math.PI * 0.55, Math.PI * 1.1);
    _people.arm = new T.CylinderGeometry(0.045, 0.04, 0.44, Math.max(6, sg >> 1));
    _people.neck = new T.CylinderGeometry(0.045, 0.05, 0.1, Math.max(6, sg >> 1));
    _people.thigh = new T.CylinderGeometry(0.07, 0.06, 0.42, Math.max(6, sg >> 1));
    _people.petBody = new T.SphereGeometry(0.1, 12, 8).scale(1.5, 0.9, 0.9);
    _people.petHead = new T.SphereGeometry(0.065, 12, 8);
    _people.ear = new T.ConeGeometry(0.025, 0.06, 6);
  }
  const ok = list.filter(p => seatAt[p.seat]);
  const n = ok.length, mk = (geo: any, count: number) => { const m = new T.InstancedMesh(geo, cabinMat(0xffffff), Math.max(1, count)); m.material.userData.noDim = true; m.count = 0; g.add(m); return m; };
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
  const f = State.live.filter(x => x.id === P.id)[0] || null, key = P.id + '|' + P.type + '|' + (f ? f.pax : 0) + '|' + cabinPeopleOn() + '|' + cabinQ();
  if (V3dCabinF.key !== key || !V3dCabinF.grp || V3dCabinF.grp.parent !== body) {
    if (V3dCabinF.grp && V3dCabinF.grp.parent) V3dCabinF.grp.parent.remove(V3dCabinF.grp);
    V3dCabinF.grp = cabinFwdBuild(P, s, f); V3dCabinF.key = key; body.add(V3dCabinF.grp);
  }
  const G = V3dCabinF.grp; G.visible = true; cabinSharp(true);
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
  // light: the cabin's own lights (warmer at night, a touch brighter by day with the windows' light)
  const night = (V3dSky as any).U ? (V3dSky as any).U.uNight.value : 0, amb = (V3dSky as any).amb || 1;
  CabinLight.self.value = 0.7 + 0.08 * night; CabinLight.warm.value.setRGB(1, 0.99 - 0.07 * night, 0.98 - 0.16 * night);
  if (G.userData.wins) { const k = Math.max(0.08, Math.min(1, amb)); G.userData.wins.material.color.setRGB(k * (1 - 0.6 * night), k * (1 - 0.5 * night), k); }
}
function v3dCabinFwdLeave(P: any) {
  cabinFree(V3dCabinF.grp); V3dCabinF.grp = null; V3dCabinF.key = ''; cabinSharp(false);
  const body = P && P.model && P.model.userData.body;
  if (body) for (const c of body.children) if ((c.userData as any).hiddenForCabin) { c.visible = true; (c.userData as any).hiddenForCabin = false; }
  if ((V3d as any).nearWas) { V3d.cam.near = (V3d as any).nearWas; (V3d as any).nearWas = 0; V3d.cam.updateProjectionMatrix(); }
}

/* ---------- cabin materials ----------
 * Real-looking surfaces, drawn by the app itself (no photos, no makers' or airlines' designs): woven seat
 * fabric with seams and piping, leather headrest covers, airline carpet, sidewall laminate with panel joints
 * and shading from the window belt down to the dark lower wall, a perforated ceiling with cove lighting,
 * satin bin doors, and the sky in the windows. Made once and shared by every cabin. */
const CabinTex: any = {};
function cabinCanvas(w: number, h: number, draw: (g: CanvasRenderingContext2D, img: ImageData, d: Uint8ClampedArray) => void, repeat?: number[]): any {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h);
  draw(g, img, img.data);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8; if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}
/** Smooth noise for the textures (cheap value noise, tiling). */
function cabinNoise(x: number, y: number, p: number, seed: number): number {
  const h = (i: number, j: number) => cloudHash(((i % p) + p) % p, ((j % p) + p) % p, seed);
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), e = h(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + e) * ux * uy;
}
/** Woven seat fabric: a fine twill with flecks of colour, slightly worn in the middle of the tile. White, so
 *  the seat's own colour tints it (each class its own colour). */
function cabinFabricTex(): any {
  return CabinTex.fabric || (CabinTex.fabric = cabinCanvas(256, 256, (g, img, d) => {
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const tw = ((x + y) % 4 < 2 ? 1 : 0.86) * ((x - y + 512) % 6 < 3 ? 1 : 0.95);   // twill: diagonal ribs
      const fl = cloudHash(x, y, 77) > 0.985 ? 1.18 : cloudHash(x, y, 78) < 0.015 ? 0.78 : 1;   // flecks
      const hz = 0.9 + 0.1 * cabinNoise(x / 32, y / 32, 8, 5) + 0.04 * cabinNoise(x / 6, y / 6, 43, 6);   // heather
      const v = Math.min(255, 228 * tw * fl * hz), i = (y * 256 + x) * 4;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [3, 3]));
}
/** Leather for the headrest covers and armrests: fine pebbled grain. */
function cabinLeatherTex(): any {
  return CabinTex.leather || (CabinTex.leather = cabinCanvas(256, 256, (g, img, d) => {
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const n = cabinNoise(x / 3.2, y / 3.2, 80, 9), n2 = cabinNoise(x / 14, y / 14, 18, 10);
      const v = Math.min(255, 205 + 40 * Math.pow(n, 1.5) + 14 * n2), i = (y * 256 + x) * 4;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [4, 4]));
}
/** Airline carpet: a dense loop pile in blue-grey with a small woven pattern and darker wear down the aisle. */
function cabinCarpetTex(): any {
  return CabinTex.carpet || (CabinTex.carpet = cabinCanvas(256, 256, (g, img, d) => {
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const pile = 0.82 + 0.18 * cloudHash(x, y, 31) * cabinNoise(x / 2, y / 2, 128, 32);
      const pat = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 1 : 0.93) * (Math.abs(((x % 32) - 16)) + Math.abs(((y % 32) - 16)) < 3 ? 1.25 : 1);
      const k = pile * pat, i = (y * 256 + x) * 4;
      d[i] = 52 * k; d[i + 1] = 60 * k; d[i + 2] = 78 * k; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [6, 2]));
}
/** The cabin's walls and ceiling, all around the fuselage (u around it, v along it): the perforated ceiling
 *  with its cove light, the bins' shadow, the laminate sidewall with panel joints, the darker lower wall. */
function cabinShellTex(wall: number, len: number): any {
  const key = 'shell' + wall; if (CabinTex[key]) { CabinTex[key].repeat.set(1, len / 2.2); return CabinTex[key]; }
  const base = new THREE.Color(wall);
  return (CabinTex[key] = cabinCanvas(1024, 256, (g, img, d) => {
    for (let y = 0; y < 256; y++) for (let x = 0; x < 1024; x++) {
      const th = x / 1024 * Math.PI * 2, h = (Math.sin(th) + 1) / 2;   // 0 at the floor, 1 at the top of the ceiling
      let k = 1, tint = [1, 1, 1];
      if (h > 0.84) {   // ceiling: off-white, a field of tiny perforations, brighter towards the middle
        k = 1.08 + 0.06 * (h - 0.84) / 0.16;
      } else if (h > 0.78) {   // the cove: light washing up from behind the bins
        k = 1.12 - (0.84 - h) * 2; tint = [1.02, 1.01, 0.98];
      } else if (h > 0.70) {   // under the bins: in their shadow
        k = 0.8;
      } else if (h > 0.4) {   // sidewall laminate: fine speckle, a soft vertical gradient, panel joints every 1.1 m
        k = 0.95 + 0.04 * (h - 0.4) / 0.3 + 0.025 * (cloudHash(x, y, 51) - 0.5) + 0.015 * cabinNoise(x / 9, y / 9, 114, 52);
        if (y % 128 < 2) k *= 0.82; else if (y % 128 < 4) k *= 1.04;   // the joint and its lit edge
      } else if (h > 0.22) {   // the lower wall (dado): darker, a slight texture
        k = 0.62 + 0.02 * (cloudHash(x, y, 53) - 0.5); tint = [0.96, 0.96, 0.98];
        if (Math.abs(h - 0.4) < 0.006) k = 0.5;   // the trim line between them
      } else k = 0.4;
      const i = (y * 1024 + x) * 4;
      d[i] = Math.min(255, base.r * 255 * k * tint[0]); d[i + 1] = Math.min(255, base.g * 255 * k * tint[1]); d[i + 2] = Math.min(255, base.b * 255 * k * tint[2]); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [1, len / 2.2]));
}
/** Satin plastic for bins and trim: smooth, with the faintest mottling. */
function cabinSatinTex(): any {
  return CabinTex.satin || (CabinTex.satin = cabinCanvas(128, 128, (g, img, d) => {
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const v = 238 + 10 * cabinNoise(x / 10, y / 10, 13, 61) + 4 * (cloudHash(x, y, 62) - 0.5), i = (y * 128 + x) * 4;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [2, 2]));
}
/** The sky as seen through a cabin window: a gradient with soft clouds (by day), a dark blue night. */
function cabinSkyTex(): any {
  return CabinTex.sky || (CabinTex.sky = cabinCanvas(64, 96, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, '#6E9FD6'); gr.addColorStop(0.55, '#B9D3EE'); gr.addColorStop(0.62, '#E8EEF4'); gr.addColorStop(1, '#8D9AA8');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 96);
    for (let i = 0; i < 9; i++) { const x = Math.random() * 64, y = 48 + Math.random() * 18, r = 6 + Math.random() * 10, c = g.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, 'rgba(255,255,255,.75)'); c.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = c; g.fillRect(0, 0, 64, 96); }
  }));
}

/** The headrest cover: a light cloth with a bold pattern of our own in the airline's colour (a woven chevron
 *  and lines), like the covers airlines use; never another airline's design. */
function cabinCoverTex(color: string): any {
  const key = 'cover' + color; if (CabinTex[key]) return CabinTex[key];
  return (CabinTex[key] = cabinCanvas(128, 104, (g) => {
    g.fillStyle = '#F4F1EC'; g.fillRect(0, 0, 128, 104);
    g.strokeStyle = color; g.lineWidth = 3.2; g.lineCap = 'round';
    for (let k = -3; k < 7; k++) { g.beginPath(); const y = k * 16; g.moveTo(0, y + 20); g.lineTo(32, y + 4); g.lineTo(64, y + 20); g.lineTo(96, y + 4); g.lineTo(128, y + 20); g.stroke(); }
    g.globalAlpha = 0.5; g.lineWidth = 1.2; for (let k = -3; k < 7; k++) { g.beginPath(); const y = k * 16 + 8; g.moveTo(0, y + 20); g.lineTo(32, y + 4); g.lineTo(64, y + 20); g.lineTo(96, y + 4); g.lineTo(128, y + 20); g.stroke(); }
    g.globalAlpha = 1; for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * 128, Math.random() * 104, 1, 1); }   // the weave
  }));
}
