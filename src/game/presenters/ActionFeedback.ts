import Phaser from 'phaser';
import type { LoreId } from '../../data/lore';
import type { Action, Enemy, GameState } from '../../sim';
import { sfx } from '../../audio/sfx';
import { Theme, ThemeCss } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import { MOVE_MS } from '../GameHost';
import type { LightView } from '../views/LightView';

export type EnemyView = {
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  gx: number;
  gy: number;
};

export type FlashFn = (color: number, alpha: number) => void;

export type ActionFloat = {
  label: string;
  color: string;
};

/**
 * Select short, causal labels for recent events. The log remains the complete
 * history; these are deliberately transient presentation cues.
 */
export function actionFloatLabels(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
): ActionFloat[] {
  const labels: ActionFloat[] = [];
  for (const log of logs) {
    let next: ActionFloat | null = null;
    switch (log.loreId) {
      case 'LOG-ARMOR-ABSORB':
        next = { label: `SHD ${log.detail ?? 'HIT'}`, color: ThemeCss.phosphorBright };
        break;
      case 'LOG-DRAIN':
        next = { label: `BUS ${log.detail ?? '-2E'}`, color: '#ff9933' };
        break;
      case 'LOG-QUIET-ON':
        next = { label: 'QUIET · FOV -2 · AGGRO -3', color: '#a8d0ff' };
        break;
      case 'LOG-QUIET-OFF':
        next = { label: 'QUIET OFF', color: ThemeCss.phosphorDim };
        break;
      case 'LOG-SURVEY-ROOM':
      case 'LOG-SURVEY-SECTOR':
        next = { label: `WINDOW ${log.detail ?? '+'}`, color: ThemeCss.quest };
        break;
      case 'LOG-TELE-POUNCE':
      case 'LOG-BOSS-TELE':
        next = { label: 'POUNCE INCOMING', color: ThemeCss.danger };
        break;
      case 'LOG-SEALED-OPEN':
      case 'LOG-SEALED-PRY':
        next = { label: 'HATCH OPEN', color: '#44aa88' };
        break;
      case 'LOG-CRAFT-FILTER':
        next = { label: 'CRAFT · FILTER', color: ThemeCss.quest };
        break;
      case 'LOG-CRAFT-RATION':
        next = { label: 'CRAFT · RATION', color: ThemeCss.quest };
        break;
      case 'LOG-CRAFT-BALM':
        next = { label: 'CRAFT · BALM', color: ThemeCss.quest };
        break;
    }
    if (next) labels.push(next);
  }
  return labels.slice(-2);
}

/**
 * Emit ephemeral field lights from combat / kit / handshake lore events.
 * Presentation-only — called after applyAction.
 */
export function emitActionLights(
  lights: LightView,
  opts: {
    newLogs: LoreId[];
    player: { x: number; y: number };
    hitTiles: { x: number; y: number }[];
    sporeTiles: { x: number; y: number }[];
    beaconPos?: { x: number; y: number } | null;
  },
): void {
  const { newLogs, player, hitTiles, sporeTiles, beaconPos } = opts;
  const has = (id: LoreId) => newLogs.includes(id);

  if (has('LOG-USE-FLARE')) {
    // Presentation bloom — sim already owns the lasting lightSource
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 5.5,
      color: 0xccffff,
      intensity: 1.35,
      life: 4,
    });
  }

  if (has('LOG-SPORE-BURST')) {
    for (const t of sporeTiles) {
      lights.addFxLight({
        x: t.x,
        y: t.y,
        radius: 3,
        color: 0x66ffaa,
        intensity: 0.8,
        life: 3,
      });
    }
    if (sporeTiles.length === 0) {
      lights.addFxLight({
        x: player.x,
        y: player.y,
        radius: 3,
        color: 0x66ffaa,
        intensity: 0.75,
        life: 3,
      });
    }
  }

  if (has('LOG-HIT') || has('LOG-KILL') || has('LOG-ALLY-HIT') || has('LOG-ALLY-KILL')) {
    for (const t of hitTiles) {
      lights.addFxLight({
        x: t.x,
        y: t.y,
        radius: 2,
        color: 0xffffff,
        intensity: 0.9,
        life: 1,
      });
    }
  }

  if (has('LOG-SURVEY-ROOM') || has('LOG-SURVEY-SECTOR')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 4,
      color: Theme.storm,
      intensity: 0.75,
      life: 2,
    });
  }

  if (has('LOG-NPC-HAIL') || has('LOG-ALLY-UP') || has('LOG-NPC-SIGHT')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 3.5,
      color: 0xa8d0ff,
      intensity: 0.7,
      life: 2,
    });
  }

  if (has('LOG-USE-PROBE') || has('LOG-USE-LENS')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 6,
      color: 0xa8d0ff,
      intensity: 0.7,
      life: 2,
    });
  }

  if (has('LOG-HS-START') || has('LOG-HS-TICK')) {
    lights.addFxLight({
      x: beaconPos?.x ?? player.x,
      y: beaconPos?.y ?? player.y,
      radius: 4.5,
      color: Theme.storm,
      intensity: 0.85,
      life: 2,
    });
  }

  if (has('LOG-PB-DESYNC')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 2.5,
      color: 0xcc88ff,
      intensity: 0.65,
      life: 3,
    });
  }
}

