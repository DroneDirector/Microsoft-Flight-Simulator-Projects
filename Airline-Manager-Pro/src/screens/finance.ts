// Finance: balance, profit by day, week, month and year, and every transaction.
let _finPeriod = 'day';
let _txFilter = 'all';
const TX_KINDS: { [k: string]: string } = { revenue: 'Revenue', fuel: 'Fuel', crew: 'Crew', maint: 'Maintenance', fine: 'Fine', purchase: 'Aircraft', fees: 'Fees', salary: 'Salary', payroll: 'Salaries' };
const TX_FILTERS = [['all', 'All'], ['revenue', 'Revenue'], ['salary', 'Salaries'], ['maint', 'Maintenance'], ['fuel', 'Fuel'], ['fees', 'Fees'], ['fine', 'Fines'], ['purchase', 'Aircraft']];

function staffCountFor(cid: string): number { return State.pilots.filter((p: any) => !p.you && pilotCompany(p) === cid).length + staffOf(cid).length; }

function txRows(cid: string): string {
  const all = State.txns.filter(t => (t.companyId || 'atn') === cid);
  let rows: any[];
  if (_txFilter === 'all') {
    const sal = all.filter(t => t.kind === 'salary');
    rows = all.filter(t => t.kind !== 'salary');
    if (sal.length) rows.push({ id: 'payroll', kind: 'payroll', date: sal[0].date, label: `Weekly payroll, ${sal.length} people`, amount: sal.reduce((s, t) => s + t.amount, 0) });
    rows.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  } else rows = all.filter(t => t.kind === _txFilter);
  if (!rows.length) return `<p class="muted pad">No ${_txFilter === 'all' ? '' : TX_FILTERS.filter(x => x[0] === _txFilter)[0][1].toLowerCase() + ' '}transactions yet.</p>`;
  return rows.map(t => {
    const who = t.personId ? staffById(t.personId) : null;
    return `<button class="tx" data-act="tx-detail" data-id="${t.id}">
      ${who ? `<span class="tx-av">${avatarSvg(who.look, personRole(who), { view: 'bust', still: true })}</span>` : `<span class="tx-k k-${t.kind}">${esc(TX_KINDS[t.kind])}</span>`}
      <span class="tx-l">${esc(t.label)}<small>${esc(t.date)}${who ? ', ' + ROLE_NAMES[personRole(who)] : ''}</small></span><b class="${t.amount >= 0 ? 'green' : ''}">${money(t.amount, { sign: true })}</b></button>`;
  }).join('');
}

