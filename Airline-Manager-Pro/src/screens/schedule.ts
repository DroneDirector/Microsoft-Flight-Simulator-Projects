// Schedule: your own legs for the day and a timeline of every aircraft's flights.

interface Block { reg: string; from: string; to: string; start: number; end: number; kind: 'flight' | 'maint'; you?: boolean; code?: string }

function scheduleBlocks(): Block[] {
  const out: Block[] = [];
  const c = company();
  const toMin = (s: string) => parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(3), 10);
  fleetOf().forEach((a, i) => {
    const t = acType(a.typeId);
    if (a.reg === State.myReg[c.id] && State.today.length) {
      State.today.forEach(l => {
        // flown legs use their real block time; others the real-world estimate for this aircraft and route
        const L: any = l, d = L.blockMin || (l.to && apt(l.to) ? flightProfile(a.typeId, l.from, l.to).totalS / 60 : 60);
        out.push({ reg: a.reg, from: l.from, to: l.to || '?', start: toMin(l.dep), end: toMin(l.dep) + d, kind: 'flight', you: true });
      });
      return;
    }
    if (fleetState(a) === 'maint') {
      out.push({ reg: a.reg, from: a.location, to: a.location, start: 6 * 60, end: 22 * 60, kind: 'maint' });
      return;
    }
    // hired pilots: the day as they really fly it (see ai-sim.ts)
    const ai = aiDayBlocks(a.reg);
    if (ai.length) { ai.forEach(b => out.push({ reg: a.reg, from: b.from, to: b.to, start: b.start, end: b.end, kind: 'flight' })); return; }
    const rt = State.routes.filter(r => r.typeId === a.typeId && r.companyId === c.id)[0];
    const legs = rt ? rt.legs : [a.base, a.base];
    let tm = 5 * 60 + (i * 47) % 180;
    for (let k = 0; k < 6 && tm < 22 * 60; k++) {
      const from = legs[k % (legs.length - 1)] || legs[0], to = legs[(k % (legs.length - 1)) + 1] || legs[1];
      const d = Math.max(gcDistanceNm(apt(from).pos, apt(to).pos) / t.cruiseKt * 60 + 25, 40);
      out.push({ reg: a.reg, from, to, start: tm, end: tm + d, kind: 'flight', code: rt ? rt.code : '' });
      tm += d + 50 + (k * 13) % 40;
    }
  });
  return out;
}

// The aircraft whose day is shown at the top: your own by default, or any aircraft tapped in the timeline.
let _schedReg = '';
function schedSelected(): string {
  const fl = fleetOf();
  if (_schedReg && fl.some(a => a.reg === _schedReg)) return _schedReg;
  const mine = State.myReg[State.companyId];
  return fl.some(a => a.reg === mine) ? mine : (fl[0] ? fl[0].reg : '');
}

/** The day for the selected aircraft: past legs, the leg in progress (with how far it has got) and the ones still to come. */
function scheduleDayCard(blocks: Block[], nowMin: number): string {
  const reg = schedSelected(); if (!reg) return '';
  const a = plane(reg), t = acType(a.typeId), mine = reg === State.myReg[State.companyId];
  const hm = (m: number) => { m = Math.round(m) % 1440; const h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; };
  const live = State.live.filter(f => f.reg === reg)[0];
  const route = State.routes.filter(r => r.companyId === a.companyId && r.typeId === a.typeId)[0];
  const who = live ? pilot(live.pilotId) : route && route.pilotId ? pilot(route.pilotId) : null;
  const mineLegs = mine && State.today.length;
  const mb = blocks.filter(b => b.reg === reg).sort((x, y) => x.start - y.start);
  let nextSet = false;
  const legs = mb.map((b, i) => {
    let st: string, prog = 0;
    if (mineLegs && State.today[i]) st = State.today[i].status;
    else if (b.kind === 'maint') st = nowMin >= b.start && nowMin <= b.end ? 'active' : nowMin > b.end ? 'done' : 'planned';
    else st = b.end < nowMin ? 'done' : b.start <= nowMin ? 'active' : 'planned';
    if (st === 'active') {
      prog = live && live.from === b.from && live.to === b.to ? live.t : clamp((nowMin - b.start) / ((b.end - b.start) || 1), 0, 1);
    }
    if (st === 'next') nextSet = true;
    return { b, st, prog };
  });
  if (!nextSet) { const n = legs.filter(l => l.st === 'planned')[0]; if (n) n.st = 'next'; }
  const title = mine ? `Your day in ${esc(reg)}` : `${esc(reg)} today`;
  const sub = `${esc(t.model)}${who ? ', flown by ' + esc(who.name) : ''}, ${legs.length} ${legs.length === 1 ? 'leg' : 'legs'}`;
  return `<div class="card day-card">
      <div class="card-h"><b>${title}</b><small>${sub}</small><button class="text-btn" data-act="show-aircraft" data-reg="${esc(reg)}">${icon('map')}Show on map</button></div>
      ${legs.length ? `<div class="day-track">${legs.map((l, i) => `<div class="day-leg ${l.st}" style="--i:${i}">
        <time>${hm(l.b.start)}</time><span class="dl-r">${l.b.kind === 'maint' ? `<b>Maintenance at ${esc(l.b.from)}</b>` : `<b>${esc(l.b.from)}</b><i>${l.st === 'active' ? `<em class="dl-prog" style="width:${(l.prog * 100).toFixed(1)}%"></em>` : ''}</i><b>${esc(l.b.to)}</b>`}</span>
        <small>${l.st === 'done' ? 'Landed' : l.st === 'active' ? (l.b.kind === 'maint' ? 'In the hangar' : 'Flying now') : l.st === 'next' ? 'Next' : 'Planned'}</small></div>`).join('')}</div>`
      : `<p class="muted">No flights planned for ${esc(reg)} today.</p>`}
    </div>`;
}

