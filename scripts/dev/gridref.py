# Dev only: reference crop with the fitted block lattice and row/col numbers (sprite coords), for
# drawing blocks by hand. Usage: python scripts/dev/gridref.py him c0 r0 c1 r1 out.png
import json, sys
from PIL import Image, ImageDraw
name, c0, r0, c1, r1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
L = json.load(open(f'.shots/lattice-{name}.json'))
X, Y, p = L['x'], L['y'], L['p']
img = Image.open(L['image']).convert('RGB')
x0, y0 = X[r0][c0] - p * 1.5, Y[r0][c0] - p * 1.5
x1, y1 = X[r1][c1] + p * 1.2, Y[r1][c1] + p * 1.2
S = 9
im = img.crop((int(x0), int(y0), int(x1), int(y1))).resize((int((x1 - x0) * S), int((y1 - y0) * S)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for r in range(r0, r1 + 1):
    for c in range(c0, c1 + 1):
        x, y = (X[r][c] - int(x0)) * S, (Y[r][c] - int(y0)) * S
        d.rectangle([x, y, x + p * S, y + p * S], outline=(255, 0, 0))
for c in range(c0, c1 + 1):
    d.text(((X[r0][c] - int(x0)) * S + 4, 2), str(c), fill=(200, 0, 0))
for r in range(r0, r1 + 1):
    d.text((2, (Y[r][c0] - int(y0)) * S + p * S / 2 - 5), str(r), fill=(200, 0, 0))
im.save(out)
print(im.size)
