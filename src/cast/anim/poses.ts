// Pose library (CHARACTERS.md §7.3) and expression presets (§7.4).
import type { CharId, FaceState, FrameState, Pose, Rig } from '../types.ts';

export const POSES: Record<CharId, Record<string, Pose>> = {
  him: {
    hero: {},
  },
  her: {
    hero: {},
  },
};

export const EXPRESSIONS: Record<CharId, Record<string, Partial<FaceState>>> = {
  him: {},
  her: {},
};

/** Frame state for a rig in a pose, with an optional expression and face overrides. */
export function frameFor(rig: Rig, pose = 'hero', expression?: string, face: Partial<FaceState> = {}, flip = false): FrameState {
  const p = POSES[rig.id][pose] ?? {};
  return {
    drawings: { ...rig.rest, ...p.drawings },
    offsets: { ...p.offsets },
    face: { ...rig.restFace, ...p.face, ...(expression ? EXPRESSIONS[rig.id][expression] : {}), ...face },
    flip,
  };
}
