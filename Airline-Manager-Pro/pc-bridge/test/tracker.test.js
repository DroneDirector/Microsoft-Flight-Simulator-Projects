// Runs simulated flights through the tracker and checks the events.
const assert = require('assert');
const { FlightTracker } = require('../dist/tracker');
const { FakeSim, FAKE_AIRPORTS } = require('../dist/fake-sim');

function fly(opts) {
  const sim = new FakeSim(opts), tr = new FlightTracker(), ev = [];
  tr.setAirports(FAKE_AIRPORTS);
  tr.on('event', e => ev.push(e));
  sim.on('crash', () => tr.crash(last));
  let last = null;
  for (let t = 0; ; t += 0.25) { const s = sim.at(t); if (!s) break; last = s; tr.update(s); }
  return ev;
}
const types = ev => ev.map(e => e.type + (e.code ? ':' + e.code : ''));

let ev = fly({ gsx: true });
console.log('normal  :', types(ev).join(', '));
assert.deepStrictEqual(types(ev), ['blocks-off', 'takeoff', 'touchdown', 'blocks-on']);
const td = ev.find(e => e.type === 'touchdown'), on = ev.find(e => e.type === 'blocks-on');
assert.strictEqual(td.fpm, 172); assert.strictEqual(td.airport, 'EKCH');
assert.strictEqual(on.summary.from, 'EKVG'); assert.strictEqual(on.summary.to, 'EKCH');
assert.strictEqual(on.summary.pax, 168);
assert(on.summary.distanceNm > 650 && on.summary.distanceNm < 760, 'distance ' + on.summary.distanceNm);
assert(on.summary.fuelUsedKg > 2000, 'fuel used ' + on.summary.fuelUsedKg);
console.log('          landing', td.fpm, 'fpm', td.g, 'g, block', on.summary.blockMin, 'min,', on.summary.distanceNm, 'nm, fuel', on.summary.fuelUsedKg, 'kg, pax', on.summary.pax);

ev = fly({ hard: true, tailStrike: true });
console.log('hard    :', types(ev).join(', '));
assert(types(ev).includes('damage:tail-strike'));
assert(types(ev).includes('damage:hard-landing'));

ev = fly({ flapOverspeed: true, turbulence: true });
console.log('rough   :', types(ev).join(', '));
assert(types(ev).includes('damage:flap-overspeed'));
assert(types(ev).includes('turbulence:severe-turbulence'));

ev = fly({ crash: true });
console.log('crash   :', types(ev).join(', '));
assert(types(ev).includes('crash'));

ev = fly({});
const on2 = ev.find(e => e.type === 'blocks-on');
console.log('no GSX  : pax from payload stations =', on2.summary.pax);
assert.strictEqual(on2.summary.pax, 168);
console.log('All tracker tests passed');
