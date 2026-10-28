// Shows the 3D crew figures in the interface. One shared WebGL renderer draws every avatar
// (into the top-left corner of its canvas, then copied into the avatar's own canvas):
// small ones become cached pictures, the few largest on screen are animated live
// (breathing, a gentle sway, blinking, looking around) and can be turned with a finger.
// Without WebGL (or the 3D library) the drawn 2D avatars are used instead.

interface AvReq { look: Look; role: CrewRole; accent: string; view: 'full' | 'bust'; still: boolean }

const Av3 = {
  ok: null as boolean,
  renderer: null as any,
  scene: null as any,
  camera: null as any,
  stage: null as any,
  reqs: {} as { [key: string]: AvReq },
  models: new Map<string, any>(),
  pics: new Map<string, HTMLCanvasElement>(),
  queue: [] as HTMLCanvasElement[],
  live: [] as { el: HTMLCanvasElement; model: any; t0: number; yaw: number; drag: any; blinkAt: number; blinkT: number; gaze: number[]; gazeAt: number; lastTouch: number }[],
  raf: 0,
  sizes: null as any,
};

function av3Supported(): boolean {
  if (Av3.ok !== null) return Av3.ok;
  try {
    const T = (window as any).THREE;
    const c = document.createElement('canvas');
    Av3.ok = !!T && !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { Av3.ok = false; }
  return Av3.ok;
}

function av3Init() {
  if (Av3.renderer) return;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  r.setPixelRatio(1);
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.35;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.domElement.addEventListener('webglcontextlost', (e: Event) => { e.preventDefault(); });
  Av3.renderer = r;
  const scene = new THREE.Scene();
  // soft studio light: sky and floor bounce, a warm key light with soft shadows, a cool rim
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x3a3128, 1.1));
  const key = new THREE.DirectionalLight(0xfff0e2, 2.6);
  key.position.set(-1.4, 3.2, 3.0); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = 4;
  const sc = key.shadow.camera; sc.left = -0.6; sc.right = 0.6; sc.top = 2.0; sc.bottom = -0.1; sc.near = 0.5; sc.far = 8;
  key.target.position.set(0, 0.9, 0); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbcd6ff, 0.8); fill.position.set(2.2, 1.6, 2.0); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x8fe4ff, 2.2); rim.position.set(1.2, 2.6, -2.6); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffd9b0, 1.0); rim2.position.set(-1.6, 1.8, -2.0); scene.add(rim2);
  // environment for reflections on gold, visors and eyes
  const pm = new THREE.PMREMGenerator(r);
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const pos = sky.geometry.attributes.position, cols: number[] = [];
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10; const c = new THREE.Color().setRGB(0.12, 0.16, 0.22).lerp(new THREE.Color(0.9, 0.93, 1.0), Math.max(0, y)); cols.push(c.r, c.g, c.b); }
  sky.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(sky);
  for (const [x, y, z, w] of [[-4, 5, 5, 4], [5, 3, 3, 2], [0, 4, -6, 3]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ color: 0xffffff })); p.position.set(x, y, z); p.lookAt(0, 1, 0); env.add(p); }
  scene.environment = pm.fromScene(env, 0.02).texture;
  // contact shadow under the feet
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.42), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.renderOrder = -1;
  scene.add(shadow);
  Av3.stage = new THREE.Group(); scene.add(Av3.stage);
  Av3.scene = scene;
  Av3.camera = new THREE.PerspectiveCamera(20, 1, 0.1, 30);
  // find avatars as they appear in the page, and keep sizes in step
  new MutationObserver(muts => {
    let found = false;
    for (const m of muts) for (const n of Array.prototype.slice.call(m.addedNodes)) {
      if (n.nodeType !== 1) continue;
      const el = n as Element;
      if (el.matches && el.matches('canvas.av3')) { av3Attach(el as HTMLCanvasElement); found = true; }
      if (el.querySelectorAll) el.querySelectorAll('canvas.av3').forEach(c => { av3Attach(c as HTMLCanvasElement); found = true; });
    }
    if (found) av3Pump();
  }).observe(document.body, { childList: true, subtree: true });
  // repaint when an avatar's box changes size (layout changes, pop-ups opening, rotation)
  Av3.sizes = new ResizeObserver(entries => { for (const e of entries) av3Attach(e.target as HTMLCanvasElement, true); av3Pump(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) av3Loop(); });
  // look now and then for figures that should be animated (pop-ups opening, screens changing)
  setInterval(() => { if (!Av3.raf && !document.hidden && document.querySelector('canvas.av3:not(.still)')) av3Loop(); }, 1000);
}

