// Idle life: breathing, blink scheduler, pointer look, floating drift of loose parts, antenna
// springs, contact shadow. The only motion outside the master timeline (PLAN.md §3 rule 4).
import * as THREE from 'three';
import type { PartId, Rig } from './registry';
import type { Face } from './face';
import type { Exploder } from './explode';
import { assembled, type State } from '../core/state';

interface Spring { a: number; v: number }
const stepSpring = (s: Spring, target: number, dt: number, k = 70, c = 7) => {
  const acc = -k * (s.a - target) - c * s.v;
  s.v += acc * dt;
  s.a += s.v * dt;
};

export class Idle {
  enabled = true;          // false under reduced motion
  pointerLook = true;
  private time = 0;
  private nextBlink = 1.8;
  private blinkUntil = -1;
  private pointer = { x: 0, y: 0, has: false };
  private look = { x: 0, y: 0 };
  private lastLook = { x: 0, y: 0 };
  private springs = { sx: { a: 0, v: 0 }, sz: { a: 0, v: 0 }, hx: { a: 0, v: 0 }, hz: { a: 0, v: 0 } };
  private lastY = 0;
  private ids: PartId[];
  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
    this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    this.pointer.has = true;
  };

  constructor(private rig: Rig, private face: Face, private exploder: Exploder) {
    this.ids = (Object.keys(rig.parts) as PartId[]).filter((id) => id !== 'screws');
    addEventListener('pointermove', this.onMove, { passive: true });
  }

  /** True while something is animating that needs frames even if the scroll state is static. */
  get active() { return this.enabled; }

  /** Runs after Exploder.apply(): adds idle offsets on top of the timeline-driven pose. */
  update(dt: number, s: State) {
    dt = Math.min(dt, 1 / 20);
    this.time += dt;
    const t = this.time;
    const { model, parts } = this.rig;
    const calm = assembled(s); // whole-body idle grows as the Double comes together

    // loose parts float gently while they wait to be attached
    if (this.enabled) {
      this.ids.forEach((id, i) => {
        const e = Math.max(0, this.exploder.amount(id));
        if (e <= 0.001) return;
        const o = parts[id].object;
        o.position.y += Math.sin(t * 1.1 + i * 1.7) * 0.035 * e;
        o.rotation.z += Math.sin(t * 0.8 + i) * 0.04 * e;
        o.rotation.x += Math.cos(t * 0.7 + i * 0.6) * 0.03 * e;
      });
    }

    // breathing
    const br = this.enabled ? Math.sin(t * 1.6) * 0.5 + 0.5 : 0;
    model.scale.set(1 + br * 0.008, 1 + br * 0.014 * calm, 1 + br * 0.008);

    // landing bounce (squash & stretch) in the final chapter
    const bounce = s.assembleBounce;
    const squash = Math.sin(bounce * Math.PI * 2) * 0.06 * (1 - bounce);
    model.position.y = Math.max(0, Math.sin(bounce * Math.PI)) * 0.14;
    model.scale.y *= 1 + squash;
    model.scale.x *= 1 - squash * 0.5;
    model.scale.z *= 1 - squash * 0.5;

    // pointer look (desktop), only once the head is together
    const lookW = this.enabled && this.pointerLook && this.pointer.has ? calm : 0;
    const tx = this.pointer.x * 0.2 * lookW, ty = this.pointer.y * 0.1 * lookW;
    const k = 1 - Math.exp(-dt * 4);
    this.look.x += (tx - this.look.x) * k;
    this.look.y += (ty - this.look.y) * k;
    model.rotation.set(this.look.y, this.look.x + (s.modelRotY * Math.PI) / 180, 0);
    this.face.pupil.x = (this.look.x / 0.2) * 1.2;
    this.face.pupil.y = (this.look.y / 0.1) * 1.0;

    // blink scheduler
    if (this.enabled && t > this.nextBlink) {
      this.blinkUntil = t + 0.12;
      this.nextBlink = t + 2.5 + Math.random() * 3.5;
      if (Math.random() < 0.18) this.nextBlink = t + 0.28; // occasional double blink
    }
    this.face.blinking = t < this.blinkUntil;

    // claw wave, driven by s.wave in the final chapter
    const wave = Math.sin(s.wave * Math.PI * 4) * Math.sin(s.wave * Math.PI) * 0.4;
    const sway = this.enabled ? Math.sin(t * 1.1) * 0.03 * calm : 0;
    parts.clawL.object.rotation.z += wave + sway;
    parts.clawR.object.rotation.z -= sway * 0.7;

    // antenna springs: react to head motion and vertical motion (secondary motion)
    const lvx = (this.look.x - this.lastLook.x) / Math.max(dt, 1e-3);
    const lvy = (this.look.y - this.lastLook.y) / Math.max(dt, 1e-3);
    const vy = (model.position.y - this.lastY) / Math.max(dt, 1e-3);
    this.lastLook.x = this.look.x; this.lastLook.y = this.look.y; this.lastY = model.position.y;
    const wob = this.enabled ? Math.sin(t * 2.3) * 0.025 : 0;
    stepSpring(this.springs.sz, -lvx * 0.12 + vy * 0.15 + wob, dt);
    stepSpring(this.springs.sx, lvy * 0.1, dt);
    stepSpring(this.springs.hz, -lvx * 0.1 - vy * 0.12 - wob * 0.8, dt, 55, 6);
    stepSpring(this.springs.hx, lvy * 0.08, dt, 55, 6);
    this.rig.springs.stem.rotation.set(this.springs.sx.a, 0, this.springs.sz.a);
    this.rig.springs.hook.rotation.set(this.springs.hx.a, 0, this.springs.hz.a);
    // the lime tip rides on top of the stem once both are attached
    const ride = (1 - Math.min(1, Math.abs(this.exploder.amount('tipL')))) * (1 - Math.min(1, Math.abs(this.exploder.amount('stemL'))));
    parts.tipL.object.position.x -= Math.sin(this.springs.sz.a) * 0.49 * ride;
    parts.tipL.object.position.z += Math.sin(this.springs.sx.a) * 0.49 * ride;

    // contact shadow appears as the feet land, and follows the bounce height
    const feetLift = Math.max(0, model.position.y);
    const sh = THREE.MathUtils.clamp(1 - feetLift * 2.5, 0.3, 1);
    this.rig.shadow.scale.setScalar(0.75 + sh * 0.25);
    (this.rig.shadow.material as THREE.MeshBasicMaterial).opacity = sh * (0.25 + 0.75 * (1 - Math.min(1, Math.max(0, this.exploder.amount('footL'))))) * Math.max(0, 1 - s.dim);
  }

  dispose() { removeEventListener('pointermove', this.onMove); }
}
