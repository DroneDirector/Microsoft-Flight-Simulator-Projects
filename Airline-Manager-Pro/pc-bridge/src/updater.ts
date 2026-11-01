// Updates for the PC app, started from the app on this PC (Settings → General → Update, or the update notice):
// downloads the new PC version from the app's own published releases, unpacks it, and once the PC app has
// closed, copies it over this one and starts it again. Your airline and settings are kept: they live in
// this PC's app data folder and Documents, not in the program folder. Only the app's own releases can be
// installed this way.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { spawn, execFile } from 'child_process';

const REPO = 'DroneDirector/Microsoft-Flight-Simulator-Projects', TAG = 'airline-manager-pro-v';

export const PcUpdate = {
  state: 'idle' as 'idle' | 'downloading' | 'unpacking' | 'restarting' | 'failed',
  pct: 0, error: '', version: '',

  status() { return { state: this.state, pct: this.pct, error: this.error, version: this.version, packaged: packaged() }; },

  /** Start updating to version v (as published); closeWindow is called just before the PC app closes. */
  start(v: string, closeWindow: () => void): string {
    if (!/^\d+\.\d+\.\d+$/.test(v)) return 'That isn\'t a version number.';
    if (!packaged()) return 'Updates install in the packaged PC app (AirlineManagerPro-PC.exe).';
    if (this.state === 'downloading' || this.state === 'unpacking' || this.state === 'restarting') return '';
    this.state = 'downloading'; this.pct = 0; this.error = ''; this.version = v;
    const url = `https://github.com/${REPO}/releases/download/${TAG}${v}/AirlineManagerPro-PC-${v}.zip`;
    const work = path.join(os.tmpdir(), 'amp-pc-update-' + v), zip = path.join(work, 'update.zip'), out = path.join(work, 'new');
    try { fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true }); } catch (e) { return this.fail('Couldn\'t make a folder for the download: ' + e); }
    download(url, zip, p => { this.pct = p; }).then(() => {
      this.state = 'unpacking'; this.pct = 100;
      return run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${out.replace(/'/g, "''")}' -Force`]);
    }).then(() => {
      const src = path.join(out, 'Airline Manager Pro PC');
      if (!fs.existsSync(path.join(src, 'AirlineManagerPro-PC.exe'))) throw new Error('The download didn\'t contain the PC app.');
      const dst = path.dirname(process.execPath), exe = path.join(dst, path.basename(process.execPath));
      const args = process.argv.slice(2).map(a => '"' + a.replace(/"/g, '') + '"').join(' ');
      // wait for this PC app to close, copy the new version over it, start it again, tidy up
      const cmd = [
        '@echo off',
        `:wait`,
        `tasklist /FI "PID eq ${process.pid}" 2>nul | find "${process.pid}" >nul && (timeout /t 1 /nobreak >nul & goto wait)`,
        `robocopy "${src}" "${dst}" /E /R:5 /W:1 /NFL /NDL /NJH /NJS /NP >nul`,
        `start "" "${exe}" ${args}`,
        `cd /d "%TEMP%"`,
        `rmdir /s /q "${work}"`,
      ].join('\r\n');
      const bat = path.join(os.tmpdir(), 'amp-pc-update.cmd'); fs.writeFileSync(bat, cmd);
      this.state = 'restarting';
      setTimeout(() => {
        try { closeWindow(); } catch (e) { /* the window may be closed already */ }
        const ch = spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true }); ch.unref();
        setTimeout(() => process.exit(0), 5000);   // after the window has closed and saved
      }, 1500);
    }).catch(e => this.fail(String(e && e.message || e)));
    return '';
  },
  fail(msg: string): string { this.state = 'failed'; this.error = msg; return msg; },
};

function packaged(): boolean { return process.platform === 'win32' && /AirlineManagerPro-PC\.exe$/i.test(process.execPath); }

function run(file: string, args: string[]): Promise<void> {
  return new Promise((ok, bad) => execFile(file, args, { windowsHide: true, timeout: 180000 }, (err, so, se) => err ? bad(new Error(String(se || err.message).trim())) : ok()));
}

/** Download over HTTPS, following GitHub's redirects to its file servers; p is called with 0 … 100. */
function download(url: string, file: string, p: (pct: number) => void, hops = 0): Promise<void> {
  return new Promise((ok, bad) => {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !/(^|\.)github\.com$|(^|\.)githubusercontent\.com$/.test(u.hostname)) return bad(new Error('Updates only come from the app\'s own releases.'));
    https.get(url, { headers: { 'User-Agent': 'AirlineManagerPro-PC' } }, (res: http.IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 6) { res.resume(); download(new URL(res.headers.location, url).toString(), file, p, hops + 1).then(ok, bad); return; }
      if (res.statusCode !== 200) { res.resume(); return bad(new Error(res.statusCode === 404 ? 'This version has no PC download yet.' : 'The download server answered ' + res.statusCode + '.')); }
      const total = Number(res.headers['content-length']) || 0; let got = 0;
      const w = fs.createWriteStream(file);
      res.on('data', (d: Buffer) => { got += d.length; if (total) p(Math.min(99, Math.round(got / total * 100))); });
      res.pipe(w);
      w.on('finish', () => w.close(() => ok()));
      w.on('error', bad); res.on('error', bad);
    }).on('error', bad);
  });
}
