// Your pet: a dog or a cat, chosen and made your own with your pilot (Your pilot → Pet), in its bed on the floor of
// your office by the bookshelf. Our own model: each pose is sculpted as one smooth animal (shapes blended in a
// distance field, meshed with surface nets) and covered in thousands of strands of fur. It sleeps curled up for a
// good while, breathing slowly, an ear twitching now and then, a tail tip flicking (a cat) or paws twitching in a
// dream (a dog); now and then it wakes, gets up, wanders about the room for a little while on its four legs, comes
// back, turns round in its bed and lies down to sleep again. Tap it and it wakes for a moment and looks at you.

type PetKind = 'dog' | 'cat' | 'none';
interface Pet { kind: PetKind; name: string; coat: number; white: boolean; size: 's' | 'm' | 'l'; ears: 'floppy' | 'pointy'; bed: number; coatHex?: string; lightHex?: string }
/** The colours you can give the light parts (the chest, muzzle, paws and blaze). */
const PET_LIGHTS: [string, string][] = [['#F3EFE6', 'White'], ['#EADBC0', 'Cream'], ['#D9B48A', 'Tan'], ['#CFCAC2', 'Silver'], ['#8E8A86', 'Grey'], ['#6B4A34', 'Brown'], ['#2A2420', 'Black'], ['#E9C46A', 'Gold']];
/** The main colour of the coat: one of the coats, or your own. */
function petCoatHex(P: Pet): string { return P.coatHex || (PET_COATS[P.kind === 'cat' ? 'cat' : 'dog'][P.coat] || PET_COATS.dog[0])[0]; }
/** The colour of the light parts: white (or the colour you chose), or a shade of the coat when it is all one colour. */
function petLightHex(P: Pet): string | null { return P.white ? (P.lightHex || '#F3EFE6') : null; }

const PET_COATS: { [k: string]: [string, string][] } = {
  dog: [['#C8913E', 'Golden'], ['#2A2420', 'Black'], ['#6B4226', 'Brown'], ['#E6D3AE', 'Cream'], ['#F2EFE8', 'White'], ['#8A8783', 'Grey'], ['#A0522D', 'Red'], ['#4A3B30', 'Dark brown']],
  cat: [['#E08A3C', 'Ginger'], ['#2A2624', 'Black'], ['#9A9590', 'Grey'], ['#F1EEE8', 'White'], ['#7A6450', 'Tabby'], ['#D9C3A0', 'Cream'], ['#5E6670', 'Blue-grey'], ['#B07A4A', 'Cinnamon']],
};
const PET_BEDS: [string, string][] = [['#7A2E2E', 'Red'], ['#2E4A7A', 'Blue'], ['#5A6B3A', 'Green'], ['#8C8FA0', 'Grey'], ['#C9A46A', 'Sand'], ['#5B3A6B', 'Plum']];

/** Your pet as saved (a dog with pointed ears until you choose otherwise). */
function petData(): Pet {
  const S: any = State; if (!S.pet) S.pet = { kind: 'dog', name: 'Buddy', coat: 0, white: true, size: 'm', ears: 'pointy', bed: 0, v: 2 };
  if (!S.pet.v) { if (S.pet.kind === 'dog' && S.pet.name === 'Buddy' && S.pet.ears === 'floppy' && !S.pet.coat) S.pet.ears = 'pointy'; S.pet.v = 2; }
  return S.pet as Pet;
}
function petScale(P: Pet): number { return P.kind === 'cat' ? 0.95 : P.size === 's' ? 0.72 : P.size === 'l' ? 1.25 : 1; }

/* ---------- in the room ---------- */
/** The bed at pos (x, z), turned by yaw, the pet asleep in it, and the places it may wander to (walk: x, z points on
 *  the open floor, in the room's own space). Its parts in A.pet. */
