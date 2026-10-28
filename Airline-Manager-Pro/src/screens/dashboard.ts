// Operations overview: live map, your current flight, today's legs and anything that needs you.
let _opsMap: WorldMap = null;

function yourFlight(): LiveFlight { return liveOf().filter(f => f.you)[0]; }

function coPilotChip(): string {
  const co: any = State.pilots.filter((p: any) => p.coPilotFor === State.companyId)[0];
  if (!co) return '';
  return `<button class="sync-item cp" data-act="staff-detail" data-id="${co.id}"><span class="cp-av">${avatarSvg(co.look, 'fo', { view: 'bust', accent: company().color })}</span><span><small>Co-pilot</small><b>${esc(co.name)}</b></span></button>`;
}

function flightCard(f: LiveFlight): string {
  const a = plane(f.reg), t = acType(a.typeId), A = apt(f.from), B = apt(f.to);
  const dist = gcDistanceNm(A.pos, B.pos);
  const left = f.real ? (f.noDest ? 0 : gcDistanceNm(f.pos, B.pos)) : dist * (1 - f.t);
  const spd = f.real && f.gs > 60 ? f.gs : t.cruiseKt;
  const eta = Math.round(left / spd * 60);
  const altTxt = f.alt < 18000 ? num(Math.round(f.alt / 100) * 100) + ' ft' : 'FL' + Math.round(f.alt / 100);
  const fuelOk = (State as any).myLoad.fuelKg >= (State as any).myLoad.tripFuelKg + (State as any).myLoad.reserveKg;
  return `
  <div class="card flight-card">
    <div class="fc-top"><span class="fc-cs">${esc(f.callsign)}</span>${statusChip('flying')}<span class="fc-ac">${esc(f.reg)}, ${esc(t.model)}</span></div>
    <div class="fc-route">
      <div><b>${esc(f.from)}</b><small>${esc(A.city)}</small></div>
      <div class="fc-track"><i class="fc-fill" style="width:${(f.t * 100).toFixed(1)}%"></i><i class="fc-plane" style="left:${(f.t * 100).toFixed(1)}%">${icon('fleet')}</i></div>
      <div class="r"><b>${f.noDest ? '—' : esc(f.to)}</b><small>${f.noDest ? 'No destination yet' : esc(B.city)}</small></div>
    </div>
    <div class="fc-grid">
      <div><small>Phase</small><b>${esc(f.phase)}</b></div>
      <div><small>Altitude</small><b>${altTxt}</b></div>
      <div><small>Remaining</small><b>${f.noDest ? '—' : num(left) + ' nm'}</b></div>
      <div><small>Arrives in</small><b>${f.noDest ? '—' : hours(eta)}</b></div>
    </div>
    ${f.you ? `<div class="fc-sync">
      <div class="sync-item">${icon('pax')}<span><small>Passengers from ${(State as any).myLoad.source === 'gsx' ? 'GSX' : 'the sim'}</small><b>${f.pax} / ${f.paxMax}</b></span></div>
      <button class="sync-item" data-act="weights">${icon('fuel')}<span><small>Fuel on board</small><b>${num((State as any).myLoad.fuelKg)} kg</b></span><i class="si-ok ${fuelOk ? '' : 'bad'}">${icon(fuelOk ? 'check' : 'alert')}</i></button>
      <div class="sync-item">${icon('radio')}<span><small>ATC, ${State.settings.atcSource === 'beyondatc' ? 'BeyondATC' : 'built-in'}</small>
        <span class="clr">${f.real ? '<i>Taxi</i><i>Takeoff</i><i>Landing</i>' : '<i class="ok">Taxi</i><i class="ok">Takeoff</i><i>Landing</i>'}</span></span></div>
      ${coPilotChip()}
    </div>` : `<div class="fc-sync"><div class="sync-item">${icon('user')}<span><small>Flown by</small><b>${esc(pilot(f.pilotId).name)}</b></span></div>
      <div class="sync-item">${icon('pax')}<span><small>On board</small><b>${f.pax} passengers</b></span></div></div>`}
  </div>`;
}

let _ovPeriod = 'day';
const PERIOD_NAMES: { [k: string]: string } = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' };

