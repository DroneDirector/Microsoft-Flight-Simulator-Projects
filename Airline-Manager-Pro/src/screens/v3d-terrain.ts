// The ground in the 3D view, in rings of detail: the finest heights around the aircraft (about 30 m
// apart), coarser further out, as far as the view distance chosen in Settings → 3D view. The earth's
// curvature is included, so distant mountains sink below the horizon as they do in reality.
//
// Coastlines, fjords, lakes and rivers come from the OpenStreetMap water outlines (OpenMapTiles via
// OpenFreeMap, the same data as the world map), drawn exactly, not guessed from the heights. The ground is
// painted like the world map (dark blue land shaded by its slopes, cyan coastlines) or, with Satellite on,
// with Sentinel-2 cloudless 2016 imagery by EOX (CC BY 4.0).
//
// Heights: Terrain Tiles on AWS (Mapzen / Tilezen terrarium tiles), credited in Settings → About.

/** The view distance chosen in Settings → 3D view (km), 20 to 800. */
function v3dKm(): number { return clamp(+(State.settings as any).v3dKm || 150, 20, 800); }
const EARTH_R = 6371000;
const SAT_URL = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/';

interface V3dRing { z: number; x0: number; y0: number; N: number; size: number; H: Float32Array; mask: Uint8ClampedArray; mesh: any; mapTex: any; satTex: any; inner: V3dRing; ok: boolean }

/** The rings of ground for the view distance: finest first, coarser ones added until they reach it.
 *  Fog starts at a quarter of the distance and closes at the distance; the camera sees a little further. */
function v3dRange(lat?: number): { rings: number[]; fog: number[]; far: number } {
  const km = v3dKm(), k = Math.cos(((lat == null ? 50 : lat)) * D2R), rings: number[] = [];
  for (const z of [12, 10, 8, 7, 6, 5]) { rings.push(z); if (2.5 * 40075 / (1 << z) * k >= km) break; }
  return { rings, fog: [km * 250, km * 1000], far: km * 1300 };
}
/** How far below the flat plane the ground lies at a distance (m), from the earth's curvature. */
function v3dCurve(x: number, z: number): number { return (x * x + z * z) / (2 * EARTH_R); }

