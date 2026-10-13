// Dev only: full-page screenshot of a reference URL, split into viewport-height tiles.
import { chromium } from '@playwright/test';
const [url, out = '.shots/site', w = '1440'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: Number(w), height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
// scroll through so lazy images and reveal-on-scroll content load
const H = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 600) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(120); }
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}-full.png`, fullPage: true });
const secs = await page.evaluate(() => [...document.querySelectorAll('main > section, main > * > section, section[id]')].slice(0, 30).map((s) => {
  const r = s.getBoundingClientRect(); const h = s.querySelector('h1,h2');
  return `${s.id || s.className.slice(0, 40)} | y=${Math.round(r.top + scrollY)} h=${Math.round(r.height)} | ${h?.textContent?.trim().slice(0, 60) ?? ''}`;
}));
console.log(H); console.log(secs.join('\n'));
await browser.close();
