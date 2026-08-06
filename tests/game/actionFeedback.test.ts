import { describe, expect, it, vi } from 'vitest';
import { createGame } from '../../src/sim';
import { ThemeCss } from '../../src/scenes/theme';
import {
  actionFloatLabels,
  combatFeedbackTiles,
  playActionSfx,
  type EnemySnap,
} from '../../src/game/presenters/ActionFeedback';

describe('ActionFeedback', () => {
  it('turns causal log events into short floating labels', () => {
    expect(
      actionFloatLabels([
        { loreId: 'LOG-ARMOR-ABSORB', detail: 'Rift Mite -2' },
        { loreId: 'LOG-DRAIN', detail: 'Duct Drone -2E' },
        { loreId: 'LOG-QUIET-OFF' },
      ]),
    ).toEqual([
      { label: 'BUS Duct Drone -2E', color: ThemeCss.arc },
      { label: 'QUIET OFF', color: ThemeCss.inkDim },
    ]);
  });

  it('uses Shield naming on armor absorb floats', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-ARMOR-ABSORB', detail: '-2' }])).toEqual([
      { label: 'SHIELD -2', color: ThemeCss.inkBright },
    ]);
  });

  it('does not float Quiet-on (badge owns that channel)', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-USE-JAMMER' }, { loreId: 'LOG-QUIET-ON' }])).toEqual(
      [],
    );
  });

  it('includes hatch and craft feedback', () => {
    expect(
      actionFloatLabels([
        { loreId: 'LOG-SEALED-PRY' },
        { loreId: 'LOG-CRAFT-FILTER' },
      ]),
    ).toEqual([
      { label: 'HATCH OPEN', color: ThemeCss.safe },
      { label: 'CRAFT · FILTER', color: ThemeCss.flag },
    ]);
  });

  it('detects hit and spore tiles from enemy snaps', () => {
    const st = createGame(42);
    const target = st.enemies.find((e) => e.alive);
    expect(target).toBeTruthy();
    const snap: EnemySnap[] = st.enemies.map((en) => ({
      id: en.id,
      x: en.x,
      y: en.y,
      hp: en.hp,
      alive: en.alive,
      kind: en.kind,
    }));
    // Simulate damage on first living enemy
    const cur = st.enemies.find((e) => e.id === target!.id)!;
    cur.hp = Math.max(0, cur.hp - 1);
    if (cur.hp === 0) cur.alive = false;

    const { hitTiles } = combatFeedbackTiles(st, snap);
    expect(hitTiles.some((t) => t.x === cur.x && t.y === cur.y)).toBe(true);
  });

  it('plays sector sfx on sector change without flashing', async () => {
    const st = createGame(42);
    const flash = vi.fn();
    const { sfx } = await import('../../src/audio/sfx');
    const play = vi.spyOn(sfx, 'play').mockImplementation(() => undefined);

    playActionSfx(
      st,
      {
        action: { type: 'exit' },
        prevSector: st.sectorIndex - 1,
        prevHp: st.player.hp,
        prevLogLen: st.log.length,
        prevAlive: st.enemies.filter((e) => e.alive).length,
        fromPlayer: { x: st.player.x, y: st.player.y },
      },
      flash,
    );

    expect(play).toHaveBeenCalledWith('sector');
    expect(flash).not.toHaveBeenCalled();
    play.mockRestore();
  });

  it('plays move sfx when the player relocated', async () => {
    const st = createGame(42);
    const flash = vi.fn();
    const { sfx } = await import('../../src/audio/sfx');
    const play = vi.spyOn(sfx, 'play').mockImplementation(() => undefined);
    const from = { x: st.player.x - 1, y: st.player.y };

    playActionSfx(
      st,
      {
        action: { type: 'move', dx: 1, dy: 0 },
        prevSector: st.sectorIndex,
        prevHp: st.player.hp,
        prevLogLen: st.log.length,
        prevAlive: st.enemies.filter((e) => e.alive).length,
        fromPlayer: from,
      },
      flash,
    );

    expect(play).toHaveBeenCalledWith('move');
    play.mockRestore();
  });
});
