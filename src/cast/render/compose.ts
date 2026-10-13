// Draws one posed character (CHARACTERS.md §8.2): cached part bitmaps, relief shadows, face ink.
// Bead layers only ever move by whole beads and are never rotated or scaled (D5).
import { CANVAS_H, CANVAS_W, BASELINE, bounds, cellOf, mirrorRows, type Grid } from '../grid.ts';
import type { FrameState, PartName, Rig } from '../types.ts';
import { drawFace } from './ink.ts';
import { makeCanvas, renderLayer, silhouette, type Layer } from './beads.ts';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Canvas = HTMLCanvasElement | OffscreenCanvas;

/** Part drawings of one character: part → drawing name → grid. */
export type Drawings = Partial<Record<PartName, Record<string, Grid>>>;

const MARGIN = 2; // beads around the 80 × 96 canvas, for shadows and offsets

export interface DrawOptions {
  /** Relief shadow of front parts onto the parts behind (default off). */
  relief?: boolean;
  /** Soft contact shadow on the ground under the shoes (default on). */
  ground?: boolean;
  /** Only draw these parts (studio part isolation). */
  only?: PartName[];
  /** Tint each part a flat colour (studio "parts" overlay). */
  tintParts?: boolean;
  /** Skip the face ink. */
  noFace?: boolean;
}

const PART_TINT: Record<PartName, string> = {
  hairBack: '#8a5cff', head: '#ff9a3d', hairFront: '#c03dff', torso: '#2fbf71', earring: '#ffe03d',
  armScreenL: '#3db5ff', armScreenR: '#ff4f8b', legScreenL: '#00a3a3', legScreenR: '#a36b00',
  features: '#000000', eyes: '#000000',
};

export class CharacterRenderer {
  private layers = new Map<string, { layer: Layer; shadow: Canvas } | null>();
  private frame: Canvas | null = null;

  constructor(readonly rig: Rig, readonly drawings: Drawings) {}

  drawingNames(part: PartName): string[] {
    return Object.keys(this.drawings[part] ?? {});
  }

  /** Rows of a part drawing, mirrored when flipped. */
  rows(part: PartName, name: string, flip: boolean): string[] | null {
    const g = this.drawings[part]?.[name];
    if (!g) return null;
    return flip ? mirrorRows(g.rows) : g.rows;
  }

  /** Bead size of a drawing in canvas beads (1, or 0.5 for the half-size face blocks). */
  cell(part: PartName, name: string): number {
    const g = this.drawings[part]?.[name];
    return g ? cellOf(g) : 1;
  }

  private layer(part: PartName, name: string, S: number, flip: boolean) {
    const key = `${part}.${name}@${S}${flip ? 'f' : ''}`;
    if (!this.layers.has(key)) {
      const rows = this.rows(part, name, flip);
      const s = Math.max(1, Math.round(S * this.cell(part, name)));
      const layer = rows && renderLayer(rows, s, `${this.rig.id}/${part}.${name}${flip ? 'f' : ''}`);
      this.layers.set(key, layer ? { layer, shadow: silhouette(layer) } : null);
    }
    return this.layers.get(key) ?? null;
  }

  /** The drawing a part uses in this frame. */
  drawingFor(part: PartName, state: FrameState): string | undefined {
    if (state.flip && this.rig.flipDrawings?.[part]) return this.rig.flipDrawings[part];
    return state.drawings[part] ?? this.rig.rest[part];
  }

  offsetOf(part: PartName, state: FrameState): [number, number] {
    let dx = 0, dy = 0;
    for (const [g, parts] of Object.entries(this.rig.groups)) {
      if (!parts.includes(part)) continue;
      const o = state.offsets[g];
      if (o) { dx += o[0]; dy += o[1]; }
    }
    return [state.flip ? -dx : dx, dy];
  }

  /**
   * Draws the character so canvas cell (0,0)'s top-left corner lands at (x, y) px in `ctx`.
   * Renders into a private bitmap first so relief shadows only fall on the character itself.
   */
  draw(ctx: Ctx, state: FrameState, S: number, x: number, y: number, opt: DrawOptions = {}) {
    const W = (CANVAS_W + MARGIN * 2) * S, H = (CANVAS_H + MARGIN * 2) * S;
    if (!this.frame || this.frame.width !== W || this.frame.height !== H) this.frame = makeCanvas(W, H);
    const f = this.frame.getContext('2d') as Ctx;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, W, H);
    const relief = opt.relief === true && !opt.tintParts; // off by default: it drew seams where parts meet
    for (const part of this.rig.order) {
      if (opt.only && !opt.only.includes(part)) continue;
      const name = this.drawingFor(part, state);
      const l = name ? this.layer(part, name, S, state.flip) : null;
      if (l) {
        const [dx, dy] = this.offsetOf(part, state);
        const k = this.cell(part, name!);
        const px = (l.layer.c0 * k + dx + MARGIN) * S, py = (l.layer.r0 * k + dy + MARGIN) * S;
        if (relief && k === 1) {
          // the part's soft shadow lands only on what is already drawn (the parts behind it)
          f.save();
          f.globalCompositeOperation = 'source-atop';
          f.shadowColor = 'rgba(0,0,0,0.22)';
          f.shadowBlur = 0.5 * S;
          f.shadowOffsetX = 0.12 * S + 100000;
          f.shadowOffsetY = 0.18 * S;
          f.drawImage(l.shadow, px - 100000, py);
          f.restore();
        }
        if (opt.tintParts) {
          f.save();
          f.drawImage(l.shadow, px, py);
          f.globalCompositeOperation = 'source-atop';
          f.fillStyle = PART_TINT[part];
          f.globalAlpha = 0.85;
          f.fillRect(px, py, l.layer.canvas.width, l.layer.canvas.height);
          f.restore();
        } else {
          f.drawImage(l.layer.canvas, px, py);
        }
      }
      if (part === this.rig.faceAfter && !opt.noFace && !opt.tintParts) {
        const [dx, dy] = this.offsetOf('head', state);
        f.save();
        if (state.flip) { f.translate((CANVAS_W + MARGIN * 2) * S, 0); f.scale(-1, 1); }
        drawFace(f, this.rig.face, state.face, S, dx * (state.flip ? -1 : 1) + MARGIN, dy + MARGIN);
        f.restore();
      }
    }
    if (opt.ground !== false) this.drawGround(ctx, state, S, x, y);
    ctx.drawImage(this.frame, x - MARGIN * S, y - MARGIN * S);
  }

  /** Soft contact shadow under the shoes. */
  private drawGround(ctx: Ctx, state: FrameState, S: number, x: number, y: number) {
    let c0 = Infinity, c1 = -Infinity;
    for (const part of ['legScreenL', 'legScreenR'] as PartName[]) {
      const name = this.drawingFor(part, state);
      const rows = name && this.rows(part, name, state.flip);
      const b = rows && bounds(rows);
      if (!b) continue;
      const [dx] = this.offsetOf(part, state);
      c0 = Math.min(c0, b[0] + dx); c1 = Math.max(c1, b[2] + dx);
    }
    if (!isFinite(c0)) return;
    const cx = x + ((c0 + c1) / 2) * S, cy = y + BASELINE * S + 0.8 * S;
    const rx = ((c1 - c0) / 2 + 3) * S, ry = 1.6 * S;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(40,30,20,0.20)');
    g.addColorStop(0.6, 'rgba(40,30,20,0.10)');
    g.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
