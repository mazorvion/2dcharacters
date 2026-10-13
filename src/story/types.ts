import type { Stage } from '../scene/Stage';
import type { Profile, State } from '../core/state';
import type { PartId } from '../scene/registry';
import type { ChapterId } from '../content';

export type Cam = State['cam'];
export interface ShotOpts {
  /** Framing uses part positions at this explode amount (1 = floating, 0 = attached). */
  yaw: number; pitch: number; explode?: number; rScale?: number; minR?: number; dy?: number;
  /** Subject offset as a fraction of the viewport (landscape). */
  sx?: number; sy?: number;
  /** Vertical offset in portrait, where the copy sits on top. */
  syPortrait?: number;
  rScalePortrait?: number;
}

export interface Ctx {
  stage: Stage;
  profile: Profile;
  root: HTMLElement;
  copy: HTMLElement | null;
  /** Camera shot framing these parts for the current profile. */
  shot(ids: readonly PartId[], o: ShotOpts): Cam;
  /** Assembled, right of the copy column (the closing CTA). */
  heroShot: Cam;
  /** Fully exploded 3/4 diagram view (the opening frame). */
  openShot: Cam;
}

export interface Chapter {
  id: ChapterId;
  /** Adds this chapter's tweens at absolute times [at, at + dur). */
  build(tl: GSAPTimeline, at: number, dur: number, ctx: Ctx): void;
}
