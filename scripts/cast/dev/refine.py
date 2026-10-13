# refine.py <char> <master> [c0 r0 c1 r1] [--dry]
# Snaps confident region mismatches to the reference's majority class. Keeps outlines, shading and face.
import sys
import numpy as np
from PIL import Image
char, path = sys.argv[1], sys.argv[2]
box = list(map(int, sys.argv[3:7])) if len(sys.argv) > 6 and not sys.argv[3].startswith('--') else [0, 0, 80, 96]
dry = '--dry' in sys.argv
REF = {'him': (599.74, -4.26), 'her': (1266.2, -68.29)}
P = 7.23
FACE = {'him': (41, 22, 54, 32), 'her': (30, 26, 50, 44)}
img = np.asarray(Image.open(str(__import__('pathlib').Path(__file__).resolve().parents[3] / 'reference/duo-stage.webp')).convert('RGB')).astype(float)
r_, g_, b_ = img[..., 0], img[..., 1], img[..., 2]
lum = 0.299 * r_ + 0.587 * g_ + 0.114 * b_
cls = np.full(lum.shape, 'W')
cls[lum < 115] = 'K'
cls[(lum > 225) & (r_ - b_ >= 6)] = '.'                     # warm cream; white felt is neutral
cls[(b_ > r_ + 30) & (b_ > g_ + 20)] = 'B'                  # cobalt by hue, so lit bead tops stay cobalt
cls[(g_ > 150) & (r_ > 120) & (b_ < 110) & (g_ > b_ + 80)] = 'L'
lines = open(path).read().split('\n')
head = [l for l in lines if l.startswith('#')]
rows = [list(l) for l in lines if l and not l.startswith('#')]
coarse = lambda ch: '.' if ch == '.' else 'K' if ch in 'KkO' else 'B' if ch in 'Bbc' else 'L' if ch in 'Ll' else 'W'
ox, oy = REF[char]
fx0, fy0, fx1, fy1 = FACE[char]
changes = []
for r in range(box[1], box[3]):
    for c in range(box[0], box[2]):
        x0, x1 = int(ox + (c + 0.2) * P), int(ox + (c + 0.8) * P)
        y0, y1 = int(oy + (r + 0.2) * P), int(oy + (r + 0.8) * P)
        if y0 < 0 or x0 < 0 or y1 > img.shape[0] or x1 > img.shape[1]:
            continue
        patch = cls[y0:y1, x0:x1].ravel()
        vals, counts = np.unique(patch, return_counts=True)
        k = vals[counts.argmax()]; conf = counts.max() / patch.size
        mine = rows[r][c]
        if conf < float(__import__('os').environ.get('CONF', '0.65')) or coarse(mine) == k or mine in 'OLl':
            continue
        if fx0 <= c <= fx1 and fy0 <= r <= fy1 and k == 'K' and coarse(mine) == 'W':
            continue                      # facial features are ink, not beads
        nb4 = [rows[r + dy][c + dx] if 0 <= r + dy < 96 and 0 <= c + dx < 80 else '.' for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))]
        if k == '.' and '.' not in nb4:
            continue                      # lit white felt reads as background: only trim at the silhouette edge
        if mine == '.' and all(n == '.' for n in nb4):
            continue                      # only grow the silhouette from its edge
        if char == 'him':
            if mine == '.' and k == 'W': continue                     # anti-aliased dark edges read neutral
            if r >= 86 or (c >= 55 and 44 <= r <= 60): continue      # hand-drawn shoes and hand
            if coarse(mine) == 'K' and k == 'W' and not (21 <= r <= 29 and 41 <= c <= 53): continue
            if mine == '.' and k == 'B' and r > 62: continue          # the stage disc
        new = {'.': '.', 'B': 'B', 'L': 'L', 'W': 'W', 'K': 'K'}[k]
        if k == 'K':
            nb = [rows[r + dy][c + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= r + dy < 96 and 0 <= c + dx < 80]
            if any(n in 'Ww' for n in nb):
                new = 'O'
        changes.append((r, c, mine, new, round(conf, 2)))
        if not dry:
            rows[r][c] = new
print(len(changes), 'changes')
for ch in changes[:400] if dry else []:
    print(ch)
if not dry:
    open(path, 'w').write('\n'.join(head + [''.join(x) for x in rows]) + '\n')
