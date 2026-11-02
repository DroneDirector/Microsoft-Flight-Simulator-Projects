// The Setup window: the app's own look (deep navy, cyan, magenta and lavender, the compass-star logo of its
// start-up screen), a sky of slowly drifting stars and flight paths behind, and four steps: welcome, where to
// install (drives with their free space, a folder browser, a new folder), installing (a route-line progress bar
// with a glowing tip and an aircraft, the percentage, the file and the speed), and done. The same window
// removes the app. It fits any window size.

export function logoSvg(): string {
  const ticks: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = i * 5, long = i % 6 === 0, r1 = long ? 86 : 89, r2 = 94, s = Math.sin(a * Math.PI / 180), c = -Math.cos(a * Math.PI / 180);
    ticks.push(`<line x1="${(100 + s * r1).toFixed(2)}" y1="${(100 + c * r1).toFixed(2)}" x2="${(100 + s * r2).toFixed(2)}" y2="${(100 + c * r2).toFixed(2)}" stroke="${long ? '#93E7F5' : 'rgba(147,169,193,.5)'}" stroke-width="${long ? 1.6 : 0.8}"/>`);
  }
  const card = [['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([t, a]: any) => { const s = Math.sin(a * Math.PI / 180), c = -Math.cos(a * Math.PI / 180);
    return `<text x="${(100 + s * 78).toFixed(1)}" y="${(100 + c * 78 + 3.4).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="${t === 'N' ? '#E04BD6' : '#93A9C1'}">${t}</text>`; }).join('');
  const point = (rot: number, len: number, w: number, lit: string, dark: string) => `<g transform="rotate(${rot} 100 100)"><path d="M100 ${100 - len} L${100 + w} 100 L100 100Z" fill="url(#${lit})"/><path d="M100 ${100 - len} L${100 - w} 100 L100 100Z" fill="url(#${dark})"/></g>`;
  return `<svg class="logo" viewBox="0 0 200 200" aria-hidden="true"><defs>
    <linearGradient id="lL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9FCFF"/><stop offset=".55" stop-color="#7FE6F5"/><stop offset="1" stop-color="#3FD0E8"/></linearGradient>
    <linearGradient id="lD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5AD9EC"/><stop offset="1" stop-color="#1F8FB0"/></linearGradient>
    <linearGradient id="lL2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B7F2FB" stop-opacity=".75"/><stop offset="1" stop-color="#3FD0E8" stop-opacity=".35"/></linearGradient>
    <linearGradient id="lD2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FD0E8" stop-opacity=".45"/><stop offset="1" stop-color="#145C7A" stop-opacity=".3"/></linearGradient>
    <linearGradient id="lR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3FD0E8"/><stop offset=".6" stop-color="#7FA8F5"/><stop offset="1" stop-color="#E04BD6"/></linearGradient>
    <radialGradient id="lC" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#C8F6FF"/><stop offset="1" stop-color="#3FD0E8"/></radialGradient>
    <radialGradient id="lF" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#123457"/><stop offset=".75" stop-color="#0A1D35"/><stop offset="1" stop-color="#071426"/></radialGradient></defs>
    <circle cx="100" cy="100" r="97" fill="url(#lF)"/><g>${ticks.join('')}${card}</g>
    <circle cx="100" cy="100" r="70" fill="none" stroke="url(#lR)" stroke-width="2"/><circle cx="100" cy="100" r="64" fill="none" stroke="rgba(127,168,245,.35)" stroke-width="1" stroke-dasharray="2 4"/>
    <g class="orbit"><path d="M100 30 A70 70 0 0 1 149.5 50.5" fill="none" stroke="url(#lR)" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
      <path fill="#E9FCFF" transform="translate(149.5 50.5) rotate(135) scale(.42) translate(-12 -12)" d="M21 15.5v-1.8l-8-5V3.6a1.5 1.5 0 0 0-3 0v5.1l-8 5v1.8l8-2.5v5l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z"/></g>
    <g class="star"><g>${[45, 135, 225, 315].map(r => point(r, 40, 7, 'lL2', 'lD2')).join('')}</g>${[0, 90, 180, 270].map(r => point(r, 58, 11, 'lL', 'lD')).join('')}<circle cx="100" cy="100" r="5.2" fill="url(#lC)"/></g></svg>`;
}

const PLANE = 'M21 15.5v-1.8l-8-5V3.6a1.5 1.5 0 0 0-3 0v5.1l-8 5v1.8l8-2.5v5l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z';

