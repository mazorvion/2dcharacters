# The Double · scroll story (source)

The exploded-view character story from thedouble.ai, as editable source for an Astro site: the 3D
Double (built in code with three.js, no model files), the exploded diagram, the side-to-side scroll
choreography, the focus pop-outs and the capability cards.

## 1 · Add it to your Astro project

Copy the folders into your project root (they merge into your existing `src/`):

```
src/lib/double-story/          the story: scene, timeline, overlays, styles, copy
src/components/DoubleStory.astro
scripts/build-icons.ts         optional: regenerates the icon set
reference/                     the character and exploded-view references the model was matched to
```

Install the runtime packages:

```sh
npm install three@^0.186 gsap@3.15 lenis@1.3
npm install -D @types/three lil-gui stats-gl   # types + the ?debug panel (dev only)
```

Render it:

```astro
---
import DoubleStory from '../components/DoubleStory.astro';
---
<DoubleStory />
```

`<DoubleStory smoothScroll={false} />` if your site already runs Lenis or another smooth scroller.
Brand fonts are expected from your site (Funnel Display, Geist, Geist Mono, Newsreader). If a page
doesn't load them, import `src/lib/double-story/fonts.ts` there (needs the `@fontsource-variable/*`
packages it lists).

Run `astro dev` and open the page with `?debug` for live sliders: explode amount, per-part offsets
(with "copy JSON"), camera angles, quality tier.

## 2 · Where to apply your brand guidelines

| You want to change | Edit |
|---|---|
| Colours, fonts, radii, easing (brand tokens) | `styles/tokens.css`. Every colour and font in the section reads these variables. |
| Headlines, eyebrows, card text, CTA labels and links | `content.ts` (all copy lives here; `*word*` = italic accent) |
| Headline size, eyebrow style, spacing, column widths, buttons | `styles/story.css` |
| Capability cards (radius, shadow, padding, chips) | `styles/overlay.css` |
| Grid paper, frame marks, diagram title | `styles/blueprint.css` |
| Icons | `overlay/icons.ts` (generated: change the lists in `scripts/build-icons.ts`, run it with `node scripts/build-icons.ts` after `npm i -D simple-icons lucide-static`) |
| The character's felt colours and materials | `scene/materials.ts` |
| Which part pops out per beat, and how far | `POP` in `scene/explode.ts` |
| How faint the other parts go during a beat | `GHOST` in `scene/explode.ts` |
| Exploded layout | `EXPLODE` in `scene/explode.ts` (or tune live with `?debug`) |
| Beat order, camera moves, timing | `story/chapters/index.ts` and `story/timeline.ts` |
| Pixel face expressions, mouth lip-sync | `scene/face.ts` |
| Which side the Double stands on per beat | `stage` per chapter in `content.ts` |

## 3 · Map of the code

- `markup.ts` renders the static HTML from `content.ts` (server side, in the Astro component).
- `embed.ts` → `mount.ts` boots the story in the browser; the heavy part (`story/boot.ts`: three.js,
  GSAP, Lenis) is code-split and loads after the page has painted.
- `story/timeline.ts` is one scroll-scrubbed GSAP timeline; every motion runs through it (or
  `scene/idle.ts` for breathing, blinking, floating). Scroll time = scroll distance in `svh`.
- `scene/` builds and renders the Double: `buildProcedural.ts` (geometry), `explode.ts` (explode,
  focus pop, ghosting), `camera.ts` (framing), `face.ts`, `idle.ts`, `Stage.ts` (render loop).
- `overlay/` draws the DOM/SVG layer on top: diagram callouts and the five capability cards.

All CSS is scoped under `#double-story`, so it won't restyle the rest of your site. One story per
page; keep it out of any parent with `overflow: hidden` or a `transform` (they break the sticky stage).
