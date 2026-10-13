// Face ink (CHARACTERS.md §6.4): smooth shapes printed on the head beads, never snapped to the grid.
import { INK } from '../palette.ts';
import type { FaceDef, FaceState, InkVariant } from '../types.ts';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const pathCache = new Map<string, Path2D>();
const path = (d: string) => {
  let p = pathCache.get(d);
  if (!p) pathCache.set(d, (p = new Path2D(d)));
  return p;
};

/** Off-canvas distance (beads) for drawing only a shape's blurred shadow. */
const AWAY = 1000;

function drawVariant(ctx: Ctx, v: InkVariant | undefined, S: number, dx: number, dy: number) {
  if (!v) return;
  for (const s of v) {
    ctx.save();
    ctx.translate(dx * S, dy * S);
    ctx.scale(S, S);
    if (s.clip) ctx.clip(path(s.clip));
    if (s.fill === 'shadow') {
      // a soft shadow (the nose): only the blur of the shape lands, the shape itself is drawn far away
      ctx.globalCompositeOperation = 'multiply';
      ctx.shadowColor = `rgba(0,0,0,${s.alpha ?? 0.1})`;
      ctx.shadowBlur = (s.blur ?? 0.5) * S;
      ctx.shadowOffsetX = AWAY * S;
      ctx.translate(-AWAY, 0);
      ctx.fillStyle = '#000';
    } else {
      // printed, not vector-sharp: a hair of blur. Ink multiplies so bead grooves show through faintly;
      // the tongue is opaque colour over the ink of the mouth.
      const colour = INK[s.fill];
      ctx.globalCompositeOperation = s.fill === 'ink' ? 'multiply' : 'source-over';
      ctx.globalAlpha = s.alpha ?? (s.fill === 'ink' ? 0.96 : 1);
      ctx.shadowColor = colour;
      ctx.shadowBlur = 0.05 * S;
      ctx.fillStyle = colour;
    }
    ctx.fill(path(s.d));
    ctx.restore();
  }
}

/** Draws the face for `state`, with the head group's offset (dx, dy) in beads. */
export function drawFace(ctx: Ctx, face: FaceDef, state: FaceState, S: number, dx: number, dy: number) {
  const [lx, ly] = state.look ?? [0, 0];
  drawVariant(ctx, face.nose, S, dx, dy);
  drawVariant(ctx, face.browL[state.browL] ?? face.browL.neutral, S, dx + lx / 2, dy + ly / 2);
  drawVariant(ctx, face.browR[state.browR] ?? face.browR.neutral, S, dx + lx / 2, dy + ly / 2);
  drawVariant(ctx, face.eyeL[state.eyeL] ?? face.eyeL.open, S, dx + lx, dy + ly);
  drawVariant(ctx, face.eyeR[state.eyeR] ?? face.eyeR.open, S, dx + lx, dy + ly);
  drawVariant(ctx, face.mouth[state.mouth], S, dx, dy);
}
