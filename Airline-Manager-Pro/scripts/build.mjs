// Builds the web app into www/.
//  1. Reads app.config.json and writes src/generated/config.ts + the page title.
//  2. Compiles all TypeScript into one plain script (www/app.js) so the same
//     output runs in Android, a Windows wrapper and the MSFS toolbar panel.
//  3. With --preview, also writes dist/preview.html: one self-contained file.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'app.config.json'), 'utf8'));

mkdirSync(join(root, 'src/generated'), { recursive: true });
writeFileSync(
  join(root, 'src/generated/config.ts'),
  `// Generated from app.config.json. Do not edit by hand.\nconst APP = ${JSON.stringify({
    name: cfg.appName, shortName: cfg.shortName, id: cfg.appId, version: cfg.version, updates: cfg.updates || null,
  }, null, 2)};\n`
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
    .replace(/<script src="app.js"><\/script>/, () => `<script>${js.replace(/<\/script/g, '<\\/script')}</script>`);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/preview.html'), html);
  console.log('Preview written to dist/preview.html');
}
console.log(`Built ${cfg.appName} ${cfg.version}`);
