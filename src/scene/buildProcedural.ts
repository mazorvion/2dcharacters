// Phase A: builds The Double from three.js primitives (PLAN.md §5.3), following the construction sheet
// in reference/double-construction-sheet.webp (body 0.72 of total height, total width 1.2).
// Budget: < 60k triangles, < 40 draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Materials } from './materials';
import type { Part, PartId, Rig } from './registry';
import type { Face } from './face';

// ---------------------------------------------------------------- helpers

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Merge geometries after normalising them to non-indexed position/normal/uv(/color). */
function merge(geos: THREE.BufferGeometry[], keepColor = false): THREE.BufferGeometry {
  const norm = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(n.attributes))
      if (!['position', 'normal', 'uv', ...(keepColor ? ['color'] : [])].includes(k)) n.deleteAttribute(k);
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    n.clearGroups();
    return n;
  });
  const m = mergeGeometries(norm, false)!;
  norm.forEach((g) => g.dispose());
  geos.forEach((g) => g.dispose());
  return m;
}

function hash3(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 1440662683) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}

/** Superellipse boundary point. */
function squircle(theta: number, a: number, b: number, n: number) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n)];
}

/**
 * A curved squircle slab (screen, cover, face plane): a profile swept around a superellipse,
 * bent onto an ellipsoidal cap so it follows the body. `frontOnly` gives a single curved sheet.
 */
function squircleSlab(o: {
  a: number; b: number; n: number; depth: number; bevel: number;
  rx: number; ry: number; seg?: number; rings?: number; frontOnly?: boolean;
}): THREE.BufferGeometry {
  const seg = o.seg ?? 56, rings = o.rings ?? 6;
  const e = o.bevel / Math.min(o.a, o.b);
  const prof: [number, number][] = []; // [scale, z]
  for (let k = 0; k <= rings; k++) prof.push([(k / rings) * (1 - e), o.depth / 2]);
  if (!o.frontOnly) {
    for (let k = 1; k < 8; k++) {
      const p = (k / 8) * Math.PI;
      prof.push([1 - e + e * Math.sin(p), (o.depth / 2) * Math.cos(p)]);
    }
    for (let k = rings; k >= 0; k--) prof.push([(k / rings) * (1 - e), -o.depth / 2]);
  } else {
    prof[prof.length - 1][0] = 1;
  }
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const [bx, by] = squircle((i / seg) * Math.PI * 2, o.a, o.b, o.n);
    for (const [s, z] of prof) {
      const x = bx * s, y = by * s;
      pos.push(x, y, z - (x * x) / (2 * o.rx) - (y * y) / (2 * o.ry));
      uv.push(x / (2 * o.a) + 0.5, y / (2 * o.b) + 0.5);
    }
  }
  const P = prof.length;
  for (let i = 0; i < seg; i++)
    for (let k = 0; k < P - 1; k++) {
      const a = i * P + k, b = (i + 1) * P + k;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Body: not a sphere, not a box. Fitted to reference/double-front-hero.png: total height 0.956 × the
 * half-width, a short straight band down the sides (y −0.10 … +0.15, from the patches to the eye line),
 * and superelliptic domes above and below it (n ≈ 2.2). In depth it is rounder (side and back views of
 * reference/double-turnaround.webp): a superquadric with exponent n in the front plane and m in depth.
 */
const BODY = { sx: 1.0, sy: 0.956, sz: 0.94, n: 2.2, m: 2.0, bandTop: 0.15, bandBot: -0.1 };
const sp = (v: number) => Math.abs(v) ** BODY.n;
/** Normalised vertical coordinate inside the top / bottom dome (0 within the straight band). */
function capY(y: number) {
  if (y > BODY.bandTop) return (y - BODY.bandTop) / (BODY.sy - BODY.bandTop);
  if (y < BODY.bandBot) return (y - BODY.bandBot) / (BODY.sy + BODY.bandBot);
  return 0;
}
/** Implicit body function: < 1 inside, 1 on the surface. */
const bodyF = (x: number, y: number, z: number) =>
  (sp(x / BODY.sx) + sp(capY(y))) ** (BODY.m / BODY.n) + Math.abs(z / BODY.sz) ** BODY.m;

/** Distance along a direction from the centre to the body surface (bisection on the implicit function). */
function rayToBody(x: number, y: number, z: number) {
  let lo = 0, hi = 2.5;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (bodyF(x * m, y * m, z * m) < 1) lo = m; else hi = m;
  }
  return lo;
}
/** Face-screen cavity: ~79 % of the body width, centred a little above the body centre (sheet front view). */
const WINDOW = { a: 0.79, b: 0.48, n: 3.0, cy: 0.12, zMin: 0.3 };
function bodySurfaceZ(x: number, y: number) {
  const t = 1 - Math.max(0, sp(x / BODY.sx) + sp(capY(y))) ** (BODY.m / BODY.n);
  return BODY.sz * Math.max(0, t) ** (1 / BODY.m);
}

