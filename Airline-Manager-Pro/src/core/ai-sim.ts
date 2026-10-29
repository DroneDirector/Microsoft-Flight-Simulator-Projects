// Hired pilots fly on the real clock. Each flight has an off-blocks time and follows the real-world
// profile for its aircraft and route (see flightperf.ts), so where it is, how high, how fast and how
// far it still has to go all follow from the time alone. When the app opens, it works out
// everything that happened while it was closed (landings, turnarounds, next legs, rest, money),
// and before it closes it schedules phone notifications for the landings coming up.
// "Virtual pilot speed" in Settings can run their flights faster than real time; 1× is real time.

const AI_TURN_MIN = 50;          // turnaround on the ground between legs
const AI_REST_H = 12;            // rest after a duty day
const AI_MAX_CATCHUP_D = 14;     // never simulate more than two weeks of absence
const AI_NOTIFY_BASE = 5000;     // notification ids 5000-5099

function aiOn(f: LiveFlight): boolean { return !f.you && !f.real; }
function aiSpeed(): number { return Math.max(1, +(State.settings as any).aiSpeed || 1); }

function aiProfile(f: any): FlightProfile {
  const a = plane(f.reg);
  return flightProfile(a ? a.typeId : 'a320-fenix', f.from, f.to, f.depAt);
}
/** Real time (ms) at which the flight reaches the gate. */
function aiEndAt(f: any): number { return f.depAt + f.durMs / (f.spd || 1); }

/** Position, phase, altitude, speed, miles to go and time to go of a hired pilot's flight right now. */
function aiUpdate(f: LiveFlight, now: number) {
  const F: any = f;
  if (!F.depAt) return;
  const p = aiProfile(F), el = (now - F.depAt) * (F.spd || 1) / 1000, q = profileAt(p, el);
  f.t = clamp(q.d / p.routeNm, 0, 1);
  f.alt = q.alt; f.gs = q.gs; f.phase = q.ph;
  F.leftNm = q.left; F.toGoS = q.toGoS / (F.spd || 1); F.routeNm = p.routeNm;
}

/** Give flights from older saves (and the demo) real off-blocks times, keeping where they are now. */
function aiAdopt(now: number) {
  for (const f of State.live) {
    const F: any = f;
    if (!aiOn(f) || F.depAt) continue;
    const p = flightProfile((plane(f.reg) || { typeId: 'a320-fenix' } as any).typeId, f.from, f.to, now);
    F.spd = aiSpeed(); F.durMs = p.totalS * 1000;
    F.depAt = now - profileTimeAtFrac(p, f.t || 0) * 1000 / F.spd;
    F.dutyMin = 0; F.leg = 0;
  }
}

/** When the speed setting changes, keep every flight where it is and run the rest at the new speed. */
function aiSetSpeed(spd: number) {
  const now = Date.now(), S: any = State;
  for (const f of State.live) {
    const F: any = f; if (!aiOn(f) || !F.depAt) continue;
    const elSim = (now - F.depAt) * (F.spd || 1);
    F.spd = spd; F.depAt = now - elSim / spd;
  }
  for (const n of (S.aiNext || [])) {
    const wait = Math.max(0, n.depAt - now) * (n.spd || 1);
    n.spd = spd; n.depAt = now + wait / spd;
  }
}

/** The leg after landing at `at`: the next stop of the pilot's route, or back to where it came from. */
function aiNextLeg(pilotId: string, from: string, at: string): string {
  const r = State.routes.filter(x => x.pilotId === pilotId && x.legs.indexOf(at) >= 0)[0];
  if (r) { const i = r.legs.indexOf(at), nx = r.legs[(i + 1) % r.legs.length]; return nx === at ? from : nx; }
  return from;
}

