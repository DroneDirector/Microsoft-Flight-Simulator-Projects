// 3D crew figures: stylised, fully dressed people built from smooth shapes, so every look
// option (face, eyes, nose, lips, skin, hair, facial hair, glasses, garments, shoes, hats,
// uniform colour) changes the model directly. Rendered with three.js (see avatar3d-view.ts).
// Units are metres; the feet stand at y = 0 and the figure faces +z (towards the camera).

declare const THREE: any;

/* ---------- small maths helpers ---------- */
const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;
const sstep = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const gauss2 = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-((x - cx) * (x - cx)) / (sx * sx) - ((y - cy) * (y - cy)) / (sy * sy));
function hash01(i: number): number { let h = Math.imul(i ^ 0x9E3779B9, 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

/** Catmull-Rom interpolation through evenly spaced keys, evaluated at t in [0, keys-1]. */
function crAt(vals: number[], t: number): number {
  const n = vals.length, i = Math.max(0, Math.min(n - 2, Math.floor(t))), f = t - i;
  const p0 = vals[Math.max(0, i - 1)], p1 = vals[i], p2 = vals[i + 1], p3 = vals[Math.min(n - 1, i + 2)];
  return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

/* ---------- geometry builders ---------- */
function geoFrom(pos: number[], idx: number[], uv?: number[], col?: number[]): any {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Grid of rows × cols vertices from f(u, v) → [x, y, z]; wraps in u when closed. */
function gridGeo(rows: number, cols: number, f: (u: number, v: number) => number[], closed: boolean, color?: (u: number, v: number) => number[], flip?: boolean): any {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], col: number[] = [];
  const cc = closed ? cols + 1 : cols;
  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    for (let c = 0; c < cc; c++) {
      const u = closed ? (c % cols) / cols : c / (cols - 1);
      const p = f(closed && c === cols ? 0 : u, v);
      pos.push(p[0], p[1], p[2]); uv.push(closed ? c / cols : u, v);
      if (color) { const k = color(closed && c === cols ? 0 : u, v); col.push(k[0], k[1], k[2]); }
    }
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cc - 1; c++) {
    const a = r * cc + c, b = a + 1, d = a + cc, e = d + 1;
    if (flip) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
  }
  const g = geoFrom(pos, idx, uv, color ? col : undefined);
  if (closed) fixSeamNormals(g, rows, cc);
  return g;
}
function fixSeamNormals(g: any, rows: number, cc: number) {
  const n = g.attributes.normal;
  for (let r = 0; r < rows; r++) {
    const a = r * cc, b = r * cc + cc - 1;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
}

/** A body section described by horizontal elliptical rings (y, half-width, half-depth, forward shift, front fullness). */
interface Ring { y: number; ax: number; az: number; dz?: number; fr?: number; }
class Section {
  ys: number[]; ax: number[]; az: number[]; dz: number[]; fr: number[];
  constructor(public rings: Ring[]) {
    this.ys = rings.map(r => r.y); this.ax = rings.map(r => r.ax); this.az = rings.map(r => r.az);
    this.dz = rings.map(r => r.dz || 0); this.fr = rings.map(r => r.fr || 0);
  }
  /** Ring parameter t (0..n-1) for a height y (rings are ordered bottom to top). */
  tAt(y: number): number {
    const ys = this.ys;
    if (y <= ys[0]) return 0;
    for (let i = 0; i < ys.length - 1; i++) if (y <= ys[i + 1]) return i + (y - ys[i]) / (ys[i + 1] - ys[i]);
    return ys.length - 1;
  }
  at(t: number) { return { y: crAt(this.ys, t), ax: crAt(this.ax, t), az: crAt(this.az, t), dz: crAt(this.dz, t), fr: crAt(this.fr, t) }; }
  point(t: number, a: number, grow: number): number[] {
    const s = this.at(t), sa = Math.sin(a), ca = Math.cos(a);
    const front = ca > 0 ? s.fr * Math.pow(ca, 3) * (1 - Math.abs(sa) * 0.6) : 0;
    return [(s.ax + grow) * sa, s.y, (s.az + grow) * ca + s.dz + front];
  }
  /** z of the surface at height y and sideways x, on the front (side 1) or back (side -1). */
  surfZ(y: number, x: number, side: number, grow: number): number {
    const s = this.at(this.tAt(y)), ax = s.ax + grow, az = s.az + grow;
    const q = Math.min(0.995, Math.abs(x) / ax), c = Math.sqrt(1 - q * q);
    return side > 0 ? az * c + s.dz + s.fr * c * c * c * (1 - q * 0.6) : -az * c + s.dz;
  }
  geo(rowsPerSpan: number, cols: number, grow: number, from?: number, to?: number): any {
    const t0 = from == null ? 0 : from, t1 = to == null ? this.ys.length - 1 : to;
    const rows = Math.max(2, Math.round((t1 - t0) * rowsPerSpan) + 1);
    return gridGeo(rows, cols, (u, v) => this.point(lerp(t0, t1, v), u * Math.PI * 2, grow), true);
  }
}

/** Tube swept along a smooth path with a varying radius; round ends when capped. */
function sweepGeo(pts: number[][], radius: (t: number) => number, o?: { radial?: number; steps?: number; caps?: boolean; flat?: number; wobble?: (t: number, a: number) => number }): any {
  o = o || {};
  const radial = o.radial || 16, steps = o.steps || 32;
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
  const fr = curve.computeFrenetFrames(steps, false);
  const rings: { c: any; n: any; b: any; r: number; t: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    rings.push({ c: curve.getPointAt(t), n: fr.normals[i], b: fr.binormals[i], r: radius(t), t });
  }
  if (o.caps) {
    const capR = (end: number) => {
      const ring = rings[end ? rings.length - 1 : 0], tan = fr.tangents[end ? steps : 0].clone().multiplyScalar(end ? 1 : -1);
      const out: any[] = [];
      for (let k = 1; k <= 4; k++) {
        const a = (k / 4) * Math.PI / 2;
        out.push({ c: ring.c.clone().addScaledVector(tan, Math.sin(a) * ring.r), n: ring.n, b: ring.b, r: Math.max(0.0002, Math.cos(a) * ring.r), t: ring.t });
      }
      return out;
    };
    const head = capR(0).reverse(), tail = capR(1);
    rings.unshift.apply(rings, head); rings.push.apply(rings, tail);
  }
  const flat = o.flat || 1;
  return gridGeo(rings.length, radial, (u, v) => {
    const ring = rings[Math.round(v * (rings.length - 1))], a = u * Math.PI * 2;
    const r = ring.r * (o.wobble ? o.wobble(ring.t, a) : 1);
    const ca = Math.cos(a) * r, sa = Math.sin(a) * r * flat;
    return [ring.c.x + ring.n.x * ca + ring.b.x * sa, ring.c.y + ring.n.y * ca + ring.b.y * sa, ring.c.z + ring.n.z * ca + ring.b.z * sa];
  }, true);
}

/* ---------- textures (made once) ---------- */
const _tex: { [k: string]: any } = {};
function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: number[]): any {
  if (_tex[key]) return _tex[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return (_tex[key] = t);
}
/** Fine fabric weave, used as a bump map so cloth catches the light like cloth. */
function weaveTex(): any {
  return canvasTex('weave', 128, 128, (g, w, h) => {
    const d = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 128 + 40 * Math.sin(x * 1.6) * Math.sin(y * 1.6) + (hash01(x * 131 + y * 7) - 0.5) * 50;
      const i = (y * w + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }, [14, 10]);
}
/** Knit ribs for pullovers. */
function knitTex(): any {
  return canvasTex('knit', 64, 64, (g, w, h) => {
    const d = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 128 + 90 * Math.abs(Math.sin((x + (y % 8 < 4 ? 0 : 1)) * Math.PI / 4)) - 45 + (hash01(x * 17 + y * 911) - 0.5) * 30;
      const i = (y * w + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }, [18, 14]);
}
/** Hair strands running along v. */
function strandTex(): any {
  return canvasTex('strands', 256, 64, (g, w, h) => {
    const d = g.createImageData(w, h);
    for (let x = 0; x < w; x++) {
      const base = 110 + 110 * hash01(x * 3 + 1), base2 = 60 * Math.sin(x * 0.9);
      for (let y = 0; y < h; y++) {
        const v = base + base2 + (hash01(x * 977 + y) - 0.5) * 20;
        const i = (y * w + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.max(0, Math.min(255, v)); d.data[i + 3] = 255;
      }
    }
    g.putImageData(d, 0, 0);
  }, [6, 1]);
}
/** Iris in polar layout: x = angle around the eye, y = distance from the centre. */
function irisTex(color: string): any {
  return canvasTex('iris' + color, 128, 64, (g, w, h) => {
    const c = new THREE.Color(color);
    const d = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = y / (h - 1); // 0 = centre, 1 = edge of the cap
      let R, G, B;
      if (r < 0.34) { R = G = B = 8; }
      else if (r < 0.9) {
        const k = (r - 0.34) / 0.56, streak = 0.75 + 0.5 * hash01(x * 37 + Math.floor(y / 3)) * (0.6 + 0.4 * Math.sin(x * 0.7));
        const lum = (0.55 + 0.6 * Math.sin(k * Math.PI) * 0.6) * streak * (r < 0.42 ? 0.6 : 1);
        R = c.r * 255 * lum; G = c.g * 255 * lum; B = c.b * 255 * lum;
      } else { const k = (r - 0.9) / 0.1; R = lerp(c.r * 90, 18, k); G = lerp(c.g * 90, 14, k); B = lerp(c.b * 90, 12, k); }
      const i = (y * w + x) * 4; d.data[i] = R; d.data[i + 1] = G; d.data[i + 2] = B; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  });
}
function shadowTex(): any {
  return canvasTex('shadow', 128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
}

/* ---------- materials ---------- */
function mats(L: Look, role: CrewRole, accent: string) {
  const skin = SKIN_TONES[L.skin] || SKIN_TONES[2];
  const hair = HAIR_COLORS[L.hairColor] || HAIR_COLORS[1];
  const uni = UNIFORM_COLORS[L.uniform] || UNIFORM_COLORS[0];
  const fabric = (c: string, o?: any) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.82, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(shade(c, 0.35)), bumpMap: weaveTex(), bumpScale: 0.35, envMapIntensity: 0.45 }, o || {}));
  return {
    skinHex: skin, hairHex: hair, uniHex: uni,
    skinV: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.56, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffb59e'), envMapIntensity: 0.45 }),
    skin: new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.56, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffb59e'), envMapIntensity: 0.45 }),
    hair: new THREE.MeshPhysicalMaterial({ color: hair, roughness: 0.48, bumpMap: strandTex(), bumpScale: 0.25, sheen: 0.6, sheenRoughness: 0.35, sheenColor: new THREE.Color(shade(hair, 0.5)), envMapIntensity: 0.55 }),
    brow: new THREE.MeshStandardMaterial({ color: shade(hair, -0.2), roughness: 0.7 }),
    uni: fabric(uni), uniD: fabric(shade(uni, -0.22)), uniL: fabric(shade(uni, 0.08)),
    white: fabric('#F2F4F7', { sheenColor: new THREE.Color('#ffffff') }),
    shirtBlue: fabric('#E4ECF7'),
    blouse: fabric(shade(accent, 0.62)),
    accent: fabric(accent, { roughness: 0.55, sheen: 0.6 }),
    black: fabric('#17191E', { roughness: 0.6 }),
    tie: fabric('#15171C', { roughness: 0.45, sheen: 0.8, sheenColor: new THREE.Color('#5a6070') }),
    coverall: fabric('#55657A'), coverallD: fabric('#46546A'),
    hivis: fabric('#E9C02A', { roughness: 0.7, emissive: new THREE.Color('#3a2c00'), emissiveIntensity: 0.25 }),
    reflect: new THREE.MeshStandardMaterial({ color: '#E8EAE0', roughness: 0.25, metalness: 0.4, envMapIntensity: 1.1 }),
    gold: new THREE.MeshStandardMaterial({ color: '#E2B657', roughness: 0.28, metalness: 1, envMapIntensity: 1.2 }),
    silver: new THREE.MeshStandardMaterial({ color: '#C9CED6', roughness: 0.25, metalness: 1, envMapIntensity: 1.1 }),
    shoe: new THREE.MeshPhysicalMaterial({ color: '#16181C', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.32, envMapIntensity: 0.45 }),
    boot: new THREE.MeshPhysicalMaterial({ color: '#3B2B22', roughness: 0.6, clearcoat: 0.3, envMapIntensity: 0.6 }),
    sneaker: fabric('#F2F4F7', { roughness: 0.65 }),
    sole: new THREE.MeshStandardMaterial({ color: '#1F2126', roughness: 0.8 }),
    soleW: new THREE.MeshStandardMaterial({ color: '#E6E8EC', roughness: 0.8 }),
    visor: new THREE.MeshPhysicalMaterial({ color: '#0E1013', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }),
    eyeWhite: new THREE.MeshPhysicalMaterial({ color: '#F4F1EC', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.6 }),
    lash: new THREE.MeshStandardMaterial({ color: '#16110E', roughness: 0.8 }),
    frame: new THREE.MeshStandardMaterial({ color: '#23262C', roughness: 0.35, metalness: 0.3 }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', roughness: 0.05, transparent: true, opacity: 0.18, clearcoat: 1, envMapIntensity: 1.5, depthWrite: false }),
    lensTint: new THREE.MeshPhysicalMaterial({ color: '#2d3a36', roughness: 0.05, transparent: true, opacity: 0.62, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false }),
    mouth: new THREE.MeshStandardMaterial({ color: '#4a1f1c', roughness: 0.7 }),
  };
}

/* ---------- the head ---------- */
interface HeadShape {
  rx: number; ry: number; rz: number; jaw: number; square: number; chinW: number;
  noseW: number; noseP: number; lipUp: number; lipLow: number; lipW: number; cheeks: number; female: boolean;
}
function headShape(L: Look): HeadShape {
  const f = L.sex === 'f';
  const face = { oval: { rx: 0.116, ry: 0.138, jaw: 0.24, square: 0 }, round: { rx: 0.122, ry: 0.132, jaw: 0.14, square: 0 }, square: { rx: 0.12, ry: 0.136, jaw: 0.12, square: 0.6 }, long: { rx: 0.11, ry: 0.148, jaw: 0.24, square: 0.15 } }[L.face] || { rx: 0.116, ry: 0.138, jaw: 0.24, square: 0 };
  const nose = { narrow: [0.75, 1.0], medium: [1.0, 1.0], wide: [1.38, 0.9] }[L.nose] || [1, 1];
  const lips = { thin: [0.0028, 0.0034, 0.95], medium: [0.0045, 0.0058, 1.0], full: [0.0068, 0.0088, 1.1] }[L.lips] || [0.0045, 0.0058, 1];
  return {
    rx: face.rx * (f ? 0.95 : 1), ry: face.ry * (f ? 0.97 : 1), rz: 0.124 * (f ? 0.96 : 1), jaw: face.jaw + (f ? 0.05 : 0), square: face.square * (f ? 0.5 : 1), chinW: f ? 0.16 : 0.2,
    noseW: nose[0] * (f ? 0.88 : 1), noseP: nose[1] * (f ? 0.85 : 1), lipUp: lips[0], lipLow: lips[1], lipW: lips[2] * (f ? 0.95 : 1), cheeks: L.face === 'round' ? 1 : 0.5, female: f,
  };
}

/** Front hairline height (in head-direction space) at a given angle around the head (0 = front). */
function hairlineY(az: number): number {
  const a = Math.abs(az);
  const keys = [[0, 0.46], [0.45, 0.41], [0.85, 0.3], [1.25, 0.12], [1.55, 0.02], [2.0, -0.2], [2.6, -0.44], [Math.PI, -0.48]];
  for (let i = 0; i < keys.length - 1; i++) if (a <= keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], sstep(0, 1, (a - keys[i][0]) / (keys[i + 1][0] - keys[i][0])));
  return -0.48;
}

/** Point on the head surface (relative to the head centre) for a unit direction n, before facial features. */
function skullPoint(S: HeadShape, nx: number, ny: number, nz: number): number[] {
  let x = nx * S.rx, y = ny * S.ry, z = nz * S.rz;
  if (nz < 0) { const k = 1 + 0.07 * sstep(0, 1, -nz) * sstep(-0.6, 0.3, ny); x *= 1 + 0.03 * sstep(0, 1, -nz); z *= k; }
  if (ny < 0) {
    const t = -ny;
    const taper = 1 - S.jaw * t * t * (1 - S.square * sstep(0.2, 0.75, t) * 0.55);
    x *= taper;
    z *= 1 - 0.2 * t * t * (nz > 0 ? 0.35 : 1);
    if (S.square) x *= 1 + S.square * 0.08 * gauss2(0, t, 0, 0.62, 1, 0.18);
  }
  if (nz > 0) z *= 1 - 0.06 * nz * nz * sstep(-0.1, 0.4, ny);
  if (ny > 0.55) y *= 1 - 0.04 * (ny - 0.55);
  return [x, y, z];
}

interface FaceFeature { cx: number; cy: number; sx: number; sy: number; amt: number; }
function faceFeatures(S: HeadShape, L: Look): FaceFeature[] {
  const w = S.noseW, p = S.noseP, lw = S.lipW;
  const F: FaceFeature[] = [];
  for (const s of [-1, 1]) {
    F.push({ cx: s * 0.34, cy: 0.03, sx: 0.16, sy: 0.12, amt: -0.009 });              // eye socket
    F.push({ cx: s * 0.36, cy: 0.27, sx: 0.22, sy: 0.06, amt: S.female ? 0.003 : 0.0055 }); // brow ridge
    F.push({ cx: s * 0.54, cy: -0.1, sx: 0.17, sy: 0.12, amt: 0.0065 });              // cheekbone
    F.push({ cx: s * 0.42, cy: -0.4, sx: 0.2, sy: 0.16, amt: 0.004 * S.cheeks });     // cheek
    F.push({ cx: s * 0.105 * w, cy: -0.255, sx: 0.07 * Math.sqrt(w), sy: 0.055, amt: 0.0085 * p }); // nostril wing
    F.push({ cx: s * 0.2 * lw, cy: -0.47, sx: 0.06, sy: 0.05, amt: -0.0028 });        // mouth corner
  }
  F.push({ cx: 0, cy: 0.0, sx: 0.07 * w, sy: 0.2, amt: 0.008 * p });     // nose bridge
  F.push({ cx: 0, cy: -0.19, sx: 0.085 * w, sy: 0.09, amt: 0.021 * p });  // nose tip
  F.push({ cx: 0, cy: -0.3, sx: 0.09 * w, sy: 0.035, amt: -0.0025 });     // under the nose
  F.push({ cx: 0, cy: -0.4, sx: 0.19 * lw, sy: 0.05, amt: S.lipUp });     // upper lip
  F.push({ cx: 0, cy: -0.455, sx: 0.21 * lw, sy: 0.016, amt: -0.0035 });  // lip line
  F.push({ cx: 0, cy: -0.515, sx: 0.17 * lw, sy: 0.055, amt: S.lipLow }); // lower lip
  F.push({ cx: 0, cy: -0.63, sx: 0.16, sy: 0.05, amt: -0.0025 });         // under the lip
  F.push({ cx: 0, cy: -0.8, sx: S.chinW, sy: 0.12, amt: 0.008 });         // chin
  return F;
}

function headPointFn(S: HeadShape, L: Look) {
  const F = faceFeatures(S, L);
  const facial = L.facial || 'none';
  return (nx: number, ny: number, nz: number, out: { lip?: number; beard?: number; scalp?: number; blush?: number }) => {
    const p = skullPoint(S, nx, ny, nz);
    const frontK = sstep(0.25, 0.6, nz);
    let d = 0;
    if (frontK > 0) for (const f of F) d += f.amt * gauss2(nx, ny, f.cx, f.cy, f.sx, f.sy) * frontK;
    const lip = frontK * Math.max(gauss2(nx, ny, 0, -0.405, 0.2 * S.lipW, 0.045), gauss2(nx, ny, 0, -0.51, 0.18 * S.lipW, 0.05));
    // facial hair areas
    const az = Math.atan2(nx, nz);
    const jawBand = sstep(-0.16, -0.38, ny) * sstep(-0.55, 0.0, nz) * (1 - lip * 0.95);
    const sideburn = gauss2(Math.abs(az), ny, 1.35, -0.05, 0.25, 0.32) * sstep(-0.5, -0.1, nz + 0.4);
    const moust = gauss2(nx, ny, 0, -0.345, 0.27, 0.045) * frontK * (1 - lip * 0.6);
    let beard = 0;
    if (facial === 'beard') { beard = Math.max(jawBand, sideburn * 0.9, moust); d += 0.0075 * jawBand + 0.004 * moust; }
    else if (facial === 'moustache') { beard = moust; d += 0.004 * moust; }
    else if (facial === 'stubble') beard = Math.max(jawBand, moust, sideburn * 0.6) * 0.38;
    const hl = hairlineY(az);
    out.lip = lip; out.beard = beard; out.scalp = sstep(hl - 0.03, hl + 0.05, ny) * (1 - gauss2(Math.abs(az), ny, 1.57, -0.05, 0.22, 0.2));
    out.blush = frontK * Math.max(gauss2(nx, ny, 0.45, -0.3, 0.16, 0.12), gauss2(nx, ny, -0.45, -0.3, 0.16, 0.12));
    const l = Math.hypot(p[0], p[1], p[2]) || 1;
    return [p[0] + p[0] / l * d, p[1] + p[1] / l * d, p[2] + p[2] / l * d];
  };
}

function buildHead(L: Look, role: CrewRole, M: any, S: HeadShape): { head: any; info: any } {
  const g = new THREE.Group();
  const hp = headPointFn(S, L);
  const skin = new THREE.Color(M.skinHex), hairC = new THREE.Color(M.hairHex);
  const lipC = new THREE.Color(shade(M.skinHex, L.skin > 5 ? -0.34 : -0.14)).lerp(new THREE.Color(L.skin > 5 ? '#4a2220' : '#c4645c'), L.skin > 5 ? 0.35 : 0.55);
  const blushC = new THREE.Color(L.skin > 5 ? '#7a3a2c' : '#e07a6a');
  const buzz = L.hair === 'buzz';
  const tmp: any = {};
  const c = new THREE.Color();
  // gridGeo asks for each vertex's colour right after its position, so the colour reuses
  // the feature weights the position step left in tmp
  const geo = gridGeo(64, 88, (u, v) => {
    const th = v * Math.PI, ph = u * Math.PI * 2;
    const nx = Math.sin(th) * Math.sin(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.cos(ph);
    return hp(nx, ny, nz, tmp);
  }, true, () => {
    c.copy(skin);
    c.lerp(blushC, tmp.blush * 0.14 * (S.female ? 1.4 : 1));
    c.lerp(lipC, Math.min(1, tmp.lip * 1.5));
    if (tmp.beard) c.lerp(hairC, Math.min(1, tmp.beard * (L.facial === 'stubble' ? 1 : 1.2)));
    if (buzz) c.lerp(hairC, tmp.scalp * 0.82);
    else if (L.hair !== 'bald') c.lerp(hairC, tmp.scalp * 0.55);
    return [c.r, c.g, c.b];
  }, true);
  const headMesh = new THREE.Mesh(geo, M.skinV);
  g.add(headMesh);

  // ears
  for (const s of [-1, 1]) {
    const p = hp(s * 0.99, -0.02, -0.06, tmp);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), M.skin);
    ear.scale.set(0.014, 0.034, 0.022); ear.position.set(p[0] + s * 0.004, p[1], p[2]); ear.rotation.y = s * 0.35;
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0045, 8, 20, Math.PI * 1.4), M.skin);
    inner.position.set(p[0] + s * 0.011, p[1] + 0.002, p[2] + 0.002); inner.rotation.set(0, s * (Math.PI / 2 - 0.35), Math.PI * 0.3); inner.scale.set(0.8, 1.3, 1);
    g.add(ear, inner);
  }

  // eyes
  const re = S.female ? 0.0262 : 0.0248;
  const irisColor = L.skin >= 5 ? '#4a2d1c' : ['#5a3a24', '#3d6c8a', '#4f6b3b', '#6a4a2c', '#2f4f6e'][(L.skin + (L.hairColor || 0)) % 5];
  const eyes: any[] = [], lids: any[] = [];
  const open = L.eyes === 'round' ? 0.62 : L.eyes === 'mono' ? 0.4 : 0.5;
  for (const s of [-1, 1]) {
    const dir = new THREE.Vector3(s * 0.34, 0.03, 0.94).normalize();
    const sp = hp(dir.x, dir.y, dir.z, tmp);
    const c = new THREE.Vector3(sp[0], sp[1], sp[2]).addScaledVector(dir, -re * 0.62);
    const eg = new THREE.Group(); eg.position.copy(c);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(re, 32, 24), M.eyeWhite);
    eg.add(ball);
    const irisG = new THREE.SphereGeometry(re * 1.004, 32, 12, 0, Math.PI * 2, 0, 0.62);
    const irisM = new THREE.MeshPhysicalMaterial({ map: irisTex(irisColor), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.8 });
    const iris = new THREE.Mesh(irisG, irisM); iris.rotation.x = Math.PI / 2; eg.add(iris);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(re * 0.16, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    glint.position.set(-re * 0.32, re * 0.36, re * 0.93); eg.add(glint);
    // turn the eye slightly outward like real eyes, the gaze group turns both
    eg.rotation.y = s * 0.06;
    eyes.push(eg);
    g.add(eg);
    // lids: skin shells that open and close
    const lidR = re * 1.045;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(lidR, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M.skin);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(lidR * 0.995, 28, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), M.skin);
    const upPiv = new THREE.Group(), loPiv = new THREE.Group();
    upPiv.add(upper); loPiv.add(lower);
    upPiv.position.copy(c); loPiv.position.copy(c);
    const tilt = (L.eyes === 'almond' ? 0.1 : L.eyes === 'mono' ? 0.14 : 0.02) * s;
    upPiv.rotation.z = tilt; loPiv.rotation.z = tilt;
    // a dome rotated by +a about x covers the eye above elevation -a: open upper lid sits a little
    // above the centre, the lower lid a little below; blinking turns the upper lid down to meet it
    const edgeUp = L.eyes === 'round' ? 0.72 : L.eyes === 'mono' ? 0.4 : 0.56, edgeLo = L.eyes === 'round' ? 0.72 : L.eyes === 'mono' ? 0.5 : 0.6;
    upPiv.userData = { open: -edgeUp, closed: edgeLo + 0.03 }; loPiv.userData = { open: edgeLo, closed: edgeLo };
    upPiv.rotation.x = -edgeUp; loPiv.rotation.x = edgeLo;
    const lashGeo = new THREE.TorusGeometry(lidR * 1.004, S.female ? 0.0021 : 0.0014, 6, 32, Math.PI * 0.86);
    lashGeo.rotateZ(Math.PI * 0.07); lashGeo.rotateX(Math.PI / 2);
    upper.add(new THREE.Mesh(lashGeo, M.lash));
    if (L.eyes !== 'mono') {
      const cg = new THREE.TorusGeometry(lidR * 1.06, 0.001, 6, 28, Math.PI * 0.7); cg.rotateZ(Math.PI * 0.15); cg.rotateX(Math.PI / 2);
      const crease = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: shade(M.skinHex, -0.2), roughness: 0.85 }));
      const cp = new THREE.Group(); cp.add(crease); cp.position.copy(c); cp.rotation.set(-edgeUp - 0.3, 0, tilt); g.add(cp);
    }
    g.add(upPiv, loPiv);
    lids.push(upPiv, loPiv);

    // eyebrow
    const bp: number[][] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, bx = s * (0.15 + 0.4 * t), by = 0.335 + 0.06 * Math.sin(t * Math.PI) - 0.03 * t + (S.female ? 0.01 : 0) + (L.eyes === 'mono' ? -0.015 : 0);
      const q = hp(bx, by, Math.sqrt(Math.max(0.05, 1 - bx * bx - by * by)), tmp);
      const l = Math.hypot(q[0], q[1], q[2]);
      bp.push([q[0] * (1 + 0.004 / l), q[1] * (1 + 0.004 / l), q[2] * (1 + 0.004 / l)]);
    }
    const thick = S.female ? 0.0044 : 0.006;
    const brow = new THREE.Mesh(sweepGeo(s < 0 ? bp : bp, t => thick * (1 - 0.5 * t) * (t < 0.12 ? 0.55 + 3.75 * t : 1), { radial: 8, steps: 18, caps: true, flat: 0.5 }), M.brow);
    g.add(brow);
  }

  // mouth line (a soft dark crease between the lips)
  const mp: number[][] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8 - 0.5, mx = t * 0.42 * S.lipW, my = -0.457 + 0.022 * (t * t * 4);
    const q = hp(mx, my, Math.sqrt(1 - mx * mx - my * my), tmp);
    mp.push([q[0], q[1], q[2] - 0.0012]);
  }
  g.add(new THREE.Mesh(sweepGeo(mp, t => 0.0021 * Math.sin(Math.PI * (0.1 + 0.8 * t)), { radial: 6, steps: 16, flat: 0.6 }), M.mouth));

  // moustache volume on top of the colour
  if (L.facial === 'moustache' || L.facial === 'beard') {
    const pts: number[][] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8 - 0.5, mx = t * 0.5, my = -0.345 - 0.1 * t * t * 2;
      const q = hp(mx, my, Math.sqrt(1 - mx * mx - my * my), tmp);
      pts.push([q[0], q[1], q[2] + 0.002]);
    }
    g.add(new THREE.Mesh(sweepGeo(pts, t => 0.0062 * Math.sin(Math.PI * (0.1 + 0.8 * t)), { radial: 10, steps: 18, caps: true, flat: 0.55 }), M.hair));
  }

  return { head: g, info: { eyes, lids, hp, re } };
}

