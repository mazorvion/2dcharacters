// Blueprint callouts: mono title above the leader line, subline below, in two columns (PLAN.md §5.5).
// Portrait uses the same columns, tight to the screen edges.
import { CONTENT } from '../content';
import { state } from '../core/state';
import type { Stage } from '../scene/Stage';
import { el, pt, range, svgEl, setVis, smooth, type Pt } from './util';

interface Label {
  part: (typeof CONTENT.callouts)[number]['part'];
  box: HTMLElement;
  path: SVGPathElement;
  dot: SVGCircleElement;
  w: number;
  a: Pt;
  side: -1 | 1;
  y: number;
  order: number;
}

const GAP = 42;

export function createCallouts(overlay: HTMLElement, lines: SVGSVGElement, stage: Stage) {
  const group = svgEl('g', { class: 'ov-callouts' });
  lines.appendChild(group);
  const wrap = el('div', 'ov-callouts');
  overlay.appendChild(wrap);
  const labels: Label[] = CONTENT.callouts.map((c, i) => {
    const box = el('div', 'ov-callout');
    const b = el('b'); b.textContent = c.title; box.appendChild(b);
    if (c.sub) { const sp = el('span'); sp.textContent = c.sub; box.appendChild(sp); }
    wrap.appendChild(box);
    const path = svgEl('path', { class: 'ov-leader' });
    const dot = svgEl('circle', { class: 'ov-dot', r: 2.5 });
    group.append(path, dot);
    return { part: c.part, box, path, dot, w: 0, a: pt(), side: 1, y: 0, order: i };
  });
  let measuredFor = -1;

  function update() {
    const out = smooth(state.calloutsOut);
    const visible = state.callouts > 0.001 && out < 0.999;
    setVis(wrap, visible ? 1 - out : 0);
    group.style.opacity = visible ? String(1 - out) : '0';
    if (!visible) return;
    if (measuredFor !== stage.width) {
      for (const l of labels) l.w = Math.max(...[...l.box.children].map((e) => (e as HTMLElement).offsetWidth));
      measuredFor = stage.width;
    }

    const W = stage.width, H = stage.height;
    const portrait = stage.profile === 'portrait';
    const top = portrait ? H * 0.2 : Math.max(80, H * 0.12), bottom = portrait ? H - 40 : H - 56;
    for (const l of labels) stage.project(stage.rig.parts[l.part].anchor, l.a);

    // draw-in order: top to bottom
    [...labels].sort((a, b) => a.a.y - b.a.y).forEach((l, i) => (l.order = i));
    const N = labels.length;

    // balanced columns: the half with the leftmost anchors goes left
    [...labels].sort((a, b) => a.a.x - b.a.x).forEach((l, i) => (l.side = i < N / 2 ? -1 : 1));
    {
      for (const side of [-1, 1] as const) {
        const col = labels.filter((l) => l.side === side).sort((a, b) => a.a.y - b.a.y);
        const colBottom = side < 0 && !portrait ? Math.min(bottom, H * 0.6) : bottom;
        col.forEach((l) => { l.y = Math.min(colBottom, Math.max(top, l.a.y)); });
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 1; i < col.length; i++) if (col[i].y - col[i - 1].y < GAP) col[i].y = col[i - 1].y + GAP;
          const floor = side < 0 && !portrait ? Math.min(bottom, H * 0.6) : bottom;
          if (col.length && col[col.length - 1].y > floor) col[col.length - 1].y = floor;
          for (let i = col.length - 2; i >= 0; i--) if (col[i + 1].y - col[i].y < GAP) col[i].y = col[i + 1].y - GAP;
          if (col.length && col[0].y < top) col[0].y = top;
        }
      }
    }

    const colL = portrait ? 14 : Math.max(24, W * 0.08), colR = W - colL;
    for (const l of labels) {
      const lp = range(state.callouts, (l.order / N) * 0.6, (l.order / N) * 0.6 + 0.4);
      if (lp <= 0) {
        l.path.style.opacity = '0'; l.dot.style.opacity = '0'; setVis(l.box, 0);
        continue;
      }
      const lx = l.side < 0 ? colL : colR;
      const ly = l.y;
      // the word sits on the outer end of the horizontal run, like the reference diagram
      const ex = l.side < 0 ? lx + l.w + 18 : lx - l.w - 18;
      l.path.setAttribute('d', `M${l.a.x.toFixed(1)} ${l.a.y.toFixed(1)}L${ex.toFixed(1)} ${ly.toFixed(1)}L${lx.toFixed(1)} ${ly.toFixed(1)}`);
      const len = Math.hypot(ex - l.a.x, ly - l.a.y) + Math.abs(lx - ex);
      l.path.style.strokeDasharray = `${len.toFixed(1)}`;
      l.path.style.strokeDashoffset = `${(len * (1 - smooth(range(lp, 0, 0.7)))).toFixed(1)}`;
      l.path.style.opacity = '1';
      l.dot.setAttribute('cx', l.a.x.toFixed(1));
      l.dot.setAttribute('cy', l.a.y.toFixed(1));
      l.dot.style.opacity = String(smooth(range(lp, 0, 0.15)));
      const tp = smooth(range(lp, 0.55, 1));
      const bx = l.side < 0 ? lx : lx - l.w;
      l.box.style.transform = `translate3d(${(bx - (1 - tp) * 6 * l.side).toFixed(1)}px,${(ly - 18).toFixed(1)}px,0)`;
      l.box.classList.toggle('is-right', l.side > 0);
      setVis(l.box, tp);
    }
  }

  return { update, destroy() { wrap.remove(); group.remove(); } };
}
