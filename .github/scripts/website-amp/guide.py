"""The modding guide for the website, from the app's docs/modding-guide.md.
Usage: guide.py <modding-guide.md> <output folder>   (writes modding.json: title and html)
"""
import html, json, re, sys

src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding="utf-8").read().split("\n")

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    return s

title, parts, i = "Modding guide", [], 0
while i < len(lines):
    l = lines[i]
    if l.startswith("# "): title = l[2:].strip(); i += 1; continue
    if l.startswith("```"):
        j = i + 1
        while j < len(lines) and not lines[j].startswith("```"): j += 1
        parts.append("<pre><code>" + html.escape("\n".join(lines[i + 1:j]), quote=False) + "</code></pre>"); i = j + 1; continue
    m = re.match(r"^(#{2,3})\s+(.*)", l)
    if m: parts.append(f"<h{len(m.group(1))}>{inline(m.group(2))}</h{len(m.group(1))}>"); i += 1; continue
    if l.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            if not re.match(r"^\|\s*-", lines[i]): rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
            i += 1
        t = "<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in rows[0]) + "</tr></thead><tbody>"
        t += "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:]) + "</tbody></table>"
        parts.append(t); continue
    if re.match(r"^\s*- ", l):
        items = []
        while i < len(lines) and (re.match(r"^\s*- ", lines[i]) or (lines[i].startswith("  ") and lines[i].strip() and items)):
            if re.match(r"^\s*- ", lines[i]): items.append(re.sub(r"^\s*- ", "", lines[i]))
            else: items[-1] += " " + lines[i].strip()
            i += 1
        parts.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>"); continue
    if l.strip():
        p = [l.strip()]; i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#|\||```|\s*- )", lines[i]): p.append(lines[i].strip()); i += 1
        parts.append("<p>" + inline(" ".join(p)) + "</p>"); continue
    i += 1

with open(f"{out}/modding.json", "w", encoding="utf-8") as f:
    json.dump({"title": title, "html": "\n".join(parts)}, f, ensure_ascii=False, indent=1)
print(f"modding guide: {len(parts)} blocks")
