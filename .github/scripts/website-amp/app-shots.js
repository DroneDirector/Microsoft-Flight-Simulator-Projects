// Screenshots of every part of the app (demo airline) for the website's carousel and feature sections.
// Usage: node app-shots.js <app www/index.html> <output folder for .png files>
// The website keeps the same file names, so new versions of the screens simply replace the old ones.
const { chromium } = require('playwright');
const file = process.argv[2], out = process.argv[3];
const clean = `closeAll(); document.querySelectorAll('.toast').forEach(t => t.remove());`;
const click = s => `document.querySelector('${s}').click()`;
const money = `(function(){ const t = State.txns.filter(x => x.kind === 'revenue' && x.lines && x.lines.length > 2)[0] || State.txns.filter(x => x.kind === 'revenue')[0]; ACTIONS['tx-detail']({ getAttribute: () => t.id }, null); })()`;
const plan = [
  ['ops', `go('ops')`, 3500],
  ['map', `go('map')`, 4000],
  ['fleet', `go('fleet')`, 2500],
  ['fleettypes', `go('fleet'); setTimeout(() => ${click('[data-act=fleet-filter][data-f=types]')}, 400)`, 2500],
  ['market', `go('market')`, 2500],
  ['routes', `go('routes')`, 2500],
  ['schedule', `go('schedule')`, 2500],
  ['maint', `go('maint')`, 2500],
  ['finance', `go('finance')`, 2500],
  ['money', `go('finance'); setTimeout(() => ${money}, 800)`, 2500],
  ['logbook', `go('logbook')`, 2000],
  ['pilots', `go('pilots')`, 7000],
  ['cabin', `go('pilots'); setTimeout(() => ${click('[data-act=pilot-tab][data-t=cabin]')}, 400)`, 7000],
  ['hire', `go('pilots'); setTimeout(() => ${click('[data-act=pilot-tab][data-t=hire]')}, 400)`, 7000],
  ['look', `go('pilots'); ACTIONS['edit-my-look']()`, 9000],
  ['ranking', `go('ranking')`, 2500],
  ['inbox', `go('ops'); setTimeout(() => ${click('[data-act=inbox]')}, 500)`, 2500],
  ['settings', `go('ops'); setTimeout(() => ${click('.rail-set')}, 500)`, 2500],
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file); await p.waitForTimeout(4500);
  // no "What's new" or welcome pop-ups in the pictures
  await p.evaluate(`try { closeAll(); } catch (e) {}`);
  let failed = 0;
  for (const [name, js, wait] of plan) {
    try {
      await p.evaluate(clean); await p.evaluate(js); await p.waitForTimeout(wait);
      await p.evaluate(`document.querySelectorAll('.toast').forEach(t => t.remove())`);
      await p.screenshot({ path: `${out}/${name}.png` });
    } catch (e) { failed++; console.log(`${name}: not taken (${e.message.split('\n')[0]}); the website keeps the previous picture`); }
  }
  console.log(`${plan.length - failed} screenshots`, errs.length ? 'page errors: ' + errs.join(' | ') : '');
  await b.close();
})();
