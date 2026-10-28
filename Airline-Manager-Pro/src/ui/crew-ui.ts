// Crew pop-ups: staff details, conduct reports, co-pilot, birthday greeting, connection panel and weights.

function natLabel(code: string): string { return code ? `${flag(code)} ${esc(countryName(code))}` : ''; }

function personRole(p: any): CrewRole {
  if (p.role) return p.role;
  return /first officer/i.test(p.rank || '') ? 'fo' : 'captain';
}

/* ---------- Staff card used in lists ---------- */
function staffCard(p: any, i: number, opts?: { hire?: boolean }): string {
  const role = personRole(p);
  return `<button class="staff-card ${opts && opts.hire ? 'hire' : ''}" data-act="${opts && opts.hire ? 'hire-staff' : 'staff-detail'}" data-id="${p.id}" style="--i:${i}">
    <span class="sc-av">${avatarSvg(p.look, role, { view: 'bust', accent: company().color })}</span>
    <span class="sc-txt"><b>${esc(p.name)}</b><small>${ROLE_NAMES[role]}, ${flag(p.nat || 'GB')} ${ageOf(p.dob)}</small>
      <small>${opts && opts.hire ? `${esc(apt(p.base) ? apt(p.base).city : p.base)}, ${money(p.salary)}/wk` : `${esc(p.base)}, ${money(p.salary)}/wk`}</small></span>
    ${p.warnings ? `<i class="warn-dot" title="${p.warnings} warning${p.warnings > 1 ? 's' : ''}">${p.warnings}</i>` : ''}
    ${opts && opts.hire ? `<span class="sc-hire">${icon('plus')}Hire</span>` : ''}
  </button>`;
}

/* ---------- Staff details ---------- */
ACTIONS['staff-detail'] = el => openStaff(el.getAttribute('data-id'));
function openStaff(id: string) {
  const p = staffById(id); if (!p) return;
  const role = personRole(p), editable = role === 'fa' || role === 'mech';
  const isCo = !!p.coPilotFor;
  Sound.tick();
  openLayer('modal', `
    <div class="staff-pop">
      <div class="sp-stage"><div class="le-spot"></div>${avatarSvg(p.look, role, { accent: company().color })}</div>
      <div class="sp-info">
        <div class="modal-head"><div><h2>${esc(p.name)}</h2><small>${ROLE_NAMES[role]}${isCo ? ', your co-pilot' : ''}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
        <div class="kv-row">
          <div><small>Nationality</small><b>${natLabel(p.nat)}</b></div>
          <div><small>Age</small><b>${ageOf(p.dob)}</b></div>
          <div><small>Base</small><b>${esc(p.base)}</b></div>
          <div><small>Salary</small><b>${money(p.salary)}/wk</b></div>
          <div><small>Rating</small><b>${(p.rating || 4).toFixed(1)} ★</b></div>
          <div><small>Conduct</small><b class="${p.warnings ? 'amber' : 'green'}">${p.warnings ? p.warnings + ' warning' + (p.warnings > 1 ? 's' : '') : 'Clean record'}</b></div>
        </div>
        <div class="modal-actions">
          ${editable ? `<button class="btn ghost" data-act="edit-staff-look" data-id="${p.id}">${icon('user')}Change look</button>` : ''}
          ${isCo ? `<button class="btn ghost" data-act="copilot-sex">${icon('swap')}Male or female</button>` : ''}
          <button class="btn danger" data-act="dismiss-ask" data-id="${p.id}">Dismiss</button>
        </div>
      </div>
    </div>`, { cls: 'wide staff-modal' });
}

ACTIONS['edit-staff-look'] = el => {
  const p = staffById(el.getAttribute('data-id')); if (!p) return;
  closeTop();
  openLookEditor({ title: `${p.name}'s look`, role: personRole(p), look: p.look, onAccept: look => { p.look = look; Store.save(); refresh(); toast('Look saved', 'ok'); } });
};

