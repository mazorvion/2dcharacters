# Generates Her's hair + face skin (rows 22-43) from spans measured on duo-stage.webp. Prints a patch.py block.
HAIR = {23: [(33, 38)], 24: [(31, 40)], 25: [(29, 42)], 26: [(28, 43)], 27: [(27, 44)], 28: [(26, 45)], 29: [(25, 46)],
        30: [(24, 46)], 31: [(24, 47)], 32: [(23, 47)], 33: [(23, 48)], 34: [(23, 50)], 35: [(22, 50)], 36: [(22, 50)],
        37: [(22, 49)], 38: [(22, 49)], 39: [(22, 49)], 40: [(23, 48)], 41: [(24, 48)], 42: [(25, 30), (42, 48)],
        43: [(26, 29), (43, 47)]}
SKIN = {28: [(34, 35)], 29: [(33, 37)], 30: [(32, 38)], 31: [(32, 39)], 32: [(31, 40)], 33: [(31, 41)], 34: [(29, 42)],
        35: [(29, 42)], 36: [(29, 42)], 37: [(29, 42)], 38: [(32, 42)], 39: [(32, 41)], 40: [(33, 40)], 41: [(34, 39)],
        42: [(33, 38)], 43: [(33, 38)]}
rows = {r: ['.'] * 80 for r in range(22, 44)}
for r, spans in HAIR.items():
    for a, b in spans:
        for c in range(a, b + 1): rows[r][c] = 'K'
for r, spans in SKIN.items():
    for a, b in spans:
        for c in range(a, b + 1): rows[r][c] = 'W'
# ear (screen-left) with inner shading; earring below it
for c, r in [(30, 35), (30, 36)]: rows[r][c] = 'w'
for (c, r), ch in {(30, 38): 'L', (31, 38): 'L', (30, 39): 'L', (31, 39): 'L', (30, 40): 'l', (31, 40): 'l'}.items(): rows[r][c] = ch
# jaw outline from below the ear to the chin and up the right side (the hair borders the rest)
for c, r in [(32, 38), (32, 39), (33, 40), (34, 41), (35, 42), (36, 42), (37, 42), (38, 41), (39, 41), (40, 40), (41, 39), (42, 38)]:
    rows[r][c] = 'O'
# neck under the chin (torso draws the visible neck; these sit under the head)
for r in (42, 43):
    for c in range(33, 39):
        if rows[r][c] == 'W': rows[r][c] = 'W'
# soft shadow under the chin
for c in range(35, 38): rows[43][c] = 'w'
print('@ 0 22')
for r in range(22, 44): print(''.join(rows[r]))
print()
