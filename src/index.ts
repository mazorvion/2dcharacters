// Public API: mount(el, opts) → { destroy }. Statically imports only CSS + this tiny bootstrap;
// the WebGL story is code-split and loaded after the poster paints (PLAN.md §6.1).
import '@fontsource-variable/funnel-display/index.css';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import './styles/tokens.css';
import './styles/story.css';
import './styles/blueprint.css';
import './styles/overlay.css';
import { flags } from './core/flags';

export interface MountOptions { autoStart?: boolean }
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

export function mount(el: HTMLElement, _opts: MountOptions = {}): Mounted {
  const existing = mounted.get(el);
  if (existing) return existing; // idempotent

  if (flags.noWebGL || !webglAvailable()) {
    el.dataset.mode = 'static';
    const m = { destroy() { mounted.delete(el); } };
    mounted.set(el, m);
    return m;
  }

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
      teardown = boot(el);
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

// standalone demo page: auto-mount
const root = document.getElementById('double-story');
if (root && !root.hasAttribute('data-no-auto')) {
  const m = mount(root);
  if (import.meta.env.DEV) (window as unknown as { __double: Mounted }).__double = m;
}
