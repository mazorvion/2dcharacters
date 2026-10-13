// EXPLODE table + assembly (PLAN.md §5.2, reversed per product feedback 2026-10-13): the story opens
// fully exploded (internals included) and scrolling assembles it piece by piece, inside-out.
// Tune live with ?debug.
import * as THREE from 'three';
import type { PartId, Rig } from './registry';
import type { Profile, State } from '../core/state';

export interface ExplodeEntry {
  /** Exploded position (model space, landscape). Parts fan out around the body in the picture plane. */
  at: [number, number, number] | null;
  /** Rotation delta in degrees while exploded. */
  rot: [number, number, number];
  /** Assembly order (0 = goes in first). */
  order: number;
}

/**
 * Front-view exploded layout (product feedback 2026-10-13: the story opens exploded, seen straight on,
 * with no labels). Every part sits in the picture plane around the body so the diagram reads from the
 * front: antennas above, screen + left patch/claw on the left, board + memory + right
 * patch/claw on the right, wiring between the antennas, feet below. Flat parts turn to face the camera.
 */
export const EXPLODE: Record<PartId, ExplodeEntry> = {
  body:    { at: null,                  rot: [0, 0, 0],    order: 0 },
  chassis: { at: [2.15, 0.62, 0.55],    rot: [0, 0, 5],    order: 0 },
  memory:  { at: [2.2, -0.42, 0.6],     rot: [0, 17, -6],  order: 0 },
  harness: { at: [0.18, 1.18, 0.45],    rot: [0, 0, 0],    order: 1 },
  screen:  { at: [-2.15, 0.62, 0.7],    rot: [0, 0, -4],   order: 2 },
  patchL:  { at: [-1.45, -0.1, 0.35],   rot: [0, 70, 0],   order: 3 },
  patchR:  { at: [1.45, -0.1, 0.35],    rot: [0, -70, 0],  order: 3 },
  stemL:   { at: [-0.42, 1.28, 0.2],    rot: [0, 0, 8],    order: 4 },
  tipL:    { at: [-0.68, 1.82, 0.3],    rot: [0, 0, 0],    order: 5 },
  hook:    { at: [0.62, 1.32, -0.05],   rot: [0, 0, -8],   order: 4 },
  armL:    { at: [-1.28, -0.9, 0.35],   rot: [0, 0, 0],    order: 4 },
  armR:    { at: [1.28, -0.9, 0.35],    rot: [0, 0, 0],    order: 4 },
  clawL:   { at: [-1.78, -0.98, 0.45],  rot: [0, 0, 10],   order: 5 },
  clawR:   { at: [1.78, -0.98, 0.45],   rot: [0, 0, -10],  order: 5 },
  footL:   { at: [-0.62, -1.62, 0.25],  rot: [0, 0, 0],    order: 6 },
  footR:   { at: [0.62, -1.62, 0.25],   rot: [0, 0, 0],    order: 6 },
  screws:  { at: null,                  rot: [0, 0, 0],    order: 7 },
};
export const SCREW_SPREAD = 0.45;

/**
 * Focus pop: while a capability beat has the floor, its part slides partway out of the assembled
 * Double (an exploded detail) and the rest of the body ghosts back toward the paper. Offsets are
 * from rest, model space, landscape; rot (deg) and scale apply at full pop. The board and memory
 * come right out of the body, toward the half of the screen where their copy sits (Thinking plays
 * with the Double on the left, Knowledge with it on the right).
 */
export const POP: Partial<Record<PartId, { off: [number, number, number]; rot?: [number, number, number]; scale?: number }>> = {
  screen:  { off: [0, 0.02, 0.22] },
  patchL:  { off: [-0.24, 0.02, 0.02] },
  patchR:  { off: [0.24, 0.02, 0.02] },
  chassis: { off: [1.28, 0.22, 0.6], rot: [0, -22, 0], scale: 1.15 },
  memory:  { off: [-1.32, 0.38, 0.62], rot: [0, 42, 0], scale: 1.8 },
  clawL:   { off: [-0.18, 0.05, 0.12] },
  clawR:   { off: [0.18, 0.05, 0.12] },
};
/** How far ghosted parts fade toward the paper colour (0 = untouched, 1 = paper). */
const GHOST = 0.62;
const PAPER = new THREE.Color('#f6f4ef');
/** Ease for the pop: quick out with a small overshoot, like a part springing loose. */
const popEase = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : backOut(t, 1.5));
const MAX_ORDER = 7;
/** Share of the assembly window taken by the stagger (the rest is each part's own flight). */
const STAGGER = 0.62;

