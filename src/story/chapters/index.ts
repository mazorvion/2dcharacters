import type { ChapterId } from '../../content';
import { CONTENT } from '../../content';
import { state, itemAt, type Beat } from '../../core/state';
import type { Expression } from '../../scene/face';
import { PART_IDS, type PartId } from '../../scene/registry';
import type { Chapter, Ctx, ShotOpts } from '../types';
import { camTo, set, to } from './_util';

// Cinematic cut: the story opens on a slowly turning exploded diagram whose labels draw in, then
// assembles centre stage. From there the Double crosses the screen beat by beat, left, right, left,
// with a twirl and a hop, always turned toward the half where that capability plays out. Every
// beat keeps the camera moving (no static holds) and the spotlight behind the Double takes the
// beat's colour. The finale brings it back to centre for one last orbit and the CTA.

/** Fraction of a beat where its demo (overlay progress) plays. */
const CONTENT_IN = 0.34, CONTENT_OUT = 0.86;
/** Share of a beat spent crossing the stage. */
const CROSS = 0.3;

/** Spotlight colours: brand tokens (PLAN.md §1) keyed by the chapter's eyebrow dot. */
const SPOT: Record<string, [number, number, number, number]> = {
  cobalt: [222, 226, 255, 0.9],       // --cobalt-pale
  'lime-edge': [212, 245, 60, 0.72],  // --lime
  bubblegum: [255, 79, 174, 0.42],
  grape: [106, 44, 245, 0.3],
  amber: [255, 197, 61, 0.62],
  tangerine: [251, 105, 6, 0.4],
};
export const spotFor = (dot = 'cobalt') => {
  const [r, g, b, a] = SPOT[dot] ?? SPOT.cobalt;
  return { r, g, b, a };
};

/** Retint (and resize) the spotlight. */
const spotTo = (tl: GSAPTimeline, dot: string | undefined, at: number, dur: number, s = 1) =>
  tl.to(state.spot, { ...spotFor(dot), s, duration: dur, ease: 'sine.inOut' }, at);

/**
 * Cross the stage: the Double crouches, hops and twirls once in the direction it travels, while
 * the camera carries it to its new side (the camera move itself is added by the caller).
 */
function cross(tl: GSAPTimeline, at: number, dur: number, ctx: Ctx, spin = true) {
  if (!ctx.reduce) tl.fromTo(state, { hop: 0 }, { hop: 1, duration: dur, ease: 'none', immediateRender: false }, at);
  if (spin && ctx.rotTo !== ctx.rotFrom) {
    tl.fromTo(state, { modelRotY: ctx.rotFrom }, { modelRotY: ctx.rotTo, duration: dur * 0.86, ease: 'power2.inOut', immediateRender: false }, at + dur * 0.08);
  }
  set(tl, { face: 'happy' }, at);
  spotTo(tl, ctx.dot, at + dur * 0.2, dur * 0.8);
}

interface BeatSpec {
  beat: Beat;
  /** Parts the camera frames (at their attached positions). */
  frame: PartId[];
  /**
   * Arrival shot, then the slow drift it settles into while the beat plays. Written for the Double
   * standing on the LEFT and facing right (negative yaw); mirrored when it stands on the right.
   */
  from: ShotOpts;
  drift: Partial<ShotOpts>;
  faces: [number, Expression][];
}

