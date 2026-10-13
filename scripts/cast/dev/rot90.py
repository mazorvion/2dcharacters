# rot90.py <char> <part> <from> <to> <cx> <cy> <keep_rows_upto> [cw]
# A new arm drawing by turning an existing one exactly 90° about (cx, cy) (canvas beads): every bead stays
# whole, so the pixel art is unchanged. Rows <= keep_rows_upto (the cuff) stay where they are.
import sys
from pathlib import Path
char, part, src, dst = sys.argv[1:5]
cx, cy, keep = float(sys.argv[5]), float(sys.argv[6]), int(sys.argv[7])
cw = len(sys.argv) > 8 and sys.argv[8] == 'cw'
d = Path(__file__).resolve().parents[3] / f'src/cast/art/{char}'
g = [l for l in (d / f'{part}.{src}.txt').read_text().split('\n') if l and not l.startswith('#')]
out = [['.'] * 80 for _ in range(96)]
for r in range(96):
    for c in range(80):
        ch = g[r][c]
        if ch == '.': continue
        if r <= keep: out[r][c] = ch; continue
        dx, dy = c + 0.5 - cx, r + 0.5 - cy
        nx, ny = (-dy, dx) if cw else (dy, -dx)
        rr, cc = int(round(cy + ny - 0.5)), int(round(cx + nx - 0.5))
        if 0 <= rr < 96 and 0 <= cc < 80 and out[rr][cc] == '.': out[rr][cc] = ch
(d / f'{part}.{dst}.txt').write_text(f'# part: {part}\n# drawing: {dst}\n# made from {part}.{src} turned 90° (rot90.py)\n' + '\n'.join(''.join(x) for x in out) + '\n')
print('wrote', part, dst)
