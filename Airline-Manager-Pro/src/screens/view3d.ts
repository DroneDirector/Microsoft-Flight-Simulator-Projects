// The 3D view: the aircraft you follow, seen in 3D over the ground it flies over, with the airport it is
// leaving or approaching. Opened with the 3D button among the map controls. Kept light: the ground is one
// mesh painted like the world map (dark land, cyan coastlines) with the real heights of the terrain, the
// airport is a handful of flat shapes, and it draws at most 30 times a second, only while open.
// The camera always follows the aircraft; drag to look around it, pinch or scroll to zoom.
//
// Terrain heights: Terrain Tiles on AWS (Mapzen/Tilezen "terrarium"), from SRTM, GMTED2010, ETOPO1, 3DEP,
// EU-DEM and national elevation models; their sources are credited in Settings → About.

const TERRAIN_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
const V3D_FPS = 30;

interface V3dPlane { id: string; model: any; type: string; pos: any; tgt: any; hdg: number; tgtHdg: number; bank: number; pitch: number; flaps: number; gear: number; label: HTMLElement; seen: number }

const V3d: any = {
  open: false, root: null as HTMLElement, cv: null as HTMLCanvasElement, r: null as any, scene: null as any, cam: null as any,
  origin: null as number[], elev: 0, icao: '', target: '', planes: {} as { [id: string]: V3dPlane },
  terrain: null as any, airport: null as any, aptScene: null as any, raf: 0, last: 0, mode: 'chase' as 'chase' | 'tower' | 'side',
  yaw: 0, pitch: 0.28, dist: 0, drag: null as any, ptrs: {} as any, pinch0: 0, dist0: 0, loading: 0, heights: null as any, map: null as WorldMap,
};

function v3dSupported(): boolean {
  try { const c = document.createElement('canvas'); return !!(window as any).THREE && !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
function view3dBtn(): string {
  return `<button class="icon-btn v3d-btn" data-act="v3d-open" aria-label="3D view"><b>3D</b></button>`;
}

ACTIONS['v3d-open'] = () => {
  if (!v3dSupported()) { toast('3D isn\'t available on this device', 'warn'); return; }
  const m = _curMap();
  const id = (m && (m.following || m.selected)) || (liveOf().filter(f => f.you)[0] || liveOf()[0] || {} as any).id;
  if (!id) { toast('No aircraft in the air to show in 3D', 'info'); return; }
  v3dOpen(id, m, m ? m.el : null);
};

function v3dOpen(id: string, map: WorldMap, from?: HTMLElement) {
  const T = THREE;
  v3dClose();
  V3d.aptReady = false; V3d.loadT0 = performance.now(); V3d.loaded = false;
  V3d.open = true; V3d.target = id; (V3d as any).camBase = null; V3d.map = map; V3d.planes = {}; V3d.origin = null; V3d.icao = '';
  V3d.mode = 'chase'; V3d.yaw = 0; V3d.pitch = 0.22; V3d.dist = 0;
  const root = document.createElement('div'); root.className = 'v3d';
  root.innerHTML = `<canvas class="v3d-cv"></canvas><div class="v3d-labels"></div>
    <div class="v3d-top"><button class="icon-btn" data-act="v3d-close" aria-label="Close the 3D view">${icon('close')}</button>
      <div class="v3d-modes">${[['chase', 'Behind'], ['side', 'Around'], ['tower', 'Tower']].map(([k, l]) => `<button class="v3d-m ${k === 'chase' ? 'on' : ''}" data-act="v3d-mode" data-m="${k}">${l}</button>`).join('')}</div>
      <div class="v3d-pick"><button class="icon-btn" data-act="v3d-next" data-d="-1" aria-label="Previous aircraft">${icon('chevron', 'flip')}</button><span class="v3d-name"></span><button class="icon-btn" data-act="v3d-next" data-d="1" aria-label="Next aircraft">${icon('chevron')}</button></div></div>
    <div class="v3d-info"></div>
    <div class="v3d-status"></div>
    <button class="v3d-sat ${(State.settings as any).v3dSat ? 'on' : ''}" data-act="v3d-sat">${icon('map')}Satellite</button>
    <small class="v3d-credit">Terrain: Terrain Tiles on AWS · water: © OpenStreetMap contributors · imagery: Sentinel-2 cloudless 2016 by EOX (see Settings → About)</small>
    ${v3dLoaderHtml()}`;
  // opened from the small map on the overview: it grows from that window to the whole screen
  const rc = from && from.getBoundingClientRect();
  if (rc && rc.width && (rc.width < innerWidth - 40 || rc.height < innerHeight - 40) && !State.settings.reduceMotion) {
    root.classList.add('v3d-from');
    root.style.cssText = `left:${rc.left}px;top:${rc.top}px;width:${rc.width}px;height:${rc.height}px;border-radius:14px`;
    requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.add('v3d-grow'); root.style.cssText = ''; }));
    setTimeout(() => root.classList.remove('v3d-from', 'v3d-grow'), 900);
  }
  document.body.appendChild(root);
  V3d.root = root; V3d.cv = root.querySelector('.v3d-cv');
  const phone = Math.min(innerWidth, innerHeight) < 600;
  const rg = v3dRange(map && (map as any).cy != null ? undefined : undefined);
  const r = new T.WebGLRenderer({ canvas: V3d.cv, antialias: !phone, powerPreference: v3dKm() > 300 ? 'high-performance' : 'low-power', logarithmicDepthBuffer: v3dKm() > 60 });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5));
  r.outputColorSpace = T.SRGBColorSpace;
  V3d.r = r;
  const sc = new T.Scene(); V3d.scene = sc;
  sc.background = new T.Color(0x0A1A2E);
  sc.fog = new T.Fog(0x0A1A2E, rg.fog[0], rg.fog[1]);
  sc.add(new T.HemisphereLight(0xDDE8FF, 0x223348, 1.6));
  const sun = new T.DirectionalLight(0xFFFFFF, 1.9); sun.position.set(-4000, 9000, 3000); sc.add(sun);
  V3d.cam = new T.PerspectiveCamera(50, 1, 2, rg.far);
  v3dSize();
  v3dBind();
  v3dShowInfo();
  V3d.last = 0; V3d.raf = requestAnimationFrame(v3dLoop);
  addEventListener('resize', v3dSize);
}

