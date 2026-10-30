// Who is on board: the passenger list of every flight, with names, nationality, seat, class and faces,
// the loadsheet (what everything weighs against the limits), and the boarding scan at the gate, where
// passports and boarding passes are checked and anyone on a no-fly list is flagged for you to decide.
// Passengers are made up for each flight from its booked load (the same people every time you look);
// most come from the departure country, some from the destination, some from anywhere. A few have a
// conduct record: warnings from earlier flights, or a ban. Your own flight is never given passengers:
// the list only puts names to the number the simulator (or GSX) reports.

interface PaxRecord { key: string; name: string; nat: string; sex: 'm' | 'f'; notes: { date: string; title: string; text: string; sev: 'warning' | 'ban' }[]; banned?: boolean; bannedBy?: string }
interface PaxSeat { key: string; name: string; nat: string; sex: 'm' | 'f'; age: number; seat: string; cls: 'F' | 'J' | 'Y'; look: any; record: PaxRecord }

// some passengers come with a record from before (other airlines, the authorities)
const PAX_PAST: [string, string, 'warning' | 'ban'][] = [
  ['Disruptive behaviour', 'Shouted at cabin crew and refused to follow instructions on an earlier flight.', 'warning'],
  ['Smoking in the lavatory', 'Set off the smoke detector in the lavatory on an earlier flight.', 'warning'],
  ['Intoxicated at the gate', 'Was refused boarding on an earlier flight for being heavily drunk.', 'warning'],
  ['Assault on crew', 'Struck a flight attendant on an earlier flight. Banned from flying by the airline concerned and listed by the authorities.', 'ban'],
  ['Threats on board', 'Made threats against other passengers on an earlier flight; the aircraft diverted. On a no-fly list.', 'ban'],
];

function paxStore(): { [key: string]: PaxRecord } { const S: any = State; return S.paxRecords || (S.paxRecords = {}); }
function noFly(): { [key: string]: string } { const S: any = State; return S.noFly || (S.noFly = {}); }

/** The passengers of a flight (cached per flight). */
const _manifests = new Map<string, PaxSeat[]>();
function manifestOf(f: LiveFlight): PaxSeat[] {
  const F: any = f, n = Math.max(0, f.pax || 0), key = f.id + '|' + n;
  const hit = _manifests.get(key); if (hit) return hit;
  const t = acType(flightTypeId(f)) || AIRCRAFT[0];
  const nF = Math.min(n, F.paxF || 0), nJ = Math.min(n - nF, F.paxJ || 0);
  const abreast = t.seats > 250 ? 9 : t.seats > 100 ? 6 : t.seats > 40 ? 4 : t.seats > 12 ? 3 : 2;
  const letters = 'ABCDEFGHJK'.slice(0, abreast).split('');
  const natFrom = (NAT_FOR_HUB as any)[f.from], natTo = (NAT_FOR_HUB as any)[f.to];
  const out: PaxSeat[] = [];
  let row = 1, col = 0, lastCls = '';
  for (let i = 0; i < n; i++) {
    const cls: 'F' | 'J' | 'Y' = i < nF ? 'F' : i < nF + nJ ? 'J' : 'Y';
    if (cls !== lastCls && lastCls) { row += (col ? 1 : 0) + (cls === 'Y' ? 2 : 1); col = 0; }
    lastCls = cls;
    const per = cls === 'Y' ? abreast : Math.max(2, abreast - 2);
    const seat = row + letters[Math.min(col, letters.length - 1)];
    col++; if (col >= per) { col = 0; row++; }
    const seed = f.id + ':' + i, r = seeded(seed + 'n'), roll = r();
    const nat = roll < 0.6 && natFrom ? natFrom[Math.floor(r() * natFrom.length)] : roll < 0.85 && natTo ? natTo[Math.floor(r() * natTo.length)] : undefined;
    const p: any = makePerson(seed, 'fa', '', f.from, r() < 0.5 ? 'f' : 'm', nat);
    p.look.uniform = Math.floor(r() * 6);
    const age = 2026 - parseInt(p.dob, 10) + Math.floor(r() * 25) - 8;
    const pkey = (p.name + '|' + p.nat + '|' + age).toLowerCase();
    // a past record for about one passenger in 60, a ban for about one in 1,500
    let rec = paxStore()[pkey] || null;
    if (!rec) {
      const rr = seeded(pkey + 'rec')();
      if (rr < 1 / 60) {
        const past = PAX_PAST[rr < 1 / 1500 ? 3 + Math.floor(seeded(pkey)() * 2) : Math.floor(seeded(pkey)() * 3)];
        const d = new Date(Date.now() - (30 + Math.floor(seeded(pkey + 'd')() * 700)) * 864e5);
        rec = { key: pkey, name: p.name, nat: p.nat, sex: p.sex, notes: [{ date: dateStr(d).slice(0, 10), title: past[0], text: past[1], sev: past[2] }], banned: past[2] === 'ban', bannedBy: past[2] === 'ban' ? 'the authorities' : '' };
        paxStore()[pkey] = rec;
      }
    }
    if (noFly()[pkey] && rec) { rec.banned = true; rec.bannedBy = 'your airline'; }
    out.push({ key: pkey, name: p.name, nat: p.nat, sex: p.sex, age: clamp(age, 2, 92), seat, cls, look: p.look, record: rec });
  }
  _manifests.set(key, out);
  if (_manifests.size > 40) _manifests.delete(_manifests.keys().next().value);
  return out;
}