function petPlace(T: any, root: any, A: any, pos: number[], yaw: number, walk?: number[][]) {
  const P = petData(); if (!P || P.kind === 'none') return;
  const cat = P.kind === 'cat', s = petScale(P);
  const g = new T.Group(); g.position.set(pos[0], 0, pos[1]); g.rotation.y = yaw; root.add(g);
  // the bed: a round cushion in a soft rim (a cat's is smaller and deeper)
  const bedR = cat ? 0.34 : 0.45 * Math.max(0.8, s), bc = new T.Color((PET_BEDS[P.bed] || PET_BEDS[0])[0]);
  const cush = new T.Mesh(new T.CylinderGeometry(bedR * 0.86, bedR * 0.88, 0.06, 40), new T.MeshStandardMaterial({ color: bc.clone().offsetHSL(0, -0.1, 0.12), roughness: 0.98 }));
  cush.position.y = 0.03; cush.receiveShadow = true; g.add(cush);
  const rim = new T.Mesh(new T.TorusGeometry(bedR * 0.9, cat ? 0.065 : 0.075 * Math.max(0.9, s), 18, 48), new T.MeshStandardMaterial({ color: bc, roughness: 0.97 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = cat ? 0.07 : 0.075; rim.castShadow = true; rim.receiveShadow = true; g.add(rim);
  // asleep, curled up on the cushion
  const curl = petBody(T, P, s, 'curl'); curl.grp.position.y = 0.06; g.add(curl.grp);
  // its bowls beside the bed, side by side: water, and food in a bowl with its name on
  petBowls(T, g, P, bedR);
  // tap it: it wakes for a moment
  const hit = new T.Mesh(new T.CylinderGeometry(bedR + 0.05, bedR + 0.05, 0.4, 16), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 0.2; hit.userData.act = 'pet'; g.add(hit); A.hits = A.hits || []; A.hits.push(hit);
  const home = new T.Vector3(pos[0], 0, pos[1]);
  const pts = (walk && walk.length ? walk : [[pos[0] + 0.8, pos[1] + 0.6], [pos[0] + 0.3, pos[1] + 1.2], [pos[0] - 0.4, pos[1] + 0.8]]).map(w => new T.Vector3(w[0], 0, w[1]));
  A.pet = { T, root, g, P, s, cat, curl, stand: null, home, yaw, pts, st: 'sleep', until: 60 + Math.random() * 90, t: 0, nextEar: 4 + Math.random() * 6, nextTwitch: 8 + Math.random() * 10, ear: -1, earT: 0, tw: 0, stir: 0, pos: home.clone(), dir: yaw, path: [] as any[], ph: 0, fade: 0, turn: 0 };
}

/** A pet's body in one pose: the sculpted mesh, its fur, and its face (nose, eyes, a cat's whiskers). */
function petBody(T: any, P: Pet, s: number, pose: 'curl' | 'stand'): any {
  const cat = P.kind === 'cat', sc = petSculpt(T, P, s, pose), coat = new T.Color(petCoatHex(P));
  const U: any = { uBreath: { value: 0 }, uHead: { value: 0 }, uEarL: { value: 0 }, uEarR: { value: 0 }, uTail: { value: 0 }, uTailY: { value: 0 }, uPaw: { value: 0 }, uVis: { value: 1 }, uLegA: { value: new T.Vector4() },
    uNeck: { value: sc.neck }, uEarPL: { value: sc.earL }, uEarPR: { value: sc.earR }, uTailP: { value: sc.tailBase }, uLeg0: { value: sc.legs[0] }, uLeg1: { value: sc.legs[1] }, uLeg2: { value: sc.legs[2] }, uLeg3: { value: sc.legs[3] } };
  const grp = new T.Group();
  const body = new T.Mesh(sc.geo, petFurMat(T, U, coat, false)); body.castShadow = true; body.receiveShadow = true; grp.add(body);
  const fur = new T.Mesh(sc.strands, petFurMat(T, U, coat, true)); grp.add(fur);
  // the face turns with the head (about the neck)
  const headG = new T.Group(); headG.position.copy(sc.neck); grp.add(headG);
  const rel = (v: any) => v.clone().sub(sc.neck), vis: any[] = [];
  const noseM = new T.MeshPhysicalMaterial({ color: cat ? 0xD98C8C : 0x1A1412, roughness: 0.3, clearcoat: 0.6, transparent: true }), darkM = new T.MeshStandardMaterial({ color: 0x14100E, roughness: 0.5, transparent: true });
  const nose = new T.Mesh(new T.SphereGeometry(1, 24, 16), noseM); nose.position.copy(rel(sc.nose)); nose.scale.setScalar(sc.noseR).multiply(new T.Vector3(1, 0.75, 1.15)); headG.add(nose); vis.push(noseM, darkM);
  const lids: any[] = [], eyes: any[] = [], eyeM = new T.MeshPhysicalMaterial({ map: petEyeTex(T, cat ? '#3FAE6A' : '#5A3A22'), roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true }); vis.push(eyeM);
  for (const e of sc.eyes) {
    const lid = new T.Mesh(new T.CapsuleGeometry(0.0024 * s, e.len, 4, 8), darkM); lid.position.copy(rel(e.at)); lid.rotation.set(e.rx, e.ry, Math.PI / 2 + e.rz); headG.add(lid); lids.push(lid);
    const ey = new T.Mesh(new T.SphereGeometry(1, 28, 20), eyeM); ey.position.copy(rel(e.at)); ey.rotation.set(0, e.ry + Math.PI / 2, 0); ey.scale.set(e.len * 0.62, 0.0001, e.len * 0.62); ey.visible = false; headG.add(ey); eyes.push(ey);
  }
  if (cat) {   // whiskers
    const wv: number[] = [], b = rel(sc.nose), fw = sc.fwd;
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { const y = b.y - 0.004 * s + i * 0.0028 * s; const sx = -fw.z * side, sz = fw.x * side; wv.push(b.x - fw.x * 0.008 * s + sx * 0.01 * s, y, b.z - fw.z * 0.008 * s + sz * 0.01 * s, b.x + sx * 0.075 * s - fw.x * 0.015 * s, y - 0.01 * s + i * 0.006 * s, b.z + sz * 0.075 * s - fw.z * 0.015 * s); }
    const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(wv, 3)); const wm = new T.LineBasicMaterial({ color: 0xF4F1EA, transparent: true, opacity: 0.85 }); headG.add(new T.LineSegments(wg, wm)); vis.push(wm);
  }
  return { grp, U, sc, headG, lids, eyes, vis };
}
/** Show a body (1) or dissolve it away (0): its fur and skin fade by strands, its face with it. */
function petVis(B: any, v: number) { B.U.uVis.value = v; B.grp.visible = v > 0.001; for (const m of B.vis) { m.opacity = Math.min(1, v * 1.4) * (m.isLineBasicMaterial ? 0.85 : 1); } }
/** Eyes: 0 shut … 1 open. */
function petEyes(B: any, open: number) { for (let i = 0; i < B.eyes.length; i++) { const ey = B.eyes[i]; ey.visible = open > 0.02; ey.scale.y = Math.max(0.0001, ey.scale.x * open); B.lids[i].visible = open < 0.3; } }

/** Each frame: asleep (breathing, an ear, the tail, a paw), awake for a moment, or up and about. */
function petStep(A: any, t: number, dt: number) {
  const P = A && A.pet; if (!P) return;
  const T = P.T, C = P.curl, per = P.cat ? 2.6 : 3.6;
  P.t += dt;
  // asleep: slow breathing, deeper for a moment after a tap
  C.U.uBreath.value = Math.sin(t * 2 * Math.PI / per) * (P.stir > 0 ? 1.8 : 1);
  if (t > P.nextEar) { P.ear = Math.random() < 0.5 ? 0 : 1; P.earT = 0; P.nextEar = t + 6 + Math.random() * 14; }
  C.U.uEarL.value = 0; C.U.uEarR.value = 0;
  if (P.ear >= 0) { P.earT += dt; const k = P.earT < 0.4 ? Math.sin(P.earT / 0.4 * Math.PI * 2) * (1 - P.earT / 0.4) : 0; (P.ear ? C.U.uEarR : C.U.uEarL).value = 0.4 * k; if (P.earT > 0.4) P.ear = -1; }
  if (t > P.nextTwitch) { P.tw = 1.2; P.nextTwitch = t + 10 + Math.random() * 18; }
  if (P.tw > 0) { P.tw = Math.max(0, P.tw - dt); const k = Math.sin(P.tw * 18) * Math.min(1, P.tw); if (P.cat) C.U.uTail.value = 0.25 * k; else C.U.uPaw.value = k; } else { C.U.uTail.value = 0; C.U.uPaw.value = 0; }
  C.U.uHead.value = 0; let open = 0;
  if (P.stir > 0) { P.stir = Math.max(0, P.stir - dt); C.U.uHead.value = 0.22 * Math.sin(Math.min(1, (2.6 - P.stir) / 2.6) * Math.PI); open = Math.min(1, (2.6 - P.stir) / 0.3, P.stir / 0.6); }
  C.headG.rotation.z = C.U.uHead.value;
  // up and about now and then: wakes, gets up, wanders, comes back, turns round and lies down again
  if (P.st === 'sleep') {
    petEyes(C, open);
    if (P.t > P.until && P.stir <= 0) {
      if (!P.stand) { P.stand = petBody(T, P.P, P.s, 'stand'); P.root.add(P.stand.grp); petVis(P.stand, 0); }
      P.st = 'wake'; P.t = 0;
    }
  } else if (P.st === 'wake') {   // lifts its head and opens its eyes
    const k = Math.min(1, P.t / 1.2); C.U.uHead.value = 0.25 * k; C.headG.rotation.z = C.U.uHead.value; petEyes(C, k);
    if (P.t > 1.6) { P.st = 'rise'; P.t = 0; P.pos.copy(P.home); P.dir = P.yaw; petPlaceStand(P); }
  } else if (P.st === 'rise' || P.st === 'down') {   // gets up out of its bed, or settles into it (one pose melts into the other)
    const k = Math.min(1, P.t / 1.0), v = P.st === 'rise' ? k : 1 - k;
    petVis(P.stand, v); petVis(C, 1 - v); petEyes(P.stand, 1); petEyes(C, P.st === 'rise' ? 1 : 0);
    petPlaceStand(P);
    if (P.t >= 1.0) {
      if (P.st === 'rise') { P.st = 'walk'; P.t = 0; P.path = petWanderPath(P); P.walkFor = 20 + Math.random() * 25; }
      else { P.st = 'sleep'; P.t = 0; P.until = 240 + Math.random() * 300; petVis(P.stand, 0); petVis(C, 1); }
    }
  } else if (P.st === 'walk') {   // walking about, from place to place, then home
    const S = P.stand, speed = (P.cat ? 0.24 : 0.3) * (P.cat ? 1 : Math.min(1.15, P.s)), tgt = P.path[0];
    if (!tgt) { P.st = 'turn'; P.t = 0; P.turn0 = P.dir; }
    else {
      const dx = tgt.x - P.pos.x, dz = tgt.z - P.pos.z, d = Math.hypot(dx, dz), want = Math.atan2(-dz, dx);
      let da = want - P.dir; da = Math.atan2(Math.sin(da), Math.cos(da)); P.dir += Math.max(-dt * 2.2, Math.min(dt * 2.2, da));
      const go = Math.abs(da) < 1.2 ? speed * (d < 0.25 ? Math.max(0.35, d / 0.25) : 1) : speed * 0.3;
      P.pos.x += Math.cos(P.dir) * go * dt; P.pos.z -= Math.sin(P.dir) * go * dt;
      if (d < 0.08) P.path.shift();
      if (P.t > P.walkFor && P.path.length > 1) P.path = [P.home.clone()];
      P.ph += go * dt / (0.22 * P.s) * Math.PI;   // the gait: diagonal pairs of legs together, a step for every stride
      petGait(P, go / speed);
    }
    petPlaceStand(P); petEyes(S, 1);
  } else if (P.st === 'turn') {   // turns round in its bed before lying down
    P.dir += dt * 2.6; P.ph += dt * 6; petGait(P, 0.5); petPlaceStand(P);
    if (P.t > 1.4) { P.st = 'down'; P.t = 0; petGait(P, 0); }
  }
  // the standing body breathes too, and a dog wags its tail as it walks
  if (P.stand && P.st !== 'sleep') { P.stand.U.uBreath.value = Math.sin(t * 2 * Math.PI / (per * 0.6)); if (!P.cat) P.stand.U.uTail.value = P.st === 'walk' ? 0.35 * Math.sin(t * 9) : 0; else P.stand.U.uTail.value = 0.12 * Math.sin(t * 1.3); }
}
/** The standing body where the pet is now, facing the way it goes. */
function petPlaceStand(P: any) { if (!P.stand) return; const g = P.stand.grp; g.position.set(P.pos.x, P.st === 'walk' ? Math.abs(Math.sin(P.ph)) * 0.006 * P.s : 0, P.pos.z); g.rotation.y = P.dir; }
/** The legs in step: front left with hind right, front right with hind left. */
function petGait(P: any, k: number) { const a = 0.42 * k, ph = P.ph; P.stand.U.uLegA.value.set(a * Math.sin(ph), a * Math.sin(ph + Math.PI), a * Math.sin(ph + Math.PI), a * Math.sin(ph)); }
/** Two to four places to wander to, then back home. */
function petWanderPath(P: any): any[] {
  const pick = P.pts.slice().sort(() => Math.random() - 0.5), n = 2 + Math.floor(Math.random() * Math.min(3, pick.length - 1));
  return pick.slice(0, Math.max(1, n)).map((v: any) => v.clone().add(new P.T.Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3))).concat([P.home.clone()]);
}

/** Tapped in the office: it wakes for a moment, looks at you, and sleeps on (when it is up, it just looks). */
function petStir(A: any) {
  const P = A && A.pet; if (!P || P.stir > 0) return;
  if (P.st === 'sleep') { P.stir = 2.6; P.ear = 0; P.earT = 0; }
  const p = petData(); try { toast(P.st === 'sleep' ? `${p.name || (P.cat ? 'Your cat' : 'Your dog')} opens an eye, and sleeps on` : `${p.name || 'Your pet'} is having a look round the office`, 'info'); } catch (e) { /* no ui */ }
}

/** An eye: a coloured iris, a big dark pupil and a bright highlight. */
function petEyeTex(T: any, iris: string): any {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.fillStyle = '#1a1210'; x.fillRect(0, 0, 128, 128);
  const g = x.createRadialGradient(64, 64, 10, 64, 64, 60); g.addColorStop(0, iris); g.addColorStop(0.75, iris); g.addColorStop(1, '#0d0907');
  x.fillStyle = g; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#050403'; x.beginPath(); x.arc(64, 64, 30, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.arc(46, 44, 11, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(80, 82, 5, 0, Math.PI * 2); x.fill();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/** The fur's material: the coat's colours, strand by strand shading, a soft sheen; it breathes, the head, ears, tail,
 *  paws and legs move by the weights on each point, and it can melt away strand by strand (uVis). */
function petFurMat(T: any, U: any, coat: any, strands: boolean): any {
  const m = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.82, sheen: 0.55, sheenRoughness: 0.55, sheenColor: coat.clone().lerp(new T.Color(0xffffff), 0.22), side: strands ? T.DoubleSide : T.FrontSide });
  m.onBeforeCompile = (sh: any) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec4 pw; attribute vec4 lw; attribute float tw; uniform float uBreath, uHead, uEarL, uEarR, uTail, uPaw; uniform vec4 uLegA; uniform vec3 uNeck, uEarPL, uEarPR, uTailP, uLeg0, uLeg1, uLeg2, uLeg3; varying vec3 vObj;
      mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
      mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
      mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
      vec3 petMove(vec3 p) {
        p = mix(p, uLeg0 + rotZ(uLegA.x) * (p - uLeg0), lw.x); p = mix(p, uLeg1 + rotZ(uLegA.y) * (p - uLeg1), lw.y);
        p = mix(p, uLeg2 + rotZ(uLegA.z) * (p - uLeg2), lw.z); p = mix(p, uLeg3 + rotZ(uLegA.w) * (p - uLeg3), lw.w);
        p = mix(p, uEarPL + rotX(uEarL) * (p - uEarPL), pw.y); p = mix(p, uEarPR + rotX(-uEarR) * (p - uEarPR), pw.z);
        p = mix(p, uNeck + rotZ(uHead) * (p - uNeck), pw.x);
        p = mix(p, uTailP + rotY(uTail * tw) * (p - uTailP), step(0.001, tw));
        p.y += pw.w * uPaw * 0.012;
        float b = smoothstep(0.03, 0.16, p.y) * (1.0 - pw.x) * (1.0 - max(max(lw.x, lw.y), max(lw.z, lw.w))); p.y += b * uBreath * 0.01;
        return p; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vObj = position; transformed = petMove(transformed);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vObj; uniform float uVis;
      float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (uVis < 0.999 && vn(vObj * 160.0) > uVis) discard;`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        ${strands ? 'normal = normalize(vNormal);' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float st = vn(vObj * vec3(420.0, 150.0, 420.0)) * 0.6 + vn(vObj * 760.0) * 0.4;
        diffuseColor.rgb *= ${strands ? '0.96 + 0.1 * st' : '0.82 + 0.16 * st'};`);
  };
  return m;
}

