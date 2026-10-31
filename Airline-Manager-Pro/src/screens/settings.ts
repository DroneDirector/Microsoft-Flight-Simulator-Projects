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
  { id: 'view3d', title: '3D view', icon: 'map', items: [
    { type: 'html', html: () => {
      const km = v3dKm();
      const note = km >= 400 ? `<p class="v3d-note warn">${icon('alert')}Very high settings might affect performance: more ground to load and draw, a warmer device and more battery use.</p>`
        : km <= 60 ? `<p class="v3d-note ok">${icon('info')}Low settings might improve performance on slower phones and PCs.</p>` : '';
      return `<div class="set-card col"><div class="sc-h">${icon('map')}<span><b>View distance: ${km} km</b><small>How far you see in the 3D view. Further shows more mountains, coastlines and sea towards the horizon.</small></span></div>
        <input type="range" class="v3d-range" min="20" max="800" step="10" value="${km}" aria-label="View distance in kilometres">
        <div class="v3d-scale"><span>20 km</span><span>150</span><span>400</span><span>800 km</span></div>${note}</div>`;
    } },
    { type: 'toggle', key: 'v3dSat', label: 'Satellite imagery', hint: 'Shows the real ground from space (Sentinel-2 cloudless by EOX) instead of the map look. Can also be switched in the 3D view.' },
    { type: 'html', html: () => {
      if (!(State.settings as any).v3dSat) return '';
      const q = v3dSatQ(), names = ['Standard', 'Sharp', 'Very sharp', 'Highest'], mb = [2, 8, 30, 45][q];
      const note = q >= 2 ? `<p class="v3d-note warn">${icon('alert')}Very high settings might affect performance: about ${mb} MB of imagery each time the 3D view opens, more memory and more battery use.</p>`
        : q === 0 ? `<p class="v3d-note ok">${icon('info')}Low settings might improve performance on slower phones and PCs and use less data.</p>` : '';
      return `<div class="set-card col"><div class="sc-h">${icon('layers')}<span><b>Satellite detail: ${names[q]}</b><small>How sharp the satellite ground is. Higher shows fields, roads, villages and coastlines in more detail, near you and from high up. The imagery itself is about 10 m per pixel, so the very closest view stays a little soft.</small></span></div>
        <input type="range" class="v3d-satq" min="0" max="3" step="1" value="${q}" aria-label="Satellite detail">
        <div class="v3d-scale"><span>Standard</span><span>Sharp</span><span>Very sharp</span><span>Highest</span></div>${note}</div>
        <div class="set-card col"><div class="sc-h">${icon('map')}<span><b>Sharper imagery at airports: your own imagery service</b><small>The built-in imagery (Sentinel-2) is about 10 m a pixel, so details on the ground are hard to make out. With an imagery service of your own (for example MapTiler Satellite with your own key), the 5 km around the airport show in up to about 1 m a pixel. Paste its tile address with {z}, {x} and {y}. You are responsible for following that service's terms.</small></span></div>
        <input class="le-in v3d-saturl" placeholder="https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=YOUR_KEY" value="${esc((State.settings as any).v3dSatUrl || '')}" spellcheck="false" autocapitalize="off">
        <small class="muted">${satCustom() ? 'In use at airports, up to zoom ' + satCustom().max + '.' : 'Empty: the built-in imagery is used everywhere.'}</small></div>`;
    } },
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
  { id: 'online', title: 'Online services', icon: 'wifi', items: [
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}All optional. Your names, codes and the Discord address stay on this device and are only sent to the service they belong to.</p>` },
    { type: 'html', html: () => svcOk('simbriefApi') ? setText('sbUser', 'SimBrief username or pilot ID', 'Your latest SimBrief flight plan in Dispatch: route, fuel, weights, and a flight plan for the simulator.', 'username or 123456') : '' },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Real-world weather (METAR, TAF and SIGMETs from the Aviation Weather Center) is always used: the real wind picks the runway in use, and your hired pilots delay, hold, divert or cancel when the weather is beyond their aircraft's limits. Show it on the map with the weather button.</p>` },
    { type: 'html', html: () => netChoices().length > 1 ? `<div class="ch-row"><span><b>Online networks</b><small>Controllers online at your airports, your airline's flights online, and their traffic on the map. Updated every minute.</small></span><div class="seg">${netChoices().map(o => `<button class="${Network.which() === o[0] ? 'on' : ''}" data-act="set-choice" data-key="network" data-v="${o[0]}">${esc(o[1])}</button>`).join('')}</div></div>` : '' },
    { type: 'toggle', key: 'netOnMap', label: 'Network traffic on the map', when: () => Network.which() !== 'off' },
    { type: 'html', html: () => Network.which() !== 'off' ? (svcOk('vatsim') ? setText('vatsimId', 'Your VATSIM member ID', 'Shows when you are online yourself.', 'CID', true) : '') + (svcOk('ivao') ? setText('ivaoId', 'Your IVAO VID', '', 'VID', true) : '') : '' },
    { type: 'html', html: () => svcOk('hoppie') ? setText('hoppieCode', 'Hoppie ACARS logon code', 'Free from hoppie.nl. Your load sheet and arrival information go to your aircraft\'s ACARS, and your messages from the aircraft show up in the app.', 'logon code') : '' },
    { type: 'toggle', key: 'hoppieAuto', label: 'Send the load sheet and arrival information automatically', when: () => !!Acars.code() },
    { type: 'html', html: () => setText('discordUrl', 'Discord webhook', 'In your Discord server: Server settings → Integrations → Webhooks → New webhook → Copy webhook URL.', 'https://discord.com/api/webhooks/…') + ((State.settings as any).discordUrl ? `<div class="btn-row"><button class="btn ghost sm" data-act="discord-test">Send a test message</button></div>` : '') },
    { type: 'toggle', key: 'discordMine', label: 'Post my flights', when: () => !!(State.settings as any).discordUrl },
    { type: 'toggle', key: 'discordAi', label: 'Post my hired pilots\' landings', hint: 'At most one post a minute.', when: () => !!(State.settings as any).discordUrl },
    { type: 'toggle', key: 'discordFleet', label: 'Post new and sold aircraft, and loans', when: () => !!(State.settings as any).discordUrl },
    { type: 'toggle', key: 'discordJobs', label: 'Post finished jobs and tours', when: () => !!(State.settings as any).discordUrl },
  ] },
  { id: 'atc', title: 'ATC', icon: 'radio', items: [
    { type: 'choice', key: 'atcSource', label: 'ATC source', options: [['builtin', 'Built-in ATC'], ['beyondatc', 'BeyondATC']] },
    { type: 'toggle', key: 'atcListen', label: 'Listen to BeyondATC audio', hint: 'The PC bridge transcribes BeyondATC offline to detect your clearances.', when: () => State.settings.atcSource === 'beyondatc' },
    { type: 'toggle', key: 'atcFines', label: 'Clearance violations and fines', hint: 'Taking off, landing or taxiing without clearance earns a fine you can contest.' },
    { type: 'toggle', key: 'atcTranscripts', label: 'Save ATC transcripts to the logbook' },
    { type: 'choice', key: 'sttQuality', label: 'Speech recognition quality', hint: 'Higher quality uses more of your PC while you fly.', options: [['light', 'Light'], ['balanced', 'Balanced'], ['accurate', 'Accurate']], when: () => State.settings.atcSource === 'beyondatc' && State.settings.atcListen },
  ] },
  { id: 'services', title: 'Passenger services', icon: 'pax', items: [
    { type: 'html', html: () => servicesHtml() },
  ] },
  { id: 'staff', title: 'Staff', icon: 'pilots', items: [
    { type: 'html', html: () => payScaleHtml() },
    { type: 'choice', key: 'groundHandling', label: 'Apron crew: mechanics, drivers and baggage handlers', hint: 'Your hub and every other base always need your own apron crew: without ground crew there, no aircraft can be unloaded, loaded, fuelled or pushed back, so none can leave. Bases only: everywhere else the local handling company turns your aircraft round for a fee. Every airport: you can also keep your own apron crew at any airport you fly to. Co-pilots and cabin crew are always your own.', options: [['base', 'Bases only'], ['everywhere', 'Every airport']] },
    { type: 'toggle', key: 'conduct', label: 'Conduct reports and behaviour', hint: 'Misconduct, warnings and court cases for your AI crew. Switching off never removes what already happened; court cases pause and carry on when you switch back on.' },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Most of the time your staff behave well. Choose how often someone steps out of line. You'll be asked to discipline or dismiss them when it happens.</p>` },
    { type: 'html', html: () => [['fa', 'Flight attendants'], ['mech', 'Mechanics'], ['ground', 'Ground staff'], ['fo', 'Co-pilots']].map(r => `<div class="ch-row"><span><b>${r[1]}</b><small>How often they misbehave</small></span><div class="seg">${[['never', 'Never'], ['rare', 'Rarely'], ['normal', 'Sometimes'], ['often', 'Often']].map(o => `<button class="${(State.settings as any).misconduct[r[0]] === o[0] ? 'on' : ''}" data-act="set-misconduct" data-r="${r[0]}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div></div>`).join('') },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}Rarely is about 2% of the time, sometimes about 5–10%, often about 20%.</p>` },
  ] },
  { id: 'realism', title: 'Damage and realism', icon: 'shield', items: [
    { type: 'toggle', key: 'damage', label: 'Damage detection', hint: 'Tail strikes, hard landings, overspeed, engine failures and overstress the simulator can detect.' },
    { type: 'toggle', key: 'turbulence', label: 'Severe turbulence damage', hint: 'Only extreme turbulence counts, with realistic results: inspections, overstress, cabin damage.' },
    { type: 'toggle', key: 'crashPrompt', label: 'Ask me before registering a crash', hint: 'Choose to register or disregard each crash.' },
    { type: 'choice', key: 'repairTime', label: 'Repair time', hint: 'Instant: the aircraft is ready to fly as soon as you pay. Decided by the app: it stays in the hangar for 5, 10, 15, 20, 25, 30, 40, 50, 60 or 90 minutes, depending on the job and how good your mechanics are.', options: [['instant', 'Instant'], ['auto', 'Decided by the app']] },
  ] },
  { id: 'economy', title: 'Economy', icon: 'finance', items: [
    { type: 'html', html: () => difficultySettingsHtml() } as any,
    { type: 'toggle', key: 'realMarkets', label: 'Real-world fuel and parts prices', hint: 'Jet fuel follows the real US Gulf Coast jet fuel price (U.S. Energy Information Administration) and spare parts the real US producer price index for aircraft parts (U.S. Bureau of Labor Statistics), updated daily. Off, or offline: a simulated market with its own news.' } as any,
    { type: 'toggle', key: 'pilotLocation', label: 'Pilot location and jumpseat', hint: 'Your next flight starts where you last landed. Flying from somewhere else means a jumpseat ride first, paid from your wallet. Always on in co-op.' } as any,
  ] },
  { id: 'news', title: 'News', icon: 'news', items: [
    { type: 'choice', key: 'newsMode', label: 'Newspaper articles', hint: 'When your airline makes the papers. Every article is also in the inbox and under Newspaper in the menu.', options: [['popup', 'Open by themselves, animated'], ['notify', 'Only in the inbox, animated when opened'], ['plain', 'Only in the inbox, without animation']] },
  ] },
  { id: 'voice', title: 'Voices', icon: 'volume', items: [
    { type: 'toggle', key: 'mechanicVoice', label: 'People speak their messages', hint: 'The mechanic, the gate agent, passengers and the head of operations read their messages aloud, word for word, with a play button to hear them again: women with women\'s voices, men with men\'s, angry people sound angry, apologies sound sorry. Everything runs on this device.' },
    { type: 'choice', key: 'voiceEngine', label: 'Voice', hint: 'Natural voices sound like real people. Until they are downloaded, the device\'s own voice reads the messages.', options: [['neural', 'Natural voices'], ['device', 'Device voice']], when: () => State.settings.mechanicVoice },
    { type: 'html', html: () => State.settings.mechanicVoice && (State.settings as any).voiceEngine !== 'device' ? voicePackCard() : '' },
    { type: 'html', html: () => State.settings.mechanicVoice ? `<div class="btn-row">${VOICE_TESTS.map(t => `<button class="btn ghost sm" data-act="voice-test" data-k="${t[0]}">${icon('play')}${esc(t[1])}</button>`).join('')}</div>` : '' },
  ] },
  { id: 'sound', title: 'Sound and feel', icon: 'volume', items: [
    { type: 'toggle', key: 'muteAll', label: 'Mute all sounds', hint: 'Silences every sound in the app, voices too.' },
    { type: 'toggle', key: 'mechanicVoice', label: 'Voices in dialogues', hint: 'The mechanic, the gate agent, passengers and the head of operations speak their messages. Off: no voices and no play buttons, the messages are only written.', when: () => !State.settings.muteAll },
    { type: 'toggle', key: 'onlyVoices', label: 'Only the voices', hint: 'Every other sound is off (purchases, payments, taps, chimes), but the people in the dialogues still speak. Switch off to have all sounds again.', when: () => !State.settings.muteAll },
    { type: 'toggle', key: 'purchaseSound', label: 'Purchase sound', hint: 'Plays when you buy an aircraft.', when: () => !State.settings.muteAll && !(State.settings as any).onlyVoices },
    { type: 'html', html: () => State.settings.muteAll || (State.settings as any).onlyVoices ? '' : `<button class="btn ghost" data-act="sound-test">${icon('play')}Play purchase sound</button>` },
    { type: 'toggle', key: 'paySound', label: 'Payment sound', hint: 'Plays when you pay a bill, repair or fine.', when: () => !State.settings.muteAll && !(State.settings as any).onlyVoices },
    { type: 'html', html: () => State.settings.muteAll || (State.settings as any).onlyVoices ? '' : `<button class="btn ghost" data-act="pay-test">${icon('play')}Play payment sound</button>` },
    { type: 'toggle', key: 'uiSounds', label: 'Interface sounds', when: () => !State.settings.muteAll && !(State.settings as any).onlyVoices },
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
    { type: 'html', html: () => `<div class="ch-row"><span><b>Start from scratch</b><small>Wipe every airline, aircraft, staff member, route, flight and log, and found a new airline. Settings are kept. Make a backup first if you may want it back.</small></span><button class="btn danger sm" data-act="fs-scratch">${icon('trash')}Start over</button></div>` },
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
    { type: 'html', html: () => `<div class="set-card col"><div class="sc-h">${icon('route')}<span><b>Flight trace</b><small>How every aircraft flies: phase, altitude, speed, heading, position and runway, every 30 seconds while the app is open. ${FlightTrace.problems ? FlightTrace.problems + ' problem' + (FlightTrace.problems === 1 ? '' : 's') + ' marked (jumps, too fast, off the runway, no touchdown).' : 'No problems marked.'} ${num(FlightTrace.lines.length)} lines.</small></span></div>
        <div class="btn-row"><button class="btn ghost sm" data-act="trace-save">${icon('download')}Save the log file</button><button class="btn ghost sm danger-txt" data-act="trace-clear">${icon('trash')}Clear</button></div></div>` },
    { type: 'html', html: () => `<p class="fine-print">${icon('info')}The error log stays on this device. Nothing is sent anywhere unless you copy or share it yourself.</p>` },
  ] },
  { id: 'about', title: 'About', icon: 'info', items: [
    { type: 'html', html: () => `<div class="about"><p><b>${esc(APP.name)}</b> ${esc(APP.version)}, early preview. Screens show demo data until your simulator is linked.</p>
      <p>Aircraft and company names are used only to identify the products installed in your simulator. Aircraft illustrations are original artwork.</p>
      <h4>Credits</h4><p>Inter typeface by The Inter Project Authors, SIL Open Font License 1.1.</p><p>Real-world market prices: jet fuel from the U.S. Energy Information Administration, aircraft parts from the U.S. Bureau of Labor Statistics (both public domain, via FRED, Federal Reserve Bank of St. Louis); jet fuel outlook from the EIA Short-Term Energy Outlook (public domain).</p><p>3D view water outlines: © OpenStreetMap contributors (OpenMapTiles, OpenFreeMap). Satellite imagery: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0.</p><p>3D terrain heights: Terrain Tiles on AWS (Mapzen / Tilezen). ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and funded under National Science Foundation awards 1043681, 1559691, and 1542736; Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017; Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich; Canada terrain data contains information licensed under the Open Government Licence – Canada; Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers; Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration; Mexico terrain data source: INEGI, Continental relief, 2016; New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New Zealand and the New Zealand Government (All rights reserved); Norway terrain data © Kartverket; United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved; United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.</p><p>Voices: Kokoro-82M by hexgrad, Apache License 2.0; pronunciation dictionaries from misaki by hexgrad, Apache License 2.0; ONNX Runtime by Microsoft, MIT License.</p><p>three.js by the three.js authors, MIT License.</p><p>Human body model and shape targets from MakeHuman, CC0 1.0 (public domain).</p><p>MapLibre GL JS, BSD 3-Clause License. Street map © OpenStreetMap contributors, OpenMapTiles, OpenFreeMap. Satellite map: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0.</p><p>Airport layouts © OpenStreetMap contributors, available under the Open Database License (ODbL). Airport and runway list from OurAirports (public domain).</p><p>Weather reports from aviationweather.gov, the US National Weather Service's Aviation Weather Center (public domain). SimBrief is a service of Navigraph; Discord is a trademark of Discord Inc. Names are used only to identify the services.</p></div>` },
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
  if (anim) b.innerHTML = settingsBody(); else patchHtml(b, settingsBody());   // updates in place don't flash
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
  if (el.getAttribute('data-key') === 'network') { Network.pilots = []; Network.atc = []; Network.at = 0; Network.start(); }
  Store.save();
  Sound.tick(); rerenderSettingsBody();
  refresh();
  // apron crew back to the home base only: you decide what happens to the people at other airports
  if (el.getAttribute('data-key') === 'groundHandling') apronCrewChanged();
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
  if (key === 'mechanicVoice' && !on) Voice.stop();
  if (key === 'conduct') setConduct(on);
  if (key in State.settings) { Store.save(); setTimeout(() => rerenderSettingsBody(), 180); }
};

ACTIONS['sound-test'] = () => { const was = State.settings.purchaseSound; State.settings.purchaseSound = true; Sound.purchase(); Haptics.success(); State.settings.purchaseSound = was; };
ACTIONS['pay-test'] = () => { const was = State.settings.paySound; State.settings.paySound = true; Sound.payOut(); Haptics.pulse(30); State.settings.paySound = was; };
// [key, button, who, line]
const VOICE_TESTS: string[][] = [
  ['mechanic', 'Mechanic', 'mechanic', 'Morning, captain. I had a look at OY-ANA after that last flight. Everything is in good shape, and she is ready to go.'],
  ['gate', 'Gate agent', 'gate', 'Captain, boarding is complete. One hundred and sixty-eight passengers on board, and the doors are closing.'],
  ['ops', 'Head of operations', 'ops', 'Good afternoon. A short report from operations: all flights left on time today. Well done, everyone.'],
  ['angry', 'Angry passenger', 'pax|m|angry|Paul Collins', 'This is unacceptable! I have been waiting for three hours, and nobody tells us anything!'],
  ['sorry', 'Apology', 'gate|f|sorry', 'I am so sorry, captain. The fuel truck was late, and that is our fault. It will not happen again.'],
  ['drunk', 'Drunk passenger', 'pax|f|drunk|Heidi Larsen', 'I\'m fine. I\'m totally fine! Just let me on the plane, I paid for my ticket!'],
];
ACTIONS['voice-test'] = el => { const t = VOICE_TESTS.filter(x => x[0] === ((el && el.getAttribute('data-k')) || 'mechanic'))[0] || VOICE_TESTS[0]; Voice.speak(t[3], undefined, t[2]); };
function voicePackCard(): string {
  const v = VoicePack, pct = v.total ? Math.round(v.done / v.total * 100) : 0;
  if (v.state === 'ready') return `<div class="set-card ok"><span class="pc-ic">${icon('volume')}</span><span><b>Natural voices are installed</b><small>On this ${DESKTOP ? 'PC' : 'device'}. They work without the internet.</small></span><button class="btn ghost sm" data-act="voicepack-remove">Remove</button></div>`;
  if (v.state === 'downloading') return `<div class="set-card"><span class="pc-ic">${icon('download')}</span><span><b>Downloading the voices… ${pct}%</b><small>${Math.round(v.done / 1e6)} of ${Math.round((v.total || 1) / 1e6)} MB. You can keep using the app.</small><span class="cab-bar"><i style="width:${pct}%"></i></span></span></div>`;
  return `<div class="set-card"><span class="pc-ic">${icon('volume')}</span><span><b>Natural voices</b><small>${v.state === 'error' ? 'The download stopped: ' + esc(v.error) + '. ' : ''}About ${v.sizeText()}, downloaded once over Wi-Fi or mobile data${v.state === 'partial' ? ' (part of it is already here)' : ''}. Kokoro voices, Apache License 2.0.</small></span><button class="btn primary sm" data-act="voicepack-get">${v.state === 'error' || v.state === 'partial' ? 'Continue' : 'Download'}</button></div>`;
}
ACTIONS['voicepack-get'] = () => { VoicePack.download(); rerenderSettingsBody(); };
ACTIONS['voicepack-remove'] = () => { confirmChange('Remove the natural voices?', 'They can be downloaded again at any time. Until then the device\'s own voice reads the messages.', 'Remove', 'Keep', () => { closeTop(); VoicePack.remove(); }, () => closeTop()); };
ACTIONS['link-forget'] = () => { Link.forget(); rerenderSettingsBody(); toast('PC unpaired', 'info'); };
ACTIONS['new-division'] = () => {
  const c = company();
  c.divisions.push({ id: uid(), name: 'Division ' + (c.divisions.length + 1), color: '#5FD4A0' });
  rerenderSettingsBody(); renderTopbar(); toast(`New division added to ${c.name}`, 'ok');
  try { newsDivision(c, c.divisions[c.divisions.length - 1].name); } catch (e) { /* ignore */ }
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
      <div class="le-group"><b>Livery</b><button class="btn ghost" data-act="livery-open" data-co="${c.id}">${icon('fleet')}Design the livery</button></div>
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

/* ---------- Text settings (online services) ---------- */
function setText(key: string, label: string, hint: string, ph: string, short?: boolean): string {
  const v = String((State.settings as any)[key] || ''), secret = key === 'hoppieCode' || key === 'discordUrl';
  return `<div class="ch-row txt"><span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span><input class="inp set-text ${short ? 'short' : ''}" data-key="${key}" ${secret ? 'type="password"' : ''} value="${esc(v)}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false"></div>`;
}
document.addEventListener('change', e => {
  const el = e.target as HTMLInputElement; if (!el || !el.classList || !el.classList.contains('set-text')) return;
  const key = el.getAttribute('data-key'), v = el.value.trim();
  if (key === 'discordUrl' && v && !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(v)) { toast('That isn\'t a Discord webhook address', 'warn'); return; }
  (State.settings as any)[key] = v; Store.save();
  if (key === 'hoppieCode') Acars.start();
  if (key === 'sbUser') SimBrief.error = '';
  toast('Saved', 'ok'); rerenderSettingsBody();
});
ACTIONS['discord-test'] = () => { Online.test().then(() => toast('Test message sent to Discord', 'ok'), (e: any) => toast((e && e.message) || 'Not sent', 'warn')); };

// the satellite detail slider: kept when let go
document.addEventListener('input', e => {
  const el = e.target as HTMLInputElement; if (!el || !el.classList || !el.classList.contains('v3d-satq')) return;
  const h = el.parentElement && el.parentElement.querySelector('.sc-h b'); if (h) h.textContent = `Satellite detail: ${['Standard', 'Sharp', 'Very sharp', 'Highest'][+el.value]}`;
});
document.addEventListener('change', e => {
  const el = e.target as HTMLInputElement; if (!el || !el.classList || !el.classList.contains('v3d-satq')) return;
  (State.settings as any).v3dSatQ = +el.value; Store.save(); rerenderSettingsBody();
});
// the 3D view distance slider: the value shows while dragging, it's kept when let go
document.addEventListener('input', e => {
  const el = e.target as HTMLInputElement; if (!el || !el.classList || !el.classList.contains('v3d-range')) return;
  (State.settings as any).v3dKm = +el.value;
  const h = el.parentElement && el.parentElement.querySelector('.sc-h b'); if (h) h.textContent = `View distance: ${el.value} km`;
});
document.addEventListener('change', e => {
  const el = e.target as HTMLInputElement; if (!el || !el.classList || !el.classList.contains('v3d-range')) return;
  (State.settings as any).v3dKm = +el.value; Store.save(); rerenderSettingsBody();
});

document.addEventListener('change', e => {
  const el = e.target as HTMLInputElement; if (!el || !el.classList || !el.classList.contains('v3d-saturl')) return;
  const v = el.value.trim(); (State.settings as any).v3dSatUrl = v; Store.save();
  toast(!v ? 'Built-in imagery everywhere' : satCustom() ? 'Your imagery service is used at airports' : 'That address needs https:// and {z}, {x} and {y}', v && !satCustom() ? 'warn' : 'ok');
  try { rerenderSettingsBody(); } catch (x) { /* ignore */ }
});

