# Cast dev tools (Python, run with `python3 -I`)

Helpers used to author the hero model sheets (CHARACTERS.md §11 P2–P4). None of them ship.

| Tool | Use |
|---|---|
| `patch.py <grid>` | Apply blocks from stdin: `@ col row` then rows of characters; `?` keeps a cell, `.` clears it. |
| `refgrid.py <char> <grid> c0 r0 c1 r1 out.png [px]` | The reference with the bead grid next to a flat view of a grid region. |
| `refine.py <char> <grid> [c0 r0 c1 r1] [--dry]` | Lists (or applies) cells where the reference confidently disagrees. Keeps outlines and the face; `CONF=0.5` loosens it. Review a `--dry` run first: it is a guide, not the artist. |
| `deorphan.py <grid> [r,c ...]` | Replaces single stray beads with their neighbours' majority (listed cells are kept). |
| `trace.py <char> <name> x0 y0 x1 y1 [thr]` | Traces ink in a window of duo-stage.webp into SVG paths in canvas bead units (face features). |
| `split_him.py` | Splits `art/him/_draft/master.txt` into Him's part drawings, adding the hidden joint overlaps. |

Him's hero sheet is authored in `art/him/_draft/master.txt` and split into parts. Edit part files directly for new drawings (P5).
