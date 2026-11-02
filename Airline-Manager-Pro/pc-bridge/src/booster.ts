// Game Booster on the PC: live readings for the charts in Settings → Game Booster (processor, memory, graphics
// card, graphics memory, disk) and closing the programs you picked while you play.
//
// Closing programs:
//  - only the programs you ticked in the list, never Windows itself, Flight Simulator, Steam or the Xbox app
//    (Flight Simulator needs them), your security software, graphics drivers, this app or its window;
//  - programs with a window are asked to close, as when you close them yourself, so one that asks to save
//    stays open until you answer it; background programs without a window are ended;
//  - while the booster is on and the app is open, the picked programs are kept closed: if one starts
//    again (by itself or from its updater), it is closed again within a few seconds and counted;
//  - when you switch the booster off or close the app, nothing more is closed and they may start again.

import { execFile, spawn, ChildProcess } from 'child_process';
import * as os from 'os';

export interface BoostSample { t: number; cpu: number; ram: number; ramUsedMb: number; ramTotalMb: number; gpu: number | null; vramMb: number | null; disk: number | null }
export interface BoostProc { name: string; title: string; mb: number; window: boolean; count: number; suggested: boolean }

/** Never closed, and not offered in the list (lower case, without .exe). */
const PROTECT = new Set([
  'system', 'idle', 'registry', 'smss', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'svchost', 'dwm', 'explorer', 'sihost', 'fontdrvhost',
  'ctfmon', 'conhost', 'dllhost', 'taskhostw', 'runtimebroker', 'searchhost', 'searchapp', 'startmenuexperiencehost', 'shellexperiencehost',
  'textinputhost', 'applicationframehost', 'audiodg', 'spoolsv', 'wudfhost', 'dashost', 'lockapp', 'securityhealthsystray', 'securityhealthservice',
  'msmpeng', 'nissrv', 'mpdefendercoreservice', 'smartscreen', 'taskmgr', 'cmd', 'powershell', 'pwsh', 'windowsterminal', 'openconsole',
  // Flight Simulator and what it needs to run
  'flightsimulator', 'flightsimulator2024', 'microsoftflightsimulator', 'steam', 'steamwebhelper', 'steamservice', 'xboxapp', 'xboxpcapp', 'xboxpcappft',
  'gamingservices', 'gamingservicesnet', 'xboxgipsvc', 'gamebar', 'gamebarftserver', 'gameinputsvc', 'simconnect', 'fsuipc7', 'fsuipc', 'msfs2024', 'msfs',
  // graphics and sound drivers, controllers and the like
  'nvcontainer', 'nvdisplay.container', 'nvidia web helper', 'nvidia share', 'nvsphelper64', 'radeonsoftware', 'amdrsserv', 'atiesrxx', 'atieclxx',
  'igfxem', 'igfxcuiservice', 'realtekaudioservice', 'rtkauduservice64', 'audiosrv', 'logioptionsplus_agent', 'lghub_agent', 'lghub_updater',
  'airlinemanagerpro', 'airline manager pro', 'node',
]);
/** Programs that are usually safe to close while playing (offered as "suggested"; nothing is closed unless you tick it). */
const SUGGEST = new Set([
  'onedrive', 'dropbox', 'googledrivefs', 'box', 'icloudservices', 'icloudphotos', 'icloud', 'megasync',
  'teams', 'ms-teams', 'skype', 'slack', 'zoom', 'webex', 'phoneexperiencehost', 'yourphone', 'widgets', 'widgetservice',
  'adobearm', 'adobecollabsync', 'ccxprocess', 'creative cloud', 'adobe desktop service', 'acrotray', 'adobeipcbroker', 'coresync',
  'epicgameslauncher', 'eadesktop', 'origin', 'battle.net', 'upc', 'ubisoftconnect', 'galaxyclient', 'riotclientservices', 'eabackgroundservice',
  'msedgewebview2', 'googleupdate', 'msedgeupdate', 'updater', 'jusched', 'cortana', 'spotifywebhelper', 'itunes', 'ituneshelper',
  'whatsapp', 'telegram', 'messenger', 'outlook', 'olk', 'onenote', 'notion', 'figma_agent',
]);

export class PcBooster {
  hist: BoostSample[] = [];
  /** Since the booster was last switched on: programs closed, closings in all, closed again after starting by themselves, memory freed. */
  counts = { programs: 0, closings: 0, again: 0, freedMb: 0, since: 0 };
  log: { at: number; name: string; mb: number; again: boolean; note?: string }[] = [];
  private closedOnce = new Set<string>();
  private busy = new Set<string>();
  private hold = new Map<string, number>();   // a program asking to save is left alone for a minute
  private lastAsk = 0; lastAlive = 0;
  private sampler: any = null; private watcher: any = null;
  private prevCpu: { idle: number; total: number } = null;
  private ps: ChildProcess = null; private gpuNow: [number, number, number] = [null, null, null];