/* ---------- choosing and making your pet (with your pilot's look) ---------- */
function petEditorHtml(p: Pet): string {
  const k = p.kind === 'none' ? 'dog' : p.kind, coats = PET_COATS[k];
  const opt = (key: string, v: string, lab: string, cur: any) => `<button class="le-opt ${String(cur) === v ? 'on' : ''}" data-act="pet-set" data-k="${key}" data-v="${v}">${lab}</button>`;
  return `<div class="le-group"><b>Your pet</b><p class="muted">Asleep in its bed by the bookshelf in your office.</p>${p.kind === 'none' ? '' : '<canvas class="pet-prev" data-pet-prev width="560" height="340" aria-label="Your pet"></canvas>'}<div class="le-opts">${opt('kind', 'dog', 'A dog', p.kind)}${opt('kind', 'cat', 'A cat', p.kind)}${opt('kind', 'none', 'No pet', p.kind)}</div></div>
    ${p.kind === 'none' ? '' : `
    <div class="le-group"><b>Name</b><input class="le-in" data-pet-name value="${esc(p.name || '')}" maxlength="24" autocomplete="off" placeholder="${p.kind === 'cat' ? 'Mittens' : 'Buddy'}"></div>
    <div class="le-group"><b>Coat colour</b><div class="le-sw">${coats.map((c, i) => `<button class="sw ${!p.coatHex && p.coat === i ? 'on' : ''}" style="--c:${c[0]}" data-act="pet-set" data-k="coat" data-v="${i}" aria-label="${c[1]}" title="${c[1]}"></button>`).join('')}<label class="sw custom ${p.coatHex ? 'on' : ''}" title="Your own colour" aria-label="Your own coat colour"><input type="color" class="pet-color" data-k="coatHex" value="${esc(petCoatHex(p))}"></label></div></div>
    <div class="le-group"><b>Markings</b><div class="le-opts">${opt('white', '1', p.kind === 'cat' ? 'Chest and paws' : 'Chest, muzzle and paws', p.white ? '1' : '0')}${opt('white', '0', 'All one colour', p.white ? '1' : '0')}</div>
      ${p.white ? `<div class="le-sw" style="margin-top:8px">${PET_LIGHTS.map(c => `<button class="sw ${(p.lightHex || '#F3EFE6').toLowerCase() === c[0].toLowerCase() ? 'on' : ''}" style="--c:${c[0]}" data-act="pet-set" data-k="lightHex" data-v="${c[0]}" aria-label="${c[1]} markings" title="${c[1]}"></button>`).join('')}<label class="sw custom ${p.lightHex && !PET_LIGHTS.some(c => c[0].toLowerCase() === p.lightHex.toLowerCase()) ? 'on' : ''}" title="Your own colour" aria-label="Your own markings colour"><input type="color" class="pet-color" data-k="lightHex" value="${esc(p.lightHex || '#F3EFE6')}"></label></div>` : ''}</div>
    ${p.kind === 'dog' ? `<div class="le-group"><b>Size</b><div class="le-opts">${opt('size', 's', 'Small', p.size)}${opt('size', 'm', 'Medium', p.size)}${opt('size', 'l', 'Large', p.size)}</div></div>
    <div class="le-group"><b>Ears</b><div class="le-opts">${opt('ears', 'floppy', 'Floppy', p.ears)}${opt('ears', 'pointy', 'Pointed', p.ears)}</div></div>` : ''}
    <div class="le-group"><b>Bed</b><div class="le-sw">${PET_BEDS.map((c, i) => `<button class="sw ${p.bed === i ? 'on' : ''}" style="--c:${c[0]}" data-act="pet-set" data-k="bed" data-v="${i}" aria-label="${c[1]} bed" title="${c[1]}"></button>`).join('')}</div></div>
    <p class="fine-print">${icon('info')}Your ${p.kind} is there the next time you go into your office.</p>`}`;
}


