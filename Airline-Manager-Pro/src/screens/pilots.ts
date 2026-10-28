// Pilots: your own pilot profile, the crew you've hired, and candidates to hire.
let _pilotTab = 'crew';

function pilotInitials(n: string): string { return n.replace(/^Capt\.\s*/, '').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase(); }

function crewOf(): Pilot[] {
  const c = company();
  const regs = State.fleet.filter(a => a.companyId === c.id).map(a => a.typeId);
  return State.pilots.filter(p => !p.you && p.types.some(t => regs.indexOf(t) >= 0) && (c.id !== 'rba' ? p.base[0] !== 'P' : p.base[0] === 'P'));
}

SCREENS.pilots = {
  title: 'Pilots', icon: 'pilots',
  render() {
    const me = myPilot();
    const log = State.logbook.filter(l => plane(l.reg) && plane(l.reg).companyId === State.companyId && l.result !== 'crash');
    const avg = log.length ? log.reduce((s, l) => s + Math.abs(l.landingFpm), 0) / log.length : 0;
    const crew = crewOf();
    return `
    <div class="pilot-hero">
      <div class="ph-badge"><span>${pilotInitials(me.name)}</span><i class="ph-wings">${brandMark()}</i></div>
      <div class="ph-main">
        <small>Your pilot, synced with your simulator flights</small>
        <h1>${esc(me.name)}</h1>
        <p class="sub">${esc(me.rank)}, based at ${esc(apt(me.base).name)}</p>
        <div class="ph-types">${me.types.map(t => `<span class="dev-tag">${esc(acType(t).model)}</span>`).join('')}</div>
      </div>
      <div class="ph-stats">
        <div><small>Flight hours</small><b>${hours(me.hoursMin)}</b></div>
        <div><small>Landings</small><b>${num(me.landings)}</b></div>
        <div><small>Avg landing</small><b>${Math.round(avg)}<span> fpm</span></b></div>
        <div><small>Crashes on record</small><b>${State.logbook.filter(l => l.decision === 'registered').length}</b></div>
      </div>
    </div>
    <div class="tabs big">
      <button class="tab ${_pilotTab === 'crew' ? 'on' : ''}" data-act="pilot-tab" data-t="crew">Your crew<i>${crew.length}</i></button>
      <button class="tab ${_pilotTab === 'hire' ? 'on' : ''}" data-act="pilot-tab" data-t="hire">Hire pilots<i>${State.candidates.length}</i></button>
    </div>
    ${_pilotTab === 'crew' ? `
    <div class="crew-list">${crew.map((p, i) => {
      const f = State.live.filter(x => x.pilotId === p.id)[0];
      const route = State.routes.filter(r => r.pilotId === p.id)[0];
      return `<div class="crew-row" style="--i:${i}">
        <span class="avatar">${pilotInitials(p.name)}</span>
        <span class="cr-name"><b>${esc(p.name)}</b><small>${esc(p.rank)}, ${num(p.hoursMin / 60)} h, base ${esc(p.base)}</small></span>
        <span class="cr-now">${f ? `${statusChip('flying')}<small>${esc(f.callsign)} ${esc(f.from)} to ${esc(f.to)}, ${Math.round(f.t * 100)}%</small>` : `${statusChip(p.status)}<small>${route ? 'Next: ' + esc(route.code) : 'No route assigned'}</small>`}</span>
        <span class="cr-rules">${p.rules ? `<i>${p.rules.maxDutyHrs} h duty</i><i>${p.rules.maxLandingFpm} fpm limit</i>${p.rules.ifrOnly ? '<i>IFR only</i>' : '<i>VFR allowed</i>'}` : ''}</span>
        <span class="cr-btns">${f ? `<button class="btn ghost sm" data-act="watch-pilot" data-id="${f.id}">${icon('map')}Watch</button>` : ''}<button class="btn sm" data-act="pilot-rules" data-id="${p.id}">Assign</button></span>
      </div>`;
    }).join('') || emptyState('No pilots hired yet', 'Hire pilots to fly your other aircraft while you fly your own trips.', 'Hire pilots', 'pilot-hire')}</div>` : `
    <div class="cand-grid">${State.candidates.map((p, i) => `
      <div class="cand" style="--i:${i}">
        <span class="avatar lg">${pilotInitials(p.name)}</span>
        <b>${esc(p.name)}</b><small>${esc(p.rank)}, ${num(p.hoursMin / 60)} h, ${esc(apt(p.base).city)}</small>
        <div class="stars" aria-label="Rating ${p.rating} of 5">${'★'.repeat(Math.round(p.rating))}<span>${'★'.repeat(5 - Math.round(p.rating))}</span></div>
        <div class="ph-types">${p.types.map(t => `<span class="dev-tag">${esc(acType(t).model)}</span>`).join('')}</div>
        <div class="cand-foot"><span><small>Salary</small><b>${money(p.salary)}/wk</b></span><button class="btn primary sm" data-act="hire" data-id="${p.id}">Hire</button></div>
      </div>`).join('')}</div>`}`;
  },
};

