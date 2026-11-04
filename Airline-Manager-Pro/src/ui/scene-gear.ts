/* Settings from inside any 3D place: the 3D view, the joined building and its rooms, the hangars, the lounges, the
 * courtroom. A gear marked Settings sits in the top-left corner (below the place's name); it can be tucked away to a
 * small tab at the edge and pulled out again (remembered). Settings opens over the scene, which stays as it is:
 * closing Settings puts you straight back where you were. */

/** Is a 3D place open right now? */
function sceneOpen(): boolean {
  try {
    if (typeof V3d !== 'undefined' && V3d.open) return true;
    for (const R of [typeof TestRooms !== 'undefined' ? TestRooms : null, typeof OfficeRoom !== 'undefined' ? OfficeRoom : null, typeof OpsRoom !== 'undefined' ? OpsRoom : null,
      typeof LoungeRoom !== 'undefined' ? LoungeRoom : null, typeof HangarRoom !== 'undefined' ? HangarRoom : null, typeof CourtRoom !== 'undefined' ? CourtRoom : null]) if (R && R.on) return true;
  } catch (e) { /* none */ }
  return false;
}
function sceneGearTucked(): boolean { return (State.settings as any).sceneGearTucked === true; }
/** Keeps the gear there while a 3D place is open, and away when none is. */
function sceneGearSync() {
  let el = document.querySelector('.scn-gear') as HTMLElement;
  const on = sceneOpen() && !(typeof ExitSplash !== 'undefined' && ExitSplash.on);
  if (!on) { if (el) el.remove(); const h0 = document.querySelector('body > .pad-hints'); if (h0) h0.remove(); document.body.classList.remove('scn-set-on'); return; }
  if (!el) {
    el = document.createElement('div'); el.className = 'scn-gear';
    el.innerHTML = `<button class="scn-gear-btn" data-act="scene-settings" aria-label="Settings">${icon('gear')}<span>Settings</span></button><button class="scn-gear-tuck" data-act="scene-gear-tuck" aria-label="Tuck the settings button away">${icon('chevron')}</button><button class="scn-gear-tab" data-act="scene-gear-tuck" aria-label="Show the settings button">${icon('gear')}</button>`;
    document.body.appendChild(el);
  }
  el.classList.toggle('tucked', sceneGearTucked());
  // the controller's buttons for this place, only while a controller is connected (they follow Settings → Devices)
  const v3 = typeof V3d !== 'undefined' && V3d.open;
  const want = typeof Pad !== 'undefined' && Pad.gp ? padHintsHtml(v3 ? [['nextCam', 'Camera'], ['prev', 'Previous aircraft'], ['next', 'Next aircraft'], ['pointer', 'Pointer'], ['back', 'Back'], ['settings', 'Settings']]
    : [['pointer', 'Pointer'], ['click', 'Use'], ['run', 'Faster'], ['back', 'Back'], ['settings', 'Settings']]) : '';
  let h = document.querySelector('body > .pad-hints') as HTMLElement;
  if (!want) { if (h) h.remove(); }
  else { const tmp = document.createElement('div'); tmp.innerHTML = want; const n = tmp.firstElementChild as HTMLElement; if (!h) document.body.appendChild(n); else if (h.innerHTML !== n.innerHTML) h.innerHTML = n.innerHTML; }
  if (!document.querySelector('.settings-pop')) document.body.classList.remove('scn-set-on');
}
ACTIONS['scene-gear-tuck'] = () => { const S: any = State.settings; S.sceneGearTucked = !sceneGearTucked(); Store.soon(); Sound.tick(); sceneGearSync(); };
ACTIONS['scene-settings'] = () => {
  try { aimUnlock(); } catch (e) { /* no mouse taken */ }
  document.body.classList.add('scn-set-on');   // Settings above the scene; the scene stays as it is underneath
  Sound.tick(); openLayer('modal', settingsHtml(), { cls: 'full settings-pop' });
};
setInterval(sceneGearSync, 600);
// While Settings is open over a 3D place, Esc closes Settings (not the place behind it), and the place doesn't walk
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!document.body.classList.contains('scn-set-on') || !document.querySelector('.settings-pop')) return;
  const t = e.target as HTMLElement;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeTop(); setTimeout(sceneGearSync, 50); return; }
  if (t && t.closest && t.closest('input, textarea, select')) return;
  e.stopImmediatePropagation();
}, true);
