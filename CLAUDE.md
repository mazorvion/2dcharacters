# The Double: exploded-view scroll story

The spec is `PLAN.md`. Read sections 0–4 before writing code, then do the phases in §8 in order. Do not move to the next phase until the current phase's ✅ criteria pass.

Hard rules:
- Stack: vanilla TypeScript, Vite, three.js, GSAP ScrollTrigger and Lenis. Do not use React, Spline, ScrollTrigger `pin` or postprocessing.
- All copy comes from `src/content.ts`. All motion runs through the master timeline (`src/story/timeline.ts`) or `src/scene/idle.ts`.
- Use the brand tokens in PLAN.md §1 exactly.
- Compare visuals against `reference/double-assembled.png` (hero) and `reference/exploded-view-diagram.webp` (explode chapter).
- Respect the budgets in PLAN.md §6.1. Run `npm run build` after every phase.
