#!/usr/bin/env python3
"""Real-world prices for the app's markets, fetched once a day by a GitHub workflow and published as
amp-market.json on the amp-market-data branch (the app reads it from there).

- Jet fuel: Kerosene-Type Jet Fuel Prices, U.S. Gulf Coast, daily (US Energy Information Administration,
  public domain), series DJFUELUSGULF via FRED.
- Spare parts: Producer Price Index by Industry, Other Aircraft Parts and Equipment Manufacturing, monthly
  (US Bureau of Labor Statistics, public domain), series PCU336413336413 via FRED.
"""
import csv, io, json, sys, urllib.request, datetime

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

def get(url, timeout=90):
    """Download with a few tries; the error goes to the job's annotations."""
    import time
    last = None
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e; print(f"::warning::{url}: {e}"); time.sleep(5 * (i + 1))
    raise last

def series(sid):
    rows = list(csv.reader(io.StringIO(get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}").decode("utf-8"))))
    out = []
    for row in rows[1:]:
        if len(row) < 2: continue
        try: out.append([row[0], round(float(row[1]), 4)])
        except ValueError: pass   # "." marks a day without a price
    return out

def steo_jet_fuel():
    """The EIA Short-Term Energy Outlook's monthly jet fuel price (JKTCUUS, refiner price to end users,
    cents a gallon), history and forecast, from its public spreadsheet. [] if it can't be read."""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(get("https://www.eia.gov/outlooks/steo/xls/STEO_m.xlsx", 180)), read_only=True, data_only=True)
        months = {m: i + 1 for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}
        for ws in wb.worksheets:
            rows = list(ws.iter_rows(values_only=True))
            hit = [r for r in rows if r and any(str(c).strip() == "JKTCUUS" for c in r[:2] if c is not None)]
            if not hit: continue
            row = hit[0]
            # the header: a row of years and a row of month names above the data
            yrow = mrow = None
            for r in rows[:12]:
                if r and sum(1 for c in r if str(c).strip()[:3] in months) >= 12: mrow = r
                if r and sum(1 for c in r if isinstance(c, (int, float)) and 1990 < c < 2100) >= 2: yrow = r
            if not mrow: continue
            out, year = [], None
            for i, c in enumerate(mrow):
                if yrow and i < len(yrow) and isinstance(yrow[i], (int, float)) and 1990 < yrow[i] < 2100: year = int(yrow[i])
                m = months.get(str(c).strip()[:3])
                if m and year and i < len(row) and isinstance(row[i], (int, float)):
                    out.append([f"{year}-{m:02d}", round(float(row[i]), 2)])
            return out
    except Exception as e:
        print(f"::warning::outlook not read: {e}")
    return []

try:
    fuel = series("DJFUELUSGULF")[-400:]
    parts = series("PCU336413336413")[-60:]
except Exception as e:
    print(f"::error::prices not read: {e!r}"); sys.exit(1)
if len(fuel) < 20 or len(parts) < 12:
    print(f"::error::not enough data: fuel {len(fuel)}, parts {len(parts)}"); sys.exit(1)
data = {
    "updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
    "fuel": {"name": "US Gulf Coast jet fuel spot price", "unit": "$/gal", "source": "U.S. Energy Information Administration (public domain)", "series": fuel},
    "outlook": {"name": "EIA Short-Term Energy Outlook, jet fuel (monthly, cents a gallon)", "source": "U.S. Energy Information Administration (public domain)", "series": steo_jet_fuel()[-36:]},
    "parts": {"name": "US producer price index, aircraft parts and equipment", "unit": "index", "source": "U.S. Bureau of Labor Statistics (public domain)", "series": parts},
}
json.dump(data, open(sys.argv[1] if len(sys.argv) > 1 else "amp-market.json", "w"), separators=(",", ":"))
print("fuel", fuel[-1], "parts", parts[-1])
