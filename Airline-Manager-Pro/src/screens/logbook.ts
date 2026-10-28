// Logbook: every flight you fly, with landing rate, load and incidents.
SCREENS.logbook = {
  title: 'Flight logs', icon: 'logbook',
  render() {
    const me = myPilot();
    const rows = State.logbook.filter(l => plane(l.reg) && plane(l.reg).companyId === State.companyId);
    const counted = rows.filter(l => l.decision !== 'disregarded' && l.result !== 'crash' || l.decision === 'registered');
    const landings = counted.filter(l => l.result !== 'crash');
    const avg = landings.length ? landings.reduce((s, l) => s + Math.abs(l.landingFpm), 0) / landings.length : 0;
    const best = landings.length ? Math.min.apply(null, landings.map(l => Math.abs(l.landingFpm))) : 0;
    return `
    <div class="screen-head">
      <div><h1>Flight logs</h1><p class="sub">${esc(me.name)}</p></div>
    </div>
    <div class="log-totals">
      <div class="stat"><small>Total hours</small><b>${hours(me.hoursMin)}</b></div>
      <div class="stat"><small>Landings</small><b>${num(me.landings)}</b></div>
      <div class="stat"><small>Average landing</small><b>${Math.round(avg)}<span> fpm</span></b></div>
      <div class="stat"><small>Softest</small><b class="green">${best}<span> fpm</span></b></div>
      <div class="stat"><small>Crashes</small><b>${rows.filter(l => l.decision === 'registered').length}<span> registered</span></b></div>
    </div>
    <div class="log-table" role="table">
      <div class="lt-head" role="row"><span>Date</span><span>Route</span><span>Aircraft</span><span>Block</span><span>Landing</span><span>Load</span><span>ATC</span><span>Result</span></div>
      ${rows.map((l, i) => {
        const t = acType(plane(l.reg).typeId);
        const fpmCls = l.result === 'crash' ? 'red' : Math.abs(l.landingFpm) > 300 ? 'amber' : Math.abs(l.landingFpm) < 150 ? 'green' : '';
        return `<div class="lt-row ${l.result === 'crash' && l.decision === 'pending' ? 'pending' : ''} ${l.decision === 'disregarded' ? 'voided' : ''}" role="row" style="--i:${i}">
          <span>${esc(l.date.slice(5, 10).replace('-', '/'))}<small>${esc(l.date.slice(11))}</small></span>
          <span><b>${esc(l.from)}</b> to <b>${esc(l.to)}</b></span>
          <span>${esc(l.reg)}<small>${esc(t.model)}</small></span>
          <span>${hours(l.blockMin)}</span>
          <span class="${fpmCls}">${num(l.landingFpm)} fpm<small>${l.g.toFixed(2)} g</small></span>
          <span>${l.pax} pax</span>
          <span>${esc(l.atc)}</span>
          <span>${l.result === 'crash' && l.decision === 'pending'
            ? `<button class="btn danger sm" data-act="open-crash" data-id="${l.id}">Decide</button>`
            : l.decision === 'disregarded' ? '<span class="chip chip-dim">Disregarded</span>' : statusChip(l.result)}${l.notes ? `<small>${esc(l.notes)}</small>` : ''}</span>
        </div>`;
      }).join('')}
    </div>`;
  },
};
