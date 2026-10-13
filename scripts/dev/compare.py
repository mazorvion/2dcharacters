# Dev only: reference render | extracted sprite, side by side at the same height.
from PIL import Image
pairs = [('reference/him-ref.webp', (150, 45, 663, 790), '.shots/cast-him.png'),
         ('reference/her-ref.png', (20, 85, 450, 562), '.shots/cast-her.png')]
tiles = []
for ref, box, spr in pairs:
    a = Image.open(ref).convert('RGB').crop(box)
    b = Image.open(spr).convert('RGB')
    h = 900
    a = a.resize((int(a.width * h / a.height), h)); b = b.resize((int(b.width * h / b.height), h), Image.NEAREST)
    t = Image.new('RGB', (a.width + b.width + 20, h), 'white'); t.paste(a, (0, 0)); t.paste(b, (a.width + 20, 0))
    tiles.append(t)
W = sum(t.width for t in tiles) + 40
out = Image.new('RGB', (W, 900), 'white'); x = 0
for t in tiles: out.paste(t, (x, 0)); x += t.width + 40
out.save('.shots/_compare.png')
