import { pushLog } from '../log';
import { addEmStress } from '../emStress';
import type { GameState } from '../types';
import type { Mechanic } from './types';

const FRONT_DURATION = 6;
const FRONT_START_CHANCE = 0.6;

function canFormIonFront(state: GameState): boolean {
  return !state.tutorialActive && state.sectorIndex >= 6;
}

export function startIonFront(state: GameState): void {
  state.ionFrontTurns = FRONT_DURATION;
  state.ionFrontDampened = false;
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
 * bus/EM together and make an already lit player easier for lit fauna to track.
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
};