function av3Key(look: Look, role: CrewRole, accent: string): string {
  const L = dressed(look, role);
  return role + '|' + accent + '|' + ['sex', 'skin', 'face', 'eyes', 'nose', 'lips', 'hair', 'hairColor', 'facial', 'glasses', 'top', 'bottom', 'shoes', 'neck', 'hat', 'uniform'].map(k => (L as any)[k]).join(',');
}

/** The avatar markup: a canvas the renderer paints into (see avatarSvg). */
function avatar3dHtml(look: Look, role: CrewRole, o: { view?: 'full' | 'bust'; accent?: string; still?: boolean; cls?: string }): string {
  const accent = o.accent || '#2C8CFF', view = o.view === 'bust' ? 'bust' : 'full';
  const key = av3Key(look, role, accent);
  Av3.reqs[key] = { look: dressed(look, role), role, accent, view, still: !!o.still };
  return `<canvas class="av av3 ${view === 'bust' ? 'bust' : ''} ${o.still ? 'still' : ''} ${o.cls || ''}" data-k="${esc(key)}" data-view="${view}" role="img" aria-label="Crew avatar"></canvas>`;
}

function av3Model(key: string): any {
  let m = Av3.models.get(key);
  if (m) { Av3.models.delete(key); Av3.models.set(key, m); return m; }
  const rq = Av3.reqs[key]; if (!rq) return null;
  m = buildFigure(rq.look, rq.role, rq.accent);
  const box = new THREE.Box3().setFromObject(m.root);
  m.top = box.max.y; m.width = Math.max(box.max.x - box.min.x, 0.5);
  Av3.models.set(key, m);
  // keep a handful of built figures; free the rest
  while (Av3.models.size > 10) {
    const k0 = Av3.models.keys().next().value, old = Av3.models.get(k0);
    if (Av3.live.some(l => l.model === old)) break;
    Av3.models.delete(k0); av3Dispose(old.root);
  }
  return m;
}
function av3Dispose(o: any) {
  o.traverse((m: any) => {
    if (m.geometry) m.geometry.dispose();
    if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x: any) => x.dispose());
  });
}

/** Camera framing: full figure standing on the bottom edge, or head and shoulders. */
function av3Frame(model: any, view: string, w: number, h: number) {
  const cam = Av3.camera, aspect = w / h;
  cam.aspect = aspect;
  const half = Math.tan(cam.fov * Math.PI / 360);
  let y0: number, y1: number, width: number;
  if (view === 'bust') { y0 = model.bustBottom; y1 = model.top + 0.02; width = 0.5; }
  else { y0 = -0.01; y1 = model.top + 0.03; width = model.width + 0.06; }
  const hgt = y1 - y0;
  const dist = Math.max(hgt / 2 / half, width / 2 / (half * aspect));
  const viewH = dist * half * 2;
  // stand on the bottom edge (like the drawings did) when there's spare height
  const cy = view === 'bust' ? y1 - viewH / 2 + Math.min(0.02, (viewH - hgt) * 0.25) : y0 + viewH / 2;
  cam.position.set(0, cy + (view === 'bust' ? 0.04 : 0.1), dist);
  cam.lookAt(0, cy, 0);
  cam.updateProjectionMatrix();
}

function av3Size(el: HTMLCanvasElement): number[] {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return [Math.round(el.clientWidth * dpr), Math.round(el.clientHeight * dpr)];
}

