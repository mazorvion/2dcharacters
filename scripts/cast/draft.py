# ONE-TIME helper (CHARACTERS.md §11 P0): reference render → draft bead grids, used only as an underlay.
#   python3 -I scripts/cast/draft.py   → src/cast/art/<char>/_draft/full.txt + .shots/cast/draft-<char>.png
# Never run this over finished art: drafts land in _draft/ and are copied into the real files by hand.
#
# The renders are not a true lattice (his beads are ~6.6 px, hers ~7.5 px). One bead size for the world
# (CHARACTERS.md D4): both are resampled at PITCH, which gives him 82 rows and her 71 (the image's height ratio).
# Each cell is classified by colour coverage, not its centre, so thin outlines survive the resampling.
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
IMAGE = ROOT / 'reference/duo-stage.webp'
CANVAS_W, CANVAS_H, BASELINE = 80, 96, 93
PITCH = 7.23

# box: figure bounds in reference px. clear: prop rectangles (x0, y0, x1, y1[, classes it clears]).
# keep: rectangles exempt from clear (her hand over the easel board).
CHARS = {
    'him': dict(box=(684, 80, 1100, 680),
                clear=[(985, 520, 1100, 680, 'BWwgL'), (830, 640, 1100, 680, 'B')],
                keep=[]),
    'her': dict(box=(1338, 98, 1790, 618),
                clear=[(1338, 380, 1405, 618), (1618, 130, 1790, 618, 'BWwg'), (1338, 600, 1790, 618, 'B')],
                keep=[(1690, 205, 1790, 300)]),
}

CLASSES = '.KBWLwg'


def pixel_classes(img):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    cls = np.full(lum.shape, 'W', dtype='<U1')
    cls[lum < 214] = 'w'
    cls[lum < 175] = 'g'
    cls[lum < 115] = 'K'
    cls[(lum > 236) & (r - b > 3)] = '.'
    cls[(b > r + 38) & (b > g + 26)] = 'B'
    cls[(g > 150) & (r > 120) & (b < 110) & (g > b + 80)] = 'L'
    cls[(r > 180) & (g < 185) & (b > 120) & (r > g + 35)] = 'W'      # tongue → skin (faces are ink)
    return cls, lum


def cell_class(cls, lum, x, y, p):
    m = p * 0.1
    patch = cls[int(y + m):int(y + p - m) + 1, int(x + m):int(x + p - m) + 1].ravel()
    if patch.size == 0:
        return '.'
    f = {c: float((patch == c).mean()) for c in CLASSES}
    if f['L'] >= 0.3:
        return 'L'
    if f['K'] >= 0.3:
        return 'K'
    if f['B'] >= 0.35:
        lp = lum[int(y + m):int(y + p - m) + 1, int(x + m):int(x + p - m) + 1].ravel()[patch == 'B']
        return 'b' if np.median(lp) < 40 else 'B'
    if f['.'] >= 0.5:
        return '.'
    light = {c: f[c] for c in 'Wwg'}
    return max(light, key=light.get) if sum(light.values()) > 0.2 else '.'