function beat(spec: BeatSpec): (tl: GSAPTimeline, at: number, dur: number, ctx: Ctx) => void {
  return (tl, at, dur, ctx) => {
    const m = ctx.place === 'right' ? -1 : 1;
    const base: ShotOpts = { explode: 0, sy: 0.01, syPortrait: -0.03, rScalePortrait: 1.4, ...spec.from, sx: ctx.sx, yaw: spec.from.yaw * m };
    const drift: ShotOpts = { ...base, ...spec.drift, yaw: (spec.drift.yaw ?? spec.from.yaw) * m };
    const c0 = at - dur * 0.02;
    cross(tl, c0, dur * CROSS, ctx);
    // glide across and turn toward the copy, then keep drifting through the whole beat
    camTo(tl, ctx.shot(spec.frame, base), c0, dur * CROSS, 'power3.inOut');
    camTo(tl, ctx.shot(spec.frame, drift), c0 + dur * CROSS, dur * (1 - CROSS) + dur * 0.02, 'sine.inOut');
    for (const [k, face] of spec.faces) set(tl, { face }, at + dur * k);
    tl.to(state.vis, { [spec.beat]: 1, duration: dur * 0.08, ease: 'power2.out' }, at + dur * (CONTENT_IN - 0.06));
    tl.to(state.prog, { [spec.beat]: 1, duration: dur * (CONTENT_OUT - CONTENT_IN - 0.04) }, at + dur * CONTENT_IN);
    tl.to(state.vis, { [spec.beat]: 0, duration: dur * 0.07, ease: 'power1.in' }, at + dur * CONTENT_OUT);
  };
}

// 0 · Exploded: every part floats around the body. The camera turns slowly around the diagram
// (parallax sells the depth) while the five capability labels draw in, one per part.
const exploded: Chapter = {
  id: 'exploded',
  build(tl, at, dur, ctx) {
    const o = ctx.openShot;
    camTo(tl, { ...o, yaw: 16, pitch: 5, radius: o.radius * 0.94 }, at, dur, 'sine.inOut');
    to(tl, { callouts: 1 }, at + dur * 0.22, dur * 0.5, 'power1.inOut');
    // the floating face starts talking as its Speaking label draws in (top label, drawn first)
    set(tl, { face: 'idle' }, at);
    set(tl, { face: 'talking' }, at + dur * 0.24);
  },
};

// 1 · Assemble: the labels retract, parts fly home inside-out while the camera swings round to the
// front and pushes in; the body lands with a bounce, centre stage.
const assemble: Chapter = {
  id: 'assemble',
  build(tl, at, dur, ctx) {
    const h = ctx.heroShot;
    const mid = ctx.shot(PART_IDS, { yaw: 6, pitch: 3, explode: 0.45, rScale: 0.86, sx: 0, sy: -0.07, rScalePortrait: 1.2, syPortrait: -0.02 });
    to(tl, { calloutsOut: 1 }, at, dur * 0.1, 'power1.in');
    set(tl, { face: 'surprised' }, at + dur * 0.04);
    to(tl, { assemble: 1 }, at + dur * 0.06, dur * 0.72, 'power1.inOut');
    camTo(tl, mid, at, dur * 0.5, 'sine.inOut');
    camTo(tl, { ...h, yaw: -14, pitch: 6 }, at + dur * 0.5, dur * 0.48, 'power2.inOut');
    set(tl, { face: 'idle' }, at + dur * 0.5);
    tl.fromTo(state, { assembleBounce: 0 }, { assembleBounce: 1, duration: dur * 0.16, ease: 'none', immediateRender: false }, at + dur * 0.78);
    set(tl, { face: 'happy' }, at + dur * 0.84);
    spotTo(tl, 'lime-edge', at + dur * 0.7, dur * 0.25, 1.05);
  },
};

// 2 · Speaking: hops to the left, low push-in on the face while the voice plays on the right. The
// mouth moves while each line types out and rests between them.
const speaking: Chapter = {
  id: 'speaking',
  build(tl, at, dur, ctx) {
    const n = CONTENT.speaking.lines.length;
    const span = dur * (CONTENT_OUT - CONTENT_IN - 0.04);
    const faces: [number, Expression][] = [[0.3, 'idle']];
    for (let k = 0; k < n; k++) {
      // same windows as the typed bubbles in overlay/beats.ts
      const a = itemAt(k, n), z = itemAt(k + 1, n);
      faces.push([CONTENT_IN + (span * a) / dur, 'talking'], [CONTENT_IN + (span * (a + (z - a) * 0.7)) / dur, 'idle']);
    }
    faces.push([0.88, 'happy']);
    beat({
      beat: 'speaking', frame: ['body', 'screen'],
      from: { yaw: -34, pitch: -8, rScale: 1.12 }, drift: { yaw: -16, pitch: 2, rScale: 0.98 },
      faces,
    })(tl, at, dur, ctx);
  },
};

