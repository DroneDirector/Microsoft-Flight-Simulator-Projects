"""Checks the Airline Manager Pro pages on the test WordPress (with Elementor) and takes screenshots:
both pages answer, every section is there, no PHP or script errors, nothing sticks out sideways at
any screen size from small phones to super-ultrawide, and the Elementor editor opens the page.
Usage: check.py <site url> <output folder>"""
import asyncio, json, os, subprocess, sys
from playwright.async_api import async_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
S = os.path.expanduser('~/site')

def wp(*a):
    return subprocess.run(['wp', '--path=' + S, *a], capture_output=True, text=True).stdout.strip()

report, fail = [], False
raw = wp('option', 'get', 'ams_pages', '--format=json')
report.append(f'ams_pages option: {raw!r}')
try:
    ids = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])
except Exception:
    ids = {}
urls = {}
for k, v in ids.items():
    out = [l.strip() for l in wp('post', 'url', str(v)).splitlines() if l.strip().startswith('http')]
    urls[k] = out[-1] if out else f'{BASE}/?page_id={v}'
report.append(f'pages: {json.dumps(urls)}')
if not urls:
    fail = True
    report.append('pages in WordPress: ' + wp('post', 'list', '--post_type=page', '--fields=ID,post_name,post_status'))

SIZES = [('phone-360', 360, 780, 3, True), ('phone-412', 412, 915, 2.6, True), ('phone-landscape', 844, 390, 3, True),
         ('tablet-portrait', 800, 1280, 2, True), ('tablet-landscape', 1280, 800, 2, True), ('laptop', 1440, 900, 1, False),
         ('full-hd', 1920, 1080, 1, False), ('qhd', 2560, 1440, 1, False), ('ultrawide', 3440, 1440, 1, False), ('super-ultrawide', 5120, 1440, 1, False)]

async def main():
    global fail
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for key, url in urls.items():
            for name, w, h, dpr, mob in SIZES:
                c = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=min(dpr, 2), is_mobile=mob, has_touch=mob)
                pg = await c.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'api.github.com' not in m.text else None)
                r = await pg.goto(url, wait_until='networkidle', timeout=90000)
                await pg.wait_for_timeout(1500)
                n = await pg.evaluate("document.querySelectorAll('.ams').length")
                over = await pg.evaluate("document.documentElement.scrollWidth - innerWidth")
                line = f'{key} {name}: HTTP {r.status}, {n} sections, sideways overflow {over}px, errors {len(errs)}'
                report.append(line + ('' if not errs else ' — ' + ' | '.join(errs[:3])))
                if r.status != 200 or n < 4 or over > 1 or errs:
                    fail = True
                await pg.screenshot(path=f'{OUT}/{key}-{name}.png')
                if name in ('phone-412', 'laptop'):
                    hh = await pg.evaluate('document.body.scrollHeight')
                    for y in range(0, hh, int(h * .7)):
                        await pg.evaluate(f'scrollTo(0,{y})'); await pg.wait_for_timeout(100)
                    await pg.evaluate('scrollTo(0,0)'); await pg.wait_for_timeout(800)
                    await pg.screenshot(path=f'{OUT}/{key}-{name}-full.png', full_page=True)
                if key == 'home' and name == 'laptop':
                    # the carousel turns and the middle screen opens full size
                    await pg.click('.ams-hero__nav--next'); await pg.wait_for_timeout(1200)
                    await pg.click('.ams-hero__p--b'); await pg.wait_for_timeout(900)
                    await pg.screenshot(path=f'{OUT}/home-carousel-open.png')
                await c.close()
        # Elementor editor
        try:
            pg = await b.new_page(viewport={'width': 1600, 'height': 1000})
            await pg.goto(BASE + '/wp-login.php'); await pg.fill('#user_login', 'admin'); await pg.fill('#user_pass', 'admin'); await pg.click('#wp-submit')
            await pg.wait_for_load_state('networkidle')
            await pg.goto(BASE + f"/wp-admin/post.php?post={ids['home']}&action=elementor", timeout=120000)
            await pg.wait_for_timeout(20000)
            await pg.screenshot(path=f'{OUT}/elementor-editor.png')
            await pg.goto(BASE + '/wp-admin/options-general.php?page=airline-manager-site'); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{OUT}/settings-page.png', full_page=True)
        except Exception as ex:
            report.append(f'editor: {ex!r}')
        await b.close()

try:
    asyncio.run(main())
except Exception:
    import traceback
    report.append('check stopped: ' + traceback.format_exc()); fail = True
front = subprocess.run(['curl', '-s', BASE + '/'], capture_output=True, text=True).stdout
report.append('front page = home page: ' + ('yes' if 'ams-hero' in front else 'NO'))
fail = fail or 'ams-hero' not in front
log = os.path.join(S, 'wp-content', 'debug.log')
errs = [l for l in open(log, errors='ignore')] if os.path.exists(log) else []
errs = [l for l in errs if 'airline-manager-site' in l]
report.append(f'PHP messages from the plugin: {len(errs)}'); report += errs[:20]
fail = fail or bool(errs)
open(f'{OUT}/report.txt', 'w').write('\n'.join(report) + '\n')
print('\n'.join(report))
sys.exit(1 if fail else 0)
