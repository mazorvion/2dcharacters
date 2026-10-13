// Pixel face on a CanvasTexture (PLAN.md §5.4). 48×32 logical grid; redraws only when the
// expression, animation frame, pupil offset or icon changes.
// Note: drawn at 8 px per cell (384×256) instead of 2 px so the LED cells get visible gaps and a
// soft halo. Texture size is GPU-only (no download), so the §6.1 budget is unaffected.
import * as THREE from 'three';
import { ICONS } from '../overlay/icons';

export type Expression =
  | 'idle' | 'happy' | 'surprised' | 'thinking' | 'listening' | 'talking'
  | 'working' | 'lock' | 'love' | 'icon';

type Sprite = string[];
// 6 × 6 octagon rings with chunky cells, as on the construction sheet's face detail.
// Even-sized eye sprites centre exactly on their (integer) eye coordinates.
const EYE_RING: Sprite = ['..XX..', '.X..X.', 'X....X', 'X....X', '.X..X.', '..XX..'];
const EYE_BLINK: Sprite = ['......', '......', '......', 'XXXXXX', '......', '......'];
const EYE_HAPPY: Sprite = ['......', '..XX..', '.X..X.', 'X....X', '......', '......'];
const EYE_HEART: Sprite = ['.X..X.', 'XXXXXX', 'XXXXXX', '.XXXX.', '..XX..', '......'];
const EYE_BIG: Sprite = [
  '..XXXX..', '.X....X.', 'X......X', 'X......X', 'X......X', 'X......X', '.X....X.', '..XXXX..'];
// 4-wide pink mouth with a lighter top highlight (L)
const MOUTH: Sprite = ['XLLX', 'XXXX', '.XX.'];
const MOUTH_TALK: Sprite[] = [['.X.', 'X.X', '.X.'], ['...', 'XXX', '...']];
const MOUTH_SMILE: Sprite = ['X...X', '.XXX.'];
const MOUTH_O: Sprite = ['.X.', 'X.X', '.X.'];
const LOCK: Sprite = [
  '..XXXXX..', '.X.....X.', '.X.....X.', 'XXXXXXXXX', 'XXXX.XXXX', 'XXX...XXX', 'XXXX.XXXX', 'XXXX.XXXX', 'XXXXXXXXX'];

// ring cells of the 6×6 eye, clockwise, used by the `working` spinner gap
const RING_CELLS: [number, number][] = [
  [2, 0], [3, 0], [4, 1], [5, 2], [5, 3], [4, 4], [3, 5], [2, 5], [1, 4], [0, 3], [0, 2], [1, 1]];

const GRID_W = 48, GRID_H = 32, CELL = 8;
const EYE_COLOR = '#e6f6ff', HALO = '#58c8ff', MOUTH_COLOR = '#ff4fae', MOUTH_LIGHT = '#ffb8dd';
/** Eye centres, mouth row and the visible 28 × 17 cell window (matches the face plane aspect). */
const EYE_L = 19, EYE_R = 32, EYE_Y = 15, MOUTH_Y = 18;
/** The face centre is x = 25.5: odd-width mouths stamped at x = 25 land on it, even widths shift half a cell right. */
const MX = 25;