/* ---------- hair ---------- */
function buildHair(L: Look, M: any, S: HeadShape, hp: any, hatOn: boolean): any {
  const g = new THREE.Group();
  const style = L.hair || 'crop';
  if (style === 'bald' || style === 'buzz') return g;
  const tmp: any = {};
  // A grid wrapping the skull from the crown (v = 0) to the hairline, then falling
  // straight down for long styles. lenAt(az) = how far below the head centre it hangs.
  const thick = { crop: 0.011, side: 0.016, curly: 0.014, afro: 0.03, wavy: 0.017, bob: 0.017, long: 0.015, bun: 0.008, ponytail: 0.008, braids: 0.008 }[style] || 0.012;
  const drop = { bob: 0.12, long: 0.42, wavy: 0.26 }[style] || 0;
  const cols = 96, rows = 60;
  const capPart = drop > 0 ? 0.74 : 1;
  const capPoint = (az: number, th: number, v01: number, hang: number) => {
    const nx = Math.sin(th) * Math.sin(az), ny = Math.cos(th), nz = Math.sin(th) * Math.cos(az);
    const p = skullPoint(S, nx, ny, nz);
    const l = Math.hypot(p[0], p[1], p[2]);
    const edge = hang > 0 ? 1 : sstep(1, 0.86, v01);
    let th2 = thick * (0.35 + 0.65 * edge) * (1 + 0.35 * sstep(0.5, 1, ny));
    if (style === 'side') th2 *= 1 + 0.5 * sstep(-0.2, 0.6, -Math.sin(az)) * sstep(0.2, 0.9, ny) - 0.6 * gauss2(az, ny, 0.45, 0.75, 0.08, 0.3);
    if (style === 'wavy' || style === 'curly') th2 *= 1 + 0.12 * Math.sin(az * 9 + ny * 6);
    if (hang > 0) th2 += 0.008 * sstep(0.3, -0.2, ny);
    return [p[0] + p[0] / l * th2, p[1] + p[1] / l * th2, p[2] + p[2] / l * th2];
  };
  const shell = (u: number, v: number) => {
    const az = (u - 0.5) * Math.PI * 2; // 0 = front
    const hl = hairlineY(az) - 0.015 - (drop > 0 ? 0.02 : 0);
    const thEnd = Math.acos(Math.max(-0.999, Math.min(0.999, hl)));
    const faceZone = sstep(0.95, 0.55, Math.abs(az)); // 1 in front of the face
    const hang = drop * (1 - faceZone);
    const thCap = drop > 0 ? lerp(Math.max(thEnd, Math.PI * 0.55), thEnd, faceZone) : thEnd;
    if (v <= capPart) return capPoint(az, (v / capPart) * thCap, v / capPart, hang);
    const t = (v - capPart) / (1 - capPart);
    const e = capPoint(az, thCap, 1, hang);
    const bottom = -hang;
    let x = e[0], z = e[2];
    // hair at the front corners falls beside the cheeks, never over the face
    const fwd = Math.cos(az);
    if (fwd > 0) { const k = sstep(0, 0.35, t) * fwd; x = Math.sign(x || 1) * lerp(Math.abs(x), Math.max(Math.abs(x), S.rx * 1.06), k); z = lerp(z, Math.min(z, S.rz * 0.45), k); }
    const y = e[1] > bottom ? lerp(e[1], bottom, t) : e[1];
    const out = 1 + 0.08 * t * (style === 'bob' ? 0.5 : 1);
    x *= out; z *= out;
    const side = Math.abs(Math.sin(az));
    if (style === 'bob') { const curl = sstep(0.7, 1, t); x *= 1 - 0.1 * curl; z *= 1 - 0.1 * curl; }
    if (style === 'long' || style === 'wavy') {
      const below = Math.max(0, -y - 0.12);
      z -= below * (0.9 * side + 0.2); x *= 1 + below * 0.5 * side;
      if (style === 'wavy') { const w = 0.01 * Math.sin(t * 10) * sstep(0, 0.2, t); x += w * Math.sin(az); z += w * Math.cos(az); }
    }
    return [x, y, z];
  };
  const geo = gridGeo(rows, cols, shell, true, undefined, true);
  g.add(new THREE.Mesh(geo, M.hair));
  // underside of hanging hair (so it isn't see-through from below)
  if (drop > 0) { const inner = new THREE.Mesh(geo, M.hair.clone()); inner.material.side = THREE.BackSide; g.add(inner); }

  const top = (nx: number, ny: number, nz: number, out: number) => { const p = skullPoint(S, nx, ny, nz); const l = Math.hypot(p[0], p[1], p[2]); return new THREE.Vector3(p[0] * (1 + out / l), p[1] * (1 + out / l), p[2] * (1 + out / l)); };
  if (style === 'curly' || style === 'afro') {
    // clusters of curls over the head
    const n = style === 'afro' ? 220 : 140, r0 = style === 'afro' ? 0.028 : 0.017, out = style === 'afro' ? 0.028 : 0.012;
    const sph = new THREE.SphereGeometry(1, 12, 10);
    const inst = new THREE.InstancedMesh(sph, M.hair, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) {
      const y = 1 - (i + 0.5) / (n * 3) * 2, rr = Math.sqrt(1 - y * y), ph = i * 2.39996;
      const nx = rr * Math.sin(ph), nz = rr * Math.cos(ph), az = Math.atan2(nx, nz);
      if (y < hairlineY(az) + (style === 'afro' ? -0.05 : 0.04)) continue;
      if (hatOn && (style === 'curly' || y > -0.22 || nz > 0.25)) continue;
      const big = style === 'afro' ? 1 + 0.35 * sstep(-0.2, 0.7, y) : 1;
      const p = top(nx, y, nz, out * big + (style === 'afro' ? 0.008 * sstep(0, 1, y) : 0));
      const s = r0 * (0.8 + 0.4 * hash01(i)) * (style === 'afro' ? (0.85 + 0.3 * sstep(-0.3, 0.8, y)) : 1);
      sc.set(s, s, s); m4.compose(p, q, sc); inst.setMatrixAt(k++, m4);
    }
    inst.count = k;
    g.add(inst);
  }
  if (style === 'bun') {
    const p = top(0, hatOn ? 0.05 : 0.5, -0.85, 0.02);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 18), M.hair); bun.scale.set(1, 0.85, 0.9); bun.position.copy(p);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 8, 24), M.black); band.position.copy(top(0, hatOn ? 0.05 : 0.5, -0.85, 0.0)); band.lookAt(0, hatOn ? 0 : 0.1, 0);
    g.add(bun, band);
  }
  if (style === 'ponytail') {
    const a = top(0, 0.35, -0.94, 0.0);
    const pts = [[a.x, a.y, a.z], [0, a.y - 0.04, a.z - 0.05], [0, a.y - 0.16, a.z - 0.06], [0, a.y - 0.3, a.z - 0.03]];
    g.add(new THREE.Mesh(sweepGeo(pts, t => 0.028 * (1 - t * 0.75) * (t < 0.08 ? 0.7 : 1), { radial: 16, steps: 30, caps: true, wobble: (t, ang) => 1 + 0.06 * Math.sin(ang * 7 + t * 20) }), M.hair));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 8, 24), M.black); band.position.set(0, a.y - 0.02, a.z - 0.035); band.rotation.x = 0.9; g.add(band);
  }
  if (style === 'braids') {
    for (const s of [-1, 1]) {
      const a = top(s * 0.75, -0.25, -0.6, 0.0);
      const pts = [[a.x, a.y, a.z], [a.x + s * 0.02, a.y - 0.12, a.z - 0.04], [a.x + s * 0.01, a.y - 0.3, a.z - 0.09], [a.x - s * 0.01, a.y - 0.42, a.z - 0.1]];
      g.add(new THREE.Mesh(sweepGeo(pts, t => 0.017 * (1 - t * 0.35) * (0.82 + 0.22 * Math.abs(Math.sin(t * 34))), { radial: 12, steps: 70, caps: true }), M.hair));
    }
  }
  if (style === 'crop' || style === 'side' || style === 'wavy') {
    // a soft fringe lifting off the forehead
    const pts: number[][] = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8 - 0.5; const p = top(t * 0.9, hairlineY(t) + 0.02, Math.sqrt(1 - Math.min(0.9, t * t * 0.8)), thick * 0.6); pts.push([p.x, p.y, p.z]); }
    g.add(new THREE.Mesh(sweepGeo(pts, t => thick * 0.7 * Math.sin(Math.PI * (0.05 + 0.9 * t)), { radial: 10, steps: 20, caps: true, flat: 0.7 }), M.hair));
  }
  return g;
}

