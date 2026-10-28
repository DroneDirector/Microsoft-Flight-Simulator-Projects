// Routes: scheduled routes with any number of stops, plus a route builder.

function legChain(legs: string[]): string {
  return `<span class="chain">${legs.map((l, i) => `${i ? '<i></i>' : ''}<b>${esc(l)}</b>`).join('')}</span>`;
}

function routeDistance(legs: string[]): number {
  let d = 0; for (let i = 1; i < legs.length; i++) d += gcDistanceNm(apt(legs[i - 1]).pos, apt(legs[i]).pos); return d;
}

SCREENS.routes = {
  title: 'Routes', icon: 'routes',
  render() {
    const rs = State.routes.filter(r => r.companyId === State.companyId);
    const countries: { [k: string]: boolean } = {};
    rs.forEach(r => r.legs.forEach(l => countries[apt(l).country] = true));
    return `
    <div class="screen-head">
      <div><h1>Routes</h1><p class="sub">${rs.length} routes to ${Object.keys(countries).length} countries</p></div>
      <button class="btn primary" data-act="new-route">${icon('plus')}New route</button>
    </div>
    <div class="route-list">${rs.map((r, i) => {
      const t = acType(r.typeId), p = r.pilotId ? pilot(r.pilotId) : null;
      const dist = routeDistance(r.legs);
      return `<div class="route-row" style="--i:${i}">
        <span class="rr-code">${esc(r.code)}</span>
        <span class="rr-chain">${legChain(r.legs)}<small>${r.legs.length - 1} leg${r.legs.length > 2 ? 's' : ''}, ${num(dist)} nm, ${esc(r.days)}</small></span>
        <span class="rr-ac">${esc(t.model)}<small>${p ? (p.you ? 'You fly this' : esc(p.name)) : 'No pilot yet'}</small></span>
        <span class="rr-demand"><small>Demand</small><span class="cond cond-${r.demand > 80 ? 'good' : r.demand > 65 ? 'fair' : 'poor'}"><i style="width:${r.demand}%"></i></span></span>
        <span class="rr-yield"><small>Per seat</small><b>${money(r.yieldPerPax)}</b></span>
      </div>`;
    }).join('') || emptyState('No routes yet', 'Create your first route from your hub.', 'New route', 'new-route')}</div>`;
  },
};

let _nr = { stops: [] as string[], typeId: '' };
/** Usable range: published range minus an IFR reserve (about 45 minutes at cruise speed). */
function usableRange(t: AircraftType): number { return Math.round(t.rangeNm - t.cruiseKt * 0.75); }
function legBlockMin(t: AircraftType, nm: number): number { return Math.round(nm / t.cruiseKt * 60 + 25); }

