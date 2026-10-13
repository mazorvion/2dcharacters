# Rebuilds the block characters straight from the reference renders, block for block.
#   python -I scripts/extract-cast.py            → writes src/characters/sprites.gen.ts + .shots/cast-*.png previews
#
# For each character: lay the measured block grid over the reference image (pitch + phase were fitted from
# the periodicity of the block grooves), sample the centre of every block, classify it into the felt palette,
# flood-fill the background in from the image edges, and clear props that touch the character (stage,
# easel, The Double). The face is also sampled on a 2× grid so eyes, brows and mouth keep their finer shape.
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

# Everything below is in reference-image pixels, so re-extracting (new pitch, lattice, trim) never breaks
# the rig. parts: first matching rule wins; a rule is (part, x0, y0, x1, y1[, colours it applies to]).
# Anything unmatched is torso. Parts tile the figure exactly, so posed parts never leave gaps at rest.
CHARS = {
    'him': dict(
        image='reference/him-ref.webp', pitch=8.45, phase=(405.97, 230.83),
        crop=(150, 45, 663, 790),
        # props to clear: books, the stage disc around the right shoe
        clear=[(545, 585, 663, 700), (545, 640, 663, 817), (340, 650, 392, 817, 'B'), (532, 640, 663, 817, 'B'),
               (452, 640, 532, 699, 'B'), (512, 688, 548, 714, 'B')],
        face=(405, 128, 540, 246),
        # facial features in small (half-size) blocks; the skin around them stays normal blocks
        # drawn details (smooth shapes, not blocks), traced from the render: (kind, x0, y0, x1, y1)
        details=[('face', 458, 150, 493, 168), ('face', 505, 158, 532, 172),     # brows
                 ('face', 466, 168, 485, 199), ('face', 502, 172, 521, 204),     # eyes
                 ('face', 466, 206, 501, 227),                                   # smile
                 ('lines', 572, 408, 662, 468)],                                 # finger lines
        eye_boxes=[(466, 168, 485, 199), (502, 172, 521, 204)],
        parts=[('head', 0, 0, 663, 238, 'KWLM'),
               ('armR', 521, 335, 663, 480),
               ('armL', 268, 333, 336, 450, 'KW'),
               ('legL', 0, 520, 401, 817), ('legR', 401, 520, 663, 817)],
        joints={'torso': ((401, 520), 'root'), 'head': ((452, 238), 'torso'),
                'armR': ((521, 385), 'torso'), 'armL': ((300, 336), 'torso'),
                'legL': ((370, 520), 'root'), 'legR': ((432, 520), 'root')},
    ),
    'her': dict(
        image='reference/her-ref.png', pitch=7.05, phase=(121.07, 284.6),
        crop=(20, 85, 450, 562),
        # easel frame + board, The Double peeking in at the left, stage at the bottom
        # props are cobalt, so most masks only drop cobalt blocks (her arm and shoes cross them)
        clear=[(300, 110, 450, 180, 'B'), (297, 110, 336, 420, 'B'), (338, 236, 450, 600, 'B'),
               (0, 340, 70, 600), (0, 516, 450, 600, 'B'),
               # easel legs/edging and the carousel arrow button captured in the screenshot
               (372, 380, 450, 600), (336, 380, 372, 512), (400, 280, 450, 340)],
        warm_bg=[(296, 186, 450, 262)],          # her raised forearm crosses the cream board
        face=(163, 96, 266, 200),
        paint=[(12, 19, ['LL', 'LL'])],          # the earring: a clean 2×2 lime block
        details=[('face', 200, 118, 222, 128), ('face', 240, 116, 259, 127),     # brows
                 ('face', 197, 130, 223, 158), ('face', 235, 130, 260, 156),     # eyes with lashes
                 ('face', 211, 160, 242, 185),                                   # open mouth + tongue
                 ('lines', 35, 232, 130, 292), ('lines', 355, 178, 450, 246),    # finger lines
                 ('pleats', 150, 290, 345, 545)],                                # pleats on the pants
        eye_boxes=[(197, 130, 223, 158), (235, 130, 260, 156)],
        parts=[('head', 0, 0, 450, 212, 'KWLM'),
               ('armL', 0, 222, 172, 335),
               ('armR', 302, 150, 450, 335),
               ('legL', 0, 398, 255, 564), ('legR', 255, 398, 450, 564)],
        joints={'torso': ((255, 398), 'root'), 'head': ((232, 212), 'torso'),
                'armL': ((172, 262), 'torso'), 'armR': ((302, 255), 'torso'),
                'legL': ((222, 398), 'root'), 'legR': ((288, 398), 'root')},
    ),
}

PART_CH = {'torso': 't', 'head': 'h', 'armL': 'a', 'armR': 'b', 'legL': 'l', 'legR': 'r'}


