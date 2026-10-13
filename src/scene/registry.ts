// Part contract shared by the procedural build and a future GLB (PLAN.md §5.1).
// Outside parts follow reference/double-construction-sheet.webp; the internals (board, memory,
// speaker, harness, screws) are what the exploded view reveals.
import type * as THREE from 'three';

export const PART_IDS = [
  'body', 'screen', 'speaker', 'chassis', 'memory', 'harness',
  'stemL', 'tipL', 'hook',
  'patchL', 'patchR',
  'armL', 'armR', 'clawL', 'clawR',
  'footL', 'footR',
  'screws',
] as const;
export type PartId = (typeof PART_IDS)[number];

export interface Part {
  id: PartId;
  /** Pivot at the part's joint/attachment point. */
  object: THREE.Object3D;
  /** Child empty used as the callout leader-line tip and overlay anchor. */
  anchor: THREE.Object3D;
  /** Cloned per part so dimming is independent. */
  materials: THREE.Material[];
  rest: { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 };
}

export interface Rig {
  root: THREE.Group;
  /** Body-relative group that every part hangs off (breathing / bounce act on this). */
  model: THREE.Group;
  parts: Record<PartId, Part>;
  /** Hinged pincer jaws (upper + lower per claw), rotated by state.clawPinch. */
  jaws: { L: { upper: THREE.Object3D; lower: THREE.Object3D }; R: { upper: THREE.Object3D; lower: THREE.Object3D } };
  /** Screws instanced mesh + which parent part each instance follows. */
  screws: { mesh: THREE.InstancedMesh; follow: { part: PartId; local: THREE.Matrix4; axis: THREE.Vector3 }[] };
  /** Spring-driven secondary motion pivots. */
  springs: { stem: THREE.Object3D; hook: THREE.Object3D };
  /** Board traces + wires that glow while the Double is open. */
  glow: { chips: THREE.MeshStandardMaterial; wires: THREE.MeshStandardMaterial; wireMap: THREE.Texture };
  /** Contact shadow blob under the feet. */
  shadow: THREE.Mesh;
  faceMesh: THREE.Mesh;
  dispose(): void;
}