def draft(img, name):
    cfg = CHARS[name]
    cls, lum = pixel_classes(img)
    x0b, y0b, x1b, y1b = cfg['box']
    p = PITCH
    # phase: the offset whose cells are purest (least mixed classes), over the figure
    best = None
    for ox in np.arange(0, p, 0.5):
        for oy in np.arange(0, p, 0.5):
            score = 0
            for y in np.arange(y0b + oy, y1b - p, p * 3):
                for x in np.arange(x0b + ox, x1b - p, p * 3):
                    patch = cls[int(y + 1):int(y + p - 1), int(x + 1):int(x + p - 1)].ravel()
                    if patch.size and (patch != '.').mean() > 0.3:
                        _, counts = np.unique(patch, return_counts=True)
                        score += counts.max() / patch.size
            if best is None or score > best[0]:
                best = (score, ox, oy)
    _, ox, oy = best
    cols, rows = int((x1b - x0b - ox) / p), int((y1b - y0b - oy) / p)
    cells = {}
    for j in range(rows):
        for i in range(cols):
            x, y = x0b + ox + i * p, y0b + oy + j * p
            cx, cy = x + p / 2, y + p / 2
            ch = cell_class(cls, lum, x, y, p)
            inkeep = any(r[0] <= cx < r[2] and r[1] <= cy < r[3] for r in cfg['keep'])
            if not inkeep and any(r[0] <= cx < r[2] and r[1] <= cy < r[3] and (len(r) < 5 or ch in r[4])
                                  for r in cfg['clear']):
                ch = '.'
            cells[(i, j)] = ch
    # flood the background in from the box edge through '.' and warm light cells (lit floor, board);
    # light cells the flood never reaches are enclosed by outlines: they are white felt.
    def warm(i, j):
        x, y = x0b + ox + i * p, y0b + oy + j * p
        c = img[int(y + 1):int(y + p - 1), int(x + 1):int(x + p - 1)].reshape(-1, 3).mean(0)
        return c[0] - c[2] >= 6 and c.mean() > 205
    seen, stack = set(), [(i, j) for i in range(cols) for j in (0, rows - 1)] + \
        [(i, j) for j in range(rows) for i in (0, cols - 1)]
    while stack:
        k = stack.pop()
        if k in seen or k not in cells:
            continue
        v = cells[k]
        if not (v == '.' or (v in 'Wwg' and warm(*k))):
            continue
        seen.add(k)
        cells[k] = '.'
        i, j = k
        stack += [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)]
    for k, v in cells.items():
        if v == '.' and k not in seen:
            cells[k] = 'W'
    fig = [k for k, v in cells.items() if v != '.']
    fi = [k[0] for k in fig]; fj = [k[1] for k in fig]
    di, dj = 40 - (min(fi) + max(fi)) // 2, BASELINE - max(fj)
    grid = [['.'] * CANVAS_W for _ in range(CANVAS_H)]
    for (i, j), v in cells.items():
        c, r = i + di, j + dj
        if v != '.' and 0 <= c < CANVAS_W and 0 <= r < CANVAS_H:
            grid[r][c] = v
    # reference px of canvas cell (0,0)'s top-left corner
    cell0 = (x0b + ox - di * p, y0b + oy - dj * p)
    return [''.join(r) for r in grid], cell0, (max(fj) - min(fj) + 1, max(fi) - min(fi) + 1)


COL = {'K': (50, 44, 45), 'k': (31, 26, 27), 'O': (50, 44, 45), 'W': (239, 238, 236), 'w': (217, 214, 211),
       'g': (189, 185, 182), 'B': (6, 50, 234), 'b': (11, 31, 158), 'c': (58, 92, 240), 'L': (203, 238, 50),
       'l': (163, 194, 28), '.': (246, 244, 239)}


def preview(rows, path, s=8):
    im = Image.new('RGB', (CANVAS_W * s, CANVAS_H * s), COL['.'])
    px = im.load()
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch != '.':
                for y in range(s - 1):
                    for x in range(s - 1):
                        px[c * s + x, r * s + y] = COL[ch]
    im.save(path)


def main():
    img = np.asarray(Image.open(IMAGE).convert('RGB')).astype(float)
    out = ROOT / '.shots/cast'; out.mkdir(parents=True, exist_ok=True)
    for name in CHARS:
        rows, cell0, (h, w) = draft(img, name)
        d = ROOT / f'src/cast/art/{name}/_draft'; d.mkdir(parents=True, exist_ok=True)
        (d / 'full.txt').write_text(f'# draft of {name} from {IMAGE.name}; underlay only\n' + '\n'.join(rows) + '\n')
        preview(rows, out / f'draft-{name}.png')
        print(f"{name}: {h} rows x {w} cols; ref: {{ beadPx: {PITCH}, cell0: [{cell0[0]:.2f}, {cell0[1]:.2f}] }}")


if __name__ == '__main__':
    main()
