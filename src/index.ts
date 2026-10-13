// Standalone demo page entry (index.html): brand fonts, page chrome and the story, auto-mounted.
// The Astro/website build uses src/embed.ts instead (no fonts, no page-level CSS).
import './fonts';
import './story-styles';
import './styles/demo-page.css';
import { mount, type Mounted } from './mount';

export { mount } from './mount';
export type { MountOptions, Mounted } from './mount';

const root = document.getElementById('double-story');
if (root && !root.hasAttribute('data-no-auto')) {
  const m = mount(root);
  if (import.meta.env.DEV) (window as unknown as { __double: Mounted }).__double = m;
}
