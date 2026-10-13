# trace.py <char> <name> x0 y0 x1 y1 [thr]: traces dark ink inside a stage-px window → SVG path in canvas bead units.
import sys
import numpy as np
from PIL import Image
from skimage import measure
from skimage.filters import gaussian
REF = {'him': (599.74, -4.26), 'her': (1266.2, -68.29)}
P = 7.23
char, name = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
thr = float(sys.argv[7]) if len(sys.argv) > 7 else 110
img = np.asarray(Image.open(str(__import__('pathlib').Path(__file__).resolve().parents[3] / 'reference/duo-stage.webp')).convert('L')).astype(float)
up = 4
win = img[y0:y1, x0:x1]
big = np.asarray(Image.fromarray(win.astype(np.uint8)).resize((win.shape[1] * up, win.shape[0] * up), Image.BICUBIC)).astype(float)
big = gaussian(big, 1.2, preserve_range=True)
contours = measure.find_contours(big, thr)
ox, oy = REF[char]
out = []
for cnt in contours:
    if len(cnt) < 12: continue
    # closed contours only, skip ones touching the window edge
    if not np.allclose(cnt[0], cnt[-1]): continue
    approx = measure.approximate_polygon(cnt, tolerance=1.2)
    pts = [((x0 + c / up - ox) / P, (y0 + r / up - oy) / P) for r, c in approx]
    area = 0.5 * abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1])))
    if area < 0.15: continue
    d = 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + ' Z'
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    out.append((area, d, (min(xs), min(ys), max(xs), max(ys))))
for area, d, bb in sorted(out, key=lambda t: -t[0]):
    print(f'// {name}: area {area:.2f} bbox {bb[0]:.2f},{bb[1]:.2f} – {bb[2]:.2f},{bb[3]:.2f}')
    print(d)
