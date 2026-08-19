import Phaser from 'phaser';
import type { LoreId } from '../../data/lore';
import type { Action, Enemy, GameState } from '../../sim';
import {
  findPhaserTarget,
  PHASER_RANGE_MAX,
  PHASER_RANGE_MIN,
} from '../../sim/phaser';
import { sfx } from '../../audio/sfx';
import { LightTemp, Theme, ThemeCss } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import { MOVE_MS } from '../GameHost';
import type { LightView } from '../views/LightView';

export type EnemyView = {
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  gx: number;
  gy: number;
  /** Collapse tween in flight — skip lighting, tints, and a second teardown. */
  dying?: boolean;
};

export type FlashFn = (color: number, alpha: number) => void;

export type ActionFloat = {
  label: string;
  color: string;
};

/** Signed vitals deltas for kit / hurt floats when log detail is narrative. */
export type ActionFloatVitals = {
  hpDelta?: number;
  energyDelta?: number;
  armorDelta?: number;
};

/** Announce when encirclement appears or clears — DEF readout alone is easy to miss. */
export function flankEdgeFloat(before: number, after: number): ActionFloat | null {
  if (before === after) return null;
  if (after > before) {
    return { label: `FLANK −${after} DEF`, color: ThemeCss.rust };
  }
  return { label: 'FLANK CLEAR', color: ThemeCss.safe };
}

function signedDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Prefer a short combat subject · damage pair from formatCombatDetail. */
function shortCombatDetail(detail: string | undefined): string | null {
  if (!detail) return null;
  return detail.split(' · ').slice(0, 2).join(' · ');
}

function labelMentions(labels: ReadonlyArray<ActionFloat>, re: RegExp): boolean {
  return labels.some((l) => re.test(l.label));
}

/**
 * When a vitals channel moved but no log float already named it, print the
 * delta — catches hazard Power tax, armor-only hits with odd logs, etc.
 */
export function appendMissingVitalsFloats(
  labels: ActionFloat[],
  vitals?: ActionFloatVitals,
): ActionFloat[] {
  if (!vitals) return labels;
  const extra: ActionFloat[] = [];
  if (
    vitals.hpDelta !== undefined &&
    vitals.hpDelta !== 0 &&
    !labelMentions(labels, /\bHP\b|BLEED/)
  ) {
    extra.push({
      label: `HP ${signedDelta(vitals.hpDelta)}`,
      color: vitals.hpDelta > 0 ? ThemeCss.safe : ThemeCss.rust,
    });
  }
  if (
    vitals.armorDelta !== undefined &&
    vitals.armorDelta !== 0 &&
    !labelMentions(labels, /\bSHIELD\b/)
  ) {
    extra.push({
      label: `SHIELD ${signedDelta(vitals.armorDelta)}`,
      color: ThemeCss.inkBright,
    });
  }
  if (
    vitals.energyDelta !== undefined &&
    vitals.energyDelta !== 0 &&
    !labelMentions(labels, /\bPOWER\b|BURN/)
  ) {
    extra.push({
      label: `POWER ${signedDelta(vitals.energyDelta)}`,
      color: vitals.energyDelta > 0 ? ThemeCss.tape : ThemeCss.arc,
    });
  }
  return extra.length ? [...labels, ...extra] : labels;
}

/**
 * Select short, causal labels for recent events. The log remains the complete
 * history; these are deliberately transient presentation cues.
 */
