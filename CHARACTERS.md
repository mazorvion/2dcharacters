# The Double cast: 2D bead-art characters · Spec and build plan

This is the spec for the two human characters ("Him" and "Her") at `/characters`. It replaces the 3D voxel cast in
`src/characters/`. For anything about the cast, this file overrides PLAN.md. The scroll-story site (`index.html`,
`src/story`, `src/scene`, `src/overlay`) is out of scope: do not touch it.

Read §0–§5 completely before writing any code. Then do the phases in §11 in order. Do not start a phase until the
previous phase's ✅ criteria pass and are committed.

---

## 0. The goal in one paragraph

Rebuild both characters as **2D bead art** that looks exactly like `reference/duo-stage.webp`. That means pixel art
where every pixel is a soft, rounded felt/perler bead, plus smooth "printed" ink for the facial features. Build them
so they can **animate** (gestures, blinks, talking with lip sync) and be **exported as video** for product short
films, as well as run live on the website. The characters must stay on-model in every frame: clean outlines,
readable faces and consistent proportions.

**Out of scope for now:** The Double mascot (the blue felt crab-robot is a 3D plush, not bead art), environments and
props (stage disc, easel, plants, desk), and 3D turnarounds.

---

## 1. Reference files (the source of truth, in priority order)

| File | Use it for |
|---|---|
| `reference/duo-stage.webp` (2000×750) | **Canonical** for both characters: hero pose, proportions, colours, bead size. |
| `reference/cast/*.png` | Zoomed crops of `duo-stage.webp` (faces, torsos and arms, legs and shoes). Use these when drawing details. |
| `reference/him-ref.webp` | A higher-resolution render of Him in the same pose. Good for his face and hands. |
| `reference/duo-poster.webp` and `reference/cast/her-face-poster.png` | Her in a different angle and pose (leaning, fist bump). Use it for her face details and for a later "lean" pose. |
| `reference/her-ref.png` | ⚠️ A lower-resolution screenshot (with a carousel arrow in it). **Do not sample Her from it.** It is the main reason her current build is muddy. |

The references are AI renders. They contain noise: random dark beads, beads that are not quite on the grid,
smeared outlines. **Copy their design, not their noise.** When this spec's style rules (§3) and a reference pixel
disagree, the rules win. The reference wins for silhouette, proportions, colour placement and facial expression.

---

## 2. What the reference actually is (findings from the analysis)

1. **There are two resolutions in one image.**
   - The body is a bead grid: 1 bead = 1 pixel of pixel art.
   - The facial features (eyes, brows, mouth, eyelashes, tongue) are **not beads**. They are smooth ink shapes
     printed on top of the white beads, at sub-bead resolution. His smile is a thin curve about 0.45 bead thick;
     her eyebrows are thin arcs.
   - The current build forces the face onto a grid (full-size or half-size blocks). That is why the faces look
     wonky, asymmetric and broken. **Fix: draw the faces as vector ink (§6).**
2. **Every bead is axis-aligned, always.** A diagonal arm is drawn as a staircase of upright beads, never as rotated
   beads. So bead layers must never be rotated or scaled. Animation works by swapping drawings (§7).
