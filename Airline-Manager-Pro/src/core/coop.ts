// Co-op: several real pilots flying for the same airline (your own or a real-world one). Everyone's
// flights land in one shared airline: the same balance, fleet, logbook, popularity and rankings.
//
// How it is built: the airline's shared history is a list of events (a pilot joined, a flight landed,
// an aircraft was bought…). Each app sends its own events and applies everyone else's exactly once,
// so all members end up with the same airline. Where the events live is up to the backend:
//  - 'demo': no online service yet. Three sample pilots join your airline and fly its routes on the
//    real clock, so co-op can be tried and every screen shows real behaviour.
//  - 'supabase': the online service (being set up). Same events, stored and shared through Supabase,
//    with sign-in, invite codes and checks that flights are genuine.

interface CoopMember {
  id: string; name: string; role: 'owner' | 'pilot'; you?: boolean; sex: 'm' | 'f'; nat: string; base: string;
  flights: number; hoursMin: number; revenue: number; rating: number; joined: number; lastSeen: number; look?: any;
}
interface CoopEvent { id: string; at: number; by: string; type: 'start' | 'join' | 'flight' | 'buy' | 'leave' | 'rule'; text: string; amount?: number; tx?: string }
interface CoopState {
  on: boolean; backend: 'demo' | 'supabase'; code: string; companyId: string; started: number;
  members: CoopMember[]; feed: CoopEvent[]; applied: { [id: string]: 1 };
  rules: { ownerBuys: boolean }; next: { [memberId: string]: number };
}

/** The online service (Supabase) plugs in here; until then the demo backend is used. */
interface CoopBackend {
  name: string; online: boolean;
  start(c: Company): string;                    // returns the invite code
  join(code: string): Promise<boolean>;
  publish(ev: CoopEvent): void;
  tick(now: number): void;                      // brings in other pilots' events
}

const COOP_DEMO_PILOTS = 3;

function coopState(): CoopState { return (State as any).coop || null; }
function coopOn(): boolean { const c = coopState(); return !!(c && c.on && c.companyId === State.companyId); }
function coopMe(): CoopMember { const c = coopState(); return c ? c.members.filter(m => m.you)[0] : null; }
function coopMember(id: string): CoopMember { const c = coopState(); return c ? c.members.filter(m => m.id === id)[0] : null; }

function coopCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < 8; i++) s += A[Math.floor(Math.random() * A.length)] + (i === 3 ? '-' : '');
  return s;
}

/** Add an event to the shared history (once) and remember it. */
function coopRecord(ev: CoopEvent) {
  const c = coopState(); if (!c || c.applied[ev.id]) return;
  c.applied[ev.id] = 1;
  c.feed.unshift(ev); if (c.feed.length > 200) c.feed.length = 200;
}

/* ---------------- demo backend: sample pilots who fly the airline's routes on the real clock ---------------- */

const CoopDemo: CoopBackend = {
  name: 'Demo', online: false,
  start(co: Company) {
    const c = coopState(), now = Date.now();
    for (let i = 0; i < COOP_DEMO_PILOTS; i++) {
      const p = makePerson('coop-' + co.id + '-' + i + '-' + now, 'captain', '', co.hub);
      const m: CoopMember = { id: 'coop-' + uid(), name: p.name, role: 'pilot', sex: p.sex, nat: p.nat, base: co.hub,
        flights: 0, hoursMin: 0, revenue: 0, rating: Math.round((3.8 + Math.random() * 1.1) * 10) / 10, joined: now - (i + 1) * 3600e3, lastSeen: now, look: randomLook('coop' + p.name, p.sex, 'captain') };
      c.members.push(m);
      coopEnsurePilot(m);
      coopRecord({ id: uid(), at: m.joined, by: m.id, type: 'join', text: `${m.name} joined the airline` });
      // the first one is already in the air, the others take off over the next hour or two
      c.next[m.id] = i === 0 ? now - 1 : now + (20 + i * 45 + Math.random() * 30) * 60e3;
    }
    return coopCode();
  },
  join() { return Promise.resolve(false); },
  publish() { /* the demo keeps everything on this device */ },
  tick(now: number) {
    const c = coopState(); if (!c) return;
    // flights that reached the gate
    for (const f of State.live.slice()) { const F: any = f; if (F.coop && F.depAt + F.durMs <= now) coopLand(F, F.depAt + F.durMs); }
    // pilots ready for their next flight
    for (const m of c.members) {
      if (m.you || !c.next[m.id] || c.next[m.id] > now) continue;
      if (State.live.some((f: any) => f.coop && f.pilotId === m.id)) continue;
      coopDepart(m, Math.max(c.next[m.id], now - 6 * 3600e3));
    }
    for (const f of State.live) if ((f as any).coop) coopUpdate(f, now);
  },
};

