// cast:lint (CHARACTERS.md §10.2): checks every part drawing in src/cast/art/<char>/.
//   npm run cast:lint            → problems as `file:line:col (row,col) message`; exits 1 if any
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseGrid, GridError, CANVAS_W, CANVAS_H, type Grid } from '../../src/cast/grid.ts';
import { HIM } from '../../src/cast/art/him/rig.ts';
import { HER } from '../../src/cast/art/her/rig.ts';
import type { PartName, Rig } from '../../src/cast/types.ts';

const ART = 'src/cast/art';
const problems: string[] = [];
const SKIN_PARTS: PartName[] = ['head', 'armScreenL', 'armScreenR'];

function headerLines(raw: string) {
  let n = 0;
  for (const line of raw.split('\n')) {
    if (!line.startsWith('#')) break;
    n++;
  }
  return n;
}

function allowedDetails(char: string): Set<string> {
  const f = join(ART, char, 'details.md');
  const s = new Set<string>();
  if (!existsSync(f)) return s;
  for (const m of readFileSync(f, 'utf8').matchAll(/(\w+\.\w+)\s+(\d+),(\d+)/g)) s.add(`${m[1]} ${m[2]},${m[3]}`);
  return s;
}

function lintChar(rig: Rig) {
  const dir = join(ART, rig.id);
  const grids = new Map<string, { grid: Grid; file: string; head: number }>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.txt')).sort()) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const id = f.replace(/\.txt$/, '');
    try {
      grids.set(id, { grid: parseGrid(`${rig.id}/${id}`, raw), file: join(dir, f), head: headerLines(raw) });
    } catch (e) {
      problems.push(`${join(dir, f)}: ${e instanceof GridError ? e.message : String(e)}`);
    }
  }
  const allowed = allowedDetails(rig.id);
  const at = (rows: string[], r: number, c: number) => rows[r]?.[c] ?? '.';
  const report = (id: string, r: number, c: number, msg: string) => {
    const g = grids.get(id)!;
    problems.push(`${g.file}:${g.head + r + 1}:${c + 1} (${r},${c}) ${msg}`);
  };

  // 1. orphans: a bead with no 8-neighbour of the same character
  for (const [id, { grid }] of grids) {
    grid.rows.forEach((row, r) => {
      for (let c = 0; c < CANVAS_W; c++) {
        const ch = row[c];
        if (ch === '.' || allowed.has(`${id} ${r},${c}`)) continue;
        let same = false;
        for (let dy = -1; dy <= 1 && !same; dy++) for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && at(grid.rows, r + dy, c + dx) === ch) { same = true; break; }
        }
        if (!same) report(id, r, c, `orphan '${ch}' (list it in details.md if intended)`);
      }
    });
  }

  // 2. the rest pose, flattened: skin must be outlined, outlines must touch something
  const owner: (PartName | null)[][] = Array.from({ length: CANVAS_H }, () => Array(CANVAS_W).fill(null));
  const flat: string[][] = Array.from({ length: CANVAS_H }, () => Array(CANVAS_W).fill('.'));
  for (const part of rig.order) {
    const name = rig.rest[part];
    const g = name && grids.get(`${part}.${name}`);
    if (!g) {
      if (name) problems.push(`${dir}: rest drawing ${part}.${name}.txt is missing`);
      continue;
    }
    g.grid.rows.forEach((row, r) => {
      for (let c = 0; c < CANVAS_W; c++) if (row[c] !== '.') { flat[r][c] = row[c]; owner[r][c] = part; }
    });
  }
  const f = (r: number, c: number) => flat[r]?.[c] ?? '.';
  for (let r = 0; r < CANVAS_H; r++) {
    for (let c = 0; c < CANVAS_W; c++) {
      const ch = flat[r][c], part = owner[r][c];
      if (!part) continue;
      const id = `${part}.${rig.rest[part]}`;
      if ('Wwg'.includes(ch) && SKIN_PARTS.includes(part)) {
        for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (f(r + dy, c + dx) === '.') { report(id, r, c, `skin '${ch}' touches the background without an outline`); break; }
        }
      }
      if (ch === 'O') {
        let touches = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const n = f(r + dy, c + dx);
          if ((dx || dy) && n !== '.' && n !== 'O') touches = true;
        }
        if (!touches) report(id, r, c, 'floating outline (no bead it outlines)');
      }
    }
  }

  // 3. arm drawings meet the torso where the rest drawing does
  for (const part of ['armScreenL', 'armScreenR'] as PartName[]) {
    const box = rig.sockets?.[part];
    const rest = grids.get(`${part}.${rig.rest[part]}`);
    if (!box || !rest) continue;
    const [c0, r0, c1, r1] = box;
    for (const [id, { grid }] of grids) {
      if (!id.startsWith(`${part}.`) || grid === rest.grid) continue;
      outer: for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
        if (grid.rows[r][c] !== rest.grid.rows[r][c]) { report(id, r, c, `shoulder differs from ${part}.${rig.rest[part]}`); break outer; }
      }
    }
  }
}

for (const rig of [HIM, HER]) if (existsSync(join(ART, rig.id))) lintChar(rig);

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log('cast:lint clean');