3. **Bead look** (see `reference/cast/her-face.png`):
   - Each bead is a rounded square with a thin groove between neighbours. The light comes from the top-left: a
     lighter top-left, a darker bottom-right.
   - The texture is felt, slightly fuzzy.
   - Dark beads (hair, trousers) show strong 3D relief.
   - White beads are flatter. They have light-grey grooves and a tiny darker dot in the centre (like a perler
     bead's hole).
4. **Bead size is the same for both characters.** In `duo-stage.webp` the pitch is about 7.2 px. Fit it exactly
   (±0.05 px) with the overlay tool in P0.
   - Him: 593 px tall, about **82 beads** including his cowlick.
   - Her: 513 px tall, about **71 beads**.
   - The current code renders them at different bead sizes (`CELL = { him: 0.04, her: 0.043 }`). That is wrong.
5. **Outlines.** These are 1 bead thick and charcoal, and they are drawn on purpose (they are not a filter). Exactly
   where they appear is in §4. In short:
   - **Outlined:** all skin (face and jaw, neck sides, arms, hands), his white sneakers, her cobalt trousers (outer
     edges and inseam), her shoes.
   - **Not outlined:** his cobalt shirt (it reads by colour against the background), and the hair (it is charcoal
     already).
6. **Shading is drawn into the art with shade colours.** It is not lit by the renderer. Examples:
   - Darker cobalt in shirt folds and trouser creases.
   - Light grey on white under the chin, inside the ear, and where the shirt shadows the tee.
7. **Accents are rare and exact.**
   - Lime: his 2×2 sleeve patch, her earring. Nothing else.
   - Pink: only her tongue, and that is ink, not beads.

### 2.1 Why the previous attempts failed (do not repeat these)

- **The art was auto-sampled from the renders** (`scripts/extract-cast.py` → `sprites.gen.ts`).
  - This copied AI noise: speckles of dark cobalt on his shirt, broken arm outlines, mushy fingers.
  - It quantized the faces into blocks.
  - It turned the skin peak under her hair part into a white streak running up into her hair.
- **Her was sampled from the low-resolution `her-ref.png`** (67 rows instead of about 71).
- **The cast was built in 3D** (three.js voxels with orbit controls). The user wants **2D**, exactly like the image.
- **Posing rotated parts around joints.** That tilts beads and opens gaps at the joints.

---

## 3. Decisions (made: do not re-litigate)

- **D1 · 2D, Canvas 2D renderer.** No three.js for the cast and no new runtime dependencies. Canvas 2D gives
  pixel-exact compositing and deterministic frame export. If the story site later needs the cast, it can upload the
  canvas as a `CanvasTexture`.
- **D2 · The art is hand-authored text grids.** One character per bead, one file per part drawing (§5). A draft may
  be generated from the reference **once** as an underlay. After that, every row is cleaned by hand and the
  generator is never run again over the finished art. `sprites.gen.ts` is deleted once the drafts exist.
- **D3 · Faces are vector ink.** They use SVG path strings in head-local bead units and are drawn above the beads
  (§6).
- **D4 · One bead size for the whole world.** Him is about 82 beads tall, Her about 71. Both characters live on an
  80 × 96 bead canvas (§5.2).
- **D5 · Never rotate or scale bead layers.** Motion is:
  - drawing substitution (swap the arm drawing),
  - whole-bead offsets of part groups,
  - face-ink swaps.
- **D6 · Body motion is stepped at 12 drawings/s ("on twos").** Films run at 24 fps, and each body drawing is held
  for 2 frames. That gives a handmade, stop-motion feel that suits beads. Face ink may change every frame. Camera
  moves are smooth.
- **D7 · L and R always mean screen-left and screen-right (the viewer's side).** They never mean the character's
  anatomical side. This applies to file names, code and comments. Example: `armScreenR` is the arm on the right of
  the screen.
- **D8 · Bead material colours come from the reference art (§4.1), not from the UI brand tokens.** Felt cobalt is
  more saturated than UI cobalt. Page UI around the cast (buttons, type, background) still uses the PLAN.md §1
  tokens.
- **D9 · Determinism.** No `Math.random()` anywhere in rendering. Use a seeded PRNG keyed by stable ids. Time comes
  from the frame index. The same clip and frame must always produce the same pixels.

---

## 4. Model sheets (what to draw)

### 4.1 Bead materials (palette characters)

| Char | Material | Base (mid) | Groove | Use |
|---|---|---|---|---|
| `.` | empty | n/a | n/a | transparent |
| `K` | charcoal | `#322c2d` | `#161213` | hair, his trousers, her jacket, her shoe uppers |
| `k` | charcoal-deep | `#1f1a1b` | `#100c0d` | separations inside black areas: sleeve and body seams, trouser folds, the hair's under-layer |
| `O` | outline | `#322c2d` | `#161213` | 1-bead outlines. Renders exactly like `K`, but tools treat it differently (lint, re-outline). |
| `W` | white | `#efeeec` | `#cfccc9` | skin, tee, her top, sneaker white, her sole stripe |
| `w` | white-shade | `#d9d6d3` | `#bdb9b6` | soft shading on white: under the chin, inner ear, neck sides, the tee under the shirt edge, palm creases |
| `g` | white-deep | `#bdb9b6` | `#a29e9b` | rare, deep shadow on white (armpit, under the collar) |
| `B` | cobalt | `#0632ea` | `#06178a` | his shirt, her trousers and lapels, sneaker overlays |
| `b` | cobalt-deep | `#0b1f9e` | `#050f5c` | folds, creases, collar undersides, waistband line |
| `c` | cobalt-light | `#3a5cf0` | `#1a2fb0` | rare highlight on a raised fold or the collar's top edge |
| `L` | lime | `#cbee32` | `#8fa816` | his sleeve patch, her earring |
| `l` | lime-deep | `#a3c21c` | `#6f8510` | lime shading (bottom row of the earring) |

Ink and other colours:

| Name | Value |
|---|---|
| ink | `#1b1718` |
| tongue | `#f08aa8` |
| tongue-deep | `#d86f8e` |
| Studio background | `--ground` `#f6f4ef` |
| Film plates | the reference cream `#fefbf5` |

The base colours were sampled from `duo-stage.webp`. The median bead colours were:

| Area | Median sample |
|---|---|
| Shirt / trousers | `#012fe8` / `#0131ee` |
| Hair / trousers / jacket | `#312c2c` / `#352f2f` / `#332e2f` |
| Tee | `#efeeec` |
| Lime | `#cbee32` |

**Tune the renderer, not the art,** until a rendered bead's centre matches those samples within ΔE < 4.

### 4.2 Him (hero pose = the left figure in `duo-stage.webp`)

**Overall pose**
- About 82 beads tall and about 54 wide.
- Three-quarter view, body turned toward screen-right.
- Relaxed A-stance with weight on the screen-left leg.
- Screen-left hand is in his trouser pocket. The screen-right arm is held out in an open-palm "presenting" gesture.

**Hair (`K`, with `k` under-layer)**
- Messy and voluminous.
- A **cowlick**: a 2–3 bead wide strand rising about 5 beads above the head mass at the top-right of the crown,
  stepping to the right like a little flame.
- Tufts step out on the screen-right side above the ear and at the back on the screen-left.
- The **bangs** sweep from the crown down to the screen-left and end in a point over his screen-left eye.
- On the screen-right side the hairline rises and shows forehead.
- On the screen-left, hair runs down behind the ear to the jaw.
- The silhouette is chunky, with steps of 1–3 beads. **No single-bead hairs.**

**Face (`W` skin, `w` shading)**
- About 13 beads wide and 12 tall.
- A 1-bead `O` jaw outline runs from below the ear down to the chin. The chin is at the lower-right, which shows
  the three-quarter turn.
- No ear outline is visible on the screen-right. An ear shows on the screen-left, with `w` inside.
- Facial features are ink (§6.2), not beads.

**Neck**
- 3–4 beads wide, white.
- `w` shading directly under the jaw.
- `O` outline on the screen-right edge.

**Tee**
- White crew neck, visible in the shirt's open V from the neck down to the waist, 5–6 beads wide.
- `w` along both edges where the shirt shadows it.

**Shirt (cobalt camp shirt, open, short-sleeved, no outline)**
- **Collar:** raised points on both sides of the neck, 2–3 beads each. `b` on the underside, an optional `c` on the
  top edge.
- **Body:**
  - The hem ends at the upper thigh.
  - The screen-right front panel hangs straight and is a little longer.
  - Fold lines in `b`: one under each collar, one at each armpit, and 1–2 long vertical folds down the front panels.
  - Each fold is a continuous line at least 3 beads long, never a speckle.
- **Sleeves:** wide and short, ending above the elbow. They belong to the **arm** drawings so they move with the
  arms.
- **Patch:** a 2×2 `L` patch near the hem of the screen-left sleeve.

**Screen-left arm**
- The white forearm (with `O` outline) comes out of the sleeve and runs down along his side.
- The hand disappears into his trouser pocket at the hip; a few `O` beads mark the pocket edge.

**Screen-right arm**
- Held out to the right and slightly down (about 25–30° below horizontal).
- The forearm is 3–4 beads thick with an `O` outline. Draw it as a clean 2:1 staircase.
- **Hand:** open, palm up, about 7 beads long. Four fingers, slightly spread, separated by 1-bead `O` lines; the
  thumb is up. `w` palm crease.

**Trousers (`K`, folds in `k`)**
- Wide and straight, about 9–10 beads per leg.
- The screen-left leg angles out to the left. The screen-right leg is nearly vertical.
- A short `k` fold at each knee and a 1-bead `k` line where the legs separate.
- The hems sit on the shoes.

**Sneakers (chunky "Dunk" style)**
- About 10 beads long and 5 tall.
- White base, cobalt overlays (toe cap, a side panel/swoosh shape, heel), white lace area.
- `O` outline all the way round.
- **Sole:** one white midsole row plus one `O`/`K` outsole row.
- The screen-left shoe points left. The screen-right shoe points right.

### 4.3 Her (hero pose = the right figure in `duo-stage.webp`)

**Overall pose**
- About 71 beads tall and about 60 wide with her arms out.
- Body almost frontal. Head a slight three-quarter, turned toward screen-right.
- Both arms open in a "ta-da" presenting gesture. The screen-right arm is higher (it presents the easel).

**Hair (`K`, with `k` under-layer)**
- A voluminous, wavy bob down to the shoulders, about 22 beads wide, so wider than her head.
- The silhouette is bumpy and wavy (steps of 1–3 beads), with 2–3 soft bumps on the crown.
- **Side part** just to the screen-right of centre. The bangs sweep down to the screen-left across the forehead.
- **Forehead peak:** under the part, the skin rises into the hair as a narrow peak, at most 3 beads above the brow
  line and 2 beads wide at its top. **Not a streak up through the hair.** That was the previous build's worst
  artifact.
- The hair covers both ears except the screen-left ear.

**Screen-left ear and earring**
- The ear is white with `w` inside and an `O` outline.
- The **earring** hangs just below the earlobe: a lime rectangle of 2×2 beads (2×3 is allowed if the overlay says
  so), with an `l` bottom row.

**Face**
- About 15 beads wide. Rounder and softer than his.
- 1-bead `O` jawline down to a soft, slightly pointed chin.
- `w` shading on the neck under the chin.
- Facial features are ink (§6.3).

**Neck**
- 3 beads wide, with `w` at the sides.

**Top**
- White, visible in the jacket's V from the neck to the waistband.

**Jacket (charcoal, cropped blazer, open)**
- It ends at the waist, just above the waistband.
- **Lapels:** cobalt facing on both sides. A `B` strip about 2 beads wide runs down the inside edge of each front
  panel and widens into a notched lapel near the collar (3–4 beads wide there). A `b` line runs along the lapel's
  outer edge.
- **Sleeves:** long, charcoal, slightly full at the shoulder. They belong to the arm drawings.
- A `k` seam separates each sleeve from the body.

**Arms and hands**
- **Screen-left arm:** goes out and slightly up to the left. Open hand, palm up, fingers spread, thumb up.
- **Screen-right arm:** raised higher toward the upper right, open hand with the palm up and out.
- Each hand is about 7–8 beads long, `W` with an `O` outline and 1-bead `O` finger separations.

**Trousers (cobalt, high-waisted, wide-leg)**
- **Waistband:** 2 rows of `B`, with a `b` line on top.
- From the hip to the floor each leg flares like an A-line, to about 14 beads wide at the hem. The legs are apart
  with an inverted-V gap between them.
- **`O` outline:** 1 bead, on the outer edges **and** down both sides of the inseam (the inverted V).
- **Creases:** one `b` line, 1 bead wide, down the middle of each leg. It follows the leg's angle (a clean
  staircase, slightly diagonal) and runs from the hip to the hem.

**Shoes**
- Low black shoes, toes pointing outward: the screen-left foot points left, the screen-right foot points right.
- About 8 beads long and 3 tall.
- `K` upper, one `W` row (sole stripe and toe highlight), `O` bottom outline.

### 4.4 Pixel-art style rules (apply to every drawing)

1. **No orphans.** Never leave a single bead whose colour differs from all 4 of its neighbours, unless it is a
   listed detail (see `art/<char>/details.md`).
2. **Outlines are 1 bead and 8-connected.** No gaps and no doubled (2-thick) outlines. The one exception is the
   bottom row under the shoes, which may be 2 thick for weight.
3. **Clean staircases.** Diagonal edges use consistent step lengths:
   - about 45° → 1:1
   - about 27° → 2:1
   - about 18° → 3:1
   - Never irregular runs such as 2-1-3-1 inside one straight edge.
4. **Shade lines are deliberate.** Each `b`, `k` or `w` line is a continuous run of at least 3 beads that follows the
   garment or form. No speckles.
5. **Silhouette first.** At thumbnail size (each character 80 px tall) both characters must still read as
   themselves: his cowlick and open shirt, her bob and wide trousers.
6. **Joint overlap.** Every part overlaps its neighbour by at least 1 hidden bead at each joint (neck under head,
   arm under sleeve, trousers under the shirt hem). That way a ±1 bead offset never opens a gap.

---

## 5. Data format and file layout

### 5.1 Files

```
src/cast/
  palette.ts              bead materials (§4.1) and ink colours. The single place colours live.
  grid.ts                 parses .txt grids (header and rows), validates their size and characters
  types.ts                Part, Drawing, Pose, FaceState, Clip types
  art/him/
    head.hero.txt         full-canvas grids, one per part drawing (see §5.2)
    hairBack.hero.txt
    hairFront.hero.txt
    torso.hero.txt
    armScreenL.pocket.txt
    armScreenR.present.txt
    legScreenL.hero.txt
    legScreenR.hero.txt
    rig.ts                part list, z-order, groups, default drawings, reference alignment
    face.ts               ink shapes and expressions (§6)
    details.md            intentional single-bead details (for the orphan lint)
  art/her/                same structure, plus an earring part
  render/beads.ts         bead stamp generator (§8.1)
  render/compose.ts       draws a posed character into a canvas (§8.2)
  render/ink.ts           draws face ink with Path2D (§8.3)
  anim/poses.ts           pose library (§7.3)
  anim/clip.ts            clip type and sampler: (clip, frameIndex) → frame state
  anim/lipsync.ts         Rhubarb JSON → mouth-shape track (§9.3)
  studio/main.ts          the /characters page (§10)
  styles/cast.css
scripts/cast/
  draft.py                ONE-TIME: reference → draft grids in art/<char>/_draft/ (an underlay, never final)
  lint.ts                 grid checks (§10.2)
  shot.ts                 Playwright: render plus a side-by-side and overlay with the reference → .shots/cast/
  render.ts               Playwright: clip → PNG sequence (alpha) → ffmpeg (§9.4)
```

Remove `src/characters/*` and the old `characters.html` script tag in P1. They stay in git history (commit
`5681cf6`). Keep `scripts/extract-cast.py` only until `draft.py` replaces it, then delete it. Add these to
`package.json`:

```
"cast:lint":   "node scripts/cast/lint.ts"
"cast:shot":   "node scripts/cast/shot.ts"
"cast:render": "node scripts/cast/render.ts"
```

### 5.2 The grid file format

**Every drawing is a full-canvas layer.**
- Each character has one canvas of **80 columns × 96 rows** (beads).
- The feet's ground contact is the bottom of row **93** (rows 94–95 are spare).
- The character is centred on column **40**.
- Every drawing of every part is a grid exactly 80 × 96, with the part drawn in its real position.

This removes all anchor and pivot maths: layers line up by construction, and diffs and overlays are trivial. Most of
each file is `.`, and that is fine.

```
# part: armScreenR
# drawing: present
# note: open palm up, 2:1 forearm staircase
................................................................................
....................................................OOOO........................
...  (96 rows of exactly 80 characters)
```

- Header lines start with `#`. Rows are exactly 80 characters, using only `.` and the palette characters in §4.1.
- Import with Vite `?raw` (`import armR from './armScreenR.present.txt?raw'`), so editing a grid hot-reloads the
  studio instantly.
- `grid.ts` throws if a file has a wrong row count or width, or an unknown character, and names the file, row and
  column.

### 5.3 Rig (`rig.ts`)

```ts
export const HIM: Rig = {
  canvas: { w: 80, h: 96, baseline: 93 },
  // back → front
  order: ['hairBack', 'legScreenL', 'legScreenR', 'torso', 'armScreenL', 'head', 'hairFront', 'armScreenR'],
  groups: {                                 // parts that move together under one offset
    head: ['hairBack', 'head', 'hairFront', 'face'],
    upper: ['torso', 'armScreenL', 'armScreenR', 'head*'],   // 'head*' = the whole head group
  },
  drawings: { head: { hero: headHero }, armScreenR: { present: ..., wave: ... }, ... },
  face: HIM_FACE,                           // §6
  ref: { image: 'reference/duo-stage.webp', beadPx: 7.2, cell0: [px, py] },   // fitted in P0
};
```

- The face ink is drawn right after `head` and `hairFront`, and before any part ordered after `hairFront`.
- **Her order:** `hairBack, legScreenL, legScreenR, torso, armScreenL, armScreenR, head, earring, hairFront`.
  Her arms are behind her head and hair.

---

## 6. Faces (vector ink): the most important part

### 6.1 System

- **Coordinates:** each character's `face.ts` defines shapes in **canvas bead units** (floats; (0,0) is the canvas's
  top-left), as SVG path `d` strings. The head group's offset is added when drawing.
