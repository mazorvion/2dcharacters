// /characters: the cast studio (CHARACTERS.md §10). View, pose and check the 2D bead characters,
// overlay the reference, export frames. window.__cast drives it from scripts (cast:shot, cast:render).
import '@fontsource-variable/funnel-display/index.css';
import '@fontsource-variable/geist-mono/index.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '../../styles/tokens.css';
import '../../styles/cast.css';
import { DRAWINGS } from '../art/index.ts';
import { RIGS } from '../rigs.ts';
import { CharacterRenderer } from '../render/compose.ts';
import { renderLayer } from '../render/beads.ts';
import { BACKGROUND, MATERIALS } from '../palette.ts';
import { CANVAS_W, CANVAS_H } from '../grid.ts';
import { EXPRESSIONS, POSES, frameFor } from '../anim/poses.ts';
import type { Box, CharId, FaceState, FrameState, PartName } from '../types.ts';
import { coarse, drawReference, loadImage, referenceClasses } from './reference.ts';

type Show = 'both' | CharId | 'swatches';

const renderers: Record<CharId, CharacterRenderer> = {
  him: new CharacterRenderer(RIGS.him, DRAWINGS.him),
  her: new CharacterRenderer(RIGS.her, DRAWINGS.her),
};

const q = new URLSearchParams(location.search);
const st = {
  show: (q.get('show') ?? 'both') as Show,
  S: Number(q.get('S') ?? 8),
  pose: { him: q.get('pose') ?? 'hero', her: q.get('pose') ?? 'hero' } as Record<CharId, string>,
  expr: { him: '', her: '' } as Record<CharId, string>,
  face: { him: {}, her: {} } as Record<CharId, Partial<FaceState>>,
  ref: q.has('ref'),
  refOpacity: Number(q.get('refOpacity') ?? 0.5),
  diff: q.has('diff'),
  grid: q.has('grid'),
  parts: q.has('parts'),
  flip: q.has('flip'),
  /** Per-frame state from a playing clip (set by the clip player in P6). */
  frames: null as Partial<Record<CharId, FrameState>> | null,
};

const canvas = document.querySelector<HTMLCanvasElement>('#cast-canvas')!;
const ctx = canvas.getContext('2d')!;

const shown = (): CharId[] => (st.show === 'both' ? ['him', 'her'] : st.show === 'swatches' ? [] : [st.show]);
const GAP = 72; // beads between the two characters' canvases in 'both'

function frameOf(id: CharId): FrameState {
  return st.frames?.[id] ?? frameFor(RIGS[id], st.pose[id], st.expr[id] || undefined, st.face[id], st.flip);
}

// ---------------------------------------------------------------- drawing

function drawGridLines(c: CanvasRenderingContext2D, S: number, x: number, y: number) {
  c.save();
  c.lineWidth = 1;
  for (let i = 0; i <= CANVAS_W; i++) {
    c.strokeStyle = i % 5 ? 'rgba(21,23,43,0.07)' : 'rgba(21,23,43,0.22)';
    c.beginPath(); c.moveTo(x + i * S + 0.5, y); c.lineTo(x + i * S + 0.5, y + CANVAS_H * S); c.stroke();
  }
  for (let j = 0; j <= CANVAS_H; j++) {
    c.strokeStyle = j % 5 ? 'rgba(21,23,43,0.07)' : 'rgba(21,23,43,0.22)';
    c.beginPath(); c.moveTo(x, y + j * S + 0.5); c.lineTo(x + CANVAS_W * S, y + j * S + 0.5); c.stroke();
  }
  c.fillStyle = 'rgba(21,23,43,0.6)';
  c.font = `${Math.max(9, S * 0.9)}px "Geist Mono Variable", monospace`;
  c.textAlign = 'center';
  for (let i = 0; i < CANVAS_W; i += 5) c.fillText(String(i), x + (i + 0.5) * S, y - 4);
  c.textAlign = 'right';
  for (let j = 0; j < CANVAS_H; j += 5) c.fillText(String(j), x - 4, y + (j + 0.8) * S);
  c.restore();
}

/** A rig's own bead size at zoom S, and where its canvas goes so baselines and centres line up. */
function placed(id: CharId, S: number, x: number, y: number): [number, number, number] {
  const s = Math.max(1, Math.round(S * (RIGS[id].scale ?? 1)));
  return [s, x + 40 * (S - s), y + 93 * (S - s)];
}

