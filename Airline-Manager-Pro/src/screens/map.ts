// Full-screen live map with every company flight and a details panel.
let _bigMap: WorldMap = null;

function mapListHtml(sel: string): string {
  const live = liveOf();
  return live.map(f => {
    const t = acType(flightTypeId(f)), p = pilot(f.pilotId), fav = !!((State as any).favs || {})[f.pilotId];
    return `<button class="mf-row ${sel === f.id ? 'on' : ''} ${f.you ? 'you' : ''}" data-act="map-pick" data-id="${f.id}">
      <span class="mf-cs">${fav ? '<i class="mf-fav">★</i>' : ''}${esc(f.callsign)}</span>
      <span class="mf-rt">${esc(f.from)}<i></i>${esc(f.to)}</span>
      <span class="mf-pg"><i style="width:${(f.t * 100).toFixed(0)}%"></i></span>
      <small>${f.you ? 'You' : esc(p ? p.name : 'Pilot')}${(f as any).coop ? ' (co-op)' : ''}, ${esc(t.model)}</small>
    </button>`;
  }).join('') || emptyState('No flights in the air', 'Assign routes to your pilots and their flights show up here live.', 'Plan routes', 'go-routes');
}

SCREENS.map = {
  title: 'Live map', icon: 'map', nav: false,
  render() {
    return `<div class="bigmap">
      <div class="map-host" id="big-map"></div>
      <button class="back-btn on-map" data-act="go" data-screen="ops">${icon('chevron', 'flip')}<span>Overview</span></button>
      <div class="mf-panel"><div class="mf-h"><b>In the air</b><small>${liveOf().length} flights</small></div><div class="mf-list" id="mf-list">${mapListHtml(null)}</div></div>
      <div class="map-zoom"><button class="icon-btn" data-act="map-zoom" data-f="1.6" aria-label="Zoom in">${icon('plus')}</button><button class="icon-btn" data-act="map-zoom" data-f="0.625" aria-label="Zoom out"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14"/></svg></button><button class="icon-btn" data-act="map-fit" aria-label="Show all flights">${icon('focus')}</button>${mapSearchBtn()}${layerBtn()}</div>
      <div class="map-detail" id="map-detail"></div>
    </div>`;
  },
  mount(root) {
    _bigMap = new WorldMap($('#big-map', root), { interactive: true, insetRight: 270, onSelect: id => { const list = $('#mf-list'); if (list) list.innerHTML = mapListHtml(id); if (!id) { const d = $('#map-detail'); if (d) d.innerHTML = ''; } } });
    fitAll(false);
  },
};

function fitAll(anim: boolean) {
  const pts: number[][] = [];
  liveOf().forEach(f => { pts.push(apt(f.from).pos); if (!f.noDest) pts.push(apt(f.to).pos); if (f.pos) pts.push(f.pos); });
  if (!pts.length) pts.push(apt(company().hub).pos, [apt(company().hub).pos[0] + 10, apt(company().hub).pos[1] + 5]);
  _bigMap.fit(pts, 70, anim);
}

function selectFlight(id: string) {
  if (_bigMap) _bigMap.selected = id;
  const list = $('#mf-list'); if (list) list.innerHTML = mapListHtml(id);
  const d = $('#map-detail'); if (!d) return;
  const f = State.live.filter(x => x.id === id)[0];
  d.innerHTML = f ? `<div class="sel-pop">${flightCard(f)}</div>` : '';
}

ACTIONS['map-pick'] = el => {
  const id = el.getAttribute('data-id'); Sound.tick();
  selectFlight(id);
  if (_bigMap) _bigMap.follow(id);
};
ACTIONS['map-zoom'] = el => { if (_bigMap) _bigMap.zoomBy(parseFloat(el.getAttribute('data-f'))); };
ACTIONS['map-fit'] = () => { if (_bigMap) { _bigMap.following = null; fitAll(true); } };
ACTIONS['go-routes'] = () => go('routes');

