import { hasItem, removeOne } from '../inventory';
import { pushLog } from '../log';
import { purgeEmStress } from '../emStress';
import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';

/**
 * Nav Core pattern buffer — desyncs under plasma/vent/EM stress.
 * Shuttle rejects lock until coolant restabilizes the buffer.
 */
export function tryClearPatternDesync(state: GameState): boolean {
  if (state.patternDesync <= 0) return false;
  if (!hasItem(state, 'coolant') && !hasItem(state, 'battery')) return false;
  if (hasItem(state, 'coolant')) removeOne(state, 'coolant');
  else removeOne(state, 'battery');
  state.patternDesync = 0;
  purgeEmStress(state, 8);
  pushLog(state, 'LOG-PB-SYNC');
  return true;
}

export const patternBufferMechanic: Mechanic = {
  id: 'pattern_buffer',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    const { x, y } = state.player;
    const tile = state.tiles[y]![x]!;
    const onShuttle =
      tile.kind === 'shuttle' ||
      (state.sectorId === 'ridge' &&
        state.shuttlePos &&
        x === state.shuttlePos.x &&
        y === state.shuttlePos.y);
    if (!onShuttle) return false;
    if (!hasItem(state, 'nav_core')) return false;
    if (state.patternDesync <= 0) return false;
    pushLog(state, 'LOG-PB-REJECT');
    return true;
  },

  onEndTurn(state: GameState): void {
    if (!hasItem(state, 'nav_core')) return;

    const tile = state.tiles[state.player.y]![state.player.x]!;
    let spike = 0;
    // Only meaningful spikes — avoid burning all coolant mid-run
    if (tile.kind === 'hazard' && state.emStress >= 25) spike += 1;
    if (tile.kind === 'vent' && state.emStress >= 40) spike += 1;
    if (state.emStress >= 70) spike += 1;
    if (spike > 0) {
      const prev = state.patternDesync;
      state.patternDesync = Math.min(5, state.patternDesync + spike);
      if (prev === 0 && state.patternDesync > 0) {
        pushLog(state, 'LOG-PB-DESYNC');
      }
    } else if (state.patternDesync > 0) {
      // Passive bleed-off so shuttle isn't permanently softlocked without coolant
      if (state.player.stabilizeTurns > 0 || state.turn % 6 === 0) {
        state.patternDesync = Math.max(0, state.patternDesync - 1);
        if (state.patternDesync === 0) pushLog(state, 'LOG-PB-SYNC');
      }
    }
  },

  onSectorEnter(state: GameState): void {
    if (state.sectorId === 'approach' && hasItem(state, 'nav_core') && state.patternDesync === 0) {
      // Soft warning only — do not force desync (coolant economy)
      pushLog(state, 'LOG-PB-STRESS');
    }
  },

  contextHint(state: GameState): LoreId | null {
    if (state.patternDesync <= 0) return null;
    const tile = state.tiles[state.player.y]![state.player.x]!;
    if (tile.kind === 'shuttle') return 'UI-HINT-DESYNC';
    // Thin pillar coaching when buffer is climbing and coolant is available
    if (
      state.patternDesync >= 2 &&
      (hasItem(state, 'coolant') || hasItem(state, 'battery'))
    ) {
      return 'UI-HINT-DESYNC';
    }
    return null;
  },

  autopilotHint(state: GameState): Action | null {
    if (state.patternDesync <= 0) return null;
    const cIdx = state.inventory.findIndex((s) => s.kind === 'coolant' || s.kind === 'battery');
    if (cIdx < 0) return null;
    // Only clear when extracting or desync is climbing — preserve coolant for bus
    if (state.sectorId === 'ridge' || state.sectorId === 'approach' || state.patternDesync >= 2) {
      state.ui.selectedSlot = cIdx;
      return { type: 'use' };
    }
    return null;
  },
};
