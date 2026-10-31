// Aircraft market: buy or lease one or several aircraft of any type the simulator has installed.
let _mkMaker = 'All';
let _mkMode: 'buy' | 'lease' | 'used' = 'buy';
let _mkInstalled = true;

SCREENS.market = {
  title: 'Aircraft market', icon: 'market', nav: false,
  render() {
    const c = company();
    const makers = ['All'].concat(AIRCRAFT.map(a => a.maker).filter((m, i, arr) => arr.indexOf(m) === i));
    const list = AIRCRAFT.filter(a => (_mkMaker === 'All' || a.maker === _mkMaker) && (!_mkInstalled || a.installed));
    return `
    ${subHead('fleet', _mkMode === 'lease' ? 'Lease aircraft' : _mkMode === 'used' ? 'Used aircraft' : 'Buy aircraft', _mkMode === 'lease' ? 'Pay a monthly rent instead of the full price, for 1, 3 or 6 years' : _mkMode === 'used' ? 'Second-hand aircraft for sale this week, of the types you have installed' : `${AIRCRAFT.filter(a => a.installed).length} types ${(State as any).simInstalled ? 'found in your simulator' : 'in your simulator (demo list until your PC is linked)'}, including add-ons`,
      _mkMode === 'used' ? '' : `<label class="tg-inline"><span>Only what I have installed</span>${toggle('mk-installed', _mkInstalled)}</label>`)}
    <div class="mk-mode seg">${[['buy', 'Buy new'], ['used', 'Used'], ['lease', 'Lease']].map(m => `<button class="${_mkMode === m[0] ? 'on' : ''}" data-act="mk-mode" data-m="${m[0]}">${icon(m[0] === 'buy' ? 'market' : m[0] === 'used' ? 'clock' : 'key')}${m[1]}</button>`).join('')}</div>
    ${!coopCanBuy() ? `<p class="fine-print warn">${icon('info')}In this co-op only the owner buys, sells and leases aircraft.</p>` : ''}
    ${_mkMode === 'used' ? usedMarketHtml() : `
    <div class="filter-row">${makers.map(m => `<button class="fchip ${_mkMaker === m ? 'on' : ''}" data-act="mk-maker" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>
    <div class="mk-grid">${list.map((t, i) => {
      const owned = State.fleet.filter(a => a.typeId === t.id && a.companyId === c.id).length;
      return `<div class="mk-card ${t.installed ? '' : 'not-inst'}" style="--i:${i}">
        <div class="mk-stage">${aircraftArt(t.id, { color: c.color, color2: c.color2 })}</div>
        <div class="mk-body">
          <div class="mk-name"><b>${esc(t.maker)} ${esc(t.model)}</b><span class="dev-tag ${t.devKind}">${esc(t.dev)}</span></div>
          <div class="mk-cap">${icon('pax')}<span>${esc(capacityText(t.id))}</span></div>
          ${engineOptions(t.id).length ? `<div class="mk-cap mk-eng">${icon('fuel')}<span>${engineOptions(t.id).map(e => esc(e.name)).join(' or ')}</span></div>` : ''}
          <div class="mk-specs"><span><small>Seats</small>${t.seats}</span><span><small>Range</small>${num(t.rangeNm)} nm</span><span><small>Cruise</small>${t.cruiseKt} kt</span><span><small>Per hour</small>${money(t.costPerHr)}</span></div>
          <div class="mk-foot">
            ${_mkMode === 'lease' ? `<b class="mk-price"><small>from </small>${money(leaseMonthly(t.price, 6), { compact: true })}<small> /month</small></b>` : `<b class="mk-price">${money(t.price, { compact: true })}</b>`}
            ${owned ? `<small class="owned">You have ${owned}</small>` : ''}
            ${t.installed ? (_mkMode === 'lease' ? `<button class="btn primary" data-act="lease" data-id="${t.id}">Lease</button>` : `<button class="btn primary" data-act="buy" data-id="${t.id}">Buy</button>`) : `<small class="muted">Not installed in your sim</small>`}
          </div>
        </div>
      </div>`;
    }).join('')}</div>`}`;
  },
};

ACTIONS['mk-mode'] = el => { _mkMode = el.getAttribute('data-m') as any; Sound.tick(); refresh(); };
ACTIONS['mk-maker'] = el => { _mkMaker = el.getAttribute('data-m'); Sound.tick(); refresh(); };

let _buy = { id: '', qty: 1, div: '', base: '' };

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
  const ePrice = (engineOptions(t.id).filter(e => e.id === (_buy as any).eng)[0] || { price: 1 } as any).price, unit = Math.round(t.price * ePrice), total = unit * _buy.qty;
  const regs = nextRegs(c, _buy.qty);
  const after = c.balance - total;
  return `
    <div class="modal-head"><div><h2>Buy ${esc(t.maker)} ${esc(t.model)}</h2><small>${esc(t.variant)}, ${esc(t.dev)}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body buy">
      <div class="buy-art">${aircraftArt(t.id, { color: c.color, color2: c.color2, reg: regs[0] })}</div>
      <div class="buy-form">
        <div class="field"><small>How many</small>
          <div class="stepper"><button class="icon-btn" data-act="buy-qty" data-d="-1" aria-label="One less"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14"/></svg></button><b>${_buy.qty}</b><button class="icon-btn" data-act="buy-qty" data-d="1" aria-label="One more">${icon('plus')}</button></div></div>
        ${enginePickHtml(t.id, (_buy as any).eng, 'buy-eng')}
        ${c.divisions.length ? `<div class="field"><small>Division</small><div class="seg">${c.divisions.map(d => `<button class="${_buy.div === d.id ? 'on' : ''}" data-act="buy-div" data-div="${d.id}">${esc(d.name)}</button>`).join('')}</div></div>` : ''}
        <div class="field"><small>Registration${_buy.qty > 1 ? 's' : ''}</small><div class="regs">${regs.map(r => `<span>${esc(r)}</span>`).join('')}</div></div>
        ${baseFieldHtml(_buy.base || c.hub, _buy.qty, 'buy')}
        <div class="buy-sum">
          <div><small>Total</small><b>${money(total)}</b></div>
          <div><small>Balance after</small><b class="${after < 0 ? 'red' : ''}">${money(after)}</b></div>
        </div>
        ${(() => { const nb = noStandsFor(_buy.base || c.hub, _buy.qty); return `<button class="btn primary big" data-act="buy-confirm" ${after < 0 || nb ? 'disabled' : ''}>${nb ? `Not enough stands at ${esc(_buy.base || c.hub)}` : after < 0 ? 'Not enough money' : `Buy for ${money(total, { compact: true })}`}</button>`; })()}
      </div>
    </div>`;
}

ACTIONS.buy = el => {
  if (!canTrade()) return;
  Sound.tick();
  const c = company();
  _buy = { id: el.getAttribute('data-id'), qty: 1, base: company().hub, div: c.divisions.length ? (State.divisionId !== 'all' ? State.divisionId : c.divisions[0].id) : '' };
  openLayer('modal', buySheetHtml(), { cls: 'wide buy-pop' });
};
/** The base for new aircraft, with its free stands; a full base is pointed out with a way to choose another. */
function baseFieldHtml(base: string, qty: number, kind: string): string {
  const f = Bases.free(base), short = f != null && f < qty;
  return `<div class="field"><small>Delivered to and based at</small><div class="base-pick-row"><b>${esc(apt(base) ? apt(base).name : base)} (${esc(base)})</b><button class="text-btn" data-act="new-base" data-k="${kind}">Change</button></div>
    <small class="${short ? 'red' : 'muted'}">${short ? `${f <= 0 ? 'No free stands' : 'Only ' + f + ' free stand' + (f === 1 ? '' : 's')} at ${esc(base)}. Choose another base${f > 0 ? ' or fewer aircraft' : ''}.` : esc(Bases.standLabel(base))}</small></div>`;
}
ACTIONS['new-base'] = el => {
  const k = el.getAttribute('data-k');
  openBasePicker('Base for the new aircraft', 'Where it is delivered and parked', icao => { if (k === 'lease') { _lease.base = icao; rerenderLease(); } else if (k === 'used') { _used.base = icao; rerenderUsed(); } else { _buy.base = icao; rerenderBuy(); } });
};
function rerenderBuy() { const p = $('.buy-pop .panel'); if (p) patchHtml(p, buySheetHtml()); }
ACTIONS['buy-qty'] = el => { _buy.qty = clamp(_buy.qty + parseInt(el.getAttribute('data-d'), 10), 1, 12); Sound.tick(); rerenderBuy(); };
ACTIONS['buy-eng'] = el => { (_buy as any).eng = el.getAttribute('data-e'); Sound.tick(); rerenderBuy(); };
ACTIONS['buy-div'] = el => { _buy.div = el.getAttribute('data-div'); Sound.tick(); rerenderBuy(); };

ACTIONS['buy-confirm'] = () => {
  if (!canTrade()) return;
  if (noStandsFor(_buy.base || company().hub, _buy.qty)) { toast('Not enough free stands there: choose another base', 'warn'); return; }
  const t = acType(_buy.id), c = company();
  try { coopAfterBuy(`${_buy.qty}× ${t.maker} ${t.model}`, Math.round(t.price * ((engineOptions(t.id).filter(e => e.id === (_buy as any).eng)[0] || { price: 1 } as any).price)) * _buy.qty); } catch (e) { /* ignore */ }
  const regs = nextRegs(c, _buy.qty);
  const from = c.balance, eng = (engineOptions(t.id).filter(e => e.id === (_buy as any).eng)[0] || engineOptions(t.id)[0]);
  const unit = Math.round(t.price * (eng ? eng.price : 1));
  c.balance -= unit * _buy.qty;
  regs.forEach(r => State.fleet.push({ engine: eng ? eng.id : undefined, reg: r, typeId: t.id, companyId: c.id, divisionId: _buy.div || undefined, base: _buy.base || c.hub, location: _buy.base || c.hub, hoursMin: 0, cycles: 0, condition: 100, status: 'parked', delivered: dateStr(new Date()).slice(0, 10) }));
  State.txns.unshift({ id: uid(), companyId: c.id, date: dateStr(new Date()).slice(0, 10), time: new Date().toTimeString().slice(0, 5), label: `Purchase: ${_buy.qty}× ${t.maker} ${t.model}`, amount: -unit * _buy.qty, kind: 'purchase',
    reg: regs.join(', '), lines: regs.map(r => [`${t.maker} ${t.model} ${r}, ${t.dev}`, -t.price] as [string, number]), link: { kind: 'aircraft', id: regs[0] } });
  closeAll();
  Bases.ensure();
  try { Online.discord('fleet', `New aircraft: ${regs.join(', ')}`, `${c.name} bought ${_buy.qty > 1 ? _buy.qty + ' new ' + t.maker + ' ' + t.model + 's' : 'a new ' + t.maker + ' ' + t.model}, based at ${_buy.base || c.hub}.`); } catch (e) { /* ignore */ }
  Sound.purchase(); Haptics.success();
  animateBalance(from, c.balance);
  // delivery celebration
  openLayer('modal', `
    <div class="delivered">
      <div class="dl-stage"><div class="dl-plane">${aircraftArt(t.id, { color: c.color, color2: c.color2, reg: regs[0] })}</div><div class="dl-runway"></div></div>
      <div class="dl-stamp"><small>Delivered</small><b>${regs.map(esc).join(', ')}</b></div>
      <h2>${_buy.qty > 1 ? `${_buy.qty} new ${esc(t.model)}s` : `Your new ${esc(t.model)}`} ${_buy.qty > 1 ? 'are' : 'is'} at ${esc(c.hub)}</h2>
      <p class="muted">${money(Math.round(t.price * ((engineOptions(t.id).filter(e => e.id === (_buy as any).eng)[0] || { price: 1 } as any).price)) * _buy.qty)} paid. ${_buy.qty > 1 ? 'They are' : 'It is'} ready to assign to routes.</p>
      <div class="modal-actions center">
        <button class="btn ghost" data-act="close-layer">Keep shopping</button>
        <button class="btn primary" data-act="see-fleet">See it in the fleet</button>
      </div>
    </div>`, { cls: 'narrow celebrate' });
};
ACTIONS['see-fleet'] = () => { closeAll(); go('fleet'); };
