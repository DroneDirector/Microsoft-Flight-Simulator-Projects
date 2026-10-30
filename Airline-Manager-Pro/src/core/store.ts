// Saves the airline on the device so it survives app updates and restarts.
// Updates replace the app's files but keep this saved data. New settings or data added in a
// later version are merged in with their defaults, so an older save always keeps working.

const STORE_KEY = 'airline-manager-pro.save';
const SAVE_VERSION = 1;
// Parts of State that are saved. Screen position and the like start fresh each launch.
const SAVED_KEYS = ['companyId', 'divisionId', 'myReg', 'settings', 'profiles', 'companies', 'pilots', 'candidates',
  'fleet', 'live', 'today', 'routes', 'logbook', 'issues', 'notices', 'txns', 'fines',
  'staff', 'staffCandidates', 'incidents', 'coPilot', 'birthdayGreeted', 'simDate', 'myLoad', 'salaryV2',
  'linkPc', 'linkedOnce', 'knownAirports', 'lastTouchdown', 'aiNext', 'aiDay', 'cases', 'screen', 'badges', 'progress', 'popLog', 'ratingDay', 'condTick', 'groundedUntil', 'payNext', 'poolNext', 'conductPausedAt', 'seenVersion', 'wnClosed', 'coop', 'favs', 'licence', 'bank', 'jobs', 'landRecs', 'ofp', 'acars', 'simInstalled', 'usedMarket', 'payV3', 'unions', 'moraleNext', 'paxRecords', 'noFly', 'paxReviews', 'groundV1', 'groundWarned'];

// Changes between save versions go here, e.g. MIGRATIONS[2] = data => { ...; return data; }
const MIGRATIONS: { [v: number]: (d: any) => any } = {};

const Store = {
  _timer: 0 as any,
  _defaults: null as any,
  wasEmpty: false,   // nothing was saved on this phone when the app started

  load() {
    this._defaults = JSON.parse(JSON.stringify(State.settings));
    let raw: string = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!raw) { this.wasEmpty = true; return; }
    let data: any;
    try { data = JSON.parse(raw); } catch (e) { this.backupBroken(raw); return; }
    if (!data || typeof data !== 'object' || !data.state) return;
    let v = data.v || 1;
    while (v < SAVE_VERSION) { v++; if (MIGRATIONS[v]) data.state = MIGRATIONS[v](data.state); }
    const st = data.state, S: any = State;
    for (const k of SAVED_KEYS) {
      if (!(k in st)) continue;
      if (k === 'settings' || k === 'myReg') S[k] = Object.assign({}, S[k], st[k]); // keep new defaults
      else S[k] = st[k];
    }
  },

  save() {
    const out: any = {};
    for (const k of SAVED_KEYS) out[k] = (State as any)[k];
    const json = JSON.stringify({ v: SAVE_VERSION, app: APP.version, savedAt: Date.now(), state: out });
    try { localStorage.setItem(STORE_KEY, json); }
    catch (e) { /* storage full or unavailable: keep running from memory */ }
    // and a second copy in the app's own files on the phone
    // (at most every few seconds, and straight away when the app goes to the background)
    this._native = json;
    if (typeof Backup !== 'undefined') Backup.afterSave(json, document.hidden);
    if (document.hidden) this.flushNative();
    else if (!this._nativeTimer) this._nativeTimer = setTimeout(() => this.flushNative(), 5000);
  },
  _native: '' as string,
  _nativeTimer: 0 as any,
  flushNative() {
    clearTimeout(this._nativeTimer); this._nativeTimer = 0;
    const T = this.native(), json = this._native; this._native = '';
    if (json && T && T.backupWrite) T.backupWrite({ data: json }).catch(() => { /* the web copy is still there */ });
  },

  native(): any { const cap = (window as any).Capacitor; return cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.AppTools; },

  /** If the web storage was emptied (the system can clear it), bring the airline back from the phone's copy. */
  restoreIfEmpty() {
    let has = false;
    try { has = !!localStorage.getItem(STORE_KEY); } catch (e) { /* storage unavailable */ }
    const T = this.native();
    if (has || !T || !T.backupRead) return;
    T.backupRead().then((r: any) => {
      if (!r || !r.data) return;
      try { JSON.parse(r.data); localStorage.setItem(STORE_KEY, r.data); location.reload(); } catch (e) { /* broken copy: start fresh */ }
    }).catch(() => { /* no copy */ });
  },

  /** Save shortly after a change, so many quick changes become one write. */
  soon() { clearTimeout(this._timer); this._timer = setTimeout(() => this.save(), 400); },

  backupBroken(raw: string) { try { localStorage.setItem(STORE_KEY + '.broken', raw); } catch (e) { /* ignore */ } },

  reset() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } location.reload(); },

  bind() {
    // after every tap that does something, when leaving the app, and every half minute for flight progress
    document.addEventListener('click', ev => { if ((ev.target as HTMLElement).closest('[data-act]')) this.soon(); }, true);
    // minimised or closed: save everything now and note where the app was, so that when it opens again
    // (after it was swiped away, exited, or closed by Android to free memory) it is right there
    const away = () => { this.save(); this.flushNative(); try { localStorage.setItem('amp-resume', JSON.stringify({ at: Date.now(), screen: State.screen })); } catch (e) { /* ignore */ } };
    document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
    setInterval(() => { if (!document.hidden) try { localStorage.setItem('amp-resume', JSON.stringify({ at: Date.now(), screen: State.screen })); } catch (e) { /* ignore */ } }, 15000);
    window.addEventListener('pagehide', away);
    setInterval(() => this.save(), 30000);
  },
};
