/**
 * Lore-driven field SFX — Phaser-free so v1 and v2 can share the mapping.
 */
import type { LoreId } from '../../data/lore';
import { getSector } from '../../data/encounters';
import type { Action, Enemy, GameState } from '../../sim';
import { enterSfxForLayout, sfx } from '../../audio/sfx';
import { layoutForSector } from '../../map/layoutKind';
import { Theme } from '../../scenes/theme';

export type FlashFn = (color: number, alpha: number) => void;

export type EnemySnap = {
  id: number;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  kind: Enemy['kind'];
};

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
    const sector = getSector(state.sectorIndex);
    sfx.play(enterSfxForLayout(layoutForSector(sector.id)));
    return;
  }
  if (has('LOG-TUT-DONE')) {
    sfx.play(enterSfxForLayout(layoutForSector(state.sectorId)));
    return;
  }
  if (has('LOG-USED-KEY')) {
    sfx.play('beacon');
    flash(Theme.flag, 0.28);
    return;
  }
  if (has('LOG-HS-START') || has('LOG-HS-TICK')) {
    sfx.play('handshake');
    return;
  }
  if (
    has('LOG-ION-PULSE') ||
    has('LOG-ION-FRONT') ||
    has('LOG-ION-FAULT') ||
    has('LOG-ION-VENT') ||
    has('LOG-ION-ASH') ||
    has('LOG-ION-BRINE') ||
    has('LOG-ION-WAKE-FAULT') ||
    has('LOG-ION-WAKE-VENT') ||
    has('LOG-ION-WAKE-ASH') ||
    has('LOG-ION-WAKE-BRINE')
  ) {
    sfx.play('ion_pulse');
    return;
  }
  if (has('LOG-GOT-KEY') || has('LOG-GOT-CORE')) {
    sfx.play('quest');
    flash(Theme.flag, 0.3);
    return;
  }
  if (has('LOG-LEVEL')) {
    sfx.play('level');
    flash(Theme.inkBright, 0.22);
    return;
  }
  if (has('LOG-EXTRACT')) {
    sfx.play('extract');
    flash(Theme.safe, 0.35);
    return;
  }
  if (has('LOG-BUS-WARN') || has('LOG-BUS-FAILING')) {
    sfx.play('warn');
  }
  if (has('LOG-TELE-BEAM')) sfx.play('telegraph_beam');
  if (has('LOG-TELE-OVERWATCH')) sfx.play('telegraph_hold');
  if (has('LOG-TELE-SWELL') || has('LOG-TELE-ZONE')) sfx.play('telegraph_pulse');
  if (has('LOG-TELE-POUNCE') || has('LOG-TELE-REACH')) sfx.play('telegraph_charge');
  if (has('LOG-BEAM-FIRE')) sfx.play('enemy_beam');
  if (has('LOG-ZONE-PULSE') || has('LOG-SPORE-BURST')) sfx.play('enemy_pulse');
  if (has('LOG-UPLINK-WAVE-HIT')) sfx.play('enemy');
  if (has('LOG-ARMOR-ABSORB') && !has('LOG-HURT') && !has('LOG-ALLY-HURT')) {
    sfx.play('armor');
  }
  if (state.player.hp < prev.prevHp || has('LOG-HURT')) {
    sfx.play('hurt');
  } else if (has('LOG-ALLY-HURT') || has('LOG-ALLY-DOWN')) {
    sfx.play('enemy');
  }
  const alive = state.enemies.filter((en) => en.alive).length;
  if (alive < prev.prevAlive || has('LOG-KILL') || has('LOG-ALLY-KILL')) {
    sfx.play('kill');
    return;
  }
  if (has('LOG-HIT') || has('LOG-ALLY-HIT')) {
    sfx.play('hit');
    return;
  }
  if (has('LOG-USE-PHASER')) {
    sfx.play('player_beam');
    return;
  }
  if (has('LOG-USE-FLARE')) {
    sfx.play('flare');
    return;
  }
  if (
    has('LOG-USE-PROBE') ||
    has('LOG-USE-STIM') ||
    has('LOG-USE-FILTER') ||
    has('LOG-USE-DART')
  ) {
    sfx.play('kit_spend');
    return;
  }
  if (
    has('LOG-USE-MED') ||
    has('LOG-USE-ENERGY') ||
    has('LOG-USE-PLATE') ||
    has('LOG-USE-BLADE') ||
    has('LOG-USE-BATON') ||
    has('LOG-USE-PHASER-EQUIP') ||
    has('LOG-USE-HARNESS') ||
    has('LOG-USE-VEST') ||
    has('LOG-UNEQUIP') ||
    has('LOG-USE-SEALANT')
  ) {
    sfx.play('use');
    return;
  }
  if (has('LOG-PICKUP')) {
    sfx.play('pickup');
    return;
  }
  if (
    has('LOG-MOVE-BLOCKED') ||
    has('LOG-EXIT-BLOCKED') ||
    has('LOG-INTERACT-MISS') ||
    has('LOG-SEALED-BLOCK') ||
    has('LOG-SEALED-NEED-TOOL') ||
    has('LOG-EXIT-NEED-KEY') ||
    has('LOG-EXIT-NEED-CORE') ||
    has('LOG-EXIT-NEED-BEACON') ||
    has('LOG-NEED-KEY') ||
    has('LOG-NEED-CORE') ||
    has('LOG-USE-EMPTY') ||
    has('LOG-USE-FAIL') ||
    has('LOG-USE-NO-POWER') ||
    has('LOG-JAM-BLOCK')
  ) {
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

/** Fauna closing distance while alerted — layered under player move, not instead. */
export function playEnemyMotionSfx(
  state: GameState,
  prevEnemySnap: ReadonlyArray<EnemySnap>,
  newLogs: ReadonlyArray<LoreId>,
): void {
  if (
    newLogs.includes('LOG-HIT') ||
    newLogs.includes('LOG-KILL') ||
    newLogs.includes('LOG-HURT') ||
    newLogs.includes('LOG-ALLY-HIT') ||
    newLogs.includes('LOG-ALLY-KILL')
  ) {
    return;
  }
  const px = state.player.x;
  const py = state.player.y;
  const prevById = new Map(prevEnemySnap.map((e) => [e.id, e]));
  for (const en of state.enemies) {
    if (!en.alive || !en.alerted) continue;
    const prev = prevById.get(en.id);
    if (!prev?.alive) continue;
    if (prev.x === en.x && prev.y === en.y) continue;
    const before = Math.abs(prev.x - px) + Math.abs(prev.y - py);
    const after = Math.abs(en.x - px) + Math.abs(en.y - py);
    if (after < before && after <= 5) {
      sfx.play('scuttle');
      return;
    }
  }
}
