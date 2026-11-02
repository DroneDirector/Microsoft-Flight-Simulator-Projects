// Pairs a WebSocket client with the link server and runs a fast simulated flight through it.
const assert = require('assert');
const dgram = require('dgram');
const os = require('os'), path = require('path'), fs = require('fs');
const { LinkServer } = require('../dist/server');
const { FakeSim } = require('../dist/fake-sim');
const { run } = require('../dist/main');
const { LINK_PORT, DISCOVERY_PORT } = require('../dist/protocol');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amp-'));
  const server = new LinkServer(dir, 'test');
  await server.start();
  // discovery
  const found = await new Promise(res => {
    const u = dgram.createSocket('udp4');
    u.on('message', m => { res(JSON.parse(m.toString().slice(4))); u.close(); });
    u.bind(0, () => { u.setBroadcast(true); u.send(Buffer.from('AMP?'), DISCOVERY_PORT, '127.0.0.1'); });
  });
  console.log('discovery:', found.pcName, found.port);
  assert.strictEqual(found.port, LINK_PORT);

  const sim = new FakeSim({ speed: 2000, gsx: true });
  run(sim, server, () => {});
  const got = { state: 0, events: [], airports: 0 };
  const ws = new WebSocket(`ws://127.0.0.1:${LINK_PORT}`);
  const msgs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); msgs.push(d);
    if (d.type === 'state') got.state++; if (d.type === 'event') got.events.push(d.e.type); if (d.type === 'airports') got.airports = d.list.length; };
  await new Promise(r => ws.onopen = r);
  // wait for the answers themselves (a slow test machine can take longer than a moment)
  const results = n => new Promise((r, no) => { const t0 = Date.now(); const k = () => { const l = msgs.filter(m => m.type === 'pair-result'); if (l.length >= n) r(l); else if (Date.now() - t0 > 5000) no(new Error('no pairing answer')); else setTimeout(k, 25); }; k(); });
  ws.send(JSON.stringify({ type: 'pair', code: '000000', device: 'Test phone' }));
  const bad = (await results(1))[0];
  assert.strictEqual(bad.ok, false);
  ws.send(JSON.stringify({ type: 'pair', code: server.code, device: 'Test phone' }));
  const ok = (await results(2))[1];
  assert.strictEqual(ok.ok, true); assert(ok.token);
  console.log('pairing: wrong code refused, right code accepted');
  sim.start();
  await new Promise(r => sim.on('done', r));
  await new Promise(r => setTimeout(r, 300));
  console.log('received: states', got.state, 'events', got.events.join(', '), 'airports', got.airports);
  assert(got.state > 0); assert.deepStrictEqual(got.events, ['blocks-off', 'takeoff', 'touchdown', 'blocks-on']);
  ws.close();
  // reconnect with the saved token, no code needed
  const ws2 = new WebSocket(`ws://127.0.0.1:${LINK_PORT}`);
  const m2 = [];
  ws2.onmessage = m => m2.push(JSON.parse(m.data));
  await new Promise(r => ws2.onopen = r);
  ws2.send(JSON.stringify({ type: 'hello', device: 'Test phone', token: ok.token }));
  await new Promise(r => setTimeout(r, 200));
  assert(m2.some(m => m.type === 'pair-result' && m.ok));
  console.log('reconnect with saved token: ok');
  ws2.close(); server.stop();
  console.log('All link tests passed');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