/** Draw a model posed at time t (seconds) into the shared renderer at w × h pixels. */
function av3Draw(model: any, view: string, w: number, h: number, pose?: { t: number; yaw: number; blink: number; gaze: number[] }) {
  const r = Av3.renderer;
  if (w > r.domElement.width || h > r.domElement.height) r.setSize(Math.max(w, r.domElement.width), Math.max(h, r.domElement.height), false);
  const H = r.domElement.height;
  r.setViewport(0, H - h, w, h); r.setScissor(0, H - h, w, h); r.setScissorTest(true);
  Av3.stage.add(model.root);
  av3Pose(model, pose || { t: 0, yaw: 0, blink: 0, gaze: [0, 0] });
  av3Frame(model, view, w, h);
  r.clear();
  r.render(Av3.scene, Av3.camera);
  Av3.stage.remove(model.root);
}

function av3Pose(m: any, p: { t: number; yaw: number; blink: number; gaze: number[] }) {
  const t = p.t, P = m.parts;
  m.root.rotation.y = p.yaw;
  m.root.rotation.z = Math.sin(t * 2 * Math.PI / 6.2) * 0.012;
  const br = Math.sin(t * 2 * Math.PI / 4.2);
  P.torso.scale.set(1 + br * 0.006, 1 + br * 0.004, 1 + br * 0.01);
  P.head.position.y = 1.47 + br * 0.002;
  P.head.rotation.y = Math.sin(t * 0.43) * 0.16 + Math.sin(t * 0.17) * 0.08 + p.gaze[0] * 0.3;
  P.head.rotation.x = Math.sin(t * 0.31 + 1) * 0.04 - 0.02;
  P.head.rotation.z = Math.sin(t * 0.23 + 2) * 0.025;
  P.armL.rotation.x = Math.sin(t * 2 * Math.PI / 6.2 + 0.4) * 0.02; P.armR.rotation.x = Math.sin(t * 2 * Math.PI / 6.2 + 1.2) * 0.02;
  for (const e of P.eyes) { e.rotation.x = -p.gaze[1] * 0.25; e.rotation.y = (e.position.x > 0 ? 0.06 : -0.06) + p.gaze[0] * 0.3; }
  for (const l of P.lids) l.rotation.x = lerp(l.userData.open, l.userData.closed, p.blink);
}

/* ---------- attaching canvases ---------- */
function av3Attach(el: HTMLCanvasElement, resized?: boolean) {
  const key = el.getAttribute('data-k'); if (!key) return;
  if (!(el as any)._bound) {
    (el as any)._bound = true;
    if (Av3.sizes) Av3.sizes.observe(el);
    el.addEventListener('pointerdown', ev => av3Grab(el, ev));
  }
  const [w, h] = av3Size(el);
  if (!w || !h) return;
  if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
  const pk = key + '|' + el.getAttribute('data-view') + '|' + w + 'x' + h;
  const pic = Av3.pics.get(pk);
  if (pic) { const g = el.getContext('2d'); g.clearRect(0, 0, w, h); g.drawImage(pic, 0, 0); el.classList.add('in'); }
  else if (Av3.queue.indexOf(el) < 0) Av3.queue.push(el);
  void resized;
}