/** Book a hired pilot's landing: hours, landings, aircraft, revenue, fuel and fees. */
function aiLand(f: LiveFlight, at: number, summary: { legs: number; net: number; names: string[] }) {
  const F: any = f, a = plane(f.reg), p: any = pilot(f.pilotId);
  if (!a) return;
  const t = acType(a.typeId), c = company(a.companyId), prof = aiProfile(F), blockMin = Math.round(prof.totalS / 60);
  if (p) { p.hoursMin += blockMin; p.landings += 1; }
  a.hoursMin += blockMin; a.cycles += 1; a.location = f.to; a.status = 'parked';
  const nm = gcDistanceNm(apt(f.from).pos, apt(f.to).pos);
  const route = State.routes.filter(r => r.companyId === c.id && r.legs.indexOf(f.from) >= 0 && r.legs.indexOf(f.to) >= 0)[0];
  const yieldPax = route ? route.yieldPerPax : Math.round(40 + 0.22 * nm);
  const rev = f.pax * yieldPax, burnH = BURN_KG_H[t.cls] || 2000;
  const burnKg = Math.round(prof.airS / 3600 * burnH + burnH * 0.08 * (prof.totalS - prof.airS) / 900);
  const fuel = Math.round(burnKg * 0.85), fees = Math.round(f.pax * 6 + (t.price > 1e7 ? 900 : 120));
  const net = rev - fuel - fees, d = new Date(at), ds = dateStr(d);
  State.txns.unshift({ id: uid(), companyId: c.id, date: ds.slice(0, 10), time: ds.slice(11), label: `${f.callsign} ${f.from} to ${f.to}${p ? ' (' + p.name.split(' ')[0] + ')' : ''}`,
    amount: net, kind: net >= 0 ? 'revenue' : 'fees', reg: a.reg, flight: f.callsign, route: `${f.from} → ${f.to}`,
    lines: [[`${f.pax} passengers × ${money(yieldPax)}`, rev], [`Fuel, ${num(burnKg)} kg`, -fuel], ['Landing and handling', -fees]] } as any);
  c.balance += net;
  summary.legs++; summary.net += net; if (p && summary.names.indexOf(p.name) < 0) summary.names.push(p.name);
}

/** Move every hired pilot on to `now`: land flights that have arrived, start the next legs that are due. */
function aiAdvance(now?: number, quiet?: boolean, away?: boolean) {
  now = now || Date.now();
  const S: any = State;
  S.aiNext = S.aiNext || [];
  aiAdopt(now);
  const earliest = now - AI_MAX_CATCHUP_D * 864e5;
  const summary = { legs: 0, net: 0, names: [] as string[] };
  const before = company().balance;
  for (let guard = 0; guard < 2000; guard++) {
    // the next thing that happens, in time order
    let ev: any = null;
    for (const f of State.live) { const F: any = f; if (aiOn(f) && F.depAt) { const e = aiEndAt(F); if (e <= now && (!ev || e < ev.at)) ev = { kind: 'land', f, at: e }; } }
    for (const n of S.aiNext) if (n.depAt <= now && (!ev || n.depAt < ev.at)) ev = { kind: 'dep', n, at: n.depAt };
    if (!ev) break;
    if (ev.kind === 'land') {
      const f: LiveFlight = ev.f, F: any = f, at = Math.max(ev.at, earliest), spd = F.spd || 1;
      aiLand(f, at, summary);
      State.live = State.live.filter(x => x !== f);
      // duty: rest once the next leg would take the pilot past the duty limit, otherwise turn around
      const p: any = pilot(f.pilotId), maxDuty = ((p && p.rules && p.rules.maxDutyHrs) || 10) * 60;
      const dutyMin = (F.dutyMin || 0) + Math.round(F.durMs / 60000) + AI_TURN_MIN;
      const next = aiNextLeg(f.pilotId, f.from, f.to), a = plane(f.reg);
      const nextBlock = flightProfile(a ? a.typeId : 'a320-fenix', f.to, next, at).totalS / 60;
      const rest = dutyMin + nextBlock > maxDuty;
      if (p) p.status = rest ? 'resting' : 'flying';
      S.aiNext.push({ reg: f.reg, pilotId: f.pilotId, from: f.to, to: next, spd, depAt: at + (rest ? AI_REST_H * 3600e3 : AI_TURN_MIN * 60e3) / spd,
        dutyMin: rest ? 0 : dutyMin, leg: (F.leg || 0) + 1, callsign: f.callsign, paxMax: f.paxMax });
    } else {
      const n: any = ev.n, a = plane(n.reg), p: any = pilot(n.pilotId);
      S.aiNext = S.aiNext.filter((x: any) => x !== n);
      // an aircraft that went to maintenance, was sold or lost its pilot stays on the ground
      if (!a || a.status === 'grounded' || a.status === 'maintenance' || !p || p.status === 'off') continue;
      const load = 0.68 + (_hashStr(n.reg + n.leg) % 28) / 100;
      const depAt = Math.max(n.depAt, earliest), prof = flightProfile(a.typeId, n.from, n.to, depAt);
      const f: any = { id: 'ai-' + uid(), reg: n.reg, pilotId: n.pilotId, from: n.from, to: n.to, t: 0, rate: 0, callsign: n.callsign, pax: Math.round(n.paxMax * load), paxMax: n.paxMax,
        alt: 0, phase: 'Taxi out', depAt, spd: n.spd || 1, durMs: prof.totalS * 1000, dutyMin: n.dutyMin, leg: n.leg };
      a.status = 'flying'; p.status = 'flying';
      State.live.push(f);
    }
  }
  for (const f of State.live) if (aiOn(f)) aiUpdate(f, now);
  if (summary.legs) {
    if (!quiet) {
      State.notices.unshift({ id: uid(), kind: 'pilot', title: away ? `While you were away: ${summary.legs} flight${summary.legs > 1 ? 's' : ''} landed` : summary.legs > 1 ? `${summary.legs} flights landed` : `${summary.names[0] || 'A hired pilot'} landed`,
        body: `${summary.names.slice(0, 3).join(', ')}${summary.names.length > 3 ? ' and others' : ''}. ${money(summary.net, { sign: true })} after fuel and fees.`, time: 'Now', read: false } as any);
      try { Sound.chime(); } catch (e) { /* sound not ready */ }
    }
    Store.save();
    try { renderTopbar(); animateBalance(before, company().balance); } catch (e) { /* the interface isn't up yet */ }
  }
  return summary;
}