function buildBodyGeometry(segW: number, segH: number) {
  const g = new THREE.SphereGeometry(1, segW, segH);
  const p = g.attributes.position as THREE.BufferAttribute;
  // push each unit-sphere vertex out along its direction onto the body surface
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = rayToBody(x, y, z);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  // hand-made look: low-frequency displacement along the normal
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nn.fromBufferAttribute(n, i);
    const d = noise3(v.x * 1.6 + 3, v.y * 1.6, v.z * 1.6) * 0.012 + noise3(v.x * 4, v.y * 4 + 7, v.z * 4) * 0.004;
    v.addScaledVector(nn, d);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // carve the front window (superellipse, so the edge is smooth once snapped)
  const inWin = (x: number, y: number) => (Math.abs(x) / WINDOW.a) ** WINDOW.n + (Math.abs(y - WINDOW.cy) / WINDOW.b) ** WINDOW.n;
  const index = g.index!.array;
  const keep: number[] = [];
  const removedVert = new Uint8Array(p.count), keptVert = new Uint8Array(p.count);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    const cx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3;
    const cy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3;
    const cz = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
    if (cz > WINDOW.zMin && inWin(cx, cy) < 1) {
      removedVert[a] = removedVert[b] = removedVert[c] = 1;
    } else {
      keep.push(a, b, c);
      keptVert[a] = keptVert[b] = keptVert[c] = 1;
    }
  }
  // snap boundary vertices onto the superellipse so the window edge is clean
  for (let i = 0; i < p.count; i++) {
    if (!(removedVert[i] && keptVert[i])) continue;
    const x = p.getX(i), y = p.getY(i);
    const d = inWin(x, y);
    const s = d > 0 ? d ** (-1 / WINDOW.n) : 1;
    const nx = x * s, ny = WINDOW.cy + (y - WINDOW.cy) * s;
    p.setXYZ(i, nx, ny, bodySurfaceZ(nx, ny));
  }
  g.setIndex(keep);
  g.computeVertexNormals();
  return g;
}

function windowCurve() {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 96; i++) {
    const [x, y0] = squircle((i / 96) * Math.PI * 2, WINDOW.a, WINDOW.b, WINDOW.n);
    const y = y0 + WINDOW.cy;
    pts.push(V(x, y, bodySurfaceZ(x, y) - 0.03));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}



function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One pass for the body shell: back faces get the darker inside cobalt via gl_FrontFacing. */
function insideTint(m: THREE.MeshPhysicalMaterial, _p: Part) {
  m.side = THREE.DoubleSide;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.insideColor = { value: new THREE.Color('#1a2aa8') };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 insideColor;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( gl_FrontFacing ? diffuse : insideColor, opacity );');
  };
  m.customProgramCacheKey = () => 'double-body-inside';
}

