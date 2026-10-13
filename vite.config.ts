import { defineConfig, type Plugin } from 'vite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { storyMarkup, fillerMarkup } from './src/markup';

// Injects the server-rendered story markup (all copy from src/content.ts) into index.html,
// so the page reads fully without JavaScript.
function storyHtml(): Plugin {
  return {
    name: 'double-story-html',
    transformIndexHtml(html) {
      const poster = existsSync('public/poster/double-hero.webp') ? '/poster/double-hero.webp' : undefined;
      return html
        .replace('<!--story-->', storyMarkup(undefined, { poster }))
        .replace('<!--filler-above-->', fillerMarkup('above'))
        .replace('<!--filler-below-->', fillerMarkup('below'));
    },
  };
}

// Dev only: POST a dataURL to /__shot?name=x → .shots/x.png (visual comparison against reference/).
function devShots(): Plugin {
  return {
    name: 'double-dev-shots',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name')?.replace(/[^\w-]/g, '') || 'shot';
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          mkdirSync('.shots', { recursive: true });
          writeFileSync(`.shots/${name}.png`, Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

// Pretty route: /characters → characters.html (dev and preview).
function routes(): Plugin {
  const rewrite = (req: { url?: string }) => {
    if (req.url && /^\/characters\/?(\?|$)/.test(req.url)) req.url = req.url.replace(/^\/characters\/?/, '/characters.html');
  };
  return {
    name: 'double-routes',
    configureServer(server) { server.middlewares.use((req, _res, next) => { rewrite(req); next(); }); },
    configurePreviewServer(server) { server.middlewares.use((req, _res, next) => { rewrite(req); next(); }); },
  };
}

export default defineConfig({
  plugins: [storyHtml(), devShots(), routes()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      input: { main: 'index.html', characters: 'characters.html' },
    },
  },
});
