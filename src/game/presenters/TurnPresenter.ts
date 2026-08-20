import type { LoreId } from '../../data/lore';
import { music } from '../../audio/music';
import { applyAction, type Action, type GameState } from '../../sim';
import { flankPenalty } from '../../sim/combat';
import { computeShearPressure } from './ShearPressure';
import type { LightView } from '../views/LightView';
import {
  PHASER_BEAM_MS,
  phaserBeamTargetTile,
  playCombatContactJuice,
  playMoveAnims,
  playPhaserBeam,
  presentActionFeedback,
  tintPlayerHurt,
  tintVisibleEnemies,
  type EnemyView,
} from './ActionFeedback';

export type TurnCommitHost = {
  getState(): GameState;
  setAnimating(v: boolean): void;
  clearQueuedAction(): void;
  releaseFirstLight(): void;
  flashFx(color: number, alpha: number): void;
  playEventCamera(logs: readonly LoreId[]): void;
  queueLightPreferenceHint(): void;
  redrawHudEager(): void;
  resetLevelTooltips(): void;
  buildMapSprites(): void;
  syncItems(): void;
  syncActors(snap: boolean): void;
  redrawTilesAndHud(): void;
  updateCamera(snap: boolean): void;
  syncFieldAudio(force?: boolean): void;
  startFirstLight(): void;
  showActionFloats(
    logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
    opts?: {
      vitals?: { hpDelta?: number; energyDelta?: number; armorDelta?: number };
      flankBefore?: number;
      flankAfter?: number;
    },
  ): void;
  flashHit(): void;
  maybeEnd(): void;
  flushQueuedAction(): void;
  threatNearby(): boolean;
  applyFieldLighting(): void;
  refreshMoveLightFx(): void;
  setMoveLightFxStep(step: number): void;
  lightView: LightView;
  tweens: Phaser.Tweens.TweenManager;
  time: Phaser.Time.Clock;
  playerSprite: Phaser.GameObjects.Image;
  enemyViews: Map<number, EnemyView>;
  lightLayer: Phaser.GameObjects.Container;
  worldXY(gx: number, gy: number): { x: number; y: number };
  moveAnimHost(): Parameters<typeof playMoveAnims>[0];
  tileSprites: Phaser.GameObjects.Image[][];
  tileKey(kind: string, x: number, y: number): string;
};

