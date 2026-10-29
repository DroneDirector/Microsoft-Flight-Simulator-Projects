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
function legEconomics(typeId: string, from: string, to: string, pax: number, cargoKg: number, blockMin: number, fuelKg?: number): LegMoney {
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
  const catering = Math.round(pax * (small ? 0 : longHaul ? 24 : cls === 'turboprop' ? 1.5 : 4));
  const crewN = small ? 1 : 2 + (typeof faNeeded === 'function' ? faNeeded(t) : 0);
  const crewTrip = Math.round(crewN * (longHaul ? 260 : bh > 3 ? 120 : 45));             // allowances, hotels and transport away from base
  const overhead = Math.round(revenueBase(tickets, onboard, bags, cargo) * (small ? 0.08 : 0.12)); // offices, IT, marketing, insurance
  const lines: [string, number][] = [
    [`${pax} passengers × ${money(fare)} average fare`, tickets],
  ];
  if (onboard) lines.push(['Food, drinks and duty-free on board', onboard]);
  if (bags) lines.push(['Bags and seat selection', bags]);
  if (cargo) lines.push([`Cargo ${num(cargoKg)} kg`, cargo]);
  lines.push([`Fuel, ${num(burn)} kg`, -fuel], [`Landing fee at ${to}`, -landing], ['Passenger handling', -handling]);
  if (nav) lines.push([`Air navigation charges, ${num(km)} km`, -nav]);
  for (const [part, share] of MX_SPLIT) lines.push([`Maintenance reserve: ${part.toLowerCase()}`, -Math.round(mx * share)]);
  if (sales) lines.push(['Ticket sales and booking fees', -sales]);
  if (catering) lines.push(['Catering', -catering]);
  lines.push(['Crew allowances and hotels', -crewTrip], ['Overheads: offices, IT, marketing, insurance', -overhead]);
  const revenue = tickets + onboard + bags + cargo, costs = fuel + landing + handling + nav + mx + sales + catering + crewTrip + overhead;
  return { revenue, costs, net: revenue - costs, lines, fare, fuelKg: burn };
}

function revenueBase(...v: number[]): number { return v.reduce((a, b) => a + b, 0); }
