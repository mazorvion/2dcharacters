// Lenis + ScrollTrigger wiring (PLAN.md §4.4). One scroll source of truth, one ticker.
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface Scroll { lenis: Lenis | null; destroy(): void }

/** smooth = false: the host page scrolls natively or runs its own smooth scroller (ScrollTrigger follows either). */
export function initScroll(smooth = true): Scroll {
  ScrollTrigger.config({ ignoreMobileResize: true });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !smooth) return { lenis: null, destroy() {} };
  const lenis = new Lenis({ lerp: 0.1 }); // touch stays native by default
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return {
    lenis,
    destroy() {
      gsap.ticker.remove(raf);
      lenis.destroy();
    },
  };
}
