# Side-by-side sheets of the terrain pictures: one sheet per place and look, the settings in a grid with labels.
import sys, os
from PIL import Image, ImageDraw, ImageFont
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
CF = [('before', 'Before (0.9.112)'), ('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('veryhigh', 'Very high'), ('ultra', 'Ultra (PC)')]
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
except Exception: font = ImageFont.load_default()
for look in ('map', 'sat'):
    for view in ('cliffs', 'valley', 'coast'):
        ims = [(lab, os.path.join(src, f'{look}-{view}-{k}.png')) for k, lab in CF]
        ims = [(lab, Image.open(f)) for lab, f in ims if os.path.exists(f)]
        if not ims: continue
        w, h = ims[0][1].size
        sheet = Image.new('RGB', (w * 2, h * 3), (8, 14, 24))
        for i, (lab, im) in enumerate(ims):
            x, y = (i % 2) * w, (i // 2) * h
            sheet.paste(im.convert('RGB'), (x, y))
            d = ImageDraw.Draw(sheet); d.rectangle([x + 16, y + 16, x + 16 + d.textlength(lab, font=font) + 24, y + 66], fill=(8, 14, 24))
            d.text((x + 28, y + 24), lab, fill=(120, 220, 240), font=font)
        sheet.thumbnail((2400, 2400))
        sheet.save(os.path.join(dst, f'terrain-{look}-{view}.jpg'), quality=90)
        print('sheet', look, view)
