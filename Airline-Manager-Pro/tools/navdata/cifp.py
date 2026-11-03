"""Published departures (SIDs), arrivals (STARs) and approaches for the airports in the United States and its
territories, from the FAA's Coded Instrument Flight Procedures (CIFP, ARINC 424; a work of the US government,
public domain: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/).

The procedures are written in the same form the PC app reads them from the simulator (src/core/procedures.ts,
SimProcs), so flights follow them the same way with or without the simulator. One file per first two letters
of the airport code (navdata/cifp/KB.json), each { "KBUR": {sids, stars, apps}, ... }.

A leg is [type, fix, lat, lon, altitude m, course °true, distance nm, turn (1 left, 2 right),
          arc centre lat, arc centre lon, altitude rule (+ at or above, - at or below, B between, @ at),
          second altitude m, speed limit kt, fix role (A IAF, B IF, F FAF, M missed approach point)]
with the leg types numbered the way the simulator numbers them (IF 15, TF 18, RF 17, CF 4, ...).

Usage: python3 cifp.py <FAACIFP18 file or the CIFP zip> <output folder>
"""
import sys, os, json, re, zipfile, io

LEG = {'AF': 1, 'CA': 2, 'CD': 3, 'CF': 4, 'CI': 5, 'CR': 6, 'DF': 7, 'FA': 8, 'FC': 9, 'FD': 10, 'FM': 11, 'HA': 12, 'HF': 13,
       'HM': 14, 'IF': 15, 'PI': 16, 'RF': 17, 'TF': 18, 'VA': 19, 'VD': 20, 'VI': 21, 'VM': 22, 'VR': 23}
# approach types as the simulator numbers them: GPS 1, VOR 2, NDB 3, ILS 4, LOC 5, SDF 6, LDA 7, VOR/DME 8, NDB/DME 9, RNAV 10, LOC BC 11
APP = {'I': 4, 'L': 5, 'B': 11, 'R': 10, 'H': 10, 'P': 1, 'V': 2, 'S': 8, 'D': 8, 'N': 3, 'Q': 9, 'U': 6, 'X': 7, 'G': 4, 'J': 10, 'T': 2}
SID_RW, SID_COMMON, SID_EN = set('14FT'), set('25M'), set('36SV')
STAR_EN, STAR_COMMON, STAR_RW = set('147'), set('258M'), set('369F')


def col(l, a, b): return l[a - 1:b]


def ll(s):
    """N34120250 / W118213120 to degrees."""
    s = s.strip()
    if len(s) < 9: return None
    h, d = s[0], s[1:]
    try:
        if h in 'NS': v = int(d[0:2]) + int(d[2:4]) / 60 + int(d[4:8]) / 360000
        else: v = int(d[0:3]) + int(d[3:5]) / 60 + int(d[5:9]) / 360000
    except ValueError: return None
    return -v if h in 'SW' else v


def alt(s):
    s = s.strip()
    if not s: return 0
    if s.startswith('FL'):
        try: return int(s[2:]) * 100
        except ValueError: return 0
    try: return int(s)
    except ValueError: return 0


def num(s, div=1.0):
    s = s.strip()
    try: return int(s) / div
    except ValueError: return 0.0


def read_lines(path):
    if path.lower().endswith('.zip'):
        z = zipfile.ZipFile(path)
        name = [n for n in z.namelist() if re.search(r'FAACIFP', n, re.I)][0]
        return io.TextIOWrapper(z.open(name), encoding='latin-1')
    return open(path, encoding='latin-1')