function v3dClose() {
  if (!V3d.open) return;
  V3d.open = false; cancelAnimationFrame(V3d.raf);
  removeEventListener('resize', v3dSize);
  try {
    V3d.scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m: any) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    V3d.r.dispose(); V3d.r.forceContextLoss && V3d.r.forceContextLoss();
  } catch (e) { /* gone */ }
  if (V3d.root) V3d.root.remove();
  try { V3dTerrain.clear(); V3dTerrain.gen++; } catch (e) { /* none */ }
  V3d.root = null; V3d.terrain = null; V3d.airport = null; V3d.aptScene = null; V3d.planes = {};
}
ACTIONS['v3d-close'] = () => v3dClose();
ACTIONS['v3d-mode'] = el => {
  V3d.mode = el.getAttribute('data-m'); Sound.tick();
  V3d.yaw = V3d.mode === 'side' ? 1.2 : 0; V3d.pitch = V3d.mode === 'side' ? 0.15 : 0.22; V3d.dist = 0;
  V3d.root.querySelectorAll('[data-act=v3d-mode]').forEach((b: Element) => b.classList.toggle('on', b.getAttribute('data-m') === V3d.mode));
};
ACTIONS['v3d-next'] = el => {
  const list = liveOf(), i = list.findIndex(f => f.id === V3d.target), d = +el.getAttribute('data-d');
  if (!list.length) return;
  v3dSelect(list[(i + d + list.length) % list.length].id);
};
function v3dSelect(id: string) {
  if (id === V3d.target) return;
  V3d.target = id; V3d.dist = 0; Sound.tick();
  if (V3d.map) { V3d.map.mark = null; V3d.map.follow(id); }
  v3dShowInfo();
}

function v3dSize() {
  if (!V3d.open) return;
  const w = innerWidth, h = innerHeight;
  V3d.r.setSize(w, h, false); V3d.cv.style.width = w + 'px'; V3d.cv.style.height = h + 'px';
  V3d.cam.aspect = w / h; V3d.cam.updateProjectionMatrix();
}