export const PROFILE_SCALE: Record<Profile, THREE.Vector3> = {
  landscape: new THREE.Vector3(1, 1, 1),
  portrait: new THREE.Vector3(0.62, 1.2, 0.9),
};

const backOut = (t: number, s = 1.2) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Exploded amount of one part: 1 floating → 0 attached, with a small settle overshoot on landing. */
export function partAmount(s: Pick<State, 'assemble'>, id: PartId) {
  const start = (EXPLODE[id].order / MAX_ORDER) * STAGGER;
  const k = clamp01((s.assemble - start) / (1 - STAGGER));
  return 1 - backOut(k);
}

const tmpOff = new THREE.Vector3();
const DEG = Math.PI / 180;

export class Exploder {
  private amounts = {} as Record<PartId, number>;
  private pops = {} as Record<PartId, number>;
  private popKey = '\0';
  private popSet = new Set<string>();
  private focusKey = '\0';
  private focusSet = new Set<string>();
  constructor(private rig: Rig) {}

  /** 1 = floating at its exploded position, 0 = attached. */
  amount(id: PartId) { return this.amounts[id] ?? 1; }
  /** 0..1 how far a part is popped out for its focus beat. */
  popAmount(id: PartId) { return this.pops[id] ?? 0; }

  /** Offset from rest to a part's focus-pop position for a profile (zero if it never pops). */
  popOffset(id: PartId, profile: Profile, out = new THREE.Vector3()) {
    const pop = POP[id];
    return pop ? out.set(...pop.off).multiply(PROFILE_SCALE[profile]) : out.set(0, 0, 0);
  }

  restPosition(id: PartId) { return this.rig.parts[id].rest.pos.clone(); }

  /** Offset from rest to the exploded position for a profile. */
  offset(id: PartId, profile: Profile, out = new THREE.Vector3()) {
    const at = EXPLODE[id].at;
    if (!at) return out.set(0, 0, 0);
    return out.set(...at).multiply(PROFILE_SCALE[profile]).sub(this.rig.parts[id].rest.pos);
  }

  /** Model-space exploded position of a part for a profile (used for camera framing). */
  explodedPosition(id: PartId, profile: Profile, out = new THREE.Vector3()) {
    return this.offset(id, profile, out).add(this.rig.parts[id].rest.pos);
  }

  apply(s: State, profile: Profile) {
    if (s.popParts !== this.popKey) {
      this.popKey = s.popParts;
      this.popSet = new Set(s.popParts ? s.popParts.split(',') : []);
    }
    const popT = popEase(s.pop);
    for (const id of Object.keys(this.rig.parts) as PartId[]) {
      const p = this.rig.parts[id];
      const ex = EXPLODE[id];
      const e = partAmount(s, id);
      this.amounts[id] = e;
      if (id === 'screws') continue;
      this.offset(id, profile, tmpOff).multiplyScalar(s.explodeScale);
      const len = tmpOff.length();
      p.object.position.copy(p.rest.pos).addScaledVector(tmpOff, e);
      // parts arc in rather than travel in straight lines
      p.object.position.y += Math.sin(clamp01(e) * Math.PI) * 0.14 * len;
      const pop = POP[id];
      const k = pop && this.popSet.has(id) ? popT : 0;
      this.pops[id] = k;
      if (k !== 0) p.object.position.add(this.popOffset(id, profile, tmpOff).multiplyScalar(k));
      const pr = pop?.rot ?? [0, 0, 0];
      p.object.rotation.set(
        p.rest.rot.x + (ex.rot[0] * e + pr[0] * k) * DEG,
        p.rest.rot.y + (ex.rot[1] * e + pr[1] * k) * DEG,
        p.rest.rot.z + (ex.rot[2] * e + pr[2] * k) * DEG,
      );
      p.object.scale.copy(p.rest.scale).multiplyScalar(1 + ((pop?.scale ?? 1) - 1) * k);
    }
    // pincers: both fingers close toward the mouth (claw space is mirrored, so one sign works both sides)
    const a = 0.38 * s.clawPinch;
    for (const j of [this.rig.jaws.L, this.rig.jaws.R]) {
      j.upper.rotation.z = -a;
      j.lower.rotation.z = a;
    }
    // the open Double's board and wires glow faintly; they go dark as it closes up. A board pulled
    // out for its Thinking beat lights its traces fully.
    this.rig.glow.chips.emissiveIntensity = 0.9 * Math.max(clamp01(this.amounts.chassis), clamp01(this.pops.chassis ?? 0) * 1.4);
    this.rig.glow.wires.emissiveIntensity = 1.6 * clamp01(this.amounts.harness);
    this.updateScrews();
  }

