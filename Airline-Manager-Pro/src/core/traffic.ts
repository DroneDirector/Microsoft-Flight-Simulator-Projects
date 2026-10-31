// Other airlines' traffic (your own airline only, not co-op): a fixed fleet of aircraft belonging to
// made-up airlines, each flying its own route back and forth on the real clock. They never grow (no
// buying), so the number stays fair for performance. Shown on the map (many) and in the 3D view (only
// the ones in front of the camera). Switch them off and on from the map or the 3D view.

interface TrafficCraft { id: string; airline: string; code: string; color: string; color2: string; typeId: string; reg: string; a: string; b: string; num: number; durMs: number; turnMs: number; off: number }
const TRAFFIC_N = 140;            // aircraft in all: about half near your home base, half around the world
const TRAFFIC_COLORS = [['#C8102E', '#1B2A44'], ['#0B6E4F', '#F2C14E'], ['#3A86FF', '#0B1F3A'], ['#F77F00', '#22333B'], ['#7B2CBF', '#F1F1F1'], ['#2EC4B6', '#011627'], ['#E63946', '#F1FAEE'], ['#FFB703', '#023047'], ['#118AB2', '#073B4C'], ['#8D99AE', '#2B2D42'], ['#06D6A0', '#1B4332'], ['#EF476F', '#26547C']];
const Traffic = {
  fleet: null as TrafficCraft[],
  _key: '',
  on(): boolean { return !Mode.coop() && (State.settings as any).otherTraffic !== false; },
  /** Built once (the same every day for the same home base): who flies what, between where. */
  build(): TrafficCraft[] {
    const hub = company() ? company().hub : 'EKVG', key = hub + ':' + (World.ready ? World.list.length : 0);
    if (this.fleet && this._key === key) return this.fleet;
    const H = apt(hub), big = (World.ready ? World.list : []).filter((w: any) => w.size === 2 && w.sched && w.pos && /^[A-Z]{4}$/.test(w.icao));
    if (big.length < 20 || !H) { this.fleet = []; return this.fleet; }
    const near = big.filter((w: any) => gcDistanceNm(H.pos, w.pos) < 1300);
    const out: TrafficCraft[] = [], r = seeded('traffic:' + hub);
    for (let i = 0; i < TRAFFIC_N && out.length < TRAFFIC_N; i++) {
      const pool = i % 2 === 0 && near.length > 6 ? near : big;
      const A: any = pool[Math.floor(r() * pool.length)];
      // a partner airport at a sensible distance for the aircraft
      let B: any = null, nm = 0;
      for (let k = 0; k < 14 && !B; k++) { const c: any = pool[Math.floor(r() * pool.length)]; nm = gcDistanceNm(A.pos, c.pos); if (c.icao !== A.icao && nm > 120 && nm < 4800) B = c; }
      if (!B) continue;
      const typeId = nm < 280 ? (r() < 0.6 ? 'atr72' : 'crj9-aero') : nm < 650 ? ['a320neo', 'b738-pmdg', 'crj9-aero', 'a320-fenix'][Math.floor(r() * 4)] : nm < 2600 ? ['a320neo', 'b738-pmdg', 'a320-fenix', 'b736-pmdg'][Math.floor(r() * 4)] : ['b78x', 'a350-ini', 'b77w-pmdg', 'b748'][Math.floor(r() * 4)];
      if (!acType(typeId)) continue;
      const al = COMPETITOR_NAMES[Math.floor(r() * COMPETITOR_NAMES.length)], code = al.split(' ').map(w => w[0]).join('').toUpperCase().padEnd(2, 'X') + String.fromCharCode(65 + (_hashStr(al) % 26));
      const col = TRAFFIC_COLORS[_hashStr(al) % TRAFFIC_COLORS.length];
      let durMs = 0; try { durMs = flightProfile(typeId, A.icao, B.icao, 0).totalS * 1000; } catch (e) { /* ignore */ }
      if (!durMs) durMs = (nm / (acType(typeId).cruiseKt || 420) * 60 + 25) * 60e3;
      const turnMs = (nm > 2600 ? 120 : nm < 280 ? 30 : 50) * 60e3;
      out.push({ id: 'tfc-' + i, airline: al, code, color: col[0], color2: col[1], typeId, reg: '', a: A.icao, b: B.icao, num: 100 + Math.floor(r() * 899), durMs, turnMs, off: Math.floor(r() * 2 * (durMs + turnMs)) });
    }
    this.fleet = out; this._key = key; return out;
  },
  /** The flights in the air (or taxiing) right now, as flights the map and 3D view can draw. */
  _cache: null as any[], _cacheAt: 0,
  live(now?: number): any[] {
    if (!this.on()) return [];
    now = now || Date.now();
    if (this._cache && now - this._cacheAt < 15000) return this._cache;
    const out: any[] = [];
    for (const t of this.build()) {
      const cyc = 2 * (t.durMs + t.turnMs), k = Math.floor((now + t.off) / cyc), into = (now + t.off) - k * cyc;
      const back = into >= t.durMs + t.turnMs, legT = back ? into - t.durMs - t.turnMs : into;
      if (legT >= t.durMs) continue;   // on the ground between flights
      const from = back ? t.b : t.a, to = back ? t.a : t.b, depAt = now - legT;
      if (!apt(from) || !apt(to)) { try { registerWorldAirport(from); registerWorldAirport(to); } catch (e) { /* ignore */ } if (!apt(from) || !apt(to)) continue; }
      out.push({ id: `${t.id}-${k}-${back ? 1 : 0}`, tfc: t, reg: '', from, to, typeId: t.typeId, depAt, durMs: t.durMs, coop: true, real: false, callsign: t.code + (t.num + (back ? 1 : 0)), t: legT / t.durMs, alt: 0, phase: '' });
    }
    if (out.length) { this._cache = out; this._cacheAt = now; }   // nothing yet (airports still loading): try again next time
    return out;
  },
};
ACTIONS['tfc-toggle'] = () => {
  const S: any = State.settings; S.otherTraffic = !Traffic.on(); Traffic._cache = null; Store.soon(); Sound.tick();
  document.querySelectorAll('.tfc-btn').forEach(b => b.classList.toggle('on', Traffic.on()));
  toast(Traffic.on() ? 'Other airlines\' aircraft shown' : 'Other airlines\' aircraft hidden', 'info');
  try { if (typeof v3dTrafficSync === 'function') v3dTrafficSync(); } catch (e) { /* ignore */ }
};
function trafficBtn(): string { return Mode.coop() ? '' : `<button class="icon-btn tfc-btn ${Traffic.on() ? 'on' : ''}" data-act="tfc-toggle" aria-label="Other airlines' aircraft" title="Other airlines' aircraft">${icon('fleet')}</button>`; }