function widget(page: string, title: string, body: string, cls?: string, i?: number, extra?: string): string {
  return `<button class="widget ${cls || ''}" data-act="go" data-screen="${page}" style="--i:${i || 0}" aria-label="${esc(title)}, open ${esc(SCREENS[page].title)}">
    <span class="w-h"><span>${esc(title)}</span>${extra || ''}${icon('chevron', 'w-go')}</span>${body}</button>`;
}

function sparkline(vals: number[], w: number, h: number): string {
  if (vals.length < 2) return '';
  const mn = Math.min.apply(null, vals.concat([0])), mx = Math.max.apply(null, vals);
  const x = (i: number) => (i / (vals.length - 1)) * w, y = (v: number) => h - 2 - (v - mn) / ((mx - mn) || 1) * (h - 4);
  const d = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L${w},${h} L0,${h} Z" class="sp-fill"/><path d="${d}" class="sp-line"/><circle cx="${x(vals.length - 1)}" cy="${y(vals[vals.length - 1])}" r="2.6" class="sp-dot"/></svg>`;
}

function ring(pct: number): string {
  const r = 26, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="rg-bg"/><circle cx="32" cy="32" r="${r}" class="rg-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/></svg>`;
}

function fleetStatusTile(a: Aircraft, i: number): string {
  const t = acType(a.typeId), st = fleetState(a);
  const f = State.live.filter(x => x.reg === a.reg)[0];
  const mine = State.myReg[State.companyId] === a.reg;
  const where = f ? `${f.from} → ${f.to}` : a.location;
  return `<button class="fs-tile st-${st}" data-act="ac-detail" data-reg="${a.reg}" style="--i:${i}">
    <i class="fs-led"></i><b>${esc(a.reg)}</b><small>${esc(t.model)}</small><span>${esc(where)}</span>${mine ? '<em>You</em>' : ''}</button>`;
}

