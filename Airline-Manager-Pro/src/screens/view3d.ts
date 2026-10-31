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

/** Open the 3D view at an airport (from its card on the map), with the free camera, aircraft or not. */
function v3dOpenAirport(icao: string) {
  if (!v3dSupported()) { toast('3D isn\'t available on this device', 'warn'); return; }
  const m = _curMap(); v3dOpen('apt:' + icao, m, m ? m.el : null);
}
ACTIONS['apt-3d'] = el => v3dOpenAirport(el.getAttribute('data-icao'));
/** At an airport without following an aircraft: a stand-in "flight" parked at the airport. */
function v3dAptOnly(): any { const k = String(V3d.target || ''); if (k.indexOf('apt:') !== 0) return null; const icao = k.slice(4), A = apt(icao); return A ? { id: k, from: icao, to: icao, real: true, pos: A.pos, alt: 0, hdg: 0, phase: 'Parked', callsign: icao } : null; }
function v3dOpen(id: string, map: WorldMap, from?: HTMLElement) {
  const T = THREE;
  v3dClose();
  V3d.aptReady = false; V3d.loadT0 = performance.now(); V3d.loaded = false;
  v3dCrashGuard(true);
  document.body.classList.add('v3d-on');   // pop-ups and messages show above the 3D view
  V3d.open = true; V3d.target = id; (V3d as any).camBase = null; V3d.map = map; V3d.planes = {}; V3d.origin = null; V3d.icao = '';
  V3d.mode = id.indexOf('apt:') === 0 ? 'free' : 'chase'; V3d.yaw = 0; V3d.pitch = 0.22; V3d.dist = 0; (V3d as any).fc = null; (V3d as any).fcStart = id.indexOf('apt:') === 0;
  const root = document.createElement('div'); root.className = 'v3d' + (id.indexOf('apt:') === 0 ? ' v3d-free v3d-aptonly' : '') + (DESKTOP ? ' v3d-pc' : '');
  root.innerHTML = `<canvas class="v3d-cv"></canvas><div class="v3d-labels"></div>
    <div class="v3d-top"><button class="icon-btn" data-act="v3d-close" aria-label="Close the 3D view">${icon('close')}</button>
      <div class="v3d-modes">${[['chase', 'Behind'], ['side', 'Around'], ['tower', 'Tower'], ['free', 'Free camera']].map(([k, l]) => `<button class="v3d-m ${k === 'chase' ? 'on' : ''}" data-act="v3d-mode" data-m="${k}">${l}</button>`).join('')}</div>
      <div class="v3d-pick"><button class="icon-btn" data-act="v3d-next" data-d="-1" aria-label="Previous aircraft">${icon('chevron', 'flip')}</button><span class="v3d-name"></span><button class="icon-btn" data-act="v3d-next" data-d="1" aria-label="Next aircraft">${icon('chevron')}</button></div></div>
    <div class="v3d-info"></div>
    <div class="v3d-status"></div>
    <button class="v3d-sat ${(State.settings as any).v3dSat ? 'on' : ''}" data-act="v3d-sat">${icon('map')}Satellite</button>
    <div class="v3d-free-ui">
      <div class="fc-stick" data-fc="stick"><i></i><small>Move</small></div>
      <div class="fc-ud"><button class="fc-btn" data-fc="up" aria-label="Climb">${icon('down', 'flip-v')}</button><small>Height</small><button class="fc-btn" data-fc="down" aria-label="Sink">${icon('down')}</button></div>
      <div class="fc-speed"><small>Speed</small><input type="range" class="fc-spd" min="0" max="100" value="${Math.round((Math.log((State.settings as any).v3dFreeSpeed || 1) / Math.log(8) + 1) * 50)}"><b class="fc-spd-v">${((State.settings as any).v3dFreeSpeed || 1).toFixed(1)}×</b></div>
      <button class="fc-help-btn" data-act="fc-help" aria-label="Controls">?</button>
      <div class="fc-help"><b>Free camera</b>
        ${DESKTOP ? `<span><i>Click</i>Capture the mouse</span><span><i>Esc</i>Exit the free camera, back to the map</span><span><i>Mouse</i>Look around</span><span><i>W A S D</i>Forward, back and sideways</span><span><i>Space / C</i>Climb and sink (also E and Q)</span><span><i>Shift</i>Faster while held</span><span><i>Wheel</i>Movement speed</span><span><i>Arrows</i>Look around without the mouse</span>`
          : `<span><i>One finger</i>Look around</span><span><i>Left stick</i>Move forward, back and sideways</span><span><i>Height buttons</i>Climb and sink</span><span><i>Two fingers</i>Slide, or pinch to fly forward and back</span><span><i>Speed</i>How fast you move (faster the higher you fly)</span>`}
        <span><i>Close</i>Back to the Overview</span></div>
      ${DESKTOP ? '<div class="fc-pc-hint">Click to look around with the mouse · W A S D to move</div><div class="fc-esc"><kbd>Esc</kbd><span>Exit the free camera</span></div>' : ''}
    </div>
    ${Mode.coop() ? '' : `<button class="v3d-sat v3d-tfc tfc-btn ${Traffic.on() ? 'on' : ''}" data-act="tfc-toggle">${icon('fleet')}Other airlines</button>`}
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
  V3d.open = false; cancelAnimationFrame(V3d.raf); document.body.classList.remove('v3d-on');
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  v3dCrashGuard(false);
  removeEventListener('resize', v3dSize);
  try {
    V3d.scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m: any) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    V3d.r.dispose(); V3d.r.forceContextLoss && V3d.r.forceContextLoss();
  } catch (e) { /* gone */ }
  if (V3d.root) V3d.root.remove();
  try { V3dTerrain.clear(); V3dTerrain.gen++; } catch (e) { /* none */ }
  V3d.root = null; V3d.terrain = null; V3d.airport = null; V3d.aptScene = null; V3d.planes = {};
}
// closing from the free camera: back to the normal Overview
ACTIONS['v3d-close'] = () => { const free = V3d.mode === 'free'; (V3d as any).fcLeaving = true; v3dClose(); (V3d as any).fcLeaving = false; if (free) { try { closeAll(); go('ops'); } catch (e) { /* ignore */ } } };
ACTIONS['v3d-mode'] = el => {
  V3d.mode = el.getAttribute('data-m'); Sound.tick();
  if (V3d.mode === 'free') { v3dFreeStart(); v3dFreeUiBind(); }
  else { (V3d as any).fcLeaving = true; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ } setTimeout(() => { (V3d as any).fcLeaving = false; }, 300); }
  V3d.root.classList.toggle('v3d-free', V3d.mode === 'free');
  V3d.yaw = V3d.mode === 'side' ? 1.2 : 0; V3d.pitch = V3d.mode === 'side' ? 0.15 : 0.22; V3d.dist = 0; (V3d as any).panX = 0; (V3d as any).panY = 0;
  V3d.root.querySelectorAll('[data-act=v3d-mode]').forEach((b: Element) => b.classList.toggle('on', b.getAttribute('data-m') === V3d.mode));
};
ACTIONS['v3d-next'] = el => {
  const list = liveOf(), i = list.findIndex(f => f.id === V3d.target), d = +el.getAttribute('data-d');
  if (!list.length) return;
  if (V3d.root) V3d.root.classList.remove('v3d-aptonly');   // from an airport on to an aircraft: the usual view
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
  cv.addEventListener('webglcontextlost', (e: Event) => { e.preventDefault(); if (!V3d.open) return;   // closing the view lets go of the graphics on purpose
    try { ErrorLog.add('3d', 'The 3D view lost its graphics', `Satellite detail ${v3dSatQ()}`, 'WebGL context lost'); } catch (x) { /* ignore */ } const S: any = State.settings; if ((S.v3dSatQ || 0) > 0) { S.v3dSatQ--; Store.soon(); } v3dClose(); toast('The 3D view ran out of graphics memory and closed. Satellite detail was lowered one step.', 'warn'); });
  cv.addEventListener('pointerdown', (e: PointerEvent) => {
    cv.setPointerCapture(e.pointerId); V3d.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
    const ids = Object.keys(V3d.ptrs);
    if (ids.length === 2) { const a = V3d.ptrs[ids[0]], b = V3d.ptrs[ids[1]]; V3d.pinch0 = Math.hypot(a.x - b.x, a.y - b.y); V3d.dist0 = v3dDist(); }
  });
  cv.addEventListener('pointermove', (e: PointerEvent) => {
    const p = V3d.ptrs[e.pointerId]; if (!p) return;
    const ids = Object.keys(V3d.ptrs);
    if (V3d.mode === 'free') { v3dFreeGesture(e, p, ids); p.x = e.clientX; p.y = e.clientY; return; }
    if (ids.length === 1) { V3d.yaw -= (e.clientX - p.x) * 0.007; V3d.pitch = clamp(V3d.pitch + (e.clientY - p.y) * 0.005, -0.6, 1.5); }
    if (ids.length === 2) { const VA: any = V3d; VA.panX = (VA.panX || 0) - (e.clientX - p.x) * 0.5 / 2; VA.panY = (VA.panY || 0) + (e.clientY - p.y) * 0.5 / 2; }
    p.x = e.clientX; p.y = e.clientY;
    if (ids.length === 2) { const a = V3d.ptrs[ids[0]], b = V3d.ptrs[ids[1]]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (V3d.pinch0) V3d.dist = clamp(V3d.dist0 * V3d.pinch0 / d, 8, 30000); }
  });
  const up = (e: PointerEvent) => {
    const p = V3d.ptrs[e.pointerId];
    if (p && V3d.mode !== 'free' && Object.keys(V3d.ptrs).length === 1 && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6) v3dTap(e.clientX, e.clientY);
    if (V3d.mode === 'free') (V3d as any).fcPinch = 0;
    delete V3d.ptrs[e.pointerId];
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', (e: PointerEvent) => { delete V3d.ptrs[e.pointerId]; });
  if (DESKTOP) {
    cv.addEventListener('click', () => { if (V3d.mode === 'free' && document.pointerLockElement !== cv) { try { (cv as any).requestPointerLock(); } catch (e) { /* not allowed */ } } });
    document.addEventListener('mousemove', (e: MouseEvent) => { const F = fc(); if (!F || V3d.mode !== 'free' || document.pointerLockElement !== cv) return; F.yaw += e.movementX * 0.0025; F.pitch = clamp(F.pitch - e.movementY * 0.0025, -1.5, 1.4); });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === cv; if (V3d.root) V3d.root.classList.toggle('fc-locked', locked);
      if (!locked && V3d.open && V3d.mode === 'free' && !(V3d as any).fcLeaving) setTimeout(() => { if (V3d.open && V3d.mode === 'free' && document.hasFocus() && !document.hidden) ACTIONS['v3d-close'](null as any, null as any); }, 120);
    });
    document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape' && V3d.open && V3d.mode === 'free') { e.preventDefault(); ACTIONS['v3d-close'](null as any, null as any); } });
  }
  cv.addEventListener('wheel', (e: WheelEvent) => { e.preventDefault(); if (V3d.mode === 'free') {
    if (DESKTOP) { const S: any = State.settings, m = clamp((S.v3dFreeSpeed || 1) * (e.deltaY > 0 ? 1 / 1.25 : 1.25), 0.125, 8); S.v3dFreeSpeed = Math.round(m * 100) / 100; const o = V3d.root.querySelector('.fc-spd-v'), sp = V3d.root.querySelector('.fc-spd') as HTMLInputElement; if (o) o.textContent = m.toFixed(1) + '×'; if (sp) sp.value = String(Math.round((Math.log(m) / Math.log(8) + 1) * 50)); Store.soon(); return; }
    v3dFreePush(0, 0, (e.deltaY > 0 ? -1 : 1) * 2.2); return; } V3d.dist = clamp(v3dDist() * (e.deltaY > 0 ? 1.15 : 1 / 1.15), 8, 30000); }, { passive: false } as any);
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
  if (v3dAptOnly()) { const nm = V3d.root.querySelector('.v3d-name') as HTMLElement; if (nm) nm.textContent = String(V3d.target).slice(4); return; }
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
function v3dWhere(f: LiveFlight, nowIn?: number): { lon: number; lat: number; hdg: number; altM: number; onGround: boolean; phase: string; vs?: number; turn?: number; smooth?: boolean } {
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
    } else {
      const A = apt(f.from), B = apt(f.noDest ? f.from : f.to);
      // no drawn path: along the great circle, still worked out every frame from the flight's profile
      let fr = f.t;
      if (F.depAt && !f.noDest) { try { const prof = aiProfile(F), q = profileAt(prof, flightEl(F, now).el); fr = prof.routeNm > 0 ? clamp(q.d / prof.routeNm, 0, 1) : f.t; altFt = q.alt; smooth = true; } catch (e) { /* the once-a-second values */ } }
      pos = gcInterpolate(A.pos, B.pos, fr); hdg = geoBrg(gcInterpolate(A.pos, B.pos, Math.max(0, fr - 0.002)), gcInterpolate(A.pos, B.pos, Math.min(1, fr + 0.002)));
    }
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
  // runways: painted with the markings a runway of that size has (ICAO Annex 14), numbers always
  for (const r of L.runways) {
    if (r.surf === 9) continue;   // water runways have no paint
    const tex = new T.CanvasTexture(runwayMarkingsCanvas(r)); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = V3d.r ? V3d.r.capabilities.getMaxAnisotropy() : 4;
    const geo = new T.PlaneGeometry(r.wid || 45, r.len); geo.rotateX(-Math.PI / 2);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex }));
    const q = v3dXY(r.lon, r.lat); m.position.set(q[0], e + 0.4, q[1]); m.rotation.y = -r.hdg * D2R;
    g.add(m);
  }
  // hold short lines where taxiways meet a runway
  try { v3dHoldLines(L, g, loc, e); } catch (x) { /* never stop the view */ }
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
  const T = THREE, f: any = v3dAptOnly() || State.live.filter(x => x.id === V3d.target)[0];
  if (!f) { const st = V3d.root.querySelector('.v3d-status'); if (st) st.textContent = 'This flight has ended'; V3d.r.render(V3d.scene, V3d.cam); return; }
  const w0 = v3dWhere(f);
  // the centre: follow the aircraft to the next airport, or move with it over open country
  const ctr = v3dCentre(f, [w0.lon, w0.lat]);
  if (V3d.mode === 'free' && V3d.origin) v3dFreeRecentre();
  else if (!V3d.origin || ctr.icao !== V3d.icao || (!ctr.icao && gcDistanceNm(V3d.origin, [w0.lon, w0.lat]) > 14)) v3dRecentre(f, w0);
  if (V3d.aptScene && V3d.aptScene.L) { try { V3d.aptScene.computePlanes(Date.now()); } catch (e) { /* not ready */ } }
  v3dLoaderTick(now);

  // aircraft within about 40 km
  const seen: { [id: string]: boolean } = {};
  // other airlines' aircraft: only those near enough and in front of the camera are drawn
  const tfc = Traffic.live(), fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(V3d.cam.projectionMatrix, V3d.cam.matrixWorldInverse));
  const tfcNear = tfc.filter((g: any) => { const a = apt(g.from), b = apt(g.to); if (!a || !b || !V3d.origin) return false; const pp = flightPathPos(g); if (!pp) return false; g._ll = pp.pos; return gcDistanceNm(V3d.origin, pp.pos) < 24; });
  for (const g of (State.live as any[]).concat(tfcNear)) {
    const w = g.id === f.id ? w0 : v3dWhere(g);
    const q = v3dXY(w.lon, w.lat); if (Math.hypot(q[0], q[1]) > 40000 && g.id !== f.id) continue;
    if ((g as any).tfc) {
      const inView = fr.containsPoint(new T.Vector3(q[0], w.altM, q[1])) || fr.intersectsSphere(new T.Sphere(new T.Vector3(q[0], w.altM, q[1]), 80));
      if (!inView) { const P0 = V3d.planes[g.id]; if (P0) { seen[g.id] = true; P0.model.visible = false; P0.label.style.display = 'none'; } continue; }
    }
    seen[g.id] = true;
    let P = V3d.planes[g.id];
    if (P && (g as any).tfc && !P.model.visible) { P.model.visible = true; P.label.style.display = ''; }
    const typeId = flightTypeId(g);
    if (!P) {
      const a = plane(g.reg), c: any = a ? company(a.companyId) : (g as any).tfc ? { color: (g as any).tfc.color, color2: (g as any).tfc.color2, id: (g as any).tfc.airline } : company();
      // the model is built from its nose; a pivot in its middle places and turns it
      const body = buildAircraftModel(typeId, liveryFor(c.color, c.color2, c.id)), model = new T.Group();
      body.position.x = -shapeOf(typeId).L / 2; model.add(body); model.userData.flightId = g.id; model.userData.set = body.userData.set;
      V3d.scene.add(model);
      const lab = document.createElement('span'); lab.className = 'v3d-lab' + ((g as any).tfc ? ' tfc' : ''); lab.textContent = (g as any).tfc ? `${(g as any).tfc.airline} ${g.callsign}` : g.callsign; V3d.root.querySelector('.v3d-labels').appendChild(lab);
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
    if (w.smooth || P.pos.distanceTo(P.tgt) > 3000) P.pos.copy(P.tgt);
    else {
      // a new position arrives about once a second: work out the speed between updates and carry the
      // aircraft on at that speed, so it glides evenly instead of jumping to each update
      const PP: any = P, tnow = now / 1000;
      if (!PP.lastTgt || PP.lastTgt.distanceTo(P.tgt) > 0.3) {
        if (PP.lastTgt && PP.lastT && tnow - PP.lastT > 0.05 && tnow - PP.lastT < 5) {
          const v = P.tgt.clone().sub(PP.lastTgt).divideScalar(tnow - PP.lastT);
          PP.vel = PP.vel ? PP.vel.lerp(v, 0.5) : v;
        }
        PP.lastTgt = P.tgt.clone(); PP.lastT = tnow;
      }
      const ahead = PP.vel && PP.lastT ? Math.min(2, tnow - PP.lastT) : 0;
      const want = PP.vel ? P.tgt.clone().add(PP.vel.clone().multiplyScalar(ahead)) : P.tgt;
      P.pos.lerp(want, Math.min(1, dt * 6));
    }
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

  // the camera follows the aircraft (or flies freely)
  const P = V3d.planes[f.id];
  if ((V3d as any).fcStart && V3d.origin && V3dTerrain.rings.length) {
    (V3d as any).fcStart = false;
    V3d.cam.position.set(-700, (V3d.elev || 0) + 220, 700); V3d.cam.lookAt(0, V3d.elev || 0, 0); V3d.cam.updateMatrixWorld();
    v3dFreeStart(); v3dFreeUiBind();
  }
  if (V3d.mode === 'free') { if (fc()) v3dFreeStep(dt); }
  else if (P) {
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
      // two-finger slide: the view's centre moves sideways and up or down (within reach of the aircraft)
      const span = s.span || 35, px = clamp(VA.panX || 0, -span * 4, span * 4), py = clamp(VA.panY || 0, -span, span * 3); VA.panX = px; VA.panY = py;
      centre.add(new T.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(px)).add(new T.Vector3(0, py, 0));
      const want = centre.clone().add(new T.Vector3(Math.sin(a) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(a) * Math.cos(el) * d));
      // tilted all the way down the camera sits just above the ground, looking along it
      const ll = v3dLonLat(want.x, want.z), gr = v3dGround(ll[0], ll[1]) + 1.6 - v3dCurve(want.x, want.z);
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
  if (Math.floor(now / 1000) !== V3d.infoT && !v3dAptOnly()) { V3d.infoT = Math.floor(now / 1000); v3dRefreshInfo(f); }
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
  const satOn = !!(State.settings as any).v3dSat, q = satOn ? v3dSatQ() : 0;
  // with satellite imagery: the two nearest rings' pictures are loaded too (and on the graphics card)
  const satReady = !satOn || (pr.sat || 0) >= Math.min(2, V3dTerrain.rings.length || 2);
  const near = V3dTerrain.rings.length > 0 && (!V3d.icao || V3d.aptReady) && satReady, t = now - V3d.loadT0;
  const minMs = V3D_SPLASH_MS + q * 1500, maxMs = 20000 + q * 8000;
  // the loading screen stays at least 5 seconds; its bar never runs ahead of that, so it fills smoothly
  const shown = Math.min(near ? 1 : Math.min(0.97, k * 0.8 + (satOn ? Math.min(2, pr.sat || 0) * 0.05 : 0.1) + Math.min(0.07, t / 60000)), t / minMs);
  V3d.shown = Math.max(V3d.shown || 0, shown);
  const fill = L.querySelector('.spl-fill') as HTMLElement, tip = L.querySelector('.spl-tip') as HTMLElement, pct = L.querySelector('.spl-pct') as HTMLElement, step = L.querySelector('.spl-step') as HTMLElement;
  if (fill) fill.style.width = (V3d.shown * 100).toFixed(1) + '%';
  if (tip) tip.style.left = (V3d.shown * 100).toFixed(1) + '%';
  if (pct) pct.textContent = Math.round(V3d.shown * 100) + '%';
  if (step) step.textContent = V3d.shown < 0.45 ? 'Loading the mountains and the sea…' : satOn && !satReady ? `Loading satellite imagery${q >= 3 ? ' (highest detail)' : q >= 2 ? ' (very sharp)' : ''}…` : V3d.shown < 0.9 ? (V3d.icao ? `Building ${V3d.icao}…` : 'Painting the coastlines…') : 'Ready';
  if ((near && t >= minMs) || t > maxMs) {
    V3d.loaded = true; L.classList.add('out'); setTimeout(() => L.remove(), 800);
  }
}

/** Other airlines switched off: their aircraft leave the 3D scene at once. */
function v3dTrafficSync() {
  if (Traffic.on() || !V3d.planes) return;
  for (const id of Object.keys(V3d.planes)) if (/^tfc-/.test(id)) { const P = V3d.planes[id]; try { V3d.scene.remove(P.model); P.label.remove(); } catch (e) { /* ignore */ } delete V3d.planes[id]; }
}

/* ---------- free camera: fly around like a drone ---------- */
// One finger looks around, two fingers move (drag to slide, pinch to fly forward or back), the mouse wheel
// flies forward and back; on a PC also W A S D to move, Q and E (or R and F) to climb and sink, arrows to look.
// It moves with a little inertia and goes faster the higher it flies. The scene follows wherever it goes.
interface FreeCam { pos: any; yaw: number; pitch: number; vel: any; keys: { [k: string]: boolean } }
function fc(): FreeCam { return (V3d as any).fc; }
function v3dFreeStart() {
  const T = THREE, c = V3d.cam, dir = new T.Vector3(); c.getWorldDirection(dir);
  (V3d as any).fc = { pos: c.position.clone(), yaw: Math.atan2(dir.x, -dir.z), pitch: Math.asin(clamp(dir.y, -1, 1)), vel: new T.Vector3(), keys: {} } as FreeCam;
  if (V3d.cam.fov !== 60) { V3d.cam.fov = 60; V3d.cam.updateProjectionMatrix(); }
  if (!(V3d as any).fcKeys) {
    (V3d as any).fcKeys = true;
    const set = (e: KeyboardEvent, on: boolean) => { if (!V3d.open || V3d.mode !== 'free' || (e.target as HTMLElement).closest('input, textarea')) return; const k = e.key.toLowerCase(); if ('wasdqerfc'.indexOf(k) >= 0 || /^arrow/.test(k) || k === 'shift' || k === ' ') { fc().keys[k] = on; e.preventDefault(); } };
    document.addEventListener('keydown', e => set(e, true)); document.addEventListener('keyup', e => set(e, false));
  }
}
/** Height above the ground: the higher up, the faster it moves. */
function v3dFreeSpeed(): number { const F = fc(); if (!F) return 20; const ll = v3dLonLat(F.pos.x, F.pos.z), g = v3dGround(ll[0], ll[1]) - v3dCurve(F.pos.x, F.pos.z); return clamp((F.pos.y - g) * 0.9, 12, 2500); }
/** A push in the camera's own directions: right, up, forward (units of a second at the current speed). */
function v3dFreePush(right: number, up: number, fwd: number) {
  const F = fc(); if (!F) return; const T = THREE, s = v3dFreeSpeed();
  const f = new T.Vector3(Math.sin(F.yaw) * Math.cos(F.pitch), Math.sin(F.pitch), -Math.cos(F.yaw) * Math.cos(F.pitch)), r = new T.Vector3(Math.cos(F.yaw), 0, Math.sin(F.yaw));
  const m = (State.settings as any).v3dFreeSpeed || 1;
  F.vel.addScaledVector(f, fwd * s * m).addScaledVector(r, right * s * m).add(new T.Vector3(0, up * s * m, 0));
}
function v3dFreeGesture(e: PointerEvent, p: any, ids: string[]) {
  const F = fc(); if (!F) return; const dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (ids.length === 1) { F.yaw += dx * 0.0075; F.pitch = clamp(F.pitch - dy * 0.0065, -1.5, 1.4); return; }
  if (ids.length >= 2) {
    const a = V3d.ptrs[ids[0]], b = V3d.ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), VA: any = V3d;
    if (VA.fcPinch) v3dFreePush(0, 0, (d - VA.fcPinch) * 0.02);
    VA.fcPinch = d;
    // both fingers sliding together: move sideways and up or down
    v3dFreePush(-dx * 0.006, dy * 0.006, 0);
  }
}
function v3dFreeStep(dt: number) {
  const F = fc(); if (!F || !dt) return; const T = THREE, k = F.keys;
  // keys: steady thrust while held
  const kx = (k.d ? 1 : 0) - (k.a ? 1 : 0), ky = ((k.e || k.r || k[' ']) ? 1 : 0) - ((k.q || k.f || k.c) ? 1 : 0), kz = (k.w ? 1 : 0) - (k.s ? 1 : 0);
  const st: any = (V3d as any).fcStick || { x: 0, y: 0 }, hb = (V3d as any).fcHeight || 0;
  if (st.x || st.y || hb) v3dFreePush(st.x * dt * 3, hb * dt * 2.5, -st.y * dt * 3);
  if (kx || ky || kz) v3dFreePush(kx * dt * 3 * (k.shift ? 3 : 1), ky * dt * 3, kz * dt * 3 * (k.shift ? 3 : 1));
  if (k.arrowleft) F.yaw -= dt * 1.2; if (k.arrowright) F.yaw += dt * 1.2; if (k.arrowup) F.pitch = clamp(F.pitch + dt, -1.45, 1.2); if (k.arrowdown) F.pitch = clamp(F.pitch - dt, -1.45, 1.2);
  // drift, then ease to a stop like a drone in the air
  F.pos.addScaledVector(F.vel, dt); F.vel.multiplyScalar(Math.exp(-dt * 2.6));
  const ll = v3dLonLat(F.pos.x, F.pos.z), gr = v3dGround(ll[0], ll[1]) + 2 - v3dCurve(F.pos.x, F.pos.z);
  if (F.pos.y < gr) { F.pos.y = gr; if (F.vel.y < 0) F.vel.y = 0; }
  F.pos.y = Math.min(F.pos.y, 12000);
  V3d.cam.position.copy(F.pos);
  V3d.cam.lookAt(F.pos.clone().add(new T.Vector3(Math.sin(F.yaw) * Math.cos(F.pitch), Math.sin(F.pitch), -Math.cos(F.yaw) * Math.cos(F.pitch))));
}
/** Flown far from the centre: the scene (terrain, airport, aircraft) moves to where the camera is. */
function v3dFreeRecentre() {
  const F = fc(); if (!F) return;
  const ll = v3dLonLat(F.pos.x, F.pos.z); if (gcDistanceNm(V3d.origin, ll) < 10) return;
  // the nearest airport within a few miles becomes the centre, so its layout is drawn
  let icao = '', best = 4;
  for (const k of Object.keys(AIRPORTS)) { const A = apt(k); if (!A || !A.pos) continue; const d = gcDistanceNm(ll, A.pos); if (d < best) { best = d; icao = k; } }
  const centre = icao ? apt(icao).pos : ll, oldY = F.pos.y;
  v3dRecentre({ from: icao || '', to: icao || '', noDest: !icao } as any, { lon: centre[0], lat: centre[1] });
  if (!icao) { V3d.icao = ''; }
  const q = v3dXY(ll[0], ll[1]); F.pos.set(q[0], oldY, q[1]);
}

ACTIONS['fc-help'] = () => { const h = V3d.root && V3d.root.querySelector('.fc-help'); if (h) h.classList.toggle('on'); Sound.tick(); };
/** The on-screen stick, height buttons and speed slider of the free camera. */
function v3dFreeUiBind() {
  const root = V3d.root; if (!root || (root as any).fcBound) return; (root as any).fcBound = true;
  const stick = root.querySelector('.fc-stick') as HTMLElement, knob = stick && stick.querySelector('i') as HTMLElement;
  if (stick) {
    stick.style.touchAction = 'none';
    const mv = (e: PointerEvent) => { const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
      let x = (e.clientX - cx) / R, y = (e.clientY - cy) / R; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      (V3d as any).fcStick = { x, y }; if (knob) knob.style.transform = `translate(${x * R * 0.6}px, ${y * R * 0.6}px)`; };
    stick.addEventListener('pointerdown', e => { stick.setPointerCapture(e.pointerId); mv(e); e.stopPropagation(); });
    stick.addEventListener('pointermove', e => { if (stick.hasPointerCapture(e.pointerId)) mv(e); });
    const end = () => { (V3d as any).fcStick = { x: 0, y: 0 }; if (knob) knob.style.transform = ''; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  }
  root.querySelectorAll('.fc-btn').forEach((b: Element) => {
    const v = b.getAttribute('data-fc') === 'up' ? 1 : -1, B = b as HTMLElement; B.style.touchAction = 'none';
    B.addEventListener('pointerdown', e => { B.setPointerCapture(e.pointerId); (V3d as any).fcHeight = v; });
    const end = () => { (V3d as any).fcHeight = 0; }; B.addEventListener('pointerup', end); B.addEventListener('pointercancel', end);
  });
  const sp = root.querySelector('.fc-spd') as HTMLInputElement;
  if (sp) sp.addEventListener('input', () => { const m = Math.pow(8, +sp.value / 50 - 1); (State.settings as any).v3dFreeSpeed = Math.round(m * 10) / 10; const o = root.querySelector('.fc-spd-v'); if (o) o.textContent = m.toFixed(1) + '×'; Store.soon(); });
}

/** A runway's paint, drawn to scale: numbers (and L, C, R) at both ends, threshold stripes by width,
 *  centre line, and on longer runways the aiming point, touchdown zone and side stripes. Grass runways get
 *  only their numbers and white end markers. */
function runwayMarkingsCanvas(r: { len: number; wid: number; surf: number; a: string; b: string }): HTMLCanvasElement {
  const len = r.len || 2000, wid = r.wid || 45, grass = r.surf === 1;
  const k = Math.min(256 / wid, 8192 / len), W = Math.max(32, Math.round(wid * k)), H = Math.round(len * k);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const M = (m: number) => m * k;   // metres to pixels
  c.fillStyle = grass ? '#3D5A2E' : '#2B323B'; c.fillRect(0, 0, W, H);
  if (!grass) { for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * .05})`; c.fillRect(Math.random() * W, Math.random() * H, M(2 + Math.random() * 6), M(10 + Math.random() * 60)); } }   // wear and patches
  c.fillStyle = '#E8ECF0';
  // both ends: the 'a' end at the bottom (landing towards the top), the 'b' end at the top, turned round
  const end = (designator: string, top: boolean) => {
    c.save(); if (top) { c.translate(W, H); c.rotate(Math.PI); }
    let y = H - M(6);   // from the threshold inwards (upwards)
    if (grass) { c.fillRect(M(2), y - M(3), W - M(4), M(3)); y -= M(10); }
    else {
      // threshold stripes: their number follows the runway width
      const n = wid >= 60 ? 16 : wid >= 45 ? 12 : wid >= 30 ? 8 : wid >= 23 ? 6 : 4, sw = M(1.8), gap = (W - M(6) - n * sw) / (n + 1);
      for (let i = 0; i < n; i++) { const x = M(3) + gap * (i + 1) + sw * i + (i >= n / 2 ? gap * 0.6 : -gap * 0.3); c.fillRect(x, y - M(30), sw, M(30)); }
      y -= M(42);
    }
    // the runway number (and its letter): about 9 m tall, read when lined up for landing
    const m = /^(\d{1,2})([LCR]?)$/i.exec(String(designator || '').trim()), num = m ? m[1].padStart(2, '0') : String(designator || '').slice(0, 3), letter = m ? m[2].toUpperCase() : '';
    // ICAO: about 9 m tall and 3 m wide a character (smaller on narrow runways)
    const th = M(wid >= 30 ? 9 : wid >= 23 ? 7.5 : 6), cw = Math.min(M(wid >= 30 ? 3 : 2.4), W * 0.38 / 2);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = `700 100px Arial, Helvetica, sans-serif`;
    const draw = (t: string, yy: number) => {
      const mt = c.measureText(t), gh = (mt.actualBoundingBoxAscent || 72), gw = Math.max(1, mt.width);
      c.save(); c.translate(W / 2, yy); c.scale(cw * t.length * 1.25 / gw, th / gh); c.fillText(t, 0, 0); c.restore();
    };
    if (letter) { draw(letter, y); y -= th + M(3); }
    draw(num, y); y -= th + M(12);
    if (!grass && len >= 1200) {
      // aiming point: two broad bars about 400 m in (300 m on shorter runways)
      const ap = len >= 2400 ? 400 : 300, abW = M(wid >= 45 ? 10 : 6), abL = M(len >= 2400 ? 60 : 45), off = M(Math.min(wid * 0.18, 9));
      c.fillRect(W / 2 - off - abW, H - M(6) - M(ap) - abL, abW, abL); c.fillRect(W / 2 + off, H - M(6) - M(ap) - abL, abW, abL);
      // touchdown zone: pairs of bars every 150 m up to 900 m (shorter runways: fewer)
      if (len >= 1500 && wid >= 30) for (const d of [150, 450, 600, 750, 900]) {
        if (d > len / 2 - 100 || d === 300 || d === 400) continue;
        const bars = d <= 150 ? 3 : d <= 450 ? 2 : 1, bw = M(1.8), bl = M(22), o2 = M(Math.min(wid * 0.18, 9));
        for (let i = 0; i < bars; i++) { c.fillRect(W / 2 - o2 - bw * (i + 1) - M(1.5) * i, H - M(6) - M(d) - bl, bw, bl); c.fillRect(W / 2 + o2 + bw * i + M(1.5) * i, H - M(6) - M(d) - bl, bw, bl); }
      }
    }
    c.restore();
  };
  end(r.a, false); end(r.b, true);
  if (!grass) {
    // centre line: 30 m stripes with 20 m gaps between the numbers
    const cw = Math.max(1, M(wid >= 45 ? 0.9 : 0.45)), from = M(90), to = H - M(90);
    for (let y = from; y < to - M(30); y += M(50)) c.fillRect(W / 2 - cw / 2, y, cw, M(30));
    // side stripes on wider runways
    if (wid >= 30) { c.fillRect(M(1), 0, M(0.9), H); c.fillRect(W - M(1.9), 0, M(0.9), H); }
  } else {
    // grass: white edge markers along the sides
    for (let y = M(30); y < H; y += M(90)) { c.fillRect(0, y, M(3), M(1)); c.fillRect(W - M(3), y, M(3), M(1)); }
  }
  return cv;
}