/* ---------- body and clothing ---------- */
function torsoSection(L: Look): Section {
  const f = L.sex === 'f';
  return f ? new Section([
    { y: 0.84, ax: 0.152, az: 0.11 },
    { y: 0.92, ax: 0.158, az: 0.112 },
    { y: 1.0, ax: 0.132, az: 0.095 },
    { y: 1.07, ax: 0.122, az: 0.09 },
    { y: 1.16, ax: 0.142, az: 0.097, fr: 0.012 },
    { y: 1.24, ax: 0.152, az: 0.098, fr: 0.022 },
    { y: 1.31, ax: 0.162, az: 0.088, fr: 0.006 },
    { y: 1.355, ax: 0.152, az: 0.074 },
    { y: 1.39, ax: 0.098, az: 0.06 },
    { y: 1.41, ax: 0.052, az: 0.046 },
  ]) : new Section([
    { y: 0.84, ax: 0.15, az: 0.106 },
    { y: 0.92, ax: 0.152, az: 0.106 },
    { y: 1.0, ax: 0.146, az: 0.1 },
    { y: 1.08, ax: 0.148, az: 0.102 },
    { y: 1.17, ax: 0.165, az: 0.112, fr: 0.006 },
    { y: 1.26, ax: 0.18, az: 0.11, fr: 0.006 },
    { y: 1.325, ax: 0.19, az: 0.096 },
    { y: 1.37, ax: 0.176, az: 0.078 },
    { y: 1.405, ax: 0.11, az: 0.062 },
    { y: 1.425, ax: 0.056, az: 0.05 },
  ]);
}

