import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/sim';
import { Theme } from '../../src/scenes/theme';
import { collectThreatMarks } from '../../src/v2/threat';

describe('v2 threat marks', () => {
  it('paints visible windup tiles from the same sim facts as ThreatView', () => {
    const state = createGame(42, { skipTutorial: true });
    const px = state.player.x;
    const py = state.player.y;
    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let tx = px;
    let ty = py;
    for (const [dx, dy] of dirs) {
      if (state.tiles[py + dy]?.[px + dx]?.walkable) {
        tx = px + dx;
        ty = py + dy;
        break;
      }
    }
    state.enemies.push({
      id: 9001,
      kind: 'mite',
      x: tx,
      y: ty,
      hp: 4,
      maxHp: 4,
      atk: 1,
      def: 0,
      alive: true,
      statuses: {},
      alerted: true,
      swellTurns: 0,
      homeX: tx,
      homeY: ty,
      skirmishRetreat: false,
      windup: 2,
      intent: 'pounce',
      beamCooldown: 0,
      tier: 'normal',
    });
    state.visible[ty]![tx] = true;
    if (state.tiles[py]?.[px]) state.visible[py]![px] = true;

    const marks = collectThreatMarks(state, 0);
    const painted = marks.filter((m) => m.color === Theme.rust && m.fill > 0);
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.some((m) => Math.abs(m.x - tx) + Math.abs(m.y - ty) <= 2)).toBe(true);
  });

  it('skips windups the surveyor cannot see', () => {
    const state = createGame(42, { skipTutorial: true });
    state.enemies.push({
      id: 9002,
      kind: 'mite',
      x: 0,
      y: 0,
      hp: 4,
      maxHp: 4,
      atk: 1,
      def: 0,
      alive: true,
      statuses: {},
      alerted: true,
      swellTurns: 0,
      homeX: 0,
      homeY: 0,
      skirmishRetreat: false,
      windup: 1,
      intent: 'pounce',
      beamCooldown: 0,
      tier: 'normal',
    });
    if (state.visible[0]) state.visible[0][0] = false;
    const marks = collectThreatMarks(state, 0);
    expect(marks.every((m) => !(m.x === 0 && m.y === 0 && m.fill > 0.2))).toBe(true);
  });
});