def classify(c, strict_bg=False):
    r, g, b = c
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    if b > 120 and b > r + 70 and b > g + 60:
        return 'B'                       # cobalt felt
    if b > 62 and b > r + 38 and b > g + 26:
        return 'B'                       # navy: the dark seams and folds of cobalt felt
    if g > 150 and r > 120 and b < 110 and g > b + 80:
        return 'L'                       # lime
    if r > 180 and g < 185 and b > 120 and r > g + 35:
        return 'M'                       # pink mouth
    # strict_bg: over the cream board, only clearly warm pixels are background (lit white felt is ≥ 247 too)
    if (not strict_bg and (lum >= 247 or (r - b >= 6 and lum > 238))) or (r - b >= 13 and lum > 190):
        return '.'                       # warm cream background / board (white felt is neutral)
    if lum < 105:
        return 'K'                       # charcoal / black outline
    if lum >= 212:
        return 'W'                       # white felt (lit or shaded)
    return '?'                           # mid grey: an anti-aliased edge or a shaded fold, resolved by neighbours


# pixel classes (measured on the renders): background is warm (r - b >= 8) or very bright; white felt
# is neutral (r - b 2..7, lum <= 245); charcoal and outlines are dark; cobalt, lime, pink by hue
PCLS = '.KWBLM'


def pixel_classes(img):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    out = np.full(lum.shape, 2, np.uint8)                       # W
    out[lum < 105] = 1                                          # K
    # shaded white felt can be slightly warm (r - b up to ~8), so warmth alone needs a margin
    bg = ((r - b >= 10) & (lum > 150)) | ((r - b >= 6) & (lum >= 246)) | (lum >= 250)
    out[bg] = 0
    out[(b > r + 40) & (b > g + 30)] = 3                        # B (incl. navy seams)
    out[(g > 150) & (r > 120) & (b < 110) & (g > b + 80)] = 4   # L
    out[(r > 170) & (r > g + 30) & (b > g)] = 5                 # M
    strict = np.full(lum.shape, 2, np.uint8)
    strict[:] = out
    strict[(out == 0) & ~((r - b >= 13) & (lum > 190))] = 2     # on cream board: only warm is background
    return out, strict


def cell_majority(pc, x0, y0, p, strict_bg=False, frac=0.8):
    cls = pc[1] if strict_bg else pc[0]
    m = p * (1 - frac) / 2
    xa, xb = int(round(x0 + m)), int(round(x0 + p - m))
    ya, yb = int(round(y0 + m)), int(round(y0 + p - m))
    patch = cls[max(0, ya):max(ya + 1, yb), max(0, xa):max(xa + 1, xb)].ravel()
    if patch.size == 0:
        return '.'
    n = np.bincount(patch, minlength=6).astype(float)
    n[1] *= 1.25            # outlines are slightly narrower than a block: favour them on ties
    return PCLS[int(n.argmax())]


DARK_COVER = 0.3
FEATURE_COVER = 0.4   # a half-size block is part of a feature stroke when this much of it is dark
HAIR_COVER = 0.5      # a normal block inside a feature box stays hair/outline unless it is mostly light


def pink_frac(img, x0, y0, p, frac=0.9):
    """Share of mouth-pink pixels in a cell."""
    m = p * (1 - frac) / 2
    patch = img[int(round(y0 + m)):int(round(y0 + p - m)), int(round(x0 + m)):int(round(x0 + p - m))].reshape(-1, 3)
    if patch.size == 0:
        return 0.0
    r, g, b = patch[:, 0], patch[:, 1], patch[:, 2]
    return float(((r > 170) & (r > g + 30) & (b > g)).mean())


def dark_frac(img, x0, y0, p, frac=0.84):
    """Share of near-black pixels in the central `frac` of a cell."""
    m = p * (1 - frac) / 2
    xa, xb = int(round(x0 + m)), int(round(x0 + p - m))
    ya, yb = int(round(y0 + m)), int(round(y0 + p - m))
    patch = img[max(0, ya):max(ya + 1, yb), max(0, xa):max(xa + 1, xb)].reshape(-1, 3)
    if patch.size == 0:
        return 0.0
    lum = patch @ np.array([0.299, 0.587, 0.114])
    return float((lum < 105).mean())


def sample(img, x0, y0, p, frac=0.5):
    """Median colour of the central `frac` of a cell whose top-left corner is (x0, y0)."""
    m = p * (1 - frac) / 2
    xa, xb = int(round(x0 + m)), int(round(x0 + p - m))
    ya, yb = int(round(y0 + m)), int(round(y0 + p - m))
    patch = img[max(0, ya):max(ya + 1, yb), max(0, xa):max(xa + 1, xb)]
    if patch.size == 0:
        return (255, 251, 243)
    return tuple(np.median(patch.reshape(-1, 3), axis=0))


