// Aircraft market: buy one or several aircraft of any type the simulator has installed.
let _mkMaker = 'All';
let _mkInstalled = true;

SCREENS.market = {
  title: 'Buy aircraft', icon: 'market', nav: false,
  render() {
    const c = company();
    const makers = ['All'].concat(AIRCRAFT.map(a => a.maker).filter((m, i, arr) => arr.indexOf(m) === i));
    const list = AIRCRAFT.filter(a => (_mkMaker === 'All' || a.maker === _mkMaker) && (!_mkInstalled || a.installed));
    return `
    ${subHead('fleet', 'Buy aircraft', `${AIRCRAFT.filter(a => a.installed).length} types found in your simulator, including add-ons`,
      `<label class="tg-inline"><span>Only what I have installed</span>${toggle('mk-installed', _mkInstalled)}</label>`)}
    <div class="filter-row">${makers.map(m => `<button class="fchip ${_mkMaker === m ? 'on' : ''}" data-act="mk-maker" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>
    <div class="mk-grid">${list.map((t, i) => {
      const owned = State.fleet.filter(a => a.typeId === t.id && a.companyId === c.id).length;
      return `<div class="mk-card ${t.installed ? '' : 'not-inst'}" style="--i:${i}">
        <div class="mk-stage">${aircraftArt(t.id, { color: c.color, color2: c.color2 })}</div>
        <div class="mk-body">
          <div class="mk-name"><b>${esc(t.maker)} ${esc(t.model)}</b><span class="dev-tag ${t.devKind}">${esc(t.dev)}</span></div>
          <div class="mk-specs"><span><small>Seats</small>${t.seats}</span><span><small>Range</small>${num(t.rangeNm)} nm</span><span><small>Cruise</small>${t.cruiseKt} kt</span><span><small>Per hour</small>${money(t.costPerHr)}</span></div>
          <div class="mk-foot">
            <b class="mk-price">${money(t.price, { compact: true })}</b>
            ${owned ? `<small class="owned">You own ${owned}</small>` : ''}
            ${t.installed ? `<button class="btn primary" data-act="buy" data-id="${t.id}">Buy</button>` : `<small class="muted">Not installed in your sim</small>`}
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  },
};

ACTIONS['mk-maker'] = el => { _mkMaker = el.getAttribute('data-m'); Sound.tick(); refresh(); };

let _buy = { id: '', qty: 1, div: '' };

function nextRegs(c: Company, n: number): string[] {
  const used: { [k: string]: boolean } = {};
  State.fleet.forEach(a => used[a.reg] = true);
  const out: string[] = [];
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const cands: string[] = [];
  if (c.kind === 'bush') for (let i = 0; i < 600; i++) cands.push(`N${400 + i}RB`);
  else {
    const two = c.icao[0] + c.icao[2];
    for (const x of L) cands.push(`OY-${two}${x}`);
    for (const x of L) for (const y of L) cands.push(`OY-${c.icao[0]}${x}${y}`);
  }
  for (const r of cands) { if (out.length >= n) break; if (!used[r]) out.push(r); }
  return out;
}

function buySheetHtml(): string {
  const t = acType(_buy.id), c = company();
  const total = t.price * _buy.qty;
  const regs = nextRegs(c, _buy.qty);
  const after = c.balance - total;
  return `
    <div class="modal-head"><div><h2>Buy ${esc(t.maker)} ${esc(t.model)}</h2><small>${esc(t.variant)}, ${esc(t.dev)}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body buy">
      <div class="buy-art">${aircraftArt(t.id, { color: c.color, color2: c.color2, reg: regs[0] })}</div>
      <div class="buy-form">
        <div class="field"><small>How many</small>
          <div class="stepper"><button class="icon-btn" data-act="buy-qty" data-d="-1" aria-label="One less"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14"/></svg></button><b>${_buy.qty}</b><button class="icon-btn" data-act="buy-qty" data-d="1" aria-label="One more">${icon('plus')}</button></div></div>
        ${c.divisions.length ? `<div class="field"><small>Division</small><div class="seg">${c.divisions.map(d => `<button class="${_buy.div === d.id ? 'on' : ''}" data-act="buy-div" data-div="${d.id}">${esc(d.name)}</button>`).join('')}</div></div>` : ''}
        <div class="field"><small>Registration${_buy.qty > 1 ? 's' : ''}</small><div class="regs">${regs.map(r => `<span>${esc(r)}</span>`).join('')}</div></div>
        <div class="field"><small>Delivered to</small><b>${esc(apt(c.hub).name)} (${esc(c.hub)})</b></div>
        <div class="buy-sum">
          <div><small>Total</small><b>${money(total)}</b></div>
          <div><small>Balance after</small><b class="${after < 0 ? 'red' : ''}">${money(after)}</b></div>
        </div>
        <button class="btn primary big" data-act="buy-confirm" ${after < 0 ? 'disabled' : ''}>${after < 0 ? 'Not enough money' : `Buy for ${money(total, { compact: true })}`}</button>
      </div>
    </div>`;
}

ACTIONS.buy = el => {
  Sound.tick();
  const c = company();
  _buy = { id: el.getAttribute('data-id'), qty: 1, div: c.divisions.length ? (State.divisionId !== 'all' ? State.divisionId : c.divisions[0].id) : '' };
  openLayer('modal', buySheetHtml(), { cls: 'wide buy-pop' });
};
function rerenderBuy() { const p = $('.buy-pop .panel'); if (p) p.innerHTML = buySheetHtml(); }
ACTIONS['buy-qty'] = el => { _buy.qty = clamp(_buy.qty + parseInt(el.getAttribute('data-d'), 10), 1, 12); Sound.tick(); rerenderBuy(); };
ACTIONS['buy-div'] = el => { _buy.div = el.getAttribute('data-div'); Sound.tick(); rerenderBuy(); };

ACTIONS['buy-confirm'] = () => {
  const t = acType(_buy.id), c = company();
  const regs = nextRegs(c, _buy.qty);
  const from = c.balance;
  c.balance -= t.price * _buy.qty;
  regs.forEach(r => State.fleet.push({ reg: r, typeId: t.id, companyId: c.id, divisionId: _buy.div || undefined, base: c.hub, location: c.hub, hoursMin: 0, cycles: 0, condition: 100, status: 'parked', delivered: '2026-10-28' }));
  State.txns.unshift({ id: uid(), companyId: c.id, date: '2026-10-28', time: new Date().toTimeString().slice(0, 5), label: `Purchase: ${_buy.qty}× ${t.maker} ${t.model}`, amount: -t.price * _buy.qty, kind: 'purchase',
    reg: regs.join(', '), lines: regs.map(r => [`${t.maker} ${t.model} ${r}, ${t.dev}`, -t.price] as [string, number]), link: { kind: 'aircraft', id: regs[0] } });
  closeAll();
  Sound.purchase(); Haptics.success();
  animateBalance(from, c.balance);
  // delivery celebration
  openLayer('modal', `
    <div class="delivered">
      <div class="dl-stage"><div class="dl-plane">${aircraftArt(t.id, { color: c.color, color2: c.color2, reg: regs[0] })}</div><div class="dl-runway"></div></div>
      <div class="dl-stamp"><small>Delivered</small><b>${regs.map(esc).join(', ')}</b></div>
      <h2>${_buy.qty > 1 ? `${_buy.qty} new ${esc(t.model)}s` : `Your new ${esc(t.model)}`} ${_buy.qty > 1 ? 'are' : 'is'} at ${esc(c.hub)}</h2>
      <p class="muted">${money(t.price * _buy.qty)} paid. ${_buy.qty > 1 ? 'They are' : 'It is'} ready to assign to routes.</p>
      <div class="modal-actions center">
        <button class="btn ghost" data-act="close-layer">Keep shopping</button>
        <button class="btn primary" data-act="see-fleet">See it in the fleet</button>
      </div>
    </div>`, { cls: 'narrow celebrate' });
};
ACTIONS['see-fleet'] = () => { closeAll(); go('fleet'); };
