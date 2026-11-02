// One numbering for every request the PC app sends to Flight Simulator's facility data (airport layouts,
// departures and arrivals, airways), so no two requests can ever carry the same number and one reader can
// never take another's answer (an airport's layout mixed with another airport's data).
let next = 100000;
export function nextRequestId(): number { if (next > 2000000000) next = 100000; return next++; }
