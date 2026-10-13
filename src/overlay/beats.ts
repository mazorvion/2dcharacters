// Capability beat overlays: one card per beat, docked beside the part that just snapped on, with a
// blueprint leader line to it. Everything is driven by state.vis / state.prog (scrubbed, reversible);
// only the ambient loops (waveform, sound rings, thinking dots) read the stage clock, like idle.ts.
import * as THREE from 'three';
import { CONTENT } from '../content';
import { state, itemAt, type Beat } from '../core/state';
import type { PartId } from '../scene/registry';
import type { Stage } from '../scene/Stage';
import { el, icon, lerp, pt, range, setVis, smooth, svgEl, easeOut, type Pt } from './util';

interface BeatView {
  beat: Beat;
  card: HTMLElement;
  /** Part + local point the leader line attaches to. */
  part: PartId;
  local: [number, number, number];
  thought?: boolean;
  /** Extra full-stage layer (rings, flying cards, pops) whose visibility follows the beat. */
  layer?: HTMLElement;
  update(p: number, time: number, a: Pt, box: { x: number; y: number; w: number; h: number }): void;
}

const v3 = new THREE.Vector3();

function header(id: string, label: string, extra = '') {
  return `<header class="ov-head">${icon(id, 'ov-chip')}<b>${label}</b>${extra}</header>`;
}

/** Reveal a string character by character; writes only when the visible length changes. */
function typer(node: HTMLElement, text: string) {
  let shown = -1;
  return (t: number) => {
    const n = Math.round(text.length * Math.min(1, Math.max(0, t)));
    if (n !== shown) { node.textContent = text.slice(0, n); shown = n; }
  };
}

// ------------------------------------------------------------------ speaking
function speaking(): BeatView {
  const c = CONTENT.speaking;
  const card = el('div', 'ov-card ov-speak', header(c.icon, c.label, `<span class="ov-meta">${c.voice}</span>`));
  const wave = el('div', 'ov-wave');
  const bars = Array.from({ length: 34 }, () => wave.appendChild(el('i')));
  card.appendChild(wave);
  const bubbles = c.lines.map((line) => {
    const b = card.appendChild(el('p', 'ov-bubble is-double'));
    return { b, type: typer(b, line) };
  });
  return {
    beat: 'speaking', card, part: 'screen', local: [0.62, 0.05, 0.02],
    update(p, time) {
      const n = bubbles.length;
      let talking = 0;
      bubbles.forEach(({ b, type }, k) => {
        const a = itemAt(k, n), z = itemAt(k + 1, n);
        const r = range(p, a, a + (z - a) * 0.7);
        if (r > 0 && r < 1) talking = 1;
        setVis(b, smooth(range(p, a - 0.02, a + 0.04)));
        type(r);
      });
      const amp = 0.25 + 0.75 * talking;
      bars.forEach((bar, i) => {
        const h = 0.12 + amp * Math.abs(Math.sin(time * 7.3 + i * 0.62) * Math.sin(time * 2.1 + i * 0.29));
        bar.style.transform = `scaleY(${h.toFixed(3)})`;
      });
    },
  };
}