async function drawCharacter(c: CanvasRenderingContext2D, id: CharId, S0: number, x0: number, y0: number) {
  const r = renderers[id];
  const [S, x, y] = placed(id, S0, x0, y0);
  const img = st.ref || st.diff ? await loadImage(r.rig.ref.image).catch(() => null) : null;
  if (img && st.ref && !st.diff) {
    c.save(); c.globalAlpha = 1; drawReference(c, img, r.rig, S, x, y); c.restore();
    c.save(); c.globalAlpha = 1 - st.refOpacity;
    r.draw(c, frameOf(id), S, x, y, { tintParts: st.parts });
    c.restore();
  } else {
    r.draw(c, frameOf(id), S, x, y, { tintParts: st.parts });
  }
  if (img && st.diff) {
    c.save(); c.globalCompositeOperation = 'difference'; drawReference(c, img, r.rig, S, x, y); c.restore();
  }
  if (st.grid) drawGridLines(c, S, x, y);
}

function drawSwatches(c: CanvasRenderingContext2D, S: number, x: number, y: number) {
  const keys = Object.keys(MATERIALS);
  const rows: string[] = Array.from({ length: 16 }, () => '.'.repeat(CANVAS_W));
  keys.forEach((k, i) => {
    const c0 = 1 + (i % 6) * 11, r0 = 1 + Math.floor(i / 6) * 9;
    for (let r = r0; r < r0 + 6; r++) rows[r] = rows[r].slice(0, c0) + k.repeat(6) + rows[r].slice(c0 + 6);
  });
  const l = renderLayer(rows, S, 'swatches');
  if (l) c.drawImage(l.canvas, x + l.c0 * S, y + l.r0 * S);
  c.save();
  c.fillStyle = 'rgba(21,23,43,0.7)';
  c.font = `${Math.max(10, S)}px "Geist Mono Variable", monospace`;
  keys.forEach((k, i) => {
    const c0 = 1 + (i % 6) * 11, r0 = 1 + Math.floor(i / 6) * 9;
    c.fillText(`${k} ${MATERIALS[k].name}`, x + c0 * S, y + (r0 + 7) * S);
  });
  c.restore();
}

let drawing = false, again = false;
async function draw() {
  if (drawing) { again = true; return; }
  drawing = true;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const S = Math.max(1, Math.round(st.S * dpr));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BACKGROUND.studio;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  if (st.show === 'swatches') {
    drawSwatches(ctx, S, Math.round((w - 66 * S) / 2), Math.round(h * 0.25));
  } else {
    const ids = shown();
    const totalW = (ids.length - 1) * GAP * S + CANVAS_W * S;
    const x0 = Math.round((w - totalW) / 2);
    const y0 = Math.round(h - CANVAS_H * S - Math.max(90 * dpr, h * 0.06));
    for (const [i, id] of ids.entries()) await drawCharacter(ctx, id, S, x0 + i * GAP * S, y0);
  }
  drawing = false;
  if (again) { again = false; void draw(); }
}

// ---------------------------------------------------------------- shots (cast:shot)

interface ShotOptions { char: CharId; pose?: string; expression?: string; region?: string; S?: number }