def local_lattice(img, p, px, py, i0, j0, cols, rows, part_rules=()):
    """Top-left corner of every block of the real lattice, as two (rows, cols) arrays.

    The renders have perspective, so one uniform grid drifts by up to half a block at the hands and
    shoes: samples land on grooves or straddle two colours, which breaks outlines. A cell is aligned
    when its interior is one colour (block edges and colour edges sit on cell borders), so:
      1. fit one smooth warp (phase, pitch, shear, perspective terms) that minimises the summed colour
         variance of all figure cells, then
      2. add a small local correction (±¼ block), weighted by how sure each cell is (flat white or black
         areas are equally happy anywhere and simply follow the warp), so no cell can jump a block.
    """
    H, W, _ = img.shape
    S = [np.pad(img[..., c], ((1, 0), (1, 0))).cumsum(0).cumsum(1) for c in range(3)]
    S2 = [np.pad(img[..., c] ** 2, ((1, 0), (1, 0))).cumsum(0).cumsum(1) for c in range(3)]
    m = p * 0.24                     # skip the groove band at the cell border

    def cell_var(x, y):
        xa = np.clip(np.round(x + m).astype(int), 0, W - 1); xb = np.clip(np.round(x + p - m).astype(int), 1, W)
        ya = np.clip(np.round(y + m).astype(int), 0, H - 1); yb = np.clip(np.round(y + p - m).astype(int), 1, H)
        n = np.maximum(1, (xb - xa) * (yb - ya))
        v = 0
        for c in range(3):
            s1 = S[c][yb, xb] - S[c][ya, xb] - S[c][yb, xa] + S[c][ya, xa]
            s2 = S2[c][yb, xb] - S2[c][ya, xb] - S2[c][yb, xa] + S2[c][ya, xa]
            v = v + np.maximum(0, s2 / n - (s1 / n) ** 2)
        return v

    ii, jj = np.meshgrid(np.arange(cols, dtype=float), np.arange(rows, dtype=float))
    # figure cells (anything that is not warm cream background) drive the fit
    cx = np.clip((px + (i0 + ii + 0.5) * p).astype(int), 0, W - 1)
    cy = np.clip((py + (j0 + jj + 0.5) * p).astype(int), 0, H - 1)
    rgb = img[cy, cx]
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    fig = ~((lum > 232) & (rgb[..., 0] - rgb[..., 2] > 3))

    def warp(t):
        X0, Y0, ax, by, sx, sy, qx, qy, cxij, cyij = t
        x = X0 + ax * ii + sx * jj + qx * ii * ii + cxij * ii * jj
        y = Y0 + by * jj + sy * ii + qy * jj * jj + cyij * ii * jj
        return x, y

    def cost(t):
        x, y = warp(t)
        return cell_var(x, y)[fig].mean()

    t = np.array([px + i0 * p, py + j0 * p, p, p, 0, 0, 0, 0, 0, 0], float)
    steps = np.array([p / 4, p / 4, p * 0.01, p * 0.01, p * 0.01, p * 0.01, p * 4e-4, p * 4e-4, p * 4e-4, p * 4e-4])
    best = cost(t)
    for _ in range(7):
        improved = True
        while improved:
            improved = False
            for k in range(len(t)):
                for sgn in (1, -1):
                    t2 = t.copy(); t2[k] += sgn * steps[k]
                    c2 = cost(t2)
                    if c2 < best - 1e-9:
                        t, best, improved = t2, c2, True
        steps /= 2
    gx, gy = warp(t)
    print(f'  warp: pitch {t[2]:.3f}/{t[3]:.3f}  shear {t[4]:.3f}/{t[5]:.3f}  persp {t[6]:.5f} {t[7]:.5f} {t[8]:.5f} {t[9]:.5f}  cost {best:.1f}')

    # the renders are built from separate block layers per body part (head, arms, hands, legs): every
    # block is the same size, but each part's grid is shifted by a fraction of a block. Fit one offset
    # (up to ±½ block) per part on top of the global warp, then a small smoothed per-block refinement.
    from scipy.ndimage import gaussian_filter  # noqa: PLC0415
    cxp = gx + p / 2; cyp = gy + p / 2
    part = np.full((rows, cols), -1)
    for k, rule in enumerate(part_rules):
        n, x0, y0, x1, y1 = rule[:5]
        inside = (cxp >= x0) & (cxp < x1) & (cyp >= y0) & (cyp < y1) & (part < 0)
        part[inside] = k
    offs = np.arange(-p / 2, p / 2, 0.5)
    PX = np.zeros((rows, cols)); PY = np.zeros((rows, cols))
    for k in range(-1, len(part_rules)):
        m = (part == k) & fig
        if m.sum() < 12:
            continue
        best, bxy = None, (0.0, 0.0)
        for dx in offs:
            for dy in offs:
                c = cell_var(gx + dx, gy + dy)[m].mean()
                if best is None or c < best:
                    best, bxy = c, (dx, dy)
        PX[part == k], PY[part == k] = bxy
        name = 'torso' if k < 0 else part_rules[k][0]
        print(f'    part {name:6s} offset {bxy[0]:+.1f},{bxy[1]:+.1f} px')
    gx, gy = gx + PX, gy + PY
    # per-block refinement (±¼ block), confidence-weighted, smoothed within each part only
    offs = np.arange(-p / 4, p / 4 + 1e-6, 0.5)
    C = np.stack([np.stack([cell_var(gx + dx, gy + dy) for dy in offs]) for dx in offs])
    flat = C.reshape(-1, rows, cols)
    k = flat.argmin(0)
    ox = offs[k // len(offs)]; oy = offs[k % len(offs)]
    conf = (np.median(flat, 0) - flat.min(0)) * fig
    OX = np.zeros((rows, cols)); OY = np.zeros((rows, cols))
    for q in np.unique(part):
        m = (part == q).astype(float)
        w = gaussian_filter(conf * m, 2.0) + 1e-6
        OX += m * gaussian_filter(ox * conf * m, 2.0) / w
        OY += m * gaussian_filter(oy * conf * m, 2.0) / w
    ox, oy = OX, OY
    return gx + ox, gy + oy


def extract(name, cfg):
    img = np.array(Image.open(ROOT / cfg['image']).convert('RGB')).astype(float)
    H, W, _ = img.shape
    p = cfg['pitch']
    px, py = cfg['phase']
    cx0, cy0, cx1, cy1 = cfg['crop']
    # grid indices covering the crop
    i0 = int(np.floor((cx0 - px) / p)); i1 = int(np.ceil((cx1 - px) / p))
    j0 = int(np.floor((cy0 - py) / p)); j1 = int(np.ceil((cy1 - py) / p))
    cols, rows = i1 - i0, j1 - j0
    LX, LY = local_lattice(img, p, px, py, i0, j0, cols, rows, cfg.get('parts', ()))
    cfg['_lattice'] = (LX, LY)
    # every block takes the class covering most of its area in the render (pixel classes below), so
    # 1-block-wide details (thumb tips, outline steps, shoe stripes) survive and blurred edges don't
    pc = pixel_classes(img)
    grid = [['.'] * cols for _ in range(rows)]
    centres = {}
    for j in range(rows):
        for i in range(cols):
            x, y = LX[j, i], LY[j, i]
            cx, cy = x + p / 2, y + p / 2
            centres[(i, j)] = (cx, cy)
            if not (0 <= cx < W and 0 <= cy < H):
                continue
            ch = cell_majority(pc, x, y, p)
            if any(a <= cx < c and b <= cy < d for a, b, c, d in cfg.get('warm_bg', [])) and ch == '.':
                # over the cream easel board only clearly warm pixels are background
                ch = cell_majority(pc, x, y, p, strict_bg=True)
            if any(r[0] <= cx < r[2] and r[1] <= cy < r[3] and (len(r) < 5 or ch in r[4]) for r in cfg['clear']):
                continue
            grid[j][i] = ch
    # bright neutral backdrop (it reads like white felt): a very light 'W' block that can be reached from
    # the image edge without crossing an outline or another colour is background
    from collections import deque  # noqa: PLC0415
    medlum = np.zeros((rows, cols))
    for j in range(rows):
        for i in range(cols):
            if grid[j][i] == 'W':
                c = sample(img, LX[j, i], LY[j, i], p, 0.7)
                medlum[j, i] = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    light = lambda i, j: grid[j][i] == '.' or (grid[j][i] == 'W' and medlum[j, i] >= 243)
    seen = np.zeros((rows, cols), bool)
    dq = deque((i, j) for i in range(cols) for j in (0, rows - 1)) 
    dq.extend((i, j) for j in range(rows) for i in (0, cols - 1))
    while dq:
        i, j = dq.popleft()
        if not (0 <= i < cols and 0 <= j < rows) or seen[j, i] or not light(i, j):
            continue
        seen[j, i] = True
        if grid[j][i] == 'W':
            grid[j][i] = '.'
        dq.extend(((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)))
    # outline closure: white felt is always enclosed by a black outline in this style. Where a white
    # block touches the background directly, the outline was thinner than a block and lost the vote:
    # whichever of the two blocks holds more of the outline's dark pixels becomes outline. A white
    # block with almost no white pixels is a blurred edge and becomes background.
    def kfrac(i, j):
        x, y = LX[j, i], LY[j, i]
        m = p * 0.05
        patch = pc[0][int(round(y + m)):int(round(y + p - m)), int(round(x + m)):int(round(x + p - m))]
        return float((patch == 1).mean()) if patch.size else 0.0

    def wfrac(i, j):
        x, y = LX[j, i], LY[j, i]
        m = p * 0.1
        patch = pc[0][int(round(y + m)):int(round(y + p - m)), int(round(x + m)):int(round(x + p - m))]
        return float((patch == 2).mean()) if patch.size else 0.0
    for _ in range(2):
        changes = {}
        for j in range(rows):
            for i in range(cols):
                if grid[j][i] != 'W':
                    continue
                for a2, b2 in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                    if not (0 <= a2 < cols and 0 <= b2 < rows) or grid[b2][a2] != '.':
                        continue
                    kw, kb = kfrac(i, j), kfrac(a2, b2)
                    if wfrac(i, j) < 0.3:
                        changes[(i, j)] = '.'
                    elif max(kw, kb) < 0.1:
                        continue                    # no outline pixels on either side: leave as is
                    elif kw >= kb:
                        changes[(i, j)] = 'K'
                    else:
                        changes[(a2, b2)] = 'K'
        for (i, j), ch in changes.items():
            grid[j][i] = ch
        if not changes:
            break
    # keep the largest connected figure (drops stray specks from props)
    comp = {}
    cid = 0
    for j in range(rows):
        for i in range(cols):
            if grid[j][i] == '.' or (i, j) in comp:
                continue
            cid += 1
            st = [(i, j)]
            while st:
                a, b = st.pop()
                if (a, b) in comp or not (0 <= a < cols and 0 <= b < rows) or grid[b][a] == '.':
                    continue
                comp[(a, b)] = cid
                st += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1), (a + 1, b + 1), (a - 1, b - 1), (a + 1, b - 1), (a - 1, b + 1)]
    sizes = {}
    for k, v in comp.items():
        sizes[v] = sizes.get(v, 0) + 1
    main = max(sizes, key=sizes.get)
    for (a, b), v in comp.items():
        if v != main and sizes[v] < 25:
            grid[b][a] = '.'
    # trim empty margins
    rows_used = [j for j in range(rows) if any(c != '.' for c in grid[j])]
    cols_used = [i for i in range(cols) if any(grid[j][i] != '.' for j in range(rows))]
    jt, jb, il, ir = rows_used[0], rows_used[-1], cols_used[0], cols_used[-1]
    out = [''.join(grid[j][il:ir + 1]) for j in range(jt, jb + 1)]
    painted = set()
    for r0, c0, block in cfg.get('paint', []):
        for dr, line in enumerate(block):
            row = list(out[r0 + dr])
            for dc, ch in enumerate(line):
                if ch != '?':
                    row[c0 + dc] = ch
                    painted.add((r0 + dr, c0 + dc))
            out[r0 + dr] = ''.join(row)
    # actual felt colour of every kept block (for shades: seams, folds, shading on white)
    cols_rgb = {}
    for j in range(jt, jb + 1):
        for i in range(il, ir + 1):
            if grid[j][i] != '.':
                cols_rgb[(j - jt, i - il)] = sample(img, LX[j, i], LY[j, i], p, 0.6)
    # hand-painted blocks are drawn in their main colour (their pixels belong to a different block)
    for rc in painted:
        cols_rgb.pop(rc, None)

    # under a face detail the blocks are plain skin and the print layer draws the detail. Dark blocks in a
    # detail box are ink (eye bars, mouth) unless they connect to the hair outside the box.
    face_boxes = [d[1:] for d in cfg.get('details', []) if d[0] == 'face']
    inbox = lambda x, y, boxes: any(a0 <= x < a1 and b0 <= y < b1 for a0, b0, a1, b1 in boxes)
    R0, C0 = jb - jt + 1, ir - il + 1
    in_face = np.zeros((R0, C0), bool)
    for r in range(R0):
        for c in range(C0):
            in_face[r, c] = inbox(LX[r + jt, c + il] + p / 2, LY[r + jt, c + il] + p / 2, face_boxes)
    dark = np.array([[ch == 'K' for ch in row] for row in out])
    from scipy import ndimage as ndi  # noqa: PLC0415
    lab, _ = ndi.label(dark & in_face)
    hair = set()
    for r, c in zip(*np.where(dark & ~in_face)):
        for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= rr < R0 and 0 <= cc < C0 and lab[rr, cc]:
                hair.add(lab[rr, cc])
    for r in range(R0):
        row = list(out[r])
        for c in range(C0):
            if not in_face[r, c] or row[c] not in 'KWM' or (row[c] == 'K' and lab[r, c] in hair):
                continue
            row[c] = 'W'
            painted.add((r, c))
            cols_rgb.pop((r, c), None)
        out[r] = ''.join(row)

    # cell centres of the trimmed grid, for mapping reference pixels → cells
    TX = LX[jt:jb + 1, il:ir + 1] + p / 2
    TY = LY[jt:jb + 1, il:ir + 1] + p / 2
    R, C = TX.shape

    # dev: trimmed lattice (block top-left corners) for hand-drawing tools
    (ROOT / '.shots').mkdir(exist_ok=True)
    (ROOT / f'.shots/lattice-{name}.json').write_text(json.dumps(dict(
        x=(TX - p / 2).round(2).tolist(), y=(TY - p / 2).round(2).tolist(), p=p, image=cfg['image'])))

    def to_cell(x, y):
        """Reference pixel → fractional cell coords (x right, y down; cell c spans [c, c+1])."""
        d = (TX - x) ** 2 + (TY - y) ** 2
        j, i = np.unravel_index(d.argmin(), d.shape)
        return [round(float(i + 0.5 + (x - TX[j, i]) / p), 2), round(float(j + 0.5 + (y - TY[j, i]) / p), 2)]

    # part per cell
    parts = []
    for j in range(R):
        line = ''
        for i in range(C):
            ch = out[j][i]
            if ch == '.':
                line += '.'
                continue
            x, y = TX[j, i], TY[j, i]
            name = 'torso'
            for rule in cfg['parts']:
                n, x0, y0, x1, y1 = rule[:5]
                if x0 <= x < x1 and y0 <= y < y1 and (len(rule) < 6 or ch in rule[5]):
                    name = n
                    break
            line += PART_CH[name]
        parts.append(line)
    joints = {n: dict(pivot=to_cell(*xy), parent=par) for n, (xy, par) in cfg['joints'].items()}

    # dev preview: sample centres over the reference, to check the lattice fit
    dbg = Image.open(ROOT / cfg['image']).convert('RGB')
    from PIL import ImageDraw  # noqa: PLC0415
    d = ImageDraw.Draw(dbg)
    S3 = 4
    dbg = dbg.resize((dbg.width * S3, dbg.height * S3), Image.LANCZOS)
    d = ImageDraw.Draw(dbg)
    mark = {'K': (0, 0, 0), 'W': (255, 255, 255), 'B': (0, 60, 255), 'L': (180, 255, 0), 'M': (255, 60, 160)}
    for j in range(rows):
        for i in range(cols):
            x, y = (LX[j, i] + p / 2) * S3, (LY[j, i] + p / 2) * S3
            ch = grid[j][i]
            if ch == '.':
                d.line([(x - 3, y - 3), (x + 3, y + 3)], fill=(255, 0, 0)); d.line([(x - 3, y + 3), (x + 3, y - 3)], fill=(255, 0, 0))
            else:
                d.rectangle([x - 5, y - 5, x + 5, y + 5], fill=mark[ch], outline=(255, 0, 0))
    (ROOT / '.shots').mkdir(exist_ok=True)
    dbg.save(ROOT / f'.shots/lattice-{name}.png')
    def darker_frac(j, i, thr):
        """Share of a block's pixels darker than thr (thin seams cover only part of a block)."""
        x, y = LX[j + jt, i + il], LY[j + jt, i + il]
        m = p * 0.2                     # interior only: the groove band has near-black dots at every corner
        patch = img[int(round(y + m)):int(round(y + p - m)), int(round(x + m)):int(round(x + p - m))].reshape(-1, 3)
        if patch.size == 0:
            return 0.0
        lum = patch @ np.array([0.299, 0.587, 0.114])
        return float((lum < thr).mean())
    shade, pal = shades(out, cols_rgb, darker_frac, cfg.get('seam_cover', SEAM_COVER))
    decal, covered = decals(cfg, img, LX[jt:jb + 1, il:ir + 1], LY[jt:jb + 1, il:ir + 1], p, out, shade)
    Image.fromarray(np.clip(decal, 0, 255).astype(np.uint8) if decal[..., 3].max() > 1 else
                    np.concatenate([decal[..., :3], decal[..., 3:] * 255], -1).clip(0, 255).astype(np.uint8),
                    'RGBA').save(ROOT / f'public/cast/decal-{name}.png')
    return dict(rows=out, shade=shade, parts=parts, joints=joints, palette=pal, decal=dict(
        src=f'/cast/decal-{name}.png', px=DECAL_PX, cells=covered), pitch=p)