- **Elements:** `browL`, `browR`, `eyeL`, `eyeR`, `mouth`, `nose`. Her eyes include the lash stroke in the eye
  shape.
- **Variants per element:**

| Element | Variants |
|---|---|
| eyes | `open`, `half`, `closed` (a thin down-arc), `happy` (a ^ arc), `wide`, `lookL`, `lookR`, `lookUp` |
| brows | `neutral`, `up`, `down`, `worried`, `skeptical` (one raised) |
| mouth | `smile` (his default), `openSmile` (her default), `laugh`, `o`, `flat`, `frown` and the 9 lip-sync shapes `A B C D E F G H X` (§9.3) |
| nose | a single soft shadow, no line (a blurred ellipse at 8–10% black) |

- **Anchors:** every mouth variant shares the same centre point, and every eye variant shares its eye's centre. So a
  swap never jumps.
- **FaceState:** `{ eyes, browL, browR, mouth, look?: [dx, dy] }`. `look` shifts both eyes (up to ±0.3 bead) and the
  brows (half as much).
- **Blink:** `open → half → closed → closed → half → open`, at 24 fps, one frame per step. It repeats every 2.5–6 s,
  with the gap drawn from a PRNG seeded by character and clip.

### 6.2 Him: starting geometry

Measured from `duo-stage.webp`; units are beads.

