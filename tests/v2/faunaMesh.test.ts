import { describe, expect, it } from 'vitest';
import { ENEMIES, type EnemyKind } from '../../src/data/enemies';
import { silhouetteFor } from '../../src/art/silhouette';
import { createFauna, poseFauna } from '../../src/v2/faunaMesh';

describe('v2 fauna rigs', () => {
  it('builds a bob group for every hostile kind from silhouetteFor', () => {
    const kinds = Object.keys(ENEMIES) as EnemyKind[];
    expect(kinds.length).toBeGreaterThan(10);
    for (const kind of kinds) {
      const rig = createFauna(kind, 'normal');
      expect(rig.getObjectByName('bob'), kind).toBeTruthy();
      expect(rig.userData.silhouette).toBe(silhouetteFor(kind));
    }
  });

  it('swings opposite hips on a scuttler stride', () => {
    const rig = createFauna('mite', 'normal');
    poseFauna(rig, 0, 0.5, 1, false);
    const hipL = rig.getObjectByName('hipL')!.rotation.x;
    const hipR = rig.getObjectByName('hipR')!.rotation.x;
    expect(hipL).toBeGreaterThan(0.3);
    expect(hipR).toBe(-hipL);
    poseFauna(rig, 0, null, 1, false);
    expect(rig.getObjectByName('hipL')!.rotation.x).toBe(0);
  });

  it('crowns branded elites without changing the body plan', () => {
    const normal = createFauna('wasp', 'normal');
    const elite = createFauna('elite_skirmisher', 'elite');
    expect(normal.userData.silhouette).toBe(elite.userData.silhouette);
    expect(elite.getObjectByName('crown')).toBeTruthy();
    expect(normal.getObjectByName('crown')).toBeFalsy();
    expect(elite.scale.x).toBeGreaterThan(normal.scale.x);
  });
});
