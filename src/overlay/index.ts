// Projected DOM/SVG overlays, updated in the same frame as the WebGL render (PLAN.md §5.5),
// so labels stay locked to their 3D anchors during camera moves.
import type { Stage } from '../scene/Stage';
import { createCallouts } from './callouts';
import { createBeats } from './beats';

export interface Overlays { destroy(): void }

export function mountOverlays(root: HTMLElement, stage: Stage): Overlays {
  const overlay = root.querySelector<HTMLElement>('.overlay')!;
  const lines = root.querySelector<SVGSVGElement>('svg.lines')!;
  const parts = [createCallouts(overlay, lines, stage), createBeats(overlay, lines, stage)];
  let size = '';
  stage.onFrame(() => {
    const s = `${stage.width}x${stage.height}`;
    if (s !== size) { lines.setAttribute('viewBox', `0 0 ${stage.width} ${stage.height}`); size = s; }
    for (const p of parts) p.update();
  });
  return { destroy() { parts.forEach((p) => p.destroy()); } };
}
