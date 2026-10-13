// cast:shot (CHARACTERS.md §10.3): reference | render | overlay with mismatch boxes → .shots/cast/
//   npm run cast:shot -- <him|her> [pose] [region] [--S=12] [--expr=happy]
//   npm run cast:shot -- swatches            (P1: material swatches next to reference crops)
// Needs `npm run dev` on :5173. In cloud sessions Chromium lives at /opt/pw-browsers/chromium.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const [char = 'him', pose = 'hero', region] = args.filter((a) => !a.startsWith('--'));
const url = flag('url') ?? 'http://localhost:5173/characters';
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url);
await page.waitForFunction(() => !!(window as unknown as { __cast?: unknown }).__cast, null, { timeout: 20000 });
mkdirSync('.shots/cast', { recursive: true });

type Api = {
  shot(o: object): Promise<{ png: string; mismatches: string[] }>;
  swatchShot(S?: number): Promise<string>;
};
const save = (file: string, png: string) => writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));

if (char === 'swatches') {
  const png = await page.evaluate(() => (window as unknown as { __cast: Api }).__cast.swatchShot(40));
  save('.shots/cast/swatches.png', png);
  console.log('.shots/cast/swatches.png');
} else {
  const opts = { char, pose, region, S: Number(flag('S') ?? (region ? 24 : 12)), expression: flag('expr') };
  const r = await page.evaluate((o) => (window as unknown as { __cast: Api }).__cast.shot(o), opts);
  const file = `.shots/cast/${char}-${pose}${region ? `-${region}` : ''}.png`;
  save(file, r.png);
  console.log(file);
  console.log(`${r.mismatches.length} cells differ from the reference (advisory, CHARACTERS.md §10.3)`);
  if (args.includes('--list')) console.log(r.mismatches.join('\n'));
}
await browser.close();