/** Open the live map on one flight, zoomed in on the aircraft and following it. */
function showFlightOnMap(id: string) {
  const f = State.live.filter(x => x.id === id)[0]; if (!f) return;
  const a = plane(f.reg);
  if (a && a.companyId !== State.companyId) { State.companyId = a.companyId; State.divisionId = 'all'; applyCompanyTheme(true); renderTopbar(); }
  closeAll(); Sound.tick();
  const focus = () => { if (!_bigMap) return; selectFlight(id); _bigMap.follow(id); };
  if (State.screen === 'map') focus();
  else { go('map'); setTimeout(focus, 320); }
}
/** Show an aircraft on the map: follow it if it's flying, otherwise centre on the airport where it stands. */
function showAircraftOnMap(reg: string) {
  const f = State.live.filter(x => x.reg === reg)[0];
  if (f) { showFlightOnMap(f.id); return; }
  const a = plane(reg); if (!a) return;
  const ap = apt(a.location); closeAll(); Sound.tick();
  const focus = () => { if (!_bigMap || !ap) return; _bigMap.selected = null; _bigMap.fit([ap.pos, [ap.pos[0] + 1.5, ap.pos[1] + 0.8], [ap.pos[0] - 1.5, ap.pos[1] - 0.8]], 60, true);
    toast(`${reg} is ${a.status === 'grounded' || a.status === 'maintenance' ? 'in the hangar' : 'on the ground'} at ${ap.city} (${a.location})`, 'info'); };
  if (State.screen === 'map') focus(); else { go('map'); setTimeout(focus, 320); }
}
ACTIONS['show-aircraft'] = el => showAircraftOnMap(el.getAttribute('data-reg'));
ACTIONS['show-flight'] = el => { const t = el.closest('.toast'); if (t) t.remove(); showFlightOnMap(el.getAttribute('data-id')); };

/* ---------- Map layers: Classic (default) / Street / Satellite ---------- */
function layerBtn(): string {
  const on = State.settings.mapStyle !== 'classic';
  return `<button class="icon-btn layer-btn ${on ? 'on' : ''}" data-act="map-layers" aria-label="${on ? 'Back to the classic map' : 'Choose map layer'}">${icon('layers')}</button>`;
}

ACTIONS['map-layers'] = el => {
  Sound.tick();
  if (State.settings.mapStyle !== 'classic') { setMapStyle('classic'); return; }
  const r = el.getBoundingClientRect();
  const wrap = openLayer('pop', `
    <div class="ly-head"><b>Map layer</b><small>Tap the layer button again to go back to the classic map</small></div>
    <div class="ly-opts">
      <button class="ly-opt" data-act="pick-layer" data-style="street"><span class="ly-swatch street"><i></i><i></i><i></i></span><b>Street map</b><small>OpenStreetMap</small></button>
      <button class="ly-opt" data-act="pick-layer" data-style="satellite"><span class="ly-swatch sat"></span><b>Satellite</b><small>Sentinel-2</small></button>
    </div>`, { cls: 'layer-pick' });
  const p = wrap.querySelector('.panel') as HTMLElement;
  const w = 300;
  p.style.width = w + 'px';
  p.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  const ph = p.offsetHeight || 200;
  const below = r.bottom + 6, above = r.top - ph - 6;
  p.style.top = Math.max(8, below + ph <= window.innerHeight - 8 ? below : above >= 8 ? above : window.innerHeight - ph - 8) + 'px';
};
ACTIONS['pick-layer'] = el => { closeAll(); setMapStyle(el.getAttribute('data-style') as any); };

function setMapStyle(style: 'classic' | 'street' | 'satellite') {
  if (style !== 'classic' && !(window as any).maplibregl) { toast('Street and satellite maps are available in the installed app', 'warn'); return; }
  if (style !== 'classic' && navigator.onLine === false) { toast('No internet connection, keeping the classic map', 'warn'); return; }
  const fol = State.screen === 'map' && _bigMap ? _bigMap.following : null;
  const sel = State.screen === 'map' && _bigMap ? _bigMap.selected : null;
  State.settings.mapStyle = style;
  Haptics.pulse(10);
  refresh();
  if (State.screen === 'map' && (fol || sel)) setTimeout(() => { if (sel) selectFlight(sel); if (fol && _bigMap) _bigMap.follow(fol); }, 60);
  toast(style === 'classic' ? 'Classic map' : style === 'street' ? 'Street map' : 'Satellite map', 'ok');
}

/* ---------- Airport search on the maps ---------- */
// The maps show only the airports on your routes and where flights are going. Any other airport in the
// world (or in the simulator) can be found here by its name, city, ICAO or IATA code.
function mapSearchBtn(): string { return `<button class="icon-btn" data-act="map-search" aria-label="Find an airport">${icon('search')}</button>`; }
function _curMap(): WorldMap { return State.screen === 'map' ? _bigMap : (typeof _opsMap !== 'undefined' ? _opsMap : null); }

