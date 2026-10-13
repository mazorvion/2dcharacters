// Her: layering and groups. The art is the original sprite set (commit 5681cf6) rendered with the 2D bead
// renderer; the face is the original half-size blocks (features + eyes), not vector ink.
import type { FaceDef, Rig } from '../../types.ts';

const NO_INK: FaceDef = { eyeL: {}, eyeR: {}, browL: {}, browR: {}, mouth: {}, nose: [] };

export const HER: Rig = {
  id: 'her',
  label: 'Her',
  order: ['legScreenL', 'legScreenR', 'torso', 'armScreenL', 'armScreenR', 'head', 'features', 'eyes'],
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
  scale: 1.075,
  ref: { image: '/reference/duo-stage.webp', beadPx: 7.23, cell0: [1266.2, -68.29] },
  regions: { face: [26, 10, 58, 46], torso: [10, 30, 72, 66], legs: [10, 56, 66, 95] },
};
