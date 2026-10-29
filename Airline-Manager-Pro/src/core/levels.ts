// Levels for hired pilots, co-pilots, flight attendants and mechanics. They gain experience from their
// own work and level up (1 to 10), which also lifts their rating a little. They don't earn badges:
// badges are only yours (Ranking).
//  - Pilots and co-pilots: every flight they fly (block minutes plus each landing).
//  - Flight attendants: every flight they work on; an aircraft needs one per 50 seats.
//  - Mechanics: the turnaround check after each landing at their base, and every repair.

const LEVEL_XP = [0, 300, 900, 1800, 3200, 5200, 8000, 12000, 17500, 25000];
const LEVEL_TITLES: { [role: string]: string[] } = {
  captain: ['New captain', 'Line captain', 'Line captain', 'Experienced captain', 'Experienced captain', 'Senior captain', 'Senior captain', 'Training captain', 'Check captain', 'Chief captain'],
  fo: ['Junior first officer', 'First officer', 'First officer', 'Experienced first officer', 'Experienced first officer', 'Senior first officer', 'Senior first officer', 'Senior first officer', 'Command-ready first officer', 'Command-ready first officer'],
  fa: ['Trainee attendant', 'Flight attendant', 'Flight attendant', 'Experienced attendant', 'Senior attendant', 'Senior attendant', 'Purser', 'Purser', 'Senior purser', 'Chief purser'],
  mech: ['Apprentice mechanic', 'Mechanic', 'Mechanic', 'Licensed engineer', 'Licensed engineer', 'Senior engineer', 'Senior engineer', 'Lead engineer', 'Chief engineer', 'Chief engineer'],
};

function levelOf(xp: number): { level: number; from: number; to: number; p: number } {
  let i = 0; while (i < LEVEL_XP.length - 1 && (xp || 0) >= LEVEL_XP[i + 1]) i++;
  const from = LEVEL_XP[i], to = i < LEVEL_XP.length - 1 ? LEVEL_XP[i + 1] : from;
  return { level: i + 1, from, to, p: to > from ? clamp(((xp || 0) - from) / (to - from), 0, 1) : 1 };
}
function levelTitle(p: any): string { const r = personRole(p), l = levelOf(p.xp).level; return (LEVEL_TITLES[r] || LEVEL_TITLES.captain)[l - 1]; }

/** Experience for one person; announces a new level. */
function gainXp(p: any, amount: number, quiet?: boolean) {
  if (!p || p.you || !amount) return;
  const before = levelOf(p.xp).level;
  p.xp = Math.round((p.xp || 0) + amount);
  const after = levelOf(p.xp).level;
  if (after <= before) return;
  p.rating = clamp(Math.round(((p.rating || 4) + 0.05 * (after - before)) * 100) / 100, 1, 5);
  if (quiet) return;
  State.notices.unshift({ id: uid(), kind: 'staff' as any, title: `${p.name} reached level ${after}`, body: `${levelTitle(p)}. More experience means a better rating and fewer mistakes.`, time: 'Now', read: false, ref: p.id } as any);
}

/** After any flight of the airline: the pilot, co-pilot, cabin crew and the mechanic on the turnaround. */
function crewAfterLeg(cid: string, opts: { pilotId?: string; coPilot?: boolean; typeId?: string; from?: string; to?: string; blockMin: number; quiet?: boolean }) {
  const q = opts.quiet, block = Math.max(10, opts.blockMin || 60);
  if (opts.pilotId) gainXp(pilot(opts.pilotId), block + 20, q);
  if (opts.coPilot) { const co: any = State.pilots.filter((x: any) => x.coPilotFor === cid)[0]; if (co) gainXp(co, block + 20, q); }
  const t = opts.typeId ? acType(opts.typeId) : null;
  // cabin crew: one attendant per 50 seats (none on small aircraft), those based at the departure airport first
  const need = t && t.seats >= 20 ? Math.ceil(t.seats / 50) : 0;
  if (need) {
    const fas = staffOf(cid, 'fa').filter((s: any) => s.status !== 'off');
    const here = fas.filter(s => s.base === opts.from), rest = fas.filter(s => s.base !== opts.from);
    const turn = _hashStr((opts.from || '') + (opts.to || '') + Date.now()) ;
    const pick = here.concat(rest.slice(turn % Math.max(1, rest.length)).concat(rest.slice(0, turn % Math.max(1, rest.length)))).slice(0, need);
    pick.forEach(s => gainXp(s, block, q));
  }
  // the turnaround check at the arrival airport
  const mechs = staffOf(cid, 'mech').filter((s: any) => s.status !== 'off');
  const m = mechs.filter(s => s.base === opts.to)[0] || mechs[_hashStr((opts.to || '') + block) % Math.max(1, mechs.length)];
  if (m) gainXp(m, 25, q);
}

/** A finished repair: experience for the airline's mechanics at that base. */
function crewAfterRepair(cid: string, base: string, minutes: number) {
  const mechs = staffOf(cid, 'mech'), here = mechs.filter(s => s.base === base);
  (here.length ? here : mechs.slice(0, 1)).forEach(s => gainXp(s, Math.max(20, minutes)));
}

/** Level chip for cards and lists. */
function levelChip(p: any): string {
  if (!p || p.you) return '';
  const l = levelOf(p.xp);
  return `<span class="lvl" title="${esc(levelTitle(p))}"><b>Lv ${l.level}</b><i><s style="width:${(l.p * 100).toFixed(0)}%"></s></i></span>`;
}
