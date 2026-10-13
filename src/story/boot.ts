// Lazy chunk: builds the Stage and wires scroll + timeline + overlays.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Stage } from '../scene/Stage';
import { state } from '../core/state';
import { flags } from '../core/flags';
import { initScroll } from '../core/scroll';
import { buildTimeline } from './timeline';
import { mountOverlays } from '../overlay';

export function boot(root: HTMLElement, opts: { smoothScroll?: boolean } = {}): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas.gl')!;
  const stage = new Stage(root, canvas);
  const scroll = initScroll(opts.smoothScroll ?? true);
  const overlays = mountOverlays(root, stage);
  const killTimeline = buildTimeline(root, stage);
  state.dirty = true;
  stage.start();
  ScrollTrigger.refresh();

  let killDebug: (() => void) | null = null;
  // the website build compiles the panel out (__DOUBLE_DEBUG__ = false), so ?debug does nothing there
  if (__DOUBLE_DEBUG__ && flags.debug) {
    import('../core/debug').then(({ startDebug }) => {
      killDebug = startDebug(stage, {
        pauseScroll(on) { ScrollTrigger.getAll().forEach((t) => (on ? t.disable(false) : t.enable())); },
      });
    });
  }

  if (import.meta.env.DEV) {
    const w = window as unknown as Record<string, unknown>;
    w.__stage = stage;
    w.__state = state;
    w.__lenis = scroll.lenis;
    w.__ST = ScrollTrigger;
    // __shot('name', crop?) renders a frame, composites it on --ground and saves .shots/name.png
    w.__shot = async (name: string, crop?: [number, number, number, number]) => {
      stage.renderFrame(0);
      const src = stage.renderer.domElement;
      const [x, y, cw, ch] = crop ?? [0, 0, src.width, src.height];
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const g = c.getContext('2d')!;
      g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, cw, ch);
      g.drawImage(src, x, y, cw, ch, 0, 0, cw, ch);
      await fetch(`/__shot?name=${name}`, { method: 'POST', body: c.toDataURL('image/png') });
      return [src.width, src.height, JSON.stringify(stage.renderer.info.render)];
    };
  }

  return () => {
    killDebug?.();
    killTimeline();
    overlays.destroy();
    scroll.destroy();
    stage.dispose();
  };
}