export function setupHtml(mode: 'install' | 'uninstall', appName: string, version: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${mode === 'install' ? appName + ' Setup' : 'Remove ' + appName}</title><link rel="icon" href="/icon.ico">
<style>
:root { --bg: #050E1C; --bg2: #0A1D35; --panel: rgba(13, 30, 54, .72); --line: rgba(127, 168, 245, .18); --ink: #EAF2FA; --ink2: #B8C9DB; --ink3: #7F98B0;
  --cyan: #3FD0E8; --cyan2: #9BE7FF; --mag: #E04BD6; --lav: #7FA8F5; --ok: #4ADE9B; --warn: #F2B544; --bad: #FF6B7A; --ease: cubic-bezier(.22,.8,.24,1); }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--ink); font: 14px/1.45 "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif; overflow: hidden; user-select: none; }
canvas#sky { position: fixed; inset: 0; width: 100%; height: 100%; }
.glow { position: fixed; width: 70vmax; height: 70vmax; border-radius: 50%; filter: blur(60px); opacity: .32; pointer-events: none; }
.g1 { left: -20vmax; top: -25vmax; background: radial-gradient(circle, #1E6FA8, transparent 65%); animation: drift 18s ease-in-out infinite alternate; }
.g2 { right: -25vmax; bottom: -30vmax; background: radial-gradient(circle, #6A2C8A, transparent 65%); animation: drift 22s ease-in-out -6s infinite alternate-reverse; }
@keyframes drift { to { transform: translate(6vmax, 4vmax) scale(1.1); } }
.app { position: relative; z-index: 1; height: 100%; display: grid; grid-template-columns: minmax(260px, 38%) 1fr; }
@media (max-width: 760px) { .app { grid-template-columns: 1fr; grid-template-rows: auto 1fr; } .hero { padding: 18px 20px 6px !important; flex-direction: row !important; gap: 16px; text-align: left !important; } .hero .logo-wrap { width: 72px !important; height: 72px !important; } .hero .tag, .hero .facts { display: none !important; } }
.hero { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 32px; gap: 18px; border-right: 1px solid var(--line); background: linear-gradient(180deg, rgba(10,29,53,.55), rgba(5,14,28,.2)); }
.logo-wrap { position: relative; width: clamp(140px, 26vmin, 230px); height: clamp(140px, 26vmin, 230px); }
.logo-wrap::before { content: ''; position: absolute; inset: -18%; border-radius: 50%; background: radial-gradient(circle, rgba(63,208,232,.35), transparent 62%); animation: pulse 3.2s ease-in-out infinite; }
.logo { position: relative; width: 100%; height: 100%; filter: drop-shadow(0 10px 30px rgba(0,0,0,.5)); }
.logo .star { transform-origin: 100px 100px; animation: wobble 9s ease-in-out infinite; }
.logo .orbit { transform-origin: 100px 100px; animation: spin 7s linear infinite; }
.busy .logo .orbit { animation-duration: 1.6s; } .busy .logo .star { animation: spin 14s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } } @keyframes wobble { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes pulse { 0%,100% { transform: scale(.94); opacity: .7; } 50% { transform: scale(1.05); opacity: 1; } }
.hero h1 { margin: 0; font: 600 clamp(22px, 3.4vmin, 30px)/1.1 "Segoe UI Variable Display", "Segoe UI", sans-serif; letter-spacing: .01em; background: linear-gradient(90deg, #E9FCFF, var(--cyan2) 45%, var(--lav) 80%, #F3A6EE); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero .ver { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 99px; border: 1px solid var(--line); color: var(--cyan2); font-size: 12.5px; background: rgba(63,208,232,.08); }
.hero .tag { color: var(--ink2); max-width: 300px; font-size: 13.5px; }
.facts { display: grid; gap: 8px; width: min(300px, 100%); text-align: left; }
.facts div { display: flex; gap: 10px; align-items: center; color: var(--ink2); font-size: 12.5px; }
.facts i { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; background: rgba(63,208,232,.12); color: var(--cyan); font-style: normal; font-size: 12px; flex: none; }
.main { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 26px clamp(18px, 4vw, 42px) 22px; }
.steps { display: flex; gap: 6px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
.steps span { display: flex; align-items: center; gap: 8px; color: var(--ink3); font-size: 12.5px; font-weight: 600; letter-spacing: .02em; transition: color .4s; }
.steps span b { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; border: 1.5px solid var(--line); font-size: 11px; transition: all .4s var(--ease); }
.steps span.on { color: var(--ink); } .steps span.on b { border-color: var(--cyan); background: var(--cyan); color: #04121F; box-shadow: 0 0 16px rgba(63,208,232,.6); }
.steps span.done b { border-color: var(--ok); color: var(--ok); }
.steps em { flex: 0 0 22px; height: 1.5px; background: var(--line); }
.view { position: relative; flex: 1; min-height: 0; }
.page { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 14px; opacity: 0; transform: translateX(26px); pointer-events: none; transition: opacity .45s ease, transform .55s var(--ease); overflow: auto; padding-right: 4px; }
.page.on { opacity: 1; transform: none; pointer-events: auto; } .page.left { transform: translateX(-26px); }
h2 { margin: 0; font: 600 clamp(20px, 2.8vmin, 26px)/1.2 "Segoe UI Variable Display", "Segoe UI", sans-serif; }
p { margin: 0; color: var(--ink2); }
.card { border: 1px solid var(--line); border-radius: 16px; background: var(--panel); backdrop-filter: blur(10px); padding: 14px 16px; }
.where { display: flex; align-items: center; gap: 12px; }
.where .path { flex: 1; min-width: 0; font: 600 13.5px/1.3 "Cascadia Mono", Consolas, monospace; color: var(--cyan2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.where small, .muted { color: var(--ink3); font-size: 12px; }
.opt { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); cursor: pointer; }
.opt:first-child { border-top: 0; } .opt span { flex: 1; } .opt span b { display: block; font-weight: 600; } .opt span small { color: var(--ink3); font-size: 12px; }
.tg { position: relative; width: 42px; height: 24px; border-radius: 99px; background: rgba(255,255,255,.12); border: 1px solid var(--line); transition: background .3s; flex: none; }
.tg::after { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #CFE0F0; transition: transform .35s var(--ease), background .3s; }
.tg.on { background: linear-gradient(90deg, #1F8FB0, var(--cyan)); } .tg.on::after { transform: translateX(18px); background: #fff; }
.tg.lock { opacity: .85; } .tg.danger.on { background: linear-gradient(90deg, #8A2340, var(--bad)); }
.btns { display: flex; gap: 10px; justify-content: flex-end; align-items: center; margin-top: auto; padding-top: 6px; flex-wrap: wrap; }
button { font: inherit; cursor: pointer; }
.btn { position: relative; border: 1px solid var(--line); border-radius: 12px; padding: 10px 18px; background: rgba(255,255,255,.05); color: var(--ink); font-weight: 600; transition: transform .2s, background .2s, border-color .2s, box-shadow .3s; }
.btn:hover { background: rgba(255,255,255,.1); border-color: rgba(127,168,245,.4); transform: translateY(-1px); }
.btn.primary { border: 0; color: #04121F; background: linear-gradient(90deg, var(--cyan), #7FE6F5 25%, var(--lav) 50%, #7FE6F5 75%, var(--cyan)); background-size: 200% 100%; box-shadow: 0 8px 28px rgba(63,208,232,.35); padding: 11px 26px; animation: sheen 4s linear infinite; }
.btn.primary:hover { box-shadow: 0 10px 34px rgba(63,208,232,.55); }
.btn.danger { border: 0; color: #fff; background: linear-gradient(90deg, #B2304F, var(--bad)); box-shadow: 0 8px 28px rgba(255,107,122,.3); }
.btn:disabled { opacity: .45; pointer-events: none; }
@keyframes sheen { to { background-position: -200% 0; } }
.link { background: none; border: 0; color: var(--cyan2); padding: 6px 4px; font-weight: 600; } .link:hover { color: #fff; }
.drives { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.drive { text-align: left; border: 1px solid var(--line); border-radius: 14px; padding: 11px 12px; background: rgba(255,255,255,.03); color: var(--ink); transition: all .25s var(--ease); }
.drive:hover { border-color: rgba(63,208,232,.5); transform: translateY(-2px); }
.drive.on { border-color: var(--cyan); background: rgba(63,208,232,.1); box-shadow: 0 0 0 1px var(--cyan) inset, 0 8px 22px rgba(63,208,232,.18); }
.drive b { font-size: 15px; } .drive small { display: block; color: var(--ink3); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar { height: 5px; border-radius: 9px; background: rgba(255,255,255,.08); margin-top: 8px; overflow: hidden; } .bar i { display: block; height: 100%; border-radius: 9px; background: linear-gradient(90deg, var(--cyan), var(--lav)); }
.bar.low i { background: linear-gradient(90deg, var(--warn), var(--bad)); }
.browser { display: flex; flex-direction: column; min-height: 170px; flex: 1; }
.crumbs { display: flex; gap: 2px; align-items: center; flex-wrap: wrap; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
.crumbs button { background: none; border: 0; color: var(--ink2); padding: 3px 6px; border-radius: 7px; font-weight: 600; } .crumbs button:hover { background: rgba(255,255,255,.08); color: #fff; }
.crumbs i { color: var(--ink3); font-style: normal; }
.list { flex: 1; overflow: auto; padding: 6px 0; min-height: 90px; max-height: 32vh; }
.list button { display: flex; width: 100%; align-items: center; gap: 10px; text-align: left; background: none; border: 0; color: var(--ink); padding: 7px 8px; border-radius: 9px; }
.list button:hover { background: rgba(63,208,232,.1); } .list .fi { width: 18px; height: 14px; border-radius: 3px; background: linear-gradient(180deg, #F2C66B, #C9922E); position: relative; flex: none; }
.list .fi::before { content: ''; position: absolute; left: 0; top: -3px; width: 8px; height: 4px; border-radius: 2px 2px 0 0; background: #F2C66B; }
.list .empty { color: var(--ink3); padding: 10px 8px; }
.row { display: flex; gap: 8px; align-items: center; }
input[type=text] { flex: 1; min-width: 0; border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; background: rgba(0,0,0,.25); color: var(--ink); font: 13px "Cascadia Mono", Consolas, monospace; outline: none; transition: border-color .2s, box-shadow .2s; }
input[type=text]:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(63,208,232,.18); }
.final { display: flex; gap: 10px; align-items: center; padding: 10px 14px; border-radius: 12px; background: linear-gradient(90deg, rgba(63,208,232,.12), rgba(127,168,245,.06)); border: 1px solid rgba(63,208,232,.3); }
.final .path { font: 600 13px "Cascadia Mono", Consolas, monospace; color: #fff; word-break: break-all; }
.note { font-size: 12.5px; padding: 9px 12px; border-radius: 10px; }
.note.warn { background: rgba(242,181,68,.12); color: #FFD891; border: 1px solid rgba(242,181,68,.3); } .note.bad { background: rgba(255,107,122,.12); color: #FFB3BC; border: 1px solid rgba(255,107,122,.3); }
.note.ok { background: rgba(74,222,155,.1); color: #A6F2CD; border: 1px solid rgba(74,222,155,.25); }
/* installing */
.big { display: flex; align-items: baseline; gap: 6px; } .big b { font: 700 clamp(48px, 10vmin, 84px)/1 "Segoe UI Variable Display", "Segoe UI", sans-serif; background: linear-gradient(180deg, #fff, var(--cyan2)); -webkit-background-clip: text; background-clip: text; color: transparent; font-variant-numeric: tabular-nums; }
.big span { color: var(--cyan2); font-size: 24px; font-weight: 600; }
.route { position: relative; height: 56px; margin: 6px 24px 0 6px; }
.route .track { position: absolute; left: 0; right: 0; top: 27px; height: 3px; background: repeating-linear-gradient(90deg, rgba(147,169,193,.35) 0 10px, transparent 10px 18px); border-radius: 3px; }
.route .fill { position: absolute; left: 0; top: 25px; height: 7px; width: 0; border-radius: 7px; background: linear-gradient(90deg, #1F6FB0, var(--cyan) 55%, #C8F6FF); box-shadow: 0 0 18px rgba(63,208,232,.7), 0 0 4px #fff inset; transition: width .35s linear; overflow: hidden; }
.route .fill::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); width: 40%; animation: run 1.3s linear infinite; }
@keyframes run { from { transform: translateX(-100%); } to { transform: translateX(260%); } }
.route .tip { position: absolute; top: 9px; left: 0; width: 38px; height: 38px; margin-left: -19px; transition: left .35s linear; filter: drop-shadow(0 0 10px rgba(63,208,232,.9)); }
.route .tip svg { width: 100%; height: 100%; transform: rotate(90deg); fill: #fff; }
.route .dot { position: absolute; top: 22px; width: 13px; height: 13px; margin-left: -6.5px; border-radius: 50%; border: 2px solid rgba(147,169,193,.5); background: var(--bg2); transition: all .4s; }
.route .dot.on { border-color: var(--cyan); background: var(--cyan); box-shadow: 0 0 12px var(--cyan); }
.route .end { left: 100%; } .route .start { left: 0; }
.spark { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #C8F6FF; pointer-events: none; animation: spark .9s ease-out forwards; }
@keyframes spark { to { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0; } }
.now { display: flex; justify-content: space-between; gap: 12px; color: var(--ink2); font-size: 12.5px; } .now .file { font-family: "Cascadia Mono", Consolas, monospace; color: var(--ink3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.checks { display: grid; gap: 8px; }
.checks div { display: flex; align-items: center; gap: 10px; color: var(--ink3); transition: color .3s; }
.checks div i { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--line); display: grid; place-items: center; font-style: normal; font-size: 11px; transition: all .35s var(--ease); flex: none; }
.checks div.run { color: var(--ink); } .checks div.run i { border-color: var(--cyan); border-top-color: transparent; animation: spin .8s linear infinite; }
.checks div.ok { color: var(--ink2); } .checks div.ok i { border-color: var(--ok); background: var(--ok); color: #04121F; }
/* done */
.done-mark { position: relative; width: 96px; height: 96px; margin: 6px 0 4px; }
.done-mark svg { width: 100%; height: 100%; } .done-mark circle { stroke-dasharray: 290; stroke-dashoffset: 290; animation: draw .9s var(--ease) forwards; }
.done-mark path { stroke-dasharray: 70; stroke-dashoffset: 70; animation: draw .5s .6s var(--ease) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.modal { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; background: rgba(2,8,16,.6); backdrop-filter: blur(6px); opacity: 0; pointer-events: none; transition: opacity .3s; }
.modal.on { opacity: 1; pointer-events: auto; } .modal .card { width: min(440px, 90vw); display: grid; gap: 12px; transform: scale(.96); transition: transform .35s var(--ease); } .modal.on .card { transform: none; } .modal input[type=text] { width: 100%; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
</style></head><body class="${mode}">
<canvas id="sky"></canvas><div class="glow g1"></div><div class="glow g2"></div>
<div class="app">
  <aside class="hero"><div class="logo-wrap">${logoSvg()}</div>
    <div><h1>${appName}</h1><span class="ver">Version ${version}</span></div>
    <p class="tag">${mode === 'install' ? 'Run your own airline, linked to Microsoft Flight Simulator.' : 'Taking the app off this PC.'}</p>
    <div class="facts">${mode === 'install' ? '<div><i>⌂</i>Installs where you choose, in a folder of its own</div><div><i>★</i>A shortcut on your desktop, always the newest</div><div><i>↻</i>Your airline is kept when you update</div>' : '<div><i>✓</i>Every file and the folder itself are removed</div><div><i>★</i>The shortcuts go too</div><div><i>♥</i>Your saved airline stays, unless you choose otherwise</div>'}</div>
  </aside>
  <main class="main">
    <div class="steps" id="steps"></div>
    <div class="view" id="view"></div>
  </main>
</div>
<div class="modal" id="modal"><div class="card" id="modalCard"></div></div>
<script>
const MODE = ${JSON.stringify(mode)}, APP = ${JSON.stringify(appName)}, PLANE = ${JSON.stringify(PLANE)};
const $ = s => document.querySelector(s), api = (u, b) => fetch(u, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : undefined).then(r => r.json());
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gb = n => n >= 1e12 ? (n / 1e12).toFixed(1) + ' TB' : n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : (n / 1e6).toFixed(0) + ' MB';
let S = { page: '', dir: '', startMenu: true, launch: true, deleteData: false, browse: '', drives: [], labels: {}, need: 0, info: null };

/* the sky: stars drifting by and now and then a flight path drawn across it */
(() => { const c = $('#sky'), x = c.getContext('2d'); let W, H, stars = [], trails = [];
  const fit = () => { W = c.width = innerWidth * devicePixelRatio; H = c.height = innerHeight * devicePixelRatio; stars = Array.from({ length: Math.round(W * H / 9000) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), t: Math.random() * 6 })); };
  fit(); addEventListener('resize', fit);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = (now) => { x.clearRect(0, 0, W, H);
    for (const s of stars) { s.x -= (0.05 + s.z * 0.25) * devicePixelRatio * (calm ? 0 : 1); if (s.x < 0) s.x = W; const a = 0.25 + 0.55 * s.z * (0.6 + 0.4 * Math.sin(now / 900 + s.t)); x.fillStyle = 'rgba(200,236,255,' + a + ')'; x.fillRect(s.x, s.y, 1 + s.z * devicePixelRatio, 1 + s.z * devicePixelRatio); }
    if (!calm && Math.random() < 0.006 && trails.length < 3) trails.push({ x0: -50, y0: H * (0.2 + Math.random() * 0.6), a: -0.25 + Math.random() * 0.5, k: 0, v: 0.0016 + Math.random() * 0.001 });
    for (const t of trails) { t.k += t.v; const L = W * 1.2, ex = t.x0 + L * t.k, ey = t.y0 + Math.sin(t.a) * L * t.k * 0.4;
      const g = x.createLinearGradient(ex - 220 * devicePixelRatio, ey, ex, ey); g.addColorStop(0, 'rgba(63,208,232,0)'); g.addColorStop(1, 'rgba(155,231,255,.55)');
      x.strokeStyle = g; x.lineWidth = 1.4 * devicePixelRatio; x.beginPath(); x.moveTo(ex - 220 * devicePixelRatio, ey - Math.sin(t.a) * 88 * devicePixelRatio); x.lineTo(ex, ey); x.stroke();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex, ey, 1.8 * devicePixelRatio, 0, 7); x.fill(); }
    trails = trails.filter(t => t.k < 1); requestAnimationFrame(tick); };
  requestAnimationFrame(tick); })();

/* pages */
const STEPS = MODE === 'install' ? [['welcome', 'Welcome'], ['place', 'Location'], ['work', 'Installing'], ['end', 'Done']] : [['welcome', 'Remove'], ['work', 'Removing'], ['end', 'Done']];
function steps(cur) { const i = STEPS.findIndex(s => s[0] === cur || (cur === 'place' && s[0] === 'place'));
  $('#steps').innerHTML = STEPS.map((s, j) => '<span class="' + (j === i ? 'on' : j < i ? 'done' : '') + '"><b>' + (j < i ? '✓' : j + 1) + '</b>' + s[1] + '</span>' + (j < STEPS.length - 1 ? '<em></em>' : '')).join(''); }
function show(id, html) {
  const v = $('#view'), old = v.querySelector('.page.on'); const back = S.page && STEPS.findIndex(s => s[0] === id) < STEPS.findIndex(s => s[0] === S.page);
  const pg = document.createElement('div'); pg.className = 'page' + (back ? ' left' : ''); pg.innerHTML = html; v.appendChild(pg);
  if (old) { old.classList.remove('on'); old.classList.toggle('left', !back); setTimeout(() => old.remove(), 600); }
  requestAnimationFrame(() => requestAnimationFrame(() => { pg.classList.remove('left'); pg.classList.add('on'); }));
  S.page = id; steps(id); return pg; }
function modal(html) { $('#modalCard').innerHTML = html; $('#modal').classList.toggle('on', !!html); }

/* install: welcome */
function welcome() {
  if (MODE === 'uninstall') return removeWelcome();
  const up = S.info.installed;
  const pg = show('welcome', '<h2>' + (up ? 'Update to version ' + esc(S.info.version) : 'Install ' + esc(APP)) + '</h2>'
    + '<p>' + (up ? 'Version ' + esc(up.version || '') + ' is installed. The new version goes in the same place; your airline and settings are kept.' : 'Everything goes into one folder named ' + esc(APP) + ', wherever you choose.') + '</p>'
    + '<div class="card where"><span style="flex:1;min-width:0"><small>Installs into</small><div class="path" id="wPath"></div><small id="wSpace"></small></span><button class="btn" data-a="place">Change…</button></div>'
    + '<div class="card"><div class="opt"><span><b>Shortcut on the desktop</b><small>Always placed; any older ' + esc(APP) + ' shortcut is replaced with the new one</small></span><i class="tg on lock"></i></div>'
    + '<label class="opt" data-a="sm"><span><b>Start menu</b><small>' + esc(APP) + ' in the Start menu and in Windows search</small></span><i class="tg ' + (S.startMenu ? 'on' : '') + '" id="tSm"></i></label>'
    + '<label class="opt" data-a="ln"><span><b>Start ' + esc(APP) + ' when it is installed</b><small>Opens the app straight away</small></span><i class="tg ' + (S.launch ? 'on' : '') + '" id="tLn"></i></label></div>'
    + '<div id="wNote"></div><div class="btns"><button class="btn" data-a="quit">Cancel</button><button class="btn primary" data-a="go" id="goBtn">' + (up ? 'Update' : 'Install') + '</button></div>');
  check(); }
async function check() {
  const r = await api('/api/check', { dir: S.dir }); S.final = r.final;
  const p = $('#wPath'); if (p) { p.textContent = r.final; $('#wSpace').textContent = 'Needs ' + gb(S.need) + (r.free >= 0 ? ' · ' + gb(r.free) + ' free on ' + r.root : ''); }
  const n = $('#wNote') || $('#pNote'), go = $('#goBtn') || $('#useBtn');
  let h = ''; if (r.free >= 0 && r.free < S.need * 1.05) h = '<div class="note bad">There isn\\'t enough room on ' + esc(r.root) + ': ' + gb(S.need) + ' is needed.</div>';
  else if (!r.writable) h = '<div class="note warn">Windows only lets administrators install here. <button class="link" data-a="admin">Install with administrator rights</button> or choose another folder.</div>';
  if (n) n.innerHTML = h; if (go) go.disabled = !!(r.free >= 0 && r.free < S.need * 1.05) || (!r.writable && go.id === 'goBtn');
  return r; }

/* install: choosing the drive and folder */
async function place() {
  show('place', '<h2>Where should it go?</h2><p>Pick a drive and a folder. A folder named <b style="color:#fff">' + esc(APP) + '</b> is made inside it for all its files.</p>'
    + '<div class="drives" id="drives"></div>'
    + '<div class="card browser"><div class="crumbs" id="crumbs"></div><div class="list" id="list"></div>'
    + '<div class="row"><input type="text" id="typed" spellcheck="false" placeholder="Or type a folder, e.g. D:\\\\Games"><button class="btn" data-a="mk">New folder</button></div></div>'
    + '<div class="final"><span class="muted">Installs into</span><span class="path" id="pFinal"></span></div><div id="pNote"></div>'
    + '<div class="btns"><button class="btn" data-a="back">Back</button><button class="btn primary" data-a="use" id="useBtn">Use this folder</button></div>');
  drawDrives(); browse(S.browse || parentOf(S.final || S.dir)); }
function parentOf(p) { const s = String(p || '').replace(/[\\\\/]+$/, ''); const i = s.lastIndexOf('\\\\'); return i > 2 ? s.slice(0, i) : s.slice(0, 3); }
function drawDrives() { const d = $('#drives'); if (!d) return; const cur = (S.browse || S.dir || '').slice(0, 3).toUpperCase();
  d.innerHTML = S.drives.map(v => { const lb = S.labels[v.root] || {}, used = 1 - v.free / Math.max(1, v.size), low = v.free < S.need * 1.05;
    return '<button class="drive ' + (cur === v.root.toUpperCase() ? 'on' : '') + '" data-a="drive" data-r="' + esc(v.root) + '"><b>' + esc(v.root.slice(0, 2)) + '</b> <small>' + esc(lb.label || (lb.kind === 'removable' ? 'Removable drive' : lb.kind === 'network' ? 'Network drive' : 'Local disk')) + '</small>'
      + '<div class="bar ' + (low ? 'low' : '') + '"><i style="width:' + Math.round(used * 100) + '%"></i></div><small>' + gb(v.free) + ' free of ' + gb(v.size) + '</small></button>'; }).join(''); }
async function browse(dir) {
  const r = await api('/api/list', { dir }); S.browse = r.dir; S.dir = r.dir;
  const parts = r.dir.split('\\\\').filter(Boolean); let acc = '';
  $('#crumbs').innerHTML = parts.map((p, i) => { acc += (i ? '\\\\' : '') + p + (i ? '' : '\\\\'); return (i ? '<i>›</i>' : '') + '<button data-a="cd" data-d="' + esc(acc) + '">' + esc(p) + '</button>'; }).join('');
  $('#list').innerHTML = (r.parent ? '<button data-a="cd" data-d="' + esc(r.parent) + '"><span class="fi" style="opacity:.5"></span>.. (up)</button>' : '')
    + (r.folders.length ? r.folders.map(f => '<button data-a="cd" data-d="' + esc(f.path) + '"><span class="fi"></span>' + esc(f.name) + '</button>').join('') : '<div class="empty">No folders here. Install here, or make a new folder.</div>');
  $('#typed').value = r.dir; drawDrives(); const c = await check(); $('#pFinal').textContent = c.final; }

/* installing and removing: the route line */
function workPage(title) {
  document.body.classList.add('busy');
  show('work', '<h2>' + title + '</h2><div class="big"><b id="pct">0</b><span>%</span></div>'
    + '<div class="route" id="route"><div class="track"></div><div class="fill" id="fill"></div><span class="dot start on"></span><span class="dot" style="left:33%"></span><span class="dot" style="left:66%"></span><span class="dot end"></span><span class="tip" id="tip"><svg viewBox="0 0 24 24"><path d="' + PLANE + '"/></svg></span></div>'
    + '<div class="now"><span id="step">Getting ready…</span><span id="rate"></span></div><div class="now"><span class="file" id="file"></span></div>'
    + '<div class="card checks" id="checks"></div>'); }
const PHASES_I = [['Getting the folder ready', 1], ['Copying the files', 5], ['Placing the shortcut on your desktop', 91], ['Registering with Windows', 96]];
const PHASES_U = [['Removing the shortcuts', 5], ['Removing it from Windows\\' list of apps', 15], ['Removing the files', 20], ['Removing the folder', 95]];
let shown = 0, target = 0, lastSpark = 0;
function anim() { shown += (target - shown) * 0.12; if (Math.abs(target - shown) < 0.05) shown = target;
  const f = $('#fill'), t = $('#tip'), p = $('#pct'); if (f) { f.style.width = shown + '%'; t.style.left = shown + '%'; p.textContent = Math.floor(shown);
    document.querySelectorAll('#route .dot').forEach((d, i) => d.classList.toggle('on', shown >= [0, 33, 66, 100][i]));
    const now = performance.now(); if (target > shown + 0.3 && now - lastSpark > 70) { lastSpark = now; const r = $('#route'), s = document.createElement('i'); s.className = 'spark'; s.style.left = (r.clientWidth * shown / 100 - 18) + 'px'; s.style.top = (24 + Math.random() * 8) + 'px';
      s.style.setProperty('--dx', (-20 - Math.random() * 40) + 'px'); s.style.setProperty('--dy', (Math.random() * 30 - 15) + 'px'); r.appendChild(s); setTimeout(() => s.remove(), 950); } }
  requestAnimationFrame(anim); }
requestAnimationFrame(anim);
function drawProgress(g, phases) { target = g.pct; $('#step').textContent = g.step || ''; $('#file').textContent = g.file || '';
  $('#rate').textContent = g.total && g.rate ? gb(g.done) + ' of ' + gb(g.total) + ' · ' + (g.rate / 1e6).toFixed(0) + ' MB/s' : '';
  $('#checks').innerHTML = phases.map((ph, i) => { const nx = phases[i + 1] ? phases[i + 1][1] : 100.5, st = g.pct >= nx ? 'ok' : g.pct >= ph[1] ? 'run' : ''; return '<div class="' + st + '"><i>' + (st === 'ok' ? '✓' : '') + '</i>' + ph[0] + '</div>'; }).join(''); }
async function follow(phases, done) {
  for (;;) { const g = await api('/api/progress'); if (g.error) return failed(g.error); drawProgress(g, phases); if (g.finished) { target = 100; setTimeout(done, 900); return; } await new Promise(r => setTimeout(r, 120)); } }
function failed(msg) { document.body.classList.remove('busy');
  show('end', '<h2>Something went wrong</h2><div class="note bad">' + esc(msg) + '</div><p>Nothing you saved is lost. Close this window and run Setup again; if it keeps happening, send this message.</p><div class="btns"><button class="btn primary" data-a="quit">Close</button></div>'); }
async function go() {
  const r = await check(); if (!r.writable) return;
  if (S.info.running || (await api('/api/running')).running) return modal('<h2 style="font-size:20px">' + esc(APP) + ' is open</h2><p>It has to close before it can be ' + (MODE === 'install' ? 'updated' : 'removed') + '. Your airline is saved as it closes.</p><div class="btns"><button class="btn" data-a="nomodal">Wait</button><button class="btn primary" data-a="closeapp">Close it and continue</button></div>');
  if (MODE === 'install') { workPage(S.info.installed ? 'Updating ' + esc(APP) : 'Installing ' + esc(APP)); await api('/api/install', { dir: S.dir, startMenu: S.startMenu, launch: S.launch }); follow(PHASES_I, installed); }
  else { workPage('Removing ' + esc(APP)); await api('/api/uninstall', { deleteData: S.deleteData }); follow(PHASES_U, removed); } }
function installed() { document.body.classList.remove('busy');
  show('end', '<div class="done-mark"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#4ADE9B" stroke-width="5"/><path d="M30 52 L45 66 L71 37" fill="none" stroke="#4ADE9B" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
    + '<h2>' + esc(APP) + ' is ' + (S.info.installed ? 'updated' : 'installed') + '</h2><p>It is in <b style="color:#fff">' + esc(S.final) + '</b>. The shortcut is on your desktop' + (S.startMenu ? ' and in the Start menu' : '') + '.</p>'
    + (S.launch ? '<div class="note ok">' + esc(APP) + ' is starting…</div>' : '') + '<div class="btns">' + (S.launch ? '' : '<button class="btn" data-a="launch">Start ' + esc(APP) + '</button>') + '<button class="btn primary" data-a="quit">Finish</button></div>'); }

/* removing */
function removeWelcome() {
  show('welcome', '<h2>Remove ' + esc(APP) + '?</h2><p>Every file, the shortcuts and the folder itself are removed from this PC.</p>'
    + '<div class="card where"><span style="flex:1;min-width:0"><small>Installed in</small><div class="path">' + esc(S.info.dir) + '</div></span></div>'
    + '<div class="card"><label class="opt" data-a="dd"><span><b>Also delete my saved airline and settings</b><small>Your airline, its backups and flight recordings in your app data and Documents. Leave this off to keep them for later.</small></span><i class="tg danger ' + (S.deleteData ? 'on' : '') + '" id="tDd"></i></label></div>'
    + '<div class="btns"><button class="btn" data-a="quit">Keep it</button><button class="btn danger" data-a="go">Remove</button></div>'); }
function removed() { document.body.classList.remove('busy');
  show('end', '<div class="done-mark"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#7FA8F5" stroke-width="5"/><path d="M30 52 L45 66 L71 37" fill="none" stroke="#7FA8F5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
    + '<h2>' + esc(APP) + ' is removed</h2><p>' + (S.deleteData ? 'Your saved airline was deleted too.' : 'Your saved airline is kept: install it again and carry on where you left off.') + ' Thank you for flying with us.</p><div class="btns"><button class="btn primary" data-a="quit">Close</button></div>'); }

/* clicks */
document.addEventListener('click', async e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
  if (a === 'place') place(); else if (a === 'back' || a === 'use') { if (a === 'use') { S.dir = $('#typed').value || S.dir; } welcome(); }
  else if (a === 'sm') { e.preventDefault(); S.startMenu = !S.startMenu; $('#tSm').classList.toggle('on', S.startMenu); }
  else if (a === 'ln') { e.preventDefault(); S.launch = !S.launch; $('#tLn').classList.toggle('on', S.launch); }
  else if (a === 'dd') { e.preventDefault(); S.deleteData = !S.deleteData; $('#tDd').classList.toggle('on', S.deleteData); }
  else if (a === 'drive') browse(b.dataset.r); else if (a === 'cd') browse(b.dataset.d);
  else if (a === 'mk') { modal('<h2 style="font-size:20px">New folder</h2><p>In ' + esc(S.browse) + '</p><input type="text" id="mkName" value="Games" spellcheck="false"><div id="mkErr"></div><div class="btns"><button class="btn" data-a="nomodal">Cancel</button><button class="btn primary" data-a="mkgo">Make the folder</button></div>'); setTimeout(() => { const i = $('#mkName'); i.focus(); i.select(); }, 50); }
  else if (a === 'mkgo') { const r = await api('/api/mkdir', { dir: S.browse, name: $('#mkName').value }); if (r.error) $('#mkErr').innerHTML = '<div class="note bad">' + esc(r.error) + '</div>'; else { modal(''); browse(r.dir); } }
  else if (a === 'go') go(); else if (a === 'nomodal') modal('');
  else if (a === 'closeapp') { modal(''); await api('/api/closeapp', {}); S.info.running = false; go(); }
  else if (a === 'admin') { const r = await api('/api/admin', { dir: S.dir, startMenu: S.startMenu, launch: S.launch }); if (!r.ok) modal('<h2 style="font-size:20px">No administrator rights</h2><p>Windows didn\\'t give them. Choose a folder you can write to, such as one on another drive or in your own user folder.</p><div class="btns"><button class="btn primary" data-a="nomodal">OK</button></div>'); }
  else if (a === 'launch') { api('/api/launch', {}); b.disabled = true; b.textContent = 'Starting…'; }
  else if (a === 'quit') { api('/api/quit', {}); setTimeout(() => window.close(), 150); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'typed') { e.preventDefault(); browse(e.target.value); } if (e.key === 'Enter' && e.target.id === 'mkName') { e.preventDefault(); document.querySelector('[data-a=mkgo]').click(); } if (e.key === 'Escape' && $('#modal').classList.contains('on')) modal(''); });
setInterval(() => fetch('/api/ping').catch(() => {}), 1000);

(async () => { S.info = await api('/api/state'); S.dir = S.info.dir; S.need = S.info.need; S.drives = S.info.drives || [];
  if (S.info.auto) { welcome(); setTimeout(go, 500); } else welcome();
  api('/api/labels').then(l => { S.labels = l || {}; drawDrives(); }); })();
</script></body></html>`;
}
