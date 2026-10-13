// ?debug panel (P3): explode slider, per-part offset editor with "copy JSON", camera shot sliders,
// tier switch, stats-gl. Loaded only with ?debug, never in the production path.
import GUI from 'lil-gui';
import Stats from 'stats-gl';
import gsap from 'gsap';
import { state } from './state';
import { EXPLODE } from '../scene/explode';
import { PART_IDS } from '../scene/registry';
import type { Stage } from '../scene/Stage';

export function startDebug(stage: Stage, opts: { pauseScroll(on: boolean): void }) {
  const gui = new GUI({ title: 'The Double · debug' });
  gui.domElement.style.zIndex = '1000';
  const ctl = { manual: false };
  const dirty = () => { state.dirty = true; };
  gui.add(ctl, 'manual').name('manual (ignore scroll)').onChange((v: boolean) => opts.pauseScroll(v));

  const f = gui.addFolder('Explode');
  f.add(state, 'assemble', 0, 1, 0.001).listen().onChange(dirty);
  f.add(state, 'explodeScale', 0.3, 1.5, 0.01).listen().onChange(dirty);
  f.add(state, 'dim', 0, 1, 0.01).listen().onChange(dirty);
  f.add(state, 'blueprint', 0, 1, 0.01).listen().onChange(dirty);
  f.add(state, 'callouts', 0, 1, 0.001).listen().onChange(dirty);
  f.add(state, 'clawPinch', 0, 1, 0.01).listen().onChange(dirty);
  f.add(state, 'face', ['idle', 'happy', 'surprised', 'thinking', 'listening', 'talking', 'working', 'lock', 'love', 'icon']).listen().onChange(dirty);

  const parts = gui.addFolder('Part offsets').close();
  for (const id of PART_IDS) {
    const e = EXPLODE[id];
    const pf = parts.addFolder(id).close();
    const at = e.at ?? [0, 0, 0];
    const o = { x: at[0], y: at[1], z: at[2], order: e.order };
    const set = () => { if (e.at) e.at = [o.x, o.y, o.z]; e.order = o.order; dirty(); };
    pf.add(o, 'x', -4, 4, 0.01).onChange(set);
    pf.add(o, 'y', -4, 4, 0.01).onChange(set);
    pf.add(o, 'z', -4, 4, 0.01).onChange(set);
    pf.add(o, 'order', 0, 7, 1).onChange(set);
  }
  parts.add({ copy: () => {
    const json = JSON.stringify(EXPLODE, null, 0).replace(/\},/g, '},\n');
    void navigator.clipboard?.writeText(json);
    console.log(json);
  } }, 'copy').name('copy JSON');

  const c = gui.addFolder('Camera shot');
  c.add(state.cam, 'yaw', -180, 180, 0.5).listen().onChange(dirty);
  c.add(state.cam, 'pitch', -40, 60, 0.5).listen().onChange(dirty);
  c.add(state.cam, 'radius', 0.3, 6, 0.01).listen().onChange(dirty);
  c.add(state.cam, 'tx', -3, 3, 0.01).listen().onChange(dirty);
  c.add(state.cam, 'ty', -3, 3, 0.01).listen().onChange(dirty);
  c.add(state.cam, 'tz', -3, 3, 0.01).listen().onChange(dirty);
  c.add(state.cam, 'sx', -0.4, 0.4, 0.005).listen().onChange(dirty);
  c.add(state.cam, 'sy', -0.4, 0.4, 0.005).listen().onChange(dirty);
  c.add({ log: () => console.log(JSON.stringify(state.cam)) }, 'log').name('log shot');

  const t = gui.addFolder('Tier');
  t.add({ tier: stage.tier.tier }, 'tier', ['low', 'mid', 'high']).onChange((v: string) => {
    const u = new URL(location.href); u.searchParams.set('tier', v); location.href = u.toString();
  });
  const info = { calls: 0, triangles: 0 };
  t.add(info, 'calls').listen().disable();
  t.add(info, 'triangles').listen().disable();

  const stats = new Stats({ trackGPU: false, horizontal: true });
  stats.init(stage.renderer);
  document.body.appendChild(stats.dom);
  gsap.ticker.add(() => {
    stats.update();
    info.calls = stage.renderer.info.render.calls;
    info.triangles = stage.renderer.info.render.triangles;
  });
  return () => { gui.destroy(); stats.dom.remove(); };
}
