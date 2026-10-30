// Flight recordings: a simulated flight is recorded and played back through the tracker, which must reach
// the same results as from the live readings. Then every real recording in test/recordings is played back
// and checked against its .expect.json (written once the flight's results have been confirmed).
const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { FlightTracker } = require('../dist/tracker');
const { FakeSim, FAKE_AIRPORTS } = require('../dist/fake-sim');
const { Recorder } = require('../dist/recorder');
const { loadRecording } = require('../dist/replay');

const types = ev => ev.map(e => e.type + (e.code ? ':' + e.code : ''));

function live(opts, rec) {
  const sim = new FakeSim(opts), tr = new FlightTracker(), ev = [];
  tr.setAirports(FAKE_AIRPORTS);
  tr.on('event', e => ev.push(e));
  let last = null, crashed = false;
  sim.on('crash', () => { crashed = true; tr.crash(last); });
  for (let t = 0; ; t += 0.25) {
    const s = sim.at(t); if (!s) break;
    last = s; tr.update(s);
    if (rec) { if (t === 0) { rec.snapshot(s); rec.airports(FAKE_AIRPORTS); } else rec.snapshot(s); }
  }
  if (rec && crashed) rec.crash();
  return ev;
}

/** Plays a recording through a fresh tracker. */
function playBack(file) {
  const r = loadRecording(file), tr = new FlightTracker(), ev = [];
  tr.on('event', e => ev.push(e));
  let last = null, n = 0;
  for (const it of r.items) {
    if (it.k === 'airports') tr.setAirports(it.list);
    else if (it.k === 's') { last = it.s; tr.update(it.s); n++; }
    else if (it.k === 'crash') tr.crash(last);
  }
  return { ev, n, recorded: r.items.filter(i => i.k === 'event').map(i => i.e) };
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amp-rec-'));
for (const [name, opts] of [['normal', { gsx: true }], ['hard', { hard: true, tailStrike: true }], ['rough', { flapOverspeed: true, turbulence: true }], ['no GSX', {}], ['crash', { crash: true }]]) {
  const rec = new Recorder(path.join(dir, name.replace(/ /g, '')), 'test');
  const a = live(opts, rec); rec.close();
  const size = fs.statSync(rec.file).size;
  const b = playBack(rec.file);
  console.log(`${name.padEnd(7)}: ${b.n} readings kept, ${(size / 1024).toFixed(0)} kB; ${types(b.ev).join(', ')}`);
  assert.deepStrictEqual(types(b.ev), types(a), name + ': played back events differ');
  const td = e => e.find(x => x.type === 'touchdown'), on = e => e.find(x => x.type === 'blocks-on');
  if (td(a)) { assert.strictEqual(td(b.ev).fpm, td(a).fpm); assert.strictEqual(td(b.ev).airport, td(a).airport); }
  if (on(a)) {
    const x = on(a).summary, y = on(b.ev).summary;
    assert.strictEqual(y.from, x.from); assert.strictEqual(y.to, x.to); assert.strictEqual(y.pax, x.pax);
    assert(Math.abs(y.distanceNm - x.distanceNm) <= Math.max(2, x.distanceNm * 0.01), `distance ${y.distanceNm} vs ${x.distanceNm}`);
    assert(Math.abs(y.fuelUsedKg - x.fuelUsedKg) <= 20, `fuel ${y.fuelUsedKg} vs ${x.fuelUsedKg}`);
    assert(Math.abs(y.blockMin - x.blockMin) <= 1, `block ${y.blockMin} vs ${x.blockMin}`);
  }
}

// a recording cut short (the PC app closed mid-write) still plays
const f = path.join(dir, 'cut.jsonl');
fs.writeFileSync(f, fs.readFileSync(fs.readdirSync(path.join(dir, 'normal')).map(x => path.join(dir, 'normal', x))[0], 'utf8').slice(0, 20000) + '{"k":"s","t":9');
assert(playBack(f).n > 10);
console.log('cut    : plays up to where it stopped');

// real flights from the simulator
const real = path.join(__dirname, 'recordings');
let count = 0;
for (const name of fs.existsSync(real) ? fs.readdirSync(real).filter(x => /\.jsonl(\.gz)?$/.test(x)).sort() : []) {
  const file = path.join(real, name), expFile = file.replace(/\.jsonl(\.gz)?$/, '.expect.json');
  const r = playBack(file);
  console.log(`real   : ${name}: ${r.n} readings; ${types(r.ev).join(', ') || 'no events'}`);
  if (!fs.existsSync(expFile)) { console.log('         (no .expect.json yet: results only shown)'); continue; }
  const exp = JSON.parse(fs.readFileSync(expFile, 'utf8'));
  if (exp.events) assert.deepStrictEqual(types(r.ev), exp.events, name + ': events');
  const td = r.ev.find(e => e.type === 'touchdown'), on = r.ev.find(e => e.type === 'blocks-on');
  if (exp.touchdownFpm) assert(td && td.fpm >= exp.touchdownFpm[0] && td.fpm <= exp.touchdownFpm[1], `${name}: touchdown ${td && td.fpm} fpm`);
  if (exp.from) assert.strictEqual(on && on.summary.from, exp.from, name + ': from');
  if (exp.to) assert.strictEqual(on && on.summary.to, exp.to, name + ': to');
  if (exp.pax != null) assert.strictEqual(on && on.summary.pax, exp.pax, name + ': passengers');
  count++;
}
console.log(`All recording tests passed${count ? ` (${count} real flights)` : ''}`);