/* ---------- the passenger list ---------- */
ACTIONS['pax-list'] = el => {
  const f = State.live.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!f) return;
  Sound.tick();
  const list = manifestOf(f), flagged = list.filter(p => p.record).length;
  const clsName: { [k: string]: string } = { F: 'First', J: 'Business', Y: 'Economy' };
  const groups = (['F', 'J', 'Y'] as const).map(c => [c, list.filter(p => p.cls === c)] as [string, PaxSeat[]]).filter(g => g[1].length);
  openLayer('modal', `<div class="modal-head"><div><h2>Passengers: ${esc(f.callsign)}</h2><small>${esc(f.from)} → ${esc(f.noDest ? '…' : f.to)} · ${list.length} on board${flagged ? ` · ${flagged} with a conduct record` : ''}${f.you ? ' · numbers from the simulator' : ''}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body pax-list">${groups.map(([c, ps]) => `<h4>${clsName[c]} · ${ps.length}</h4>${ps.map((p, i) => paxRowHtml(f.id, p, i)).join('')}`).join('') || emptyState('Nobody on board', 'The passengers show here once they have boarded.')}</div>`, { cls: 'wide pax-pop' });
  paxFacesLazy();
};
function paxRowHtml(fid: string, p: PaxSeat, i: number): string {
  const rec = p.record, banned = rec && rec.banned;
  return `<div class="pax-row ${banned ? 'banned' : rec ? 'warned' : ''}">
    <span class="pax-face" data-face="${esc(fid)}|${esc(p.key)}" data-i="${i}"></span>
    <span class="pax-who"><b>${esc(p.name)}</b><small>${natLabel(p.nat)} · ${p.age}</small></span>
    <span class="pax-seat">${esc(p.seat)}</span>
    ${rec ? `<button class="pax-rec ${banned ? 'ban' : ''}" data-act="pax-record" data-key="${esc(p.key)}">${icon('alert')}${banned ? 'Banned' : rec.notes.length + ' warning' + (rec.notes.length > 1 ? 's' : '')}</button>` : '<span class="pax-clean">Clean</span>'}
  </div>`;
}
/** Faces are drawn as the rows come into view, so a full widebody list opens at once. */
function paxFacesLazy() {
  const box = $('.pax-pop .pax-list'); if (!box) return;
  const draw = () => {
    const top = box.getBoundingClientRect().top, bottom = top + box.clientHeight + 200;
    for (const el of Array.from(box.querySelectorAll('.pax-face:not(.done)')) as HTMLElement[]) {
      const r = el.getBoundingClientRect(); if (r.bottom < top - 100 || r.top > bottom) continue;
      const [fid, key] = (el.getAttribute('data-face') || '').split('|');
      const f = State.live.filter(x => x.id === fid)[0]; if (!f) continue;
      const p = manifestOf(f).filter(x => x.key === key)[0]; if (!p) continue;
      el.innerHTML = avatarSvg2d(p.look, 'fa', { view: 'bust', still: true }); el.classList.add('done');
    }
  };
  draw(); [120, 400, 800].forEach(ms => setTimeout(draw, ms));   // again once the window has opened
  box.addEventListener('scroll', () => requestAnimationFrame(draw), { passive: true });
}
ACTIONS['pax-record'] = el => {
  const rec = paxStore()[el.getAttribute('data-key')]; if (!rec) return;
  Sound.tick();
  const mine = noFly()[rec.key];
  openLayer('modal', `<div class="modal-head"><div><h2>${esc(rec.name)}</h2><small>${natLabel(rec.nat)}${rec.banned ? ` · banned by ${esc(rec.bannedBy || 'an airline')}` : ''}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body warn-list">${rec.notes.map(n => `<div class="warn-item sev-${n.sev === 'ban' ? 'severe' : 'moderate'}"><div class="wi-h"><span class="wi-sev">${n.sev === 'ban' ? 'Ban' : 'Warning'}</span><b>${esc(n.title)}</b><time>${esc(n.date)}</time></div><p>${esc(n.text)}</p></div>`).join('')}
      <div class="modal-actions">${mine ? `<button class="btn ghost" data-act="pax-unban" data-key="${esc(rec.key)}">Lift your airline's ban</button>` : `<button class="btn danger" data-act="pax-ban" data-key="${esc(rec.key)}">${icon('shield')}Ban from your airline</button>`}</div></div>`, { cls: 'narrow' });
};
ACTIONS['pax-ban'] = el => {
  const k = el.getAttribute('data-key'), rec = paxStore()[k]; if (!rec) return;
  noFly()[k] = dateStr(new Date()).slice(0, 10); rec.banned = true; rec.bannedBy = 'your airline';
  rec.notes.push({ date: dateStr(new Date()).slice(0, 10), title: 'Banned by your airline', text: `${rec.name} may no longer fly with ${company().name}.`, sev: 'ban' });
  Store.save(); closeAll(); toast(`${rec.name} is on your no-fly list`, 'ok');
};
ACTIONS['pax-unban'] = el => { const k = el.getAttribute('data-key'), rec = paxStore()[k]; delete noFly()[k]; if (rec) { rec.banned = rec.notes.some(n => n.sev === 'ban' && !/your airline/.test(n.title)); rec.bannedBy = rec.banned ? 'the authorities' : ''; } Store.save(); closeAll(); toast('Ban lifted', 'ok'); };

/* ---------- boarding: passports and boarding passes scanned at the gate ---------- */
const _scanned: { [flightId: string]: boolean } = {};
/** During boarding: anyone with a ban is flagged by the scan, and the gate asks you (it refuses them by
 *  itself if you don't answer within ten minutes). */
function boardingScan(f: LiveFlight) {
  if (_scanned[f.id] || f.you) return;
  _scanned[f.id] = true;
  const banned = manifestOf(f).filter(p => p.record && p.record.banned)[0]; if (!banned) return;
  const F: any = f, id = 'scan-' + f.id;
  State.notices.unshift({ id, kind: 'flight', title: `Boarding scan: ${banned.name} is on a no-fly list`, body: `Flight ${f.callsign} to ${f.to}, seat ${banned.seat}. Passport and boarding pass match a passenger banned by ${banned.record.bannedBy || 'an airline'}. Deny boarding?`, time: 'Now', read: false, ref: id } as any);
  F.scanFlag = { key: banned.key, name: banned.name, seat: banned.seat, at: Date.now() };
  try { renderTopbar(); Sound.chime(); toast(`Boarding scan: ${banned.name} is on a no-fly list`, 'warn', { label: 'Decide', act: 'scan-open', data: f.id }); } catch (e) { /* not ready */ }
  setTimeout(() => { if (F.scanFlag && !F.scanFlag.done) scanDecide(f.id, true, true); }, 10 * 60000);
}
ACTIONS['scan-open'] = el => {
  const id = el.getAttribute('data-id'), f: any = State.live.filter(x => x.id === id)[0]; if (!f || !f.scanFlag) return;
  const t = el.closest && el.closest('.toast'); if (t) t.remove();
  const p = manifestOf(f).filter(x => x.key === f.scanFlag.key)[0], rec = paxStore()[f.scanFlag.key];
  const line = `${f.callsign}, the gate here. The scan flagged ${f.scanFlag.name}, seat ${f.scanFlag.seat}. Passport and boarding pass match a passenger banned by ${rec ? rec.bannedBy || 'an airline' : 'an airline'}. Do you want them denied?`;
  openLayer('modal', `<div class="modal-head"><div><h2>Boarding scan</h2><small>${esc(f.callsign)} · ${esc(f.from)} → ${esc(f.to)}</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body"><div class="scan-card"><span class="pax-face big">${p ? avatarSvg2d(p.look, 'fa', { view: 'bust', still: true }) : ''}</span>
      <span><b>${esc(f.scanFlag.name)}</b><small>${p ? natLabel(p.nat) + ' · ' + p.age : ''} · seat ${esc(f.scanFlag.seat)}</small><span class="scan-hit">${icon('alert')}No-fly list match</span></span></div>
      ${rec ? rec.notes.map(n => `<p class="lede">${esc(n.title)} (${esc(n.date)}): ${esc(n.text)}</p>`).join('') : ''}
      <div class="say-row">${voiceButton(line, 'gate', 'Play the gate agent')}${voiceNoteEl()}</div>
      <div class="modal-actions"><button class="btn ghost" data-act="scan-let" data-id="${esc(id)}">Let them on</button><button class="btn danger" data-act="scan-deny" data-id="${esc(id)}">${icon('shield')}Deny boarding</button></div></div>`, { cls: 'narrow', onClose: () => Voice.stop() });
};
ACTIONS['scan-deny'] = el => scanDecide(el.getAttribute('data-id'), true);
ACTIONS['scan-let'] = el => scanDecide(el.getAttribute('data-id'), false);
function scanDecide(id: string, deny: boolean, auto?: boolean) {
  const f: any = State.live.filter(x => x.id === id)[0]; if (!f || !f.scanFlag || f.scanFlag.done) return;
  f.scanFlag.done = true; f.scanFlag.denied = deny;
  State.notices = State.notices.filter(n => n.ref !== 'scan-' + id);
  if (deny) { f.pax = Math.max(0, (f.pax || 1) - 1); _manifests.forEach((v, k) => { if (k.indexOf(id + '|') === 0) _manifests.delete(k); }); }
  else { try { Progress.popularity(-1, 'A banned passenger was let on board'); } catch (e) { /* ignore */ } }
  closeAll(); Store.save(); try { refresh(); } catch (e) { /* not ready */ }
  toast(deny ? `${f.scanFlag.name} was denied boarding${auto ? ' (the gate decided)' : ''}` : `${f.scanFlag.name} boarded ${f.callsign}`, deny ? 'ok' : 'warn');
}

/* ---------- the loadsheet ---------- */
/** What a flight weighs: passengers at 84 kg and 13 kg of bags each (standard weights), cargo, catering and
 *  fuel, against the aircraft's limits and the runways' limit. */
function loadsheetOf(f: LiveFlight): { rows: [string, number][]; zfw: number; tow: number; lw: number; mtow: number; mlw: number; rwyMax: number; ok: boolean; note: string } {
  const F: any = f, t = acType(flightTypeId(f)) || AIRCRAFT[0], S = speedSpec(t.id);
  const A = apt(f.from), B = apt(f.noDest ? f.from : f.to), dist = A && B ? gcDistanceNm(A.pos, B.pos) : 300;
  const pax = f.pax || 0, cargo = F.cargoKg || 0, crewN = t.seats > 100 ? 2 + Math.ceil(t.seats / 50) : t.seats > 20 ? 3 : 1;
  const catering = Math.round(t.seats >= 20 ? t.seats * (dist > 1500 ? 9 : 4) : 0);
  const W = flightWeights(t.id, pax, dist, cargo / 1000);
  const fuelTo = Math.round((W.tow - W.zfw) * 1000), burn = Math.round((W.tow - W.lw) * 1000);
  const rows: [string, number][] = [['Empty aircraft', Math.round(S.oew * 1000)], [`Crew (${crewN})`, crewN * 85], [`Passengers (${pax} × 84 kg)`, pax * 84], [`Bags (${pax} × 13 kg)`, pax * 13], ['Cargo', cargo], ['Catering', catering], ['Take-off fuel', fuelTo]];
  const zfw = rows.slice(0, 6).reduce((s2, r) => s2 + r[1], 0), tow = zfw + fuelTo, lw = tow - burn;
  const rc = f.noDest ? null : legRunwayCheck(t.id, f.from, f.to, pax, cargo);
  const ok = tow <= S.mtow * 1000 + 1 && lw <= S.mlw * 1000 + 1 && (!rc || rc.maxPax >= pax);
  const note = (F.offloadPax ? `${F.offloadPax} passengers offloaded for the runway. ` : '') + (F.offloadKg ? `${num(F.offloadKg)} kg of cargo offloaded for the runway. ` : '') + (rc && !rc.full ? rc.why : '');
  return { rows, zfw, tow, lw, mtow: S.mtow * 1000, mlw: S.mlw * 1000, rwyMax: rc ? rc.maxPax : pax, ok, note };
}
ACTIONS['loadsheet'] = el => {
  const f = State.live.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!f) return;
  Sound.tick();
  const L = loadsheetOf(f), kg = (x: number) => num(Math.round(x)) + ' kg';
  openLayer('modal', `<div class="modal-head"><div><h2>Loadsheet: ${esc(f.callsign)}</h2><small>${esc(f.from)} → ${esc(f.noDest ? '…' : f.to)} · loaded by the ground staff within the limits</small></div><button class="icon-btn" data-act="close-layer" aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body loadsheet"><table>${L.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${kg(r[1])}</td></tr>`).join('')}
      <tr class="tot"><td>Zero-fuel weight</td><td>${kg(L.zfw)}</td></tr>
      <tr class="tot ${L.tow > L.mtow ? 'bad' : ''}"><td>Take-off weight <small>max ${kg(L.mtow)}</small></td><td>${kg(L.tow)}</td></tr>
      <tr class="tot ${L.lw > L.mlw ? 'bad' : ''}"><td>Landing weight <small>max ${kg(L.mlw)}</small></td><td>${kg(L.lw)}</td></tr></table>
      <p class="ls-check ${L.ok ? 'ok' : 'bad'}">${icon(L.ok ? 'check' : 'alert')}${L.ok ? 'Within the aircraft\'s limits and the runways\' limit.' : 'Over a limit.'}</p>
      ${L.note ? `<p class="fine-print">${icon('info')}${esc(L.note)}</p>` : ''}</div>`, { cls: 'narrow' });
};
