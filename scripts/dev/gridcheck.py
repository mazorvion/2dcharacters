# Dev only: overlay a fitted block grid on a reference render to check alignment.
import sys
from PIL import Image, ImageDraw
f, p, px, py, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
box = tuple(int(v) for v in sys.argv[6].split(',')) if len(sys.argv) > 6 else None
im = Image.open(f).convert('RGB')
if box: im = im.crop(box); px -= box[0]; py -= box[1]
W, H = im.size
s = 4
big = im.resize((W * s, H * s), Image.NEAREST); d = ImageDraw.Draw(big)
x = px % p
while x < W: d.line([(x * s, 0), (x * s, H * s)], fill=(255, 0, 0)); x += p
y = py % p
while y < H: d.line([(0, y * s), (W * s, y * s)], fill=(255, 0, 0)); y += p
big.save(out)