/** Runway holding positions: where a taxiway reaches a runway, the yellow lines (two solid on the
 *  taxiway side, two dashed on the runway side), at a distance that suits the runway's size. */
function v3dHoldLines(L: AirportLayout, g: any, loc: (x: number, y: number) => number[], e: number) {
  const T = THREE, made: string[] = [];
  const tex = (() => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const c = cv.getContext('2d');
    c.fillStyle = '#E2B33C'; c.fillRect(0, 4, 128, 8); c.fillRect(0, 20, 128, 8); for (let x = 0; x < 128; x += 24) { c.fillRect(x, 36, 14, 8); c.fillRect(x, 52, 14, 8); }
    const t = new T.CanvasTexture(cv); t.wrapS = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t; })();
  const mat = new T.MeshBasicMaterial({ map: tex, transparent: true });
  for (const r of L.runways) {
    if (r.surf === 9 || r.surf === 1) continue;
    // the runway in local metres: centre and direction
    const cx = (r.lon - L.lon) * 111320 * Math.cos(L.lat * D2R), cy = (r.lat - L.lat) * 110540;
    const ux = Math.sin(r.hdg * D2R), uy = Math.cos(r.hdg * D2R), half = r.len / 2, hw = (r.wid || 45) / 2;
    const hold = hw + ((r.wid || 45) >= 40 ? 65 : (r.wid || 45) >= 25 ? 45 : 30);
    const side = (x: number, y: number) => ({ along: (x - cx) * ux + (y - cy) * uy, across: -(x - cx) * uy + (y - cy) * ux });
    for (const p of L.paths) {
      if ([1, 4, 9, 3].indexOf(p[0]) < 0) continue;
      const A = L.points[p[2]], B = L.points[p[3]]; if (!A || !B) continue;
      const a = side(A[0], A[1]), b = side(B[0], B[1]);
      // one end on the runway, the other well off it
      const onA = Math.abs(a.across) < hw + 8 && Math.abs(a.along) < half, onB = Math.abs(b.across) < hw + 8 && Math.abs(b.along) < half;
      if (onA === onB) continue;
      const on = onA ? a : b, off = onA ? b : a, P0 = onA ? A : B, P1 = onA ? B : A;
      if (Math.abs(off.across) < hold) continue;   // too short a stub to fit the line
      const t = (hold - Math.abs(on.across)) / (Math.abs(off.across) - Math.abs(on.across));
      const hx = P0[0] + (P1[0] - P0[0]) * t, hy = P0[1] + (P1[1] - P0[1]) * t, key = Math.round(hx / 10) + ':' + Math.round(hy / 10);
      if (made.indexOf(key) >= 0) continue; made.push(key);
      const q = loc(hx, hy), q1 = loc(P1[0], P1[1]), dirx = q1[0] - q[0], dirz = q1[1] - q[1], ang = Math.atan2(dirx, dirz);
      const w = Math.max(10, p[1] || 18) + 4;
      const geo = new T.PlaneGeometry(w, 3.2); geo.rotateX(-Math.PI / 2);
      const m = new T.Mesh(geo, mat); m.position.set(q[0], e + 0.32, q[1]); m.rotation.y = ang;
      (m.material.map as any).repeat && (m.material.map.repeat.x = Math.max(1, w / 12));
      g.add(m);
    }
  }
}

