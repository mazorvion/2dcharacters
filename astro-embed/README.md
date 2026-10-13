# The Double · Astro drop-in

The exploded-view scroll story as one Astro component. Nothing to install in the Astro project:
three.js, GSAP and Lenis come bundled and load lazily, after the section's text has painted.

## Add it to the site

1. Copy the two folders in here into the Astro project, keeping their paths:

   | From here | To the Astro project |
   |---|---|
   | `public/double-story/` | `public/double-story/` |
   | `src/components/DoubleStory.astro` | `src/components/DoubleStory.astro` |

2. Render it where the section should go:

   ```astro
   ---
   import DoubleStory from '../components/DoubleStory.astro';
   ---
   <DoubleStory />
   ```

That's it. It also works with Astro view transitions (`<ClientRouter />`): the story tears down
when you navigate away and starts again when you come back.

## Options

| Prop | Default | When to change it |
|---|---|---|
| `fonts` | `true` | Pass `false` if the page already loads Funnel Display, Geist, Geist Mono and Newsreader (thedouble.ai does). Saves a duplicate font download. |
| `smoothScroll` | `true` | Pass `false` if the site already runs Lenis or another smooth-scroll library. The story then follows the site's scrolling. |
| `assets` | `<base>/double-story` | Only if you serve `public/double-story/` from a different URL (a CDN, say). |

On thedouble.ai you'll most likely want:

```astro
<DoubleStory fonts={false} />
```

## Placement rules

- Put it straight in the page flow, full width. It is a tall section (about 13 screens of scroll on desktop)
  with a sticky stage inside. A parent with `overflow: hidden`/`auto` or a `transform` breaks
  `position: sticky`, so don't wrap it in one.
- One per page.
- A fixed site header simply floats over the top of the story.
- All of its CSS is scoped under `#double-story`, so it doesn't restyle the rest of the page, and
  the page's own CSS variables don't change it.
- Without JavaScript or WebGL it shows the chapter headlines and the call-to-action as a plain
  stacked section.

## Changing the copy or the animation

Don't edit these files by hand; they're generated. In the double-story repo, edit
`src/content.ts` (all text) or the source, then run:

```sh
npm run build:astro
```

and copy the two folders over again. File URLs carry a content hash, so visitors never get a
stale mix of old and new files.