| Feature | Starting geometry |
|---|---|
| Eyes | Solid ink, vertical rounded rectangles **1.7 w × 2.8 h**, corner radius 0.8, no catch-light. The centres are **4.2 apart** and level with each other. |
| Brows | Thin arcs **2.4 long, 0.45 thick**, about 0.9 above the eye tops, gently arched. The screen-left brow is half hidden under the bangs, so draw it before `hairFront`, or clip it. |
| Mouth (`smile`) | Closed smile: a curve **3.5 wide**, sagging 0.9, line **0.45 thick**, with tiny 0.3 up-ticks at both ends. Its centre is **3.9 below** the eye-centre line and about **0.8 toward screen-left** of the eyes' midpoint. |
| Nose | Soft shadow between the eyes and the mouth, toward screen-right (the side the head is turned). |

### 6.3 Her: starting geometry

| Feature | Starting geometry |
|---|---|
| Eyes | Solid ink vertical ovals **1.6 w × 2.9 h**, centres **5.8 apart**. The screen-right eye is drawn 0.85× as wide (three-quarter foreshortening). |
| Lashes | A thick upper-lid stroke **0.45 thick** over each eye. It runs past the outer corner by about 0.8 bead and ends in a small upward flick. Including the lash, the screen-left eye's box is about 3.2 × 3.2. |
| Brows | Arched arcs **2.8 long, 0.5 thick**, about 1.2 above the eye tops. Happy and raised in the hero pose. |
| Mouth (`openSmile`) | A "D" shape **3.2 w × 2.5 h**: an almost flat top edge and a round bottom. Ink outline 0.35. Inside, ink in the upper 45% and **tongue pink** in the lower 55% (`tongue-deep` along its bottom edge). Centred under the eyes' midpoint, **4.2 below** the eye-centre line. |
| Nose | Soft shadow, as for him. |

