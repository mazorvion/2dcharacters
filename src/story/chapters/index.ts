import type { ChapterId } from '../../content';
import { CONTENT } from '../../content';
import { state, itemAt, type Beat } from '../../core/state';
import type { Expression } from '../../scene/face';
import { PART_IDS, type PartId } from '../../scene/registry';
import type { Chapter, Ctx, ShotOpts } from '../types';
import { camTo, set, to } from './_util';

// The story opens on a front-on exploded view (no labels). Scrolling assembles the Double piece by
// piece, inside-out, still seen from the front; then every capability beat plays on the finished
// Double with its own continuous camera move: low push-in, orbit to profile, overhead crane,
// worm's-eye rise, a dolly across the front, and a rising 360° orbit to close.

/** Fraction of a beat where its content (overlay progress) plays. */
const CONTENT_IN = 0.3, CONTENT_OUT = 0.86;

interface BeatSpec {
  beat: Beat;
  /** Parts the camera frames (at their attached positions). */
  frame: PartId[];
  /** Arrival shot, then the slow drift it settles into while the beat plays. */
  from: ShotOpts;
  drift: Partial<ShotOpts>;
  faces: [number, Expression][];
}

function beat(spec: BeatSpec): (tl: GSAPTimeline, at: number, dur: number, ctx: Ctx) => void {
  return (tl, at, dur, ctx) => {
    const base: ShotOpts = { explode: 0, sx: 0.06, syPortrait: 0.02, rScalePortrait: 1.35, ...spec.from };
    // arrive on the opening angle, then keep moving through the whole beat (no static holds)
    camTo(tl, ctx.shot(spec.frame, base), at, dur * 0.26, 'power1.inOut');
    camTo(tl, ctx.shot(spec.frame, { ...base, ...spec.drift }), at + dur * 0.26, dur * 0.74, 'sine.inOut');
    for (const [k, face] of spec.faces) set(tl, { face }, at + dur * k);
    tl.to(state.vis, { [spec.beat]: 1, duration: dur * 0.08, ease: 'power1.out' }, at + dur * (CONTENT_IN - 0.04));
    tl.to(state.prog, { [spec.beat]: 1, duration: dur * (CONTENT_OUT - CONTENT_IN - 0.04) }, at + dur * CONTENT_IN);
    tl.to(state.vis, { [spec.beat]: 0, duration: dur * 0.08, ease: 'power1.in' }, at + dur * CONTENT_OUT);
  };
}

// 0 · Exploded (the default view): every part floats in place around the body, seen straight on.
// A barely-there push-in keeps it alive while the headline reads.
const exploded: Chapter = {
  id: 'exploded',
  build(tl, at, dur, ctx) {
    camTo(tl, { ...ctx.openShot, radius: ctx.openShot.radius * 0.95 }, at, dur, 'sine.inOut');
  },
};

// 1 · Assemble: parts fly home inside-out (board, memory, wires, speaker, screen, patches, antennas,
// arms, claws, feet, screws). The camera holds the front view while it comes together, pushes in,
// then lifts into a 3/4 hero angle as the body lands on its feet.
const assemble: Chapter = {
  id: 'assemble',
  build(tl, at, dur, ctx) {
    const h = ctx.heroShot;
    const front = ctx.shot(PART_IDS, { yaw: 0, pitch: 2, explode: 0.35, rScale: 0.95, sx: 0.12, sy: -0.02, rScalePortrait: 1.15 });
    set(tl, { face: 'surprised' }, at + dur * 0.02);
    to(tl, { assemble: 1 }, at + dur * 0.02, dur * 0.8, 'power1.inOut');
    camTo(tl, front, at, dur * 0.55, 'sine.inOut');
    camTo(tl, { ...h, yaw: 24, pitch: 7 }, at + dur * 0.55, dur * 0.42, 'power2.inOut');
    set(tl, { face: 'idle' }, at + dur * 0.5);
    to(tl, { assembleBounce: 1 }, at + dur * 0.8, dur * 0.14);
    set(tl, { face: 'happy' }, at + dur * 0.86);
  },
};

// 1 · Speaking: the face screen flies into the cavity; camera arrives from the left, pushes in.
const speaking: Chapter = {
  id: 'speaking',
  build: beat({
    beat: 'speaking', frame: ['body', 'screen'],
    from: { yaw: -38, pitch: -14, rScale: 1.25 }, drift: { yaw: -10, pitch: 3, rScale: 1.02 },
    faces: [[0.28, 'talking'], [0.86, 'happy']],
  }),
};

// 2 · Hearing: the sensory patches snap on; camera swings round to the side view.
const hearing: Chapter = {
  id: 'hearing',
  build: beat({
    beat: 'hearing', frame: ['body', 'patchR'],
    from: { yaw: 58, pitch: 12, rScale: 1.32 }, drift: { yaw: 100, pitch: 2, rScale: 1.15 },
    faces: [[0.2, 'listening'], [0.86, 'happy']],
  }),
};

// 3 · Thinking: stem then lime tip drop in; camera rises to a high angle looking down.
const thinking: Chapter = {
  id: 'thinking',
  build: beat({
    beat: 'thinking', frame: ['body', 'stemL', 'tipL', 'hook'],
    from: { yaw: -22, pitch: 60, rScale: 1.3 }, drift: { yaw: 12, pitch: 30, rScale: 1.18 },
    faces: [[0.24, 'thinking'], [0.88, 'happy']],
  }),
};

// 4 · Knowledge: the hooked antenna lands; low angle from the right, sources stream in.
const knowledge: Chapter = {
  id: 'knowledge',
  build: beat({
    beat: 'knowledge', frame: ['body', 'hook'],
    from: { yaw: 42, pitch: -30, rScale: 1.35 }, drift: { yaw: 18, pitch: -8, rScale: 1.25 },
    faces: [[0.24, 'working'], [0.88, 'happy']],
  }),
};

// 5 · Acting: arm roots and pincers lock on; camera pans right → left; a pinch for every action.
const acting: Chapter = {
  id: 'acting',
  build(tl, at, dur, ctx) {
    beat({
      beat: 'acting', frame: ['body', 'clawL', 'clawR'],
      from: { yaw: 58, pitch: 4, rScale: 1.2 }, drift: { yaw: -48, pitch: 12, rScale: 1.12 },
      faces: [[0.24, 'working'], [0.9, 'happy']],
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

// 7 · Assembled: one rising 360° orbit, from a low worm's-eye angle up to eye level, a wave, the
// blueprint fades and the CTA lands.
const assembled: Chapter = {
  id: 'assembled',
  build(tl, at, dur, ctx) {
    const h = ctx.heroShot;
    camTo(tl, { ...h, yaw: 120, pitch: -16, radius: h.radius * 1.08 }, at, dur * 0.22, 'power1.in');
    camTo(tl, { ...h, yaw: 360, pitch: 4 }, at + dur * 0.22, dur * 0.36, 'power2.out');
    to(tl, { blueprint: 0 }, at + dur * 0.1, dur * 0.3, 'power1.inOut');
    set(tl, { face: 'love' }, at + dur * 0.1);
    set(tl, { face: 'happy' }, at + dur * 0.45);
    to(tl, { wave: 1 }, at + dur * 0.55, dur * 0.25);
  },
};

export const CHAPTERS: Record<ChapterId, Chapter> = {
  exploded, assemble, speaking, hearing, thinking, knowledge, acting, assembled,
};