/** Work through avatars that still need a picture, a few per frame. */
function av3Pump() {
  if (Av3.raf) return;
  av3Loop();
}
function av3Loop() {
  cancelAnimationFrame(Av3.raf);
  Av3.raf = requestAnimationFrame(av3Tick);
}
function av3Tick(now: number) {
  Av3.raf = 0;
  const t0 = performance.now();
  // pending pictures
  while (Av3.queue.length && performance.now() - t0 < 24) {
    const el = Av3.queue.shift();
    if (!el.isConnected) continue;
    const key = el.getAttribute('data-k'), view = el.getAttribute('data-view');
    const [w, h] = av3Size(el); if (!w || !h) continue;
    const pk = key + '|' + view + '|' + w + 'x' + h;
    let pic = Av3.pics.get(pk);
    if (!pic) {
      const model = av3Model(key); if (!model) continue;
      av3Draw(model, view, w, h);
      pic = document.createElement('canvas'); pic.width = w; pic.height = h;
      pic.getContext('2d').drawImage(Av3.renderer.domElement, 0, 0, w, h, 0, 0, w, h);
      Av3.pics.set(pk, pic);
      if (Av3.pics.size > 160) Av3.pics.delete(Av3.pics.keys().next().value);
    }
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
    const g = el.getContext('2d'); g.clearRect(0, 0, w, h); g.drawImage(pic, 0, 0);
    el.classList.add('in');
  }
  av3PickLive();
  // live figures
  const sec = now / 1000;
  for (const L of Av3.live) {
    const el = L.el, [w, h] = av3Size(el);
    if (!w || !h) continue;
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
    if (sec > L.blinkAt) { L.blinkT = sec; L.blinkAt = sec + 2.4 + Math.random() * 3.6; }
    const bt = (sec - L.blinkT) / 0.16, blink = bt >= 0 && bt <= 1 ? Math.sin(bt * Math.PI) : 0;
    if (sec > L.gazeAt) { L.gaze = [(Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.15]; L.gazeAt = sec + 1.2 + Math.random() * 2.5; }
    if (!L.drag && sec - L.lastTouch > 3) L.yaw *= 0.94;
    av3Draw(L.model, el.getAttribute('data-view'), w, h, { t: sec - L.t0, yaw: L.yaw, blink, gaze: L.gaze });
    const g = el.getContext('2d');
    g.clearRect(0, 0, w, h); g.drawImage(Av3.renderer.domElement, 0, 0, w, h, 0, 0, w, h);
    el.classList.add('in');
  }
  if ((Av3.queue.length || Av3.live.length) && !document.hidden) Av3.raf = requestAnimationFrame(av3Tick);
}

let _av3PickAt = 0;
/** Animate the (up to three) largest visible full figures that aren't marked still. */
function av3PickLive() {
  const now = performance.now();
  if (now - _av3PickAt < 500 && Av3.live.every(l => l.el.isConnected)) return;
  _av3PickAt = now;
  if (State && State.settings && State.settings.reduceMotion) { Av3.live = []; return; }
  const cands: { el: HTMLCanvasElement; area: number }[] = [];
  document.querySelectorAll('canvas.av3:not(.still)').forEach(c => {
    const el = c as HTMLCanvasElement, r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
    if (r.width * r.height < 9000) return;
    // skip figures behind an open pop-up
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (top && top !== el && !el.contains(top) && !(top as Element).contains(el) && !(el.parentElement && el.parentElement.contains(top))) return;
    cands.push({ el, area: r.width * r.height });
  });
  cands.sort((a, b) => b.area - a.area);
  const pick = cands.slice(0, 3).map(c => c.el);
  Av3.live.forEach(l => { if (pick.indexOf(l.el) < 0) l.el.classList.remove('live'); });
  Av3.live = Av3.live.filter(l => pick.indexOf(l.el) >= 0);
  pick.forEach(el => el.classList.add('live'));
  for (const el of pick) {
    if (Av3.live.some(l => l.el === el)) continue;
    const model = av3Model(el.getAttribute('data-k')); if (!model) continue;
    const sec = performance.now() / 1000;
    Av3.live.push({ el, model, t0: sec - Math.random() * 6, yaw: 0, drag: null, blinkAt: sec + 1 + Math.random() * 2, blinkT: -9, gaze: [0, 0], gazeAt: sec + 1, lastTouch: 0 });
  }
}

/** Turn a live figure with a finger. */
function av3Grab(el: HTMLCanvasElement, ev: PointerEvent) {
  const L = Av3.live.filter(l => l.el === el)[0]; if (!L) return;
  ev.stopPropagation();
  const x0 = ev.clientX, yaw0 = L.yaw;
  L.drag = true; L.lastTouch = performance.now() / 1000;
  try { el.setPointerCapture(ev.pointerId); } catch (e) { /* older WebView */ }
  const move = (e: PointerEvent) => { L.yaw = yaw0 + (e.clientX - x0) / 90; L.lastTouch = performance.now() / 1000; };
  const up = () => { L.drag = null; L.lastTouch = performance.now() / 1000; el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  av3Loop();
}

/** Repaint avatars that were waiting for a size (e.g. inside a pop-up that just opened). */
function av3Refresh() {
  if (!Av3.renderer) return;
  document.querySelectorAll('canvas.av3').forEach(c => av3Attach(c as HTMLCanvasElement));
  av3Pump();
}