/* ---------- the bowls ---------- */
/** Two bowls side by side next to the bed: a glazed one of water, and one of food with your pet's name painted round it. */
function petBowls(T: any, g: any, P: Pet, bedR: number) {
  const cat = P.kind === 'cat', r = cat ? 0.068 : 0.088, hgt = cat ? 0.042 : 0.052, x = bedR + r + 0.07, gap = r + 0.012;
  const bc = new T.Color((PET_BEDS[P.bed] || PET_BEDS[0])[0]);
  for (const side of [-1, 1]) {
    const food = side > 0, b = new T.Group(); b.position.set(x, 0, side * gap); g.add(b);
    // the bowl: a heavy glazed bowl, wider at the foot, with a rolled rim and a hollow inside
    const pts = [[0, 0], [r * 1.0, 0], [r * 1.04, 0.006], [r * 0.98, hgt * 0.92], [r * 0.95, hgt], [r * 0.9, hgt * 0.99], [r * 0.82, hgt * 0.35], [r * 0.6, hgt * 0.22], [0, hgt * 0.2]].map(p => new T.Vector2(p[0], p[1]));
    const glaze = new T.MeshPhysicalMaterial({ color: food ? bc.clone().offsetHSL(0, -0.05, 0.08) : 0xF1EEE8, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.08 });
    const bowl = new T.Mesh(new T.LatheGeometry(pts, 48), glaze); bowl.castShadow = true; bowl.receiveShadow = true; b.add(bowl);
    // inside: a white glaze
    const inner = new T.Mesh(new T.CircleGeometry(r * 0.6, 32), new T.MeshPhysicalMaterial({ color: 0xF6F3EE, roughness: 0.15, clearcoat: 0.8 })); inner.rotation.x = -Math.PI / 2; inner.position.y = hgt * 0.205; b.add(inner);
    // the name (food) or WATER, painted big on the side facing the room, with a paw print either side
    const lab = food ? (P.name || (cat ? 'Kitty' : 'Buddy')).toUpperCase() : 'WATER', base = food ? bc.clone().offsetHSL(0, -0.05, 0.08) : new T.Color(0xF1EEE8);
    const ink = food ? (base.r * 0.3 + base.g * 0.59 + base.b * 0.11 > 0.45 ? '#2A2420' : '#FFFFFF') : bc.getStyle();
    const c = document.createElement('canvas'); c.width = 2048; c.height = 96; const x2 = c.getContext('2d') as CanvasRenderingContext2D;
    x2.fillStyle = ink; x2.textAlign = 'center'; x2.textBaseline = 'middle';
    let fs = 72; x2.font = `800 ${fs}px "Inter", "Segoe UI", Arial, sans-serif`;
    while (x2.measureText(lab).width > 560 && fs > 30) { fs -= 2; x2.font = `800 ${fs}px "Inter", "Segoe UI", Arial, sans-serif`; }
    x2.fillText(lab, 1024, 52);
    const tw2 = x2.measureText(lab).width;
    for (const px of [1024 - tw2 / 2 - 50, 1024 + tw2 / 2 + 50]) {
      const py = 50; x2.beginPath(); x2.ellipse(px, py + 9, 15, 12, 0, 0, Math.PI * 2); x2.fill();
      for (const [dx, dy] of [[-17, -10], [-6, -22], [6, -22], [17, -10]]) { x2.beginPath(); x2.ellipse(px + dx, py + dy, 5.5, 7, 0, 0, Math.PI * 2); x2.fill(); }
    }
    b.rotation.y = Math.PI;   // the name faces the room (+z of the bed)
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const band = new T.Mesh(new T.CylinderGeometry(r * 0.987, r * 1.025, hgt * 0.5, 64, 1, true), new T.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.2, clearcoat: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    band.position.y = hgt * 0.47; b.add(band);
    if (food) {   // a heap of kibble (a cat's is smaller)
      const n = cat ? 140 : 110, kg = new T.DodecahedronGeometry(cat ? 0.0042 : 0.0062, 0), km = new T.MeshStandardMaterial({ roughness: 0.75 }), im = new T.InstancedMesh(kg, km, n), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), col = new T.Color();
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * r * 0.74, y = hgt * 0.24 + (1 - rr / (r * 0.74)) * hgt * 0.55 * rnd() + rnd() * 0.006;
        e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e); const sc = 0.8 + rnd() * 0.5;
        m4.compose(new T.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), q, new T.Vector3(sc, sc * 0.7, sc)); im.setMatrixAt(i, m4);
        col.setHSL(0.07 + rnd() * 0.03, 0.55, 0.22 + rnd() * 0.12); im.setColorAt(i, col);
      }
      im.castShadow = true; b.add(im);
    } else {   // still water, with a soft glint
      const w = new T.Mesh(new T.CircleGeometry(r * 0.86, 40), new T.MeshPhysicalMaterial({ color: 0x9CC4D6, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1 }));
      w.rotation.x = -Math.PI / 2; w.position.y = hgt * 0.72; b.add(w);
    }
  }
}

