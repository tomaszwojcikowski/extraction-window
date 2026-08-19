import { pushLog, recordLoreEvent } from '../log';
import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';

export const UPLINK_TURNS = 3;

function hasNavCore(state: GameState): boolean {
  return state.inventory.some((slot) => slot.kind === 'nav_core');
}

function onShuttle(state: GameState): boolean {
  const { x, y } = state.player;
  return (
    state.tiles[y]![x]!.kind === 'shuttle' ||
    !!(
      state.sectorId === 'ridge' &&
      state.shuttlePos &&
      x === state.shuttlePos.x &&
      y === state.shuttlePos.y
    )
  );
}

function completeUplink(state: GameState): void {
  state.uplink = null;
  state.status = 'won';
  pushLog(state, 'LOG-EXTRACT');
  recordLoreEvent(state, 'LOG-EXTRACT');
}

/**
 * Called by inventory before the item's ordinary effect. Power Cell skips a hold;
 * flare makes the deterministic pressure wave harmless.
 */
export function tryUseUplinkAid(state: GameState, kind: 'energy' | 'flare'): boolean {
  if (!state.uplink?.active || !onShuttle(state)) return false;
  if (kind === 'energy') {
    state.uplink.accelerated = true;
    pushLog(state, 'LOG-UPLINK-COOLANT');
  } else {
    state.uplink.repelled = true;
    pushLog(state, 'LOG-UPLINK-FLARE');
  }
  return true;
}

function applyPressureWave(state: GameState): void {
  if (!state.uplink || state.uplink.progress !== 2) return;
  if (state.uplink.repelled) {
    pushLog(state, 'LOG-UPLINK-WAVE-REPEL');
    return;
  }
  state.player.energy = Math.max(1, state.player.energy - 4);
  pushLog(state, 'LOG-UPLINK-WAVE-HIT', '-4 Power');
}

/** Three-turn final-pad uplink with a single, telegraphed pressure wave. */
export const extractionUplinkMechanic: Mechanic = {
  id: 'extraction_uplink',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit' || !onShuttle(state) || !hasNavCore(state)) return false;
    if (!state.uplink?.active) {
      state.uplink = { progress: 0, active: true, accelerated: false, repelled: false };
      pushLog(state, 'LOG-UPLINK-START');
    } else {
      pushLog(state, 'LOG-UPLINK-HOLD', `${state.uplink.progress}/${UPLINK_TURNS}`);
    }
    return true;
  },

  onEndTurn(state: GameState): void {
    const uplink = state.uplink;
    if (!uplink?.active) return;
    if (!onShuttle(state)) {
      state.uplink = null;
      pushLog(state, 'LOG-UPLINK-INTERRUPT');
      return;
    }

    const progress = uplink.accelerated ? 2 : 1;
    uplink.progress = Math.min(UPLINK_TURNS, uplink.progress + progress);
    uplink.accelerated = false;
    pushLog(state, 'LOG-UPLINK-TICK', `${uplink.progress}/${UPLINK_TURNS}`);
    if (uplink.progress === 1) pushLog(state, 'LOG-UPLINK-WAVE-IN');
    applyPressureWave(state);
    if (uplink.progress >= UPLINK_TURNS) completeUplink(state);
  },

  contextHint(state: GameState): LoreId | null {
    if (!onShuttle(state) || !hasNavCore(state)) return null;
    return state.uplink?.active ? 'UI-HINT-UPLINK-HOLD' : 'UI-HINT-SHUTTLE';
  },

  autopilotHint(state: GameState): Action | null {
    if (state.sectorId !== 'ridge' || !onShuttle(state) || !hasNavCore(state)) return null;
    return state.uplink?.active ? { type: 'wait' } : { type: 'exit' };
  },
};
