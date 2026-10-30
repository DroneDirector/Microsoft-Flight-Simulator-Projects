// Engines each type is built with (docs/reference/engines.txt). Where a type is offered with more than one
// engine, you choose when you buy it new; used and leased aircraft come with the engine they have.
// The engine changes the fuel burn, the maintenance cost, how often engine problems turn up, and the price.
//   burn: fuel burn against the type's usual figure; mx: maintenance cost; rel: engine problems (above 1 = more);
//   price: list price against the type's usual price.

interface EngineOpt { id: string; name: string; maker: string; burn: number; mx: number; rel: number; price: number; note: string }
const ENGINES: { [typeId: string]: EngineOpt[] } = {
  'a320-fenix': [
    { id: 'cfm56-5b', name: 'CFM56-5B4', maker: 'CFM International', burn: 1, mx: 1, rel: 1, price: 1, note: 'The most common A320 engine: dependable, long time between shop visits.' },
    { id: 'v2527', name: 'IAE V2527-A5', maker: 'International Aero Engines', burn: 0.985, mx: 1.04, rel: 1, price: 1.005, note: 'A little less fuel on longer sectors; a little more maintenance.' }],
  'a320neo': [
    { id: 'leap-1a', name: 'CFM LEAP-1A26', maker: 'CFM International', burn: 1, mx: 1, rel: 1, price: 1, note: 'Steady in service.' },
    { id: 'pw1127g', name: 'Pratt & Whitney PW1127G-JM (GTF)', maker: 'Pratt & Whitney', burn: 0.995, mx: 1.15, rel: 1.4, price: 0.99, note: 'Geared turbofan: quiet and frugal, but known for extra engine inspections and shop visits.' }],
  'a310-ini': [
    { id: 'cf6-80c2', name: 'GE CF6-80C2A2', maker: 'General Electric', burn: 1, mx: 1, rel: 1, price: 1, note: '' },
    { id: 'pw4152', name: 'Pratt & Whitney PW4152', maker: 'Pratt & Whitney', burn: 1.01, mx: 0.97, rel: 1, price: 1, note: 'Slightly cheaper to maintain, slightly thirstier.' }],
  'a350-ini': [{ id: 'trent-xwb', name: 'Rolls-Royce Trent XWB-84', maker: 'Rolls-Royce', burn: 1, mx: 1, rel: 1, price: 1, note: 'The only engine offered on the A350.' }],
  'b738-pmdg': [{ id: 'cfm56-7b26', name: 'CFM56-7B26', maker: 'CFM International', burn: 1, mx: 1, rel: 1, price: 1, note: 'The only engine on the 737 Next Generation.' }],
  'b736-pmdg': [{ id: 'cfm56-7b22', name: 'CFM56-7B22', maker: 'CFM International', burn: 1, mx: 1, rel: 1, price: 1, note: 'The only engine on the 737 Next Generation.' }],
  'b77w-pmdg': [{ id: 'ge90-115b', name: 'GE90-115B', maker: 'General Electric', burn: 1, mx: 1, rel: 1, price: 1, note: 'The only engine on the 777-300ER.' }],
  'b78x': [
    { id: 'genx-1b', name: 'GE GEnx-1B76', maker: 'General Electric', burn: 1, mx: 1, rel: 1, price: 1, note: '' },
    { id: 'trent-1000', name: 'Rolls-Royce Trent 1000 TEN', maker: 'Rolls-Royce', burn: 1.005, mx: 1.08, rel: 1.3, price: 0.995, note: 'Earlier Trent 1000s needed many extra inspections; the TEN is better but still visits the shop more often.' }],
  'b748': [{ id: 'genx-2b', name: 'GE GEnx-2B67', maker: 'General Electric', burn: 1, mx: 1, rel: 1, price: 1, note: 'The only engine on the 747-8.' }],
  'crj9-aero': [{ id: 'cf34-8c5', name: 'GE CF34-8C5', maker: 'General Electric', burn: 1, mx: 1, rel: 1, price: 1, note: 'The CRJ900 is only built with the CF34-8C.' }],
  'crj7-aero': [{ id: 'cf34-8c5b1', name: 'GE CF34-8C5B1', maker: 'General Electric', burn: 1, mx: 1, rel: 1, price: 1, note: 'The CRJ700 is only built with the CF34-8C.' }],
  'atr72': [{ id: 'pw127m', name: 'Pratt & Whitney Canada PW127M', maker: 'Pratt & Whitney Canada', burn: 1, mx: 1, rel: 1, price: 1, note: 'The ATR 72-600 engine.' }],
  'dhc6-aero': [{ id: 'pt6a-34', name: 'Pratt & Whitney Canada PT6A-34', maker: 'Pratt & Whitney Canada', burn: 1, mx: 1, rel: 1, price: 1, note: '' }],
  'dhc2': [
    { id: 'r985', name: 'Pratt & Whitney R-985 Wasp Junior', maker: 'Pratt & Whitney', burn: 1, mx: 1, rel: 1, price: 1, note: 'The original nine-cylinder radial on avgas.' },
    { id: 'pt6-turbine', name: 'Turbine conversion, PT6A-34', maker: 'Pratt & Whitney Canada', burn: 1.12, mx: 0.8, rel: 0.7, price: 1.35, note: 'A turbine conversion: more power and far fewer engine problems, burns more (jet fuel), costs more.' }],
  'c208': [{ id: 'pt6a-114a', name: 'Pratt & Whitney Canada PT6A-114A', maker: 'Pratt & Whitney Canada', burn: 1, mx: 1, rel: 1, price: 1, note: '' }],
  'kodiak': [{ id: 'pt6a-34-k', name: 'Pratt & Whitney Canada PT6A-34', maker: 'Pratt & Whitney Canada', burn: 1, mx: 1, rel: 1, price: 1, note: '' }],
  'pc12': [{ id: 'pt6a-67p', name: 'Pratt & Whitney Canada PT6A-67P', maker: 'Pratt & Whitney Canada', burn: 1, mx: 1, rel: 1, price: 1, note: '' }],
  'c172': [{ id: 'io360', name: 'Lycoming IO-360-L2A', maker: 'Lycoming', burn: 1, mx: 1, rel: 1, price: 1, note: '' }],
};
function engineOptions(typeId: string): EngineOpt[] { return ENGINES[typeId] || []; }
/** The engine an aircraft has (the type's first option when not set). */
function engineOf(a: any): EngineOpt {
  const l = engineOptions(a ? a.typeId : ''); if (!l.length) return null;
  return l.filter(e => e.id === a.engine)[0] || l[0];
}
/** Engine for a used or leased aircraft: the same choice every time for that offer (about half of each where there are two). */
function engineFor(typeId: string, seed: string): string {
  const l = engineOptions(typeId); if (!l.length) return '';
  return l[_hashStr(seed + 'eng') % l.length].id;
}
function engineBurn(reg?: string): number { const a = reg ? plane(reg) : null, e = a ? engineOf(a) : null; return e ? e.burn : 1; }
function engineMx(reg?: string): number { const a = reg ? plane(reg) : null, e = a ? engineOf(a) : null; return e ? e.mx : 1; }
/** The engine picker for buying new (only where there is a choice), or the engine line. */
function enginePickHtml(typeId: string, cur: string, act: string): string {
  const l = engineOptions(typeId); if (!l.length) return '';
  if (l.length === 1) return `<div class="field"><small>Engines</small><b>${esc(l[0].name)}</b><small class="muted">${esc(l[0].note)}</small></div>`;
  const sel = l.filter(e => e.id === cur)[0] || l[0];
  const d = (v: number, lo: string, hi: string) => v === 1 ? '' : `${v < 1 ? lo : hi} ${Math.abs(Math.round((v - 1) * 1000) / 10)}%`;
  return `<div class="field"><small>Engines</small><div class="seg eng-seg">${l.map(e => `<button class="${e.id === sel.id ? 'on' : ''}" data-act="${act}" data-e="${e.id}">${esc(e.name.replace(/^(GE|CFM|IAE|Rolls-Royce|Pratt & Whitney( Canada)?)\s/, ''))}</button>`).join('')}</div>
    <small class="muted">${esc(sel.maker)}. ${esc(sel.note)} ${[d(sel.burn, 'Fuel', 'Fuel +'), d(sel.mx, 'Maintenance', 'Maintenance +'), sel.rel > 1 ? 'more engine inspections' : sel.rel < 1 ? 'fewer engine problems' : ''].filter(Boolean).join(' · ').replace(/Fuel (\d)/, 'Fuel −$1').replace(/Maintenance (\d)/, 'Maintenance −$1')}</small></div>`;
}
