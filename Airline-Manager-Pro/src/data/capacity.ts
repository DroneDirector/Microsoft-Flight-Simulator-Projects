// How many passengers each type carries, from the manufacturers' published figures: a typical layout
// in two or three classes, all-economy, and the most the emergency exits allow (the certified maximum).
// Freighters show cargo instead. Every aircraft type added to the app gets an entry here (see CLAUDE.md).
//   typ    typical seats in the usual airline layout (classes noted)
//   one    all-economy (high density) layout
//   max    the certified maximum (exit limit)

interface Capacity { typ: number; cls: string; one: number; max: number }

const CAPACITY: { [typeId: string]: Capacity } = {
  'a320-fenix': { typ: 150, cls: '2 classes', one: 180, max: 186 },
  'a320neo': { typ: 165, cls: '2 classes', one: 186, max: 194 },
  'a350-ini': { typ: 315, cls: '3 classes', one: 440, max: 440 },
  'a310-ini': { typ: 220, cls: '2 classes', one: 265, max: 280 },
  'b738-pmdg': { typ: 162, cls: '2 classes', one: 189, max: 189 },
  'b736-pmdg': { typ: 110, cls: '2 classes', one: 130, max: 130 },
  'b77w-pmdg': { typ: 365, cls: '3 classes', one: 550, max: 550 },
  'b78x': { typ: 330, cls: '2 classes', one: 440, max: 440 },
  'b748': { typ: 410, cls: '3 classes', one: 605, max: 605 },
  'crj9-aero': { typ: 76, cls: '2 classes', one: 90, max: 90 },
  'crj7-aero': { typ: 66, cls: '2 classes', one: 78, max: 78 },
  'atr72': { typ: 70, cls: '1 class', one: 72, max: 78 },
  'dhc6-aero': { typ: 19, cls: '1 class', one: 19, max: 20 },
  'dhc2': { typ: 6, cls: '1 class', one: 7, max: 7 },
  'c208': { typ: 9, cls: 'commuter', one: 13, max: 13 },
  'kodiak': { typ: 8, cls: 'utility', one: 9, max: 9 },
  'pc12': { typ: 6, cls: 'executive', one: 9, max: 9 },
  'c172': { typ: 3, cls: 'with the pilot', one: 3, max: 3 },
};

/** The capacity of a type (types without an entry: their seats as the typical figure). */
function capacityOf(typeId: string): Capacity {
  const c = CAPACITY[typeId]; if (c) return c;
  const t = acType(typeId) || AIRCRAFT[0];
  return { typ: t.seats, cls: '', one: t.seats, max: t.seats };
}

/** "150 in 2 classes · 180 all economy · up to 186" for cards and details. */
function capacityText(typeId: string): string {
  const c = capacityOf(typeId);
  const parts = [`${c.typ}${c.cls ? ' ' + (/class/.test(c.cls) ? 'in ' : '') + c.cls : ''}`];
  if (c.one > c.typ) parts.push(`${c.one} all economy`);
  if (c.max > c.one) parts.push(`up to ${c.max}`);
  return parts.join(' · ');
}