# a white block is only drawn grey when it is clearly darker than lit white felt (not just a groove or
# an anti-aliased edge)
GREY_GAP = 24


def kmeans1d(v, k, iters=40):
    v = np.sort(np.asarray(v, float))
    if k == 1 or len(v) < k:
        return np.array([v.mean()])
    c = np.quantile(v, (np.arange(k) + 0.5) / k)
    for _ in range(iters):
        lab = np.abs(v[:, None] - c[None]).argmin(1)
        c2 = np.array([v[lab == q].mean() if (lab == q).any() else c[q] for q in range(k)])
        if np.allclose(c, c2):
            break
        c = c2
    return np.sort(c)


# Shade steps below a material's main colour (luminance). Only real, drawn shading counts: seams and
# folds on cobalt, shadow on white felt. Blocks lighter than the main colour are blends with the
# background at the silhouette, so they snap to the main colour. Charcoal has one shade in the renders.
SHADE_STEP = {'B': 60, 'W': 30}   # cobalt reads as one colour; real pleats come from the print layer


# seams and pleats on cobalt are drawn as thin near-black lines inside the blue
SEAM_LUM, SEAM_COVER = 50, 2.0   # block-level seams off (print layer draws them)


# fixed felt colours for small accents a reference may only show in a few blocks
ACCENT = {'L1': '#c9e72c', 'L0': '#a9c21c', 'M1': '#f08aa8', 'M0': '#d86f8e'}


