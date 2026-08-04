import { describe, expect, it } from 'vitest';
import { applyAction, createGame, describeObjective } from '../../src/sim';
import { STORM_TURNS } from '../../src/campaign/spine';
import { contextHint } from '../../src/game/presenters/ContextHints';

describe('drill bay tutorial', () => {
  it('createGame default skipTutorial stays on normal plains', () => {
    const st = createGame(42);
    expect(st.tutorialActive).toBe(false);
    expect(st.sectorId).toBe('plains');
    expect(st.width).toBeGreaterThan(24);
    expect(st.log.some((l) => l.loreId === 'LOG-SEC-PLAINS')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-TUT-WELCOME')).toBe(false);
  });

  it('createGame skipTutorial false starts tutorialActive on drill map', () => {
    const st = createGame(42, { skipTutorial: false });
    expect(st.tutorialActive).toBe(true);
    expect(st.sectorId).toBe('plains');
    expect(st.sectorIndex).toBe(0);
    expect(st.width).toBe(24);
    expect(st.height).toBe(16);
    expect(st.exitPos).not.toBeNull();
    expect(st.enemies.filter((e) => e.alive).length).toBeLessThanOrEqual(1);
    expect(st.items.length).toBe(1);
    expect(st.roomQuest).toBeNull();
    expect(st.npcs.length).toBe(0);
    expect(st.log.some((l) => l.loreId === 'LOG-TUT-WELCOME')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-EVT-AFTERGLOW')).toBe(false);
    expect(describeObjective(st).local).toBe('OBJ-TUT-HATCH');
    expect(contextHint(st)).toBe('UI-TUT-MOVE');
  });

  it('storm and bus drip pause while tutorialActive', () => {
    const st = createGame(7, { skipTutorial: false });
    const storm = st.stormTurns;
    const energy = st.player.energy;
    applyAction(st, { type: 'wait' });
    expect(st.stormTurns).toBe(storm);
    expect(st.player.energy).toBe(energy);
  });

  it('exit hatch finishes tutorial into real plains without XP_SECTOR', () => {
    const st = createGame(42, { skipTutorial: false });
    const xpBefore = st.xp;
    const stormBefore = st.stormTurns;
    expect(st.exitPos).not.toBeNull();
    st.player.x = st.exitPos!.x;
    st.player.y = st.exitPos!.y;
    applyAction(st, { type: 'exit' });

    expect(st.tutorialActive).toBe(false);
    expect(st.sectorId).toBe('plains');
    expect(st.sectorIndex).toBe(0);
    expect(st.width).toBeGreaterThan(24);
    expect(st.xp).toBe(xpBefore);
    expect(st.log.some((l) => l.loreId === 'LOG-TUT-DONE')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-SEC-PLAINS')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-EVT-AFTERGLOW')).toBe(true);
    // +2 cheer, then finishSectorTransition −1
    expect(st.stormTurns).toBe(stormBefore + 2 - 1);
    expect(st.stormTurns).toBeLessThanOrEqual(STORM_TURNS + 2);
  });
});