SCREENS.ops = {
  title: 'Overview', icon: 'ops',
  render() {
    const c = company();
    const mine = yourFlight();
    const fl = fleetOf(), live = liveOf();
    const nFlight = fl.filter(a => fleetState(a) === 'flight').length, nAvail = fl.filter(a => fleetState(a) === 'avail').length, nMaint = fl.length - nFlight - nAvail;
    const avail = availabilityPct(fl);
    const series = profitSeries(_ovPeriod), last = series[series.length - 1];
    const profit = last.rev - last.cost;
    const openIssues = State.issues.filter(i => i.status === 'open' && plane(i.reg).companyId === c.id);
    const pendingCrash = State.logbook.filter(l => l.result === 'crash' && l.decision === 'pending' && plane(l.reg).companyId === c.id);
    const fines = State.notices.filter(n => n.kind === 'authority' && n.ref && State.fines[n.ref]);
    const myA = plane(State.myReg[c.id]);
    const cc = crewCheck(c.id);
    const sim = State.simAircraft;
    const match = myA && sim.typeId === myA.typeId;
    const pct = (n: number) => fl.length ? (n / fl.length * 100).toFixed(1) : '0';
    return `
    <div class="ov">
      <div class="w-row">
        ${widget('fleet', 'Fleet size', `<span class="w-big">${fl.length}<small>aircraft owned</small></span>
          <span class="w-stack"><i class="flight" style="width:${pct(nFlight)}%"></i><i class="avail" style="width:${pct(nAvail)}%"></i><i class="maint" style="width:${pct(nMaint)}%"></i></span>
          <span class="w-legend"><span><i class="flight"></i>${nFlight} in flight</span><span><i class="avail"></i>${nAvail} available</span><span><i class="maint"></i>${nMaint} maintenance</span></span>`, 'w-fleet', 0)}
        ${widget('map', 'Active flights', `<span class="w-big">${live.length}<small>in the air now</small></span>
          <span class="w-sub"><i class="live-dot"></i>${mine ? 'You and ' + (live.length - 1) + ' pilot' + (live.length - 1 === 1 ? '' : 's') : live.length + ' pilot' + (live.length === 1 ? '' : 's') + ' flying'}</span>`, 'w-active', 1)}
        ${widget('maint', 'Fleet availability', `<span class="w-ring">${ring(avail)}<b>${avail}<small>%</small></b></span>
          <span class="w-sub">${fl.length - nMaint} of ${fl.length} ready to fly</span>`, 'w-avail', 2)}
        ${widget('finance', 'Profit', `
          <span class="w-big ${profit >= 0 ? 'green' : 'red'}">${money(profit, { sign: true, compact: true })}<small>${_ovPeriod === 'year' ? (State.settings.timeMode === 'sim' ? 'Sim year ' : '') + esc(last.label) : PERIOD_NAMES[_ovPeriod]}</small></span>
          ${sparkline(series.map(p => p.rev - p.cost), 120, 28)}`, 'w-profit', 3,
          `<span class="w-seg" role="tablist">${['day', 'week', 'month', 'year'].map(k => `<span class="${_ovPeriod === k ? 'on' : ''}" data-act="ov-period" data-p="${k}" role="tab" aria-label="${PERIOD_NAMES[k]}">${k[0].toUpperCase()}</span>`).join('')}</span>`)}
      </div>
      <div class="ov-main">
        <div class="ops-map">
          <div class="map-host" id="ops-map"></div>
          <div class="map-legend"><b>Live operations</b><span>${live.length} airborne</span></div>
          <div class="map-sel" id="ops-sel"></div>
          <div class="map-tools">${layerBtn()}</div>
          <button class="map-expand" data-act="go" data-screen="map" aria-label="Open the full map">${icon('map')}Full map</button>
        </div>
        <aside class="ops-side">
          ${myAircraftCard()}
          ${mine ? flightCard(mine) : ''}
          <div class="card attn-card">
            <div class="card-h"><b>Needs you</b></div>
            ${pendingCrash.map(l => `<button class="attn red" data-act="open-crash" data-id="${l.id}">${icon('alert')}<span><b>Crash on ${esc(l.from)} to ${esc(l.to)}</b><small>Register or disregard</small></span>${icon('chevron')}</button>`).join('')}
            ${fines.map(n => `<button class="attn amber" data-act="open-fine" data-ref="${n.ref}">${icon('shield')}<span><b>${esc(n.title)}</b><small>${esc(n.body)}</small></span>${icon('chevron')}</button>`).join('')}
            ${(State as any).incidents.filter((x: Incident) => x.status === 'open' && staffById(x.staffId) && (staffById(x.staffId).companyId === c.id || staffById(x.staffId).coPilotFor === c.id)).map((x: Incident) => `<button class="attn amber" data-act="open-incident" data-id="${x.id}">${icon('user')}<span><b>Conduct: ${esc(staffById(x.staffId).name)}</b><small>${esc(x.title)}. Discipline or dismiss</small></span>${icon('chevron')}</button>`).join('')}
          ${Object.keys(cc.blocked).map(reg => `<button class="attn red" data-act="go-hire" data-id="${/attendant/.test(cc.blocked[reg].join()) ? 'fa' : /mechanic/.test(cc.blocked[reg].join()) ? 'mech' : 'fo'}">${icon('pilots')}<span><b>${esc(reg)} can't fly</b><small>${esc(cc.blocked[reg].join(', '))}</small></span>${icon('chevron')}</button>`).join('')}
          ${openIssues.slice(0, 3).map(i => `<button class="attn ${i.severity === 'grounding' ? 'red' : 'amber'}" data-act="open-issue" data-id="${i.id}">${icon('wrench')}<span><b>${esc(i.reg)}: ${esc(i.title)}</b><small>${i.severity === 'grounding' ? 'Grounded' : 'Mechanic report'}</small></span>${icon('chevron')}</button>`).join('')}
            ${!pendingCrash.length && !fines.length && !openIssues.length && !Object.keys(cc.blocked).length && !(State as any).incidents.some((x: Incident) => x.status === 'open') ? `<p class="muted pad">All clear. Nothing needs your attention.</p>` : ''}
          </div>
        </aside>
      </div>
      <div class="card fs-card">
        <div class="card-h"><b>Fleet status</b><span class="w-legend"><span><i class="flight"></i>In flight</span><span><i class="avail"></i>Available</span><span><i class="maint"></i>Maintenance</span></span><button class="text-btn" data-act="go" data-screen="fleet">All aircraft</button></div>
        <div class="fs-grid">${fl.map(fleetStatusTile).join('')}</div>
      </div>
    </div>`;
  },
  mount(root) {
    const host = $('#ops-map', root);
    _opsMap = new WorldMap(host, { interactive: true, onSelect: id => showSel(id) });
    const pts: number[][] = [];
    liveOf().forEach(f => { pts.push(apt(f.from).pos); if (!f.noDest) pts.push(apt(f.to).pos); if (f.pos) pts.push(f.pos); });
    if (!pts.length) pts.push(apt(company().hub).pos, [apt(company().hub).pos[0] + 8, apt(company().hub).pos[1] + 4]);
    _opsMap.fit(pts, 40);
    const mine = yourFlight(); if (mine) _opsMap.selected = mine.id;
    function showSel(id: string) {
      const box = $('#ops-sel', root); if (!box) return;
      const f = State.live.filter(x => x.id === id)[0];
      box.innerHTML = f && !f.you ? `<div class="sel-pop">${flightCard(f)}</div>` : '';
    }
  },
};

/** "Your aircraft" card: the aircraft you fly, and whether the sim has the same type loaded. */
function myAircraftCard(): string {
  const c = company();
  const myA = plane(State.myReg[c.id]);
  if (!myA) return '';
  const sim: any = State.simAircraft;
  const linked = Link.status === 'connected';
  const loaded = !linked || (Link.sim && Link.sim.connected && sim.title);
  const match = loaded && sim.typeId === myA.typeId;
  const t = acType(myA.typeId);
  const msg = !linked && (State as any).linkedOnce ? `Not linked to your PC right now`
    : linked && !(Link.sim && Link.sim.connected) ? `Waiting for Flight Simulator on ${esc(Link.pc.name)}`
      : !loaded ? 'No aircraft loaded in the sim yet'
        : match ? `Matches the aircraft loaded in the sim (${esc(sim.title)})`
          : `The sim has a ${esc(sim.title)} loaded. Load the ${esc(t.model)} to fly ${esc(myA.reg)}.`;
  const ok = match && (linked || !(State as any).linkedOnce);
  return `<div class="card my-ac ${ok ? 'ok' : 'warn'}">
            <div class="card-h"><b>Your aircraft</b><button class="text-btn" data-act="pick-my-ac">Change</button></div>
            <div class="my-ac-row"><span class="my-art">${aircraftArt(myA.typeId, { color: c.color, color2: c.color2, ground: false })}</span>
              <span><b>${esc(myA.reg)}</b><small>${esc(t.maker)} ${esc(t.model)}</small></span></div>
            <div class="sim-match">${icon(ok ? 'check' : 'alert')}<span>${msg}</span></div>
          </div>`;
}

ACTIONS['ov-period'] = (el, ev) => {
  ev.stopPropagation();
  _ovPeriod = el.getAttribute('data-p'); _finPeriod = _ovPeriod; Sound.tick();
  refresh();
};

ACTIONS['pick-my-ac'] = () => {
  const c = company();
  const flyingMine = yourFlight();
  const list = State.fleet.filter(a => a.companyId === c.id);
  openLayer('modal', `
    <div class="modal-head"><div><h2>Which aircraft are you flying?</h2><small>You fly one aircraft at a time. The PC bridge checks that the same type is loaded in the simulator.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body">
      ${flyingMine ? `<p class="fine-print">${icon('info')}You're flying ${esc(flyingMine.reg)} right now. You can switch once you've landed.</p>` : ''}
      <div class="pick-grid">${list.map(a => {
        const st = fleetState(a), sel = State.myReg[c.id] === a.reg;
        const can = !flyingMine && st === 'avail';
        return `<button class="pick-ac st-${st} ${sel ? 'on' : ''}" data-act="set-my-ac" data-reg="${a.reg}" ${can || sel ? '' : 'disabled'}>
          <span class="pa-art">${aircraftArt(a.typeId, { color: c.color, color2: c.color2, ground: false })}</span>
          <b>${esc(a.reg)}</b><small>${esc(acType(a.typeId).model)}</small>${statusChip(a.status)}</button>`;
      }).join('')}</div>
    </div>`, { cls: 'wide' });
};
ACTIONS['set-my-ac'] = el => {
  State.myReg[State.companyId] = el.getAttribute('data-reg');
  closeAll(); Sound.tick(); refresh(); toast(`You're now flying ${State.myReg[State.companyId]}`, 'ok');
};

ACTIONS['open-crash'] = el => crashPopup(el.getAttribute('data-id'));
ACTIONS['open-fine'] = el => finePopup(el.getAttribute('data-ref'));
ACTIONS['open-issue'] = el => mechanicPopup(el.getAttribute('data-id'));
