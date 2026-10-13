// /characters: the block-built cast, rigged and posable. Built to be reused for site animation and video:
// every joint is exposed on window.__cast in dev, poses blend, and the canvas exports a transparent PNG.
import '@fontsource-variable/funnel-display/index.css';
import '@fontsource-variable/geist-mono/index.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '../styles/tokens.css';
import '../styles/characters.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCharacter, type Rig } from './blocks';
import { CAST } from './sampled';

// world units per block; her grid was sampled from a smaller crop, so she is scaled to match the stage render
const CELL = { him: 0.04, her: 0.043 };

const canvas = document.querySelector<HTMLCanvasElement>('#cast-gl')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

// soft studio light, matching the felt renders: big key from front-left-top, warm fill, rim
const key = new THREE.DirectionalLight('#ffffff', 2.1);
key.position.set(-2.2, 4, 3.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -3; key.shadow.camera.right = 3;
key.shadow.camera.top = 4; key.shadow.camera.bottom = -1;
key.shadow.radius = 6;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.01;
const fill = new THREE.HemisphereLight('#ffffff', '#e8e2d6', 0.55);
const rim = new THREE.DirectionalLight('#dfe6ff', 0.6);
rim.position.set(3, 2.5, -3);
scene.add(key, fill, rim);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.ShadowMaterial({ opacity: 0.16 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
camera.position.set(0, 1.6, 10.6);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI / 2 - 0.02;

// ---------------------------------------------------------------- cast

const rigs: Record<'him' | 'her', Rig> = {
  him: buildCharacter(CAST.him, 3),
  her: buildCharacter(CAST.her, 11),
};
const holders: Record<'him' | 'her', THREE.Group> = { him: new THREE.Group(), her: new THREE.Group() };
for (const k of ['him', 'her'] as const) {
  rigs[k].root.scale.setScalar(CELL[k]);
  holders[k].add(rigs[k].root);
  scene.add(holders[k]);
}

type Show = 'both' | 'him' | 'her';
let show: Show = 'both';
let pose = 'hero';
let idle = true;
let turntable = false;

function layout() {
  const both = show === 'both';
  holders.him.visible = show !== 'her';
  holders.her.visible = show !== 'him';
  holders.him.position.x = both ? -1.25 : 0;
  holders.her.position.x = both ? 1.25 : 0;
  holders.him.rotation.y = both ? 0.12 : 0;
  holders.her.rotation.y = both ? -0.12 : 0;
}
layout();
for (const r of Object.values(rigs)) r.setPose(pose, 1);

// ---------------------------------------------------------------- UI

const ui = document.querySelector<HTMLElement>('.cast-ui')!;
const group = (name: string, values: string[], get: () => string, set: (v: string) => void) => {
  const el = ui.querySelector<HTMLElement>(`[data-group="${name}"]`)!;
  el.innerHTML = values.map((v) => `<button type="button" data-v="${v}">${v}</button>`).join('');
  const sync = () => el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === get())));
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    set(b.dataset.v!);
    sync();
  });
  sync();
};
group('show', ['both', 'him', 'her'], () => show, (v) => { show = v as Show; layout(); });
group('pose', ['hero', 'talk', 'wave'], () => pose, (v) => { pose = v; });
const toggle = (name: string, get: () => boolean, set: (v: boolean) => void) => {
  const b = ui.querySelector<HTMLButtonElement>(`[data-toggle="${name}"]`)!;
  const sync = () => b.setAttribute('aria-pressed', String(get()));
  b.addEventListener('click', () => { set(!get()); sync(); });
  sync();
};
toggle('idle', () => idle, (v) => { idle = v; });
toggle('turntable', () => turntable, (v) => { turntable = v; });
ui.querySelector('[data-action="front"]')!.addEventListener('click', () => {
  camera.position.set(0, 1.6, 10.6);
  controls.target.set(0, 1.5, 0);
});
ui.querySelector('[data-action="png"]')!.addEventListener('click', () => {
  ground.visible = false;
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = `double-cast-${show}-${pose}.png`;
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
  ground.visible = true;
});

// ---------------------------------------------------------------- loop

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  resize();
  (['him', 'her'] as const).forEach((k, i) => {
    const r = rigs[k];
    r.setPose(pose, 1 - Math.exp(-dt * 7));
    const j = r.joints;
    const ph = t * 1.7 + i * 1.3;
    // idle life layered on top of the pose: breathing, a little head tilt, arm drift, blinks.
    // Never translate parts: they tile each other exactly, so moving one opens a gap (the torso used to
    // bob 0.18 cells off the legs). Breathing is a tiny stretch from the hip pivot instead.
    j.torso.scale.y = idle ? 1 + Math.sin(ph) * 0.008 : 1;
    if (idle) {
      j.head.rotation.z += Math.sin(ph * 0.5) * 0.02;
      j.armL.rotation.z += Math.sin(ph + 0.4) * 0.025;
      j.armR.rotation.z -= Math.sin(ph + 0.9) * 0.025;
      if (pose === 'wave') j.armR.rotation.z += Math.sin(t * 6) * 0.22;
      if (pose === 'talk') {
        j.armR.rotation.z += Math.sin(t * 3.1 + i) * 0.08;
        j.armL.rotation.z -= Math.sin(t * 2.7 + i) * 0.06;
      }
    }
    // blink: a quick squash of both eyes every few seconds (offset per character)
    const sinceBlink = idle ? t % (3.1 + i * 0.7) : 1;
    j.eyes.scale.y = sinceBlink < 0.12 ? 0.2 : 1;
  });
  if (turntable) {
    holders.him.rotation.y = (show === 'both' ? 0.12 : 0) + Math.sin(t * 0.6) * 0.6;
    holders.her.rotation.y = (show === 'both' ? -0.12 : 0) + Math.sin(t * 0.6 + 0.5) * 0.6;
  } else layout();
  controls.update();
  renderer.render(scene, camera);
});

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__cast = { rigs, scene, camera, renderer };