function newRouteHtml(): string {
  const c = company();
  const opts = Object.keys(AIRPORTS).filter(k => c.kind === 'bush' ? k[0] === 'P' : k[0] !== 'P');
  const fleetTypes = State.fleet.filter(a => a.companyId === c.id).map(a => a.typeId).filter((t, i, arr) => arr.indexOf(t) === i);
  const t = _nr.typeId ? acType(_nr.typeId) : null;
  const max = t ? usableRange(t) : 99999;
  const legs = _nr.stops.slice(1).map((s, i) => { const d = gcDistanceNm(apt(_nr.stops[i]).pos, apt(s).pos); return { from: _nr.stops[i], to: s, d, ok: d <= max, block: t ? legBlockMin(t, d) : 0 }; });
  const bad = legs.filter(l => !l.ok);
  const last = _nr.stops[_nr.stops.length - 1];
  const crewMax = t ? Math.max.apply(null, legs.map(l => pilotsNeeded(t, l.block)).concat([multiCrew(t) ? 2 : 1])) : 0;
  return `
    <div class="modal-head"><div><h2>New route</h2><small>Add as many stops as you like. Every leg must be within the aircraft's real-world range.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body nr">
      <div class="nr-chain">${_nr.stops.map((s, i) => `<span class="nr-stop ${i && !legs[i - 1].ok ? 'bad' : ''}">${i ? `<i></i><em>${num(legs[i - 1].d)} nm</em>` : ''}<b>${esc(s)}</b><small>${esc(apt(s).city)}</small>${i ? `<button class="x" data-act="nr-remove" data-i="${i}" aria-label="Remove ${esc(s)}">${icon('close')}</button>` : ''}</span>`).join('')}
        <span class="nr-hint">${_nr.stops.length < 2 ? 'Pick a destination below' : `${_nr.stops.length - 1} legs, ${num(routeDistance(_nr.stops))} nm`}</span></div>
      ${t ? `<div class="nr-range ${bad.length ? 'bad' : ''}">${icon(bad.length ? 'alert' : 'fuel')}<span>${bad.length
        ? `${bad.map(l => `${l.from} to ${l.to} is ${num(l.d)} nm`).join(', ')}: too far for the ${esc(t.model)} (${num(max)} nm with fuel reserves). Add a fuel stop or pick a longer-range aircraft.`
        : `${esc(t.model)}: up to ${num(max)} nm per leg with fuel reserves (range ${num(t.rangeNm)} nm).${crewMax > 2 ? ` The longest leg needs ${crewMax} pilots.` : ''}`}</span></div>` : ''}
      <h3>Add a stop</h3>
      <div class="apt-grid">${opts.filter(k => k !== last).map(k => {
        const d = gcDistanceNm(apt(last).pos, apt(k).pos), far = !!t && d > max;
        return `<button class="apt-btn ${far ? 'far' : ''}" data-act="nr-add" data-icao="${k}" ${far ? 'disabled' : ''}><b>${k}</b><small>${esc(apt(k).city)}, ${esc(apt(k).country)}</small><small class="d">${num(d)} nm${far ? ', too far' : ''}</small></button>`;
      }).join('')}</div>
      <h3>Aircraft</h3>
      <div class="seg wrap">${fleetTypes.map(id => `<button class="${_nr.typeId === id ? 'on' : ''}" data-act="nr-type" data-t="${id}">${esc(acType(id).model)} <small>${num(usableRange(acType(id)))} nm</small></button>`).join('')}</div>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn primary" data-act="nr-save" ${_nr.stops.length < 2 || bad.length ? 'disabled' : ''}>Create route</button></div>
    </div>`;
}
ACTIONS['new-route'] = () => {
  const c = company();
  const ft = State.fleet.filter(a => a.companyId === c.id)[0];
  _nr = { stops: [c.hub], typeId: ft ? ft.typeId : '' };
  openLayer('modal', newRouteHtml(), { cls: 'wide nr-pop' });
};
function rerenderNr() { const p = $('.nr-pop .panel'); if (p) p.innerHTML = newRouteHtml(); }
ACTIONS['nr-add'] = el => { _nr.stops.push(el.getAttribute('data-icao')); Sound.tick(); rerenderNr(); };
ACTIONS['nr-remove'] = el => { _nr.stops.splice(parseInt(el.getAttribute('data-i'), 10), 1); Sound.tick(); rerenderNr(); };
ACTIONS['nr-type'] = el => { _nr.typeId = el.getAttribute('data-t'); Sound.tick(); rerenderNr(); };
ACTIONS['nr-save'] = () => {
  const t = acType(_nr.typeId);
  if (t && _nr.stops.slice(1).some((x, i) => gcDistanceNm(apt(_nr.stops[i]).pos, apt(x).pos) > usableRange(t))) { toast('A leg is too far for this aircraft', 'warn'); return; }
  const c = company();
  const code = c.icao + (700 + State.routes.length);
  State.routes.push({ id: uid(), companyId: c.id, code, legs: _nr.stops.slice(), days: 'Daily', typeId: _nr.typeId, demand: 60 + Math.round(Math.random() * 30), yieldPerPax: 140 + Math.round(Math.random() * 200) });
  closeAll(); refresh(); toast(`Route ${code} created`, 'ok');
};
