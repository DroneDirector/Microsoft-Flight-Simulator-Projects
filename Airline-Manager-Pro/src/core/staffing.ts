// People and pay over time, on the real clock (it catches up when the app has been closed):
//  - Weekly payroll: every hired pilot, co-pilot, flight attendant and mechanic is paid each week,
//    taken from the balance and listed in Finance.
//  - The hiring list changes: every few hours some candidates find other jobs and new ones come
//    looking, for co-pilots, flight attendants, mechanics and captains; some days there are more.
//  - Hiring costs a recruitment and training fee (about one week's salary).
//  - Conduct reports can be switched off in Settings → Staff. Nothing that already happened is
//    removed, and court cases pause; switched back on, everything carries on where it stopped.

const POOL_ROLES: CrewRole[] = ['fo', 'fa', 'mech'];
const POOL_BASES = ['EKVG', 'EKCH', 'ENGM', 'BIKF', 'EGLL', 'EDDF', 'PALH', 'EKBI', 'KJFK', 'CYYZ'];

/** Pay everyone for every week that has passed. */
function payrollAdvance(quiet?: boolean) {
  const S: any = State, now = Date.now(), WEEK = 7 * 864e5;
  if (!S.payNext) { S.payNext = now + WEEK; return; }
  let weeks = 0;
  while (S.payNext <= now && weeks < 8) {
    const d = new Date(S.payNext), day = dateStr(d).slice(0, 10);
    for (const c of State.companies) {
      const people: any[] = (State.pilots.filter((p: any) => !p.you && pilotCompany(p) === c.id) as any[]).concat(staffOf(c.id));
      let total = 0;
      for (const p of people) {
        if (!p.salary) continue;
        total += p.salary;
        S.txns.unshift({ id: uid(), companyId: c.id, date: day, time: '06:00', kind: 'salary', label: `Salary: ${p.name}`, amount: -p.salary, personId: p.id,
          lines: [['Weekly salary', -Math.round(p.salary * 0.86)], ['Pension and insurance', -Math.round(p.salary * 0.14)]], link: { kind: 'staff', id: p.id } });
      }
      if (!total) continue;
      const before = c.balance; c.balance -= total;
      if (!quiet && c.id === State.companyId) { try { animateBalance(before, c.balance); } catch (e) { /* not ready */ } }
      State.notices.unshift({ id: uid(), kind: 'staff' as any, title: `Payroll paid: ${money(total)}`, body: `Weekly salaries for ${people.length} people at ${c.name}.`, time: weeks ? day : 'Now', read: false } as any);
    }
    S.payNext += WEEK; weeks++;
  }
  if (S.payNext <= now) S.payNext = now + WEEK;   // away for months: catch up eight weeks at most
  if (weeks) { Store.save(); try { renderTopbar(); } catch (e) { /* ignore */ } }
}

function makePilotCandidate(seed: string): any {
  const st = makePerson(seed, 'captain', '', POOL_BASES[_hash(seed) % POOL_BASES.length]);
  const r = seeded(seed + 'x');
  const types = AIRCRAFT.filter(t => t.cls !== 'ga').map(t => t.id);
  const t1 = types[Math.floor(r() * types.length)], t2 = types[Math.floor(r() * types.length)];
  const hrs = Math.round(3000 + r() * 14000);
  return { id: 'c-' + uid(), name: st.name, rank: 'Captain', hoursMin: hrs * 60, landings: Math.round(hrs * (0.4 + r() * 0.5)), base: st.base, salary: Math.round(3600 + r() * 1600), rating: Math.round((3.6 + r() * 1.4) * 10) / 10,
    status: 'standby', types: t1 === t2 ? [t1] : [t1, t2], sex: st.sex, nat: st.nat, dob: st.dob, look: randomLook('pilot-' + st.id, st.sex, 'captain') };
}