def main(src, out):
    lines = [l.rstrip('\r\n') for l in read_lines(src) if l.startswith('S')]
    fixes, term, rwys, magvar = {}, {}, {}, {}
    # every fix with a position: navaids, waypoints, runways, airports
    for l in lines:
        sec, sub = l[4], l[5]
        if sec == 'D' and sub == ' ':      # VOR / DME / TACAN
            la, lo = ll(col(l, 33, 41)), ll(col(l, 42, 51))
            if la is None: la, lo = ll(col(l, 56, 64)), ll(col(l, 65, 74))
            if la is not None: fixes[('D', col(l, 14, 17).strip(), col(l, 20, 21))] = (la, lo)
        elif sec == 'D' and sub == 'B':
            la, lo = ll(col(l, 33, 41)), ll(col(l, 42, 51))
            if la is not None: fixes[('DB', col(l, 14, 17).strip(), col(l, 20, 21))] = (la, lo)
        elif sec == 'E' and sub == 'A':
            la, lo = ll(col(l, 33, 41)), ll(col(l, 42, 51))
            if la is not None: fixes[('EA', col(l, 14, 18).strip(), col(l, 20, 21))] = (la, lo)
        elif sec == 'P' and l[12] in 'ACGNI' and l[21] in '01':   # (continuation records skipped)
            apt, s2 = col(l, 7, 10).strip(), l[12]
            if s2 == 'A':
                la, lo = ll(col(l, 33, 41)), ll(col(l, 42, 51))
                if la is not None: fixes[('PA', apt, '')] = (la, lo)
                mv = col(l, 52, 56)
                if mv[:1] in 'EW': magvar[apt] = num(mv[1:], 10) * (1 if mv[0] == 'E' else -1)
            elif s2 in 'CGNI':
                w = 18 if s2 in 'CG' else 17
                la, lo = ll(col(l, 33, 41)), ll(col(l, 42, 51))
                if la is None: continue
                term[(apt, 'P' + s2, col(l, 14, w).strip())] = (la, lo)
                if s2 == 'G': rwys.setdefault(apt, []).append(col(l, 16, 18).strip())

    by_id = {}
    for k, v in fixes.items(): by_id.setdefault((k[0], k[1]), v)
    for k, v in term.items(): by_id.setdefault((k[1], k[2]), v)

    def find(apt, ident, reg, sec, sub):
        ident = ident.strip()
        if not ident: return None
        if sec == 'P':
            p = term.get((apt, 'P' + sub, ident))
            if p: return p
            if sub == 'A': return fixes.get(('PA', ident, ''))
            return by_id.get(('P' + sub, ident))   # another airport's terminal fix
        key = ('D' if sub == ' ' else 'DB') if sec == 'D' else sec + sub
        p = fixes.get((key, ident, reg))
        if p: return p
        return by_id.get((key, ident))

    procs = {}   # apt -> kind -> name -> {...}
    for l in lines:
        if l[4] != 'P' or l[12] not in 'DEF' or l[38] not in '01': continue
        apt, kind, ident, rt, trans = col(l, 7, 10).strip(), l[12], col(l, 14, 19).strip(), l[19], col(l, 21, 25).strip()
        if kind == 'D' and rt == '0': continue   # engine-out departures
        pt = col(l, 48, 49)
        if pt not in LEG: continue
        p = find(apt, col(l, 30, 34), col(l, 35, 36), l[36], l[37])
        mv = magvar.get(apt, 0.0)
        crs_s = col(l, 71, 74)
        crs = num(crs_s[:3] if crs_s.endswith('T') else crs_s, 1 if crs_s.endswith('T') else 10)
        if crs and not crs_s.endswith('T'): crs = (crs + mv) % 360
        dist = num(col(l, 75, 78), 10) if l[74] != 'T' else 0
        turn = {'L': 1, 'R': 2}.get(l[43], 0)
        c = None
        if pt == 'RF':
            c = find(apt, col(l, 107, 111), col(l, 113, 114), l[114], l[115])
        a1, a2 = alt(col(l, 85, 89)), alt(col(l, 90, 94))
        leg = [LEG[pt], col(l, 30, 34).strip(), round(p[0], 6) if p else 0, round(p[1], 6) if p else 0,
               round(a1 * 0.3048), round(crs, 1), round(dist, 2), turn,
               round(c[0], 6) if c else None, round(c[1], 6) if c else None,
               l[82].strip(), round(a2 * 0.3048), int(num(col(l, 100, 102))), l[42].strip()]
        while leg and leg[-1] in (None, '', 0): leg.pop()
        leg = [x if x is not None else 0 for x in leg]
        A = procs.setdefault(apt, {'D': {}, 'E': {}, 'F': {}})[kind]
        pr = A.setdefault(ident, {'name': ident, 'common': [], 'rw': {}, 'en': {}, 'type': rt})
        if kind == 'F':
            if rt == 'A': pr['en'].setdefault(trans, []).append(leg)
            elif rt != 'Z':
                if pr.get('missed'): continue
                pr['type'] = rt; pr['common'].append(leg)
                if l[42] == 'M': pr['missed'] = True   # the legs after the missed approach point aren't flown to land
        else:
            rw_set, com_set, en_set = (SID_RW, SID_COMMON, SID_EN) if kind == 'D' else (STAR_RW, STAR_COMMON, STAR_EN)
            if rt in rw_set: pr['rw'].setdefault(trans, []).append(leg)
            elif rt in com_set: pr['common'].append(leg)
            elif rt in en_set: pr['en'].setdefault(trans, []).append(leg)

    def runways_for(apt, t):
        """'RW08' -> ['08']; 'RW26B' -> every runway 26 (26L, 26R...); 'ALL' -> every runway."""
        t = t.strip(); have = rwys.get(apt, [])
        if t == 'ALL' or not t: return have
        m = re.match(r'^RW(\d{2})([LRCB]?)$', t)
        if not m: return []
        if m.group(2) == 'B': return [r for r in have if r[:2] == m.group(1)] or [m.group(1)]
        return [m.group(1) + m.group(2)]

    out_all = {}
    for apt, K in procs.items():
        res = {'sids': [], 'stars': [], 'apps': []}
        for kind, lst in (('D', 'sids'), ('E', 'stars')):
            for name, pr in K[kind].items():
                rws = []
                for t, legs in pr['rw'].items():
                    for r in runways_for(apt, t): rws.append({'name': t, 'rwy': r, 'legs': legs})
                if not pr['rw'] and pr['common']: pass   # serves every runway
                en = [{'name': t, 'legs': legs} for t, legs in pr['en'].items()]
                if rws or pr['common'] or en: res[lst].append({'name': name, 'kind': 'sid' if kind == 'D' else 'star', 'common': pr['common'], 'runways': rws, 'enroute': en})
        for name, pr in K['F'].items():
            m = re.match(r'^[A-Z](\d{2}[LRC]?)(?:-?([A-Z]))?$', name)
            if not m or not pr['common']: continue   # circling approaches have no runway
            res['apps'].append({'name': name, 'kind': 'app', 'type': APP.get(pr['type'], 10), 'suffix': m.group(2) or '', 'rwy': m.group(1),
                                'common': pr['common'], 'runways': [], 'enroute': [{'name': t, 'legs': legs} for t, legs in pr['en'].items()]})
        if res['sids'] or res['stars'] or res['apps']: out_all[apt] = res

    os.makedirs(out, exist_ok=True)
    groups = {}
    for apt, v in out_all.items(): groups.setdefault(apt[:2], {})[apt] = v
    for g, v in groups.items():
        json.dump(v, open(os.path.join(out, g + '.json'), 'w'), separators=(',', ':'))
    json.dump({'source': 'FAA CIFP (public domain)', 'cycle': cycle(src), 'airports': sorted(out_all)}, open(os.path.join(out, 'index.json'), 'w'), separators=(',', ':'))
    print(f'{len(out_all)} airports with procedures, {len(groups)} files')


def cycle(src):
    m = re.search(r'(\d{6})', os.path.basename(src))
    return m.group(1) if m else ''


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
