// App shell: navigation rail, top bar, screen router and the shared action dispatcher.

interface AppScreen { title: string; icon: string; render: () => string; mount?: (root: HTMLElement) => void; nav?: boolean }
const SCREENS: { [k: string]: AppScreen } = {};
const ACTIONS: { [k: string]: (el: HTMLElement, ev: Event) => void } = {};

const NAV_ORDER = ['ops', 'fleet', 'routes', 'schedule', 'maint', 'finance', 'logbook', 'pilots', 'ranking'];
// Pages opened from inside other pages, shown under their parent in the rail
const SUB_PAGES: { [k: string]: string } = { map: 'ops', market: 'fleet' };

function renderShell() {
  const app = $('#app');
  app.innerHTML = `
    <nav class="rail" aria-label="Main">
      <div class="rail-brand" title="${esc(APP.name)}">${brandMark()}</div>
      <div class="rail-items">${NAV_ORDER.map(k => `
        <button class="rail-btn" data-act="go" data-screen="${k}" aria-label="${esc(SCREENS[k].title)}">
          ${icon(SCREENS[k].icon)}<span>${esc(SCREENS[k].title)}</span>${k === 'maint' ? `<i class="rail-dot" data-maint-dot></i>` : ''}
        </button>`).join('')}
      </div>
      <button class="rail-btn rail-set" data-act="settings" aria-label="Settings">${icon('gear')}<span>Settings</span></button>
      <div class="rail-ver" title="${esc(APP.name)} version ${esc(APP.version)}">v${esc(APP.version)}</div>
    </nav>
    <header class="topbar"></header>
    <main class="view" id="view"></main>`;
  renderTopbar();
  go(State.screen, true);
}

function brandMark(): string {
  return `<svg viewBox="0 0 32 32" class="brand-svg" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5"/>
    <path d="M16 4.5 18 14 27.5 16 18 18 16 27.5 14 18 4.5 16 14 14Z" fill="currentColor"/></svg>`;
}

function renderTopbar() {
  const c = company();
  const div = c.divisions.filter(d => d.id === State.divisionId)[0];
  const b = State.bridge;
  const st = Link.status;
  const linkTxt = st === 'connected' ? (Link.sim && !Link.sim.connected ? 'Linked, sim not running' : DESKTOP ? 'Linked on this PC' : Link.via === 'wifi' ? 'Linked over Wi-Fi' : Link.via === 'usb' ? 'Linked over USB' : 'Linked via hotspot')
    : st === 'unpaired' ? ((State as any).linkedOnce ? 'Link your PC' : 'Demo, link your PC') : 'Looking for your PC';
  const n = unreadCount();
  $('.topbar').innerHTML = `
    <button class="co-switch" data-act="switcher" aria-label="Switch company">
      <span class="co-badge" style="--co:${c.color};--co2:${c.color2}">${esc(c.icao)}</span>
      <span class="co-text"><b>${esc(c.name)}</b><small>${div ? esc(div.name) + ' division' : (c.divisions.length ? 'All divisions' : esc(myPilot().name))}</small></span>
      ${icon('down', 'co-chev')}
    </button>
    <button class="link-pill ${b.pc === 'connected' ? 'ok' : 'warn'}" data-act="link-panel" aria-label="${linkTxt}. Open connection details">
      <i class="link-led"></i>${icon(st === 'connected' && Link.via !== 'wifi' ? 'cell' : 'wifi')}<span>${linkTxt}</span><em>${b.pc === 'connected' && Link.latency ? Link.latency + ' ms' : ''}</em>
    </button>
    <div class="top-spacer"></div>
    <button class="balance" data-balance data-act="go" data-screen="finance" aria-label="Balance ${money(c.balance)}. Open Finance"><small>Balance</small><b data-balance-val>${money(c.balance, { compact: true })}</b></button>
    <button class="icon-btn sound-btn ${State.settings.muteAll ? 'muted-btn' : ''}" data-act="sound-toggle" aria-label="${State.settings.muteAll ? 'Sounds are muted. Tap to turn sounds on' : 'Sounds are on. Tap to mute all sounds'}">${icon(State.settings.muteAll ? 'mute' : 'volume')}</button>
    <button class="icon-btn bell ${n ? 'has' : ''}" data-act="inbox" aria-label="Notifications, ${n} unread">${icon('bell')}${n ? `<span class="badge">${n}</span>` : ''}</button>
    <button class="icon-btn" data-act="settings" aria-label="Settings">${icon('gear')}</button>
    <button class="icon-btn power-btn" data-act="exit" aria-label="Exit ${esc(APP.name)}">${icon('power')}</button>`;
  const dot = $('[data-maint-dot]');
  if (dot) dot.style.display = State.issues.some(i => i.status === 'open' && plane(i.reg) && plane(i.reg).companyId === State.companyId) ? '' : 'none';
}

