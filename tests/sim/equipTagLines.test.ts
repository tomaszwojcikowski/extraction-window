import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { equipTagLines, hasWornLoadout, netLoadoutTagSummary } from '../../src/sim/equipTagLines';
import { combatArena } from './fixtures';

describe('equipTagLines', () => {
  it('lists ablative vest ion reduction', () => {
    const lines = equipTagLines('ablative_vest');
    expect(lines.some((l) => l.includes(lore('UI-TAG-ION-RED').replace(/\d+$/, '')))).toBe(true);
  });

  it('net loadout summary sums worn tags', () => {
    const st = combatArena();
    st.player.equip.suit = 'ablative_vest';
    expect(hasWornLoadout(st)).toBe(true);
    expect(netLoadoutTagSummary(st).length).toBeGreaterThan(0);
  });
});
