// Start-up: theme, landscape lock, shell and a short arrival message from the mechanic.
(function boot() {
  document.title = APP.name;
  ErrorLog.init();
  Store.load();
  Store.restoreIfEmpty();
  loadKnownAirports();
  ensurePeople();
  ensurePayroll();
  Store.bind();
  if (reducedMotion()) State.settings.reduceMotion = true;
  document.documentElement.classList.toggle('calm', State.settings.reduceMotion);
  applyCompanyTheme(false);
  try {
    const so = (window as any).Capacitor && (window as any).Capacitor.Plugins && (window as any).Capacitor.Plugins.ScreenOrientation;
    if (so) so.lock({ orientation: 'landscape' });
  } catch (e) { /* not available in a browser */ }
  bindActions();
  bindBack();
  renderShell();
  checkBirthday();
  scheduleBirthdayNotification();
  startConductClock();
  Link.init();
  Updater.init();
  startAiClock();
  if ((State as any).linkedOnce) State.live = State.live.filter(f => !(f.you && !f.real));
  // Splash fades out once the first screen is painted
  const sp = document.createElement('div');
  sp.className = 'splash';
  sp.innerHTML = `<div class="sp-mark">${brandMark()}</div><b>${esc(APP.name)}</b>`;
  document.body.appendChild(sp);
  setTimeout(() => sp.classList.add('out'), reducedMotion() ? 50 : 900);
  setTimeout(() => sp.remove(), 1600);
  // a new message lands a little after start, to show the live inbox
  if (!(State as any).linkedOnce) setTimeout(() => {
    const f5: any = State.live.filter(f => f.id === 'f5')[0];
    if (!f5) return;
    const title = `Sigrid Berg is ${f5.phase === 'Final' ? 'on final' : 'descending'} into EKVG`;
    State.notices.unshift({ id: uid(), kind: 'pilot', title, body: `ATN612 from Bergen, ${Math.round(f5.leftNm || 0)} nm to go, at the gate in about ${Math.max(1, Math.round((f5.toGoS || 0) / 60))} minutes.`, time: 'Now', read: false, ref: 'f5' });
    renderTopbar(); Sound.chime();
    toast(title, 'info', { label: 'Show', act: 'show-flight', data: 'f5' });
    const b = $('.bell'); if (b) { b.classList.remove('ringing'); void b.offsetWidth; b.classList.add('ringing'); }
  }, 6000);
})();