/** Three panels (reference | render | overlay with mismatch boxes) as a PNG, plus the mismatch list. */
async function shot(o: ShotOptions) {
  const rig = RIGS[o.char];
  const S = o.S ?? 12;
  const box: Box = (o.region && rig.regions[o.region]) || [0, 0, CANVAS_W, CANVAS_H];
  const [c0, r0, c1, r1] = box;
  const pw = (c1 - c0) * S, ph = (r1 - r0) * S, pad = 16;
  const out = document.createElement('canvas');
  out.width = pw * 3 + pad * 4; out.height = ph + pad * 2;
  const c = out.getContext('2d')!;
  c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height);
  c.imageSmoothingEnabled = false;
  const img = await loadImage(rig.ref.image);
  const frame = frameFor(rig, o.pose ?? 'hero', o.expression);
  const panel = (i: number) => [pad + i * (pw + pad) - c0 * S, pad - r0 * S] as const;
  const clip = (i: number) => { c.save(); c.beginPath(); c.rect(pad + i * (pw + pad), pad, pw, ph); c.clip(); };
  // 1 reference
  clip(0); c.fillStyle = BACKGROUND.studio; c.fillRect(0, 0, out.width, out.height);
  drawReference(c, img, rig, S, ...panel(0), box); c.restore();
  // 2 render
  clip(1); c.fillStyle = BACKGROUND.studio; c.fillRect(0, 0, out.width, out.height);
  renderers[o.char].draw(c, frame, S, ...panel(1), { ground: false }); c.restore();
  // 3 overlay + mismatches
  clip(2); drawReference(c, img, rig, S, ...panel(2), box);
  c.globalAlpha = 0.5; renderers[o.char].draw(c, frame, S, ...panel(2), { ground: false }); c.globalAlpha = 1;
  const ref = referenceClasses(img, rig);
  const flat = flatten(o.char, frame);
  const mismatches: string[] = [];
  c.strokeStyle = 'rgba(255,0,0,0.9)'; c.lineWidth = 1;
  for (let r = r0; r < r1; r++) {
    for (let col = c0; col < c1; col++) {
      const g = flat[r][col], k = ref[r][col];
      if (coarse(g) === k) continue;
      mismatches.push(`${r},${col} grid=${g} ref=${k}`);
      const [px, py] = panel(2);
      c.strokeRect(px + col * S + 1.5, py + r * S + 1.5, S - 3, S - 3);
    }
  }
  c.restore();
  return { png: out.toDataURL('image/png'), mismatches };
}

/** P1 check: material swatches next to reference crops at the same bead size. */
async function swatchShot(S = 40) {
  const img = await loadImage('/reference/duo-stage.webp');
  const k = S / 7.23;
  // reference crops (px boxes in duo-stage): hair, skin + outline, cobalt shirt, lime patch, trousers
  const crops: [number, number, number, number][] = [[905, 105, 965, 150], [1505, 150, 1550, 185], [800, 250, 850, 300], [784, 284, 806, 306], [1470, 430, 1530, 480]];
  const sw = 6 * S;
  const out = document.createElement('canvas');
  out.width = crops.length * (sw + 20) + 20; out.height = sw * 2 + 60;
  const c = out.getContext('2d')!;
  c.fillStyle = BACKGROUND.studio; c.fillRect(0, 0, out.width, out.height);
  const mats = ['K', 'W', 'B', 'L', 'B'];
  crops.forEach(([x0, y0, x1, y1], i) => {
    const x = 20 + i * (sw + 20);
    c.drawImage(img, x0, y0, Math.min(x1 - x0, sw / k), Math.min(y1 - y0, sw / k), x, 20, Math.min(x1 - x0, sw / k) * k, Math.min(y1 - y0, sw / k) * k);
    const rows = Array.from({ length: 6 }, () => mats[i].repeat(6));
    const l = renderLayer(rows, S, `sw${i}`);
    if (l) c.drawImage(l.canvas, x - S, 40 + sw - S);
  });
  return out.toDataURL('image/png');
}

/** All parts of a frame flattened into one grid (front parts win), with group offsets applied. */
function flatten(id: CharId, frame: FrameState): string[][] {
  const r = renderers[id];
  const g = Array.from({ length: CANVAS_H }, () => Array<string>(CANVAS_W).fill('.'));
  for (const part of r.rig.order) {
    const name = r.drawingFor(part, frame);
    const rows = name && r.cell(part, name) === 1 && r.rows(part, name, frame.flip);
    if (!rows) continue;
    const [dx, dy] = r.offsetOf(part, frame);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue;
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < CANVAS_H && xx >= 0 && xx < CANVAS_W) g[yy][xx] = row[x];
      }
    });
  }
  return g;
}

/** A frame as a transparent PNG at S px per bead (the "save png" button and cast:render). */
function framePNG(ids: CharId[], S: number, frames?: Partial<Record<CharId, FrameState>>, bg?: string): string {
  const out = document.createElement('canvas');
  const wBeads = (ids.length - 1) * GAP + CANVAS_W;
  out.width = wBeads * S; out.height = CANVAS_H * S;
  const c = out.getContext('2d')!;
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, out.width, out.height); }
  ids.forEach((id, i) => renderers[id].draw(c, frames?.[id] ?? frameOf(id), ...placed(id, S, i * GAP * S, 0)));
  return out.toDataURL('image/png');
}

// ---------------------------------------------------------------- UI

const ui = document.querySelector<HTMLElement>('.cast-ui')!;

