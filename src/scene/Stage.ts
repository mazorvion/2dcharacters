// Renderer, camera, resize, render-on-demand loop (PLAN.md §4.6). Shares gsap.ticker with
// Lenis and ScrollTrigger so scroll, tween and render happen in one frame.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { state, type Profile } from '../core/state';
import { detectTier, lowerTier, tierConfig, type TierConfig } from '../core/tier';
import { createMaterials, type Materials } from './materials';
import { buildProcedural } from './buildProcedural';
import { Face } from './face';
import { Exploder } from './explode';
import { Idle } from './idle';
import { CameraRig } from './camera';
import type { Rig } from './registry';

export type FrameHook = (stage: Stage, dt: number) => void;

export const profileFor = (w: number, h: number): Profile => (w / h <= 0.8 ? 'portrait' : 'landscape');

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: CameraRig;
  readonly rig: Rig;
  readonly face: Face;
  readonly exploder: Exploder;
  readonly idle: Idle;
  readonly mats: Materials;
  tier: TierConfig;
  profile: Profile;
  width = 1;
  height = 1;
  time = 0;
  private hooks: FrameHook[] = [];
  private onScreen = true;
  private tabVisible = !document.hidden;
  private io: IntersectionObserver;
  private ro: ResizeObserver;
  private resizeTimer = 0;
  private guard = { frames: 0, acc: 0, done: false };
  private firstFrame = false;
  private settling = false;
  private lastBlueprint = -1;
  private lastSpot = '';
  private spotEl: HTMLElement | null;
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private onVis = () => { this.tabVisible = !document.hidden; };

  constructor(readonly root: HTMLElement, readonly canvas: HTMLCanvasElement, opts: { transparentPoster?: boolean } = {}) {
    // probe tier with a throwaway context so antialias can be chosen up front
    const probe = document.createElement('canvas').getContext('webgl2');
    this.tier = tierConfig(detectTier(probe));
    probe?.getExtension('WEBGL_lose_context')?.loseContext();

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: this.tier.antialias, alpha: true, powerPreference: 'high-performance',
      preserveDrawingBuffer: !!opts.transparentPoster,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral instead of ACES Filmic: ACES shifts saturated cobalt toward purple (checked against reference).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x000000, 0);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envRT = this.pmrem.fromScene(room, 0.04);
    room.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.5;

    const key = new THREE.DirectionalLight('#ffffff', 1.6);
    key.position.set(-3, 4.5, 5);
    const hemi = new THREE.HemisphereLight('#ffffff', '#d9d3c4', 0.4);
    this.scene.add(key, hemi);

    this.mats = createMaterials();
    this.face = new Face();
    this.face.halo = this.tier.halo;
    this.rig = buildProcedural(this.mats, this.face, { lowDetail: this.tier.lowDetail });
    this.scene.add(this.rig.root);
    this.exploder = new Exploder(this.rig);
    this.idle = new Idle(this.rig, this.face, this.exploder);
    this.idle.enabled = !this.reducedMotion;
    this.idle.pointerLook = this.tier.pointerLook && matchMedia('(pointer: fine)').matches;

    this.spotEl = root.querySelector<HTMLElement>('.spot');
    const r = canvas.getBoundingClientRect();
    this.width = Math.max(1, r.width); this.height = Math.max(1, r.height);
    this.profile = profileFor(this.width, this.height);
    this.cam = new CameraRig(this.width / this.height);
    this.cam.measure(this.rig);
    this.applySize();

    this.io = new IntersectionObserver(([e]) => { this.onScreen = e.isIntersecting; if (e.isIntersecting) state.dirty = true; });
    this.io.observe(root);
    document.addEventListener('visibilitychange', this.onVis);
    this.ro = new ResizeObserver(() => this.queueResize());
    this.ro.observe(canvas);
  }

  onFrame(h: FrameHook) { this.hooks.push(h); }

  start() { gsap.ticker.add(this.tick); }

  private queueResize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    if (w === this.width && h === this.height) return;
    // touch: ignore height-only changes under 140px (mobile URL bar)
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (coarse && w === this.width && Math.abs(h - this.height) < 140) return;
    clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.width = w; this.height = h;
      this.profile = profileFor(w, h);
      this.applySize();
      state.dirty = true;
    }, 150);
  }

  private applySize() {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.tier.dprCap));
    this.renderer.setSize(this.width, this.height, false);
  }

  /** Drop one tier live (DPR first) if the first 90 frames average > 24 ms. */
  private fpsGuard(dtMs: number) {
    if (this.guard.done) return;
    this.guard.frames++;
    if (this.guard.frames < 10) return; // skip warm-up (shader compile)
    this.guard.acc += dtMs;
    if (this.guard.frames >= 100) {
      this.guard.done = true;
      const avg = this.guard.acc / 90;
      if (avg > 24 && this.tier.tier !== 'low') {
        this.tier = tierConfig(lowerTier(this.tier.tier));
        this.face.halo = this.tier.halo;
        this.applySize();
        console.info(`[double] avg frame ${avg.toFixed(1)}ms → tier ${this.tier.tier}`);
      }
    }
  }

  private tick = (time: number, deltaMs: number) => {
    if (!this.onScreen || !this.tabVisible) return;
    if (!state.dirty && !this.idle.active && !this.settling) return;
    const dt = Math.min(deltaMs, 100) / 1000;
    this.time = time;
    this.renderFrame(dt);
    this.fpsGuard(deltaMs);
  };

  renderFrame(dt: number) {
    const s = state;
    this.exploder.apply(s, this.profile);
    this.idle.update(dt, s);
    this.rig.root.updateMatrixWorld(true);
    this.cam.update(s.cam, this.width, this.height, this.rig.root);
    this.settling = this.exploder.applyFocusDim(s, dt);
    this.rig.glow.wireMap.offset.x -= dt * 0.9; // pulse travelling along the harness

    this.face.expression = s.face;
    this.face.icon = s.faceIcon;
    this.face.update(this.time);

    if (s.blueprint !== this.lastBlueprint) {
      this.root.style.setProperty('--blueprint', s.blueprint.toFixed(3));
      this.lastBlueprint = s.blueprint;
    }

    // the spotlight sits on the subject's screen centre (the camera's sx/sy offset)
    const sp = s.spot;
    const spot = `${(50 + s.cam.sx * 100).toFixed(2)}|${(50 + s.cam.sy * 100 - 2).toFixed(2)}|${sp.r | 0} ${sp.g | 0} ${sp.b | 0}|${sp.a.toFixed(3)}|${sp.s.toFixed(3)}`;
    if (spot !== this.lastSpot && this.spotEl) {
      const [x, y, rgb, a, sc] = spot.split('|');
      const st = this.spotEl.style;
      st.setProperty('--spot-x', `${x}%`);
      st.setProperty('--spot-y', `${y}%`);
      st.setProperty('--spot-rgb', rgb);
      st.setProperty('--spot-a', a);
      st.setProperty('--spot-s', sc);
      this.lastSpot = spot;
    }

    this.renderer.render(this.scene, this.cam.camera);
    for (const h of this.hooks) h(this, dt);
    s.dirty = false;

    if (!this.firstFrame) {
      this.firstFrame = true;
      this.root.classList.add('gl-ready');
    }
  }

  /** Project a model-space object to CSS pixels in the stage. */
  project(obj: THREE.Object3D, out: { x: number; y: number; z: number; visible: boolean }) {
    const v = Stage.tmp.setFromMatrixPosition(obj.matrixWorld).project(this.cam.camera);
    out.x = (v.x * 0.5 + 0.5) * this.width;
    out.y = (-v.y * 0.5 + 0.5) * this.height;
    out.z = v.z;
    out.visible = v.z < 1;
    return out;
  }
  projectPoint(p: THREE.Vector3, out: { x: number; y: number; z: number; visible: boolean }) {
    const v = Stage.tmp.copy(p).project(this.cam.camera);
    out.x = (v.x * 0.5 + 0.5) * this.width;
    out.y = (-v.y * 0.5 + 0.5) * this.height;
    out.z = v.z;
    out.visible = v.z < 1;
    return out;
  }
  private static tmp = new THREE.Vector3();

  dispose() {
    gsap.ticker.remove(this.tick);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    clearTimeout(this.resizeTimer);
    this.idle.dispose();
    this.rig.dispose();
    this.mats.dispose();
    this.face.dispose();
    this.envRT.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.root.classList.remove('gl-ready');
  }
}