/* ---------- a picture of your pet in the editor ---------- */
let _petPrevR: any = null;
/** Draw your pet as it is now (asleep in its bed, with its bowls) into the editor's picture. */
function petPreviewDraw(P: Pet) {
  const cv = document.querySelector('[data-pet-prev]') as HTMLCanvasElement; if (!cv || !P || P.kind === 'none' || typeof THREE === 'undefined') return;
  try {
    const T = THREE, W = cv.width, H = cv.height;
    if (!_petPrevR) { _petPrevR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); _petPrevR.toneMapping = T.ACESFilmicToneMapping; _petPrevR.outputColorSpace = T.SRGBColorSpace; _petPrevR.shadowMap.enabled = true; }
    const ren = _petPrevR; ren.setPixelRatio(1); ren.setSize(W, H, false);
    const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xfff3e2, 0x3a2a1a, 1.3)); const dl = new T.DirectionalLight(0xfff0dc, 2.2); dl.position.set(1, 2.5, 1.5); dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024); sc.add(dl);
    const fl = new T.Mesh(new T.CircleGeometry(1.2, 48), new T.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
    const S: any = State, keep = S.pet; S.pet = P; const A: any = {};
    try { petPlace(T, sc, A, [0, 0], 0); } finally { S.pet = keep; }
    if (A.pet) { A.pet.curl.U.uBreath.value = 0; }
    const cam = new T.PerspectiveCamera(32, W / H, 0.01, 20); cam.position.set(0.55, 0.62, 1.05); cam.lookAt(0.2, 0.05, 0.02);
    ren.render(sc, cam);
    const x = cv.getContext('2d') as CanvasRenderingContext2D; x.clearRect(0, 0, W, H); x.drawImage(ren.domElement, 0, 0, W, H);
    sc.traverse((o: any) => { if (o.material && o.geometry && !o.geometry.userData.keep && o.geometry !== (A.pet && A.pet.curl.sc.geo) && o.geometry !== (A.pet && A.pet.curl.sc.strands)) o.geometry.dispose(); });
  } catch (e) { /* no picture */ }
}

/* ---------- the sculpted body: shapes melted into one smooth surface, and its fur ---------- */
type PetPrim = { k: 'e' | 'c'; a: number[]; b?: number[]; r: number[]; part?: string; light?: number; dark?: number; paint?: boolean };
type PetShapes = { prims: PetPrim[]; tail: number[][]; tailR: number[]; neck: number[]; earL: number[]; earR: number[]; nose: number[]; noseR: number; eyes: any[]; legs?: number[][]; fwd?: number[] };
const _petCache: { [k: string]: any } = {};

/** Standing on four legs, facing +x: the body, chest ruff, neck, head, muzzle, ears, legs with paws and the tail. */
function petStand(P: Pet, s: number): PetShapes {
  const S = (v: number[]) => v.map(x => x * s);
  if (P.kind !== 'cat') {
    const prims: PetPrim[] = [
      { k: 'e', a: S([0.1, 0.2, 0]), r: S([0.16, 0.115, 0.115]), dark: 0.4 },              // chest
      { k: 'e', a: S([-0.12, 0.2, 0]), r: S([0.17, 0.11, 0.115]), dark: 0.5 },             // body and hips
      { k: 'e', a: S([0.17, 0.2, 0]), r: S([0.085, 0.11, 0.095]), light: 1 },              // the white ruff
      { k: 'c', a: S([0.15, 0.25, 0]), b: S([0.24, 0.31, 0]), r: S([0.072, 0.062]), part: 'h' },   // neck
      { k: 'e', a: S([0.28, 0.33, 0]), r: S([0.085, 0.076, 0.078]), part: 'h' },          // skull
      { k: 'c', a: S([0.33, 0.315, 0]), b: S([0.4, 0.3, 0]), r: S([0.042, 0.03]), part: 'h', light: 1 },   // muzzle
      { k: 'e', a: S([0.36, 0.285, 0]), r: S([0.038, 0.016, 0.03]), part: 'h', light: 1 },   // jaw
      { k: 'c', a: S([0.29, 0.38, 0]), b: S([0.37, 0.31, 0]), r: S([0.016, 0.022]), light: 1, paint: true },   // the blaze
    ];
    const legs = [S([0.13, 0.16, 0.06]), S([0.13, 0.16, -0.06]), S([-0.17, 0.16, 0.06]), S([-0.17, 0.16, -0.06])];
    legs.forEach((L, i) => { prims.push({ k: 'c', a: L, b: [L[0] + 0.01 * s, 0.035 * s, L[2]], r: S([i < 2 ? 0.036 : 0.042, 0.03]), part: 'l' + i }, { k: 'e', a: [L[0] + 0.02 * s, 0.022 * s, L[2]], r: S([0.04, 0.022, 0.032]), light: 1, part: 'l' + i }); });
    const pointy = P.ears === 'pointy', eL = S([0.27, 0.38, 0.045]), eR = S([0.27, 0.38, -0.045]);
    if (pointy) prims.push({ k: 'c', a: eL, b: S([0.25, 0.49, 0.08]), r: S([0.042, 0.006]), part: 'eL' }, { k: 'c', a: eR, b: S([0.25, 0.49, -0.08]), r: S([0.042, 0.006]), part: 'eR' });
    else prims.push({ k: 'e', a: S([0.27, 0.33, 0.085]), r: S([0.042, 0.06, 0.014]), part: 'eL', dark: 0.5 }, { k: 'e', a: S([0.27, 0.33, -0.085]), r: S([0.042, 0.06, 0.014]), part: 'eR', dark: 0.5 });
    const tail = [[-0.27, 0.24, 0], [-0.33, 0.29, 0], [-0.36, 0.34, 0], [-0.35, 0.39, 0]].map(S);
    return { prims, tail, tailR: S([0.042, 0.034]), neck: S([0.18, 0.27, 0]), earL: eL, earR: eR, nose: S([0.433, 0.306, 0]), noseR: 0.018 * s, legs, fwd: [1, 0, 0],
      eyes: [{ at: S([0.354, 0.35, 0.042]), len: 0.019 * s, rx: 0, ry: -0.45, rz: 0 }, { at: S([0.354, 0.35, -0.042]), len: 0.019 * s, rx: 0, ry: 0.45, rz: 0 }] };
  }
  const prims: PetPrim[] = [
    { k: 'e', a: S([-0.02, 0.17, 0]), r: S([0.16, 0.095, 0.095]), dark: 0.5 },           // body
    { k: 'e', a: S([0.1, 0.165, 0]), r: S([0.08, 0.09, 0.085]), light: 1 },              // chest and belly
    { k: 'c', a: S([0.11, 0.2, 0]), b: S([0.17, 0.25, 0]), r: S([0.058, 0.05]), part: 'h' },   // neck
    { k: 'e', a: S([0.2, 0.275, 0]), r: S([0.074, 0.068, 0.072]), part: 'h' },            // head
    { k: 'e', a: S([0.255, 0.26, 0]), r: S([0.034, 0.027, 0.042]), part: 'h', light: 1 },  // muzzle
    { k: 'e', a: S([0.245, 0.245, 0]), r: S([0.028, 0.015, 0.03]), part: 'h', light: 1 },  // chin
  ];
  const legs = [S([0.09, 0.14, 0.045]), S([0.09, 0.14, -0.045]), S([-0.12, 0.14, 0.045]), S([-0.12, 0.14, -0.045])];
  legs.forEach((L, i) => { prims.push({ k: 'c', a: L, b: [L[0] + 0.008 * s, 0.025 * s, L[2]], r: S([i < 2 ? 0.027 : 0.032, 0.023]), part: 'l' + i }, { k: 'e', a: [L[0] + 0.014 * s, 0.017 * s, L[2]], r: S([0.028, 0.017, 0.024]), light: 1, part: 'l' + i }); });
  const eL = S([0.19, 0.32, 0.036]), eR = S([0.19, 0.32, -0.036]);
  prims.push({ k: 'c', a: eL, b: S([0.185, 0.385, 0.055]), r: S([0.03, 0.004]), part: 'eL' }, { k: 'c', a: eR, b: S([0.185, 0.385, -0.055]), r: S([0.03, 0.004]), part: 'eR' });
  const tail = [[-0.16, 0.19, 0], [-0.24, 0.22, 0], [-0.29, 0.3, 0], [-0.28, 0.38, 0]].map(S);
  return { prims, tail, tailR: S([0.028, 0.023]), neck: S([0.13, 0.22, 0]), earL: eL, earR: eR, nose: S([0.288, 0.268, 0]), noseR: 0.009 * s, legs, fwd: [1, 0, 0],
    eyes: [{ at: S([0.27, 0.293, 0.032]), len: 0.021 * s, rx: 0, ry: -0.45, rz: 0 }, { at: S([0.27, 0.293, -0.032]), len: 0.021 * s, rx: 0, ry: 0.45, rz: 0 }] };
}

