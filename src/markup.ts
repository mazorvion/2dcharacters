// Static, server-renderable markup for the story section, generated from content.ts.
// Used by the Vite dev/build HTML transform and (P8) by the Astro component.
import { CONTENT, type Content, type ChapterCopy } from './content';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** `*accent*` → <em>accent</em> (brand Newsreader italic). */
export const rich = (s: string) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

/** Like rich(), but every word sits in its own mask so the timeline can raise it in. */
const words = (s: string) =>
  s.split(/(\s+)/).map((w) => (!w || /^\s+$/.test(w) ? w : `<span class="w"><span class="wi">${esc(w)}</span></span>`)).join('');
export const richWords = (s: string) =>
  s.split(/(\*[^*]+\*)/).map((seg) => (seg.startsWith('*') && seg.endsWith('*') && seg.length > 1 ? `<em>${words(seg.slice(1, -1))}</em>` : words(seg))).join('');

/** Chapters with a projected capability demo (beats.ts docks its card in the .demo slot). */
const DEMO = new Set(['speaking', 'hearing', 'thinking', 'knowledge', 'acting']);

function chapter(ch: ChapterCopy, c: Content): string {
  const h = ch.id === 'exploded' ? 'h2' : 'h3';
  const cta = ch.id === 'assembled'
    ? `<div class="cta">
        <a class="btn btn-primary" href="${esc(c.cta.primary.href)}">${esc(c.cta.primary.label)}</a>
        <a class="btn btn-ghost" href="${esc(c.cta.secondary.href)}">${esc(c.cta.secondary.label)}</a>
      </div>`
    : '';
  const copy = ch.title
    ? `<div class="copy">
      <div class="head">
        ${ch.eyebrow ? `<p class="eyebrow"><i class="sq" style="background:var(--${ch.dot ?? 'cobalt'})"></i>${esc(ch.eyebrow)}</p>` : ''}
        <${h} class="title">${richWords(ch.title)}</${h}>
        ${cta}
      </div>
      ${DEMO.has(ch.id) ? '<div class="demo" aria-hidden="true"></div>' : ''}
    </div>`
    : '';
  return `<article class="chapter" data-ch="${ch.id}" data-stage="${ch.stage}" style="--len:${ch.len}">${copy}</article>`;
}

function frame(c: Content): string {
  const rest = c.diagramTitle.slice(c.diagramTitleBold.length);
  return `<div class="blueprint-frame" aria-hidden="true">
    <i class="mark t"></i><i class="mark b"></i><i class="mark l"></i><i class="mark r"></i>
    <p class="diagram-title"><b>${esc(c.diagramTitleBold)}</b>${esc(rest)}</p>
  </div>`;
}

export function storyMarkup(c: Content = CONTENT, opts: { poster?: string } = {}): string {
  const poster = opts.poster
    ? `<img class="poster" src="${esc(opts.poster)}" fetchpriority="high" width="1200" height="1200" alt="${esc(c.meta.posterAlt)}">`
    : '';
  return `<section id="double-story" class="story" data-mode="static" data-ch="hero" aria-labelledby="double-story-title">
  <a class="skip" href="#double-story-end">${esc(c.meta.skip)}</a>
  <div class="stage">
    <div class="paper" aria-hidden="true"></div>
    <div class="spot" aria-hidden="true"></div>
    ${poster}
    <canvas class="gl" aria-hidden="true"></canvas>
    <svg class="lines" aria-hidden="true"></svg>
    <div class="overlay" aria-hidden="true"></div>
    ${frame(c)}
  </div>
  <div class="chapters">
    ${c.chapters.map((ch) => chapter(ch, c)).join('\n    ')}
  </div>
  <span id="double-story-end"></span>
</section>`.replace('<h2 class="title">', '<h2 class="title" id="double-story-title">');
}

export function fillerMarkup(which: 'above' | 'below', c: Content = CONTENT): string {
  const f = which === 'above' ? c.meta.fillerAbove : c.meta.fillerBelow;
  return `<section class="filler filler-${which}"><h2>${rich(f.title)}</h2></section>`;
}
