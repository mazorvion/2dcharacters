// Him: layering, groups and reference alignment (CHARACTERS.md §5.3, §4.2).
import type { Rig } from '../../types.ts';
import { HIM_FACE } from './face.ts';

export const HIM: Rig = {
  id: 'him',
  label: 'Him',
  order: ['legScreenL', 'legScreenR', 'torso', 'armScreenL', 'head', 'hairFront', 'armScreenR'],
  faceAfter: 'head',
  groups: {
    head: ['head', 'hairFront'],
    upper: ['head', 'hairFront', 'torso', 'armScreenL', 'armScreenR'],
  },
  rest: {
    head: 'hero', hairFront: 'hero', torso: 'hero',
    armScreenL: 'pocket', armScreenR: 'present', legScreenL: 'hero', legScreenR: 'hero',
  },
  face: HIM_FACE,
  restFace: { eyeL: 'open', eyeR: 'open', browL: 'neutral', browR: 'neutral', mouth: 'smile' },
  // fitted by scripts/cast/draft.py on reference/duo-stage.webp
  ref: { image: '/reference/duo-stage.webp', beadPx: 7.23, cell0: [599.74, -4.26] },
  regions: {
    face: [38, 18, 58, 34], hair: [28, 9, 58, 30], torso: [20, 28, 58, 58], armL: [18, 36, 34, 58],
    armR: [42, 42, 70, 60], legs: [10, 52, 56, 94], shoes: [10, 80, 58, 94],
  },
};