  constructor(private picks: () => string[], private boostOn: () => boolean, private windowExe: () => string) { }

  /** The app asks for readings: they are taken while someone looks at them or while the booster is on. */
  touch() { this.lastAsk = Date.now(); this.ensure(); }
  /** The app is open (sent every few seconds while the booster is on). */
  alive() { this.lastAlive = Date.now(); this.ensure(); }
  gameRunning(): boolean { return Date.now() - this.lastAlive < 30000; }
  watching(): boolean { return this.boostOn() && this.gameRunning() && this.picks().length > 0; }

  /** Booster switched on or off: a fresh count starts when it goes on. */
  boostChanged() {
    if (this.boostOn()) { this.counts = { programs: 0, closings: 0, again: 0, freedMb: 0, since: Date.now() }; this.closedOnce.clear(); this.log = []; }
    this.ensure();
  }

  status() {
    return { hist: this.hist.slice(-90), counts: this.counts, log: this.log.slice(-25), picks: this.picks(), gameRunning: this.gameRunning(), watching: this.watching(),
      cores: os.cpus().length, cpuName: (os.cpus()[0] || { model: '' }).model.trim() };
  }

  private ensure() {
    if (!this.sampler) { this.sample(); this.sampler = setInterval(() => this.sample(), 2000); }
    if (!this.watcher && process.platform === 'win32') this.watcher = setInterval(() => this.watch(), 4000);
  }
  private wanted(): boolean { return this.boostOn() || Date.now() - this.lastAsk < 20000; }

  private sample() {
    if (!this.wanted()) { clearInterval(this.sampler); this.sampler = null; this.stopGpu(); this.prevCpu = null; return; }
    let idle = 0, total = 0; for (const c of os.cpus()) { const t: any = c.times; idle += t.idle; total += t.user + t.nice + t.sys + t.idle + t.irq; }
    let cpu = 0; if (this.prevCpu && total > this.prevCpu.total) cpu = 100 * (1 - (idle - this.prevCpu.idle) / (total - this.prevCpu.total));
    this.prevCpu = { idle, total };
    const tot = os.totalmem(), free = os.freemem();
    this.startGpu();
    this.hist.push({ t: Date.now(), cpu: Math.round(Math.max(0, Math.min(100, cpu))), ram: Math.round(100 * (tot - free) / tot), ramUsedMb: Math.round((tot - free) / 1048576), ramTotalMb: Math.round(tot / 1048576),
      gpu: this.gpuNow[0], vramMb: this.gpuNow[1], disk: this.gpuNow[2] });
    if (this.hist.length > 300) this.hist.splice(0, this.hist.length - 300);
  }

  /** Graphics card, graphics memory and disk from Windows' performance data, read by one PowerShell that stays open
   *  while readings are wanted (the class names are the same in every language of Windows). */
  private startGpu() {
    if (this.ps || process.platform !== 'win32') return;
    const script = `$ErrorActionPreference='SilentlyContinue'; while ($true) {
      $g = (Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine | Where-Object { $_.Name -like '*engtype_3D*' } | Measure-Object UtilizationPercentage -Sum).Sum
      $m = (Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory | Measure-Object DedicatedUsage -Sum).Sum
      $d = (Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'").PercentDiskTime
      [Console]::Out.WriteLine("$g|$m|$d"); [Console]::Out.Flush(); Start-Sleep -Seconds 2 }`;
    try {
      const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      let buf = '';
      ps.stdout.on('data', (d: Buffer) => {
        buf += d.toString(); const lines = buf.split(/\r?\n/); buf = lines.pop();
        const l = lines.pop(); if (!l) return;
        const [g, m, dk] = l.split('|').map(x => x === '' ? NaN : Number(x));
        this.gpuNow = [isFinite(g) ? Math.round(Math.min(100, g)) : null, isFinite(m) ? Math.round(m / 1048576) : null, isFinite(dk) ? Math.round(Math.min(100, dk)) : null];
      });
      ps.on('exit', () => { if (this.ps === ps) this.ps = null; });
      this.ps = ps;
    } catch (e) { this.ps = null; }
  }
  private stopGpu() { if (this.ps) { try { this.ps.kill(); } catch (e) { /* gone */ } this.ps = null; } this.gpuNow = [null, null, null]; }

