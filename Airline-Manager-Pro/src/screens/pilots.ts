// Pilots: your own pilot, co-pilot, hired pilots, cabin crew, mechanics, and hiring.
let _pilotTab = 'pilots';
let _hireRole = 'all';

function pilotInitials(n: string): string { return n.replace(/^Capt\.\s*/, '').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase(); }

function crewOf(): Pilot[] {
  const c = company();
  const regs = State.fleet.filter(a => a.companyId === c.id).map(a => a.typeId);
  return State.pilots.filter((p: any) => !p.you && !p.coPilotFor && (p.companyId ? p.companyId === c.id : p.types.some(t => regs.indexOf(t) >= 0) && (c.id !== 'rba' ? p.base[0] !== 'P' : p.base[0] === 'P')));
}

function needChip(label: string, have: number, need: number, role: string): string {
  const short = need - have;
  return `<button class="need ${short > 0 ? 'short' : 'ok'}" data-act="go-hire" data-id="${role}">${icon(short > 0 ? 'alert' : 'check')}<span><b>${label}</b><small>${have} of ${need} needed${short > 0 ? `, hire ${short} more` : ''}</small></span></button>`;
}

SCREENS.pilots = {
  title: 'Pilots', icon: 'pilots',
  render() {
    const me: any = myPilot();
    const c = company();
    const log = State.logbook.filter(l => plane(l.reg) && plane(l.reg).companyId === State.companyId && l.result !== 'crash');
    const avg = log.length ? log.reduce((s, l) => s + Math.abs(l.landingFpm), 0) / log.length : 0;
    const crew = crewOf();
    const fa = staffOf(c.id, 'fa'), mech = staffOf(c.id, 'mech');
    const cc = crewCheck();
    const co: any = State.pilots.filter((p: any) => p.coPilotFor === c.id)[0];
    const myA = plane(State.myReg[c.id]);
    const cands = (State as any).staffCandidates.filter((x: Staff) => _hireRole === 'all' || x.role === _hireRole);
    const tabs = [['pilots', 'Pilots', crew.length + (co ? 1 : 0)], ['cabin', 'Cabin crew', fa.length], ['mech', 'Mechanics', mech.length], ['hire', 'Hire staff', (State as any).staffCandidates.length + State.candidates.length]];
    let body = '';
    if (_pilotTab === 'pilots') body = `
      ${co ? `<div class="co-card">
        <span class="co-av">${avatarSvg(co.look, 'fo', { accent: c.color })}</span>
        <span class="co-txt"><small>Your co-pilot in ${esc(myA ? myA.reg : '')}</small><b>${esc(co.name)}</b><small>First officer, ${natLabel(co.nat)}, ${ageOf(co.dob)}</small>
          <span class="btn-row"><button class="btn ghost sm" data-act="copilot-sex">${icon('swap')}Male or female</button><button class="btn ghost sm" data-act="staff-detail" data-id="${co.id}">Details</button></span></span>
      </div>` : myA ? `<p class="fine-print">${icon('info')}${esc(acType(myA.typeId).model)} is flown by one pilot, so you don't need a co-pilot.</p>` : ''}
      <div class="crew-list">${crew.map((p: any, i) => {
        const f = State.live.filter(x => x.pilotId === p.id)[0];
        const route = State.routes.filter(r => r.pilotId === p.id)[0];
        return `<div class="crew-row" style="--i:${i}">
          <button class="avatar av-btn" data-act="staff-detail" data-id="${p.id}" aria-label="${esc(p.name)}">${avatarSvg(p.look, personRole(p), { view: 'bust', accent: c.color })}</button>
          <span class="cr-name"><b>${esc(p.name)} ${levelChip(p)}</b><small>${esc(levelTitle(p))}, ${flag(p.nat)} ${ageOf(p.dob)}, ${num(p.hoursMin / 60)} h, ${esc(p.base)}</small></span>
          <span class="cr-now">${f ? `${statusChip('flying')}<small>${esc(f.callsign)} ${esc(f.from)} to ${esc(f.to)}, ${Math.round(f.t * 100)}%</small>` : `${statusChip(p.status)}<small>${route ? 'Next: ' + esc(route.code) : 'No route assigned'}</small>`}</span>
          <span class="cr-rules">${(p.types || []).map((t: string) => acType(t) ? `<i class="rating">${esc(acType(t).model)}</i>` : '').join('')}${p.status === 'training' && p.training ? `<i class="rating training">${esc(acType(p.training.typeId).model)} course until ${esc(dateStr(new Date(p.training.until)).slice(5, 16))}</i>` : ''}${p.rules ? `<i>${p.rules.maxDutyHrs} h duty</i>` : ''}</span>
          <span class="cr-btns">${f ? `<button class="btn ghost sm" data-act="watch-pilot" data-id="${f.id}">${icon('map')}Watch</button>` : ''}<button class="btn sm" data-act="pilot-rules" data-id="${p.id}">Assign</button></span>
        </div>`;
      }).join('') || emptyState('No pilots hired yet', 'Hire pilots to fly your other aircraft while you fly your own trips.', 'Hire staff', 'pilot-hire')}</div>`;
    else if (_pilotTab === 'cabin') body = `
      <div class="need-row">${needChip('Flight attendants', cc.faHave, cc.faNeed, 'fa')}<p class="fine-print">${icon('info')}Real-world rule: aircraft with 20 or more seats need one flight attendant per 50 seats. Bush planes and small props need none.</p></div>
      <div class="staff-grid">${fa.map((p, i) => staffCard(p, i)).join('') || emptyState('No cabin crew yet', 'Hire flight attendants to fly passenger airliners.', 'Hire staff', 'pilot-hire')}</div>`;
    else if (_pilotTab === 'mech') body = `
      <div class="need-row">${needChip('Mechanics', cc.mechHave, cc.mechNeed, 'mech')}<p class="fine-print">${icon('info')}Every base needs a licensed mechanic, plus line-maintenance staff for your fleet's size and type. No mechanic, no flights.</p></div>
      <div class="staff-grid">${mech.map((p, i) => staffCard(p, i)).join('') || emptyState('No mechanics yet', 'You need at least one mechanic before any aircraft can fly.', 'Hire staff', 'pilot-hire')}</div>`;
    else body = `
      <div class="filter-row">${[['all', 'Everyone'], ['captain', 'Captains'], ['fo', 'First officers'], ['fa', 'Flight attendants'], ['mech', 'Mechanics']].map(r => `<button class="fchip ${_hireRole === r[0] ? 'on' : ''}" data-act="hire-role" data-r="${r[0]}">${r[1]}</button>`).join('')}</div>
      <div class="staff-grid">
        ${(_hireRole === 'all' || _hireRole === 'captain') ? State.candidates.map((p: any, i) => `<button class="staff-card hire" data-act="hire" data-id="${p.id}" style="--i:${i}">
          <span class="sc-av">${avatarSvg(p.look, personRole(p), { view: 'bust', accent: c.color })}</span>
          <span class="sc-txt"><b>${esc(p.name)}</b><small>${esc(p.rank)}, ${flag(p.nat)} ${ageOf(p.dob)}</small><small>${num(p.hoursMin / 60)} h, ${money(p.salary)}/wk</small><small>Rated: ${(p.types || []).map((t: string) => acType(t) ? esc(acType(t).model) : '').filter(Boolean).join(', ') || 'no types yet'}</small></span><span class="sc-hire">${icon('plus')}Hire</span></button>`).join('') : ''}
        ${cands.map((p: Staff, i: number) => staffCard(p, i + 4, { hire: true })).join('')}
      </div>`;
    return `
    <div class="pilot-hero">
      <button class="ph-fig" data-act="edit-my-look" aria-label="Change your pilot's look">${avatarSvg(me.look, 'captain', { accent: c.color })}<span class="ph-edit">${icon('user')}Change look</span></button>
      <div class="ph-main">
        <small>Your pilot, synced with your simulator flights</small>
        <h1>${esc(me.name)}</h1>
        <p class="sub">${esc(me.rank)}, ${natLabel(me.nat)}, ${ageOf(me.dob)}, based at ${esc(apt(me.base).name)}</p>
        <div class="ph-types">${me.types.map((t: string) => `<span class="dev-tag">${esc(acType(t).model)}</span>`).join('')}</div>
        ${(() => { const st = Progress.compute(), r = Progress.rankOf(Progress.pilotXp(st), PILOT_RANKS), n = Object.keys((State as any).badges || {}).length;
          return `<button class="ph-rank" data-act="go-ranking">${icon('trophy')}<span><b>${esc(r.name)}</b><small>Rating ${(me.rating || 4).toFixed(1)} · ${n} badges · popularity ${Math.round(c.reputation || 0)}</small></span>${icon('chevron')}</button>`; })()}
      </div>
      <div class="ph-stats">
        <div><small>Flight hours</small><b>${hours(me.hoursMin)}</b></div>
        <div><small>Landings</small><b>${num(me.landings)}</b></div>
        <div><small>Avg landing</small><b>${Math.round(avg)}<span> fpm</span></b></div>
        <div><small>Crashes on record</small><b>${State.logbook.filter(l => l.decision === 'registered').length}</b></div>
      </div>
    </div>
    <div class="tabs big">${tabs.map(t => `<button class="tab ${_pilotTab === t[0] ? 'on' : ''}" data-act="pilot-tab" data-t="${t[0]}">${t[1]}<i>${t[2]}</i></button>`).join('')}</div>
    ${body}`;
  },
};

ACTIONS['pilot-tab'] = el => { _pilotTab = el.getAttribute('data-t'); Sound.tick(); refresh(); };
ACTIONS['pilot-hire'] = () => { _pilotTab = 'hire'; refresh(); };
ACTIONS['hire-role'] = el => { _hireRole = el.getAttribute('data-r'); Sound.tick(); refresh(); };
ACTIONS['watch-pilot'] = el => showFlightOnMap(el.getAttribute('data-id'));
ACTIONS.hire = el => {
  const id = el.getAttribute('data-id');
  const p: any = State.candidates.filter(x => x.id === id)[0]; if (!p) return;
  State.candidates = State.candidates.filter(x => x.id !== id);
  p.status = 'standby'; p.base = company().hub; p.companyId = State.companyId;
  p.rules = { maxDutyHrs: 10, maxLandingFpm: 500, ifrOnly: true, homeBaseReturn: true };
  State.pilots.push(p);
  chargeHiring(p);
  Haptics.success(); Store.save(); refresh(); toast(`${p.name} joined ${company().name}`, 'ok');
};
ACTIONS['edit-my-look'] = () => {
  const me: any = myPilot();
  openLookEditor({ title: 'Your pilot', role: 'captain', look: me.look, identity: { name: me.name, dob: me.dob, nat: me.nat }, confirmName: 'your pilot',
    onAccept: (look, id) => {
      me.look = look; me.sex = look.sex; me.lookAccepted = true;
      if (id) { me.name = id.name; me.dob = id.dob; me.nat = id.nat; }
      Store.save(); scheduleBirthdayNotification(); refresh(); toast('Your pilot is saved', 'ok');
    } });
};

ACTIONS['pilot-rules'] = el => {
  const p = pilot(el.getAttribute('data-id')); if (!p) return;
  const r = p.rules || { maxDutyHrs: 10, maxLandingFpm: 500, ifrOnly: true, homeBaseReturn: true };
  const routes = State.routes.filter(x => x.companyId === State.companyId);
  openLayer('modal', `
    <div class="modal-head"><div><h2>Assign ${esc(p.name)}</h2><small>You can't fly your hired pilots' aircraft, but you decide where they go and the rules they follow.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body">
      <h3>Route</h3>
      <p class="fine-print">${icon('info')}Hired pilots fly only the routes you create and schedule. Without a route they wait on the ground.</p>
      <div class="route-pick">${routes.filter(rt => !rt.flownAt).map(rt => !Ratings.rated(p, rt.typeId) ? `<button class="rp off" disabled>${rt.test ? `<span class="chain"><b>${esc(rt.legs[0])}</b></span>` : legChain(rt.legs)}<small>${esc(rt.code)}: needs ${aAn(acType(rt.typeId).model)} ${esc(acType(rt.typeId).model)} type rating</small></button>` : `<button class="rp ${rt.pilotId === p.id ? 'on' : ''}" data-act="rp-pick" data-id="${rt.id}">${rt.test ? `<span class="chain"><b>${esc(rt.legs[0])}</b></span>` : legChain(rt.legs)}<small>${esc(rt.code)}, ${rt.test ? 'Test flight' : esc(rt.days)}, ${esc(acType(rt.typeId).model)}${rt.pilotId && rt.pilotId !== p.id && pilot(rt.pilotId) ? `, now ${esc(pilot(rt.pilotId).name)}` : ''}</small></button>`).join('')}
        <button class="rp ${routes.some(rt => rt.pilotId === p.id && !rt.flownAt) ? '' : 'on'}" data-act="rp-pick" data-id=""><span class="chain"><b>No route</b></span><small>Stays on the ground</small></button></div>
      ${typeRatingsHtml(p)}
      <h3>Rules</h3>
      <div class="rules">
        <div class="range-row"><span><b>Max duty per day</b><small>Pilot rests once this is reached</small></span><input type="range" min="6" max="14" value="${r.maxDutyHrs}" oninput="this.nextElementSibling.textContent=this.value+' h'"><output>${r.maxDutyHrs} h</output></div>
        <div class="range-row"><span><b>Landing rate limit</b><small>Harder landings are reported to you</small></span><input type="range" min="200" max="800" step="50" value="${r.maxLandingFpm}" oninput="this.nextElementSibling.textContent=this.value+' fpm'"><output>${r.maxLandingFpm} fpm</output></div>
        <label class="tg-row"><span><b>IFR flights only</b></span>${toggle('r-ifr', r.ifrOnly)}</label>
        <label class="tg-row"><span><b>Return to base each night</b></span>${toggle('r-home', r.homeBaseReturn)}</label>
      </div>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn primary" data-act="rules-save">Save assignment</button></div>
    </div>`, { cls: 'wide' });
  (window as any).__assignPilot = p.id;
};
ACTIONS['rp-pick'] = el => { $all('.rp', el.parentElement).forEach(b => b.classList.remove('on')); el.classList.add('on'); Sound.tick(); };
ACTIONS['rules-save'] = () => {
  const p: any = pilot((window as any).__assignPilot); if (!p) { closeAll(); return; }
  const sel = $('.route-pick .rp.on'), rid = sel ? sel.getAttribute('data-id') : '';
  const ranges = $all('.rules input[type=range]') as HTMLInputElement[];
  p.rules = { maxDutyHrs: +(ranges[0] ? ranges[0].value : 10), maxLandingFpm: +(ranges[1] ? ranges[1].value : 500),
    ifrOnly: !!$('.tg[data-key="r-ifr"].on'), homeBaseReturn: !!$('.tg[data-key="r-home"].on') };
  // one pilot per route, one route (or one test flight) per pilot
  State.routes.forEach(r => { if (r.pilotId === p.id && r.id !== rid && !r.flownAt) r.pilotId = undefined; });
  const r = State.routes.filter(x => x.id === rid)[0];
  let msg = 'Assignment saved';
  if (r) {
    const before = r.pilotId && r.pilotId !== p.id ? pilot(r.pilotId) : null;
    r.pilotId = p.id;
    if (before) msg = `${p.name} takes over ${r.code} from ${before.name}`;
    const res = aiStartRoute(p.id, r);
    if (res === 'ok') msg = `${p.name} starts ${r.test ? 'the test flight' : r.code} in about ${AI_TURN_MIN} minutes`;
    else if (res === 'no-aircraft') msg = `Assigned. ${p.name} starts when ${aAn(acType(r.typeId).model)} ${acType(r.typeId).model} is free`;
    else if (res === 'not-rated') { r.pilotId = undefined; msg = `${p.name} isn't rated on the ${acType(r.typeId).model}. Send them on a type rating course first.`; }
    else if (res === 'training') msg = `Assigned. ${p.name} starts after the type rating course`;
    else if (res === 'runway') { r.pilotId = undefined; msg = routeRunwayProblem(r.typeId, r.legs); }
  } else msg = `${p.name} stays on the ground`;
  Store.save(); closeAll(); refresh(); toast(msg, 'ok');
};

