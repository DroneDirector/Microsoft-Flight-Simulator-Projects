// Backups of the whole airline (settings, looks, crews, fleet, money, logs, the PC link, everything that
// is saved) outside the app's own storage, so nothing is lost when the app's data is cleared, the app is
// uninstalled, or you move to a new phone.
//  - The app's own copy: the web storage plus a second copy in the app's files (Store.save). Android's
//    own backup also takes the app's data along to a new phone when that is switched on.
//  - A backup folder you choose (Documents, an SD card, a Google Drive folder…): the airline is written
//    there automatically, and after a reinstall you pick the same folder to get everything back.
//  - A backup file you save or open by hand.

const Backup = {
  folder: null as { set: boolean; name?: string; lastWrite?: number },
  _last: 0,
  _pending: '',

  tools(): any { return Store.native(); },

  init() {
    if (DESKTOP) { this.folder = { set: true, name: 'Documents\\Airline Manager Pro', lastWrite: 0 }; return; }
    const T = this.tools();
    if (T && T.backupFolderInfo) T.backupFolderInfo().then((r: any) => { this.folder = r; }).catch(() => { /* older app */ });
  },

  /** The current save as text (what Store.save writes). */
  snapshot(): string {
    Store.save();
    try { return localStorage.getItem(STORE_KEY) || ''; } catch (e) { return ''; }
  },

  /** Called after each save: copy to the backup folder every few minutes, and at once when leaving the app. */
  afterSave(json: string, now?: boolean) {
    if (!this.folder || !this.folder.set) return;
    this._pending = json;
    if (now || Date.now() - this._last > 3 * 60000) this.writeFolder();
  },
  writeFolder() {
    if (DESKTOP && this._pending) {
      const json = this._pending; this._pending = ''; this._last = Date.now();
      fetch('/api/backup', { method: 'PUT', body: json }).then(r => r.json()).then(() => { if (this.folder) this.folder.lastWrite = Date.now(); if ($('#set-body')) rerenderSettingsBody(); }).catch(() => { /* PC app closed */ });
      return;
    }
    const T = this.tools(), json = this._pending; if (!T || !json) return;
    this._pending = ''; this._last = Date.now();
    T.backupFolderWrite({ data: json }).then(() => { if (this.folder) this.folder.lastWrite = Date.now(); if ($('#set-body')) rerenderSettingsBody(); })
      .catch((e: any) => ErrorLog.add('backup', 'The backup couldn\'t be saved to your backup folder', (e && e.message) || String(e), 'Choose the folder again in Settings, Backup and restore.', false));
  },

  pickFolder(): Promise<any> {
    const T = this.tools(); if (!T) return Promise.resolve(null);
    return T.backupFolderPick().then((r: any) => { if (r && r.set) { this.folder = { set: true, name: r.name, lastWrite: 0 }; } return r; });
  },

  /** Is this text a backup of this app? Returns the parsed save or null. */
  parse(text: string): any {
    try { const d = JSON.parse(text); return d && d.state && typeof d.state === 'object' ? d : null; } catch (e) { return null; }
  },

  /** Replace everything with a backup and start again from it. */
  restore(text: string) {
    const d = this.parse(text); if (!d) { toast('That file isn\'t an Airline Manager Pro backup', 'warn'); return; }
    try { localStorage.setItem(STORE_KEY, text); } catch (e) { toast('The backup couldn\'t be stored on this phone', 'warn'); return; }
    const T = this.tools(); if (T && T.backupWrite) T.backupWrite({ data: text }).catch(() => { /* the web copy is there */ });
    toast('Backup restored', 'ok');
    setTimeout(() => location.reload(), 600);
  },

  fileName(): string { return `AirlineManagerPro-backup-${dateStr(new Date()).slice(0, 10)}.json`; },

  exportFile() {
    const json = this.snapshot(), T = this.tools();
    if (T && T.backupExport) { T.backupExport({ data: json, name: this.fileName() }).then((r: any) => { if (r && r.saved) toast('Backup file saved', 'ok'); }).catch((e: any) => ErrorLog.add('backup', 'The backup file couldn\'t be saved', (e && e.message) || String(e))); return; }
    // in a browser: download it
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = this.fileName();
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },

  importFile(): Promise<string> {
    const T = this.tools();
    if (T && T.backupImport) return T.backupImport().then((r: any) => (r && r.data) || '');
    return new Promise(res => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return res(''); const rd = new FileReader(); rd.onload = () => res(String(rd.result || '')); rd.readAsText(f); };
      inp.click();
    });
  },

  /** Ask before replacing the airline on this device with a backup: the backup and what is here now, side by
   *  side (when each was saved, by which version, the airlines, balance, fleet and flights), with a clear
   *  warning when the backup is older than what it would replace. */
  confirmRestore(text: string, from: string) {
    const d = this.parse(text); if (!d) { toast('No Airline Manager Pro backup was found there', 'warn'); return; }
    const here = DESKTOP ? 'this PC' : 'this phone';
    let cur: any = null; try { cur = JSON.parse(localStorage.getItem(Mode.key()) || 'null'); } catch (e) { /* nothing */ }
    if (cur && !cur.state) cur = null;
    if (!cur && !Store.wasEmpty) { const o: any = {}; for (const k of SAVED_KEYS) o[k] = (State as any)[k]; cur = { savedAt: Date.now(), app: APP.version, state: o }; }
    const card = (title: string, x: any, cls: string, verb: string) => {
      if (!x) return `<div class="rs-card ${cls}"><small class="rs-k">${esc(title)}</small><b>Nothing saved on ${here}</b><small>A fresh start: nothing will be lost.</small></div>`;
      const st = x.state || {}, cos = (st.companies || []).map((c: any) => c.name).join(', '), sm = typeof syncSummary === 'function' ? syncSummary(st) : null;
      return `<div class="rs-card ${cls}"><small class="rs-k">${esc(title)}</small><b>${esc(cos || 'Your airline')}</b>
        <span><small>Saved</small>${esc(x.savedAt ? dateStr(new Date(x.savedAt)) : 'unknown time')}</span>
        <span><small>Version</small>${esc(x.app || '?')}</span>
        ${sm ? `<span><small>Balance</small>${esc(sm.balance)}</span><span><small>Aircraft</small>${sm.fleet}</span><span><small>Flights in the log</small>${sm.flights}</span>` : ''}
        <em>${esc(verb)}</em></div>`;
    };
    const older = cur && cur.savedAt && d.savedAt && d.savedAt < cur.savedAt - 60000;
    const warn = !cur ? '' : older
      ? `<p class="v3d-note warn">${icon('alert')}The backup is older than what is on ${here} now (saved ${esc(dateStr(new Date(cur.savedAt)))}). Restoring it replaces the newer airline here, and everything since the backup is lost.</p>`
      : `<p class="v3d-note">${icon('info')}Restoring replaces the airline on ${here}: settings, looks, staff, fleet, money, flight logs and the link to your PC.</p>`;
    (window as any).__restoreText = text;
    openLayer('modal', `<div class="modal-head"><div><h2>Restore this backup?</h2><small>${esc(from)}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
      <div class="rs-cards">${card('The backup', d, 'from', 'Will be restored')}${card('Now on ' + here, cur, 'to', 'Will be replaced')}</div>
      ${warn}
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">${cur ? 'Keep what is here' : 'Cancel'}</button><button class="btn primary ${older ? 'danger' : ''}" data-act="backup-restore-go">${icon('check')}${older ? 'Restore the older backup' : 'Restore'}</button></div>`, { cls: 'wide' });
  },

  /** First start with nothing saved (a new phone, a reinstall, cleared data): offer to bring the airline back. */
  offerRestoreOnFirstStart() {
    if (DESKTOP && Store.wasEmpty && !Mode.coop()) {
      fetch('/api/backup').then(r => r.json()).then(r => { if (r && r.data) setTimeout(() => this.confirmRestore(r.data, 'Found in Documents\\Airline Manager Pro on this PC'), 1500); else setTimeout(() => firstStartWelcome(false), SPLASH_MS + 600); }).catch(() => setTimeout(() => firstStartWelcome(false), SPLASH_MS + 600));
      return;
    }
    if (Mode.coop()) { if (Store.wasEmpty) setTimeout(() => coopWorldWelcome(), SPLASH_MS + 600); return; }
    if (!Store.wasEmpty) return;
    setTimeout(() => firstStartWelcome(!!this.tools()), SPLASH_MS + 600);
  },
};

