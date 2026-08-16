import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/sim/actions';
import { hasBeamLine, moveEnemies, triggerOverwatch } from '../../src/sim/ai';
import { enemyAttack } from '../../src/sim/combat';
import { leaveContamination, tickContamination } from '../../src/sim/contamination';
import { useSelected } from '../../src/sim/inventory';
import { combatArena, lastLog, makeEnemy } from './fixtures';

function floor(state: ReturnType<typeof combatArena>, x: number, y: number): void {
  state.tiles[y]![x] = { kind: 'floor', walkable: true, transparent: true };
}

describe('Iteration 2 tactical threats', () => {
  it('drone beam requires a clear cardinal three-tile line', () => {
    const st = combatArena();
    st.player.x = 5;
    st.player.y = 5;
    const drone = makeEnemy({ kind: 'drone', x: 8, y: 5 });
    st.enemies = [drone];
    floor(st, 6, 5);
    floor(st, 7, 5);

    expect(hasBeamLine(st, drone)).toBe(true);
    moveEnemies(st);
    expect(drone.intent).toBe('beam');
    expect(lastLog(st, 'LOG-TELE-BEAM')).toBeTruthy();

    const energy = st.player.energy;
    moveEnemies(st);
    expect(st.player.energy).toBe(energy - 4);
    expect(lastLog(st, 'LOG-BEAM-FIRE')).toBeTruthy();

    drone.beamCooldown = 0;
    floor(st, 7, 5);
    st.tiles[5]![7] = { kind: 'scrub', walkable: true, transparent: false };
    expect(hasBeamLine(st, drone)).toBe(false);
  });

  it('spore contamination names a three-turn tile tax', () => {
    const st = combatArena();
    leaveContamination(st, { x: st.player.x, y: st.player.y });
    const energy = st.player.energy;
    tickContamination(st);
    expect(st.player.energy).toBe(energy - 3);
    expect(st.contamination).toHaveLength(1);
    tickContamination(st);
    expect(st.contamination).toHaveLength(1);
    tickContamination(st);
    expect(st.contamination).toHaveLength(0);
    expect(lastLog(st, 'LOG-CONTAMINATION')?.detail).toBe('tile tax -3E');
  });

  it('sentinel overwatch triggers first and flare cancellation clears it', () => {
    const st = combatArena();
    st.player.x = 5;
    st.player.y = 5;
    st.player.armor = 0;
    const sentinel = makeEnemy({ kind: 'sentinel', x: 7, y: 5, atk: 8 });
    st.enemies = [sentinel];
    floor(st, 6, 5);

    moveEnemies(st);
    expect(sentinel.intent).toBe('overwatch');
    const hp = st.player.hp;
    expect(triggerOverwatch(st, { x: 6, y: 5 })).toBe(true);
    expect(st.player.hp).toBeLessThan(hp);

    sentinel.windup = 1;
    sentinel.intent = 'overwatch';
    st.inventory = [{ kind: 'flare', count: 1 }];
    st.ui.selectedSlot = 0;
    useSelected(st);
    expect(sentinel.intent).toBeUndefined();
    expect(sentinel.windup).toBe(0);
  });

  it('fires overwatch before a player bump-attacks the sentinel', () => {
    const st = combatArena();
    st.player.x = 5;
    st.player.y = 5;
    st.player.armor = 0;
    const sentinel = makeEnemy({ kind: 'sentinel', x: 6, y: 5, atk: 8, windup: 1 });
    sentinel.intent = 'overwatch';
    st.enemies = [sentinel];
    floor(st, 6, 5);

    applyAction(st, { type: 'move', dx: 1, dy: 0 });

    expect(lastLog(st, 'LOG-OVERWATCH-FIRE')).toBeTruthy();
  });
});

describe('Iteration 2 player tactics', () => {
  it('sealant converts brine underfoot into stable floor', () => {
    const st = combatArena();
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'brine_pool',
      walkable: true,
      transparent: true,
    };
    st.inventory = [{ kind: 'sealant', count: 1 }];

    useSelected(st);

    expect(st.tiles[st.player.y]![st.player.x]!.kind).toBe('floor');
    expect(st.inventory).toHaveLength(0);
    expect(lastLog(st, 'LOG-USE-SEALANT')).toBeTruthy();
  });

  it('brace raises defense for the following enemy phase', () => {
    const st = combatArena();
    st.player.armor = 0;
    st.player.def = 0;
    st.player.hp = 30;
    st.player.maxHp = 30;
    st.enemies = [];
    applyAction(st, { type: 'brace' });
    expect(st.player.braceTurns).toBe(1);
    const hp = st.player.hp;
    enemyAttack(st, makeEnemy({ kind: 'mite', atk: 6 }), 0);
    expect(st.player.hp).toBe(hp - 4);
  });

  it('walking away from an adjacent enemy costs no bus', () => {
    const st = combatArena();
    st.player.x = 5;
    st.player.y = 5;
    st.player.energy = 30;
    const foe = makeEnemy({ kind: 'mite', x: 6, y: 5 });
    st.enemies = [foe];
    st.visible[5]![6] = true;
    floor(st, 4, 5);

    applyAction(st, { type: 'move', dx: -1, dy: 0 });
    expect(st.player.x).toBe(4);
    expect(st.player.energy).toBe(30);
  });
});
