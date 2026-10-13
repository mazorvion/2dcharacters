// Master timeline + gsap.matchMedia profiles (PLAN.md §4.5).
// Timeline time = scroll distance in svh, so chapter labels line up exactly with the DOM chapters.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CONTENT } from '../content';
import { state, type Profile } from '../core/state';
import { PART_IDS, type PartId } from '../scene/registry';
import type { Stage } from '../scene/Stage';
import type { Chapter, Ctx, Cam, ShotOpts } from './types';
import { CHAPTERS, spotFor } from './chapters';
import { resolveDiscrete, type Discrete } from './chapters/_util';

gsap.registerPlugin(ScrollTrigger);

const lenScale = (p: Profile) => (p === 'portrait' ? 0.8 : 1);

/** Subject offset when the Double stands on one side (centre of the Double at 30 % / 70 %). */
const SIDE_SX = 0.2;

/** Continuous values every chapter may touch, reset at t = 0 so scrubbing to the top is always clean. */
const RESET = { assemble: 0, dim: 0, blueprint: 1, callouts: 0, calloutsOut: 0, clawPinch: 0, assembleBounce: 0, wave: 0, modelRotY: 0, hop: 0 };
const ZERO5 = { speaking: 0, hearing: 0, thinking: 0, knowledge: 0, acting: 0 };

export function buildTimeline(root: HTMLElement, stage: Stage): () => void {
  const mm = gsap.matchMedia();
  mm.add({
    portrait: '(max-aspect-ratio: 4/5)',
    landscape: '(min-aspect-ratio: 801/1000)', // plan's 4/5 overlapped portrait at exactly 0.8
    reduce: '(prefers-reduced-motion: reduce)',
  }, (mctx) => {
    const c = mctx.conditions!;
    const profile: Profile = c.portrait ? 'portrait' : 'landscape';
    const scale = lenScale(profile);
    stage.profile = profile;
    state.explodeScale = 1;
    const portrait = profile === 'portrait';

    const shot = (ids: readonly PartId[], o: ShotOpts): Cam => {
      const f = stage.cam.frameParts([...ids], profile, stage.exploder, o.explode ?? 1);
      return {
        yaw: o.yaw, pitch: o.pitch,
        radius: Math.max(o.minR ?? 0.4, f.radius * (portrait ? o.rScalePortrait ?? o.rScale ?? 1 : o.rScale ?? 1)),
        tx: f.tx, ty: f.ty + (o.dy ?? 0), tz: f.tz,
        // landscape: the subject stands on its chapter's side; portrait: centred between copy and card
        sx: portrait ? 0 : (o.sx ?? 0),
        sy: portrait ? (o.syPortrait ?? 0) : (o.sy ?? 0),
      };
    };
    // assembled, centre stage, a little high so the centred headline fits underneath
    const heroShot = shot(PART_IDS, { yaw: 0, pitch: 4, explode: 0, rScale: 1.0, sx: 0, sy: -0.075, rScalePortrait: 1.3, syPortrait: -0.01 });
    // the opening frame: exploded, turned a little so the parts read in depth
    const openShot = shot(PART_IDS, { yaw: -18, pitch: 9, explode: 1, rScale: 0.8, rScalePortrait: 1.0, sx: 0, sy: -0.075, syPortrait: 0.04 });
    // the time-0 pose, applied now: the section is visible (scrolling in) before the timeline first renders
    Object.assign(state, RESET);
    Object.assign(state.cam, openShot);
    Object.assign(state.vis, ZERO5);
    Object.assign(state.prog, ZERO5);
    Object.assign(state.spot, spotFor(CONTENT.chapters[0].dot), { s: 1 });
    state.dirty = true;

    const chapters = CONTENT.chapters;
    const total = chapters.reduce((a, ch) => a + ch.len, 0) * scale - 100;
    // declared before the timeline: ScrollTrigger may render (and call onUpdate) immediately
    const discrete: Discrete[] = [{ at: 0, vars: { face: 'idle', faceIcon: null, focus: '' } }];
    const starts: [typeof chapters[number]['id'], number][] = [];
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      data: { discrete },
      onUpdate: () => {
        state.dirty = true;
        const d = resolveDiscrete(discrete, tl.time()) as Partial<typeof state>;
        if (d.face !== undefined && d.face !== state.face) state.face = d.face;
        if (d.faceIcon !== undefined) state.faceIcon = d.faceIcon;
        if (d.focus !== undefined) state.focus = d.focus;
        // current chapter for CSS hooks (derived from time, so it is always reversible)
        const t = tl.time();
        let id = chapters[0].id;
        for (const [k, at] of starts) if (t >= at - 1) id = k;
        if (root.dataset.ch !== id) root.dataset.ch = id;
      },
      scrollTrigger: {
        trigger: root.querySelector('.chapters')!,
        start: 'top top',
        end: 'bottom bottom',
        scrub: c.reduce ? true : 0.8,
      },
    });

    // never replace state.cam / vis / prog / spot (tweens hold references to them): set their fields instead
    tl.set(state, RESET, 0);
    tl.set(state.cam, { ...openShot }, 0);
    tl.set(state.vis, ZERO5, 0);
    tl.set(state.prog, ZERO5, 0);
    tl.set(state.spot, { ...spotFor(chapters[0].dot), s: 1 }, 0);

    let t = 0;
    let rot = 0;
    let prevSx = 0;
    chapters.forEach((ch, i) => {
      const dur = i === chapters.length - 1 ? total - t : ch.len * scale;
      starts.push([ch.id, t]);
      tl.addLabel(ch.id, t);
      const copy = root.querySelector<HTMLElement>(`.chapter[data-ch="${ch.id}"] .copy`);
      const sx = portrait || ch.stage === 'center' ? 0 : ch.stage === 'left' ? -SIDE_SX : SIDE_SX;
      // one full twirl per side-to-side crossing, turning the way it travels (absolute, so reversible)
      const sideSx = ch.stage === 'center' ? 0 : ch.stage === 'left' ? -SIDE_SX : SIDE_SX;
      const travel = Math.sign(sideSx - prevSx);
      const rotFrom = rot;
      if (ch.stage !== 'center' && travel !== 0 && !c.reduce) rot += travel * 360;
      prevSx = sideSx;
      const ctx: Ctx = { stage, profile, root, copy, shot, heroShot, openShot, place: ch.stage, sx, dot: ch.dot, rotFrom, rotTo: rot, reduce: !!c.reduce };
      (CHAPTERS[ch.id] as Chapter).build(tl, t, dur, ctx);
      if (copy) copyMotion(tl, copy, ch.stage, i, chapters.length, t, dur, portrait);
      t += dur;
    });
    tl.set({}, {}, total); // pad so scroll ↔ time is exactly 1:1

    return () => {
      gsap.set(root.querySelectorAll('.copy, .copy .head, .copy .eyebrow, .copy .wi, .copy .cta'), { clearProps: 'opacity,visibility,transform' });
    };
  });
  return () => mm.revert();
}

