// What a flight earns and costs, from real-world airline figures (USD, one way, averages):
//  - Fares: short turboprop sectors have a high price per mile (about $90-180 for under 300 nm); jets
//    on short and medium haul about $45 + $0.16/nm; long-haul widebodies about $120 + $0.12/nm in
//    economy, with business and premium cabins lifting the average; international routes cost more than
//    domestic. Bush and air-taxi seats are priced like charters.
//  - On-board sales and bags: food, drinks and duty-free on short haul (where they aren't included),
//    checked bags and seat fees.
//  - Costs: fuel at about $0.85 per kg, landing fees by aircraft weight, passenger handling, en-route
//    air navigation charges by distance and weight, and maintenance reserves per block hour split over
//    engines, airframe, components, landing gear and APU (an A320 about $1,000 an hour, a 777 about
//    $2,800, an ATR 72 about $450, a Cessna 172 about $40).

interface LegMoney { revenue: number; costs: number; net: number; lines: [string, number][]; fare: number; fuelKg: number }

// maintenance reserve per block hour, by class (USD)
const MX_PER_BH: { [cls: string]: number } = { widebody: 2700, airliner: 1000, regional: 650, turboprop: 450, bush: 180, ga: 45 };
const MX_SPLIT: [string, number][] = [['Engines', 0.4], ['Airframe checks', 0.2], ['Components', 0.24], ['Landing gear', 0.06], ['APU', 0.05], ['Line maintenance', 0.05]];
// typical maximum take-off weight in tonnes, by class (for landing and navigation charges)
const MTOW_T: { [cls: string]: number } = { widebody: 300, airliner: 75, regional: 37, turboprop: 23, bush: 4, ga: 1.1 };

function isDomestic(from: string, to: string): boolean {
  const A = apt(from), B = apt(to);
  return !!(A && B && A.country === B.country);
}

/** Average one-way fare per passenger for a route on an aircraft type. */
function averageFare(typeId: string, from: string, to: string): number {
  const t = acType(typeId), A = apt(from), B = apt(to);
  const nm = A && B ? gcDistanceNm(A.pos, B.pos) : 300, intl = !isDomestic(from, to);
  let fare: number;
  switch (t ? t.cls : 'airliner') {
    case 'turboprop': fare = Math.min(60 + 0.42 * nm, 70 + 0.3 * nm); break;
    case 'regional': fare = 55 + 0.26 * nm; break;
    case 'widebody': fare = (120 + 0.12 * nm) * 1.25; break;              // cabin mix: business and premium economy
    case 'bush': case 'ga': fare = 80 + 1.1 * nm; break;                   // seats sold like a charter
    default: fare = (45 + 0.16 * nm) * (nm > 1500 ? 1.1 : 1);
  }
  if (intl) fare *= 1.12;
  return Math.round(fare);
}

/** Everything a leg earns and costs, with the lines shown in Finance. fuelKg: actual burn if known. */
function legEconomics(typeId: string, from: string, to: string, pax: number, cargoKg: number, blockMin: number, fuelKg?: number, gsxCharged?: boolean): LegMoney {
  const t = acType(typeId) || AIRCRAFT[0], cls = t.cls, A = apt(from), B = apt(to);
  const nm = A && B ? gcDistanceNm(A.pos, B.pos) : 200, km = nm * 1.852, bh = blockMin / 60;
  const fare = averageFare(typeId, from, to);
  const tickets = pax * fare;
  const longHaul = nm > 2000;
  // on-board sales: buy-on-board on short haul, mostly included on long haul; bags and seats everywhere
  const onboard = Math.round(pax * (cls === 'bush' || cls === 'ga' ? 0 : longHaul ? 3.5 : cls === 'turboprop' ? 2.5 : 6.5));
  const bags = Math.round(pax * (cls === 'bush' || cls === 'ga' ? 0 : longHaul ? 9 : 7));
  const cargo = Math.round(cargoKg * (longHaul ? 1.6 : 1.1));
  const burn = fuelKg != null ? fuelKg : Math.round(bh * (BURN_KG_H[cls] || 2000) * 0.92);
  const fuel = Math.round(burn * 0.85);
  const mtow = MTOW_T[cls] || 60;
  const landing = Math.round(mtow * (cls === 'bush' || cls === 'ga' ? 6 : 9));
  const handling = Math.round(pax * (isDomestic(from, to) ? 6 : 9) + (cls === 'widebody' ? 900 : cls === 'airliner' ? 350 : cls === 'bush' || cls === 'ga' ? 0 : 150));
  const nav = cls === 'bush' || cls === 'ga' ? 0 : Math.round(km / 100 * Math.sqrt(mtow / 50) * 82);
  const mx = Math.round(bh * (MX_PER_BH[cls] || 800));
  const small = cls === 'bush' || cls === 'ga';
  const sales = Math.round(tickets * (small ? 0.03 : 0.06));                         // booking systems, agents, card fees
  const catering = gsxCharged ? 0 : Math.round(pax * (small ? 0 : longHaul ? 24 : cls === 'turboprop' ? 1.5 : 4));
  const crewN = small ? 1 : 2 + (typeof faNeeded === 'function' ? faNeeded(t) : 0);
  const crewTrip = Math.round(crewN * (longHaul ? 260 : bh > 3 ? 120 : 45));             // allowances, hotels and transport away from base
  const overhead = Math.round(revenueBase(tickets, onboard, bags, cargo) * (small ? 0.08 : 0.12)); // offices, IT, marketing, insurance
  const lines: [string, number][] = [
    [`${pax} passengers × ${money(fare)} average fare`, tickets],
  ];
  if (onboard) lines.push(['Food, drinks and duty-free on board', onboard]);
  if (bags) lines.push(['Bags and seat selection', bags]);
  if (cargo) lines.push([`Cargo ${num(cargoKg)} kg`, cargo]);
  // with GSX, handling and catering are charged per service as GSX does them (see gsxOnState)
  const hd = gsxCharged ? 0 : handling;
  lines.push([`Fuel, ${num(burn)} kg`, -fuel], [`Landing fee at ${to}`, -landing]);
  if (hd) lines.push(['Passenger handling', -hd]);
  if (nav) lines.push([`Air navigation charges, ${num(km)} km`, -nav]);
  for (const [part, share] of MX_SPLIT) lines.push([`Maintenance reserve: ${part.toLowerCase()}`, -Math.round(mx * share)]);
  if (sales) lines.push(['Ticket sales and booking fees', -sales]);
  if (catering) lines.push(['Catering', -catering]);
  lines.push(['Crew allowances and hotels', -crewTrip], ['Overheads: offices, IT, marketing, insurance', -overhead]);
  const revenue = tickets + onboard + bags + cargo, costs = fuel + landing + (gsxCharged ? 0 : handling) + nav + mx + sales + catering + crewTrip + overhead;
  return { revenue, costs, net: revenue - costs, lines, fare, fuelKg: burn };
}

