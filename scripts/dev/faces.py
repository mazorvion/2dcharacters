# Dev only: reference face | coarse-block face (no half-size face), zoomed, per character.
import json
from PIL import Image, ImageDraw
s = open('src/characters/sprites.gen.ts', encoding='utf8').read()
D = json.loads(s[s.index('{'):s.rindex('}') + 1])
REF = {'him': ('reference/him-ref.webp', (395, 110, 545, 255)), 'her': ('reference/her-ref.png', (150, 85, 310, 235))}
tiles = []
for n, d in D.items():
    a = Image.open(REF[n][0]).convert('RGB').crop(REF[n][1]).resize((600, 580), Image.LANCZOS)
    rows, sh, pal = d['rows'], d['shade'], d['palette']
    fc0, fr0, fc1, fr1 = d['faceBox']
    c0, r0, c1, r1 = fc0 - 3, fr0 - 3, fc1 + 3, fr1 + 3
    s_ = 22
    b = Image.new('RGB', ((c1 - c0 + 1) * s_, (r1 - r0 + 1) * s_), (246, 244, 239)); dr = ImageDraw.Draw(b)
    for j in range(max(0, r0), min(len(rows), r1 + 1)):
        for i in range(max(0, c0), min(len(rows[0]), c1 + 1)):
            ch = rows[j][i]
            if ch == '.': continue
            h = pal[f'{ch}{sh[j][i]}']; col = tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
            x, y = (i - c0) * s_, (j - r0) * s_
            dr.rectangle([x, y, x + s_ - 1, y + s_ - 1], fill=tuple(int(v * .8) for v in col))
            dr.rectangle([x + 1, y + 1, x + s_ - 2, y + s_ - 2], fill=col)
            dr.text((x + 3, y + 5), '', fill=(255, 0, 0))
    b = b.resize((int(b.width * 580 / b.height), 580), Image.NEAREST)
    t = Image.new('RGB', (a.width + b.width + 20, 580), 'white'); t.paste(a, (0, 0)); t.paste(b, (a.width + 20, 0)); tiles.append(t)
o = Image.new('RGB', (sum(t.width for t in tiles) + 40, 580), 'white'); x = 0
for t in tiles: o.paste(t, (x, 0)); x += t.width + 40
o.save('.shots/_faces.png')
