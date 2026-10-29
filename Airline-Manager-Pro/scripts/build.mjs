// Builds the web app into www/.
//  1. Reads app.config.json and writes src/generated/config.ts + the page title.
//  2. Compiles all TypeScript into one plain script (www/app.js) so the same
//     output runs in Android, a Windows wrapper and the MSFS toolbar panel.
//  3. With --preview, also writes dist/preview.html: one self-contained file.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'app.config.json'), 'utf8'));

// "What's new" in the app: the three newest release notes (release-notes/<version>.md) up to this version.
// The lines about the download files are left out; headings and points are kept.
const verNum = v => v.split('.').map(Number);
const cmpVer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
const notesDir = join(root, 'release-notes');
const inline = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
const whatsNew = (existsSync(notesDir) ? readdirSync(notesDir) : [])
  .filter(f => /^\d+\.\d+\.\d+\.md$/.test(f)).map(f => f.slice(0, -3))
  .filter(v => cmpVer(v, cfg.version) <= 0).sort((a, b) => cmpVer(b, a)).slice(0, 3)
  .map(v => {
    const lines = readFileSync(join(notesDir, v + '.md'), 'utf8').split(/\r?\n/);
    let title = '', groups = [], cur = null;
    for (const raw of lines) {
      const l = raw.trim(); if (!l) continue;
      const head = /^\*\*([^*]+)\*\*$/.exec(l);
      if (head && !title && /\d+\.\d+\.\d+/.test(head[1])) { title = head[1].replace(/^.*?\d+\.\d+\.\d+\s*[:–-]?\s*/, ''); continue; }
      if (head) { cur = { h: head[1], items: [] }; groups.push(cur); continue; }
      if (/\.(apk|zip)\b/i.test(l) && !cur) continue; // the download files
      const item = l.replace(/^[-*]\s+/, '');
      if (!cur) { cur = { h: '', items: [] }; groups.push(cur); }
      cur.items.push(inline(item));
    }
    return { v, title, groups: groups.filter(g => g.items.length) };
  });

mkdirSync(join(root, 'src/generated'), { recursive: true });
writeFileSync(
  join(root, 'src/generated/config.ts'),
  `// Generated from app.config.json and release-notes/. Do not edit by hand.\nconst APP = ${JSON.stringify({
    name: cfg.appName, shortName: cfg.shortName, id: cfg.appId, version: cfg.version, updates: cfg.updates || null, online: cfg.online || null,
  }, null, 2)};\nconst WHATS_NEW: { v: string; title: string; groups: { h: string; items: string[] }[] }[] = ${JSON.stringify(whatsNew)};\n`
);

// Capacitor (Android wrapper) settings come from the same config
writeFileSync(join(root, 'capacitor.config.json'), JSON.stringify({
  appId: cfg.appId, appName: cfg.appName, webDir: 'www',
  // allowMixedContent lets the app open ws:// links to the PC on the local network without
  // changing the app's https://localhost origin, so saved airlines are kept.
  android: { backgroundColor: '#06111F', allowMixedContent: true },
  server: { cleartext: true },
  plugins: { SplashScreen: { launchShowDuration: 0 } },
}, null, 2) + '\n');

// Map library for the optional street and satellite maps (BSD-3-Clause)
const ml = join(root, 'node_modules/maplibre-gl/dist');
if (existsSync(ml)) {
  mkdirSync(join(root, 'www/vendor'), { recursive: true });
  for (const f of ['maplibre-gl.js', 'maplibre-gl.css']) copyFileSync(join(ml, f), join(root, 'www/vendor', f));
}

// 3D library for the crew figures (MIT)
const three = join(root, 'node_modules/three/build/three.min.js');
if (existsSync(three)) {
  mkdirSync(join(root, 'www/vendor'), { recursive: true });
  copyFileSync(three, join(root, 'www/vendor/three.min.js'));
}

// Crew body data (made from the CC0 MakeHuman model, see tools/human-data)
const humans = join(root, 'assets/humans.bin');
copyFileSync(humans, join(root, 'www/humans.bin'));

// Every airport and runway in the world (OurAirports, public domain; see tools/airports)
for (const f of ['airports-world.json', 'runways-world.json']) copyFileSync(join(root, 'assets', f), join(root, 'www', f));

const tpl = readFileSync(join(root, 'www/index.template.html'), 'utf8');
writeFileSync(join(root, 'www/index.html'), tpl.replace(/%APP_NAME%/g, cfg.appName).replace(/%APP_VERSION%/g, cfg.version));

const tsc = existsSync(join(root, 'node_modules/.bin/tsc')) ? join(root, 'node_modules/.bin/tsc') : 'tsc';
execSync(`"${tsc}" -p "${join(root, 'tsconfig.json')}"`, { stdio: 'inherit' });
// Join the compiled files in tsconfig order into one classic script (no module loader needed).
const tsFiles = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8')).files;
const bundle = tsFiles.map(f => readFileSync(join(root, 'build/js', f.replace(/^src\//, '').replace(/\.ts$/, '.js')), 'utf8')
  .replace(/^"use strict";\s*/, '')).join('\n');
writeFileSync(join(root, 'www/app.js'), '"use strict";\n' + bundle);

if (process.argv.includes('--preview')) {
  let html = readFileSync(join(root, 'www/index.html'), 'utf8');
  let css = readFileSync(join(root, 'www/styles.css'), 'utf8');
  css = css.replace(/url\(\s*['"]?fonts\/([^'")]+)['"]?\s*\)/g, (_, f) =>
    `url(data:font/woff;base64,${readFileSync(join(root, 'www/fonts', f)).toString('base64')})`);
  const js = readFileSync(join(root, 'www/app.js'), 'utf8');
  html = html
    .replace(/\s*<link rel="stylesheet" href="vendor\/[^"]+">/g, '')
    .replace(/<script src="vendor\/three.min.js"><\/script>/, () => existsSync(three) ? `<script>${readFileSync(three, 'utf8').replace(/<\/script/g, '<\\/script')}</script>` : '')
    .replace(/\s*<script src="vendor\/maplibre[^"]+"><\/script>/g, '')
    .replace(/<link rel="stylesheet" href="styles.css">/, () => `<style>${css}</style>`)
    .replace(/<script src="app.js"><\/script>/, () => `<script>window.__HUMANS_B64="${readFileSync(humans).toString('base64')}";</script><script>${js.replace(/<\/script/g, '<\\/script')}</script>`);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/preview.html'), html);
  console.log('Preview written to dist/preview.html');
}
console.log(`Built ${cfg.appName} ${cfg.version}`);
