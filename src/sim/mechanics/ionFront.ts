import { pushLog } from '../log';
import { addEmStress } from '../emStress';
import { hasItem } from '../inventory';
import { isQuietStance } from './quietStance';
import type { GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';

const FRONT_DURATION = 6;
const FRONT_START_CHANCE = 0.6;

function canFormIonFront(state: GameState): boolean {
  return !state.tutorialActive && state.sectorIndex >= 6;
}

export function startIonFront(state: GameState): void {
  state.ionFrontTurns = FRONT_DURATION;
  state.ionFrontDampened = false;
  // Allow one teach hint per front (badge carries the rest).
  state.scriptedFired.ion_front_hint = false;
  pushLog(state, 'LOG-ION-FRONT');
}

function pulseIonFront(state: GameState): void {
  if (state.player.filterTurns > 0 || state.ionFrontDampened) {
    if (state.ionFrontDampened) state.ionFrontDampened = false;
    pushLog(state, 'LOG-ION-DAMPEN');
    return;
  }

  addEmStress(state, 2, 'ion front');
  // Quiet remains useful under broad-spectrum shear without nullifying the front.
  state.player.energy -= state.player.jammerTurns > 0 ? 0 : 2;
  pushLog(state, 'LOG-ION-PULSE');
}

/**
 * Late-sector ion fronts are short, optional ecology pressure: they tax the
 * Bus/EM together and make an already lit player easier for lit fauna to track.
 */
export const ionFrontMechanic: Mechanic = {
  id: 'ion_front',

  onSectorEnter(state: GameState): void {
    if (canFormIonFront(state) && state.rng() < FRONT_START_CHANCE) startIonFront(state);
  },

  onEndTurn(state: GameState): void {
    if (state.ionFrontTurns <= 0) return;
    if (state.ionFrontTurns % 2 === 0) pulseIonFront(state);
    state.ionFrontTurns -= 1;
    if (state.ionFrontTurns === 0) pushLog(state, 'LOG-ION-CLEAR');
  },

  contextHint(state: GameState): LoreId | null {
    if (state.ionFrontTurns <= 0) return null;
    if (state.player.filterTurns > 0 || state.ionFrontDampened || isQuietStance(state)) {
      return null;
    }
    if (state.scriptedFired.ion_front_hint) return null;
    // Teach only when kit can act — otherwise badge + LOG-ION-* are enough.
    if (
      !hasItem(state, 'filter') &&
      !hasItem(state, 'flare') &&
      !hasItem(state, 'jammer')
    ) {
      return null;
    }
    state.scriptedFired.ion_front_hint = true;
    return 'UI-HINT-ION-FRONT';
  },
};
