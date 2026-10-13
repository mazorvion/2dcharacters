// Dev only: full-resolution screenshots of chapter moments (canvas + DOM overlays) with system Chrome.
// Usage: node scripts/dev/shoot.ts <prefix> <width>x<height> [chapter@frac ...] [--dpr=1] [--url=...] [--reduce]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}`))?.split('=')[1];
const pos = args.filter((a) => !a.startsWith('--'));
const prefix = pos[0] ?? 'shot';
const [w, h] = (pos[1] ?? '1440x900').split('x').map(Number);
const moments = pos.slice(2).length ? pos.slice(2) : [
  'intro@0.1', 'explode@0.35', 'explode@0.8', 'knowledge@0.5', 'channels@0.5', 'actions@0.5', 'assemble@0.6',
];
const url = flag('url') ?? 'http://localhost:5173/';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({
  viewport: { width: w, height: h }, deviceScaleFactor: Number(flag('dpr') ?? 1),
  reducedMotion: args.includes('--reduce') ? 'reduce' : 'no-preference',
  isMobile: w < 768, hasTouch: w < 768,
});
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()); });
await page.goto(url);
await page.mouse.move(w * 0.3, h * 0.3);
await page.waitForFunction(() => !!(window as unknown as { __ST?: unknown }).__ST, null, { timeout: 20000 });
await page.waitForTimeout(800);

for (const m of moments) {
  const [id, f] = m.split('@');
  const info = await page.evaluate(async ([id, frac]) => {
    const W = window as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const a = document.querySelector(`.chapter[data-ch=${id}]`) as HTMLElement;
    const len = a.offsetHeight + parseFloat(getComputedStyle(a).marginBottom); // minus the overlapping tail
    const y = a.getBoundingClientRect().top + scrollY + Number(frac) * len;
    if (W.__lenis) W.__lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y);
    W.__ST.update();
    await new Promise((r) => setTimeout(r, 60));
    W.__ST.getAll()[0].getTween()?.progress(1);
    for (let i = 0; i < 40; i++) W.__stage.renderFrame(0.05);
    const ri = W.__stage.renderer.info.render;
    const S = W.__state;
    const copy = document.querySelector(`.chapter[data-ch=${id}] .copy`) as HTMLElement;
    const tl = W.__ST.getAll()[0].animation;
    return `${id}@${frac} t=${tl.time().toFixed(1)} ch=${document.getElementById('double-story')!.dataset.ch} face=${S.face} callouts=${S.callouts.toFixed(2)}/${S.calloutsOut.toFixed(2)} vis=${Object.entries(S.vis).filter(([k]) => !k.startsWith("_")).map(([k, v]) => k + ":" + Number(v).toFixed(2)).join(",")} copyOp=${copy ? getComputedStyle(copy).opacity : "-"} calls=${ri.calls} tris=${ri.triangles}`;
  }, [id, f]);
  await page.waitForTimeout(120);
  const file = `.shots/${prefix}-${id}-${f}.png`;
  await page.screenshot({ path: file });
  console.log(info, '→', file);
}
await browser.close();
