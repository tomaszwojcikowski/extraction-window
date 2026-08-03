import type { LoreId } from '../../data/lore';
import type { Action, GameState } from '../types';

/**
 * Multi-turn / stance / weather plug-ins.
 * Register in registry.ts — actions/turn call the registry only.
 */
export interface Mechanic {
  id: string;
  /** Claim an action before generic handlers. Return true if fully handled. */
  tryAction?(state: GameState, action: Action): boolean;
  /** After environment tick, before enemies (part of endPlayerTurn). */
  onEndTurn?(state: GameState): void;
  onSectorEnter?(state: GameState): void;
  modifyFov?(state: GameState, base: number): number;
  contextHint?(state: GameState): LoreId | null;
  autopilotHint?(state: GameState): Action | null;
}
