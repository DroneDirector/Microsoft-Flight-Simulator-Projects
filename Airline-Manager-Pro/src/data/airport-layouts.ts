// Airport layouts for the airport view. Linked to the simulator, the layout comes from the simulator
// itself through the PC app: runways, taxiways, stands and gates exactly as Microsoft Flight Simulator
// has them (add-on scenery included). Without the link, the airport's real runways from the world
// airport data are used. Layouts are kept for the session.

interface AirportLayout {
  icao: string; name: string; lat: number; lon: number; alt: number; magvar: number;
  runways: { lat: number; lon: number; hdg: number; len: number; wid: number; surf: number; a: string; b: string }[];
  points: number[][];   // [east m, north m, type]
  parks: number[][];    // [east m, north m, heading, radius m, type, name code, number]
  paths: number[][];    // [type, width m, start, end, name index, runway number, runway designator]
  names: string[];
  source: 'sim' | 'runways';
}

const AirportLayouts = {
  cache: {} as { [icao: string]: AirportLayout },
  waiting: {} as { [icao: string]: { ok: (l: AirportLayout) => void; timer: any }[] },

  get(icao: string): Promise<AirportLayout> {
    icao = String(icao || '').toUpperCase();
    const c = this.cache[icao];
    // a layout from the simulator is the best there is; one built from runway data is replaced when linked
    if (c && (c.source === 'sim' || Link.status !== 'connected')) return Promise.resolve(c);
    return new Promise(ok => {
      if (Link.status === 'connected' && linkSend({ type: 'layout', icao })) {
        const w = { ok, timer: setTimeout(() => this.received(icao, null, 'timeout'), 15000) };
        (this.waiting[icao] = this.waiting[icao] || []).push(w);
      } else this.fromRunways(icao).then(ok);
    });
  },

  /** The PC app answered (a layout, or why there isn't one). */
  received(icao: string, layout: any, error?: string) {
    icao = String(icao || '').toUpperCase();
    const ws = this.waiting[icao] || []; delete this.waiting[icao];
    ws.forEach(w => clearTimeout(w.timer));
    const done = (l: AirportLayout) => ws.forEach(w => w.ok(l));
    if (layout && (layout.runways || []).length) {
      const l: AirportLayout = Object.assign({ points: [], parks: [], paths: [], names: [] }, layout, { icao, source: 'sim' as const });
      this.cache[icao] = l; done(l);
    } else this.fromRunways(icao).then(done);
  },

  /** A layout with the airport's real runways (world airport data), when the simulator can't give one. */
  fromRunways(icao: string): Promise<AirportLayout> {
    return World.loadRunways().then(rw => {
      const a: any = apt(icao);
      const l: AirportLayout = { icao, name: a ? a.name : icao, lat: a ? a.pos[1] : 0, lon: a ? a.pos[0] : 0, alt: a && a.elev ? a.elev * 0.3048 : 0, magvar: 0,
        runways: [], points: [], parks: [], paths: [], names: [], source: 'runways' };
      for (const r of (rw[icao] || []) as any[]) {
        const [id1, id2, lenFt, widFt, surf, la1, lo1, la2, lo2, hdg1] = r;
        let lat: number, lon: number, hdg: number, len = (lenFt || 0) * 0.3048;
        if (la1 != null && la2 != null) {
          lat = (la1 + la2) / 2; lon = (lo1 + lo2) / 2;
          const k = Math.cos(lat * Math.PI / 180), dx = (lo2 - lo1) * k, dy = la2 - la1;
          hdg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
          if (!len) len = Math.hypot(dx, dy) * 111120;
        } else if (a && (hdg1 != null || /^\d{1,2}/.test(id1))) {
          // no runway ends in the data: centred on the airport, heading from its number
          lat = a.pos[1]; lon = a.pos[0]; hdg = hdg1 != null ? hdg1 : (parseInt(id1, 10) || 0) * 10;
        } else continue;
        if (!len) continue;
        l.runways.push({ lat, lon, hdg, len, wid: Math.max(18, (widFt || 100) * 0.3048), surf: /ASP|CON|BIT|PEM/i.test(surf || '') ? 4 : /GRS|TURF|GRASS/i.test(surf || '') ? 1 : /WAT/i.test(surf || '') ? 9 : 2, a: String(id1 || ''), b: String(id2 || '') });
      }
      this.cache[icao] = l;
      return l;
    });
  },
};
