// Full-screen live map with every company flight and a details panel.
let _bigMap: WorldMap = null;

function mapListHtml(sel: string): string {
  const live = liveOf();
  return live.map(f => {
    const a = plane(f.reg), t = acType(a.typeId), p = pilot(f.pilotId);
    return `<button class="mf-row ${sel === f.id ? 'on' : ''} ${f.you ? 'you' : ''}" data-act="map-pick" data-id="${f.id}">
      <span class="mf-cs">${esc(f.callsign)}</span>
      <span class="mf-rt">${esc(f.from)}<i></i>${esc(f.to)}</span>
      <span class="mf-pg"><i style="width:${(f.t * 100).toFixed(0)}%"></i></span>
      <small>${f.you ? 'You' : esc(p.name)}, ${esc(t.model)}</small>
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
      <div class="map-zoom"><button class="icon-btn" data-act="map-zoom" data-f="1.6" aria-label="Zoom in">${icon('plus')}</button><button class="icon-btn" data-act="map-zoom" data-f="0.625" aria-label="Zoom out"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14"/></svg></button><button class="icon-btn" data-act="map-fit" aria-label="Show all flights">${icon('focus')}</button>${layerBtn()}</div>
      <div class="map-detail" id="map-detail"></div>
    </div>`;
  },
  mount(root) {
    _bigMap = new WorldMap($('#big-map', root), { interactive: true, insetRight: 270, onSelect: id => selectFlight(id) });
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
