// npm run build:preview → dist-preview/double-story-preview.html: the demo page as ONE self-contained
// file (JS, CSS and Latin brand fonts inlined, no code-splitting), so it opens straight from disk in
// any browser, or can be dropped on any static host for a shareable preview link.
import { build, type Plugin } from 'vite';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

process.env.NODE_ENV = 'production';
const root = resolve(import.meta.dirname, '..');
const OUT = join(root, 'dist-preview');
const FILE = 'double-story-preview.html';

/** Keep the Latin font subsets only: the copy is English, and every subset would be inlined. */
const latinFontsOnly = (): Plugin => ({
  name: 'double-latin-fonts',
  enforce: 'pre',
  transform(code, id) {
    if (!/@fontsource/.test(id) || !id.split('?')[0].endsWith('.css')) return;
    return code.replace(/@font-face\s*\{[^}]*?(cyrillic|vietnamese|greek|symbols)[^}]*\}/g, '');
  },
});

await build({
  root,
  mode: 'production',
  logLevel: 'warn',
  define: { __DOUBLE_DEBUG__: 'false' },
  plugins: [latinFontsOnly()],
  build: {
    outDir: OUT,
    emptyOutDir: true,
    copyPublicDir: false,
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 50 * 1024 * 1024, // fonts → data: URIs
    chunkSizeWarningLimit: 4096,
    rolldownOptions: {
      input: join(root, 'index.html'), // the story demo only (not characters.html)
      output: { codeSplitting: false },
    },
  },
});

// inline the one script and the one stylesheet into the HTML
const dir = join(OUT, 'assets');
const assets = readdirSync(dir);
const js = assets.filter((f) => f.endsWith('.js'));
const css = assets.filter((f) => f.endsWith('.css'));
if (js.length !== 1 || css.length !== 1) throw new Error(`expected one .js and one .css, got ${assets.join(', ')}`);
let html = readFileSync(join(OUT, 'index.html'), 'utf8');
const code = readFileSync(join(dir, js[0]), 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(join(dir, css[0]), 'utf8').replace(/<\/style/gi, '<\\/style');
html = html
  .replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, () => '')
  .replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/, () => `<style>${style}</style>`)
  // module scripts run after parsing; an inline one placed at the end of <body> behaves the same
  .replace('</body>', () => `<script type="module">${code}</script>\n</body>`);
if (/src="\.?\/?assets\/|href="\.?\/?assets\//.test(html)) throw new Error('an asset reference was left un-inlined');
rmSync(join(OUT, 'index.html'));
rmSync(dir, { recursive: true });
writeFileSync(join(OUT, FILE), html);
console.log(`dist-preview/${FILE}  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
