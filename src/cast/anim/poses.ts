// Pose library (CHARACTERS.md §7.3) and expression presets (§7.4). Poses only swap whole drawings and move
// groups by whole beads; new arm drawings are the original arms turned exactly 90° (scripts/cast/dev/rot90.py).
import type { CharId, FaceState, FrameState, Pose, Rig } from '../types.ts';

export const POSES: Record<CharId, Record<string, Pose>> = {
  him: {
    hero: {},
    wave: { drawings: { armScreenR: 'wave' } },
    nod: { offsets: { head: [0, 1] } },
    breathe: { offsets: { upper: [0, -1] } },
    blink: { drawings: { eyes: 'closed' } },
  },
  her: {
    hero: {},
    nod: { offsets: { head: [0, 1] } },
    breathe: { offsets: { upper: [0, -1] } },
  },
};

export const EXPRESSIONS: Record<CharId, Record<string, Partial<FaceState>>> = {
  him: {},
  her: {
    happy: { eyeL: 'open', eyeR: 'open', browL: 'up', browR: 'up', mouth: 'openSmile' },
    neutral: { eyeL: 'open', eyeR: 'open', browL: 'neutral', browR: 'neutral', mouth: 'smile' },
    laugh: { eyeL: 'happy', eyeR: 'happy', browL: 'up', browR: 'up', mouth: 'laugh' },
    surprised: { eyeL: 'wide', eyeR: 'wide', browL: 'up', browR: 'up', mouth: 'o' },
    thinking: { eyeL: 'lookUp', eyeR: 'lookUp', browL: 'up', browR: 'down', mouth: 'flat' },
    wink: { eyeL: 'closed', eyeR: 'open', browL: 'neutral', browR: 'up', mouth: 'smile' },
    blink: { eyeL: 'closed', eyeR: 'closed' },
  },
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
