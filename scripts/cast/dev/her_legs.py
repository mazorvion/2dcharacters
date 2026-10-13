# Generates Her's trousers and shoes (rows 58-93) from edges measured on duo-stage.webp. Prints a patch.py block.
def interp(keys, r):
    ks = sorted(keys)
    for a, b in zip(ks, ks[1:]):
        if a <= r <= b:
            return round(keys[a] + (keys[b] - keys[a]) * (r - a) / (b - a))
    return keys[ks[0]] if r < ks[0] else keys[ks[-1]]
L_OUT = {58: 31, 60: 30, 62: 30, 65: 29, 70: 27, 72: 26, 75: 25, 78: 24, 80: 24, 83: 23, 85: 22, 88: 21, 89: 21}
L_IN = {69: 37, 70: 37, 75: 36, 80: 35, 85: 34, 89: 33}
R_IN = {69: 39, 70: 39, 75: 40, 80: 40, 85: 41, 89: 42}
R_OUT = {58: 44, 60: 45, 65: 46, 70: 48, 75: 49, 80: 51, 85: 53, 88: 54, 89: 54}
CREASE_L = {58: 35, 68: 34, 80: 32, 89: 31}
CREASE_R = {60: 41, 75: 44, 89: 47}
rows = {}
for r in range(58, 90):
    row = ['.'] * 80
    if r < 69:
        a, b = interp(L_OUT, r), interp(R_OUT, r)
        for c in range(a, b + 1): row[c] = 'B'
        row[a] = row[b] = 'O'
        if r >= 59: row[38] = 'b' if r < 68 else 'O'        # centre seam down to the crotch
    else:
        for a, b in ((interp(L_OUT, r), interp(L_IN, r)), (interp(R_IN, r), interp(R_OUT, r))):
            for c in range(a, b + 1): row[c] = 'B'
            row[a] = row[b] = 'O'
    if r >= 59: row[interp(CREASE_L, r)] = 'b'
    if r >= 61: row[interp(CREASE_R, r)] = 'b'
    if r == 89:                                             # hem: outline along the bottom
        for c in range(80):
            if row[c] == 'B' or row[c] == 'b': row[c] = 'O'
    rows[r] = ''.join(row)
shoes = {
    90: (19, '.OKKWWWKKKKO.'), 91: (19, 'OKKKKKKKKKKO.'), 92: (19, 'OWWWWWWWWKKO.'), 93: (19, 'OOOOOOOOOOOO.'),
}
shoesR = {
    90: (41, '..OKKKKKKWWWWWKKKO.'), 91: (41, '.OKKKKKKKKKKKKKKKO.'), 92: (41, '.OKKKKKKWWWWWWWWKO.'), 93: (41, '.OOOOOOOOOOOOOOOOO.'),
}
for r in range(90, 94):
    row = ['.'] * 80
    for c0, s in (shoes[r], shoesR[r]):
        for i, ch in enumerate(s): row[c0 + i] = ch
    rows[r] = ''.join(row)
print('@ 0 58')
for r in range(58, 94): print(rows[r])
print()