**Use these numbers only as a starting point.** Then match them to `reference/cast/him-face.png` and
`reference/cast/her-face.png` with the studio overlay (§10) until the overlay shows no visible offset.

### 6.4 Ink rendering

- Draw after the head beads with `ctx.scale(S, S)`, then `fill(new Path2D(d))`.
- Fill with `ink`. Use a `0.04·S` blur (`ctx.filter`) so the edges look printed rather than vector-sharp.
- Use `globalCompositeOperation = 'multiply'` at 95% so the bead grooves faintly show through, as with print on
  beads.
- The tongue is drawn clipped to the mouth's interior path.
- Never snap ink to the bead grid.

---

## 7. Rig, poses and drawing substitution

### 7.1 Parts

| Part | Contents |
|---|---|
| `hairBack` | Hair behind the head and neck. For her, this is the volume behind her shoulders. |
| `head` | Skin, jaw outline, ear(s). |
| `hairFront` | Bangs and fringe over the forehead. |
| `torso` | Neck, tee or top, shirt or jacket body, collar, lapels, waistband. |
| `armScreenL`, `armScreenR` | Sleeve, arm and hand together as **one drawing per gesture**. |
| `legScreenL`, `legScreenR` | Trouser leg and shoe. |
| `earring` (her) | |

### 7.2 Motion vocabulary per frame