/** Screen flash via a full-bleed rectangle + short fade tween. */
export function flashScreen(
  tweens: Phaser.Tweens.TweenManager,
  flash: Phaser.GameObjects.Rectangle,
  color: number,
  alpha: number,
): void {
  flash.setFillStyle(color, 1);
  flash.setAlpha(alpha);
  tweens.add({ targets: flash, alpha: 0, duration: 120 });
}

export function flashHit(
  tweens: Phaser.Tweens.TweenManager,
  flash: Phaser.GameObjects.Rectangle,
): void {
  flashScreen(tweens, flash, Theme.phosphorBright, 0.35);
}

/**
 * SFX + milestone flashes from lore / HP deltas after applyAction.
 * Presenters own audio — views must not call sfx.
 */
export function playActionSfx(
  state: GameState,
  prev: {
    action: Action;
    prevSector: number;
    prevHp: number;
    prevLogLen: number;
    prevAlive: number;
    fromPlayer: { x: number; y: number };
  },
  flash: FlashFn,
): void {
  const newLogs = state.log.slice(prev.prevLogLen).map((l) => l.loreId);
  const has = (id: LoreId) => newLogs.includes(id);

  if (state.status === 'won') {
    // End scene plays win fanfare
    return;
  }
  if (state.status === 'lost') return;

  if (state.sectorIndex !== prev.prevSector) {
    sfx.play('sector');
    return;
  }
  if (has('LOG-USED-KEY')) {
    sfx.play('beacon');
    flash(Theme.quest, 0.28);
    return;
  }
  if (has('LOG-GOT-KEY') || has('LOG-GOT-CORE')) {
    sfx.play('quest');
    flash(Theme.quest, 0.3);
    return;
  }
  if (has('LOG-LEVEL')) {
    sfx.play('level');
    flash(Theme.phosphorBright, 0.22);
    return;
  }
  if (has('LOG-EXTRACT')) {
    sfx.play('extract');
    flash(Theme.ok, 0.35);
    return;
  }
  if (has('LOG-STORM-WARN')) {
    sfx.play('warn');
  }
  if (has('LOG-ARMOR-ABSORB') && !has('LOG-HURT')) {
    sfx.play('armor');
  }
  if (state.player.hp < prev.prevHp || has('LOG-HURT')) {
    sfx.play('hurt');
  }
  const alive = state.enemies.filter((en) => en.alive).length;
  if (alive < prev.prevAlive || has('LOG-KILL')) {
    sfx.play('kill');
    return;
  }
  if (has('LOG-HIT')) {
    sfx.play('hit');
    return;
  }
  if (
    has('LOG-USE-MED') ||
    has('LOG-USE-ENERGY') ||
    has('LOG-USE-RATION') ||
    has('LOG-USE-PROBE') ||
    has('LOG-USE-STIM') ||
    has('LOG-USE-PLATE') ||
    has('LOG-USE-FLARE') ||
    has('LOG-USE-FILTER') ||
    has('LOG-USE-COOLANT') ||
    has('LOG-USE-BLADE') ||
    has('LOG-USE-BATON') ||
    has('LOG-USE-HARNESS') ||
    has('LOG-USE-VEST') ||
    has('LOG-USE-SENSOR') ||
    has('LOG-USE-COUPLER') ||
    has('LOG-UNEQUIP') ||
    has('LOG-USE-DART') ||
    has('LOG-USE-JAMMER') ||
    has('LOG-USE-SEALANT')
  ) {
    sfx.play('use');
    return;
  }
  if (has('LOG-PICKUP')) {
    sfx.play('pickup');
    return;
  }
  if (has('LOG-MOVE-BLOCKED') || has('LOG-EXIT-BLOCKED') || has('LOG-NEED-KEY') || has('LOG-NEED-CORE')) {
    sfx.play('blocked');
    return;
  }
  if (
    prev.action.type === 'move' &&
    (prev.fromPlayer.x !== state.player.x || prev.fromPlayer.y !== state.player.y)
  ) {
    sfx.play('move');
    return;
  }
  if (prev.action.type === 'wait') {
    sfx.play('ui');
  }
}