/** Drag to look around, pinch or scroll to zoom, tap an aircraft for its flight. */
function v3dBind() {
  const cv = V3d.cv; cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', (e: PointerEvent) => {
    cv.setPointerCapture(e.pointerId); V3d.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
    const ids = Object.keys(V3d.ptrs);
    if (ids.length === 2) { const a = V3d.ptrs[ids[0]], b = V3d.ptrs[ids[1]]; V3d.pinch0 = Math.hypot(a.x - b.x, a.y - b.y); V3d.dist0 = v3dDist(); }
  });
  cv.addEventListener('pointermove', (e: PointerEvent) => {
    const p = V3d.ptrs[e.pointerId]; if (!p) return;
    const ids = Object.keys(V3d.ptrs);
    if (ids.length === 1) { V3d.yaw -= (e.clientX - p.x) * 0.006; V3d.pitch = clamp(V3d.pitch + (e.clientY - p.y) * 0.004, -0.15, 1.45); }
    p.x = e.clientX; p.y = e.clientY;
    if (ids.length === 2) { const a = V3d.ptrs[ids[0]], b = V3d.ptrs[ids[1]]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (V3d.pinch0) V3d.dist = clamp(V3d.dist0 * V3d.pinch0 / d, 8, 30000); }
  });
  const up = (e: PointerEvent) => {
    const p = V3d.ptrs[e.pointerId];
    if (p && Object.keys(V3d.ptrs).length === 1 && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6) v3dTap(e.clientX, e.clientY);
    delete V3d.ptrs[e.pointerId];
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', (e: PointerEvent) => { delete V3d.ptrs[e.pointerId]; });
  cv.addEventListener('wheel', (e: WheelEvent) => { e.preventDefault(); V3d.dist = clamp(v3dDist() * (e.deltaY > 0 ? 1.15 : 1 / 1.15), 8, 30000); }, { passive: false } as any);
}
function v3dDist(): number { const p = V3d.planes[V3d.target]; const span = p ? shapeOf(p.type).span : 35; return V3d.dist || (V3d.mode === 'tower' ? 0 : span * 1.9 + 25); }

function v3dTap(x: number, y: number) {
  const T = THREE, ray = new T.Raycaster(), v = new T.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(v, V3d.cam);
  const objs: any[] = []; for (const id in V3d.planes) objs.push(V3d.planes[id].model);
  const hit = ray.intersectObjects(objs, true)[0];
  if (hit) { let o = hit.object; while (o && !o.userData.flightId) o = o.parent; if (o) { v3dSelect(o.userData.flightId); return; } }
  // labels: the nearest one on screen
  let best = '', bd = 40;
  for (const id in V3d.planes) { const L = V3d.planes[id].label; if (!L || L.style.display === 'none') continue; const r = L.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y); if (d < bd) { bd = d; best = id; } }
  if (best) v3dSelect(best);
}

/** The flight's details, in a panel you can drag anywhere. */
function v3dShowInfo() {
  if (!V3d.root) return;
  const f = State.live.filter(x => x.id === V3d.target)[0];
  const box = V3d.root.querySelector('.v3d-info') as HTMLElement, name = V3d.root.querySelector('.v3d-name') as HTMLElement;
  if (name) name.textContent = f ? f.callsign : '';
  if (box) box.innerHTML = f ? `<div class="sel-pop">${flightCard(f)}</div>` : '';
}

/* ---------- positions ---------- */

/** Local metres (x east, z south, y up) around the view's origin. */
function v3dXY(lon: number, lat: number): number[] {
  const o = V3d.origin; return [(lon - o[0]) * 111320 * Math.cos(o[1] * D2R), -(lat - o[1]) * 110540];
}

/** Where the view is centred: the airport the aircraft is near (within 60 nm), else the aircraft itself. */
function v3dCentre(f: LiveFlight, pos: number[]): { pos: number[]; icao: string } {
  const A = apt(f.from), B = f.noDest ? null : apt(f.to);
  const dA = A ? gcDistanceNm(pos, A.pos) : 1e9, dB = B ? gcDistanceNm(pos, B.pos) : 1e9;
  if (Math.min(dA, dB) < 60) { const k = dB <= dA ? f.to : f.from; return { pos: apt(k).pos, icao: k }; }
  return { pos, icao: '' };
}

