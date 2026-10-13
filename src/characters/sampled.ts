// The cast, rebuilt block for block from the reference renders (scripts/extract-cast.py → sprites.gen.ts).
// The extractor also emits the rig (a part per block, joint pivots) from reference-pixel regions, so
// re-extracting never misaligns it. The reference pose is the rest pose ("hero"); other poses rotate
// parts around their joints.
//
// Body and face skin: full-size felt blocks, each with its drawn shade (seams, folds, shadow on white).
// Facial features only (eyes, brows, mouth): a layer of half-size blocks on top, as in the renders.
// Eyes are their own part so they can blink.
import type { CharacterDef, Palette, PartDef } from './blocks';
import { SPRITES } from './sprites.gen';

type Sprite = (typeof SPRITES)[keyof typeof SPRITES];

const PART_CH: Record<string, string> = { torso: 't', head: 'h', armL: 'a', armR: 'b', legL: 'l', legR: 'r' };

/**
 * Layer depth (cells). The renders are a flat relief: every part sits in one plane so nothing floats
 * apart when the figure turns. Only arms get a hair of depth so a posed arm never z-fights the torso.
 */
const DEPTH: Record<string, number> = { torso: 0, head: 0, armL: 0.02, armR: 0.02, legL: 0, legR: 0 };

/** Sprite char per material + shade: upper case = main colour, lower case = drawn shade. */
const key = (m: string, shade: string) => (shade === '0' ? m.toLowerCase() : m);

function palette(g: Sprite): Palette {
  const p: Palette = {};
  for (const [k, hex] of Object.entries(g.palette) as [string, string][]) {
    const m = k[0];
    p[key(m, k[1])] = { color: hex, flat: m === 'W', z: m === 'L' ? 0.06 : undefined };
  }
  return p;
}

function rig(name: string, g: Sprite, poses: CharacterDef['poses']): CharacterDef {
  const H = g.rows.length, W = g.rows[0].length;
  const cx = W / 2;
  const at = (p: readonly number[]): [number, number] => [p[0] - cx, H - p[1]];
  const rows = g.rows.map((row, r) => [...row].map((ch, c) => (ch === '.' ? '.' : key(ch, g.shade[r][c]))).join(''));

  const parts: Record<string, PartDef> = {};
  for (const [n, j] of Object.entries(g.joints) as [string, { pivot: readonly number[]; parent: string }][]) {
    const k = PART_CH[n];
    parts[n] = {
      rows: rows.map((row, r) => [...row].map((ch, c) => (g.parts[r][c] === k ? ch : '.')).join('')),
      pivot: [j.pivot[0], j.pivot[1]], at: at(j.pivot), parent: j.parent, z: DEPTH[n],
    };
  }

  // features: half-size blocks in 2× sprite coords, riding on the head just in front of the skin
  const head = g.joints.head.pivot;
  const eyeSet = new Set(g.eyes.map(([r, c]) => `${r},${c}`));
  const layer = (keep: (r: number, c: number) => boolean) => {
    const grid = Array.from({ length: H * 2 }, () => Array(W * 2).fill('.'));
    for (const [r, c, ch] of g.fine as readonly (readonly [number, number, string])[]) if (keep(r, c)) grid[r][c] = ch;
    return grid.map((row) => row.join(''));
  };
  const pivot2: [number, number] = [head[0] * 2, head[1] * 2];
  parts.features = { rows: layer((r, c) => !eyeSet.has(`${r},${c}`)), pivot: pivot2, at: at(head), parent: 'head', z: 0.5, cell: 0.5, tile: true };
  // eyes pivot on their own centre so a blink squashes them in place
  let er = 0, ec = 0;
  for (const [r, c] of g.eyes) { er += r + 0.5; ec += c + 0.5; }
  er /= Math.max(1, g.eyes.length); ec /= Math.max(1, g.eyes.length);
  parts.eyes = {
    rows: layer((r, c) => eyeSet.has(`${r},${c}`)).map((row) => row),
    pivot: [ec, er], at: at([ec / 2, er / 2]), parent: 'head', z: 0.5, cell: 0.5, tile: true,
  };
  return { name, palette: palette(g), parts, poses };
}

export const HIM = rig('him', SPRITES.him, {
  hero: {},
  wave: { armR: [0, 0, 72], head: [0, 0, 3] },
  talk: { armR: [0, 0, 14], head: [0, 0, -3], torso: [0, 0, -1] },
});

export const HER = rig('her', SPRITES.her, {
  hero: {},
  wave: { armR: [0, 0, 38], armL: [0, 0, -10], head: [0, 0, -3] },
  talk: { armL: [0, 0, 8], armR: [0, 0, -8], head: [0, 0, 3] },
});

export const CAST = { him: HIM, her: HER };
