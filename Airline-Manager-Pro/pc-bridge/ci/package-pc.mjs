// Packages the PC app for Windows: one .exe (Node single executable) plus node-simconnect
// as its own unmodified library folder next to it (LGPL-3.0: replaceable by the user).
// Then the Setup program: the whole app folder packed inside one more single executable with its own window
// (src/setup), the app's compass-star icon on both .exe files and on the shortcuts Setup makes.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, cpSync, readdirSync, statSync, lstatSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = JSON.parse(readFileSync(join(here, '..', 'app.config.json'), 'utf8'));
const run = c => execSync(c, { stdio: 'inherit', cwd: here });

writeFileSync(join(here, 'src', 'version.ts'), `// Written by the build from app.config.json\nexport const VERSION = '${app.version}';\n`);
run('npx tsc -p tsconfig.json');
const out = join(here, 'build'), pkg = join(out, 'Airline Manager Pro PC');
rmSync(out, { recursive: true, force: true });
mkdirSync(pkg, { recursive: true });
run('npx esbuild dist/cli.js --bundle --platform=node --format=cjs --target=node22 --external:node-simconnect --outfile=build/amp-pc.js');
writeFileSync(join(out, 'sea.json'), JSON.stringify({ main: 'build/amp-pc.js', output: 'build/sea.blob', disableExperimentalSEAWarning: true }));
run('node --experimental-sea-config build/sea.json');
const exe = join(pkg, 'AirlineManagerPro-PC.exe'), ico = join(here, 'ci', 'app.ico'), publisher = app.publisher || 'DroneDirector';
copyFileSync(process.execPath, exe);
// the app's icon and name on the program (before the app is put into it)
function brand(file, description) {
  const bin = [join(here, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'), join(here, 'node_modules', 'rcedit', 'bin', 'rcedit.exe')].filter(existsSync)[0];
  if (!bin || process.platform !== 'win32') { console.log('rcedit not found: the program keeps the standard icon'); return; }
  const v4 = app.version + '.0';
  try {
    execFileSync(bin, [file, '--set-icon', ico, '--set-file-version', v4, '--set-product-version', v4,
      '--set-version-string', 'ProductName', app.appName, '--set-version-string', 'FileDescription', description, '--set-version-string', 'CompanyName', publisher,
      '--set-version-string', 'LegalCopyright', '\u00a9 ' + new Date().getFullYear() + ' ' + publisher, '--set-version-string', 'OriginalFilename', file.split(/[\\/]/).pop(),
      '--set-version-string', 'InternalName', app.appName], { stdio: 'inherit' });
  } catch (e) { console.log('Couldn\'t set the icon:', e.message); }
}
brand(exe, app.appName);
run(`npx postject "${exe}" NODE_SEA_BLOB build/sea.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);
copyFileSync(ico, join(pkg, 'app.ico'));

// the app itself (the same build as the phone's), shown in its own window on this PC
const web = join(here, '..', 'www');
if (!existsSync(join(web, 'index.html')) || !existsSync(join(web, 'app.js'))) throw new Error('Build the app first (npm run build in Airline-Manager-Pro)');
cpSync(web, join(pkg, 'app'), { recursive: true, filter: s => !/index\.template\.html$/.test(s) });

// node-simconnect and its dependencies, unmodified, in lib/
const lib = join(pkg, 'lib');
mkdirSync(lib, { recursive: true });
const dep = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).dependencies['node-simconnect'];
writeFileSync(join(lib, 'package.json'), JSON.stringify({ private: true, dependencies: { 'node-simconnect': dep } }));
run(`npm install --omit=dev --no-audit --no-fund --prefix "${lib}"`);
if (!existsSync(join(lib, 'node_modules', 'node-simconnect'))) throw new Error('node-simconnect missing');
// npm can leave a link back to this project in lib/node_modules: not part of the app (and it loops)
for (const n of readdirSync(join(lib, 'node_modules'))) { const p = join(lib, 'node_modules', n); try { if (lstatSync(p).isSymbolicLink()) rmSync(p, { recursive: true, force: true }); } catch (e) { /* gone */ } }

writeFileSync(join(pkg, 'README.txt'), [
  `Airline Manager Pro PC app ${app.version}`, '',
  'The full Airline Manager Pro app for Windows, connected straight to Microsoft Flight Simulator 2024 (and 2020),',
  'and the link to the Android app over your Wi-Fi. Use either or both.', '',
  'Installing',
  `  The easy way: run AirlineManagerPro-PC-Setup-${app.version}.exe. It installs into a folder of its own wherever you choose,`,
  '  puts a shortcut on your desktop (replacing any older one) and in the Start menu, and adds the app to Settings > Apps,',
  '  where it can be removed again. This zip works too, without installing: unzip it anywhere.', '',
  'The app on this PC',
  '  Double-click AirlineManagerPro-PC.exe: the app opens in its own window and connects to Flight Simulator.',
  '  Window, borderless or full screen, the size of everything, the graphics card and the sound output are in',
  '  Settings > Display. F11 switches full screen. It fits any screen, including ultrawide, without stretching.',
  '  Your airline is saved on this PC and backed up to Documents\\Airline Manager Pro.',
  '  The window uses Microsoft Edge, which is part of Windows. Closed it? Type A and press Enter in the PC app.', '',
  'The phone app',
  '1. Start Microsoft Flight Simulator.',
  '2. Double-click AirlineManagerPro-PC.exe. When Windows asks, allow it on private networks',
  '   (and on public networks too if you will use your phone\'s hotspot).',
  '3. On your phone: tap the link button at the top of the app, pick this PC and enter the 6-digit code shown in the window.',
  '   Phone and PC must be on the same Wi-Fi network, or this PC connected to your phone\'s hotspot.', '',
  'Using mobile data (phone hotspot)',
  '  Turn on the hotspot on your phone and connect this PC to it. Windows usually calls a phone hotspot a public',
  '  network, which blocks the link: either set that network to Private (Settings > Network & internet > Wi-Fi >',
  '  the hotspot > Private network), or allow Airline Manager Pro PC on public networks in Windows Firewall.',
  '  The link uses about 5 MB an hour. Flight Simulator itself streams scenery and can use much more; you can',
  '  limit that in its Data settings.', '',
  'Keep the window open while you fly. Your flights, landings, fuel, weights and damage are sent to the phone.',
  'To try the link without Flight Simulator, run:  AirlineManagerPro-PC.exe --demo 30', '',
  'Sim check',
  '  With a flight loaded in Flight Simulator, double-click "Check Flight Simulator.cmd". It reads everything the app',
  '  uses from the simulator and the loaded aircraft and saves a report in Documents\\Airline Manager Pro\\Diagnostics.', '',
  'Flight recordings',
  '  Every flight is recorded to Documents\\Airline Manager Pro\\Recordings (the newest 30 are kept, about 1 MB an hour).',
  '  To play one back to the phone as if Flight Simulator were flying it, drag the recording onto "Play back a flight.cmd".',
  '  To fly without recording, run:  AirlineManagerPro-PC.exe --no-record', '',
  'If something goes wrong, the window stays open with the error, and the details are saved in',
  '%APPDATA%\\Airline Manager Pro\\pc-app.log. Send that file so the problem can be looked at.', '',
  'Licences',
  '  node-simconnect (lib/node_modules/node-simconnect) is used unmodified under the GNU LGPL v3.',
  '  Its licence text is in that folder. You may replace that folder with another version of the library.', '',
].join('\r\n'));
// double-click shortcuts for the sim check and playing back a recording
writeFileSync(join(pkg, 'Check Flight Simulator.cmd'), ['@echo off', 'cd /d "%~dp0"', 'AirlineManagerPro-PC.exe --check', ''].join('\r\n'));
writeFileSync(join(pkg, 'Play back a flight.cmd'), ['@echo off', 'cd /d "%~dp0"',
  'if "%~1"=="" (echo Drag a recording from Documents\\Airline Manager Pro\\Recordings onto this file. & pause & exit /b)',
  'AirlineManagerPro-PC.exe --replay "%~1" 1', ''].join('\r\n'));
console.log('Packaged', pkg);

// ---------- the Setup program ----------
// every file of the app folder, deflated one by one, after a header listing them (src/setup/core.ts reads it)
const files = [], parts = [];
let off = 0, total = 0;
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n), st = lstatSync(p); if (st.isSymbolicLink()) continue; if (st.isDirectory()) walk(p); else {
  const raw = readFileSync(p), z = deflateRawSync(raw, { level: 9 }), rel = p.slice(pkg.length + 1);
  files.push({ p: rel, size: raw.length, csize: z.length, off }); parts.push(z); off += z.length; total += raw.length; } } };
walk(pkg);
const head = Buffer.from(JSON.stringify({ version: app.version, publisher, total, files }), 'utf8'), len = Buffer.alloc(4); len.writeUInt32LE(head.length, 0);
writeFileSync(join(out, 'payload.bin'), Buffer.concat([len, head, ...parts]));
console.log(`Setup payload: ${files.length} files, ${(total / 1e6).toFixed(0)} MB unpacked, ${(off / 1e6).toFixed(0)} MB packed`);
run('npx esbuild dist/setup-main.js --bundle --platform=node --format=cjs --target=node22 --outfile=build/setup.js');
writeFileSync(join(out, 'setup-sea.json'), JSON.stringify({ main: 'build/setup.js', output: 'build/setup.blob', disableExperimentalSEAWarning: true, assets: { payload: 'build/payload.bin' } }));
run('node --experimental-sea-config build/setup-sea.json');
const setup = join(out, `AirlineManagerPro-PC-Setup-${app.version}.exe`);
copyFileSync(process.execPath, setup);
brand(setup, app.appName + ' Setup');
run(`npx postject "${setup}" NODE_SEA_BLOB build/setup.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);
// Setup is a windowed program: no black console window behind it (the PE header's subsystem: 2, Windows GUI)
{ const b = readFileSync(setup), pe = b.readUInt32LE(0x3C); if (b.readUInt32LE(pe) !== 0x4550) throw new Error('Setup isn\'t a Windows program');
  b.writeUInt16LE(2, pe + 24 + 68); writeFileSync(setup, b); }
console.log('Setup', setup);