  private m = new THREE.Matrix4();
  private t = new THREE.Matrix4();
  private sc = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private updateScrews() {
    const { mesh, follow } = this.rig.screws;
    const e = Math.max(0, this.amounts.screws ?? 0);
    follow.forEach((f, i) => {
      const parent = this.rig.parts[f.part].object;
      parent.updateMatrix();
      this.v.copy(f.axis).multiplyScalar(SCREW_SPREAD * e);
      // screws disappear into the felt once they are driven home
      const sc = Math.min(1, Math.max(0, (e - 0.02) / 0.15));
      this.t.makeTranslation(this.v.x, this.v.y, this.v.z);
      this.m.multiplyMatrices(parent.matrix, this.t).multiply(f.local).multiply(this.sc.makeScale(sc, sc, sc));
      mesh.setMatrixAt(i, this.m);
      if (i === 0) this.rig.parts.screws.anchor.position.setFromMatrixPosition(this.m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  private partDim = {} as Record<PartId, number>;

  /**
   * Ghosting: parts outside state.focus fade toward the paper colour (a technical-diagram look:
   * context drawn faint, the subject in full colour). Each part eases toward its target so a focus
   * switch crossfades instead of popping. Returns true while still settling.
   */
  applyFocusDim(s: State, dt: number): boolean {
    if (s.focus !== this.focusKey) {
      this.focusKey = s.focus;
      this.focusSet = new Set(s.focus ? s.focus.split(',') : []);
    }
    const k0 = dt > 0 ? 1 - Math.exp(-dt * 7) : 1;
    let settling = false;
    for (const id of Object.keys(this.rig.parts) as PartId[]) {
      const p = this.rig.parts[id];
      const inFocus = this.focusSet.size === 0 || this.focusSet.has(id);
      const target = inFocus ? 0 : s.dim;
      const cur = this.partDim[id] ?? 0;
      let d = cur + (target - cur) * k0;
      if (Math.abs(target - d) < 0.002) d = target; else settling = true;
      if (d === this.partDim[id]) continue; // unchanged: leave the materials alone
      this.partDim[id] = d;
      for (const m of p.materials) ghost(m, d);
    }
    return settling;
  }
}

type Tintable = THREE.Material & { color?: THREE.Color; sheenColor?: THREE.Color };

/** Fade one material toward the paper (d = 0 untouched … 1 fully ghosted). */
function ghost(m: Tintable, d: number) {
  const u = m.userData as { baseColor?: THREE.Color; baseSheen?: THREE.Color; baseOpacity?: number };
  if (m.blending === THREE.AdditiveBlending) {
    // the glowing face: additive light can't be tinted toward paper, so it just dims
    m.opacity = (u.baseOpacity ?? 1) * (1 - 0.75 * d);
    return;
  }
  if (m.color) {
    u.baseColor ??= m.color.clone();
    m.color.copy(u.baseColor).lerp(PAPER, GHOST * d);
  }
  if (m.sheenColor) {
    u.baseSheen ??= m.sheenColor.clone();
    m.sheenColor.copy(u.baseSheen).lerp(PAPER, GHOST * d);
  }
}
