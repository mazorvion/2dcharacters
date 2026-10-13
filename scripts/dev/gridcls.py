# Dev only: reference crop with the fitted lattice + the extracted class letter on every block.
# Usage: python scripts/dev/gridcls.py name c0 r0 c1 r1 out.png
import json, sys
from PIL import Image, ImageDraw
name, c0, r0, c1, r1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
L = json.load(open(f'.shots/lattice-{name}.json')); X, Y, p = L['x'], L['y'], L['p']
s = open('src/characters/sprites.gen.ts', encoding='utf8').read(); rows = json.loads(s[s.index('{'):s.rindex('}') + 1])[name]['rows']
img = Image.open(L['image']).convert('RGB')
x0, y0 = X[r0][c0] - p, Y[r0][c0] - p
x1, y1 = X[r1][c1] + 2 * p, Y[r1][c1] + 2 * p
S = 10
im = img.crop((int(x0), int(y0), int(x1), int(y1))).resize((int((x1 - x0) * S), int((y1 - y0) * S)), Image.LANCZOS)
d = ImageDraw.Draw(im)
col = {'K': (255, 60, 60), 'W': (0, 160, 0), 'B': (255, 160, 0), 'L': (160, 0, 160), 'M': (0, 120, 255), '.': (150, 150, 150)}
for r in range(r0, r1 + 1):
    for c in range(c0, c1 + 1):
        x, y = (X[r][c] - int(x0)) * S, (Y[r][c] - int(y0)) * S
        d.rectangle([x, y, x + p * S, y + p * S], outline=(255, 0, 0))
        ch = rows[r][c]
        d.text((x + p * S / 2 - 3, y + p * S / 2 - 6), ch, fill=col.get(ch, (0, 0, 0)))
for c in range(c0, c1 + 1):
    d.text(((X[r0][c] - int(x0)) * S + p * S / 2 - 6, 2), str(c), fill=(0, 0, 255))
for r in range(r0, r1 + 1):
    d.text((2, (Y[r][c0] - int(y0)) * S + p * S / 2 - 6), str(r), fill=(0, 0, 255))
im.save(out)
