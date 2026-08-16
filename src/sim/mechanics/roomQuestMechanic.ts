import type { Action, GameState } from '../types';
import { tryRoomQuest, tickRoomQuest, questStepPrompt, activeQuestStep } from '../roomQuest';
import { FAVOR_LABEL, favorForQuest } from '../extractFavor';
import type { Mechanic } from './types';
import { lore, type LoreId } from '../../data/lore';

/**
 * Optional side-room anomalies — interact via `>` on the quest tile
 * (vent-seal site A uses Sealant Foam instead).
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
      // Step prompt names the real verb (sealant vs Enter) — not a generic OPT tip.
      return step.prompt;
    }
    return null;
  },

  autopilotHint(_state: GameState): Action | null {
    // Optional quests are player-facing depth; autopilot stays on the causal chain
    return null;
  },
};

export function roomQuestHudLine(
  state: GameState,
): { prompt: LoreId; index: number; total: number; favor: string } | null {
  const rq = state.roomQuest;
  if (!rq || rq.done) return null;
  const prompt = questStepPrompt(rq);
  if (!prompt) return null;
  return {
    prompt,
    index: rq.stepIndex + 1,
    total: rq.steps.length,
    favor: FAVOR_LABEL[favorForQuest(state)],
  };
}

/** Compact OPT tracker for the HUD — step verb + extract favor preview. */
export function formatRoomQuestHudLine(state: GameState): string | null {
  const line = roomQuestHudLine(state);
  if (!line) return null;
  const track =
    line.total > 1
      ? `${lore('UI-QUEST-BADGE')} ${line.index}/${line.total}`
      : lore('UI-QUEST-BADGE');
  return `${track} — ${lore(line.prompt)} · ${lore('UI-QUEST-PAYS')} ${line.favor}`;
}