/* ---------- Type ratings ---------- */
function typeRatingsHtml(p: any): string {
  const c = company(), types = State.fleet.filter(a => a.companyId === c.id).map(a => a.typeId).filter((t, i, arr) => arr.indexOf(t) === i);
  const rows = types.map(id => {
    const t = acType(id), has = Ratings.rated(p, id), now = p.status === 'training' && p.training && p.training.typeId === id, failed = p.failedType === id;
    return `<div class="tr-row"><span><b>${esc(t.maker)} ${esc(t.model)}</b><small>${has ? 'Rated' : now ? `On the course until ${esc(dateStr(new Date(p.training.until)).slice(0, 16))}` : failed ? 'Check ride not passed yet' : `${Ratings.days(id)} day${Ratings.days(id) > 1 ? 's' : ''} of training and a check ride`}</small></span>
      ${has ? `<span class="chip ok">${icon('check')}Rated</span>` : now ? '<span class="chip">On the course</span>' : `<button class="btn ${failed ? 'primary' : 'ghost'} sm" data-act="tr-train" data-id="${esc(p.id)}" data-t="${id}" ${p.status === 'training' ? 'disabled' : ''}>${failed ? 'Check ride again' : 'Train'} ${money(Math.round(Ratings.cost(id) * (failed ? 0.34 : 1)), { compact: true })}</button>`}</div>`;
  }).join('');
  return `<h3>Type ratings</h3><p class="fine-print">${icon('info')}Pilots fly only the types on their licence. A course is ground school and simulator training ending with a check ride; it runs on the real clock (faster with a faster virtual pilot speed), and the pilot doesn't fly meanwhile.</p><div class="tr-list">${rows}</div>`;
}
ACTIONS['tr-train'] = el => {
  const p: any = pilot(el.getAttribute('data-id')), id = el.getAttribute('data-t'); if (!p) return;
  const retake = p.failedType === id, cost = Math.round(Ratings.cost(id) * (retake ? 0.34 : 1));
  if (company().balance < cost) { toast('Not enough money for the course', 'warn'); return; }
  if (State.live.some(f => f.pilotId === p.id)) { toast(`${p.name} is flying. The course starts after landing: try again then.`, 'warn'); return; }
  if (Ratings.train(p, id, retake)) { if (retake) delete p.failedType; Store.save(); Sound.payOut(); closeAll(); refresh(); toast(`${p.name} is on the ${acType(id).model} ${retake ? 'check ride' : 'course'}`, 'ok'); }
};