/** A garment patch lying on the front (side 1) or back (side -1) of a section, between two edges. */
function stripGeo(sec: Section, y0: number, y1: number, xl: (y: number) => number, xr: (y: number) => number, off: number, side: number, rows?: number, cols?: number): any {
  rows = rows || 18; cols = cols || 10;
  const g = gridGeo(rows, cols, (u, v) => {
    const y = lerp(y0, y1, v), x = lerp(xl(y), xr(y), u);
    return [x, y, sec.surfZ(y, x, side, 0) + side * off];
  }, false, undefined, side < 0);
  return g;
}
function addTo(g: any, geo: any, mat: any, cast?: boolean) { const m = new THREE.Mesh(geo, mat); if (cast !== false) { m.castShadow = true; m.receiveShadow = true; } g.add(m); return m; }

function wingsShape(): any {
  const s = new THREE.Shape();
  s.moveTo(0, -0.004); s.lineTo(0.006, -0.002);
  s.bezierCurveTo(0.014, 0.0, 0.024, 0.004, 0.034, 0.007);
  s.lineTo(0.03, 0.002); s.lineTo(0.033, 0.0015); s.lineTo(0.026, -0.002); s.lineTo(0.028, -0.003); s.lineTo(0.016, -0.005);
  s.lineTo(0.007, -0.0065); s.lineTo(0, -0.0085);
  s.lineTo(-0.007, -0.0065); s.lineTo(-0.016, -0.005); s.lineTo(-0.028, -0.003); s.lineTo(-0.026, -0.002); s.lineTo(-0.033, 0.0015); s.lineTo(-0.03, 0.002);
  s.lineTo(-0.034, 0.007); s.bezierCurveTo(-0.024, 0.004, -0.014, 0.0, -0.006, -0.002);
  s.lineTo(0, -0.004);
  return s;
}
function badge(M: any, accent: string, scale: number): any {
  const g = new THREE.Group();
  const w = new THREE.Mesh(new THREE.ExtrudeGeometry(wingsShape(), { depth: 0.0015, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 2 }), M.gold);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 20), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.2 }));
  c.rotation.x = Math.PI / 2; c.position.set(0, -0.003, 0.0022);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0058, 0.0009, 6, 20), M.gold); ring.position.copy(c.position); ring.position.z += 0.001;
  g.add(w, c, ring); g.scale.setScalar(scale);
  return g;
}

