// The news: newspaper articles that pop up when something about your airline makes the papers. Trials
// (charges, verdicts, appeals), new routes, and other stories. The newspapers, reporters, airport directors
// and spokespeople are made up; the facts come from your airline.

interface NewsArticle { id: string; at: number; paper: string; section: string; headline: string; standfirst: string; body: string[]; quote?: [string, string]; quote2?: [string, string]; byline: string; place: string; art: { kind: 'aircraft' | 'person' | 'court'; typeId?: string; look?: any; role?: string; color?: string; color2?: string; reg?: string }; companyId: string }

const NEWS_PAPERS = ['The Runway Ledger', 'Aerowire News', 'The Skyline Chronicle', 'Flight Deck Gazette', 'The Terminal Courier', 'North Atlantic Wire', 'The Departure Board'];
function newsList(): NewsArticle[] { const S: any = State; return S.news || (S.news = []); }
function newsPaper(country: string): string { return NEWS_PAPERS[_hashStr(country || 'world') % NEWS_PAPERS.length]; }
function newsReporter(seed: string, place: string): string {
  try { const p: any = makePerson('rep-' + seed, 'fa', '', place || 'EKVG'); return p.name; } catch (e) { return 'Staff reporter'; }
}
/** Publish an article: kept in the archive, announced in the inbox, and shown at once. */
function newsPublish(a: Omit<NewsArticle, 'id' | 'at' | 'byline'> & { byline?: string }, show?: boolean): NewsArticle {
  const art: NewsArticle = Object.assign({ id: 'news-' + uid(), at: Date.now(), byline: newsReporter(a.headline, a.place) }, a) as NewsArticle;
  const l = newsList(); l.unshift(art); if (l.length > 120) l.length = 120;
  State.notices.unshift({ id: uid(), kind: 'company' as any, title: `In the news: ${art.headline}`, body: `${art.paper}: ${art.standfirst}`, time: 'Now', at: art.at, read: false, ref: art.id } as any);
  try { renderTopbar(); } catch (e) { /* not ready */ }
  // shown when the screen is free (a window closing or open now: it waits, up to about a minute)
  if (show !== false && newsMode() === 'popup') { let tries = 0; const tryShow = () => { if (document.hidden || document.querySelector('.layer.open')) { if (++tries < 30) setTimeout(tryShow, 2000); return; } newsOpen(art.id); }; setTimeout(tryShow, 700); }
  return art;
}
/** Settings → News: 'popup' (opens by itself, animated), 'notify' (inbox only, animated when opened), 'plain' (inbox only, no animation). */
function newsMode(): string { return (State.settings as any).newsMode || 'popup'; }
function newsOpen(id: string) {
  const a = newsList().filter(x => x.id === id)[0]; if (!a) return;
  const d = new Date(a.at), date = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const art = a.art.kind === 'aircraft' ? aircraftArt(a.art.typeId || 'a320neo', { color: a.art.color || '#2C8CFF', color2: a.art.color2 || '#0B2A55', reg: a.art.reg || '' })
    : a.art.kind === 'person' && a.art.look ? avatarSvg(a.art.look, (a.art.role || 'captain') as any, { view: 'bust', accent: a.art.color || '#2C8CFF', still: true })
    : `<svg viewBox="0 0 120 80" class="np-court"><rect width="120" height="80" fill="#E9E2D0"/><path d="M20 66h80M26 62h68M30 30h60l-30-16z" stroke="#3A3428" stroke-width="3" fill="none"/>${[36, 50, 64, 78].map(x => `<path d="M${x + 3} 33v27" stroke="#3A3428" stroke-width="5"/>`).join('')}</svg>`;
  Sound.tick();
  openLayer('modal', `<div class="np">
    <div class="np-mast"><b>${esc(a.paper)}</b><small>${esc(date)} · ${esc(a.section)}</small><button class="icon-btn np-x" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <h1 class="np-h">${esc(a.headline)}</h1>
    <p class="np-sf">${esc(a.standfirst)}</p>
    <div class="np-cols">
      <figure class="np-fig">${art}<figcaption>${esc(a.art.kind === 'aircraft' ? (a.art.reg ? a.art.reg + ', ' : '') + (acType(a.art.typeId || '') ? acType(a.art.typeId).model : '') : a.art.kind === 'person' ? 'The defendant' : 'The court')}</figcaption></figure>
      <p class="np-by">By ${esc(a.byline)} · ${esc(a.place)}</p>
      ${a.body.map((p, i) => `<p class="${i === 0 ? 'np-lead' : ''}">${esc(p)}</p>`).join('')}
      ${a.quote ? `<blockquote>“${esc(a.quote[0])}”<cite>${esc(a.quote[1])}</cite></blockquote>` : ''}
      ${a.quote2 ? `<blockquote>“${esc(a.quote2[0])}”<cite>${esc(a.quote2[1])}</cite></blockquote>` : ''}
    </div></div>`, { cls: 'wide news-pop' + (newsMode() === 'plain' ? ' np-still' : '') });
}

