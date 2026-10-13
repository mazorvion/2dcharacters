// Shared cast types (CHARACTERS.md §5–§9). L/R always mean screen-left/right (D7).
import type { INK } from './palette.ts';

export type CharId = 'him' | 'her';

export type PartName =
  | 'hairBack' | 'head' | 'hairFront' | 'torso' | 'earring'
  | 'armScreenL' | 'armScreenR' | 'legScreenL' | 'legScreenR';

/** [c0, r0, c1, r1) in canvas beads. */
export type Box = [number, number, number, number];

/** One filled vector shape of face ink, in canvas bead units (SVG path syntax). */
export interface InkShape {
  d: string;
  fill: keyof typeof INK | 'shadow';
  /** Only paint inside this path (e.g. the tongue inside the mouth). */
  clip?: string;
  /** Extra blur in beads (the nose shadow). */
  blur?: number;
  alpha?: number;
}

export type InkVariant = InkShape[];

export interface FaceDef {
  eyeL: Record<string, InkVariant>;
  eyeR: Record<string, InkVariant>;
  browL: Record<string, InkVariant>;
  browR: Record<string, InkVariant>;
  mouth: Record<string, InkVariant>;
  nose: InkVariant;
}

export interface FaceState {
  eyeL: string;
  eyeR: string;
  browL: string;
  browR: string;
  mouth: string;
  /** Eye shift in beads (±0.3); brows follow at half. */
  look?: [number, number];
}

export interface Rig {
  id: CharId;
  label: string;
  /** Back → front. */
  order: PartName[];
  /** Face ink is drawn right after this part ('head', so the bangs in hairFront can cover a brow). */
  faceAfter: PartName;
  /** Group name → parts it moves. A part moves by the sum of its groups' offsets; the face moves with 'head'. */
  groups: Record<string, PartName[]>;
  /** Drawing used for each part when a pose does not say otherwise. */
  rest: Partial<Record<PartName, string>>;
  face: FaceDef;
  restFace: FaceState;
  /** Where canvas cell (0,0)'s top-left corner sits in the reference image, and its bead pitch in px. */
  ref: { image: string; beadPx: number; cell0: [number, number] };
  /** Shoulder boxes: every drawing of an arm must match its rest drawing inside its box (cast:lint). */
  sockets?: Partial<Record<PartName, Box>>;
  /** Zoom regions for cast:shot. */
  regions: Record<string, Box>;
  /** When mirrored: drawings to swap in (e.g. her earring to the newly visible ear). */
  flipDrawings?: Partial<Record<PartName, string>>;
}

export interface Pose {
  drawings?: Partial<Record<PartName, string>>;
  offsets?: Record<string, [number, number]>;
  face?: Partial<FaceState>;
}

/** Everything needed to draw one character in one frame. */
export interface FrameState {
  drawings: Partial<Record<PartName, string>>;
  offsets: Record<string, [number, number]>;
  face: FaceState;
  flip: boolean;
}
