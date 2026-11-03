// Your pet: a dog or a cat, chosen and made your own with your pilot (Settings → Your pilot → Pet), asleep in its
// bed on the floor of your office by the bookshelf. Our own model, built from simple rounded shapes: curled up,
// breathing slowly, an ear that twitches now and then, a tail tip that flicks (a cat) or paws that twitch in a
// dream (a dog). Tap it and it stirs a little, and goes on sleeping.

type PetKind = 'dog' | 'cat' | 'none';
interface Pet { kind: PetKind; name: string; coat: number; white: boolean; size: 's' | 'm' | 'l'; ears: 'floppy' | 'pointy'; bed: number }

const PET_COATS: { [k: string]: [string, string][] } = {
  dog: [['#C8913E', 'Golden'], ['#2A2420', 'Black'], ['#6B4226', 'Brown'], ['#E6D3AE', 'Cream'], ['#F2EFE8', 'White'], ['#8A8783', 'Grey'], ['#A0522D', 'Red'], ['#4A3B30', 'Dark brown']],
  cat: [['#E08A3C', 'Ginger'], ['#2A2624', 'Black'], ['#9A9590', 'Grey'], ['#F1EEE8', 'White'], ['#7A6450', 'Tabby'], ['#D9C3A0', 'Cream'], ['#5E6670', 'Blue-grey'], ['#B07A4A', 'Cinnamon']],
};
const PET_BEDS: [string, string][] = [['#7A2E2E', 'Red'], ['#2E4A7A', 'Blue'], ['#5A6B3A', 'Green'], ['#8C8FA0', 'Grey'], ['#C9A46A', 'Sand'], ['#5B3A6B', 'Plum']];

/** Your pet as saved (a dog until you choose otherwise). */
function petData(): Pet {
  const S: any = State; if (!S.pet) S.pet = { kind: 'dog', name: 'Buddy', coat: 0, white: true, size: 'm', ears: 'floppy', bed: 0 };
  return S.pet as Pet;
}

