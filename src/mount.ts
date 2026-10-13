// Public API: mount(el, opts) → { destroy }. Imports no CSS (each entry brings its own) and keeps the
// WebGL story code-split: it loads after the static markup has painted (PLAN.md §6.1).
import { flags } from './core/flags';

export interface MountOptions {
  /**
   * Lenis smooth scrolling. Turn it off when the host page already runs its own Lenis (or any
   * smooth-scroll library); the story then follows native scroll. Default: the section's
   * `data-smooth-scroll` attribute, else true.
   */
  smoothScroll?: boolean;
}
export interface Mounted { destroy(): void }

const mounted = new WeakMap<HTMLElement, Mounted>();

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

export function mount(el: HTMLElement, opts: MountOptions = {}): Mounted {
  const existing = mounted.get(el);
  if (existing) return existing; // idempotent

  if (flags.noWebGL || !webglAvailable()) {
    el.dataset.mode = 'static';
    const m = { destroy() { mounted.delete(el); } };
    mounted.set(el, m);
    return m;
  }

  const smoothScroll = opts.smoothScroll ?? el.dataset.smoothScroll !== 'false';
  el.dataset.mode = '3d';
  let destroyed = false;
  let teardown: (() => void) | null = null;

  let started = false;
  const load = () => {
    cleanupTriggers();
    if (destroyed || started) return;
    started = true;
    import('./story/boot').then(({ boot }) => {
      if (destroyed) return;
      teardown = boot(el, { smoothScroll });
    });
  };
  // load on idle, or first scroll / pointer move, with a 2.5 s fallback
  const events = ['scroll', 'pointermove', 'touchstart', 'keydown'] as const;
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const idleId = ric ? ric(load, { timeout: 2500 }) : window.setTimeout(load, 1200);
  const fallback = window.setTimeout(load, 2500);
  events.forEach((e) => addEventListener(e, load, { once: true, passive: true }));
  let cleaned = false;
  function cleanupTriggers() {
    if (cleaned) return;
    cleaned = true;
    events.forEach((e) => removeEventListener(e, load));
    clearTimeout(fallback);
    if (!ric) clearTimeout(idleId);
  }

  const m: Mounted = {
    destroy() {
      destroyed = true;
      cleanupTriggers();
      teardown?.();
      teardown = null;
      mounted.delete(el);
      el.dataset.mode = 'static';
    },
  };
  mounted.set(el, m);
  return m;
}