ACTIONS['dismiss-ask'] = el => {
  const p = staffById(el.getAttribute('data-id')); if (!p) return;
  openLayer('modal', `<div class="modal-head del-head"><span class="sc-av mini">${avatarSvg(p.look, personRole(p), { view: 'bust', still: true })}</span><div><h2>Dismiss ${esc(p.name)}?</h2><small>Are you sure? You'll need to hire a replacement.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body"><p class="lede warn">${icon('alert')}${personRole(p) === 'mech' ? 'Without enough mechanics, some aircraft can\'t fly.' : personRole(p) === 'fa' ? 'Airliners can\'t fly without the flight attendants they need.' : 'Two-pilot aircraft can\'t fly without a co-pilot.'}</p>
    <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Keep ${esc(p.name.split(' ')[0])}</button><button class="btn danger" data-act="dismiss-do" data-id="${p.id}">Yes, dismiss</button></div></div>`, { cls: 'narrow' });
};
ACTIONS['dismiss-do'] = el => dismissStaff(el.getAttribute('data-id'));

function dismissStaff(id: string, incId?: string) {
  const S: any = State;
  const p = staffById(id); if (!p) return;
  if (p.coPilotFor) {
    const cp = S.coPilot[p.coPilotFor]; cp.gen = (cp.gen || 0) + 1;
    State.pilots.splice(State.pilots.indexOf(p), 1);
    const np = ensureCoPilot(p.coPilotFor);
    closeAll(); Store.save(); refresh();
    toast(`${p.name} dismissed. ${np ? np.name + ' is your new co-pilot.' : ''}`, 'warn');
    return;
  }
  if (S.staff.indexOf(p) >= 0) S.staff.splice(S.staff.indexOf(p), 1);
  else State.pilots.splice(State.pilots.indexOf(p), 1);
  if (incId) { const inc = S.incidents.filter((x: Incident) => x.id === incId)[0]; if (inc) inc.status = 'dismissed'; }
  State.notices = State.notices.filter(n => n.ref !== incId);
  closeAll(); Haptics.pulse(30); Store.save(); refresh();
  toast(`${p.name} dismissed. Hire a replacement under Pilots → Hire staff.`, 'warn', { label: 'Hire', act: 'go-hire', data: personRole(p) });
}
ACTIONS['go-hire'] = el => { const t = el.closest('.toast'); if (t) t.remove(); _pilotTab = 'hire'; _hireRole = el.getAttribute('data-id') || 'all'; closeAll(); go('pilots'); };

/* ---------- Conduct reports ---------- */
const INCIDENTS: { [role: string]: string[][] } = {
  fa: [['Late for duty', '{n} arrived late for the pre-flight briefing at {b}, and boarding started 15 minutes behind schedule.'],
    ['Rude to a passenger', 'A passenger complained that {n} was dismissive and rude during the meal service.'],
    ['Skipped a safety check', '{n} signed off the cabin safety check without checking the emergency equipment.'],
    ['Argument with a colleague', '{n} had a loud argument with another crew member in the galley, in front of passengers.']],
  mech: [['Missed a deadline', '{n} didn\'t finish a scheduled inspection on time, so an aircraft left {b} 40 minutes late.'],
    ['Tools left on the apron', '{n} left a toolbox on the apron at {b}. Ramp staff found it before it caused damage.'],
    ['Paperwork not signed', '{n} returned an aircraft to service without completing the maintenance paperwork.'],
    ['Late for shift', '{n} turned up an hour late for the night shift at {b}.']],
  fo: [['Late for the flight', '{n} reported for duty late, and the departure from {b} was delayed.'],
    ['Checklist shortcuts', 'The flight data shows {n} skipped parts of the before-take-off checklist.'],
    ['Unprofessional radio calls', 'ATC filed a complaint about {n}\'s radio manners on a recent flight.']],
};
const MISCONDUCT_P: { [k: string]: number } = { never: 0, rare: 0.02, normal: 0.07, often: 0.2 };