1. **Which drawing** each part uses.
2. **Integer offsets** for groups, in beads:
   - Breathing = `upper` dy 0 ⇄ −1.
   - A nod = `head` dy +1.
3. The **FaceState**.
4. `flipX` (mirror the whole character). Each character's `rig.ts` lists flip fixes. For example, when Her is
   flipped the earring must move to the newly visible ear.

There is no rotation, no scaling and no sub-bead offset of bead layers. The character's **root** position in a
scene is in whole beads on body frames, so it steps like stop-motion. Only the camera moves smoothly.

### 7.3 Starter drawing library

**Him**

| Part | Drawings |
|---|---|
| `armScreenR` | `present` (hero), `wave` (raised high, open hand), `point` (index finger to the right), `thumbsUp`, `down` (relaxed) |
| `armScreenL` | `pocket` (hero), `down`, `wave` |
| Legs | `hero`, `neutral` (feet closer together) |

**Her**

| Part | Drawings |
|---|---|
| `armScreenL` | `present` (hero), `down`, `fistBump` (see the poster) |
| `armScreenR` | `presentHigh` (hero), `wave`, `point`, `down` |
| Legs | `hero`, `neutral` |

Every new drawing is copied from the hero drawing and redrawn only where it changes. Arm drawings must meet the
torso at the same shoulder beads as the hero drawing.

### 7.4 Expressions (FaceState presets)

| Preset | Eyes | Brows | Mouth |
|---|---|---|---|
| `neutral` | open | neutral | smile or flat |
| `happy` (hero) | open | up | smile / openSmile |
| `laugh` | happy | up | laugh |
| `surprised` | wide | up | o |
| `thinking` | lookUp | skeptical | flat |
| `talk` | open | neutral | lip-sync driven |
| `wink` | eyeL closed | | smile |

---

## 8. Renderer

### 8.1 Bead stamps (`render/beads.ts`)

At bead scale `S` px (always an integer: 8 for the studio, 24–32 for 4K films), build one stamp per material on an
offscreen canvas and cache it per `S`.

- **Body:** a rounded square inset **0.06·S** on each side (giving a 0.12·S groove), corner radius **0.30·S**.
- **Shading:**
  - Linear gradient from the top-left to the bottom-right.
  - Dark materials (K, k, O, B, b, c, L, l): from base lightened about 14% to base darkened about 16%.
  - White materials (W, w, g): flatter, from base +4% to base −6%.
- **Highlight:** dark materials get a soft top-left highlight (a radial gradient at 0.3·S, 0.3·S, white at 10%).
- **Perler dot:** white materials get a centre dot of radius **0.05·S** in the groove colour at 70%.
- **Felt:** multiplicative value noise at ±4%. It is part of the stamp, so it is identical each frame.
- **Grooves:** fill each occupied cell's full square with the material's groove colour first, then draw the stamp.
  Grooves inside a region are then a dark version of the same hue, and the silhouette edge gets no outside halo.
- **Per-bead variation:** brightness ±2.5%, seeded by `hash(character, part, drawing, col, row)`. It is stable
  across frames, so nothing shimmers.

### 8.2 Compose (`render/compose.ts`)

- `drawCharacter(ctx, rig, frameState, S, x, y)`.
- Cache each part drawing as a pre-rendered bitmap per `S`. Composing a frame is then about 10 `drawImage` calls.
- **Relief shadow:** before drawing each part, draw that part's silhouette offset by (0.12·S, 0.18·S), blurred
  0.25·S, black at 22%. Front layers then sit visibly on top of back layers, like the beaded relief in the renders.
- **Ground:** a soft elliptical contact shadow under the shoes (multiply, black at 18%). A long cast shadow is
  optional (reference: a faint, soft shadow toward screen-left on the floor).

### 8.3 Ink

Follow §6.4. Ink is drawn per frame, never cached into the part bitmaps.

### 8.4 Output

- A transparent canvas. The background is drawn separately (studio colour, film plate or nothing).
- Never resample the composed character by a non-integer factor for export. Choose `S` instead. For the web, CSS
  scaling is fine.

---

## 9. Animation and film pipeline

### 9.1 Clips (`anim/clip.ts`)

