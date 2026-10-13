// Clips (CHARACTERS.md §9.1): timed keys sampled per frame. Body keys hold until the next key and land on
// even frames (12 drawings/s at 24 fps, "on twos"); face changes may happen on any frame. Blinks are
// automatic and seeded; lip-sync cues drive the mouth. Same clip + frame → same pixels (D9).
import type { CharId, FaceState, FrameState } from '../types.ts';
import { RIGS } from '../rigs.ts';
import { frameFor } from './poses.ts';
import { hash, prng } from '../grid.ts';
import { mouthAt, type MouthCue } from './lipsync.ts';

export interface Key<T> { f: number; v: T }

export interface Track {
  /** Pose keys (POSES names). */
  pose?: Key<string>[];
  /** Expression keys (EXPRESSIONS names). */
  expression?: Key<string>[];
  /** Face overrides. */
  face?: Key<Partial<FaceState>>[];
  /** Breathing: the upper body rises one bead for `hold` frames every `every` frames. */
  breathe?: { every: number; hold: number; phase?: number };
  /** Automatic blinks (seeded). */
  blink?: boolean;
  /** Lip sync for characters with an ink mouth. */
  lipsync?: MouthCue[];
}

export interface Clip {
  fps: 24;
  length: number;
  tracks: Partial<Record<CharId, Track>>;
}

function at<T>(keys: Key<T>[] | undefined, f: number, quantize = false): T | undefined {
  if (!keys?.length) return undefined;
  const t = quantize ? f - (f % 2) : f;
  let v: T | undefined;
  for (const k of keys) if (k.f <= t) v = k.v;
  return v;
}

/** Frames (within a clip) where a blink closes the eyes: every 2.5–6 s, two frames closed. */
function blinking(id: CharId, f: number, length: number): boolean {
  const rand = prng(hash('blink', id));
  let t = Math.round(24 * (0.8 + rand() * 1.5));
  while (t < length) {
    if (f >= t && f < t + 3) return true;
    t += Math.round(24 * (2.5 + rand() * 3.5));
  }
  return false;
}

export function sample(clip: Clip, f: number): Partial<Record<CharId, FrameState>> {
  const out: Partial<Record<CharId, FrameState>> = {};
  for (const [id, tr] of Object.entries(clip.tracks) as [CharId, Track][]) {
    const rig = RIGS[id];
    const state = frameFor(rig, at(tr.pose, f, true) ?? 'hero', at(tr.expression, f), at(tr.face, f) ?? {});
    if (tr.breathe) {
      const { every, hold, phase = 0 } = tr.breathe;
      const b = (f - (f % 2) + phase) % every < hold;
      if (b) state.offsets.upper = [0, -1];
    }
    if (tr.blink && blinking(id, f, clip.length)) {
      if (rig.rest.eyes) state.drawings.eyes = 'closed';
      else state.face = { ...state.face, eyeL: 'closed', eyeR: 'closed' };
    }
    if (tr.lipsync) {
      const m = mouthAt(tr.lipsync, f, clip.fps);
      if (m) state.face = { ...state.face, mouth: m };
    }
    out[id] = state;
  }
  return out;
}
