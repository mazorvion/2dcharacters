// Her: layering, groups and reference alignment (CHARACTERS.md §5.3, §4.3).
import type { Rig } from '../../types.ts';
import { HER_FACE } from './face.ts';

export const HER: Rig = {
  id: 'her',
  label: 'Her',
  order: ['hairBack', 'legScreenL', 'legScreenR', 'torso', 'armScreenL', 'armScreenR', 'head', 'earring', 'hairFront'],
  faceAfter: 'head',
  groups: {
    head: ['hairBack', 'head', 'earring', 'hairFront'],
    upper: ['hairBack', 'head', 'earring', 'hairFront', 'torso', 'armScreenL', 'armScreenR'],
  },
  rest: {
    hairBack: 'hero', head: 'hero', earring: 'hero', hairFront: 'hero', torso: 'hero',
    armScreenL: 'present', armScreenR: 'presentHigh', legScreenL: 'hero', legScreenR: 'hero',
  },
  face: HER_FACE,
  restFace: { eyeL: 'open', eyeR: 'open', browL: 'up', browR: 'up', mouth: 'openSmile' },
  // fitted by scripts/cast/draft.py on reference/duo-stage.webp
  ref: { image: '/reference/duo-stage.webp', beadPx: 7.23, cell0: [1266.2, -68.29] },
  regions: {
    face: [30, 22, 52, 46], hair: [24, 20, 58, 46], torso: [26, 40, 56, 62], armL: [6, 42, 34, 62],
    armR: [46, 36, 78, 56], legs: [20, 52, 64, 94], shoes: [18, 84, 66, 94],
  },
};