function maybeIncident() {
  const S: any = State;
  const cid = State.companyId;
  const roles: CrewRole[] = ['fa', 'mech', 'fo'];
  for (const r of roles) {
    const p = MISCONDUCT_P[S.settings.misconduct[r]] || 0;
    if (Math.random() >= p) continue;
    const pool = r === 'fo' ? State.pilots.filter((x: any) => x.coPilotFor === cid) : staffOf(cid, r);
    if (!pool.length) continue;
    const who: any = pool[Math.floor(Math.random() * pool.length)];
    const t = INCIDENTS[r][Math.floor(Math.random() * INCIDENTS[r].length)];
    const inc: Incident = { id: uid(), staffId: who.id, title: t[0], text: t[1].replace('{n}', who.name).replace('{b}', who.base), date: '2026-10-28', status: 'open' };
    S.incidents.unshift(inc);
    State.notices.unshift({ id: 'n-' + inc.id, kind: 'staff' as any, title: `Conduct report: ${who.name}`, body: `${t[0]}. Discipline or dismiss.`, time: 'Now', read: false, ref: inc.id });
    renderTopbar(); Sound.chime(); Store.soon();
    toast(`Conduct report: ${who.name}`, 'warn', { label: 'Open', act: 'open-incident', data: inc.id });
    return;
  }
}
function startConductClock() { setInterval(maybeIncident, 4 * 60 * 1000); }

ACTIONS['open-incident'] = el => { const t = el.closest('.toast'); if (t) t.remove(); incidentPopup(el.getAttribute('data-id')); };
function incidentPopup(id: string) {
  const inc = (State as any).incidents.filter((x: Incident) => x.id === id)[0]; if (!inc) return;
  const p = staffById(inc.staffId);
  if (!p) { toast('This person no longer works for you', 'info'); return; }
  closeAll();
  const role = personRole(p);
  openLayer('modal', `
    <div class="inc">
      <div class="inc-av">${avatarSvg(p.look, role, { accent: company().color })}</div>
      <div class="inc-main">
        <div class="modal-head"><div><small>Conduct report, ${esc(inc.date)}</small><h2>${esc(inc.title)}</h2></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
        <p class="speech">${esc(inc.text)}</p>
        <div class="inc-who"><b>${esc(p.name)}</b><small>${ROLE_NAMES[role]}, ${natLabel(p.nat)}, ${ageOf(p.dob)}, base ${esc(p.base)}</small><small class="${p.warnings ? 'amber' : ''}">${p.warnings ? `Already ${p.warnings} warning${p.warnings > 1 ? 's' : ''} on record` : 'No earlier warnings'}</small></div>
        ${inc.status === 'open' ? `<div class="decide">
          <button class="decide-card" data-act="discipline" data-id="${inc.id}"><b>Discipline</b><small>A formal warning on their record. They stay on the team.</small></button>
          <button class="decide-card bad" data-act="dismiss-inc" data-id="${inc.id}"><b>Dismiss</b><small>They leave the company. You'll need to hire a replacement.</small></button>
        </div>` : `<p class="lede">${icon('check')}Handled: ${inc.status}.</p>`}
      </div>
    </div>`, { cls: 'wide' });
}
ACTIONS.discipline = el => {
  const inc = (State as any).incidents.filter((x: Incident) => x.id === el.getAttribute('data-id'))[0]; if (!inc) return;
  const p = staffById(inc.staffId); if (p) p.warnings = (p.warnings || 0) + 1;
  inc.status = 'disciplined';
  State.notices = State.notices.filter(n => n.ref !== inc.id);
  closeAll(); Sound.tick(); Store.save(); refresh();
  toast(`${p ? p.name : 'Staff member'} has been given a formal warning`, 'ok');
};
ACTIONS['dismiss-inc'] = el => {
  const inc = (State as any).incidents.filter((x: Incident) => x.id === el.getAttribute('data-id'))[0]; if (!inc) return;
  dismissStaff(inc.staffId, inc.id);
};