/** The pet as one mesh in a pose, with its strands of fur (built once for each look and pose, then kept). */
function petSculpt(T: any, P: Pet, s: number, pose: 'curl' | 'stand'): any {
  const key = JSON.stringify([P.kind, petCoatHex(P), petLightHex(P), P.size, P.ears, s, pose]); if (_petCache[key]) return _petCache[key];
  const cat = P.kind === 'cat', D = pose === 'stand' ? petStand(P, s) : petCurl(P, s), prims = D.prims.slice();
  for (let i = 0; i < D.tail.length - 1; i++) { const f0 = i / (D.tail.length - 1), f1 = (i + 1) / (D.tail.length - 1); prims.push({ k: 'c', a: D.tail[i], b: D.tail[i + 1], r: [D.tailR[0] + (D.tailR[1] - D.tailR[0]) * f0, D.tailR[0] + (D.tailR[1] - D.tailR[0]) * f1], part: 't' + i }); }
  const K = 0.03 * s;
  const ell = (p: number[], c: number[], r: number[]) => { const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2], k0 = Math.sqrt(x * x + y * y + z * z), k1 = Math.sqrt(x * x / (r[0] * r[0]) + y * y / (r[1] * r[1]) + z * z / (r[2] * r[2])); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]); };
  const cap = (p: number[], a: number[], b: number[], r: number[]) => { const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]; let h = (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / L2; h = h < 0 ? 0 : h > 1 ? 1 : h; const dx = pa[0] - ba[0] * h, dy = pa[1] - ba[1] * h, dz = pa[2] - ba[2] * h; return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r[0] + (r[1] - r[0]) * h); };
  const prim = (q: PetPrim, p: number[]) => q.k === 'e' ? ell(p, q.a, q.r) : cap(p, q.a, q.b, q.r);
  const smin = (a: number, b: number) => { const h = Math.max(K - Math.abs(a - b), 0) / K; return Math.min(a, b) - h * h * K * 0.25; };
  const solid = prims.filter(q => !q.paint), field = (p: number[]) => { let d = 1e9; for (const q of solid) d = smin(d, prim(q, p)); return d; };
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const q of solid) { const pts = q.k === 'e' ? [[q.a[0] - q.r[0], q.a[1] - q.r[1], q.a[2] - q.r[2]], [q.a[0] + q.r[0], q.a[1] + q.r[1], q.a[2] + q.r[2]]] : [q.a.map(v => v - q.r[0]), q.a.map(v => v + q.r[0]), q.b.map(v => v - q.r[1]), q.b.map(v => v + q.r[1])]; for (const p of pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } }
  const pad = 0.02 * s; lo = lo.map(v => v - pad); hi = hi.map(v => v + pad);
  const h = 0.0072 * s, nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz), at = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[at(i, j, k)] = field([lo[0] + i * h, lo[1] + j * h, lo[2] + k * h]);
  const vid = new Int32Array(nx * ny * nz).fill(-1), pos: number[] = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const c = [F[at(i, j, k)], F[at(i + 1, j, k)], F[at(i, j + 1, k)], F[at(i + 1, j + 1, k)], F[at(i, j, k + 1)], F[at(i + 1, j, k + 1)], F[at(i, j + 1, k + 1)], F[at(i + 1, j + 1, k + 1)]];
    let neg = 0; for (const v of c) if (v < 0) neg++; if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) { if ((c[a] < 0) === (c[b] < 0)) continue; const t = c[a] / (c[a] - c[b]); const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1, bx2 = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1; sx += ax + (bx2 - ax) * t; sy += ay + (by - ay) * t; sz += az + (bz - az) * t; n++; }
    vid[at(i, j, k)] = pos.length / 3; pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = F[at(i, j, k)] < 0;
    if (v0 !== (F[at(i + 1, j, k)] < 0)) quad(vid[at(i, j - 1, k - 1)], vid[at(i, j, k - 1)], vid[at(i, j, k)], vid[at(i, j - 1, k)], !v0);
    if (v0 !== (F[at(i, j + 1, k)] < 0)) quad(vid[at(i - 1, j, k - 1)], vid[at(i - 1, j, k)], vid[at(i, j, k)], vid[at(i, j, k - 1)], !v0);
    if (v0 !== (F[at(i, j, k + 1)] < 0)) quad(vid[at(i - 1, j - 1, k)], vid[at(i, j - 1, k)], vid[at(i, j, k)], vid[at(i - 1, j, k)], !v0);
  }
  // normals from the field; weights (head, ears, paws, tail, legs) and colours from the shapes nearest each point
  const nV = pos.length / 3, nor = new Float32Array(nV * 3), col = new Float32Array(nV * 3), pw = new Float32Array(nV * 4), lw = new Float32Array(nV * 4), tw = new Float32Array(nV), len = new Float32Array(nV);
  const coat = new T.Color(petCoatHex(P)), lh = petLightHex(P), light = lh ? new T.Color(lh) : coat.clone().offsetHSL(0, -0.04, 0.07), dark = coat.clone().multiplyScalar(0.72), pink = new T.Color('#E7A3A0'), tmp = new T.Color();
  const e = 0.0015 * s, nTail = D.tail.length - 1, fw = D.fwd || [1, 0, 0];
  for (let v = 0; v < nV; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
    const gx = field([p[0] + e, p[1], p[2]]) - field([p[0] - e, p[1], p[2]]), gy = field([p[0], p[1] + e, p[2]]) - field([p[0], p[1] - e, p[2]]), gz = field([p[0], p[1], p[2] + e]) - field([p[0], p[1], p[2] - e]), gl = Math.hypot(gx, gy, gz) || 1;
    const n = [gx / gl, gy / gl, gz / gl]; nor[v * 3] = n[0]; nor[v * 3 + 1] = n[1]; nor[v * 3 + 2] = n[2];
    let wh = 0, wl = 0, wr = 0, wp = 0, wt = 0, li = 0, dk = 0, tot = 0; const wleg = [0, 0, 0, 0];
    for (const q of prims) { const d = prim(q, p), w = Math.exp(-Math.max(0, d) / (0.012 * s)); if (!q.paint) tot += w;
      if (q.paint) { li += (q.light || 0) * Math.exp(-Math.max(0, d) / (0.006 * s)) * 3; continue; }
      if (q.part === 'h' || q.part === 'eL' || q.part === 'eR') wh += w; if (q.part === 'eL') wl += w; if (q.part === 'eR') wr += w; if (q.part === 'p') wp += w;
      if (q.part && q.part[0] === 't') wt += w * (0.3 + 0.7 * (+q.part.slice(1) + 1) / nTail);
      if (q.part && q.part[0] === 'l') wleg[+q.part[1]] += w * Math.min(1, Math.max(0, (D.legs ? D.legs[+q.part[1]][1] - p[1] : 0) / (0.06 * s) + 0.35));
      li += w * (q.light || 0); dk += w * (q.dark || 0); }
    tot = tot || 1; pw[v * 4] = wh / tot; pw[v * 4 + 1] = Math.min(1, wl / tot * 1.4); pw[v * 4 + 2] = Math.min(1, wr / tot * 1.4); pw[v * 4 + 3] = wp / tot; tw[v] = wt / tot;
    for (let k = 0; k < 4; k++) lw[v * 4 + k] = Math.min(1, wleg[k] / tot * 1.2);
    const lk = Math.min(1, li / tot * 1.3), dkk = Math.min(1, dk / tot) * Math.max(0, n[1]) * (1 - lk);
    tmp.copy(coat).lerp(dark, dkk);
    // a cat's tabby stripes over its back and sides
    if (cat) { const band = 0.5 + 0.5 * Math.sin((p[0] * 62 + p[2] * 18 + p[1] * 26) / s); tmp.lerp(dark.clone().multiplyScalar(0.85), 0.55 * Math.max(0, band * band * band - 0.2) * (1 - lk) * (n[1] > -0.4 ? 1 : 0)); }
    tmp.lerp(light, lk);
    // the inside of an upright ear is pink
    const earW = Math.max(pw[v * 4 + 1], pw[v * 4 + 2]); if (earW > 0.4 && (cat || P.ears === 'pointy')) tmp.lerp(pink, Math.min(1, (earW - 0.4) * 2.5) * Math.max(0, Math.min(1, (n[0] * fw[0] + n[2] * fw[2] - 0.1) * 2.2)));
    col[v * 3] = tmp.r; col[v * 3 + 1] = tmp.g; col[v * 3 + 2] = tmp.b;
    // how long the fur is here: short on the face and ears, long on the chest ruff and the tail
    len[v] = (0.011 * (1 - pw[v * 4]) + 0.006 * pw[v * 4]) * (1 + 0.6 * lk * (1 - pw[v * 4])) * (1 + 1.1 * tw[v]) * (earW > 0.4 ? 0.45 : 1) * s;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.setAttribute('pw', new T.BufferAttribute(pw, 4)); geo.setAttribute('lw', new T.BufferAttribute(lw, 4)); geo.setAttribute('tw', new T.BufferAttribute(tw, 1)); geo.setIndex(idx);
  const strands = petStrands(T, pos, nor, col, pw, lw, tw, len, idx, cat ? 5200 : 7000, s, fw);
  const V = (a: number[]) => new T.Vector3(a[0], a[1], a[2]);
  const legs = (D.legs || [D.neck, D.neck, D.neck, D.neck]).map(V);
  const out = { geo, strands, neck: V(D.neck), earL: V(D.earL), earR: V(D.earR), tailBase: V(D.tail[0]), nose: V(D.nose), noseR: D.noseR, legs, fwd: V(fw), eyes: D.eyes.map(x => ({ at: V(x.at), len: x.len, rx: x.rx, ry: x.ry, rz: x.rz })), verts: nV + strands.attributes.position.count };
  _petCache[key] = out; return out;
}

