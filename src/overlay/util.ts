// Shared overlay helpers. Overlay writes use transforms only (PLAN.md §4.6).
import { ICONS } from './icons';

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const easeIn = (t: number) => clamp01(t) ** 3;
/** Map t from [a, b] to [0, 1], clamped. */
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export const SVGNS = 'http://www.w3.org/2000/svg';
export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** Brand-coloured icon markup (generic glyphs use the ink colour). */
export function icon(id: string, cls = 'ov-ico') {
  const i = ICONS[id];
  return i ? `<span class="${cls}" style="color:${i.color}">${i.svg}</span>` : '';
}

export const tx = (e: HTMLElement | SVGElement, x: number, y: number, s = 1) => {
  (e as HTMLElement).style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)${s !== 1 ? ` scale(${s.toFixed(3)})` : ''}`;
};

/** Cheap style writer that skips unchanged values. */
export function setStyle(e: HTMLElement, prop: 'opacity' | 'visibility', v: string) {
  if (e.style[prop] !== v) e.style[prop] = v;
}
export function setVis(e: HTMLElement, o: number) {
  const op = o.toFixed(3);
  if (e.style.opacity !== op) e.style.opacity = op;
  const vis = o > 0.001 ? 'visible' : 'hidden';
  if (e.style.visibility !== vis) e.style.visibility = vis;
}

export interface Pt { x: number; y: number; z: number; visible: boolean }
export const pt = (): Pt => ({ x: 0, y: 0, z: 0, visible: true });
