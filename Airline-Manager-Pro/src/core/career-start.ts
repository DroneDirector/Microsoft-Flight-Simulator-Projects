// A new career starts with its money on hold: after you create your pilot (and your family and pet) and found your
// airline, nothing is booked until you press "Finances are on hold" at the top. Then the books open: the company is
// registered (its first cost, once a year from then on), and every purchase, salary and fee counts from that moment.
// Until then buying, leasing and hiring wait for it.

function finOnHold(): boolean { return !!(State as any).finHold; }
const FIN_REG_FEE = 2500, FIN_YEAR = 365 * 864e5;

/** The button at the top while the money is on hold. */
function finHoldHtml(): string {
  if (!finOnHold()) return '';
  return `<button class="fin-hold" data-act="fin-start" aria-label="Finances are on hold. Click to start your career"><span class="fh-ic">${icon('play')}</span><span class="fh-t"><b>Finances are on hold</b><small>Click to start your career</small></span></button>`;
}
ACTIONS['fin-start'] = el => {
  if (!finOnHold()) return;
  const b = (el && el.closest('.fin-hold')) as HTMLElement || $('.fin-hold');
  Haptics.success(); try { Sound.chime(); } catch (e) { /* no sound */ }
  if (b) b.classList.add('go');
  setTimeout(() => {
    const S: any = State; S.finHold = false;
    // the books open: the company's registration is the first cost, and comes round once a year
    const c: any = company(), now = Date.now();
    if (c) { const before = c.balance; c.balance -= FIN_REG_FEE; State.txns.unshift({ id: uid(), companyId: c.id, date: dateStr(new Date()).slice(0, 10), time: dateStr(new Date()).slice(11), kind: 'fees', label: 'Company registration (yearly)', amount: -FIN_REG_FEE, lines: [['Registration of ' + c.name, -FIN_REG_FEE]] } as any); try { animateBalance(before, c.balance); } catch (e) { /* ui */ } }
    S.regNext = now + FIN_YEAR; S.payNext = now + 7 * 864e5;
    try { if (S.bank) S.bank.rentNext = {}; } catch (e) { /* none */ }
    Store.save(); renderTopbar(); refresh();
    toast('Your career has started. Every purchase is in the books from now on.', 'ok');
  }, 750);
};
/** While on hold: buying, leasing and hiring wait until you start your career. */
function finHoldBlocked(): boolean {
  if (!finOnHold()) return false;
  toast('Start your career first: tap "Finances are on hold" at the top', 'warn');
  const b = $('.fin-hold') as HTMLElement; if (b) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); }
  return true;
}
(function finHoldGate() {
  for (const k of ['buy-confirm', 'buy-used-go', 'lease-confirm', 'hire', 'hire-do', 'cab-save', 'buyback', 'lease-buyout', 'fix-now']) {
    const f = ACTIONS[k]; if (typeof f !== 'function') continue;
    ACTIONS[k] = function (this: any, el: HTMLElement, ev: Event) { if (finHoldBlocked()) return; return f.call(this, el, ev); };
  }
  // the yearly registration of the company
  setInterval(() => {
    const S: any = State; if (finOnHold() || !S.regNext || Date.now() < S.regNext) return;
    const c: any = company(); if (!c) return;
    c.balance -= FIN_REG_FEE; State.txns.unshift({ id: uid(), companyId: c.id, date: dateStr(new Date()).slice(0, 10), time: dateStr(new Date()).slice(11), kind: 'fees', label: 'Company registration (yearly)', amount: -FIN_REG_FEE, lines: [['Registration of ' + c.name, -FIN_REG_FEE]] } as any);
    S.regNext += FIN_YEAR; Store.soon();
  }, 60000);
})();