/** Strands of fur over the body: fine tapering hairs laid back along it (down the legs), lighter at the tips. */
function petStrands(T: any, pos: number[], nor: Float32Array, col: Float32Array, pw: Float32Array, lw: Float32Array, tw: Float32Array, len: Float32Array, idx: number[], N: number, s: number, fw: number[]): any {
  const nT = idx.length / 3, cum = new Float32Array(nT); let tot = 0;
  const P = (i: number) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  for (let t = 0; t < nT; t++) { const a = P(idx[t * 3]), b = P(idx[t * 3 + 1]), c = P(idx[t * 3 + 2]); const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; tot += 0.5 * Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]); cum[t] = tot; }
  const V: number[] = [], Nn: number[] = [], C: number[] = [], PW: number[] = [], LW: number[] = [], TW: number[] = [];
  let seed = 12345; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < N; k++) {
    const r = rnd() * tot; let lo = 0, hi = nT - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
    const ia = idx[lo * 3], ib = idx[lo * 3 + 1], ic = idx[lo * 3 + 2]; let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w0 = 1 - u - v;
    const p = [0, 1, 2].map(j => pos[ia * 3 + j] * w0 + pos[ib * 3 + j] * u + pos[ic * 3 + j] * v);
    const n = [0, 1, 2].map(j => nor[ia * 3 + j] * w0 + nor[ib * 3 + j] * u + nor[ic * 3 + j] * v); const nl = Math.hypot(n[0], n[1], n[2]) || 1; n[0] /= nl; n[1] /= nl; n[2] /= nl;
    // the way the hair lies: back along the body, down the legs
    const leg = Math.max(lw[ia * 4], lw[ia * 4 + 1], lw[ia * 4 + 2], lw[ia * 4 + 3]);
    let d = [-fw[0] * (1 - leg), -0.35 - 0.65 * leg, -fw[2] * (1 - leg)]; const dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2]; d = [d[0] - n[0] * dn, d[1] - n[1] * dn, d[2] - n[2] * dn]; const dl = Math.hypot(d[0], d[1], d[2]) || 1; d = d.map(x => x / dl);
    const L = len[ia] * (0.7 + 0.6 * rnd()), wd = 0.0011 * s;
    const sd = [n[1] * d[2] - n[2] * d[1], n[2] * d[0] - n[0] * d[2], n[0] * d[1] - n[1] * d[0]];
    const tip = [p[0] + d[0] * L + n[0] * L * 0.4, p[1] + d[1] * L + n[1] * L * 0.4, p[2] + d[2] * L + n[2] * L * 0.4];
    V.push(p[0] - sd[0] * wd, p[1] - sd[1] * wd, p[2] - sd[2] * wd, p[0] + sd[0] * wd, p[1] + sd[1] * wd, p[2] + sd[2] * wd, tip[0], tip[1], tip[2]);
    for (let q = 0; q < 3; q++) { Nn.push(n[0], n[1], n[2]); const k2 = q === 2 ? 1.14 : 0.86; C.push(Math.min(1, col[ia * 3] * k2), Math.min(1, col[ia * 3 + 1] * k2), Math.min(1, col[ia * 3 + 2] * k2)); for (let j = 0; j < 4; j++) { PW.push(pw[ia * 4 + j]); LW.push(lw[ia * 4 + j]); } TW.push(tw[ia]); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(V, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  g.setAttribute('pw', new T.Float32BufferAttribute(PW, 4)); g.setAttribute('lw', new T.Float32BufferAttribute(LW, 4)); g.setAttribute('tw', new T.Float32BufferAttribute(TW, 1));
  return g;
}

function petCurl(P: Pet, s: number): PetShapes {
  const S = (v: number[]) => v.map(x => x * s);
  if (P.kind !== 'cat') {
    const floppy = P.ears !== 'pointy';
    const prims: PetPrim[] = [
      { k: 'e', a: S([0.10, 0.13, -0.02]), r: S([0.17, 0.125, 0.15]), dark: 0.4 },                   // chest
      { k: 'e', a: S([-0.13, 0.12, 0.03]), r: S([0.18, 0.12, 0.16]), dark: 0.5 },                    // hips
      { k: 'e', a: S([0.15, 0.085, 0.09]), r: S([0.11, 0.07, 0.08]), light: 1 },                     // the chest's front
      { k: 'c', a: S([0.15, 0.15, 0.0]), b: S([0.27, 0.12, 0.09]), r: S([0.075, 0.062]), part: 'h' },  // neck
      { k: 'e', a: S([0.31, 0.115, 0.115]), r: S([0.092, 0.078, 0.082]), part: 'h' },               // skull
      { k: 'e', a: S([0.30, 0.15, 0.115]), r: S([0.06, 0.03, 0.06]), part: 'h', dark: 0.3 },         // brow
      { k: 'c', a: S([0.35, 0.102, 0.128]), b: S([0.425, 0.092, 0.148]), r: S([0.046, 0.034]), part: 'h', light: 1 },   // muzzle
      { k: 'e', a: S([0.385, 0.08, 0.14]), r: S([0.04, 0.018, 0.03]), part: 'h', light: 1 },        // jaw
      // the front legs stretched out under the head, with paws
      { k: 'c', a: S([0.14, 0.055, 0.03]), b: S([0.33, 0.03, 0.05]), r: S([0.042, 0.03]) },
      { k: 'c', a: S([0.15, 0.055, 0.14]), b: S([0.35, 0.028, 0.16]), r: S([0.042, 0.03]) },
      { k: 'e', a: S([0.345, 0.026, 0.052]), r: S([0.044, 0.026, 0.035]), light: 1, part: 'p' },
      { k: 'e', a: S([0.365, 0.024, 0.163]), r: S([0.044, 0.026, 0.035]), light: 1, part: 'p' },
      // the folded hind leg: thigh, hock and paw
      { k: 'e', a: S([-0.11, 0.1, 0.15]), r: S([0.125, 0.085, 0.06]) },
      { k: 'c', a: S([-0.02, 0.035, 0.18]), b: S([-0.2, 0.03, 0.2]), r: S([0.035, 0.026]) },
      { k: 'e', a: S([0.02, 0.025, 0.185]), r: S([0.045, 0.022, 0.032]), light: 1, part: 'p' },
    ];
    // the ears: soft flaps hanging by the head, or pointed and upright
    const earL = S([0.285, 0.165, 0.055]), earR = S([0.295, 0.165, 0.18]);
    if (floppy) { prims.push({ k: 'e', a: S([0.285, 0.128, 0.042]), r: S([0.042, 0.06, 0.014]), part: 'eL', dark: 0.5 }, { k: 'e', a: S([0.295, 0.128, 0.192]), r: S([0.042, 0.06, 0.014]), part: 'eR', dark: 0.5 }); }
    else { prims.push({ k: 'c', a: S([0.285, 0.16, 0.06]), b: S([0.265, 0.27, 0.025]), r: S([0.042, 0.006]), part: 'eL' }, { k: 'c', a: S([0.295, 0.16, 0.175]), b: S([0.285, 0.27, 0.215]), r: S([0.042, 0.006]), part: 'eR' }); }
    prims.push({ k: 'c', a: S([0.31, 0.2, 0.118]), b: S([0.42, 0.12, 0.148]), r: S([0.018, 0.026]), light: 1, paint: true });   // the white blaze
    const tail = [[-0.3, 0.1, 0.0], [-0.33, 0.06, 0.12], [-0.22, 0.045, 0.24], [-0.04, 0.04, 0.28], [0.12, 0.04, 0.25]].map(S);
    return { prims, tail, tailR: S([0.036, 0.018]), neck: S([0.2, 0.12, 0.05]), earL, earR, nose: S([0.455, 0.1, 0.154]), noseR: 0.017 * s,
      eyes: [{ at: S([0.375, 0.135, 0.085]), len: 0.016 * s, rx: 0, ry: -0.5, rz: 0.15 }, { at: S([0.385, 0.135, 0.165]), len: 0.016 * s, rx: 0, ry: -0.9, rz: 0.15 }] };
  }
  const prims: PetPrim[] = [
    { k: 'e', a: S([-0.02, 0.11, 0.0]), r: S([0.2, 0.115, 0.17]), dark: 0.5 },                      // the curled body
    { k: 'e', a: S([0.07, 0.085, 0.08]), r: S([0.1, 0.07, 0.08]), light: 1 },                       // chest
    { k: 'c', a: S([0.06, 0.12, 0.03]), b: S([0.13, 0.1, 0.09]), r: S([0.06, 0.05]), part: 'h' },   // neck
    { k: 'e', a: S([0.15, 0.1, 0.1]), r: S([0.072, 0.064, 0.07]), part: 'h' },                      // head
    { k: 'e', a: S([0.2, 0.086, 0.114]), r: S([0.034, 0.026, 0.04]), part: 'h', light: 1 },          // muzzle
    { k: 'e', a: S([0.185, 0.07, 0.115]), r: S([0.03, 0.016, 0.03]), part: 'h', light: 1 },          // chin
    { k: 'c', a: S([0.06, 0.03, 0.11]), b: S([0.17, 0.024, 0.15]), r: S([0.024, 0.019]) },           // front legs
    { k: 'c', a: S([0.05, 0.03, 0.16]), b: S([0.15, 0.022, 0.19]), r: S([0.024, 0.019]) },
    { k: 'e', a: S([0.175, 0.022, 0.152]), r: S([0.026, 0.017, 0.022]), light: 1, part: 'p' },
    { k: 'e', a: S([0.155, 0.02, 0.193]), r: S([0.026, 0.017, 0.022]), light: 1, part: 'p' },
    { k: 'c', a: S([0.14, 0.145, 0.07]), b: S([0.135, 0.205, 0.06]), r: S([0.028, 0.004]), part: 'eL' },   // pointed ears
    { k: 'c', a: S([0.16, 0.145, 0.135]), b: S([0.16, 0.205, 0.15]), r: S([0.028, 0.004]), part: 'eR' },
  ];
  const tail = [[-0.2, 0.09, -0.06], [-0.2, 0.05, 0.12], [-0.02, 0.04, 0.2], [0.14, 0.04, 0.18], [0.24, 0.05, 0.08]].map(S);
  return { prims, tail, tailR: S([0.027, 0.02]), neck: S([0.08, 0.11, 0.05]), earL: S([0.14, 0.145, 0.07]), earR: S([0.16, 0.145, 0.135]), nose: S([0.232, 0.092, 0.118]), noseR: 0.009 * s,
    eyes: [{ at: S([0.205, 0.112, 0.08]), len: 0.012 * s, rx: 0, ry: -0.6, rz: 0.25 }, { at: S([0.205, 0.112, 0.145]), len: 0.012 * s, rx: 0, ry: -0.9, rz: 0.25 }] };
}

