// Starter clips (CHARACTERS.md §9.2). 24 fps; body keys on even frames.
import type { Clip } from './clip.ts';
import { demoTalk } from './lipsync.ts';

const idleTrack = { breathe: { every: 36, hold: 12 }, blink: true };

export const CLIPS: Record<string, Clip> = {
  idle: { fps: 24, length: 144, tracks: { him: { ...idleTrack }, her: { ...idleTrack, breathe: { every: 36, hold: 12, phase: 18 } } } },
  wave: {
    fps: 24, length: 96,
    tracks: { him: { blink: true, pose: [{ f: 0, v: 'hero' }, { f: 12, v: 'wave' }, { f: 72, v: 'hero' }] }, her: { ...idleTrack } },
  },
  talk: {
    fps: 24, length: 120,
    tracks: { him: { ...idleTrack }, her: { blink: true, breathe: { every: 36, hold: 12 }, lipsync: demoTalk(5) } },
  },
  duoHello: {
    fps: 24, length: 144,
    tracks: {
      him: { blink: true, pose: [{ f: 0, v: 'hero' }, { f: 8, v: 'wave' }, { f: 80, v: 'hero' }] },
      her: {
        blink: true, breathe: { every: 36, hold: 12 },
        expression: [{ f: 0, v: 'happy' }, { f: 20, v: 'laugh' }, { f: 52, v: 'happy' }],
        lipsync: demoTalk(2).map((c) => ({ ...c, start: c.start + 2.4, end: c.end + 2.4 })),
      },
    },
  },
};
