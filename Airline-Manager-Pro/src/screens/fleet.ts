// Fleet: every airframe with its own illustration, status and condition.
let _fleetFilter = 'all';

function fleetCard(a: Aircraft, i: number): string {
  const t = acType(a.typeId), c = company(a.companyId);
  const div = c.divisions.filter(d => d.id === a.divisionId)[0];
  const f = State.live.filter(x => x.reg === a.reg)[0];
  const where = f ? `${f.from} to ${f.to}` : a.location;
  return `<button class="ac-card st-${fleetState(a)}" data-act="ac-detail" data-reg="${a.reg}" style="--i:${i}">
    <div class="ac-stage">${aircraftArt(a.typeId, { color: div ? div.color : c.color, color2: c.color2, reg: a.reg })}</div>
    <div class="ac-info">
      <div class="ac-row1"><b class="ac-reg">${esc(a.reg)}</b>${State.myReg[a.companyId] === a.reg ? '<span class="you-tag">You fly this</span>' : ''}${statusChip(a.status)}</div>
      <div class="ac-type">${esc(t.maker)} ${esc(t.model)}</div>
      <div class="ac-dev"><span class="dev-tag ${t.devKind}">${esc(t.dev)}</span>${div ? `<span class="div-tag" style="--dc:${div.color}">${esc(div.name)}</span>` : ''}</div>
      <div class="ac-meta">
        <span>${icon('pin')}${esc(where)}</span>
        <span>${icon('clock')}${num(a.hoursMin / 60)} h</span>
      </div>
      <div class="ac-cond"><small>Condition</small>${conditionBar(a.condition)}<b>${a.condition}%</b></div>
    </div>
  </button>`;
}

SCREENS.fleet = {
  title: 'Fleet', icon: 'fleet',
  render() {
    const all = fleetOf();
    const classes = [['all', 'All'], ['airliner', 'Narrowbody'], ['widebody', 'Widebody'], ['regional', 'Regional jets'], ['turboprop', 'Turboprops'], ['bush', 'Bush'], ['ga', 'Light aircraft']]
      .filter(c => c[0] === 'all' || all.some(a => acType(a.typeId).cls === c[0]));
    const list = all.filter(a => _fleetFilter === 'all' || acType(a.typeId).cls === _fleetFilter);
    const byType: { [k: string]: number } = {};
    all.forEach(a => { const t = acType(a.typeId); const k = t.maker + ' ' + t.model; byType[k] = (byType[k] || 0) + 1; });
    return `
    <div class="screen-head">
      <div><h1>Fleet</h1><p class="sub">${all.length} aircraft, ${all.filter(a => a.status === 'flying').length} in the air, ${all.filter(a => a.status === 'grounded').length} grounded</p></div>
      <button class="btn primary" data-act="go" data-screen="market">${icon('plus')}Buy aircraft</button>
    </div>
    <div class="filter-row">${classes.map(c => `<button class="fchip ${_fleetFilter === c[0] ? 'on' : ''}" data-act="fleet-filter" data-f="${c[0]}">${c[1]}</button>`).join('')}
      <span class="type-sum">${Object.keys(byType).map(k => `<i>${byType[k]}× ${esc(k)}</i>`).join('')}</span></div>
    <div class="ac-grid">${list.map(fleetCard).join('') || emptyState('No aircraft yet', 'Buy your first aircraft to start flying routes.', 'Buy aircraft', 'go-market')}</div>`;
  },
};

ACTIONS['fleet-filter'] = el => { _fleetFilter = el.getAttribute('data-f'); Sound.tick(); refresh(); };
ACTIONS['go-market'] = () => go('market');

ACTIONS['ac-detail'] = el => {
  const a = plane(el.getAttribute('data-reg')); if (!a) return;
  Sound.tick();
  const t = acType(a.typeId), c = company(a.companyId);
  const div = c.divisions.filter(d => d.id === a.divisionId)[0];
  const issues = State.issues.filter(i => i.reg === a.reg);
  const log = State.logbook.filter(l => l.reg === a.reg).slice(0, 4);
  const f = State.live.filter(x => x.reg === a.reg)[0];
  openLayer('modal', `
    <div class="modal-head"><div><h2>${esc(a.reg)}</h2><small>${esc(t.maker)} ${esc(t.variant)}, ${esc(t.dev)}</small></div>${statusChip(a.status)}
      <button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body ac-detail">
      <div class="acd-hero">${aircraftArt(a.typeId, { color: div ? div.color : c.color, color2: c.color2, reg: a.reg })}</div>
      <div class="kv-row">
        <div><small>Airframe hours</small><b>${num(a.hoursMin / 60)}</b></div>
        <div><small>Cycles</small><b>${num(a.cycles)}</b></div>
        <div><small>Condition</small><b>${a.condition}%</b></div>
        <div><small>Seats</small><b>${t.seats}</b></div>
        <div><small>Range</small><b>${num(t.rangeNm)} nm</b></div>
        <div><small>Base</small><b>${esc(a.base)}</b></div>
      </div>
      ${f ? `<p class="lede">${icon('fleet')}Flying ${esc(f.callsign)} from ${esc(apt(f.from).city)} to ${esc(apt(f.to).city)}${f.you ? ' with you at the controls' : ', ' + esc(pilot(f.pilotId).name)}.</p>` : ''}
      <div class="two-col">
        <div><h3>Maintenance</h3>${issues.length ? issues.map(i => `<button class="mini-row" data-act="open-issue" data-id="${i.id}">${statusChip(i.status)}<span>${esc(i.title)}</span><small>${esc(i.date)}</small></button>`).join('') : '<p class="muted">No damage on record.</p>'}</div>
        <div><h3>Recent flights</h3>${log.length ? log.map(l => `<div class="mini-row"><span>${esc(l.from)} to ${esc(l.to)}</span><small>${num(l.landingFpm)} fpm</small></div>`).join('') : '<p class="muted">No flights logged yet.</p>'}</div>
      </div>
    </div>`, { cls: 'wide' });
};
