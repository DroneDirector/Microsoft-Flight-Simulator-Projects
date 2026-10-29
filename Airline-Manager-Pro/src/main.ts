// Start-up: theme, landscape lock, shell and a short arrival message from the mechanic.
(function boot() {
  document.title = APP.name;
  ErrorLog.init();
  Store.load();
  Store.restoreIfEmpty();
  if (DESKTOP) { Desk.init(); SETTINGS.unshift({ id: 'display', title: 'Display', icon: 'pc', items: [{ type: 'html', html: desktopSettingsHtml }] } as any); }
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
  State.screen = 'ops';   // the app always opens on the Overview
  renderShell();
  setTimeout(checkBirthday, SPLASH_MS + 400);   // after the start-up screen
  scheduleBirthdayNotification();
  startConductClock();
  startCourtClock();
  startStaffing();
  startProgress();
  startConditionClock();
  Link.init();
  Updater.init();
  Backup.init();
  startAiClock();
  Backup.offerRestoreOnFirstStart();
  whatsNewOnStart();
  if ((State as any).linkedOnce) State.live = State.live.filter(f => !(f.you && !f.real));
  // Start-up screen for five seconds, then the Overview
  showSplash(() => { if (State.screen !== 'ops' && !_layers.length) go('ops', true); });
})();