export type EnemySnap = {
  id: number;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  kind: Enemy['kind'];
};

/** Hit / spore tiles from enemy HP / death deltas this action. */
export function combatFeedbackTiles(
  state: GameState,
  prevEnemySnap: EnemySnap[],
): { hitTiles: { x: number; y: number }[]; sporeTiles: { x: number; y: number }[] } {
  const hitTiles: { x: number; y: number }[] = [];
  const sporeTiles: { x: number; y: number }[] = [];
  for (const prev of prevEnemySnap) {
    const cur = state.enemies.find((e) => e.id === prev.id);
    if (!prev.alive || !cur) continue;
    if (cur.hp < prev.hp || (!cur.alive && prev.alive)) {
      hitTiles.push({ x: cur.x, y: cur.y });
    }
    if (prev.alive && !cur.alive && prev.kind === 'spore') {
      sporeTiles.push({ x: prev.x, y: prev.y });
    }
  }
  return { hitTiles, sporeTiles };
}

/**
 * SFX, lights, and in-sector flashes after applyAction.
 * Sector-change rebuild / move tweens stay orchestrated by the scene.
 */
export function presentActionFeedback(opts: {
  state: GameState;
  action: Action;
  prevSector: number;
  prevHp: number;
  prevLogLen: number;
  prevAlive: number;
  fromPlayer: { x: number; y: number };
  prevEnemySnap: EnemySnap[];
  lights: LightView;
  flash: FlashFn;
  /** Brief white tint on visible enemy sprites that took hits. */
  tintHitEnemies?: () => void;
}): {
  newLogs: LoreId[];
  sectorChanged: boolean;
  playerMoved: boolean;
  enemyMoved: boolean;
  fromEnemies: Map<number, { x: number; y: number }>;
} {
  const {
    state,
    action,
    prevSector,
    prevHp,
    prevLogLen,
    prevAlive,
    fromPlayer,
    prevEnemySnap,
    lights,
    flash,
    tintHitEnemies,
  } = opts;

  const fromEnemies = new Map(
    prevEnemySnap.filter((en) => en.alive).map((en) => [en.id, { x: en.x, y: en.y }]),
  );

  playActionSfx(
    state,
    { action, prevSector, prevHp, prevLogLen, prevAlive, fromPlayer },
    flash,
  );

  const newLogs = state.log.slice(prevLogLen).map((l) => l.loreId);
  const { hitTiles, sporeTiles } = combatFeedbackTiles(state, prevEnemySnap);
  emitActionLights(lights, {
    newLogs,
    player: { x: state.player.x, y: state.player.y },
    hitTiles,
    sporeTiles,
    beaconPos: state.beaconPos,
  });

  const sectorChanged = state.sectorIndex !== prevSector;
  if (!sectorChanged) {
    const flareOrBurst = newLogs.some((id) => id === 'LOG-USE-FLARE' || id === 'LOG-SPORE-BURST');
    if (flareOrBurst) flash(Theme.ionHazard, 0.22);
    if (state.player.hp < prevHp) flash(Theme.phosphorBright, 0.35);
    if (newLogs.some((id) => id === 'LOG-HIT' || id === 'LOG-KILL')) {
      tintHitEnemies?.();
    }
  }

  const playerMoved = fromPlayer.x !== state.player.x || fromPlayer.y !== state.player.y;
  const enemyMoved = state.enemies.some((en) => {
    if (!en.alive) return false;
    const prev = fromEnemies.get(en.id);
    return !prev || prev.x !== en.x || prev.y !== en.y;
  });

  return { newLogs, sectorChanged, playerMoved, enemyMoved, fromEnemies };
}

export function bumpAttack(
  tweens: Phaser.Tweens.TweenManager,
  playerSprite: Phaser.GameObjects.Image,
  worldXY: (gx: number, gy: number) => { x: number; y: number },
  player: { x: number; y: number },
  dx: number,
  dy: number,
): void {
  const base = worldXY(player.x, player.y);
  playerSprite.setPosition(base.x, base.y);
  tweens.add({
    targets: playerSprite,
    x: base.x + dx * 6,
    y: base.y + dy * 6,
    duration: 50,
    yoyo: true,
    ease: 'Quad.easeOut',
  });
}

