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
    name: cfg.appName, shortName: cfg.shortName, id: cfg.appId, version: cfg.version, updates: cfg.updates || null, online: cfg.online || null, services: cfg.services || {},
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
// three.js's model loader (MIT), made into a plain script by tools/vendor/make-gltf.py
mkdirSync(join(root, 'www/vendor'), { recursive: true });
copyFileSync(join(root, 'assets/vendor/three-gltf.js'), join(root, 'www/vendor/three-gltf.js'));
// replaceable models: the list of the .glb files in www/models (see www/models/README.md)
{
  const dir = join(root, 'www/models'), files = [];
  const walk = (d, rel) => { if (!existsSync(d)) return; for (const f of readdirSync(d, { withFileTypes: true })) { if (f.isDirectory()) walk(join(d, f.name), rel + f.name + '/'); else if (/\.glb$/i.test(f.name)) files.push(rel + f.name); } };
  walk(dir, '');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.json'), JSON.stringify({ files: files.sort() }, null, 1));
  if (files.length) console.log(`Models from files: ${files.length} (${files.join(', ')})`);
  // the guide with every file name the app looks for (from the aircraft list and the vehicle, jet bridge and people
  // slots in src/graphics/models.ts), written on every build so a new aircraft type appears in it straight away
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const acSrc = readFileSync(join(root, 'src/data/aircraft.ts'), 'utf8'), ac = [], seen = {};
  for (const m of acSrc.matchAll(/\{ id: '([^']+)', maker: '([^']+)', model: '([^']+)'/g)) {
    const mk = slug(m[2]), md = slug(m[3]), f = (md.startsWith(mk + '-') ? md : mk + '-' + md) + '.glb';
    if (seen[f]) { seen[f].push(m[1]); continue; } seen[f] = [m[1]]; ac.push([f, `${m[2]} ${m[3]}`]);
  }
  const mSrc = readFileSync(join(root, 'src/graphics/models.ts'), 'utf8');
  const pairs = name => { const b = mSrc.slice(mSrc.indexOf('const ' + name)); return [...b.slice(0, b.indexOf('];') + 2).matchAll(/\['([^']+)', '([^']+)'\]/g)].map(x => [x[1], x[2]]); };
  const veh = pairs('VEHICLE_FILES'), jw = pairs('JETWAY_FILES'), ppl = pairs('PEOPLE_GROUPS');
  const have = f => files.includes(f) ? ' (in use)' : '';
  const md = [
    '# Replaceable models', '',
    'Put a `.glb` file (glTF binary) with one of these names in this folder, in the sub-folder shown, and build the app.',
    'The app then uses it instead of its own model everywhere that model appears: the 3D view, the pictures, the',
    'water salute, the museum. Remove the file and the app\'s own model comes back. This list is written by the build.', '',
    '**How the files should be made**', '',
    '- glTF 2.0 binary (`.glb`), textures inside the file. Metres. **+Y up, the front (the nose) towards +Z** (glTF\'s own convention).',
    '- The app fits each model to the real size of the thing it replaces (length), sets it on the ground and centres it across, so small differences in scale or origin do not matter.',
    '- Aircraft: the app\'s own model still moves its gear, flaps and lights; a file\'s model is shown as it is (its own paint).',
    '- Licences of bought models must allow commercial sale (see CLAUDE.md).', '',
    '## Aircraft (`aircraft/`)', '', '| File | Aircraft |', '|---|---|',
    ...ac.map(([f, n]) => `| \`aircraft/${f}\`${have('aircraft/' + f)} | ${n} |`), '',
    '## Ground vehicles (`vehicles/`)', '', '| File | Vehicle |', '|---|---|',
    ...veh.map(([f, n]) => `| \`vehicles/${f}.glb\`${have('vehicles/' + f + '.glb')} | ${n} |`), '',
    '## Jet bridges (`jetways/`)', '', '| File | What |', '|---|---|',
    ...jw.map(([f, n]) => `| \`jetways/${f}.glb\`${have('jetways/' + f + '.glb')} | ${n} |`), '',
    '## People (`people/`)', '',
    'A base model for each gender and group of looks. The app picks the group from each person\'s look (skin tone and eyes);',
    'when that file is missing it uses `person-male.glb` or `person-female.glb`, and when that is missing too its own figure.',
    'Rig them with a skeleton; a bone named `Jaw` (or containing "jaw") opens the mouth while the person talks, and',
    'animations named `Idle` and `Walk` are played when they stand and walk. Height is fitted to the person\'s own.', '',
    '| File | People |', '|---|---|',
    ...['male', 'female'].flatMap(sx => ppl.map(([g, n]) => `| \`people/person-${sx}-${g}.glb\`${have('people/person-' + sx + '-' + g + '.glb')} | ${sx === 'male' ? 'Men' : 'Women'}: ${n} |`)),
    `| \`people/person-male.glb\` | Men (any group without its own file) |`, `| \`people/person-female.glb\` | Women (any group without its own file) |`, '',
  ].join('\n');
  writeFileSync(join(dir, 'README.md'), md);
}

// Runs the voice model in the app (ONNX Runtime Web, MIT License): the WebAssembly build only
const ort = join(root, 'node_modules/onnxruntime-web/dist');
if (existsSync(ort)) {
  mkdirSync(join(root, 'www/vendor/ort'), { recursive: true });
  for (const f of ['ort.wasm.min.js', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) copyFileSync(join(ort, f), join(root, 'www/vendor/ort', f));
}

// Crew body data (made from the CC0 MakeHuman model, see tools/human-data)
const humans = join(root, 'assets/humans.bin');
copyFileSync(humans, join(root, 'www/humans.bin'));

// Every airport and runway in the world (OurAirports, public domain; see tools/airports)
for (const f of ['airports-world.json', 'runways-world.json', 'navaids-world.json']) copyFileSync(join(root, 'assets', f), join(root, 'www', f));
// Published procedures for US airports (FAA CIFP, public domain; fetched by the build, see tools/navdata)
const navSrc = join(root, 'assets/navdata/cifp');
if (existsSync(navSrc)) {
  mkdirSync(join(root, 'www/navdata/cifp'), { recursive: true });
  for (const f of readdirSync(navSrc)) copyFileSync(join(navSrc, f), join(root, 'www/navdata/cifp', f));
}

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
{
  const sv = cfg.services || {}, off = ['vatsim', 'ivao', 'simbriefApi', 'hoppie'].filter(k => sv[k] !== true);
  if (parseInt(String(cfg.version).split('.')[0], 10) >= 1 && off.length) console.log(`\nREMINDER before the final release: ${off.join(', ')} still switched off. VATSIM: its user agreement forbids using its data in a paid app without written permission. IVAO, SimBrief's flight plan import and Hoppie ACARS: none of them publish terms for paid apps, and SimBrief issues access keys on request. See CLAUDE.md.\n`);
}
console.log(`Built ${cfg.appName} ${cfg.version}`);
