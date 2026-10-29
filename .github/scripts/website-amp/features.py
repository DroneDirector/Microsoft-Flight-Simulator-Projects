"""Feature list for the website, taken from the app's docs/FEATURES.md.

Only features that are in the app now ("Built") are listed. A note after "Built", such as
"(setting)" or "(Android)", becomes a small label next to the feature; "(demo)" notes are left out.
Usage: features.py <FEATURES.md> <output folder>
"""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
groups, cur = [], None
SKIP_NOTES = {"demo", "demo list", "demo payroll", "foundation"}

def clean(s):
    s = s.strip()
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    return s

for line in open(src, encoding="utf-8"):
    line = line.rstrip("\n")
    m = re.match(r"^##\s+(.*)", line)
    if m:
        cur = {"title": m.group(1).strip(), "items": []}
        groups.append(cur)
        continue
    if cur is None or not line.startswith("|") or re.match(r"^\|\s*-", line):
        continue
    cells = [c.strip() for c in line.strip("|").split("|")]
    if len(cells) < 2 or cells[1].lower() in ("status",):
        continue
    feat, status = cells[0], cells[1]
    if not status.lower().startswith("built"):
        continue
    # notes for developers, not for players
    if re.search(r"app\.config\.json|Interface written so it runs unchanged", feat):
        continue
    note = ""
    n = re.match(r"built\s*\(([^)]*)\)", status, re.I)
    if n and n.group(1).strip().lower() not in SKIP_NOTES:
        note = n.group(1).strip().capitalize()
    cur["items"].append({"t": clean(feat), "n": note})

groups = [g for g in groups if g["items"]]
with open(f"{out}/features.json", "w", encoding="utf-8") as f:
    json.dump(groups, f, ensure_ascii=False, indent=1)
print(f"{sum(len(g['items']) for g in groups)} features in {len(groups)} groups")