/** Co-op pilots appear as pilots (for the map and flight cards) but belong to no company's payroll. */
function coopEnsurePilot(m: CoopMember) {
  if (State.pilots.some(p => p.id === m.id)) return;
  State.pilots.push({ id: m.id, name: m.name, rank: 'Co-op pilot', hoursMin: m.hoursMin, landings: m.flights, base: m.base, status: 'standby', types: [],
    sex: m.sex, nat: m.nat, look: m.look, salary: 0, rating: m.rating, companyId: 'coop:' + coopState().companyId } as any);
}

function coopDepart(m: CoopMember, at: number) {
  const c = coopState(), co = company();
  const routes = State.routes.filter(r => r.companyId === co.id);
  const r = routes[Math.floor(Math.random() * routes.length)];
  const legs = r ? r.legs : [co.hub, (co.hub === 'EKCH' ? 'ENGM' : 'EKCH')];
  const i = Math.floor(Math.random() * Math.max(1, legs.length - 1));
  const from = legs[i], to = legs[i + 1] || legs[0];
  if (!from || !to || from === to) { c.next[m.id] = at + 3600e3; return; }
  // an aircraft of the airline that's free; otherwise the type the route is flown with
  const busy = (reg: string) => State.live.some(f => f.reg === reg);
  const assigned = (reg: string) => (State as any).aiNext && (State as any).aiNext.some((n: any) => n.reg === reg);
  const a = fleetOf(co.id).filter(x => x.status === 'parked' && x.reg !== (State as any).myReg[co.id] && !busy(x.reg) && !assigned(x.reg))[0];
  const typeId = a ? a.typeId : r ? r.typeId : 'a320-fenix', t = acType(typeId);
  const prof = flightProfile(typeId, from, to, at);
  const seats = t ? t.seats : 180, pax = Math.round(seats * (0.7 + Math.random() * 0.25));
  const f: any = { id: 'coop-' + uid(), reg: a ? a.reg : '', pilotId: m.id, from, to, t: 0, rate: 0, callsign: (co.icao || 'CO') + (300 + (_hashStr(m.id + at) % 600)),
    pax, paxMax: seats, alt: 0, phase: 'Taxi out', real: true, coop: true, typeId, depAt: at, durMs: prof.totalS * 1000 };
  if (a) a.status = 'flying';
  const p = pilot(m.id); if (p) p.status = 'flying';
  State.live.push(f);
  m.lastSeen = Date.now();
  if (at > Date.now() - 60e3) State.notices.unshift({ id: uid(), kind: 'pilot', title: `${m.name} departed ${from}`, body: `Co-op flight ${f.callsign} to ${to}${a ? ' in ' + a.reg : ''}, ${pax} passengers.`, time: 'Now', read: false } as any);
  coopUpdate(f, Date.now());
}

/** Position, phase and altitude of a co-op pilot's flight right now. */
function coopUpdate(f: LiveFlight, now: number) {
  const F: any = f, p = flightProfile(F.typeId, f.from, f.to, F.depAt), el = Math.max(0, now - F.depAt) / 1000, q = profileAt(p, el);
  f.t = clamp(q.d / p.routeNm, 0, 1); f.alt = q.alt; f.gs = q.gs; f.phase = q.ph;
  F.leftNm = q.left; F.toGoS = q.toGoS; F.routeNm = p.routeNm;
}

