// Settings. Sections are plain data, so new options are added by appending an entry here.

type SetItem =
  | { type: 'toggle'; key: string; label: string; hint?: string; when?: () => boolean }
  | { type: 'choice'; key: string; label: string; hint?: string; options: string[][]; when?: () => boolean }
  | { type: 'html'; html: () => string };

interface SetSection { id: string; title: string; icon: string; items: SetItem[] }

const SETTINGS: SetSection[] = [
  { id: 'general', title: 'General', icon: 'sliders', items: [
    { type: 'html', html: () => `<div class="set-card"><span class="brand-lg">${brandMark()}</span><span><b>${esc(APP.name)}</b><small>Version ${esc(APP.version)}</small></span></div>` },
    { type: 'choice', key: 'units', label: 'Units', options: [['imperial', 'Feet, knots, nm'], ['metric', 'Metres, km/h, km']] },
    { type: 'toggle', key: 'clock24', label: '24-hour clock' },
  ] },
  { id: 'time', title: 'Time and years', icon: 'clock', items: [
    { type: 'choice', key: 'timeMode', label: 'Company calendar', hint: 'Real-world years follow today’s date. Simulated years run faster, so your airline can build up several years of history.', options: [['real', 'Real-world years'], ['sim', 'Simulated years']] },
    { type: 'choice', key: 'simRate', label: 'Simulation speed', hint: 'How much company time passes for each real day.', options: [['week', '1 day = 1 week'], ['month', '1 day = 1 month'], ['quarter', '1 day = 3 months']], when: () => State.settings.timeMode === 'sim' },
  ] },
  { id: 'sync', title: 'Simulator link', icon: 'sync', items: [
    { type: 'html', html: () => {
      const on = Link.status === 'connected', pc = Link.pc;
      const sub = on ? `${Link.sim && Link.sim.connected ? esc(Link.sim.sim) : 'Flight Simulator not running'} on ${esc(pc.name)}, ${esc(pc.ip)}${Link.latency ? ', ' + Link.latency + ' ms' : ''}`
        : pc ? `Paired with ${esc(pc.name)}. Looking for it on this Wi-Fi…` : 'Not paired yet. The screens show demo data until you link your PC.';
      return `<div class="set-card link ${on ? 'ok' : ''}"><span class="pc-ic">${icon('pc')}</span><span><b>${on ? 'Connected to your PC' : pc ? 'Not connected' : 'No PC linked'}</b><small>${sub}</small></span><button class="btn ${pc ? 'ghost' : 'primary'} sm" data-act="link-panel">${pc ? 'Details' : 'Link a PC'}</button></div>`
        + (pc ? `<div class="btn-row"><button class="btn ghost sm" data-act="link-forget">${icon('close')}Unpair ${esc(pc.name)}</button></div>` : '');
    } },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}The app links to the ${esc(APP.shortName)} PC app over Wi-Fi. Your phone and the PC with Flight Simulator must be on the same Wi-Fi network.</p>` },
    { type: 'toggle', key: 'gsx', label: 'Passenger numbers from GSX', hint: 'Reads boarded passengers from GSX Pro. Falls back to the app’s own numbers.' },
  ] },
  { id: 'atc', title: 'ATC', icon: 'radio', items: [
    { type: 'choice', key: 'atcSource', label: 'ATC source', options: [['builtin', 'Built-in ATC'], ['beyondatc', 'BeyondATC']] },
    { type: 'toggle', key: 'atcListen', label: 'Listen to BeyondATC audio', hint: 'The PC bridge transcribes BeyondATC offline to detect your clearances.', when: () => State.settings.atcSource === 'beyondatc' },
    { type: 'toggle', key: 'atcFines', label: 'Clearance violations and fines', hint: 'Taking off, landing or taxiing without clearance earns a fine you can contest.' },
    { type: 'toggle', key: 'atcTranscripts', label: 'Save ATC transcripts to the logbook' },
    { type: 'choice', key: 'sttQuality', label: 'Speech recognition quality', hint: 'Higher quality uses more of your PC while you fly.', options: [['light', 'Light'], ['balanced', 'Balanced'], ['accurate', 'Accurate']], when: () => State.settings.atcSource === 'beyondatc' && State.settings.atcListen },
  ] },
  { id: 'staff', title: 'Staff', icon: 'pilots', items: [
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
          <button class="del-btn" data-act="delete-company" data-co="${c.id}" aria-label="Delete ${esc(c.name)}">${icon('trash')}</button></div>`).join('')}</div>`;
    }).join('') + `<div class="btn-row"><button class="btn ghost" data-act="new-company">${icon('plus')}New company</button><button class="btn ghost" data-act="new-division">${icon('plus')}New division</button></div>
      <div class="danger-zone"><span><b>Saved on this device</b><small>Your companies are saved automatically and kept when the app updates.</small></span><button class="btn ghost sm danger-txt" data-act="reset-ask">${icon('trash')}Delete everything</button></div>` },
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
      <h4>Credits</h4><p>Inter typeface by The Inter Project Authors, SIL Open Font License 1.1.</p><p>three.js by the three.js authors, MIT License.</p><p>MapLibre GL JS, BSD 3-Clause License. Street map © OpenStreetMap contributors, OpenMapTiles, OpenFreeMap. Satellite map: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0.</p></div>` },
  ] },
];

let _setSection = 'general';

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
  (State.settings as any)[el.getAttribute('data-key')] = el.getAttribute('data-v');
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
  if (key in State.settings) setTimeout(() => rerenderSettingsBody(), 180);
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
