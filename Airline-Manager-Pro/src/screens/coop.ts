// Co-op screen: start or join a shared airline, the pilots in it, who is flying, who earned what,
// what happened, and the airline's rules.

let _coopJoin = '';

SCREENS.coop = {
  title: 'Co-op', icon: 'coop',
  render() {
    const c = coopState(), co = company();
    if (!c || !c.on) return coopIntroHtml(co);
    if (c.companyId !== co.id) {
      const other = State.companies.filter(x => x.id === c.companyId)[0];
      return `<div class="screen-head"><div><h1>Co-op</h1><p class="sub">${esc(co.name)}</p></div></div>
        <div class="card coop-note">${icon('coop')}<span><b>Co-op runs for ${esc(other ? other.name : 'another airline')}</b><small>Switch to that airline to see its co-op pilots. One airline at a time can be flown in co-op.</small></span>
        ${other ? `<button class="btn primary sm" data-act="coop-switch" data-id="${esc(other.id)}">Switch</button>` : ''}</div>`;
    }
    const week = Date.now() - 7 * 864e5;
    const flightsWeek = c.feed.filter(e => e.type === 'flight' && e.at > week);
    const earned = flightsWeek.reduce((s, e) => s + (e.amount || 0), 0);
    const total = c.members.reduce((s, m) => s + Math.max(0, m.revenue), 0) || 1;
    const flying = (id: string) => State.live.filter((f: any) => f.pilotId === id && (f.coop || (f.you && id === 'coop-you')))[0];
    const members = c.members.slice().sort((a, b) => (b.you ? 1 : 0) - (a.you ? 1 : 0) || b.revenue - a.revenue);
    const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
    return `
    <div class="screen-head"><div><h1>Co-op</h1><p class="sub">${esc(co.name)} · ${c.members.length} pilots flying for the same airline</p></div>
      <span class="coop-backend ${c.backend}">${icon(c.backend === 'supabase' ? 'wifi' : 'info')}${c.backend === 'supabase' ? 'Online' : 'Demo'}</span></div>
    <div class="coop-top">
      <div class="card coop-code"><small>Invite code</small><b>${esc(c.code)}</b>
        <span class="coop-code-btns"><button class="btn ghost sm" data-act="coop-copy">${icon('copy')}Copy</button><button class="btn ghost sm" data-act="coop-share">${icon('share')}Share</button></span>
        <small class="coop-fine">${c.backend === 'supabase' ? 'Other pilots enter this code under Co-op → Join.' : 'Joining from other devices opens when the online service is connected.'}</small></div>
      <div class="card coop-stat"><small>Flights this week</small><b>${num(flightsWeek.length)}</b><small>${(n => `by ${n} pilot${n === 1 ? '' : 's'}`)(new Set(flightsWeek.map(e => e.by)).size)}</small></div>
      <div class="card coop-stat"><small>Earned together this week</small><b class="${earned >= 0 ? 'green' : 'red'}">${money(earned, { sign: true })}</b><small>after all costs</small></div>
      <div class="card coop-stat"><small>In the air now</small><b>${State.live.filter((f: any) => f.coop || f.you).length}</b><small>co-op flights</small></div>
    </div>
    <div class="coop-grid">
      <div class="card">
        <div class="card-h"><b>Pilots</b><small>${c.rules.ownerBuys ? 'Only the owner buys aircraft' : 'Everyone can buy aircraft'}</small></div>
        <div class="coop-members">${members.map((m, i) => {
          const f: any = flying(m.id), p: any = m.you ? myPilot() : pilot(m.id);
          const share = Math.max(0, m.revenue) / total;
          return `<div class="coop-m" style="--i:${i}">
            <span class="coop-av">${p && p.look ? avatarSvg(p.look, 'captain', { view: 'bust', accent: co.color, still: true }) : icon('user')}${f || m.you ? '<i class="on"></i>' : ''}</span>
            <span class="coop-mt"><b>${esc(m.name)}${m.you ? ' <em>you</em>' : ''}</b>
              <small><span class="chip ${m.role}">${m.role === 'owner' ? 'Owner' : 'Pilot'}</span>${f ? `<span class="coop-fly">${icon('fleet')}${esc(f.from)} → ${esc(f.to)} · ${esc(f.phase || '')}</span>` : m.you ? 'Online' : m.flights ? `Last flight ${ago(m.lastSeen)}` : 'No flights yet'}</small>
              <span class="coop-bar"><i style="width:${(share * 100).toFixed(1)}%"></i></span></span>
            <span class="coop-num"><b>${num(m.flights)}</b><small>flights</small></span>
            <span class="coop-num"><b>${hours(m.hoursMin)}</b><small>hours</small></span>
            <span class="coop-num"><b class="${m.revenue >= 0 ? 'green' : 'red'}">${money(m.revenue, { compact: true })}</b><small>earned</small></span>
            ${f ? `<button class="btn ghost sm" data-act="watch-pilot" data-id="${f.id}">${icon('map')}Watch</button>` : '<span></span>'}
          </div>`;
        }).join('')}</div>
      </div>
      <div class="card coop-feed">
        <div class="card-h"><b>What happened</b></div>
        <div class="coop-ev">${c.feed.slice(0, 40).map(e => `<${e.tx ? 'button' : 'div'} class="coop-e t-${e.type}" ${e.tx ? `data-act="tx-detail" data-id="${e.tx}"` : ''}>
          <span class="coop-ei">${icon(e.type === 'flight' ? 'land' : e.type === 'buy' ? 'market' : e.type === 'join' || e.type === 'start' ? 'user' : 'info')}</span>
          <span><b>${esc(e.text)}</b><small>${ago(e.at)}</small></span>${e.amount != null ? `<em class="${e.amount >= 0 ? 'green' : 'red'}">${money(e.amount, { sign: true })}</em>` : ''}</${e.tx ? 'button' : 'div'}>`).join('') || '<p class="fine-print">Nothing yet.</p>'}</div>
      </div>
    </div>
    <div class="card coop-rules">
      <div class="card-h"><b>Rules</b><small>Set by the owner</small></div>
      <div class="ch-row"><span><b>Only the owner buys aircraft</b><small>Other pilots fly the fleet but can't spend the airline's money on aircraft.</small></span>
        <button class="tg ${c.rules.ownerBuys ? 'on' : ''}" data-act="coop-rule" role="switch" aria-checked="${c.rules.ownerBuys}" ${(coopMe() || {} as any).role !== 'owner' ? 'disabled' : ''}><i></i></button></div>
      <div class="ch-row"><span><b>${c.backend === 'supabase' ? 'Online, powered by Supabase' : 'Online play is being set up'}</b><small>${c.backend === 'supabase' ? 'The airline is shared live with every pilot in it.' : 'Co-op runs as a demo with sample pilots for now. When the online service (Supabase) is connected, real pilots join with the invite code.'}</small></span><span></span></div>
      <div class="ch-row"><span><b>Leave co-op</b><small>The co-op pilots leave. Everything the airline earned and logged stays.</small></span><button class="btn ghost sm danger" data-act="coop-leave">Leave</button></div>
    </div>`;
  },
};

