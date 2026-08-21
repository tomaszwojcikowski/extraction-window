import { ENEMIES, type EnemyKind } from '../data/enemies';

export type Silhouette =
  | 'scuttler'
  | 'crawler_body'
  | 'spore_body'
  | 'bloom'
  | 'darter'
  | 'crouched'
  | 'annelid'
  | 'bulwark'
  | 'turret'
  | 'emitter'
  | 'chassis'
  | 'coil'
  | 'reacher'
  | 'aperture';

export function silhouetteFor(kind: EnemyKind): Silhouette {
  const def = ENEMIES[kind];
  if (def.silhouette) return def.silhouette as Silhouette;
  switch (def.behavior) {
    case 'wander':
      return 'scuttler';
    case 'swell':
      return 'bloom';
    case 'skirmish':
      return 'darter';
    case 'ambush':
      return 'crouched';
    case 'drain':
      return 'annelid';
    case 'guard':
      return 'bulwark';
    case 'sentinel':
      if (def.overwatch) return 'turret';
      if (def.beam) return 'emitter';
      return 'chassis';
    case 'hunter':
      if (def.hunt === 'reach') return 'reacher';
      if (def.hunt === 'zone') return 'aperture';
      return 'coil';
  }
}

export const HOVER_SHAPES = new Set<Silhouette>([
  'darter',
  'reacher',
  'aperture',
  'bloom',
  'emitter',
  'spore_body',
]);
