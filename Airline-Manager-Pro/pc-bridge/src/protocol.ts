// Messages exchanged between the PC app and the phone over the local Wi-Fi network.
// The phone keeps an identical copy of these types in src/core/link.ts.

export const LINK_PORT = 47610;        // WebSocket + HTTP
export const DISCOVERY_PORT = 47611;   // UDP discovery
export const PROTOCOL_VERSION = 1;

/** One reading of the user's aircraft, sent about once per second. */
export interface SimSnapshot {
  t: number;                 // ms since epoch
  connected: boolean;        // SimConnect connected
  sim: string;               // e.g. "Microsoft Flight Simulator 2024"
  inFlight: boolean;         // a flight is loaded (not in the menus)
  paused: boolean;
  title: string;             // aircraft title, e.g. "FenixA320 CFM ..."
  atcId: string;             // registration shown in the sim
  atcModel: string; atcType: string;
  lat: number; lon: number; altFt: number; aglFt: number;
  hdg: number; ias: number; gs: number; vsFpm: number; g: number; pitch: number;
  onGround: boolean; parkingBrake: boolean; enginesRunning: number; engines: number;
  flapsIndex: number; gearDown: boolean;
  fuelKg: number; emptyKg: number; totalKg: number; mtowKg: number;
  stations: { name: string; kg: number }[];
  gsx: { running: boolean; boardingState: number; paxBoarded: number; paxTotal: number; cargoPct: number };
  approachAirport: string;
  phase: FlightPhase;
  from: string;              // departure airport of the current leg, when known
}

export type FlightPhase = 'idle' | 'parked' | 'taxi-out' | 'takeoff' | 'climb' | 'cruise' | 'descent' | 'approach' | 'landed' | 'taxi-in' | 'arrived';

export interface FlightEvent {
  type: 'blocks-off' | 'takeoff' | 'touchdown' | 'blocks-on' | 'crash' | 'damage' | 'turbulence';
  t: number;
  lat: number; lon: number;
  airport?: string;          // nearest airport ICAO when relevant
  // touchdown
  fpm?: number; g?: number; pitch?: number; bounces?: number;
  // damage / turbulence
  code?: 'tail-strike' | 'hard-landing' | 'flap-overspeed' | 'gear-overspeed' | 'engine-failure' | 'overstress' | 'severe-turbulence';
  severity?: 'minor' | 'major' | 'grounding';
  detail?: string;
  // blocks-on: summary of the leg
  summary?: LegSummary;
}

export interface LegSummary {
  from: string; to: string; blockMin: number; airMin: number; distanceNm: number;
  fuelUsedKg: number; landingFpm: number; landingG: number; pax: number; cargoKg: number;
  aircraftTitle: string; atcId: string;
}

export interface Airport { icao: string; lat: number; lon: number }

export type ToPhone =
  | { type: 'welcome'; pcName: string; version: string; protocol: number; paired: boolean }
  | { type: 'pair-result'; ok: boolean; token?: string; reason?: string }
  | { type: 'state'; s: SimSnapshot }
  | { type: 'event'; e: FlightEvent }
  | { type: 'airports'; list: Airport[] }
  | { type: 'pong'; t: number };

export type ToPc =
  | { type: 'hello'; device: string; token?: string }
  | { type: 'pair'; code: string; device: string }
  | { type: 'ping'; t: number }
  | { type: 'plan'; from?: string; to?: string; reg?: string };
