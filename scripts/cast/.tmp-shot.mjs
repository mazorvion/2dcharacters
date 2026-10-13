import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/characters?S=8'); await p.waitForTimeout(2500);
const png = await p.evaluate(() => window.__cast.framePNG(['her'], 16, undefined, '#f6f4ef'));
(await import('node:fs')).writeFileSync('.shots/cast/her-fixed.png', Buffer.from(png.split(',')[1], 'base64'));
await b.close();
