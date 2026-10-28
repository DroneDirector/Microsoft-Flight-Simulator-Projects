// Entry point of the PC app.
import { main, dataDir } from './main';
import { demo } from './demo';
import { openLog, catchEverything } from './errors';

const i = process.argv.indexOf('--demo');
if (i >= 0) { openLog(dataDir()); catchEverything(); demo(Number(process.argv[i + 1]) || 1, process.env.AMP_CODE); }
else main();
