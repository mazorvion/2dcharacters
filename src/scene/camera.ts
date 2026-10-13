// Orbit-parameter camera "shots" + resize-proof framing (PLAN.md §4.3).
import * as THREE from 'three';
import type { PartId, Rig } from './registry';
import type { Profile, State } from '../core/state';
import type { Exploder } from './explode';

export const FOV = 30;
const DEG = Math.PI / 180;

/** Distance at which a sphere of radius r fits the part of the frustum left free by the offsets. */
export function fitDistance(r: number, fovDeg: number, aspect: number, sy = 0, sx = 0) {
  const vFov = fovDeg * DEG;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const usableV = vFov * (1 - 2 * Math.abs(sy));
  const usableH = hFov * (1 - 2 * Math.abs(sx));
  return (r / Math.sin(Math.min(usableV, usableH) / 2)) * 1.08;
}

export interface Shot { yaw: number; pitch: number; radius: number; tx: number; ty: number; tz: number; sx: number; sy: number }

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private dir = new THREE.Vector3();
  /** Model-space bounding spheres of each part at rest (centre relative to the part pivot). */
  private spheres = new Map<PartId, { c: THREE.Vector3; r: number }>();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(FOV, aspect, 0.05, 60);
  }

  measure(rig: Rig) {
    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3(), s = new THREE.Sphere();
    for (const p of Object.values(rig.parts)) {
      if (p.id === 'screws') continue;
      box.setFromObject(p.object, true).getBoundingSphere(s);
      this.spheres.set(p.id, { c: s.center.clone().sub(p.object.position), r: s.radius });
    }
  }

  /**
   * Bounding sphere (target + radius) of some parts at their exploded positions for a profile.
   * Parts listed in `popped` are measured where they sit when popped out for their beat.
   */
  frameParts(ids: PartId[], profile: Profile, exploder: Exploder, explode = 1, pad = 1.04, popped: readonly PartId[] = []): Pick<Shot, 'tx' | 'ty' | 'tz' | 'radius'> {
    const box = new THREE.Box3();
    const pts: { c: THREE.Vector3; r: number }[] = [];
    for (const id of ids) {
      const sp = this.spheres.get(id);
      if (!sp) continue;
      const pos = exploder.restPosition(id).lerp(exploder.explodedPosition(id, profile), explode).add(sp.c);
      if (popped.includes(id)) pos.add(exploder.popOffset(id, profile));
      pts.push({ c: pos, r: sp.r });
      box.expandByPoint(pos.clone().addScalar(sp.r)).expandByPoint(pos.clone().addScalar(-sp.r));
    }
    const c = box.getCenter(new THREE.Vector3());
    let r = 0;
    for (const p of pts) r = Math.max(r, p.c.distanceTo(c) + p.r);
    return { tx: c.x, ty: c.y, tz: c.z, radius: r * pad };
  }

  update(cam: State['cam'], width: number, height: number, root: THREE.Object3D) {
    const c = this.camera;
    c.aspect = width / height;
    const yaw = cam.yaw * DEG, pitch = cam.pitch * DEG;
    this.dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    this.target.set(cam.tx, cam.ty, cam.tz).applyMatrix4(root.matrixWorld);
    const d = fitDistance(cam.radius, FOV, c.aspect, cam.sy, cam.sx);
    c.position.copy(this.target).addScaledVector(this.dir, d);
    c.lookAt(this.target);
    // off-axis shift: subject centre at (50 % + sx, 50 % + sy) of the viewport
    c.setViewOffset(width, height, -cam.sx * width, -cam.sy * height, width, height);
    c.updateProjectionMatrix();
  }
}