let _navSeq = 0;
function go(screen: string, instant?: boolean) {
  if (!SCREENS[screen]) screen = 'ops';
  const prev = State.screen;
  State.screen = screen;
  const navKey = SUB_PAGES[screen] || screen;
  $all('.rail-btn').forEach(b => b.classList.toggle('on', b.getAttribute('data-screen') === navKey));
  const view = $('#view');
  const seq = ++_navSeq;
  const idx = (k: string) => NAV_ORDER.indexOf(SUB_PAGES[k] || k) + (SUB_PAGES[k] ? 0.5 : 0);
  const dir = idx(screen) >= idx(prev) ? 1 : -1;
  const paint = () => {
    if (seq !== _navSeq) return;
    view.innerHTML = `<section class="screen screen-${screen}" style="--dir:${dir}">${SCREENS[screen].render()}</section>`;
    const root = view.firstElementChild as HTMLElement;
    if (SCREENS[screen].mount) SCREENS[screen].mount(root);
    view.scrollTop = 0;
    if (!instant) { root.classList.add('enter'); requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('enter'))); }
  };
  const cur = view.firstElementChild as HTMLElement;
  if (cur && !instant && !reducedMotion()) { cur.classList.add('leave'); setTimeout(paint, 140); }
  else paint();
}

/** Re-render the current screen in place (after data changes). */
function refresh() {
  renderTopbar();
  const view = $('#view');
  const st = view.scrollTop;
  view.innerHTML = `<section class="screen screen-${State.screen}">${SCREENS[State.screen].render()}</section>`;
  const root = view.firstElementChild as HTMLElement;
  if (SCREENS[State.screen].mount) SCREENS[State.screen].mount(root);
  view.scrollTop = st;
}

function bindActions() {
  document.addEventListener('click', ev => {
    const el = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement;
    if (!el) return;
    const a = ACTIONS[el.getAttribute('data-act')];
    if (a) { ev.preventDefault(); a(el, ev); }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeTop(); });
  // Unlock audio on the first touch, so the first sound (a payment, a purchase) is never swallowed.
  const unlock = () => { audio(); document.removeEventListener('pointerdown', unlock, true); };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && _ctx && _ctx.state !== 'running') _ctx.resume(); });
}

ACTIONS.go = el => { Sound.tick(); go(el.getAttribute('data-screen')); };

// Animated balance change in the top bar
function animateBalance(from: number, to: number) {
  const el = $('[data-balance-val]'); if (!el) return;
  const box = $('[data-balance]'); box.classList.remove('flash', 'flash-down'); void box.offsetWidth; box.classList.add(to < from ? 'flash-down' : 'flash');
  const t0 = performance.now(), dur = reducedMotion() ? 1 : 900;
  const step = (now: number) => {
    const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = money(from + (to - from) * e, { compact: true });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Shared bits of markup used by several screens
function statusChip(s: string): string {
  const map: { [k: string]: string[] } = {
    flying: ['In flight', 'flight'], parked: ['Available', 'avail'], grounded: ['Maintenance', 'maint'], maintenance: ['Maintenance', 'maint'],
    resting: ['Resting', 'dim'], standby: ['Standby', 'cyan'], off: ['Available', 'green'],
    ok: ['Normal', 'green'], hard: ['Hard landing', 'amber'], crash: ['Crash', 'red'], incident: ['Incident', 'amber'],
    open: ['Open', 'amber'], scheduled: ['Scheduled', 'cyan'], fixed: ['Fixed', 'green'],
    minor: ['Minor', 'dim'], major: ['Major', 'amber'], grounding: ['Grounding', 'red'],
  };
  const m = map[s] || [s, 'dim'];
  return `<span class="chip chip-${m[1]}">${esc(m[0])}</span>`;
}

function conditionBar(v: number): string {
  // one line: green good, yellow some wear, orange needs attention, red severe problems
  const b = condBand(v);
  return `<span class="cond cond-${b[1]}" title="${b[2]}"><i style="width:${Math.round(v)}%"></i></span>`;
}

function emptyState(title: string, body: string, actionLabel?: string, act?: string): string {
  return `<div class="empty"><b>${esc(title)}</b><p>${esc(body)}</p>${actionLabel ? `<button class="btn" data-act="${act}">${esc(actionLabel)}</button>` : ''}</div>`;
}

/** Header for pages opened from another page, with a way back. */
function subHead(parent: string, title: string, sub: string, right?: string): string {
  return `<div class="screen-head"><div class="sh-left"><button class="back-btn" data-act="go" data-screen="${parent}" aria-label="Back to ${esc(SCREENS[parent].title)}">${icon('chevron', 'flip')}<span>${esc(SCREENS[parent].title)}</span></button>
    <h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p></div>${right || ''}</div>`;
}

ACTIONS.unmute = () => { State.settings.muteAll = false; renderTopbar(); Sound.tick(); toast('Sounds on', 'ok'); };
ACTIONS['sound-toggle'] = () => {
  const mute = !State.settings.muteAll;
  if (mute) { Voice.stop(); State.settings.muteAll = true; } else { State.settings.muteAll = false; Sound.tick(); }
  renderTopbar(); Haptics.pulse(8);
  try { if ($('#set-body')) rerenderSettingsBody(); } catch (e) { /* settings closed */ }
  toast(mute ? 'All sounds muted' : 'Sounds on', 'ok');
};
