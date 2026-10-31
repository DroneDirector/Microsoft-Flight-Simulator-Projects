#!/usr/bin/env python3
"""Real-world prices for the app's markets, fetched once a day by a GitHub workflow and published as
amp-market.json on the amp-market-data branch (the app reads it from there).

- Jet fuel: Kerosene-Type Jet Fuel Prices, U.S. Gulf Coast, daily (US Energy Information Administration,
  public domain), series DJFUELUSGULF via FRED.
- Spare parts: Producer Price Index by Industry, Other Aircraft Parts and Equipment Manufacturing, monthly
  (US Bureau of Labor Statistics, public domain), series PCU336413336413 via FRED.
"""
import csv, io, json, sys, urllib.request, datetime

def series(sid):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}"
    req = urllib.request.Request(url, headers={"User-Agent": "AirlineManagerPro-market/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        rows = list(csv.reader(io.StringIO(r.read().decode("utf-8"))))
    out = []
    for row in rows[1:]:
        if len(row) < 2: continue
        try: out.append([row[0], round(float(row[1]), 4)])
        except ValueError: pass   # "." marks a day without a price
    return out

fuel = series("DJFUELUSGULF")[-400:]
parts = series("PCU336413336413")[-60:]
if len(fuel) < 20 or len(parts) < 12:
    sys.exit("not enough data")
data = {
    "updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
    "fuel": {"name": "US Gulf Coast jet fuel spot price", "unit": "$/gal", "source": "U.S. Energy Information Administration (public domain)", "series": fuel},
    "parts": {"name": "US producer price index, aircraft parts and equipment", "unit": "index", "source": "U.S. Bureau of Labor Statistics (public domain)", "series": parts},
}
json.dump(data, open(sys.argv[1] if len(sys.argv) > 1 else "amp-market.json", "w"), separators=(",", ":"))
print("fuel", fuel[-1], "parts", parts[-1])
