"""Every radio navaid in the world (VOR, VOR-DME, VORTAC, TACAN, DME, NDB, NDB-DME), from OurAirports
(public domain: https://ourairports.com/data/), for the departures and arrivals the app builds where no
published ones are known.

Writes navaids-world.json: [[ident, kind, lat, lon, frequency (kHz), airport, magnetic variation], ...]
kind: V VOR, VD VOR-DME, VT VORTAC, T TACAN, D DME, N NDB, ND NDB-DME

Usage: python3 navaids.py <navaids.csv> <assets folder>
"""
import csv, json, sys, os
K = {'VOR': 'V', 'VOR-DME': 'VD', 'VORTAC': 'VT', 'TACAN': 'T', 'DME': 'D', 'NDB': 'N', 'NDB-DME': 'ND'}
rows = []
for r in csv.DictReader(open(sys.argv[1], encoding='utf-8')):
    k = K.get(r['type'])
    if not k: continue
    try: lat, lon = round(float(r['latitude_deg']), 5), round(float(r['longitude_deg']), 5)
    except ValueError: continue
    try: mv = round(float(r['magnetic_variation_deg']), 1)
    except ValueError: mv = None
    try: fr = int(float(r['frequency_khz']))
    except ValueError: fr = 0
    rows.append([r['ident'].strip().upper(), k, lat, lon, fr, (r['associated_airport'] or '').strip().upper()] + ([mv] if mv is not None else []))
json.dump({'source': 'OurAirports (public domain)', 'navaids': rows}, open(os.path.join(sys.argv[2], 'navaids-world.json'), 'w'), separators=(',', ':'))
print(len(rows), 'navaids')