function revenueBase(...v: number[]): number { return v.reduce((a, b) => a + b, 0); }

/* ---------- Ground services from GSX ----------
   With "I use GSX Pro" switched on and GSX running, each ground service is charged when GSX finishes it,
   at real-world ground handling rates for the size of aircraft. GSX itself has no prices, so the app
   prices what GSX actually did; without GSX the leg gets the app's standard handling and catering. */
const GSX_SERVICES: { key: string; name: string; price: { [cls: string]: number }; perPax?: { [cls: string]: number } }[] = [
  { key: 'boarding', name: 'Boarding (gate, jet bridge or stairs and buses)', price: { widebody: 520, airliner: 260, regional: 160, turboprop: 110, bush: 30, ga: 15 }, perPax: { widebody: 2.2, airliner: 1.8, regional: 1.6, turboprop: 1.5, bush: 0, ga: 0 } },
  { key: 'deboarding', name: 'Deboarding and bags', price: { widebody: 480, airliner: 240, regional: 150, turboprop: 100, bush: 30, ga: 15 }, perPax: { widebody: 2, airliner: 1.6, regional: 1.4, turboprop: 1.3, bush: 0, ga: 0 } },
  { key: 'catering', name: 'Catering service', price: { widebody: 1400, airliner: 380, regional: 220, turboprop: 120, bush: 0, ga: 0 }, perPax: { widebody: 14, airliner: 3.5, regional: 2.5, turboprop: 1.2, bush: 0, ga: 0 } },
  { key: 'refueling', name: 'Into-plane fuelling service', price: { widebody: 450, airliner: 220, regional: 160, turboprop: 120, bush: 60, ga: 35 } },
  { key: 'departure', name: 'Pushback and towing', price: { widebody: 650, airliner: 310, regional: 210, turboprop: 150, bush: 0, ga: 0 } },
  { key: 'deicing', name: 'De-icing (fluid and truck)', price: { widebody: 14000, airliner: 4200, regional: 2600, turboprop: 1800, bush: 450, ga: 250 } },
];
const _gsxDone: { [k: string]: boolean } = {};
let _gsxUsedThisLeg = false;

function gsxOnState(s: any, airport: string) {
  if (!s || !s.gsx || !s.gsx.running || !(State.settings as any).gsx) return;
  const a = plane((State as any).myReg[State.companyId]); if (!a) return;
  const t = acType(a.typeId), cls = t.cls, pax = (State as any).myLoad ? (State as any).myLoad.pax || 0 : 0;
  for (const sv of GSX_SERVICES) {
    const st = sv.key === 'boarding' ? s.gsx.boardingState : s.gsx[sv.key];
    if (st !== 6) { if (st && st < 5) _gsxDone[sv.key] = false; continue; }
    if (_gsxDone[sv.key]) continue;
    _gsxDone[sv.key] = true; _gsxUsedThisLeg = true;
    const base = sv.price[cls] || 0, pp = sv.perPax ? (sv.perPax[cls] || 0) * pax : 0, cost = Math.round(base + pp);
    if (!cost) continue;
    const c = company(), before = c.balance;
    c.balance -= cost;
    const lines: [string, number][] = [[`${sv.name}, ${t.model}`, -Math.round(base)]];
    if (pp) lines.push([`${pax} passengers`, -Math.round(pp)]);
    State.txns.unshift({ id: uid(), companyId: c.id, date: dateStr(new Date()).slice(0, 10), time: dateStr(new Date()).slice(11), kind: 'fees', label: `GSX: ${sv.name.split(' (')[0].toLowerCase().replace(/^./, x => x.toUpperCase())} at ${airport || '—'}`, amount: -cost, reg: a.reg, lines, link: { kind: 'aircraft', id: a.reg } } as any);
    try { animateBalance(before, c.balance); toast(`GSX ${sv.name.split(' (')[0].toLowerCase()}: ${money(-cost, { sign: true })}`, 'info'); } catch (e) { /* not ready */ }
    Store.soon();
  }
}
/** Whether GSX charged the ground services for the leg just flown (then the leg itself doesn't). */
function gsxTakeLegFlag(): boolean { const u = _gsxUsedThisLeg; _gsxUsedThisLeg = false; return u; }
