// Layered windows: pop-ups, the notification drawer, the company switcher and toasts.

const _layers: HTMLElement[] = [];

function openLayer(kind: 'modal' | 'drawer' | 'pop', html: string, opts?: { cls?: string; onClose?: () => void; anchor?: HTMLElement }): HTMLElement {
  const root = $('#overlay-root');
  const wrap = document.createElement('div');
  wrap.className = `layer layer-${kind} ${opts && opts.cls ? opts.cls : ''}`;
  wrap.innerHTML = `<div class="scrim" data-act="close-layer"></div><div class="panel" role="dialog" aria-modal="true">${html}</div>`;
  (wrap as any)._onClose = opts && opts.onClose;
  if (opts && opts.anchor && kind === 'pop') {
    const r = opts.anchor.getBoundingClientRect();
    const p = wrap.querySelector('.panel') as HTMLElement;
    p.style.left = Math.max(8, r.left) + 'px'; p.style.top = (r.bottom + 6) + 'px';
  }
  root.appendChild(wrap);
  _layers.push(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
  return wrap;
}

function closeTop() {
  const w = _layers.pop(); if (!w) return;
  w.classList.remove('open'); w.classList.add('closing');
  if ((w as any)._onClose) (w as any)._onClose();
  setTimeout(() => w.remove(), reducedMotion() ? 0 : 260);
}
function closeAll() { while (_layers.length) closeTop(); }

ACTIONS['close-layer'] = () => { Sound.tick(); closeTop(); };

function toast(msg: string, kind?: 'ok' | 'warn' | 'info', action?: { label: string; act: string; data?: string }) {
  // one toast at a time: a new one replaces any still showing (they share the same spot)
  document.querySelectorAll('.toast').forEach(o => { o.classList.remove('show'); setTimeout(() => o.remove(), 300); });
  const t = document.createElement('div');
  t.className = 'toast toast-' + (kind || 'info') + (action ? ' has-act' : '');
  t.innerHTML = `${icon(kind === 'warn' ? 'alert' : kind === 'info' && action ? 'fleet' : 'check')}<span>${esc(msg)}</span>${action
    ? `<button class="toast-act" data-act="${action.act}" data-id="${esc(action.data || '')}">${esc(action.label)}${icon('chevron')}</button>` : ''}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, action ? 6000 : 2600);
}

/* ---------- Company switcher ---------- */
ACTIONS.switcher = el => {
  Sound.tick();
  const shared = State.settings.appMode === 'shared';
  const rows = State.profiles.map(pr => {
    const pl = pilot(pr.pilotId);
    const cos = State.companies.filter(c => c.profileId === pr.id);
    return `<div class="sw-group">
      <div class="sw-pilot">${icon('user')}<span><b>${esc(pl.name)}</b><small>${esc(pr.label)}, ${hours(pl.hoursMin)} h</small></span></div>
      ${cos.map(c => `
        <button class="sw-co ${c.id === State.companyId ? 'on' : ''}" data-act="pick-company" data-co="${c.id}">
          <span class="co-badge" style="--co:${c.color};--co2:${c.color2}">${esc(c.icao)}</span>
          <span class="sw-co-t"><b>${esc(c.name)}</b><small>${c.kind === 'bush' ? 'Bush operation' : c.kind === 'regional' ? 'Regional and cargo' : 'Airline'}, hub ${esc(c.hub)}, ${State.fleet.filter(a => a.companyId === c.id).length} aircraft</small></span>
          <span class="sw-bal">${money(c.balance, { compact: true })}</span>
        </button>
        ${c.id === State.companyId && c.divisions.length ? `<div class="sw-divs">
          <button class="div-chip ${State.divisionId === 'all' ? 'on' : ''}" data-act="pick-division" data-div="all">All divisions</button>
          ${c.divisions.map(d => `<button class="div-chip ${State.divisionId === d.id ? 'on' : ''}" data-act="pick-division" data-div="${d.id}" style="--dc:${d.color}">${esc(d.name)}</button>`).join('')}
        </div>` : ''}`).join('')}
    </div>`;
  }).join('');
  openLayer('pop', `
    <div class="sw-head"><b>Companies</b><small>${shared ? 'Profiles can run several companies side by side' : 'Each company has its own pilot profile'}</small></div>
    <div class="sw-list">${rows}</div>
    <div class="sw-foot">
      <button class="btn ghost" data-act="new-company">${icon('plus')}New company</button>
      <button class="btn ghost" data-act="settings" data-section="profiles">${icon('sliders')}Profiles and divisions</button>
    </div>`, { cls: 'switcher', anchor: el });
};

ACTIONS['pick-company'] = el => {
  const id = el.getAttribute('data-co');
  closeAll();
  if (id === State.companyId) return;
  Sound.tick(); Haptics.pulse();
  State.companyId = id; State.divisionId = 'all';
  applyCompanyTheme(true);
  go(State.screen);
  renderTopbar();
  toast(`Switched to ${company().name}`, 'ok');
};
ACTIONS['pick-division'] = el => {
  State.divisionId = el.getAttribute('data-div');
  Sound.tick(); closeAll(); refresh();
};
ACTIONS['new-company'] = () => {
  closeAll();
  openLayer('modal', `
    <div class="modal-head"><h2>Start a new company</h2><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body new-co">
      <p class="lede">Pick what kind of operation you want to run. You can mix aircraft sizes later, or keep them in separate companies.</p>
      <div class="choice-grid">
        ${[['major', 'Airline', 'Jets and turboprops on scheduled routes, IFR.', 'a320neo'],
           ['regional', 'Regional and cargo', 'Smaller jets and turboprops, short hops.', 'crj7-aero'],
           ['bush', 'Bush outfit', 'Floatplanes and STOL aircraft, VFR and IFR.', 'dhc2']].map(k => `
          <button class="choice" data-act="create-company" data-kind="${k[0]}">
            <div class="choice-art">${aircraftArt(k[3], { color: '#3FD0E8', color2: '#0D3A4A', ground: false })}</div>
            <b>${k[1]}</b><small>${k[2]}</small></button>`).join('')}
      </div>
      <div class="field-row">
        <label class="tg-row"><span><b>Use my main pilot</b><small>Turn off to create a separate pilot profile for this company</small></span>${toggle('nc-pilot', true)}</label>
        <label class="tg-row"><span><b>Add as a division</b><small>Shares money and reputation with ${esc(company().name)}</small></span>${toggle('nc-div', false)}</label>
      </div>
    </div>`, { cls: 'wide' });
};

function applyCompanyTheme(animate?: boolean) {
  const c = company();
  const r = document.documentElement;
  if (animate && !reducedMotion()) { r.classList.add('co-swap'); setTimeout(() => r.classList.remove('co-swap'), 700); }
  r.style.setProperty('--co', c.color);
  r.style.setProperty('--co2', c.color2);
}

/* ---------- Notification inbox ---------- */
const NOTICE_META: { [k: string]: { label: string; icon: string } } = {
  mechanic: { label: 'Mechanic', icon: 'wrench' }, authority: { label: 'Aviation authority', icon: 'shield' },
  flight: { label: 'Flights', icon: 'land' }, finance: { label: 'Finance', icon: 'finance' },
  pilot: { label: 'Pilots', icon: 'pilots' }, company: { label: 'Company', icon: 'info' },
  staff: { label: 'Staff', icon: 'user' }, birthday: { label: 'Birthday', icon: 'info' },
};
let _inboxTab = 'all';

function inboxHtml(): string {
  const tabs = ['all', 'mechanic', 'staff', 'authority', 'flight', 'pilot', 'finance'];
  const list = State.notices.filter(n => _inboxTab === 'all' || n.kind === _inboxTab);
  return `
    <div class="drawer-head"><h2>Notifications</h2>
      <button class="text-btn" data-act="mark-read">Mark all read</button>
      <button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="tabs" role="tablist">${tabs.map(t => {
      const n = State.notices.filter(x => !x.read && (t === 'all' || x.kind === t)).length;
      return `<button class="tab ${_inboxTab === t ? 'on' : ''}" data-act="inbox-tab" data-tab="${t}">${t === 'all' ? 'All' : NOTICE_META[t].label}${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('')}</div>
    <div class="notice-list">${list.length ? list.map(n => `
      <button class="notice ${n.read ? '' : 'unread'} k-${n.kind}" data-act="open-notice" data-id="${n.id}">
        <span class="n-ic">${icon(NOTICE_META[n.kind].icon)}</span>
        <span class="n-t"><b>${esc(n.title)}</b><small>${esc(n.body)}</small></span>
        <span class="n-time">${esc(n.time)}${n.kind === 'pilot' && n.ref && State.live.some(f => f.id === n.ref) ? `<i class="n-map">${icon('pin')}Map</i>` : ''}</span>
      </button>`).join('') : emptyState('Nothing here', 'New messages from your mechanic, pilots and the authorities show up here.')}</div>`;
}

ACTIONS.inbox = () => { Sound.tick(); openLayer('drawer', inboxHtml(), { cls: 'inbox' }); };
ACTIONS['inbox-tab'] = el => { _inboxTab = el.getAttribute('data-tab'); Sound.tick(); rerenderInbox(); };
ACTIONS['mark-read'] = () => { State.notices.forEach(n => n.read = true); rerenderInbox(); renderTopbar(); };
function rerenderInbox() { const p = $('.layer-drawer.inbox .panel'); if (p) p.innerHTML = inboxHtml(); }

ACTIONS['open-notice'] = el => {
  const n = State.notices.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!n) return;
  n.read = true; rerenderInbox(); renderTopbar(); Sound.tick();
  if (n.kind === 'mechanic' && n.ref) mechanicPopup(n.ref);
  else if (n.kind === 'authority' && n.ref) finePopup(n.ref);
  else if (n.kind === 'flight' && n.ref) crashPopup(n.ref);
  else if (n.kind === 'pilot' && n.ref && State.live.some(f => f.id === n.ref)) showFlightOnMap(n.ref);
  else if (n.kind === 'staff' && n.ref) incidentPopup(n.ref);
  else if (n.kind === 'birthday') ACTIONS['bday-preview'](null, null);
  else openLayer('modal', `<div class="modal-head"><h2>${esc(n.title)}</h2><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div><div class="modal-body"><p class="lede">${esc(n.body)}</p></div>`, { cls: 'narrow' });
};

/* ---------- Mechanic pop-up ---------- */
function mechanicLines(issue: Issue): string {
  const a = plane(issue.reg), t = acType(a.typeId);
  const start = issue.severity === 'grounding'
    ? `I've had a proper look at ${spellReg(issue.reg)}, your ${t.maker} ${t.model}. I'm afraid she's not going anywhere for now.`
    : `Quick word about ${spellReg(issue.reg)}, the ${t.model}.`;
  const mid = `${issue.title}. ${issue.detail}`;
  const end = issue.severity === 'grounding'
    ? `It's about ${issue.days} days in the hangar and roughly ${money(issue.cost)}. Your call, but she stays grounded until it's done.`
    : issue.days ? `I'd want her for about ${issue.days} day${issue.days > 1 ? 's' : ''}, roughly ${money(issue.cost)}. We can do it now, or I'll pencil it in for later.`
      : `It's a quick job overnight, about ${money(issue.cost)}. Fix it now or leave it for later, up to you.`;
  return start + ' ' + mid + ' ' + end;
}
function spellReg(reg: string): string { return reg.replace('-', ' '); }

function mechanicPopup(issueId: string) {
  const issue = State.issues.filter(i => i.id === issueId)[0]; if (!issue) return;
  const a = plane(issue.reg), t = acType(a.typeId), c = company(a.companyId);
  const related = State.issues.filter(i => i.reg === issue.reg && i.status !== 'fixed');
  const speech = mechanicLines(issue);
  const wrap = openLayer('modal', `
    <div class="mech">
      <div class="mech-side">
        <div class="mech-avatar"><span>JH</span><i class="mech-ring"></i></div>
        <b>Jónas Hansen</b><small>Line maintenance, ${esc(a.base)}</small>
        <button class="voice-btn" data-act="mech-voice" aria-label="Play the mechanic's message">
          <span class="vb-ic">${icon('play')}</span>
          <span class="wave">${'<i></i>'.repeat(14)}</span>
        </button>
        <small class="voice-note">${State.settings.muteAll ? 'All sounds are muted' : State.settings.mechanicVoice ? 'Voice: ' + (State.settings.voiceEngine === 'neural' ? 'neural voice pack' : 'recorded lines') : 'Voice is off in Settings'}</small>
      </div>
      <div class="mech-main">
        <div class="modal-head"><h2>${esc(issue.reg)}: ${esc(issue.title)}</h2><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
        <div class="mech-plane">${aircraftArt(a.typeId, { color: c.color, color2: c.color2, reg: a.reg })}${issue.severity === 'grounding' ? '<span class="ground-stamp">Grounded</span>' : ''}</div>
        <p class="speech">${esc(speech)}</p>
        <div class="issue-list">${related.map(i => `
          <div class="issue-row ${i.id === issue.id ? 'cur' : ''}">
            ${statusChip(i.severity)}<b>${esc(i.title)}</b><small>${esc(i.source)}</small>
            <span class="ir-cost">${money(i.cost)}</span><span class="ir-days">${i.days ? i.days + ' d' : 'Overnight'}</span>
          </div>`).join('')}</div>
        <div class="modal-actions">
          <button class="btn ghost" data-act="fix-later" data-id="${issue.id}">Fix later</button>
          <button class="btn danger" data-act="fix-now" data-id="${issue.id}">${icon('wrench')}Pay ${money(issue.cost)} and fix now</button>
        </div>
        ${issue.severity === 'grounding' ? `<p class="fine-print">${icon('alert')}Grounding damage: ${esc(issue.reg)} can't be flown until this is repaired.</p>` : ''}
      </div>
    </div>`, { cls: 'wide mech-pop', onClose: () => Voice.stop() });
  (wrap as any)._speech = speech;
  if (State.settings.mechanicVoice && !State.settings.muteAll) setTimeout(() => { if (wrap.isConnected) ACTIONS['mech-voice']($('.voice-btn', wrap), null); }, 650);
}

ACTIONS['mech-voice'] = el => {
  const wrap = el.closest('.layer') as any;
  if (Voice.speaking) { Voice.stop(); el.classList.remove('on'); el.querySelector('.vb-ic').innerHTML = icon('play'); return; }
  el.classList.add('on'); el.querySelector('.vb-ic').innerHTML = icon('stop');
  const ok = Voice.speak(wrap._speech, () => { el.classList.remove('on'); el.querySelector('.vb-ic').innerHTML = icon('play'); });
  if (!ok) { setTimeout(() => { el.classList.remove('on'); el.querySelector('.vb-ic').innerHTML = icon('play'); }, 4000); }
};

ACTIONS['fix-now'] = el => {
  const i = State.issues.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!i) return;
  const a = plane(i.reg), c = company(a.companyId);
  const from = c.balance; c.balance -= i.cost;
  i.status = i.days ? 'scheduled' : 'fixed';
  if (i.severity === 'grounding' || i.days) a.status = 'maintenance';
  if (!State.issues.some(x => x.reg === i.reg && x.status === 'open' && x.severity === 'grounding') && a.status === 'grounded') a.status = 'maintenance';
  State.txns.unshift({ id: uid(), companyId: a.companyId, date: '2026-10-28', time: new Date().toTimeString().slice(0, 5), label: `Repair: ${i.title} (${i.reg})`, amount: -i.cost, kind: 'maint', reg: i.reg,
    lines: [['Labour', -Math.round(i.cost * 0.45)], ['Parts', -Math.round(i.cost * 0.55)]], note: i.detail, link: { kind: 'aircraft', id: i.reg } });
  Voice.stop(); closeAll(); Sound.payOut(); Haptics.pulse(30); refresh(); animateBalance(from, c.balance);
  toast(i.days ? `${i.reg} is in the hangar, back in ${i.days} d` : `${i.title} fixed on ${i.reg}`, 'ok');
};
ACTIONS['fix-later'] = el => {
  const i = State.issues.filter(x => x.id === el.getAttribute('data-id'))[0];
  Voice.stop(); closeAll(); refresh();
  toast(i && i.severity === 'grounding' ? `${i.reg} stays grounded until it's repaired` : 'Saved to maintenance for later', i && i.severity === 'grounding' ? 'warn' : 'info');
};

/* ---------- Aviation authority fine ---------- */
function finePopup(ref: string) {
  const f = State.fines[ref]; if (!f) return;
  openLayer('modal', `
    <div class="modal-head authority"><span class="auth-seal">${icon('shield')}</span><div><h2>${esc(f.title)}</h2><small>${esc(f.authority)}, flight ${esc(f.flight)} (${esc(f.reg)}), ${esc(f.airport)} runway ${esc(f.runway)}</small></div>
      <button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body fine">
      <div class="fine-amt"><small>Fine</small><b>${money(f.amount)}</b></div>
      <div class="transcript"><small class="tr-h">ATC transcript (${State.settings.atcSource === 'beyondatc' ? 'BeyondATC audio' : 'built-in ATC'})</small>
        ${f.transcript.map((l: any) => `<div class="tr-line w-${l.who.toLowerCase()}"><time>${esc(l.t)}</time><b>${esc(l.who === 'SYS' ? 'Detected' : l.who)}</b><span>${esc(l.text)}</span></div>`).join('')}
      </div>
      <p class="fine-print">${icon('info')}If the transcript is wrong, contest the fine and it's removed from your record.</p>
      <div class="modal-actions">
        <button class="btn ghost" data-act="fine-contest" data-ref="${ref}">Contest</button>
        <button class="btn danger" data-act="fine-pay" data-ref="${ref}">Accept and pay ${money(f.amount)}</button>
      </div>
    </div>`, { cls: 'narrow' });
}
ACTIONS['fine-pay'] = el => {
  const ref = el.getAttribute('data-ref'); const f = State.fines[ref]; if (!f) return;
  const c = company(), from = c.balance;
  c.balance -= f.amount;
  State.txns.unshift({ id: uid(), companyId: c.id, date: '2026-10-28', time: new Date().toTimeString().slice(0, 5), label: `Fine: ${f.title.toLowerCase()} (${f.flight})`, amount: -f.amount, kind: 'fine', reg: f.reg, flight: f.flight,
    route: f.airport + ' runway ' + f.runway, lines: [[f.authority, -f.amount]] });
  delete State.fines[ref];
  State.notices = State.notices.filter(n => n.ref !== ref);
  closeAll(); Sound.payOut(); Haptics.pulse(40); refresh(); animateBalance(from, c.balance);
  toast(`Fine paid: ${money(f.amount)}`, 'warn');
};
ACTIONS['fine-contest'] = el => {
  const ref = el.getAttribute('data-ref');
  delete State.fines[ref];
  State.notices = State.notices.filter(n => n.ref !== ref);
  closeAll(); Sound.tick(); refresh();
  toast('Fine contested and removed from your record', 'ok');
};

/* ---------- Crash: register or disregard ---------- */
function crashPopup(logId: string) {
  const l = State.logbook.filter(x => x.id === logId)[0]; if (!l) return;
  const a = plane(l.reg), c = company(a.companyId);
  openLayer('modal', `
    <div class="modal-head crash"><span class="crash-ic">${icon('alert')}</span><div><h2>Crash detected</h2><small>${esc(l.from)} to ${esc(l.to)}, ${esc(l.reg)}, ${esc(l.date)}</small></div>
      <button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body">
      <div class="crash-art">${aircraftArt(a.typeId, { color: c.color, color2: c.color2, reg: a.reg })}</div>
      <div class="kv-row">
        <div><small>Vertical speed</small><b class="red">${num(l.landingFpm)} fpm</b></div>
        <div><small>Impact load</small><b class="red">${l.g.toFixed(1)} g</b></div>
        <div><small>Passengers</small><b>${l.pax}</b></div>
        <div><small>Cause</small><b>${esc(l.notes || 'Impact')}</b></div>
      </div>
      <div class="decide">
        <button class="decide-card bad" data-act="crash-decide" data-id="${l.id}" data-d="registered">
          <b>Register crash</b><small>Goes on your record. Insurance covers part of the repair, reputation drops and ${esc(l.reg)} is out of service.</small></button>
        <button class="decide-card" data-act="crash-decide" data-id="${l.id}" data-d="disregarded">
          <b>Disregard</b><small>As if it never happened. The flight is voided, so it earns no hours or pay.</small></button>
      </div>
    </div>`, { cls: 'wide' });
}
ACTIONS['crash-decide'] = el => {
  const l = State.logbook.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!l) return;
  l.decision = el.getAttribute('data-d') as any;
  const a = plane(l.reg);
  if (l.decision === 'registered') {
    a.status = 'grounded'; a.condition = 12;
    State.issues.unshift({ id: uid(), reg: a.reg, title: 'Crash damage', detail: 'Airframe damaged in the crash. Major structural repair needed before the next flight.', source: 'Crash registered by you', severity: 'grounding', cost: 410000, days: 9, status: 'open', date: '2026-10-28' });
    company(a.companyId).reputation -= 6;
  }
  State.notices = State.notices.filter(n => n.ref !== l.id);
  closeAll(); Haptics.pulse(30); refresh();
  toast(l.decision === 'registered' ? 'Crash registered. The mechanic has opened a repair job.' : 'Crash disregarded. Flight voided.', l.decision === 'registered' ? 'warn' : 'ok');
};

/* ---------- Toggle markup (shared with Settings) ---------- */
function toggle(key: string, on: boolean): string {
  return `<button class="tg ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="toggle" data-key="${key}"><i></i></button>`;
}

ACTIONS['create-company'] = el => {
  const kind = el.getAttribute('data-kind') as any;
  const ownPilot = !($('.tg[data-key=nc-pilot]') && !$('.tg[data-key=nc-pilot]').classList.contains('on'));
  const asDivision = !!($('.tg[data-key=nc-div]') && $('.tg[data-key=nc-div]').classList.contains('on'));
  const cur = company();
  closeAll();
  if (asDivision) {
    cur.divisions.push({ id: uid(), name: kind === 'bush' ? 'Bush' : kind === 'regional' ? 'Regional' : 'Division ' + (cur.divisions.length + 1), color: '#5FD4A0' });
    Store.save(); renderTopbar(); toast(`New division added to ${cur.name}`, 'ok'); return;
  }
  const make = (profileId: string) => {
    const names: any = { major: ['Northern Lights Air', 'NLA', '#3FB6A8'], regional: ['Fjord Regional', 'FJR', '#E2A23B'], bush: ['Tundra Wings', 'TWG', '#D2553A'] };
    const n = names[kind] || names.major;
    const id = uid();
    State.companies.push({ id, profileId, name: n[0], icao: n[1], callsign: n[0].split(' ')[0].toUpperCase(), hub: kind === 'bush' ? 'PALH' : 'EKVG', color: n[2], color2: '#1A2433',
      balance: kind === 'bush' ? 1500000 : 25000000, reputation: 50, founded: '2026-10-28', kind, divisions: [] } as any);
    (State as any).coPilot[id] = { sex: 'f', id: '' };
    State.companyId = id; State.divisionId = 'all';
    applyCompanyTheme(true); Store.save(); go('ops'); renderTopbar();
    toast(`${n[0]} founded. Buy your first aircraft and hire a mechanic to start flying.`, 'ok');
  };
  if (ownPilot) { make(profileOfCompany(cur.id).id); return; }
  // a separate pilot profile: create the pilot first
  const look = defaultLook('m', 'captain');
  openLookEditor({ title: 'Create your pilot', role: 'captain', look, identity: { name: 'Capt. New Pilot', dob: '1990-06-15', nat: 'FO' },
    onAccept: (lk, idt) => {
      const pid = 'you-' + uid(), prid = 'p-' + uid();
      State.pilots.push({ id: pid, name: idt.name, rank: 'Captain', hoursMin: 0, landings: 0, base: kind === 'bush' ? 'PALH' : 'EKVG', you: true, profileId: prid, status: 'standby', types: [], rating: 4,
        sex: lk.sex, look: lk, dob: idt.dob, nat: idt.nat, lookAccepted: true } as any);
      State.profiles.push({ id: prid, pilotId: pid, label: 'Profile ' + (State.profiles.length + 1) });
      make(prid);
    } });
};