/* ---------- Co-pilot ---------- */
ACTIONS['copilot-sex'] = () => {
  const cid = State.companyId, cp = (State as any).coPilot[cid];
  const cur = State.pilots.filter((p: any) => p.coPilotFor === cid)[0];
  closeAll();
  openLookEditor({ title: 'Your co-pilot', role: 'fo', look: cur ? cur.look : defaultLook(cp.sex, 'fo'), sexOnly: true,
    onAccept: look => { cp.sex = look.sex; cp.gen = (cp.gen || 0) + 1; ensureCoPilot(cid); Store.save(); refresh(); toast('Co-pilot updated', 'ok'); } });
};

/* ---------- Hire ---------- */
ACTIONS['hire-staff'] = el => {
  const S: any = State;
  const id = el.getAttribute('data-id');
  const p = S.staffCandidates.filter((x: Staff) => x.id === id)[0]; if (!p) return;
  const c = company();
  openLayer('modal', `
    <div class="staff-pop">
      <div class="sp-stage"><div class="le-spot"></div>${avatarSvg(p.look, p.role, { accent: c.color })}</div>
      <div class="sp-info">
        <div class="modal-head"><div><h2>Hire ${esc(p.name)}?</h2><small>${ROLE_NAMES[p.role]}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
        <div class="kv-row">
          <div><small>Nationality</small><b>${natLabel(p.nat)}</b></div>
          <div><small>Age</small><b>${ageOf(p.dob)}</b></div>
          <div><small>Rating</small><b>${p.rating.toFixed(1)} ★</b></div>
          <div><small>Salary</small><b>${money(p.salary)}/wk</b></div>
          <div><small>Based at</small><b>${esc(c.hub)}</b></div>
        </div>
        <p class="lede">${icon('info')}The salary is paid from ${esc(c.name)}'s balance every week.</p>
        <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Not now</button>
          ${p.role !== 'fo' ? `<button class="btn ghost" data-act="hire-look" data-id="${p.id}">${icon('user')}Change look</button>` : ''}
          <button class="btn primary" data-act="hire-do" data-id="${p.id}">${icon('plus')}Hire for ${money(p.salary)}/wk</button></div>
      </div>
    </div>`, { cls: 'wide staff-modal' });
};
ACTIONS['hire-look'] = el => {
  const p = (State as any).staffCandidates.filter((x: Staff) => x.id === el.getAttribute('data-id'))[0]; if (!p) return;
  closeTop();
  openLookEditor({ title: `${p.name}'s look`, role: p.role, look: p.look, onAccept: look => { p.look = look; ACTIONS['hire-staff']({ getAttribute: () => p.id } as any, null); } });
};
ACTIONS['hire-do'] = el => {
  const S: any = State;
  const id = el.getAttribute('data-id');
  const p = S.staffCandidates.filter((x: Staff) => x.id === id)[0]; if (!p) return;
  const c = company();
  S.staffCandidates = S.staffCandidates.filter((x: Staff) => x.id !== id);
  p.companyId = c.id; p.base = c.hub; p.hired = '2026-10-28'; p.status = 'on duty';
  if (p.role === 'fo') State.pilots.push({ id: p.id, name: p.name, rank: 'First officer', hoursMin: 1500 * 60, landings: 900, base: c.hub, salary: p.salary, rating: p.rating, status: 'standby', types: [], sex: p.sex, nat: p.nat, dob: p.dob, look: p.look, companyId: c.id, warnings: 0, rules: { maxDutyHrs: 10, maxLandingFpm: 500, ifrOnly: true, homeBaseReturn: true } } as any);
  else S.staff.push(p);
  // keep the candidate list topped up
  S.staffCandidates.push(makePerson('cand-' + p.role + uid(), p.role, '', ['EKVG', 'EKCH', 'PALH', 'EKBI'][Math.floor(Math.random() * 4)]));
  closeAll(); Haptics.success(); Store.save(); refresh();
  toast(`${p.name} joined ${c.name}`, 'ok');
};

