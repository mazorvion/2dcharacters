// Block characters: pixel-art sprites built from felt blocks, assembled into a jointed rig.
//
// Design language (reference/duo-stage.webp, reference/duo-poster.webp):
// - hair, clothes and outlines are chunky felt cubes (1 cell)
// - skin and white fabric are a finer 2 × 2 grid of half-size blocks
// - facial features sit on that fine grid, slightly raised, so they read smoother than the body
// - layers have depth: hair stands proud of the face, an open shirt sits over the tee, etc.
//
// A character is a tree of joints. Every part is its own sprite with a pivot, so posing and later
// animation only ever rotate joints (see Rig.setPose / Rig.joints).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { makeFeltNormal } from '../scene/materials';

export interface Swatch {
  color: string;
  /** Render this colour as a 2 × 2 grid of half-size blocks. */
  fine?: boolean;
  /** Flatter, tighter blocks: white felt in the renders reads as a smooth panel with tiny corner dots. */
  flat?: boolean;
  /** Push blocks of this colour toward (+) or away from (−) the viewer, in cells. */
  z?: number;
}
export type Palette = Record<string, Swatch>;

export interface PartDef {
  /** Rows top → bottom; '.' or ' ' is empty, any other char is a palette key. */
  rows: string[];
  /** Pivot inside the sprite, in its own cells (x right, y down from the top-left corner). */
  pivot: [number, number];
  /** Where the pivot sits in character space at rest (cells; x right, y up from the ground). */
  at: [number, number];
  /** Parent joint name ('root' for the top of the tree). */
  parent: string;
  /** Layer depth in cells (+ toward the viewer). */
  z?: number;
  /** Cell size: 1 for body parts, 0.5 for facial features drawn on the fine grid. */
  cell?: number;
  /** Feature tiles are thin raised tiles instead of cubes. */
  tile?: boolean;
  /** Per-part depth by colour, e.g. hair blocks stand proud of the face. */
  zBy?: Record<string, number>;
}

export interface CharacterDef {
  name: string;
  palette: Palette;
  parts: Record<string, PartDef>;
  /** Named poses: joint → Euler degrees [x, y, z]. Missing joints are at rest. */
  poses: Record<string, Record<string, [number, number, number]>>;
}

/** Mirror a sprite horizontally (left arm → right arm). */
export const mirror = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
export const mirrorPivot = (rows: string[], p: [number, number]): [number, number] => [rows[0].length - p[0], p[1]];

// ---------------------------------------------------------------- shared resources

let shared: {
  cube: THREE.BufferGeometry; fine: THREE.BufferGeometry; tile: THREE.BufferGeometry; flat: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  normal: THREE.Texture; mats: Map<string, THREE.MeshPhysicalMaterial>; backMats: Map<string, THREE.MeshStandardMaterial>;
} | null = null;

function resources() {
  if (shared) return shared;
  const normal = makeFeltNormal(256);
  normal.repeat.set(1, 1);
  shared = {
    // dense felt blocks: tight grooves between neighbours, softly rounded edges
    cube: new RoundedBoxGeometry(0.975, 0.975, 0.92, 3, 0.13),
    fine: new RoundedBoxGeometry(0.475, 0.475, 0.92, 2, 0.07),
    // feature tiles touch their neighbours, so strokes read as smooth lines on the fine grid
    tile: new RoundedBoxGeometry(0.5, 0.5, 0.2, 2, 0.08),
    flat: new RoundedBoxGeometry(0.99, 0.99, 0.9, 2, 0.06),
    // backing slab: fills the V-grooves between rounded blocks with a darker shade of the block's own
    // felt, so seams read as creases (as in the renders) instead of letting the background show through
    back: new THREE.BoxGeometry(1, 1, 0.4),
    normal,
    mats: new Map(),
    backMats: new Map(),
  };
  return shared;
}

function material(color: string) {
  const r = resources();
  let m = r.mats.get(color);
  if (!m) {
    // felt, like The Double: matte with a soft sheen that lifts the block edges
    const c = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.94, metalness: 0,
      sheen: 0.8, sheenRoughness: 0.7, sheenColor: new THREE.Color().setHSL(hsl.h, hsl.s * 0.8, Math.min(0.9, hsl.l + 0.25)),
      normalMap: r.normal, normalScale: new THREE.Vector2(0.35, 0.35),
    });
    r.mats.set(color, m);
  }
  return m;
}

function backMaterial(color: string) {
  const r = resources();
  let m = r.backMats.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5), roughness: 1 });
    r.backMats.set(color, m);
  }
  return m;
}

