// cast:render (CHARACTERS.md §9.4): a clip → PNG frames → video.
//   npm run cast:render -- <clip> [--w=1920] [--h=1080] [--bg=#f6f4ef]
// Writes .out/<clip>/frames/0000.png… then, with ffmpeg:
//   <clip>.mp4  H.264 preview on the background colour
//   <clip>.mov  ProRes 4444 with alpha (editing master)
//   <clip>.webm VP9 with alpha (web)
// Needs `npm run dev` on :5173. In cloud sessions Chromium is at /opt/pw-browsers/chromium.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (k: string, d: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const clip = args.find((a) => !a.startsWith('--')) ?? 'idle';
const w = Number(flag('w', '1920')), h = Number(flag('h', '1080')), bg = flag('bg', '#f6f4ef');
const dir = `.out/${clip}`, frames = `${dir}/frames`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(flag('url', 'http://localhost:5173/characters'));
await page.waitForFunction(() => !!(window as unknown as { __cast?: unknown }).__cast, null, { timeout: 20000 });
type Api = { CLIPS: Record<string, { length: number; fps: number }>; renderFrame(c: string, f: number, w: number, h: number, bg?: string): string };
const info = await page.evaluate((c) => {
  const k = (window as unknown as { __cast: Api }).__cast.CLIPS[c];
  return k ? { length: k.length, fps: k.fps } : null;
}, clip);
if (!info) throw new Error(`unknown clip "${clip}"`);
for (let f = 0; f < info.length; f++) {
  const png = await page.evaluate(([c, f, w, h]) => (window as unknown as { __cast: Api }).__cast.renderFrame(c as string, f as number, w as number, h as number), [clip, f, w, h]);
  writeFileSync(`${frames}/${String(f).padStart(4, '0')}.png`, Buffer.from(png.split(',')[1], 'base64'));
}
await browser.close();
console.log(`${info.length} frames → ${frames}`);

const ff = (...a: string[]) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(info.fps), '-i', `${frames}/%04d.png`, ...a], { stdio: 'inherit' });
ff('-f', 'lavfi', '-i', `color=c=${bg}:s=${w}x${h}`, '-filter_complex', '[1][0]overlay=shortest=1,format=yuv420p', '-c:v', 'libx264', '-crf', '16', `${dir}/${clip}.mp4`);
ff('-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', `${dir}/${clip}.mov`);
ff('-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '20', `${dir}/${clip}.webm`);
console.log(`${dir}/${clip}.mp4, .mov (alpha), .webm (alpha)`);