export function collectActionFloatLabels(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  vitals?: ActionFloatVitals,
): ActionFloat[] {
  const labels: ActionFloat[] = [];
  for (const log of logs) {
    let next: ActionFloat | null = null;
    switch (log.loreId) {
      case 'LOG-ARMOR-ABSORB':
        next = {
          label:
            vitals?.armorDelta !== undefined && vitals.armorDelta !== 0
              ? `SHIELD ${signedDelta(vitals.armorDelta)}`
              : `SHIELD ${log.detail ?? 'HIT'}`,
          color: ThemeCss.inkBright,
        };
        break;
      case 'LOG-DRAIN':
      case 'LOG-BEAM-FIRE':
        next = {
          label: log.detail
            ? `POWER ${shortCombatDetail(log.detail) ?? log.detail}`
            : vitals?.energyDelta !== undefined && vitals.energyDelta !== 0
              ? `POWER ${signedDelta(vitals.energyDelta)}`
              : 'POWER DRAIN',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-HAZARD':
      case 'LOG-BRINE-POOL':
      case 'LOG-CONTAMINATION':
      case 'LOG-ION-PULSE':
      case 'LOG-UPLINK-WAVE-HIT':
        next = {
          label:
            vitals?.energyDelta !== undefined && vitals.energyDelta !== 0
              ? `POWER ${signedDelta(vitals.energyDelta)}`
              : log.detail
                ? `POWER ${shortCombatDetail(log.detail) ?? log.detail}`
                : 'POWER DRAIN',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-SHADOW-BITE':
        next = { label: 'SHADOW +1', color: ThemeCss.rust };
        break;
      case 'LOG-HURT':
        next = {
          label:
            vitals?.hpDelta !== undefined && vitals.hpDelta < 0
              ? `HP ${signedDelta(vitals.hpDelta)}`
              : shortCombatDetail(log.detail)
                ? `HP · ${shortCombatDetail(log.detail)}`
                : 'HP HIT',
          color: ThemeCss.rust,
        };
        break;
      case 'LOG-HIT':
        next = {
          label: shortCombatDetail(log.detail)
            ? `HIT · ${shortCombatDetail(log.detail)}`
            : 'HIT',
          color: ThemeCss.flag,
        };
        break;
      case 'LOG-STATUS-BLEED':
        next = {
          label:
            vitals?.hpDelta !== undefined && vitals.hpDelta < 0
              ? `BLEED · HP ${signedDelta(vitals.hpDelta)}`
              : 'BLEED',
          color: ThemeCss.rust,
        };
        break;
      case 'LOG-STATUS-ION':
        next = {
          label:
            vitals?.energyDelta !== undefined && vitals.energyDelta < 0
              ? `BURN · POWER ${signedDelta(vitals.energyDelta)}`
              : 'BURN · POWER',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-STATUS-BLIND':
        next = { label: 'BLIND', color: ThemeCss.inkDim };
        break;
      case 'LOG-STATUS-JAM':
        next = { label: 'JAMMED', color: ThemeCss.rust };
        break;
      case 'LOG-STATUS-MARKED':
        next = { label: 'MARKED', color: ThemeCss.tape };
        break;
      case 'LOG-USE-MED':
        next = {
          label:
            vitals?.hpDelta !== undefined && vitals.hpDelta > 0
              ? `HP ${signedDelta(vitals.hpDelta)}`
              : 'HYPO · HP',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-USE-ENERGY':
        next = {
          label:
            vitals?.energyDelta !== undefined && vitals.energyDelta > 0
              ? `POWER ${signedDelta(vitals.energyDelta)}`
              : 'POWER CELL',
          color: ThemeCss.tape,
        };
        break;
      case 'LOG-USE-PLATE':
        next = {
          label:
            vitals?.armorDelta !== undefined && vitals.armorDelta > 0
              ? `SHIELD ${signedDelta(vitals.armorDelta)}`
              : 'SHIELD CHARGE',
          color: ThemeCss.inkBright,
        };
        break;
      case 'LOG-USE-FLARE':
        next = {
          label: log.detail ? `FLARE · ${log.detail}` : 'FLARE · LIGHT',
          color: ThemeCss.tape,
        };
        break;
      case 'LOG-USE-FILTER':
        next = { label: 'FILTER ONLINE', color: ThemeCss.arc };
        break;
      case 'LOG-USE-DART':
        next = { label: 'DART · EXPOSE', color: ThemeCss.flag };
        break;
      case 'LOG-USE-PHASER':
        next = {
          label: log.detail
            ? `PHASER · ${log.detail}`
            : vitals?.energyDelta !== undefined && vitals.energyDelta < 0
              ? `PHASER · POWER ${signedDelta(vitals.energyDelta)}`
              : 'PHASER · BEAM',
          color: ThemeCss.arcWhite,
        };
        break;
      case 'LOG-USE-PHASER-EQUIP':
        next = { label: 'PHASER EQUIPPED', color: ThemeCss.arcWhite };
        break;
      case 'LOG-SALVAGE-ID':
        next = {
          label: log.detail ? `STOWED · ${log.detail}` : 'STOWED',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-SALVAGE-BAD':
        next = { label: 'SALVAGE BACKLASH', color: ThemeCss.rust };
        break;
      case 'LOG-AIM-CANCEL':
        next = { label: 'AIM CANCELLED', color: ThemeCss.inkDim };
        break;
      case 'LOG-TELE-REACH':
        next = { label: 'REACH INCOMING', color: ThemeCss.rust };
        break;
      case 'LOG-TELE-ZONE':
        next = { label: 'PULSE RING', color: ThemeCss.scanWash };
        break;
      case 'LOG-TELE-SWELL':
        next = { label: 'SWELL · BURST SOON', color: ThemeCss.arc };
        break;
      case 'LOG-ARMOR-RESEAT':
        next = {
          label:
            vitals?.armorDelta !== undefined && vitals.armorDelta > 0
              ? `SHIELD ${signedDelta(vitals.armorDelta)}`
              : 'SHIELD RESTORED',
          color: ThemeCss.inkBright,
        };
        break;
      case 'LOG-BUS-WARN':
        next = { label: 'POWER LOW', color: ThemeCss.tape };
        break;
      case 'LOG-BUS-FAILING':
        next = { label: 'POWER FAIL · LAST TURN', color: ThemeCss.rust };
        break;
      case 'LOG-HS-START':
      case 'LOG-HS-TICK':
        next = {
          label: log.detail ? `HANDSHAKE ${log.detail}` : 'HANDSHAKE',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-HS-INTERRUPT':
        next = { label: 'HANDSHAKE BROKEN', color: ThemeCss.rust };
        break;
      case 'LOG-UPLINK-START':
      case 'LOG-UPLINK-TICK':
      case 'LOG-UPLINK-HOLD':
        next = {
          label: log.detail ? `UPLINK ${log.detail}` : 'UPLINK',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-UPLINK-INTERRUPT':
        next = { label: 'UPLINK BROKEN', color: ThemeCss.rust };
        break;
      case 'LOG-EXTRACT':
        next = { label: 'EXTRACT LOCK', color: ThemeCss.safe };
        break;
      case 'LOG-PICKUP':
        next = {
          label: log.detail ? `STOWED · ${log.detail}` : 'STOWED',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-TELE-POUNCE':
      case 'LOG-BOSS-TELE':
        next = { label: 'POUNCE INCOMING', color: ThemeCss.rust };
        break;
      case 'LOG-TELE-BEAM':
        next = { label: 'BEAM READY', color: ThemeCss.arcWhite };
        break;
      case 'LOG-TELE-OVERWATCH':
        next = { label: 'OVERWATCH', color: ThemeCss.tape };
        break;
      case 'LOG-PUNISH':
        next = { label: 'OPEN · CLEAN HIT', color: ThemeCss.flag };
        break;
      case 'LOG-SEALED-OPEN':
      case 'LOG-SEALED-PRY':
        next = { label: 'SEALED OPEN', color: ThemeCss.safe };
        break;
      case 'LOG-SEALED-CACHE':
        next = {
          label: log.detail ? `CACHE ${log.detail}` : 'CACHE OPEN',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-SEALED-BLOCK':
      case 'LOG-SEALED-NEED-TOOL':
        next = { label: 'SEALED · SEALANT OR BATON', color: ThemeCss.tape };
        break;
      case 'LOG-MOVE-BLOCKED':
        next = { label: 'BLOCKED', color: ThemeCss.inkDim };
        break;
      case 'LOG-EXIT-BLOCKED':
        next = { label: 'CANNOT OPEN', color: ThemeCss.tape };
        break;
      case 'LOG-INTERACT-MISS':
        next = { label: 'STAND ON HATCH', color: ThemeCss.inkDim };
        break;
      case 'LOG-USE-EMPTY':
        next = { label: 'KIT EMPTY', color: ThemeCss.inkDim };
        break;
      case 'LOG-USE-FAIL':
        next = { label: 'SELECT AN ITEM', color: ThemeCss.inkDim };
        break;
      case 'LOG-JAM-BLOCK':
        next = { label: 'JAMMED · VISION', color: ThemeCss.rust };
        break;
      case 'LOG-EXIT-NEED-KEY':
      case 'LOG-NEED-KEY':
        next = { label: 'NEED SPLICE KEY', color: ThemeCss.tape };
        break;
      case 'LOG-EXIT-NEED-CORE':
      case 'LOG-NEED-CORE':
        next = { label: 'NEED NAV LATTICE', color: ThemeCss.flag };
        break;
      case 'LOG-EXIT-NEED-BEACON':
        next = { label: 'AUTHORIZE BEACON', color: ThemeCss.arc };
        break;
    }
    if (next) labels.push(next);
  }
  return appendMissingVitalsFloats(labels, vitals);
}

/** Pickup floats stay visible even when the turn log is noisy. */
const PICKUP_PIN_LORE = new Set<LoreId>(['LOG-PICKUP', 'LOG-SALVAGE-ID']);

function mergeCappedFloats(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  labels: ActionFloat[],
  flank?: ActionFloat | null,
): ActionFloat[] {
  const pinned = logs
    .filter((l) => PICKUP_PIN_LORE.has(l.loreId))
    .flatMap((log) => collectActionFloatLabels([log]));
  const pinnedLabels = new Set(pinned.map((p) => p.label));
  const rest = labels.filter((l) => !pinnedLabels.has(l.label));
  const reserve = pinned.length + (flank ? 1 : 0);
  const restCap = Math.max(0, ACTION_FLOAT_CAP - reserve);
  return [...rest.slice(-restCap), ...pinned, ...(flank ? [flank] : [])];
}

/** Cap floats so the newest consequences stay readable without stacking a wall. */
const ACTION_FLOAT_CAP = 3;

/** Cap at three floats — last events win so the newest consequence stays visible. */
export function actionFloatLabels(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  vitals?: ActionFloatVitals,
): ActionFloat[] {
  const all = collectActionFloatLabels(logs, vitals);
  if (all.length <= ACTION_FLOAT_CAP) return all;
  return mergeCappedFloats(logs, all);
}

/** Labels that deserve a world-anchored float — rail carries the rest. */
const WORLD_FLOAT_RES =
  /^(STOWED|HP [+-]|FLANK|SHADOW \+1|OPEN · CLEAN HIT|CACHE OPEN|EXTRACT LOCK|SEALED OPEN|HANDSHAKE BROKEN|UPLINK BROKEN|PHASER ·)|INCOMING|OVERWATCH|BEAM READY|PULSE RING|SWELL ·/;

/** Subset of causal floats to paint over the player — salient beats only. */
export function worldActionFloats(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  opts?: {
    vitals?: ActionFloatVitals;
    flankBefore?: number;
    flankAfter?: number;
  },
): ActionFloat[] {
  return causalActionFloats(logs, opts).filter((l) => WORLD_FLOAT_RES.test(l.label));
}

/** Log floats plus flank edge, still capped. */
export function causalActionFloats(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  opts?: {
    vitals?: ActionFloatVitals;
    flankBefore?: number;
    flankAfter?: number;
  },
): ActionFloat[] {
  const labels = collectActionFloatLabels(logs, opts?.vitals);
  const flank =
    opts?.flankBefore !== undefined && opts.flankAfter !== undefined
      ? flankEdgeFloat(opts.flankBefore, opts.flankAfter)
      : null;
  return mergeCappedFloats(logs, labels, flank);
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
      color: LightTemp.flare,
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
        color: LightTemp.fauna,
        intensity: 0.8,
        life: 3,
      });
    }
    if (sporeTiles.length === 0) {
      lights.addFxLight({
        x: player.x,
        y: player.y,
        radius: 3,
        color: LightTemp.fauna,
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

  if (has('LOG-USE-PHASER')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 2.2,
      color: LightTemp.pattern,
      intensity: 0.85,
      life: 1,
    });
    for (const t of hitTiles) {
      lights.addFxLight({
        x: t.x,
        y: t.y,
        radius: 2.4,
        color: LightTemp.pattern,
        intensity: 1,
        life: 1,
      });
    }
  }

  if (has('LOG-NPC-HAIL') || has('LOG-ALLY-UP') || has('LOG-NPC-SIGHT')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 3.5,
      color: LightTemp.pattern,
      intensity: 0.7,
      life: 2,
    });
  }

  if (has('LOG-USE-PROBE')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 6,
      color: LightTemp.pattern,
      intensity: 0.7,
      life: 2,
    });
  }

  if (has('LOG-HS-START') || has('LOG-HS-TICK')) {
    lights.addFxLight({
      x: beaconPos?.x ?? player.x,
      y: beaconPos?.y ?? player.y,
      radius: 4.5,
      color: LightTemp.beacon,
      intensity: 0.85,
      life: 2,
    });
  }

  if (has('LOG-PB-DESYNC')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 2.5,
      color: LightTemp.pattern,
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
  flashScreen(tweens, flash, Theme.inkBright, 0.3);
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
  if (has('LOG-TUT-DONE')) {
    sfx.play('sector');
    return;
  }
  if (has('LOG-USED-KEY')) {
    sfx.play('beacon');
    flash(Theme.flag, 0.28);
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
  if (
    has('LOG-USE-PHASER')
  ) {
    sfx.play('player_beam');
    return;
  }
  if (
    has('LOG-USE-MED') ||
    has('LOG-USE-ENERGY') ||
    has('LOG-USE-PROBE') ||
    has('LOG-USE-STIM') ||
    has('LOG-USE-PLATE') ||
    has('LOG-USE-FLARE') ||
    has('LOG-USE-FILTER') ||
    has('LOG-USE-BLADE') ||
    has('LOG-USE-BATON') ||
    has('LOG-USE-PHASER-EQUIP') ||
    has('LOG-USE-HARNESS') ||
    has('LOG-USE-VEST') ||
    has('LOG-UNEQUIP') ||
    has('LOG-USE-DART') ||
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
  prevTutorialActive: boolean;
  prevMapWidth: number;
  prevMapHeight: number;
  prevHp: number;
  prevLogLen: number;
  prevAlive: number;
  fromPlayer: { x: number; y: number };
  prevEnemySnap: EnemySnap[];
  /** Living allies before the action — escort drones/escorts that step. */
  prevAllySnap?: Array<{ id: number; x: number; y: number; alive: boolean }>;
  /** Field contacts before the action — usually planted, but relocate when they do. */
  prevNpcSnap?: Array<{ id: number; x: number; y: number }>;
  lights: LightView;
  flash: FlashFn;
  /** Brief white tint on visible enemy sprites that took hits. */
  tintHitEnemies?: () => void;
}): {
  newLogs: LoreId[];
  sectorChanged: boolean;
  mapReloaded: boolean;
  playerMoved: boolean;
  enemyMoved: boolean;
  hitTiles: { x: number; y: number }[];
  fromEnemies: Map<number, { x: number; y: number }>;
  fromAllies: Map<number, { x: number; y: number }>;
  fromNpcs: Map<number, { x: number; y: number }>;
} {
  const {
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
    prevAllySnap = [],
    prevNpcSnap = [],
    lights,
    flash,
    tintHitEnemies,
  } = opts;

  const fromEnemies = new Map(
    prevEnemySnap.filter((en) => en.alive).map((en) => [en.id, { x: en.x, y: en.y }]),
  );
  const fromAllies = new Map(
    prevAllySnap.filter((a) => a.alive).map((a) => [a.id, { x: a.x, y: a.y }]),
  );
  const fromNpcs = new Map(prevNpcSnap.map((n) => [n.id, { x: n.x, y: n.y }]));

  playActionSfx(
    state,
    { action, prevSector, prevHp, prevLogLen, prevAlive, fromPlayer },
    flash,
  );

  const newLogs = state.log.slice(prevLogLen).map((l) => l.loreId);
  playEnemyMotionSfx(state, prevEnemySnap, newLogs);
  const { hitTiles, sporeTiles } = combatFeedbackTiles(state, prevEnemySnap);
  emitActionLights(lights, {
    newLogs,
    player: { x: state.player.x, y: state.player.y },
    hitTiles,
    sporeTiles,
    beaconPos: state.beaconPos,
  });

  const sectorChanged = state.sectorIndex !== prevSector;
  // Tutorial→plains keeps sectorIndex 0 but swaps the whole map (24→~40).
  const mapReloaded =
    sectorChanged ||
    state.tutorialActive !== prevTutorialActive ||
    state.width !== prevMapWidth ||
    state.height !== prevMapHeight;
  if (!mapReloaded) {
    const flareOrBurst = newLogs.some(
      (id) =>
        id === 'LOG-USE-FLARE' ||
        id === 'LOG-SPORE-BURST' ||
        id === 'LOG-TELE-BEAM' ||
        id === 'LOG-USE-PHASER' ||
        id === 'LOG-TELE-OVERWATCH',
    );
    if (flareOrBurst) flash(Theme.biolum, 0.22);
    if (state.player.hp < prevHp) flash(Theme.rust, 0.3);
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
  const allyMoved = state.allies.some((a) => {
    if (!a.alive) return false;
    const prev = fromAllies.get(a.id);
    return !prev || prev.x !== a.x || prev.y !== a.y;
  });
  // Field contacts are usually planted, but if a mechanic ever relocates one we
  // still owe them a slide instead of a snap.
  const npcMoved = state.npcs.some((n) => {
    const prev = fromNpcs.get(n.id);
    return prev !== undefined && (prev.x !== n.x || prev.y !== n.y);
  });

  return {
    newLogs,
    sectorChanged,
    mapReloaded,
    playerMoved,
    enemyMoved: enemyMoved || allyMoved || npcMoved,
    hitTiles,
    fromEnemies,
    fromAllies,
    fromNpcs,
  };
}

/** Per-hostile stagger so packs read as individuals, not one sliding blob. */
export const ENEMY_STAGGER_MS = 22;
/** Subtle lift — hostiles stay mostly flat for pack readability. */
export const ENEMY_LIFT_PX = 2;
export const COMBAT_BUMP_MS = 65;
export const COMBAT_BUMP_PX = 7;
/** Short cardinal lance — long enough to read, short enough for corridor cadence. */
export const PHASER_BEAM_MS = 240;
/** Hostile / surveyor collapse — readable, still shorter than a corridor beat. */
export const DEATH_MS = 220;

function collapseBody(
  tweens: Phaser.Tweens.TweenManager,
  img: Phaser.GameObjects.Image,
  onComplete?: () => void,
): void {
  img.setTint(Theme.rust);
  tweens.add({
    targets: img,
    alpha: 0,
    scaleX: img.scaleX * 0.72,
    scaleY: img.scaleY * 0.18,
    y: img.y + 10,
    duration: DEATH_MS,
    ease: 'Quad.easeIn',
    onComplete,
  });
}

/**
 * Squash a hostile or escort into the tile, then destroy the view.
 * Invisible bodies skip the tween so off-screen packs don't linger.
 */
export function playActorDeath(
  tweens: Phaser.Tweens.TweenManager,
  view: EnemyView,
  onDone?: () => void,
): void {
  view.dying = true;
  if (view.label.active) view.label.setVisible(false);
  const img = view.img;
  if (!img.active || !img.visible) {
    if (img.active) img.destroy();
    if (view.label.active) view.label.destroy();
    onDone?.();
    return;
  }
  collapseBody(tweens, img, () => {
    if (img.active) img.destroy();
    if (view.label.active) view.label.destroy();
    onDone?.();
  });
}

/** Surveyor loss — collapse in place; the scene owns the sprite teardown. */
export function playPlayerDeath(
  tweens: Phaser.Tweens.TweenManager,
  playerSprite: Phaser.GameObjects.Image,
): void {
  playerSprite.setData('dying', true);
  collapseBody(tweens, playerSprite);
}

/** Stagger delay for the nth moving hostile this turn (0-based). */
export function enemyMoveStaggerMs(index: number): number {
  return Math.max(0, index) * ENEMY_STAGGER_MS;
}

/** Longest move tween window when hostiles step with stagger. */
export function maxMoveAnimMs(enemyMoverCount: number): number {
  const stagger =
    enemyMoverCount > 0 ? enemyMoveStaggerMs(enemyMoverCount - 1) : 0;
  return MOVE_MS + stagger;
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
    x: base.x + dx * COMBAT_BUMP_PX,
    y: base.y + dy * COMBAT_BUMP_PX,
    duration: COMBAT_BUMP_MS,
    yoyo: true,
    ease: 'Back.easeOut',
  });
}

/** Phaser.BlendModes.ADD — numeric so ActionFeedback stays type-only vs Phaser in unit tests. */
const BLEND_ADD = 1;

/** Above `LightView.lightsGfx` (depth 1) so bloom does not paint over the beam. */
const PHASER_BEAM_DEPTH = 2;

/** Impact tile for phaser VFX — prefers combat hit tiles, then sim target lookup. */
export function phaserBeamTargetTile(
  newLogs: LoreId[],
  fromPlayer: { x: number; y: number },
  hitTiles: { x: number; y: number }[],
  action: Action,
  state: GameState,
): { x: number; y: number } | undefined {
  if (!newLogs.includes('LOG-USE-PHASER')) return undefined;
  const inRange = (t: { x: number; y: number }) => {
    const d = Math.abs(t.x - fromPlayer.x) + Math.abs(t.y - fromPlayer.y);
    return d >= PHASER_RANGE_MIN && d <= PHASER_RANGE_MAX;
  };
  const hit = hitTiles.find(inRange);
  if (hit) return hit;
  if (action.type === 'move') {
    const foe = findPhaserTarget(state, action.dx, action.dy);
    if (foe) return { x: foe.x, y: foe.y };
  }
  return undefined;
}

/**
 * Single frame of the survey phaser beam — contact sheet and tween updates.
 */
export function paintPhaserBeamFrame(
  g: Phaser.GameObjects.Graphics,
  worldXY: (gx: number, gy: number) => { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress = 1,
): void {
  const a = worldXY(from.x, from.y);
  const b = worldXY(to.x, to.y);
  const x = a.x + (b.x - a.x) * progress;
  const y = a.y + (b.y - a.y) * progress;

  const pathTiles: { x: number; y: number }[] = [];
  const sx = Math.sign(to.x - from.x);
  const sy = Math.sign(to.y - from.y);
  let px = from.x + sx;
  let py = from.y + sy;
  while (px !== to.x || py !== to.y) {
    pathTiles.push({ x: px, y: py });
    px += sx;
    py += sy;
  }
  pathTiles.push(to);

  const litCount = Math.max(1, Math.ceil(pathTiles.length * progress));
  for (let i = 0; i < litCount; i++) {
    const tile = pathTiles[i]!;
    const c = worldXY(tile.x, tile.y);
    const half = TILE_DRAW * 0.38;
    g.fillStyle(Theme.scanWash, 0.14 + progress * 0.12);
    g.fillRect(c.x - half, c.y - half, half * 2, half * 2);
    g.lineStyle(1, Theme.arc, 0.55);
    g.strokeRect(c.x - half + 1, c.y - half + 1, half * 2 - 2, half * 2 - 2);
  }

  g.lineStyle(10, Theme.scanWash, 0.32);
  g.lineBetween(a.x, a.y, x, y);
  g.lineStyle(5, Theme.arcWhite, 0.42);
  g.lineBetween(a.x, a.y, x, y);
  g.lineStyle(2, 0xffffff, 0.98);
  g.lineBetween(a.x, a.y, x, y);

  const impactR = 4 + progress * 7;
  g.fillStyle(Theme.arcWhite, 0.55);
  g.fillCircle(b.x, b.y, impactR);
  g.lineStyle(2, 0xffffff, 0.9);
  g.strokeCircle(b.x, b.y, impactR * 0.72);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(b.x, b.y, 2.5);
}

/**
 * Draw a 2–3 tile ion lance from the surveyor to the impact tile.
 * Fire-and-forget — callers wait `PHASER_BEAM_MS` if they need the window.
 */
export function playPhaserBeam(
  tweens: Phaser.Tweens.TweenManager,
  layer: Phaser.GameObjects.Container,
  worldXY: (gx: number, gy: number) => { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  const g = layer.scene.add.graphics();
  g.setBlendMode(BLEND_ADD);
  g.setDepth(PHASER_BEAM_DEPTH);
  layer.add(g);

  const grow = PHASER_BEAM_MS * 0.58;
  const fade = PHASER_BEAM_MS - grow;
  const proxy = { t: 0 };
  tweens.add({
    targets: proxy,
    t: 1,
    duration: grow,
    ease: 'Cubic.easeOut',
    onUpdate: () => {
      if (!g.active) return;
      g.clear();
      paintPhaserBeamFrame(g, worldXY, from, to, proxy.t);
    },
    onComplete: () => {
      if (!g.active) return;
      tweens.add({
        targets: g,
        alpha: 0,
        duration: fade,
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (g.active) g.destroy();
        },
      });
    },
  });
}

/** Nudge adjacent hostiles toward the surveyor when melee contact hurts HP. */
export function bumpMeleeAttackers(
  tweens: Phaser.Tweens.TweenManager,
  opts: {
    state: GameState;
    enemyViews: Map<number, EnemyView>;
    worldXY: (gx: number, gy: number) => { x: number; y: number };
  },
): void {
  const { state, enemyViews, worldXY } = opts;
  const px = state.player.x;
  const py = state.player.y;
  for (const en of state.enemies) {
    if (!en.alive) continue;
    if (Math.abs(en.x - px) + Math.abs(en.y - py) !== 1) continue;
    const view = enemyViews.get(en.id);
    if (!view?.img.visible) continue;
    const base = worldXY(en.x, en.y);
    const dx = Math.sign(px - en.x);
    const dy = Math.sign(py - en.y);
    const scaleX = view.img.scaleX;
    const scaleY = view.img.scaleY;
    view.img.setPosition(base.x, base.y);
    tweens.add({
      targets: view.img,
      x: base.x + dx * COMBAT_BUMP_PX,
      y: base.y + dy * COMBAT_BUMP_PX,
      scaleX: scaleX * 1.07,
      scaleY: scaleY * 1.07,
      duration: COMBAT_BUMP_MS,
      yoyo: true,
      ease: 'Back.easeOut',
      onUpdate: () => {
        if (view.label.active) {
          view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 5);
        }
      },
      onComplete: () => {
        if (view.img.active) view.img.setScale(scaleX, scaleY);
      },
    });
  }
}

/**
 * Short lunges after tile slides finish — blocked moves, attack-into-foe, and
 * hostile melee that closed distance in the same turn all get a contact read.
 */
export function playCombatContactJuice(
  tweens: Phaser.Tweens.TweenManager,
  opts: {
    action: Action;
    playerMoved: boolean;
    prevHp: number;
    state: GameState;
    playerSprite: Phaser.GameObjects.Image;
    enemyViews: Map<number, EnemyView>;
    worldXY: (gx: number, gy: number) => { x: number; y: number };
  },
): void {
  const { action, playerMoved, prevHp, state, playerSprite, enemyViews, worldXY } = opts;
  if (action.type === 'move' && !playerMoved) {
    bumpAttack(
      tweens,
      playerSprite,
      worldXY,
      { x: state.player.x, y: state.player.y },
      action.dx,
      action.dy,
    );
  }
  if (state.player.hp < prevHp) {
    bumpMeleeAttackers(tweens, { state, enemyViews, worldXY });
  }
}

export type MoveAnimHost = {
  setAnimating(v: boolean): void;
  worldXY(gx: number, gy: number): { x: number; y: number };
  tweens: Phaser.Tweens.TweenManager;
  time: Phaser.Time.Clock;
  playerSprite: Phaser.GameObjects.Image;
  enemyViews: Map<number, EnemyView>;
  allyViews: Map<number, EnemyView>;
  npcViews: Map<number, EnemyView>;
  state: GameState;
  syncActors(snapPositions: boolean): void;
  snapImg(img: Phaser.GameObjects.Image, gx: number, gy: number): void;
  /**
   * Drive lamp wash (when the surveyor hops) and refresh body shadows for any
   * mover — progress is 0 → 1 across the shared MOVE_MS window.
   */
  onPlayerMoveLight?: (t: number) => void;
};

const HOP_PX = 5;

type StepMotion = {
  hop?: boolean;
  delay?: number;
  liftPx?: number;
  ease?: string;
};

/**
 * Slide an actor from one tile to the next.
 *
 * `hop` lifts the sprite through a short arc so a one-tile step reads as a step
 * rather than a slide on ice — enemies and escorts stay mostly flat so packs
 * stay readable as a group.
 */
function tweenTileStep(
  host: MoveAnimHost,
  img: Phaser.GameObjects.Image,
  label: Phaser.GameObjects.Text | null,
  from: { x: number; y: number },
  to: { x: number; y: number },
  motion: StepMotion,
  done: () => void,
  onProgress?: (t: number) => void,
): void {
  const hop = motion.hop ?? false;
  const liftPx = motion.liftPx ?? (hop ? HOP_PX : 0);
  const ease = motion.ease ?? (hop ? 'Cubic.easeOut' : 'Sine.easeInOut');
  const delay = motion.delay ?? 0;
  const a = host.worldXY(from.x, from.y);
  const b = host.worldXY(to.x, to.y);
  img.setPosition(a.x, a.y);
  if (label) label.setPosition(a.x, a.y - TILE_DRAW / 2 + 5);

  const proxy = { t: 0 };
  host.tweens.add({
    targets: proxy,
    t: 1,
    duration: MOVE_MS,
    delay,
    ease,
    onUpdate: () => {
      if (!img.active) return;
      const t = proxy.t;
      const lift = liftPx > 0 ? Math.sin(t * Math.PI) * liftPx : 0;
      img.setPosition(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - lift);
      if (label?.active) {
        label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
      }
      onProgress?.(t);
    },
    onComplete: () => {
      if (img.active) {
        img.setPosition(b.x, b.y);
      }
      if (label?.active) label.setPosition(b.x, b.y - TILE_DRAW / 2 + 5);
      onProgress?.(1);
      done();
    },
  });
}

/**
 * Stage player + other actors in parallel, then invoke onDone (FOV/HUD redraw + queue flush).
 * Parallel keeps corridor cadence near one MOVE_MS instead of stacking phases.
 */
export function playMoveAnims(
  host: MoveAnimHost,
  fromPlayer: { x: number; y: number },
  fromEnemies: Map<number, { x: number; y: number }>,
  onDone: () => void,
  extras: {
    fromAllies?: Map<number, { x: number; y: number }>;
    fromNpcs?: Map<number, { x: number; y: number }>;
  } = {},
): void {
  host.setAnimating(true);
  let finished = false;
  const complete = () => {
    if (finished) return;
    finished = true;
    host.setAnimating(false);
    onDone();
  };

  host.syncActors(false);

  const px = host.state.player.x;
  const py = host.state.player.y;
  const playerMoved = fromPlayer.x !== px || fromPlayer.y !== py;
  const fromAllies = extras.fromAllies ?? new Map();
  const fromNpcs = extras.fromNpcs ?? new Map();

  type Step = {
    img: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text | null;
    from: { x: number; y: number };
    to: { x: number; y: number };
    motion: StepMotion;
    onProgress?: (t: number) => void;
    afterStart?: () => void;
  };
  const steps: Step[] = [];
  let enemyMovers = 0;

  if (playerMoved) {
    steps.push({
      img: host.playerSprite,
      label: null,
      from: fromPlayer,
      to: { x: px, y: py },
      motion: { hop: true },
      onProgress: host.onPlayerMoveLight,
    });
  } else {
    host.snapImg(host.playerSprite, px, py);
  }

  for (const en of host.state.enemies) {
    if (!en.alive) continue;
    const view = host.enemyViews.get(en.id);
    if (!view) continue;
    const prev = fromEnemies.get(en.id) ?? { x: en.x, y: en.y };
    if (prev.x === en.x && prev.y === en.y) continue;
    const stagger = enemyMoveStaggerMs(enemyMovers);
    enemyMovers += 1;
    steps.push({
      img: view.img,
      label: view.label,
      from: prev,
      to: { x: en.x, y: en.y },
      motion: {
        hop: false,
        delay: stagger,
        liftPx: ENEMY_LIFT_PX,
        ease: 'Sine.easeInOut',
      },
      // Keep logical gx/gy on the sprite path — afterStart used to snap to the
      // destination while the image lerped, so umbra jumped ahead of the body.
      onProgress: (t) => {
        view.gx = prev.x + (en.x - prev.x) * t;
        view.gy = prev.y + (en.y - prev.y) * t;
        host.onPlayerMoveLight?.(t);
      },
      afterStart: () => {
        view.gx = prev.x;
        view.gy = prev.y;
      },
    });
  }

  for (const ally of host.state.allies) {
    if (!ally.alive) continue;
    const view = host.allyViews.get(ally.id);
    if (!view) continue;
    const prev = fromAllies.get(ally.id) ?? { x: ally.x, y: ally.y };
    if (prev.x === ally.x && prev.y === ally.y) continue;
    steps.push({
      img: view.img,
      label: view.label,
      from: prev,
      to: { x: ally.x, y: ally.y },
      motion: { hop: false, ease: 'Sine.easeInOut' },
      onProgress: (t) => {
        view.gx = prev.x + (ally.x - prev.x) * t;
        view.gy = prev.y + (ally.y - prev.y) * t;
        host.onPlayerMoveLight?.(t);
      },
      afterStart: () => {
        view.gx = prev.x;
        view.gy = prev.y;
      },
    });
  }

  for (const npc of host.state.npcs) {
    const view = host.npcViews.get(npc.id);
    if (!view) continue;
    const prev = fromNpcs.get(npc.id);
    if (!prev || (prev.x === npc.x && prev.y === npc.y)) continue;
    steps.push({
      img: view.img,
      label: view.label,
      from: prev,
      to: { x: npc.x, y: npc.y },
      motion: { hop: false, ease: 'Sine.easeInOut' },
      onProgress: (t) => {
        view.gx = prev.x + (npc.x - prev.x) * t;
        view.gy = prev.y + (npc.y - prev.y) * t;
        host.onPlayerMoveLight?.(t);
      },
      afterStart: () => {
        view.gx = prev.x;
        view.gy = prev.y;
      },
    });
  }

  if (steps.length === 0) {
    complete();
    return;
  }

  let pending = steps.length;
  const finishOne = () => {
    pending -= 1;
    if (pending <= 0) complete();
  };

  for (const step of steps) {
    step.afterStart?.();
    tweenTileStep(
      host,
      step.img,
      step.label,
      step.from,
      step.to,
      step.motion,
      finishOne,
      step.onProgress,
    );
  }

  // Safety net if a tween is killed mid-scene — allow stagger tail.
  host.time.delayedCall(maxMoveAnimMs(enemyMovers) + 60, () => {
    if (!finished) complete();
  });
}

/** Brief white tint on visible enemies after a player hit/kill. */
export function tintVisibleEnemies(
  time: Phaser.Time.Clock,
  enemyViews: Iterable<EnemyView>,
): void {
  for (const view of enemyViews) {
    if (!view.img.visible || view.dying) continue;
    view.img.setTint(0xffffff);
    time.delayedCall(80, () => {
      if (view.img.active && !view.dying) view.img.clearTint();
    });
  }
}

/** Brief rust tint when the surveyor takes HP — mirrors enemy hit juice. */
export function tintPlayerHurt(
  time: Phaser.Time.Clock,
  playerSprite: Phaser.GameObjects.Image,
): void {
  playerSprite.setTint(Theme.rust);
  time.delayedCall(80, () => {
    if (playerSprite.active && !playerSprite.getData('dying')) playerSprite.clearTint();
  });
}
