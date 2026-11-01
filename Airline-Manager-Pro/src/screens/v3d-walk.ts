/* Walk the cabin: walk about inside the aircraft in first person, as in a modern game, while it flies, taxis
 * or stands at the gate. You move with the aircraft (it carries you), so nothing throws you out of it.
 *  - PC: W A S D or the arrow keys to walk, the mouse to look (click the view to take the mouse, Esc to let
 *    it go), Shift to walk faster.
 *  - Phone: the stick at the bottom left to walk, drag anywhere else to look.
 * You can walk the aisles, the galleys at the front and back and between the aisles; the seats, walls and
 * people block the way as they would. A gentle step bob follows your pace. */

const CabinWalk: any = {
  on: false, x: 0, y: 0, v: 0, dist: 0, keys: {} as { [k: string]: boolean }, stick: [0, 0], bound: false, started: false,
};

function cabinWalkStart() {
  const W = CabinWalk; W.on = true; W.started = false;
  if (!W.bound) {
    W.bound = true;
    const set = (e: KeyboardEvent, on: boolean) => {
      if (!V3d.open || V3d.mode !== 'walk' || (e.target as HTMLElement).closest && (e.target as HTMLElement).closest('input, textarea')) return;
      const k = e.key.toLowerCase(); if ('wasd'.indexOf(k) >= 0 || /^arrow/.test(k) || k === 'shift') { W.keys[k] = on; e.preventDefault(); }
    };
    document.addEventListener('keydown', e => set(e, true)); document.addEventListener('keyup', e => set(e, false));
    window.addEventListener('blur', () => { W.keys = {}; });
    // the mouse looks around once the view has it (click the view; Esc lets it go)
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!V3d.open || V3d.mode !== 'walk' || document.pointerLockElement !== V3d.cv) return;
      V3d.yaw -= e.movementX * 0.0025; V3d.pitch = clamp(V3d.pitch - e.movementY * 0.0025, -1.2, 1.2);
    });
  }
  if (DESKTOP && V3d.cv && !(V3d.cv as any)._walkClick) {
    (V3d.cv as any)._walkClick = true;
    V3d.cv.addEventListener('click', () => { if (V3d.mode === 'walk' && document.pointerLockElement !== V3d.cv) { try { (V3d.cv as any).requestPointerLock(); } catch (e) { /* not allowed */ } } });
  }
  cabinWalkPad();
}
function cabinWalkStop() {
  const W = CabinWalk; if (!W.on) return; W.on = false; W.keys = {}; W.stick = [0, 0];
  try { if (document.pointerLockElement === V3d.cv) document.exitPointerLock(); } catch (e) { /* not locked */ }
  const pad = V3d.root && V3d.root.querySelector('.walk-pad'); if (pad) pad.remove();
  const hint = V3d.root && V3d.root.querySelector('.walk-hint'); if (hint) hint.remove();
}

/** The stick for walking on a touch screen (and a short hint on the PC). */
function cabinWalkPad() {
  const root = V3d.root; if (!root || root.querySelector('.walk-pad')) return;
  const hint = document.createElement('div'); hint.className = 'walk-hint';
  hint.textContent = DESKTOP ? 'Click to look around with the mouse · W A S D to walk · Shift to walk faster · Esc lets go of the mouse' : 'Left stick to walk · drag to look around';
  root.appendChild(hint); setTimeout(() => hint.classList.add('fade'), 6000);
  const pad = document.createElement('div'); pad.className = 'walk-pad'; pad.innerHTML = '<i></i>'; root.appendChild(pad);
  const knob = pad.firstElementChild as HTMLElement; let id = -1;
  const move = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    CabinWalk.stick = [dx, -dy]; knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  };
  pad.addEventListener('pointerdown', e => { e.stopPropagation(); id = e.pointerId; pad.setPointerCapture(id); move(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) { e.stopPropagation(); move(e); } });
  const up = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; CabinWalk.stick = [0, 0]; knob.style.transform = ''; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
}