/** Point on the body ellipsoid's surface along a direction (used to seat parts flush). */
function onBody(x: number, y: number, z: number) {
  const k = rayToBody(x, y, z);
  return V(x * k, y * k, z * k);
}

/** Thick tapered tube along a curve with round end caps (antenna stems, pincer jaws). */
function tube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, seg = 40, rad = 18, zs = 1) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad);
  const p = g.attributes.position as THREE.BufferAttribute;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    curve.getPointAt(u, c);
    const r = r0 + (r1 - r0) * Math.pow(u, 1.2);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r);
      p.setXYZ(k, c.x + v.x, c.y + v.y, c.z + v.z * zs);
    }
  }
  g.computeVertexNormals();
  const a = new THREE.SphereGeometry(r0, 18, 12); a.scale(1, 1, zs);
  const pa = curve.getPointAt(0); a.translate(pa.x, pa.y, pa.z);
  const b = new THREE.SphereGeometry(r1, 18, 12); b.scale(1, 1, zs);
  const pb = curve.getPointAt(1); b.translate(pb.x, pb.y, pb.z);
  return merge([g, a, b]);
}

/** Arc of points around (cx, cy) from fromDeg to toDeg. */
function arc(cx: number, cy: number, R: number, fromDeg: number, toDeg: number, n = 14) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / n) * Math.PI) / 180;
    pts.push(V(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0));
  }
  return new THREE.CatmullRomCurve3(pts);
}

// ---------------------------------------------------------------- build

export interface BuildOptions { lowDetail?: boolean }

