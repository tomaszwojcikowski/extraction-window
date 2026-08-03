import { XP_BEACON } from '../../data/progression';
import { hasItem, removeOne, syncObjectiveFlags } from '../inventory';
import { pushLog, recordLoreEvent } from '../combat';
import { gainXp } from '../progression';
import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';

/** Turns of sustained handshake required on the beacon tile. */
export const HANDSHAKE_TURNS = 2;

function onBeacon(state: GameState): boolean {
  const { x, y } = state.player;
  const tile = state.tiles[y]![x]!;
  if (tile.kind === 'beacon') return true;
  return !!(
    state.sectorId === 'beacon' &&
    state.beaconPos &&
    x === state.beaconPos.x &&
    y === state.beaconPos.y
  );
}

function completeHandshake(state: GameState): void {
  removeOne(state, 'relay_key');
  state.objectives.usedRelayKey = true;
  state.objectives.beaconOpen = true;
  state.handshake = null;
  syncObjectiveFlags(state);
  pushLog(state, 'LOG-USED-KEY');
  recordLoreEvent(state, 'LOG-USED-KEY');
  gainXp(state, XP_BEACON, 'beacon');
  if (state.exitPos) {
    state.tiles[state.exitPos.y]![state.exitPos.x] = {
      kind: 'exit',
      walkable: true,
      transparent: true,
    };
  }
}

/**
 * Multi-turn beacon authorization — interrupt if the officer leaves the pad.
 */
export const beaconHandshakeMechanic: Mechanic = {
  id: 'beacon_handshake',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    if (state.objectives.beaconOpen) return false;
    if (!onBeacon(state)) return false;

    if (!hasItem(state, 'relay_key')) {
      pushLog(state, 'LOG-NEED-KEY');
      return true;
    }

    if (!state.handshake?.active) {
      state.handshake = { progress: 0, active: true };
      pushLog(state, 'LOG-HS-START');
      return true;
    }

    // Already syncing — reinforce with another >
    pushLog(state, 'LOG-HS-TICK', `${state.handshake.progress}/${HANDSHAKE_TURNS}`);
    return true;
  },

  onEndTurn(state: GameState): void {
    if (!state.handshake?.active || state.objectives.beaconOpen) return;

    if (!onBeacon(state)) {
      state.handshake = null;
      pushLog(state, 'LOG-HS-INTERRUPT');
      return;
    }

    if (!hasItem(state, 'relay_key')) {
      state.handshake = null;
      return;
    }

    state.handshake.progress += 1;
    pushLog(state, 'LOG-HS-TICK', `${state.handshake.progress}/${HANDSHAKE_TURNS}`);
    if (state.handshake.progress >= HANDSHAKE_TURNS) {
      completeHandshake(state);
    }
  },

  contextHint(state: GameState): LoreId | null {
    if (state.objectives.beaconOpen) return null;
    if (!onBeacon(state)) return null;
    if (state.handshake?.active) return 'UI-HINT-HANDSHAKE';
    if (hasItem(state, 'relay_key')) return 'UI-HINT-BEACON';
    return 'UI-HINT-BEACON';
  },

  autopilotHint(state: GameState): Action | null {
    if (state.objectives.beaconOpen) return null;
    if (state.sectorId !== 'beacon') return null;
    if (!hasItem(state, 'relay_key')) return null;

    if (onBeacon(state)) {
      if (!state.handshake?.active) return { type: 'exit' };
      return { type: 'wait' };
    }
    return null;
  },
};
