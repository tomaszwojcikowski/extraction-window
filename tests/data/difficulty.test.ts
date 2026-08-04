import { describe, expect, it } from 'vitest';
import {
  enemyCountBonus,
  enemyDepth,
  progressEnergyTax,
  progressStormTax,
  scaleEnemyCombat,
  sectorDepth,
} from '../../src/data/difficulty';
import { ENEMIES } from '../../src/data/enemies';
import { generateSectorMap } from '../../src/map/generator';
import { getSector } from '../../src/data/encounters';

describe('progress difficulty', () => {
  it('enemyDepth grows with sector and level', () => {
    expect(enemyDepth(0, 1)).toBe(1);
    expect(enemyDepth(14, 1)).toBeCloseTo(sectorDepth(14), 5);
    expect(enemyDepth(14, 8)).toBeGreaterThan(enemyDepth(14, 1));
    expect(enemyDepth(0, 8)).toBeGreaterThan(enemyDepth(0, 1));
  });

  it('pack bonus steps at max level', () => {
    expect(enemyCountBonus(1)).toBe(0);
    expect(enemyCountBonus(7)).toBe(0);
    expect(enemyCountBonus(8)).toBe(1);
  });

  it('scaleEnemyCombat raises HP/ATK for leveled kits', () => {
    const mite = ENEMIES.mite;
    const early = scaleEnemyCombat(mite, 0, 1, 'normal');
    const late = scaleEnemyCombat(mite, 10, 7, 'normal');
    expect(late.hp).toBeGreaterThan(early.hp);
    expect(late.atk).toBeGreaterThanOrEqual(early.atk);
  });

  it('elites gain rank with level', () => {
    const def = ENEMIES.elite_apex;
    const low = scaleEnemyCombat(def, 12, 2, 'elite');
    const high = scaleEnemyCombat(def, 12, 8, 'elite');
    expect(high.hp).toBeGreaterThan(low.hp);
    expect(high.atk).toBeGreaterThanOrEqual(low.atk);
  });

  it('progress storm/energy taxes are reserved (off for WR band)', () => {
    expect(progressStormTax(8, 14, 6)).toBe(false);
    expect(progressEnergyTax(8, 12, false)).toBe(0);
  });

  it('generateSectorMap with higher playerLevel yields tougher packs', () => {
    const sector = getSector(6);
    const low = generateSectorMap(sector, 42, 6, { playerLevel: 1 });
    const high = generateSectorMap(sector, 42, 6, { playerLevel: 8 });
    const totalHp = (m: typeof low) =>
      m.enemies.filter((e) => e.tier === 'normal').reduce((s, e) => s + e.maxHp, 0);
    // Extra pack members at high level can dilute average HP; total threat rises.
    expect(totalHp(high)).toBeGreaterThan(totalHp(low));
    expect(high.enemies.length).toBeGreaterThanOrEqual(low.enemies.length);
  });
});
