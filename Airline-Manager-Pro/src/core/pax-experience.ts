// What passengers live through on a hired pilot's flight, and what they think of it afterwards.
//  - Pets: dogs and cats travel with their owners when your pet policy allows it (Settings → Passenger
//    services): small ones in the cabin under the seat in front, bigger ones in the heated hold where the
//    aircraft has one. The captain decides per flight: no pets in the hold when it is very hot or very cold
//    at the destination (the animal waits on the ground). Owners love flying with their pet beside them.
//  - Reviews: every passenger gives the flight 1 to 5 stars from what really happened: the landing, the
//    delay, the service and crew, turbulence and holding (some hate it, most don't care, a few love it),
//    their pet, a celebrity on board, a diversion.
//  - Medical emergencies: rarely, a passenger needs a doctor in flight. The crew divert to the nearest
//    suitable airport, the passenger is taken to hospital, and the flight carries on to where it was going.

interface PaxPet { kind: 'dog' | 'cat'; name: string; where: 'cabin' | 'hold'; left?: string; color: string }
const PET_NAMES = ['Bella', 'Max', 'Luna', 'Charlie', 'Milo', 'Daisy', 'Oscar', 'Molly', 'Simba', 'Rocky', 'Nala', 'Teddy', 'Loki', 'Coco', 'Felix', 'Rosie', 'Bamse', 'Kisa', 'Fía', 'Tóki'];
const PET_COLORS = ['#3A2A1E', '#8B5A2B', '#D9B98A', '#F2EEE6', '#6E6E6E', '#C27A3A', '#1E1E1E'];

/** A passenger's pet, if they bring one and your policy allows it (about one passenger in 300). */
function paxPet(key: string, f: LiveFlight): PaxPet {
  const pol = servicesOf((plane(f.reg) || {} as any).companyId || State.companyId).pets;
  if (pol === 'no') return null;
  const r = seeded(key + 'pet'); if (r() >= 1 / 300) return null;
  const t = acType(flightTypeId(f)), small = !t || t.cls === 'ga' || t.cls === 'bush';
  const kind: 'dog' | 'cat' = r() < 0.62 ? 'dog' : 'cat';
  const big = kind === 'dog' && r() < 0.45;
  if (big && (pol !== 'hold' || small)) return null;      // too big for the cabin, and no hold for pets
  const pet: PaxPet = { kind, name: PET_NAMES[Math.floor(r() * PET_NAMES.length)], where: big ? 'hold' : 'cabin', color: PET_COLORS[Math.floor(r() * PET_COLORS.length)] };
  // the captain's call: the hold is no place for an animal on a very hot or very cold day at the destination
  if (pet.where === 'hold') {
    try { const m: any = typeof LiveWx !== 'undefined' ? LiveWx.get(f.to) : null; if (m && (m.temp > 29 || m.temp < -15)) pet.left = `${m.temp > 29 ? 'Too hot' : 'Too cold'} at ${f.to} (${Math.round(m.temp)} °C) for the hold: the captain said no, and ${pet.name} flies another day`; } catch (e) { /* no weather */ }
  }
  return pet;
}
/** A small drawn dog or cat. */
function petSvg(p: PaxPet): string {
  const c = p.color, d = c === '#F2EEE6' || c === '#D9B98A' ? '#3A2A1E' : '#F2EEE6';
  return p.kind === 'cat'
    ? `<svg viewBox="0 0 32 32" class="pet-svg"><path d="M8 26c0-7 3-12 8-12s8 5 8 12z" fill="${c}"/><circle cx="16" cy="12" r="7" fill="${c}"/><path d="M10 9l1-7 5 5zM22 9l-1-7-5 5z" fill="${c}"/><circle cx="13.5" cy="12" r="1.2" fill="${d}"/><circle cx="18.5" cy="12" r="1.2" fill="${d}"/><path d="M15 15h2l-1 1z" fill="${d}"/><path d="M24 24c4 0 5-4 3-6" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`
    : `<svg viewBox="0 0 32 32" class="pet-svg"><path d="M8 27c0-7 3-11 8-11s8 4 8 11z" fill="${c}"/><ellipse cx="16" cy="12" rx="7" ry="7.5" fill="${c}"/><ellipse cx="8.5" cy="12" rx="2.6" ry="5" fill="${c}" opacity=".8"/><ellipse cx="23.5" cy="12" rx="2.6" ry="5" fill="${c}" opacity=".8"/><ellipse cx="16" cy="16" rx="3.6" ry="2.6" fill="${d}" opacity=".35"/><circle cx="13.3" cy="11" r="1.2" fill="${d}"/><circle cx="18.7" cy="11" r="1.2" fill="${d}"/><ellipse cx="16" cy="14.6" rx="1.5" ry="1.1" fill="${d}"/></svg>`;
}