/** Turn commit orchestration — extracted from GameScene. */
export function runTurnCommit(host: TurnCommitHost, action: Action): void {
  const state = host.getState();
  host.clearQueuedAction();
  host.releaseFirstLight();

  const prevSector = state.sectorIndex;
  const prevTutorialActive = state.tutorialActive;
  const prevMapWidth = state.width;
  const prevMapHeight = state.height;
  const prevHp = state.player.hp;
  const prevEnergy = state.player.energy;
  const prevArmor = state.player.armor;
  const prevFlank = flankPenalty(state);
  const prevLogLen = state.log.length;
  const prevAlive = state.enemies.filter((en) => en.alive).length;
  const fromPlayer = { x: state.player.x, y: state.player.y };
  const prevEnemySnap = state.enemies.map((en) => ({
    id: en.id,
    x: en.x,
    y: en.y,
    hp: en.hp,
    alive: en.alive,
    kind: en.kind,
  }));
  const prevAllySnap = state.allies.map((a) => ({
    id: a.id,
    x: a.x,
    y: a.y,
    alive: a.alive,
  }));
  const prevNpcSnap = state.npcs.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
  }));

  applyAction(state, action);

  const fb = presentActionFeedback({
    state,
    action,
    prevSector,
    prevTutorialActive,
    prevMapWidth,
    prevMapHeight,
    prevHp,
    prevLogLen,
    prevAlive,
    fromPlayer,
    prevEnemySnap,
    prevAllySnap,
    prevNpcSnap,
    lights: host.lightView,
    flash: (color, alpha) => host.flashFx(color, alpha),
    tintHitEnemies: () => tintVisibleEnemies(host.time, host.enemyViews.values()),
  });
  host.playEventCamera(fb.newLogs);
  host.queueLightPreferenceHint();
  const floatOpts = {
    vitals: {
      hpDelta: state.player.hp - prevHp,
      energyDelta: state.player.energy - prevEnergy,
      armorDelta: state.player.armor - prevArmor,
    },
    flankBefore: prevFlank,
    flankAfter: flankPenalty(state),
  };
  if (state.player.hp < prevHp) {
    tintPlayerHurt(host.time, host.playerSprite);
  }
  if (!fb.mapReloaded) host.redrawHudEager();

  if (fb.mapReloaded) {
    host.resetLevelTooltips();
    host.lightView.clearFx();
    host.buildMapSprites();
    host.syncItems();
    host.syncActors(true);
    host.redrawTilesAndHud();
    host.updateCamera(true);
    host.syncFieldAudio(true);
    host.startFirstLight();
    host.showActionFloats(state.log.slice(prevLogLen), floatOpts);
    if (state.player.hp < prevHp) host.flashHit();
    host.maybeEnd();
    host.flushQueuedAction();
    return;
  }

  host.showActionFloats(state.log.slice(prevLogLen), floatOpts);

  music.syncField({
    sectorId: state.sectorId,
    sectorIndex: state.sectorIndex,
    playerEnergy: state.player.energy,
    maxEnergy: state.player.maxEnergy,
    inCombat: host.threatNearby(),
    shearState: computeShearPressure(state).state,
    ionFrontTurns: state.ionFrontTurns,
  });

  if (fb.playerMoved) {
    host.lightView.captureMoveFrom(fromPlayer, {
      x: state.player.x,
      y: state.player.y,
    });
  }
  host.applyFieldLighting();
  if (fb.playerMoved) {
    host.setMoveLightFxStep(-1);
    host.lightView.lockMoveBlend(host.tileSprites, state.sectorId);
    host.lightView.paintMoveTextures(state, host.tileSprites, (kind, x, y) =>
      host.tileKey(kind, x, y),
    );
    host.lightView.setMoveLightProgress(0, host.tileSprites);
    host.refreshMoveLightFx();
  }
  host.syncItems();

  const phaserTarget = phaserBeamTargetTile(
    fb.newLogs,
    fromPlayer,
    fb.hitTiles,
    action,
    state,
  );
  if (phaserTarget) {
    playPhaserBeam(
      host.tweens,
      host.lightLayer,
      (gx, gy) => host.worldXY(gx, gy),
      fromPlayer,
      { x: phaserTarget.x, y: phaserTarget.y },
    );
  }

  const afterPresent = (opts?: { juice?: boolean }) => {
    if (opts?.juice !== false) {
      playCombatContactJuice(host.tweens, {
        action,
        playerMoved: fb.playerMoved,
        prevHp,
        state,
        playerSprite: host.playerSprite,
        enemyViews: host.enemyViews,
        worldXY: (gx, gy) => host.worldXY(gx, gy),
      });
    }
    host.lightView.endMoveLight();
    host.redrawTilesAndHud();
    host.syncActors(true);
    host.maybeEnd();
    host.flushQueuedAction();
  };

  if (fb.playerMoved || fb.enemyMoved) {
    playMoveAnims(host.moveAnimHost(), fromPlayer, fb.fromEnemies, afterPresent, {
      fromAllies: fb.fromAllies,
      fromNpcs: fb.fromNpcs,
    });
    return;
  }

  if (phaserTarget) {
    playCombatContactJuice(host.tweens, {
      action,
      playerMoved: fb.playerMoved,
      prevHp,
      state,
      playerSprite: host.playerSprite,
      enemyViews: host.enemyViews,
      worldXY: (gx, gy) => host.worldXY(gx, gy),
    });
    host.setAnimating(true);
    host.time.delayedCall(PHASER_BEAM_MS, () => {
      host.setAnimating(false);
      afterPresent({ juice: false });
    });
    return;
  }

  afterPresent();
}
