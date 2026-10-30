// The very first start: after the start-up screen, look around the demo airline or start from nothing.

function firstStartWelcome(withRestore: boolean) {
  openLayer('modal', `<div class="modal-head"><div><h2>Welcome to ${esc(APP.name)}</h2><small>How would you like to start?</small></div></div>
    <div class="fs-choice">
      <button class="fs-card" data-act="fs-demo"><span class="fs-ic">${icon('play')}</span><b>Explore the demo airlines</b><small>Three airlines with aircraft, routes, crew and flights already running. Look around, try everything, and start your own company any time.</small></button>
      <button class="fs-card" data-act="fs-scratch"><span class="fs-ic">${icon('plus')}</span><b>Start from scratch</b><small>Everything wiped: no aircraft, staff, routes or history. You found your own airline, with starting money, and build it up yourself.</small></button>
    </div>
    ${withRestore ? `<div class="btn-row fs-restore"><small>Used the app before?</small><button class="btn ghost sm" data-act="backup-folder-restore">${icon('download')}Choose my backup folder</button><button class="btn ghost sm" data-act="backup-import">${icon('download')}Open a backup file</button></div>` : ''}`, { cls: 'fs-modal' });
}
ACTIONS['fs-demo'] = () => { Sound.tick(); closeAll(); toast('Enjoy the demo. Settings → Backup and restore lets you start from scratch later.', 'ok'); };
let _fsKind = 'major';
ACTIONS['fs-scratch'] = () => {
  Sound.tick(); closeAll();
  const kinds = [['major', 'Airline', 'Jets and turboprops on scheduled routes.', 'a320neo', 'EKVG'], ['regional', 'Regional and cargo', 'Smaller jets and turboprops, short hops.', 'atr72', 'EKVG'], ['bush', 'Bush outfit', 'Floatplanes and STOL aircraft.', 'dhc2', 'PALH']];
  openLayer('modal', `<div class="modal-head"><div><h2>Your new airline</h2><small>Everything else is wiped. You can change all of this later.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="choice-grid fs-kinds">${kinds.map(k => `<button class="choice ${_fsKind === k[0] ? 'on' : ''}" data-act="fs-kind" data-k="${k[0]}" data-hub="${k[4]}"><div class="choice-art">${aircraftArt(k[3], { color: '#3FD0E8', color2: '#0D3A4A', ground: false })}</div><b>${k[1]}</b><small>${k[2]}</small></button>`).join('')}</div>
    <div class="fs-fields">
      <label class="field"><span>Airline name</span><input class="le-in fs-name" maxlength="40" placeholder="Northern Lights Air"></label>
      <label class="field"><span>ICAO code (3 letters)</span><input class="le-in fs-icao" maxlength="3" placeholder="NLA"></label>
      <label class="field"><span>Callsign</span><input class="le-in fs-call" maxlength="16" placeholder="NORTHERN"></label>
      <label class="field"><span>Home base (airport ICAO)</span><input class="le-in fs-hub" maxlength="4" value="${_fsKind === 'bush' ? 'PALH' : 'EKVG'}"></label>
      <label class="field"><span>Your pilot name</span><input class="le-in fs-pilot" maxlength="40" value="${esc(myPilot().name)}"></label>
    </div>
    <p class="fine-print">${icon('alert')}This removes the demo airlines, aircraft, staff, routes, flights, money and logs. Your settings are kept.</p>
    <div class="modal-actions"><button class="btn ghost" data-act="fs-back">Back</button><button class="btn danger" data-act="fs-wipe">${icon('trash')}Wipe and start</button></div>`, { cls: 'wide fs-modal' });
};
ACTIONS['fs-back'] = () => { closeAll(); firstStartWelcome(false); };
ACTIONS['fs-kind'] = el => {
  _fsKind = el.getAttribute('data-k');
  document.querySelectorAll('.fs-kinds .choice').forEach(b => b.classList.toggle('on', b === el));
  const h = $('.fs-hub') as HTMLInputElement; if (h && (h.value === 'EKVG' || h.value === 'PALH')) h.value = el.getAttribute('data-hub');
  Sound.tick();
};
ACTIONS['fs-wipe'] = () => {
  const v = (q: string) => { const e = $(q) as HTMLInputElement; return e ? e.value.trim() : ''; };
  const name = v('.fs-name') || (_fsKind === 'bush' ? 'Tundra Wings' : _fsKind === 'regional' ? 'Fjord Regional' : 'Northern Lights Air');
  const icao = (v('.fs-icao') || name.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase().padEnd(3, 'X').slice(0, 3);
  const hub = (v('.fs-hub') || 'EKVG').toUpperCase();
  if (!apt(hub)) { toast(`${hub} isn't an airport the app knows. Use its ICAO code, like EKVG.`, 'warn'); return; }
  wipeToScratch({ kind: _fsKind, name, icao, callsign: (v('.fs-call') || name.split(' ')[0]).toUpperCase(), hub, pilot: v('.fs-pilot') });
};

/** Remove everything but the settings and your own pilot, and found one new airline. */
function wipeToScratch(o: { kind: string; name: string; icao: string; callsign: string; hub: string; pilot: string }) {
  const S: any = State, me: any = State.pilots.filter((p: any) => p.id === 'you')[0] || myPilot();
  const keep = ['settings', 'staffCandidates', 'candidates', 'seenVersion', 'wnClosed', 'licence', 'knownAirports', 'simInstalled', 'linkPc', 'favs'];
  const fresh: any = {};
  Object.keys(S).forEach(k => {
    if (keep.indexOf(k) >= 0 || typeof S[k] === 'function') return;
    if (Array.isArray(S[k])) fresh[k] = [];
  });
  Object.assign(S, fresh);
  const id = 'co-' + uid();
  S.companies = [{ id, profileId: 'p1', name: o.name, icao: o.icao, callsign: o.callsign, hub: o.hub, color: '#2C8CFF', color2: '#0B2A55',
    balance: o.kind === 'bush' ? 1500000 : o.kind === 'regional' ? 12000000 : 25000000, reputation: 50, founded: dateStr(new Date()).slice(0, 10), kind: o.kind, divisions: [] }];
  S.profiles = [{ id: 'p1', pilotId: 'you', label: 'Main profile' }];
  S.pilots = [Object.assign(me, { id: 'you', name: o.pilot || me.name, hoursMin: 0, landings: 0, base: o.hub, profileId: 'p1', status: 'standby', types: [], rating: 4, xp: 0 })];
  S.companyId = id; S.divisionId = 'all'; S.myReg = {}; S.coPilot = { [id]: { sex: 'f', id: '' } };
  S.badges = {}; S.progress = {}; S.myLoad = Object.assign({}, S.myLoad, { pax: 0, cargoKg: 0, mailKg: 0, bagsKg: 0 });
  ['bank', 'jobs', 'coop', 'ofp', 'acars', 'usedMarket', 'cases', 'landRecs', 'aiNext', 'aiDay', 'groundedUntil', 'payNext', 'poolNext', 'ratingDay', 'condTick', 'lastTouchdown', 'popLog'].forEach(k => { if (S[k] && !Array.isArray(S[k]) && typeof S[k] === 'object') S[k] = {}; else if (typeof S[k] === 'number') S[k] = 0; });
  S.scratch = true;
  Store.save(); Store.flushNative();
  try { localStorage.setItem('amp-resume', JSON.stringify({ at: Date.now(), screen: 'ops' })); } catch (e) { /* ignore */ }
  location.reload();
}
