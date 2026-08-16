import { describe, expect, it, vi } from 'vitest';
import { createGame } from '../../src/sim';
import { ThemeCss } from '../../src/scenes/theme';
import {
  actionFloatLabels,
  causalActionFloats,
  combatFeedbackTiles,
  flankEdgeFloat,
  playActionSfx,
  type EnemySnap,
} from '../../src/game/presenters/ActionFeedback';

describe('ActionFeedback', () => {
  it('turns causal log events into short floating labels', () => {
    expect(
      actionFloatLabels([
        { loreId: 'LOG-ARMOR-ABSORB', detail: 'Rift Mite -2' },
        { loreId: 'LOG-DRAIN', detail: 'Duct Drone -2E' },
        { loreId: 'LOG-BRACE' },
      ]),
    ).toEqual([
      { label: 'BUS Duct Drone -2E', color: ThemeCss.arc },
      { label: 'BRACE · DEF +2 · flanks held', color: ThemeCss.inkBright },
    ]);
  });

  it('uses Shield naming on armor absorb floats', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-ARMOR-ABSORB', detail: '-2' }])).toEqual([
      { label: 'SHIELD -2', color: ThemeCss.inkBright },
    ]);
  });

  it('includes hatch feedback', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-SEALED-PRY' }])).toEqual([
      { label: 'HATCH OPEN', color: ThemeCss.safe },
    ]);
  });

  it('floats HP hurt and kit vitals with signed deltas', () => {
    expect(
      actionFloatLabels([{ loreId: 'LOG-HURT', detail: 'mite · -4 · 48/52 hp' }], {
        hpDelta: -4,
      }),
    ).toEqual([{ label: 'HP -4', color: ThemeCss.rust }]);
    expect(actionFloatLabels([{ loreId: 'LOG-USE-MED' }], { hpDelta: 22 })).toEqual([
      { label: 'HP +22', color: ThemeCss.safe },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-USE-ENERGY' }], { energyDelta: 32 })).toEqual([
      { label: 'BUS +32', color: ThemeCss.tape },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-USE-PLATE' }], { armorDelta: 12 })).toEqual([
      { label: 'SHIELD +12', color: ThemeCss.inkBright },
    ]);
  });

  it('floats blocked and sealed guidance', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-SEALED-BLOCK' }])).toEqual([
      { label: 'SEALED · SEALANT OR BATON', color: ThemeCss.tape },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-USE-EMPTY' }])).toEqual([
      { label: 'KIT EMPTY', color: ThemeCss.inkDim },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-INTERACT-MISS' }])).toEqual([
      { label: 'STAND ON HATCH', color: ThemeCss.inkDim },
    ]);
  });

  it('floats handshake and uplink progress', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-HS-TICK', detail: '1/2' }])).toEqual([
      { label: 'HANDSHAKE 1/2', color: ThemeCss.safe },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-UPLINK-TICK', detail: '2/3' }])).toEqual([
      { label: 'UPLINK 2/3', color: ThemeCss.arc },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-UPLINK-INTERRUPT' }])).toEqual([
      { label: 'UPLINK BROKEN', color: ThemeCss.rust },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-EXTRACT' }])).toEqual([
      { label: 'EXTRACT LOCK', color: ThemeCss.safe },
    ]);
  });

  it('announces flank edge separately from log floats', () => {
    expect(flankEdgeFloat(0, 2)).toEqual({ label: 'FLANK −2 DEF', color: ThemeCss.rust });
    expect(flankEdgeFloat(2, 0)).toEqual({ label: 'FLANK CLEAR', color: ThemeCss.safe });
    expect(flankEdgeFloat(1, 1)).toBeNull();
    expect(
      causalActionFloats([{ loreId: 'LOG-USE-MED' }], {
        vitals: { hpDelta: 10 },
        flankBefore: 0,
        flankAfter: 1,
      }),
    ).toEqual([
      { label: 'HP +10', color: ThemeCss.safe },
      { label: 'FLANK −1 DEF', color: ThemeCss.rust },
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