/** Nudge adjacent enemies that struck the player without moving. */
export function bumpMeleeAttackers(
  tweens: Phaser.Tweens.TweenManager,
  opts: {
    state: GameState;
    fromEnemies: Map<number, { x: number; y: number }>;
    enemyViews: Map<number, EnemyView>;
    worldXY: (gx: number, gy: number) => { x: number; y: number };
  },
): void {
  const { state, fromEnemies, enemyViews, worldXY } = opts;
  const px = state.player.x;
  const py = state.player.y;
  for (const en of state.enemies) {
    if (!en.alive) continue;
    const prev = fromEnemies.get(en.id);
    if (!prev || prev.x !== en.x || prev.y !== en.y) continue;
    if (Math.abs(en.x - px) + Math.abs(en.y - py) !== 1) continue;
    const view = enemyViews.get(en.id);
    if (!view?.img.visible) continue;
    const base = worldXY(en.x, en.y);
    const dx = Math.sign(px - en.x);
    const dy = Math.sign(py - en.y);
    view.img.setPosition(base.x, base.y);
    tweens.add({
      targets: view.img,
      x: base.x + dx * 5,
      y: base.y + dy * 5,
      duration: 45,
      yoyo: true,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        if (view.label.active) view.label.setPosition(view.img.x - 6, view.img.y - 10);
      },
    });
  }
}

export type MoveAnimHost = {
  setAnimating(v: boolean): void;
  worldXY(gx: number, gy: number): { x: number; y: number };
  tweens: Phaser.Tweens.TweenManager;
  time: Phaser.Time.Clock;
  playerSprite: Phaser.GameObjects.Image;
  enemyViews: Map<number, EnemyView>;
  state: GameState;
  syncActors(snapPositions: boolean): void;
  snapImg(img: Phaser.GameObjects.Image, gx: number, gy: number): void;
};

/**
 * Stage player move, then enemy moves, then invoke onDone (FOV/HUD redraw + queue flush).
 */
export function playMoveAnims(
  host: MoveAnimHost,
  fromPlayer: { x: number; y: number },
  fromEnemies: Map<number, { x: number; y: number }>,
  onDone: () => void,
): void {
  host.setAnimating(true);
  let finished = false;
  const complete = () => {
    if (finished) return;
    finished = true;
    host.setAnimating(false);
    onDone();
  };

  const tweenActor = (
    img: Phaser.GameObjects.Image,
    label: Phaser.GameObjects.Text | null,
    from: { x: number; y: number },
    to: { x: number; y: number },
    done: () => void,
  ) => {
    const a = host.worldXY(from.x, from.y);
    const b = host.worldXY(to.x, to.y);
    img.setPosition(a.x, a.y);
    if (label) label.setPosition(a.x - 6, a.y - 10);
    host.tweens.add({
      targets: img,
      x: b.x,
      y: b.y,
      duration: MOVE_MS,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        if (label && label.active) label.setPosition(img.x - 6, img.y - 10);
      },
      onComplete: () => {
        if (img.active) img.setDisplaySize(TILE_DRAW, TILE_DRAW);
        done();
      },
    });
  };

  host.syncActors(false);

  const px = host.state.player.x;
  const py = host.state.player.y;
  const playerMoved = fromPlayer.x !== px || fromPlayer.y !== py;

  const runEnemyPhase = () => {
    let pending = 0;
    let phaseDone = false;
    const finishEnemy = () => {
      pending -= 1;
      if (pending > 0 || phaseDone) return;
      phaseDone = true;
      complete();
    };

    for (const en of host.state.enemies) {
      if (!en.alive) continue;
      const view = host.enemyViews.get(en.id);
      if (!view) continue;
      const prev = fromEnemies.get(en.id) ?? { x: en.x, y: en.y };
      if (prev.x !== en.x || prev.y !== en.y) {
        pending += 1;
        tweenActor(view.img, view.label, prev, { x: en.x, y: en.y }, finishEnemy);
        view.gx = en.x;
        view.gy = en.y;
      }
    }

    if (pending === 0) {
      complete();
      return;
    }

    host.time.delayedCall(MOVE_MS + 120, () => {
      if (!phaseDone) {
        phaseDone = true;
        complete();
      }
    });
  };

  if (playerMoved) {
    tweenActor(host.playerSprite, null, fromPlayer, { x: px, y: py }, runEnemyPhase);
    host.time.delayedCall(MOVE_MS * 2 + 160, () => {
      if (!finished) complete();
    });
  } else {
    host.snapImg(host.playerSprite, px, py);
    runEnemyPhase();
    host.time.delayedCall(MOVE_MS + 120, () => {
      if (!finished) complete();
    });
  }
}

/** Brief white tint on visible enemies after a player hit/kill. */
export function tintVisibleEnemies(
  time: Phaser.Time.Clock,
  enemyViews: Iterable<EnemyView>,
): void {
  for (const view of enemyViews) {
    if (!view.img.visible) continue;
    view.img.setTint(0xffffff);
    time.delayedCall(80, () => {
      if (view.img.active) view.img.clearTint();
    });
  }
}
