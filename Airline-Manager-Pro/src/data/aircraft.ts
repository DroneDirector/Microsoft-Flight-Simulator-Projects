// Aircraft types the airline can buy. In the finished app this list is filtered to what the
// simulator reports as installed (default aircraft plus add-ons in the Community folder).
// Manufacturer and developer names are used only to identify products; no logos or product art are used.

interface ArtSpec {
  len: number;          // relative length 0.45 … 1
  h: number;            // fuselage height (px at full scale)
  nose: 'airbus' | 'boeing' | 'regional' | 'turboprop' | 'ga';
  eng: 'wing2' | 'wing4' | 'rear2' | 'prop2' | 'prop1';
  wing: 'low' | 'high';
  tail: 'conv' | 'T';
  win: number;          // passenger window count
  floats?: boolean;
  hump?: boolean;       // upper deck
  fixedGear?: boolean;
  strut?: boolean;
}

interface AircraftType {
  id: string; maker: string; model: string; variant: string;
  dev: string; devKind: 'default' | 'add-on';
  seats: number; rangeNm: number; cruiseKt: number; price: number; costPerHr: number;
  cls: 'airliner' | 'widebody' | 'regional' | 'turboprop' | 'bush' | 'ga';
  installed: boolean;    // demo: detected in the user's sim
  art: ArtSpec;
}

