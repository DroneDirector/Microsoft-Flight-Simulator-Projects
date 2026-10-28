// Finance: balance, profit by day, week, month and year, and every transaction.
let _finPeriod = 'day';

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
    const kinds: { [k: string]: string } = { revenue: 'Revenue', fuel: 'Fuel', crew: 'Crew', maint: 'Maintenance', fine: 'Fine', purchase: 'Aircraft', fees: 'Fees' };
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
        <div class="card-h"><b>Transactions</b></div>
        ${State.txns.map(t => `<div class="tx"><span class="tx-k k-${t.kind}">${esc(kinds[t.kind])}</span><span class="tx-l">${esc(t.label)}<small>${esc(t.date)}</small></span><b class="${t.amount >= 0 ? 'green' : ''}">${money(t.amount, { sign: true })}</b></div>`).join('')}
      </div>
    </div>`;
  },
};
ACTIONS['fin-period'] = el => { _finPeriod = el.getAttribute('data-p'); _ovPeriod = _finPeriod; Sound.tick(); refresh(); };
