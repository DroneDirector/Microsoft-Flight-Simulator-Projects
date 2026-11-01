// Registrations for other airlines' aircraft when they are shown with real airline names (the airlines
// themselves are REAL_AIRLINES in airlines.ts).

/** Aircraft registration prefixes, by the first letters of the base's ICAO code (the country). */
const REG_PREFIX: { [k: string]: string } = {
  EG: 'G-', EI: 'EI-', ED: 'D-', LF: 'F-', EH: 'PH-', EB: 'OO-', LS: 'HB-', LO: 'OE-', EK: 'OY-', EN: 'LN-', ES: 'SE-', EF: 'OH-', BI: 'TF-',
  LE: 'EC-', LP: 'CS-', LI: 'I-', LG: 'SX-', LT: 'TC-', EP: 'SP-', LH: 'HA-', OM: 'A6-', OT: 'A7-', OE: 'HZ-', LL: '4X-', HA: 'ET-', HE: 'SU-',
  GM: 'CN-', FA: 'ZS-', K: 'N', C: 'C-', MM: 'XA-', MP: 'HP-', SK: 'HK-', SC: 'CC-', WS: '9V-', VH: 'B-', RJ: 'JA', RK: 'HL', ZB: 'B-', ZS: 'B-',
  ZG: 'B-', VI: 'VT-', VA: 'VT-', YS: 'VH-', NZ: 'ZK-', WM: '9M-', VT: 'HS-', RP: 'RP-', WI: 'PK-',
};
/** A registration in the style of the country an airline is based in. */
function realReg(hub: string, r: () => number): string {
  const L = () => String.fromCharCode(65 + Math.floor(r() * 26)), D = () => String(Math.floor(r() * 10));
  const p = REG_PREFIX[hub.slice(0, 2)] || REG_PREFIX[hub[0]] || hub.slice(0, 2) + '-';
  if (p === 'N') return 'N' + (1 + Math.floor(r() * 9)) + D() + D() + L() + L();
  if (p === 'JA') return 'JA' + D() + D() + D() + L();
  if (p === 'HL') return 'HL' + D() + D() + D() + D();
  if (p === 'B-' || p === '4X-') return p + D() + D() + D() + D();
  return p + (p.length >= 3 ? L() + L() + L() : L() + L() + L() + L()).slice(0, p.length >= 3 ? 3 : 4);
}
