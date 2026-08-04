import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame, describeObjective, finishTutorial } from '../../src/sim';
import { STORM_TURNS } from '../../src/campaign/spine';
import { contextHint } from '../../src/game/presenters/ContextHints';
import { presentActionFeedback } from '../../src/game/presenters/ActionFeedback';
import { mechanicsAutopilotHint } from '../../src/sim/mechanics';
import { canReach } from '../../src/sim/fov';
import { addStatus } from '../../src/sim/status';
import { inShadow } from '../../src/sim/light';
import type { LightView } from '../../src/game/views/LightView';

function drill(seed = 42) {
  return createGame(seed, { skipTutorial: false });
}

function clearHostiles(st: ReturnType<typeof createGame>): void {
  for (const e of st.enemies) e.alive = false;
}

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
    const st = drill(42);
    expect(st.tutorialActive).toBe(true);
    expect(st.sectorId).toBe('plains');
    expect(st.sectorIndex).toBe(0);
    expect(st.width).toBe(24);
    expect(st.height).toBe(16);
    expect(st.exitPos).not.toBeNull();
    expect(st.enemies.filter((e) => e.alive).length).toBeLessThanOrEqual(1);
    expect(st.items.length).toBe(2);
    expect(st.items.some((item) => item.kind === 'flare')).toBe(true);
    expect(st.enemies.some((enemy) => enemy.kind === 'stalker')).toBe(true);
    expect(st.roomQuest).toBeNull();
    expect(st.npcs.length).toBe(0);
    expect(st.log.some((l) => l.loreId === 'LOG-TUT-WELCOME')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-EVT-AFTERGLOW')).toBe(false);
    expect(describeObjective(st).local).toBe('OBJ-TUT-HATCH');
    expect(describeObjective(st).campaign).toBe('OBJ-TUT-BRIEF');
    expect(describeObjective(st).pos).toEqual(st.exitPos);
    expect(contextHint(st)).toBe('UI-TUT-MOVE');
  });

  it('keeps start→hatch reachability and exit tile kind', () => {
    const st = drill(99);
    expect(st.exitPos).not.toBeNull();
    expect(canReach(st.tiles, { x: st.player.x, y: st.player.y }, st.exitPos!)).toBe(true);
    expect(st.tiles[st.exitPos!.y]![st.exitPos!.x]!.kind).toBe('exit');
    expect(st.tiles[st.player.y]![st.player.x]!.walkable).toBe(true);
  });

  it('places flare, identification loot, scrub, and a south alcove route', () => {
    const st = drill(7);
    expect(st.items.some((i) => i.kind === 'flare')).toBe(true);
    expect(
      st.items.some((i) => i.kind === 'salvage' || i.kind === 'field_sample'),
    ).toBe(true);
    expect(st.tiles[6]![11]!.kind).toBe('scrub');
    // South alcove floor around the stalker corridor
    expect(st.tiles[10]![12]!.walkable).toBe(true);
    expect(st.tiles[10]![12]!.kind).toBe('floor');
  });

  it('storm and bus drip pause while tutorialActive', () => {
    const st = drill(7);
    const storm = st.stormTurns;
    const energy = st.player.energy;
    applyAction(st, { type: 'wait' });
    expect(st.stormTurns).toBe(storm);
    expect(st.player.energy).toBe(energy);
  });

  it('does not apply bleed damage while tutorialActive', () => {
    const st = drill(7);
    addStatus(st.player, 'bleed', 5);
    const hp = st.player.hp;
    // Stand off the hatch so wait does not finish the drill
    st.player.x = 2;
    st.player.y = 7;
    applyAction(st, { type: 'wait' });
    expect(st.tutorialActive).toBe(true);
    expect(st.player.hp).toBe(hp);
    expect(st.log.some((l) => l.loreId === 'LOG-STATUS-BLEED')).toBe(false);
    expect(st.player.statuses.bleed).toBe(4);
  });

  it('shows get hint when standing on ground loot after turn 0', () => {
    const st = drill(7);
    const loot = st.items.find((i) => i.kind === 'salvage' || i.kind === 'field_sample')!;
    st.turn = 1;
    clearHostiles(st);
    st.player.x = loot.x;
    st.player.y = loot.y;
    expect(contextHint(st)).toBe('UI-TUT-GET');
  });

  it('shows kit hint early after picking identification loot', () => {
    const st = drill(7);
    const loot = st.items.find((i) => i.kind === 'salvage' || i.kind === 'field_sample')!;
    st.turn = 1;
    clearHostiles(st);
    st.player.x = loot.x;
    st.player.y = loot.y;
    applyAction(st, { type: 'get' });
    expect(st.inventory.some((s) => s.kind === loot.kind)).toBe(true);
    expect(contextHint(st)).toBe('UI-TUT-KIT');
  });

  it('shows fight hint for a visible hostile without windup', () => {
    const st = drill(7);
    const stalker = st.enemies.find((enemy) => enemy.kind === 'stalker')!;
    st.turn = 2;
    stalker.windup = 0;
    st.visible[stalker.y]![stalker.x] = true;
    // Avoid kit hint dominating
    st.inventory = st.inventory.filter(
      (s) =>
        s.kind !== 'salvage' &&
        s.kind !== 'field_sample' &&
        s.kind !== 'sealed_crate' &&
        s.kind !== 'array_shard',
    );
    expect(contextHint(st)).toBe('UI-TUT-FIGHT');
  });

  it('shows the stalker windup beat with a flare available', () => {
    const st = drill(7);
    const stalker = st.enemies.find((enemy) => enemy.kind === 'stalker')!;
    st.turn = 2;
    stalker.windup = 1;
    st.visible[stalker.y]![stalker.x] = true;

    expect(st.inventory.some((item) => item.kind === 'flare')).toBe(true);
    expect(contextHint(st)).toBe('UI-TUT-STALKER');
  });

  it('hints flare when shadowed near a visible hostile', () => {
    const st = drill(7);
    const stalker = st.enemies.find((enemy) => enemy.kind === 'stalker')!;
    st.turn = 3;
    stalker.windup = 0;
    st.inventory = st.inventory.filter(
      (s) =>
        s.kind !== 'salvage' &&
        s.kind !== 'field_sample' &&
        s.kind !== 'sealed_crate' &&
        s.kind !== 'array_shard',
    );
    if (!st.inventory.some((s) => s.kind === 'flare')) {
      st.inventory.push({ kind: 'flare', qty: 1 });
    }
    // Force soft-shadow underfoot (tutorial ambient can keep jammer dimming lit).
    st.player.x = 10;
    st.player.y = 8;
    st.illumination[st.player.y]![st.player.x] = 0.2;
    expect(inShadow(st, st.player.x, st.player.y)).toBe(true);
    st.visible[stalker.y]![stalker.x] = true;
    expect(contextHint(st)).toBe('UI-HINT-FLARE');
  });

  it('hints walk-to-hatch until standing on exit, then press-to-exit', () => {
    const st = drill(7);
    st.turn = 2;
    clearHostiles(st);
    expect(contextHint(st)).toBe('UI-TUT-GOTO-HATCH');

    st.player.x = st.exitPos!.x;
    st.player.y = st.exitPos!.y;
    expect(contextHint(st)).toBe('UI-TUT-EXIT');
  });

  it('exit hatch finishes tutorial into real plains without XP_SECTOR', () => {
    const st = drill(42);
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
    expect(describeObjective(st).local).not.toBe('OBJ-TUT-HATCH');
    expect(describeObjective(st).campaign).not.toBe('OBJ-TUT-BRIEF');
  });

  it('walking onto the drill hatch finishes the tutorial', () => {
    const st = drill(42);
    clearHostiles(st);
    const exit = st.exitPos!;
    st.player.x = exit.x - 1;
    st.player.y = exit.y;
    applyAction(st, { type: 'move', dx: 1, dy: 0 });
    expect(st.tutorialActive).toBe(false);
    expect(st.width).toBeGreaterThan(24);
    expect(st.log.some((l) => l.loreId === 'LOG-TUT-DONE')).toBe(true);
  });

  it('waiting while already on the drill hatch finishes the tutorial', () => {
    const st = drill(42);
    st.player.x = st.exitPos!.x;
    st.player.y = st.exitPos!.y;
    applyAction(st, { type: 'wait' });
    expect(st.tutorialActive).toBe(false);
    expect(st.log.some((l) => l.loreId === 'LOG-TUT-DONE')).toBe(true);
  });

  it('finishTutorial is idempotent once the drill is cleared', () => {
    const st = drill(3);
    finishTutorial(st);
    expect(st.tutorialActive).toBe(false);
    const width = st.width;
    const logLen = st.log.length;
    finishTutorial(st);
    expect(st.width).toBe(width);
    expect(st.log.length).toBe(logLen);
  });

  it('resumes storm clock after leaving the drill bay', () => {
    const st = drill(11);
    st.player.x = st.exitPos!.x;
    st.player.y = st.exitPos!.y;
    applyAction(st, { type: 'exit' });
    const storm = st.stormTurns;
    applyAction(st, { type: 'wait' });
    expect(st.stormTurns).toBeLessThan(storm);
  });

  it('fires plains afterglow only once when the real drop loads', () => {
    const st = drill(5);
    st.player.x = st.exitPos!.x;
    st.player.y = st.exitPos!.y;
    applyAction(st, { type: 'exit' });
    expect(st.log.filter((l) => l.loreId === 'LOG-EVT-AFTERGLOW').length).toBe(1);
    applyAction(st, { type: 'wait' });
    expect(st.log.filter((l) => l.loreId === 'LOG-EVT-AFTERGLOW').length).toBe(1);
  });

  it('welcome log fires only once', () => {
    const st = drill(8);
    expect(st.log.filter((l) => l.loreId === 'LOG-TUT-WELCOME').length).toBe(1);
    applyAction(st, { type: 'wait' });
    expect(st.log.filter((l) => l.loreId === 'LOG-TUT-WELCOME').length).toBe(1);
  });

  it('autopilot hint paths toward the hatch and exits on it', () => {
    const st = drill(42);
    clearHostiles(st);
    const toward = mechanicsAutopilotHint(st);
    expect(toward).not.toBeNull();
    expect(toward!.type === 'move' || toward!.type === 'exit').toBe(true);

    st.player.x = st.exitPos!.x;
    st.player.y = st.exitPos!.y;
    expect(mechanicsAutopilotHint(st)).toEqual({ type: 'exit' });
  });

  it('autopilot can clear the drill bay into real plains', () => {
    const st = drill(42);
    clearHostiles(st);
    let guard = 80;
    while (st.tutorialActive && guard-- > 0) {
      const hint = mechanicsAutopilotHint(st);
      expect(hint).not.toBeNull();
      applyAction(st, hint!);
    }
    expect(st.tutorialActive).toBe(false);
    expect(st.width).toBeGreaterThan(24);
    expect(st.log.some((l) => l.loreId === 'LOG-TUT-DONE')).toBe(true);
  });

  it('marks mapReloaded when tutorial exits without changing sectorIndex', async () => {
    const st = drill(42);
    const prevSector = st.sectorIndex;
    const prevTutorialActive = st.tutorialActive;
    const prevMapWidth = st.width;
    const prevMapHeight = st.height;
    const prevHp = st.player.hp;
    const prevLogLen = st.log.length;
    const prevAlive = st.enemies.filter((e) => e.alive).length;
    const fromPlayer = { x: st.player.x, y: st.player.y };
    const prevEnemySnap = st.enemies.map((en) => ({
      id: en.id,
      x: en.x,
      y: en.y,
      hp: en.hp,
      alive: en.alive,
      kind: en.kind,
    }));

    st.player.x = st.exitPos!.x;
    st.player.y = st.exitPos!.y;
    applyAction(st, { type: 'exit' });

    const { sfx } = await import('../../src/audio/sfx');
    const play = vi.spyOn(sfx, 'play').mockImplementation(() => undefined);

    const lights = {
      syncTurn: vi.fn(),
      allSources: vi.fn(() => []),
      applyTileLighting: vi.fn(),
      drawBloom: vi.fn(),
      applyActorLighting: vi.fn(),
      addFxLight: vi.fn(),
      clearFx: vi.fn(),
    } as unknown as LightView;

    const fb = presentActionFeedback({
      state: st,
      action: { type: 'exit' },
      prevSector,
      prevTutorialActive,
      prevMapWidth,
      prevMapHeight,
      prevHp,
      prevLogLen,
      prevAlive,
      fromPlayer,
      prevEnemySnap,
      lights,
      flash: vi.fn(),
    });

    expect(st.sectorIndex).toBe(prevSector);
    expect(fb.sectorChanged).toBe(false);
    expect(fb.mapReloaded).toBe(true);
    expect(fb.newLogs).toContain('LOG-TUT-DONE');
    expect(play).toHaveBeenCalledWith('sector');
    play.mockRestore();
  });
});
