// Master timeline + gsap.matchMedia profiles (PLAN.md §4.5).
// Timeline time = scroll distance in svh, so chapter labels line up exactly with the DOM chapters.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CONTENT } from '../content';
import { state, type Profile } from '../core/state';
import { PART_IDS, type PartId } from '../scene/registry';
import type { Stage } from '../scene/Stage';
import type { Chapter, Ctx, Cam, ShotOpts } from './types';
import { CHAPTERS } from './chapters';
import { resolveDiscrete, type Discrete } from './chapters/_util';

gsap.registerPlugin(ScrollTrigger);

const lenScale = (p: Profile) => (p === 'portrait' ? 0.8 : 1);

/** Continuous values every chapter may touch, reset at t = 0 so scrubbing to the top is always clean. */
const RESET = { assemble: 0, dim: 0, blueprint: 1, callouts: 0, calloutsOut: 0, clawPinch: 0, assembleBounce: 0, wave: 0, modelRotY: 0 };
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
        // landscape: the subject sits right of the copy column; portrait: below the copy
        sx: portrait ? 0 : (o.sx ?? 0.14),
        sy: portrait ? (o.syPortrait ?? 0.1) : (o.sy ?? 0),
      };
    };
    const heroShot = shot(PART_IDS, { yaw: 0, pitch: 4, explode: 0, rScale: 0.9, rScalePortrait: 1.15, sx: 0.13, syPortrait: 0.14 });
    // the default view: exploded, straight on, centred a little high so the headline fits below
    const openShot = shot(PART_IDS, { yaw: 0, pitch: 0, explode: 1, rScale: 0.66, rScalePortrait: 1.0, sx: 0, sy: -0.07, syPortrait: 0.1 });

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

    // never replace state.cam / vis / prog (tweens hold references to them): set their fields instead
    tl.set(state, RESET, 0);
    tl.set(state.cam, { ...openShot }, 0);
    tl.set(state.vis, ZERO5, 0);
    tl.set(state.prog, ZERO5, 0);
    let t = 0;
    chapters.forEach((ch, i) => {
      const dur = i === chapters.length - 1 ? total - t : ch.len * scale;
      starts.push([ch.id, t]);
      tl.addLabel(ch.id, t);
      const copy = root.querySelector<HTMLElement>(`.chapter[data-ch="${ch.id}"] .copy`);
      const ctx: Ctx = { stage, profile, root, copy, shot, heroShot, openShot };
      (CHAPTERS[ch.id] as Chapter).build(tl, t, dur, ctx);
      if (copy) {
        // copy rises in as it docks and fades out at the end of its beat
        if (i > 0) {
          gsap.set(copy, { opacity: 0, y: 24 });
          tl.fromTo(copy, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 22, ease: 'power2.out', immediateRender: false }, t - 4);
        }
        const keep = i === chapters.length - 1;
        if (!keep) tl.to(copy, { opacity: 0, y: -16, duration: 16, ease: 'power1.in' }, t + dur - 18);
      }
      t += dur;
    });
    tl.set({}, {}, total); // pad so scroll ↔ time is exactly 1:1

    return () => { gsap.set(root.querySelectorAll('.copy'), { clearProps: 'opacity,transform' }); };
  });
  return () => mm.revert();
}
