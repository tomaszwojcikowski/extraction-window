import type { GameState } from '../types';
import type { Mechanic } from './types';

/**
 * Nav Core pattern buffer — desync accrual and shuttle soft-lock removed.
 * EM + uplink hold already bill the extract spine; a second cell-gated lock
 * was busywork, not discovery.
 */
export function tryClearPatternDesync(_state: GameState): boolean {
  return false;
}

/** No-op — kept registered so saves and docs references stay stable. */
export const patternBufferMechanic: Mechanic = {
  id: 'pattern_buffer',
};
