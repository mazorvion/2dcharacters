// Him: layering and groups. The art is the original sprite set (commit 5681cf6) rendered with the 2D bead
// renderer; the face is the original half-size blocks (features + eyes), not vector ink.
import type { FaceDef, Rig } from '../../types.ts';

const NO_INK: FaceDef = { eyeL: {}, eyeR: {}, browL: {}, browR: {}, mouth: {}, nose: [] };

export const HIM: Rig = {
  id: 'him',
  label: 'Him',
  order: ['legScreenL', 'legScreenR', 'torso', 'armScreenL', 'head', 'features', 'eyes', 'armScreenR'],
  faceAfter: 'eyes',
  groups: {
    head: ['head', 'features', 'eyes'],
    upper: ['head', 'features', 'eyes', 'torso', 'armScreenL', 'armScreenR'],
  },
  rest: {
    head: 'hero', features: 'hero', eyes: 'hero', torso: 'hero',
    armScreenL: 'hero', armScreenR: 'hero', legScreenL: 'hero', legScreenR: 'hero',
  },
  face: NO_INK,
  restFace: { eyeL: '', eyeR: '', browL: '', browR: '', mouth: '' },
  ref: { image: '/reference/duo-stage.webp', beadPx: 7.23, cell0: [599.74, -4.26] },
  regions: { face: [26, 10, 58, 46], torso: [10, 30, 72, 66], legs: [10, 56, 66, 95] },
};