function schedRepaintDay() {
  const card = $('.day-card'), html = scheduleDayCard(scheduleBlocks(), new Date().getHours() * 60 + new Date().getMinutes());
  if (card && html) { const d = document.createElement('div'); d.innerHTML = html.trim(); const n = d.firstElementChild as HTMLElement; n.style.animation = 'none'; n.querySelectorAll('.day-leg').forEach((x: any) => x.style.animation = 'none'); card.replaceWith(n); }
}
ACTIONS['sched-pick'] = el => {
  const reg = el.getAttribute('data-reg'); if (!reg) return;
  _schedReg = reg; Sound.tick();
  const card = $('.day-card'), html = scheduleDayCard(scheduleBlocks(), new Date().getHours() * 60 + new Date().getMinutes());
  if (card) { const d = document.createElement('div'); d.innerHTML = html.trim(); card.replaceWith(d.firstElementChild); }
  else refresh();
  $all('.g-row').forEach(r => r.classList.toggle('sel', r.getAttribute('data-reg') === reg));
};

SCREENS.schedule = {
  title: 'Schedule', icon: 'clock',
  mount(root: HTMLElement) {
    const iv = setInterval(() => { if (!root.isConnected) { clearInterval(iv); return; } if (!document.hidden) schedRepaintDay(); }, 5000);
  },
  render() {
    const c = company();
    const blocks = scheduleBlocks();
    const fl = fleetOf();
    const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
    const pct = (m: number) => (clamp(m, 0, 1440) / 1440 * 100).toFixed(2) + '%';
    return `
    <div class="screen-head"><div><h1>Schedule</h1><p class="sub">Today, ${fl.length} aircraft</p></div>
      <button class="btn primary" data-act="new-route">${icon('plus')}New route</button></div>
    ${scheduleDayCard(blocks, nowMin)}
    <div class="card gantt">
      <div class="g-axis"><span></span><div class="g-hours">${[0, 3, 6, 9, 12, 15, 18, 21].map(h => `<i style="left:${pct(h * 60)}">${h < 10 ? '0' : ''}${h}:00</i>`).join('')}</div></div>
      ${fl.map((a, i) => `<div class="g-row ${a.reg === schedSelected() ? 'sel' : ''}" style="--i:${i}" data-act="sched-pick" data-reg="${esc(a.reg)}" role="button" aria-label="Show the day for ${esc(a.reg)}">
        <span class="g-reg st-${fleetState(a)}"><i class="fs-led"></i><b>${esc(a.reg)}</b><small>${esc(acType(a.typeId).model)}</small></span>
        <div class="g-lane">${blocks.filter(b => b.reg === a.reg).map(b => `<span class="g-blk ${b.kind} ${b.you ? 'you' : ''} ${b.end < nowMin ? 'past' : ''}" style="left:${pct(b.start)};width:calc(${pct(b.end)} - ${pct(b.start)})" title="${esc(b.from)} to ${esc(b.to)}">${b.kind === 'maint' ? 'Maintenance' : esc(b.from) + '–' + esc(b.to)}</span>`).join('')}</div>
      </div>`).join('')}
      <div class="g-now" style="left:calc(var(--g-label) + (100% - var(--g-label)) * ${(nowMin / 1440).toFixed(4)})"><i>${now.getHours() < 10 ? '0' : ''}${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}</i></div>
    </div>`;
  },
};