export function buildProcedural(mats: Materials, face: Face, opts: BuildOptions = {}): Rig {
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const root = new THREE.Group();
  root.name = 'double';
  const model = new THREE.Group();
  root.add(model);
  const parts = {} as Record<PartId, Part>;

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, name?: string) => {
    keep(geo);
    const m = new THREE.Mesh(geo, mat);
    if (name) m.name = name;
    return m;
  };

  function addPart(id: PartId, obj: THREE.Object3D, rest: THREE.Vector3, anchor: THREE.Vector3, restRot = V()) {
    obj.name = id;
    obj.position.copy(rest);
    obj.rotation.set(restRot.x, restRot.y, restRot.z);
    const a = new THREE.Object3D();
    a.name = `${id}_anchor`;
    a.position.copy(anchor);
    obj.add(a);
    // clone materials per part so dimming is independent
    const materials: THREE.Material[] = [];
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const src = m.material as THREE.Material;
      const c = src.clone();
      c.userData.baseOpacity = src.opacity;
      c.userData.baseTransparent = src.transparent;
      m.material = c;
      materials.push(c);
      disposables.push(c);
    });
    model.add(obj);
    parts[id] = { id, object: obj, anchor: a, materials,
      rest: { pos: obj.position.clone(), rot: obj.rotation.clone(), scale: obj.scale.clone() } };
    return parts[id];
  }

  const seg = opts.lowDetail ? [48, 32] : [80, 56];
  const felt4 = mats.felt(4), felt2 = mats.felt(2), lime = mats.lime(2);

  // ------------------------------------------------ body: main shell with the face-screen cavity
  {
    const g = new THREE.Group();
    const shell = buildBodyGeometry(seg[0], seg[1]);
    const rim = new THREE.TubeGeometry(windowCurve(), 140, 0.045, 12, true);
    g.add(mesh(merge([shell, rim]), felt4, 'body_outer'));
    const bp = addPart('body', g, V(0, 0, 0), V(0.62, 0.62, 0.42));
    insideTint((g.getObjectByName('body_outer') as THREE.Mesh).material as THREE.MeshPhysicalMaterial, bp);
  }

  // ------------------------------------------------ face screen: inset rounded black box + pixel face
  {
    const g = new THREE.Group();
    const slab = squircleSlab({ a: 0.78, b: 0.47, n: 3.2, depth: 0.12, bevel: 0.05, rx: 1.0, ry: 1.05 });
    slab.translate(0, 0, -0.04);
    g.add(mesh(slab, mats.glass, 'screen_glass'));
    // face plane aspect = face grid window aspect (26 × 16 cells, see face.ts)
    const facePlane = squircleSlab({ a: 0.7, b: 0.431, n: 4, depth: 0, bevel: 0, rx: 1.0, ry: 1.05, frontOnly: true, rings: 6 });
    facePlane.translate(0, 0, 0.024);
    const faceMat = new THREE.MeshBasicMaterial({
      map: face.texture, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false, depthWrite: false,
    });
    const faceMesh = mesh(facePlane, faceMat, 'screen_face');
    faceMesh.renderOrder = 2;
    g.add(faceMesh);
    addPart('screen', g, V(0, WINDOW.cy, 0.8), V(-0.66, 0.2, 0.0));
    (g.userData as { faceMesh: THREE.Mesh }).faceMesh = faceMesh;
  }

  // ------------------------------------------------ speaker: driver behind the face screen (the voice)
  {
    const g = new THREE.Group();
    const basket = new THREE.CylinderGeometry(0.2, 0.15, 0.08, 40);
    basket.rotateX(Math.PI / 2);
    const magnet = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 28);
    magnet.rotateX(Math.PI / 2);
    magnet.translate(0, 0, -0.08);
    g.add(mesh(merge([basket, magnet]), mats.chip, 'speaker_body'));
    const cone = new THREE.CylinderGeometry(0.17, 0.06, 0.05, 40, 1, true);
    cone.rotateX(-Math.PI / 2);
    cone.translate(0, 0, 0.05);
    const surround = new THREE.TorusGeometry(0.18, 0.018, 10, 48);
    surround.translate(0, 0, 0.045);
    const cap = new THREE.SphereGeometry(0.055, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.rotateX(Math.PI / 2);
    cap.translate(0, 0, 0.03);
    g.add(mesh(merge([cone, surround, cap]), mats.plastic, 'speaker_cone'));
    addPart('speaker', g, V(-0.3, -0.12, 0.56), V(-0.16, 0.12, 0.04));
  }

  // ------------------------------------------------ chassis: main board (PCB) with chips and glowing traces
  let chipsMat!: THREE.MeshStandardMaterial;
  {
    const g = new THREE.Group();
    const seed = { s: 11 };
    const rnd = () => (seed.s = (seed.s * 16807) % 2147483647) / 2147483647;
    const traces: [number, number][][] = [];
    for (let i = 0; i < 46; i++) {
      let x = Math.floor(rnd() * 16) * 16 + 8, y = Math.floor(rnd() * 16) * 16 + 8;
      const path: [number, number][] = [[x, y]];
      for (let k = 0; k < 4; k++) {
        const len = (1 + Math.floor(rnd() * 4)) * 16;
        const dir = Math.floor(rnd() * 4);
        if (dir === 0) x += len; else if (dir === 1) x -= len; else if (dir === 2) y += len; else y -= len;
        x = Math.max(6, Math.min(250, x)); y = Math.max(6, Math.min(250, y));
        path.push([x, y]);
      }
      traces.push(path);
    }
    const drawTraces = (gc: CanvasRenderingContext2D, color: string) => {
      gc.strokeStyle = color; gc.fillStyle = color; gc.lineWidth = 2.2; gc.lineJoin = 'round';
      for (const p of traces) {
        gc.beginPath(); p.forEach(([x, y], i) => (i ? gc.lineTo(x, y) : gc.moveTo(x, y))); gc.stroke();
        for (const [x, y] of [p[0], p[p.length - 1]]) { gc.beginPath(); gc.arc(x, y, 3.4, 0, 7); gc.fill(); }
      }
    };
    const map = keep(canvasTex(256, 256, (gc) => {
      gc.fillStyle = '#1b1e26'; gc.fillRect(0, 0, 256, 256);
      drawTraces(gc, '#6b5a3a');
      gc.strokeStyle = '#2c303b'; gc.lineWidth = 6; gc.strokeRect(3, 3, 250, 250);
    }));
    const emissive = keep(canvasTex(256, 256, (gc) => {
      gc.fillStyle = '#000'; gc.fillRect(0, 0, 256, 256);
      drawTraces(gc, '#ffffff');
    }));
    chipsMat = keep(new THREE.MeshStandardMaterial({
      color: '#ffffff', map, roughness: 0.5, metalness: 0.1,
      emissive: '#7d8dff', emissiveMap: emissive, emissiveIntensity: 0,
    }));
    g.add(mesh(new THREE.BoxGeometry(0.72, 0.48, 0.03), chipsMat, 'chassis_board'));
    const chips: THREE.BufferGeometry[] = [];
    const chipDefs = [[-0.2, 0.09, 0.18, 0.14], [0.05, 0.11, 0.12, 0.12], [0.22, 0.12, 0.09, 0.07], [-0.23, -0.12, 0.12, 0.08],
      [0.0, -0.1, 0.16, 0.09], [0.23, -0.12, 0.07, 0.07], [0.19, 0.0, 0.06, 0.05]];
    for (const [x, y, w, h] of chipDefs) {
      const c = new THREE.BoxGeometry(w, h, 0.025);
      c.translate(x, y, 0.028);
      chips.push(c);
    }
    g.add(mesh(merge(chips), mats.chip, 'chassis_chips'));
    const can = new THREE.CylinderGeometry(0.04, 0.04, 0.07, 18);
    can.rotateX(Math.PI / 2);
    can.translate(-0.06, 0.14, 0.05);
    g.add(mesh(can, mats.metal, 'chassis_can'));
    const jst = new THREE.BoxGeometry(0.15, 0.05, 0.05);
    jst.translate(0.22, -0.2, 0.035);
    g.add(mesh(jst, mats.plastic, 'chassis_jst'));
    addPart('chassis', g, V(0.05, 0.04, 0.4), V(-0.3, 0.06, 0.03));
  }

  // ------------------------------------------------ memory: knowledge module (stick with flash chips + gold contacts)
  {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.16, 0.022), mats.pcb, 'memory_board'));
    const chips: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.BoxGeometry(0.09, 0.1, 0.018);
      c.translate(-0.17 + i * 0.11, 0.01, 0.02);
      chips.push(c);
    }
    g.add(mesh(merge(chips), mats.chip, 'memory_chips'));
    const pins: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      const p = new THREE.BoxGeometry(0.018, 0.035, 0.024);
      p.translate(-0.2 + i * 0.036, -0.06, 0);
      pins.push(p);
    }
    g.add(mesh(merge(pins), mats.gold, 'memory_pins'));
    addPart('memory', g, V(0.18, -0.36, 0.3), V(0.22, 0.05, 0.02), V(0, -0.3, 0));
  }

  // ------------------------------------------------ harness: vertex-coloured wires + travelling pulse
  let wireMat!: THREE.MeshStandardMaterial;
  let wireMap!: THREE.CanvasTexture;
  {
    const g = new THREE.Group();
    wireMap = keep(canvasTex(256, 4, (gc) => {
      const grad = gc.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0, '#000'); grad.addColorStop(0.42, '#000'); grad.addColorStop(0.5, '#fff');
      grad.addColorStop(0.58, '#000'); grad.addColorStop(1, '#000');
      gc.fillStyle = grad; gc.fillRect(0, 0, 256, 4);
    }));
    wireMap.wrapS = THREE.RepeatWrapping;
    wireMap.repeat.set(2, 1);
    wireMat = keep(new THREE.MeshStandardMaterial({
      color: '#ffffff', vertexColors: true, roughness: 0.45,
      emissive: '#ffd2a0', emissiveMap: wireMap, emissiveIntensity: 0,
    }));
    const colors = ['#ff7417', '#e23b2e', '#5a3a22', '#ff7417'];
    const wires: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const o = (i - 1.5) * 0.03;
      const curve = new THREE.CatmullRomCurve3([
        V(0.06 + o, -0.06, 0.12), V(0.02 + o, -0.16, 0.06), V(-0.08 + o * 2, -0.18, -0.12),
        V(-0.22 + o, -0.06, -0.26), V(-0.3 + o, 0.08, -0.34)]);
      const t = new THREE.TubeGeometry(curve, 40, 0.014, 6);
      const c = new THREE.Color(colors[i]).convertSRGBToLinear();
      const n = t.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
      t.setAttribute('color', new THREE.BufferAttribute(col, 3));
      wires.push(t);
    }
    g.add(mesh(merge(wires, true), wireMat, 'harness_wires'));
    const a = new THREE.BoxGeometry(0.15, 0.05, 0.05);
    a.translate(0.04, -0.04, 0.13);
    const b = new THREE.BoxGeometry(0.15, 0.05, 0.05);
    b.rotateY(0.6);
    b.translate(-0.3, 0.09, -0.36);
    g.add(mesh(merge([a, b]), mats.plastic, 'harness_connectors'));
    addPart('harness', g, V(0.3, -0.12, 0.28), V(-0.06, -0.17, 0.0));
  }

  // ------------------------------------------------ left antenna: short blue stem leaning forward-left + big lime ball
  const springStem = new THREE.Group();
  // measured on reference/double-front-hero.png: stem leaves the top at x −0.12, the ball (r 0.29) sits
  // at x −0.29, y 1.36, a little forward; only a short piece of stem shows between them
  const STEM_BASE = onBody(-0.12, 0.95, 0.16);
  const TIP_AT = V(-0.29, 1.33, 0.24);
  const STEM_DIR = TIP_AT.clone().sub(STEM_BASE).normalize();
  const TIP_DIST = TIP_AT.distanceTo(STEM_BASE);
  {
    const base = STEM_BASE;
    const g = new THREE.Group();
    const stem = tube(new THREE.LineCurve3(STEM_DIR.clone().multiplyScalar(-0.08), STEM_DIR.clone().multiplyScalar(TIP_DIST - 0.2)), 0.078, 0.074, 8, 20);
    springStem.add(mesh(stem, felt2, 'stem_mesh'));
    g.add(springStem);
    addPart('stemL', g, base, V(-0.08, 0.16, 0.04));
    const t = new THREE.Group();
    const ball = new THREE.SphereGeometry(0.29, 36, 24);
    ball.scale(1, 0.96, 1);
    t.add(mesh(ball, lime, 'tip_mesh'));
    addPart('tipL', t, TIP_AT.clone(), V(-0.21, 0.13, 0.08));
  }

  // ------------------------------------------------ right antenna: blue hooked stem with a round tip
  const springHook = new THREE.Group();
  {
    // measured on reference/double-front-hero.png: base at x +0.19 (gap ≈ 0.31 to the lime stem),
    // rises only ~0.3, arches over to the right (outer edge x ≈ 0.56) and bends back down so the
    // tip ends at x ≈ 0.49, y ≈ 1.06, below the lime ball; it also curls slightly backward
    const base = onBody(0.19, 0.95, -0.04);
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      V(0, -0.08, 0), V(0.005, 0.09, -0.005), V(0.027, 0.21, -0.02), V(0.09, 0.31, -0.05),
      V(0.18, 0.34, -0.08), V(0.27, 0.31, -0.11), V(0.315, 0.23, -0.13), V(0.3, 0.13, -0.14)]);
    springHook.add(mesh(tube(curve, 0.095, 0.108, 64, 18), felt2, 'hook_mesh'));
    g.add(springHook);
    addPart('hook', g, base, V(0.2, 0.36, -0.1));
  }

  // ------------------------------------------------ side sensory patches: raised lime discs
  for (const side of [-1, 1] as const) {
    const g = new THREE.Group();
    // raised lens-shaped dome, about 0.16 proud of the body (sheet: "side-mounted disc, slightly raised")
    const disc = new THREE.SphereGeometry(0.3, 40, 24);
    disc.scale(0.95, 0.95, 0.7);
    disc.rotateY(side * Math.PI / 2);
    g.add(mesh(disc, lime, 'patch_mesh'));
    addPart(side < 0 ? 'patchL' : 'patchR', g, onBody(side, 0.04, 0.24), V(side * 0.14, 0.24, 0), V(0, -side * 0.12, 0));
  }

  // ------------------------------------------------ arm roots: short felt cuff where the claw meets the body
  for (const side of [-1, 1] as const) {
    const g = new THREE.Group();
    const cuff = new THREE.CapsuleGeometry(0.135, 0.08, 8, 24);
    cuff.rotateZ(Math.PI / 2);
    cuff.rotateY(-side * 0.5);
    g.add(mesh(cuff, felt2, 'arm_mesh'));
    addPart(side < 0 ? 'armL' : 'armR', g, V(side * 0.92, -0.36, 0.28), V(side * 0.1, 0.12, 0.08));
  }

  // ------------------------------------------------ pincer claws (reference/double-turnaround.webp)
  // A fat outer finger arches up and out from the cuff, then curls down to a rounded tip; a shorter
  // inner finger points straight down beside it. The mouth opens DOWN, and the C's plane faces ~45°
  // between front and side, so it reads as a C in both the front and the side views.
  // Claw space: palm at the origin, +x = mouth (down), +y = the outer finger's side (out + forward).
  const jaws = {} as Rig['jaws'];
  // mouth points down and a little forward; the outer finger sits out, up and forward of it
  const mouthDir = V(0, -0.75, 0.66).normalize();
  const outer = V(0.7, 0.46, 0.53);
  outer.addScaledVector(mouthDir, -outer.dot(mouthDir)).normalize();
  const clawBasis = new THREE.Matrix4().makeBasis(mouthDir, outer, mouthDir.clone().cross(outer));
  for (const side of [-1, 1] as const) {
    const g = new THREE.Group();
    const mirror = new THREE.Group();
    mirror.scale.set(side, 1, 1);
    const shape = new THREE.Group();
    shape.quaternion.setFromRotationMatrix(clawBasis);
    const zs = 0.92;
    const palm = new THREE.SphereGeometry(0.18, 24, 16);
    palm.scale(1, 1.05, zs);
    shape.add(mesh(palm, felt2, 'claw_palm'));
    // fingers hinge at the palm
    const upper = new THREE.Group();
    upper.add(mesh(tube(arc(0.15, 0.1, 0.22, 205, 18, 16), 0.19, 0.11, 44, 18, zs), felt2, 'claw_upper'));
    const lower = new THREE.Group();
    lower.add(mesh(tube(new THREE.CatmullRomCurve3([V(0.02, -0.04, 0), V(0.14, -0.09, 0), V(0.25, -0.1, 0), V(0.32, -0.07, 0)]), 0.15, 0.095, 32, 16, zs), felt2, 'claw_lower'));
    shape.add(upper, lower);
    mirror.add(shape);
    g.add(mirror);
    jaws[side < 0 ? 'L' : 'R'] = { upper, lower };
    addPart(side < 0 ? 'clawL' : 'clawR', g, V(side * 1.05, -0.33, 0.34), V(side * 0.2, 0.18, 0.1));
  }

  // ------------------------------------------------ feet: short rounded capsules under the body
  for (const side of [-1, 1] as const) {
    const g = new THREE.Group();
    // short, wide, rounded capsules under the body centre (sheet: "no separate hip pieces")
    const foot = new THREE.CapsuleGeometry(0.135, 0.36, 10, 24);
    foot.rotateX(Math.PI / 2);
    foot.scale(1.65, 1.05, 1);
    g.add(mesh(foot, felt2, 'foot_mesh'));
    addPart(side < 0 ? 'footL' : 'footR', g, V(side * 0.38, -1.06, 0.1), V(side * 0.18, -0.02, 0.25));
  }

  // ------------------------------------------------ screws (one InstancedMesh, each follows a parent part)
  const follow: Rig['screws']['follow'] = [];
  let screwsMesh!: THREE.InstancedMesh;
  {
    const head = new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14);
    head.translate(0, 0.07, 0);
    const shaft = new THREE.CylinderGeometry(0.014, 0.014, 0.14, 8);
    const geo = merge([head, shaft]);
    const add = (part: PartId, pos: THREE.Vector3, axis: THREE.Vector3) => {
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis.clone().normalize());
      follow.push({ part, local: new THREE.Matrix4().compose(pos, q, V(1, 1, 1)), axis: axis.clone().normalize() });
    };
    for (const [x, y] of [[-0.31, 0.2], [0.31, 0.2], [-0.31, -0.2], [0.31, -0.2]]) add('chassis', V(x, y, 0.02), V(0, 0, 1));
    for (const side of [-1, 1] as const) {
      add(side < 0 ? 'armL' : 'armR', V(side * 0.12, 0.06, 0.08), V(side, 0.3, 0.2));
      add(side < 0 ? 'footL' : 'footR', V(0, 0.12, 0), V(0, 1, 0));
    }
    add('stemL', V(0, -0.06, 0), V(0, -1, 0));
    add('hook', V(0, -0.06, 0), V(0, -1, 0));
    add('screen', V(-0.48, -0.26, -0.1), V(0, 0, -1));
    add('screen', V(0.48, 0.26, -0.1), V(0, 0, -1));
    const inst = new THREE.InstancedMesh(keep(geo), mats.metal.clone(), follow.length);
    keep(inst.material as THREE.Material);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inst.frustumCulled = false;
    const g = new THREE.Group();
    g.add(inst);
    addPart('screws', g, V(0, 0, 0), V(0, 0, 0));
    // addPart cloned the instanced material: keep the mesh and the part pointing at the same one
    inst.material = parts.screws.materials[0] as THREE.MeshStandardMaterial;
    screwsMesh = inst;
  }

  // ------------------------------------------------ contact shadow blob
  const shadowTex = keep(canvasTex(128, 128, (gc) => {
    const r = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(13,16,63,0.55)');
    r.addColorStop(0.45, 'rgba(13,16,63,0.22)');
    r.addColorStop(1, 'rgba(13,16,63,0)');
    gc.fillStyle = r; gc.fillRect(0, 0, 128, 128);
  }));
  const shadow = mesh(new THREE.PlaneGeometry(2.6, 1.7), new THREE.MeshBasicMaterial({
    map: shadowTex, transparent: true, depthWrite: false, toneMapped: false,
  }), 'shadow');
  keep(shadow.material as THREE.Material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.2;
  shadow.renderOrder = -1;
  root.add(shadow);

  // glow materials were cloned per part: point the rig at the clones
  const matOf = <T extends THREE.Material>(id: PartId, name: string) =>
    (parts[id].object.getObjectByName(name) as THREE.Mesh).material as T;
  chipsMat = matOf<THREE.MeshStandardMaterial>('chassis', 'chassis_board');
  wireMat = matOf<THREE.MeshStandardMaterial>('harness', 'harness_wires');

  return {
    root, model, parts, jaws,
    screws: { mesh: screwsMesh, follow },
    springs: { stem: springStem, hook: springHook },
    glow: { chips: chipsMat, wires: wireMat, wireMap },
    shadow,
    faceMesh: (parts.screen.object.userData as { faceMesh: THREE.Mesh }).faceMesh,
    dispose() { disposables.forEach((d) => d.dispose()); },
  };
}
