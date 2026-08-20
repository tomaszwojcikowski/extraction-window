import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import {
  phaserContextHint,
  phaserKitStatus,
  phaserLiveLaneCount,
  phaserNeedsRangeCoach,
  phaserTrackMarks,
} from '../../src/game/presenters/PhaserLanes';
import { combatArena, makeEnemy } from '../sim/fixtures';

function openLane(st: ReturnType<typeof combatArena>, dist: number, dx = 1): void {
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

describe('phaserContextHint', () => {
  it('teaches once when phaser is first worn', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = 40;
    expect(phaserContextHint(st)).toBe('UI-HINT-PHASER-TEACH');
    expect(phaserContextHint(st)).not.toBe('UI-HINT-PHASER-TEACH');
  });

  it('coaches fire when a lane is live', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.scriptedFired.teach_phaser = true;
    st.player.energy = 40;
    openLane(st, 2);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y })];
    expect(phaserContextHint(st)).toBe('UI-HINT-PHASER-FIRE');
  });

  it('coaches low power when a shot is blocked by Power', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.scriptedFired.teach_phaser = true;
    st.player.energy = 3;
    openLane(st, 2);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y })];
    expect(phaserContextHint(st)).toBe('UI-HINT-PHASER-LOW');
  });

  it('nudges equip when phaser is in kit and a lane is open', () => {
    const st = combatArena();
    st.inventory.push({ kind: 'phaser', count: 1 });
    openLane(st, 3);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 3, y: st.player.y })];
    expect(phaserContextHint(st)).toBe('UI-HINT-PHASER-EQUIP');
  });

  it('stays quiet while kit is open', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.scriptedFired.teach_phaser = true;
    st.ui.inventoryOpen = true;
    openLane(st, 2);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y })];
    expect(phaserContextHint(st)).toBeNull();
  });
});

describe('phaserLiveLaneCount', () => {
  it('counts live lanes when worn, powered, and hostiles are in band', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = 40;
    openLane(st, 2);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y })];
    expect(phaserLiveLaneCount(st)).toBe(1);
    st.player.energy = 2;
    expect(phaserLiveLaneCount(st)).toBe(0);
  });
});

describe('phaserNeedsRangeCoach', () => {
  it('flags adjacent cardinal hostiles', () => {
    const st = combatArena();
    openLane(st, 1);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 1, y: st.player.y })];
    expect(phaserNeedsRangeCoach(st)).toBe(true);
  });
});

describe('phaserTrackMarks', () => {
  it('is empty until the phaser is worn', () => {
    const st = combatArena();
    openLane(st, 2);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y })];
    expect(phaserTrackMarks(st)).toEqual([]);
  });

  it('ticks range-band tiles, not the melee step', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = 40;
    openLane(st, 3);
    const marks = phaserTrackMarks(st);
    expect(marks.every((m) => m.role === 'band' && !m.live)).toBe(true);
    expect(marks.some((m) => m.x === st.player.x + 1 && m.y === st.player.y)).toBe(false);
    expect(marks.some((m) => m.x === st.player.x + 2 && m.y === st.player.y)).toBe(true);
    expect(marks.some((m) => m.x === st.player.x + 3 && m.y === st.player.y)).toBe(true);
  });

  it('marks the live target tile when a 2–3 shot is ready', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = 40;
    openLane(st, 2);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y })];
    const marks = phaserTrackMarks(st);
    expect(marks.some((m) => m.role === 'target' && m.live && m.x === st.player.x + 2)).toBe(true);
    expect(marks.filter((m) => m.role === 'target')).toHaveLength(1);
  });
});

describe('phaserKitStatus', () => {
  it('reports ready and low power when worn', () => {
    const st = combatArena();
    st.player.equip.tool = 'phaser';
    st.player.energy = 40;
    expect(phaserKitStatus(st, undefined)).toBe('UI-PHASER-READY');
    st.player.energy = 3;
    expect(phaserKitStatus(st, undefined)).toBe('UI-PHASER-LOW');
  });

  it('prompts wear when selected but not equipped', () => {
    const st = combatArena();
    expect(phaserKitStatus(st, 'phaser')).toBe('UI-PHASER-WEAR');
    expect(lore(phaserKitStatus(st, 'phaser')!)).toContain('2–3');
  });
});
