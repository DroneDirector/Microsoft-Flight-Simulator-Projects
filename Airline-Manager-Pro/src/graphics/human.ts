// @ts-nocheck
// Realistic crew figures. Six posed base bodies (assets/humans.bin, made from the CC0 MakeHuman
// model) are blended per person, then dressed: skin, uniform fabrics, strand hair, layered beards,
// moustaches, glasses, caps and shoes all come from the person's look. The figure's proportions
// (natural, in-between or stylised) follow Settings → Crew figures.

const Human = (function () {
  /* ================= data ================= */
  let DATA = null, loading = null, NBS = null;

  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (loading) return loading;
    const b64 = (window as any).__HUMANS_B64;
    const p = b64 ? Promise.resolve(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer)
      : fetch('humans.bin').then(r => { if (!r.ok) throw new Error('humans.bin: HTTP ' + r.status); return r.arrayBuffer(); });
    loading = p.then(buf => (DATA = decode(buf)));
    return loading;
  }

  function decode(buf) {
    const dv = new DataView(buf);
    if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'AMPH') throw new Error('humans.bin is damaged');
    const hl = dv.getUint32(4, true);
    const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
    let off = 8 + hl; off += (4 - (hl % 4)) % 4;
    const n = header.n, idx = new Uint16Array(buf, off, header.tris * 3); off += header.tris * 6;
    const shared = new Uint8Array(buf, off, n * 3); off += n * 3; off += (4 - ((n * 3) % 4)) % 4;
    const bodies = {};
    for (const b of header.bodies) {
      const ch = [];
      for (let k = 0; k < b.ranges.length; k++) { ch.push(new Uint16Array(buf, off, n)); off += n * 2; }
      bodies[b.key] = { ranges: b.ranges, ch, info: b.info };
    }
    return { n, idx: Array.from(idx), shared, bodies };
  }

  /** Neighbour lists of the body mesh (same for everyone), for cloth smoothing. */
  function neighbours() {
    if (NBS) return NBS;
    const n = DATA.n, idx = DATA.idx, sets = Array.from({ length: n }, () => new Set());
    for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; sets[a].add(b); sets[a].add(c); sets[b].add(a); sets[b].add(c); sets[c].add(a); sets[c].add(b); }
    return (NBS = sets.map(s => Uint16Array.from(s)));
  }

  function blendInfo(list) {
    const mix = (vals, ws) => {
      const v0 = vals[0];
      if (typeof v0 === 'number') return vals.reduce((s, v, i) => s + v * ws[i], 0);
      if (Array.isArray(v0)) return v0.map((_, k) => mix(vals.map(v => v[k]), ws));
      if (v0 && typeof v0 === 'object') { const o = {}; for (const k in v0) o[k] = mix(vals.map(v => v[k]), ws); return o; }
      return v0;
    };
    return mix(list.map(x => x.info), list.map(x => x.w));
  }

  /** A body for this person: blended from the base bodies, then given the chosen proportions. */
  function makeBody(L, style) {
    const sex = L.sex === 'f' ? 'f' : 'm';
    let asian = L.eyes === 'mono' ? 0.75 : L.eyes === 'almond' ? 0.2 : 0;
    let african = (L.nose === 'wide' ? 0.45 : L.nose === 'medium' ? 0.1 : 0) + (L.lips === 'full' ? 0.45 : L.lips === 'medium' ? 0.08 : 0);
    asian = Math.min(asian, 1); african = Math.min(african, 1 - asian);
    const list = [['caucasian', Math.max(0, 1 - asian - african)], ['african', african], ['asian', asian]].filter(x => x[1] > 0.001)
      .map(([e, w]) => ({ b: DATA.bodies[sex + '-' + e], w, info: DATA.bodies[sex + '-' + e].info }));
    const tw = list.reduce((s, x) => s + x.w, 0); list.forEach(x => x.w /= tw);
    const n = DATA.n, pos = new Float32Array(n * 3), rest = new Float32Array(n * 3), A = new Float32Array(n * 4), B = new Float32Array(n * 4);
    for (const { b, w } of list) {
      const deq = k => { const [lo, hi] = b.ranges[k], s = (hi - lo) / 65535, c = b.ch[k]; return i => lo + c[i] * s; };
      const f = Array.from({ length: 10 }, (_, k) => deq(k));
      for (let i = 0; i < n; i++) {
        pos[i * 3] += w * f[0](i); pos[i * 3 + 1] += w * f[1](i); pos[i * 3 + 2] += w * f[2](i);
        rest[i * 3] += w * f[3](i); rest[i * 3 + 1] += w * f[4](i); rest[i * 3 + 2] += w * f[5](i);
        A[i * 4] += w * f[6](i); B[i * 4] += w * f[7](i); B[i * 4 + 1] += w * f[8](i); B[i * 4 + 2] += w * f[9](i);
      }
    }
    for (let i = 0; i < n; i++) { A[i * 4 + 1] = DATA.shared[i * 3] / 255; A[i * 4 + 2] = DATA.shared[i * 3 + 1] / 255; A[i * 4 + 3] = DATA.shared[i * 3 + 2] / 255; }
    const I = blendInfo(list);
    // proportions: a slightly larger head and eyes for the stylised look; the face shape stretches the head a little
    const st = style === 'stylised' ? 1 : style === 'natural' ? 0 : 0.5;
    const k = 1 + 0.13 * st, fs = { oval: [1, 1], round: [1.04, 0.98], square: [1.03, 1], long: [0.97, 1.05] }[L.face] || [1, 1];
    const ks = [k * fs[0], k * fs[1], k], np = I.neckPivot;
    const scaleAbout = (arr, i) => { const w = Math.min(1, A[i * 4 + 3]); for (let a = 0; a < 3; a++) arr[i * 3 + a] = np[a] + (arr[i * 3 + a] - np[a]) * (1 + (ks[a] - 1) * w); };
    for (let i = 0; i < n; i++) if (A[i * 4 + 3] > 0) { scaleAbout(pos, i); scaleAbout(rest, i); }
    const sp = v => v.map((x, a) => np[a] + (x - np[a]) * ks[a]);
    I.eyeL = sp(I.eyeL); I.eyeR = sp(I.eyeR); I.headC = sp(I.headC); I.headS = I.headS.map((x, a) => x * ks[a]);
    I.mouthJ = I.mouthJ.map(m => [m[0], sp(m[1]), sp(m[2])]); I.headTop = np[1] + (I.headTop - np[1]) * ks[1];
    const ek = 1 + 0.3 * st;
    if (ek > 1) for (const c of [I.eyeL, I.eyeR]) for (const arr of [pos, rest]) for (let i = 0; i < n; i++) {
      const dx = arr[i * 3] - c[0], dy = arr[i * 3 + 1] - c[1], dz = arr[i * 3 + 2] - c[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const f = Math.max(0, 1 - d / 0.04); if (!f) continue; const s = 1 + (ek - 1) * f * f;
      arr[i * 3] = c[0] + dx * s; arr[i * 3 + 1] = c[1] + dy * s; arr[i * 3 + 2] = c[2] + dz * s;
    }
    I.st = st; I.eyeScale = k * ek;
    return { pos, rest, A, B, idx: DATA.idx, info: I };
  }

  /* ================= shared shader code ================= */
  const GLSL_NOISE = `
float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
float twill(vec2 uv){ vec2 g = uv * 1150.0; float d = fract((g.x + g.y) * 0.5); return 0.7 * (0.5 + 0.5 * sin(d * 6.2832)) + 0.3 * vnoise(vec3(g * vec2(0.3, 3.0), 1.0)); }
float plainw(vec2 uv, float f){ vec2 g = uv * f; vec2 c = floor(g); vec2 fr = fract(g) - 0.5; float alt = mod(c.x + c.y, 2.0); return 0.5 + 0.5 * (alt > 0.5 ? cos(fr.x * 3.1416) : cos(fr.y * 3.1416)); }
float canvasw(vec2 uv){ return 0.75 * plainw(uv, 520.0) + 0.25 * vnoise(vec3(uv * 900.0, 2.0)); }
float meshw(vec2 uv){ vec2 g = uv * 480.0; vec2 f = fract(vec2(g.x + 0.5 * floor(g.y), g.y)) - 0.5; return smoothstep(0.34, 0.24, length(f)); }
float knit(vec2 uv){ vec2 g = uv * vec2(420.0, 650.0); float c = abs(fract(g.x) - 0.5) * 2.0; float v = abs(fract(g.y + (fract(g.x) < 0.5 ? 0.0 : 0.5)) - 0.5); return (1.0 - c * c) * (0.6 + 0.4 * v); }
#define TRI(F, p, n) ((pow(abs(n.x),4.0) * F(p.zy) + pow(abs(n.y),4.0) * F(p.xz) + pow(abs(n.z),4.0) * F(p.xy)) / (pow(abs(n.x),4.0) + pow(abs(n.y),4.0) + pow(abs(n.z),4.0) + 1e-5))
float poplin(vec2 uv){ return plainw(uv, 1500.0); }
float silk(vec2 uv){ return 0.5 + 0.5 * sin((uv.x + uv.y) * 2600.0); }
float pores(vec3 p){ vec3 i = floor(p), f = fract(p); float d = 1.0;
  for (int x=-1;x<=1;x++) for (int y=-1;y<=1;y++) for (int z=-1;z<=1;z++){ vec3 g = vec3(x,y,z); vec3 o = vec3(h31(i+g), h31(i+g+7.1), h31(i+g+13.7)); d = min(d, length(g+o-f)); }
  return d; }
`;
  const LIGHTS = { key: [-1.6, 3.2, 3.2], fill: [2.2, 1.8, 2.6], rim: [1.4, 2.6, -2.8] };
  const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);

  /* ================= body material: skin, hair line, every garment ================= */
  function bodyMaterial(c, I) {
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(c.sheen || '#ff9f86'), envMapIntensity: 0.55 });
    const col = h => new THREE.Color(h);
    const U = {
      uSkin: { value: col(c.skin) }, uHair: { value: col(c.hairPaint) }, uTop: { value: col(c.top) }, uSleeve: { value: col(c.sleeve) },
      uBot: { value: col(c.bottom) }, uShoe: { value: col(c.shoe) }, uShirt: { value: col(c.shirt) }, uTie: { value: col(c.tie) },
      uLip: { value: col(c.lip) }, uVest: { value: col('#e9c02a') }, uAccent: { value: col(c.accent) }, uBrow: { value: col(c.brow) },
      uHemY: { value: c.hemY }, uWaistY: { value: c.waistY }, uCuffS: { value: c.cuffS }, uShoeY: { value: c.shoeY }, uBotLow: { value: c.botLow }, uNeckY: { value: I.neckY },
      uVBot: { value: c.vBot }, uVW: { value: c.vW }, uTieBot: { value: c.tieBot }, uStripes: { value: c.stripes }, uLapels: { value: c.lapels ? 1 : 0 },
      uTopFab: { value: c.topFab }, uSleeveFab: { value: c.sleeveFab }, uHairT: { value: c.hairT }, uHairline: { value: c.hairline },
      uEyeL: { value: v3(I.eyeL) }, uEyeRp: { value: v3(I.eyeR) }, uMouth: { value: v3(c.mouth) }, uEyeR0: { value: c.eyeR },
      uHiVis: { value: c.hivis ? 1 : 0 }, uSkirt: { value: c.skirt ? 1 : 0 }, uFem: { value: c.female ? 1 : 0 }, uBald: { value: c.bald ? 1 : 0 },
      uBrowT: { value: c.female ? 0.0028 : 0.0038 }, uElbowS: { value: I.armLen * 0.56 }, uKneeY: { value: I.kneeY }, uCrotchY: { value: I.crotchY },
      uLegX: { value: c.legX }, uSideZ: { value: 0 }, uMech: { value: c.mech ? 1 : 0 }, uPockets: { value: c.pockets ? 1 : 0 },
      uHeadRot: { value: new THREE.Matrix3() }, uNeckP: { value: v3(I.neckPivot) }, uBlink: { value: 0 },
    };
    m.userData.U = U;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      const decl = `uniform vec3 uSkin,uHair,uTop,uSleeve,uBot,uShoe,uShirt,uTie,uLip,uVest,uAccent,uBrow,uEyeL,uEyeRp,uMouth,uNeckP; uniform mat3 uHeadRot;
        uniform float uHemY,uWaistY,uCuffS,uShoeY,uBotLow,uNeckY,uVBot,uVW,uTieBot,uStripes,uLapels,uTopFab,uSleeveFab,uHairT,uHairline,uEyeR0,uHiVis,uSkirt,uFem,uBald,uBrowT,uElbowS,uKneeY,uCrotchY,uLegX,uSideZ,uMech,uPockets,uBlink;
        varying vec3 vRest; varying vec3 vF; varying vec3 vON; varying vec4 vA; varying vec4 vB; varying float vBeard;
        float hairlineAt(float az){ float a = abs(az);
          float h = mix(uHairline, uHairline - 0.12, smoothstep(0.35, 0.9, a));
          h = mix(h, 0.0, smoothstep(0.9, 1.5, a)); h = mix(h, -0.55, smoothstep(1.6, 2.6, a)); return h; }
        float hairMask(vec4 B, float headW){ if (uBald > 0.5 || headW < 0.5) return -1.0; float az = atan(B.x, B.z);
          float ear = (abs(B.x) > 0.8 && B.y < 0.25 && B.y > -0.9) ? 1.0 : 0.0;
          return (B.y - hairlineAt(az)) - ear * 2.0; }
      `;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 rest; attribute vec3 fpos; attribute vec4 fa; attribute vec4 fb; attribute float beardW;\n' + decl)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          objectNormal = normalize(mix(objectNormal, uHeadRot * objectNormal, smoothstep(0.15, 0.85, fa.w)));`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vRest = rest; vF = fpos; vA = fa; vB = fb; vON = objectNormal; vBeard = beardW;
          float hm = hairMask(fb, fa.w);
          transformed += objectNormal * smoothstep(-0.03, 0.12, hm) * uHairT;
          // blink: the upper lid turns down over the eye
          if (fa.w > 0.3 && uBlink > 0.0) {
            vec3 c = transformed.x > 0.0 ? uEyeL : uEyeRp; vec3 d = transformed - c; float r = length(d);
            float wr = smoothstep(uEyeR0 * 2.3, uEyeR0 * 1.45, r);
            if (wr > 0.0 && d.z > 0.0) { float hz = length(d.xz); float el = atan(d.y, hz);
              if (el > -0.15) { float k = smoothstep(-0.15, 0.08, el); float ne = mix(el, -0.1, uBlink * wr * k);
                vec3 hd = normalize(vec3(d.x, 0.0, d.z)); transformed = c + hd * cos(ne) * r + vec3(0.0, sin(ne) * r, 0.0); } } }
          // head turn
          transformed = mix(transformed, uNeckP + uHeadRot * (transformed - uNeckP), smoothstep(0.15, 0.85, fa.w));`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + decl + GLSL_NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 R = vRest; float onArm = step(0.5, vA.y), headW = vA.w;
          // under a skirt the hips and thighs are hidden, so they can never show through it
          if (uSkirt > 0.5 && onArm < 0.5 && headW < 0.5 && R.y < uHemY && R.y > uKneeY + 0.06) discard;
          vec3 col = uSkin; float rough = 0.55, metal = 0.0, isSkin = 1.0;
          float low = fbm(R * 22.0), mid = fbm(R * 90.0);
          col *= 0.95 + 0.1 * low;
          col = mix(col, col * vec3(1.06, 0.93, 0.9), 0.35 * mid);
          vec3 E = uEyeL; vec3 Rx = vec3(abs(R.x), R.y, R.z);
          float cheek = exp(-pow(length(Rx.xy - vec2(E.x + 0.012, E.y - 0.035)) / 0.022, 2.0)) * step(E.z - 0.03, R.z);
          float nose = exp(-pow(length(R.xy - vec2(0.0, E.y - 0.035)) / 0.014, 2.0)) * step(E.z - 0.01, R.z);
          float ear = headW > 0.5 && abs(vB.x) > 0.85 ? 1.0 : 0.0;
          col = mix(col, col * vec3(1.08, 0.86, 0.84), clamp(0.55 * cheek + 0.4 * nose + 0.3 * ear, 0.0, 1.0));
          float tz = headW > 0.5 ? exp(-pow(abs(R.x) / 0.03, 2.0)) * smoothstep(E.y - 0.06, E.y - 0.03, R.y) * step(E.z - 0.02, R.z) : 0.0;
          rough = 0.56 - 0.14 * tz;
          vec2 ml = (R.xy - uMouth.xy) / vec2(0.024, 0.0105);
          float lip = (headW > 0.5 && R.z > uMouth.z - 0.03) ? smoothstep(1.05, 0.8, length(ml)) : 0.0;
          col = mix(col, uLip, lip); rough = mix(rough, 0.38, lip);
          float u = (abs(R.x) - (E.x - 0.017)) / 0.04;
          float by = E.y + 0.021 + 0.006 * sin(3.14159 * clamp(u, 0.0, 1.0)) - 0.004 * u;
          float bw = uBrowT * (1.0 - 0.6 * u) * smoothstep(-0.05, 0.15, u);
          float brow = (headW > 0.5 && u > -0.05 && u < 1.0 && R.z > E.z - 0.012) ? smoothstep(bw + 0.0007, bw - 0.0005, abs(R.y - by)) : 0.0;
          brow *= 0.7 + 0.3 * mix(0.5, vnoise(R * vec3(2400.0, 600.0, 600.0)), 1.0 - smoothstep(0.3, 0.8, length(fwidth(R * 2400.0))));
          col = mix(col, uBrow, brow * 0.8);
          vec3 ec = vec3(sign(R.x) * E.x, E.y, E.z);
          float de = length(R - ec);
          float lash = (headW > 0.5 && R.y > ec.y - 0.002 && R.z > ec.z && de < uEyeR0 * (uFem > 0.5 ? 1.32 : 1.24)) ? 1.0 : 0.0;
          col = mix(col, vec3(0.05, 0.035, 0.03), lash * 0.9);
          float hmk = hairMask(vB, headW);
          if (hmk > 0.0) { isSkin = 0.0; float strand = vnoise(vec3(atan(vB.x, vB.z) * 220.0, R.y * 40.0, 0.0));
            col = uHair * (0.85 + 0.25 * mix(0.5, strand, 1.0 - smoothstep(0.3, 0.8, fwidth(R.y * 40.0) + fwidth(atan(vB.x, vB.z) * 220.0)))); rough = 0.62; }
          else if (hmk > -0.04 && headW > 0.5) { col = mix(col, uHair * 0.9, 0.35 * smoothstep(-0.04, 0.0, hmk)); }
          // ---------- clothes ----------
          // fabK: 0 skin, 1 wool twill, 2 cotton poplin, 3 silk, 4 canvas, 5 hi-vis mesh, 6 reflective tape, 7 metal, 8 knit
          float fabK = 0.0, clothH = 0.0, seam = 0.0;
          vec3 Fp = vF;
          bool topIn = onArm > 0.5 ? (vA.x < uCuffS) : (R.y > uHemY && R.y < uNeckY + 0.02 && headW < 0.5);
          bool botIn = uSkirt < 0.5 && onArm < 0.5 && R.y < uWaistY && R.y > uBotLow;
          float nz1 = vnoise(Fp * 38.0), nz2 = vnoise(Fp * 90.0);
          if (botIn && !topIn) {
            col = uBot; rough = 0.8; isSkin = 0.0; fabK = uMech > 0.5 ? 4.0 : 1.0;
            float lx = abs(Fp.x);
            clothH += sin(Fp.y * 170.0 + nz1 * 5.0) * exp(-pow((Fp.y - uKneeY) / 0.06, 2.0)) * 0.0011;
            clothH += sin(Fp.y * 240.0 + nz2 * 4.0 + lx * 30.0) * smoothstep(uShoeY + 0.14, uShoeY + 0.03, Fp.y) * 0.0010;
            clothH += sin((lx * 1.4 + Fp.y) * 165.0) * exp(-pow((Fp.y - uCrotchY - 0.03) / 0.05, 2.0)) * exp(-pow((lx - 0.045) / 0.04, 2.0)) * 0.0011;
            clothH += (nz1 - 0.5) * 0.0012;
            if (uMech < 0.5) clothH += exp(-pow((lx - uLegX) / 0.0035, 2.0)) * step(0.0, Fp.z - 0.02) * 0.0005 * smoothstep(uWaistY - 0.05, uWaistY - 0.15, Fp.y);
            float sd = abs(Fp.z - (uSideZ + 0.01)); if (lx > uLegX + 0.03 && sd < 0.0011) { seam = 1.0 - sd / 0.0011; }
            if (abs(Fp.y - (uBotLow + 0.012)) < 0.0006 && fract((Fp.x + Fp.z) * 330.0) > 0.45) seam = 0.5;
            if (uMech > 0.5) {
              vec2 kp = vec2(lx - uLegX, Fp.y - uKneeY);
              if (Fp.z > 0.03 && abs(kp.x) < 0.055 && abs(kp.y) < 0.06) { col *= 0.82; clothH += 0.0007; if (abs(abs(kp.x) - 0.05) < 0.0007 || abs(abs(kp.y) - 0.055) < 0.0007) seam = 0.6; }
              vec2 cp = vec2(lx - (uLegX + 0.045), Fp.y - (uKneeY + 0.17));
              if (abs(cp.x) < 0.04 && abs(cp.y) < 0.06) { clothH += 0.0009; if (abs(cp.y - 0.04) < 0.0035) { col *= 0.9; } if (abs(abs(cp.x) - 0.036) < 0.0007 || abs(cp.y + 0.056) < 0.0007 || abs(cp.y - 0.037) < 0.0007) seam = 0.6; }
            }
          }
          if (topIn) {
            col = onArm > 0.5 ? uSleeve : uTop; rough = 0.82; isSkin = 0.0; fabK = uMech > 0.5 ? 4.0 : (onArm > 0.5 ? uSleeveFab : uTopFab);
            if (onArm > 0.5) {
              clothH += sin(vA.x * 210.0 + nz1 * 4.0) * exp(-pow((vA.x - uElbowS) / 0.05, 2.0)) * 0.0013;
              clothH += sin(vA.x * 300.0 + nz2 * 3.0) * smoothstep(uCuffS - 0.09, uCuffS - 0.02, vA.x) * 0.0007;
              clothH += (nz1 - 0.5) * 0.0012;
              if (abs(vA.x - 0.025) < 0.0012) seam = 1.0 - abs(vA.x - 0.025) / 0.0012;
              if (abs(vA.x - (uCuffS - 0.008)) < 0.0005 && fract(Fp.y * 300.0 + Fp.x * 300.0) > 0.45) seam = 0.5;
            } else {
              clothH += sin(Fp.y * 120.0 + abs(Fp.x) * 70.0) * exp(-pow((Fp.y - (uVBot - 0.07)) / 0.06, 2.0)) * smoothstep(0.02, 0.08, abs(Fp.x)) * 0.0006;
              clothH += (nz1 - 0.5) * 0.0009;
              float sz = abs(Fp.z - uSideZ); if (sz < 0.0011 && abs(Fp.x) > 0.05) seam = 1.0 - sz / 0.0011;
              if (abs(Fp.x) < 0.001 && Fp.z < uSideZ) seam = 1.0;
              if (abs(Fp.y - (uHemY + 0.012)) < 0.00055 && fract((Fp.x + Fp.z) * 330.0) > 0.45) seam = 0.5;
            }
            float halfW = uVW * clamp((Fp.y - uVBot) / (uNeckY - uVBot), 0.0, 1.0);
            bool front = Fp.z > 0.0 && onArm < 0.5;
            if (uVW > 0.0 && front && Fp.y > uVBot && abs(Fp.x) < halfW) { col = uShirt; rough = 0.75; fabK = 2.0; clothH = -0.0006 + (nz2 - 0.5) * 0.0004;
              if (uTieBot > 0.0 && Fp.y > uTieBot) { float tw = mix(0.024, 0.011, clamp((Fp.y - uTieBot) / (uNeckY - uTieBot - 0.02), 0.0, 1.0)); if (Fp.y > uNeckY - 0.03) tw = 0.014;
                float tipK = clamp((Fp.y - uTieBot) / 0.025, 0.0, 1.0);
                if (abs(Fp.x) < tw * tipK) { col = uTie; rough = 0.42; fabK = 3.0; clothH = 0.0004 * (1.0 - abs(Fp.x) / max(tw * tipK, 0.001));
                  if (fract((Fp.x + Fp.y) * 55.0) > 0.92) col = mix(uTie, uAccent * 0.5, 0.35);
                  if (Fp.y > uNeckY - 0.03) clothH += 0.0012 * (1.0 - abs(Fp.x) / 0.014); } } }
            if (uLapels > 0.5 && uVW > 0.0 && front && Fp.y > uVBot) { float e = abs(Fp.x) - halfW;
              if (abs(e) < 0.0022) { col = uTop * 0.5; clothH -= 0.0006; }
              if (e > 0.0 && e < 0.045 && Fp.y > uVBot + 0.01) clothH += 0.0007 * smoothstep(0.045, 0.03, e);
              if (abs(e - 0.006) < 0.0005 && fract(Fp.y * 320.0) > 0.5) seam = 0.45; }
            if (vF.y > uNeckY - 0.005 && onArm < 0.5 && uMech < 0.5) { col = uShirt; rough = 0.75; fabK = 2.0; }
            if (uPockets > 0.5 && front) { float lx = abs(Fp.x);
              vec2 pk = vec2(lx - 0.09, Fp.y - (uHemY + 0.115));
              if (abs(pk.x) < 0.048 && abs(pk.y) < 0.022) { clothH += 0.0009 * smoothstep(0.022, 0.016, abs(pk.y)) * smoothstep(0.048, 0.042, abs(pk.x));
                if (abs(abs(pk.x) - 0.044) < 0.0006 || abs(pk.y + 0.018) < 0.0006) { if (fract((Fp.x + Fp.y) * 330.0) > 0.45) seam = 0.5; } }
              if (abs(pk.x) < 0.048 && pk.y < -0.022 && pk.y > -0.027) col *= 0.62;
              vec2 wp = vec2(Fp.x - 0.085, Fp.y - (uNeckY - 0.205));
              if (abs(wp.x) < 0.03 && abs(wp.y) < 0.006) { clothH += 0.0006; if (abs(wp.y + 0.006) < 0.0008) col *= 0.7; } }
            if (onArm > 0.5 && uStripes > 0.0) { float d = uCuffS - vA.x;
              for (int i = 0; i < 4; i++) { if (float(i) >= uStripes) break; float cc = 0.03 + float(i) * 0.011; if (abs(d - cc) < 0.0028) { col = vec3(0.89, 0.71, 0.34) * (0.85 + 0.3 * plainw(vec2(Fp.y + Fp.x, d), 2200.0)); metal = 1.0; rough = 0.32; fabK = 7.0; clothH = 0.0004; } } }
            if (uMech > 0.5 && front && abs(Fp.x) < 0.0045 && Fp.y > uCrotchY + 0.05) { col = vec3(0.62, 0.64, 0.66) * (0.7 + 0.3 * step(0.0, sin(Fp.y * 1500.0))); metal = 1.0; rough = 0.35; fabK = 7.0; clothH = 0.0005; }
            if (uHiVis > 0.5 && onArm < 0.5 && vF.y > uWaistY - 0.04 && vF.y < uNeckY - 0.03 && abs(vF.x) < 0.15) {
              col = uVest; rough = 0.7; fabK = 5.0; clothH = 0.0012;
              float edge = min(min(abs(abs(vF.x) - 0.15), abs(vF.y - (uWaistY - 0.04))), abs(vF.y - (uNeckY - 0.03)));
              if (edge < 0.007) { col = vec3(0.32, 0.33, 0.35); fabK = 4.0; }
              float b1 = abs(vF.y - (uWaistY + 0.06)), b2 = abs(vF.y - (uWaistY + 0.14));
              if (min(b1, b2) < 0.016) { float spark = step(0.93, h31(floor(vF * 4000.0))); col = mix(vec3(0.72, 0.74, 0.72), vec3(1.25), spark); metal = 0.55; rough = 0.25; fabK = 6.0; clothH = 0.0015;
                if (abs(min(b1, b2) - 0.0155) < 0.0006) seam = 0.5; } }
          }
          if (R.y < uShoeY) { col = uShoe; rough = 0.35; isSkin = 0.0; fabK = 0.0; }
          if (isSkin < 0.5 && fabK > 0.5 && fabK < 6.5 || fabK > 7.5) {
            float lodC = 1.0 - smoothstep(0.3, 0.8, length(fwidth(Fp * 420.0)));
            col *= 0.95 + 0.1 * mix(0.5, fbm(Fp * 420.0), lodC);
            if (fabK > 4.5 && fabK < 5.5) col *= 1.0 - 0.35 * TRI(meshw, Fp, normalize(vON)) * (1.0 - smoothstep(0.3, 0.8, length(fwidth(Fp * 480.0))));
            if (fabK > 7.5) col *= 0.88 + 0.2 * TRI(knit, Fp, normalize(vON)) * (1.0 - smoothstep(0.3, 0.8, length(fwidth(Fp * 650.0))));
            col *= mix(1.0, 0.78, smoothstep(0.0, -0.0015, clothH));
            col *= mix(1.0, 1.06, smoothstep(0.0, 0.0012, clothH));
            if (seam > 0.0 && (fabK < 4.5 || fabK > 6.5)) { col *= mix(1.0, 0.62, seam); clothH -= 0.0005 * seam; }
          }
          if (vBeard > 0.0) col = mix(col, uHair * 0.3, clamp(vBeard, 0.0, 1.0) * 0.9);
          diffuseColor.rgb = col;
          `)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = rough;`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor = metal;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            float fq = isSkin > 0.5 ? 1100.0 : 1150.0;
            float fade = 1.0 - smoothstep(0.35, 0.9, length(fwidth(vRest * fq)));
            float hgt;
            if (isSkin > 0.5) {
              float pd = pores(vRest * 1100.0);
              hgt = (smoothstep(0.05, 0.45, pd) * 0.00006 + (fbm(vRest * 160.0) - 0.5) * 0.00012) * fade;
            } else {
              vec3 n0 = normalize(vON);
              float w = 0.0;
              if (fabK < 1.5) w = TRI(twill, vF, n0) * 0.00005;
              else if (fabK < 2.5) w = TRI(poplin, vF, n0) * 0.00003;
              else if (fabK < 3.5) w = TRI(silk, vF, n0) * 0.00002;
              else if (fabK < 4.5) w = TRI(canvasw, vF, n0) * 0.00007;
              else if (fabK < 5.5) w = -TRI(meshw, vF, n0) * 0.00012;
              else if (fabK > 7.5) w = TRI(knit, vF, n0) * 0.00012;
              hgt = clothH + w * fade;
            }
            vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
            vec2 dh = vec2(dFdx(hgt), dFdy(hgt));
            vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1) * faceDirection;
            normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2));
            if (isSkin > 0.5) roughnessFactor = mix(roughnessFactor + 0.06, roughnessFactor, smoothstep(0.05, 0.4, pores(vRest * 1100.0)) * fade + (1.0 - fade));
          }`)
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          if (isSkin < 0.5) material.sheenColor = diffuseColor.rgb * 0.7;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (isSkin > 0.5) { float rimL = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0); totalEmissiveRadiance += uSkin * vec3(0.5, 0.14, 0.08) * (0.06 + 0.2 * rimL); }`);
    };
    m.customProgramCacheKey = () => 'crew-body';
    return m;
  }

  /* ================= cloth fitting ================= */
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /** Clothes hide anatomy: covered areas are pushed out to simple cloth shapes, smoothed and given thickness. */
  function clothe(geo, b, c, I) {
    const P = geo.attributes.position, n = P.count, A = b.A, R = b.rest;
    const w = new Float32Array(n), th = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = A[i * 4], arm = A[i * 4 + 1] > 0.5, headW = A[i * 4 + 3], y = R[i * 3 + 1];
      const top = arm ? sst(0.004, -0.01, s - c.cuffS) : sst(c.hemY - 0.01, c.hemY + 0.01, y) * sst(I.neckY + 0.03, I.neckY + 0.0, y) * (headW < 0.5 ? 1 : 0);
      const bot = (!arm && !c.skirt) ? sst(c.waistY + 0.01, c.waistY - 0.01, y) * sst(c.botLow - 0.005, c.botLow + 0.01, y) : 0;
      const shoe = sst(c.shoeY + 0.01, c.shoeY - 0.005, y);
      w[i] = Math.max(top, bot, shoe * 0.6);
      th[i] = Math.max(top * c.topT, bot * c.botT);
    }
    const nbs = neighbours();
    const p = Float32Array.from(P.array), q = new Float32Array(p.length);
    for (const sd of [1, -1]) {
      let cx = 0, cz = 0, cn = 0; const ids = [];
      for (let i = 0; i < n; i++) if (R[i * 3 + 1] < I.ankleY + 0.03 && Math.sign(p[i * 3]) === sd) { ids.push(i); cx += p[i * 3]; cz += p[i * 3 + 2]; cn++; }
      cx /= cn || 1; cz /= cn || 1;
      for (const i of ids) { const k = 0.82 + 0.18 * sst(I.ankleY - 0.01, I.ankleY + 0.03, R[i * 3 + 1]); p[i * 3] = cx + (p[i * 3] - cx) * k; p[i * 3 + 2] = cz + (p[i * 3 + 2] - cz) * k; p[i * 3 + 1] = Math.max(0.006, p[i * 3 + 1]); }
    }
    const V3 = i => new THREE.Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    const setV = (i, v) => { p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z; };
    const tube = (from, to, members, k, rMul, minR) => {
      if (!members.length) return;
      const a = v3(from), ax = v3(to).sub(a), len = ax.length(); ax.normalize();
      const bins = 24, rsum = new Float32Array(bins), rcnt = new Float32Array(bins);
      const inf = members.map(i => { const d = V3(i).sub(a), t = d.dot(ax); const rv = d.clone().addScaledVector(ax, -t); const bi = Math.max(0, Math.min(bins - 1, Math.floor(t / len * bins))); rsum[bi] += rv.length(); rcnt[bi]++; return { i, t, rv, bi }; });
      const rmax = Float32Array.from(rsum, (x, j) => rcnt[j] ? x / rcnt[j] : 0);
      for (let j = 1; j < bins; j++) if (!rmax[j]) rmax[j] = rmax[j - 1];
      rmax[0] = Math.min(rmax[0], rmax[2] * 1.05); rmax[1] = Math.min(rmax[1], rmax[2] * 1.05);
      for (let j = bins - 2; j >= 0; j--) rmax[j] = Math.max(rmax[j], rmax[j + 1]);
      const sm = Array.from(rmax, (x, j) => { let s = 0, cn = 0; for (let o = -2; o <= 2; o++) { const jj = j + o; if (jj >= 0 && jj < bins) { s += rmax[jj]; cn++; } } return s / cn; });
      for (const m of inf) { const r = m.rv.length(); if (!r) continue; const target = Math.max(minR, sm[m.bi] * rMul); const nr = r + Math.max(0, target - r) * k * w[m.i];
        setV(m.i, a.clone().addScaledVector(ax, m.t).addScaledVector(m.rv, nr / r)); }
    };
    const J = I.J, arms = { L: [], R: [] }, legs = { L: [], R: [] }, torso = [];
    for (let i = 0; i < n; i++) {
      const arm = A[i * 4 + 1] > 0.5, leg = A[i * 4 + 2] > 0.5, x = R[i * 3];
      if (arm) arms[x > 0 ? 'L' : 'R'].push(i); else if (leg && R[i * 3 + 1] > c.botLow + 0.02) legs[x > 0 ? 'L' : 'R'].push(i); else if (A[i * 4 + 3] < 0.5) torso.push(i);
    }
    for (const sd of ['L', 'R']) {
      tube(J['upperarm01.' + sd], J['wrist.' + sd], arms[sd].filter(i => A[i * 4] < c.cuffS + 0.01), 0.65, 1.0, 0.036);
      if (!c.skirt) tube(J['upperleg01.' + sd], J['foot.' + sd], legs[sd], 0.8, 1.12, 0.058);
    }
    { const bins = 60, y0 = I.hipY - 0.15, y1 = I.neckY, ax = new Float32Array(bins), z0 = new Float32Array(bins).fill(9), z1 = new Float32Array(bins).fill(-9);
      const bi = y => Math.max(0, Math.min(bins - 1, Math.floor((y - y0) / (y1 - y0) * bins)));
      for (const i of torso) { const v = V3(i), j = bi(v.y); ax[j] = Math.max(ax[j], Math.abs(v.x)); z0[j] = Math.min(z0[j], v.z); z1[j] = Math.max(z1[j], v.z); }
      const smooth = arr => Array.from(arr, (x, j) => { let s = 0, cn = 0; for (let o = -4; o <= 4; o++) { const jj = j + o; if (jj >= 0 && jj < bins && arr[jj] > -8 && arr[jj] < 8) { s += arr[jj]; cn++; } } return cn ? s / cn : x; });
      const AX = smooth(ax), Z0 = smooth(z0), Z1 = smooth(z1);
      const shY = J['upperarm01.L'][1] - 0.07;
      for (const i of torso) { const v = V3(i); if (v.y < y0 || v.y > shY) continue; const j = bi(v.y), zc = (Z0[j] + Z1[j]) / 2, rx = AX[j] + 0.004, rz = (Z1[j] - Z0[j]) / 2 + 0.004;
        const e = Math.sqrt((v.x / rx) ** 2 + ((v.z - zc) / rz) ** 2); if (e >= 1 || e < 0.05) continue; const f = (1 / e - 1) * c.fit * w[i] * Math.min(1, (shY - v.y) / 0.08);
        v.x += v.x * f; v.z += (v.z - zc) * f; setV(i, v); }
    }
    const pass = lam => { for (let i = 0; i < n; i++) { const L = nbs[i]; if (!w[i] || !L.length) { q[i * 3] = p[i * 3]; q[i * 3 + 1] = p[i * 3 + 1]; q[i * 3 + 2] = p[i * 3 + 2]; continue; }
        let x = 0, y = 0, z = 0; for (let k = 0; k < L.length; k++) { const j = L[k]; x += p[j * 3]; y += p[j * 3 + 1]; z += p[j * 3 + 2]; } x /= L.length; y /= L.length; z /= L.length;
        const kk = lam * w[i]; q[i * 3] = p[i * 3] + kk * (x - p[i * 3]); q[i * 3 + 1] = p[i * 3 + 1] + kk * (y - p[i * 3 + 1]); q[i * 3 + 2] = p[i * 3 + 2] + kk * (z - p[i * 3 + 2]); }
      p.set(q); };
    for (let it = 0; it < 10; it++) { pass(0.5); pass(-0.53); }
    P.array.set(p); geo.computeVertexNormals();
    geo.setAttribute('fpos', new THREE.Float32BufferAttribute(Float32Array.from(p), 3));
    const N = geo.attributes.normal;
    for (let i = 0; i < n; i++) { P.array[i * 3] += N.getX(i) * th[i]; P.array[i * 3 + 1] += N.getY(i) * th[i]; P.array[i * 3 + 2] += N.getZ(i) * th[i]; }
    P.needsUpdate = true; geo.computeVertexNormals();
  }

  // Skin colours for the lit 3D figures, one for each tone in the look editor. Real skin reflects far less
  // light than its swatch suggests, and even the fairest skin keeps a warm pink-beige colour, so these sit
  // below the swatches and carry more warmth; under the studio lights they read as the swatch, not as white.
  const SKIN_3D = ['#E2B192', '#D9A281', '#CD926E', '#BE7F5A', '#AA6D4B', '#91593B', '#7A4A30', '#623A25', '#4B2C1C', '#352015'];

  /* ================= strands (hair, moustaches) ================= */
  function rng(seed) { let h = seed >>> 0 || 1; return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }; }
  function seedOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const tangentTo = (v, nn) => v.clone().addScaledVector(nn, -v.dot(nn)).normalize();

  function surfaceIndex(geo, filter) {
    const PA = geo.attributes.position.array, NA = geo.attributes.normal.array, n = geo.attributes.position.count, cell = 0.02, map = new Map();
    const key = (x, y, z) => ((x + 512) * 1048576 + (y + 512) * 1024 + (z + 512));
    for (let i = 0; i < n; i++) { if (!filter(i)) continue; const k = key(Math.floor(PA[i * 3] / cell), Math.floor(PA[i * 3 + 1] / cell), Math.floor(PA[i * 3 + 2] / cell)); const L = map.get(k); if (L) L.push(i); else map.set(k, [i]); }
    const cells = new Map(); map.forEach((v, k) => cells.set(k, Int32Array.from(v)));
    const nn = new THREE.Vector3();
    return {
      /** push p out so it is at least `off` above the surface; returns the surface normal used (or null) */
      push(p, off) {
        let best = -1, bd = 1e9;
        const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
          const L = cells.get(key(cx + dx, cy + dy, cz + dz)); if (!L) continue;
          for (let k = 0; k < L.length; k++) { const i = L[k] * 3, ax = PA[i] - p.x, ay = PA[i + 1] - p.y, az = PA[i + 2] - p.z, d = ax * ax + ay * ay + az * az; if (d < bd) { bd = d; best = L[k]; } }
        }
        if (best < 0) return null;
        const j = best * 3; nn.set(NA[j], NA[j + 1], NA[j + 2]);
        const h = (p.x - PA[j]) * nn.x + (p.y - PA[j + 1]) * nn.y + (p.z - PA[j + 2]) * nn.z;
        if (h < off) { p.addScaledVector(nn, off - h); return nn.clone(); }
        return null;
      },
    };
  }
  function hairlineAtJS(az, line) { const a = Math.abs(az); let h = line + (-0.12) * sst(0.35, 0.9, a); h = h + (0 - h) * sst(0.9, 1.5, a); h = h + (-0.55 - h) * sst(1.6, 2.6, a); return h; }

  function sampleRoots(geo, idx, weight, n, rnd) {
    const P = geo.attributes.position, N = geo.attributes.normal, tris = [], cum = []; let tot = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < idx.length; t += 3) {
      const i = idx[t], j = idx[t + 1], k = idx[t + 2];
      const w = Math.min(weight(i), weight(j), weight(k)); if (w <= 0) continue;
      a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, j); c.fromBufferAttribute(P, k);
      tot += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2 * w; tris.push(i, j, k); cum.push(tot);
    }
    const out = [];
    if (!cum.length) return out;
    for (let s = 0; s < n; s++) {
      const r = rnd() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      const i = tris[lo * 3], j = tris[lo * 3 + 1], k = tris[lo * 3 + 2]; let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
      const p = new THREE.Vector3().fromBufferAttribute(P, i).multiplyScalar(w).add(new THREE.Vector3().fromBufferAttribute(P, j).multiplyScalar(u)).add(new THREE.Vector3().fromBufferAttribute(P, k).multiplyScalar(v));
      const nr = new THREE.Vector3().fromBufferAttribute(N, i).multiplyScalar(w).add(new THREE.Vector3().fromBufferAttribute(N, j).multiplyScalar(u)).add(new THREE.Vector3().fromBufferAttribute(N, k).multiplyScalar(v)).normalize();
      out.push({ p, n: nr, tri: i });
    }
    return out;
  }

  function growStrands(spec, rnd) {
    const G = [];
    for (const R of spec.guides) {
      const L = spec.len(R), segs = spec.segs, seg = L / segs;
      const pts = [R.p.clone().addScaledVector(R.n, 0.0005)];
      let d = R.n.clone().multiplyScalar(spec.lift).add(spec.comb(R.p, R).multiplyScalar(1 - spec.lift)).normalize();
      let p = pts[0].clone();
      for (let k = 1; k <= segs; k++) {
        const t = k / segs, cv = spec.comb(p, R), g = spec.gravity ? spec.gravity(t) : 0;
        d = d.multiplyScalar(1 - spec.bend).add(cv.multiplyScalar(spec.bend)); d.y -= g; d.normalize();
        p = p.clone().addScaledVector(d, seg);
        if (spec.shell) spec.shell(p);
        if (spec.collide) { const nrm = spec.collide.push(p, spec.offset + spec.volume * t * (R.edge == null ? 1 : R.edge)); if (nrm) { const dn = d.dot(nrm); if (dn < 0) d.addScaledVector(nrm, -dn).normalize(); } }
        pts.push(p);
      }
      G.push({ R, pts });
    }
    const strands = [];
    if (!G.length) return strands;
    // nearest guide for each root: guides sorted into a small 3D grid (no allocation per lookup)
    const cell = 0.03, nG = G.length, gx = new Float32Array(nG * 3);
    let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
    for (let i = 0; i < nG; i++) { const p = G[i].R.p; gx[i * 3] = p.x; gx[i * 3 + 1] = p.y; gx[i * 3 + 2] = p.z;
      if (p.x < mnx) mnx = p.x; if (p.y < mny) mny = p.y; if (p.z < mnz) mnz = p.z; if (p.x > mxx) mxx = p.x; if (p.y > mxy) mxy = p.y; if (p.z > mxz) mxz = p.z; }
    const NX = Math.floor((mxx - mnx) / cell) + 1, NY = Math.floor((mxy - mny) / cell) + 1, NZ = Math.floor((mxz - mnz) / cell) + 1;
    const head = new Int32Array(NX * NY * NZ).fill(-1), next = new Int32Array(nG);
    const cellOf = (x, y, z) => { const cx = Math.min(NX - 1, Math.max(0, Math.floor((x - mnx) / cell))), cy = Math.min(NY - 1, Math.max(0, Math.floor((y - mny) / cell))), cz = Math.min(NZ - 1, Math.max(0, Math.floor((z - mnz) / cell))); return [cx, cy, cz]; };
    for (let i = 0; i < nG; i++) { const c = cellOf(gx[i * 3], gx[i * 3 + 1], gx[i * 3 + 2]), k = (c[0] * NY + c[1]) * NZ + c[2]; next[i] = head[k]; head[k] = i; }
    const near = R => {
      const x = R.p.x, y = R.p.y, z = R.p.z, c = cellOf(x, y, z); let best = -1, bd = 1e9;
      for (let r = 1; best < 0 && r < 64; r++) {
        for (let ix = Math.max(0, c[0] - r); ix <= Math.min(NX - 1, c[0] + r); ix++) for (let iy = Math.max(0, c[1] - r); iy <= Math.min(NY - 1, c[1] + r); iy++) for (let iz = Math.max(0, c[2] - r); iz <= Math.min(NZ - 1, c[2] + r); iz++) {
          for (let i = head[(ix * NY + iy) * NZ + iz]; i >= 0; i = next[i]) { const dx = gx[i * 3] - x, dy = gx[i * 3 + 1] - y, dz = gx[i * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = i; } }
        }
      }
      return G[best < 0 ? 0 : best];
    };
    const up = new THREE.Vector3(0, 1, 0), a1 = new THREE.Vector3(), a2 = new THREE.Vector3(), dir = new THREE.Vector3();
    // guide points as flat arrays, plus (for curls) a frame around each point and the length along the guide, shared by all its children
    for (const g of G) {
      const n = g.pts.length, f = new Float32Array(n * 3); g.pts.forEach((v, k) => { f[k * 3] = v.x; f[k * 3 + 1] = v.y; f[k * 3 + 2] = v.z; }); g.f = f;
      if (spec.curl) {
        const fr = new Float32Array(n * 6), al = new Float32Array(n); let along = 0;
        for (let k = 0; k < n; k++) {
          const k1 = Math.min(n - 1, k + 1) * 3, k0 = Math.max(0, k - 1) * 3;
          dir.set(f[k1] - f[k0], f[k1 + 1] - f[k0 + 1], f[k1 + 2] - f[k0 + 2]).normalize();
          a1.crossVectors(up, dir); if (a1.lengthSq() < 1e-6) a1.set(1, 0, 0); a1.normalize(); a2.crossVectors(dir, a1);
          fr[k * 6] = a1.x; fr[k * 6 + 1] = a1.y; fr[k * 6 + 2] = a1.z; fr[k * 6 + 3] = a2.x; fr[k * 6 + 4] = a2.y; fr[k * 6 + 5] = a2.z;
          if (k) { const dx = f[k * 3] - f[k * 3 - 3], dy = f[k * 3 + 1] - f[k * 3 - 2], dz = f[k * 3 + 2] - f[k * 3 - 1]; along += Math.sqrt(dx * dx + dy * dy + dz * dz); }
          al[k] = along;
        }
        g.fr = fr; g.al = al;
      }
    }
    for (const R of spec.roots) {
      const g = near(R), gf = g.f, K = g.pts.length - 1;
      const ox = R.p.x - g.R.p.x, oy = R.p.y - g.R.p.y, oz = R.p.z - g.R.p.z;
      const phase = rnd() * Math.PI * 2, cr = spec.curl ? spec.curl.r * (0.7 + 0.6 * rnd()) : 0, cf = spec.curl ? spec.curl.f * (0.85 + 0.3 * rnd()) : 0;
      const fx = (rnd() - 0.5) * spec.fuzz, fy = (rnd() - 0.5) * spec.fuzz, fzz = (rnd() - 0.5) * spec.fuzz;
      const lenK = Math.max(2, Math.round(K * (0.75 + 0.25 * rnd())));
      const pts = new Float32Array((lenK + 1) * 3);
      for (let k = 0; k <= lenK; k++) {
        const t = k / K, keep = 1 - spec.clump * Math.min(1, t * 1.6);
        let x = gf[k * 3] + ox * keep + fx * t, y = gf[k * 3 + 1] + oy * keep + fy * t, z = gf[k * 3 + 2] + oz * keep + fzz * t;
        if (cr) {
          const fr = g.fr, ang = phase + g.al[k] * cf * Math.PI * 2, rr = cr * Math.min(1, t * 4), ca = Math.cos(ang) * rr, sa = Math.sin(ang) * rr;
          x += fr[k * 6] * ca + fr[k * 6 + 3] * sa; y += fr[k * 6 + 1] * ca + fr[k * 6 + 4] * sa; z += fr[k * 6 + 2] * ca + fr[k * 6 + 5] * sa;
        }
        pts[k * 3] = x; pts[k * 3 + 1] = y; pts[k * 3 + 2] = z;
      }
      strands.push({ pts, shade: 0.82 + 0.3 * rnd(), w: spec.width * (0.8 + 0.4 * rnd()) });
    }
    return strands;
  }

  function strandMesh(strands, color, opts) {
    opts = opts || {};
    const toFlat = P => { if (P instanceof Float32Array) return P; const f = new Float32Array(P.length * 3); P.forEach((v, k) => { f[k * 3] = v.x; f[k * 3 + 1] = v.y; f[k * 3 + 2] = v.z; }); return f; };
    const per = opts.per > 1 ? opts.per : 1;
    // smooth with a Catmull-Rom spline through the points, `per` samples per segment
    const smooth = f => {
      const n = f.length / 3; if (per === 1 || n < 3) return f;
      const out = new Float32Array(((n - 1) * per + 1) * 3); let o = 0;
      for (let i = 0; i < n - 1; i++) {
        const i0 = Math.max(0, i - 1) * 3, i1 = i * 3, i2 = (i + 1) * 3, i3 = Math.min(n - 1, i + 2) * 3;
        for (let s = 0; s < per; s++) {
          const t = s / per, t2 = t * t, t3 = t2 * t;
          const w0 = -0.5 * t3 + t2 - 0.5 * t, w1 = 1.5 * t3 - 2.5 * t2 + 1, w2 = -1.5 * t3 + 2 * t2 + 0.5 * t, w3 = 0.5 * t3 - 0.5 * t2;
          out[o++] = f[i0] * w0 + f[i1] * w1 + f[i2] * w2 + f[i3] * w3;
          out[o++] = f[i0 + 1] * w0 + f[i1 + 1] * w1 + f[i2 + 1] * w2 + f[i3 + 1] * w3;
          out[o++] = f[i0 + 2] * w0 + f[i1 + 2] * w1 + f[i2 + 2] * w2 + f[i3 + 2] * w3;
        }
      }
      out[o++] = f[(n - 1) * 3]; out[o++] = f[(n - 1) * 3 + 1]; out[o++] = f[(n - 1) * 3 + 2];
      return out;
    };
    let nPts = 0, nSeg = 0; const lists = strands.map(s => { const P = smooth(toFlat(s.pts)); nPts += P.length / 3; nSeg += P.length / 3 - 1; return P; });
    const nV = nPts * 2, pos = new Float32Array(nV * 3), tan = new Float32Array(nV * 3), side = new Float32Array(nV), tt = new Float32Array(nV), shd = new Float32Array(nV), wid = new Float32Array(nV);
    const idx = nV > 65535 ? new Uint32Array(nSeg * 6) : new Uint16Array(nSeg * 6); let v = 0, ii = 0;
    for (let si = 0; si < strands.length; si++) {
      const s = strands[si], P = lists[si], K = P.length / 3 - 1, base = v, sh = s.shade, w = s.w;
      for (let k = 0; k <= K; k++) {
        const a = (k > 0 ? k - 1 : 0) * 3, b = (k < K ? k + 1 : K) * 3;
        let tx = P[b] - P[a], ty = P[b + 1] - P[a + 1], tz = P[b + 2] - P[a + 2]; const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        const px = P[k * 3], py = P[k * 3 + 1], pz = P[k * 3 + 2], tk = k / K;
        for (let sd = -1; sd <= 1; sd += 2) { const o = v * 3; pos[o] = px; pos[o + 1] = py; pos[o + 2] = pz; tan[o] = tx; tan[o + 1] = ty; tan[o + 2] = tz; side[v] = sd; tt[v] = tk; shd[v] = sh; wid[v] = w; v++; }
        if (k < K) { const i = base + k * 2; idx[ii++] = i; idx[ii++] = i + 1; idx[ii++] = i + 2; idx[ii++] = i + 1; idx[ii++] = i + 3; idx[ii++] = i + 2; }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('tangent3', new THREE.BufferAttribute(tan, 3));
    g.setAttribute('side', new THREE.BufferAttribute(side, 1)); g.setAttribute('tt', new THREE.BufferAttribute(tt, 1));
    g.setAttribute('shd', new THREE.BufferAttribute(shd, 1)); g.setAttribute('wid', new THREE.BufferAttribute(wid, 1));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const c = new THREE.Color(color);
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uCol: { value: new THREE.Vector3(c.r, c.g, c.b) }, uKey: { value: v3(LIGHTS.key).normalize() }, uRim: { value: v3(LIGHTS.rim).normalize() }, uFill: { value: v3(LIGHTS.fill).normalize() },
        uRootDark: { value: opts.rootDark == null ? 0.45 : opts.rootDark }, uSpec: { value: opts.spec == null ? 1 : opts.spec }, uWidthK: { value: 1 },
      },
      vertexShader: `
        attribute vec3 tangent3; attribute float side, tt, shd, wid; uniform float uWidthK;
        varying vec3 vT; varying vec3 vW; varying float vt, vs;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec3 T = normalize(mat3(modelMatrix) * tangent3);
          vec3 V = normalize(cameraPosition - wp.xyz);
          vec3 S = normalize(cross(T, V));
          wp.xyz += S * side * wid * uWidthK * (1.0 - 0.75 * tt) * 0.5;
          vT = T; vW = wp.xyz; vt = tt; vs = shd;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 uCol, uKey, uRim, uFill; uniform float uRootDark, uSpec;
        varying vec3 vT; varying vec3 vW; varying float vt, vs;
        float kk(vec3 T, vec3 L, vec3 V, float shift, float p){ vec3 H = normalize(L + V); float th = dot(T, H) + shift; return pow(max(0.0, sqrt(max(0.0, 1.0 - th * th))), p); }
        void main(){
          vec3 T = normalize(vT), V = normalize(cameraPosition - vW);
          vec3 base = uCol * vs * mix(uRootDark, 1.0, smoothstep(0.0, 0.35, vt)) * (1.0 + 0.12 * vt);
          float dk = sqrt(max(0.0, 1.0 - pow(dot(T, uKey), 2.0)));
          vec3 col = base * (0.28 + 0.68 * dk);
          col += base * 0.25 * sqrt(max(0.0, 1.0 - pow(dot(T, uFill), 2.0)));
          col += vec3(1.0, 0.97, 0.92) * 0.16 * uSpec * kk(T, uKey, V, 0.12, 110.0);
          col += base * 1.4 * uSpec * kk(T, uKey, V, -0.15, 22.0);
          col += mix(base, vec3(0.6, 0.85, 1.0), 0.35) * 0.25 * uSpec * kk(T, uRim, V, 0.0, 30.0);
          gl_FragColor = vec4(col, 1.0 - smoothstep(0.85, 1.0, vt));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.DoubleSide, alphaToCoverage: true,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.castShadow = false;
    return mesh;
  }

  function buildHair(style, geo, b, I, c, q, hatY) {
    const rnd = rng(c.seed), A = b.A, B = b.B, C = v3(I.headC), S = v3(I.headS);
    const headCol = surfaceIndex(geo, i => A[i * 4 + 3] > 0.5 || (A[i * 4 + 1] < 0.5 && geo.attributes.position.getY(i) > I.neckY - 0.35));
    const line = c.hairline;
    const scalpW = i => { if (A[i * 4 + 3] < 0.5) return 0; const nx = B[i * 4], ny = B[i * 4 + 1], nz = B[i * 4 + 2];
      if (Math.abs(nx) > 0.8 && ny < 0.25 && ny > -0.9) return 0; if (hatY && geo.attributes.position.getY(i) > hatY) return 0;
      return ny - hairlineAtJS(Math.atan2(nx, nz), line) > 0.015 ? 1 : 0; };
    const roots = n => sampleRoots(geo, b.idx, scalpW, n, rnd);
    const down = new THREE.Vector3(0, -1, 0), back = new THREE.Vector3(0, -0.25, -1).normalize();
    const nAt = p => new THREE.Vector3((p.x - C.x) / (S.x * S.x), (p.y - C.y) / (S.y * S.y), (p.z - C.z) / (S.z * S.z)).normalize();
    const D = o => Object.assign({ offset: 0.0022, volume: 0.003, bend: 0.6, lift: 0.2, clump: 0.55, fuzz: 0.002, width: 0.0007, collide: headCol, segs: 8 }, o);
    let spec;
    switch (style) {
      case 'crop': spec = D({ len: () => 0.032 + 0.012 * rnd(), comb: p => tangentTo(back.clone().add(new THREE.Vector3(Math.sign(p.x - C.x) * 0.3, -0.2, 0)), nAt(p)), segs: 7, width: 0.0006, clump: 0.5 }); break;
      case 'side': spec = D({ len: R => 0.05 + 0.025 * rnd() * (R.p.y > C.y ? 1 : 0.5), comb: (p, R) => tangentTo(new THREE.Vector3(R.p.x > C.x + 0.025 ? 1 : -1, -0.5, -0.45), nAt(p)), lift: 0.25, volume: 0.006, segs: 10, width: 0.00065 }); break;
      case 'curly': spec = D({ len: () => 0.045 + 0.015 * rnd(), comb: p => tangentTo(back, nAt(p)), lift: 0.4, volume: 0.012, clump: 0.7, curl: { r: 0.0035, f: 180 }, segs: 10, width: 0.0006 }); break;
      case 'afro': spec = D({ len: () => 0.042 + 0.008 * rnd(), comb: p => nAt(p), lift: 0.9, bend: 0.2, volume: 0.03, clump: 0.75, curl: { r: 0.0032, f: 260 }, segs: 14, width: 0.00055, fuzz: 0.002 }); break;
      case 'long': case 'wavy': spec = D({ len: () => 0.26 + 0.05 * rnd(), comb: (p, R) => p.y > C.y - 0.04 ? tangentTo(new THREE.Vector3(Math.sign(R.p.x - C.x) * 0.6, -1, -0.15), nAt(p)) : down.clone().add(new THREE.Vector3((Math.sign(R.p.x - C.x) || 1) * 0.05, 0, 0)).normalize(),
        gravity: t => 0.35 * t, lift: 0.3, bend: 0.4, volume: 0.008, segs: 22, width: 0.0007, clump: 0.65, curl: style === 'wavy' ? { r: 0.006, f: 18 } : null }); break;
      case 'bob': spec = D({ len: R => (R.p.z < C.z - 0.05 ? 0.16 : 0.13) + 0.02 * rnd(), comb: (p, R) => p.y > C.y - 0.02 ? tangentTo(new THREE.Vector3(Math.sign(R.p.x - C.x) * 0.7, -1, -0.1), nAt(p)) : down.clone(),
        gravity: t => 0.3 * t, lift: 0.3, volume: 0.009, segs: 16, width: 0.0007, clump: 0.6 }); break;
      case 'bun': case 'ponytail': case 'braids': {
        const tie = C.clone().add(new THREE.Vector3(0, style === 'bun' ? S.y * 0.15 : S.y * 0.05, -S.z * 0.5));
        spec = D({ len: R => Math.max(0.02, R.p.distanceTo(tie) * 0.98), comb: p => tangentTo(tie.clone().sub(p), nAt(p)), lift: 0.02, bend: 0.85, volume: 0.0015, offset: 0.0018, segs: 14, width: 0.0006, clump: 0.3, fuzz: 0.0008 });
        spec.tie = tie; break; }
      default: spec = D({ len: () => 0.035, comb: p => tangentTo(back, nAt(p)), segs: 6 });
    }
    const nG = Math.round((style === 'afro' ? 3000 : 1600) * Math.max(0.35, q)), nC = Math.round((style === 'afro' ? 40000 : (style === 'long' || style === 'wavy') ? 22000 : 18000) * q);
    spec.shell = p => { const d = p.clone().sub(C), e = Math.sqrt((d.x / (S.x / 2)) ** 2 + (d.y / (S.y / 2)) ** 2 + (d.z / (S.z / 2)) ** 2); if (p.y > C.y - S.y * 0.35 && e < 0.86 && e > 0.01) p.copy(C).addScaledVector(d, 0.86 / e); };
    spec.guides = roots(nG); spec.roots = roots(nC);
    const edgeOf = R => { const i = R.tri; return Math.min(1, Math.max(0, (B[i * 4 + 1] - hairlineAtJS(Math.atan2(B[i * 4], B[i * 4 + 2]), line)) / 0.25)); };
    for (const R of spec.guides.concat(spec.roots)) R.edge = 0.25 + 0.75 * edgeOf(R);
    const len0 = spec.len; spec.len = R => len0(R) * (0.6 + 0.4 * (R.edge || 1));
    const g = new THREE.Group();
    g.add(strandMesh(growStrands(spec, rnd), c.hair, { per: spec.curl && q > 0.5 ? 3 : spec.curl ? 2 : 1 }));
    const wK = 1 / Math.sqrt(Math.max(0.25, q));
    if (style === 'bun') g.add(strandMesh(coil(spec.tie, 0.04, rnd, Math.round(9000 * q)), c.hair, { rootDark: 0.7 }));
    if (style === 'ponytail') g.add(strandMesh(tail(spec.tie, rnd, Math.round(8000 * q), headCol, 0.012, 0.26), c.hair, { rootDark: 0.7 }));
    if (style === 'braids') for (const sx of [-1, 1]) g.add(strandMesh(tail(spec.tie.clone().add(new THREE.Vector3(sx * S.x * 0.32, -S.y * 0.25, S.z * 0.08)), rnd, Math.round(4000 * q), headCol, 0.008, 0.3, true), c.hair, { rootDark: 0.6 }));
    g.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uWidthK) o.material.uniforms.uWidthK.value = wK; });
    return g;
  }
  function coil(cc, r, rnd, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), u = new THREE.Vector3(0, 1, 0).cross(ax).normalize(), v = ax.clone().cross(u);
      const a0 = rnd() * Math.PI * 2, span = 1.2 + rnd() * 1.6, rr = r * (0.82 + 0.2 * rnd()), pts = [];
      for (let k = 0; k <= 16; k++) { const a = a0 + span * k / 16; pts.push(cc.clone().add(new THREE.Vector3(0, 0, -r * 0.6)).addScaledVector(u, Math.cos(a) * rr).addScaledVector(v, Math.sin(a) * rr).addScaledVector(ax, (rnd() - 0.5) * 0.002)); }
      out.push({ pts, shade: 0.8 + 0.3 * rnd(), w: 0.0007 });
    }
    return out;
  }
  function tail(cc, rnd, n, col, r, len, braid) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r0 = r * Math.sqrt(rnd()), pts = [];
      let p = cc.clone().add(new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0, -0.01)), d = new THREE.Vector3(0, braid ? -1 : -0.3, braid ? -0.2 : -1).normalize();
      const L = len * (0.9 + 0.2 * rnd()), K = 18, strandGroup = Math.floor(rnd() * 3);
      for (let k = 0; k <= K; k++) {
        const t = k / K; const q = p.clone();
        if (braid) { const ph = t * 22 + strandGroup * 2.094; q.x += Math.sin(ph) * r * 0.55; q.z += Math.cos(ph) * r * 0.35; }
        pts.push(q); d.y -= braid ? 0.05 : 0.18; d.normalize(); p = p.clone().addScaledVector(d, L / K); p.x += Math.cos(a) * r0 * 0.12 * t; col.push(p, 0.004);
      }
      out.push({ pts, shade: 0.8 + 0.3 * rnd(), w: 0.0007 });
    }
    return out;
  }

  /* ---------- moustaches ---------- */
  function buildMoustache(style, geo, b, I, c, mouth, q) {
    const rnd = rng(c.seed + 5), A = b.A, P = geo.attributes.position;
    const headCol = surfaceIndex(geo, i => A[i * 4 + 3] > 0.5);
    const my = mouth[1], mz = mouth[2];
    const front = i => A[i * 4 + 3] > 0.5 && P.getZ(i) > mz - 0.05;
    const upper = (w, h0, h1) => i => front(i) && Math.abs(P.getX(i)) < w && P.getY(i) > my + h0 && P.getY(i) < my + h1 ? 1 : 0;
    const D = o => Object.assign({ offset: 0.0012, volume: 0.002, bend: 0.4, lift: 0.25, clump: 0.5, fuzz: 0.0008, width: 0.00045, collide: headCol, segs: 6 }, o);
    const outDown = (p, R) => tangentTo(new THREE.Vector3(Math.sign(p.x) * 0.9, -1, 0.15), R.n);
    const sets = [];
    const add = (weight, n, spec) => { n = Math.round(n * q); spec.guides = sampleRoots(geo, b.idx, weight, Math.max(60, n / 12), rnd); spec.roots = sampleRoots(geo, b.idx, weight, n, rnd); sets.push(growStrands(spec, rnd)); };
    switch (style) {
      case 'pencil': add(upper(0.024, 0.0045, 0.009), 2500, D({ len: () => 0.004, comb: outDown, segs: 3, width: 0.0004 })); break;
      case 'chevron': add(upper(0.028, 0.004, 0.019), 11000, D({ len: () => 0.011 + 0.002 * rnd(), comb: outDown, volume: 0.003, clump: 0.7, fuzz: 0.0004 })); break;
      case 'walrus': add(upper(0.033, 0.003, 0.021), 13000, D({ len: () => 0.02 + 0.004 * rnd(), comb: (p, R) => tangentTo(new THREE.Vector3(Math.sign(p.x) * 0.4, -1, 0.35), R.n), gravity: t => 0.2 * t, volume: 0.004, segs: 8 })); break;
      case 'handlebar': add(upper(0.03, 0.005, 0.016), 11000, D({ len: R => 0.014 + 0.03 * Math.pow(Math.abs(R.p.x) / 0.03, 1.5), comb: p => { const ax = Math.abs(p.x), k = -0.45 + 2.4 * Math.min(1, Math.max(0, (ax - 0.028) / 0.022)); return new THREE.Vector3(Math.sign(p.x), k, 0.25 - 0.6 * Math.min(1, Math.max(0, (ax - 0.03) / 0.02))).normalize(); }, bend: 0.55, lift: 0.1, segs: 16, volume: 0.003, clump: 0.85, fuzz: 0.0003, width: 0.0005 })); break;
      case 'horseshoe': add(upper(0.03, 0.004, 0.017), 5500, D({ len: () => 0.012, comb: outDown }));
        add(i => front(i) && Math.abs(P.getX(i)) > 0.024 && Math.abs(P.getX(i)) < 0.034 && P.getY(i) < my + 0.008 && P.getY(i) > my - 0.05 ? 1 : 0, 5000, D({ len: () => 0.012, comb: (p, R) => tangentTo(new THREE.Vector3(0, -1, 0.2), R.n) })); break;
    }
    const g = new THREE.Group(), wK = 1 / Math.sqrt(Math.max(0.25, q));
    for (const s of sets) { for (const st of s) st.shade = 0.72 + 0.28 * rnd(); const m = strandMesh(s, c.hair, { per: q > 0.5 ? 2 : 1, rootDark: 0.7, spec: 0.45 }); m.material.uniforms.uWidthK.value = wK; g.add(m); }
    return g;
  }

  /* ---------- beards: growth map from facial landmarks + layered shells ---------- */
  function faceMarks(geo, b, I, mouth) {
    const P = geo.attributes.position, A = b.A, hc = I.headC, eyeY = I.eyeL[1];
    let earX = 0, chinY = 9, noseTip = null;
    for (let i = 0; i < P.count; i++) {
      if (A[i * 4 + 1] > 0.5) continue;
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (Math.abs(y - (eyeY - 0.02)) < 0.012 && A[i * 4 + 3] > 0.5 && Math.abs(x - hc[0]) > earX) earX = Math.abs(x - hc[0]);
      if (Math.abs(x) < 0.012 && z > mouth[2] - 0.035 && y < mouth[1] - 0.01 && y > I.neckY - 0.04) chinY = Math.min(chinY, y);
      if (Math.abs(x) < 0.006 && y < eyeY - 0.01 && y > mouth[1] + 0.01 && (!noseTip || z > noseTip.z)) noseTip = { y, z };
    }
    let tragus = 1.5;
    for (let i = 0; i < P.count; i++) {
      const x = Math.abs(P.getX(i) - hc[0]), y = P.getY(i), z = P.getZ(i);
      if (Math.abs(y - (eyeY - 0.02)) < 0.014 && x > earX - 0.012) tragus = Math.min(tragus, Math.atan2(x, z - hc[2]));
    }
    return { hc, eyeY, mouth, chinY, earTh: tragus, noseBaseY: noseTip ? Math.min(noseTip.y - 0.012, mouth[1] + 0.024) : mouth[1] + 0.022, neckY: I.neckY };
  }
  function beardField(style, M) {
    const my = M.mouth[1], hc = M.hc, thSB = M.earTh - 0.1, lerpN = (a, b2, t) => a + (b2 - a) * t;
    return (x0, y, z) => {
      const x = Math.abs(x0 - hc[0]), th = Math.atan2(x, z - hc[2]);
      if (z < hc[2] - 0.06) return { d: 0, L: 0, th };
      let top;
      if (th < 0.3) top = M.noseBaseY;
      else if (th < 0.55) top = lerpN(M.noseBaseY, my + 0.042, sst(0.3, 0.55, th));
      else top = lerpN(my + 0.045, M.eyeY - 0.004, sst(0.95, thSB, th));
      const bot = lerpN(M.chinY - 0.032, M.eyeY - 0.07, sst(0.15, thSB, th));
      let d = sst(top + 0.003, top - 0.008, y) * sst(bot - 0.004, bot + 0.01, y) * sst(thSB + 0.02, thSB - 0.06, th);
      if (y < M.chinY + 0.01 && x < 0.07 && z > hc[2] - 0.005) d = Math.max(d, sst(bot - 0.004, bot + 0.01, y) * sst(0.075, 0.05, x));
      d *= sst(0.98, 1.22, Math.hypot(x / 0.028, (y - my) / 0.0118));
      if (style === 'goatee' || style === 'vandyke') d *= sst(0.4, 0.3, th) * sst(M.noseBaseY + 0.002, M.noseBaseY - 0.004, y) * (y < my - 0.004 ? sst(0.034, 0.024, x) : (style === 'vandyke' ? 0 : 1));
      const base = { stubble: 0.0016, short: 0.006, full: 0.018, goatee: 0.012, vandyke: 0.012 }[style] || 0.01;
      const chin = Math.exp(-((x / 0.035) ** 2)) * sst(my - 0.01, my - 0.045, y);
      let L = base * (0.55 + 0.45 * sst(my + 0.035, my, y)) * (1 + (style === 'full' ? 0.6 : 0.25) * chin) * (0.5 + 0.5 * d);
      if (th < 0.33 && y > my) L = Math.min(L, style === 'full' ? 0.012 : base);
      return { d: Math.max(0, Math.min(1, d)), L, th };
    };
  }
  function buildBeard(style, geo, b, I, c, mouth, q) {
    const M = faceMarks(geo, b, I, mouth), F = beardField(style, M);
    const P = geo.attributes.position, N = geo.attributes.normal, idx = b.idx, A = b.A, n = P.count;
    const Dn = new Float32Array(n), L = new Float32Array(n), dir = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (P.getY(i) < I.neckY - 0.05 || A[i * 4 + 1] > 0.5) continue;
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), f = F(x, y, z); Dn[i] = f.d; L[i] = f.L;
      if (!f.d) continue;
      const nr = new THREE.Vector3(N.getX(i), N.getY(i), N.getZ(i)), sx = Math.sign(x - M.hc[0]) || 1;
      const chin = Math.exp(-((x / 0.035) ** 2)) * sst(mouth[1] - 0.01, mouth[1] - 0.045, y);
      const cmb = new THREE.Vector3(sx * 0.2, -1, 0.25 + 0.6 * chin);
      if (f.th < 0.35 && y > mouth[1]) cmb.set(sx * 0.9, -1, 0.25);
      cmb.addScaledVector(nr, -cmb.dot(nr)).normalize();
      dir[i * 3] = cmb.x; dir[i * 3 + 1] = cmb.y; dir[i * 3 + 2] = cmb.z;
    }
    geo.setAttribute('beardW', new THREE.Float32BufferAttribute(Array.from(Dn, d => Math.min(1, d * (style === 'stubble' ? 0.8 : 1.2))), 1));
    const tris = [];
    for (let t = 0; t < idx.length; t += 3) if (Dn[idx[t]] + Dn[idx[t + 1]] + Dn[idx[t + 2]] > 0.02) tris.push(idx[t], idx[t + 1], idx[t + 2]);
    const used = new Map(), verts = [];
    for (const i of tris) if (!used.has(i)) { used.set(i, verts.length); verts.push(i); }
    const K = Math.max(4, Math.round((style === 'stubble' ? 6 : style === 'short' ? 18 : 34) * (q < 0.5 ? 0.6 : 1)));
    const nv = verts.length * K, pos = new Float32Array(nv * 3), base = new Float32Array(nv * 3), hh = new Float32Array(nv), dd = new Float32Array(nv), td = new Float32Array(nv * 3), ix = [];
    let o = 0;
    for (let k = 1; k <= K; k++) {
      const h = k / K, off = verts.length * (k - 1);
      for (const i of verts) {
        const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i), l = L[i];
        const out = h * l * (style === 'full' ? 0.42 : 0.55), bend = Math.pow(h, 1.5) * l * (style === 'stubble' ? 0.3 : 0.85);
        pos[o * 3] = P.getX(i) + nx * out + dir[i * 3] * bend; pos[o * 3 + 1] = P.getY(i) + ny * out + dir[i * 3 + 1] * bend; pos[o * 3 + 2] = P.getZ(i) + nz * out + dir[i * 3 + 2] * bend;
        base[o * 3] = P.getX(i); base[o * 3 + 1] = P.getY(i); base[o * 3 + 2] = P.getZ(i); hh[o] = h; dd[o] = Dn[i];
        let tx = nx * 0.55 + dir[i * 3] * 1.3 * h, ty = ny * 0.55 + dir[i * 3 + 1] * 1.3 * h, tz = nz * 0.55 + dir[i * 3 + 2] * 1.3 * h; const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
        td[o * 3] = tx / tl; td[o * 3 + 1] = ty / tl; td[o * 3 + 2] = tz / tl; o++;
      }
      for (const i of tris) ix.push(used.get(i) + off);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('base', new THREE.BufferAttribute(base, 3));
    g.setAttribute('hh', new THREE.BufferAttribute(hh, 1)); g.setAttribute('dens', new THREE.BufferAttribute(dd, 1)); g.setAttribute('tdir', new THREE.BufferAttribute(td, 3));
    g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(ix, 1) : new THREE.Uint16BufferAttribute(ix, 1));
    const col = new THREE.Color(c.hair);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uCol: { value: new THREE.Vector3(col.r, col.g, col.b) }, uCell: { value: style === 'stubble' ? 0.00032 : 0.0005 },
        uKey: { value: v3(LIGHTS.key).normalize() }, uFill: { value: v3(LIGHTS.fill).normalize() }, uRim: { value: v3(LIGHTS.rim).normalize() },
        uFillRate: { value: style === 'stubble' ? 0.85 : 1.0 }, uThick: { value: style === 'stubble' ? 0.6 : 1.12 }, uGrey: { value: c.grey },
      },
      vertexShader: `
        attribute vec3 base, tdir; attribute float hh, dens;
        varying vec3 vBase, vT, vW; varying float vH, vD;
        void main(){ vBase = base; vH = hh; vD = dens; vT = normalize(mat3(modelMatrix) * tdir);
          vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `
        uniform vec3 uCol, uKey, uFill, uRim; uniform float uCell, uFillRate, uThick, uGrey;
        varying vec3 vBase, vT, vW; varying float vH, vD;
        float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
        float kk(vec3 T, vec3 L, vec3 V, float sh, float pw){ vec3 H = normalize(L + V); float t = dot(T, H) + sh; return pow(max(0.0, sqrt(max(0.0, 1.0 - t * t))), pw); }
        void main(){
          // hairs never get thinner than about a pixel: smaller on screen means fewer, slightly thicker hairs
          float cell = max(uCell, length(fwidth(vBase)) * 0.9);
          vec3 p = vBase / cell, ip = floor(p), fp = fract(p);
          float best = 9.0; vec3 bid = vec3(0.0);
          for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
            vec3 g = vec3(float(x), float(y), float(z)), id = ip + g;
            vec3 o = vec3(h31(id), h31(id + 17.3), h31(id + 41.9));
            o += 0.18 * vec3(sin(vH * 5.0 + o.x * 6.3), sin(vH * 4.0 + o.y * 6.3), 0.0);
            float dd = length(g + o - fp); if (dd < best) { best = dd; bid = id; } }
          float r1 = h31(bid + 3.1), r2 = h31(bid + 7.7), r3 = h31(bid + 11.3);
          if (r1 > vD * uFillRate) discard;
          float hmax = 0.45 + 0.55 * r2; if (vH > hmax) discard;
          float rad = 0.46 * uThick * (1.0 - pow(vH / hmax, 1.6)) + 0.06;
          float a = smoothstep(rad, rad * 0.4, best); if (a < 0.02) discard;
          vec3 V = normalize(cameraPosition - vW), T = normalize(vT);
          float ao = mix(0.12, 1.0, pow(vH, 0.9));
          vec3 base = uCol * (0.82 + 0.26 * r3) * ao;
          if (r3 > 1.0 - uGrey) base = vec3(0.62, 0.6, 0.57) * ao;
          float dk = sqrt(max(0.0, 1.0 - pow(dot(T, uKey), 2.0)));
          vec3 col = base * (0.32 + 0.75 * dk) + base * 0.25 * sqrt(max(0.0, 1.0 - pow(dot(T, uFill), 2.0)));
          col += vec3(1.0, 0.96, 0.9) * 0.04 * kk(T, uKey, V, 0.1, 80.0) * ao;
          col += base * 0.3 * kk(T, uKey, V, -0.12, 18.0);
          col += base * 0.25 * kk(T, uRim, V, 0.0, 24.0);
          if (uThick < 0.7) { col = mix(col, uCol * 0.35, 0.45); a *= 0.8; }
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.DoubleSide, alphaToCoverage: true,
    });
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
    const grp = new THREE.Group(); grp.add(mesh);
    if ((style === 'full' || style === 'short') && q > 0.5) {
      const rnd = rng(c.seed + 21), weight = i => Dn[i];
      const spec = { len: R => F(R.p.x, R.p.y, R.p.z).L * 1.05, comb: (p, R) => tangentTo(new THREE.Vector3((Math.sign(p.x) || 1) * 0.25, -1, 0.35), R.n), segs: 6, lift: 0.4, bend: 0.5,
        offset: 0.0008, volume: style === 'full' ? 0.009 : 0.003, clump: 0.2, fuzz: 0.0012, width: 0.00022, collide: surfaceIndex(geo, i => P.getY(i) > I.neckY - 0.06 && A[i * 4 + 1] < 0.5), curl: { r: 0.0012, f: 120 } };
      spec.guides = sampleRoots(geo, idx, weight, 400, rnd); spec.roots = sampleRoots(geo, idx, weight, style === 'full' ? 3500 : 1500, rnd);
      const st = growStrands(spec, rnd); for (const s of st) s.shade = 0.55 + 0.25 * rnd();
      grp.add(strandMesh(st, c.hair, { per: 2, rootDark: 0.6, spec: 0.35 }));
    }
    return grp;
  }

  /* ================= props: eyes, glasses, caps, shoes, badges ================= */
  const _tex = {};
  function irisTexture(color) {
    if (_tex[color]) return _tex[color];
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const g = cv.getContext('2d'), col = new THREE.Color(color);
    const d = g.createImageData(128, 64), rnd = rng(seedOf(color));
    for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
      const r = y / 63; let R, G, B;
      if (r < 0.32) R = G = B = 8;
      else if (r < 0.88) { const k = (r - 0.3) / 0.58, s = 0.8 + 0.5 * rnd() * (0.5 + 0.5 * Math.sin(x * 0.9)); const l = (0.8 + 0.7 * Math.sin(k * Math.PI)) * s; R = col.r * 255 * l; G = col.g * 255 * l; B = col.b * 255 * l; }
      else { R = col.r * 60; G = col.g * 60; B = col.b * 60; }
      const i = (y * 128 + x) * 4; d.data[i] = R; d.data[i + 1] = G; d.data[i + 2] = B; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.shared = true; return (_tex[color] = t);
  }
  function eye(center, r, irisCol) {
    const g = new THREE.Group(); g.position.set(center[0], center[1], center[2]);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), new THREE.MeshPhysicalMaterial({ color: '#efe9e2', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 })));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(r * 1.004, 32, 12, 0, Math.PI * 2, 0, 0.5), new THREE.MeshPhysicalMaterial({ map: irisTexture(irisCol), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02 }));
    iris.rotation.x = Math.PI / 2; g.add(iris);
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.0, clearcoat: 1, depthWrite: false }));
    cornea.rotation.x = Math.PI / 2; cornea.position.z = r * 0.86; g.add(cornea);
    return g;
  }
  function wingsShape() {
    const s = new THREE.Shape();
    s.moveTo(0, -0.004); s.lineTo(0.006, -0.002); s.bezierCurveTo(0.014, 0.0, 0.024, 0.004, 0.034, 0.007);
    s.lineTo(0.03, 0.002); s.lineTo(0.033, 0.0015); s.lineTo(0.026, -0.002); s.lineTo(0.028, -0.003); s.lineTo(0.016, -0.005); s.lineTo(0.007, -0.0065); s.lineTo(0, -0.0085);
    s.lineTo(-0.007, -0.0065); s.lineTo(-0.016, -0.005); s.lineTo(-0.028, -0.003); s.lineTo(-0.026, -0.002); s.lineTo(-0.033, 0.0015); s.lineTo(-0.03, 0.002);
    s.lineTo(-0.034, 0.007); s.bezierCurveTo(-0.024, 0.004, -0.014, 0.0, -0.006, -0.002); s.lineTo(0, -0.004);
    return s;
  }
  const gold = () => new THREE.MeshStandardMaterial({ color: '#E2B657', roughness: 0.28, metalness: 1 });
  function badge(accent, scale) {
    const g = new THREE.Group(), gm = gold();
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(wingsShape(), { depth: 0.0015, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 2 }), gm));
    const cc = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 20), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.2 }));
    cc.rotation.x = Math.PI / 2; cc.position.set(0, -0.003, 0.0022); g.add(cc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0058, 0.0009, 6, 20), gm); ring.position.copy(cc.position); ring.position.z += 0.001; g.add(ring);
    g.scale.setScalar(scale);
    return g;
  }

  /** Glasses: pilot aviators (gold frame, green-grey lenses), clear aviators, round or rectangular frames. */
  function glasses(kind, I, eyeR) {
    const g = new THREE.Group(), sun = kind === 'sunglasses';
    const metal = new THREE.MeshStandardMaterial({ color: kind === 'aviator' || sun ? '#C9A45C' : '#23262C', roughness: 0.22, metalness: kind === 'aviator' || sun ? 1 : 0.4, envMapIntensity: 1.3 });
    const lensMat = sun ? new THREE.MeshPhysicalMaterial({ color: '#27352d', roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.86, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshPhysicalMaterial({ color: '#dfeeff', roughness: 0.02, transparent: true, opacity: 0.14, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
    const S = new THREE.Shape();
    let cx, cy;
    if (kind === 'round') { S.absarc(24, 0, 23, 0, Math.PI * 2, false); cx = 24; cy = 0; }
    else if (kind === 'rect') { const w = 50, h = 34, r = 7; S.moveTo(r, h / 2); S.lineTo(w - r, h / 2); S.quadraticCurveTo(w, h / 2, w, h / 2 - r); S.lineTo(w, -h / 2 + r); S.quadraticCurveTo(w, -h / 2, w - r, -h / 2); S.lineTo(r, -h / 2); S.quadraticCurveTo(0, -h / 2, 0, -h / 2 + r); S.lineTo(0, h / 2 - r); S.quadraticCurveTo(0, h / 2, r, h / 2); cx = 25; cy = 0; }
    else { S.moveTo(0, 17); S.bezierCurveTo(16, 19, 38, 21, 52, 19); S.bezierCurveTo(60, 16, 60, 2, 56, -8); S.bezierCurveTo(50, -26, 30, -33, 17, -29); S.bezierCurveTo(5, -25, -1, -12, -1, 0); S.bezierCurveTo(-1, 8, -1, 13, 0, 17); cx = 27; cy = -4; }
    const outline = S.getSpacedPoints(80), mm = 0.001 * 0.95 * (I.eyeScale || 1), Rc = 0.085;
    const eL = v3(I.eyeL), eR = v3(I.eyeR), mid = eL.clone().add(eR).multiplyScalar(0.5);
    const half = Math.max(0.033, Math.abs(eL.x - eR.x) / 2 + 0.002), z = Math.max(eL.z, eR.z) + eyeR + 0.016;
    const parts = [];
    for (const sd of [1, -1]) {
      const lens = new THREE.Group(), geo = new THREE.ShapeGeometry(S, 32), P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = (P.getX(i) - cx) * mm, y = (P.getY(i) - cy) * mm; P.setXYZ(i, x * sd, y, -(x * x + y * y) / (2 * Rc)); }
      geo.computeVertexNormals(); lens.add(new THREE.Mesh(geo, lensMat));
      const rim = outline.map(p => { const x = (p.x - cx) * mm, y = (p.y - cy) * mm; return new THREE.Vector3(x * sd, y, -(x * x + y * y) / (2 * Rc) + 0.0004); });
      lens.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 160, kind === 'round' || kind === 'rect' ? 0.0013 : 0.00085, 8, true), metal));
      lens.position.set(mid.x + sd * half, eL.y - 0.004, z); lens.rotation.y = sd * 0.1;
      g.add(lens); parts.push({ sd, lens });
    }
    g.updateMatrixWorld(true);
    const at = (sd, xmm, ymm) => new THREE.Vector3((xmm - cx) * mm * sd, (ymm - cy) * mm, 0).applyMatrix4(parts.find(q => q.sd === sd).lens.matrixWorld);
    const tube = (pts, r) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 8, false), metal);
    const aL = at(1, kind === 'round' ? 1 : 0, kind === 'round' ? 6 : 17), aR = at(-1, kind === 'round' ? 1 : 0, kind === 'round' ? 6 : 17);
    g.add(tube([aR, aR.clone().lerp(aL, 0.5).add(new THREE.Vector3(0, 0.0015, 0.001)), aL], 0.0009));
    if (kind === 'aviator' || sun) { const bL = at(1, -1, 5), bR = at(-1, -1, 5); g.add(tube([bR, bR.clone().lerp(bL, 0.5).add(new THREE.Vector3(0, 0.006, 0.002)), bL], 0.0009)); }
    for (const sd of [1, -1]) { const pad = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 12, 8), new THREE.MeshPhysicalMaterial({ color: '#e8eef2', roughness: 0.1, transparent: true, opacity: 0.55 })); pad.scale.set(0.45, 1, 0.8); pad.position.copy(at(sd, 2, -6)).add(new THREE.Vector3(-sd * 0.004, -0.002, -0.006)); g.add(pad); }
    const hc = v3(I.headC), hs = v3(I.headS);
    for (const sd of [1, -1]) {
      const s0 = at(sd, kind === 'round' ? 47 : kind === 'rect' ? 50 : 54, kind === 'round' ? 4 : 15), ear = new THREE.Vector3(hc.x + sd * (hs.x / 2 + 0.004), eL.y - 0.002, hc.z - 0.015);
      g.add(tube([s0, s0.clone().add(new THREE.Vector3(sd * 0.006, 0, -0.02)), ear.clone().add(new THREE.Vector3(0, 0.002, 0.03)), ear, ear.clone().add(new THREE.Vector3(-sd * 0.006, -0.03, -0.02))], 0.0011));
    }
    return g;
  }

  /** Peaked cap (gold braid for captains), a flight attendant's cap, a pillbox, or a mechanic's cap. */
  function hat(kind, I, uni, accent) {
    const g = new THREE.Group(), hc = I.headC, hs = I.headS;
    const navy = new THREE.MeshPhysicalMaterial({ color: uni, roughness: 0.8, sheen: 0.4, sheenColor: new THREE.Color(uni).offsetHSL(0, 0, 0.25) }), gm = gold();
    if (kind === 'mech') {
      const rx = hs[0] / 2 * 1.08, rz = hs[2] / 2 * 1.02, baseY = hc[1] - 0.018;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), navy); crown.scale.set(rx * 0.98, hs[1] * 0.62, rz); crown.position.set(hc[0], baseY + 0.006, hc[2] - 0.004);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), navy); btn.position.set(hc[0], baseY + 0.006 + hs[1] * 0.62, hc[2] - 0.004);
      const bill = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.006, 40, 1, false, -Math.PI / 2.3, Math.PI / 1.15), navy); bill.scale.set(rx * 0.9, 1, rz * 0.85); bill.position.set(hc[0], baseY + 0.004, hc[2] + rz * 0.62); bill.rotation.x = 0.08;
      const logo = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 })); logo.position.set(hc[0], baseY + 0.045, hc[2] + rz * 0.93); logo.rotation.x = -0.45;
      g.add(crown, btn, bill, logo); return g;
    }
    if (kind === 'pillbox') {
      const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.05, 40), navy); pb.position.set(hc[0] - 0.025, hc[1] + hs[1] * 0.42, hc[2] + 0.01); pb.rotation.set(0.12, 0, 0.22);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0625, 0.0625, 0.012, 40, 1, true), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, side: THREE.DoubleSide })); band.position.copy(pb.position); band.rotation.copy(pb.rotation); band.position.y -= 0.012;
      const b = badge(accent, 0.6); b.position.set(hc[0] - 0.02, hc[1] + hs[1] * 0.4, hc[2] + 0.07); b.rotation.z = 0.22;
      g.add(pb, band, b); return g;
    }
    const rx = hs[0] / 2 * 0.98, rz = hs[2] / 2 * 0.95, baseY = hc[1] - 0.012, bandH = 0.038;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, bandH, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: '#141519', roughness: 0.5, side: THREE.DoubleSide })); band.scale.set(rx, 1, rz); band.position.set(hc[0], baseY + bandH / 2, hc[2]);
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(1 + 0.17 * Math.sin(t * Math.PI / 2), t * 0.052)); }
    const crown = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), navy); crown.scale.set(rx, 1, rz * 1.04); crown.position.set(hc[0], baseY + bandH - 0.002, hc[2] + 0.012);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1, 64), navy); top.rotation.x = -Math.PI / 2; top.scale.set(rx * 1.17, rz * 1.21, 1); top.position.set(hc[0], baseY + bandH + 0.05, hc[2] + 0.012);
    const vp = [], vi = [];
    for (let i = 0; i <= 40; i++) { const a = -Math.PI * 0.42 + i / 40 * Math.PI * 0.84; for (let j = 0; j <= 6; j++) { const r = 1 + j / 6 * 0.5; vp.push(Math.sin(a) * rx * (1 - 0.06 * j / 6), baseY + 0.002 - 0.03 * Math.pow(j / 6, 2), Math.cos(a) * rz * r); } }
    for (let i = 0; i < 40; i++) for (let j = 0; j < 6; j++) { const a = i * 7 + j, b = a + 7; vi.push(a, b, a + 1, a + 1, b, b + 1); }
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3)); vg.setIndex(vi); vg.computeVertexNormals();
    const visor = new THREE.Mesh(vg, new THREE.MeshPhysicalMaterial({ color: '#0d0e11', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide })); visor.position.set(hc[0], 0, hc[2]);
    const cord = new THREE.Mesh(new THREE.TorusGeometry(1, 0.0028, 8, 64, Math.PI * 0.75), gm); cord.rotation.set(Math.PI / 2, 0, Math.PI * 0.125); cord.scale.set(rx * 1.01, rz * 1.01, 1); cord.position.set(hc[0], baseY + 0.014, hc[2]);
    g.add(band, crown, top, visor, cord);
    if (kind === 'captain') for (let i = -6; i <= 6; i++) { const a = i / 6 * Math.PI * 0.32, leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), gm); leaf.scale.set(0.009, 0.0018, 0.0035); leaf.position.set(hc[0] + Math.sin(a) * rx, baseY - 0.012 + 0.006 * Math.abs(i / 6), hc[2] + Math.cos(a) * rz * 1.38); leaf.rotation.y = a + (i % 2 ? 0.5 : -0.5); g.add(leaf); }
    const b = badge(accent, kind === 'fa' ? 0.75 : 0.95); b.position.set(hc[0], baseY + bandH + 0.014, hc[2] + rz * 1.14 + 0.006); b.rotation.x = -0.22; g.add(b);
    const piv = new THREE.Group(); piv.position.set(hc[0], hc[1], hc[2]); g.position.set(-hc[0], -hc[1], -hc[2]); piv.add(g); piv.rotation.x = -0.05;
    return piv;
  }

  /** Shoes shaped on a last: heel, vamp and toe from cross-sections along the foot, with a separate sole. */
  function shoes(b, I, color, kind, accent) {
    const g = new THREE.Group(), P = b.pos, top = I.ankleY + 0.02;
    const leather = new THREE.MeshPhysicalMaterial({ color, roughness: kind === 'boots' ? 0.62 : 0.36, clearcoat: kind === 'boots' ? 0.15 : 0.55, clearcoatRoughness: 0.28, envMapIntensity: 0.6 });
    const upperMat = kind === 'sneakers' ? new THREE.MeshPhysicalMaterial({ color: '#F2F4F7', roughness: 0.7, sheen: 0.3 }) : leather;
    const soleMat = new THREE.MeshStandardMaterial({ color: kind === 'sneakers' ? '#E6E8EC' : kind === 'boots' ? '#2a211b' : '#16171a', roughness: 0.85 });
    const sm = (a, b2, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b2 - a))); return t * t * (3 - 2 * t); };
    const widthAt = t => kind === 'pumps' ? 0.7 + 0.25 * sm(0, 0.6, t) - 0.75 * sm(0.75, 1, t) : 0.72 + 0.28 * sm(0, 0.68, t) - 0.62 * sm(0.8, 1, t);
    const heightAt = (t, H) => kind === 'boots' ? H * (1 - 0.35 * sm(0.3, 0.55, t) - 0.38 * sm(0.55, 1, t)) : kind === 'pumps' ? H * (0.9 - 0.55 * sm(0.2, 1, t)) : H * (1 - 0.5 * sm(0.25, 0.85, t) - 0.25 * sm(0.85, 1, t));
    for (const sd of [1, -1]) {
      const bb = new THREE.Box3();
      for (let i = 0; i < P.length / 3; i++) { const x = P[i * 3], y = P[i * 3 + 1]; if (y < top && Math.sign(x) === sd) bb.expandByPoint(new THREE.Vector3(x, y, P[i * 3 + 2])); }
      const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
      const Lz = sz.z + 0.034, W = sz.x + 0.016, z0 = c.z - Lz / 2 + 0.002, soleH = kind === 'sneakers' ? 0.022 : kind === 'boots' ? 0.018 : 0.012;
      const H = kind === 'boots' ? 0.17 : kind === 'pumps' ? 0.05 : 0.085, heelLift = kind === 'pumps' ? 0.035 : 0;
      const rings = 26, seg = 28, pos = [], idx = [];
      for (let r = 0; r <= rings; r++) {
        const t = r / rings, cap = Math.sin(Math.min(1, t / 0.08) * Math.PI / 2) * Math.sqrt(Math.max(0, Math.sin(Math.min(1, (1 - t) / 0.12) * Math.PI / 2)));
        const hw = W / 2 * widthAt(t) * cap, z = z0 + t * Lz, lift = heelLift * (1 - sm(0.45, 0.8, t)), y0 = soleH + lift, ht = heightAt(t, H) * (0.3 + 0.7 * cap);
        for (let k = 0; k <= seg; k++) {
          const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          const y = ca > 0 ? y0 + (ht - soleH) * Math.pow(ca, 0.75) : y0 + ca * 0.004;
          pos.push(c.x + hw * sa, y, z);
        }
      }
      for (let r = 0; r < rings; r++) for (let k = 0; k < seg; k++) { const a = r * (seg + 1) + k, b2 = a + seg + 1; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
      const ug = new THREE.BufferGeometry(); ug.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ug.setIndex(idx); ug.computeVertexNormals();
      g.add(new THREE.Mesh(ug, upperMat));
      // sole: the footprint, extruded
      const fp = new THREE.Shape(), N = 40, pts = [];
      for (let k = 0; k <= N; k++) { const t = k / N; pts.push([W / 2 * widthAt(t) * Math.max(0.35, Math.sin(Math.min(1, t / 0.08) * Math.PI / 2)) + 0.002, z0 + t * Lz]); }
      fp.moveTo(-pts[0][0], pts[0][1]); for (const [x, z] of pts) fp.lineTo(x, z); for (let k = pts.length - 1; k >= 0; k--) fp.lineTo(-pts[k][0], pts[k][1]);
      const sg = new THREE.ExtrudeGeometry(fp, { depth: soleH, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0015, bevelSegments: 2, steps: 1 });
      sg.rotateX(Math.PI / 2); sg.translate(c.x, soleH, 0);
      if (kind === 'pumps') { const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const z = sp.getZ(i), t = (z - z0) / Lz; sp.setY(i, sp.getY(i) + heelLift * (1 - sm(0.45, 0.8, t))); } sg.computeVertexNormals(); }
      g.add(new THREE.Mesh(sg, soleMat));
      if (kind === 'pumps') { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, heelLift + soleH, 14), soleMat); hl.position.set(c.x, (heelLift + soleH) / 2, z0 + Lz * 0.08); g.add(hl); }
      if (kind === 'oxford') for (let i = 0; i < 4; i++) {
        const t = 0.42 + i * 0.07, y = heightAt(t, H) + 0.001, lace = new THREE.Mesh(new THREE.BoxGeometry(W * 0.32, 0.0018, 0.0025), new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.6 }));
        lace.position.set(c.x, y, z0 + t * Lz); lace.rotation.x = -0.35; g.add(lace);
      }
      if (kind === 'sneakers') { const st = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 24, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 })); st.position.set(c.x + sd * (W / 2 + 0.001), 0.04, c.z); st.rotation.set(0, sd * Math.PI / 2, Math.PI * 1.1); st.scale.set(1.6, 0.7, 1); g.add(st); }
    }
    return g;
  }

  function cloth(color) {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.82, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).offsetHSL(0, 0, 0.25) });
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vON2;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz; vON2 = objectNormal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vON2;\n' + GLSL_NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float lodC = 1.0 - smoothstep(0.3, 0.8, length(fwidth(vWP * 420.0)));
          diffuseColor.rgb *= 0.95 + 0.1 * mix(0.5, fbm(vWP * 420.0), lodC);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float fade = 1.0 - smoothstep(0.35, 0.9, length(fwidth(vWP * 1150.0)));
            float hgt = TRI(twill, vWP, normalize(vON2)) * 0.00005 * fade + (vnoise(vWP * 30.0) - 0.5) * 0.0012;
            vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); vec2 dh = vec2(dFdx(hgt), dFdy(hgt));
            vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1) * faceDirection;
            normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2)); }`);
    };
    m.customProgramCacheKey = () => 'crew-cloth';
    return m;
  }

  function surfaceZ(mesh, x, y) { const rc = new THREE.Raycaster(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1)); const h = rc.intersectObject(mesh)[0]; return h ? h.point.z : 0; }

  /* ================= look → outfit ================= */
  function outfit(L, role, accent, I) {
    const f = L.sex === 'f', pilot = role === 'captain' || role === 'fo', mech = (role === 'mech' || role === 'ground') || L.top === 'overalls';
    const skin = SKIN_3D[L.skin] || SKIN_3D[2], hair = HAIR_COLORS[L.hairColor] || HAIR_COLORS[1], uni = UNIFORM_COLORS[L.uniform] || UNIFORM_COLORS[0];
    const dark = L.skin > 5;
    const lip = '#' + new THREE.Color(shade(skin, dark ? -0.34 : -0.14)).lerp(new THREE.Color(dark ? '#4a2220' : '#c4645c'), dark ? 0.35 : 0.55).getHexString();
    const iris = L.skin >= 5 ? '#6b4428' : ['#6a4a2c', '#5d86a8', '#5f7a48', '#7a5634', '#4f6f8f'][(L.skin + (L.hairColor || 0)) % 5];
    const mouth = [0, (I.mouthJ[0][2][1] + I.mouthJ[2][2][1]) / 2, Math.max(I.mouthJ[0][2][2], I.mouthJ[2][2][2])];
    const white = '#F2F4F7', blouseCol = shade(accent, 0.62);
    const c: any = {
      seed: seedOf(JSON.stringify(L) + role), female: f, mech, accent, skin, hair, lip, iris, mouth, brow: shade(hair, -0.15), grey: L.hairColor >= 8 ? 0.35 : 0,
      eyeR: 0.0118 * I.eyeScale, hairline: f ? 0.22 : 0.26, sheen: dark ? '#c27a5e' : '#ff9f86',
      top: uni, sleeve: uni, bottom: shade(uni, -0.22), shirt: white, tie: '#121318', shoe: L.shoes === 'boots' ? '#4a3324' : '#14161a',
      hemY: I.crotchY + 0.015, waistY: I.hipY + 0.1, cuffS: I.armLen - 0.012, shoeY: I.ankleY + 0.035, botLow: I.ankleY + 0.035,
      vBot: I.neckY - 0.25, vW: 0.06, tieBot: I.neckY - 0.23, stripes: 0, lapels: true, pockets: false, topFab: 1, sleeveFab: 1,
      topT: 0.006, botT: 0.005, fit: f ? 0.55 : 0.6, legX: Math.abs(I.J['upperleg01.L'][0]) + 0.005, hivis: false, skirt: false,
      wings: pilot ? 1 : role === 'fa' ? 0.7 : 0, buttons: false, epaulettes: false, scarf: false, bald: L.hair === 'bald',
    };
    if (L.shoes === 'boots') c.shoeY = c.botLow = I.ankleY + 0.06;
    if (L.shoes === 'pumps') c.shoeY = c.botLow = I.ankleY + 0.02;
    if (mech) {
      Object.assign(c, { top: '#55657A', sleeve: '#55657A', bottom: '#55657A', hemY: I.crotchY - 0.05, vW: 0, tieBot: 0, lapels: false, topT: 0.007, botT: 0.007, hivis: true, wings: 0 });
    } else {
      switch (L.top) {
        case 'jacket': Object.assign(c, { pockets: !f || L.bottom !== 'skirt', buttons: true, stripes: role === 'captain' ? 4 : role === 'fo' ? 3 : 0 }); if (f) { c.vBot = I.neckY - 0.2; c.vW = 0.05; } break;
        case 'shirt': Object.assign(c, { top: white, sleeve: white, shirt: white, cuffS: I.armLen * 0.36, lapels: false, topFab: 2, sleeveFab: 2, vBot: I.hipY, vW: 0.03, tie: uni, epaulettes: pilot, hemY: I.hipY + 0.005, topT: 0.004 }); break;
        case 'pullover': Object.assign(c, { topFab: 8, sleeveFab: 8, lapels: false, vBot: I.neckY - 0.17, vW: 0.05, tieBot: I.neckY - 0.16, epaulettes: pilot, hemY: I.crotchY + 0.03, topT: 0.008 }); break;
        case 'vest': Object.assign(c, { sleeve: white, sleeveFab: 2, lapels: false, vBot: I.neckY - 0.2, vW: 0.05, buttons: true, hemY: I.crotchY + 0.04 }); break;
        case 'blouse': Object.assign(c, { top: blouseCol, sleeve: blouseCol, shirt: blouseCol, topFab: 2, sleeveFab: 2, lapels: false, vBot: I.neckY - 0.12, vW: 0.035, hemY: I.hipY + 0.005, topT: 0.004 }); break;
      }
      if (f && L.top === 'jacket' && L.bottom === 'skirt') c.hemY = I.hipY;
      if (L.neck !== 'tie') c.tieBot = 0;
      if (L.neck === 'scarf') c.scarf = true;
      if (L.bottom === 'skirt') { c.skirt = true; c.skirtCol = uni; }
      if (L.bottom === 'shorts') { c.botLow = I.kneeY + 0.07; c.bottom = shade(uni, -0.22); }
    }
    if (L.hair === 'buzz') { c.hairT = 0.0018; c.hairPaint = hair; c.hairline = f ? 0.24 : 0.28; }
    else if (L.hair === 'bald') { c.hairT = 0; c.hairPaint = hair; }
    else { c.hairT = 0.0005; c.hairPaint = shade(hair, -0.4); }
    return c;
  }

  /* ================= the figure ================= */
  const BEARDS = { stubble: 1, short: 1, full: 1, goatee: 1, vandyke: 1, beard: 1 };
  const MOUSTACHES = { pencil: 1, chevron: 1, walrus: 1, handlebar: 1, horseshoe: 1, moustache: 1 };

  /** Build a figure. q: detail (1 = full, about 0.3 for small pictures). */
  const T = {};
  const tick = (k, t0) => { T[k] = (T[k] || 0) + performance.now() - t0; return performance.now(); };
  function build(look, role, accent, style, q) {
    let t0 = performance.now();
    const L = dressed(look, role), b = makeBody(L, style), I = b.info, c = outfit(L, role, accent, I);
    t0 = tick('body', t0);
    const root = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('rest', new THREE.Float32BufferAttribute(b.rest, 3));
    geo.setAttribute('fa', new THREE.Float32BufferAttribute(b.A, 4));
    geo.setAttribute('fb', new THREE.Float32BufferAttribute(b.B, 4));
    geo.setIndex(b.idx); geo.computeVertexNormals();
    clothe(geo, b, c, I);
    t0 = tick('clothe', t0);
    geo.setAttribute('beardW', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
    const mat = bodyMaterial(c, I);
    { let zs = 0, zn = 0; const P = geo.attributes.position; for (let i = 0; i < P.count; i++) if (Math.abs(P.getY(i) - (I.neckY - 0.2)) < 0.01 && b.A[i * 4 + 1] < 0.5) { zs += P.getZ(i); zn++; } mat.userData.U.uSideZ.value = zn ? zs / zn : 0; }
    const body = new THREE.Mesh(geo, mat); body.castShadow = body.receiveShadow = true; root.add(body);
    // everything on the head turns with it
    const np = I.neckPivot, headPivot = new THREE.Group(), head = new THREE.Group();
    headPivot.position.set(np[0], np[1], np[2]); head.position.set(-np[0], -np[1], -np[2]); headPivot.add(head); root.add(headPivot);
    const eyes = [eye(I.eyeL, c.eyeR, c.iris), eye(I.eyeR, c.eyeR, c.iris)]; eyes.forEach(e => head.add(e));
    const hatKind = L.hat === 'none' ? null : (role === 'mech' || role === 'ground') ? 'mech' : L.hat === 'pillbox' ? 'pillbox' : role === 'captain' ? 'captain' : role === 'fa' ? 'fa' : 'fo';
    const strandHair = ['bald', 'buzz'].indexOf(L.hair) < 0;
    t0 = tick('material', t0);
    if (strandHair) head.add(buildHair(L.hair, geo, b, I, c, q, hatKind && hatKind !== 'pillbox' ? I.headC[1] - 0.006 : 0));
    t0 = tick('hair', t0);
    const facial = L.facial === 'beard' ? 'short' : L.facial === 'moustache' ? 'chevron' : L.facial;
    if (BEARDS[facial]) head.add(buildBeard(facial, geo, b, I, c, c.mouth, q));
    if (MOUSTACHES[facial]) head.add(buildMoustache(facial, geo, b, I, c, c.mouth, q));
    if (facial === 'vandyke') head.add(buildMoustache('chevron', geo, b, I, c, c.mouth, q));
    t0 = tick('facial', t0);
    if (L.glasses && L.glasses !== 'none') head.add(glasses(L.glasses, I, c.eyeR));
    if (hatKind) head.add(hat(hatKind, I, c.mech ? '#3d4a5c' : (UNIFORM_COLORS[L.uniform] || UNIFORM_COLORS[0]), accent));
    root.add(shoes(b, I, c.shoe, L.shoes, accent));
    const gm = gold();
    if (c.wings) { const y = I.neckY - 0.16, z = surfaceZ(body, 0.085, y); const w = badge(accent, c.wings); w.position.set(0.085, y, z + 0.004); w.rotation.y = 0.3; root.add(w); }
    if (c.buttons) for (const y of [c.vBot - 0.03, c.vBot - 0.13]) { const z = surfaceZ(body, 0.012, y); const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 20), gm); bt.rotation.x = Math.PI / 2; bt.position.set(0.012, y, z + 0.002); root.add(bt); }
    if (c.epaulettes) {
      const n = role === 'captain' ? 4 : role === 'fo' ? 3 : 1;
      for (const sd of [1, -1]) {
        const jx = I.J['upperarm01.L'][0] * sd, x = jx * 0.72; let topY = 0, zc = 0;
        const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { if (b.A[i * 4 + 1] > 0.5 || b.A[i * 4 + 3] > 0.3) continue; if (Math.abs(P.getX(i) - x) < 0.012 && Math.abs(P.getZ(i)) < 0.06 && P.getY(i) > topY) { topY = P.getY(i); zc = P.getZ(i); } }
        const ep = new THREE.Group();
        ep.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.046), new THREE.MeshStandardMaterial({ color: shade(UNIFORM_COLORS[L.uniform] || UNIFORM_COLORS[0], -0.3), roughness: 0.8 })));
        for (let i = 0; i < n; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0075, 0.047), gm); st.position.x = sd * (0.03 - i * 0.0095); ep.add(st); }
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), gm); btn.position.set(-sd * 0.032, 0.004, 0); ep.add(btn);
        ep.position.set(x, topY + 0.004, zc); ep.rotation.z = -sd * 0.28; root.add(ep);
      }
    }
    if (c.scarf) {
      const m = cloth(accent);
      const sc = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.009, 12, 48), m); sc.rotation.x = Math.PI / 2 - 0.35; sc.scale.set(1, 0.95, 1); sc.position.set(0, I.neckY + 0.008, 0.018); root.add(sc);
      const kz = surfaceZ(body, 0.028, I.neckY - 0.012) + 0.012;
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), m); k.scale.set(1.1, 0.9, 0.7); k.position.set(0.028, I.neckY - 0.008, kz); root.add(k);
      for (const [dx, ang, len] of [[0.042, -0.6, 0.06], [0.03, -0.2, 0.05]]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.016, len, 3, 1), m); t.scale.z = 0.25; t.position.set(dx, I.neckY - 0.012 - len / 2, kz - 0.002); t.rotation.set(0, 0, Math.PI + ang); root.add(t); }
    }
    if (c.skirt) {
      // sized from the dressed body (not the bare one), with room to spare, so nothing pokes through
      const P = geo.attributes.position.array, A = b.A, top = c.hemY + 0.012, bot = I.kneeY + 0.04, rings = []; let prevX = 0, prevZ = 0;
      for (let k = 0; k <= 14; k++) {
        const y = top - (top - bot) * k / 14; let mx = 0, z0 = 9, z1 = -9;
        for (let i = 0; i < P.length / 3; i++) { if (A[i * 4 + 1] > 0.3) continue; if (Math.abs(P[i * 3 + 1] - y) > 0.012) continue; mx = Math.max(mx, Math.abs(P[i * 3])); z0 = Math.min(z0, P[i * 3 + 2]); z1 = Math.max(z1, P[i * 3 + 2]); }
        const rx = Math.max(prevX, mx + 0.012 + 0.024 * k / 14), rz = Math.max(prevZ, (z1 - z0) / 2 + 0.012 + 0.018 * k / 14); prevX = rx; prevZ = rz;
        rings.push([y, rx, rz, (z0 + z1) / 2]);
      }
      const pos = [], idx = [], S = 64;
      rings.forEach(([y, rx, rz, cz], k) => { const fold = 0.035 * (k / 14); for (let j = 0; j <= S; j++) { const a = j / S * Math.PI * 2, ff = 1 + fold * Math.sin(a * 10) * (0.6 + 0.4 * Math.sin(a * 3 + 1)); pos.push(Math.sin(a) * rx * ff, y, cz + Math.cos(a) * rz * ff); } });
      for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < S; j++) { const a = r * (S + 1) + j, cc = a + S + 1; idx.push(a, a + 1, cc, a + 1, cc + 1, cc); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
      const sk = new THREE.Mesh(sg, cloth(c.skirtCol)); sk.material.side = THREE.DoubleSide; sk.material.shadowSide = THREE.BackSide; root.add(sk);
    }
    root.traverse(o => { if (o.isMesh && !(o.material && o.material.isShaderMaterial)) { o.castShadow = true; o.receiveShadow = true; } });
    tick('props', t0);
    const box = new THREE.Box3().setFromObject(root);
    const U = mat.userData.U, rot = new THREE.Quaternion(), eul = new THREE.Euler(), m4 = new THREE.Matrix4();
    return {
      root, top: box.max.y, width: Math.max(box.max.x - box.min.x, 0.5), bustBottom: I.neckY - 0.3, headY: I.headC[1],
      /** Breathing, a gentle sway, head and eye movement, blinking. */
      pose(p) {
        const t = p.t;
        root.rotation.y = p.yaw; root.rotation.z = Math.sin(t * 2 * Math.PI / 6.2) * 0.008;
        root.scale.y = 1 + Math.sin(t * 2 * Math.PI / 4.2) * 0.0015;
        eul.set(Math.sin(t * 0.31 + 1) * 0.035 - 0.01, Math.sin(t * 0.43) * 0.13 + Math.sin(t * 0.17) * 0.06 + p.gaze[0] * 0.25, Math.sin(t * 0.23 + 2) * 0.02);
        headPivot.quaternion.setFromEuler(eul); rot.copy(headPivot.quaternion);
        U.uHeadRot.value.setFromMatrix4(m4.makeRotationFromQuaternion(rot));
        U.uBlink.value = p.blink;
        for (const e of eyes) e.rotation.set(-p.gaze[1] * 0.25, p.gaze[0] * 0.3, 0);
      },
    };
  }

  return { load, build, get ready() { return !!DATA; }, timings: T };
})();
