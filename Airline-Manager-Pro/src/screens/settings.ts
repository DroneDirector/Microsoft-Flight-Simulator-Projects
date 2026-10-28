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
    { type: 'html', html: () => `<div class="set-card link ${State.bridge.pc === 'connected' ? 'ok' : ''}"><span class="pc-ic">${icon('pc')}</span><span><b>${State.bridge.pc === 'connected' ? 'Connected to your PC' : 'Not connected'}</b><small>${esc(State.bridge.sim)}, ${State.bridge.link === 'wifi' ? 'Wi-Fi' : 'mobile data'}, ${State.bridge.latencyMs} ms</small></span><button class="btn ghost sm" data-act="pair">Pair a PC</button></div>` },
    { type: 'toggle', key: 'useWifi', label: 'Connect over Wi-Fi', hint: 'Direct link to the PC bridge on the same network. Fastest.' },
    { type: 'toggle', key: 'useMobile', label: 'Connect over mobile data', hint: 'Goes through the online relay when you are away from home.' },
    { type: 'toggle', key: 'gsx', label: 'Passenger numbers from GSX', hint: 'Reads boarded passengers from GSX Pro. Falls back to the app’s own numbers.' },
  ] },
  { id: 'atc', title: 'ATC', icon: 'radio', items: [
    { type: 'choice', key: 'atcSource', label: 'ATC source', options: [['builtin', 'Built-in ATC'], ['beyondatc', 'BeyondATC']] },
    { type: 'toggle', key: 'atcListen', label: 'Listen to BeyondATC audio', hint: 'The PC bridge transcribes BeyondATC offline to detect your clearances.', when: () => State.settings.atcSource === 'beyondatc' },
    { type: 'toggle', key: 'atcFines', label: 'Clearance violations and fines', hint: 'Taking off, landing or taxiing without clearance earns a fine you can contest.' },
    { type: 'toggle', key: 'atcTranscripts', label: 'Save ATC transcripts to the logbook' },
    { type: 'choice', key: 'sttQuality', label: 'Speech recognition quality', hint: 'Higher quality uses more of your PC while you fly.', options: [['light', 'Light'], ['balanced', 'Balanced'], ['accurate', 'Accurate']], when: () => State.settings.atcSource === 'beyondatc' && State.settings.atcListen },
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
  { id: 'sound', title: 'Sound and feel', icon: 'layers', items: [
    { type: 'toggle', key: 'purchaseSound', label: 'Purchase sound', hint: 'Plays when you buy an aircraft.' },
    { type: 'html', html: () => `<button class="btn ghost" data-act="sound-test">${icon('play')}Play purchase sound</button>` },
    { type: 'toggle', key: 'uiSounds', label: 'Interface sounds' },
    { type: 'toggle', key: 'haptics', label: 'Vibration feedback' },
    { type: 'toggle', key: 'reduceMotion', label: 'Reduce motion', hint: 'Shorter animations and a still map.' },
  ] },
  { id: 'profiles', title: 'Profiles and companies', icon: 'pilots', items: [
    { type: 'choice', key: 'appMode', label: 'How pilots and companies relate', options: [['shared', 'One pilot, several companies'], ['separate', 'A pilot per company']] },
    { type: 'html', html: () => State.profiles.map(pr => {
      const pl = pilot(pr.pilotId);
      return `<div class="set-card col"><div class="sc-h">${icon('user')}<span><b>${esc(pl.name)}</b><small>${esc(pr.label)}</small></span></div>
        ${State.companies.filter(c => c.profileId === pr.id).map(c => `<div class="sc-co"><span class="co-badge sm" style="--co:${c.color};--co2:${c.color2}">${esc(c.icao)}</span><b>${esc(c.name)}</b>
          <small>${c.divisions.length ? c.divisions.map(d => esc(d.name)).join(' and ') + ' divisions, shared money and reputation' : 'Separate company'}</small></div>`).join('')}</div>`;
    }).join('') + `<div class="btn-row"><button class="btn ghost" data-act="new-company">${icon('plus')}New company</button><button class="btn ghost" data-act="new-division">${icon('plus')}New division</button></div>` },
  ] },
  { id: 'about', title: 'About', icon: 'info', items: [
    { type: 'html', html: () => `<div class="about"><p><b>${esc(APP.name)}</b> ${esc(APP.version)}, early preview. Screens show demo data until your simulator is linked.</p>
      <p>Aircraft and company names are used only to identify the products installed in your simulator. Aircraft illustrations are original artwork.</p>
      <h4>Credits</h4><p>Inter typeface by The Inter Project Authors, SIL Open Font License 1.1.</p></div>` },
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
  if (key in State.settings) setTimeout(() => rerenderSettingsBody(), 180);
};

ACTIONS['sound-test'] = () => { const was = State.settings.purchaseSound; State.settings.purchaseSound = true; Sound.purchase(); Haptics.success(); State.settings.purchaseSound = was; };
ACTIONS['voice-test'] = () => { Voice.speak('Morning, captain. I had a look at your aircraft after that last flight. Everything is in good shape.'); };
ACTIONS.voicepack = () => { State.settings.voicePack = !State.settings.voicePack; rerenderSettingsBody(); toast(State.settings.voicePack ? 'Voice pack installed' : 'Voice pack removed', 'ok'); };
ACTIONS.pair = () => {
  openLayer('modal', `<div class="modal-head"><h2>Pair with your PC</h2><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body pair"><p class="lede">Open the ${esc(APP.shortName)} bridge on the PC that runs the simulator and enter this code.</p>
    <div class="pair-code">${'482 913'.split('').map(ch => ch === ' ' ? '<i></i>' : `<b>${ch}</b>`).join('')}</div>
    <p class="muted">Works over Wi-Fi at home, and over mobile data through the relay when you're away.</p></div>`, { cls: 'narrow' });
};
ACTIONS['new-division'] = () => {
  const c = company();
  c.divisions.push({ id: uid(), name: 'Division ' + (c.divisions.length + 1), color: '#5FD4A0' });
  rerenderSettingsBody(); renderTopbar(); toast(`New division added to ${c.name}`, 'ok');
};
