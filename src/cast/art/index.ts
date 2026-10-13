// Loads every part drawing: art/<char>/<part>.<drawing>.txt. Editing a grid hot-reloads the studio.
import { parseGrid, type Grid } from '../grid.ts';
import type { CharId, PartName } from '../types.ts';
import type { Drawings } from '../render/compose.ts';

const files = import.meta.glob(['./*/*.txt', '!./*/_draft/**'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const DRAWINGS: Record<CharId, Drawings> = { him: {}, her: {} };

for (const [file, raw] of Object.entries(files)) {
  const m = /^\.\/(him|her)\/(\w+)\.(\w+)\.txt$/.exec(file);
  if (!m) continue;
  const [, char, part, name] = m as unknown as [string, CharId, PartName, string];
  const grid: Grid = parseGrid(`${char}/${part}.${name}`, raw);
  (DRAWINGS[char][part] ??= {})[name] = grid;
}
