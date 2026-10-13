# deorphan.py <master> [keep r,c ...]: replaces single beads (no same-char 8-neighbour) with their 4-neighbour majority.
import sys, collections
path = sys.argv[1]
keep = {tuple(map(int, a.split(','))) for a in sys.argv[2:]}
lines = open(path).read().split('\n'); head = [l for l in lines if l.startswith('#')]
rows = [list(l) for l in lines if l and not l.startswith('#')]
at = lambda r, c: rows[r][c] if 0 <= r < 96 and 0 <= c < 80 else '.'
for it in range(5):
    n = 0
    for r in range(96):
        for c in range(80):
            ch = rows[r][c]
            if ch == '.' or (r, c) in keep: continue
            if any(at(r + dy, c + dx) == ch for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx): continue
            nb = collections.Counter(at(r + dy, c + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            rows[r][c] = nb.most_common(1)[0][0]; n += 1
    if not n: break
open(path, 'w').write('\n'.join(head + [''.join(x) for x in rows]) + '\n')
print('done')
