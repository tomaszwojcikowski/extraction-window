import { describe, expect, it, vi } from 'vitest';
import { createGame } from '../../src/sim';
import { ThemeCss } from '../../src/scenes/theme';
import {
  actionFloatLabels,
  causalActionFloats,
  worldActionFloats,
  combatFeedbackTiles,
  DEATH_MS,
  enemyMoveStaggerMs,
  flankEdgeFloat,
  maxMoveAnimMs,
  phaserBeamTargetTile,
  playActionSfx,
  playActorDeath,
  type EnemySnap,
} from '../../src/game/presenters/ActionFeedback';
import { MOVE_MS } from '../../src/game/GameHost';

describe('ActionFeedback', () => {
  it('turns causal log events into short floating labels', () => {
    expect(
      actionFloatLabels([
        { loreId: 'LOG-ARMOR-ABSORB', detail: 'Rift Mite -2' },
        { loreId: 'LOG-DRAIN', detail: 'Duct Drone -2 Power' },
        { loreId: 'LOG-PUNISH' },
      ]),
    ).toEqual([
      { label: 'SHIELD Rift Mite -2', color: ThemeCss.inkBright },
      { label: 'POWER Duct Drone -2 Power', color: ThemeCss.arc },
      { label: 'OPEN · CLEAN HIT', color: ThemeCss.flag },
    ]);
  });

  it('uses Shield naming on armor absorb floats', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-ARMOR-ABSORB', detail: '-2' }])).toEqual([
      { label: 'SHIELD -2', color: ThemeCss.inkBright },
    ]);
  });

  it('includes hatch feedback', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-SEALED-PRY' }])).toEqual([
      { label: 'SEALED OPEN', color: ThemeCss.safe },
    ]);
  });

  it('floats phaser beam fire with Power spend', () => {
    expect(
      actionFloatLabels([{ loreId: 'LOG-USE-PHASER', detail: '-4 Power' }]),
    ).toEqual([{ label: 'PHASER · -4 Power', color: ThemeCss.arcWhite }]);
    expect(actionFloatLabels([{ loreId: 'LOG-USE-PHASER' }], { energyDelta: -4 })).toEqual([
      { label: 'PHASER · POWER -4', color: ThemeCss.arcWhite },
    ]);
  });

  it('floats bus warn and last-turn fail', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-BUS-WARN' }])).toEqual([
      { label: 'POWER LOW', color: ThemeCss.tape },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-BUS-FAILING' }])).toEqual([
      { label: 'POWER FAIL · LAST TURN', color: ThemeCss.rust },
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
      { label: 'POWER +32', color: ThemeCss.tape },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-USE-PLATE' }], { armorDelta: 12 })).toEqual([
      { label: 'SHIELD +12', color: ThemeCss.inkBright },
    ]);
  });

  it('floats status, hit damage, and bus drains', () => {
    expect(
      actionFloatLabels([{ loreId: 'LOG-STATUS-BLEED' }], { hpDelta: -2 }),
    ).toEqual([{ label: 'BLEED · HP -2', color: ThemeCss.rust }]);
    expect(
      actionFloatLabels([{ loreId: 'LOG-STATUS-ION' }], { energyDelta: -3 }),
    ).toEqual([{ label: 'BURN · POWER -3', color: ThemeCss.arc }]);
    expect(actionFloatLabels([{ loreId: 'LOG-STATUS-BLIND' }])).toEqual([
      { label: 'BLIND', color: ThemeCss.inkDim },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-STATUS-JAM' }])).toEqual([
      { label: 'JAMMED', color: ThemeCss.rust },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-STATUS-MARKED' }])).toEqual([
      { label: 'MARKED', color: ThemeCss.tape },
    ]);
    expect(
      actionFloatLabels([{ loreId: 'LOG-HIT', detail: 'Scar Mite · -5 · 3/8 hp' }]),
    ).toEqual([{ label: 'HIT · Scar Mite · -5', color: ThemeCss.flag }]);
    expect(
      actionFloatLabels([{ loreId: 'LOG-HAZARD' }], { energyDelta: -2 }),
    ).toEqual([{ label: 'POWER -2', color: ThemeCss.arc }]);
  });

  it('backfills vitals floats when logs omit a channel', () => {
    expect(
      actionFloatLabels([{ loreId: 'LOG-PICKUP', detail: 'Power Cell' }], {
        energyDelta: -1,
        hpDelta: -2,
      }),
    ).toEqual([
      { label: 'STOWED · Power Cell', color: ThemeCss.safe },
      { label: 'HP -2', color: ThemeCss.rust },
      { label: 'POWER -1', color: ThemeCss.arc },
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

  it('floats kit pickup with item name', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-PICKUP', detail: 'Field Hypo' }])).toEqual([
      { label: 'STOWED · Field Hypo', color: ThemeCss.safe },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-PICKUP', detail: 'Salvage' }])).toEqual([
      { label: 'STOWED · Salvage', color: ThemeCss.safe },
    ]);
    expect(actionFloatLabels([{ loreId: 'LOG-SALVAGE-ID', detail: 'Plasma Flare' }])).toEqual([
      { label: 'STOWED · Plasma Flare', color: ThemeCss.safe },
    ]);
  });

  it('keeps salvage pickup floats when the turn log is noisy', () => {
    const logs = [
      { loreId: 'LOG-PICKUP' as const, detail: 'Salvage' },
      { loreId: 'LOG-HAZARD' as const },
      { loreId: 'LOG-DRAIN' as const, detail: 'Ion tile -2' },
      { loreId: 'LOG-WAIT' as const },
    ];
    expect(causalActionFloats(logs, { vitals: { energyDelta: -2 } })).toEqual(
      expect.arrayContaining([{ label: 'STOWED · Salvage', color: ThemeCss.safe }]),
    );
    expect(causalActionFloats(logs, { vitals: { energyDelta: -2 } })).toHaveLength(3);
  });

  it('world floats only salient beats', () => {
    const logs = [
      { loreId: 'LOG-PICKUP' as const, detail: 'Salvage' },
      { loreId: 'LOG-HAZARD' as const },
      { loreId: 'LOG-DRAIN' as const, detail: 'Ion tile -2' },
    ];
    expect(causalActionFloats(logs, { vitals: { energyDelta: -2 } })).toHaveLength(3);
    expect(worldActionFloats(logs, { vitals: { energyDelta: -2 } })).toEqual([
      { label: 'STOWED · Salvage', color: ThemeCss.safe },
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

  it('floats SHADOW +1 when a dark-prefer bonus pays out', () => {
    expect(actionFloatLabels([{ loreId: 'LOG-SHADOW-BITE' }])).toEqual([
      { label: 'SHADOW +1', color: ThemeCss.rust },
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

  it('resolves phaser beam target from ranged hit tiles', () => {
    const from = { x: 1, y: 1 };
    expect(
      phaserBeamTargetTile(
        ['LOG-USE-PHASER'],
        from,
        [{ x: 3, y: 1 }],
        { type: 'wait' },
        createGame(42),
      ),
    ).toEqual({ x: 3, y: 1 });
    expect(
      phaserBeamTargetTile(['LOG-USE-PHASER'], from, [{ x: 4, y: 1 }], { type: 'wait' }, createGame(42)),
    ).toEqual({ x: 4, y: 1 });
    expect(
      phaserBeamTargetTile(['LOG-USE-PHASER'], from, [{ x: 2, y: 1 }], { type: 'wait' }, createGame(42)),
    ).toBeUndefined();
    expect(
      phaserBeamTargetTile(['LOG-USE-PHASER'], from, [{ x: 5, y: 1 }], { type: 'wait' }, createGame(42)),
    ).toBeUndefined();
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

  it('staggers hostile steps and extends the move safety window', () => {
    expect(enemyMoveStaggerMs(0)).toBe(0);
    expect(enemyMoveStaggerMs(2)).toBe(44);
    expect(maxMoveAnimMs(3)).toBe(MOVE_MS + 44);
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

  it('collapses a visible body then destroys the view', () => {
    const img = {
      active: true,
      visible: true,
      scaleX: 1,
      scaleY: 1,
      y: 40,
      setTint: vi.fn(),
      destroy: vi.fn(),
    };
    const label = {
      active: true,
      setVisible: vi.fn(),
      destroy: vi.fn(),
    };
    const tweens = {
      add: vi.fn((cfg: { onComplete?: () => void; duration: number }) => {
        cfg.onComplete?.();
        return {};
      }),
    };
    const view = { img, label, gx: 1, gy: 2, dying: false };
    playActorDeath(tweens as never, view as never);
    expect(view.dying).toBe(true);
    expect(label.setVisible).toHaveBeenCalledWith(false);
    expect(tweens.add).toHaveBeenCalledWith(
      expect.objectContaining({ duration: DEATH_MS, alpha: 0 }),
    );
    expect(img.destroy).toHaveBeenCalled();
    expect(label.destroy).toHaveBeenCalled();
  });

  it('tears down off-screen bodies without a collapse tween', () => {
    const img = {
      active: true,
      visible: false,
      setTint: vi.fn(),
      destroy: vi.fn(),
    };
    const label = {
      active: true,
      setVisible: vi.fn(),
      destroy: vi.fn(),
    };
    const tweens = { add: vi.fn() };
    const onDone = vi.fn();
    playActorDeath(tweens as never, { img, label, gx: 0, gy: 0 } as never, onDone);
    expect(tweens.add).not.toHaveBeenCalled();
    expect(img.destroy).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });
});
