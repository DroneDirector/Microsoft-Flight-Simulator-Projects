// Ranking: your own record as a pilot: your rank and rating, your flying record and your badges, shown
// as you earn them (badges not yet earned stay hidden). Badges are yours only; hired pilots and crew level up without badges.

let _rkGroup = 'all', _rkShowAll = false;

SCREENS.ranking = {
  title: 'Ranking', icon: 'trophy',
  render() {
    const S: any = State, c = company(), me: any = myPilot();
    const st = Progress.compute();
    const pxp = Progress.pilotXp(st), pr = Progress.rankOf(pxp, PILOT_RANKS);
    const defs = badgeDefs().filter(b => b.group === 'pilot'), earned = S.badges || {};
    const got = defs.filter(b => earned[b.id]), nEarned = got.length;
    const bar = (xp: number, r: any) => { const p = r.to > r.from ? clamp((xp - r.from) / (r.to - r.from), 0, 1) : 1; return `<span class="rk-bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span><small>${num(xp)} XP${r.to > r.from ? ` · ${num(r.to - xp)} to the next rank` : ' · highest rank'}</small>`; };
    const stars = (v: number) => `<span class="rk-stars" aria-label="Rating ${v.toFixed(1)} of 5">${[1, 2, 3, 4, 5].map(i => `<i class="${v >= i - 0.25 ? 'on' : v >= i - 0.75 ? 'half' : ''}">${icon('star')}</i>`).join('')}<b>${v.toFixed(1)}</b></span>`;
    // only badges you have earned are shown, newest first; the rest stay a surprise
    const cats = ['all'].concat(Array.from(new Set(got.map(b => b.cat))));
    if (cats.indexOf(_rkGroup) < 0) _rkGroup = 'all';
    const list = got.filter(b => _rkGroup === 'all' || b.cat === _rkGroup).sort((a, b) => (earned[b.id] || 0) - (earned[a.id] || 0) || b.tier - a.tier);
    const shown = list.slice(0, _rkShowAll ? 5000 : 120);
    const rec = [['Flights', num(st['p.flights'] || 0)], ['Block hours', num(st['p.hours'] || 0)], ['Smooth landings', num(st['p.smooth'] || 0)], ['Butter landings', num(st['p.butter'] || 0)],
      ['Best streak', num(st['p.streak'] || 0)], ['Airports', num(st['p.airports'] || 0)], ['Countries', num(st['p.countries'] || 0)], ['Aircraft types', num(st['p.types'] || 0)],
      ['Distance', num(Math.round(st['p.nm'] || 0)) + ' nm'], ['Passengers', num(st['p.pax'] || 0)]];
    return `
    <div class="screen-head"><div><h1>Ranking</h1><p class="sub">Your own record as a pilot · ${num(nEarned)} ${nEarned === 1 ? 'badge' : 'badges'} earned</p></div></div>
    <div class="rk-top">
      <div class="card rk-card">
        <span class="rk-av">${avatarSvg(me.look, 'captain', { view: 'bust', accent: c.color, still: true })}</span>
        <span class="rk-txt"><small>${esc(me.name)}, rank ${pr.level} of ${PILOT_RANKS.length}</small><b>${esc(pr.name)}</b>${bar(pxp, pr)}
          ${stars(me.rating || 4)}<small>Only flights you fly yourself count. Hired pilots and crew level up on their own, without badges.</small></span>
      </div>
      <div class="card rk-rec"><div class="card-h"><b>Your record</b></div>
        <div class="rk-rec-grid">${rec.map(r => `<span><b>${esc(r[1])}</b><small>${esc(r[0])}</small></span>`).join('')}</div></div>
    </div>
    <div class="card rk-badges">
      <div class="card-h"><b>Your badges</b><span class="seg rk-cats">${cats.map(g => `<button class="${_rkGroup === g ? 'on' : ''}" data-act="rk-group" data-g="${esc(g)}">${g === 'all' ? 'All' : esc(g)}</button>`).join('')}</span>
        ${list.length > 120 ? `<button class="text-btn" data-act="rk-all">${_rkShowAll ? 'Show the newest' : 'Show all ' + num(list.length)}</button>` : ''}</div>
      <div class="bdg-grid">${shown.map((b, i) => {
        const have = earned[b.id];
        return `<div class="bdg t${b.tier} have" style="--i:${Math.min(i, 30)}" title="${esc(b.desc)}">
          <span class="bdg-ic">${icon(b.icon)}</span><span class="bdg-t"><b>${esc(b.title)}</b><small>${esc(b.desc)}</small>
          <em>${TIER_NAMES[b.tier]} · earned ${esc(dateStr(new Date(have)).slice(0, 10))}</em></span></div>`;
      }).join('') || `<p class="fine-print rk-empty">${icon('trophy')}No badges yet. They appear here as you earn them by flying yourself.</p>`}</div>

    </div>`;
  },
};
ACTIONS['rk-group'] = el => { _rkGroup = el.getAttribute('data-g'); Sound.tick(); refresh(); };
ACTIONS['rk-all'] = () => { _rkShowAll = !_rkShowAll; Sound.tick(); refresh(); };