ACTIONS['pilot-tab'] = el => { _pilotTab = el.getAttribute('data-t'); Sound.tick(); refresh(); };
ACTIONS['pilot-hire'] = () => { _pilotTab = 'hire'; refresh(); };
ACTIONS['watch-pilot'] = el => { const id = el.getAttribute('data-id'); go('map'); setTimeout(() => { selectFlight(id); const f = State.live.filter(x => x.id === id)[0]; if (_bigMap && f) _bigMap.fit([apt(f.from).pos, apt(f.to).pos], 90, true); }, 260); };
ACTIONS.hire = el => {
  const id = el.getAttribute('data-id');
  const p = State.candidates.filter(x => x.id === id)[0]; if (!p) return;
  State.candidates = State.candidates.filter(x => x.id !== id);
  p.status = 'standby'; p.base = company().hub;
  p.rules = { maxDutyHrs: 10, maxLandingFpm: 500, ifrOnly: true, homeBaseReturn: true };
  State.pilots.push(p);
  Haptics.pulse(); refresh(); toast(`${p.name} joined ${company().name}`, 'ok');
};

ACTIONS['pilot-rules'] = el => {
  const p = pilot(el.getAttribute('data-id')); if (!p) return;
  const r = p.rules || { maxDutyHrs: 10, maxLandingFpm: 500, ifrOnly: true, homeBaseReturn: true };
  const routes = State.routes.filter(x => x.companyId === State.companyId);
  openLayer('modal', `
    <div class="modal-head"><div><h2>Assign ${esc(p.name)}</h2><small>You can't fly your hired pilots' aircraft, but you decide where they go and the rules they follow.</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body">
      <h3>Route</h3>
      <div class="route-pick">${routes.map(rt => `<button class="rp ${rt.pilotId === p.id ? 'on' : ''}" data-act="rp-pick">${legChain(rt.legs)}<small>${esc(rt.code)}, ${esc(rt.days)}, ${esc(acType(rt.typeId).model)}</small></button>`).join('')}</div>
      <h3>Rules</h3>
      <div class="rules">
        <div class="range-row"><span><b>Max duty per day</b><small>Pilot rests once this is reached</small></span><input type="range" min="6" max="14" value="${r.maxDutyHrs}" oninput="this.nextElementSibling.textContent=this.value+' h'"><output>${r.maxDutyHrs} h</output></div>
        <div class="range-row"><span><b>Landing rate limit</b><small>Harder landings are reported to you</small></span><input type="range" min="200" max="800" step="50" value="${r.maxLandingFpm}" oninput="this.nextElementSibling.textContent=this.value+' fpm'"><output>${r.maxLandingFpm} fpm</output></div>
        <label class="tg-row"><span><b>IFR flights only</b></span>${toggle('r-ifr', r.ifrOnly)}</label>
        <label class="tg-row"><span><b>Return to base each night</b></span>${toggle('r-home', r.homeBaseReturn)}</label>
      </div>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn primary" data-act="rules-save">Save assignment</button></div>
    </div>`, { cls: 'wide' });
};
ACTIONS['rp-pick'] = el => { $all('.rp', el.parentElement).forEach(b => b.classList.remove('on')); el.classList.add('on'); Sound.tick(); };
ACTIONS['rules-save'] = () => { closeAll(); toast('Assignment saved', 'ok'); };