/* ---------- when the device runs out of graphics memory ---------- */
// Android closes the app without an error when the graphics take too much memory. A mark is kept while
// the 3D view is open (and visible); if the app starts again with the mark still there, it was closed in
// the middle of the 3D view: that goes into the error log, and the satellite detail steps down one level.
function v3dCrashGuard(open: boolean) {
  try {
    if (open) localStorage.setItem('amp-v3d-open', JSON.stringify({ at: Date.now(), q: v3dSatQ(), sat: !!(State.settings as any).v3dSat, cap: v3dTexCap(), mem: (navigator as any).deviceMemory || 0, ver: APP.version }));
    else localStorage.removeItem('amp-v3d-open');
  } catch (e) { /* storage full */ }
}
document.addEventListener('visibilitychange', () => { if (!V3d.open) return; if (document.hidden) v3dCrashGuard(false); else v3dCrashGuard(true); });
function v3dCrashCheck() {
  let m: any = null; try { m = JSON.parse(localStorage.getItem('amp-v3d-open') || 'null'); localStorage.removeItem('amp-v3d-open'); } catch (e) { return; }
  if (!m || Date.now() - m.at > 7 * 864e5) return;
  const names = ['Standard', 'Sharp', 'Very sharp', 'Highest'], S: any = State.settings;
  try { ErrorLog.add('3d', 'The app was closed by the system during the 3D view', `Satellite ${m.sat ? 'on, detail ' + names[m.q] : 'off'}; graphics limit ${m.cap}px; device memory ${m.mem || '?'} GB`, `The 3D view was open (version ${m.ver}) when Android closed the app, most likely because the graphics ran out of memory.`); } catch (e) { /* ignore */ }
  let lowered = '';
  if (m.sat && (S.v3dSatQ == null ? 1 : S.v3dSatQ) > 0) { S.v3dSatQ = Math.max(0, (S.v3dSatQ == null ? 1 : S.v3dSatQ) - 1); lowered = names[S.v3dSatQ]; Store.soon(); }
  State.notices.unshift({ id: uid(), kind: 'mechanic' as any, title: 'The 3D view closed the app', body: `Your device ran out of graphics memory in the 3D view.${lowered ? ` Satellite detail is now ${lowered}; you can raise it again in Settings → 3D view.` : ''} The details are in Settings → Updates and errors.`, time: 'Now', at: Date.now(), read: false } as any);
}