/**
 * Copy enters from its own side as the Double crosses away from it (eyebrow slides, each word
 * rises out of its mask) and leaves toward its outer edge as the next crossing starts.
 */
function copyMotion(tl: GSAPTimeline, copy: HTMLElement, side: 'center' | 'left' | 'right', i: number, n: number, t: number, dur: number, portrait: boolean) {
  // copy sits opposite the Double: Double left → copy on the right (+1)
  const out = portrait || side === 'center' ? 0 : side === 'left' ? 1 : -1;
  const head = copy.querySelector<HTMLElement>('.head');
  const eyebrow = copy.querySelector<HTMLElement>('.eyebrow');
  const words = copy.querySelectorAll<HTMLElement>('.title .wi');
  const cta = copy.querySelector<HTMLElement>('.cta');
  const last = i === n - 1;

  if (i > 0) {
    const inAt = t + dur * (side === 'center' ? 0.06 : 0.12);
    const span = Math.min(dur * 0.2, 30);
    // hidden pose up front: staggered tweens that have not started yet must not show the rest pose
    gsap.set(copy, { autoAlpha: 0 });
    if (head) gsap.set(head, { x: out * 48 });
    if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 10 });
    if (words.length) gsap.set(words, { yPercent: 112 });
    if (cta) gsap.set(cta, { opacity: 0, y: 16 });
    tl.fromTo(copy, { autoAlpha: 0 }, { autoAlpha: 1, duration: span * 0.3, immediateRender: false }, inAt);
    if (head) tl.fromTo(head, { x: out * 48 }, { x: 0, duration: span, ease: 'power3.out', immediateRender: false }, inAt);
    if (eyebrow) tl.fromTo(eyebrow, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: span * 0.6, ease: 'power2.out', immediateRender: false }, inAt);
    if (words.length) {
      tl.fromTo(words, { yPercent: 112 }, {
        yPercent: 0, duration: span * 0.7, ease: 'power3.out', immediateRender: false,
        stagger: { amount: span * 0.35 },
      }, inAt + span * 0.08);
    }
    if (cta) tl.fromTo(cta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: span * 0.6, ease: 'power2.out', immediateRender: false }, inAt + span * 0.5);
  }
  if (!last) {
    const outAt = t + dur * 0.9;
    const span = dur * 0.12;
    tl.to(copy, { autoAlpha: 0, duration: span, ease: 'power1.in' }, outAt);
    if (head) tl.to(head, { x: out * 56, y: out === 0 ? -18 : 0, duration: span, ease: 'power2.in' }, outAt);
  }
}
