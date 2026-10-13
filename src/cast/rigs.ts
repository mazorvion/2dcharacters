import { HIM } from './art/him/rig.ts';
import { HER } from './art/her/rig.ts';
import type { CharId, Rig } from './types.ts';

export const RIGS: Record<CharId, Rig> = { him: HIM, her: HER };