function mapSearchResults(q: string): string {
  const list = q.trim() ? World.search(q, 8) : [];
  return list.map(a => `<button class="ms-row" data-act="map-find" data-icao="${esc(a.icao)}"><b>${esc(a.icao)}</b><span><span>${esc(a.name !== a.icao ? a.name : a.city)}</span><small>${esc([a.city !== a.name ? a.city : '', a.country].filter(Boolean).join(', '))}</small></span></button>`).join('')
    || `<p class="fine-print">${q.trim() ? 'No airport matches that.' : `Type a name, city or code. ${World.ready ? num(World.list.length + Object.keys(AIRPORTS).length) + ' airports' : 'Airports are loading…'}${World.simCount ? `, ${num(World.simCount)} from your simulator` : ''}.`}</p>`;
}

ACTIONS['map-search'] = el => {
  Sound.tick();
  const r = el.getBoundingClientRect();
  const wrap = openLayer('pop', `<div class="ms"><label class="apt-search">${icon('search')}<input id="map-q" type="search" placeholder="Airport name, city, ICAO or IATA" autocomplete="off"></label><div class="ms-list" id="map-q-list">${mapSearchResults('')}</div></div>`, { cls: 'map-search-pop' });
  const p = wrap.querySelector('.panel') as HTMLElement, w = Math.min(340, window.innerWidth - 16);
  p.style.width = w + 'px';
  p.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  p.style.top = Math.max(8, Math.min(window.innerHeight - 320, r.bottom + 6)) + 'px';
  setTimeout(() => { const i = $('#map-q') as HTMLInputElement; if (i) i.focus(); }, 60);
};
document.addEventListener('input', e => {
  const el = e.target as HTMLInputElement;
  if (el && el.id === 'map-q') { const l = $('#map-q-list'); if (l) l.innerHTML = mapSearchResults(el.value); }
});

/** Centre the map on an airport, mark it and show what it is. */
function focusAirport(icao: string, stay?: boolean) {
  const a: any = apt(icao), m = _curMap(); if (!a || !m) return;
  m.following = null; m.selected = null; m.mark = icao;
  if (!stay) m.fit([[a.pos[0] - 1.6, a.pos[1] - 0.9], [a.pos[0] + 1.6, a.pos[1] + 0.9]], 40, true);
  m.baseDirty = true;
  const box = $(State.screen === 'map' ? '#map-detail' : '#ops-sel'); if (!box) return;
  const onRoutes = State.routes.filter(r => r.companyId === State.companyId && r.legs.indexOf(icao) >= 0).map(r => r.code);
  box.innerHTML = `<div class="sel-pop"><div class="card apt-card">
    <div class="card-h"><b>${esc(icao)}${a.iata ? ` <small>${esc(a.iata)}</small>` : ''}</b><button class="icon-btn" data-act="map-unmark" aria-label="Close">${icon('close')}</button></div>
    <div class="apt-name">${esc(a.name)}</div><small class="muted">${esc([a.city !== a.name ? a.city : '', a.country].filter(Boolean).join(', '))}${a.elev != null ? ` · ${num(a.elev)} ft` : ''}</small>
    <div class="apt-rwy" id="apt-rwy"></div>
    <small class="muted">${onRoutes.length ? 'On your routes: ' + onRoutes.join(', ') : 'Not on any of your routes yet'}</small>
    <div class="apt-wx" id="apt-wx">${aptWxHtml(icao)}</div>
    ${AIRPORT_VIEW ? `<button class="btn primary sm apt-view-btn" data-act="apt-view" data-icao="${esc(icao)}">${icon('land')}Airport view</button>` : ''}
  </div></div>`;
  if (LiveWx.on() && !LiveWx.cache[icao]) LiveWx.fetch([icao]).then(() => { const w = $('#apt-wx'); if (w) w.innerHTML = aptWxHtml(icao); });
  World.loadRunways().then(rw => {
    const el = $('#apt-rwy'); if (!el) return;
    const list = (rw[icao] || []) as any[];
    el.innerHTML = list.length ? list.map(r => `<span class="rwy-chip"><b>${esc(r[0])}/${esc(r[1])}</b>${r[2] ? ` ${num(Math.round(r[2] * 0.3048))} m` : ''}</span>`).join('') : '';
  });
}
ACTIONS['map-find'] = el => { closeAll(); Sound.tick(); focusAirport(el.getAttribute('data-icao')); };
ACTIONS['map-unmark'] = () => { const m = _curMap(); if (m) { m.mark = null; m.baseDirty = true; } const box = $(State.screen === 'map' ? '#map-detail' : '#ops-sel'); if (box) box.innerHTML = ''; };

