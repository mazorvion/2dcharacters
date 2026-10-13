// Bead materials and ink (CHARACTERS.md §4.1). The single place cast colours live.
// Base colours were sampled from reference/duo-stage.webp; tune the renderer, never the art, to match them.

export type MaterialKind = 'dark' | 'white';

export interface Material {
  /** Mid tone of a bead. */
  base: string;
  /** Colour of the groove between two beads of this material. */
  groove: string;
  kind: MaterialKind;
  name: string;
}

export const MATERIALS: Record<string, Material> = {
  K: { name: 'charcoal', base: '#322c2d', groove: '#161213', kind: 'dark' },
  k: { name: 'charcoal-deep', base: '#1f1a1b', groove: '#100c0d', kind: 'dark' },
  O: { name: 'outline', base: '#322c2d', groove: '#161213', kind: 'dark' },
  W: { name: 'white', base: '#efeeec', groove: '#d6d3d0', kind: 'white' },
  w: { name: 'white-shade', base: '#d9d6d3', groove: '#bdb9b6', kind: 'white' },
  g: { name: 'white-deep', base: '#bdb9b6', groove: '#a29e9b', kind: 'white' },
  B: { name: 'cobalt', base: '#0632ea', groove: '#06178a', kind: 'dark' },
  b: { name: 'cobalt-deep', base: '#0b1f9e', groove: '#050f5c', kind: 'dark' },
  c: { name: 'cobalt-light', base: '#3a5cf0', groove: '#1a2fb0', kind: 'dark' },
  L: { name: 'lime', base: '#cbee32', groove: '#8fa816', kind: 'dark' },
  l: { name: 'lime-deep', base: '#a3c21c', groove: '#6f8510', kind: 'dark' },
};

/** Grid characters that are beads ('.' is empty). */
export const BEAD_CHARS = Object.keys(MATERIALS).join('');

export const INK = {
  ink: '#1b1718',
  tongue: '#f08aa8',
  tongueDeep: '#d86f8e',
  teeth: '#f7f5f2',
};

export const BACKGROUND = {
  studio: '#f6f4ef', // --ground
  film: '#fefbf5', // the reference cream
};
