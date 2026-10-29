// Ranking: your rank and rating as a pilot, the airline's rank and popularity, and every badge,
// earned and still to earn.

let _rkGroup = 'all', _rkShowAll = false;

SCREENS.ranking = {
  title: 'Ranking', icon: 'trophy',
  render() {
    const S: any = State, c = company(), me: any = myPilot();
    const st = Progress.compute();
    const pxp = Progress.pilotXp(st), axp = Progress.airlineXp(st);
    const pr = Progress.rankOf(pxp, PILOT_RANKS), ar = Progress.rankOf(axp, AIRLINE_RANKS);
    const defs = badgeDefs(), earned = S.badges || {};
    const nEarned = defs.filter(b => earned[b.id]).length;
    const pop = Math.round(c.reputation || 0);
    const bar = (xp: number, r: any) => { const p = r.to > r.from ? clamp((xp - r.from) / (r.to - r.from), 0, 1) : 1; return `<span class="rk-bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span><small>${num(xp)} XP${r.to > r.from ? ` · ${num(r.to - xp)} to the next rank` : ' · highest rank'}</small>`; };
    const stars = (v: number) => `<span class="rk-stars" aria-label="Rating ${v.toFixed(1)} of 5">${[1, 2, 3, 4, 5].map(i => `<i class="${v >= i - 0.25 ? 'on' : v >= i - 0.75 ? 'half' : ''}">${icon('star')}</i>`).join('')}<b>${v.toFixed(1)}</b></span>`;
    const log = (S.popLog || []).filter((x: any) => x.cid === c.id).slice(0, 5);
    // badges: earned ones, plus the next step of every ladder (or everything when asked)
    const groups = [['all', 'All'], ['pilot', 'Pilot'], ['airline', 'Airline'], ['crew', 'Crew']];
    let list = defs.filter(b => _rkGroup === 'all' || b.group === _rkGroup);
    if (!_rkShowAll) { const seen: { [m: string]: boolean } = {}; list = list.filter(b => { if (earned[b.id]) return true; if (seen[b.metric]) return false; seen[b.metric] = true; return true; }); }
    list = list.slice().sort((a, b) => (earned[b.id] ? 1 : 0) - (earned[a.id] ? 1 : 0) || (earned[b.id] || 0) - (earned[a.id] || 0) || b.tier - a.tier);
    const shown = list.slice(0, _rkShowAll ? 1500 : 120);
    return `
    <div class="screen-head"><div><h1>Ranking</h1><p class="sub">${nEarned} of ${num(defs.length)} badges earned</p></div></div>
    <div class="rk-top">
      <div class="card rk-card">
        <span class="rk-av">${avatarSvg(me.look, 'captain', { view: 'bust', accent: c.color, still: true })}</span>
        <span class="rk-txt"><small>You, rank ${pr.level} of ${PILOT_RANKS.length}</small><b>${esc(pr.name)}</b>${bar(pxp, pr)}
          ${stars(me.rating || 4)}<small>${num(st['p.flights'] || 0)} flights, ${num(st['p.hours'] || 0)} h, ${num(st['p.smooth'] || 0)} smooth landings, ${num(st['p.airports'] || 0)} airports</small></span>
      </div>
      <div class="card rk-card">
        <span class="rk-pop"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" class="rg-bg"/><circle cx="32" cy="32" r="26" class="rg-fg" stroke-dasharray="${(2 * Math.PI * 26).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * 26 * (1 - pop / 100)).toFixed(1)}"/></svg><b>${pop}</b><small>popularity</small></span>
        <span class="rk-txt"><small>${esc(c.name)}, rank ${ar.level} of ${AIRLINE_RANKS.length}</small><b>${esc(ar.name)}</b>${bar(axp, ar)}
          ${log.length ? `<span class="rk-log">${log.map((x: any) => `<i class="${x.d >= 0 ? 'up' : 'down'}">${x.d >= 0 ? '+' : ''}${x.d}</i><small>${esc(x.why)}</small>`).join('')}</span>` : `<small>Popularity rises with good flights and flights on time, and falls with rough landings, incidents and scandals.</small>`}</span>
      </div>
    </div>
    <div class="card rk-badges">
      <div class="card-h"><b>Badges</b><span class="seg">${groups.map(g => `<button class="${_rkGroup === g[0] ? 'on' : ''}" data-act="rk-group" data-g="${g[0]}">${g[1]}</button>`).join('')}</span>
        <button class="text-btn" data-act="rk-all">${_rkShowAll ? 'Show next goals only' : 'Show every badge'}</button></div>
      <div class="bdg-grid">${shown.map((b, i) => {
        const have = earned[b.id], cur = st[b.metric] || 0, p = clamp(cur / b.need, 0, 1);
        return `<div class="bdg t${b.tier} ${have ? 'have' : ''}" style="--i:${Math.min(i, 30)}" title="${esc(b.desc)}">
          <span class="bdg-ic">${icon(b.icon)}</span><span class="bdg-t"><b>${esc(b.title)}</b><small>${esc(b.desc)}</small>
          ${have ? `<em>${TIER_NAMES[b.tier]} · earned ${esc(dateStr(new Date(have)).slice(0, 10))}</em>` : `<span class="bdg-p"><i style="width:${(p * 100).toFixed(0)}%"></i></span><em>${TIER_NAMES[b.tier]} · ${b.need < 10 && b.need % 1 ? cur.toFixed(1) : num(Math.min(cur, b.need))} / ${b.need % 1 ? b.need : num(b.need)}</em>`}</span></div>`;
      }).join('')}</div>
      ${list.length > shown.length ? `<p class="fine-print">${num(list.length - shown.length)} more. Use the groups above to narrow the list.</p>` : ''}
    </div>`;
  },
};
ACTIONS['rk-group'] = el => { _rkGroup = el.getAttribute('data-g'); Sound.tick(); refresh(); };
ACTIONS['rk-all'] = () => { _rkShowAll = !_rkShowAll; Sound.tick(); refresh(); };
