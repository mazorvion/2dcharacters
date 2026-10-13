// Text grids (CHARACTERS.md §5.2): every drawing is a full 80 × 96 canvas, one character per bead.
// No DOM and no Vite APIs here, so scripts/cast/lint.ts can reuse it under Node.
import { BEAD_CHARS } from './palette.ts';

export const CANVAS_W = 80;
export const CANVAS_H = 96;
export const BASELINE = 93;

export interface Grid {
  /** e.g. 'him/armScreenR.present' */
  id: string;
  meta: Record<string, string>;
  rows: string[];
}

export class GridError extends Error {}

export function parseGrid(id: string, raw: string): Grid {
  const meta: Record<string, string> = {};
  const rows: string[] = [];
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  lines.forEach((line, i) => {
    if (line.startsWith('#')) {
      const m = /^#\s*([\w-]+)\s*:\s*(.*)$/.exec(line);
      if (m) meta[m[1]] = m[2].trim();
      return;
    }
    if (line === '' && i >= lines.length - 1) return;
    rows.push(line);
  });
  // half-size grids (`# cell: 0.5`, the original face blocks) cover the same canvas at twice the resolution
  const k = cellOf({ id, meta, rows }) === 0.5 ? 2 : 1;
  if (rows.length !== CANVAS_H * k) throw new GridError(`${id}: ${rows.length} rows, expected ${CANVAS_H * k}`);
  rows.forEach((row, r) => {
    if (row.length !== CANVAS_W * k) throw new GridError(`${id}:${r + 1}: ${row.length} columns, expected ${CANVAS_W * k}`);
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch !== '.' && !BEAD_CHARS.includes(ch)) throw new GridError(`${id}:${r + 1}:${c + 1}: unknown character '${ch}'`);
    }
  });
  return { id, meta, rows };
}

/** Bead size of a grid in canvas beads: 1, or 0.5 for half-size grids. */
export function cellOf(g: Grid): number {
  return g.meta.cell === '0.5' ? 0.5 : 1;
}

/** Bounding box of the beads in a grid: [c0, r0, c1, r1) or null when empty. */
export function bounds(rows: string[]): [number, number, number, number] | null {
  let c0 = Infinity, r0 = Infinity, c1 = -1, r1 = -1;
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '.') continue;
      c0 = Math.min(c0, c); c1 = Math.max(c1, c + 1);
      r0 = Math.min(r0, r); r1 = Math.max(r1, r + 1);
    }
  });
  return c1 < 0 ? null : [c0, r0, c1, r1];
}

export function mirrorRows(rows: string[]): string[] {
  return rows.map((row) => [...row].reverse().join(''));
}

/** Small stable hash for seeding per-bead variation (FNV-1a). */
export function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded PRNG (mulberry32). Never use Math.random in the cast (CHARACTERS.md D9). */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
