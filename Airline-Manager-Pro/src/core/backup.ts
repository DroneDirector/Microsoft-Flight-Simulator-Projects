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
    const T = this.tools(), json = this._pending; if (!T || !json) return;
    this._pending = ''; this._last = Date.now();
    T.backupFolderWrite({ data: json }).then(() => { if (this.folder) this.folder.lastWrite = Date.now(); })
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

  /** Ask before replacing the airline on this phone with a backup. */
  confirmRestore(text: string, from: string) {
    const d = this.parse(text); if (!d) { toast('No Airline Manager Pro backup was found there', 'warn'); return; }
    const st = d.state || {}, cos = (st.companies || []).map((c: any) => c.name).join(', ');
    const when = d.savedAt ? dateStr(new Date(d.savedAt)) : 'unknown time';
    (window as any).__restoreText = text;
    openLayer('modal', `<div class="modal-head"><div><h2>Restore this backup?</h2><small>${esc(from)}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
      <div class="set-card"><span class="pc-ic">${icon('download')}</span><span><b>${esc(cos || 'Your airline')}</b><small>Saved ${esc(when)} by version ${esc(d.app || '?')}</small></span></div>
      <p class="lede">Everything on this phone is replaced with the backup: settings, looks, staff, fleet, money, flight logs and the link to your PC.</p>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn primary" data-act="backup-restore-go">${icon('check')}Restore</button></div>`, { cls: 'sm' });
  },

  /** First start with nothing saved (a new phone, a reinstall, cleared data): offer to bring the airline back. */
  offerRestoreOnFirstStart() {
    if (!Store.wasEmpty || !this.tools()) return;
    setTimeout(() => openLayer('modal', `<div class="modal-head"><div><h2>Welcome to ${esc(APP.name)}</h2><small>Have you used the app before?</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
      <p class="lede">If you made backups on another phone or before reinstalling, you can bring your airline back now: settings, looks, staff, fleet, money and flight logs.</p>
      <div class="btn-col">
        <button class="btn primary" data-act="backup-folder-restore">${icon('download')}Choose my backup folder</button>
        <button class="btn ghost" data-act="backup-import">${icon('download')}Open a backup file</button>
        <button class="btn ghost" data-act="close-layer">Start a new airline</button>
      </div>`, { cls: 'sm' }), 1800);
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
