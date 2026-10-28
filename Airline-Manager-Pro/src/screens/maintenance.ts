// Maintenance: aircraft condition and every open damage report from the mechanic.
SCREENS.maint = {
  title: 'Maintenance', icon: 'wrench',
  render() {
    const fl = fleetOf();
    const regs = fl.map(a => a.reg);
    const issues = State.issues.filter(i => regs.indexOf(i.reg) >= 0);
    const open = issues.filter(i => i.status === 'open'), sched = issues.filter(i => i.status === 'scheduled');
    const sorted = fl.slice().sort((a, b) => a.condition - b.condition);
    return `
    <div class="screen-head">
      <div><h1>Maintenance</h1><p class="sub">${open.length} open report${open.length === 1 ? '' : 's'}, ${fl.filter(a => a.status === 'grounded').length} grounded</p></div>
    </div>
    <div class="maint">
      <div class="maint-issues">
        ${open.length ? `<h3>Open reports</h3>` : ''}
        ${open.map((i, k) => {
          const a = plane(i.reg), t = acType(a.typeId);
          return `<div class="issue-card sev-${i.severity}" style="--i:${k}">
            <div class="ic-top">${statusChip(i.severity)}<b>${esc(i.reg)}</b><small>${esc(t.model)}, ${esc(i.date)}</small></div>
            <h4>${esc(i.title)}</h4><p>${esc(i.detail)}</p>
            <small class="src">${icon('sliders')}${esc(i.source)}</small>
            <div class="ic-foot"><span><b>${money(i.cost)}</b><small>${i.days ? i.days + ' day' + (i.days > 1 ? 's' : '') + ' in the hangar' : 'Overnight job'}</small></span>
              <button class="btn ghost sm" data-act="open-issue" data-id="${i.id}">${icon('volume')}Mechanic</button>
              <button class="btn ghost sm" data-act="fix-later" data-id="${i.id}">Later</button>
              <button class="btn primary sm" data-act="fix-now" data-id="${i.id}">Fix now</button></div>
          </div>`;
        }).join('') || emptyState('No open reports', 'Damage the simulator detects after a flight shows up here.')}
        ${sched.length ? `<h3>In the hangar</h3>${sched.map(i => `<div class="mini-row">${statusChip('scheduled')}<b>${esc(i.reg)}</b><span>${esc(i.title)}</span><small>${i.days} d</small></div>`).join('')}` : ''}
      </div>
      <div class="maint-cond card">
        <div class="card-h"><b>Fleet condition</b></div>
        ${sorted.map(a => `<button class="cond-row" data-act="ac-detail" data-reg="${a.reg}"><b>${esc(a.reg)}</b><small>${esc(acType(a.typeId).model)}</small>${conditionBar(a.condition)}<span>${a.condition}%</span>${a.status === 'grounded' ? '<i class="gr">Grounded</i>' : ''}</button>`).join('')}
        <p class="fine-print">${icon('info')}Damage is only reported when the simulator can detect it: tail strikes, hard landings, overspeed, engine failures, overstress and severe turbulence.</p>
      </div>
    </div>`;
  },
};