/** Can you stand here? The aisles, and the galleys at the front and back across the whole width. */
function cabinWalkable(at: any, x: number, y: number): boolean {
  if (x < at.x0 + 0.35 || x > at.x1 - 0.2) return false;
  const galley = x < at.firstX - 0.45 || x > at.lastX + 0.75;
  if (galley) return Math.abs(y) < at.half - 0.35;
  for (const a of (at.aisles && at.aisles.length ? at.aisles : [at.aisleY])) if (Math.abs(y - a) < 0.2) return true;
  return false;
}

/** Each frame while walking: move, keep out of seats and walls, and place the eye. */
function cabinWalkCam(P: any, G: any, body: any, up: any) {
  const W = CabinWalk, at = G.userData.crewAt, T = THREE; if (!at) return;
  const now = performance.now() / 1000, dt = Math.min(0.1, Math.max(0, now - (W.last || now))); W.last = now;
  if (!W.started || W.for !== P.id) { W.started = true; W.for = P.id; W.x = Math.min(at.x1 - 0.5, at.lastX + 1.0); W.y = at.aisleY; V3d.yaw = 0; V3d.pitch = 0; W.v = 0; }
  // input: keys and the stick
  const K = W.keys, f = (K.w || K.arrowup ? 1 : 0) - (K.s || K.arrowdown ? 1 : 0) + W.stick[1], r = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0) + W.stick[0];
  const mag = Math.min(1, Math.hypot(f, r)), vmax = K.shift ? 2.2 : 1.35;
  const yaw = -V3d.yaw, pitch = clamp(V3d.pitch, -1.2, 1.2);
  // forward along the cabin is −x; to the right is +y
  const fx = -Math.cos(yaw), fy = Math.sin(yaw), rx = Math.sin(yaw), ry = Math.cos(yaw);
  let mx = fx * f + rx * r, my = fy * f + ry * r; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
  W.v += ((mag > 0.05 ? vmax * mag : 0) - W.v) * Math.min(1, dt * 6);   // speed up and slow down gently
  const step = W.v * dt;
  if (step > 0) {
    // slide along what is in the way
    const nx = W.x + mx * step, ny = W.y + my * step;
    if (cabinWalkable(at, nx, ny) && !cabinWalkBumps(nx, ny, at)) { W.x = nx; W.y = ny; }
    else if (cabinWalkable(at, nx, W.y) && !cabinWalkBumps(nx, W.y, at)) W.x = nx;
    else if (cabinWalkable(at, W.x, ny) && !cabinWalkBumps(W.x, ny, at)) W.y = ny;
    W.dist += step;
  }
  // the eye: standing height, with a gentle bob as you walk
  const bob = Math.sin(W.dist / 0.65 * Math.PI) * 0.018 * Math.min(1, W.v / 1.2);
  const eye = body.localToWorld(_av(W.x, W.y, at.zf + 1.64 + bob));
  const ahead = body.localToWorld(_av(W.x + Math.cos(pitch) * fx, W.y + Math.cos(pitch) * fy, at.zf + 1.64 + bob + Math.sin(pitch)));
  V3d.cam.position.copy(eye); V3d.cam.up.copy(up); V3d.cam.lookAt(ahead); V3d.cam.up.set(0, 1, 0);
}
/** The crew and the trolley are in the way too. */
function cabinWalkBumps(x: number, y: number, at: any): boolean {
  try {
    for (const m of (CabinCrew.members || [])) { if (m.hidden) continue; const yy = m.want && m.want.sit && m.sitK > 0.5 ? m.want.side : at.aisleY + m.side; if (Math.hypot(m.x - x, yy - y) < 0.38) return true; }
    const S = CabinCrew.trolley; if (S && S.visible) { const tp = S.position, sx = tp.x, sy = -tp.z; if (Math.abs(sx - x) < 0.62 && Math.abs(sy - y) < 0.3) return true; }
  } catch (e) { /* nothing in the way */ }
  return false;
}
