// Runs the PC app with a simulated flight instead of Flight Simulator, for trying the phone link
// without the simulator: `AirlineManagerPro-PC --demo` (add a number to speed it up, e.g. --demo 20).
import { writeLog } from './errors';
import * as path from 'path';
import * as os from 'os';
import { LinkServer } from './server';
import { FakeSim } from './fake-sim';
import { run, VERSION } from './main';
import { Desktop } from './desktop';

export async function demo(speed: number, fixedCode?: string) {
  const server = new LinkServer(path.join(os.tmpdir(), 'amp-demo'), VERSION + '-demo');
  if (fixedCode) server.code = fixedCode;
  const desktop = new Desktop(path.join(os.tmpdir(), 'amp-demo'));
  server.web = (req, res) => desktop.handle(req, res);
  await server.start();
  if (process.argv.indexOf('--window') >= 0) desktop.openWindow();
  const sim = new FakeSim({ speed, gsx: true });
  run(sim, server, s => { writeLog(s); console.log(s); });
  sim.on('done', () => { (sim as any).t = 0; setTimeout(() => sim.start(), 3000); });
  console.log(`Simulated flight running. Pairing code: ${server.code}`);
  server.on('code', (c: string) => console.log('New pairing code:', c));
  sim.start();
}