SCREENS.finance = {
  title: 'Finance', icon: 'finance',
  render() {
    const c = company();
    const series = profitSeries(_finPeriod);
    const sim = State.settings.timeMode === 'sim';
    const max = Math.max.apply(null, series.map(p => Math.max(p.rev, p.cost))) * 1.12;
    const W = 560, H = 170, n = series.length, gap = W / n, bw = Math.min(22, gap * 0.32);
    const bars = series.map((p, i) => {
      const x = i * gap + gap / 2, hr = p.rev / max * H, hc = p.cost / max * H;
      return `<g class="bar-g" style="--i:${i}">
        <rect class="bar rev" x="${(x - bw - 1).toFixed(1)}" y="${(H - hr).toFixed(1)}" width="${bw.toFixed(1)}" height="${hr.toFixed(1)}" rx="3"><title>${p.label}: revenue ${money(p.rev)}</title></rect>
        <rect class="bar cost" x="${(x + 1).toFixed(1)}" y="${(H - hc).toFixed(1)}" width="${bw.toFixed(1)}" height="${hc.toFixed(1)}" rx="3"><title>${p.label}: costs ${money(p.cost)}</title></rect>
        <text x="${x.toFixed(1)}" y="${H + 16}" text-anchor="middle">${esc(p.label)}</text></g>`;
    }).join('');
    const profits = series.map(p => p.rev - p.cost);
    const pmax = Math.max.apply(null, profits.map(Math.abs)) || 1;
    const line = profits.map((v, i) => (i ? 'L' : 'M') + (i * gap + gap / 2).toFixed(1) + ',' + (H * 0.5 - v / pmax * H * 0.42).toFixed(1)).join(' ');
    const last = series[n - 1], lastP = last.rev - last.cost;
    const tot = series.reduce((s, p) => s + p.rev - p.cost, 0);
    
    const unit: { [k: string]: string } = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };
    return `
    <div class="screen-head"><div><h1>Finance</h1><p class="sub">${esc(c.name)}, ${sim ? 'simulated years' : 'real-world calendar'}</p></div>
      <div class="seg">${['day', 'week', 'month', 'year'].map(k => `<button class="${_finPeriod === k ? 'on' : ''}" data-act="fin-period" data-p="${k}">${unit[k]}</button>`).join('')}</div></div>
    <div class="fin">
      <div class="card fin-chart">
        <div class="fin-top">
          <div><small>Balance</small><b class="fin-bal">${money(c.balance)}</b></div>
          <div><small>${_finPeriod === 'year' ? (sim ? 'Sim year ' : 'Year ') + esc(last.label) : PERIOD_NAMES[_finPeriod]}</small><b class="${lastP >= 0 ? 'green' : 'red'}">${money(lastP, { sign: true, compact: true })}</b></div>
          <div><small>Revenue</small><b>${money(last.rev, { compact: true })}</b></div>
          <div><small>All ${n} ${_finPeriod}s shown</small><b class="${tot >= 0 ? 'green' : 'red'}">${money(tot, { sign: true, compact: true })}</b></div>
        </div>
        <svg class="chart" viewBox="0 -6 ${W} ${H + 26}" preserveAspectRatio="none" role="img" aria-label="${unit[_finPeriod]} revenue, costs and profit">
          ${[0.25, 0.5, 0.75].map(k => `<line x1="0" x2="${W}" y1="${H * k}" y2="${H * k}" class="gl"/>`).join('')}
          ${bars}
          <path d="${line}" class="pline"/>
        </svg>
        <div class="legend"><span><i class="rev"></i>Revenue</span><span><i class="cost"></i>Costs</span><span><i class="pl"></i>Profit</span>
          ${_finPeriod === 'year' ? `<button class="text-btn" data-act="settings" data-section="time">${sim ? 'Using simulated years' : 'Using real-world years'}, change</button>` : ''}</div>
        ${_finPeriod === 'year' ? `<div class="years">${series.slice().reverse().map(p => `<div class="yr"><b>${sim ? 'Sim ' : ''}${esc(p.label)}</b><span>${money(p.rev, { compact: true })} revenue</span><span>${money(p.cost, { compact: true })} costs</span><em class="${p.rev - p.cost >= 0 ? 'green' : 'red'}">${money(p.rev - p.cost, { sign: true, compact: true })}</em></div>`).join('')}</div>` : ''}
      </div>
      <div class="card fin-tx">
        <div class="card-h"><b>Transactions</b><small>Tap one for details</small></div>
        <div class="tx-filter">${TX_FILTERS.map(fl => `<button class="fchip ${_txFilter === fl[0] ? 'on' : ''}" data-act="tx-filter" data-f="${fl[0]}">${fl[1]}</button>`).join('')}</div>
        ${_txFilter === 'salary' || _txFilter === 'all' ? `<div class="payroll"><span>${icon('pilots')}<b>Next payroll in 6 days</b><small>${staffCountFor(c.id)} people, paid every week</small></span><b class="red">${money(-weeklyPayroll(c.id))}</b></div>` : ''}
        ${txRows(c.id)}
      </div>
    </div>`;
  },
};
ACTIONS['tx-filter'] = el => { _txFilter = el.getAttribute('data-f'); Sound.tick(); refresh(); };
ACTIONS['tx-detail'] = el => {
  const id = el.getAttribute('data-id');
  Sound.tick();
  if (id === 'payroll') { _txFilter = 'salary'; refresh(); return; }
  const t = State.txns.filter(x => x.id === id)[0]; if (!t) return;
  const who: any = t.personId ? staffById(t.personId) : null;
  const c = company(t.companyId || 'atn');
  const linkBtn = t.link ? (t.link.kind === 'log' ? `<button class="btn ghost" data-act="tx-open-log">${icon('logbook')}Open flight log</button>`
    : t.link.kind === 'aircraft' && plane(t.link.id) ? `<button class="btn ghost" data-act="ac-detail" data-reg="${t.link.id}">${icon('fleet')}Open ${esc(t.link.id)}</button>`
      : t.link.kind === 'staff' && who ? `<button class="btn ghost" data-act="staff-detail" data-id="${who.id}">${icon('user')}Open ${esc(who.name.split(' ')[0])}'s profile</button>` : '') : '';
  openLayer('modal', `
    <div class="modal-head"><span class="tx-k big k-${t.kind}">${esc(TX_KINDS[t.kind])}</span><div><h2>${esc(t.label)}</h2><small>${esc(t.date)}${t.time ? ' at ' + esc(t.time) : ''}, ${esc(c.name)}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body txd">
      ${who ? `<div class="txd-who"><span class="tx-av lg">${avatarSvg(who.look, personRole(who), { view: 'bust', accent: c.color })}</span><span><b>${esc(who.name)}</b><small>${ROLE_NAMES[personRole(who)]}, ${natLabel(who.nat)}, base ${esc(who.base)}</small></span></div>` : ''}
      <div class="kv-row">
        ${t.reg ? `<div><small>Aircraft</small><b>${esc(t.reg)}</b></div>` : ''}
        ${t.flight ? `<div><small>Flight</small><b>${esc(t.flight)}</b></div>` : ''}
        ${t.route ? `<div><small>Route</small><b>${esc(t.route)}</b></div>` : ''}
        <div><small>Category</small><b>${esc(TX_KINDS[t.kind])}</b></div>
      </div>
      ${t.lines && t.lines.length ? `<div class="txd-lines">${t.lines.map(l => `<div><span>${esc(l[0])}</span><b class="${l[1] >= 0 ? 'green' : ''}">${money(l[1], { sign: true })}</b></div>`).join('')}</div>` : ''}
      <div class="txd-total"><span>Total</span><b class="${t.amount >= 0 ? 'green' : 'red'}">${money(t.amount, { sign: true })}</b></div>
      <div class="modal-actions">${linkBtn}<button class="btn primary" data-act="close-layer">Done</button></div>
    </div>`, { cls: 'narrow' });
};
ACTIONS['tx-open-log'] = () => { closeAll(); go('logbook'); };
ACTIONS['fin-period'] = el => { _finPeriod = el.getAttribute('data-p'); _ovPeriod = _finPeriod; Sound.tick(); refresh(); };
