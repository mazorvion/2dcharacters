import { state } from '../../core/state';
import type { Cam } from '../types';

export const camTo = (tl: GSAPTimeline, cam: Cam, at: number, dur: number, ease = 'power2.inOut') =>
  tl.to(state.cam, { ...cam, duration: dur, ease }, at);

export const to = (tl: GSAPTimeline, vars: GSAPTweenVars, at: number, dur: number, ease = 'none') =>
  tl.to(state, { ...vars, duration: dur, ease }, at);

export type Discrete = { at: number; vars: Partial<Record<'face' | 'faceIcon' | 'focus' | 'popParts', string | null>> };

/**
 * Discrete values (face, focus, pop parts, icon) are keyframes resolved from the timeline time on every update
 * (see timeline.ts), so any jump or reverse scrub always lands on the right value.
 */
export const set = (tl: GSAPTimeline, vars: Discrete['vars'], at: number) => {
  (tl.data as { discrete: Discrete[] }).discrete.push({ at, vars });
};

/** Apply the last keyframe at or before time t for each discrete key. */
export function resolveDiscrete(list: Discrete[], t: number) {
  const out: Record<string, string | null> = {};
  for (const k of list) if (k.at <= t + 1e-6) Object.assign(out, k.vars);
  return out;
}

/** Overlay visibility for a chapter: fades in after the transition, out before the next chapter. */
export const overlayVis = (
  tl: GSAPTimeline, id: keyof typeof state.vis, at: number, dur: number, inAt = 0.12, outAt = 0.86,
) => {
  tl.to(state.vis, { [id]: 1, duration: dur * 0.1, ease: 'power1.out' }, at + dur * inAt);
  tl.to(state.vis, { [id]: 0, duration: dur * 0.1, ease: 'power1.in' }, at + dur * outAt);
};
