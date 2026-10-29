// Builds a posed human body from the CC0 base mesh + targets, with garment fields.
const fs = require('fs'), path = require('path');
const THREE = require(process.env.THREE_JS || '../../node_modules/three/build/three.min.js');
const D = process.env.MH_DATA || path.join(__dirname, 'makehuman-data');
const SC = 0.1; // decimetres -> metres

// ---- base mesh ----
const objTxt = fs.readFileSync(path.join(D, '3dobjs/base.obj'), 'utf8').split('\n');
const V = []; let group = ''; const faces = [];
for (const l of objTxt) {
  if (l.startsWith('v ')) { const p = l.split(/\s+/); V.push([+p[1], +p[2], +p[3]]); }
  else if (l.startsWith('g ')) group = l.slice(2).trim();
  else if (l.startsWith('f ') && group === 'body') faces.push(l.split(/\s+/).slice(1).filter(Boolean).map(t => +t.split('/')[0] - 1));
}
const N = V.length;
function loadTarget(rel, w, P) {
  if (!w) return;
  const f = path.join(D, 'targets', rel);
  if (!fs.existsSync(f)) { console.error('missing target', rel); return; }
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l || l[0] === '#') continue;
    const p = l.trim().split(/\s+/); const i = +p[0];
    P[i][0] += w * +p[1]; P[i][1] += w * +p[2]; P[i][2] += w * +p[3];
  }
}
const skel = JSON.parse(fs.readFileSync(path.join(D, 'rigs/default.mhskel'), 'utf8'));
const wts = JSON.parse(fs.readFileSync(path.join(D, 'rigs/default_weights.mhw'), 'utf8')).weights;

