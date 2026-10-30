// The aircraft installed in Microsoft Flight Simulator, and saving flight plans for it.
//
// The simulator keeps its add-ons in package folders: "Community" for add-ons installed by hand and the
// "Official" folders for ones bought in its marketplace. Where they are is written in UserCfg.opt
// (InstalledPackagesPath). Each package has a manifest.json that says what it is; aircraft packages
// have content_type "AIRCRAFT". Microsoft's own aircraft stream with the simulator and need no files.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface SimPackage { name: string; title: string; creator: string }

/** Where UserCfg.opt can be: MSFS 2024 and 2020, Microsoft Store and Steam. */
function userCfgFiles(): string[] {
  const ad = process.env.APPDATA || '', la = process.env.LOCALAPPDATA || '';
  return [
    path.join(la, 'Packages', 'Microsoft.Limitless_8wekyb3d8bbwe', 'LocalCache', 'UserCfg.opt'),
    path.join(ad, 'Microsoft Flight Simulator 2024', 'UserCfg.opt'),
    path.join(la, 'Packages', 'Microsoft.FlightSimulator_8wekyb3d8bbwe', 'LocalCache', 'UserCfg.opt'),
    path.join(ad, 'Microsoft Flight Simulator', 'UserCfg.opt'),
  ];
}

export function packageRoots(): string[] {
  const out: string[] = [];
  for (const f of userCfgFiles()) {
    try {
      const m = /InstalledPackagesPath\s+"([^"]+)"/i.exec(fs.readFileSync(f, 'utf8'));
      if (m && fs.existsSync(m[1]) && out.indexOf(m[1]) < 0) out.push(m[1]);
    } catch (e) { /* not this one */ }
  }
  return out;
}

async function readManifest(dir: string): Promise<SimPackage> {
  try {
    const j = JSON.parse(await fs.promises.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    if (String(j.content_type || '').toUpperCase() !== 'AIRCRAFT') return null;
    return { name: path.basename(dir), title: String(j.title || path.basename(dir)), creator: String(j.creator || '') };
  } catch (e) { return null; }
}

async function subdirs(dir: string): Promise<string[]> {
  try { return (await fs.promises.readdir(dir, { withFileTypes: true })).filter(d => d.isDirectory() || d.isSymbolicLink()).map(d => path.join(dir, d.name)); }
  catch (e) { return []; }
}

/** Every aircraft package in the simulator's package folders. */
export async function installedAircraft(): Promise<SimPackage[]> {
  const roots = packageRoots();
  if (!roots.length) throw new Error('Flight Simulator\'s package folder wasn\'t found (UserCfg.opt)');
  const found: SimPackage[] = [], seen: { [k: string]: boolean } = {};
  let checked = 0;
  for (const root of roots) {
    // root\Community\<package>, root\Official\OneStore\<package>, root\Official2024\Steam\<package> …
    for (const top of await subdirs(root)) {
      const name = path.basename(top).toLowerCase();
      if (name !== 'community' && name.indexOf('official') !== 0) continue;
      const level1 = await subdirs(top);
      const dirs = name === 'community' ? level1 : (await Promise.all(level1.map(subdirs))).reduce((a, b) => a.concat(b), level1);
      for (const d of dirs) {
        if (++checked > 20000) break;
        const p = await readManifest(d);
        if (p && !seen[p.name]) { seen[p.name] = true; found.push(p); }
      }
    }
  }
  return found;
}

/** Save a flight plan where it's easy to load in the simulator (World map → Load). */
export function saveFlightPlan(name: string, text: string): string {
  const dir = path.join(os.homedir(), 'Documents', 'Airline Manager Pro', 'Flight plans');
  const safe = String(name || 'flightplan').replace(/\.pln$/i, '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) || 'flightplan';
  if (typeof text !== 'string' || text.length > 2e6 || text.indexOf('<SimBase.Document') < 0) throw new Error('Not a flight plan');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, safe + '.pln');
  fs.writeFileSync(file, text, 'utf8');
  return file;
}