const V3dTerrain = {
  rings: [] as V3dRing[], gen: 0, origin: null as number[], prog: { got: 0, want: 1 },

  /** Load the rings around a point (the view's origin), finest first, so the near ground shows quickly. */
  load(centre: number[]) {
    const gen = ++this.gen;
    this.clear(); this.origin = centre.slice();
    const zs = v3dRange(centre[1]).rings;
    this.prog = { got: 0, want: 27 + (V3d.icao ? 1 : 0) };
    let prev: V3dRing = null;
    const next = (i: number) => {
      if (i >= zs.length || gen !== this.gen || !V3d.open) return;
      this.loadRing(zs[i], centre, prev, gen).then(r => { if (r) { this.rings.push(r); prev = r; } next(i + 1); });
    };
    next(0);
  },
  clear() {
    for (const r of this.rings) { if (r.mesh) { V3d.scene.remove(r.mesh); r.mesh.geometry.dispose(); } if (r.mapTex) r.mapTex.dispose(); if (r.satTex) r.satTex.dispose(); }
    this.rings = [];
  },

  loadRing(z: number, centre: number[], inner: V3dRing, gen: number): Promise<V3dRing> {
    const n = 1 << z, N = 5, size = 256 * N;
    const fx = (centre[0] + 180) / 360 * n, fy = (1 - Math.log(Math.tan(centre[1] * D2R) + 1 / Math.cos(centre[1] * D2R)) / Math.PI) / 2 * n;
    const x0 = Math.floor(fx) - 2, y0 = Math.floor(fy) - 2;
    const ring: V3dRing = { z, x0, y0, N, size, H: null, mask: null, mesh: null, mapTex: null, satTex: null, inner, ok: false };
    const heights = this.tiles(TERRAIN_URL, z, x0, y0, N, 'png').then(cv => {
      if (!cv) return null;
      const d = cv.getContext('2d').getImageData(0, 0, size, size).data, H = new Float32Array(size * size);
      for (let i = 0; i < size * size; i++) H[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
      return H;
    }).catch(() => null);
    const water = this.waterMask(z, x0, y0, N).catch(() => null);
    return Promise.all([heights, water]).then(([H, mask]) => {
      if (gen !== this.gen || !V3d.open) return null;
      if (!H) { H = new Float32Array(size * size); if (!inner) H.fill(V3d.elev || 0); }
      ring.H = H; ring.mask = mask; ring.ok = true;
      this.build(ring);
      if (z === 12) this.prog.got++;
      if ((State.settings as any).v3dSat) this.loadSat(ring);
      return ring;
    });
  },

  /** N × N tiles of a tile service into one canvas (null when none could be loaded). */
  tiles(base: string, z: number, x0: number, y0: number, N: number, ext: string): Promise<HTMLCanvasElement> {
    const n = 1 << z, cv = document.createElement('canvas'); cv.width = cv.height = 256 * N;
    const c = cv.getContext('2d');
    if (ext === 'png') { c.fillStyle = 'rgb(128,0,0)'; c.fillRect(0, 0, cv.width, cv.height); }   // terrarium 0 m
    let left = N * N, got = 0;
    return new Promise(ok => {
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const im = new Image(); im.crossOrigin = 'anonymous';
        const done = () => { if (z === 12 && ext === 'png') this.prog.got++; if (--left === 0) ok(got ? cv : null); };
        im.onload = () => { c.drawImage(im, i * 256, j * 256); got++; done(); };
        im.onerror = done;
        const x = (x0 + i + n) % n, y = y0 + j;
        im.src = ext === 'png' ? `${base}${z}/${x}/${y}.png` : `${base}${z}/${y}/${x}.jpg`;
      }
    });
  },

  /** Where the water is: the OpenStreetMap sea, lakes (red) and rivers (green), drawn by the map engine
   *  off screen at exactly the ring's tiles, then read back. Null when the map engine or the data isn't there. */
  waterMask(z: number, x0: number, y0: number, N: number): Promise<Uint8ClampedArray> {
    const ML = (window as any).maplibregl; if (!ML) return Promise.resolve(null);
    const size = 256 * N, n = 1 << z;
    const cx = x0 + N / 2, cy = y0 + N / 2;
    const lon = cx / n * 360 - 180, k = Math.PI - 2 * Math.PI * cy / n, lat = Math.atan(0.5 * (Math.exp(k) - Math.exp(-k))) / D2R;
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;left:-${size + 50}px;top:0;width:${size}px;height:${size}px;pointer-events:none;opacity:0`;
    document.body.appendChild(div);
    return new Promise<Uint8ClampedArray>(ok => {
      let map: any = null, done = false;
      const finish = (data: Uint8ClampedArray) => { if (done) return; done = true; if (z === 12) this.prog.got++; try { map && map.remove(); } catch (e) { /* gone */ } div.remove(); ok(data); };
      try {
        map = new ML.Map({
          container: div, interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: 1, preserveDrawingBuffer: true, renderWorldCopies: true,
          center: [lon, lat], zoom: z - 1,   // 512-pixel map tiles: one zoom level down gives 256 pixels per terrain tile
          style: { version: 8, sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } }, layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#000000' } },
            { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#ff0000', 'fill-antialias': false } },
            { id: 'river', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': '#00ff00', 'line-width': z >= 11 ? 2 : 1 } },
          ] },
        });
        map.on('error', () => { /* tiles missing: whatever loaded is used */ });
        map.once('idle', () => {
          try {
            const cv = document.createElement('canvas'); cv.width = cv.height = size;
            const c = cv.getContext('2d'); c.drawImage(map.getCanvas(), 0, 0, size, size);
            finish(c.getImageData(0, 0, size, size).data);
          } catch (e) { finish(null); }
        });
        setTimeout(() => finish(null), 15000);
      } catch (e) { finish(null); }
    });
  },

  /** The mesh and the map-look paint of a ring. */
  build(r: V3dRing) {
    const T = THREE, size = r.size, n = 1 << r.z, H = r.H, M = r.mask;
    // water from the map outlines, checked against the ground: the sea is at (or near) sea level; a lake is
    // level ground higher up; "water" on clearly sloping land is a mismatch between the two sources, and is
    // drawn and shaped as the land it really is (never flattened, so the coastline keeps its shape)
    const mapWater = (i: number) => M ? M[i * 4] > 110 : H[i] <= 0.5;
    const level = (i: number) => { const x = i % size, y = (i / size) | 0, h = H[i]; let d = 0;
      if (x > 0) d = Math.max(d, Math.abs(H[i - 1] - h)); if (x < size - 1) d = Math.max(d, Math.abs(H[i + 1] - h));
      if (y > 0) d = Math.max(d, Math.abs(H[i - size] - h)); if (y < size - 1) d = Math.max(d, Math.abs(H[i + size] - h)); return d < 4; };
    const sea = (i: number) => mapWater(i) && H[i] <= 8;
    const water = (i: number) => mapWater(i) && (H[i] <= 8 || level(i));
    const river = (i: number) => M ? M[i * 4 + 1] > 110 && M[i * 4] <= 110 : false;
    // the map look: dark blue land shaded by its slopes, the sea darker, cyan along the coasts
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'), img = c.createImageData(size, size), D = img.data;
    const mPerPx = 40075016 * Math.cos(this.origin[1] * D2R) / (n * 256);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x; let R = 11, G = 29, B = 51;
      if (water(i)) {
        const isSea = sea(i);
        R = isSea ? 4 : 6; G = isSea ? 11 : 18; B = isSea ? 22 : 34;
      } else if (river(i)) { R = 18; G = 60; B = 92; }
      else {
        const hx = H[i + (x < size - 1 ? 1 : 0)] - H[i - (x > 0 ? 1 : 0)], hy = H[i + (y < size - 1 ? size : 0)] - H[i - (y > 0 ? size : 0)];
        const shade = clamp(1 + (-hx * 0.8 - hy) / (mPerPx * 2) * 0.9, 0.5, 1.75);
        const lift = clamp(H[i] / 2200, 0, 1);
        R = 11 * shade + 16 * lift; G = 29 * shade + 24 * lift; B = 51 * shade + 30 * lift;
        // the coast, as on the map
        if ((x > 0 && water(i - 1)) || (x < size - 1 && water(i + 1)) || (y > 0 && water(i - size)) || (y < size - 1 && water(i + size))) { R = 63; G = 208; B = 232; }
      }
      D[i * 4] = R; D[i * 4 + 1] = G; D[i * 4 + 2] = B; D[i * 4 + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    r.mapTex = new T.CanvasTexture(cv); r.mapTex.colorSpace = T.SRGBColorSpace; r.mapTex.anisotropy = 8; r.mapTex.generateMipmaps = true;

    // the mesh: finest near the aircraft; the part an inner ring covers is left out
    const G = r.z >= 12 ? 220 : r.z >= 10 ? 140 : 110;
    const lonOf = (px: number) => (r.x0 + px / 256) / n * 360 - 180;
    const latOf = (py: number) => { const k = Math.PI - 2 * Math.PI * (r.y0 + py / 256) / n; return Math.atan(0.5 * (Math.exp(k) - Math.exp(-k))) / D2R; };
    const aptLL = V3d.icao ? apt(V3d.icao).pos : null, aElev = V3d.elev || 0;
    const pos = new Float32Array((G + 1) * (G + 1) * 3), uv = new Float32Array((G + 1) * (G + 1) * 2), idx: number[] = [];
    const sample = (px: number, py: number) => {
      const x = clamp(px, 0, size - 1.001), y = clamp(py, 0, size - 1.001), xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, i = yi * size + xi;
      const h = H[i] * (1 - fx) * (1 - fy) + H[i + 1] * fx * (1 - fy) + H[i + size] * (1 - fx) * fy + H[i + size + 1] * fx * fy;
      const k = Math.round(y) * size + Math.round(x);
      return { h, wet: sea(k), lake: !sea(k) && water(k) ? H[k] : null };
    };
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const px = i / G * size, py = j / G * size, lon = lonOf(px), lat = latOf(py);
      const s = sample(px, py);
      let h = Math.max(0, s.h);
      if (s.wet) h = 0;                                  // the sea: perfectly flat, at sea level
      else if (s.lake != null) h = Math.max(0, s.lake);  // a lake: flat at its own level
      if (aptLL) { const d = gcDistanceNm([lon, lat], aptLL) * NM, k = clamp((d - 2500) / 2500, 0, 1); h = aElev + (h - aElev) * k; }
      const p = v3dXY(lon, lat), o = j * (G + 1) + i;
      // outer rings sit a little lower so the finer ring always shows where they meet
      pos[o * 3] = p[0]; pos[o * 3 + 1] = h - v3dCurve(p[0], p[1]) - (aptLL ? 1.5 : 0) - (r.inner ? 4 : 0); pos[o * 3 + 2] = p[1];
      uv[o * 2] = i / G; uv[o * 2 + 1] = 1 - j / G;
    }
    const inside = (lon: number, lat: number) => {
      const q = r.inner; if (!q) return false;
      const qn = 1 << q.z, w0 = q.x0 / qn * 360 - 180, w1 = (q.x0 + q.N) / qn * 360 - 180;
      const lt = (y: number) => { const k = Math.PI - 2 * Math.PI * y / qn; return Math.atan(0.5 * (Math.exp(k) - Math.exp(-k))) / D2R; };
      const n0 = lt(q.y0), s0 = lt(q.y0 + q.N), padX = (w1 - w0) * 0.02, padY = (n0 - s0) * 0.02;
      return lon > w0 + padX && lon < w1 - padX && lat < n0 - padY && lat > s0 + padY;
    };
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      if (r.inner && inside(lonOf((i + 0.5) / G * size), latOf((j + 0.5) / G * size))) continue;
      const a = j * (G + 1) + i, b = a + 1, d = a + G + 1, e = d + 1; idx.push(a, d, b, b, d, e);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx);
    r.mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map: (State.settings as any).v3dSat && r.satTex ? r.satTex : r.mapTex }));
    r.mesh.renderOrder = -r.z;
    V3d.scene.add(r.mesh);
  },

  /** Satellite imagery for a ring (loaded once, when first wanted). */
  loadSat(r: V3dRing) {
    if (r.satTex) { if (r.mesh) r.mesh.material.map = r.satTex, r.mesh.material.needsUpdate = true; return; }
    const z = Math.min(r.z, 14);
    this.tiles(SAT_URL, z, r.x0, r.y0, r.N, 'jpg').then(cv => {
      if (!cv || !V3d.open) return;
      const T = THREE; r.satTex = new T.CanvasTexture(cv); r.satTex.colorSpace = T.SRGBColorSpace; r.satTex.anisotropy = 8;
      if ((State.settings as any).v3dSat && r.mesh) { r.mesh.material.map = r.satTex; r.mesh.material.needsUpdate = true; }
    });
  },
  setSat(on: boolean) {
    for (const r of this.rings) { if (on) this.loadSat(r); else if (r.mesh) { r.mesh.material.map = r.mapTex; r.mesh.material.needsUpdate = true; } }
  },

  /** Ground height above the sea (m) at a point, from the finest ring that covers it. */
  ground(lon: number, lat: number): number {
    for (const r of this.rings) {
      const n = 1 << r.z, px = ((lon + 180) / 360 * n - r.x0) * 256, py = ((1 - Math.log(Math.tan(lat * D2R) + 1 / Math.cos(lat * D2R)) / Math.PI) / 2 * n - r.y0) * 256;
      if (px < 0 || py < 0 || px >= r.size - 1 || py >= r.size - 1) continue;
      const i = Math.floor(py) * r.size + Math.floor(px);
      if (r.mask && r.mask[i * 4] > 110 && r.H[i] < 3) return 0;
      return Math.max(0, r.H[i]);
    }
    return V3d.elev || 0;
  },
};

ACTIONS['v3d-sat'] = () => {
  const S: any = State.settings; S.v3dSat = !S.v3dSat; Sound.tick();
  V3dTerrain.setSat(S.v3dSat);
  const b = V3d.root && V3d.root.querySelector('[data-act=v3d-sat]'); if (b) b.classList.toggle('on', !!S.v3dSat);
  Store.save();
};
