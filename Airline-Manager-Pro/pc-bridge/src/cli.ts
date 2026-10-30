// Entry point of the PC app.
//   (nothing)                 link Flight Simulator to the phone and open the app on this PC
//   --demo <speed>            a simulated flight, without Flight Simulator
//   --check                   check what Flight Simulator and the loaded aircraft give the app, and save a report
//   --replay <file> [speed]   play back a flight recording as if Flight Simulator were sending it
//   --no-record               don't record flights
import { main, dataDir, loadSimConnect } from './main';
import { demo } from './demo';
import { simCheck } from './check';
import { openLog, catchEverything, fatal } from './errors';

const arg = (name: string) => process.argv.indexOf(name);
const pause = () => new Promise<void>(r => { if (!process.stdin.isTTY) return r(); process.stdout.write('\nPress Enter to close.'); process.stdin.once('data', () => r()); });

if (arg('--demo') >= 0) { openLog(dataDir()); catchEverything(); demo(Number(process.argv[arg('--demo') + 1]) || 1, process.env.AMP_CODE); }
else if (arg('--check') >= 0) {
  openLog(dataDir()); catchEverything();
  let lib: any;
  try { lib = loadSimConnect(); } catch (e) { fatal('The SimConnect library is missing or damaged. Unzip the PC app again, keeping the lib folder next to the .exe.', e); }
  simCheck(lib).then(pause, e => fatal('The sim check stopped', e)).then(() => process.exit(0));
}
else if (arg('--replay') >= 0) {
  const file = process.argv[arg('--replay') + 1];
  if (!file) fatal('Give the recording to play back: AirlineManagerPro-PC.exe --replay <file> [speed]');
  main({ file, speed: Math.max(0.1, Number(process.argv[arg('--replay') + 2]) || 1) });
}
else main();
