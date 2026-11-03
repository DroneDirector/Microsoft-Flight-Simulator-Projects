// Pictures of the 3D view's ground at the terrain detail settings, for comparing them side by side (airport levelling).
// Run with the app served at http://localhost:47610/ (as the PC app, so Ultra is offered):
//   node tools/shots/terrain-shots.js <output folder>
// Two places on the Faroe Islands (steep mountains straight out of the sea): over the sea west of Vágar looking
// at the cliffs, and low over the airport looking along the valley. Each in the map look and with satellite imagery.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const CONFIGS = [
  ['before', 'Medium, no smoothing', { v3dTerrainQ: 1, v3dTerrainSmooth: false }],
  ['medium', 'Medium', { v3dTerrainQ: 1 }],
  ['high', 'High', { v3dTerrainQ: 2 }],
  ['ultra', 'Ultra (PC)', { v3dTerrainQ: 4 }],
];
const VIEWS = [
  // name, lon, lat, height above sea (m), yaw (0 north, east π/2), pitch: all within 10 nm of Vágar, so the view
  // stays centred on the airport and nothing reloads between pictures
  ['cliffs', -7.20, 62.02, 520, -0.35, -0.10],
  ['valley', -7.38, 62.09, 320, 1.55, -0.06],
  ['coast', -7.33, 62.04, 1300, 1.1, -0.2],
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
  for (const sat of [false]) {
    for (const [key, label, cfg] of CONFIGS) {
      await p.evaluate(([cfg, sat]) => {
        try { closeAll(); } catch (e) {}
        document.querySelectorAll('.splash, .fp-stack, .bdr, .tour, .toast').forEach(e => e.remove());
        const S = State.settings; delete S.v3dTerrainSmooth;
        Object.assign(S, { cloudKm: 0, v3dPrecip: false, v3dDayNight: false, v3dKm: 150, v3dSat: sat, v3dSatQ: 2, fpOn: false }, cfg);
        try { if (V3d.open) v3dClose(); } catch (e) {}
      }, [cfg, sat]);
      await p.waitForTimeout(3000);
      await p.evaluate(() => { try { closeAll(); } catch (e) {} v3dOpenAirport('EKVG'); });
      const ok = await p.waitForFunction((sat) => V3d.open && V3dTerrain.done && V3dTerrain.rings.length > 0 && (!sat || V3dTerrain.rings.every(r => r.satTex)), sat, { timeout: 180000, polling: 1000 }).then(() => true, () => false);
      if (!ok) console.log('not fully loaded:', key, sat ? 'satellite' : 'map');
      await p.waitForTimeout(3000);
      for (const [v, lon, lat, h, yaw, pitch] of VIEWS) {
        await p.evaluate(([lon, lat, h, yaw, pitch]) => {
          V3d.fcStart = false;
          if (V3d.mode !== 'free') { try { v3dModeSet('free'); } catch (e) {} }
          if (!V3d.fc) v3dFreeStart();
          const F = V3d.fc, q = v3dXY(lon, lat);
          F.pos.set(q[0], h - v3dCurve(q[0], q[1]), q[1]); F.yaw = yaw; F.pitch = pitch; F.vel.set(0, 0, 0);
        }, [lon, lat, h, yaw, pitch]);
        await p.waitForTimeout(5000);
        const url = await p.evaluate(() => { V3d.r.render(V3d.scene, V3d.cam); return V3d.cv.toDataURL('image/png'); });
        const name = `${out}/${sat ? 'sat' : 'map'}-${v}-${key}.png`;
        require('fs').writeFileSync(name, Buffer.from(url.split(',')[1], 'base64'));
        console.log('saved', name, label, await p.evaluate(() => [V3d.open, V3dTerrain.rings.length, V3dTerrain.done].join(' ')));
      }
    }
  }
  await b.close();
})();