function seg(label: string, values: string[], get: () => string, set: (v: string) => void) {
  const el = document.createElement('div');
  el.className = 'seg';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', label);
  el.innerHTML = values.map((v) => `<button type="button" data-v="${v}">${v}</button>`).join('');
  const sync = () => el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === get())));
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    set(b.dataset.v!);
    sync();
    rebuildFaceUI();
    void draw();
  });
  sync();
  ui.append(el);
  return el;
}

function toggles(items: [string, () => boolean, (v: boolean) => void][]) {
  const el = document.createElement('div');
  el.className = 'seg';
  for (const [name, get, set] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    const sync = () => b.setAttribute('aria-pressed', String(get()));
    b.addEventListener('click', () => { set(!get()); sync(); void draw(); });
    sync();
    el.append(b);
  }
  ui.append(el);
}

seg('Show', ['both', 'him', 'her', 'swatches'], () => st.show, (v) => { st.show = v as Show; });
seg('Zoom', ['4', '8', '12', '16'], () => String(st.S), (v) => { st.S = Number(v); });
const poseNames = () => [...new Set([...Object.keys(POSES.him), ...Object.keys(POSES.her)])];
seg('Pose', poseNames(), () => st.pose.him, (v) => { st.pose.him = v; st.pose.her = v; st.frames = null; });
toggles([
  ['ref', () => st.ref, (v) => { st.ref = v; }],
  ['diff', () => st.diff, (v) => { st.diff = v; }],
  ['grid', () => st.grid, (v) => { st.grid = v; }],
  ['parts', () => st.parts, (v) => { st.parts = v; }],
  ['flip', () => st.flip, (v) => { st.flip = v; }],
]);
{
  const el = document.createElement('div');
  el.className = 'seg';
  el.innerHTML = `<label class="range">ref <input type="range" min="0" max="1" step="0.05" value="${st.refOpacity}" aria-label="Reference opacity"></label>
    <button type="button" data-action="png">save png</button>`;
  el.querySelector('input')!.addEventListener('input', (e) => { st.refOpacity = Number((e.target as HTMLInputElement).value); void draw(); });
  el.querySelector('[data-action="png"]')!.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `cast-${st.show}-${st.pose.him}.png`;
    a.href = framePNG(shown(), 16);
    a.click();
  });
  ui.append(el);
}

// face controls: one select per face element of the shown character (only when one character is shown)
const faceUI = document.querySelector<HTMLElement>('.cast-face')!;
function rebuildFaceUI() {
  faceUI.innerHTML = '';
  if (st.show !== 'him' && st.show !== 'her') return;
  const id = st.show;
  const rig = RIGS[id];
  const add = (label: string, values: string[], get: () => string, set: (v: string) => void) => {
    if (!values.length) return;
    const l = document.createElement('label');
    l.innerHTML = `<span>${label}</span><select>${values.map((v) => `<option>${v}</option>`).join('')}</select>`;
    const s = l.querySelector('select')!;
    s.value = get();
    s.addEventListener('change', () => { set(s.value); void draw(); });
    faceUI.append(l);
  };
  add('expression', ['', ...Object.keys(EXPRESSIONS[id])], () => st.expr[id], (v) => { st.expr[id] = v; st.face[id] = {}; rebuildFaceUI(); });
  const cur = frameOf(id).face;
  for (const k of ['eyeL', 'eyeR', 'browL', 'browR', 'mouth'] as const) {
    add(k, Object.keys(rig.face[k]), () => cur[k], (v) => { st.face[id] = { ...st.face[id], [k]: v }; });
  }
  for (const part of rig.order) {
    const names = renderers[id].drawingNames(part);
    if (names.length > 1) {
      add(part, names, () => frameOf(id).drawings[part] ?? '', (v) => {
        POSES[id].custom = { drawings: { ...frameOf(id).drawings, [part]: v as string } as Record<PartName, string> };
        st.pose[id] = 'custom';
      });
    }
  }
}
rebuildFaceUI();

addEventListener('resize', () => void draw());
void draw();

if (import.meta.hot) import.meta.hot.accept(() => location.reload());

const api = {
  renderers, st, draw, shot, swatchShot, framePNG, frameFor, RIGS,
  /** Set per-character frame states (clip playback / export) and redraw. */
  setFrames(frames: Partial<Record<CharId, FrameState>> | null) { st.frames = frames; return draw(); },
};
if (import.meta.env.DEV) (window as unknown as { __cast: typeof api }).__cast = api;