// ------------------------------------------------------------------ hearing
function hearing(overlay: HTMLElement): BeatView {
  const c = CONTENT.hearing;
  const card = el('div', 'ov-card ov-hear', header(c.icon, c.label, '<span class="ov-live"><i></i>Live</span>'));
  const said = card.appendChild(el('p', 'ov-bubble is-user'));
  const text = said.appendChild(el('span'));
  said.appendChild(el('i', 'ov-caret'));
  const type = typer(text, `“${c.transcript}”`);
  const chips = el('div', 'ov-detect');
  const rows = c.detected.map((d) => chips.appendChild(el('span', 'ov-tag', `<em>${d.k}</em>${d.v}`)));
  card.appendChild(chips);
  const ringWrap = el('div', 'ov-rings');
  const rings = [0, 1, 2].map(() => ringWrap.appendChild(el('i', 'ov-ring')));
  overlay.appendChild(ringWrap);
  return {
    beat: 'hearing', card, part: 'patchR', local: [0.12, 0, 0], layer: ringWrap,
    update(p, time, a) {
      type(range(p, 0.02, 0.55));
      rows.forEach((r, k) => setVis(r, smooth(range(p, itemAt(k, rows.length) * 0.4 + 0.6, itemAt(k, rows.length) * 0.4 + 0.66))));
      const listening = 1 - range(p, 0.55, 0.65) * 0.7;
      rings.forEach((r, j) => {
        const ph = (time * 0.55 + j / 3) % 1;
        r.style.transform = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0) translate(-50%,-50%) scale(${(0.5 + 2.2 * ph).toFixed(3)})`;
        r.style.opacity = ((1 - ph) * 0.7 * listening).toFixed(3);
      });
    },
  };
}

// ------------------------------------------------------------------ thinking
function thinking(): BeatView {
  const c = CONTENT.thinking;
  const card = el('div', 'ov-card ov-think', header(c.icon, c.label, '<span class="ov-dots"><i></i><i></i><i></i></span>'));
  const list = card.appendChild(el('ol', 'ov-steps'));
  const steps = c.steps.map((s) => {
    const li = list.appendChild(el('li'));
    li.innerHTML = `<span class="ov-state">${icon('check', 'ov-check')}</span>`;
    li.appendChild(document.createTextNode(s));
    return li;
  });
  const dots = [...card.querySelectorAll<HTMLElement>('.ov-dots i')];
  let last = '';
  return {
    beat: 'thinking', card, part: 'tipL', local: [0.2, 0.08, 0], thought: true,
    update(p, time) {
      const n = steps.length;
      const states = steps.map((_, k) => (p >= itemAt(k + 1, n) - 0.02 ? 'done' : p >= itemAt(k, n) ? 'active' : 'todo'));
      const key = states.join();
      if (key !== last) {
        steps.forEach((li, k) => { li.className = `is-${states[k]}`; });
        last = key;
      }
      dots.forEach((d, i) => { d.style.opacity = (0.25 + 0.75 * Math.max(0, Math.sin(time * 5 - i * 0.9))).toFixed(2); });
    },
  };
}

// ------------------------------------------------------------------ knowledge
function knowledge(overlay: HTMLElement, stage: Stage): BeatView {
  const c = CONTENT.knowledge;
  const card = el('div', 'ov-card ov-know', header(c.icon, c.label));
  const big = card.appendChild(el('p', 'ov-count'));
  const num = big.appendChild(el('b'));
  big.appendChild(el('span', '', c.counter));
  const bar = card.appendChild(el('div', 'ov-bar')).appendChild(el('i'));
  const fly = el('div', 'ov-fly');
  overlay.appendChild(fly);
  const docs = c.sources.map((s) => {
    const d = fly.appendChild(el('div', `ov-doc is-${s.kind}`));
    const visual = s.kind === 'pdf'
      ? '<span class="ov-page"><i></i><i></i><i></i><i></i><em>PDF</em></span>'
      : s.kind === 'web'
        ? '<span class="ov-browser"><i></i><i></i><i></i><u></u></span>'
        : icon(s.icon, 'ov-chip');
    d.innerHTML = `${visual}<span class="ov-doc-t"><b></b><small></small></span>`;
    d.querySelector('b')!.textContent = s.title;
    d.querySelector('small')!.textContent = s.meta;
    return d;
  });
  let shownN = -1;
  return {
    beat: 'knowledge', card, part: 'hook', local: [0.34, 0.31, -0.08], layer: fly,
    update(p, _time, a) {
      const W = stage.width, H = stage.height;
      const portrait = stage.profile === 'portrait';
      const slots = portrait
        ? [[0.06, 0.8], [0.5, 0.86], [0.22, 0.93]]
        : [[0.74, 0.16], [0.8, 0.66], [0.56, 0.82]];
      let absorbed = 0;
      const n = docs.length;
      docs.forEach((d, k) => {
        const at = itemAt(k, n);
        const appear = easeOut(range(p, at - 0.1, at - 0.02));
        const go = smooth(range(p, at, at + 0.12));
        if (go >= 1) absorbed++;
        const [sx, sy] = slots[k % slots.length];
        const x0 = sx * W, y0 = sy * H;
        const x = lerp(x0, a.x - 20, go), y = lerp(y0 + (1 - appear) * 18, a.y - 20, go);
        d.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(1 - 0.75 * go).toFixed(3)})`;
        setVis(d, appear * (1 - range(go, 0.7, 1)));
      });
      if (absorbed !== shownN) { num.textContent = String(absorbed); shownN = absorbed; }
      bar.style.transform = `scaleX(${(absorbed / n).toFixed(3)})`;
    },
  };
}

