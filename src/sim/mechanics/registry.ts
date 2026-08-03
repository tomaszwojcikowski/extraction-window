import type { LoreId } from '../../data/lore';
import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import { roomQuestMechanic } from './roomQuestMechanic';
import { beaconHandshakeMechanic } from './beaconHandshake';
import { quietStanceMechanic } from './quietStance';
import { patternBufferMechanic } from './patternBuffer';
import { scriptedEventsMechanic } from './scriptedEvents';

/**
 * Ordered plug-ins.
 * Handshake + pattern buffer claim actions / autopilot before optional room quests
 * so mid-handshake or desync clear is not interrupted by side-quest pathing.
 */
const MECHANICS: Mechanic[] = [
  beaconHandshakeMechanic,
  patternBufferMechanic,
  quietStanceMechanic,
  roomQuestMechanic,
  scriptedEventsMechanic,
];

export function mechanicsTryAction(state: GameState, action: Action): boolean {
  for (const m of MECHANICS) {
    if (m.tryAction?.(state, action)) return true;
  }
  return false;
}

export function mechanicsOnEndTurn(state: GameState): void {
  for (const m of MECHANICS) {
    m.onEndTurn?.(state);
  }
}

export function mechanicsOnSectorEnter(state: GameState): void {
  for (const m of MECHANICS) {
    m.onSectorEnter?.(state);
  }
}

export function mechanicsModifyFov(state: GameState, base: number): number {
  let r = base;
  for (const m of MECHANICS) {
    if (m.modifyFov) r = m.modifyFov(state, r);
  }
  return r;
}

export function mechanicsContextHint(state: GameState): LoreId | null {
  for (const m of MECHANICS) {
    const h = m.contextHint?.(state);
    if (h) return h;
  }
  return null;
}

export function mechanicsAutopilotHint(state: GameState): Action | null {
  for (const m of MECHANICS) {
    const a = m.autopilotHint?.(state);
    if (a) return a;
  }
  return null;
}

export type { Mechanic } from './types';