function coopIntroHtml(co: Company): string {
  return `
    <div class="screen-head"><div><h1>Co-op</h1><p class="sub">Fly one airline together with other real pilots</p></div></div>
    <div class="coop-hero card">
      <div class="coop-hero-art">${icon('coop')}</div>
      <div class="coop-hero-t">
        <h2>One airline, many pilots</h2>
        <p>Every pilot flies in their own simulator, and every flight counts for the same airline: one balance, one fleet, one logbook, one popularity. See who is in the air, who earned what, and what happened while you were away.</p>
        <ul class="coop-list"><li>${icon('check')}For your own airline or a real-world one</li><li>${icon('check')}Invite pilots with a code</li><li>${icon('check')}The owner decides who can buy aircraft</li><li>${icon('check')}Works on the phone and on Windows</li></ul>
      </div>
    </div>
    <div class="coop-choose">
      <div class="card coop-opt">
        <b>Start a co-op airline</b><small>Share ${esc(co.name)} with other pilots. You become its owner.</small>
        <button class="btn primary" data-act="coop-start">${icon('coop')}Start co-op</button>
      </div>
      <div class="card coop-opt">
        <b>Join with a code</b><small>Fly for another pilot's airline.</small>
        <span class="coop-join"><input id="coop-code" class="inp" maxlength="9" placeholder="ABCD-2345" value="${esc(_coopJoin)}" autocomplete="off" autocapitalize="characters"><button class="btn" data-act="coop-join">Join</button></span>
      </div>
    </div>
    <p class="fine-print">${icon('info')} Online play is powered by Supabase and is being set up. Until then, starting co-op runs a demo with three sample pilots flying your airline's routes in real time, so you can try everything.</p>`;
}

ACTIONS['coop-start'] = () => {
  confirmChange('Start co-op?', `${company().name} becomes a co-op airline with you as its owner. Three sample pilots join while online play is being set up.`, 'Start co-op', 'Cancel', () => {
    closeTop(); coopStart(); Sound.tick(); try { coopBackend().tick(Date.now()); } catch (e) { /* ignore */ }
    toast('Co-op started', 'ok'); refresh();
  }, () => closeTop());
};
ACTIONS['coop-join'] = () => {
  const v = (($('#coop-code') as HTMLInputElement || {} as any).value || '').trim().toUpperCase(); _coopJoin = v;
  if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(v)) { toast('Enter the 8-character invite code, for example ABCD-2345', 'warn'); return; }
  toast('Joining other pilots\' airlines opens when online play is connected', 'info');
};
ACTIONS['coop-copy'] = () => {
  const c = coopState(); if (!c) return;
  const T = Store.native();
  Promise.resolve().then(() => T && T.copy ? T.copy({ text: c.code }) : navigator.clipboard.writeText(c.code)).then(() => toast('Invite code copied', 'ok'), () => toast(c.code, 'info'));
};
ACTIONS['coop-share'] = () => {
  const c = coopState(); if (!c) return;
  const text = `Fly with me for ${company().name} in ${APP.name}. Co-op invite code: ${c.code}`;
  const T = Store.native();
  if (T && T.share) T.share({ text, title: APP.name }); else if ((navigator as any).share) (navigator as any).share({ text }).catch(() => { /* closed */ }); else ACTIONS['coop-copy'](null, null);
};
ACTIONS['coop-rule'] = () => { const c = coopState(); if (!c) return; c.rules.ownerBuys = !c.rules.ownerBuys; coopRecord({ id: uid(), at: Date.now(), by: 'coop-you', type: 'rule', text: c.rules.ownerBuys ? 'Only the owner can buy aircraft now' : 'Every pilot can buy aircraft now' }); Store.save(); Sound.tick(); refresh(); };
ACTIONS['coop-leave'] = () => { confirmChange('Leave co-op?', 'The co-op pilots leave this airline. Everything it earned and logged stays.', 'Leave', 'Stay', () => { closeTop(); coopLeave(); toast('You left co-op', 'info'); refresh(); }, () => closeTop()); };
ACTIONS['coop-switch'] = el => { const id = el.getAttribute('data-id'); State.companyId = id; State.divisionId = 'all'; Store.save(); try { applyCompanyTheme(true); renderTopbar(); } catch (e) { /* ignore */ } refresh(); };