```ts
interface Clip {
  fps: 24;                       // output rate
  length: number;                // frames
  body: Key<PoseRef>[];          // { f: frameIndex, pose: 'present', offsets?: {...} }; held until the next key
  face: Key<Partial<FaceState>>[];
  blink?: { seed: number };      // auto blinks (§6.1)
  lipsync?: MouthCue[];          // from §9.3, overrides face.mouth
  root?: Key<[x: number, y: number]>[];   // bead positions on the stage
}
```

- `sample(clip, f)` → a frame state.
- Body keys are quantized to even frames (on twos).
- There is no interpolation of bead layers. Root moves are tweened and then rounded to whole beads.

### 9.2 Starter clips

| Clip | What it does |
|---|---|
| `idle` | Blink, plus breathing (`upper` dy −1 for 12 frames out of every 36). |
| `wave` | down → wave → hold 1 s with the face set to `happy` → down. |
| `present` | Hero pose with a `talk` face. |
| `talk` | Hero pose plus lip-sync. |
| `duoHello` | Both characters, Him `wave` then Her `wave` 12 frames later. |

### 9.3 Lip sync

- Use **Rhubarb Lip Sync** (a free, offline CLI). Run it on a voice-over WAV: `rhubarb -f json vo.wav > vo.json`.
- The cues are `A B C D E F G H X`. Draw one mouth variant for each:

| Cue | Mouth |
|---|---|
| A | closed (M B P) |
| B | slightly open, teeth |
| C | open (E) |
| D | wide open (AA) |
| E | rounded (O) |
| F | puckered (U, W) |
| G | teeth on lip (F, V) |
| H | tongue up (L) |
| X | rest |

- `anim/lipsync.ts` maps cue times (seconds) to frames.
- If the CLI cannot be installed in the container, the user can run it locally and commit the JSON.

### 9.4 Export (`scripts/cast/render.ts`)

- Playwright (Chromium at `executablePath: '/opt/pw-browsers/chromium'` in cloud sessions) opens
  `/characters?render=<clip>&S=24&w=3840&h=2160&bg=transparent`.
- The page exposes `window.__cast.renderFrame(f)`, which resolves when drawn. The script saves each frame with
  `canvas.toDataURL('image/png')` to `.out/<clip>/%04d.png`.
- Then run ffmpeg (installed at `/usr/bin/ffmpeg`, with libx264, prores_ks and libvpx-vp9):

| Output | Command |
|---|---|
| Preview MP4 (render with `bg=` a colour) | `ffmpeg -framerate 24 -i %04d.png -c:v libx264 -pix_fmt yuv420p -crf 16 out.mp4` |
| Editing master with alpha | `ffmpeg -framerate 24 -i %04d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le out.mov` |
| Web with alpha | `ffmpeg -framerate 24 -i %04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 20 out.webm` |

- Add `.out/` to `.gitignore`.
- **Formats:** 16:9 at 3840×2160 and 9:16 at 2160×3840 (social). The characters are framed by `S` and `root`; there
  is no resampling.

---

## 10. Studio page (`/characters`) and verification tools

### 10.1 Studio UI

Use the brand tokens for the UI and keep the existing `cast-page` styling direction.

- **Character:** him | her | both.
- **Integer zoom:** S = 4 / 8 / 12 / 16.
- **Pose selector**, a **drawing override per part**, **face selectors** (eyes, browL, browR, mouth, look) and
  **expression presets**.
- **Clip:** play / pause / step ±1 frame, a frame counter, and **onion skin** (previous and next body frame at 25%).
- **Overlays:**
  - **reference** (the aligned reference under the render, with an opacity slider and a "difference" blend toggle);
  - **grid** (bead lines with a column and row ruler every 5 beads);
  - **parts** (each part tinted a distinct colour, to check layering and overlaps).
- **Export:** a PNG of the current frame at the chosen S (transparent).
- **Dev only:** `window.__cast = { rigs, setFrame, renderFrame }`.

### 10.2 `npm run cast:lint`

Fail on any of these:

- Wrong grid size or an unknown character.
- An orphan bead that is not listed in `details.md`.
- Skin (`W` or `w` in the head or arm parts) touching transparency without an `O` between them.
- An `O` bead with no `W`, `w`, `B` or `K` neighbour (a floating outline).
- A gap in any outline loop (an 8-connected check).
- An arm drawing whose shoulder beads differ from the hero drawing's.

Print the problems as `file:row:col message` so they can be fixed directly.

### 10.3 `npm run cast:shot -- <char> <pose> [region]`

Writes `.shots/cast/<char>-<pose>[-region].png` with three panels at the same scale:

1. The reference crop.
2. The render.
3. The render at 50% over the reference, with a red box around every cell where the reference's bead-centre colour
   class differs from the grid.

`region` is one of `face | hair | torso | armL | armR | legs | shoes`, for a zoomed check.

Also print the mismatched cells as `row,col grid=X ref=Y`. **This list is advisory.** Fix structure and silhouette
mismatches; ignore the reference's noise (§1).

---

## 11. Phases (do them in order; commit at the end of each)