interface Built { root: any; parts: { torso: any; head: any; eyes: any[]; lids: any[]; armL: any; armR: any }; height: number; bustBottom: number; }

function buildFigure(look: Look, role: CrewRole, accent: string): Built {
  const L = dressed(look, role);
  const M = mats(L, role, accent);
  const f = L.sex === 'f';
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  // everything above the hips sits in "upper", lowered a little for stylised, shorter legs
  const upper = new THREE.Group(); upper.position.y = -0.085; body.add(upper);
  const torsoG = new THREE.Group(); upper.add(torsoG);
  const sec = torsoSection(L);
  const pilot = role === 'captain' || role === 'fo';
  const stripes = role === 'captain' ? 4 : role === 'fo' ? 3 : 0;
  const top = L.top, mech = top === 'overalls';
  const shoulderX = f ? 0.158 : 0.182;

  // ---- torso garment ----
  const topMat = mech ? M.coverall : top === 'shirt' || top === 'vest' ? M.white : top === 'blouse' ? M.blouse : top === 'pullover' ? new THREE.MeshPhysicalMaterial({ color: M.uniHex, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(shade(M.uniHex, 0.4)), bumpMap: knitTex(), bumpScale: 1.6, envMapIntensity: 0.35 }) : M.uni;
  const torsoSec = top === 'jacket' ? new Section([{ y: 0.76, ax: f ? 0.168 : 0.162, az: f ? 0.12 : 0.114 }].concat(sec.rings.slice(1).map(r => Object.assign({}, r, { ax: r.ax + 0.008, az: r.az + 0.008 })))) : sec;
  const grow = top === 'pullover' ? 0.01 : 0;
  const tucked = top === 'shirt' || top === 'blouse' || top === 'vest';
  addTo(torsoG, torsoSec.geo(14, 64, grow, tucked ? torsoSec.tAt(0.975) : 0), topMat);
  // close the bottom of the garment
  if (!tucked) { const bottomCap = new THREE.Mesh(new THREE.CircleGeometry(1, 32), topMat); bottomCap.rotation.x = Math.PI / 2; bottomCap.position.y = torsoSec.rings[0].y + 0.001; bottomCap.scale.set(torsoSec.rings[0].ax + grow, torsoSec.rings[0].az + grow, 1); torsoG.add(bottomCap); }

  const front = (y0: number, y1: number, xl: (y: number) => number, xr: (y: number) => number, off: number, mat: any, side?: number) => addTo(torsoG, stripGeo(torsoSec, y0, y1, xl, xr, off + grow, side || 1), mat);
  const vBottom = top === 'jacket' ? 1.17 : top === 'pullover' ? 1.22 : 1.3;
  const collarW = f ? 0.05 : 0.058;
  const neckTop = 1.405;

  if (!mech) {
    // shirt front in the V (and a collar)
    if (top !== 'shirt' && top !== 'vest' && top !== 'blouse') front(vBottom - 0.01, neckTop + 0.01, y => -collarW * sstep(vBottom - 0.02, neckTop, y) - 0.002, y => collarW * sstep(vBottom - 0.02, neckTop, y) + 0.002, 0.0015, M.white);
    const collarMat = top === 'blouse' ? M.blouse : M.white;
    const band = new THREE.Mesh(new THREE.TorusGeometry(f ? 0.05 : 0.056, 0.0085, 10, 40), collarMat); band.rotation.x = Math.PI / 2 - 0.14; band.scale.set(1, 0.92, 1); band.position.set(0, 1.408, 0.006); band.castShadow = true; torsoG.add(band);
    for (const s of [-1, 1]) front(1.352, 1.412, y => s < 0 ? -(0.012 + 0.75 * (y - 1.352)) : 0.003 + 0.15 * (y - 1.352), y => s < 0 ? -(0.003 + 0.15 * (y - 1.352)) : 0.012 + 0.75 * (y - 1.352), 0.0072, collarMat);
  }
  // tie
  if (L.neck === 'tie' && !mech) {
    const tieEnd = top === 'shirt' ? 1.0 : top === 'vest' ? 1.02 : vBottom + 0.02;
    const tieMat = top === 'shirt' ? M.uniD : M.tie;
    front(tieEnd, 1.385, y => -(y > 1.36 ? 0.012 : lerp(0.02, 0.009, (y - tieEnd) / (1.36 - tieEnd)) * (y < tieEnd + 0.03 ? sstep(tieEnd - 0.002, tieEnd + 0.03, y) * 0.9 + 0.1 : 1)), y => (y > 1.36 ? 0.012 : lerp(0.02, 0.009, (y - tieEnd) / (1.36 - tieEnd)) * (y < tieEnd + 0.03 ? sstep(tieEnd - 0.002, tieEnd + 0.03, y) * 0.9 + 0.1 : 1)), 0.0045, tieMat);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 16, 12), tieMat); knot.scale.set(1.15, 1.0, 0.55); knot.position.set(0, 1.378, torsoSec.surfZ(1.378, 0, 1, 0) + 0.0055); torsoG.add(knot);
    if (stripes && top !== 'shirt') { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0025, 0.002), M.gold); pin.position.set(0, 1.25, torsoSec.surfZ(1.25, 0, 1, 0) + 0.007); if (vBottom < 1.25) torsoG.add(pin); }
  }
  if (L.neck === 'scarf' && !mech) {
    const sc = new THREE.Mesh(new THREE.TorusGeometry(f ? 0.058 : 0.064, 0.013, 10, 36), M.accent); sc.rotation.x = Math.PI / 2 - 0.15; sc.position.set(0, 1.41, 0.004); sc.castShadow = true; torsoG.add(sc);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), M.accent); knot.position.set(0.03, 1.39, torsoSec.surfZ(1.39, 0.03, 1, 0) + 0.01); torsoG.add(knot);
    for (const [dx, ang] of [[0.04, -0.5], [0.022, -0.2]]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.07, 0.004), M.accent); tail.position.set(dx, 1.35, torsoSec.surfZ(1.35, dx, 1, 0) + 0.012); tail.rotation.set(-0.2, 0, ang); torsoG.add(tail);
    }
  }
  if (top === 'jacket') {
    // lapels
    for (const s of [-1, 1]) {
      front(vBottom - 0.015, neckTop, y => s < 0 ? -collarW * sstep(vBottom - 0.02, neckTop, y) - 0.042 * sstep(vBottom - 0.03, vBottom + 0.12, y) * (y > 1.36 ? 0.55 : 1) : collarW * sstep(vBottom - 0.02, neckTop, y) - 0.004,
        y => s < 0 ? -collarW * sstep(vBottom - 0.02, neckTop, y) + 0.004 : collarW * sstep(vBottom - 0.02, neckTop, y) + 0.042 * sstep(vBottom - 0.03, vBottom + 0.12, y) * (y > 1.36 ? 0.55 : 1), 0.0045, M.uniL);
    }
    front(0.765, vBottom - 0.005, () => -0.0015, () => 0.0015, 0.0025, M.uniD); // front opening
    for (const y of [1.1, 0.99]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.004, 20), M.gold); b.rotation.x = Math.PI / 2; b.position.set(0.012, y, torsoSec.surfZ(y, 0.012, 1, 0) + 0.004); torsoG.add(b); }
    // pockets
    for (const s of [-1, 1]) front(0.93, 0.936, () => s < 0 ? -0.12 : 0.05, () => s < 0 ? -0.05 : 0.12, 0.002, M.uniD);
    front(1.235, 1.24, () => -0.12, () => -0.06, 0.002, M.uniD);
  }
  if (top === 'vest') {
    // waistcoat panels over a long-sleeve shirt, front and back
    for (const s of [-1, 1]) front(0.98, 1.36, y => s < 0 ? -0.135 : 0.003 + 0.06 * sstep(1.14, 1.36, y), y => s < 0 ? -0.003 - 0.06 * sstep(1.14, 1.36, y) : 0.135, 0.004, M.uni);
    front(0.98, 1.33, () => -0.135, () => 0.135, 0.004, M.uni, -1);
    for (const y of [1.1, 1.03, 0.96]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 8), M.gold); b.position.set(-0.006, y, torsoSec.surfZ(y, 0, 1, 0) + 0.008); torsoG.add(b); }
  }
  if (top === 'pullover') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 48), topMat); band.rotation.x = Math.PI / 2; band.scale.set(torsoSec.rings[0].ax + 0.014, torsoSec.rings[0].az + 0.014, 1); band.position.y = torsoSec.rings[0].y + 0.012; torsoG.add(band);
    for (const s of [-1, 1]) front(vBottom, neckTop, y => s < 0 ? -collarW * sstep(vBottom - 0.02, neckTop, y) - 0.012 : collarW * sstep(vBottom - 0.02, neckTop, y) - 0.002, y => s < 0 ? -collarW * sstep(vBottom - 0.02, neckTop, y) + 0.002 : collarW * sstep(vBottom - 0.02, neckTop, y) + 0.012, 0.003, topMat);
  }
  if (top === 'blouse') {
    front(1.03, 1.39, () => -0.002, () => 0.002, 0.002, M.white);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1, 0.01, 8, 48), M.uniD); belt.rotation.x = Math.PI / 2; belt.scale.set(sec.at(sec.tAt(1.02)).ax + 0.004, sec.at(sec.tAt(1.02)).az + 0.004, 1); belt.position.y = 1.02; torsoG.add(belt);
  }
  if (top === 'shirt') {
    front(0.98, 1.39, () => -0.003, () => 0.003, 0.0018, new THREE.MeshStandardMaterial({ color: '#D9DEE6', roughness: 0.8 }));
    front(1.2, 1.205, () => -0.12, () => -0.06, 0.0025, new THREE.MeshStandardMaterial({ color: '#D9DEE6', roughness: 0.8 }));
    const s0 = f ? { ax: 0.146, az: 0.102 } : { ax: 0.153, az: 0.106 };
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 48), M.black); belt.rotation.x = Math.PI / 2; belt.scale.set(s0.ax + 0.006, s0.az + 0.006, 1); belt.position.y = 0.975; torsoG.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.006), M.silver); buckle.position.set(0, 0.975, s0.az + 0.017); torsoG.add(buckle);
  }
  if (mech) {
    // high-visibility vest with reflective bands over grey coveralls
    const vest = new Section(sec.rings.filter(r => r.y >= 0.9 && r.y <= 1.37).map(r => Object.assign({}, r, { ax: r.ax + 0.008, az: r.az + 0.008 })));
    addTo(torsoG, vest.geo(12, 64, 0), M.hivis);
    for (const y of [1.0, 1.06]) { const b = new Section([{ y: y - 0.012, ax: vest.at(vest.tAt(y)).ax + 0.0015, az: vest.at(vest.tAt(y)).az + 0.0015 }, { y: y + 0.012, ax: vest.at(vest.tAt(y)).ax + 0.0015, az: vest.at(vest.tAt(y)).az + 0.0015 }]); addTo(torsoG, b.geo(2, 64, 0), M.reflect); }
    front(0.9, 1.37, () => -0.003, () => 0.003, 0.0105, M.coverallD);
    front(1.2, 1.25, () => -0.11, () => -0.05, 0.0105, M.white);
    const n = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 8, 32), M.coverall); n.rotation.x = Math.PI / 2 - 0.1; n.position.set(0, 1.405, 0.005); torsoG.add(n);
  }
  // epaulettes on shirts and pullovers
  if ((top === 'shirt' || top === 'pullover') && (stripes || role === 'fa')) {
    for (const s of [-1, 1]) {
      const ep = new THREE.Group();
      ep.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.007, 0.044), M.uniD));
      for (let i = 0; i < Math.max(1, stripes); i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0085, 0.045), M.gold); st.position.x = s * (0.03 - i * 0.0095); ep.add(st); }
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), M.gold); btn.position.set(-s * 0.03, 0.005, 0); ep.add(btn);
      ep.position.set(s * (shoulderX - 0.07), 1.392, -0.004); ep.rotation.z = -s * 0.3;
      torsoG.add(ep);
    }
  }
  // wings or a name badge on the chest
  if (pilot && !mech) { const b = badge(M, accent, 1.0); b.position.set(0.075, 1.255, torsoSec.surfZ(1.255, 0.075, 1, 0) + 0.004); b.rotation.y = 0.35; b.rotation.x = -0.1; torsoG.add(b); }
  if (role === 'fa' && !mech) {
    const b = badge(M, accent, 0.7); b.position.set(0.07, 1.25, torsoSec.surfZ(1.25, 0.07, 1, 0) + 0.006); b.rotation.y = 0.35; torsoG.add(b);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.003), M.gold); tag.position.set(-0.075, 1.24, torsoSec.surfZ(1.24, -0.075, 1, 0) + 0.004); tag.rotation.y = -0.35; torsoG.add(tag);
  }

  // ---- neck ----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(f ? 0.043 : 0.05, f ? 0.046 : 0.054, 0.14, 24), M.skin); neck.position.set(0, 1.43, 0.004); neck.castShadow = true; upper.add(neck);

  // ---- arms ----
  const longSleeve = top !== 'shirt';
  const sleeveMat = mech ? M.coverall : top === 'vest' || top === 'shirt' ? M.white : top === 'blouse' ? M.blouse : topMat;
  const arms: any[] = [];
  for (const s of [-1, 1]) {
    const ag = new THREE.Group(); ag.position.set(s * (shoulderX - 0.02), 1.345, -0.01);
    const S = [0, 0, 0], E = [s * 0.045, -0.255, -0.01], W = [s * 0.055, -0.5, 0.025];
    const path = [S, [s * 0.03, -0.13, -0.008], E, [s * 0.052, -0.38, 0.01], W];
    const jacketR = top === 'jacket' ? 0.006 : 0;
    const rUp = (f ? 0.046 : 0.054) + jacketR, rLow = (f ? 0.036 : 0.043) + jacketR;
    if (longSleeve) {
      addTo(ag, sweepGeo(path, t => lerp(rUp, rLow, sstep(0, 1, t)) * (t > 0.96 ? 1.04 : 1), { radial: 24, steps: 40, caps: true }), sleeveMat);
      // cuff stripes
      if (top === 'jacket' && (stripes || role === 'fa')) {
        const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
        const n = stripes || 1;
        for (let i = 0; i < n; i++) {
          const t = 0.955 - i * 0.03, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(rLow * 1.04 + 0.001, 0.0028, 6, 32), M.gold);
          ring.position.copy(p); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan); ag.add(ring);
        }
      }
      if (mech) { const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal'); const p = curve.getPointAt(0.55), tan = curve.getTangentAt(0.55); const ring = new THREE.Mesh(new THREE.TorusGeometry(rLow * 1.1, 0.008, 6, 32), M.reflect); ring.position.copy(p); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan); ring.scale.z = 1.6; ag.add(ring); }
    } else {
      addTo(ag, sweepGeo(path.slice(0, 3), t => rUp * (1 + 0.12 * t), { radial: 24, steps: 16, caps: true }), sleeveMat);
      addTo(ag, sweepGeo([[s * 0.03, -0.12, -0.008], E, [s * 0.052, -0.38, 0.01], W], t => lerp(f ? 0.036 : 0.042, f ? 0.028 : 0.033, t), { radial: 20, steps: 30 }), M.skin);
      // sleeve hem ring
      const hemR = new THREE.Mesh(new THREE.TorusGeometry(rUp * 1.1, 0.004, 6, 28), M.white); hemR.position.set(E[0] * 0.98, E[1] + 0.005, E[2]); hemR.rotation.x = Math.PI / 2; hemR.rotation.z = s * 0.15; ag.add(hemR);
    }
    // shoulder cap so the sleeve joins the torso smoothly
    const cap = new THREE.Mesh(new THREE.SphereGeometry(rUp * 1.0, 24, 16), sleeveMat); cap.scale.set(1.0, 0.92, 1.0); cap.position.set(-s * 0.004, -0.006, 0); cap.castShadow = true; ag.add(cap);
    // hand
    const hand = new THREE.Group(); hand.position.set(W[0], W[1] - 0.012, W[2]);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), M.skin); palm.scale.set(f ? 0.016 : 0.019, f ? 0.04 : 0.045, f ? 0.033 : 0.038); palm.position.y = -0.035; palm.castShadow = true; hand.add(palm);
    for (let i = 0; i < 4; i++) {
      const z = lerp(-0.024, 0.026, i / 3) * (f ? 0.88 : 1), len = [0.034, 0.042, 0.044, 0.04][i] * (f ? 0.92 : 1);
      const fg = new THREE.Mesh(sweepGeo([[0, -0.06, z], [s * 0.002, -0.06 - len * 0.55, z + 0.004], [s * 0.004, -0.06 - len, z + 0.012]], () => (f ? 0.0068 : 0.0078), { radial: 10, steps: 8, caps: true }), M.skin);
      hand.add(fg);
    }
    const th = new THREE.Mesh(sweepGeo([[s * 0.006, -0.03, 0.03], [s * 0.012, -0.05, 0.04], [s * 0.012, -0.068, 0.042]], () => (f ? 0.0078 : 0.0088), { radial: 10, steps: 8, caps: true }), M.skin);
    hand.add(th);
    hand.rotation.y = s * 0.12; hand.scale.setScalar(1.22);
    ag.add(hand);
    ag.rotation.z = s * 0.02;
    upper.add(ag); arms.push(ag);
  }

  // ---- legs, lower garment and shoes ----
  const legsG = new THREE.Group(); body.add(legsG);
  const trouserMat = mech ? M.coverall : M.uniD;
  const hipX = f ? 0.078 : 0.084;
  const K = (0.875 - 0.085) / (0.96 - 0.085), ly = (y: number) => 0.085 + (y - 0.085) * K;
  const legPath = (s: number) => [[s * hipX, ly(0.96), 0], [s * (hipX + 0.004), ly(0.72), 0.004], [s * (hipX + 0.006), ly(0.5), 0.012], [s * (hipX + 0.006), ly(0.28), 0.0], [s * (hipX + 0.004), 0.09, -0.004]];
  for (const s of [-1, 1]) {
    if (L.bottom === 'trousers') {
      addTo(legsG, sweepGeo(legPath(s), t => lerp(f ? 0.086 : 0.09, f ? 0.062 : 0.067, sstep(0, 1, t)) * (t > 0.92 ? 1.04 : 1), { radial: 26, steps: 40 }), trouserMat);
    } else {
      addTo(legsG, sweepGeo(legPath(s), t => lerp(f ? 0.07 : 0.078, f ? 0.034 : 0.04, sstep(0, 1, t)) * (1 + 0.1 * gauss2(t, 0, 0.62, 0, 0.12, 1)), { radial: 24, steps: 40 }), M.skin);
      if (L.bottom === 'shorts') addTo(legsG, sweepGeo(legPath(s).slice(0, 3), t => lerp(f ? 0.09 : 0.096, f ? 0.082 : 0.088, t), { radial: 26, steps: 16 }), M.uniD);
    }
  }
  // seat of the trousers (or shorts) up to the waist, under tucked-in tops
  if (L.bottom !== 'skirt') {
    const hips = new Section(f ? [{ y: 0.8, ax: 0.15, az: 0.108 }, { y: 0.88, ax: 0.162, az: 0.114 }, { y: 0.95, ax: 0.152, az: 0.106 }, { y: 1.0, ax: 0.138, az: 0.098 }]
      : [{ y: 0.8, ax: 0.152, az: 0.106 }, { y: 0.88, ax: 0.158, az: 0.11 }, { y: 0.95, ax: 0.155, az: 0.108 }, { y: 1.0, ax: 0.15, az: 0.104 }]);
    addTo(upper, hips.geo(8, 64, 0), L.bottom === 'shorts' ? M.uniD : trouserMat);
  } else {
    const sk = new Section([{ y: 0.63, ax: f ? 0.19 : 0.2, az: 0.135 }, { y: 0.76, ax: 0.178, az: 0.126 }, { y: 0.88, ax: 0.162, az: 0.116 }, { y: 1.0, ax: 0.136, az: 0.1 }]);
    addTo(upper, sk.geo(10, 64, 0), M.uniD);
    const hemCap = new THREE.Mesh(new THREE.RingGeometry(0.0, 1, 48), new THREE.MeshStandardMaterial({ color: shade(M.uniHex, -0.5), side: THREE.DoubleSide })); hemCap.rotation.x = Math.PI / 2; hemCap.scale.set(f ? 0.19 : 0.2, 0.135, 1); hemCap.position.y = 0.632; upper.add(hemCap);
    const pleat = new THREE.Mesh(stripGeo(sk, 0.63, 0.78, () => -0.002, () => 0.002, 0.001, 1), new THREE.MeshStandardMaterial({ color: shade(M.uniHex, -0.45), roughness: 0.9 })); upper.add(pleat);
  }
  // shoes
  for (const s of [-1, 1]) {
    const sg = new THREE.Group(); sg.position.set(s * (hipX + 0.004), 0, 0.012); sg.rotation.y = s * 0.08;
    const kind = L.shoes;
    const ell = (m: any, sx: number, sy: number, sz: number, x: number, y: number, z: number) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); sg.add(o); return o; };
    if (kind === 'pumps') {
      ell(M.skin, 0.03, 0.03, 0.05, 0, 0.06, 0.0);
      ell(M.shoe, 0.038, 0.03, 0.085, 0, 0.032, 0.035);
      ell(M.shoe, 0.036, 0.034, 0.05, 0, 0.05, -0.03);
      const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.005, 0.045, 12), M.shoe); heel.position.set(0, 0.022, -0.055); sg.add(heel);
      const sole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.008, 28), M.sole); sole.scale.set(0.038, 1, 0.07); sole.position.set(0, 0.006, 0.06); sg.add(sole);
    } else {
      const mat = kind === 'boots' ? M.boot : kind === 'sneakers' ? M.sneaker : M.shoe;
      ell(mat, 0.05, 0.043, 0.088, 0, 0.038, 0.06);
      ell(mat, 0.05, 0.055, 0.072, 0, 0.05, -0.012);
      const sole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, kind === 'sneakers' ? 0.024 : 0.014, 32), kind === 'sneakers' ? M.soleW : M.sole); sole.scale.set(0.052, 1, 0.128); sole.position.set(0, kind === 'sneakers' ? 0.012 : 0.007, 0.03); sg.add(sole);
      if (kind === 'boots') { const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.055, 0.14, 24), M.boot); shaft.position.set(0, 0.11, -0.01); sg.add(shaft); const top = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.006, 8, 24), M.boot); top.rotation.x = Math.PI / 2; top.position.set(0, 0.18, -0.01); sg.add(top); }
      if (kind === 'sneakers') { const st = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 24, Math.PI * 0.8), M.accent); st.position.set(s * 0.05, 0.04, 0.02); st.rotation.set(0, s * Math.PI / 2, Math.PI * 1.1); st.scale.set(1.6, 0.7, 1); sg.add(st); }
      if (kind === 'oxford') { for (let i = 0; i < 3; i++) { const lace = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0025, 0.004), M.sole); lace.position.set(0, 0.076 - i * 0.006, 0.03 + i * 0.012); lace.rotation.x = 0.5; sg.add(lace); } }
    }
    sg.traverse((m: any) => { if (m.isMesh) m.castShadow = true; });
    legsG.add(sg);
  }

  // ---- head ----
  const S = headShape(L);
  const headPivot = new THREE.Group(); headPivot.position.set(0, 1.47, 0.01); upper.add(headPivot);
  const hb = buildHead(L, role, M, S);
  const headG = hb.head; headG.scale.setScalar(1.17); headG.position.set(0, (f ? 0.134 : 0.14), 0.006); headPivot.add(headG);
  const hatOn = L.hat !== 'none';
  headG.add(buildHair(L, M, S, hb.info.hp, hatOn));
  headG.traverse((m: any) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // glasses
  if (L.glasses !== 'none') {
    const gg = new THREE.Group();
    const ex = 0.34 * S.rx * 1.02, ey = 0.03 * S.ry, ez = S.rz * 0.93 + 0.014;
    for (const s of [-1, 1]) {
      let rimGeo: any, lensGeo: any, mat = M.frame, lensMat = M.lens;
      if (L.glasses === 'round') { rimGeo = new THREE.TorusGeometry(0.025, 0.0019, 8, 32); lensGeo = new THREE.CircleGeometry(0.025, 32); }
      else if (L.glasses === 'rect') { const sh = roundRect(0.058, 0.04, 0.009); rimGeo = new THREE.ExtrudeGeometry(sh.outer, { depth: 0.002, bevelEnabled: false }); lensGeo = new THREE.ShapeGeometry(sh.inner); }
      else { const sh = aviatorShape(s); rimGeo = new THREE.ExtrudeGeometry(sh.outer, { depth: 0.0015, bevelEnabled: false }); lensGeo = new THREE.ShapeGeometry(sh.inner); mat = M.gold; lensMat = M.lensTint; }
      const rim = new THREE.Mesh(rimGeo, mat), lens = new THREE.Mesh(lensGeo, lensMat);
      rim.position.set(s * ex, ey, ez); lens.position.set(s * ex, ey, ez + 0.0008);
      rim.rotation.y = lens.rotation.y = s * 0.12;
      gg.add(rim, lens);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0028, S.rz * 0.95), mat); arm.position.set(s * (S.rx * 1.0), ey + 0.006, ez * 0.42); arm.rotation.y = -s * 0.08; gg.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.0075, 0.0014, 6, 16, Math.PI), L.glasses === 'aviator' ? M.gold : M.frame); bridge.position.set(0, ey + 0.002, ez - 0.002); gg.add(bridge);
    headG.add(gg);
  }

  // hats
  if (hatOn) headG.add(buildHat(L, role, M, S, accent));

  root.traverse((m: any) => { if (m.isMesh) { const tr = m.material && m.material.transparent; m.castShadow = !tr; m.receiveShadow = !tr; } });
  return { root, parts: { torso: torsoG, head: headPivot, eyes: hb.info.eyes, lids: hb.info.lids, armL: arms[0], armR: arms[1] }, height: 0, bustBottom: 1.16 };
}

