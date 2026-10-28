// Schedule: your own legs for the day and a timeline of every aircraft's flights.

interface Block { reg: string; from: string; to: string; start: number; end: number; kind: 'flight' | 'maint'; you?: boolean; code?: string }

function scheduleBlocks(): Block[] {
  const out: Block[] = [];
  const c = company();
  const toMin = (s: string) => parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(3), 10);
  fleetOf().forEach((a, i) => {
    const t = acType(a.typeId);
    if (a.reg === State.myReg[c.id] && c.id === 'atn') {
      State.today.forEach(l => {
        const d = gcDistanceNm(apt(l.from).pos, apt(l.to).pos) / t.cruiseKt * 60 + 25;
        out.push({ reg: a.reg, from: l.from, to: l.to, start: toMin(l.dep), end: toMin(l.dep) + d, kind: 'flight', you: true });
      });
      return;
    }
    if (fleetState(a) === 'maint') {
      out.push({ reg: a.reg, from: a.location, to: a.location, start: 6 * 60, end: 22 * 60, kind: 'maint' });
      return;
    }
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

SCREENS.schedule = {
  title: 'Schedule', icon: 'clock',
  render() {
    const c = company();
    const legs = c.id === 'atn' ? State.today : [];
    const blocks = scheduleBlocks();
    const fl = fleetOf();
    const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
    const pct = (m: number) => (clamp(m, 0, 1440) / 1440 * 100).toFixed(2) + '%';
    return `
    <div class="screen-head"><div><h1>Schedule</h1><p class="sub">Today, ${fl.length} aircraft</p></div>
      <button class="btn primary" data-act="new-route">${icon('plus')}New route</button></div>
    ${legs.length ? `<div class="card day-card">
      <div class="card-h"><b>Your day in ${esc(State.myReg[c.id])}</b><small>${legs.length} legs, you fly one aircraft at a time</small></div>
      <div class="day-track">${legs.map((l, i) => `<div class="day-leg ${l.status}" style="--i:${i}">
        <time>${esc(l.dep)}</time><span class="dl-r"><b>${esc(l.from)}</b><i></i><b>${esc(l.to)}</b></span>
        <small>${l.status === 'done' ? 'Landed' : l.status === 'active' ? 'Flying now' : l.status === 'next' ? 'Next' : 'Planned'}</small></div>`).join('')}</div>
    </div>` : ''}
    <div class="card gantt">
      <div class="g-axis"><span></span><div class="g-hours">${[0, 3, 6, 9, 12, 15, 18, 21].map(h => `<i style="left:${pct(h * 60)}">${h < 10 ? '0' : ''}${h}:00</i>`).join('')}</div></div>
      ${fl.map((a, i) => `<div class="g-row" style="--i:${i}">
        <span class="g-reg st-${fleetState(a)}"><i class="fs-led"></i><b>${esc(a.reg)}</b><small>${esc(acType(a.typeId).model)}</small></span>
        <div class="g-lane">${blocks.filter(b => b.reg === a.reg).map(b => `<span class="g-blk ${b.kind} ${b.you ? 'you' : ''} ${b.end < nowMin ? 'past' : ''}" style="left:${pct(b.start)};width:calc(${pct(b.end)} - ${pct(b.start)})" title="${esc(b.from)} to ${esc(b.to)}">${b.kind === 'maint' ? 'Maintenance' : esc(b.from) + '–' + esc(b.to)}</span>`).join('')}</div>
      </div>`).join('')}
      <div class="g-now" style="left:calc(var(--g-label) + (100% - var(--g-label)) * ${(nowMin / 1440).toFixed(4)})"><i>${now.getHours() < 10 ? '0' : ''}${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}</i></div>
    </div>`;
  },
};
