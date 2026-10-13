# The Double: exploded-view scroll story

The spec is `PLAN.md`. Read sections 0–4 before writing code, then do the phases in §8 in order. Do not move to the next phase until the current phase's ✅ criteria pass.

Hard rules:
- Stack: vanilla TypeScript, Vite, three.js, GSAP ScrollTrigger and Lenis. Do not use React, Spline, ScrollTrigger `pin` or postprocessing.
- All copy comes from `src/content.ts`. All motion runs through the master timeline (`src/story/timeline.ts`) or `src/scene/idle.ts`.
- Use the brand tokens in PLAN.md §1 exactly.
- Compare visuals against `reference/double-assembled.png` (hero) and `reference/exploded-view-diagram.webp` (explode chapter).
- Respect the budgets in PLAN.md §6.1. Run `npm run build` after every phase.

## Character work (`/characters`, `src/cast`)
For the two human characters, the spec is `CHARACTERS.md`. It overrides PLAN.md and the rules above for the cast:
- Read CHARACTERS.md §0–§5 before writing code, then do its §11 phases in order, committing after each.
- The cast has its own clip system (`src/cast/anim`). The "master timeline / idle.ts" rule applies only to the story site.
- Bead colours come from CHARACTERS.md §4.1 (sampled from the reference art). Brand tokens still apply to the page UI.
- The art is hand-authored text grids. Never regenerate finished art from the reference, and never rotate or scale bead layers.
- L and R always mean screen-left and screen-right.
- Check every visual change with `npm run cast:shot` and look at the image before you call it done.
