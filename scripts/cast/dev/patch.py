# patch.py <gridfile> < blocks
# Block format:   @ <col> <row>   then rows of chars; '?' keeps the existing cell. Blank line ends a block.
import sys
path = sys.argv[1]
lines = open(path).read().split('\n')
head = [l for l in lines if l.startswith('#')]
rows = [list(l) for l in lines if l and not l.startswith('#')]
c0 = r = None
for line in sys.stdin.read().split('\n'):
    if line.startswith('@'):
        _, c, rr = line.split(); c0, r = int(c), int(rr); continue
    if c0 is None or not line.strip():
        c0 = None if not line.strip() else c0; continue
    for i, ch in enumerate(line.rstrip()):
        if ch != '?':
            rows[r][c0 + i] = ch
    r += 1
open(path, 'w').write('\n'.join(head + [''.join(x) for x in rows]) + '\n')
