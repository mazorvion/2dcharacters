// Her: layering and groups. The art is the original sprite set (commit 5681cf6) rendered with the 2D bead
// renderer. Her face is vector ink traced from the reference (face.ts), so it reads cleanly.
import type { Rig } from '../../types.ts';
import { HER_FACE } from './face.ts';

export const HER: Rig = {
  id: 'her',
  label: 'Her',
  order: ['legScreenL', 'legScreenR', 'torso', 'armScreenL', 'armScreenR', 'head'],
  faceAfter: 'head',
  groups: {
    head: ['head'],
    upper: ['head', 'torso', 'armScreenL', 'armScreenR'],
  },
  rest: {
    head: 'hero', torso: 'hero',
    armScreenL: 'hero', armScreenR: 'hero', legScreenL: 'hero', legScreenR: 'hero',
  },
  face: HER_FACE,
  restFace: { eyeL: 'open', eyeR: 'open', browL: 'up', browR: 'up', mouth: 'openSmile' },
  ref: { image: '/reference/duo-stage.webp', beadPx: 7.23, cell0: [1266.2, -68.29] },
  regions: { face: [26, 10, 58, 46], torso: [10, 30, 72, 66], legs: [10, 56, 66, 95] },
};
