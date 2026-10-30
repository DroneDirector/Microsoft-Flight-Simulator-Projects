// Flaps and landing gear through a flight, per aircraft type: the flap settings with their limit speeds,
// the gear limits and when crews select each step, from docs/reference/flap-gear-and-phase-speeds.txt.
// Every aircraft type added to the app gets an entry here (see CLAUDE.md).
//
//   flaps   the flap lever settings in order, with the highest speed each may be used at (VFE, knots)
//   to      take-off setting(s); land: landing setting(s)
//   gear    'fixed', or the speeds the gear may be lowered (vloExt), raised (vloRet) and flown down (vle)
//   steps   on the approach: the speed at which each setting is normally selected
//   clean   the clean manoeuvring speed

interface FlapStep { n: string; vfe: number }
interface ConfigSpec {
  flaps: FlapStep[]; to: string[]; land: string[];
  gear: 'fixed' | { vloExt: number; vloRet: number; vle: number };
  steps: { n: string; at: number }[]; clean: number;
  gearDown?: string; vmo?: number; mmo?: number; vne?: number; vno?: number;
  climbIas?: number; climbMach?: number; descIas?: number; descMach?: number; cruiseIas?: number;
}

const FLIGHT_CONFIGS: { [typeId: string]: ConfigSpec } = {};

/** The config data for a type: its own, or the nearest type of its class. */
function configSpec(typeId: string): ConfigSpec {
  if (FLIGHT_CONFIGS[typeId]) return FLIGHT_CONFIGS[typeId];
  const t = acType(typeId) || AIRCRAFT[0];
  const by: { [c: string]: string } = { widebody: 'b78x', airliner: 'a320neo', regional: 'crj9-aero', turboprop: 'atr72', bush: 'c208', ga: 'c172' };
  return FLIGHT_CONFIGS[by[t.cls]] || null;
}

/** Flaps (0 up … 1 full) and gear (0 up, 1 down) for a type in a phase of flight at a speed and height
 *  above the ground: the way crews configure the aircraft on the real speed schedule. */
function flightConfig(typeId: string, phase: string, ias: number, aglFt: number, onGround: boolean): { flaps: number; gear: number; flapName: string } {
  const C = configSpec(typeId), ph = (phase || '').toLowerCase();
  const sg = shapeOf(typeId).gear, fixed = !!sg.fixed || !!sg.floats || (!!C && C.gear === 'fixed');
  const n = C ? C.flaps.length : 3, idxOf = (name: string) => C ? Math.max(0, C.flaps.findIndex(f => f.n === name)) + 1 : 1;
  const frac = (i: number) => i / Math.max(1, n);
  const toIdx = C && C.to.length ? idxOf(C.to[0]) : 1, landIdx = C && C.land.length ? idxOf(C.land[0]) : n;
  let fi = 0, gear = fixed ? 1 : 0;
  if (onGround) {
    gear = 1;
    fi = /taxi out|pushback|holding|take-?off roll|line up/.test(ph) ? toIdx : /landing roll|touchdown/.test(ph) ? landIdx : 0;
  } else if (/take-?off|lift-?off|climb|departure|sid/.test(ph) && aglFt < 4000) {
    // after take-off: gear up with a positive climb, flaps up step by step as the speed builds
    gear = fixed ? 1 : aglFt < 50 ? 1 : 0;
    fi = toIdx;
    if (C) for (let i = toIdx; i >= 1; i--) { const st = C.steps.filter(s => s.n === C.flaps[i - 1].n)[0]; if (st && ias > st.at + 10) fi = i - 1; }
    else fi = aglFt > 1500 ? 0 : toIdx;
  } else if (/approach|final|landing|star|arrival|descent|touchdown/.test(ph)) {
    // on the approach: each step at its speed, the gear at about 2,000 ft or the final fix
    fi = 0;
    if (C) for (let i = 1; i <= landIdx; i++) { const st = C.steps.filter(s => s.n === C.flaps[i - 1].n)[0]; if (st && ias <= st.at + 2) fi = i; }
    else fi = /final/.test(ph) ? n : /approach/.test(ph) ? 1 : 0;
    if (/final/.test(ph) && aglFt < 1000) fi = landIdx;
    if (!fixed) gear = aglFt < 2200 && /approach|final|landing|touchdown/.test(ph) ? 1 : 0;
  }
  return { flaps: frac(fi), gear, flapName: fi && C ? C.flaps[fi - 1].n : 'UP' };
}
