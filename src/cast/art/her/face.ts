// Her face ink (CHARACTERS.md §6.3): eyes with lashes, brows, mouth and tongue traced from
// reference/duo-stage.webp, moved onto her head. Canvas bead units.
import type { FaceDef, InkVariant } from '../../types.ts';
import { centre, ellipse, move, poly, scale, stroke, type Pt } from '../../render/shapes.ts';
import { mouthSet } from '../../render/mouths.ts';

const DX = -0.6, DY = 0; // traced positions → her head
const pts = (d: string): Pt[] =>
  move([...d.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => [Number(m[1]), Number(m[2])] as Pt), DX, DY);
const ink = (d: string): InkVariant => [{ d, fill: 'ink' }];

const EYE_L = pts('M36.53 36.07 L37.04 35.99 L37.12 35.90 L37.11 34.13 L37.25 33.79 L37.21 33.58 L36.90 33.43 L36.82 33.13 L36.66 33.04 L35.73 33.06 L35.21 33.20 L35.14 33.27 L35.10 33.52 L34.72 33.68 L34.59 34.13 L34.17 34.27 L34.18 35.00 L34.34 35.10 L34.62 35.03 L34.67 34.93 L34.69 34.34 L34.86 34.20 L35.23 34.13 L35.32 33.82 L35.45 33.69 L35.73 33.62 L36.35 33.62 L36.44 33.72 L36.43 33.86 L36.04 33.96 L35.91 34.17 L35.95 35.86 L35.99 35.97 L36.13 36.04 L36.53 36.07 Z');
const EYE_R = pts('M41.38 36.11 L41.54 36.04 L41.60 35.86 L41.59 34.62 L41.50 33.92 L41.78 33.87 L42.09 34.07 L42.23 34.77 L42.57 34.76 L42.69 34.55 L42.66 33.96 L42.28 33.86 L42.20 33.55 L42.09 33.42 L41.57 33.24 L40.93 33.41 L40.83 33.82 L40.56 34.10 L40.48 34.69 L40.60 36.07 L40.74 36.13 L41.38 36.11 Z');
const MOUTH = pts('M38.61 40.05 L38.88 39.94 L39.46 39.49 L39.88 38.80 L40.00 38.11 L39.84 38.03 L38.39 37.92 L37.35 37.67 L37.07 37.70 L36.95 37.90 L36.99 38.70 L37.23 39.08 L37.35 39.47 L37.52 39.68 L37.90 39.95 L38.35 40.06 L38.61 40.05 Z');
const TONGUE = pts('M38.46 39.95 L38.25 39.96 L37.97 39.83 L37.63 39.49 L37.48 39.22 L37.43 38.98 L37.48 38.70 L37.59 38.52 L37.80 38.49 L38.77 38.61 L39.08 38.77 L39.13 39.18 L39.07 39.53 L38.77 39.83 L38.46 39.95 Z');
const BROW_L = pts('M35.05 32.13 L35.38 32.08 L35.62 31.87 L35.93 31.80 L37.21 31.79 L37.50 31.89 L37.55 31.78 L37.52 31.23 L37.42 31.15 L36.87 31.02 L35.69 31.06 L35.45 31.39 L35.03 31.46 L34.93 31.54 L34.87 32.02 L34.93 32.12 L35.05 32.13 Z');

/** Eye variants built around the traced eye (lash included). `outer` is the side the lash flicks to. */
function eyeSet(eye: Pt[], outer: -1 | 1): Record<string, InkVariant> {
  const [cx, cy] = centre(eye);
  const xs = eye.map((p) => p[0]), ys = eye.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), bottom = Math.max(...ys);
  const lid = (bend: number, y: number) => [
    { d: stroke([cx - w * 0.5, y], [cx + w * 0.5, y], bend, 0.42), fill: 'ink' as const },
    { d: stroke([cx + outer * w * 0.45, y - 0.05], [cx + outer * w * 0.75, y - 0.4], 0.05, 0.28), fill: 'ink' as const },
  ];
  return {
    open: ink(poly(eye)),
    half: ink(poly(scale(eye, 1, 0.5, [cx, bottom]))),
    closed: lid(0.3, cy + 0.6),
    happy: lid(-0.45, cy + 0.2),
    wide: ink(poly(scale(eye, 1.1, 1.1))),
    lookL: ink(poly(move(eye, -0.3, 0))),
    lookR: ink(poly(move(eye, 0.3, 0))),
    lookUp: ink(poly(move(eye, 0, -0.3))),
  };
}

function browSet(brow: Pt[] | null, a: Pt, b: Pt): Record<string, InkVariant> {
  const up = brow ? ink(poly(brow)) : ink(stroke(a, b, -0.3, 0.55));
  const base = brow ? move(brow, 0, 0.45) : null;
  return {
    up,
    neutral: base ? ink(poly(base)) : ink(stroke([a[0], a[1] + 0.45], [b[0], b[1] + 0.45], -0.2, 0.55)),
    down: ink(stroke([a[0], a[1] + 0.5], [b[0], b[1] + 0.8], 0, 0.55)),
    worried: ink(stroke([a[0], a[1] + 0.7], [b[0], b[1] + 0.2], -0.1, 0.55)),
  };
}

const OPEN_SMILE: InkVariant = [{ d: poly(MOUTH), fill: 'ink' }, { d: poly(TONGUE), fill: 'tongue' }];
const [mx, my] = centre(MOUTH);

export const HER_FACE: FaceDef = {
  eyeL: eyeSet(EYE_L, -1),
  eyeR: eyeSet(EYE_R, 1),
  browL: browSet(BROW_L, [34.3, 31.6], [37.0, 31.4]),
  browR: browSet(null, [39.2, 32.1], [41.3, 31.8]),
  mouth: mouthSet(mx, my - 0.7, 2.9, OPEN_SMILE, { openSmile: OPEN_SMILE }),
  // the nose: a short soft mark between the eyes and the mouth, plus a little shading
  nose: [
    { d: ellipse(37.9, 36.9, 0.45, 0.3), fill: 'shadow', alpha: 0.12, blur: 0.4 },
    { d: stroke([37.75, 36.55], [38.2, 37.05], 0.12, 0.28), fill: 'shadow', alpha: 0.45, blur: 0.06 },
  ],
};
