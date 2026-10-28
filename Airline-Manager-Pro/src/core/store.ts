// Saves the airline on the device so it survives app updates and restarts.
// Updates replace the app's files but keep this saved data. New settings or data added in a
// later version are merged in with their defaults, so an older save always keeps working.

const STORE_KEY = 'airline-manager-pro.save';
const SAVE_VERSION = 1;
// Parts of State that are saved. Screen position and the like start fresh each launch.
const SAVED_KEYS = ['companyId', 'divisionId', 'myReg', 'settings', 'profiles', 'companies', 'pilots', 'candidates',
  'fleet', 'live', 'today', 'routes', 'logbook', 'issues', 'notices', 'txns', 'fines'];

// Changes between save versions go here, e.g. MIGRATIONS[2] = data => { ...; return data; }
const MIGRATIONS: { [v: number]: (d: any) => any } = {};

const Store = {
  _timer: 0 as any,
  _defaults: null as any,

  load() {
    this._defaults = JSON.parse(JSON.stringify(State.settings));
    let raw: string = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!raw) return;
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
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: SAVE_VERSION, app: APP.version, savedAt: Date.now(), state: out })); }
    catch (e) { /* storage full or unavailable: keep running from memory */ }
  },

  /** Save shortly after a change, so many quick changes become one write. */
  soon() { clearTimeout(this._timer); this._timer = setTimeout(() => this.save(), 400); },

  backupBroken(raw: string) { try { localStorage.setItem(STORE_KEY + '.broken', raw); } catch (e) { /* ignore */ } },

  reset() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } location.reload(); },

  bind() {
    // after every tap that does something, when leaving the app, and every half minute for flight progress
    document.addEventListener('click', ev => { if ((ev.target as HTMLElement).closest('[data-act]')) this.soon(); }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide', () => this.save());
    setInterval(() => this.save(), 30000);
  },
};
