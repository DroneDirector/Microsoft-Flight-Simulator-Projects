// Packs the crew base bodies into assets/humans.bin.
// Source: the MakeHuman base mesh, targets and rig (CC0 1.0). Run once when the bodies change:
//   node tools/human-data/pack.js <path to makehuman/data>
// The app blends these six posed bodies at runtime (male/female × three face types) and adds
// clothes, hair and the chosen proportions on top.
const fs = require('fs'), path = require('path');
if (process.argv[2]) process.env.MH_DATA = process.argv[2];
const { build } = require('./body.js');
const BODIES = [];
for (const sex of ['m', 'f']) for (const eth of ['caucasian', 'african', 'asian'])
  BODIES.push({ key: sex + '-' + eth, b: build({ male: sex === 'm' ? 1 : 0, eth: { [eth]: 1 }, stylise: 0 }) });
const n = BODIES[0].b.pos.length / 3, idx = BODIES[0].b.idx;
// shared per-vertex weights: arm, leg, head (0..1) as bytes
const shared = new Uint8Array(n * 3);
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) shared[i * 3 + k] = Math.round(Math.min(1, Math.max(0, BODIES[0].b.A[i * 4 + 1 + k])) * 255);
const chans = b => [[b.pos, 3, 0], [b.pos, 3, 1], [b.pos, 3, 2], [b.rest, 3, 0], [b.rest, 3, 1], [b.rest, 3, 2], [b.A, 4, 0], [b.B, 4, 0], [b.B, 4, 1], [b.B, 4, 2]];
const header = { n, tris: idx.length / 3, channels: ['px', 'py', 'pz', 'rx', 'ry', 'rz', 'arm', 'hx', 'hy', 'hz'], bodies: [] };
const parts = [];
for (const { key, b } of BODIES) {
  const ranges = [];
  for (const [arr, st, o] of chans(b)) {
    let lo = Infinity, hi = -Infinity; for (let i = 0; i < n; i++) { const v = arr[i * st + o]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const q = new Uint16Array(n); for (let i = 0; i < n; i++) q[i] = Math.round((arr[i * st + o] - lo) / ((hi - lo) || 1) * 65535);
    ranges.push([lo, hi]); parts.push(Buffer.from(q.buffer));
  }
  const info = JSON.parse(JSON.stringify(b.info, (k, v) => typeof v === 'number' ? +v.toFixed(5) : v));
  header.bodies.push({ key, ranges, info });
}
const hj = Buffer.from(JSON.stringify(header));
const len = Buffer.alloc(4); len.writeUInt32LE(hj.length);
const pad = Buffer.alloc((4 - (hj.length % 4)) % 4);
const out = Buffer.concat([Buffer.from('AMPH'), len, hj, pad, Buffer.from(new Uint16Array(idx).buffer), Buffer.from(shared.buffer), Buffer.alloc((4 - (shared.length % 4)) % 4), ...parts]);
const dest = path.join(__dirname, '../../assets/humans.bin');
fs.writeFileSync(dest, out);
console.log('vertices', n, 'triangles', idx.length / 3, 'bytes', out.length, '->', dest);
