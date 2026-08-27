import { isInlandShelf, type SectorId } from '../../data/encounters';
import type { LoreId } from '../../data/lore';
import { isItemWorn } from '../equip';
import { wornTagMax } from '../equipTags';
import { addEmStress } from '../emStress';
import { hasItem } from '../inventory';
import { pushLog } from '../log';
import type { Enemy, GameState, MapRoom } from '../types';
import type { Mechanic } from './types';

const FRONT_DURATION = 6;
const FRONT_START_CHANCE = 0.6;

function canFormIonFront(state: GameState): boolean {
  return !state.tutorialActive && state.sectorIndex >= 6;
}

function shouldStartIonFront(state: GameState): boolean {
  if (!canFormIonFront(state)) return false;
  // Inland is four sectors of walking after the handshake — always give it weather.
  if (isInlandShelf(state.sectorId)) return true;
  return state.rng() < FRONT_START_CHANCE;
}

function startLogId(id: SectorId): LoreId {
  switch (id) {
    case 'trench':
      return 'LOG-ION-FAULT';
    case 'duct':
      return 'LOG-ION-VENT';
    case 'ash':
      return 'LOG-ION-ASH';
    case 'brine':
      return 'LOG-ION-BRINE';
    default:
      return 'LOG-ION-FRONT';
  }
}

function roomAt(state: GameState, x: number, y: number): MapRoom | null {
  return (
    state.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) ?? null
  );
}

function inRoom(room: MapRoom, x: number, y: number): boolean {
  return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
}

function currentRoom(state: GameState): MapRoom | null {
  return roomAt(state, state.player.x, state.player.y);
}

const LOUD_ROLES: ReadonlySet<MapRoom['role']> = new Set([
  'nest',
  'post',
  'hazard',
  'collapse',
]);

function inLoudRoom(state: GameState): boolean {
  const room = currentRoom(state);
  return room ? LOUD_ROLES.has(room.role) : false;
}

function alertFaunaInRoom(state: GameState, pred?: (enemy: Enemy) => boolean): number {
  if (!inLoudRoom(state)) return 0;
  const room = roomAt(state, state.player.x, state.player.y);
  if (!room) return 0;
  let n = 0;
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.alerted) continue;
    if (!inRoom(room, enemy.x, enemy.y)) continue;
    if (pred && !pred(enemy)) continue;
    enemy.alerted = true;
    n += 1;
  }
  return n;
}

function nearVent(state: GameState): boolean {
  const { x, y } = state.player;
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    if (state.tiles[y + dy]?.[x + dx]?.kind === 'vent') return true;
  }
  return false;
}

function onWetTile(state: GameState): boolean {
  const kind = state.tiles[state.player.y]?.[state.player.x]?.kind;
  return kind === 'hazard' || kind === 'sump';
}

/** Chip stem — inland fronts name the local answer so the kit choice is readable. */
export function ionFrontChipLore(state: GameState): LoreId {
  if (state.ionFrontTurns <= 1) return 'UI-FRONT-CLEARING';
  switch (state.sectorId) {
    case 'trench':
      return 'UI-ION-FAULT';
    case 'duct':
      return 'UI-ION-VENT';
    case 'ash':
      return 'UI-ION-ASH';
    case 'brine':
      return 'UI-ION-BRINE';
    default:
      return 'UI-ION-FRONT';
  }
}

export function startIonFront(state: GameState): void {
  state.ionFrontTurns = FRONT_DURATION;
  state.ionFrontDampened = false;
  // Allow one teach hint per front (badge carries the rest).
  state.scriptedFired.ion_front_hint = false;
  pushLog(state, startLogId(state.sectorId));
}

function pulseInlandWake(state: GameState): void {
  switch (state.sectorId) {
    case 'trench': {
      if (alertFaunaInRoom(state) > 0) pushLog(state, 'LOG-ION-WAKE-FAULT');
      break;
    }
    case 'duct': {
      if (nearVent(state)) addEmStress(state, 1, 'vent surge');
      const woke = alertFaunaInRoom(
        state,
        (e) => e.kind === 'duct_drone' || e.kind === 'drone',
      );
      if (woke > 0) pushLog(state, 'LOG-ION-WAKE-VENT');
      break;
    }
    case 'ash': {
      const woke = alertFaunaInRoom(
        state,
        (e) => e.kind === 'wraith' || e.kind === 'rift' || e.kind === 'serpent',
      );
      if (woke > 0) pushLog(state, 'LOG-ION-WAKE-ASH');
      break;
    }
    case 'brine': {
      if (onWetTile(state) && wornTagMax(state, 'hazardDrainReduction') < 1) {
        state.player.energy -= 1;
      }
      const woke = alertFaunaInRoom(state, (e) => e.kind === 'leech');
      if (woke > 0 || onWetTile(state)) pushLog(state, 'LOG-ION-WAKE-BRINE');
      break;
    }
    default:
      break;
  }
}

function pulseIonFront(state: GameState): void {
  if (state.player.filterTurns > 0 || state.ionFrontDampened) {
    if (state.ionFrontDampened) state.ionFrontDampened = false;
    pushLog(state, 'LOG-ION-DAMPEN');
    return;
  }

  const inland = isInlandShelf(state.sectorId);
  const em = inland ? 1 : 2;
  const power = inland ? 1 : 2;
  addEmStress(state, em, 'ion front');
  state.player.energy -= power;
  pushLog(state, 'LOG-ION-PULSE', `+${em} EM −${power} Power`);
  pulseInlandWake(state);
}

function hintLore(state: GameState): LoreId {
  switch (state.sectorId) {
    case 'trench':
      return 'UI-HINT-ION-FAULT';
    case 'duct':
      return 'UI-HINT-ION-VENT';
    case 'ash':
      return 'UI-HINT-ION-ASH';
    case 'brine':
      return 'UI-HINT-ION-BRINE';
    default:
      return 'UI-HINT-ION-FRONT';
  }
}

function canAnswerFront(state: GameState): boolean {
  if (hasItem(state, 'filter') || hasItem(state, 'flare')) return true;
  if (state.sectorId === 'brine' && (hasItem(state, 'mag_boots') || isItemWorn(state, 'mag_boots'))) {
    return true;
  }
  return false;
}

/**
 * Late-sector ion fronts are short ecology pressure: they tax the Bus/EM
 * together and make an already lit player easier for lit fauna to track.
 * Inland sectors always get a front, and each biome answers a different kit.
 */
export const ionFrontMechanic: Mechanic = {
  id: 'ion_front',

  onSectorEnter(state: GameState): void {
    if (shouldStartIonFront(state)) startIonFront(state);
  },

  onEndTurn(state: GameState): void {
    if (state.ionFrontTurns <= 0) return;
    if (state.ionFrontTurns % 2 === 0) pulseIonFront(state);
    state.ionFrontTurns -= 1;
    if (state.ionFrontTurns === 0) pushLog(state, 'LOG-ION-CLEAR');
  },

  contextHint(state: GameState): LoreId | null {
    if (state.ionFrontTurns <= 0) return null;
    if (state.player.filterTurns > 0 || state.ionFrontDampened) {
      return null;
    }
    if (state.scriptedFired.ion_front_hint) return null;
    // Teach only when kit can act — otherwise badge + LOG-ION-* are enough.
    if (!canAnswerFront(state)) return null;
    state.scriptedFired.ion_front_hint = true;
    return hintLore(state);
  },
};
