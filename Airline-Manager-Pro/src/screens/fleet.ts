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
      ${_blocked[a.reg] ? `<span class="crew-short">${icon('pilots')}${esc(_blocked[a.reg].join(', '))}</span>` : ''}
      <div class="ac-row1"><b class="ac-reg">${esc(a.reg)}</b>${State.myReg[a.companyId] === a.reg ? '<span class="you-tag">You fly this</span>' : ''}${(a as any).lease ? '<span class="lease-tag">Leased</span>' : ''}${(a as any).noBase ? '<span class="nostand-tag">No stand</span>' : ''}${statusChip(a.status)}</div>
      <div class="ac-type">${esc(t.maker)} ${esc(t.model)}</div>
      <div class="ac-dev"><span class="dev-tag ${t.devKind}">${esc(t.dev)}</span>${div ? `<span class="div-tag" style="--dc:${div.color}">${esc(div.name)}</span>` : ''}</div>
      <div class="ac-meta">
        <span>${icon('pin')}${esc(where)}</span>
        <span>${icon('clock')}${num(a.hoursMin / 60)} h</span>
      </div>
      <div class="ac-cond"><small>Condition</small>${conditionBar(a.condition)}<b>${Math.round(a.condition)}%</b></div>
    </div>
  </button>`;
}

let _blocked: { [reg: string]: string[] } = {};
SCREENS.fleet = {
  title: 'Fleet', icon: 'fleet',
  render() {
    _blocked = crewCheck().blocked;
    const all = fleetOf();
    const classes = [['types', 'Aircraft types'], ['all', 'All'], ['airliner', 'Narrowbody'], ['widebody', 'Widebody'], ['regional', 'Regional jets'], ['turboprop', 'Turboprops'], ['bush', 'Bush'], ['ga', 'Light aircraft']]
      .filter(c => c[0] === 'all' || c[0] === 'types' || all.some(a => acType(a.typeId).cls === c[0]));
    const list = all.filter(a => _fleetFilter === 'all' || acType(a.typeId).cls === _fleetFilter || a.typeId === _fleetFilter);
    return `
    <div class="screen-head">
      <div><h1>Fleet</h1><p class="sub">${all.length} aircraft, ${all.filter(a => a.status === 'flying').length} in the air, ${all.filter(a => a.status === 'grounded').length} grounded</p></div>
      <div class="btn-row nowrap"><button class="btn primary" data-act="go-market">${icon('plus')}Buy aircraft</button><button class="btn ghost" data-act="go-lease">${icon('key')}Lease aircraft</button></div>
    </div>
    ${noStandBannerHtml()}
    <div class="filter-row">${classes.map(c => `<button class="fchip ${_fleetFilter === c[0] || (c[0] === 'types' && acType(_fleetFilter)) ? 'on' : ''}" data-act="fleet-filter" data-f="${c[0]}">${c[1]}</button>`).join('')}</div>
    ${_fleetFilter === 'types' ? fleetTypesHtml(all)
      : `${acType(_fleetFilter) ? `<p class="fine-print">${icon('fleet')}${esc(acType(_fleetFilter).maker + ' ' + acType(_fleetFilter).model)}: ${list.length} in the fleet. <button class="text-btn" data-act="fleet-filter" data-f="types">All aircraft types</button></p>` : ''}
    <div class="ac-grid">${list.map(fleetCard).join('') || emptyState('No aircraft yet', 'Buy your first aircraft to start flying routes.', 'Buy aircraft', 'go-market')}</div>`}`;
  },
};

/** Aircraft types: one card per type in the fleet, with how many you have and how they're doing. */
function fleetTypesHtml(all: Aircraft[]): string {
  const c = company(), ids: string[] = [];
  all.forEach(a => { if (ids.indexOf(a.typeId) < 0) ids.push(a.typeId); });
  if (!ids.length) return emptyState('No aircraft yet', 'Buy your first aircraft to start flying routes.', 'Buy aircraft', 'go-market');
  return `<div class="ac-grid">${ids.map((id, i) => {
    const t = acType(id), mine = all.filter(a => a.typeId === id);
    const fly = mine.filter(a => a.status === 'flying').length, mx = mine.filter(a => a.status === 'grounded' || a.status === 'maintenance').length, avail = mine.length - fly - mx;
    const cond = mine.reduce((s, a) => s + a.condition, 0) / mine.length, hrs = mine.reduce((s, a) => s + a.hoursMin, 0) / 60;
    return `<button class="ac-card type-card" data-act="fleet-filter" data-f="${id}" style="--i:${i}">
      <div class="ac-art">${aircraftArt(id, { color: c.color, color2: c.color2 })}</div>
      <div class="tc-head"><b>${esc(t.maker)} ${esc(t.model)}</b><span class="tc-n">${mine.length}<small>in the fleet</small></span></div>
      <small class="tc-sub">${esc(t.variant)}, ${esc(t.dev)}</small>
      <div class="tc-st"><span><i class="led fl"></i>${fly} flying</span><span><i class="led av"></i>${avail} available</span><span><i class="led mx"></i>${mx} maintenance</span></div>
      <div class="ac-cond"><small>Average condition</small>${conditionBar(cond)}<b>${Math.round(cond)}%</b></div>
      <div class="tc-spec"><span><small>Seats</small><b>${t.seats}</b></span><span><small>Range</small><b>${num(t.rangeNm)} nm</b></span><span><small>Cruise</small><b>${t.cruiseKt} kt</b></span><span><small>Fleet hours</small><b>${num(hrs)}</b></span></div>
    </button>`;
  }).join('')}</div>`;
}

ACTIONS['fleet-filter'] = el => { _fleetFilter = el.getAttribute('data-f'); Sound.tick(); refresh(); };
ACTIONS['go-market'] = () => { _mkMode = 'buy'; go('market'); };
ACTIONS['go-lease'] = () => { _mkMode = 'lease'; go('market'); };

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
        <div><small>Condition</small><b>${Math.round(a.condition)}%</b></div>
        <div><small>Seats</small><b>${t.seats}</b></div>
        <div><small>Range</small><b>${num(t.rangeNm)} nm</b></div>
        <div><small>Base</small><b>${esc(a.base)}</b></div>
      </div>
      <div class="base-row ${(a as any).noBase ? 'warn' : ''}">${icon((a as any).noBase ? 'alert' : 'pin')}<span><b>${(a as any).noBase ? `No stand at ${esc(a.base)}` : `Based at ${esc(apt(a.base) ? apt(a.base).name : a.base)} (${esc(a.base)})`}</b><small>${(a as any).noBase ? 'All stands there are taken by your aircraft. Refused take-off and no passengers until it has a base with a free stand.' : esc(Bases.standLabel(a.base))}</small></span><button class="btn ${(a as any).noBase ? 'primary' : 'ghost'} sm" data-act="ac-rebase" data-reg="${esc(a.reg)}">${icon('pin')}Change base</button></div>
      ${leasePanelHtml(a)}
      ${f ? `<p class="lede">${icon('fleet')}Flying ${esc(f.callsign)} from ${esc(apt(f.from).city)} to ${esc(apt(f.to).city)}${f.you ? ' with you at the controls' : ', ' + esc(pilot(f.pilotId).name)}.</p>` : ''}
      <div class="two-col">
        <div><h3>Maintenance</h3>${issues.length ? issues.map(i => `<button class="mini-row" data-act="open-issue" data-id="${i.id}">${statusChip(i.status)}<span>${esc(i.title)}</span><small>${esc(i.date)}</small></button>`).join('') : '<p class="muted">No damage on record.</p>'}</div>
        <div><h3>Recent flights</h3>${log.length ? log.map(l => `<div class="mini-row"><span>${esc(l.from)} to ${esc(l.to)}</span><small>${num(l.landingFpm)} fpm</small></div>`).join('') : '<p class="muted">No flights logged yet.</p>'}</div>
      </div>
    </div>`, { cls: 'wide' });
};
