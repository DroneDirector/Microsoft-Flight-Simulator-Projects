"""World airport data for the app, from OurAirports (public domain: https://ourairports.com/data/).

Writes two compact files into assets/:
  airports-world.json  every open airport and seaplane base (no heliports or balloon ports):
                       [ident, name, city, country code, lat, lon, elevation ft, size, IATA, scheduled]
                       size: 0 small, 1 medium, 2 large, 3 seaplane base
  runways-world.json   { ident: [[ident 1, ident 2, length ft, width ft, surface, lat 1, lon 1, lat 2, lon 2, heading 1], ...] }
plus the country names. When the app is linked to the simulator, the simulator's own airport list is used
on top of this, so the app has exactly the airports the simulator has.

Usage: python3 build.py <folder with airports.csv, runways.csv, countries.csv> <assets folder>
"""
import csv, json, sys, os

src, out = sys.argv[1], sys.argv[2]
SIZE = {'small_airport': 0, 'medium_airport': 1, 'large_airport': 2, 'seaplane_base': 3}
countries = {r['code']: r['name'] for r in csv.DictReader(open(os.path.join(src, 'countries.csv'), encoding='utf-8'))}
rows, ids = [], set()

def f(v, d=5):
    try: return round(float(v), d)
    except: return None

for r in csv.DictReader(open(os.path.join(src, 'airports.csv'), encoding='utf-8')):
    if r['type'] not in SIZE: continue
    ident = r['ident'].strip().upper()
    if not ident or ident in ids: continue
    lat, lon = f(r['latitude_deg']), f(r['longitude_deg'])
    if lat is None or lon is None: continue
    ids.add(ident)
    try: elev = int(float(r['elevation_ft'])) if r['elevation_ft'] else 0
    except: elev = 0
    rows.append([ident, r['name'].strip(), r['municipality'].strip(), r['iso_country'], lat, lon, elev, SIZE[r['type']], r['iata_code'].strip(), 1 if r['scheduled_service'] == 'yes' else 0])

rw = {}
for r in csv.DictReader(open(os.path.join(src, 'runways.csv'), encoding='utf-8')):
    ident = r['airport_ident'].strip().upper()
    if ident not in ids or r['closed'] == '1': continue
    try: length = int(float(r['length_ft'] or 0)); width = int(float(r['width_ft'] or 0))
    except: length, width = 0, 0
    rw.setdefault(ident, []).append([r['le_ident'], r['he_ident'], length, width, r['surface'][:12],
        f(r['le_latitude_deg'], 6), f(r['le_longitude_deg'], 6), f(r['he_latitude_deg'], 6), f(r['he_longitude_deg'], 6), f(r['le_heading_degT'], 1)])

used = {r[3] for r in rows}
json.dump({'source': 'OurAirports (public domain)', 'countries': {k: v for k, v in countries.items() if k in used}, 'airports': rows},
          open(os.path.join(out, 'airports-world.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(rw, open(os.path.join(out, 'runways-world.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(rows)} airports, {sum(len(v) for v in rw.values())} runways')