/** Where a flight is, in lon/lat with heading and altitude above the sea (m), from the airport scene when close. */
function v3dWhere(f: LiveFlight): { lon: number; lat: number; hdg: number; altM: number; onGround: boolean; phase: string; vs?: number; turn?: number; smooth?: boolean } {
  const sc = V3d.aptScene;
  if (sc && sc.L && sc.planes) {
    const p: ApvPlane = sc.planes.filter((x: ApvPlane) => x.id === f.id)[0];
    if (p) { const ll = sc.lonLat(p.x, p.y); return { lon: ll[0], lat: ll[1], hdg: p.hdg, altM: (sc.L.alt || 0) + (p.alt || 0) * 0.3048, onGround: (p.alt || 0) < 3, phase: p.phase, smooth: true }; }
  }
  const F: any = f;
  let pos: number[], hdg = f.hdg || 0, altFt = f.alt || 0, vs: number = F.vs || 0, turn = 0, smooth = false;
  if (f.real && f.pos) pos = f.pos;
  else {
    const now = Date.now(), pp = F.depAt ? flightPathPos(f, now) : null;
    if (pp) {
      pos = pp.pos; hdg = pp.hdg; smooth = true;
      // every frame from the flight's own profile: the height (not the once-a-second value), the climb or
      // descent, and a heading and turn rate taken over a few seconds so corners in the route are flown smoothly
      try {
        const prof = F.coop ? flightProfile(F.typeId, f.from, f.to, F.depAt) : aiProfile(F);
        const at = (ms: number) => profileAt(prof, flightEl(F, ms).el);
        const q0 = at(now - 2000), q1 = at(now), q2 = at(now + 2000);
        altFt = q1.alt; vs = (q2.alt - q0.alt) / 4 * 60;
        const a = flightPathPos(f, now - 4000), b = flightPathPos(f, now + 4000);
        if (a && b && gcDistanceNm(a.pos, b.pos) > 0.01) {
          hdg = geoBrg(a.pos, b.pos);
          const a2 = flightPathPos(f, now - 8000), b2 = flightPathPos(f, now + 8000);
          if (a2 && b2) { const h1 = geoBrg(a2.pos, pos), h2 = geoBrg(pos, b2.pos); turn = (((h2 - h1) + 540) % 360 - 180) / 8; }   // degrees a second
        }
      } catch (e) { /* the once-a-second values */ }
    } else { const A = apt(f.from), B = apt(f.noDest ? f.from : f.to); pos = gcInterpolate(A.pos, B.pos, f.t); hdg = geoBrg(A.pos, B.pos); }
  }
  return { lon: pos[0], lat: pos[1], hdg, altM: altFt * 0.3048, onGround: altFt < 50, phase: String(f.phase || ''), vs, turn, smooth };
}

/* ---------- the ground: see v3d-terrain.ts ---------- */
function v3dGround(lon: number, lat: number): number { return V3dTerrain.ground(lon, lat); }

/* ---------- the airport ---------- */

function v3dBuildAirport(L: AirportLayout) {
  const T = THREE, g = new T.Group(), e = L.alt || 0;
  const loc = (x: number, y: number) => { const ll = [L.lon + x / (111320 * Math.cos(L.lat * D2R)), L.lat + y / 110540]; return v3dXY(ll[0], ll[1]); };
  const flat = (pts: number[][], y: number, mat: any) => {
    const sh = new T.Shape(pts.map(p => { const q = loc(p[0], p[1]); return new T.Vector2(q[0], -q[1]); }));
    const geo = new T.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0);
    g.add(new T.Mesh(geo, mat));
  };
  const mApron = new T.MeshBasicMaterial({ color: 0x24303D }), mTaxi = new T.MeshBasicMaterial({ color: 0x2F3B49 }), mLine = new T.MeshBasicMaterial({ color: 0xE2B33C });
  const mBuild = new T.MeshLambertMaterial({ color: 0x55667C });
  for (const a of L.areas || []) {
    if (a.pts.length < 3) continue;
    if (a.k === 'apron') flat(a.pts, e + 0.15, mApron);
    else {
      const sh = new T.Shape(a.pts.map(p => { const q = loc(p[0], p[1]); return new T.Vector2(q[0], -q[1]); }));
      const geo = new T.ExtrudeGeometry(sh, { depth: 14, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, e, 0);
      g.add(new T.Mesh(geo, mBuild));
    }
  }
  // taxiways as ribbons, all in one mesh, with their yellow centre lines
  const rib = (mat: any, wk: number, yOff: number, types: number[]) => {
    const pos: number[] = [];
    for (const p of L.paths) {
      if (types.indexOf(p[0]) < 0) continue;
      const A = L.points[p[2]], B = L.points[p[3]]; if (!A || !B) continue;
      const a = loc(A[0], A[1]), b = loc(B[0], B[1]), dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, w = (wk ? Math.max(0.3, wk) : Math.max(8, p[1] || 18)) / 2;
      const nx = -dz / len * w, nz = dx / len * w, y = e + yOff;
      pos.push(a[0] + nx, y, a[1] + nz, b[0] + nx, y, b[1] + nz, a[0] - nx, y, a[1] - nz, a[0] - nx, y, a[1] - nz, b[0] + nx, y, b[1] + nz, b[0] - nx, y, b[1] - nz);
    }
    if (!pos.length) return;
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    const m = new T.Mesh(geo, mat); m.material.side = T.DoubleSide; g.add(m);
  };
  rib(mTaxi, 0, 0.25, [1, 4, 9, 3]);
  rib(mLine, 0.35, 0.3, [1, 4]);
  // runways: asphalt with white markings, painted once
  for (const r of L.runways) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 1024; const c = cv.getContext('2d');
    c.fillStyle = '#2B323B'; c.fillRect(0, 0, 64, 1024);
    c.fillStyle = '#E8ECF0';
    for (let y = 60; y < 964; y += 34) c.fillRect(31, y, 2, 18);                         // centre line
    for (const end of [0, 1]) for (let k = 0; k < 8; k++) c.fillRect(6 + k * 7 - (k > 3 ? -2 : 0), end ? 1024 - 46 : 8, 3, 38);   // threshold bars
    c.fillRect(1, 0, 1.5, 1024); c.fillRect(61.5, 0, 1.5, 1024);                      // edges
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const geo = new T.PlaneGeometry(r.wid || 45, r.len); geo.rotateX(-Math.PI / 2);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex }));
    const q = v3dXY(r.lon, r.lat); m.position.set(q[0], e + 0.4, q[1]); m.rotation.y = -r.hdg * D2R;
    g.add(m);
  }
  if (V3d.airport) { V3d.scene.remove(V3d.airport); V3d.airport.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); }); }
  V3d.airport = g; V3d.scene.add(g);
}