function roundRect(w: number, h: number, r: number) {
  const mk = (W: number, H: number, R: number) => { const s = new THREE.Shape(); s.moveTo(-W / 2 + R, -H / 2); s.lineTo(W / 2 - R, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R); s.lineTo(W / 2, H / 2 - R); s.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2); s.lineTo(-W / 2 + R, H / 2); s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R); s.lineTo(-W / 2, -H / 2 + R); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2); return s; };
  const outer = mk(w, h, r), inner = mk(w - 0.005, h - 0.005, r * 0.7);
  outer.holes.push(new THREE.Path(inner.getPoints(12).reverse()));
  return { outer, inner };
}
function aviatorShape(s: number) {
  const mk = (k: number) => { const p = new THREE.Shape(); p.moveTo(-0.022 * k, 0.012 * k); p.quadraticCurveTo(0, 0.016 * k, 0.022 * k, 0.012 * k); p.quadraticCurveTo(0.026 * k, -0.01 * k, s > 0 ? 0.004 * k : 0.012 * k, -0.02 * k); p.quadraticCurveTo(0, -0.022 * k, -0.012 * k * s, -0.019 * k); p.quadraticCurveTo(-0.026 * k, -0.008 * k, -0.022 * k, 0.012 * k); return p; };
  const outer = mk(1.36), inner = mk(1.22);
  outer.holes.push(new THREE.Path(inner.getPoints(16).reverse()));
  return { outer, inner };
}

