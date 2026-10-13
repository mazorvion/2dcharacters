# The Double — Exploded-View Scroll Story · Build Plan

This is the full plan for a scroll-driven web experience. As the visitor scrolls, The Double (TheDouble.ai's felt-blue agent mascot) comes apart into a blueprint-style exploded view. Each part then explains one capability: knowledge, channels, actions and skills (create, read, update, delete), workflows, guardrails and deployment. At the end the parts reassemble and a call to action appears.

The plan is written so that a cheaper model can carry it out phase by phase without making design decisions of its own. **Read sections 0–4 fully before writing any code.**

> **Scope update (2026-10-12, from the product owner). This overrides §2, §5.6 and §7 where they conflict.**
> This is one section of the thedouble.ai homepage (2nd or 3rd). Keep **all 10 chapters and the 12 detailed callouts (title + subline)**, but each chapter's copy is **headline only** (eyebrow + one title; no body paragraphs). **No overlay cards:** no chat bubbles, chips, tile ring, action log, workflow graph, rules panel or deploy tiles. Only the antenna signal rings remain. Non-focus parts fully hide during focus beats. The last chapter keeps its headline + 2 CTA buttons.
> - **Type, as on thedouble.ai:** Funnel Display 700 at −0.035em; accent phrase in *Newsreader Variable italic* 400 in `--cobalt` (written `*like this*` in `content.ts`); mono uppercase eyebrows in `--muted` with a 9px coloured square.
> - **Engineering deviations, all deliberate:** NeutralToneMapping instead of ACES (ACES turned cobalt purple); camera `sy` (vertical subject offset) replaces `safeBottom`; face (screen, icon, focus) values are time-resolved keyframes, not `tl.set`; each `.chapter` has a tail with a matching negative margin so its sticky copy stays docked for the whole beat.

> **Scope update (2026-10-13, cinematic cut). Overrides the layout in §2/§4.1 where they conflict.**
> The Double no longer sits in a fixed column. It opens centre stage (exploded diagram turning slowly while the five capability callouts draw in, then assembly), then **crosses the screen beat by beat** (speaking left, hearing right, thinking left, knowledge right, acting left) with a twirl and a hop, turned toward the other half, where that beat's headline and demo card play. The finale returns it to centre for the CTA. Each chapter's side is `stage` in `content.ts`; the copy is a full-height sticky column (`--tail: 100svh`) and the beat cards dock in its `.demo` slot. On arrival, each beat's part slides partway out of the body (`POP` in `explode.ts`: face screen forward, sensory patches off the sides, main board and memory module out toward the copy, claws out) while every other part ghosts toward the paper colour; the face stays in full colour so expressions read. There is no coloured glow behind the Double. Under reduced motion the Double glides without twirls or hops.

Reference images are in `reference/`:
- `reference/double-assembled.png`: the hero pose (the target for the assembled look).
- `reference/exploded-view-diagram.webp`: the exploded layout and blueprint styling (the target for chapter 1).

---

## 0. Decisions already made (do not re-litigate)

| Topic | Decision | Why |
|---|---|---|
| Rendering | **Real-time WebGL with three.js** (vanilla TypeScript, no React) | It is interactive (the face changes, the head looks at the cursor, parts can be focused), a small download, and one asset works at every screen size. thedouble.ai is an **Astro** site, so a framework-agnostic `mount(el)` module drops into it as an island. |
| Scroll engine | **GSAP 3 + ScrollTrigger** (scrubbed master timeline) + **Lenis** (smooth scroll) | This is the de-facto stack on award-winning scroll sites. GSAP, including all of its plugins, is free. |
| Layout technique | **CSS `position: sticky` stage**, NOT ScrollTrigger `pin` | Sticky is native, has no pin-spacer jank on iOS, and is cheaper. |
| The 3D model | **Phase A: procedural** (built from three.js primitives in code, about 0 KB of model download). **Phase B (optional): swap to a Blender or AI-generated GLB** that uses the same part-naming contract (§5.1). | There is no 3D asset yet. The character is made of simple soft shapes, so it can be rebuilt procedurally and convincingly. The contract means nothing else changes when a GLB arrives. |
| Labels, logos, cards, text | **DOM/SVG overlay** projected from 3D anchor points (not WebGL text) | Text stays crisp and accessible, logos are vector, the content is indexable for SEO, and it keeps the GPU cost low. |
| Rejected: Apple-style image sequence | Not used | It means 5–10 MB of frames, no interactivity, a re-render for every copy change, and it still needs a 3D model to render the frames from. |
| Rejected: Spline / React Three Fiber | Not used | Spline's runtime is heavy and gives less control. R3F adds React to an Astro site with no benefit for a single scene. |

### Pinned versions (latest stable on npm, checked 2026-10-12)
```
three 0.186.x · gsap 3.15.x · lenis 1.3.x · vite 8.x · typescript 5.x
@gltf-transform/cli 4.5.x (only for the optional GLB phase)
@fontsource-variable/funnel-display · @fontsource-variable/geist · @fontsource-variable/geist-mono · @fontsource/silkscreen
simple-icons (brand SVG paths) · lucide-static (generic icons)
dev only: lil-gui, stats-gl, @playwright/test
```

---

## 1. What TheDouble.ai is (source material for all copy)

Researched from thedouble.ai, /platform and /platform/actions-skills-workflows on 2026-10-12.

- **Positioning:** "Your AI Double talks & acts for you, across channels." An AI version of a person, or an AI teammate for a role (sales, SDR, support, recruiting, onboarding, executive assistant and others).
- **Configure → Train → Deploy → Act** (the platform's own framing). There are 4 setup steps: import from LinkedIn → clone voice and personality → set up knowledge → "ready to talk at every touchpoint".
- **Knowledge sources:** Text and chats, YouTube, LinkedIn, PDFs, Instagram, X, websites, Substack, Google Drive, links. The site calls this "Unified Training Data".
- **Channels:** Web, Phone, Gmail, WhatsApp, Google Meet, Slack, Instagram, plus Embed, Meetings, Email, API, MCP.
- **Deploy surfaces:** Live Double (interactive voice and text agent), Website Agent, Double Page, Card (AI link in bio), Presentation Agent. Also an email signature, a meeting background, a short URL and a QR code.
- **Native skills:** Presents slides · Books meetings · Captures & qualifies leads · Sends follow-ups · Updates CRM & sheets · Shares files & media · Interviews & quizzes · Support 24/7. Also: show images, share PDFs, embed links, show social content, questionnaires.
- **App actions and integrations:** Calendly, Google Calendar, Gmail, Google Sheets, HubSpot, Salesforce, Zoho CRM, Slack, API · MCP, "100+ tools".
- **Workflow builder:** triggers (chat start/end, topic mentioned, sentiment, a specific Double response, keywords/intent/quick actions) → conditions and routers → waits and delays → code and API calls → CRM and sheet updates.
- **Guardrails:** "Speaks only within rules you define" (topics, tone, depth, silence). Privacy by design: protection from crawlers and scrapers, public or private.
- ⚠️ **"Delete" actions are NOT on the public site.** The CRUD demo in chapter 5 includes a delete example ("cancel a duplicate meeting"). **Confirm with the product team before launch**, or swap it for "reschedule". All copy lives in `src/content.ts`, so this is a one-line change.

### Brand tokens (extracted from thedouble.ai's production CSS)
```css
--cobalt: #2f43f2;   --cobalt-pale: #dee2ff;  --closing: #2132bb;
--lime: #d4f53c;     --lime-400: #c3e62a;     --lime-edge: #9db52a;
--bubblegum: #ff4fae; --tangerine: #fb6906;   --orange: #ff7417;
--grape: #6a2cf5;    --amber: #ffc53d;
--ink: #15172b;      --ink-deep: #0e1020;     --muted: #57596d;  --faint: #6e7084;
--ground: #f6f4ef;   --neutral-100: #eeede8;  --neutral-200: #e1e0d9; --hero-wall-dark: #0d103f;
--font-display: "Funnel Display Variable", Arial, system-ui, sans-serif;
--font-sans: "Geist Variable", system-ui, sans-serif;
--font-mono: "Geist Mono Variable", ui-monospace, monospace;
--font-pixel: "Silkscreen", "Courier New", monospace;
--ease-brand: cubic-bezier(.22,.8,.2,1);
--radius-card: 22px; --radius-icon: 13px; --radius-pill: 99px; --radius-chip: 6px;
```
Use these exact values. The blueprint labels use `--font-mono` in uppercase. Headlines use `--font-display`. The pixel face echoes `--font-pixel`.

---

## 2. Experience storyboard (the scroll script)

A single page section, `#double-story`. One sticky full-viewport stage holds the canvas and the overlays. Chapter blocks scroll past it. The scroll length of each chapter is given in `svh` (small viewport height).

| # | id | Length | 3D action | Overlay / copy | Face |
|---|---|---|---|---|---|
| 0 | `hero` | 100svh | Assembled Double, front view as in `double-assembled.png`. Idle: breathing, blinking, head follows the pointer (desktop only), left claw waves once on load, antennas wobble. | H1 "Meet your Double." Sub: "It doesn't just talk. Scroll to take it apart." Scroll hint. | `idle` with blinks |
| 1 | `explode` | 200svh | Camera orbits to a 3/4 view (yaw ≈ 28°, pitch ≈ 12°). All parts fly out to the layout in `exploded-view-diagram.webp`, staggered outside-in. The ground becomes blueprint paper (grid fades in, corner ticks A/B and 1–4). | Header top-right: "THE DOUBLE — EXPLODED VIEW ASSEMBLY DIAGRAM". **Callouts with leader lines** draw in one at a time. Each part label is renamed to a capability (see §2.1). | `surprised` → `idle` |
| 2 | `face` | 150svh | Focus on the screen and cover. Other parts dim. The screen turns 15° toward the camera. | "Live Double: talks in your voice, with your personality." Chat bubble and voice waveform beside the screen. | Cycles `listening` → `talking` → `happy` |
| 3 | `knowledge` | 150svh | Focus on the internal chassis (PCB). The chips on the board light up (emissive pulses). | Knowledge-source logo chips (YouTube, LinkedIn, PDF, Website, Substack, Drive, X, Instagram) fly from the screen edges into the chassis anchor. Copy: "Trained on what you know." | `thinking` |
| 4 | `channels` | 200svh | Focus on the green antenna and topknot. Signal rings pulse from the antenna ball. | **Channel ring:** 8 tiles (Web, Phone, Gmail, WhatsApp, Meet, Slack, Instagram, API·MCP) orbit the antenna and are projected from 3D. The active tile cycles with scroll and shows a mini conversation preview. Copy: "One Double. Every channel." | Shows the active channel's glyph (icon mode) |
| 5 | `actions` | 250svh | Focus on both claws. The claw jaws **pinch** each time a new action card lands. | **Action log** (CRUD): CREATE, READ, UPDATE (animated cell flip New → Qualified), DELETE (strike-through, then collapse), SEND. Below it, a grid of the 8 native skills as chips. Copy: "It doesn't just talk. It acts." | `working` → `happy` |
| 6 | `workflows` | 150svh | Focus on the wiring harness. The wires glow, with pulses travelling along them. | SVG **node graph** growing out of the harness anchor: Trigger → Condition → (yes) Update Salesforce + Gmail follow-up / (no) Wait 2 days → Nudge. Dots travel along the edges. Copy: "Workflows that run themselves." | `thinking` |
| 7 | `guardrails` | 150svh | Camera swings to the rear 3/4. Focus on the ear housings and underbody (the "shell"). | Rules panel with toggles: Topics, Tone, Depth, "Stays silent on…", Public/Private, crawler protection. Copy: "Speaks only within rules you define." | `lock` |
| 8 | `deploy` | 150svh | Focus on the feet and underbody. The feet "step" (small hop). | 4 deploy tiles: Website Agent · Double Page · Card · Presentation Agent. Copy: "Stands wherever you show up." | `idle` |
| 9 | `assemble` | 150svh | All parts fly back, staggered inside-out, with a slight overshoot. Body squash-and-stretch bounce, claw wave, the blueprint fades back to the plain ground. | CTA: "Ready to meet your Double?" Buttons: **Create your Double** → `https://thedouble.ai/auth/signup`, **Book a demo** → `https://thedouble.ai/demo` | `love` → `happy` |

Total ≈ 1650svh on desktop. On portrait or mobile, multiply every chapter's length by 0.8.

### 2.1 Callout labels for the explode chapter (part → capability)
Mirrors the reference diagram's labels, rewritten as product meaning:

| Part (diagram name) | Callout title | Small mono subline |
|---|---|---|
| antenna (green ball) | CHANNELS | Web · Phone · WhatsApp · Slack · Gmail · Meet |
| topknot (blue hook) | TRIGGERS | Intent · keywords · sentiment |
| sensory patches (lime discs) | LISTENING | Voice & text, real time |
| screen + cover | LIVE DOUBLE | Your face, voice & personality |
| internal chassis (PCB) | KNOWLEDGE BASE | Unified training data |
| wiring harness | WORKFLOWS | Conditions · waits · API calls |
| arm roots + joint sockets | INTEGRATIONS | HubSpot · Salesforce · Sheets · 100+ |
| claws | ACTIONS & SKILLS | Book · update · send · delete |
| ear housings | GUARDRAILS | Rules you define |
| underbody | PRIVACY & SECURITY | Public or private, crawler-safe |
| feet | DEPLOY ANYWHERE | Website · Page · Card · Slides |
| screws (joint connections) | API · MCP | Connects to your stack |

---

## 3. Project structure

```
xplodedcharacter/
├─ PLAN.md · CLAUDE.md · reference/
├─ index.html                 # standalone demo page (story section + filler above/below)
├─ package.json · tsconfig.json · vite.config.ts
├─ public/
│  ├─ poster/double-hero.avif|webp   # LCP image, captured from our own scene (Phase 7)
│  ├─ poster/double-exploded.avif    # no-WebGL fallback still
│  ├─ textures/felt_normal.webp      # 512², tileable, CC0 (ambientCG "Fabric" or Poly Haven)
│  └─ textures/felt_rough.webp       # 512², optional
├─ scripts/
│  ├─ build-icons.ts          # copies needed SVGs from simple-icons + lucide-static → src/overlay/icons.ts
│  └─ capture-poster.ts       # Playwright: renders ?poster=1, saves PNG → AVIF/WebP
└─ src/
   ├─ index.ts                # export mount(el, opts) — the only public API
   ├─ content.ts              # ALL copy, chapters, channels, skills, actions, links
   ├─ styles/tokens.css · story.css · blueprint.css
   ├─ core/
   │  ├─ tier.ts              # device tier detection (§6.2)
   │  ├─ state.ts             # single mutable state object the timeline tweens (§4.2)
   │  ├─ scroll.ts            # Lenis + ScrollTrigger wiring (§4.4)
   │  └─ flags.ts             # ?debug ?poster ?nowebgl ?tier=low
   ├─ scene/
   │  ├─ Stage.ts             # renderer, camera, resize, render-on-demand loop
   │  ├─ camera.ts            # shot interpolation + fitDistance (§4.3)
   │  ├─ materials.ts         # felt, lime felt, screen glass, PCB, metal
   │  ├─ face.ts              # pixel face CanvasTexture + expressions (§5.4)
   │  ├─ idle.ts              # breathing, blink scheduler, pointer look, antenna springs
   │  ├─ explode.ts           # EXPLODE table + applyExplode() (§5.2)
   │  ├─ registry.ts          # PartRegistry type + anchors (§5.1)
   │  ├─ buildProcedural.ts   # Phase A: builds every part from primitives (§5.3)
   │  └─ loadGlb.ts           # Phase B: same registry from a GLB
   ├─ story/
   │  ├─ timeline.ts          # master timeline + gsap.matchMedia profiles
   │  └─ chapters/            # hero.ts explode.ts face.ts knowledge.ts channels.ts
   │                          # actions.ts workflows.ts guardrails.ts deploy.ts assemble.ts
   ├─ overlay/
   │  ├─ project.ts           # 3D→screen projection helper
   │  ├─ callouts.ts          # blueprint labels + SVG leader lines (§5.5)
   │  ├─ channelRing.ts · knowledgeStream.ts · actionLog.ts · workflowGraph.ts · rules.ts · deployTiles.ts
   │  └─ icons.ts             # generated
   └─ fallback/static.ts      # no-WebGL / reduced-motion presentation
```

**Rules for the executor:**
1. No React, no Spline, no ScrollTrigger `pin`, no postprocessing `EffectComposer` (fake the glow, §6.1).
2. Import three.js addons by path (`three/examples/jsm/...`). Never import the whole examples folder.
3. Every piece of user-visible text comes from `src/content.ts`.
4. All motion goes through the master timeline or `idle.ts`. Do not start ad-hoc `requestAnimationFrame` loops.
5. Keep `mount()` idempotent and return `destroy()`. Dispose geometries, materials and textures, kill ScrollTriggers, destroy Lenis.
6. After each phase, run `npm run build` and check that the acceptance criteria are met before starting the next phase.

---

## 4. Core architecture

### 4.1 DOM / layout (sticky stage)
```html
<section id="double-story" class="story">
  <div class="stage">                       <!-- position: sticky; top: 0; height: 100svh -->
    <img class="poster" src="/poster/double-hero.avif" fetchpriority="high" alt="The Double, TheDouble.ai's AI agent mascot">
    <canvas class="gl" aria-hidden="true"></canvas>
    <svg class="lines" aria-hidden="true"></svg>        <!-- leader lines, graph edges -->
    <div class="overlay" aria-hidden="true"></div>      <!-- projected labels, logos, cards -->
    <div class="blueprint-frame" aria-hidden="true"></div>
  </div>
  <div class="chapters">                    <!-- margin-top: -100svh; position: relative -->
    <article class="chapter" data-ch="hero" style="--len:100">
      <div class="copy"><h1>…</h1><p>…</p></div>      <!-- position: sticky; top: 18svh -->
    </article>
    … one <article> per chapter, height: calc(var(--len) * 1svh * var(--len-scale)) …
  </div>
</section>
```
- `.chapters` sits over the stage with `pointer-events: none`. `.copy` has `pointer-events: auto`.
- The real headings and paragraphs live in `.copy`. This keeps the copy indexable and readable without JS.
- Desktop: the `.copy` card sits in the left 38% column. Portrait: `.copy` becomes a bottom sheet (`bottom: 16px; max-height: 38svh`), and the 3D framing reserves the bottom 40% (§4.3 `safeArea`).

### 4.2 Single source of truth: `state.ts`
```ts
export const state = {
  explode: 0,                 // 0 assembled → 1 fully exploded (global)
  explodeScale: 1,            // per-profile spread multiplier (portrait < 1)
  focus: [] as PartId[],      // parts in focus; others dimmed
  dim: 0,                     // 0..1 how much non-focus parts fade
  cam: { yaw: 0, pitch: 4, radius: 1.6, tx: 0, ty: 0, tz: 0, safeBottom: 0 },
  modelRotY: 0,
  blueprint: 0,               // bg grid + frame opacity
  callouts: 0,                // 0..1 leader-line draw progress (staggered per label)
  face: 'idle' as Expression, faceIcon: null as string | null,
  clawPinch: 0, wireGlow: 0, chipGlow: 0, antennaPulse: 0,
  knowledgeFlow: 0, channelSpin: 0, channelActive: 0,
  actionStep: 0, graphFlow: 0, rulesOn: 0, deployOn: 0, assembleBounce: 0,
  dirty: true,
};
```
GSAP tweens these plain numbers. The Stage render loop reads them every frame. Discrete values (`face`, `faceIcon`) are set with `tl.call()` or `tl.set()` at chapter labels, and the reverse direction is handled with `onReverseComplete`-safe `tl.set` calls placed on both sides.

### 4.3 Camera "shots" (resize-proof framing)
The camera is defined by **orbit parameters**, not by absolute positions. This means a window resize never forces a timeline rebuild:
```ts
// camera.ts
position = target + sphericalToVec(yaw, pitch) * fitDistance(radius, camera.fov, aspect, safeBottom)
fitDistance(r, fovDeg, aspect, safeBottom) {
  const vFov = fovDeg * Math.PI/180;
  const hFov = 2*Math.atan(Math.tan(vFov/2)*aspect);
  const usableV = vFov * (1 - safeBottom);           // portrait bottom sheet
  return r / Math.sin(Math.min(usableV, hFov)/2) * 1.08;
}
// shift target down in screen space by safeBottom/2 so the subject sits in the visible area
```
Each chapter's shot is `{ yaw, pitch, radius, target }`. The target and radius come from `frameParts(ids, profile)`: the bounding sphere of those parts at their **exploded** positions for the current profile. Use `fov = 30` (a product-photography look and low distortion).

### 4.4 Scroll wiring (`scroll.ts`)
```ts
import Lenis from 'lenis';
import gsap from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const lenis = new Lenis({ lerp: 0.1 });              // touch stays native by default
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
// Stage render also hooks gsap.ticker so scroll, tween and render share one frame.
```
If `prefers-reduced-motion: reduce` is set, do not create Lenis (use native scroll).

### 4.5 Master timeline (`story/timeline.ts`)
```ts
const mm = gsap.matchMedia();
mm.add({ portrait: '(max-aspect-ratio: 4/5)', landscape: '(min-aspect-ratio: 4/5)',
         reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
  const profile = ctx.conditions!.portrait ? 'portrait' : 'landscape';
  const tl = gsap.timeline({ defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.chapters', start: 'top top', end: 'bottom bottom',
                     scrub: ctx.conditions!.reduce ? true : 0.8 } });
  let t = 0;
  for (const ch of CHAPTERS) {            // ch.len in svh/100 units, matches CSS --len
    tl.addLabel(ch.id, t);
    ch.build(tl, t, ch.len * lenScale(profile), profile);   // chapter adds its own tweens at absolute times
    t += ch.len * lenScale(profile);
  }
  tl.set({}, {}, t);                       // pad to exact total so scroll ↔ time is 1:1
  return () => { /* matchMedia auto-reverts */ };
});
```
- **Timeline time units equal chapter heights**, so `label` positions line up exactly with the DOM chapters.
- Optional snapping. Off by default; turn on if user testing shows people stop mid-transition: `snap: { snapTo: 'labelsDirectional', duration: { min: .2, max: .6 }, ease: 'power1.inOut' }`.
- Each chapter file exports `{ id, len, build(tl, start, len, profile) }`. Inside a chapter, use roughly: the first 25% for the transition in (camera and focus), the middle 60% for the content beats, and the last 15% as a hold.

### 4.6 Render loop (`Stage.ts`)
- Render **on demand**. Render only if `state.dirty`, or an idle animation is active, or the camera is still easing. Idle animations (breathing, blinking) are allowed to run at full fps only while the stage is on screen (IntersectionObserver) and the tab is visible.
- Every frame: `applyExplode()` → `applyFocusDim()` → `camera.update()` → `face.update()` → `renderer.render()` → `overlay.update()` (projected DOM). Overlay writes use `style.transform = translate3d()` only, never top/left.
- Pause everything when the stage is off screen. Resume on re-entry.

---

## 5. The character

### 5.1 Part contract (`registry.ts`). This is shared by the procedural and GLB builds.
```ts
export type PartId =
 | 'body' | 'screen' | 'cover' | 'chassis' | 'harness'
 | 'antenna' | 'topknot' | 'patchL' | 'patchR' | 'housingL' | 'housingR'
 | 'armRootL' | 'armRootR' | 'clawL' | 'clawR' | 'underbody' | 'footL' | 'footR'
 | 'screws';   // single InstancedMesh; each instance follows its parent joint
export interface Part {
  id: PartId; object: THREE.Object3D;      // pivot at the part's joint/attachment point
  anchor: THREE.Object3D;                  // child empty used for callout leader-line tip
  materials: THREE.Material[];             // cloned per part (needed for dimming)
  rest: { pos: Vector3; rot: Euler };      // captured at build
}
```
**GLB naming rule for Phase B:** the node names must equal the `PartId`s. Each node's origin is at its attachment point, and it contains an empty child called `<id>_anchor`. The claws contain `clawL_jaw` and `clawR_jaw` (the upper pincer, with a hinge-aligned origin).

### 5.2 Explode table (`explode.ts`)
Units: body radius ≈ 1. +Z points toward the viewer in the hero. Positions are **offsets from rest**. Tune them live with `?debug` (lil-gui).

| Part | Rest position | Exploded offset (landscape) | Exploded rotation Δ (deg) | Order (0 = first) |
|---|---|---|---|---|
| body | 0, 0, 0 | 0, 0, 0 | 0, −10, 0 | — |
| cover | 0, −0.02, 0.93 | −1.30, −0.55, 2.10 | 0, 18, 0 | 2 |
| screen | 0, −0.02, 0.88 | −0.85, −0.25, 1.45 | 0, 14, 0 | 3 |
| chassis | 0.10, 0.05, 0.40 | −0.15, 0.20, 0.95 | 0, 10, 0 | 4 |
| harness | 0.25, −0.10, 0.30 | 0.05, −0.10, 0.70 | 0, 0, 0 | 5 |
| antenna | −0.28, 0.98, 0.05 | −0.15, 1.25, 0 | 0, 0, −8 | 0 |
| topknot | 0.30, 0.95, −0.05 | 0.35, 1.05, 0 | 0, 0, 10 | 0 |
| patchL / patchR | ∓1.04, 0.05, 0.10 | ∓1.55, 0.35, 0 | 0, ∓20, 0 | 1 |
| housingL / housingR | ∓0.98, 0.05, 0.05 | ∓0.90, 0.25, 0 | 0, ∓10, 0 | 2 |
| armRootL / armRootR | ∓0.95, −0.38, 0.18 | ∓1.10, −0.20, 0.10 | 0, 0, 0 | 3 |
| clawL / clawR | ∓1.30, −0.25, 0.25 | ∓2.10, 0.10, 0.20 | 0, 0, ∓15 | 1 |
| underbody | 0, −0.86, 0 | 0, −0.85, 0.15 | 8, 0, 0 | 2 |
| footL / footR | ∓0.38, −1.02, 0.10 | ∓0.15, −1.45, 0.20 | 0, 0, 0 | 0 |
| screws | at joints | own joint offset + 0.45 along the joint axis | — | 4 |

```ts
// applyExplode(): per part p
const k = staggered(state.explode, p.order, maxOrder, 0.35);   // per-part local 0..1 with stagger
const e = easeInOutCubic(k);
const off = p.offset.clone().multiply(profileScale);           // portrait: x*0.55, y*1.2, z*0.9
p.object.position.copy(p.rest.pos).addScaledVector(off, e * state.explodeScale);
// add a small arc so parts don't travel in straight lines: y += sin(e*π) * 0.12 * |off|
p.object.rotation.set(rest + rotΔ * e)
```
- Exploding uses order 0 → max (outside-in). The `assemble` chapter reverses the stagger, so the inside parts return first, and it uses `back.out(1.4)` on the final 30%.
- **Dimming:** a part not in `state.focus` gets `material.opacity = 1 − 0.82*state.dim` (with `transparent = true` and `depthWrite = opacity > 0.99`) plus `scale *= 1 − 0.04*dim`.

### 5.3 Procedural build recipes (`buildProcedural.ts`)
Use `mergeGeometries` wherever a part has several static sub-meshes. **Budget: under 60k triangles total and under 40 draw calls.**

- **Felt material:** `MeshPhysicalMaterial({ color:'#2b44ea', roughness:0.92, sheen:1, sheenRoughness:0.75, sheenColor:'#7d8dff', normalMap: felt_normal, normalScale:(0.55,0.55) })`. Set texture `repeat` to (3,3) on the body and (1.5,1.5) on small parts. Lime felt: color `#c3e62a`, sheenColor `#efffb0`.
- **Body:** `SphereGeometry(1, 96, 64)` scaled (1.06, 0.96, 0.98). Displace vertices by low-frequency 3D value noise (amplitude 0.012) for the hand-made look. **Carve the front window:** drop the triangles whose centroid has `z > 0.35 && |x| < 0.66 && |y| < 0.46`. Use `side: DoubleSide`. The inside uses a darker cobalt (`#1a2aa8`) through a second material on the back faces (use `onBeforeCompile` with `gl_FrontFacing`, or a second mesh with `BackSide`). Add the joint sockets as 2 torus rings on the sides at the arm-root positions, plus 2 small holes on top for the antennas (dark discs).
- **Screen:** a curved rounded rectangle 1.36 × 0.94. Build it from `ShapeGeometry(roundedRect, 24)` and bend the vertices onto a cylinder of radius 1.4 around Y, with depth 0.06 (extrude). Material: black glass `MeshPhysicalMaterial({ color:'#0b0c12', roughness:0.28, clearcoat:1, clearcoatRoughness:0.15 })`. The **face plane** (same curve, inset 0.08) sits 0.004 in front, using `MeshBasicMaterial({ map: faceTexture, transparent:true, blending: AdditiveBlending, toneMapped:false })`. Add a small PCB connector box on the back (a dark box with 4 silver pins) so it reads as hardware once exploded.
- **Cover:** the same curved rounded-rect shape, slightly larger (1.42 × 0.98), black, depth 0.03.
- **Chassis (PCB):** a box 0.62 × 0.42 × 0.03, color `#1b1e26`, roughness 0.5. On top: 6–8 small boxes (chips, `#0f1115`, plus one silver can), a white 6-pin JST connector. Copper traces come from a 256² CanvasTexture of drawn lines, which is also used as the emissiveMap so `state.chipGlow` can light the traces in cobalt `#7d8dff`.
- **Harness:** 3–4 `TubeGeometry` wires (radius 0.012) along CatmullRom curves from the chassis connector toward the body interior. Colors: orange `#ff7417`, red `#e23b2e`, brown `#5a3a22`. A white connector block sits at each end. `state.wireGlow` raises emissive, and a moving pulse comes from offsetting a gradient emissiveMap along U.
- **Antenna:** stalk `CylinderGeometry(0.07, 0.08, 0.32)` with a lime collar ring, and a ball `SphereGeometry(0.30)` slightly squashed (1, 0.92, 1). All lime felt. Attach a simple damped spring on rotation.z/x that reacts to body motion (secondary motion).
- **Topknot:** `TubeGeometry` (radius 0.10, tubular 48, radial 16) along a hook curve: up 0.35, then curving over to the right and down 0.18. Rounded end caps are spheres. Cobalt felt. It gets a spring too.
- **Patches (ears):** `ExtrudeGeometry(circle r=0.27, { depth:0.05, bevelEnabled:true, bevelThickness:0.04, bevelSize:0.04, bevelSegments:6 })`, lime, with 3 tiny pegs on the inner face.
- **Housings:** `RoundedBoxGeometry(0.16, 0.72, 0.78, 6, 0.12)` (from `three/examples/jsm/geometries/RoundedBoxGeometry.js`), cobalt. Rotate it to sit flush on the body sides behind the patches.
- **Arm roots:** a cylinder r=0.30, depth 0.26, with a bevelled rim (Extrude circle + bevel). Add an inset socket ring (a torus) on the outer face, and a small silver gear (an extruded gear shape) on the right one, as in the diagram.
- **Claws:** a wrist (a capsule r=0.13) plus two pincer halves. Each half is an `ExtrudeGeometry` of a **crescent** shape: outer arc radius 0.42 from −20° to 200°, inner arc radius 0.24 offset +0.10 on x, traced back. Use `depth:0.16, bevelThickness:0.07, bevelSize:0.07, bevelSegments:8, curveSegments:32`. The lower half is fixed. The upper half (`clawX_jaw`) pivots at the hinge, and `state.clawPinch` rotates it from 0° to −28°. Each claw gets 2 silver screws as instances.
- **Underbody:** an ellipse disk (Extrude of an ellipse 0.62 × 0.48, depth 0.08, bevel 0.04), with 4 small pegs underneath and 2 foot sockets.
- **Feet:** `SphereGeometry(0.30)` scaled (1, 0.68, 1.15), with a top peg cylinder r=0.06, h=0.10.
- **Screws:** `InstancedMesh` of a merged (cylinder head + thin shaft) geometry, `MeshStandardMaterial({ color:'#c9ccd3', metalness:1, roughness:0.32 })`. Count is about 12.
- **Lighting:** `RoomEnvironment` → PMREM as `scene.environment` (no HDR download). Add one `DirectionalLight` (intensity 1.6, from front-top-left) and a hemisphere fill. **No real-time shadows.** Use a contact-shadow blob instead: a plane with a radial-gradient CanvasTexture under the feet. Its opacity and scale follow the feet height.
- **Renderer:** `antialias: tier !== 'low'`, `alpha: true` (the page background shows through), `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping` at exposure 1.05, `powerPreference: 'high-performance'`.

### 5.4 Pixel face (`face.ts`)
- A `CanvasTexture` from a 96×64 canvas. Draw a 48×32 logical grid at 2 px per cell. Use `magFilter = minFilter = NearestFilter`, `generateMipmaps=false`, and `colorSpace = SRGBColorSpace`.
- Eye color `#dff3ff`, drawn with a second pass of the cyan halo `#58c8ff` at 35% alpha, dilated by 1 cell (a fake glow that needs no bloom). Mouth color bubblegum `#ff4fae`.
- Sprites are string arrays. `X` means lit. The left eye is centered at grid (15,13), the right eye at (33,13), and the mouth at (24,22).
```ts
const EYE_RING = ['.XXXXX.','XX...XX','X.....X','X.....X','X.....X','XX...XX','.XXXXX.'];
const EYE_BLINK= ['.......','.......','.......','XXXXXXX','.......','.......','.......'];
const EYE_HAPPY= ['.......','..XXX..','.X...X.','X.....X','.......','.......','.......'];
const EYE_HEART= ['.XX.XX.','XXXXXXX','XXXXXXX','.XXXXX.','..XXX..','...X...','.......'];
const MOUTH    = ['X.X','XXX','.X.'];
const MOUTH_TALK = [['.X.','X.X','.X.'], ['...','XXX','...']];  // alternate at 8 fps
```
- Expressions: `idle`, `blink` (120 ms, every 2.5–6 s at random), `happy`, `surprised` (rings 9×9), `thinking` (eyes shifted up 2 cells plus 3 animated dots under them), `listening` (the mouth becomes 5 EQ bars), `talking`, `working` (the eye rings rotate a gap around them like a spinner), `lock` (a 9×9 padlock glyph replaces the mouth), `love`, and `icon` (draws `state.faceIcon`, a 16×16 monochrome bitmap rasterized once from the channel's SVG).
- Only redraw the canvas when the expression or its frame changes. Then set `texture.needsUpdate = true`.
- Pupils follow the pointer on desktop by shifting up to ±1 cell.

### 5.5 Blueprint callouts (`callouts.ts`), the signature look
- For each callout, project `part.anchor` to screen space every frame. **Labels sit in two fixed columns**, as in the reference diagram: left x = 6vw and right x = 94vw on landscape. A part whose projected x is less than the center goes in the left column.
- De-overlap: sort each column by anchor y and enforce a minimum gap of 34 px (2 relaxation passes), clamped to the safe area.
- SVG path per label: `M anchorX anchorY L elbowX labelY L labelX labelY` with `elbowX = labelX ± 48`. A 1px `--ink` stroke at 55% opacity, and a 3px dot at the anchor.
- Draw-in: `stroke-dasharray = length`. Map `state.callouts` to a per-label staggered progress through `stroke-dashoffset`. The label text fades and slides 6px.
- Label style: `font: 500 11px/1.2 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink)` with the subline at 10px in `--muted`.
- **Portrait:** do not use columns. Show only the 4–5 labels whose parts lie on the screen's left and right extremes. In later chapters, only the focused part's label stays visible, as a pill attached to the anchor.

### 5.6 Chapter overlays
- **channelRing:** 8 tiles (44px, radius `--radius-icon`, white card, brand-colored glyph) placed on a circle of radius 0.9 (world units) around the antenna's world position, in the camera-facing plane. Angle = `i/8·2π + state.channelSpin`. Project to screen each frame and give back tiles (dot product with the camera direction < 0) 40% opacity and 0.85 scale. `channelActive` (0..7, rounded) highlights one tile, scales it 1.15, and shows a speech-bubble preview from `content.ts`. Signal rings are 3 absolutely positioned CSS circles centered on the projected antenna ball, scaled 0.6 → 2.4 and faded, keyed to `state.antennaPulse` (looping inside the chapter).
- **knowledgeStream:** 8 source chips start at fixed positions along the viewport edges and lerp toward the projected chassis anchor, with per-chip stagger on `state.knowledgeFlow`. They scale to 0.3 and fade over the last 20% of their path. `chipGlow` peaks as each chip arrives.
- **actionLog:** a card stack on the right side (desktop) or as the bottom sheet (portrait). `state.actionStep` 0→5 reveals entries one by one. At each integer step, the claw pinch tween fires (0 → 1 → 0 over 0.3 of a step). The UPDATE entry flips the cell text with a 3D `rotateX` card flip. The DELETE entry draws a strike-through, then collapses its height to 0.
- **workflowGraph:** an SVG of 6 nodes laid out on a grid relative to the projected harness anchor (anchor = the trigger node's position). Edges are cubic paths. `state.graphFlow` draws the edges in, then circles move along them using `getPointAtLength`.
- **rules / deployTiles:** plain DOM cards with staggered reveal from `rulesOn` / `deployOn`. Toggles animate from off to on.
- All logos come from `overlay/icons.ts` (generated). Brand marks keep their official colors. Generic glyphs (Web, Phone, API, PDF, Website, Link) come from Lucide.

---

## 6. Performance and responsiveness

### 6.1 Budgets (these are acceptance criteria)
| Metric | Target |
|---|---|
| Initial HTML + CSS + poster (before any JS) | ≤ 120 KB |
| JS (gzip), three + gsap + lenis + app | ≤ 230 KB, loaded **after** the poster paints |
| Textures | ≤ 150 KB (felt normal 512² WebP plus the generated canvases) |
| Phase B GLB (if used) | ≤ 1.2 MB, meshopt plus WebP textures at 1024 or less, ≤ 60k triangles |
| LCP (mobile, slow 4G) | < 2.5 s (the poster is the LCP element) |
| CLS | 0 (the stage has a fixed size) |
| FPS | 60 on desktop and recent phones; ≥ 40 on tier `low` |
| Draw calls | < 40 |

- **Glow without bloom:** the face uses an additive halo pass (§5.4). Wires and chips use an emissive color with `toneMapped=false`. Do not use postprocessing.
- **Code-split:** `index.ts` statically imports only the CSS and a tiny bootstrap. `import('./scene/Stage')` runs on `requestIdleCallback` (or on the first scroll or pointer move, whichever comes first, with a 2.5 s fallback). After the first WebGL frame renders, crossfade from the poster to the canvas over 400ms.
- Fonts: preload only `Funnel Display` (latin) and `Geist Mono` (latin) with `font-display: swap`.

### 6.2 Device tiers (`tier.ts`)
```
low:   deviceMemory ≤ 4 || hardwareConcurrency ≤ 4 || saveData || UA iPhone with screen.width ≤ 375
       → dpr cap 1.0, no antialias, sphere segments 48×32, no pointer-look, halo off, scrub: true
mid:   default for phones/tablets → dpr cap 1.5
high:  desktop with a non-integrated GPU hint (WEBGL_debug_renderer_info) → dpr cap 2.0
?tier=low|mid|high overrides.
```
- **Runtime guard:** measure the average frame time over the first 90 rendered frames. If it is above 24 ms, drop one tier live (reduce DPR first).
- `renderer.setPixelRatio(Math.min(devicePixelRatio, cap))`.

### 6.3 Responsive profiles
| Profile | Trigger | Changes |
|---|---|---|
| `landscape` | aspect > 0.8 | Copy in the left column (desktop ≥ 1024px). The 3D framing is offset right: `cam.tx` is shifted so the subject's center sits at 60% of the viewport width. |
| `portrait` | aspect ≤ 0.8 | Copy is a bottom sheet, `safeBottom = 0.40`, explode spread is `x*0.55, y*1.2, z*0.9`, chapter length ×0.8, column callouts are replaced by focus pills, channel ring radius ×0.8, and the action log becomes a 2-row compact list. |
- Breakpoints to verify: 360×780, 390×844, 430×932, 768×1024, 1024×768, 1440×900, 1920×1080, and 2560×1440.
- Resize handling: on touch devices, ignore height-only changes under 140px (the mobile address bar). The canvas is CSS-sized to `100%` of the stage, and the renderer is resized with a 150 ms debounce.

### 6.4 Fallbacks and accessibility
- **No WebGL** (or `?nowebgl`): keep the poster. The chapters render as normal stacked sections, each showing a cropped still of `double-exploded.avif` and its copy card. Overlays are rendered statically.
- **`prefers-reduced-motion`:** no Lenis, no idle motion, no pointer-look. The timeline is still scroll-mapped but uses `scrub: true`, and the explode becomes a 2-state crossfade (assembled, then exploded) per chapter instead of continuous flight.
- The canvas, SVG and overlay are `aria-hidden`. All meaning lives in the `.copy` DOM. Buttons and links are real `<a>` elements and are keyboard focusable. Contrast must be ≥ 4.5:1.
- Add a **"Skip the animation"** link at the top of the section that jumps to the CTA.

---

## 7. `content.ts` shape (fill it with the copy from §1, §2 and §2.1)
```ts
export const CONTENT = {
  hero: { title: 'Meet your Double.', sub: "It doesn't just talk. Scroll to take it apart." },
  diagramTitle: 'THE DOUBLE — EXPLODED VIEW ASSEMBLY DIAGRAM',
  callouts: [{ part: 'antenna', title: 'CHANNELS', sub: 'Web · Phone · WhatsApp · Slack · Gmail · Meet' }, /* … §2.1 */],
  knowledge: { title: 'Trained on what you know.', body: '…', sources: ['youtube','linkedin','pdf','website','substack','googledrive','x','instagram'] },
  channels: { title: 'One Double. Every channel.', items: [
    { id:'web', label:'Website', preview:['Visitor: What does it cost?', 'Double: Plans start at…'] },
    { id:'whatsapp', label:'WhatsApp', preview:['Can I book a demo Thursday?', "Done — you're booked for Thu 3:00 PM ✓"] },
    /* phone, gmail, googlemeet, slack, instagram, api-mcp */ ] },
  actions: { title: 'It doesn\'t just talk. It acts.', log: [
    { verb:'CREATE', app:'googlecalendar', text:'Booked "Demo with Priya" · Thu 3:00 PM' },
    { verb:'READ',   app:'hubspot',        text:'Looked up Acme Corp · stage: Proposal' },
    { verb:'UPDATE', app:'googlesheets',   text:'Row 42 · Status', from:'New', to:'Qualified' },
    { verb:'DELETE', app:'googlecalendar', text:'Cancelled duplicate meeting' },   // ⚠ confirm with product
    { verb:'SEND',   app:'gmail',          text:'Follow-up sent to priya@acme.co' } ],
    skills: ['Presents slides','Books meetings','Captures & qualifies leads','Sends follow-ups',
             'Updates CRM & sheets','Shares files & media','Interviews & quizzes','Support 24/7'] },
  workflow: { title: 'Workflows that run themselves.', nodes: [/* trigger, condition, update, gmail, wait, nudge */] },
  guardrails: { title: 'Speaks only within rules you define.', rules: ['Topics','Tone','Depth','Stays silent on…','Private mode','Crawler protection'] },
  deploy: { title: 'Stands wherever you show up.', items: ['Website Agent','Double Page','Card','Presentation Agent'] },
  cta: { title: 'Ready to meet your Double?', primary: { label:'Create your Double', href:'https://thedouble.ai/auth/signup' },
         secondary: { label:'Book a demo', href:'https://thedouble.ai/demo' } },
};
```
Demo names and emails are fictional. The product team should review all copy.

---

## 8. Execution phases (do them in order, and check each phase's criteria)

**P0 · Scaffold (≈30 min)**
- Vite vanilla-ts project, the dependencies from §0, `tokens.css`, fonts, and the folder tree from §3. Create `scripts/build-icons.ts` and run it, which generates `icons.ts` for: whatsapp, gmail, googlemeet, slack, instagram, hubspot, salesforce, zoho, googlesheets, googlecalendar, calendly, youtube, linkedin, x, substack, googledrive, plus the Lucide glyphs globe, phone, file-text, link, plug, shield, lock, code.
- ✅ `npm run dev` serves a blank page with the brand fonts. `npm run build` passes with no type errors.

**P1 · Static story (no WebGL)**
- `index.html` with 2 filler sections above and below the story, the sticky stage, all 10 chapters with real copy from `content.ts`, the blueprint CSS (grid via `repeating-linear-gradient` at 24px/120px in `--ink` at 4%/8% alpha, the frame ticks, the title), and the fallback mode.
- ✅ The page reads well and looks on-brand with JS disabled. The sticky stage works. There is no horizontal scroll at 360px.

**P2 · Stage and the assembled Double**
- `Stage.ts`, `materials.ts`, `buildProcedural.ts`, `face.ts`, `idle.ts`, `registry.ts`. Frame the hero like the reference.
- ✅ Side by side with `reference/double-assembled.png`, the silhouette, proportions and colors read as the same character. Blink and breathing work. Pointer-look works on desktop. There are fewer than 40 draw calls (log `renderer.info`).

**P3 · Explode system and debug panel**
- `explode.ts` and `?debug` (lil-gui: an `explode` slider, a per-part offset editor with "copy JSON", camera shot sliders, a tier switch, stats-gl).
- ✅ At `explode = 1`, the 3/4 view resembles `reference/exploded-view-diagram.webp`. No parts intersect. The portrait profile fits inside 390×844 with the bottom 40% clear.

**P4 · Scroll story**
- `scroll.ts`, `timeline.ts`, all chapter `build()`s for the 3D parts only (camera, explode, focus/dim, face, pinch, glow).
- ✅ Scrolling forward and backward at any speed always gives a consistent state (no stuck faces or parts). Every chapter's subject is framed on both profiles.

**P5 · Overlays**
- callouts → knowledgeStream → channelRing → actionLog → workflowGraph → rules → deployTiles → CTA.
- ✅ Overlays stay locked to their 3D anchors during camera moves with no lag (they update in the same frame). Labels never overlap and never go off screen.

**P6 · Responsive, tiers, accessibility**
- §6.2–6.4 in full, including reduced motion and the runtime FPS guard.
- ✅ Checked at every breakpoint in §6.3, in DevTools with 4× CPU throttle on `?tier=low`, and with reduced motion on.

**P7 · Performance and poster**
- `capture-poster.ts`: use Playwright to load `?poster=1` (hero frame, transparent background, DPR 2, 1200×1200), save a PNG, and convert it to AVIF (q≈50) and WebP. Do the same for the exploded still. Add `<link rel=preload>` for the poster. Run a Lighthouse mobile pass.
- ✅ The budgets in §6.1 are met. Lighthouse mobile Performance ≥ 85 and Accessibility ≥ 95.

**P8 · Embed into thedouble.ai (Astro)**
- **Done (2026-10-13):** `npm run build:astro` writes `astro-embed/`: a self-contained `public/double-story/` bundle (scoped CSS, lazy JS, optional fonts) and a generated `DoubleStory.astro` with the server-rendered markup. No packages needed in the Astro project; see `astro-embed/README.md`. Entries: `src/embed.ts` (website, auto-mounts, handles `astro:page-load` / `astro:before-swap`), `src/index.ts` (demo page), shared `src/mount.ts`.
- Build `src/index.ts` as a library (`vite build --lib`, ESM). In Astro: `<section id="double-story">…static markup…</section><script>import { mount } from '@/lib/double-story'; mount(document.getElementById('double-story'));</script>`. The static markup can be generated from `content.ts` in an `.astro` component, so the copy is server-rendered.
- ✅ It runs inside the Astro page with no style leakage (all CSS scoped under `#double-story`), and `destroy()` cleans up on view-transition navigation.

**P9 (optional) · GLB upgrade**
- A modeler (or AI: Tripo, Hunyuan3D-Part segmentation, Meshy, or this workspace's Higgsfield `generate_3d`, then cleaned up in Blender) produces a GLB following the §5.1 naming contract. Then run: `npx @gltf-transform/cli optimize in.glb public/models/double.glb --compress meshopt --texture-compress webp --texture-size 1024`. Load it with `GLTFLoader` and `MeshoptDecoder` in `loadGlb.ts`, and switch the build behind a flag.
- ✅ The look is identical in framing, the explode table is unchanged, and the budget in §6.1 is met.

---

## 9. QA checklist
- [ ] Fast flick-scroll top→bottom→top on an iPhone (Safari) and a mid-range Android (Chrome): no jumps, no blank frames, no stuck overlays.
- [ ] Resizing a desktop window from 1920 down to 360 wide mid-story re-frames correctly (matchMedia profile swap).
- [ ] Tab hidden → render loop paused (check with Performance panel). Stage off screen → paused.
- [ ] `destroy()` then `mount()` again: no duplicate ScrollTriggers (`ScrollTrigger.getAll().length` stable), no WebGL context warnings.
- [ ] Keyboard: Tab reaches "Skip the animation" and both CTAs. Space and PageDown scroll smoothly.
- [ ] Copy reviewed by the product team. "Delete" action claim confirmed.
- [ ] Logo usage reviewed against each brand's guidelines (simple-icons paths are CC0, but the marks are trademarks).

## 10. Study references (techniques, not code to copy)
- GSAP ScrollTrigger scrub pattern, from Codrops: "On-Scroll Folding 3D Cardboard Box with Three.js and GSAP" — https://tympanus.net/codrops/2022/12/13/how-to-code-an-on-scroll-folding-3d-cardboard-box-animation-with-three-js-and-gsap
- Codrops: "How to Build Cinematic 3D Scroll Experiences with GSAP" (Nov 2025) — https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/
- Codrops: "Exploding 3D Objects with Three.js" (2019, idea reference) — https://tympanus.net/codrops/2019/03
- Exploding along a vector from the center (the technique used in §5.2) — https://discourse.threejs.org/t/model-explosion-effect/13446
- Exploded-view animation driven by playback progress (Babylon thread, same idea) — https://forum.babylonjs.com/t/animating-an-exploded-view/36022
- Apple AirPods image-sequence technique (considered and rejected, §0) — https://css-tricks.com/?p=308477
- Award reference for scroll-tied WebGL product storytelling: Unseen Studio × Superlist (Awwwards SOTD/SOTM) — https://unseen.co/projects/superlist/
- Lenis + R3F/GSAP mobile perf discussion (why we keep one scroll source of truth) — https://github.com/darkroomengineering/lenis/discussions/431
- three.js performance tips (draw calls, DPR caps, disposal) — https://www.utsubo.com/blog/threejs-best-practices-100-tips
- Blender exploded-view animation tutorial (for the P9 modeler) — https://www.blendernation.com/2024/07/05/make-an-exploded-view-animation-in-blender-4-1/
- Part-segmented AI 3D (P9): Tripo Segmentation / Hunyuan3D-Part — https://help.scenario.com/articles/9861107995-tripo-segmentation-the-essentials
