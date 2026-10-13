# Splits her/_draft/master.txt into Her's part drawings (CHARACTERS.md §7.1), adding hidden joint overlaps.
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3] / 'src/cast/art/her'
rows = [list(l) for l in (ROOT / '_draft/master.txt').read_text().split('\n') if l and not l.startswith('#')]
H, W = 96, 80
NAMES = {'hairBack': 'hero', 'hairFront': 'hero', 'head': 'hero', 'earring': 'hero', 'torso': 'hero',
         'armScreenL': 'present', 'armScreenR': 'presentHigh', 'legScreenL': 'hero', 'legScreenR': 'hero'}
parts = {p: [['.'] * W for _ in range(H)] for p in NAMES}
def part_of(r, c, ch):
    if ch in 'Ll' and 36 <= r <= 41: return 'earring'
    if r <= 41 and ch in 'Kk':
        return 'hairFront' if (27 <= r <= 33 and 27 <= c <= 42) else 'hairBack'
    if 42 <= r <= 43 and ch in 'Kk' and (c <= 30 or c >= 42): return 'hairBack'
    if r <= 41 and ch in 'WwgO': return 'head'
    if r >= 90: return 'legScreenL' if c <= 31 else 'legScreenR'
    if r >= 58 and ch in 'BbO' and not (r <= 60 and ch == 'K'):
        return 'legScreenL' if c <= 38 else 'legScreenR'
    if r >= 40 and c >= 48 and r <= 56: return 'armScreenR'
    if 44 <= r <= 55 and c <= 28: return 'armScreenL'
    if 47 <= r <= 59 and c <= 24 and ch in 'OWw': return 'armScreenL'
    return 'torso'
for r in range(H):
    for c in range(W):
        ch = rows[r][c]
        if ch != '.': parts[part_of(r, c, ch)][r][c] = ch
t = parts['torso']
for r in range(39, 42):                  # neck continues up under the chin
    for c in range(34, 39):
        if t[r][c] == '.': t[r][c] = 'W'
for side in ('legScreenL', 'legScreenR'):  # legs start one row up, under the waistband
    g = parts[side]
    for c in range(W):
        if g[58][c] in 'Bb': g[57][c] = g[58][c]
for name, g in parts.items():
    (ROOT / f'{name}.{NAMES[name]}.txt').write_text(f'# part: {name}\n# drawing: {NAMES[name]}\n' + '\n'.join(''.join(x) for x in g) + '\n')
print('written', ', '.join(f'{p}.{n}' for p, n in NAMES.items()))