def shades(rows, rgb, darker_frac=None, seam_cover=None):
    """Shade level per block within its material: 1 = main colour, 0 = drawn shade (darker)."""
    lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    by_mat = {}
    for (j, i), c in rgb.items():
        if rows[j][i] != '.':
            by_mat.setdefault(rows[j][i], []).append(c)
    main, pal = {}, dict(ACCENT)
    for m, cs in by_mat.items():
        arr = np.array(cs)
        L = arr @ np.array([0.299, 0.587, 0.114])
        med = float(np.median(L))
        main[m] = med
        if m in 'LM':
            continue
        core = arr[np.abs(L - med) < 12]
        pal[f'{m}1'] = '#%02x%02x%02x' % tuple(int(round(x)) for x in np.median(core if len(core) else arr, 0))
        if m in SHADE_STEP:
            dark = arr[L < med - SHADE_STEP[m] * (0.6 if m == 'B' else 1)]
            if len(dark):
                pal[f'{m}0'] = '#%02x%02x%02x' % tuple(int(round(x)) for x in np.median(dark, 0))
    for m in list(main):
        pal.setdefault(f'{m}0', pal[f'{m}1'])
    # seam navy: the cobalt pushed most of the way to the near-black of the drawn lines
    if 'B1' in pal:
        c = [int(pal['B1'][k:k + 2], 16) for k in (1, 3, 5)]
        pal['B0'] = '#%02x%02x%02x' % tuple(int(v * 0.42) for v in c)

    def level(m, j, i, edge):
        c = rgb.get((j, i))
        if m not in SHADE_STEP or edge or c is None:
            return 1
        if lum(c) < main[m] - SHADE_STEP[m]:
            return 0
        # cobalt seams/pleats are thinner than a block: a block crossed by one is a seam block
        if m == 'B' and darker_frac and darker_frac(j, i, SEAM_LUM) >= (seam_cover or SEAM_COVER):
            return 0
        return 1

    def edge(j, i):
        return any(not (0 <= b < len(rows) and 0 <= a < len(rows[0])) or rows[b][a] == '.'
                   for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)))
    shade = [''.join(str(level(ch, j, i, edge(j, i))) if ch != '.' else '.' for i, ch in enumerate(row))
             for j, row in enumerate(rows)]
    return shade, pal


