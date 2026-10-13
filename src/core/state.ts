// Single mutable state object the master timeline tweens; the Stage reads it every frame (PLAN.md §4.2).
import type { Expression } from '../scene/face';

export type Profile = 'landscape' | 'portrait';

/** Capability beats that own a projected overlay. */
export const BEATS = ['speaking', 'hearing', 'thinking', 'knowledge', 'acting'] as const;
export type Beat = (typeof BEATS)[number];

export const state = {
  assemble: 0,                // 0 fully exploded (the opening frame) → 1 assembled, staggered inside-out
  explodeScale: 1,            // per-profile spread multiplier
  focus: '',                  // comma-separated PartIds in focus ('' = all); others dimmed
  dim: 0,                     // 0..1 how much non-focus parts fade
  // sx/sy: subject centre offset as a fraction of the viewport (+x right, +y down)
  cam: { yaw: 0, pitch: 4, radius: 1.6, tx: 0, ty: 0, tz: 0, sx: 0, sy: 0 },
  modelRotY: 0,
  blueprint: 0,               // bg grid + frame opacity
  callouts: 0,                // 0..1 leader-line draw progress (staggered per label)
  calloutsOut: 0,             // 0..1 callouts fade back out
  face: 'idle' as Expression, faceIcon: null as string | null,
  clawPinch: 0,
  assembleBounce: 0,
  wave: 0,                    // claw wave (final chapter)
  hop: 0,                     // 0..1 one hop across the stage (squash, lift, land), reset per crossing
  /** Soft colour spotlight behind the Double: rgb, strength 0..1, size multiplier. */
  spot: { r: 222, g: 226, b: 255, a: 0, s: 1 },
  /** Per-beat overlay visibility 0..1 and content progress 0..1 (both scrubbed, so always reversible). */
  vis: { speaking: 0, hearing: 0, thinking: 0, knowledge: 0, acting: 0 } as Record<Beat, number>,
  prog: { speaking: 0, hearing: 0, thinking: 0, knowledge: 0, acting: 0 } as Record<Beat, number>,
  dirty: true,
};
export type State = typeof state;

/** 0 = every part floating, 1 = fully assembled. */
export const assembled = (s: State) => s.assemble;

/** Beat content progress at which item k of n appears (overlays and claw pinches share this). */
export const itemAt = (k: number, n: number) => 0.04 + (k / n) * 0.86;
