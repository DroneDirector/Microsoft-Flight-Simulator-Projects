// Packages the PC app for Windows: one .exe (Node single executable) plus node-simconnect
// as its own unmodified library folder next to it (LGPL-3.0: replaceable by the user).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, cpSync } from 'node:fs';
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
const exe = join(pkg, 'AirlineManagerPro-PC.exe');
copyFileSync(process.execPath, exe);
run(`npx postject "${exe}" NODE_SEA_BLOB build/sea.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);

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

writeFileSync(join(pkg, 'README.txt'), [
  `Airline Manager Pro PC app ${app.version}`, '',
  'The full Airline Manager Pro app for Windows, connected straight to Microsoft Flight Simulator 2024 (and 2020),',
  'and the link to the Android app over your Wi-Fi. Use either or both.', '',
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
