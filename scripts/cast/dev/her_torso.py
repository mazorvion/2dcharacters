# Generates Her's torso, jacket, lapels and both arms (rows 42-61) from spans measured on duo-stage.webp.
# Each row: spans (c0, c1, ch) applied in order, later spans win. Prints a patch.py block for cols 10-73.
R = {}
def add(r, *spans): R.setdefault(r, []).extend(spans)
# jacket body + sleeves (charcoal)
for r, (a, b) in {42: (30, 32), 43: (27, 47), 44: (26, 47), 45: (25, 56), 46: (25, 56), 47: (25, 56), 48: (24, 56),
                  49: (24, 56), 50: (24, 56), 51: (24, 56), 52: (24, 56), 53: (24, 55), 54: (24, 52), 55: (24, 46),
                  56: (23, 45), 57: (23, 45), 58: (22, 34), 59: (23, 33), 60: (24, 30)}.items():
    add(r, (a, b, 'K'))
add(42, (40, 44, 'K'))
add(45, (48, 52, '.'))               # the sleeve top dips between the shoulder and the cuff
add(57, (35, 41, '.'))               # below the white top the trousers show (legs part)
add(56, (35, 41, '.'))
add(55, (34, 41, 'B'))               # waistband
add(55, (34, 41, 'b')) if False else None
# sleeve seams and the jacket's front edges (charcoal-deep)
for r in range(46, 53): add(r, (29, 29, 'k'))   # screen-left armhole seam
for r in range(46, 54): add(r, (47, 47, 'k'))   # screen-right armhole seam
# white top between the lapels
for r, (a, b) in {43: (34, 38), 44: (34, 39), 45: (35, 40), 46: (35, 40), 47: (35, 40), 48: (36, 41), 49: (36, 41),
                  50: (36, 41), 51: (36, 41), 52: (36, 41), 53: (36, 41), 54: (36, 41)}.items():
    add(r, (a, b, 'W'))
# lapels (cobalt facing), wider at the notch near the collar, with a deep edge line on the outside
for r, (a, b) in {43: (31, 33), 44: (30, 33), 45: (31, 34), 46: (31, 34), 47: (32, 34), 48: (32, 35), 49: (33, 35),
                  50: (33, 35), 51: (34, 35), 52: (34, 35), 53: (35, 35)}.items():
    add(r, (a, b, 'B'), (a, a, 'b'))
for r, (a, b) in {43: (39, 41), 44: (40, 43), 45: (41, 43), 46: (41, 43), 47: (41, 43), 48: (42, 43), 49: (42, 43),
                  50: (42, 43), 51: (42, 43), 52: (42, 42), 53: (42, 42)}.items():
    add(r, (a, b, 'B'), (b, b, 'b'))
# neck shadow where the top meets the collar
add(43, (35, 37, 'w'))
# screen-left hand: palm up, fingers to the left, thumb up
LH = {48: (16, ['OO']), 49: (12, ['OOOO', 'WW', 'O']), 50: (12, ['O', 'WWWWWW', 'OO']), 51: (12, ['O', 'WWWWWWWW', 'OO']),
      52: (13, ['O', 'WWwwWWWWW', 'OO']), 53: (13, ['OO', 'WWWWWWWWW']), 54: (15, ['O', 'WWWWWWWW']),
      55: (16, ['O', 'WWWWWWW']), 56: (17, ['OO', 'WWWWW']), 57: (19, ['OO', 'WWW']), 58: (21, ['OOO'])}
for r, (c0, parts) in LH.items():
    s = ''.join(parts)
    for i, ch in enumerate(s): add(r, (c0 + i, c0 + i, ch))
# screen-right forearm + hand: palm up, thumb up, fingertips at col 70, palm crease
RH = {40: (63, 'OO'), 41: (62, 'OWWO'), 42: (61, 'OWWWOOOOO'), 43: (60, 'OWWWWWWWWWO'), 44: (59, 'OWWWWWWOOOWO'),
      45: (57, 'OOWWWWWWWWWWWO'), 46: (57, 'WWWWWWWWWWWWWO'), 47: (57, 'WWWWWWWWWWOOO'), 48: (57, 'WWWWWWWOOO'),
      49: (57, 'WWWWWOO'), 50: (57, 'WWWOO'), 51: (57, 'WWO'), 52: (57, 'OO')}
for r, (c0, s) in RH.items():
    for i, ch in enumerate(s): add(r, (c0 + i, c0 + i, ch))
print('@ 10 40')
for r in (40, 41):
    row = ['?'] * 64
    for a, b, ch in R.get(r, []):
        for c in range(a, b + 1): row[c - 10] = ch
    print(''.join(row))
for r in range(42, 62):
    row = ['?'] * 64                               # cols 10-73; unspecified cells are kept
    for a, b, ch in R.get(r, []):
        for c in range(a, b + 1): row[c - 10] = ch
    print(''.join(row))
print()