// ------------------------------------------------------------------ acting
function acting(overlay: HTMLElement): BeatView {
  const c = CONTENT.acting;
  const card = el('div', 'ov-card ov-act', header(c.icon, c.label));
  const list = card.appendChild(el('ul', 'ov-actions'));
  const rows = c.actions.map((x) => {
    const li = list.appendChild(el('li'));
    li.innerHTML = `${icon(x.app, 'ov-app')}<span class="ov-txt"></span>${icon('check', 'ov-check')}`;
    li.querySelector('.ov-txt')!.textContent = x.text;
    return li;
  });
  const pop = el('div', 'ov-pops');
  overlay.appendChild(pop);
  const pops = c.actions.map((x) => pop.appendChild(el('span', 'ov-pop', icon(x.app, 'ov-app'))));
  const MAX = 5;
  return {
    beat: 'acting', card, part: 'clawR', local: [0.3, 0.25, 0.05], layer: pop,
    update(p, _time, a, box) {
      const n = rows.length;
      let cur = -1;
      rows.forEach((_li, k) => { if (p >= itemAt(k, n)) cur = k; });
      rows.forEach((li, k) => {
        const r = easeOut(range(p, itemAt(k, n), itemAt(k, n) + 0.05));
        const visible = k <= cur && k > cur - MAX;
        li.style.display = visible ? '' : 'none';
        li.style.opacity = r.toFixed(3);
        li.style.transform = `translateX(${((1 - r) * 14).toFixed(1)}px)`;
      });
      pops.forEach((el2, k) => {
        const at = itemAt(k, n);
        const f = range(p, at - 0.015, at + 0.07);
        if (f <= 0 || f >= 1) { el2.style.opacity = '0'; return; }
        // each app icon bursts out of the pincer and flies to the log
        const t = easeOut(f);
        const x = lerp(a.x, box.x + 18, t), y = lerp(a.y, box.y + 60, t) - Math.sin(t * Math.PI) * 60;
        el2.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${(0.6 + 0.6 * Math.sin(t * Math.PI)).toFixed(3)})`;
        el2.style.opacity = (1 - range(f, 0.75, 1)).toFixed(3);
      });
    },
  };
}

// ------------------------------------------------------------------ host

export function createBeats(overlay: HTMLElement, lines: SVGSVGElement, stage: Stage) {
  const wrap = el('div', 'ov-beats');
  overlay.appendChild(wrap);
  const group = svgEl('g', { class: 'ov-beat-lines' });
  lines.appendChild(group);
  const views: BeatView[] = [speaking(), hearing(overlay), thinking(), knowledge(overlay, stage), acting(overlay)];
  const ui = views.map((v) => {
    wrap.appendChild(v.card);
    const path = svgEl('path', { class: `ov-leader${v.thought ? ' is-thought' : ''}` });
    const dot = svgEl('circle', { class: 'ov-dot', r: 3 });
    group.append(path, dot);
    return { v, path, dot, a: pt(), box: { x: 0, y: 0, w: 0, h: 0 } };
  });
  let measuredFor = '';

  function update() {
    const W = stage.width, H = stage.height;
    const portrait = stage.profile === 'portrait';
    const key = `${W}x${H}`;
    let any = false;
    for (const u of ui) {
      const vis = state.vis[u.v.beat];
      setVis(u.v.card, vis);
      u.path.style.opacity = u.dot.style.opacity = vis.toFixed(3);
      if (u.v.layer) setVis(u.v.layer, vis);
      if (vis <= 0.001) continue;
      any = true;
      const part = stage.rig.parts[u.v.part].object;
      stage.projectPoint(part.localToWorld(v3.set(...u.v.local)), u.a);
      // measure once per size (cards keep a fixed width; height is read live because content grows)
      if (measuredFor !== key) u.box.w = u.v.card.offsetWidth;
      u.box.h = u.v.card.offsetHeight;
      const { w, h } = u.box;
      let x: number, y: number;
      if (portrait) {
        x = (W - w) / 2;
        y = H - h - 18;
      } else {
        const right = W - w - Math.max(24, W * 0.04);
        x = Math.min(right, Math.max(W * 0.44, u.a.x + 110));
        y = Math.min(H - h - 28, Math.max(84, u.a.y - h * 0.4));
      }
      u.box.x = x; u.box.y = y;
      const rise = (1 - smooth(vis)) * 12;
      u.v.card.style.transform = `translate3d(${x.toFixed(1)}px,${(y + rise).toFixed(1)}px,0)`;
      // leader: anchor → elbow → card edge
      const ex = portrait ? u.a.x : x - 6, ey = portrait ? y - 6 : y + 26;
      const mx = portrait ? u.a.x : lerp(u.a.x, ex, 0.55);
      u.path.setAttribute('d', `M${u.a.x.toFixed(1)} ${u.a.y.toFixed(1)}L${mx.toFixed(1)} ${ey.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
      u.dot.setAttribute('cx', u.a.x.toFixed(1));
      u.dot.setAttribute('cy', u.a.y.toFixed(1));
      u.v.update(state.prog[u.v.beat], stage.time, u.a, u.box);
    }
    if (measuredFor !== key && any) measuredFor = key;
  }

  return { update, destroy() { wrap.remove(); group.remove(); overlay.querySelectorAll('.ov-rings,.ov-fly,.ov-pops').forEach((n) => n.remove()); } };
}
