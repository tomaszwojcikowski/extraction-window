import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { applyAction, createGame, tryEquipItem } from '../../src/sim';
import { killEnemy } from '../../src/sim/death';
import { makeEnemy } from '../sim/fixtures';
import { slotTag, wornTagMax, wornTagSum } from '../../src/sim/equipTags';
import { addPlayerStatus } from '../../src/sim/status';
import { effectiveAggro } from '../../src/sim/notice';
import { addLightSource } from '../../src/sim/light';

describe('branded wearables — tag lookup', () => {
  it('ward_weave stacks ion reduction via wornTagSum', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'ward_weave', count: 1 }];
    tryEquipItem(st, 'ward_weave');
    expect(wornTagSum(st, 'ionDamageReduction')).toBe(2);
    expect(st.player.maxArmor).toBeGreaterThan(12);
  });

  it('flare_prism reduces flare power tag', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'flare_prism', count: 1 }];
    tryEquipItem(st, 'flare_prism');
    expect(wornTagMax(st, 'flarePowerReduction')).toBe(1);
    expect(wornTagMax(st, 'shadowFlareMarkBonus')).toBe(1);
  });
});

describe('branded wearables — sim hooks', () => {
  it('shadow_lens lengthens blind/jam on lit tiles', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'shadow_lens', count: 1 }];
    tryEquipItem(st, 'shadow_lens');
    addLightSource(st, {
      x: st.player.x,
      y: st.player.y,
      radius: 4,
      intensity: 1,
      life: 5,
    });
    addPlayerStatus(st, 'jam', 2);
    expect(st.player.statuses.jam).toBe(3);
  });

  it('survey_visor still softens jam via head slot tag', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'survey_visor', count: 1 }];
    tryEquipItem(st, 'survey_visor');
    addPlayerStatus(st, 'jam', 3);
    expect(st.player.statuses.jam).toBe(2);
    expect(slotTag(st, 'head', 'statusTurnReduction')).toBe(1);
  });

  it('shadow_lens shrinks dark-prefer aggro in shadow', () => {
    const st = createGame(42);
    st.illumination[st.player.y]![st.player.x] = 0;
    const hunter = makeEnemy({
      id: 1,
      kind: 'stalker',
      x: st.player.x + 3,
      y: st.player.y,
    });
    st.enemies = [hunter];
    st.player.equip.head = null;
    const without = effectiveAggro(st, hunter);
    st.player.equip.head = 'shadow_lens';
    const withLens = effectiveAggro(st, hunter);
    expect(withLens).toBeLessThan(without);
  });
});

describe('branded wearables — elite drops', () => {
  it('elite kill force-drops flare prism', () => {
    const st = createGame(42);
    const elite = makeEnemy({ id: 1, kind: 'elite_skirmisher', x: 5, y: 5, tier: 'elite' });
    st.enemies = [elite];
    killEnemy(st, elite);
    expect(st.items.some((i) => i.kind === 'flare_prism')).toBe(true);
    expect(ENEMIES.elite_skirmisher.brandDrop).toBe('flare_prism');
  });
});

describe('branded wearables — equip toggle', () => {
  it('equips ward weave on suit slot', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'ward_weave', count: 1 }];
    applyAction(st, { type: 'use' });
    expect(st.player.equip.suit).toBe('ward_weave');
  });
});
