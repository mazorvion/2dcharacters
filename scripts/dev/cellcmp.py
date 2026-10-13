# Dev only: reference vs 2D sprite over the SAME block range (uses the fitted lattice), with grid labels.
# Usage: python scripts/dev/cellcmp.py name c0 r0 c1 r1 out.png
import json, sys
from PIL import Image, ImageDraw
name, c0, r0, c1, r1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
L = json.load(open(f'.shots/lattice-{name}.json')); X, Y, p = L['x'], L['y'], L['p']
ref = Image.open(L['image']).convert('RGB')
H = 640
a = ref.crop((int(X[r0][c0]), int(Y[r0][c0]), int(X[r1][c1] + p), int(Y[r1][c1] + p)))
a = a.resize((int(a.width * H / a.height), H), Image.LANCZOS)
b = Image.open(f'.shots/sprite2d-{name}.png').crop((c0 * 24, r0 * 24, (c1 + 1) * 24, (r1 + 1) * 24))
b = b.resize((int(b.width * H / b.height), H), Image.NEAREST)
o = Image.new('RGB', (a.width + b.width + 30, H + 20), 'white'); o.paste(a, (0, 20)); o.paste(b, (a.width + 30, 20))
d = ImageDraw.Draw(o); cw = b.width / (c1 - c0 + 1)
for k, c in enumerate(range(c0, c1 + 1)):
    d.text((a.width + 30 + k * cw + 2, 4), str(c), fill=(200, 0, 0))
o.save(out)