/** The job market moves: candidates leave, new ones arrive (some days more, some days fewer). */
function poolAdvance() {
  const S: any = State, now = Date.now();
  if (!S.poolNext) { S.poolNext = now + (2 + Math.random() * 4) * 3600e3; return; }
  let rounds = 0, arrived = 0;
  while (S.poolNext <= now && rounds < 20) {
    rounds++;
    const busy = Math.random();   // a busy day brings more people, a quiet one fewer
    for (const role of POOL_ROLES) {
      const list = S.staffCandidates.filter((x: Staff) => x.role === role);
      // some find other jobs
      const leave = Math.floor(Math.random() * (list.length > 6 ? 3 : 2));
      for (let i = 0; i < leave && list.length > 1; i++) { const gone = list.splice(Math.floor(Math.random() * list.length), 1)[0]; S.staffCandidates = S.staffCandidates.filter((x: Staff) => x !== gone); }
      // new ones come looking
      const target = role === 'fa' ? 8 : 5, room = Math.max(0, target + 3 - list.length);
      const come = Math.min(room, Math.floor(busy * (role === 'fa' ? 4 : 3) + Math.random() * 1.5));
      for (let i = 0; i < come; i++) { S.staffCandidates.push(makePerson('cand-' + role + uid(), role, '', POOL_BASES[Math.floor(Math.random() * POOL_BASES.length)])); arrived++; }
    }
    // captains
    if (State.candidates.length > 1 && Math.random() < 0.35) State.candidates.splice(Math.floor(Math.random() * State.candidates.length), 1);
    if (State.candidates.length < 7 && Math.random() < 0.3 + busy * 0.4) { State.candidates.push(makePilotCandidate('cap' + uid())); arrived++; }
    S.poolNext += (2 + Math.random() * 6) * 3600e3;
  }
  if (S.poolNext <= now) S.poolNext = now + 3 * 3600e3;
  if (arrived) {
    if (arrived >= 3) State.notices.unshift({ id: uid(), kind: 'staff' as any, title: `${arrived} new people are looking for work`, body: 'New co-pilots, flight attendants, mechanics or captains are on the hiring list under Pilots → Hire staff.', time: 'Now', read: false } as any);
    Store.soon(); try { renderTopbar(); if (State.screen === 'pilots') refresh(); } catch (e) { /* ignore */ }
  }
}

/** Recruitment and training: about a week's salary, paid when someone is hired. */
function chargeHiring(p: any) {
  const c = company(), fee = Math.round((p.salary || 1000) * (p.rank === 'Captain' ? 1.5 : 1) / 10) * 10, before = c.balance;
  c.balance -= fee;
  State.txns.unshift({ id: uid(), companyId: c.id, date: dateStr(new Date()).slice(0, 10), time: dateStr(new Date()).slice(11), kind: 'salary', label: `Hiring: ${p.name}`, amount: -fee, personId: p.id,
    lines: [['Recruitment', -Math.round(fee * 0.35)], ['Training and uniform', -Math.round(fee * 0.65)]], link: { kind: 'staff', id: p.id } } as any);
  try { animateBalance(before, c.balance); Sound.payOut(); } catch (e) { /* ignore */ }
}

/** Conduct reports on or off. Off pauses running court cases; on shifts their dates by the pause. */
function conductOn(): boolean { return (State.settings as any).conduct !== false; }
function setConduct(on: boolean) {
  const S: any = State;
  if (!on) { S.conductPausedAt = Date.now(); return; }
  const paused = S.conductPausedAt ? Date.now() - S.conductPausedAt : 0; S.conductPausedAt = 0;
  if (paused > 0) for (const c of (S.cases || [])) if (c.status === 'open') for (const st of c.stages) if (!st.done) st.at += paused;
}

function startStaffing() {
  payrollAdvance(true); poolAdvance(); leaseAdvance(true);
  setInterval(() => { payrollAdvance(); poolAdvance(); leaseAdvance(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { payrollAdvance(); poolAdvance(); leaseAdvance(); } });
}
