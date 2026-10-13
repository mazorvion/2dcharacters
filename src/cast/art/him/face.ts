// Him's face ink (CHARACTERS.md §6.2). Canvas bead units. Eyes and smile were traced from
// reference/duo-stage.webp (scripts/cast tracing, P4); everything else is built around the same anchors.
import type { FaceDef, InkVariant } from '../../types.ts';
import { ellipse, move, pill, poly, stroke, type Pt } from '../../render/shapes.ts';
import { mouthSet } from '../../render/mouths.ts';

const ink = (d: string): InkVariant => [{ d, fill: 'ink' }];

function eyeSet(cx: number, cy: number, w: number, h: number, slant: number): Record<string, InkVariant> {
  const shape = (dx = 0, dy = 0, sw = 1, sh = 1) => ink(poly(pill(cx + dx, cy + dy, w * sw, h * sh, slant)));
  const lidY = cy + h * 0.28;
  return {
    open: shape(),
    half: ink(poly(pill(cx - slant * 0.12, cy + h * 0.24, w, h * 0.5, slant * 0.5))),
    closed: ink(stroke([cx - w * 0.75, lidY - 0.1], [cx + w * 0.75, lidY - 0.1], 0.22, 0.36)),
    happy: ink(stroke([cx - w * 0.8, cy + 0.2], [cx + w * 0.8, cy + 0.2], -0.45, 0.4)),
    wide: shape(0, 0, 1.15, 1.12),
    lookL: shape(-0.3, 0),
    lookR: shape(0.3, 0),
    lookUp: shape(0.05, -0.3),
  };
}

function browSet(a: Pt, b: Pt, inner: 'a' | 'b'): Record<string, InkVariant> {
  const t = 0.55;
  const lift = (p: Pt, dy: number): Pt => [p[0], p[1] + dy];
  const inA = inner === 'a';
  return {
    neutral: ink(stroke(a, b, -0.32, t)),
    up: ink(stroke(lift(a, -0.5), lift(b, -0.5), -0.42, t)),
    // angry/focused: the inner end drops; worried: the inner end rises
    down: ink(stroke(lift(a, inA ? 0.35 : -0.1), lift(b, inA ? -0.1 : 0.35), -0.05, t)),
    worried: ink(stroke(lift(a, inA ? -0.45 : 0.1), lift(b, inA ? 0.1 : -0.45), -0.1, t)),
  };
}

// traced smile (with its little hook at the right end)
const SMILE: Pt[] = [[48.71, 30.91], [49.31, 30.58], [49.72, 30.5], [49.78, 30.4], [49.76, 30.25], [49.24, 30.15],
  [49.04, 30.4], [48.89, 30.44], [47.93, 30.31], [47.08, 29.88], [46.88, 29.5], [46.58, 29.44], [46.44, 29.53],
  [46.41, 29.81], [46.75, 30.08], [46.83, 30.36], [46.92, 30.46], [47.88, 30.81]];

const MOUTH = mouthSet(48.1, 29.95, 3.2, ink(poly(SMILE)), { smile: ink(poly(SMILE)), smileUp: ink(poly(move(SMILE, 0, -0.1))) });

export const HIM_FACE: FaceDef = {
  eyeL: eyeSet(47.1, 26.35, 1.2, 2.5, 0.45),
  eyeR: eyeSet(51.25, 26.95, 1.1, 2.45, 0.5),
  browL: browSet([45.2, 24.55], [47.8, 23.8], 'b'),
  browR: browSet([50.5, 24.6], [52.8, 24.35], 'a'),
  mouth: MOUTH,
  nose: [{ d: ellipse(49.05, 28.55, 0.45, 0.3), fill: 'shadow', alpha: 0.16, blur: 0.45 }],
};