/** Pets on board: a note now and then (always when one had to stay behind). */
function petsOnBoard(f: LiveFlight) {
  const F: any = f; if (F.petNoted) return; F.petNoted = true;
  const pets = manifestOf(f).filter(p => p.pet);
  if (!pets.length) return;
  const left = pets.filter(p => p.pet.left)[0];
  if (!left && seeded(f.id + 'petnote')() > 0.3) return;
  const p = left || pets[0], pt = p.pet;
  const where = pt.where === 'cabin' ? `in the cabin with ${p.name.split(' ')[0]}, seat ${p.seat}` : `in the heated hold`;
  State.notices.unshift({ id: uid(), kind: 'pilot', title: left ? `${pt.name} the ${pt.kind} stays behind at ${f.from}` : `${pt.name} the ${pt.kind} is flying on ${f.callsign}`,
    body: left ? `${pt.left}. ${p.name} is not pleased.` : `${pt.name} travels ${where}${pets.length > 1 ? `, with ${pets.length - 1} more ${pets.length === 2 ? 'pet' : 'pets'} on board` : ''}. ${f.from} to ${f.to}.`, time: 'Now', read: false, ref: f.id } as any);
}
/** Pet tickets: what pets pay per flight, on average per passenger (cabin about $90, hold about $180). */
function petFeePerPax(pol: string): number { return pol === 'no' ? 0 : pol === 'cabin' ? 90 / 300 * 0.55 : (90 * 0.55 + 180 * 0.45) / 300; }

/* ---------- reviews ---------- */
interface PaxReview { at: number; callsign: string; reg: string; from: string; to: string; avg: number; n: number; dist: number[]; good: string[]; bad: string[]; quotes: string[] }
function paxReviews(): PaxReview[] { const S: any = State; return S.paxReviews || (S.paxReviews = []); }

/** After a hired pilot's landing: every passenger rates the flight. */
function rateAiFlight(f: LiveFlight, at: number) {
  const F: any = f; if (f.from === f.to || F.ferry || F.job || !f.pax) return;
  const list = manifestOf(f); if (!list.length) return;
  const cid = (plane(f.reg) || {} as any).companyId || State.companyId;
  const A = apt(f.from), B = apt(f.to), nm = A && B ? gcDistanceNm(A.pos, B.pos) : 500, t = acType(flightTypeId(f));
  const svc = serviceEffects(cid, t ? t.cls : 'airliner', nm, !isDomestic(f.from, f.to), f.pax, 0);
  const fpm = F.landFpm || 180, delay = F.schedEnd ? Math.max(0, (at - F.schedEnd) / 60000) : 0;
  const holds: Hold[] = F.holds || [], bumpy = !!F.bumpy || holds.some(h => h.kind === 'air' && /weather/i.test(h.why)) || (B ? airportWind(f.to, B.pos).kt >= 25 : false);
  const goAround = holds.some(h => h.kind === 'goaround'), star = list.some(p => p.famous), med = F.medical;
  const good: { [k: string]: number } = {}, bad: { [k: string]: number } = {}, dist = [0, 0, 0, 0, 0], quotes: string[] = [];
  let sum = 0;
  list.forEach((p, i) => {
    const r = seeded(f.id + ':rate:' + i), mood = r(), temper = mood < 0.28 ? 'nervous' : mood < 0.82 ? 'calm' : 'thrill';
    let s = 3.9 + (r() - 0.5) * 0.9, why: [string, number][] = [];
    const add = (k: string, v: number) => { s += v; why.push([k, v]); };
    add(fpm < 120 ? 'A butter landing' : fpm < 250 ? 'A good landing' : fpm < 400 ? 'A firm landing' : 'A hard landing', fpm < 120 ? 0.35 : fpm < 250 ? 0.1 : fpm < 400 ? -0.4 : -1.1);
    if (delay > 15) add(delay > 180 ? 'A very long delay' : delay > 60 ? 'Over an hour late' : 'A delay', delay > 180 ? -1.4 : delay > 60 ? -0.8 : -0.3);
    add(svc.score >= 65 ? 'Great service on board' : svc.score >= 45 ? 'Decent service' : 'Poor service', (svc.score - 50) / 50 * 0.7);
    if (bumpy) add(temper === 'nervous' ? 'Frightening turbulence' : temper === 'thrill' ? 'Fun turbulence' : 'Some turbulence', temper === 'nervous' ? -0.7 : temper === 'thrill' ? 0.3 : -0.05);
    if (goAround) add(temper === 'nervous' ? 'A scary go-around' : 'A go-around, handled well', temper === 'nervous' ? -0.5 : 0.05);
    if (p.pet) add(p.pet.left ? 'My pet was left behind' : p.pet.where === 'cabin' ? 'My pet flew beside me' : 'My pet was looked after', p.pet.left ? -1.6 : p.pet.where === 'cabin' ? 0.7 : 0.25);
    if (star && !p.famous) add('A celebrity on board', 0.12);
    if (med) add(med.key === p.key ? 'The crew saved my day' : 'A diversion for a sick passenger', med.key === p.key ? 0.8 : -0.25);
    if (F.wxDivert) add(temper === 'calm' ? 'A safe diversion for weather' : 'Diverted because of the weather', temper === 'calm' ? -0.2 : -0.6);
    if (p.famous) add('Treated discreetly', 0.2);
    const stars = clamp(Math.round(s), 1, 5); dist[stars - 1]++; sum += stars;
    why.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const top = why[0]; if (top) { if (top[1] >= 0.1) good[top[0]] = (good[top[0]] || 0) + 1; else if (top[1] <= -0.1) bad[top[0]] = (bad[top[0]] || 0) + 1; }
    if (quotes.length < 3 && top && Math.abs(top[1]) >= 0.3 && (top[1] > 0 ? stars >= 4 : stars <= 3) && r() < 0.3) quotes.push(`${'★'.repeat(stars)} ${top[0]}. ${p.name.split(' ')[0]}, ${natLabel(p.nat)}`);
  });
  const rank = (o: any) => Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, 3);
  const rv: PaxReview = { at, callsign: f.callsign, reg: f.reg, from: f.from, to: f.to, avg: Math.round(sum / list.length * 10) / 10, n: list.length, dist, good: rank(good), bad: rank(bad), quotes };
  const l = paxReviews(); l.unshift(rv); if (l.length > 400) l.length = 400;
  // very good and very bad flights get talked about
  try { if (rv.avg >= 4.6) Progress.popularity(1, 'Passengers loved a flight'); else if (rv.avg <= 2.2) Progress.popularity(-1, 'Passengers hated a flight'); } catch (e) { /* ignore */ }
}

