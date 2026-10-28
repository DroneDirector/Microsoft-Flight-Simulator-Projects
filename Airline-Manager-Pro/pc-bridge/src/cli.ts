// Entry point of the PC app.
import { main } from './main';
import { demo } from './demo';

const i = process.argv.indexOf('--demo');
if (i >= 0) demo(Number(process.argv[i + 1]) || 1, process.env.AMP_CODE);
else main();
