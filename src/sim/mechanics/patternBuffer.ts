import { hasItem, removeOne } from '../inventory';
import { pushLog } from '../log';
import { purgeEmStress } from '../emStress';
import { consumeExtractFavor } from '../extractFavor';
import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';

/**
 * Nav Core pattern buffer — desyncs under plasma/vent/EM stress.
 * Shuttle rejects lock until a fresh cell restabilizes the buffer.
 */
export function tryClearPatternDesync(state: GameState): boolean {
  if (state.patternDesync <= 0) return false;
  if (!hasItem(state, 'energy')) return false;
  removeOne(state, 'energy');
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
    // Only meaningful spikes — avoid burning all cells mid-run
    if (tile.kind === 'hazard' && state.emStress >= 25) spike += 1;
    if (tile.kind === 'vent' && state.emStress >= 40) spike += 1;
    if (state.emStress >= 70) spike += 1;
    if (spike > 0) {
      if (consumeExtractFavor(state, 'pattern_fail_safe')) {
        pushLog(state, 'LOG-FAVOR-PATTERN');
        return;
      }
      const prev = state.patternDesync;
      state.patternDesync = Math.min(5, state.patternDesync + spike);
      if (prev === 0 && state.patternDesync > 0) {
        pushLog(state, 'LOG-PB-DESYNC');
      }
    } else if (state.patternDesync > 0) {
      // Passive bleed-off so shuttle isn't permanently softlocked without cells
      if (state.turn % 6 === 0) {
        state.patternDesync = Math.max(0, state.patternDesync - 1);
        if (state.patternDesync === 0) pushLog(state, 'LOG-PB-SYNC');
      }
    }
  },

  onSectorEnter(state: GameState): void {
    if (state.sectorId === 'approach' && hasItem(state, 'nav_core') && state.patternDesync === 0) {
      // Soft warning only — do not force desync (cell economy)
      pushLog(state, 'LOG-PB-STRESS');
    }
  },

  contextHint(state: GameState): LoreId | null {
    if (state.patternDesync <= 0) return null;
    return 'UI-HINT-DESYNC';
  },

  autopilotHint(state: GameState): Action | null {
    if (state.patternDesync <= 0) return null;
    const cIdx = state.inventory.findIndex((s) => s.kind === 'energy');
    if (cIdx < 0) return null;
    // Only clear when extracting or desync is climbing — preserve cells for the bus
    if (state.sectorId === 'ridge' || state.sectorId === 'approach' || state.patternDesync >= 2) {
      state.ui.selectedSlot = cIdx;
      return { type: 'use' };
    }
    return null;
  },
};
