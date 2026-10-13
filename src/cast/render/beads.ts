// Bead stamps and bead layers (CHARACTERS.md §8.1). A stamp is one felt bead at S px, with its groove;
// a layer is a whole grid rendered once per S and cached as a bitmap.
import { MATERIALS, type Material } from '../palette.ts';
import { bounds, hash, prng } from '../grid.ts';

/** Stamps per material: different felt noise and ±2.5% brightness, picked per bead by a stable hash. */
const VARIANTS = 12;
/** Bead inset per side and corner radius, as fractions of the pitch (tuned against reference/cast/*). */
const INSET = 0.012;
const RADIUS = 0.24;

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): Canvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
}

const ctx2d = (c: Canvas) => c.getContext('2d') as Ctx;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const css = ([r, g, b]: number[], a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const scale = (c: number[], k: number) => c.map((v) => Math.max(0, Math.min(255, v * k)));
const lighten = (c: number[], k: number) => c.map((v) => v + (255 - v) * k);

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** One bead (no groove) at S px. */
function drawStamp(m: Material, S: number, variant: number): Canvas {
  const c = makeCanvas(S, S);
  const ctx = ctx2d(c);
  const rand = prng(hash('stamp', m.name, S, variant));
  const shade = 1 + (rand() - 0.5) * 0.05;
  const base = scale(rgb(m.base), shade);
  // beads nearly touch: the groove mostly shows as dark dots where four rounded corners meet
  const inset = INSET * S, r = RADIUS * S, w = S - inset * 2;
  const white = m.kind === 'white';
  // pillowy felt: lit from the top-left, rolling off darker toward the edges
  const g = ctx.createRadialGradient(0.38 * S, 0.34 * S, 0.05 * S, 0.5 * S, 0.5 * S, 0.72 * S);
  g.addColorStop(0, css(white ? lighten(base, 0.3) : lighten(base, 0.12)));
  g.addColorStop(0.55, css(base));
  g.addColorStop(1, css(white ? scale(base, 0.94) : scale(base, 0.8)));
  roundRect(ctx, inset, inset, w, w, r);
  ctx.fillStyle = g;
  ctx.fill();
  // felt: multiplicative value noise, part of the stamp so it never shimmers
  if (S >= 6) {
    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    const amp = white ? 0.02 : 0.035;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const k = 1 + (rand() - 0.5) * 2 * amp;
      d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
    }
    ctx.putImageData(img, 0, 0);
  }
  return c;
}

const stampCache = new Map<string, Canvas[]>();
function stamps(ch: string, S: number): Canvas[] {
  const key = `${ch}@${S}`;
  let s = stampCache.get(key);
  if (!s) {
    const m = MATERIALS[ch];
    s = Array.from({ length: VARIANTS }, (_, v) => drawStamp(m, S, v));
    stampCache.set(key, s);
  }
  return s;
}

export interface Layer {
  canvas: Canvas;
  /** Canvas-bead position of the bitmap's top-left corner. */
  c0: number;
  r0: number;
}

const PAD = 1; // beads of margin around the bitmap, room for the relief shadow

/** Renders a grid to a cropped bitmap at S px per bead. `seed` keeps the per-bead variation stable. */
export function renderLayer(rows: string[], S: number, seed: string): Layer | null {
  const b = bounds(rows);
  if (!b) return null;
  const [bc0, br0, bc1, br1] = b;
  const c0 = bc0 - PAD, r0 = br0 - PAD;
  const canvas = makeCanvas((bc1 - bc0 + PAD * 2) * S, (br1 - br0 + PAD * 2) * S);
  const ctx = ctx2d(canvas);
  const at = (r: number, c: number) => (rows[r]?.[c] ?? '.');
  // grooves first: each bead's full square in its groove colour, so grooves read as dark corner dots inside a
  // region and parts that meet leave no seam
  for (let r = br0; r < br1; r++) {
    for (let c = bc0; c < bc1; c++) {
      const ch = at(r, c);
      if (ch === '.') continue;
      ctx.fillStyle = MATERIALS[ch].groove;
      ctx.fillRect((c - c0) * S, (r - r0) * S, S, S);
    }
  }
  // then the beads
  for (let r = br0; r < br1; r++) {
    for (let c = bc0; c < bc1; c++) {
      const ch = at(r, c);
      if (ch === '.') continue;
      const v = hash(seed, c, r) % VARIANTS;
      ctx.drawImage(stamps(ch, S)[v], (c - c0) * S, (r - r0) * S);
    }
  }
  return { canvas, c0, r0 };
}

/** Pure-black silhouette of a layer, for the relief shadow. */
export function silhouette(layer: Layer): Canvas {
  const c = makeCanvas(layer.canvas.width, layer.canvas.height);
  const ctx = ctx2d(c);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

export function clearStampCache() {
  stampCache.clear();
}