DECAL_PX = 16          # decal pixels per block


def decals(cfg, img, LX, LY, p, rows, shade):
    """The drawn details (eyes, brows, mouth, finger lines, pleats) printed on the blocks, exactly as in
    the render: for every block inside a detail box, its patch of the reference is resampled onto the
    block and turned into an ink alpha (dark strokes, pink tongue, navy pleats). Returns an RGBA image
    in sprite space (DECAL_PX per block) and the cells it covers.
    """
    from scipy import ndimage as ndi  # noqa: PLC0415
    R, C = len(rows), len(rows[0])
    D = DECAL_PX
    out = np.zeros((R * D, C * D, 4), np.float32)
    covered = []
    u = (np.arange(D) + 0.5) / D
    lum_w = np.array([0.299, 0.587, 0.114])
    for kind, x0, y0, x1, y1 in cfg.get('details', []):
        for j in range(R):
            for i in range(C):
                cx, cy = LX[j, i] + p / 2, LY[j, i] + p / 2
                if not (x0 <= cx < x1 and y0 <= cy < y1):
                    continue
                base = rows[j][i]
                if kind == 'face' and base not in 'W':
                    continue
                # finger lines are interior strokes: skip blocks on the hand's edge (their dark pixels are
                # the outline, which the blocks already draw)
                if kind == 'lines' and (base != 'W' or any(
                        not (0 <= jj < R and 0 <= ii < C) or rows[jj][ii] != 'W'
                        for jj, ii in ((j + 1, i), (j - 1, i), (j, i + 1), (j, i - 1)))):
                    continue
                if kind == 'pleats' and base != 'B':
                    continue
                # resample this block's patch of the reference (bilinear)
                xs = LX[j, i] + u * p
                ys = LY[j, i] + u * p
                Xg, Yg = np.meshgrid(xs, ys)
                patch = np.stack([ndi.map_coordinates(img[..., k], [Yg.ravel(), Xg.ravel()], order=1).reshape(D, D)
                                  for k in range(3)], -1)
                L = patch @ lum_w
                r, g, b = patch[..., 0], patch[..., 1], patch[..., 2]
                rgba = np.zeros((D, D, 4), np.float32)
                if kind in ('face', 'lines'):
                    pink = np.clip((r - g - 25) / 35, 0, 1) * (r > 150)
                    ink = np.clip((175 - L) / 95, 0, 1) * (1 - pink)
                    ink = ndi.grey_opening(ink, size=(3, 3))     # drop the felt's groove dots
                    rgba[..., :3] = np.array(INK['K'])
                    rgba[..., 3] = ink
                    if pink.max() > 0.2:
                        pm = pink[..., None] > ink[..., None]
                        rgba[..., :3] = np.where(pm, np.array(INK['M']), rgba[..., :3])
                        rgba[..., 3] = np.maximum(ink, pink)
                else:
                    # pleats: blue clearly darker than this block's own blue level
                    blue = (b > r + 35) & (b > g + 25)
                    ref = np.percentile(L[blue], 75) if blue.any() else L.max()
                    a = np.clip((ref - L - 8) / 14, 0, 1) * blue
                    a = ndi.grey_opening(a, size=(3, 3))
                    rgba[..., :3] = np.array(INK['N'])
                    rgba[..., 3] = a
                if rgba[..., 3].max() < 0.25:
                    continue
                out[j * D:(j + 1) * D, i * D:(i + 1) * D] = rgba
                covered.append([j, i])
                if kind == 'pleats':
                    shade[j] = shade[j][:i] + '1' + shade[j][i + 1:]   # the decal carries the pleat
    return out, covered