/** The bed and the sleeping pet, at pos (x, z on the floor), turned by yaw; its parts in A.pet for the animation. */
function petPlace(T: any, root: any, A: any, pos: number[], yaw: number) {
  const P = petData(); if (!P || P.kind === 'none') return;
  const cat = P.kind === 'cat', s = cat ? 0.95 : P.size === 's' ? 0.72 : P.size === 'l' ? 1.25 : 1;
  const coat = new T.Color((PET_COATS[P.kind][P.coat] || PET_COATS[P.kind][0])[0]), white = new T.Color('#F3EFE6');
  const furM = new T.MeshStandardMaterial({ color: coat, roughness: 0.92 }), lightM = new T.MeshStandardMaterial({ color: P.white ? white : coat.clone().offsetHSL(0, -0.05, 0.08), roughness: 0.92 });
  const darkM = new T.MeshStandardMaterial({ color: 0x14100E, roughness: 0.5 }), noseM = new T.MeshStandardMaterial({ color: cat ? 0xC97B7B : 0x1A1412, roughness: 0.35 });
  const earInM = new T.MeshStandardMaterial({ color: cat ? 0xD99A9A : coat.clone().multiplyScalar(0.8), roughness: 0.9 });
  const g = new T.Group(); g.position.set(pos[0], 0, pos[1]); g.rotation.y = yaw; root.add(g);
  const sph = (rx: number, ry: number, rz: number, m: any, x: number, y: number, z: number, par: any) => { const o = new T.Mesh(new T.SphereGeometry(1, 28, 20), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; par.add(o); return o; };
  // the bed: a round cushion in a soft rim (a cat's is smaller and deeper)
  const bedR = cat ? 0.34 : 0.45 * Math.max(0.8, s), bedM = new T.MeshStandardMaterial({ color: new T.Color((PET_BEDS[P.bed] || PET_BEDS[0])[0]), roughness: 0.97 });
  const cush = new T.Mesh(new T.CylinderGeometry(bedR * 0.86, bedR * 0.88, 0.06, 40), new T.MeshStandardMaterial({ color: new T.Color((PET_BEDS[P.bed] || PET_BEDS[0])[0]).offsetHSL(0, -0.1, 0.12), roughness: 0.98 }));
  cush.position.y = 0.03; cush.receiveShadow = true; g.add(cush);
  const rim = new T.Mesh(new T.TorusGeometry(bedR * 0.9, cat ? 0.065 : 0.075 * Math.max(0.9, s), 18, 48), bedM); rim.rotation.x = Math.PI / 2; rim.position.y = cat ? 0.07 : 0.075; rim.castShadow = true; rim.receiveShadow = true; g.add(rim);
  // the animal, curled up on the cushion: one smooth, sculpted body (petSculpt), furred, with its nose and
  // closed eyes; it breathes, and its head, ears, tail and paws move by the weights painted on it
  const sc = petSculpt(T, P, s), pet = new T.Group(); pet.position.y = 0.06; g.add(pet);
  const U = { uT: { value: 0 }, uBreath: { value: 0 }, uHead: { value: 0 }, uEarL: { value: 0 }, uEarR: { value: 0 }, uTail: { value: 0 }, uPaw: { value: 0 }, uShell: { value: 0 },
    uNeck: { value: sc.neck }, uEarPL: { value: sc.earL }, uEarPR: { value: sc.earR }, uTailP: { value: sc.tailBase } };
  const furMat = (shell: number) => {
    const m = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.82, sheen: 0.55, sheenRoughness: 0.55, sheenColor: coat.clone().lerp(new T.Color(0xffffff), 0.22), transparent: shell > 0, depthWrite: shell === 0, alphaTest: shell > 0 ? 0.5 : 0 });
    m.onBeforeCompile = (sh: any) => {
      Object.assign(sh.uniforms, U, { uShellK: { value: shell } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        attribute vec4 pw; attribute float tw; uniform float uT, uBreath, uHead, uEarL, uEarR, uTail, uPaw, uShellK; uniform vec3 uNeck, uEarPL, uEarPR, uTailP; varying vec3 vObj;
        mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
        mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
        mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
        vec3 petMove(vec3 p) {
          p = mix(p, uEarPL + rotX(uEarL) * (p - uEarPL), pw.y); p = mix(p, uEarPR + rotX(-uEarR) * (p - uEarPR), pw.z);
          p = mix(p, uNeck + rotZ(uHead) * (p - uNeck), pw.x);
          p = mix(p, uTailP + rotY(uTail * tw) * (p - uTailP), step(0.001, tw));
          p.y += pw.w * uPaw * 0.012;
          float b = smoothstep(0.03, 0.16, p.y) * (1.0 - pw.x); p.y += b * uBreath * 0.012; p.z += b * uBreath * 0.006 * sign(p.z - 0.05);
          return p; }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vObj = position; transformed = petMove(transformed) + objectNormal * uShellK;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vObj; uniform float uShellK;
        float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          // fur: fine strands (a stretched noise along the body), lighter tips, darker roots
          float st = vn(vObj * vec3(420.0, 150.0, 420.0)) * 0.6 + vn(vObj * 760.0) * 0.4;
          diffuseColor.rgb *= 0.9 + 0.16 * st;
          if (uShellK > 0.0) { if (st < 0.58) discard; diffuseColor.rgb *= 1.04; }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float e = 0.0006; float n0 = vn(vObj * 620.0), nx = vn((vObj + vec3(e,0,0)) * 620.0), ny = vn((vObj + vec3(0,e,0)) * 620.0);
            normal = normalize(normal + vec3(nx - n0, ny - n0, 0.0) * 0.9); }`);
    };
    return m;
  };
  const body = new T.Mesh(sc.geo, furMat(0)); body.castShadow = true; body.receiveShadow = true; pet.add(body);
  // two fur shells just above the skin: a soft, furry edge (the same mesh, drawn twice more)
  for (const k of [0.0028 * s, 0.0055 * s]) { const sh = new T.Mesh(sc.geo, furMat(k)); sh.renderOrder = 1; pet.add(sh); }
  const nose = new T.Mesh(new T.SphereGeometry(1, 24, 16), noseM); nose.position.copy(sc.nose); nose.scale.setScalar(sc.noseR).multiply(new T.Vector3(1, 0.75, 1.1)); pet.add(nose);
  for (const e of sc.eyes) { const lid = new T.Mesh(new T.CapsuleGeometry(0.0022 * s, e.len, 4, 8), darkM); lid.position.copy(e.at); lid.rotation.set(e.rx, e.ry, Math.PI / 2 + e.rz); pet.add(lid); }
  void furM; void lightM; void earInM; void sph;
  // tap it: it stirs
  const hit = new T.Mesh(new T.CylinderGeometry(bedR + 0.05, bedR + 0.05, 0.4, 16), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 0.2; hit.userData.act = 'pet'; g.add(hit); A.hits = A.hits || []; A.hits.push(hit);
  A.pet = { g, U, sc, cat, s, nextEar: 4 + Math.random() * 6, nextTwitch: 8 + Math.random() * 10, ear: -1, earT: 0, tw: 0, stir: 0, nose, nose0: nose.position.clone() };
}

/** Each frame: slow breathing, and now and then an ear, the tail or a paw. */
function petStep(A: any, t: number, dt: number) {
  const P = A && A.pet; if (!P) return;
  const U = P.U, per = P.cat ? 2.6 : 3.6, deep = P.stir > 0 ? 1.8 : 1;
  U.uBreath.value = Math.sin(t * 2 * Math.PI / per) * deep;
  // an ear twitches
  if (t > P.nextEar) { P.ear = Math.random() < 0.5 ? 0 : 1; P.earT = 0; P.nextEar = t + 6 + Math.random() * 14; }
  U.uEarL.value = 0; U.uEarR.value = 0;
  if (P.ear >= 0) { P.earT += dt; const k = P.earT < 0.4 ? Math.sin(P.earT / 0.4 * Math.PI * 2) * (1 - P.earT / 0.4) : 0; (P.ear ? U.uEarR : U.uEarL).value = 0.4 * k; if (P.earT > 0.4) P.ear = -1; }
  // a cat's tail tip flicks; a dog's paws twitch in a dream
  if (t > P.nextTwitch) { P.tw = 1.2; P.nextTwitch = t + 10 + Math.random() * 18; }
  if (P.tw > 0) { P.tw = Math.max(0, P.tw - dt); const k = Math.sin(P.tw * 18) * Math.min(1, P.tw); if (P.cat) U.uTail.value = 0.25 * k; else U.uPaw.value = k; }
  else { U.uTail.value = 0; U.uPaw.value = 0; }
  // tapped: it lifts its head a little, then settles again
  U.uHead.value = 0;
  if (P.stir > 0) { P.stir = Math.max(0, P.stir - dt); U.uHead.value = 0.22 * Math.sin(Math.min(1, (2.4 - P.stir) / 2.4) * Math.PI); }
  // the nose rides with the head
  if (P.nose) { const n = P.nose0.clone().sub(P.sc.neck), a = U.uHead.value, c = Math.cos(a), sn = Math.sin(a); P.nose.position.set(P.sc.neck.x + n.x * c - n.y * sn, P.sc.neck.y + n.x * sn + n.y * c + 0.0, P.sc.neck.z + n.z); }
}

/** Tapped in the office: it stirs, and sleeps on. */
function petStir(A: any) {
  const P = A && A.pet; if (!P || P.stir > 0) return;
  P.stir = 2.4; P.ear = 0; P.earT = 0;
  const p = petData(); try { toast(`${p.name || (P.cat ? 'Your cat' : 'Your dog')} stirs, and sleeps on`, 'info'); } catch (e) { /* no ui */ }
}

/* ---------- choosing and making your pet (with your pilot's look) ---------- */
function petEditorHtml(p: Pet): string {
  const k = p.kind === 'none' ? 'dog' : p.kind, coats = PET_COATS[k];
  const opt = (key: string, v: string, lab: string, cur: any) => `<button class="le-opt ${String(cur) === v ? 'on' : ''}" data-act="pet-set" data-k="${key}" data-v="${v}">${lab}</button>`;
  return `<div class="le-group"><b>Your pet</b><p class="muted">Asleep in its bed by the bookshelf in your office.</p><div class="le-opts">${opt('kind', 'dog', 'A dog', p.kind)}${opt('kind', 'cat', 'A cat', p.kind)}${opt('kind', 'none', 'No pet', p.kind)}</div></div>
    ${p.kind === 'none' ? '' : `
    <div class="le-group"><b>Name</b><input class="le-in" data-pet-name value="${esc(p.name || '')}" maxlength="24" autocomplete="off" placeholder="${p.kind === 'cat' ? 'Mittens' : 'Buddy'}"></div>
    <div class="le-group"><b>Coat</b><div class="le-sw">${coats.map((c, i) => `<button class="sw ${p.coat === i ? 'on' : ''}" style="--c:${c[0]}" data-act="pet-set" data-k="coat" data-v="${i}" aria-label="${c[1]}" title="${c[1]}"></button>`).join('')}</div></div>
    <div class="le-group"><b>Markings</b><div class="le-opts">${opt('white', '1', 'White chest and paws', p.white ? '1' : '0')}${opt('white', '0', 'All one colour', p.white ? '1' : '0')}</div></div>
    ${p.kind === 'dog' ? `<div class="le-group"><b>Size</b><div class="le-opts">${opt('size', 's', 'Small', p.size)}${opt('size', 'm', 'Medium', p.size)}${opt('size', 'l', 'Large', p.size)}</div></div>
    <div class="le-group"><b>Ears</b><div class="le-opts">${opt('ears', 'floppy', 'Floppy', p.ears)}${opt('ears', 'pointy', 'Pointed', p.ears)}</div></div>` : ''}
    <div class="le-group"><b>Bed</b><div class="le-sw">${PET_BEDS.map((c, i) => `<button class="sw ${p.bed === i ? 'on' : ''}" style="--c:${c[0]}" data-act="pet-set" data-k="bed" data-v="${i}" aria-label="${c[1]} bed" title="${c[1]}"></button>`).join('')}</div></div>
    <p class="fine-print">${icon('info')}Your ${p.kind} is there the next time you go into your office.</p>`}`;
}

/* ---------- the sculpted body: shapes melted into one smooth surface ---------- */
// The body is described as a distance field: rounded shapes (ellipsoids, tapered limbs) blended smoothly into one
// another, like clay smoothed by hand, then turned into a mesh (surface nets) with normals from the field itself.
// Each point also carries how much it belongs to the head, an ear, the tail or a paw (for the animation) and its
// colour (the coat, the white chest, muzzle and paws, a darker back), so it is one seamless animal.
type PetPrim = { k: 'e' | 'c'; a: number[]; b?: number[]; r: number[]; part?: string; light?: number; dark?: number };
const _petCache: { [k: string]: any } = {};

function petPrims(P: Pet, s: number): { prims: PetPrim[]; tail: number[][]; tailR: number[]; neck: number[]; earL: number[]; earR: number[]; nose: number[]; noseR: number; eyes: any[] } {
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
    else { prims.push({ k: 'c', a: S([0.285, 0.165, 0.06]), b: S([0.27, 0.23, 0.04]), r: S([0.032, 0.005]), part: 'eL' }, { k: 'c', a: S([0.295, 0.165, 0.175]), b: S([0.28, 0.23, 0.2]), r: S([0.032, 0.005]), part: 'eR' }); }
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

/** The pet as one mesh (built once for each look, then kept). */
function petSculpt(T: any, P: Pet, s: number): any {
  const key = JSON.stringify([P.kind, P.coat, P.white, P.size, P.ears, s]); if (_petCache[key]) return _petCache[key];
  const D = petPrims(P, s), prims = D.prims.slice();
  // the tail as a chain of tapering limbs
  for (let i = 0; i < D.tail.length - 1; i++) { const f0 = i / (D.tail.length - 1), f1 = (i + 1) / (D.tail.length - 1); prims.push({ k: 'c', a: D.tail[i], b: D.tail[i + 1], r: [D.tailR[0] + (D.tailR[1] - D.tailR[0]) * f0, D.tailR[0] + (D.tailR[1] - D.tailR[0]) * f1], part: 't' + i }); }
  const K = 0.03 * s;   // how softly the shapes melt into one another
  const ell = (p: number[], c: number[], r: number[]) => { const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2], k0 = Math.sqrt(x * x + y * y + z * z), k1 = Math.sqrt(x * x / (r[0] * r[0]) + y * y / (r[1] * r[1]) + z * z / (r[2] * r[2])); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]); };
  const cap = (p: number[], a: number[], b: number[], r: number[]) => { const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]; let h = (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / L2; h = h < 0 ? 0 : h > 1 ? 1 : h; const dx = pa[0] - ba[0] * h, dy = pa[1] - ba[1] * h, dz = pa[2] - ba[2] * h; return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r[0] + (r[1] - r[0]) * h); };
  const prim = (q: PetPrim, p: number[]) => q.k === 'e' ? ell(p, q.a, q.r) : cap(p, q.a, q.b, q.r);
  const smin = (a: number, b: number) => { const h = Math.max(K - Math.abs(a - b), 0) / K; return Math.min(a, b) - h * h * K * 0.25; };
  const field = (p: number[]) => { let d = 1e9; for (const q of prims) d = smin(d, prim(q, p)); return d; };
  // the grid round the body
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const q of prims) { const pts = q.k === 'e' ? [[q.a[0] - q.r[0], q.a[1] - q.r[1], q.a[2] - q.r[2]], [q.a[0] + q.r[0], q.a[1] + q.r[1], q.a[2] + q.r[2]]] : [q.a.map(v => v - q.r[0]), q.a.map(v => v + q.r[0]), q.b.map(v => v - q.r[1]), q.b.map(v => v + q.r[1])]; for (const p of pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } }
  const pad = 0.02 * s; lo = lo.map(v => v - pad); hi = hi.map(v => v + pad);
  const h = 0.0072 * s, nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz), at = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[at(i, j, k)] = field([lo[0] + i * h, lo[1] + j * h, lo[2] + k * h]);
  // surface nets: a point in each cell the surface crosses, joined into quads across each crossed edge
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
  // normals from the field, the weights and the colours from the shapes nearest each point
  const nV = pos.length / 3, nor = new Float32Array(nV * 3), col = new Float32Array(nV * 3), pw = new Float32Array(nV * 4), tw = new Float32Array(nV);
  const coat = new T.Color((PET_COATS[P.kind === 'cat' ? 'cat' : 'dog'][P.coat] || PET_COATS.dog[0])[0]), light = P.white ? new T.Color('#F3EFE6') : coat.clone().offsetHSL(0, -0.04, 0.07), dark = coat.clone().multiplyScalar(0.72), tmp = new T.Color();
  const e = 0.0015 * s, nTail = D.tail.length - 1;
  for (let v = 0; v < nV; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
    const gx = field([p[0] + e, p[1], p[2]]) - field([p[0] - e, p[1], p[2]]), gy = field([p[0], p[1] + e, p[2]]) - field([p[0], p[1] - e, p[2]]), gz = field([p[0], p[1], p[2] + e]) - field([p[0], p[1], p[2] - e]), gl = Math.hypot(gx, gy, gz) || 1;
    nor[v * 3] = gx / gl; nor[v * 3 + 1] = gy / gl; nor[v * 3 + 2] = gz / gl;
    // each shape's share of this point (the nearer, the more)
    let wh = 0, wl = 0, wr = 0, wp = 0, wt = 0, li = 0, dk = 0, tot = 0;
    for (const q of prims) { const d = prim(q, p), w = Math.exp(-Math.max(0, d) / (0.012 * s)); tot += w;
      if (q.part === 'h' || q.part === 'eL' || q.part === 'eR') wh += w; if (q.part === 'eL') wl += w; if (q.part === 'eR') wr += w; if (q.part === 'p') wp += w;
      if (q.part && q.part[0] === 't') wt += w * (0.3 + 0.7 * (+q.part.slice(1) + 1) / nTail);
      li += w * (q.light || 0); dk += w * (q.dark || 0); }
    tot = tot || 1; pw[v * 4] = wh / tot; pw[v * 4 + 1] = Math.min(1, wl / tot * 1.4); pw[v * 4 + 2] = Math.min(1, wr / tot * 1.4); pw[v * 4 + 3] = wp / tot; tw[v] = wt / tot;
    const lk = Math.min(1, li / tot * 1.3), dkk = Math.min(1, dk / tot) * Math.max(0, nor[v * 3 + 1]) * (1 - lk);
    tmp.copy(coat).lerp(dark, dkk).lerp(light, lk); col[v * 3] = tmp.r; col[v * 3 + 1] = tmp.g; col[v * 3 + 2] = tmp.b;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.setAttribute('pw', new T.BufferAttribute(pw, 4)); geo.setAttribute('tw', new T.BufferAttribute(tw, 1)); geo.setIndex(idx);
  const V = (a: number[]) => new T.Vector3(a[0], a[1], a[2]);
  const out = { geo, neck: V(D.neck), earL: V(D.earL), earR: V(D.earR), tailBase: V(D.tail[0]), nose: V(D.nose), noseR: D.noseR, eyes: D.eyes.map(x => ({ at: V(x.at), len: x.len, rx: x.rx, ry: x.ry, rz: x.rz })), verts: nV };
  _petCache[key] = out; return out;
}