/** Centre the view on an airport (its layout, its aircraft on the ground) or on open country. */
function v3dRecentre(f: LiveFlight, w: { lon: number; lat: number }) {
  const ctr = v3dCentre(f, [w.lon, w.lat]);
  V3d.origin = ctr.pos.slice(); V3d.icao = ctr.icao; V3d.elev = 0;
  if (V3d.airport) { V3d.scene.remove(V3d.airport); V3d.airport = null; }
  V3d.aptScene = null;
  if (ctr.icao) {
    const m = V3d.map || _curMap();
    try { V3d.aptScene = m ? (m.scenes[ctr.icao] || (m.scenes[ctr.icao] = makeAirportScene(ctr.icao, m))) : null; } catch (e) { V3d.aptScene = null; }
    AirportLayouts.get(ctr.icao, (better: AirportLayout) => { if (better && V3d.open && V3d.icao === ctr.icao) { V3d.elev = better.alt || 0; v3dBuildAirport(better); } })
      .then((L: AirportLayout) => { if (L && V3d.open && V3d.icao === ctr.icao) { V3d.elev = L.alt || 0; v3dBuildAirport(L); V3d.aptReady = true; V3dTerrain.prog.got++; V3dTerrain.load(V3d.origin); } })
      .catch(() => V3dTerrain.load(V3d.origin));
  } else V3dTerrain.load(V3d.origin);
  // every aircraft moves to the new centre
  for (const id in V3d.planes) V3d.planes[id].pos = null;
}

/* ---------- each frame ---------- */