const AIRCRAFT: AircraftType[] = [
  { id: 'a320-fenix', maker: 'Airbus', model: 'A320', variant: 'A320-214', dev: 'Fenix Simulations', devKind: 'add-on', seats: 180, rangeNm: 3300, cruiseKt: 450, price: 46200000, costPerHr: 6100, cls: 'airliner', installed: true,
    art: { len: 0.72, h: 22, nose: 'airbus', eng: 'wing2', wing: 'low', tail: 'conv', win: 26 } },
  { id: 'a320neo', maker: 'Airbus', model: 'A320neo', variant: 'A320-251N', dev: 'Microsoft / Asobo', devKind: 'default', seats: 186, rangeNm: 3400, cruiseKt: 450, price: 110600000, costPerHr: 5400, cls: 'airliner', installed: true,
    art: { len: 0.72, h: 22, nose: 'airbus', eng: 'wing2', wing: 'low', tail: 'conv', win: 26 } },
  { id: 'a350-ini', maker: 'Airbus', model: 'A350-900', variant: 'A350-941', dev: 'iniBuilds', devKind: 'add-on', seats: 315, rangeNm: 8100, cruiseKt: 488, price: 317400000, costPerHr: 11800, cls: 'widebody', installed: true,
    art: { len: 1, h: 30, nose: 'airbus', eng: 'wing2', wing: 'low', tail: 'conv', win: 44 } },
  { id: 'a310-ini', maker: 'Airbus', model: 'A310-300', variant: 'A310-304', dev: 'iniBuilds', devKind: 'add-on', seats: 220, rangeNm: 5150, cruiseKt: 460, price: 18500000, costPerHr: 9100, cls: 'widebody', installed: false,
    art: { len: 0.78, h: 28, nose: 'airbus', eng: 'wing2', wing: 'low', tail: 'conv', win: 32 } },
  { id: 'b738-pmdg', maker: 'Boeing', model: '737-800', variant: '737-8AS', dev: 'PMDG', devKind: 'add-on', seats: 189, rangeNm: 2935, cruiseKt: 453, price: 48000000, costPerHr: 6300, cls: 'airliner', installed: true,
    art: { len: 0.75, h: 21, nose: 'boeing', eng: 'wing2', wing: 'low', tail: 'conv', win: 27 } },
  { id: 'b736-pmdg', maker: 'Boeing', model: '737-600', variant: '737-683', dev: 'PMDG', devKind: 'add-on', seats: 123, rangeNm: 3050, cruiseKt: 450, price: 24000000, costPerHr: 5600, cls: 'airliner', installed: true,
    art: { len: 0.6, h: 21, nose: 'boeing', eng: 'wing2', wing: 'low', tail: 'conv', win: 20 } },
  { id: 'b77w-pmdg', maker: 'Boeing', model: '777-300ER', variant: '777-36N(ER)', dev: 'PMDG', devKind: 'add-on', seats: 396, rangeNm: 7370, cruiseKt: 490, price: 375500000, costPerHr: 14900, cls: 'widebody', installed: true,
    art: { len: 1, h: 31, nose: 'boeing', eng: 'wing2', wing: 'low', tail: 'conv', win: 48 } },
  { id: 'b78x', maker: 'Boeing', model: '787-10', variant: '787-10 Dreamliner', dev: 'Microsoft / Asobo', devKind: 'default', seats: 330, rangeNm: 6430, cruiseKt: 488, price: 338400000, costPerHr: 11200, cls: 'widebody', installed: true,
    art: { len: 0.97, h: 29, nose: 'boeing', eng: 'wing2', wing: 'low', tail: 'conv', win: 44 } },
  { id: 'b748', maker: 'Boeing', model: '747-8', variant: '747-8 Intercontinental', dev: 'Microsoft / Asobo', devKind: 'default', seats: 410, rangeNm: 7730, cruiseKt: 495, price: 418400000, costPerHr: 19800, cls: 'widebody', installed: true,
    art: { len: 1, h: 32, nose: 'boeing', eng: 'wing4', wing: 'low', tail: 'conv', win: 48, hump: true } },
  { id: 'crj9-aero', maker: 'Bombardier', model: 'CRJ900', variant: 'CRJ900LR', dev: 'Aerosoft', devKind: 'add-on', seats: 90, rangeNm: 1550, cruiseKt: 447, price: 46000000, costPerHr: 4300, cls: 'regional', installed: true,
    art: { len: 0.66, h: 17, nose: 'regional', eng: 'rear2', wing: 'low', tail: 'T', win: 24 } },
  { id: 'crj7-aero', maker: 'Bombardier', model: 'CRJ700', variant: 'CRJ700ER', dev: 'Aerosoft', devKind: 'add-on', seats: 70, rangeNm: 1400, cruiseKt: 447, price: 41000000, costPerHr: 4000, cls: 'regional', installed: true,
    art: { len: 0.58, h: 17, nose: 'regional', eng: 'rear2', wing: 'low', tail: 'T', win: 20 } },
  { id: 'atr72', maker: 'ATR', model: 'ATR 72-600', variant: 'ATR 72-600', dev: 'Microsoft / Asobo', devKind: 'default', seats: 72, rangeNm: 825, cruiseKt: 275, price: 26500000, costPerHr: 2300, cls: 'turboprop', installed: true,
    art: { len: 0.58, h: 19, nose: 'turboprop', eng: 'prop2', wing: 'high', tail: 'T', win: 19 } },
  { id: 'dhc6-aero', maker: 'de Havilland Canada', model: 'DHC-6 Twin Otter', variant: 'DHC-6-300', dev: 'Aerosoft', devKind: 'add-on', seats: 19, rangeNm: 770, cruiseKt: 150, price: 7200000, costPerHr: 1100, cls: 'bush', installed: true,
    art: { len: 0.48, h: 16, nose: 'turboprop', eng: 'prop2', wing: 'high', tail: 'conv', win: 8, fixedGear: true, strut: true } },
  { id: 'dhc2', maker: 'de Havilland Canada', model: 'DHC-2 Beaver', variant: 'DHC-2 on floats', dev: 'Microsoft / Asobo', devKind: 'default', seats: 6, rangeNm: 455, cruiseKt: 125, price: 750000, costPerHr: 420, cls: 'bush', installed: true,
    art: { len: 0.42, h: 15, nose: 'ga', eng: 'prop1', wing: 'high', tail: 'conv', win: 3, floats: true, strut: true } },
  { id: 'c208', maker: 'Cessna', model: '208B Grand Caravan', variant: '208B Grand Caravan EX', dev: 'Microsoft / Asobo', devKind: 'default', seats: 12, rangeNm: 960, cruiseKt: 185, price: 2600000, costPerHr: 640, cls: 'bush', installed: true,
    art: { len: 0.46, h: 15, nose: 'ga', eng: 'prop1', wing: 'high', tail: 'conv', win: 6, fixedGear: true, strut: true } },
  { id: 'kodiak', maker: 'Daher', model: 'Kodiak 100', variant: 'Kodiak 100 Series III', dev: 'SimWorks Studios', devKind: 'add-on', seats: 9, rangeNm: 1000, cruiseKt: 174, price: 3200000, costPerHr: 590, cls: 'bush', installed: true,
    art: { len: 0.44, h: 15, nose: 'ga', eng: 'prop1', wing: 'high', tail: 'conv', win: 4, fixedGear: true, strut: true } },
  { id: 'pc12', maker: 'Pilatus', model: 'PC-12', variant: 'PC-12 NGX', dev: 'Microsoft / Asobo', devKind: 'default', seats: 9, rangeNm: 1800, cruiseKt: 285, price: 5500000, costPerHr: 780, cls: 'ga', installed: true,
    art: { len: 0.45, h: 15, nose: 'ga', eng: 'prop1', wing: 'low', tail: 'T', win: 5 } },
  { id: 'c172', maker: 'Cessna', model: '172 Skyhawk', variant: '172S Skyhawk', dev: 'Microsoft / Asobo', devKind: 'default', seats: 3, rangeNm: 640, cruiseKt: 124, price: 430000, costPerHr: 160, cls: 'ga', installed: true,
    art: { len: 0.36, h: 12, nose: 'ga', eng: 'prop1', wing: 'high', tail: 'conv', win: 2, fixedGear: true, strut: true } },
];

function acType(id: string): AircraftType { for (const a of AIRCRAFT) if (a.id === id) return a; return null; }
