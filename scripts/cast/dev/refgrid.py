# refgrid.py <char> <gridfile> c0 r0 c1 r1 out.png [scale]
import sys
from PIL import Image, ImageDraw, ImageFont
char, gridfile, c0, r0, c1, r1, out = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7]), sys.argv[7]
s = int(sys.argv[8]) if len(sys.argv) > 8 else 16
REF = {'him': (599.74, -4.26), 'her': (1266.2, -68.29)}
P = 7.23
ox, oy = REF[char]
ref = Image.open(str(__import__('pathlib').Path(__file__).resolve().parents[3] / 'reference/duo-stage.webp')).convert('RGB')
W, H = (c1 - c0) * s, (r1 - r0) * s
crop = ref.crop((round(ox + c0 * P), round(oy + r0 * P), round(ox + c1 * P), round(oy + r1 * P))).resize((W, H), Image.LANCZOS)
rows = [l.rstrip('\n') for l in open(gridfile) if not l.startswith('#')]
COL = {'K': (50, 44, 45), 'k': (25, 20, 21), 'O': (20, 18, 19), 'W': (222, 222, 214), 'w': (190, 186, 180),
       'g': (170, 166, 163), 'B': (6, 50, 234), 'b': (11, 31, 120), 'c': (90, 130, 250), 'L': (203, 238, 50),
       'l': (140, 170, 20), '.': (255, 255, 255)}
g = Image.new('RGB', (W, H), COL['.'])
d = ImageDraw.Draw(g)
for r in range(r0, r1):
    for c in range(c0, c1):
        ch = rows[r][c] if r < len(rows) and c < len(rows[r]) else '.'
        d.rectangle([(c - c0) * s, (r - r0) * s, (c - c0 + 1) * s - 2, (r - r0 + 1) * s - 2], fill=COL.get(ch, (255, 0, 255)))
pad = 30
im = Image.new('RGB', (W * 2 + pad * 3, H + pad * 2), 'white')
im.paste(crop, (pad, pad)); im.paste(g, (W + pad * 2, pad))
d = ImageDraw.Draw(im)
for k, x0 in enumerate((pad, W + pad * 2)):
    for c in range(c0, c1 + 1):
        x = x0 + (c - c0) * s
        d.line([(x, pad), (x, pad + H)], fill=(255, 0, 0) if c % 5 == 0 else (255, 160, 160) if k == 0 else (220, 220, 220), width=1)
        if c % 5 == 0 and c < c1: d.text((x + 2, pad - 14), str(c), fill=(200, 0, 0))
    for r in range(r0, r1 + 1):
        y = pad + (r - r0) * s
        d.line([(x0, y), (x0 + W, y)], fill=(255, 0, 0) if r % 5 == 0 else (255, 160, 160) if k == 0 else (220, 220, 220), width=1)
        if r % 5 == 0 and r < r1: d.text((x0 - 24, y + 2), str(r), fill=(200, 0, 0))
im.save(out)
