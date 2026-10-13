// Website entry (npm run build:astro → astro-embed/). Loads as one ES module from the host page and
// mounts every story section on it. Handles Astro's view transitions (<ClientRouter />): mounts on
// astro:page-load, tears down before the DOM swap, so navigating away and back is clean.
import './story-styles';
import { mount, type Mounted } from './mount';

export { mount } from './mount';
export type { MountOptions, Mounted } from './mount';

const live = new Map<HTMLElement, Mounted>();

export function mountAll() {
  document.querySelectorAll<HTMLElement>('#double-story:not([data-no-auto])').forEach((el) => {
    if (!live.has(el)) live.set(el, mount(el));
  });
}

export function destroyAll() {
  live.forEach((m) => m.destroy());
  live.clear();
}

mountAll(); // module scripts run after the document is parsed
document.addEventListener('astro:page-load', mountAll);
document.addEventListener('astro:before-swap', destroyAll);
