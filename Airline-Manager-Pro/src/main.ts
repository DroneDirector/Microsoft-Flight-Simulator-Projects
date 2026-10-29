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
  startCourtClock();
  startProgress();
  startConditionClock();
  Link.init();
  Updater.init();
  Backup.init();
  startAiClock();
  Backup.offerRestoreOnFirstStart();
  if ((State as any).linkedOnce) State.live = State.live.filter(f => !(f.you && !f.real));
  // Splash fades out once the first screen is painted
  const sp = document.createElement('div');
  sp.className = 'splash';
  sp.innerHTML = `<div class="sp-mark">${brandMark()}</div><b>${esc(APP.name)}</b>`;
  document.body.appendChild(sp);
  setTimeout(() => sp.classList.add('out'), reducedMotion() ? 50 : 900);
  setTimeout(() => sp.remove(), 1600);
})();
