// Lip sync (CHARACTERS.md §9.3): Rhubarb Lip Sync JSON → the mouth shape at a frame.
// `rhubarb -f json vo.wav > vo.json` gives { mouthCues: [{ start, end, value: 'A'…'H' | 'X' }] } in seconds.

export interface MouthCue { start: number; end: number; value: string }
export interface RhubarbJson { mouthCues: MouthCue[] }

export function mouthAt(cues: MouthCue[], f: number, fps: number): string | undefined {
  const t = f / fps;
  for (const c of cues) if (t >= c.start && t < c.end) return c.value;
  return undefined;
}

/** A stand-in talk track for previews when there is no voice-over yet (seeded, so renders repeat exactly). */
export function demoTalk(seconds: number, seed = 7): MouthCue[] {
  const shapes = ['B', 'C', 'D', 'C', 'E', 'B', 'A', 'F', 'C', 'G', 'H', 'D'];
  const cues: MouthCue[] = [];
  let t = 0, i = seed;
  while (t < seconds) {
    const d = 0.08 + ((i * 37) % 7) * 0.02;
    cues.push({ start: t, end: t + d, value: (i * 5) % 9 === 0 ? 'X' : shapes[i % shapes.length] });
    t += d; i++;
  }
  return cues;
}