/** Pilot's peaked cap (gold braid on the visor for captains), a flight attendant's cap, a pillbox, or a mechanic's cap. */
function buildHat(L: Look, role: CrewRole, M: any, S: HeadShape, accent: string): any {
  const g = new THREE.Group();
  const rx = S.rx * 1.1, rz = S.rz * 1.08, baseY = S.ry * 0.46;
  if (role === 'mech') {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.uni); crown.scale.set(rx * 1.02, S.ry * 0.62, rz * 1.02); crown.position.y = baseY;
    const bill = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.006, 32, 1, false, -Math.PI / 2.2, Math.PI / 1.1), M.uniD); bill.scale.set(rx * 0.85, 1, rz * 0.75); bill.position.set(0, baseY + 0.004, rz * 0.62); bill.rotation.x = 0.12;
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), M.uni); btn.position.y = baseY + S.ry * 0.62;
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.014, 20), M.accent); logo.position.set(0, baseY + 0.04, rz * 0.98); logo.rotation.x = -0.35;
    g.add(crown, bill, btn, logo);
  } else if (L.hat === 'pillbox') {
    const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.064, 0.05, 36), M.uni); pb.position.set(-0.03, S.ry * 0.86, 0.01); pb.rotation.set(0.1, 0, 0.22);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0645, 0.0645, 0.012, 36, 1, true), M.accent); band.position.copy(pb.position); band.rotation.copy(pb.rotation); band.position.y -= 0.012;
    const b = badge(M, accent, 0.6); b.position.set(-0.03, S.ry * 0.86, 0.075); b.rotation.set(0, 0, 0.22);
    g.add(pb, band, b);
  } else {
    // peaked cap: band, flared crown with a flat top, glossy visor
    const hatG = new THREE.Group();
    const bandH = 0.042;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, bandH, 48, 1, true), M.black); band.scale.set(rx, 1, rz); band.position.y = baseY + bandH / 2;
    const crownSec = new Section([{ y: baseY + bandH - 0.002, ax: rx, az: rz }, { y: baseY + bandH + 0.035, ax: rx * 1.16, az: rz * 1.2, dz: 0.012 }, { y: baseY + bandH + 0.06, ax: rx * 1.22, az: rz * 1.28, dz: 0.02 }]);
    const crown = new THREE.Mesh(crownSec.geo(8, 64, 0), M.uni);
    const topDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M.uni); topDisc.rotation.x = -Math.PI / 2; topDisc.scale.set(rx * 1.22, rz * 1.28, 1); topDisc.position.set(0, baseY + bandH + 0.06, 0.02);
    const piping = new THREE.Mesh(new THREE.TorusGeometry(1, 0.0035, 8, 64), role === 'captain' ? M.gold : M.uniD); piping.rotation.x = Math.PI / 2; piping.scale.set(rx * 1.22, rz * 1.28, 1); piping.position.set(0, baseY + bandH + 0.06, 0.02);
    // gold cord above the visor
    const cord = new THREE.Mesh(new THREE.TorusGeometry(1, 0.0028, 6, 48, Math.PI * 0.7), M.gold); cord.rotation.set(Math.PI / 2, 0, Math.PI * 0.15); cord.scale.set(rx * 1.01, rz * 1.01, 1); cord.position.y = baseY + 0.012;
    // visor: a curved half-disc in front
    const visorGeo = gridGeo(10, 40, (u, v) => {
      const a = lerp(-Math.PI * 0.42, Math.PI * 0.42, u), r = lerp(1.0, 1.55, v);
      return [Math.sin(a) * rx * lerp(1, 0.92, v), baseY + 0.002 - 0.028 * v * v, Math.cos(a) * rz * r];
    }, false);
    const visor = new THREE.Mesh(visorGeo, M.visor.clone()); visor.material.side = THREE.DoubleSide;
    hatG.add(band, crown, topDisc, piping, cord, visor);
    if (role === 'captain') {
      // "scrambled egg": a row of gold leaves along the visor edge
      for (let i = -5; i <= 5; i++) {
        const a = i / 5 * Math.PI * 0.32, leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), M.gold);
        leaf.scale.set(0.0085, 0.0018, 0.0035);
        leaf.position.set(Math.sin(a) * rx * 0.95, baseY - 0.012 + 0.008 * Math.abs(i / 5), Math.cos(a) * rz * 1.4);
        leaf.rotation.y = a + (i % 2 ? 0.5 : -0.5); hatG.add(leaf);
      }
    }
    const b = badge(M, accent, role === 'fa' ? 0.75 : 1.0); b.position.set(0, baseY + bandH + 0.012, rz * 1.13 + 0.004); b.rotation.x = -0.22; hatG.add(b);
    hatG.rotation.x = -0.1; hatG.position.y = 0.005;
    g.add(hatG);
  }
  g.traverse((m: any) => { if (m.isMesh) m.castShadow = true; });
  return g;
}
