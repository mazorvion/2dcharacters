// The reference render, aligned to a character's bead canvas (dev only: the image is not in the build).
import type { Rig } from '../types.ts';

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error(`could not load ${src}`));
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws the reference so its pixels line up with the character's canvas at S px per bead.
 * (x, y) is where canvas cell (0,0) lands; `box` (beads) limits what is drawn.
 */
export function drawReference(ctx: Ctx, img: HTMLImageElement, rig: Rig, S: number, x: number, y: number,
  box: [number, number, number, number] = [0, 0, 80, 96]) {
  const { beadPx, cell0 } = rig.ref;
  const [c0, r0, c1, r1] = box;
  const sx = cell0[0] + c0 * beadPx, sy = cell0[1] + r0 * beadPx;
  const sw = (c1 - c0) * beadPx, sh = (r1 - r0) * beadPx;
  ctx.drawImage(img, sx, sy, sw, sh, x + c0 * S, y + r0 * S, (c1 - c0) * S, (r1 - r0) * S);
}

/** Coarse colour class of the reference under every bead: '.', 'K', 'B', 'W', 'L'. */
export function referenceClasses(img: HTMLImageElement, rig: Rig): string[] {
  const { beadPx: p, cell0 } = rig.ref;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const rows: string[] = [];
  for (let r = 0; r < 96; r++) {
    let row = '';
    for (let col = 0; col < 80; col++) {
      const x0 = Math.round(cell0[0] + (col + 0.25) * p), x1 = Math.round(cell0[0] + (col + 0.75) * p);
      const y0 = Math.round(cell0[1] + (r + 0.25) * p), y1 = Math.round(cell0[1] + (r + 0.75) * p);
      const n: Record<string, number> = { '.': 0, K: 0, B: 0, W: 0, L: 0 };
      let total = 0;
      for (let y = Math.max(0, y0); y < Math.min(c.height, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(c.width, x1); x++) {
          const i = (y * c.width + x) * 4;
          const R = data[i], G = data[i + 1], B = data[i + 2];
          const lum = 0.299 * R + 0.587 * G + 0.114 * B;
          let k = 'W';
          // cobalt by hue (lit bead tops stay cobalt); background by warmth (lit white felt is neutral)
          if (B > R + 30 && B > G + 20) k = 'B';
          else if (G > 150 && R > 120 && B < 110 && G > B + 80) k = 'L';
          else if (lum > 225 && R - B >= 6) k = '.';
          else if (lum < 115) k = 'K';
          n[k]++; total++;
        }
      }
      if (!total) { row += '.'; continue; }
      row += Object.entries(n).sort((a, b) => b[1] - a[1])[0][0];
    }
    rows.push(row);
  }
  return rows;
}

/** Coarse class of a grid character, for comparing with referenceClasses. */
export const coarse = (ch: string) =>
  ch === '.' ? '.' : 'Kko'.includes(ch) || ch === 'O' ? 'K' : 'Bbc'.includes(ch) ? 'B' : 'Ll'.includes(ch) ? 'L' : 'W';
