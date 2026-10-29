// Start-up: theme, landscape lock, shell and a short arrival message from the mechanic.
(function boot() {
  document.title = APP.name;
  ErrorLog.init();
  Store.load();
  Store.restoreIfEmpty();
  if (DESKTOP) { Desk.init(); SETTINGS.unshift({ id: 'display', title: 'Display', icon: 'pc', items: [{ type: 'html', html: desktopSettingsHtml }] } as any); }
  loadKnownAirports();
  World.load();
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
  // split screen or a pop-up window: the app shares the screen, so any shape is fine (the landscape
  // lock and the "turn sideways" hint only apply when it has the whole screen)
  const splitCheck = () => { const sw = screen.width || innerWidth, sh = screen.height || innerHeight; document.documentElement.classList.toggle('split', innerWidth * innerHeight < sw * sh * 0.8); };
  splitCheck(); window.addEventListener('resize', splitCheck);
  bindActions();
  bindBack();
  // Used in the last 12 hours (minimised, swiped away, exited, or closed by Android to free memory):
  // open right where it was, without the start-up screen. After a longer break: the start-up screen
  // and the Overview.
  let resume: any = null;
  try { resume = JSON.parse(localStorage.getItem('amp-resume') || 'null'); localStorage.removeItem('amp-resume'); } catch (e) { /* none */ }
  if (resume && Date.now() - resume.at > 12 * 3600e3) resume = null;
  const back = resume && SCREENS[resume.screen] ? resume.screen : null;
  State.screen = back || 'ops';
  renderShell();
  setTimeout(checkBirthday, back ? 1500 : SPLASH_MS + 400);   // after the start-up screen
  scheduleBirthdayNotification();
  startConductClock();
  startCourtClock();
  startStaffing();
  startProgress();
  startConditionClock();
  Link.init();
  Updater.init();
  Backup.init();
  Licence.init();
  startAiClock();
  startCoopClock();
  startBases();
  Battery.init();
  Backup.offerRestoreOnFirstStart();
  whatsNewOnStart();
  if ((State as any).linkedOnce) State.live = State.live.filter(f => !(f.you && !f.real));
  // Start-up screen for five seconds, then the Overview
  if (!back) showSplash(() => { if (State.screen !== 'ops' && !_layers.length) go('ops', true); });
})();