INK = {'K': (23, 22, 27), 'M': (226, 140, 152), 'N': (8, 26, 112)}




def preview2d(name, data, s=12):
    """Flat 2D sprite: every block a square of its shade, with a darker groove, face at 2×."""
    from PIL import ImageDraw  # noqa: PLC0415
    rows, sh, pal = data['rows'], data['shade'], data['palette']
    im = Image.new('RGB', (len(rows[0]) * s, len(rows) * s), (246, 244, 239))
    d = ImageDraw.Draw(im)
    def col(key, k=1.0):
        h = pal[key]
        return tuple(int(int(h[i:i + 2], 16) * k) for i in (1, 3, 5))
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            c = f'{ch}{sh[j][i]}'
            d.rectangle([i * s, j * s, i * s + s - 1, j * s + s - 1], fill=col(c, 0.8))
            d.rectangle([i * s + 1, j * s + 1, i * s + s - 2, j * s + s - 2], fill=col(c))
    # the printed details (decal) on top, at 2x preview resolution
    im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    dec = Image.open(ROOT / data['decal']['src'].lstrip('/').replace('cast/', 'public/cast/')).resize(im.size, Image.LANCZOS)
    im.paste(dec, (0, 0), dec)
    im.save(ROOT / f'.shots/sprite2d-{name}.png')