### P0 · Alignment and clean slate
- Fit `beadPx` and `cell0` for both characters in `duo-stage.webp`. Him may use `him-ref.webp` instead if its fit
  is cleaner; then record its own `beadPx`. Save the values in each `rig.ts`.
- Write `scripts/cast/draft.py`, adapted from `extract-cast.py`: sample the bead centres with the new palette
  (§4.1), split them into the parts of §7.1 using rectangles, and write 80×96 drafts to `art/<char>/_draft/`.
- ✅ Overlaying a draft at 50% on the reference shows the bead grids lined up across the whole figure, with no drift
  at the feet or the head.

### P1 · Renderer and studio skeleton
- `palette.ts`, `grid.ts`, `render/*`, a bare `studio/main.ts`. Replace the script in `characters.html`. Delete
  `src/characters/`. Add the lint and shot scripts.
- Include a test grid with a 6×6 swatch of every material.
- ✅ Next to `reference/cast/her-face.png` (hair and skin) and `reference/cast/him-torso-arms.png` (cobalt), at the
  same zoom, the test swatches look like the same beads: roundness, grooves, white perler dots, felt texture and
  colour (ΔE < 4 at the bead centre).
- ✅ `npm run build` passes.

### P2 · Him: hero model sheet
- Copy the drafts into the final files, then clean them by hand in this order:
  1. silhouette
  2. outlines
  3. hair
  4. head and jaw
  5. torso (tee, shirt, collar, folds)
  6. arms and hands
  7. legs and shoes
  8. shading pass
- Follow §4.2 and §4.4. Run `cast:shot him hero <region>` after each region and look at it.
- ✅ `cast:lint` is clean.
- ✅ All 7 regions' shots read as the reference.
- ✅ Hands show 4 separate fingers and a thumb.
- ✅ The shirt has no outline and no speckles.
- ✅ The sneakers show the cobalt overlay shape.
- ✅ A thumbnail 80 px tall reads as Him.

### P3 · Her: hero model sheet
- Same process from her `duo-stage.webp` drafts, following §4.3. **Never sample her from `her-ref.png`.**
- ✅ Same checks as P2.
- ✅ The forehead peak is at most 3 beads.
- ✅ The trouser outline and both crease lines are continuous.
- ✅ The lapels are cobalt on both sides.

### P4 · Faces
- `face.ts` for both, following §6, with all variants in §6.1 and §7.4 (the lip-sync shapes can wait for P6).
- ✅ With the reference overlay on, the eyes, brows and mouth sit on the reference's within about 0.2 bead.
- ✅ Every expression preset looks clean at S = 8 and S = 32.
- ✅ The blink cycle shows no jumps.

### P5 · Pose library
- The drawings in §7.3 and the expression presets.
- ✅ Each drawing passes lint.
- ✅ Switching poses in the studio never opens a gap at a joint and never shifts the shoulder.
- ✅ The parts overlay shows correct layering.

### P6 · Clips, lip sync and export
- `clip.ts`, `lipsync.ts`, the clips in §9.2, `render.ts` and the ffmpeg outputs.
- ✅ `npm run cast:render -- duoHello` produces an MP4 and a ProRes 4444 `.mov` with alpha.
- ✅ Rendering the same frame twice gives identical PNGs (compare their hashes).
- ✅ Body motion visibly steps on twos while blinks stay crisp.

### P7 (later, ask the user first) · More angles and poses
- Front-facing head, profile and back drawings for walking across the screen.
- A walk cycle (8 drawings on twos).
- Her poster "lean and fist bump" pose (`reference/duo-poster.webp`).
- Integration with environment plates and the felt mascot.

Run `npm run build` after every phase. Do not commit `.shots/cast/` or `.out/`.

---

## 12. Open questions (defaults assumed; change them if the user says so)

| Question | Default |
|---|---|
| Character names | "Him" and "Her" in code. Real names can be added to `rig.ts` later. |
| Film aspect ratios | 16:9 4K and 9:16 4K. |
| Voices / lip sync | Rhubarb on whatever voice-over WAV is provided. |
| Bead colours vs brand cobalt | Reference felt colours (D8). |

---

## 13. Current state (supersedes parts of §3–§7 where they differ)

- **Art:** the user's original sprite set (commit `5681cf6`) is the source of truth, rendered bead for bead with
  the 2D renderer. Hand redrawing from the reference was tried and rejected; edit the existing part grids instead.
- **Faces:** Him keeps his original half-size face blocks (`features`, `eyes`; `# cell: 0.5` grids). Her face is
  vector ink traced from the reference (`art/her/face.ts`) because it reads better at film sizes.
- **Bead size:** one size for both characters (Her's earlier 1.075 scale was removed).
- **Poses:** new arm drawings are the original arms turned exactly 90° (`scripts/cast/dev/rot90.py`), so no
  bead is ever redrawn. Him: `wave`, `blink` (his eye blocks collapsed to their bottom row).
- **Clips:** `src/cast/anim/clips.ts` (`idle`, `wave`, `talk`, `duoHello`); `npm run cast:render -- <clip>`
  writes MP4, ProRes 4444 `.mov` with alpha and VP9 `.webm` with alpha to `.out/<clip>/`. Renders are
  deterministic (identical frames on re-render).
