// Face-ink shape builders (CHARACTERS.md §6). Everything is in canvas bead units and returns SVG path strings,
// so variants of one feature share an anchor and swapping them never jumps.

export type Pt = [number, number];

export const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z`;

export function centre(pts: Pt[]): Pt {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

export function bbox(pts: Pt[]) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Scale points about an anchor. */
export const scale = (pts: Pt[], sx: number, sy: number, [ax, ay]: Pt = centre(pts)): Pt[] =>
  pts.map(([x, y]) => [ax + (x - ax) * sx, ay + (y - ay) * sy]);

export const move = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy]);

/**
 * A brush stroke from a to b that bows by `bend` (beads, + = down) at its middle, `thick` wide in the middle
 * and tapering toward the ends: brows, closed eyes, lashes, simple mouths.
 */
export function stroke(a: Pt, b: Pt, bend: number, thick: number, taper = 0.45, steps = 14): string {
  const [ax, ay] = a, [bx, by] = b;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len, ny = (bx - ax) / len; // unit normal (points "down" for a left→right stroke)
  const cx = mx + nx * bend * 2, cy = my + ny * bend * 2; // quadratic control point → mid-curve bows by `bend`
  const at = (t: number): Pt => [
    (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx,
    (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by,
  ];
  const top: Pt[] = [], bot: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01)), [x1, y1] = at(Math.max(0, t - 0.01));
    const tl = Math.hypot(x2 - x1, y2 - y1) || 1;
    const px = -(y2 - y1) / tl, py = (x2 - x1) / tl;
    const w = (thick / 2) * (taper + (1 - taper) * Math.sin(Math.PI * t));
    top.push([x - px * w, y - py * w]);
    bot.push([x + px * w, y + py * w]);
  }
  return poly([...top, ...bot.reverse()]);
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 24): string {
  const pts: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return poly(pts);
}

/**
 * An open mouth, w × h, whose corners sit on y = cy: the top edge bows up by `round`·h, the bottom drops by
 * (1 − round)·h. A small `round` gives the flat-topped "D" smile of the renders.
 */
export function openMouth(cx: number, cy: number, w: number, h: number, round = 0.2, steps = 20): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // top edge, left → right
    pts.push([cx - w / 2 + w * t, cy - Math.sin(Math.PI * t) * h * round]);
  }
  for (let i = 1; i < steps; i++) {
    const t = i / steps; // bottom edge, right → left
    pts.push([cx + w / 2 - w * t, cy + Math.sin(Math.PI * t) * h * (1 - round)]);
  }
  return pts;
}

/**
 * A rounded, slightly squared oval (the solid ink eyes of the renders): w × h at (cx, cy); `slant` shifts
 * the top right and the bottom left by half its value, following the head's tilt.
 */
export function pill(cx: number, cy: number, w: number, h: number, slant = 0, steps = 28): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const x = Math.sign(c) * Math.abs(c) ** 0.55 * (w / 2);
    const y = Math.sign(s) * Math.abs(s) ** 0.55 * (h / 2);
    pts.push([cx + x - (y / h) * slant, cy + y]);
  }
  return pts;
}
