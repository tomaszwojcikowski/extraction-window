import type { LoreId } from '../../data/lore';
import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import { roomQuestMechanic } from './roomQuestMechanic';
import { beaconHandshakeMechanic } from './beaconHandshake';
import { patternBufferMechanic } from './patternBuffer';
import { extractionUplinkMechanic } from './extractionUplink';
import { scriptedEventsMechanic } from './scriptedEvents';
import { npcMechanic } from './npcMechanic';
import { sealedHatchMechanic } from './sealedHatch';
import { tutorialMechanic } from './tutorial';
import { ionFrontMechanic } from './ionFront';
import { consoleHackMechanic } from './consoleHack';

/**
 * Ordered plug-ins.
 * Tutorial first for contextHint / autopilot while drill bay is active.
 * Handshake + pattern buffer claim actions / autopilot before optional room quests
 * so mid-handshake or desync clear is not interrupted by side-quest pathing.
 * Field NPCs hail before room quests when both claim `>`.
 * Sealed pry after NPCs so hail still wins when both are adjacent.
 * Locked terminal after room quests — quest furniture keeps `>` on its own tile.
 */
const MECHANICS: Mechanic[] = [
  tutorialMechanic,
  beaconHandshakeMechanic,
  patternBufferMechanic,
  extractionUplinkMechanic,
  npcMechanic,
  sealedHatchMechanic,
  roomQuestMechanic,
  consoleHackMechanic,
  ionFrontMechanic,
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
