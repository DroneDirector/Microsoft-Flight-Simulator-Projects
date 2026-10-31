/* Clouds from the real-world airport reports: soft volumetric puffs in the 3D view, see-through layers on the map. */

const CLOUD_COV: { [k: string]: number } = { FEW: 0.19, SCT: 0.44, BKN: 0.75, OVC: 1 };

function cloudKm(): number { const v = (State.settings as any).cloudKm; return clamp(v == null ? 80 : +v, 0, 300); }
function cloudDetail(): number { const v = (State.settings as any).cloudDetail; return clamp(v == null ? 2 : Math.round(+v), 1, 4); }
const CLOUD_DETAIL_NAMES = ['Light', 'Normal', 'Detailed', 'Very detailed'];

/* ---------- shared: noise and the reports near a place ---------- */

function cloudHash(x: number, y: number, s: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Smooth value noise (0–1) over kilometres, two octaves; the same everywhere for the same place. */
function cloudNoise(xKm: number, yKm: number, scaleKm: number, seed: number): number {
  const one = (x: number, y: number, s: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = cloudHash(ix, iy, s), b = cloudHash(ix + 1, iy, s), c = cloudHash(ix, iy + 1, s), d = cloudHash(ix + 1, iy + 1, s);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const n = one(xKm / scaleKm, yKm / scaleKm, seed) * 0.65 + one(xKm / scaleKm * 2.7, yKm / scaleKm * 2.7, seed + 7) * 0.35;
  return clamp((n - 0.5) * 2.1 + 0.5, 0, 1);   // spread out, so the share under a threshold is close to the coverage
}
interface CloudStation { pos: number[]; elev: number; layers: { cover: string; base: number; type?: string }[] }
/** Reports with cloud information within reach of a point (lon, lat), at most a few minutes old in the cache. */
function cloudStations(lon: number, lat: number, rKm: number): CloudStation[] {
  const out: CloudStation[] = [], cache: any = LiveWx.cache;
  for (const k in cache) {
    const w = cache[k]; if (!w || !w.clouds || Date.now() - w.at > 3 * 3600e3) continue;
    const A = apt(k); if (!A) continue;
    if (gcDistanceNm([lon, lat], A.pos) * 1.852 > rKm) continue;
    out.push({ pos: A.pos, elev: w.elev || (A as any).elev || 0, layers: w.clouds });
  }
  return out;
}
/** The nearest report to a point, with the borders between reports made irregular. */
function cloudNearest(list: CloudStation[], lon: number, lat: number, maxKm: number): CloudStation {
  const k = Math.cos(lat * D2R), xk = lon * 111.32 * k, yk = lat * 110.54;
  const wx = (cloudNoise(xk, yk, 30, 91) - 0.5) * 40, wy = (cloudNoise(xk, yk, 30, 92) - 0.5) * 40;
  let best: CloudStation = null, bd = maxKm * maxKm;
  for (const s of list) {
    const dx = (s.pos[0] - lon) * 111.32 * k - wx, dy = (s.pos[1] - lat) * 110.54 - wy, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
/** What kind of cloud a layer is: thunderstorm, towering, high (cirrus), a sheet (broken or overcast), or heaps. */
function cloudKind(l: { cover: string; base: number; type?: string }): string {
  return l.type === 'CB' ? 'cb' : l.type === 'TCU' ? 'tcu' : l.base >= 18000 ? 'ci' : l.cover === 'OVC' || (l.cover === 'BKN' && l.base < 5000) ? 'st' : 'cu';
}

/* ---------- the 3D view ---------- */

const V3dClouds: any = { mesh: null, tex: null, key: '', at: 0, cx: 0, cz: 0, list: [] as number[][], sortAt: 0, sx: 1e9, sz: 1e9, fetchAt: 0, fetchKey: '' };

function v3dCloudTexture(): any {
  const T = THREE, cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  for (let t = 0; t < 4; t++) {
    const ox = (t % 2) * 128, oy = Math.floor(t / 2) * 128;
    g.save(); g.beginPath(); g.rect(ox + 1, oy + 1, 126, 126); g.clip();
    // a heap of soft blobs: wide, domed at the top, flatter at the bottom, brighter where the sun reaches
    for (let i = 0; i < 26; i++) {
      const u = cloudHash(t, i, 3) * 2 - 1, v = cloudHash(t, i, 4);
      const x = ox + 64 + u * 34, top = 1 - u * u, y = oy + 84 - v * 40 * top, s = (10 + cloudHash(t, i, 5) * 18) * (0.6 + 0.6 * top);
      if (y + s * 0.5 > oy + 108) continue;
      const lit = Math.round(175 + 80 * clamp((oy + 100 - y) / 70, 0, 1));
      const gr = g.createRadialGradient(x, y, 0, x, y, s);
      gr.addColorStop(0, `rgba(${lit},${lit},${lit},0.6)`); gr.addColorStop(0.55, `rgba(${lit},${lit},${lit},0.32)`); gr.addColorStop(1, `rgba(${lit},${lit},${lit},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  const tex = new T.CanvasTexture(cv); tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter;
  return tex;
}

function v3dCloudMesh(max: number): any {
  const T = THREE, geo = new T.InstancedBufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('iOff', new T.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('iData', new T.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(T.DynamicDrawUsage));
  geo.instanceCount = 0;
  if (!V3dClouds.tex) V3dClouds.tex = v3dCloudTexture();
  const mat = new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTex: { value: null }, uFar: { value: 1e5 }, uLight: { value: new T.Color(0.97, 0.98, 1) }, uDark: { value: new T.Color(0.5, 0.55, 0.63) } }]),
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      attribute vec4 iOff; attribute vec4 iData;
      uniform float uFar;
      varying vec2 vUv; varying float vShade; varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(iOff.xyz, 1.0);
        mvPosition.x += position.x * iData.x;
        mvPosition.y += position.y * iData.x * iOff.w;
        float t = iData.y;
        vUv = (uv + vec2(mod(t, 2.0), floor(t / 2.0))) * 0.5;
        float d = length(mvPosition.xyz);
        mvPosition.xyz *= max(0.05, (d - iData.x * 0.5) / d);
        vAlpha = iData.w * (1.0 - smoothstep(uFar * 0.75, uFar, d)) * smoothstep(iData.x * 0.25, iData.x * 1.1, d);
        vShade = iData.z + position.y * 0.35;
        gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      uniform sampler2D uTex; uniform vec3 uLight; uniform vec3 uDark;
      varying vec2 vUv; varying float vShade; varying float vAlpha;
      void main() {
        #include <logdepthbuf_fragment>
        vec4 t = texture2D(uTex, vUv);
        float a = t.a * vAlpha;
        if (a < 0.008) discard;
        vec3 col = mix(uDark, uLight, clamp(vShade, 0.0, 1.0)) * (0.82 + 0.18 * t.r);
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  mat.uniforms.uTex.value = V3dClouds.tex;
  const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.userData.max = max;
  return mesh;
}

/** Asks for the reports around the 3D view (one request for the whole area, at most every ten minutes). */
function v3dCloudFetch(lon: number, lat: number, km: number) {
  const r = Math.min(4, km / 100 + 0.8), k = Math.max(0.3, Math.cos(lat * D2R));
  const s = Math.floor(lat - r), n = Math.ceil(lat + r), w = Math.floor(lon - r / k), e = Math.ceil(lon + r / k), key = [s, w, n, e].join(',');
  if (key === V3dClouds.fetchKey && Date.now() - V3dClouds.fetchAt < 10 * 60e3) return;
  if (Date.now() - V3dClouds.fetchAt < 15e3) return;
  V3dClouds.fetchKey = key; V3dClouds.fetchAt = Date.now();
  Net.json(`https://aviationweather.gov/api/data/metar?bbox=${Math.max(-89, s)},${Math.max(-180, w)},${Math.min(89, n)},${Math.min(180, e)}&format=json`).then((ms: any[]) => {
    for (const x of ms || []) { if (!x || !x.icaoId) continue; LiveWx.store(x, ''); }
    V3dClouds.key = '';   // build again with the new reports
  }).catch(() => { /* offline: no clouds */ });
}

/** The puffs within reach of the camera: [x, y, z, flat, size, picture, shade, alpha]. */
function v3dCloudBuild(cx: number, cz: number, km: number, detail: number): number[][] {
  const R = km * 1000, ll0 = v3dLonLat(cx, cz), list = cloudStations(ll0[0], ll0[1], km + 160), out: number[][] = [];
  if (!list.length) return out;
  const budget = [900, 2000, 3600, 5400][detail - 1];
  // the size of one cloud cell: smaller cells mean more, better-shaped clouds; the area must fit the budget
  let cell = [3200, 2400, 1800, 1300][detail - 1];
  cell = Math.max(cell, Math.sqrt(Math.PI * R * R / (budget / 2.2)));
  const cells: number[][] = [];
  const x0 = Math.floor((cx - R) / cell), x1 = Math.ceil((cx + R) / cell), z0 = Math.floor((cz - R) / cell), z1 = Math.ceil((cz + R) / cell);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
    const x = i * cell, z = j * cell, d = Math.hypot(x - cx, z - cz); if (d <= R) cells.push([x, z, d]);
  }
  cells.sort((a, b) => a[2] - b[2]);   // nearest first, so the budget is spent close by
  for (const c of cells) {
    if (out.length >= budget) break;
    const ll = v3dLonLat(c[0], c[1]), st = cloudNearest(list, ll[0], ll[1], 150); if (!st) continue;
    const xk = ll[0] * 111.32 * Math.cos(ll[1] * D2R), yk = ll[1] * 110.54, curve = v3dCurve(c[0], c[1]);
    st.layers.forEach((l, li) => {
      const cov = CLOUD_COV[l.cover] || 0, kind = cloudKind(l); if (!cov) return;
      const n = cloudNoise(xk, yk, kind === 'st' ? 14 : kind === 'ci' ? 22 : kind === 'cb' ? 18 : 6, 11 + li * 17);
      if (n > cov) return;
      const dens = cov >= 1 ? 1 : clamp((cov - n) / Math.max(0.12, cov) * 1.6, 0.25, 1);
      const base = st.elev + l.base * 0.3048 - curve, rnd = (k: number) => cloudHash(Math.round(c[0]), Math.round(c[1]), li * 31 + k);
      if (kind === 'cb' || kind === 'tcu') {
        // a tower: puffs stacked up to about 9 km (thunderstorm) or 4 km (towering cumulus), widening at the top
        const top = base + (kind === 'cb' ? 9000 - l.base * 0.3048 * 0.5 : 3500), steps = Math.max(4, Math.round((top - base) / (cell * 0.45)));
        for (let s = 0; s < steps; s++) {
          const f = s / steps, wid = cell * (0.9 + (kind === 'cb' && f > 0.8 ? 1.2 : 0.3 * f));
          out.push([c[0] + (rnd(s) - 0.5) * cell * 0.4, base + f * (top - base), c[1] + (rnd(s + 40) - 0.5) * cell * 0.4, 0.85, wid, Math.floor(rnd(s + 80) * 4), kind === 'cb' ? 0.05 + f * 0.9 : 0.3 + f * 0.7, 0.85]);
        }
        return;
      }
      if (kind === 'ci') {   // thin, see-through high cloud
        out.push([c[0] + (rnd(1) - 0.5) * cell, base + rnd(2) * 300, c[1] + (rnd(3) - 0.5) * cell, 0.3, cell * 2.1, Math.floor(rnd(4) * 4), 0.95, 0.28 * dens]);
        return;
      }
      if (kind === 'st') {   // a sheet: wide, flat, grey underneath
        for (let s = 0; s < 2; s++) out.push([c[0] + (rnd(s) - 0.5) * cell * 0.6, base + 60 + s * 220, c[1] + (rnd(s + 9) - 0.5) * cell * 0.6, 0.5, cell * 1.6, Math.floor(rnd(s + 20) * 4), 0.25 + s * 0.45, 0.75]);
        return;
      }
      // heaps (cumulus): a few puffs, bigger and taller where the cell is denser
      const k = 2 + Math.round(dens * (detail + 1)), th = 250 + dens * 900;
      for (let s = 0; s < k; s++) {
        const f = rnd(s + 60);
        out.push([c[0] + (rnd(s) - 0.5) * cell, base + 60 + f * th, c[1] + (rnd(s + 30) - 0.5) * cell, 0.7, cell * (0.8 + 0.6 * dens) * (1 - f * 0.3), Math.floor(rnd(s + 90) * 4), 0.2 + f * 0.8, 0.85]);
      }
    });
  }
  return out;
}

/** Each frame: rebuild the clouds when the camera has moved far, the reports changed or the settings changed; keep them sorted far to near. */
function v3dCloudsStep(now: number) {
  const km = cloudKm();
  if (!km || !V3d.origin || !V3d.cam) { if (V3dClouds.mesh) V3dClouds.mesh.visible = false; return; }
  const cam = V3d.cam.position, detail = cloudDetail();
  const ll = v3dLonLat(cam.x, cam.z);
  v3dCloudFetch(ll[0], ll[1], km);
  const key = V3d.origin.join(',') + '|' + km + '|' + detail;
  if (!V3dClouds.mesh || V3dClouds.mesh.parent !== V3d.scene) { V3dClouds.mesh = v3dCloudMesh(5600); V3d.scene.add(V3dClouds.mesh); V3dClouds.key = ''; }
  V3dClouds.mesh.visible = true;
  if (key !== V3dClouds.key || Math.hypot(cam.x - V3dClouds.cx, cam.z - V3dClouds.cz) > Math.max(3000, km * 120) || now - V3dClouds.at > 5 * 60e3) {
    V3dClouds.key = key; V3dClouds.at = now; V3dClouds.cx = cam.x; V3dClouds.cz = cam.z;
    V3dClouds.list = v3dCloudBuild(cam.x, cam.z, km, detail);
    V3dClouds.sx = 1e9;   // sort and upload now
    const M: any = V3dClouds.mesh; M.material.uniforms.uFar.value = km * 1000;
  }
  // far to near, so the see-through puffs blend properly
  if (now - V3dClouds.sortAt > 400 && Math.hypot(cam.x - V3dClouds.sx, cam.y - (V3dClouds.sy || 0), cam.z - V3dClouds.sz) > 120) {
    V3dClouds.sortAt = now; V3dClouds.sx = cam.x; V3dClouds.sy = cam.y; V3dClouds.sz = cam.z;
    const L: number[][] = V3dClouds.list, d = (p: number[]) => (p[0] - cam.x) * (p[0] - cam.x) + (p[1] - cam.y) * (p[1] - cam.y) + (p[2] - cam.z) * (p[2] - cam.z);
    L.sort((a, b) => d(b) - d(a));
    const g = V3dClouds.mesh.geometry, o = g.attributes.iOff.array as Float32Array, a = g.attributes.iData.array as Float32Array, n = Math.min(L.length, V3dClouds.mesh.userData.max);
    for (let i = 0; i < n; i++) {
      const p = L[i];
      o[i * 4] = p[0]; o[i * 4 + 1] = p[1]; o[i * 4 + 2] = p[2]; o[i * 4 + 3] = p[3];
      a[i * 4] = p[4]; a[i * 4 + 1] = p[5]; a[i * 4 + 2] = p[6]; a[i * 4 + 3] = p[7];
    }
    g.instanceCount = n; g.attributes.iOff.needsUpdate = true; g.attributes.iData.needsUpdate = true;
  }
}
function v3dCloudsClear() { V3dClouds.mesh = null; V3dClouds.key = ''; V3dClouds.list = []; V3dClouds.tex = null; }

/* ---------- the map: see-through layers ---------- */

const Clouds2d: any = { cv: null, key: '', at: 0, blob: null };
function clouds2dBlob(): HTMLCanvasElement {
  if (Clouds2d.blob) return Clouds2d.blob;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (Clouds2d.blob = cv);
}
/** Draws the cloud layers of every report in view: low and middle cloud as one soft white layer, high cloud fainter, thunderstorm cores grey. */
function clouds2dDraw(c: CanvasRenderingContext2D, m: any, degPx: number) {
  const W = m.w, H = m.h; if (!W || !H) return;
  const ctr = m.ll(W / 2, H / 2); if (!ctr) return;
  const pxKm = degPx / 111.32;
  const a = m.px(ctr[0], ctr[1]), b = m.px(ctr[0], ctr[1] + 1), pxPerKm = a && b ? Math.abs(b[1] - a[1]) / 110.54 : pxKm;
  const sc = 0.25, w = Math.ceil(W * sc), h = Math.ceil(H * sc);
  const key = [Math.round(a ? a[0] : 0), Math.round(a ? a[1] : 0), Math.round(pxPerKm * 1000), W, H, Object.keys(LiveWx.cache).length].join(',');
  if (key !== Clouds2d.key && Date.now() - Clouds2d.at > 90) {
    Clouds2d.key = key; Clouds2d.at = Date.now();
    if (!Clouds2d.cv) Clouds2d.cv = [document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')];
    const [lo, hi, cb] = Clouds2d.cv as HTMLCanvasElement[];
    for (const cv of Clouds2d.cv as HTMLCanvasElement[]) { cv.width = w; cv.height = h; }
    const gl = lo.getContext('2d'), gh = hi.getContext('2d'), gc = cb.getContext('2d'), blob = clouds2dBlob();
    const c0 = m.ll(W / 2, H / 2), list = c0 ? cloudStations(c0[0], c0[1], Math.hypot(W, H) / 2 / pxPerKm + 160) : [];
    // one cell every few pixels: its weather is the nearest report's, with the cloud cover shaped by noise
    const step = 4, cellKm = step / sc / pxPerKm;
    if (list.length) for (let y = 0; y < h + step; y += step) for (let x = 0; x < w + step; x += step) {
      const ll = m.ll(x / sc, y / sc); if (!ll) continue;
      const st = cloudNearest(list, ll[0], ll[1], 150); if (!st) continue;
      const xk = ll[0] * 111.32 * Math.cos(ll[1] * D2R), yk = ll[1] * 110.54;
      st.layers.forEach((l, li) => {
        const cov = CLOUD_COV[l.cover] || 0, kind = cloudKind(l); if (!cov) return;
        const n = cloudNoise(xk, yk, Math.max(kind === 'st' ? 14 : kind === 'ci' ? 22 : 6, cellKm * 3), 11 + li * 17);
        if (n > cov) return;
        const d = cov >= 1 ? 1 : clamp((cov - n) / Math.max(0.12, cov) * 1.6, 0.3, 1), sz = step * (2.2 + 1.2 * d);
        (kind === 'ci' ? gh : gl).drawImage(blob, x - sz / 2, y - sz / 2, sz, sz);
        if (kind === 'cb' || kind === 'tcu') { gc.globalAlpha = kind === 'cb' ? 1 : 0.4; gc.drawImage(blob, x - sz / 2, y - sz / 2, sz, sz); }
      });
    }
    // soften the cells into one layer
    if (Clouds2d.filterOk !== false) for (const cv of [lo, hi, cb]) {
      const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d');
      tg.filter = 'blur(2px)'; if (tg.filter !== 'blur(2px)') { Clouds2d.filterOk = false; break; }
      tg.drawImage(cv, 0, 0); const g2 = cv.getContext('2d'); g2.clearRect(0, 0, w, h); g2.drawImage(t, 0, 0);
    }
  }
  if (!Clouds2d.cv) return;
  const [lo, hi, cb] = Clouds2d.cv as HTMLCanvasElement[];
  c.save(); c.imageSmoothingEnabled = true;
  c.globalAlpha = 0.16; c.drawImage(hi, 0, 0, W, H);
  c.globalAlpha = 0.3; c.drawImage(lo, 0, 0, W, H);
  c.globalAlpha = 0.22; c.drawImage(cb, 0, 0, W, H);
  c.restore();
}