function build(o) {
  // o: { male: 0..1, eth: {african, asian, caucasian}, muscle: 'average', weight: 'average', stylise: 0..1 }
  const P = V.map(v => v.slice());
  const g = [['male', o.male], ['female', 1 - o.male]];
  const mw = (o.muscle || 'average') + 'muscle-' + (o.weight || 'average') + 'weight';
  for (const [gs, gw] of g) {
    loadTarget(`macrodetails/universal-${gs}-young-${mw}.target`, gw, P);
    for (const e of ['african', 'asian', 'caucasian']) loadTarget(`macrodetails/${e}-${gs}-young.target`, gw * (o.eth[e] || 0), P);
    loadTarget(`macrodetails/proportions/${gs}-young-${mw}-idealproportions.target`, gw * 1, P);
  }
  for (const p of P) { p[0] *= SC; p[1] *= SC; p[2] *= SC; }
  // ground the feet
  let minY = 1e9; for (const f of faces) for (const i of f) minY = Math.min(minY, P[i][1]);
  for (const p of P) p[1] -= minY;
  const joint = name => { const ids = skel.joints[name]; const c = [0, 0, 0]; ids.forEach(i => { c[0] += P[i][0]; c[1] += P[i][1]; c[2] += P[i][2]; }); return new THREE.Vector3(c[0] / ids.length, c[1] / ids.length, c[2] / ids.length); };
  const head = b => joint(skel.bones[b].head), tail = b => joint(skel.bones[b].tail);
  // bone -> weights per vertex
  const W = {}; for (const b in wts) { const a = new Float32Array(N); for (const [i, w] of wts[b]) a[i] = w; W[b] = a; }
  const children = {}; for (const b in skel.bones) { const p = skel.bones[b].parent; (children[p] = children[p] || []).push(b); }
  const subtree = b => { const out = [b]; (children[b] || []).forEach(c => out.push(...subtree(c))); return out; };
  const sumW = bones => { const a = new Float32Array(N); bones.forEach(b => { if (W[b]) for (let i = 0; i < N; i++) a[i] += W[b][i]; }); return a; };

  // ---- narrower shoulders (men): move the shoulder girdle and arms in a little ----
  { const nar = (o.narrow != null ? o.narrow : 0.022 * o.male);
    if (nar) for (const sd of ['L', 'R']) { const cw = sumW(subtree('clavicle.' + sd)), sg = sd === 'L' ? 1 : -1;
      for (let i = 0; i < N; i++) if (cw[i] > 0) P[i][0] -= sg * nar * Math.min(1, cw[i]); } }
  // ---- stylise: slightly larger head and eyes ----
  const st = o.stylise || 0;
  const headW = sumW(subtree('head')), neckP = head('head');
  const eyeL = joint('eye.L____head'), eyeR = joint('eye.R____head');
  if (st) {
    const k = 1 + 0.13 * st;
    for (let i = 0; i < N; i++) if (headW[i] > 0) { const w = Math.min(1, headW[i]); for (let a = 0; a < 3; a++) P[i][a] = neckP.getComponent(a) + (P[i][a] - neckP.getComponent(a)) * (1 + (k - 1) * w); }
    eyeL.sub(neckP).multiplyScalar(k).add(neckP); eyeR.sub(neckP).multiplyScalar(k).add(neckP);
    const ek = 1 + 0.3 * st;
    for (const c of [eyeL, eyeR]) for (let i = 0; i < N; i++) {
      const d = Math.hypot(P[i][0] - c.x, P[i][1] - c.y, P[i][2] - c.z);
      const f = Math.max(0, 1 - d / 0.04); if (!f) continue;
      const s = 1 + (ek - 1) * f * f;
      P[i][0] = c.x + (P[i][0] - c.x) * s; P[i][1] = c.y + (P[i][1] - c.y) * s; P[i][2] = c.z + (P[i][2] - c.z) * s;
    }
  }
  // close the lips gently (the base face has them slightly apart)
  { const up = tail('oris05'), lo = tail('oris01'), my = (up.y + lo.y) / 2, mz = Math.max(up.z, lo.z);
    for (let i = 0; i < N; i++) { if (headW[i] < 0.5) continue; const dx = Math.abs(P[i][0]), dy = P[i][1] - my;
      if (dx > 0.032 || Math.abs(dy) > 0.014 || P[i][2] < mz - 0.025) continue;
      const f = (1 - dx / 0.032) * (1 - Math.abs(dy) / 0.014); P[i][1] = my + dy * (1 - 0.6 * f); } }
  const rest = P.map(p => p.slice());
  // ---- garment fields (rest pose) ----
  const F = {};
  const armW = { L: sumW(subtree('upperarm01.L')), R: sumW(subtree('upperarm01.R')) };
  const legW = { L: sumW(subtree('upperleg01.L')), R: sumW(subtree('upperleg01.R')) };
  const sh = { L: head('upperarm01.L'), R: head('upperarm01.R') }, wr = { L: head('wrist.L'), R: head('wrist.R') }, el = { L: head('lowerarm01.L'), R: head('lowerarm01.R') };
  const armLen = sh.L.distanceTo(wr.L);
  const ankleY = head('foot.L').y, kneeY = head('lowerleg01.L').y, hipY = head('upperleg01.L').y;
  const neckBase = head('neck01'), headTop = (() => { let m = 0; for (let i = 0; i < N; i++) if (headW[i] > 0.5) m = Math.max(m, P[i][1]); return m; })();
  // head ellipsoid (for hairline)
  let hc = new THREE.Vector3(), hn = 0; const hb = new THREE.Box3();
  for (let i = 0; i < N; i++) if (headW[i] > 0.9 && P[i][1] > eyeL.y - 0.03) { hb.expandByPoint(new THREE.Vector3(...P[i])); }
  hb.getCenter(hc); const hs = new THREE.Vector3(); hb.getSize(hs);
  const crotchY = (() => { let m = 0; for (let i = 0; i < N; i++) if (Math.abs(P[i][0]) < 0.01 && P[i][1] < hipY && P[i][1] > 0.5) m = Math.max(m, P[i][1]); return m; })();
  const mouthJ = ['oris01', 'oris02', 'oris05', 'oris06'].map(b => [b, head(b).toArray().map(x => +x.toFixed(4)), tail(b).toArray().map(x => +x.toFixed(4))]);
  let rEye = 1; for (let i = 0; i < N; i++) { if (headW[i] < 0.5) continue; rEye = Math.min(rEye, Math.hypot(P[i][0] - eyeL.x, P[i][1] - eyeL.y, P[i][2] - eyeL.z)); }
  const info = { neckPivot: neckP.toArray(), st, mouthJ, rEye, armLen, ankleY, kneeY, hipY, crotchY, neckY: neckBase.y, headTop, eyeL: eyeL.toArray(), eyeR: eyeR.toArray(), headC: hc.toArray(), headS: hs.toArray(), sh: sh.L.toArray(), el: el.L.toArray() };
  const A = new Float32Array(N * 4), B = new Float32Array(N * 4), C = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3(...P[i]);
    // arm coordinate: metres from the shoulder along the arm (0 for non-arm)
    let s = 0, aw = 0;
    for (const side of ['L', 'R']) if (armW[side][i] > aw) { aw = armW[side][i]; const ax = wr[side].clone().sub(sh[side]).normalize(); s = v.clone().sub(sh[side]).dot(ax); }
    let lw = Math.max(legW.L[i], legW.R[i]);
    // head-local direction for the hairline
    const d = v.clone().sub(hc); const nx = d.x / (hs.x / 2), ny = d.y / (hs.y / 2), nz = d.z / (hs.z / 2);
    A[i * 4] = s; A[i * 4 + 1] = aw; A[i * 4 + 2] = lw; A[i * 4 + 3] = headW[i];
    B[i * 4] = nx; B[i * 4 + 1] = ny; B[i * 4 + 2] = nz; B[i * 4 + 3] = 0;
  }
  // ---- pose: arms down, elbows slightly bent ----
  const local = {};
  const angle = side => { const a = wr[side].clone().sub(sh[side]); return Math.atan2(a.y, Math.abs(a.x)); };
  const aim = (from, to, dir) => new THREE.Quaternion().setFromUnitVectors(to.clone().sub(from).normalize(), dir.clone().normalize());
  for (const side of ['L', 'R']) {
    const sgn = side === 'L' ? 1 : -1; // L is +x
    local['upperarm01.' + side] = { pivot: sh[side], q: aim(sh[side], el[side], new THREE.Vector3(sgn * (o.male ? 0.12 : 0.17), -1, 0.03)) };
    // forearm: aim relative to the already turned upper arm, a small forward bend
    const elT = el[side].clone(), wrT = wr[side].clone();
    const qU = local['upperarm01.' + side].q;
    const fore = wrT.clone().sub(elT).applyQuaternion(qU);
    local['lowerarm01.' + side] = { pivot: el[side], q: new THREE.Quaternion().setFromUnitVectors(fore.clone().normalize(), new THREE.Vector3(sgn * 0.1, -1, 0.1).normalize()) };
    const hipJ = head('upperleg01.' + side), knee = head('lowerleg01.' + side);
    local['upperleg01.' + side] = { pivot: hipJ, q: aim(hipJ, knee, new THREE.Vector3(sgn * 0.035, -1, 0)) };
    const ank = head('foot.' + side), shin = ank.clone().sub(knee).applyQuaternion(local['upperleg01.' + side].q);
    local['lowerleg01.' + side] = { pivot: knee, q: new THREE.Quaternion().setFromUnitVectors(shin.normalize(), new THREE.Vector3(sgn * 0.0, -1, -0.02).normalize()) };
  }
  // world matrices by walking the hierarchy
  const M = {};
  const walk = (b, parentM) => {
    let m = parentM.clone();
    if (local[b]) { const L = local[b]; const t = new THREE.Matrix4().makeTranslation(L.pivot.x, L.pivot.y, L.pivot.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(L.q)).multiply(new THREE.Matrix4().makeTranslation(-L.pivot.x, -L.pivot.y, -L.pivot.z)); m = parentM.clone().multiply(t); }
    M[b] = m; (children[b] || []).forEach(c => walk(c, m));
  };
  walk('root', new THREE.Matrix4());
  const out = new Float32Array(N * 3);
  const tmp = new THREE.Vector3(), acc = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    acc.set(0, 0, 0); let ws = 0;
    for (const b in W) { const w = W[b][i]; if (!w) continue; tmp.set(...P[i]).applyMatrix4(M[b] || new THREE.Matrix4()); acc.addScaledVector(tmp, w); ws += w; }
    if (ws < 1e-6) acc.set(...P[i]); else acc.multiplyScalar(1 / ws);
    out[i * 3] = acc.x; out[i * 3 + 1] = acc.y; out[i * 3 + 2] = acc.z;
  }
  // compact to body vertices; triangulate
  const used = new Int32Array(N).fill(-1); const map = []; const idx = [];
  for (const f of faces) for (const i of f) if (used[i] < 0) { used[i] = map.length; map.push(i); }
  for (const f of faces) { const q = f.map(i => used[i]); idx.push(q[0], q[1], q[2]); if (q.length === 4) idx.push(q[0], q[2], q[3]); }
  const pick = (arr, k) => { const r = new Float32Array(map.length * k); map.forEach((i, j) => { for (let a = 0; a < k; a++) r[j * k + a] = arr[i * k + a]; }); return Array.from(r, x => +x.toFixed(5)); };
  // posed eye centres and wrists (for props)
  const posedJ = name => { const ids = skel.joints[name]; const c = [0, 0, 0]; ids.forEach(i => { c[0] += out[i * 3]; c[1] += out[i * 3 + 1]; c[2] += out[i * 3 + 2]; }); return c.map(x => x / ids.length); };
  info.wristPosedL = posedJ(skel.bones['wrist.L'].head); info.wristPosedR = posedJ(skel.bones['wrist.R'].head);
  info.J = {}; for (const bn of ['upperarm01.L', 'upperarm01.R', 'wrist.L', 'wrist.R', 'upperleg01.L', 'upperleg01.R', 'foot.L', 'foot.R', 'lowerarm01.L', 'lowerarm01.R', 'lowerleg01.L', 'lowerleg01.R']) info.J[bn] = posedJ(skel.bones[bn].head);
  return { pos: pick(out, 3), rest: pick(new Float32Array(rest.flat()), 3), A: pick(A, 4), B: pick(B, 4), idx, info };
}
module.exports = { build };
if (require.main === module) {
  const people = JSON.parse(process.argv[2]);
  const res = people.map(p => Object.assign({ id: p.id, role: p.role }, build(p)));
  fs.writeFileSync(process.argv[3], 'window.BODIES=' + JSON.stringify(res) + ';');
  res.forEach(r => console.log(r.id, JSON.stringify(r.info, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v)));
}