ACTIONS['backup-folder'] = () => {
  Backup.pickFolder().then(r => {
    if (!r || !r.set) return;
    toast(`Backups go to ${r.name || 'the chosen folder'}`, 'ok');
    Backup.afterSave(Backup.snapshot(), true);
    rerenderSettingsBody();
  }).catch((e: any) => ErrorLog.add('backup', 'That folder couldn\'t be used', (e && e.message) || String(e)));
};
ACTIONS['backup-now'] = () => { Backup.afterSave(Backup.snapshot(), true); toast('Backup saved', 'ok'); setTimeout(() => rerenderSettingsBody(), 800); };
ACTIONS['backup-export'] = () => Backup.exportFile();
ACTIONS['backup-import'] = () => { Backup.importFile().then(t => { if (t) { closeAll(); Backup.confirmRestore(t, 'From a backup file'); } }).catch((e: any) => ErrorLog.add('backup', 'The backup file couldn\'t be opened', (e && e.message) || String(e))); };
ACTIONS['backup-folder-restore'] = () => {
  const T = Backup.tools(); if (!T) return;
  Backup.pickFolder().then(r => {
    if (!r || !r.set) return;
    if (!r.hasBackup) { toast(`No backup in ${r.name || 'that folder'} yet. New backups will go there.`, 'info'); closeAll(); return; }
    return T.backupFolderRead().then((x: any) => { closeAll(); Backup.confirmRestore((x && x.data) || '', `From ${r.name || 'your backup folder'}`); });
  }).catch((e: any) => ErrorLog.add('backup', 'The backup folder couldn\'t be read', (e && e.message) || String(e)));
};
ACTIONS['backup-restore-go'] = () => { const t = (window as any).__restoreText; closeAll(); if (t) Backup.restore(t); };
