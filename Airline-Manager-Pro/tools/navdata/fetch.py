"""Fetch the FAA's current CIFP (published every 28 days) and convert it (cifp.py) into <output folder>.
Used by the app's build; if the FAA can't be reached the app is built without it (flights then use the
simulator's procedures or ones built from the runways and navaids), so this never fails the build.

Usage: python3 fetch.py <output folder>
"""
import sys, os, re, datetime, urllib.request, tempfile, traceback

PAGE = 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/'
BASE = 'https://aeronav.faa.gov/Upload_313-d/cifp/CIFP_{}.zip'
UA = {'User-Agent': 'AirlineManagerPro-build'}


def get(url, timeout=120):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def candidates():
    out = []
    try:
        html = get(PAGE, 30).decode('utf-8', 'replace')
        out += re.findall(r'https?://[^"\'\s]+CIFP_\d{6}\.zip', html)
    except Exception as e:
        print('CIFP page:', e)
    # the 28-day cycles, from one known effective date: the current one and the one before
    ref, today = datetime.date(2026, 10, 29), datetime.date.today()
    n = (today - ref).days // 28
    for k in (n, n - 1, n + 1):
        d = ref + datetime.timedelta(days=28 * k)
        out.append(BASE.format(d.strftime('%y%m%d')))
    return list(dict.fromkeys(out))


def main(out):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import cifp
    for url in candidates():
        try:
            print('Getting', url)
            data = get(url, 300)
            if len(data) < 1_000_000: continue
            tmp = os.path.join(tempfile.mkdtemp(), os.path.basename(url))
            open(tmp, 'wb').write(data)
            cifp.main(tmp, out)
            return
        except Exception as e:
            print('  not available:', e)
    print('The FAA CIFP could not be fetched: building without it')


if __name__ == '__main__':
    try: main(sys.argv[1])
    except Exception: traceback.print_exc(); print('Navigation data skipped')