def preview(name, data):
    pal = {'.': (255, 200, 210), 'K': (40, 38, 44), 'W': (240, 238, 234), 'B': (16, 70, 230),
           'L': (200, 230, 40), 'M': (240, 140, 170), 'E': (20, 20, 26)}
    rows = data['rows']
    s = 10
    im = Image.new('RGB', (len(rows[0]) * s, len(rows) * s), (255, 200, 210))
    px = im.load()
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            for y in range(s):
                for x in range(s):
                    if 0 < x < s - 1 and 0 < y < s - 1:
                        px[i * s + x, j * s + y] = pal[ch]
    (ROOT / '.shots').mkdir(exist_ok=True)
    im.save(ROOT / f'.shots/cast-{name}.png')


if __name__ == '__main__':
    result = {}
    for name, cfg in CHARS.items():
        data = extract(name, cfg)
        preview(name, data)
        preview2d(name, data)
        result[name] = data
        print(name, len(data['rows'][0]), 'x', len(data['rows']))
        if '--ascii' in sys.argv:
            print('\n'.join(data['rows']))
    body = ('// GENERATED by scripts/extract-cast.py from the reference renders — do not edit by hand.\n'
            '// rows: one char per felt block (K charcoal, W white, B cobalt, L lime, M pink).\n'
            '// fine: the same area at 2× re-sampled for the face: see face / faceBox.\n'
            f'export const SPRITES = {json.dumps(result, indent=1)} as const;\n')
    (ROOT / 'src/characters/sprites.gen.ts').write_text(body, encoding='utf8')