/** Ranking → Passengers. */
function reviewsHtml(): string {
  const since = Date.now() - 30 * 864e5, cid = State.companyId;
  const regs = fleetOf(cid).map(a => a.reg), l = paxReviews().filter(r => r.at >= since && regs.indexOf(r.reg) >= 0);
  if (!l.length) return `<div class="card"><p class="fine-print">${icon('info')}No passenger reviews in the last 30 days yet. After each of your hired pilots' flights every passenger gives it 1 to 5 stars.</p></div>`;
  const n = l.reduce((s, r) => s + r.n, 0), avg = l.reduce((s, r) => s + r.avg * r.n, 0) / n, dist = [0, 1, 2, 3, 4].map(i => l.reduce((s, r) => s + r.dist[i], 0));
  const cnt = (k: 'good' | 'bad') => { const o: any = {}; l.forEach(r => r[k].forEach(x => o[x] = (o[x] || 0) + 1)); return Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, 5); };
  const st = (v: number) => `<span class="rk-stars">${[1, 2, 3, 4, 5].map(i => `<i class="${v >= i - 0.25 ? 'on' : v >= i - 0.75 ? 'half' : ''}">${icon('star')}</i>`).join('')}<b>${v.toFixed(1)}</b></span>`;
  return `<div class="rk-top"><div class="card rv-sum"><div class="card-h"><b>Passengers' rating, last 30 days</b></div>${st(avg)}<small>${num(n)} passengers on ${num(l.length)} flights</small>
      <div class="rv-dist">${[4, 3, 2, 1, 0].map(i => `<span><small>${i + 1}★</small><i><em style="width:${(dist[i] / Math.max(1, n) * 100).toFixed(1)}%"></em></i><small>${Math.round(dist[i] / Math.max(1, n) * 100)}%</small></span>`).join('')}</div></div>
    <div class="card rv-why"><div class="card-h"><b>What they talk about</b></div><div class="rv-cols"><div><small class="green">Liked</small>${cnt('good').map(x => `<p>${esc(x)}</p>`).join('') || '<p class="muted">–</p>'}</div><div><small class="amber">Disliked</small>${cnt('bad').map(x => `<p>${esc(x)}</p>`).join('') || '<p class="muted">–</p>'}</div></div></div></div>
    <div class="card lb"><div class="card-h"><b>Recent flights</b></div><div class="lb-list">${l.slice(0, 40).map(r => `<div class="lb-row rv-row"><span class="lb-who"><b>${esc(r.callsign)} · ${esc(r.from)} → ${esc(r.to)}</b><small>${esc(r.reg)} · ${esc(dateStr(new Date(r.at)).slice(0, 16).replace('T', ' '))} · ${r.n} passengers</small>${r.quotes.map(q => `<small class="rv-q">“${esc(q)}”</small>`).join('')}</span><span class="lb-v">${st(r.avg)}</span></div>`).join('')}</div></div>`;
}