function v3dLoop(now: number) {
  if (!V3d.open) return;
  V3d.raf = requestAnimationFrame(v3dLoop);
  if (document.hidden || now - V3d.last < 1000 / V3D_FPS - 2) return;
  const dt = V3d.last ? Math.min(0.2, (now - V3d.last) / 1000) : 0; V3d.last = now;
  const T = THREE, f = State.live.filter(x => x.id === V3d.target)[0];
  if (!f) { const st = V3d.root.querySelector('.v3d-status'); if (st) st.textContent = 'This flight has ended'; V3d.r.render(V3d.scene, V3d.cam); return; }
  const w0 = v3dWhere(f);
  // the centre: follow the aircraft to the next airport, or move with it over open country
  const ctr = v3dCentre(f, [w0.lon, w0.lat]);
  if (!V3d.origin || ctr.icao !== V3d.icao || (!ctr.icao && gcDistanceNm(V3d.origin, [w0.lon, w0.lat]) > 14)) v3dRecentre(f, w0);
  if (V3d.aptScene && V3d.aptScene.L) { try { V3d.aptScene.computePlanes(Date.now()); } catch (e) { /* not ready */ } }
  v3dLoaderTick(now);

  // aircraft within about 40 km
  const seen: { [id: string]: boolean } = {};
  for (const g of State.live) {
    const w = g.id === f.id ? w0 : v3dWhere(g);
    const q = v3dXY(w.lon, w.lat); if (Math.hypot(q[0], q[1]) > 40000 && g.id !== f.id) continue;
    seen[g.id] = true;
    let P = V3d.planes[g.id];
    const typeId = flightTypeId(g);
    if (!P) {
      const a = plane(g.reg), c = a ? company(a.companyId) : company();
      // the model is built from its nose; a pivot in its middle places and turns it
      const body = buildAircraftModel(typeId, liveryFor(c.color, c.color2, c.id)), model = new T.Group();
      body.position.x = -shapeOf(typeId).L / 2; model.add(body); model.userData.flightId = g.id; model.userData.set = body.userData.set;
      V3d.scene.add(model);
      const lab = document.createElement('span'); lab.className = 'v3d-lab'; lab.textContent = g.callsign; V3d.root.querySelector('.v3d-labels').appendChild(lab);
      P = V3d.planes[g.id] = { id: g.id, model, type: typeId, pos: null, tgt: new T.Vector3(), hdg: w.hdg, tgtHdg: w.hdg, bank: 0, pitch: 0, flaps: 0, gear: 1, label: lab, seen: now };
    }
    const s = shapeOf(P.type);
    // never below the ground (or the runway), wheels on it when rolling
    const ground = V3d.icao && Math.hypot(q[0], q[1]) < 3500 ? V3d.elev : v3dGround(w.lon, w.lat);
    const y = w.onGround ? ground : Math.max(ground + 2, w.altM);
    P.tgt.set(q[0], y - v3dCurve(q[0], q[1]), q[1]);
    if (!P.pos) P.pos = P.tgt.clone();
    // a hired pilot's flight is worked out every frame, so it is placed exactly; your own flight's position
    // comes from the simulator a few times a second, so it glides to each new one
    if (w.smooth || P.pos.distanceTo(P.tgt) > 3000) P.pos.copy(P.tgt); else P.pos.lerp(P.tgt, Math.min(1, dt * 4));
    let dh = ((w.hdg - P.hdg + 540) % 360) - 180;
    P.hdg = w.smooth ? (P.hdg + dh * Math.min(1, dt * 6) + 360) % 360 : (P.hdg + dh * Math.min(1, dt * 2.5) + 360) % 360;
    // bank from the rate of turn (a standard-rate turn, 3° a second, is about 25° of bank in an airliner)
    const wantBank = w.smooth && w.turn != null ? clamp(w.turn * 8, -25, 25) : clamp(dh * 1.6, -25, 25);
    P.bank += (wantBank * (w.onGround ? 0 : 1) - P.bank) * Math.min(1, dt * 1.2);
    const vs = w.vs != null ? w.vs : (g as any).vs || 0, gs = Math.max(60, g.gs || 140);
    P.pitch += (clamp(Math.atan2(vs / 196.85, gs * 0.5144) / D2R + (w.onGround ? 0 : 2.5), -6, 15) - P.pitch) * Math.min(1, dt * 1.5);
    // flaps and gear by phase (the type's own speeds in flight-configs when available)
    const ph = w.phase.toLowerCase();
    const cfg = flightConfig(P.type, ph, (g as any).ias || g.gs || 0, (w.altM - ground) / 0.3048, w.onGround);
    // your own flight: the flaps and gear as they are in the simulator
    const simCfg = g.you && g.real && Link.sim && Link.sim.lat ? { f: clamp((Link.sim.flapsIndex || 0) / Math.max(1, (configSpec(P.type) || { flaps: [1, 2, 3, 4] } as any).flaps.length), 0, 1), g: Link.sim.gearDown ? 1 : 0 } : null;
    const wantF = simCfg ? simCfg.f : cfg ? cfg.flaps : /final|landing|touchdown|roll/.test(ph) ? 1 : /approach|take-?off|lift-?off/.test(ph) ? 0.4 : /taxi|pushback|gate|boarding/.test(ph) ? (/out/.test(ph) ? 0.3 : 0) : 0;
    const wantG = simCfg ? simCfg.g : cfg ? cfg.gear : w.onGround || /final|landing|touchdown|lift-?off|take-?off/.test(ph) || (w.altM - ground < 600 && !/cruise|climb/.test(ph)) ? 1 : 0;
    P.flaps += (wantF - P.flaps) * Math.min(1, dt * 0.35); P.gear += (wantG - P.gear) * Math.min(1, dt * 0.25);
    P.model.userData.set({ flaps: P.flaps, gear: P.gear, spin: now / 18 });
    // place it: nose (−x of the model) along the heading, centre of the fuselage at the right height
    P.model.position.copy(P.pos);
    P.model.rotation.set(0, 0, 0);
    P.model.rotateY(-(P.hdg + 90) * D2R);
    P.model.rotateZ(-P.pitch * D2R);   // nose up
    P.model.rotateX(P.bank * D2R);
    void s;
  }
  for (const id in V3d.planes) if (!seen[id]) { const P = V3d.planes[id]; V3d.scene.remove(P.model); P.label.remove(); delete V3d.planes[id]; }

  // the camera follows the aircraft
  const P = V3d.planes[f.id];
  if (P) {
    const s = shapeOf(P.type), centre = P.pos.clone().add(new T.Vector3(0, s.ground + s.h / 2, 0));
    const fwd = new T.Vector3(Math.sin(P.hdg * D2R), 0, -Math.cos(P.hdg * D2R));
    if (V3d.mode === 'tower' && V3d.icao) {
      const tw = new T.Vector3(380, V3d.elev + 45, -260);
      const want = V3d.dist ? centre.clone().add(tw.clone().sub(centre).normalize().multiplyScalar(V3d.dist)) : tw;
      V3d.cam.position.lerp(want, Math.min(1, dt * 3));
      V3d.cam.lookAt(centre);
      const d = V3d.cam.position.distanceTo(centre);
      V3d.cam.fov = clamp(2 * Math.atan(s.span * 2.2 / d) / D2R, 3, 55); V3d.cam.updateProjectionMatrix();
    } else {
      const d = v3dDist(), base = V3d.mode === 'chase' ? Math.atan2(fwd.x, fwd.z) + Math.PI : Math.atan2(fwd.x, fwd.z) + Math.PI / 2;
      // the camera is fixed to the aircraft; only its angle around it follows the heading, gently
      const VA: any = V3d; if (VA.camBase == null) VA.camBase = base;
      VA.camBase += ((((base - VA.camBase) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 2.5);
      const a = VA.camBase + V3d.yaw, el = V3d.pitch;
      const want = centre.clone().add(new T.Vector3(Math.sin(a) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(a) * Math.cos(el) * d));
      const ll = v3dLonLat(want.x, want.z), gr = v3dGround(ll[0], ll[1]) + 3 - v3dCurve(want.x, want.z);
      if (want.y < gr) want.y = gr;
      V3d.cam.position.copy(want);
      V3d.cam.lookAt(centre);
      if (V3d.cam.fov !== 50) { V3d.cam.fov = 50; V3d.cam.updateProjectionMatrix(); }
    }
  }
  V3d.r.render(V3d.scene, V3d.cam);

  // callsigns over the aircraft
  const v = new T.Vector3();
  for (const id in V3d.planes) {
    const Q = V3d.planes[id], s = shapeOf(Q.type);
    v.copy(Q.pos); v.y += s.H + 4; v.project(V3d.cam);
    const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    Q.label.style.display = on ? '' : 'none';
    if (on) { Q.label.style.transform = `translate(${((v.x + 1) / 2 * innerWidth).toFixed(0)}px, ${((1 - v.y) / 2 * innerHeight).toFixed(0)}px) translate(-50%, -100%)`; Q.label.classList.toggle('on', id === V3d.target); }
  }
  // the details card keeps up with the flight once a second
  if (Math.floor(now / 1000) !== V3d.infoT) { V3d.infoT = Math.floor(now / 1000); v3dRefreshInfo(f); }
}

function v3dLonLat(x: number, z: number): number[] { const o = V3d.origin; return [o[0] + x / (111320 * Math.cos(o[1] * D2R)), o[1] - z / 110540]; }

function v3dRefreshInfo(f: LiveFlight) {
  const box = V3d.root && V3d.root.querySelector('.v3d-info .sel-pop') as HTMLElement; if (!box) return;
  const card = box.querySelector('.flight-card'); if (!card) return;
  const tmp = document.createElement('div'); tmp.innerHTML = flightCard(f);
  const fresh = tmp.querySelector('.flight-card');
  const g0 = card.querySelector('.fc-grid'), g1 = fresh && fresh.querySelector('.fc-grid');
  if (g0 && g1) g0.innerHTML = g1.innerHTML;
  const st = V3d.root.querySelector('.v3d-status'); if (st) st.textContent = V3d.icao ? `${V3d.icao} · ${apt(V3d.icao).name}` : `${f.from} → ${f.noDest ? '…' : f.to}`;
}

/* ---------- the details window can be dragged anywhere ---------- */
// Grab a flight's details card by its top line and move it; it stays where you put it.
(function dragDetails() {
  let drag: { box: HTMLElement; x: number; y: number; ox: number; oy: number; id: number } = null;
  const off = (box: HTMLElement) => { const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(box.style.transform || ''); return m ? [+m[1], +m[2]] : [0, 0]; };
  document.addEventListener('pointerdown', e => {
    const t = e.target as HTMLElement;
    const head = t && t.closest && t.closest('.sel-pop .fc-top, .sel-pop .fc-route') as HTMLElement;
    if (!head || (t.closest('button') && !t.closest('.fc-top'))) return;
    const box = head.closest('.sel-pop').parentElement as HTMLElement; if (!box) return;
    const o = off(box);
    drag = { box, x: e.clientX, y: e.clientY, ox: o[0], oy: o[1], id: e.pointerId };
    box.classList.add('dragging');
    e.preventDefault();
  }, true);
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const r = drag.box.getBoundingClientRect(), o = off(drag.box);
    let x = drag.ox + e.clientX - drag.x, y = drag.oy + e.clientY - drag.y;
    // keep it on the screen
    const left = r.left - o[0], top = r.top - o[1];
    x = clamp(x, -left + 4, innerWidth - left - r.width - 4); y = clamp(y, -top + 4, innerHeight - top - 60);
    drag.box.style.transform = `translate(${x}px, ${y}px)`;
  });
  const end = () => { if (drag) { drag.box.classList.remove('dragging'); drag = null; } };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();

/* ---------- loading: the start-up screen, livelier, until the ground and the airport are there ---------- */
function v3dLoaderHtml(): string {
  return `<div class="v3d-load splash">
    <div class="spl-glow"></div>
    <svg class="v3l-hills" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true"><path d="M0 220 L0 150 L90 95 L160 130 L260 40 L340 110 L420 70 L520 140 L610 60 L700 120 L790 30 L880 115 L960 80 L1060 140 L1140 90 L1200 120 L1200 220 Z"/><path class="far" d="M0 220 L0 170 L120 120 L230 160 L330 100 L470 165 L560 115 L680 170 L800 105 L930 160 L1050 110 L1200 150 L1200 220 Z"/></svg>
    <div class="v3l-orbit"><i></i><i></i><i></i></div>
    <div class="spl-mark">${splashLogo()}</div>
    <div class="spl-name"><b>3D view</b></div>
    <div class="spl-load">
      <div class="spl-info"><span class="spl-step">Loading the mountains and the sea…</span><b class="spl-pct">0%</b></div>
      <div class="spl-bar"><i class="spl-fill"><span class="spl-sheen"></span></i><span class="spl-tip"><svg viewBox="0 0 24 24"><path d="M21 15.5v-1.8l-8-5V3.6a1.5 1.5 0 0 0-3 0v5.1l-8 5v1.8l8-2.5v5l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z"/></svg></span></div>
    </div></div>`;
}
const V3D_SPLASH_MS = 5000;   // the 3D loading screen shows at least this long
function v3dLoaderTick(now: number) {
  const L = V3d.root && V3d.root.querySelector('.v3d-load') as HTMLElement; if (!L || V3d.loaded) return;
  const pr = V3dTerrain.prog, k = clamp(pr.got / Math.max(1, pr.want), 0, 1);
  // shown at least 5 seconds; done when the near ground (and the airport) are built, or after 20 s
  const near = V3dTerrain.rings.length > 0 && (!V3d.icao || V3d.aptReady), t = now - V3d.loadT0;
  // the loading screen stays at least 5 seconds; its bar never runs ahead of that, so it fills smoothly
  const shown = Math.min(near ? 1 : Math.min(0.97, k * 0.9 + Math.min(0.08, t / 40000)), t / V3D_SPLASH_MS);
  V3d.shown = Math.max(V3d.shown || 0, shown);
  const fill = L.querySelector('.spl-fill') as HTMLElement, tip = L.querySelector('.spl-tip') as HTMLElement, pct = L.querySelector('.spl-pct') as HTMLElement, step = L.querySelector('.spl-step') as HTMLElement;
  if (fill) fill.style.width = (V3d.shown * 100).toFixed(1) + '%';
  if (tip) tip.style.left = (V3d.shown * 100).toFixed(1) + '%';
  if (pct) pct.textContent = Math.round(V3d.shown * 100) + '%';
  if (step) step.textContent = V3d.shown < 0.5 ? 'Loading the mountains and the sea…' : V3d.shown < 0.9 ? (V3d.icao ? `Building ${V3d.icao}…` : 'Painting the coastlines…') : 'Ready';
  if ((near && t >= V3D_SPLASH_MS) || t > 20000) {
    V3d.loaded = true; L.classList.add('out'); setTimeout(() => L.remove(), 800);
  }
}