/** Deterministic PRNG so the handmade jitter is identical on every load. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- part builder

function buildPart(def: PartDef, palette: Palette, seed: number): THREE.Group {
  const g = new THREE.Group();
  const cell = def.cell ?? 1;
  const res = resources();
  const rand = rng(seed);
  const tmp = new THREE.Object3D();
  const color = new THREE.Color();
  // collect instances per palette key
  const buckets = new Map<string, { x: number; y: number; z: number; s: number }[]>();
  def.rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '.' || ch === ' ') return;
      const sw = palette[ch];
      if (!sw) throw new Error(`palette has no '${ch}'`);
      const cx = (c + 0.5 - def.pivot[0]) * cell;
      const cy = (def.pivot[1] - r - 0.5) * cell;
      const z = def.zBy?.[ch] ?? sw.z ?? 0;
      const list = buckets.get(ch) ?? [];
      if (sw.fine && !def.tile) {
        for (const [dx, dy] of [[-0.25, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25]])
          list.push({ x: cx + dx * cell, y: cy + dy * cell, z, s: cell });
      } else list.push({ x: cx, y: cy, z, s: cell });
      buckets.set(ch, list);
    });
  });
  for (const [ch, list] of buckets) {
    const sw = palette[ch];
    const geo = def.tile ? res.tile : sw.fine ? res.fine : sw.flat ? res.flat : res.cube;
    const mesh = new THREE.InstancedMesh(geo, material(sw.color), list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const base = new THREE.Color(sw.color);
    list.forEach((b, i) => {
      // handmade jitter: tiny depth, tilt and tone variation per block
      tmp.position.set(b.x, b.y, b.z + (def.tile ? 0 : (rand() - 0.5) * 0.04 * b.s));
      tmp.rotation.set((rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.025);
      tmp.scale.setScalar(def.tile ? b.s / 0.5 : b.s);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      const k = def.tile ? 1 : 1 + (rand() - 0.5) * 0.05;
      mesh.setColorAt(i, color.copy(base).multiplyScalar(k));
    });
    mesh.name = `${ch}`;
    g.add(mesh);
    if (!def.tile) {
      const back = new THREE.InstancedMesh(res.back, backMaterial(sw.color), list.length);
      back.receiveShadow = true;
      const bs = sw.fine ? 0.5 : 1;
      list.forEach((b, i) => {
        tmp.position.set(b.x, b.y, b.z - 0.3 * b.s);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.setScalar(b.s * bs);
        tmp.updateMatrix();
        back.setMatrixAt(i, tmp.matrix);
      });
      back.name = `${ch}-back`;
      g.add(back);
    }
  }
  g.position.z = def.z ?? 0;
  return g;
}

// ---------------------------------------------------------------- rig

export interface Rig {
  def: CharacterDef;
  root: THREE.Group;
  /** Joint per part (rotate these to animate). The part's sprite hangs off its joint's pivot. */
  joints: Record<string, THREE.Group>;
  /** Snap or blend (t 0..1 from the current pose) to a named pose. */
  setPose(name: string, t?: number): void;
  /** Current joint rotations (degrees), for blending and export. */
  pose: Record<string, [number, number, number]>;
  dispose(): void;
}

const DEG = Math.PI / 180;

export function buildCharacter(def: CharacterDef, seed = 7): Rig {
  const root = new THREE.Group();
  root.name = def.name;
  const joints: Record<string, THREE.Group> = { root };
  const abs: Record<string, [number, number]> = { root: [0, 0] };
  // parents before children
  const order: string[] = [];
  const visit = (n: string) => {
    if (n === 'root' || order.includes(n)) return;
    visit(def.parts[n].parent);
    order.push(n);
  };
  Object.keys(def.parts).forEach(visit);
  order.forEach((name, i) => {
    const p = def.parts[name];
    const joint = new THREE.Group();
    joint.name = name;
    const pa = abs[p.parent];
    joint.position.set(p.at[0] - pa[0], p.at[1] - pa[1], 0);
    joint.add(buildPart(p, def.palette, seed * 131 + i * 17));
    joints[p.parent].add(joint);
    joints[name] = joint;
    abs[name] = p.at;
  });

  const pose: Record<string, [number, number, number]> = {};
  for (const n of order) pose[n] = [0, 0, 0];
  const apply = () => {
    for (const n of order) {
      const [x, y, z] = pose[n];
      joints[n].rotation.set(x * DEG, y * DEG, z * DEG);
    }
  };

  return {
    def, root, joints, pose,
    setPose(name, t = 1) {
      const target = def.poses[name] ?? {};
      for (const n of order) {
        const to = target[n] ?? [0, 0, 0];
        const cur = pose[n];
        for (let k = 0; k < 3; k++) cur[k] += (to[k] - cur[k]) * t;
      }
      apply();
    },
    dispose() {
      root.traverse((o) => { if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose(); });
    },
  };
}