/* ---------- medical emergencies ---------- */
/** Rarely (about one flight in 250 with passengers, over 250 nm): a passenger needs a doctor in flight.
 *  The flight goes to the nearest suitable airport about halfway, and carries on afterwards. */
function maybeMedical(f: any, a: any): boolean {
  if (f.test || f.ferry || f.job || !f.pax || f.medical || f.medicalDone) return false;
  const A = apt(f.from), B = apt(f.to); if (!A || !B) return false;
  const nm = gcDistanceNm(A.pos, B.pos); if (nm < 250) return false;
  if (Math.random() >= 0.004) return false;
  let alt = '';
  for (const fr of [0.5, 0.4, 0.6, 0.3, 0.7]) {
    const pt = gcInterpolate(A.pos, B.pos, fr), k = World.nearest(pt[0], pt[1], 250);
    if (k && k !== f.from && k !== f.to && apt(k) && legRunwayCheck(a.typeId, f.from, k, f.pax).ok) { alt = k; break; }
  }
  if (!alt) return false;
  const list = manifestOf(f), who = list[Math.floor(Math.random() * list.length)];
  const why = ['a suspected heart attack', 'a stroke', 'a severe allergic reaction', 'breathing difficulties', 'a diabetic emergency', 'a seizure', 'severe abdominal pain'][Math.floor(Math.random() * 7)];
  f.medical = { key: who ? who.key : '', name: who ? who.name : 'A passenger', seat: who ? who.seat : '', why, orig: f.to };
  f.to = alt;
  return true;
}
/** The moment the crew decide to divert (shown once the flight is well on its way). */
function medicalNote(f: any) {
  const m = f.medical; if (!m || m.noted) return; m.noted = true;
  State.notices.unshift({ id: uid(), kind: 'pilot', title: `${f.callsign}: medical emergency, diverting to ${f.to}`, body: `${m.name} (seat ${m.seat}) has ${m.why}. A doctor on board is helping and the crew declared an emergency. ${f.callsign} diverts to ${f.to}; after the stop it carries on to ${m.orig}.`, time: 'Now', read: false, ref: f.id } as any);
  try { renderTopbar(); Sound.chime(); } catch (e) { /* not ready */ }
}

/* ---------- landing heavy after a diversion ---------- */
// Aircraft that can dump fuel in flight (a fuel jettison system); the rest burn it off in a hold.
const FUEL_DUMP: { [typeId: string]: number } = { 'b77w-pmdg': 2400, 'b748': 2400, 'a350-ini': 2000, 'b78x': 1800, 'a310-ini': 1300 };   // kg a minute
/** A diversion soon after take-off can mean landing far over the maximum landing weight: the crew hold
 *  first, dumping fuel where the aircraft can, otherwise burning it off, until it is at the limit. */
function heavyLandingHold(f: any, a: any, prof: FlightProfile, origTo: string) {
  const t = acType(a.typeId), S = speedSpec(t.id), A = apt(f.from), O = apt(origTo), N = apt(f.to); if (!t || !A || !O || !N) return;
  const cargoT = (f.cargoKg || 0) / 1000;
  const Wo = flightWeights(t.id, f.pax || 0, gcDistanceNm(A.pos, O.pos), cargoT), Wn = flightWeights(t.id, f.pax || 0, gcDistanceNm(A.pos, N.pos), cargoT);
  const lw = (Wo.tow - (Wn.tow - Wn.lw)) * 1000, mlw = S.mlw * 1000, excess = Math.round(lw - mlw);
  if (excess < Math.max(300, mlw * 0.005)) return;   // at or about the limit: lands normally
  const dump = FUEL_DUMP[t.id], rate = dump || (BURN_KG_H[t.cls] || 2500) / 60 * 1.1;
  let min = excess / rate + (dump ? 4 : 0), why = dump ? `Dumping ${num(Math.round(excess / 100) * 100)} kg of fuel to get down to the landing weight` : `Holding to burn off ${num(Math.round(excess / 100) * 100)} kg of fuel before landing`;
  if (min > 75) { min = 75; why += ' (then an overweight landing, with an inspection after)'; f.overweight = true; }
  const desc = prof.pts.filter((p: any) => p.ph === 'Descent')[0], at = desc ? desc.s : prof.totalS * 0.8;
  (f.holds = f.holds || []).push({ at, s: Math.round(min * 60), kind: 'air', why });
  f.holds.sort((x: Hold, y: Hold) => x.at - y.at);
}
