// Device tier detection (PLAN.md §6.2).
import { flags } from './flags';

export type Tier = 'low' | 'mid' | 'high';
export interface TierConfig { tier: Tier; dprCap: number; antialias: boolean; lowDetail: boolean; pointerLook: boolean; halo: boolean }

export function detectTier(gl?: WebGLRenderingContext | WebGL2RenderingContext | null): Tier {
  if (flags.tier) return flags.tier;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const saveData = !!nav.connection?.saveData;
  const smallIphone = /iPhone/.test(nav.userAgent) && screen.width <= 375;
  if (mem <= 4 || cores <= 4 || saveData || smallIphone) return 'low';
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse) return 'mid';
  if (gl) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/nvidia|geforce|radeon|rtx|gtx|apple m\d|apple gpu/i.test(r) && !/intel/i.test(r)) return 'high';
    if (!r) return 'high';
    return 'mid';
  }
  return 'mid';
}

export function tierConfig(tier: Tier): TierConfig {
  switch (tier) {
    case 'low': return { tier, dprCap: 1, antialias: false, lowDetail: true, pointerLook: false, halo: false };
    case 'mid': return { tier, dprCap: 1.5, antialias: true, lowDetail: false, pointerLook: true, halo: true };
    case 'high': return { tier, dprCap: 2, antialias: true, lowDetail: false, pointerLook: true, halo: true };
  }
}

export const lowerTier = (t: Tier): Tier => (t === 'high' ? 'mid' : 'low');
