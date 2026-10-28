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
      <div class="map-zoom"><button class="icon-btn" data-act="map-zoom" data-f="1.6" aria-label="Zoom in">${icon('plus')}</button><button class="icon-btn" data-act="map-zoom" data-f="0.625" aria-label="Zoom out"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14"/></svg></button><button class="icon-btn" data-act="map-fit" aria-label="Show all flights">${icon('layers')}</button></div>
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
  liveOf().forEach(f => { pts.push(apt(f.from).pos, apt(f.to).pos); });
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
ACTIONS['show-flight'] = el => { const t = el.closest('.toast'); if (t) t.remove(); showFlightOnMap(el.getAttribute('data-id')); };
