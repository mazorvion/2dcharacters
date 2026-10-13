# Splits him/_draft/master.txt into part drawings (CHARACTERS.md §7.1). Dev helper, not shipped.
import sys
ROOT = str(__import__('pathlib').Path(__file__).resolve().parents[3] / 'src/cast/art/him') + '/'
rows = [list(l) for l in open(ROOT + '_draft/master.txt').read().split('\n') if l and not l.startswith('#')]
H, W = 96, 80
parts = {p: [['.'] * W for _ in range(H)] for p in ['head', 'hairFront', 'torso', 'armScreenL', 'armScreenR', 'legScreenL', 'legScreenR']}
NECK = {(40, 30), (40, 31), (41, 31), (40, 32), (41, 32), (42, 32), (40, 33), (41, 33), (42, 33), (43, 33)}
TAIL = {(25, 52), (25, 53), (26, 53), (25, 54), (26, 54), (25, 55), (26, 55), (26, 56)}
def part_of(r, c, ch):
    if r <= 29 and 35 <= c <= 59 and ch in 'Kk': return 'hairFront'
    if 20 <= r <= 33 and 39 <= c <= 55 and (c, r) not in NECK and ch in 'WwgO': return 'head'
    if r >= 86: return 'legScreenL' if c <= 28 else 'legScreenR'
    if r >= 63: return 'legScreenL' if c <= 36 else 'legScreenR'
    if (c, r) in TAIL: return 'torso'
    if 39 <= r <= 44 and c <= 30: return 'armScreenL'
    if 45 <= r <= 56 and 24 <= c <= 31 and ch in 'OWw': return 'armScreenL'
    if c >= 49 and 36 <= r <= 59: return 'armScreenR'
    return 'torso'
for r in range(H):
    for c in range(W):
        ch = rows[r][c]
        if ch != '.': parts[part_of(r, c, ch)][r][c] = ch
# hidden overlaps so ±1 bead offsets never open a gap (CHARACTERS.md §4.4 rule 6)
t = parts['torso']
t[33][44] = "O"                       # neck outline continues under the chin
for r in range(28, 34):              # neck continues up under the jaw
    for c in range(41, 45):
        if t[r][c] == '.': t[r][c] = 'W'
for c in range(26, 47):              # hips continue one row into the legs
    if parts['legScreenL'][63][c] != '.' or parts['legScreenR'][63][c] != '.': t[63][c] = 'K'
for c in range(26, 47):              # legs start one row up, under the hips
    if rows[62][c] == 'K' or rows[62][c] == 'k':
        (parts['legScreenL'] if c <= 36 else parts['legScreenR'])[62][c] = 'K'
a = parts['armScreenL']              # left arm continues under the sleeve
for c in range(25, 30): a[44][c] = a[44][c] if a[44][c] != '.' else 'W'
b = parts['armScreenR']              # forearm continues under the sleeve hem
for (c, r) in [(54, 47), (53, 47), (52, 48), (51, 49)]:
    if b[r][c] == '.': b[r][c] = 'W'
names = {'head': 'hero', 'hairFront': 'hero', 'torso': 'hero', 'armScreenL': 'pocket', 'armScreenR': 'present', 'legScreenL': 'hero', 'legScreenR': 'hero'}
for p, g in parts.items():
    with open(f'{ROOT}{p}.{names[p]}.txt', 'w') as f:
        f.write(f'# part: {p}\n# drawing: {names[p]}\n')
        f.write('\n'.join(''.join(x) for x in g) + '\n')
print('written', ', '.join(f'{p}.{n}' for p, n in names.items()))
