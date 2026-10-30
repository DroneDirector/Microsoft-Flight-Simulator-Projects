// Sim check (AirlineManagerPro-PC.exe --check): connects to the running Flight Simulator, reads everything
// the app uses once, and writes a report of what the simulator and the loaded aircraft actually give.
// Anything missing, refused or out of place is marked with "!". Saved to Documents\Airline Manager Pro\Diagnostics.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SimConnectSource, RawSnapshot } from './sim';
import { FlightTracker } from './tracker';
import { userCfgFiles, packageRoots, installedAircraft } from './installed';
import { VERSION } from './version';
import type { Airport } from './protocol';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const kg = (n: number) => `${Math.round(n).toLocaleString('en-GB')} kg`;

export async function simCheck(lib: any): Promise<string> {
  const out: string[] = [], warn: string[] = [];
  const line = (s = '') => { out.push(s); process.stdout.write(s + '\n'); };
  const bad = (s: string) => { warn.push(s); line('  ! ' + s); };
  line(`Airline Manager Pro PC app ${VERSION}: sim check, ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`);
  line(`PC: ${os.hostname()}, ${os.type()} ${os.release()}, Node ${process.versions.node}`);
  line('');

  // ---- the simulator's files
  line('Simulator folders');
  const cfgs = userCfgFiles().filter(f => fs.existsSync(f));
  if (!cfgs.length) bad('UserCfg.opt not found: installed aircraft can\'t be listed');
  cfgs.forEach(f => line('  UserCfg.opt: ' + f));
  const roots = packageRoots();
  roots.forEach(r => {
    line('  Packages: ' + r);
    try { fs.readdirSync(r, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => line(`    ${d.name}`)); } catch (e) { /* unreadable */ }
  });
  try {
    const list = await installedAircraft();
    line(`  ${list.length} add-on aircraft packages`);
    list.slice(0, 60).forEach(p => line(`    ${p.name}  (${p.title}${p.creator ? ', ' + p.creator : ''})`));
    if (list.length > 60) line(`    … and ${list.length - 60} more`);
  } catch (e: any) { bad('Aircraft scan: ' + (e && e.message || e)); }
  line('');

  // ---- connect
  line('Flight Simulator');
  const src = new SimConnectSource(lib);
  const notes: string[] = [];
  let snap: RawSnapshot = null, snaps = 0, status = '', airports: Airport[] = [];
  src.on('status', (_ok: boolean, t: string) => { status = t; });
  src.on('note', (t: string) => notes.push(t));
  src.on('snapshot', (s: RawSnapshot) => { if (s.connected) { snap = s; snaps++; } });
  src.on('airports', (l: Airport[]) => { if (l.length) airports = l; });
  src.start();
  for (let i = 0; i < 40 && !snap; i++) await wait(500);
  if (!snap) {
    bad('Not connected: ' + (status || 'no answer'));
    line('  Is Flight Simulator running with a flight loaded (not the main menu)? Run the check again once you are in the cockpit.');
    src.stop();
    return finish(out, warn);
  }
  const t0 = Date.now(), n0 = snaps;
  await wait(8000);   // let every request answer at least a few times
  const rate = (snaps - n0) / ((Date.now() - t0) / 1000);
  const s: any = snap, info = src.info;
  line(`  ${status}. ${info.appName} ${info.appVersion}, SimConnect ${info.simConnectVersion}, protocol ${info.protocol}`);
  line(`  Readings: ${rate.toFixed(1)} a second${s.paused ? ' (paused)' : ''}`);
  if (s.paused) bad('The simulator is paused: unpause it for a full check');
  else if (rate < 3) bad(`Only ${rate.toFixed(1)} readings a second: touchdowns may be missed (frame rate very low, or the sim is in a menu)`);
  line('');

  // ---- the aircraft
  line('Aircraft');
  line(`  Title: ${s.title || '(none)'}`);
  line(`  Registration: ${s.atcId || '(none)'}   Model: ${s.atcModel || '(none)'}   Type: ${s.atcType || '(none)'}`);
  if (!s.title) bad('No aircraft title');
  line(`  Position: ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}  ${Math.round(s.altFt)} ft (${Math.round(s.aglFt)} ft above ground), heading ${Math.round(s.hdg)}`);
  line(`  ${s.onGround ? 'On the ground' : 'In the air'}, ${Math.round(s.ias)} kt IAS, ${Math.round(s.gs)} kt GS, ${Math.round(s.vsFpm)} fpm, ${s.g.toFixed(2)} g, pitch ${s.pitch.toFixed(1)}`);
  line(`  Parking brake ${s.parkingBrake ? 'set' : 'off'}, gear ${s.gearDown ? 'down' : 'up'}, flaps position ${s.flapsIndex}`);
  line(`  Engines: ${s.engines}, running ${s.enginesRunning}${(s._failed || []).some((x: boolean) => x) ? ', FAILED: ' + s._failed.map((x: boolean, i: number) => x ? i + 1 : 0).filter((x: number) => x).join(', ') : ''}`);
  if (!s.engines) bad('NUMBER OF ENGINES is 0');
  line('');
  line('Weights');
  line(`  Empty ${kg(s.emptyKg)}, fuel ${kg(s.fuelKg)}, total ${kg(s.totalKg)}, max take-off ${kg(s.mtowKg)}`);
  const stationKg = (s.stations || []).reduce((a: number, b: any) => a + b.kg, 0);
  const other = s.totalKg - s.emptyKg - s.fuelKg - stationKg;
  line(`  Payload stations: ${(s.stations || []).length}, ${kg(stationKg)} in them; weight not in empty, fuel or stations: ${kg(other)}`);
  (s.stations || []).forEach((st: any) => line(`    ${st.name}: ${kg(st.kg)}`));
  if (!s.emptyKg) bad('Empty weight is 0');
  if (!s.mtowKg) bad('Max take-off weight is 0');
  if (s.totalKg && s.totalKg < s.emptyKg) bad('Total weight is less than the empty weight');
  if (s.enginesRunning && s.fuelKg < 1) bad('Engines running with 0 fuel: this aircraft keeps fuel in its own system, so fuel used can\'t be measured');
  if (!(s.stations || []).length) bad('No payload stations: passengers can only be counted from GSX');
  else if (stationKg < 1 && Math.abs(other) > 500) bad(`Payload stations are empty but ${kg(other)} is unaccounted for: this aircraft loads its payload its own way (its EFB or tablet), not through the sim's stations`);
  if (/fenix/i.test(s.title)) line('  Fenix: passengers and cargo are loaded from its EFB. If the stations above stay empty after boarding, run the check again after loading to see where the weight goes.');
  line('');

  // ---- GSX
  line('GSX');
  const g = s.gsx || {};
  line(`  ${g.running ? 'Running' : 'Not running'}; boarding state ${g.boardingState}, passengers ${g.paxBoarded} of ${g.paxTotal}, cargo ${Math.round(g.cargoPct || 0)}%`);
  line(`  Services: deboarding ${g.deboarding}, catering ${g.catering}, refuelling ${g.refueling}, departure ${g.departure}, de-icing ${g.deicing}, fuel hose ${g.fuelHose ? 'connected' : 'off'}`);
  line('');

  // ---- weather
  const w = s.wx || {};
  line('Weather at the aircraft');
  line(`  Wind ${w.windDir}°/${w.windKt} kt, visibility ${w.visM} m, ${w.tempC} °C, ${w.qnhHpa} hPa, ${w.precip}${w.precipMm ? ' ' + w.precipMm + ' mm' : ''}${w.inCloud ? ', in cloud' : ''}`);
  if (w.qnhHpa < 900 || w.qnhHpa > 1100) bad(`Sea-level pressure ${w.qnhHpa} hPa looks wrong`);
  line('');

  // ---- airports
  line('Airports');
  src.requestAirports();
  for (let i = 0; i < 20 && !airports.length; i++) await wait(500);
  line(`  ${airports.length} airports around the aircraft`);
  const tr = new FlightTracker(); tr.setAirports(airports);
  const near = tr.nearestAirport(s.lat, s.lon, 15);
  line(`  Nearest: ${near || '(none within 15 nm)'}`);
  if (near) {
    try {
      const l: any = await Promise.race([src.getLayout(near), wait(30000).then(() => { throw new Error('no answer in 30 s'); })]);
      line(`  ${near} layout: ${l.runways.length} runways, ${l.parks.length} stands, ${l.paths.length} taxi paths`);
      if (!l.parks.length) bad(`${near} has no stands in the simulator's data: the stand limit can't be used there`);
    } catch (e: any) { bad(`${near} layout: ${e && e.message || e}`); }
    try {
      const p: any = await Promise.race([src.getProcedures(near), wait(30000).then(() => { throw new Error('no answer in 30 s'); })]);
      line(`  ${near} procedures: ${p.sids.length} departures, ${p.stars.length} arrivals, ${p.apps.length} approaches`);
    } catch (e: any) { bad(`${near} procedures: ${e && e.message || e}`); }
  }
  try {
    const all = await Promise.race([src.allAirports(), wait(60000).then(() => [] as Airport[])]);
    line(`  Every airport in the simulator: ${all.length}`);
    if (!all.length) bad('The full airport list didn\'t arrive within a minute');
  } catch (e: any) { bad('Full airport list: ' + (e && e.message || e)); }
  line('');

  // ---- what the simulator refused
  line('Variables');
  const refused = Object.keys(src.refused);
  if (!refused.length) line('  Every variable the app reads was accepted');
  refused.forEach(n => bad(`${n} refused: ${src.refused[n]}`));
  notes.filter(t => !/^Flight Simulator refused /.test(t)).forEach(t => line('  note: ' + t));
  src.stop();
  return finish(out, warn);
}

function finish(out: string[], warn: string[]): string {
  out.push('', warn.length ? `${warn.length} thing(s) to look at (marked !).` : 'Everything checked out.');
  process.stdout.write(out[out.length - 1] + '\n');
  const dir = path.join(os.homedir(), 'Documents', 'Airline Manager Pro', 'Diagnostics');
  try {
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
    const file = path.join(dir, `sim-check-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.txt`);
    fs.writeFileSync(file, out.join('\r\n') + '\r\n');
    process.stdout.write(`\nSaved: ${file}\n`);
    return file;
  } catch (e) { return ''; }
}