export class Face {
  readonly texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid = new Uint8Array(GRID_W * GRID_H); // 0 off, 1 eye, 2 mouth, 3 mouth highlight
  private key = '';
  private icons = new Map<string, Uint8Array>();
  expression: Expression = 'idle';
  icon: string | null = null;
  blinking = false;
  pupil = { x: 0, y: 0 };
  halo = true;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = GRID_W * CELL;
    this.canvas.height = GRID_H * CELL;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.anisotropy = 4;
    // show a 22 × 13.5 cell window centred on the face (x 14.5..36.5, rows 8.25..21.75):
    // eye rings ≈ 0.25 of the screen width and 0.43 of its height, as on the construction sheet
    this.texture.repeat.set(22 / GRID_W, 13.5 / GRID_H);
    this.texture.offset.set(14.5 / GRID_W, (GRID_H - 21.75) / GRID_H);
  }

  /** Rasterise channel icons once into 16×16 monochrome bitmaps for `icon` mode. */
  async loadIcons(ids: string[]) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    await Promise.all(ids.map(async (id) => {
      const icon = ICONS[id];
      if (!icon || this.icons.has(id)) return;
      const svg = icon.svg.replace(/currentColor/g, '#fff').replace('<svg ', '<svg width="16" height="16" ');
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      try { await img.decode(); } catch { return; }
      g.clearRect(0, 0, 16, 16);
      g.drawImage(img, 0, 0, 16, 16);
      const d = g.getImageData(0, 0, 16, 16).data;
      const bits = new Uint8Array(256);
      for (let i = 0; i < 256; i++) bits[i] = d[i * 4 + 3] > 90 ? 1 : 0;
      this.icons.set(id, bits);
    }));
    this.key = '';
  }

  /** Call every frame. Returns true if the texture changed. */
  update(time: number): boolean {
    const e = this.expression;
    let frame = 0;
    if (e === 'talking') frame = Math.floor(time * 8) % 2;
    else if (e === 'listening' || e === 'thinking') frame = Math.floor(time * 6) % 12;
    else if (e === 'working') frame = Math.floor(time * 12) % 12;
    const px = Math.round(this.pupil.x), py = Math.round(this.pupil.y);
    const key = `${e}|${frame}|${this.blinking ? 1 : 0}|${px},${py}|${this.icon}|${this.halo}`;
    if (key === this.key) return false;
    this.key = key;
    this.compose(e, frame, px, py);
    this.paint();
    this.texture.needsUpdate = true;
    return true;
  }

  private stamp(s: Sprite, cx: number, cy: number, v: number) {
    const h = s.length, w = s[0].length;
    const x0 = cx - Math.floor(w / 2), y0 = cy - Math.floor(h / 2);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (s[y][x] === 'X') this.set(x0 + x, y0 + y, v);
        else if (s[y][x] === 'L') this.set(x0 + x, y0 + y, 3);
  }
  /** Horizontal shift (px) of the mouth layer, so odd-width mouths centre on the face. */
  private halfShift = 0;
  private set(x: number, y: number, v: number) {
    if (x >= 0 && y >= 0 && x < GRID_W && y < GRID_H) this.grid[y * GRID_W + x] = v;
  }

  private compose(e: Expression, frame: number, px: number, py: number) {
    this.grid.fill(0);
    this.halfShift = 0;
    const L = { x: EYE_L + px, y: EYE_Y + py }, R = { x: EYE_R + px, y: EYE_Y + py };
    const M = MOUTH_Y;
    const eyes = (s: Sprite, dy = 0) => { this.stamp(s, L.x, L.y + dy, 1); this.stamp(s, R.x, R.y + dy, 1); };
    const blink = this.blinking && e !== 'icon' && e !== 'love' && e !== 'happy';

    switch (e) {
      case 'idle': eyes(blink ? EYE_BLINK : EYE_RING); this.stamp(MOUTH, MX, M, 2); this.halfShift = CELL / 2; break;
      case 'happy': eyes(EYE_HAPPY); this.stamp(MOUTH_SMILE, MX, M, 2); break;
      case 'surprised': eyes(blink ? EYE_BLINK : EYE_BIG); this.stamp(MOUTH_O, MX, M, 2); break;
      case 'love': eyes(EYE_HEART); this.stamp(MOUTH_SMILE, MX, M, 2); break;
      case 'talking': eyes(blink ? EYE_BLINK : EYE_RING); this.stamp(MOUTH_TALK[frame], MX, M, 2); break;
      case 'thinking': {
        eyes(blink ? EYE_BLINK : EYE_RING, -2);
        const active = Math.floor(frame / 3) % 4; // 0..3 → dots light up one by one
        for (let i = 0; i < 3; i++) if (i < active) { this.set(MX - 3 + i * 3, M, 2); }
        break;
      }
      case 'listening': {
        eyes(blink ? EYE_BLINK : EYE_RING);
        const h = [2, 4, 3, 5, 2, 3, 4, 1, 3, 5, 4, 2];
        for (let i = 0; i < 5; i++) {
          const bar = 1 + ((h[(frame + i * 5) % 12] + i) % 4);
          for (let y = 0; y < bar; y++) this.set(MX - 4 + i * 2, M + 1 - y, 2);
        }
        break;
      }
      case 'working': {
        for (const c of [L, R]) {
          RING_CELLS.forEach(([x, y], i) => {
            const d = (i - frame + 12) % 12;
            if (d > 2) this.set(c.x - 3 + x, c.y - 3 + y, 1);
          });
        }
        this.stamp(MOUTH, MX, M, 2); this.halfShift = CELL / 2;
        break;
      }
      case 'lock':
        eyes(blink ? EYE_BLINK : EYE_RING, -1);
        this.stamp(LOCK, MX, M + 1, 2);
        break;
      case 'icon': {
        const bits = this.icon ? this.icons.get(this.icon) : undefined;
        if (bits) {
          for (let y = 0; y < 16; y++)
            for (let x = 0; x < 16; x++) if (bits[y * 16 + x]) this.set(MX - 8 + x, 8 + y, 1);
        } else eyes(EYE_RING);
        break;
      }
    }
  }

  private paint() {
    const g = this.ctx;
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // halo: each lit cell dilated by 1 cell at 35 % alpha, blurred (fake glow, no bloom)
    if (this.halo) {
      g.save();
      g.filter = 'blur(5px)';
      for (let y = 0; y < GRID_H; y++)
        for (let x = 0; x < GRID_W; x++) {
          const v = this.grid[y * GRID_W + x];
          if (!v) continue;
          g.globalAlpha = v === 1 ? 0.22 : 0.16;
          g.fillStyle = v === 1 ? HALO : MOUTH_COLOR;
          const sx = v > 1 ? this.halfShift : 0;
          g.fillRect((x - 1) * CELL + sx, (y - 1) * CELL, CELL * 3, CELL * 3);
        }
      g.restore();
    }
    const gap = 0.55;
    for (let y = 0; y < GRID_H; y++)
      for (let x = 0; x < GRID_W; x++) {
        const v = this.grid[y * GRID_W + x];
        if (!v) continue;
        g.fillStyle = v === 1 ? EYE_COLOR : v === 3 ? MOUTH_LIGHT : MOUTH_COLOR;
        const sx = v > 1 ? this.halfShift : 0;
        g.fillRect(x * CELL + gap + sx, y * CELL + gap, CELL - gap * 2, CELL - gap * 2);
      }
  }

  dispose() { this.texture.dispose(); }
}