/** Phone notifications for the hired pilots' landings in the next day, shown even when the app is closed. */
function aiScheduleNotifications() {
  const cap = (window as any).Capacitor, LN = cap && cap.Plugins && cap.Plugins.LocalNotifications;
  if (!LN) return;
  const ids = Array.from({ length: 100 }, (_, i) => ({ id: AI_NOTIFY_BASE + i }));
  Promise.resolve(LN.cancel({ notifications: ids })).catch(() => { /* none scheduled */ }).then(() => {
    if (!(State.settings as any).aiNotify) return;
    const now = Date.now(), horizon = now + 24 * 3600e3, out: any[] = [];
    for (const f of State.live) {
      const F: any = f; if (!aiOn(f) || !F.depAt) continue;
      const at = aiEndAt(F); if (at <= now + 60e3 || at > horizon) continue;
      const p = pilot(f.pilotId);
      out.push({ id: AI_NOTIFY_BASE + out.length, title: `${p ? p.name : f.callsign} is at the gate in ${f.to}`, body: `${f.callsign} from ${f.from}, ${f.pax} passengers.`, schedule: { at: new Date(at), allowWhileIdle: true } });
      if (out.length >= 60) break;
    }
    if (out.length) return LN.schedule({ notifications: out });
  }).catch(() => { /* notifications not allowed */ });
}

/** Keep any open flight card (Overview and Map) counting down. */
function aiRefreshCards() {
  for (const el of $all('[data-fc]')) {
    const f = State.live.filter(x => x.id === el.getAttribute('data-fc'))[0];
    if (!f) { const pop = el.closest('.sel-pop'); if (pop) pop.remove(); continue; }
    if (!aiOn(f)) continue;
    const tmp = document.createElement('div'); tmp.innerHTML = flightCard(f).trim();
    el.replaceWith(tmp.firstElementChild);
  }
}

function startAiClock() {
  aiAdvance(Date.now(), false, true);
  setInterval(() => { if (!document.hidden) aiAdvance(); }, 15000);
  setInterval(() => {
    if (document.hidden) return;
    const now = Date.now();
    for (const f of State.live) if (aiOn(f)) aiUpdate(f, now);
    aiRefreshCards();
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { aiScheduleNotifications(); Store.save(); }
    else { aiScheduleNotificationsCancel(); aiAdvance(Date.now(), false, true); try { refresh(); } catch (e) { /* nothing on screen yet */ } }
  });
  window.addEventListener('pagehide', () => aiScheduleNotifications());
  // opening the app cancels the reminders; they are set again when it goes to the background
  aiScheduleNotificationsCancel();
}

function aiScheduleNotificationsCancel() {
  const cap = (window as any).Capacitor, LN = cap && cap.Plugins && cap.Plugins.LocalNotifications;
  if (LN) Promise.resolve(LN.cancel({ notifications: Array.from({ length: 100 }, (_, i) => ({ id: AI_NOTIFY_BASE + i })) })).catch(() => { /* none */ });
}
