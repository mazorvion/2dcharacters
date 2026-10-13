// Felt, lime felt, screen glass, PCB and metal (PLAN.md §5.3).
// The felt normal map is generated procedurally (tileable, 256²) so the scene ships 0 KB of textures.
import * as THREE from 'three';

function hash(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Tileable felt height field → normal map. Fibres are short random strokes plus fine fuzz. */
export function makeFeltNormal(size = 256): THREE.DataTexture {
  const h = new Float32Array(size * size);
  // fine fuzz: 2 octaves of tileable value noise
  const vnoise = (x: number, y: number, period: number, seed: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const g = (a: number, b: number) => hash(((a % period) + period) % period, ((b % period) + period) % period, seed);
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size), v = (y / size);
      h[y * size + x] =
        vnoise(u * 32, v * 32, 32, 1) * 0.5 +
        vnoise(u * 64, v * 64, 64, 2) * 0.35 +
        vnoise(u * 12, v * 12, 12, 3) * 0.6;
    }
  // fibres: short curved strokes, wrapped
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    let x = rnd() * size, y = rnd() * size;
    let a = rnd() * Math.PI * 2;
    const len = 6 + rnd() * 16, amp = 0.25 + rnd() * 0.35;
    for (let t = 0; t < len; t++) {
      a += (rnd() - 0.5) * 0.5;
      x += Math.cos(a); y += Math.sin(a);
      const xi = ((Math.round(x) % size) + size) % size, yi = ((Math.round(y) % size) + size) % size;
      h[yi * size + xi] += amp;
    }
  }
  const data = new Uint8Array(size * size * 4);
  const s = 2.2;
  const at = (x: number, y: number) => h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * s;
      const dy = (at(x, y + 1) - at(x, y - 1)) * s;
      const n = new THREE.Vector3(-dx, -dy, 1).normalize();
      const i = (y * size + x) * 4;
      data[i] = (n.x * 0.5 + 0.5) * 255;
      data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export interface Materials {
  felt(repeat: number): THREE.MeshPhysicalMaterial;
  lime(repeat: number): THREE.MeshPhysicalMaterial;
  feltInside: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  cover: THREE.MeshPhysicalMaterial;
  pcb: THREE.MeshStandardMaterial;
  chip: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  dispose(): void;
}

export function createMaterials(): Materials {
  const normal = makeFeltNormal(256);
  const textures: THREE.Texture[] = [normal];
  const all: THREE.Material[] = [];
  const track = <T extends THREE.Material>(m: T) => (all.push(m), m);

  const feltCache = new Map<string, THREE.MeshPhysicalMaterial>();
  const feltOf = (kind: 'blue' | 'lime', repeat: number) => {
    const key = `${kind}${repeat}`;
    let m = feltCache.get(key);
    if (m) return m;
    const tex = normal.clone();
    tex.repeat.set(repeat, repeat);
    tex.needsUpdate = true;
    textures.push(tex);
    m = track(new THREE.MeshPhysicalMaterial({
      // matched to reference/double-construction-sheet.webp (royal blue felt, deep lime)
      color: kind === 'blue' ? '#0a46e8' : '#a6cf16',
      roughness: 0.92,
      sheen: kind === 'blue' ? 0.7 : 1,
      sheenRoughness: 0.75,
      sheenColor: kind === 'blue' ? '#4a8cff' : '#d6ef6a',
      normalMap: tex,
      normalScale: new THREE.Vector2(0.4, 0.4),
    }));
    feltCache.set(key, m);
    return m;
  };

  const mats: Materials = {
    felt: (r) => feltOf('blue', r),
    lime: (r) => feltOf('lime', r),
    feltInside: track(new THREE.MeshPhysicalMaterial({
      color: '#1a2aa8', roughness: 0.95, sheen: 0.6, sheenColor: '#4a5bd8', sheenRoughness: 0.8,
      side: THREE.BackSide,
    })),
    glass: track(new THREE.MeshPhysicalMaterial({
      color: '#08090d', roughness: 0.72, clearcoat: 0.15, clearcoatRoughness: 0.7, metalness: 0, envMapIntensity: 0.35,
    })),
    cover: track(new THREE.MeshPhysicalMaterial({
      color: '#101116', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3,
    })),
    pcb: track(new THREE.MeshStandardMaterial({ color: '#1b1e26', roughness: 0.5 })),
    chip: track(new THREE.MeshStandardMaterial({ color: '#0f1115', roughness: 0.4 })),
    metal: track(new THREE.MeshStandardMaterial({ color: '#c9ccd3', metalness: 1, roughness: 0.32 })),
    plastic: track(new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.55 })),
    gold: track(new THREE.MeshStandardMaterial({ color: '#d8a948', metalness: 1, roughness: 0.3 })),
    dark: track(new THREE.MeshStandardMaterial({ color: '#0d1030', roughness: 0.9 })),
    textures,
    dispose() {
      all.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
  return mats;
}