// 3 · Hearing: crosses to the right and turns its sensory patch toward the transcript on the left.
const hearing: Chapter = {
  id: 'hearing',
  build: beat({
    beat: 'hearing', frame: ['body', 'patchR'],
    from: { yaw: -46, pitch: 10, rScale: 1.18 }, drift: { yaw: -70, pitch: 3, rScale: 1.06 },
    faces: [[0.3, 'listening'], [0.88, 'happy']],
  }),
};

// 4 · Thinking: back to the left; the camera cranes up and looks down on it while it reasons.
const thinking: Chapter = {
  id: 'thinking',
  build: beat({
    beat: 'thinking', frame: ['body', 'stemL', 'tipL', 'hook'],
    from: { yaw: -22, pitch: 42, rScale: 1.2 }, drift: { yaw: -8, pitch: 22, rScale: 1.06 },
    faces: [[0.3, 'thinking'], [0.9, 'happy']],
  }),
};

// 5 · Knowledge: to the right, low angle; sources fly out of the card on the left into its antenna.
const knowledge: Chapter = {
  id: 'knowledge',
  build: beat({
    beat: 'knowledge', frame: ['body', 'hook'],
    from: { yaw: -36, pitch: -20, rScale: 1.2 }, drift: { yaw: -16, pitch: -6, rScale: 1.08 },
    faces: [[0.3, 'working'], [0.9, 'happy']],
  }),
};

// 6 · Acting: last crossing to the left; a pinch of the claws for every action that lands on the right.
const acting: Chapter = {
  id: 'acting',
  build(tl, at, dur, ctx) {
    beat({
      beat: 'acting', frame: ['body', 'clawL', 'clawR'],
      from: { yaw: -46, pitch: 6, rScale: 1.14 }, drift: { yaw: -20, pitch: 10, rScale: 1.04 },
      faces: [[0.3, 'working'], [0.9, 'happy']],
    })(tl, at, dur, ctx);
    const n = CONTENT.acting.actions.length;
    const span = dur * (CONTENT_OUT - CONTENT_IN - 0.04);
    for (let k = 0; k < n; k++) {
      const tk = at + dur * CONTENT_IN + span * itemAt(k, n);
      to(tl, { clawPinch: 1 }, tk - dur * 0.02, dur * 0.02, 'power2.in');
      to(tl, { clawPinch: 0 }, tk, dur * 0.03, 'power2.out');
    }
  },
};

// 7 · Assembled: one hop back to centre stage, a rising 360° orbit, a wave; the blueprint fades
// and the CTA lands underneath.
const assembled: Chapter = {
  id: 'assembled',
  build(tl, at, dur, ctx) {
    const h = ctx.heroShot;
    cross(tl, at - dur * 0.02, dur * 0.3, ctx, false);
    camTo(tl, { ...h, yaw: 110, pitch: -12, radius: h.radius * 1.06 }, at - dur * 0.02, dur * 0.3, 'power2.in');
    camTo(tl, { ...h, yaw: 360, pitch: 4 }, at + dur * 0.28, dur * 0.42, 'power2.out');
    to(tl, { blueprint: 0 }, at + dur * 0.1, dur * 0.3, 'power1.inOut');
    set(tl, { face: 'love' }, at + dur * 0.3);
    set(tl, { face: 'happy' }, at + dur * 0.6);
    to(tl, { wave: 1 }, at + dur * 0.62, dur * 0.3);
  },
};

export const CHAPTERS: Record<ChapterId, Chapter> = {
  exploded, assemble, speaking, hearing, thinking, knowledge, acting, assembled,
};