/* ---------- a new route makes the local news ---------- */
function newsRouteLaunch(r: any) {
  const c = company(r.companyId), t = acType(r.typeId); if (!c || !t || r.legs.length < 2) return;
  const A = apt(r.legs[0]), B = apt(r.legs[r.legs.length - 1]); if (!A || !B) return;
  const nm = gcDistanceNm(A.pos, B.pos), mins = Math.round((nm / t.cruiseKt) * 60 + 25), h = Math.floor(mins / 60), m = mins % 60;
  const fares = classFares(r.typeId, r.legs[0], r.legs[1], r), comp = typeof competitorsOn === 'function' ? competitorsOn(r.legs[0], r.legs[1]) : [];
  const seats = capacityOf ? (capacityOf(t.id) || { typical: t.seats } as any).typical || t.seats : t.seats;
  const via = r.legs.length > 2 ? ` via ${r.legs.slice(1, -1).map(k => apt(k) ? apt(k).city : k).join(' and ')}` : '';
  const first = new Date(Date.now() + 7 * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const dir: any = makePerson('dir-' + r.legs[1], 'captain', '', r.legs[1]);
  const me: any = myPilot(), seed = _hashStr(r.id);
  const heads = [`${c.name} to fly ${A.city}–${B.city}`, `New link: ${c.name} connects ${A.city} and ${B.city}`, `${B.city} gets a new route from ${A.city}`, `${c.name} opens ${A.city}–${B.city} service`];
  const the = (k: string) => /^(Faroe Islands|United Kingdom|United States|Netherlands|United Arab Emirates|Philippines|Czech Republic|Bahamas|Maldives)$/.test(k) ? 'the ' + k : k;
  const angle = B.country !== A.country ? `The route makes it easier for visitors from ${the(B.country)} to reach ${the(A.country)}, and for people in ${A.city} to get to ${B.city} for work or a weekend away.`
    : `For travellers between ${A.city} and ${B.city}, the new flights cut journey times and add choice.`;
  newsPublish({
    paper: newsPaper(B.country), section: 'Travel and business', place: B.city,
    headline: heads[seed % heads.length],
    standfirst: `${c.name} will fly ${r.days === 'Daily' ? 'daily' : r.days.toLowerCase()} between ${A.city} and ${B.city}${via} with the ${t.maker} ${t.model}, starting ${first}.`,
    body: [
      `${c.name} has announced a new route between ${A.name} (${A.icao}) and ${B.name} (${B.icao})${via}. Flight ${r.code} will be flown by the ${t.maker} ${t.model}, which seats about ${seats} passengers, and takes around ${h ? h + ' hour' + (h > 1 ? 's' : '') + ' ' : ''}${m} minutes for the ${num(Math.round(nm))} nautical miles.`,
      `Economy fares start at about ${money(Math.round(fares.y * 0.75 / 5) * 5)} one way${fares.j ? `, with business class from ${money(Math.round(fares.j * 0.8 / 5) * 5)}` : ''}.`,
      angle,
      comp.length ? `${c.name} goes head to head with ${comp.length} other airline${comp.length > 1 ? 's' : ''} already on the route, so prices may fall.` : `No other airline flies the route today.`,
    ],
    quote: [`We have wanted to bring ${B.city} into our network for a long time. This is good news for both cities.`, `${me.name}, ${c.name}`],
    quote2: [`A new route means more visitors, more business and more choice. We look forward to welcoming ${c.name}.`, `${dir.name}, director of ${B.name}`],
    art: { kind: 'aircraft', typeId: t.id, color: c.color, color2: c.color2, reg: (fleetOf(c.id).filter(a => a.typeId === t.id)[0] || {} as any).reg || '' }, companyId: c.id,
  });
  try { Progress.popularity(1, `${c.name} opened a new route`); } catch (e) { /* ignore */ }
}
ACTIONS['news-open'] = el => newsOpen(el.getAttribute('data-id'));