  /** The running programs you can pick from: grouped by program, biggest first. */
  list(): Promise<BoostProc[]> {
    return new Promise(ok => {
      if (process.platform !== 'win32') return ok([]);
      const ps = `Get-Process | Where-Object { $_.SessionId -ne 0 -and $_.Path } | Select-Object ProcessName,Path,WorkingSet64,MainWindowHandle,Description | ConvertTo-Json -Compress`;
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, timeout: 15000, maxBuffer: 20e6 }, (err, out) => {
        if (err) return ok([]);
        let a: any[] = []; try { a = JSON.parse(String(out || '[]')); if (!Array.isArray(a)) a = [a]; } catch (e) { return ok([]); }
        const win = String(process.env.windir || process.env.SystemRoot || 'C:\\Windows').toLowerCase(), own = this.windowExe(), self = process.execPath.toLowerCase();
        const by = new Map<string, BoostProc>();
        for (const p of a) {
          const name = String(p.ProcessName || '').toLowerCase(), file = String(p.Path || '').toLowerCase();
          if (!name || PROTECT.has(name) || name === own || file === self || file.startsWith(win + '\\')) continue;
          let e = by.get(name);
          if (!e) { e = { name, title: String(p.Description || '').trim() || p.ProcessName, mb: 0, window: false, count: 0, suggested: SUGGEST.has(name) }; by.set(name, e); }
          e.mb += (+p.WorkingSet64 || 0) / 1048576; e.count++; if (+p.MainWindowHandle) e.window = true;
        }
        ok(Array.from(by.values()).map(e => Object.assign(e, { mb: Math.round(e.mb) })).sort((x, y) => y.mb - x.mb).slice(0, 80));
      });
    });
  }

  /** Every few seconds while the booster is on and the app is open: close the picked programs that are running. */
  private watch() {
    if (!this.watching()) { if (!this.wanted() && !this.boostOn()) { clearInterval(this.watcher); this.watcher = null; } return; }
    const picks = new Set(this.picks().map(p => p.toLowerCase()).filter(p => /^[\w .+-]{1,60}$/.test(p) && !PROTECT.has(p) && p !== this.windowExe()));
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 8000, maxBuffer: 10e6 }, (err, out) => {
      if (err) return;
      const found = new Map<string, number>();
      for (const line of String(out || '').split(/\r?\n/)) {
        const c = line.match(/"([^"]*)"/g); if (!c || c.length < 5) continue;
        const name = c[0].slice(1, -1).toLowerCase().replace(/\.exe$/, '');
        if (!picks.has(name)) continue;
        const kb = Number(c[4].replace(/[^0-9]/g, '')) || 0;
        found.set(name, (found.get(name) || 0) + kb / 1024);
      }
      for (const [name, mb] of found) if (!this.busy.has(name) && !((this.hold.get(name) || 0) > Date.now())) this.close(name, Math.round(mb));
    });
  }

  /** Ask the program's windows to close; end what has no window; leave a window that is asking to save. */
  private close(name: string, mb: number) {
    this.busy.add(name);
    const again = this.closedOnce.has(name);
    execFile('taskkill', ['/IM', name + '.exe', '/T'], { windowsHide: true, timeout: 8000 }, () => {
      setTimeout(() => {
        const n = name.replace(/'/g, "''");
        const ps = `$l = @(Get-Process -Name '${n}' -ErrorAction SilentlyContinue); $w = @($l | Where-Object { $_.MainWindowHandle -ne 0 }).Count; $l | Where-Object { $_.MainWindowHandle -eq 0 } | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 800; $r = @(Get-Process -Name '${n}' -ErrorAction SilentlyContinue).Count; "$w|$r"`;
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, timeout: 15000 }, (err, out) => {
          this.busy.delete(name);
          const [w, r] = String(out || '').trim().split('|').map(Number);
          const left = isFinite(r) ? r : 0;
          let note: string;
          if (left > 0) this.hold.set(name, Date.now() + 60000);
          if (left > 0 && w > 0) note = 'Still open: it may be asking you to save something';
          else if (left > 0) note = 'Couldn\'t be closed (it may run as administrator)';
          if (left === 0 || !again) {
            if (left === 0) { this.counts.closings++; this.counts.freedMb += mb; if (!this.closedOnce.has(name)) { this.closedOnce.add(name); this.counts.programs++; } if (again) this.counts.again++; }
            this.log.push({ at: Date.now(), name, mb: left === 0 ? mb : 0, again, note });
            if (this.log.length > 60) this.log.splice(0, this.log.length - 60);
          }
        });
      }, 5000);
    });
  }
}
