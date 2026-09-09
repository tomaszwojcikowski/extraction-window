import { describe, expect, it } from 'vitest';
import { ITEMS, type ItemKind } from '../../src/data/items';
import { lootStampFor } from '../../src/game/presenters/itemTexture';
import { createLoot } from '../../src/v2/lootMesh';

describe('v2 loot rigs', () => {
  it('builds a bob group for every stamp family', () => {
    const seen = new Set<string>();
    for (const kind of Object.keys(ITEMS) as ItemKind[]) {
      const stamp = lootStampFor(kind);
      if (seen.has(stamp)) continue;
      seen.add(stamp);
      const rig = createLoot(kind);
      expect(rig.getObjectByName('bob'), stamp).toBeTruthy();
      expect(rig.userData.stamp).toBe(stamp);
    }
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });
});
