// The shared mouth set (CHARACTERS.md §6.1, §9.3): expressions plus the nine Rhubarb lip-sync shapes A–H, X.
// Every shape is built around one anchor (the mouth corners' midpoint), so swaps never jump.
import type { InkVariant } from '../types.ts';
import { ellipse, openMouth, poly, scale, stroke, type Pt } from './shapes.ts';

/** An open mouth: ink, a tongue in its lower part, optional teeth along the top. */
function open(cx: number, cy: number, w: number, h: number, round: number, tongue = 0.5, teeth = 0): InkVariant {
  const outer = openMouth(cx, cy, w, h, round);
  const inner = scale(outer, 0.8, 0.74, [cx, cy + h * (0.5 - round) * 0.5]);
  const v: InkVariant = [{ d: poly(outer), fill: 'ink' }];
  const innerD = poly(inner);
  if (tongue > 0) {
    // the tongue: a wide ellipse rising from the bottom of the opening
    const ty = cy + h * (1 - round) * 0.95;
    v.push({ d: ellipse(cx + w * 0.06, ty, w * 0.36, h * tongue * 0.75), fill: 'tongue', clip: innerD });
  }
  if (teeth > 0) {
    const ty = cy - h * round;
    v.push({ d: `M${cx - w / 2} ${ty - 1} L${cx + w / 2} ${ty - 1} L${cx + w / 2} ${ty + h * teeth} L${cx - w / 2} ${ty + h * teeth} Z`, fill: 'teeth', clip: innerD });
  }
  return v;
}

/**
 * `w` is the character's smile width (beads); `rest` is the character's own resting mouth (X).
 */
export function mouthSet(cx: number, cy: number, w: number, rest: InkVariant, extra: Record<string, InkVariant> = {}) {
  const t = 0.42; // line weight of a closed mouth
  const a: Pt = [cx - w / 2, cy], b: Pt = [cx + w / 2, cy];
  const set: Record<string, InkVariant> = {
    smile: [{ d: stroke(a, b, 0.55, t), fill: 'ink' }],
    flat: [{ d: stroke([cx - w * 0.36, cy], [cx + w * 0.36, cy], 0.05, t), fill: 'ink' }],
    frown: [{ d: stroke([cx - w * 0.36, cy + 0.2], [cx + w * 0.36, cy + 0.2], -0.35, t), fill: 'ink' }],
    o: open(cx, cy - 0.3, w * 0.36, 1.1, 0.5, 0.45),
    openSmile: open(cx, cy - 0.15, w * 0.92, w * 0.72, 0.12, 0.55),
    laugh: open(cx, cy - 0.2, w * 1.05, w * 0.85, 0.1, 0.5),
    // Rhubarb lip-sync shapes
    A: [{ d: stroke([cx - w * 0.3, cy], [cx + w * 0.3, cy], 0.02, t * 1.15), fill: 'ink' }], // M B P
    B: open(cx, cy - 0.05, w * 0.62, 0.55, 0.3, 0, 0.45), // K S T EE, teeth
    C: open(cx, cy - 0.1, w * 0.7, 1.0, 0.25, 0.45), // EH AE
    D: open(cx, cy - 0.15, w * 0.82, 1.6, 0.2, 0.5), // AA
    E: open(cx, cy - 0.25, w * 0.45, 1.3, 0.5, 0.45), // AO ER
    F: open(cx, cy - 0.2, w * 0.3, 0.8, 0.5, 0), // UW OW W
    G: open(cx, cy - 0.05, w * 0.6, 0.6, 0.25, 0, 0.55), // F V: top teeth on the lip
    H: open(cx, cy - 0.15, w * 0.7, 1.2, 0.25, 0.8), // L: tongue up
    X: rest,
    ...extra,
  };
  return set;
}