/** A co-op pilot reached the gate: the flight is booked to the shared airline. */
function coopLand(f: any, at: number) {
  const c = coopState(), co = company(), m = coopMember(f.pilotId);
  State.live = State.live.filter(x => x !== f);
  const blockMin = Math.round(f.durMs / 60000);
  const money0 = legEconomics(f.typeId, f.from, f.to, f.pax, 0, blockMin);
  const d = new Date(at), day = dateStr(d).slice(0, 10), time = dateStr(d).slice(11);
  const txId = uid();
  State.txns.unshift({ id: txId, companyId: co.id, date: day, time, label: `${f.callsign} ${f.from} to ${f.to} (${m ? m.name : 'co-op'})`, amount: money0.net, kind: money0.net >= 0 ? 'revenue' : 'fees',
    reg: f.reg || undefined, flight: f.callsign, route: `${f.from} → ${f.to}`, lines: money0.lines, coopBy: f.pilotId } as any);
  const before = co.balance; co.balance += money0.net;
  const fpm = Math.round(-(90 + Math.random() * 260));
  State.logbook.unshift({ id: uid(), date: dateStr(d), from: f.from, to: f.to, reg: f.reg || '—', blockMin, landingFpm: fpm, g: Math.round((1.08 + Math.random() * .35) * 100) / 100, pax: f.pax,
    result: fpm < -500 ? 'hard' : 'ok', atc: 'Co-op', notes: `Flown by ${m ? m.name : 'a co-op pilot'}`, typeId: f.typeId, coopBy: f.pilotId } as any);
  const a = f.reg ? plane(f.reg) : null;
  if (a) { a.status = 'parked'; a.location = f.to; a.hoursMin += blockMin; a.cycles += 1; try { conditionAfterFlight(a, blockMin); } catch (e) { /* ignore */ } }
  const p = pilot(f.pilotId); if (p) { p.status = 'standby'; p.hoursMin += blockMin; p.landings += 1; }
  try { crewAfterLeg(co.id, { typeId: f.typeId, from: f.from, to: f.to, blockMin }); } catch (e) { /* ignore */ }
  if (m) { m.flights++; m.hoursMin += blockMin; m.revenue += money0.net; m.lastSeen = at; m.base = f.to; }
  try { Progress.popularity(fpm > -250 ? 0.2 : 0, 'A good co-op flight'); } catch (e) { /* ignore */ }
  coopRecord({ id: 'fl-' + f.id, at, by: f.pilotId, type: 'flight', text: `${m ? m.name : 'A co-op pilot'} landed at ${f.to} from ${f.from}`, amount: money0.net, tx: txId });
  State.notices.unshift({ id: uid(), kind: 'flight', title: `${m ? m.name : 'Co-op pilot'} landed at ${f.to}`, body: `Co-op flight ${f.callsign} from ${f.from}, ${hours(blockMin)} block, ${f.pax} passengers. ${money(money0.net, { sign: true })} for the airline. Tap for the money in and out.`,
    time: at > Date.now() - 120e3 ? 'Now' : time, read: false, tx: txId } as any);
  // the next flight after a turnaround, or a rest
  c.next[f.pilotId] = at + (Math.random() < 0.3 ? 8 * 3600e3 : (45 + Math.random() * 75) * 60e3);
  if (Date.now() - at < 120e3) try { animateBalance(before, co.balance); } catch (e) { /* not ready */ }
}

/** Your own flights count for the co-op too (called after a leg is booked). */
function coopAfterMyLeg(from: string, to: string, blockMin: number, net: number, txId: string) {
  if (!coopOn()) return;
  const me = coopMe(); if (!me) return;
  me.flights++; me.hoursMin += blockMin; me.revenue += net; me.lastSeen = Date.now();
  const ev: CoopEvent = { id: 'fl-' + txId, at: Date.now(), by: me.id, type: 'flight', text: `${me.name} landed at ${to} from ${from}`, amount: net, tx: txId };
  coopRecord(ev); coopBackend().publish(ev);
}

/** Buying aircraft: with "only the owner buys aircraft" on, other members can't. */
function coopCanBuy(): boolean {
  if (!coopOn()) return true;
  const c = coopState(), me = coopMe();
  return !c.rules.ownerBuys || (me && me.role === 'owner');
}
function coopAfterBuy(text: string, amount: number) {
  if (!coopOn()) return;
  const me = coopMe(); const ev: CoopEvent = { id: uid(), at: Date.now(), by: me ? me.id : '', type: 'buy', text: `${me ? me.name : 'You'} bought ${text}`, amount: -amount };
  coopRecord(ev); coopBackend().publish(ev);
}

function coopBackend(): CoopBackend { return CoopDemo; }

/** Start a co-op with the airline you are flying for now. You are its owner. */
function coopStart() {
  const co = company(), me: any = myPilot(), now = Date.now();
  const S: any = State;
  S.coop = { on: true, backend: 'demo', code: '', companyId: co.id, started: now, members: [], feed: [], applied: {}, rules: { ownerBuys: true }, next: {} } as CoopState;
  const mine: CoopMember = { id: 'coop-you', name: me ? me.name : 'You', role: 'owner', you: true, sex: me && me.sex || 'm', nat: me && me.nat || '', base: co.hub,
    flights: 0, hoursMin: 0, revenue: 0, rating: me && me.rating || 4.5, joined: now, lastSeen: now };
  S.coop.members.push(mine);
  coopRecord({ id: uid(), at: now, by: mine.id, type: 'start', text: `${mine.name} started co-op for ${co.name}` });
  S.coop.code = coopBackend().start(co);
  Store.save();
}

/** Leave co-op: the shared pilots leave, everything the airline earned and logged stays. */
function coopLeave() {
  const S: any = State, c = coopState(); if (!c) return;
  const ids = c.members.filter(m => !m.you).map(m => m.id);
  for (const f of State.live.filter((x: any) => x.coop)) { const a = f.reg ? plane(f.reg) : null; if (a && a.status === 'flying') a.status = 'parked'; }
  State.live = State.live.filter((x: any) => !x.coop);
  State.pilots = State.pilots.filter(p => ids.indexOf(p.id) < 0);
  S.coop = null;
  Store.save();
}

function startCoopClock() {
  const run = () => { if (!coopState() || !coopState().on) return; try { coopBackend().tick(Date.now()); } catch (e) { /* never stop the app */ } };
  run();
  setInterval(() => { run(); if (State.screen === 'coop') { try { refresh(); } catch (e) { /* ignore */ } } }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
}
