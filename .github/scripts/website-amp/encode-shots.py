"""Turns the app screenshots (.png) into the website's pictures: 1600 px and 800 px wide JPEGs.
Usage: encode-shots.py <folder with .png files> <plugin assets/img folder>"""
import os, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
n = 0
for f in sorted(os.listdir(src)):
    if not f.endswith('.png'):
        continue
    name = f[:-4]
    im = Image.open(os.path.join(src, f)).convert('RGB')
    im.resize((1600, 900), Image.LANCZOS).save(os.path.join(dst, f'shot-{name}.jpg'), quality=80, optimize=True, progressive=True)
    im.resize((800, 450), Image.LANCZOS).save(os.path.join(dst, f'shot-{name}-800.jpg'), quality=78, optimize=True, progressive=True)
    n += 1
print(f'{n} pictures updated')
