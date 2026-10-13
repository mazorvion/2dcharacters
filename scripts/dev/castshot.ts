// Dev only: screenshot /characters (idle off, front view). Usage: node scripts/dev/castshot.ts out.png [show] [WxH]
import { chromium } from '@playwright/test';
const [out = '.shots/cast.png', show = 'both', size = '1600x1000'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto('http://localhost:5173/characters');
await page.waitForFunction(() => !!(window as unknown as { __cast?: unknown }).__cast, null, { timeout: 20000 });
await page.click('[data-toggle="idle"]');
await page.click(`[data-group="show"] button[data-v="${show}"]`);
await page.click('[data-action="front"]');
await page.waitForTimeout(1500);
await page.screenshot({ path: out });
await browser.close();