/* ---------- Birthday ---------- */
function checkBirthday() {
  const S: any = State;
  const now = companyDate();
  const pr = profileOfCompany(State.companyId), me: any = pilot(pr.pilotId);
  if (!me || !me.dob) return;
  const p = me.dob.split('-').map(Number);
  const key = me.id;
  if (p[1] === now.getMonth() + 1 && p[2] === now.getDate() && S.birthdayGreeted[key] !== now.getFullYear()) {
    S.birthdayGreeted[key] = now.getFullYear();
    State.notices.unshift({ id: uid(), kind: 'birthday' as any, title: `Happy birthday, ${me.name.replace(/^Capt\.\s*/, '')}!`, body: `Everyone at ${company().name} wishes you a great day. ${ageOf(me.dob)} today.`, time: 'Today', read: false });
    renderTopbar(); Store.soon();
    setTimeout(() => birthdayPopup(me), 1800);
  }
}
function birthdayPopup(me: any) {
  const age = ageOf(me.dob);
  const confetti = Array.from({ length: 36 }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;--c:${['#3FD0E8', '#E04BD6', '#F2B33D', '#3DDC97', '#FF7A7E', '#9C7CFF'][i % 6]}"></i>`).join('');
  Sound.chime(); Haptics.success();
  openLayer('modal', `
    <div class="bday">
      <div class="bday-confetti">${confetti}</div>
      <div class="bday-av">${avatarSvg(me.look, 'captain', { accent: company().color })}</div>
      <div class="bday-txt">
        <small>${esc(company().name)}</small>
        <h2>Happy birthday, ${esc(me.name.replace(/^Capt\.\s*/, ''))}!</h2>
        <p class="muted">${age} today. The whole crew wishes you smooth air and soft landings.</p>
        <div class="modal-actions"><button class="btn primary" data-act="close-layer">Thank you</button></div>
      </div>
    </div>`, { cls: 'narrow bday-pop' });
}
ACTIONS['bday-preview'] = () => { const me: any = pilot(profileOfCompany(State.companyId).pilotId); closeAll(); birthdayPopup(me); };

/** Phone notification on your birthday, also when the app is closed (real-world calendar only). */
function scheduleBirthdayNotification() {
  const cap = (window as any).Capacitor, LN = cap && cap.Plugins && cap.Plugins.LocalNotifications;
  if (!LN) return;
  const me: any = pilot(profileOfCompany(State.companyId).pilotId);
  if (!me || !me.dob) return;
  const p = me.dob.split('-').map(Number);
  const name = me.name.replace(/^Capt\.\s*/, '');
  Promise.resolve(LN.requestPermissions ? LN.requestPermissions() : null).then(() => {
    LN.cancel({ notifications: [{ id: 4401 }] }).catch(() => { /* none scheduled yet */ });
    if (State.settings.timeMode !== 'real') return;
    LN.schedule({ notifications: [{ id: 4401, title: `Happy birthday, ${name}!`, body: `Everyone at ${company().name} wishes you a great day.`, schedule: { on: { month: p[1], day: p[2], hour: 9, minute: 0 }, allowWhileIdle: true } }] });
  }).catch(() => { /* notifications not allowed */ });
}

/* ---------- Connection panel (Wi-Fi only) ---------- */
ACTIONS['link-panel'] = () => {
  const b: any = State.bridge;
  Sound.tick(); closeAll();
  const wrap = openLayer('modal', `
    <div class="modal-head"><div><h2>Connection</h2><small>The app links to the PC that runs Flight Simulator over your Wi-Fi.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body link">
      <div class="ln-card ok"><span class="ln-ic">${icon('wifi')}</span><span><b>${esc(b.wifi)}</b><small>Wi-Fi, this phone ${esc(b.phoneIp)}</small></span><span class="bars">${[1, 2, 3, 4].map(i => `<i class="${i <= b.signal ? 'on' : ''}" style="height:${i * 4 + 2}px"></i>`).join('')}</span></div>
      <div class="ln-radar"><div class="rd"><i></i><i></i><i></i><span class="sweep"></span><b class="pc-dot"></b></div>
        <div class="ln-scan" data-scan><b>Scanning ${esc(b.wifi)} for the PC app…</b><small>Make sure the ${esc(APP.shortName)} PC app is running next to Flight Simulator.</small></div></div>
      <div class="ln-card"><span class="ln-ic">${icon('cell')}</span><span><b>Mobile data</b><small>On, not used for linking</small></span></div>
      <p class="fine-print">${icon('info')}Your phone and the PC must be on the same Wi-Fi network.</p>
    </div>`, { cls: 'narrow link-pop' });
  setTimeout(() => {
    const sc = $('[data-scan]', wrap); if (!sc) return;
    wrap.querySelector('.ln-radar').classList.add('found');
    sc.innerHTML = `<b>${icon('check')}Found ${esc(b.pcName)} (${esc(b.pcIp)})</b><small>${esc(b.sim)} running, ${b.latencyMs} ms${b.gsx ? ', GSX Pro detected' : ', GSX not running'}</small>`;
  }, 1700);
};

/* ---------- Weights ---------- */
function kg(n: number): string { return State.settings.units === 'metric' ? num(n) + ' kg' : num(n) + ' kg'; }
ACTIONS.weights = () => {
  const L: any = (State as any).myLoad;
  const paxW = L.pax * L.paxKg;
  const total = L.emptyKg + paxW + L.bagsKg + L.cargoKg + L.mailKg + L.fuelKg;
  const pct = Math.min(100, total / L.mtowKg * 100);
  const rows: [string, number, string][] = [['Empty aircraft', L.emptyKg, '#5D7590'], [`Passengers, ${L.pax} × ${L.paxKg} kg`, paxW, '#3FD0E8'], ['Baggage', L.bagsKg, '#4DA3FF'], ['Cargo', L.cargoKg, '#9C7CFF'], ['Mail', L.mailKg, '#E04BD6'], ['Fuel', L.fuelKg, '#F2B33D']];
  const fuelOk = L.fuelKg >= L.tripFuelKg + L.reserveKg;
  Sound.tick();
  openLayer('modal', `
    <div class="modal-head"><div><h2>Weights, ${esc(State.myReg[State.companyId])}</h2><small>Read from Flight Simulator${L.source === 'gsx' ? ', boarding numbers from GSX Pro' : ', no GSX: from the sim\'s own payload data'}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body wt">
      <div class="wt-bar">${rows.map(r => `<i style="width:${(r[1] / L.mtowKg * 100).toFixed(2)}%;background:${r[2]}"></i>`).join('')}<span class="mtow" style="left:100%"></span></div>
      <div class="wt-top"><b>${kg(total)}</b><small>of ${kg(L.mtowKg)} maximum take-off weight (${pct.toFixed(0)}%)</small></div>
      ${rows.map(r => `<div class="wt-row"><i style="background:${r[2]}"></i><span>${r[0]}</span><b>${kg(r[1])}</b></div>`).join('')}
      <div class="wt-fuel ${fuelOk ? 'ok' : 'bad'}">${icon(fuelOk ? 'check' : 'alert')}<span>${fuelOk ? 'Enough fuel' : 'Not enough fuel'}: trip ${kg(L.tripFuelKg)} plus reserves ${kg(L.reserveKg)}</span></div>
      <span class="src-chip">${L.source === 'gsx' ? 'GSX Pro detected' : 'Flight Simulator data'}</span>
    </div>`, { cls: 'narrow' });
};
