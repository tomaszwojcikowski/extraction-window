import { describe, expect, it } from 'vitest';
import { pickFieldMood } from '../../src/audio/music';
import { enterSfxForLayout } from '../../src/audio/sfx';
import { layoutForSector } from '../../src/map/layoutKind';

describe('pickFieldMood', () => {
  const base = {
    sectorId: 'plains' as const,
    sectorIndex: 2,
    playerEnergy: 80,
    maxEnergy: 100,
    inCombat: false,
  };

  it('prefers combat over shear pressure', () => {
    expect(
      pickFieldMood({
        ...base,
        inCombat: true,
        shearState: 'Arcing',
        playerEnergy: 5,
      }),
    ).toBe('combat');
  });

  it('goes critical on low Power or Breaching shear', () => {
    expect(pickFieldMood({ ...base, playerEnergy: 6 })).toBe('critical');
    expect(pickFieldMood({ ...base, shearState: 'Breaching' })).toBe('critical');
  });

  it('uses shear bed for Charged/Arcing, ion fronts, and late spine', () => {
    expect(pickFieldMood({ ...base, shearState: 'Charged' })).toBe('shear');
    expect(pickFieldMood({ ...base, ionFrontTurns: 3 })).toBe('shear');
    expect(pickFieldMood({ ...base, sectorIndex: 11 })).toBe('shear');
  });

  it('stays on field when calm and topped up early', () => {
    expect(pickFieldMood({ ...base, shearState: 'Calm' })).toBe('field');
  });
});

describe('enterSfxForLayout', () => {
  it('maps every grammar to a distinct enter sting', () => {
    const ids = (
      ['scatter', 'spine', 'hub', 'lattice', 'branch', 'warren'] as const
    ).map(enterSfxForLayout);
    expect(new Set(ids).size).toBe(6);
  });

  it('matches layoutForSector for campaign biomes', () => {
    expect(enterSfxForLayout(layoutForSector('plains'))).toBe('enter_scatter');
    expect(enterSfxForLayout(layoutForSector('ridge'))).toBe('enter_spine');
    expect(enterSfxForLayout(layoutForSector('vault'))).toBe('enter_hub');
    expect(enterSfxForLayout(layoutForSector('duct'))).toBe('enter_lattice');
    expect(enterSfxForLayout(layoutForSector('canopy'))).toBe('enter_branch');
    expect(enterSfxForLayout(layoutForSector('ash'))).toBe('enter_warren');
  });
});
