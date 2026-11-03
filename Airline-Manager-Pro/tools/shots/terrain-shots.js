// Pictures of the 3D view's ground at every terrain detail setting, for comparing them side by side.
// Run with the app served at http://localhost:47610/ (as the PC app, so Ultra is offered):
//   node tools/shots/terrain-shots.js <output folder>
// Two places on the Faroe Islands (steep mountains straight out of the sea): over the sea west of Vágar looking
// at the cliffs, and low over the airport looking along the valley. Each in the map look and with satellite imagery.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const CONFIGS = [
  ['before', 'Before (0.9.112)', { v3dTerrainQ: 1, v3dTerrainSmooth: false }],
  ['low', 'Low', { v3dTerrainQ: 0 }],
  ['medium', 'Medium', { v3dTerrainQ: 1 }],
  ['high', 'High', { v3dTerrainQ: 2 }],
  ['veryhigh', 'Very high', { v3dTerrainQ: 3 }],
  ['ultra', 'Ultra (PC)', { v3dTerrainQ: 4 }],
];
const VIEWS = [
  // name, lon, lat, height above sea (m), yaw (0 north, east π/2), pitch
  ['cliffs', -7.62, 62.035, 700, 1.35, -0.12],
  ['valley', -7.30, 62.045, 420, 0.25, -0.10],
  ['coast', -7.05, 61.93, 1600, -0.6, -0.28],
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('page error:', e.message));
  await p.goto('http://localhost:47610/');
  await p.waitForFunction(() => typeof TitleScreen !== 'undefined' && (TitleScreen.on || document.querySelector('[data-act]')), null, { timeout: 120000 });
  await p.waitForTimeout(5000);
  await p.evaluate(() => { try { if (TitleScreen.on) { _tsInput = performance.now(); ACTIONS['ts-continue'](); } } catch (e) {} });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = document.querySelector('[data-act="fs-demo"]'); if (x) x.click(); });
  await p.waitForTimeout(2000);
  for (const sat of [false, true]) {
    for (const [key, label, cfg] of CONFIGS) {
      await p.evaluate(([cfg, sat]) => {
        try { closeAll(); } catch (e) {}
        document.querySelectorAll('.splash, .fp-stack, .bdr, .tour, .toast').forEach(e => e.remove());
        const S = State.settings; delete S.v3dTerrainSmooth;
        Object.assign(S, { cloudKm: 0, v3dPrecip: false, v3dDayNight: false, v3dKm: 150, v3dSat: sat, v3dSatQ: 2, fpOn: false }, cfg);
        try { if (V3d.open) v3dClose(); } catch (e) {}
        v3dOpenAirport('EKVG');
      }, [cfg, sat]);
      const ok = await p.waitForFunction((sat) => V3d.open && V3dTerrain.done && V3dTerrain.rings.length > 0 && (!sat || V3dTerrain.rings.every(r => r.satTex)), sat, { timeout: 240000, polling: 1000 }).then(() => true, () => false);
      if (!ok) console.log('not fully loaded:', key, sat ? 'satellite' : 'map');
      await p.waitForTimeout(3000);
      for (const [v, lon, lat, h, yaw, pitch] of VIEWS) {
        await p.evaluate(([lon, lat, h, yaw, pitch]) => {
          if (V3d.mode !== 'free') { try { v3dModeSet('free'); } catch (e) {} }
          if (!V3d.fc) v3dFreeStart();
          const F = V3d.fc, q = v3dXY(lon, lat);
          F.pos.set(q[0], h - v3dCurve(q[0], q[1]), q[1]); F.yaw = yaw; F.pitch = pitch; F.vel.set(0, 0, 0);
          document.querySelectorAll('.toast, .fp-stack').forEach(e => e.remove());
        }, [lon, lat, h, yaw, pitch]);
        await p.waitForTimeout(4000);
        const name = `${out}/${sat ? 'sat' : 'map'}-${v}-${key}.png`;
        await (await p.$('.v3d canvas, canvas.v3d-cv') || p).screenshot({ path: name });
        console.log('saved', name, label);
      }
    }
  }
  await b.close();
})();