/** The airport view is switched on once it is finished. */
const AIRPORT_VIEW = true;

/* ---------- The flight's speech bubble ---------- */
function flightBubbleHtml(id: string, following: boolean): string {
  const f: any = State.live.filter(x => x.id === id)[0]; if (!f) return '';
  const p = pilot(f.pilotId), fav = !!((State as any).favs || {})[f.pilotId];
  const who = f.you ? 'You' : (p ? p.name : 'Pilot') + (f.coop ? ', co-op' : '');
  return `<div class="fbub-box" role="dialog" aria-label="${esc(f.callsign)}">
    <div class="fbub-h"><b>${esc(f.callsign)}</b><small>${esc(who)} · ${esc(f.from)} → ${esc(f.noDest ? '…' : f.to)}</small></div>
    <div class="fbub-acts">
      <button class="${following ? 'on' : ''}" data-act="fb-follow" data-id="${esc(id)}">${icon('focus')}${following ? 'Following' : 'Follow'}</button>
      ${f.you ? '' : `<button class="${fav ? 'on fav' : ''}" data-act="fb-fav" data-id="${esc(id)}">${icon('star')}${fav ? 'Favourite' : 'Favourite'}</button>`}
      ${AIRPORT_VIEW ? `<button data-act="fb-airport" data-id="${esc(id)}">${icon('land')}${esc(bubbleAirport(f))}</button>` : ''}
      <button data-act="fb-details" data-id="${esc(id)}">${icon('info')}Details</button>
    </div></div>`;
}
/** The airport a flight is nearest in its trip: where it left from until the climb is over, then where it's going. */
function bubbleAirport(f: any): string {
  if (f.noDest) return f.from;
  return /taxi out|pushback|takeoff|take-off|climb|boarding/i.test(f.phase || '') || (f.t != null && f.t < 0.5 && !/descent|approach|final|landing|taxi in/i.test(f.phase || '')) ? f.from : f.to;
}
ACTIONS['fb-airport'] = el => {
  const f: any = State.live.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!f) return;
  openAirportView(bubbleAirport(f), f.id);
};
ACTIONS['apt-view'] = el => { const icao = el.getAttribute('data-icao'); ACTIONS['map-unmark'](el, null); openAirportView(icao); };
ACTIONS['fb-follow'] = el => {
  const id = el.getAttribute('data-id'), m = _curMap(); if (!m) return; Sound.tick();
  if (m.following === id) m.following = null; else { m.mark = null; m.follow(id); }
  m.openBubble(id);
};
ACTIONS['fb-fav'] = el => {
  const f = State.live.filter(x => x.id === el.getAttribute('data-id'))[0], m = _curMap(); if (!f) return;
  const S: any = State; S.favs = S.favs || {};
  if (S.favs[f.pilotId]) delete S.favs[f.pilotId]; else S.favs[f.pilotId] = 1;
  Sound.tick(); Store.soon();
  if (m) m.openBubble(f.id);
  const list = $('#mf-list'); if (list) list.innerHTML = mapListHtml(f.id);
};
ACTIONS['fb-details'] = el => {
  const id = el.getAttribute('data-id'), m = _curMap(); Sound.tick();
  if (m) m.closeBubble();
  if (State.screen === 'map') selectFlight(id);
  else { const s = (window as any).__opsShowSel; if (s) s(id); }
};

/** The airport's weather report, fuel price and size, for its card on the map. */
function aptWxHtml(icao: string): string {
  const m = LiveWx.on() ? LiveWx.cache[icao] : null, at = Network.which() !== 'off' ? Network.atcAt(icao) : [];
  return `${m && m.raw ? `<code class="metar">${esc(m.raw)}</code>` : ''}<small class="muted">${esc(SIZE_NAMES[aptSize(icao)])} · fuel $${fuelPrice(icao).toFixed(2)}/kg${m && m.cat ? ' · ' + esc(m.cat) : ''}</small>${at.length ? `<div class="wx-atc">${at.map(x => `<span class="chip">${esc(x.callsign)} ${esc(x.freq)}</span>`).join('')}</div>` : ''}`;
}
