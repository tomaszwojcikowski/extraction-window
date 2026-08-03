import type { Action, GameState } from '../types';
import { tryRoomQuest, tickRoomQuest, questStepPrompt, activeQuestStep } from '../roomQuest';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';

/**
 * Optional side-room anomalies — interact via `>` on the quest tile.
 * When tryAction returns true, the action dispatcher must end the player turn.
 */
export const roomQuestMechanic: Mechanic = {
  id: 'room_quest',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    return tryRoomQuest(state);
  },

  onEndTurn(state: GameState): void {
    tickRoomQuest(state);
    if (state.ui.questFlash > 0) state.ui.questFlash -= 1;
  },

  contextHint(state: GameState): LoreId | null {
    const rq = state.roomQuest;
    if (!rq || rq.done) return null;
    const step = activeQuestStep(rq);
    if (step && state.player.x === step.pos.x && state.player.y === step.pos.y) {
      return 'UI-HINT-QUEST';
    }
    return null;
  },

  autopilotHint(_state: GameState): Action | null {
    // Optional quests are player-facing depth; autopilot stays on the causal chain
    return null;
  },
};

export function roomQuestHudLine(state: GameState): { prompt: LoreId; index: number; total: number } | null {
  const rq = state.roomQuest;
  if (!rq || rq.done) return null;
  const prompt = questStepPrompt(rq);
  if (!prompt) return null;
  return { prompt, index: rq.stepIndex + 1, total: rq.steps.length };
}
