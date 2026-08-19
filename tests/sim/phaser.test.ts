import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/sim/actions';
import {
  PHASER_ENERGY_COST,
  findPhaserTarget,
  firePhaser,
  phaserAnyTarget,
  tracePhaserLane,
  tryFirePhaser,
} from '../../src/sim/phaser';
import { combatArena, lastLog, makeEnemy } from './fixtures';
import type { GameState } from '../../src/sim/types';
import { getSector } from '../../src/data/encounters';

function openLane(st: GameState, dist: number, dx = 1): void {
  const px = Math.min(8, st.width - dist - 2);
  const py = Math.min(8, st.height - 2);
  st.player.x = px;
  st.player.y = py;
  for (let step = 0; step <= dist; step++) {
    const x = px + dx * step;
    const y = py;
    st.tiles[y]![x] = { kind: 'floor', walkable: true, transparent: true };
    st.visible[y]![x] = true;
  }
}

function foeAt(st: GameState, dist: number, dx = 1) {
  const en = makeEnemy({
    kind: 'mite',
    hp: 30,
    maxHp: 30,
    def: 0,
    x: st.player.x + dx * dist,
    y: st.player.y,
  });
  st.enemies = [en];
  return en;
}

describe('survey phaser', () => {
  it('finds a visible hostile at 2–3 tiles on a cardinal lane', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    openLane(st, 3);
    const at2 = foeAt(st, 2);
    expect(findPhaserTarget(st, 1, 0)?.id).toBe(at2.id);
    const at3 = foeAt(st, 3);
    expect(findPhaserTarget(st, 1, 0)?.id).toBe(at3.id);
  });

  it('does not fire adjacent — that stay melee', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    openLane(st, 1);
    foeAt(st, 1);
    expect(findPhaserTarget(st, 1, 0)).toBeUndefined();
    expect(tryFirePhaser(st, 1, 0)).toBe(false);
  });

  it('does not fire at 4 tiles or through walls', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    openLane(st, 4);
    foeAt(st, 4);
    expect(findPhaserTarget(st, 1, 0)).toBeUndefined();

    openLane(st, 3);
    st.tiles[st.player.y]![st.player.x + 1] = {
      kind: 'wall',
      walkable: false,
      transparent: false,
    };
    foeAt(st, 3);
    expect(findPhaserTarget(st, 1, 0)).toBeUndefined();
  });

  it('works in shadow and spends Power', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = 40;
    openLane(st, 2);
    const en = foeAt(st, 2);
    st.illumination[en.y]![en.x] = 0;
    const hp = en.hp;
    firePhaser(st, en);
    expect(en.hp).toBeLessThan(hp);
    expect(st.player.energy).toBe(40 - PHASER_ENERGY_COST);
    expect(lastLog(st, 'LOG-USE-PHASER')?.detail).toBe(`-${PHASER_ENERGY_COST} Power`);
  });

  it('move toward a 2–3 tile foe fires instead of walking', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = 40;
    openLane(st, 3);
    const en = foeAt(st, 3);
    const from = { x: st.player.x, y: st.player.y };
    const hp = en.hp;
    applyAction(st, { type: 'move', dx: 1, dy: 0 });
    expect(st.player.x).toBe(from.x);
    expect(st.player.y).toBe(from.y);
    expect(en.hp).toBeLessThan(hp);
    expect(st.log.some((l) => l.loreId === 'LOG-USE-PHASER')).toBe(true);
  });

  it('walks when Power is too low to fire', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = PHASER_ENERGY_COST - 1;
    openLane(st, 2);
    const en = foeAt(st, 2);
    const fromX = st.player.x;
    applyAction(st, { type: 'move', dx: 1, dy: 0 });
    expect(st.player.x).toBe(fromX + 1);
    expect(en.hp).toBe(en.maxHp);
  });

  it('tracePhaserLane matches findPhaserTarget', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    openLane(st, 3);
    const en = foeAt(st, 3);
    const lane = tracePhaserLane(st, 1, 0);
    expect(lane.target?.id).toBe(en.id);
    expect(findPhaserTarget(st, 1, 0)?.id).toBe(en.id);
    expect(phaserAnyTarget(st)).toBe(true);
  });

  it('is stocked from flood onward, not only ruin wreckage', () => {
    expect(getSector(0).lootTable.includes('phaser')).toBe(false);
    expect(getSector(1).lootTable.includes('phaser')).toBe(true);
    expect(getSector(2).lootTable.includes('phaser')).toBe(true);
    expect(getSector(5).lootTable.includes('phaser')).toBe(true);
  });
});
