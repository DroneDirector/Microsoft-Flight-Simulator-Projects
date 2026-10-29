// Settings. Sections are plain data, so new options are added by appending an entry here.

type SetItem =
  | { type: 'toggle'; key: string; label: string; hint?: string; when?: () => boolean }
  | { type: 'choice'; key: string; label: string; hint?: string; options: string[][]; when?: () => boolean }
  | { type: 'html'; html: () => string };

interface SetSection { id: string; title: string; icon: string; items: SetItem[] }

const SETTINGS: SetSection[] = [
  { id: 'general', title: 'General', icon: 'sliders', items: [
    { type: 'html', html: () => `<div class="set-card"><span class="brand-lg">${brandMark()}</span><span><b>${esc(APP.name)}</b><small>Version ${esc(APP.version)}</small></span><button class="btn ghost sm" data-act="whats-new">${icon('star')}What's new</button></div>` },
    { type: 'choice', key: 'units', label: 'Units', options: [['imperial', 'Feet, knots, nm'], ['metric', 'Metres, km/h, km']] },
    { type: 'toggle', key: 'clock24', label: '24-hour clock' },
    { type: 'choice', key: 'crewStyle', label: 'Crew figures', hint: 'How your pilots, cabin crew and mechanics are drawn. Natural has real human proportions; stylised has a slightly larger head and eyes, like an animated film.', options: [['natural', 'Natural'], ['balanced', 'In-between'], ['stylised', 'Stylised']] },
  ] },
  { id: 'licence', title: 'Registration', icon: 'key', items: [
    { type: 'html', html: () => licenceHtml() },
  ] },
  { id: 'ai', title: 'Virtual pilots', icon: 'fleet', items: [
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Your hired pilots fly their routes even while the app is closed. Each flight takes as long as it would in real life, worked out from the distance along airways, the aircraft's climb, cruise and descent speeds at each altitude, taxi times and the jet stream.</p>` },
    { type: 'choice', key: 'aiSpeed', label: 'Virtual pilot speed', hint: 'Real time is how long the flight takes in the real world. Faster speeds also shorten turnarounds and rest. Only your hired pilots are affected, never your own flights.', options: [['1', 'Real time'], ['2', '2×'], ['4', '4×'], ['10', '10×'], ['30', '30×']] },
    { type: 'toggle', key: 'aiNotify', label: 'Notify me when my pilots land', hint: 'A phone notification when a hired pilot reaches the gate, even when the app is closed.' },
  ] },
  { id: 'time', title: 'Time and years', icon: 'clock', items: [
    { type: 'choice', key: 'timeMode', label: 'Company calendar', hint: 'Real-world years follow today’s date. Simulated years run faster, so your airline can build up several years of history.', options: [['real', 'Real-world years'], ['sim', 'Simulated years']] },
    { type: 'choice', key: 'simRate', label: 'Simulation speed', hint: 'How much company time passes for each real day.', options: [['week', '1 day = 1 week'], ['month', '1 day = 1 month'], ['quarter', '1 day = 3 months']], when: () => State.settings.timeMode === 'sim' },
  ] },
  { id: 'sync', title: 'Simulator link', icon: 'sync', items: [
    { type: 'html', html: () => {
      const on = Link.status === 'connected', pc = Link.pc;
      const sub = on ? `${Link.sim && Link.sim.connected ? esc(Link.sim.sim) : 'Flight Simulator not running'} on ${esc(pc.name)}, ${esc(pc.ip)}${Link.via !== 'wifi' ? ', through your phone\'s ' + (Link.via === 'usb' ? 'USB tethering' : 'hotspot') : ''}${Link.latency ? ', ' + Link.latency + ' ms' : ''}`
        : pc ? `Paired with ${esc(pc.name)}. Looking for it on this network…` : 'Not paired yet. The screens show demo data until you link your PC.';
      return `<div class="set-card link ${on ? 'ok' : ''}"><span class="pc-ic">${icon('pc')}</span><span><b>${on ? 'Connected to your PC' : pc ? 'Not connected' : 'No PC linked'}</b><small>${sub}</small></span><button class="btn ${pc ? 'ghost' : 'primary'} sm" data-act="link-panel">${pc ? 'Details' : 'Link a PC'}</button></div>`
        + (pc ? `<div class="btn-row"><button class="btn ghost sm" data-act="link-forget">${icon('close')}Unpair ${esc(pc.name)}</button></div>` : '');
    } },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}The app links to the ${esc(APP.shortName)} PC app over your local network: put the phone and the PC with Flight Simulator on the same Wi-Fi, or connect the PC to your phone's hotspot to use mobile data.</p>` },
    { type: 'toggle', key: 'gsx', label: 'I use GSX Pro', hint: 'Boarded passengers and the ground services you actually use in GSX (boarding, deboarding, catering, fuelling, pushback, de-icing) are taken from GSX and charged at real-world ground handling rates in Finance. Off, or without GSX: the app’s own passenger numbers and a standard handling and catering charge per flight.' },
  ] },
  { id: 'atc', title: 'ATC', icon: 'radio', items: [
    { type: 'choice', key: 'atcSource', label: 'ATC source', options: [['builtin', 'Built-in ATC'], ['beyondatc', 'BeyondATC']] },
    { type: 'toggle', key: 'atcListen', label: 'Listen to BeyondATC audio', hint: 'The PC bridge transcribes BeyondATC offline to detect your clearances.', when: () => State.settings.atcSource === 'beyondatc' },
    { type: 'toggle', key: 'atcFines', label: 'Clearance violations and fines', hint: 'Taking off, landing or taxiing without clearance earns a fine you can contest.' },
    { type: 'toggle', key: 'atcTranscripts', label: 'Save ATC transcripts to the logbook' },
    { type: 'choice', key: 'sttQuality', label: 'Speech recognition quality', hint: 'Higher quality uses more of your PC while you fly.', options: [['light', 'Light'], ['balanced', 'Balanced'], ['accurate', 'Accurate']], when: () => State.settings.atcSource === 'beyondatc' && State.settings.atcListen },
  ] },
  { id: 'staff', title: 'Staff', icon: 'pilots', items: [
    { type: 'toggle', key: 'conduct', label: 'Conduct reports and behaviour', hint: 'Misconduct, warnings and court cases for your AI crew. Switching off never removes what already happened; court cases pause and carry on when you switch back on.' },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Most of the time your staff behave well. Choose how often someone steps out of line. You'll be asked to discipline or dismiss them when it happens.</p>` },
    { type: 'html', html: () => [['fa', 'Flight attendants'], ['mech', 'Mechanics'], ['fo', 'Co-pilots']].map(r => `<div class="ch-row"><span><b>${r[1]}</b><small>How often they misbehave</small></span><div class="seg">${[['never', 'Never'], ['rare', 'Rarely'], ['normal', 'Sometimes'], ['often', 'Often']].map(o => `<button class="${(State.settings as any).misconduct[r[0]] === o[0] ? 'on' : ''}" data-act="set-misconduct" data-r="${r[0]}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div></div>`).join('') },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Rarely is about 2% of the time, sometimes about 5–10%, often about 20%.</p>` },
  ] },
  { id: 'realism', title: 'Damage and realism', icon: 'shield', items: [
    { type: 'toggle', key: 'damage', label: 'Damage detection', hint: 'Tail strikes, hard landings, overspeed, engine failures and overstress the simulator can detect.' },
    { type: 'toggle', key: 'turbulence', label: 'Severe turbulence damage', hint: 'Only extreme turbulence counts, with realistic results: inspections, overstress, cabin damage.' },
    { type: 'toggle', key: 'crashPrompt', label: 'Ask me before registering a crash', hint: 'Choose to register or disregard each crash.' },
  ] },
  { id: 'voice', title: 'Mechanic voice', icon: 'volume', items: [
    { type: 'toggle', key: 'mechanicVoice', label: 'Mechanic speaks his messages', hint: 'Runs fully on this device, no internet needed.' },
    { type: 'choice', key: 'voiceEngine', label: 'Voice', options: [['clips', 'Recorded lines'], ['neural', 'Neural voice pack'], ['device', 'Device voice']], when: () => State.settings.mechanicVoice },
    { type: 'html', html: () => State.settings.mechanicVoice && State.settings.voiceEngine === 'neural' ? `<div class="set-card"><span class="pc-ic">${icon('volume')}</span><span><b>Neural voice pack</b><small>${State.settings.voicePack ? 'Installed' : 'About 180 MB, downloaded once'}</small></span><button class="btn ${State.settings.voicePack ? 'ghost' : 'primary'} sm" data-act="voicepack">${State.settings.voicePack ? 'Remove' : 'Download'}</button></div>` : '' },
    { type: 'html', html: () => `<button class="btn ghost" data-act="voice-test">${icon('play')}Hear a sample</button>` },
  ] },
  { id: 'sound', title: 'Sound and feel', icon: 'volume', items: [
    { type: 'toggle', key: 'muteAll', label: 'Mute all sounds', hint: 'Silences every sound in the app, including the mechanic’s voice.' },
    { type: 'toggle', key: 'purchaseSound', label: 'Purchase sound', hint: 'Plays when you buy an aircraft.', when: () => !State.settings.muteAll },
    { type: 'html', html: () => State.settings.muteAll ? '' : `<button class="btn ghost" data-act="sound-test">${icon('play')}Play purchase sound</button>` },
    { type: 'toggle', key: 'paySound', label: 'Payment sound', hint: 'Plays when you pay a bill, repair or fine.', when: () => !State.settings.muteAll },
    { type: 'html', html: () => State.settings.muteAll ? '' : `<button class="btn ghost" data-act="pay-test">${icon('play')}Play payment sound</button>` },
    { type: 'toggle', key: 'uiSounds', label: 'Interface sounds', when: () => !State.settings.muteAll },
    { type: 'toggle', key: 'haptics', label: 'Vibration feedback' },
    { type: 'toggle', key: 'reduceMotion', label: 'Reduce motion', hint: 'Shorter animations and a still map.' },
  ] },
  { id: 'profiles', title: 'Profiles and companies', icon: 'pilots', items: [
    { type: 'choice', key: 'appMode', label: 'How pilots and companies relate', options: [['shared', 'One pilot, several companies'], ['separate', 'A pilot per company']] },
    { type: 'html', html: () => State.profiles.map(pr => {
      const pl = pilot(pr.pilotId);
      return `<div class="set-card col"><div class="sc-h">${icon('user')}<span><b>${esc(pl.name)}</b><small>${esc(pr.label)}</small></span></div>
        ${State.companies.filter(c => c.profileId === pr.id).map(c => `<div class="sc-co"><span class="co-badge sm" style="--co:${c.color};--co2:${c.color2}">${esc(c.icao)}</span><b>${esc(c.name)}</b>
          <small>${c.divisions.length ? c.divisions.map(d => esc(d.name)).join(' and ') + ' divisions, shared money and reputation' : 'Separate company'}, ${State.fleet.filter(a => a.companyId === c.id).length} aircraft, ${money(c.balance, { compact: true })}</small>
          <button class="del-btn edit" data-act="edit-company" data-co="${c.id}" aria-label="Edit ${esc(c.name)}">${icon('sliders')}</button>
          <button class="del-btn" data-act="delete-company" data-co="${c.id}" aria-label="Delete ${esc(c.name)}">${icon('trash')}</button></div>`).join('')}</div>`;
    }).join('') + `<div class="btn-row"><button class="btn ghost" data-act="new-company">${icon('plus')}New company</button><button class="btn ghost" data-act="new-division">${icon('plus')}New division</button></div>
      <div class="danger-zone"><span><b>Saved on this device</b><small>Your companies are saved automatically and kept when the app updates.</small></span><button class="btn ghost sm danger-txt" data-act="reset-ask">${icon('trash')}Delete everything</button></div>` },
  ] },
  { id: 'backup', title: 'Backup and restore', icon: 'shield', items: [
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Everything is saved on this phone the moment it changes: settings, looks, staff, fleet, money, flight logs and the link to your PC. When you open the app again it is exactly as you left it, also after updates.</p>` },
    { type: 'html', html: () => {
      const f = Backup.folder, native = !!Backup.tools() || DESKTOP;
      if (!native) return `<div class="set-card"><span class="pc-ic">${icon('shield')}</span><span><b>Backups</b><small>Save a backup file and open it again on any device.</small></span></div>`;
      const last = f && f.lastWrite ? 'last saved ' + dateStr(new Date(f.lastWrite)) : 'no backup written yet';
      return `<div class="set-card ${f && f.set ? 'ok' : ''}"><span class="pc-ic">${icon('shield')}</span><span><b>${f && f.set ? 'Automatic backups are on' : 'Choose a backup folder'}</b>
        <small>${f && f.set ? `To ${esc(f.name || 'your folder')}, ${esc(last)}. Clearing the app's data or reinstalling doesn't touch it.` : 'Pick a folder outside the app (Documents, an SD card or a Google Drive folder). The airline is copied there automatically, and after a reinstall or on a new phone you pick it again to get everything back.'}</small></span>
        ${DESKTOP ? '' : `<button class="btn ${f && f.set ? 'ghost' : 'primary'} sm" data-act="backup-folder">${f && f.set ? 'Change' : 'Choose folder'}</button>`}</div>`
        + (f && f.set ? `<div class="btn-row"><button class="btn ghost sm" data-act="backup-now">${icon('check')}Back up now</button></div>` : '');
    } },
    { type: 'html', html: () => `<div class="btn-row"><button class="btn ghost sm" data-act="backup-export">${icon('download')}Save a backup file</button><button class="btn ghost sm" data-act="backup-import">${icon('sync')}Restore from a backup</button></div>` },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Android's own backup (Settings → Google → Backup on the phone) also carries the app's data to a new phone.</p>` },
  ] },
  { id: 'support', title: 'Updates and errors', icon: 'download', items: [
    { type: 'html', html: () => {
      const u = Updater, busy = u.state === 'checking' || u.state === 'downloading' || u.state === 'installing';
      return `<div class="set-card"><span class="pc-ic">${icon('download')}</span><span><b>Version ${esc(APP.version)}</b><small>${esc(updateStatusText())}</small></span>
        ${u.state === 'available' ? `<button class="btn primary sm" data-act="update-open">Install ${esc(u.info.version)}</button>` : `<button class="btn ghost sm" data-act="update-check" ${busy ? 'disabled' : ''}>Check for updates</button>`}</div>`;
    } },
    { type: 'html', html: () => {
      const n = ErrorLog.list.length;
      return `<div class="set-card col"><div class="sc-h">${icon('alert')}<span><b>Error log</b><small>${n ? n + ' saved, newest first. Tap one to see the details.' : 'No errors so far. If something goes wrong, the details show up here.'}</small></span></div>
        ${ErrorLog.list.slice(0, 12).map(e => `<button class="err-row" data-act="err-open" data-id="${e.id}"><b>${esc(e.title)}</b><span>${esc(e.message)}</span><small>${esc(e.time)}</small></button>`).join('')}
        ${n ? `<div class="btn-row"><button class="btn ghost sm" data-act="err-show-all">Show all</button><button class="btn ghost sm" data-act="err-copy">${icon('copy')}Copy</button><button class="btn ghost sm" data-act="err-share">${icon('share')}Share</button><button class="btn ghost sm danger-txt" data-act="err-clear">${icon('trash')}Clear</button></div>` : ''}</div>`;
    } },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}The error log stays on this device. Nothing is sent anywhere unless you copy or share it yourself.</p>` },
  ] },
  { id: 'about', title: 'About', icon: 'info', items: [
    { type: 'html', html: () => `<div class="about"><p><b>${esc(APP.name)}</b> ${esc(APP.version)}, early preview. Screens show demo data until your simulator is linked.</p>
      <p>Aircraft and company names are used only to identify the products installed in your simulator. Aircraft illustrations are original artwork.</p>
      <h4>Credits</h4><p>Inter typeface by The Inter Project Authors, SIL Open Font License 1.1.</p><p>three.js by the three.js authors, MIT License.</p><p>Human body model and shape targets from MakeHuman, CC0 1.0 (public domain).</p><p>MapLibre GL JS, BSD 3-Clause License. Street map © OpenStreetMap contributors, OpenMapTiles, OpenFreeMap. Satellite map: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0.</p></div>` },
  ] },
];

let _setSection = 'general';

/* ---------- Registration ---------- */
let _lic: { form: '' | 'key' | 'react'; key: string; msg: string; bad: boolean; busy: boolean } = { form: '', key: '', msg: '', bad: false, busy: false };

function licenceHtml(): string {
  const st = Licence.status(), r = Licence.rec();
  const msg = _lic.msg ? `<p class="lic-msg ${_lic.bad ? 'bad' : 'ok'}">${icon(_lic.bad ? 'alert' : 'check')}${esc(_lic.msg)}</p>` : '';
  const keyIn = (v: string) => `<input class="le-in lic-in" id="lic-key" value="${esc(v)}" placeholder="XXXXX-XXXXX-XXXXX" maxlength="23" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Registration key">`;
  const card = st === 'ok'
    ? `<div class="set-card ok lic-card"><span class="pc-ic">${icon('key')}</span><span><b>Registered</b><small>Key ${esc(r.masked)} on ${esc(r.deviceName)}, since ${esc(dateStr(new Date(r.at)))}</small></span></div>`
    : st === 'moved'
    ? `<div class="set-card warn lic-card"><span class="pc-ic">${icon('alert')}</span><span><b>Registered on another device</b><small>Key ${esc(r.masked)} was registered on ${esc(r.deviceName)}. Enter it here with a reactivation code to move it to this device.</small></span></div>`
    : st === 'checking'
    ? `<div class="set-card lic-card"><span class="pc-ic">${icon('key')}</span><span><b>Checking the registration…</b></span></div>`
    : `<div class="set-card lic-card"><span class="pc-ic">${icon('key')}</span><span><b>Not registered</b><small>Enter the registration key you received with your purchase.</small></span></div>`;
  const form = st === 'moved' || _lic.form === 'react'
    ? `<div class="lic-form"><div class="le-group"><b>Registration key</b>${keyIn(_lic.key)}</div>
        <div class="le-group"><b>Reactivation code</b><input class="le-in lic-in" id="lic-code" placeholder="XXXXX-XXXXX-XXXXX" maxlength="23" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Reactivation code"></div>
        ${msg}<div class="btn-row"><button class="btn primary sm" data-act="lic-react" ${_lic.busy ? 'disabled' : ''}>${icon('key')}Reactivate on this device</button>${st !== 'moved' ? `<button class="btn ghost sm" data-act="lic-cancel">Cancel</button>` : ''}</div></div>`
    : st === 'none' || _lic.form === 'key'
    ? `<div class="lic-form"><div class="le-group"><b>Registration key</b>${keyIn(_lic.key)}</div>${msg}
        <div class="btn-row"><button class="btn primary sm" data-act="lic-register" ${_lic.busy ? 'disabled' : ''}>${icon('check')}Register</button>${st === 'ok' ? `<button class="btn ghost sm" data-act="lic-cancel">Cancel</button>` : ''}</div></div>`
    : `${msg}<div class="btn-row"><button class="btn ghost sm" data-act="lic-form" data-f="key">${icon('key')}Enter a key again</button><button class="btn ghost sm" data-act="lic-form" data-f="react">${icon('sync')}Use a reactivation code</button></div>`;
  return card + form
    + `<p class="fine-print">${icon('info')}A registration key belongs to the first device it is registered on. That device can register it again as often as needed, also after reinstalling the app. On a new phone or PC, or after Windows or the phone has been set up from scratch, the key needs a reactivation code. Each reactivation code works once.</p>`;
}
// keys are typed in capitals, in groups of five
document.addEventListener('input', e => {
  const el = e.target as HTMLInputElement; if (!el || !el.classList || !el.classList.contains('lic-in')) return;
  const raw = Licence.normalise(el.value).slice(0, 15), v = Licence.show(raw);
  if (v !== el.value) { el.value = v; try { el.setSelectionRange(v.length, v.length); } catch (er) { /* not focused */ } }
});
function licRerender() { if (_setSection === 'licence') rerenderSettingsBody(); }
function licVal(id: string): string { const el = $('#' + id) as HTMLInputElement; return el ? el.value : ''; }
ACTIONS['lic-form'] = el => { _lic = { form: el.getAttribute('data-f') as any, key: '', msg: '', bad: false, busy: false }; Sound.tick(); licRerender(); const k = $('#lic-key') as HTMLInputElement; if (k) k.focus(); };
ACTIONS['lic-cancel'] = () => { _lic = { form: '', key: '', msg: '', bad: false, busy: false }; Sound.tick(); licRerender(); };
ACTIONS['lic-register'] = () => {
  const key = licVal('lic-key'); if (!key.trim()) { _lic.msg = 'Enter your registration key first.'; _lic.bad = true; licRerender(); return; }
  _lic.key = key; _lic.busy = true; _lic.msg = ''; licRerender();
  Licence.register(key).then(res => {
    _lic.busy = false;
    if (res === 'ok') { _lic = { form: '', key: '', msg: 'Thank you! The app is registered on this device.', bad: false, busy: false }; Haptics.success(); Sound.purchase(); }
    else if (res === 'other-device') { _lic.form = 'react'; _lic.msg = 'This key is registered on another device. Enter a reactivation code to move it here.'; _lic.bad = true; }
    else { _lic.msg = 'That isn’t a valid registration key. Check it against the one you received with your purchase.'; _lic.bad = true; Haptics.pulse(30); }
    licRerender();
  });
};
ACTIONS['lic-react'] = () => {
  const key = licVal('lic-key'), code = licVal('lic-code');
  if (!key.trim() || !code.trim()) { _lic.key = key; _lic.msg = 'Enter both your registration key and the reactivation code.'; _lic.bad = true; licRerender(); return; }
  _lic.key = key; _lic.busy = true; _lic.msg = ''; licRerender();
  Licence.reactivate(key, code).then(res => {
    _lic.busy = false;
    const m: { [k: string]: string } = { 'invalid-key': 'That isn’t a valid registration key.', 'invalid-code': 'That isn’t a valid reactivation code.', 'used-code': 'That reactivation code has already been used. Each code works once.' };
    if (res === 'ok') { _lic = { form: '', key: '', msg: 'Reactivated. The key now belongs to this device.', bad: false, busy: false }; Haptics.success(); Sound.purchase(); }
    else { _lic.msg = m[res]; _lic.bad = true; Haptics.pulse(30); }
    licRerender();
  });
};

function settingsBody(): string {
  const sec = SETTINGS.filter(s => s.id === _setSection)[0];
  const S: any = State.settings;
  return `<h2>${esc(sec.title)}</h2>` + sec.items.map(it => {
    if ((it as any).when && !(it as any).when()) return '';
    if (it.type === 'toggle') return `<label class="tg-row"><span><b>${esc(it.label)}</b>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</span>${toggle(it.key, !!S[it.key])}</label>`;
    if (it.type === 'choice') return `<div class="ch-row"><span><b>${esc(it.label)}</b>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</span><div class="seg">${it.options.map(o => `<button class="${S[it.key] === o[0] ? 'on' : ''}" data-act="set-choice" data-key="${it.key}" data-v="${o[0]}">${esc(o[1])}</button>`).join('')}</div></div>`;
    return it.html();
  }).join('');
}

function settingsHtml(): string {
  return `
  <div class="settings">
    <nav class="set-nav">
      <div class="set-title"><b>Settings</b></div>
      ${SETTINGS.map(s => `<button class="set-tab ${_setSection === s.id ? 'on' : ''}" data-act="set-section" data-s="${s.id}">${icon(s.icon)}<span>${esc(s.title)}</span></button>`).join('')}
    </nav>
    <div class="set-body" id="set-body">${settingsBody()}</div>
    <button class="icon-btn set-close" data-act="close-layer" aria-label="Close settings">${icon('close')}</button>
  </div>`;
}

ACTIONS.settings = el => {
  const sec = el && el.getAttribute('data-section');
  if (sec) _setSection = sec;
  closeAll(); Sound.tick();
  openLayer('modal', settingsHtml(), { cls: 'full settings-pop' });
};
function rerenderSettingsBody(anim?: boolean) {
  const b = $('#set-body'); if (!b) return;
  b.innerHTML = settingsBody();
  if (anim) { b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap'); }
}
ACTIONS['set-section'] = el => {
  _setSection = el.getAttribute('data-s'); Sound.tick();
  $all('.set-tab').forEach(t => t.classList.toggle('on', t.getAttribute('data-s') === _setSection));
  rerenderSettingsBody(true);
};
ACTIONS['set-choice'] = el => {
  if (el.getAttribute('data-key') === 'aiSpeed') aiSetSpeed(+el.getAttribute('data-v') || 1);
  (State.settings as any)[el.getAttribute('data-key')] = el.getAttribute('data-v');
  Store.save();
  Sound.tick(); rerenderSettingsBody();
  refresh();
};

ACTIONS.toggle = el => {
  const key = el.getAttribute('data-key');
  const on = !el.classList.contains('on');
  el.classList.toggle('on', on); el.setAttribute('aria-checked', String(on));
  if (key in State.settings) (State.settings as any)[key] = on;
  Sound.tick(); Haptics.pulse(8);
  if (key === 'mk-installed') { _mkInstalled = on; refresh(); return; }
  if (key === 'reduceMotion') document.documentElement.classList.toggle('calm', on);
  if (key === 'muteAll') { if (on) Voice.stop(); renderTopbar(); }
  if (key === 'conduct') setConduct(on);
  if (key in State.settings) { Store.save(); setTimeout(() => rerenderSettingsBody(), 180); }
};

ACTIONS['sound-test'] = () => { const was = State.settings.purchaseSound; State.settings.purchaseSound = true; Sound.purchase(); Haptics.success(); State.settings.purchaseSound = was; };
ACTIONS['pay-test'] = () => { const was = State.settings.paySound; State.settings.paySound = true; Sound.payOut(); Haptics.pulse(30); State.settings.paySound = was; };
ACTIONS['voice-test'] = () => { Voice.speak('Morning, captain. I had a look at your aircraft after that last flight. Everything is in good shape.'); };
ACTIONS.voicepack = () => { State.settings.voicePack = !State.settings.voicePack; rerenderSettingsBody(); toast(State.settings.voicePack ? 'Voice pack installed' : 'Voice pack removed', 'ok'); };
ACTIONS['link-forget'] = () => { Link.forget(); rerenderSettingsBody(); toast('PC unpaired', 'info'); };
ACTIONS['new-division'] = () => {
  const c = company();
  c.divisions.push({ id: uid(), name: 'Division ' + (c.divisions.length + 1), color: '#5FD4A0' });
  rerenderSettingsBody(); renderTopbar(); toast(`New division added to ${c.name}`, 'ok');
};

ACTIONS['reset-ask'] = () => {
  Sound.tick();
  openLayer('modal', `<div class="modal-head del-head"><span class="del-ic">${icon('trash')}</span><div><h2>Delete everything?</h2><small>All companies, pilot profiles, aircraft, routes, flight logs, finances and settings on this device</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body"><p class="lede warn">${icon('alert')}This can't be undone. The app starts again from the beginning.</p>
    <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn danger" data-act="reset-do">Yes, delete everything</button></div></div>`, { cls: 'narrow' });
};

ACTIONS['delete-company'] = el => {
  const c = company(el.getAttribute('data-co')); if (!c) return;
  Sound.tick();
  if (State.companies.length === 1) {
    openLayer('modal', `<div class="modal-head"><h2>${esc(c.name)} is your only company</h2><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
      <div class="modal-body"><p class="lede">${icon('info')}Create another company first, or delete everything to start from the beginning.</p>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn" data-act="new-company">${icon('plus')}New company</button></div></div>`, { cls: 'narrow' });
    return;
  }
  const regs = State.fleet.filter(a => a.companyId === c.id).map(a => a.reg);
  const routes = State.routes.filter(r => r.companyId === c.id).length;
  const logs = State.logbook.filter(l => regs.indexOf(l.reg) >= 0).length;
  openLayer('modal', `<div class="modal-head del-head"><span class="co-badge" style="--co:${c.color};--co2:${c.color2}">${esc(c.icao)}</span><div><h2>Delete ${esc(c.name)}?</h2><small>Are you sure? This can't be undone.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body">
      <div class="kv-row">
        <div><small>Aircraft</small><b>${regs.length}</b></div>
        <div><small>Routes</small><b>${routes}</b></div>
        <div><small>Flight log entries</small><b>${logs}</b></div>
        <div><small>Balance</small><b>${money(c.balance, { compact: true })}</b></div>
      </div>
      <p class="lede warn">${icon('alert')}All of this is deleted with the company. Your pilot profile and other companies stay as they are.</p>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Keep ${esc(c.name)}</button><button class="btn danger" data-act="delete-company-do" data-co="${c.id}">${icon('trash')}Yes, delete ${esc(c.name)}</button></div>
    </div>`, { cls: 'narrow' });
};
ACTIONS['delete-company-do'] = el => {
  const id = el.getAttribute('data-co'), c = company(id);
  const regs = State.fleet.filter(a => a.companyId === id).map(a => a.reg);
  State.companies = State.companies.filter(x => x.id !== id);
  State.fleet = State.fleet.filter(a => a.companyId !== id);
  State.live = State.live.filter(f => regs.indexOf(f.reg) < 0);
  State.routes = State.routes.filter(r => r.companyId !== id);
  State.issues = State.issues.filter(i => regs.indexOf(i.reg) < 0);
  State.logbook = State.logbook.filter(l => regs.indexOf(l.reg) < 0);
  delete State.myReg[id];
  if (State.companyId === id) { State.companyId = State.companies[0].id; State.divisionId = 'all'; applyCompanyTheme(true); }
  closeTop();
  Haptics.pulse(30); Store.save();
  rerenderSettingsBody(); renderTopbar(); refresh();
  toast(`${c.name} deleted`, 'warn');
};
ACTIONS['reset-do'] = () => Store.reset();

ACTIONS['set-misconduct'] = el => { (State.settings as any).misconduct[el.getAttribute('data-r')] = el.getAttribute('data-v'); Sound.tick(); rerenderSettingsBody(); };

/* ---------- Edit an airline: name, codes, home base, colours (asks before applying) ---------- */
const CO_COLORS = ['#2C8CFF', '#3FB6A8', '#E2A23B', '#D2553A', '#9C7CFF', '#E04BD6', '#1F4E9C', '#D81939', '#2D8C3C', '#F2C14E', '#0B1560', '#7FC4FF'];
let _coEdit: any = null;
ACTIONS['edit-company'] = el => {
  const c = company(el.getAttribute('data-co')); if (!c) return;
  _coEdit = { id: c.id, color: c.color };
  openLayer('modal', `<div class="modal-head"><div><h2>Edit ${esc(c.name)}</h2><small>Name, codes, home base and colours</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body">
      <div class="le-group"><b>Name</b><input class="le-in" data-co-name value="${esc(c.name)}" maxlength="40" autocomplete="off"></div>
      <div class="le-row2"><div class="le-group"><b>ICAO code</b><input class="le-in" data-co-icao value="${esc(c.icao)}" maxlength="3" autocomplete="off"></div>
        <div class="le-group"><b>Callsign</b><input class="le-in" data-co-cs value="${esc(c.callsign)}" maxlength="16" autocomplete="off"></div></div>
      <div class="le-group"><b>Home base</b><select class="le-in" data-co-hub>${Object.keys(AIRPORTS).filter(k => k !== 'DEP').sort().map(k => `<option value="${k}" ${k === c.hub ? 'selected' : ''}>${k}, ${esc(AIRPORTS[k].name)}</option>`).join('')}</select></div>
      <div class="le-group"><b>Colour</b><div class="le-sw">${CO_COLORS.map(col => `<button class="sw ${col === c.color ? 'on' : ''}" style="--c:${col}" data-act="co-color" data-c="${col}" aria-label="Colour ${col}"></button>`).join('')}</div></div>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn primary" data-act="co-save">${icon('check')}Save</button></div>
    </div>`, { cls: 'narrow' });
};
ACTIONS['co-color'] = el => { if (!_coEdit) return; _coEdit.color = el.getAttribute('data-c'); $all('[data-act=co-color]').forEach(b => b.classList.toggle('on', b.getAttribute('data-c') === _coEdit.color)); Sound.tick(); };
ACTIONS['co-save'] = () => {
  if (!_coEdit) return;
  const c = company(_coEdit.id), v = (sel: string) => (($(sel) as HTMLInputElement) || {} as any).value;
  const next = { name: (v('[data-co-name]') || c.name).trim() || c.name, icao: (v('[data-co-icao]') || c.icao).trim().toUpperCase().slice(0, 3) || c.icao, callsign: (v('[data-co-cs]') || c.callsign).trim().toUpperCase() || c.callsign, hub: v('[data-co-hub]') || c.hub, color: _coEdit.color };
  const changed = (Object.keys(next) as (keyof typeof next)[]).some(k => (c as any)[k] !== next[k]);
  if (!changed) { closeAll(); return; }
  confirmChange(`Change ${c.name}?`, `${next.name !== c.name ? 'New name ' + next.name + '. ' : ''}${next.hub !== c.hub ? 'Home base moves to ' + next.hub + '. ' : ''}The change applies everywhere in the app.`, 'Yes, change it', 'No, keep it as it is',
    () => { Object.assign(c, next); closeAll(); applyCompanyTheme(true); Store.save(); renderTopbar(); refresh(); toast(`${c.name} updated`, 'ok'); },
    () => { closeAll(); toast('Nothing changed', 'info'); });
};
