import { describe, expect, it } from 'vitest';
import {
  canSpendPower,
  spendPower,
  taxPower,
  POWER_TAX_HEAVY,
  KIT_POWER_COST,
} from '../../src/sim/bus';
import { createGame } from '../../src/sim';
import { useSelected } from '../../src/sim/inventory';

describe('Power helpers', () => {
  it('canSpendPower gates kit spends', () => {
    const st = createGame(1);
    st.player.energy = 2;
    expect(canSpendPower(st, KIT_POWER_COST.probe)).toBe(false);
    expect(canSpendPower(st, KIT_POWER_COST.filter)).toBe(true);
  });

  it('spendPower deducts and logs', () => {
    const st = createGame(1);
    st.player.energy = 20;
    expect(spendPower(st, 3, 'LOG-USE-PROBE')).toBe(true);
    expect(st.player.energy).toBe(17);
    expect(st.log.some((e) => e.loreId === 'LOG-USE-PROBE')).toBe(true);
  });

  it('taxPower always applies mandatory costs', () => {
    const st = createGame(1);
    st.player.energy = 4;
    taxPower(st, POWER_TAX_HEAVY, 'LOG-PAY-PRICE');
    expect(st.player.energy).toBe(0);
    expect(st.log.some((e) => e.loreId === 'LOG-PAY-PRICE')).toBe(true);
  });
});

describe('kit Power costs', () => {
  it('probe costs 3 Power', () => {
    const st = createGame(1);
    st.player.energy = 10;
    st.inventory = [{ kind: 'probe', count: 1 }];
    st.ui.selectedSlot = 0;
    expect(useSelected(st)).toBe(true);
    expect(st.player.energy).toBe(7);
    expect(st.player.probeTurns).toBeGreaterThan(0);
  });

  it('refuses probe when Power is too low', () => {
    const st = createGame(1);
    st.player.energy = 2;
    st.inventory = [{ kind: 'probe', count: 1 }];
    st.ui.selectedSlot = 0;
    expect(useSelected(st)).toBe(false);
    expect(st.inventory.some((s) => s.kind === 'probe')).toBe(true);
  });
});
