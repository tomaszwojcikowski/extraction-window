import type { LoreId } from '../../data/lore';
import type { Action, GameState, RoomQuestKind } from '../types';
import { tryRoomQuest, tickRoomQuest, questStepPrompt, activeQuestStep } from '../roomQuest';
import { FAVOR_LABEL, favorForQuest } from '../extractFavor';
import type { Mechanic } from './types';
import { lore } from '../../data/lore';

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
    if (!step) return null;
    if (state.player.x === step.pos.x && state.player.y === step.pos.y) {
      return questStepPrompt(rq);
    }
    return null;
  },

  autopilotHint(_state: GameState): Action | null {
    return null;
  },
};

export function questKindLabel(kind: RoomQuestKind): LoreId {
  switch (kind) {
    case 'salvage':
      return 'UI-RQ-KIND-SALVAGE';
    case 'purge':
      return 'UI-RQ-KIND-PURGE';
    case 'vent_seal':
      return 'UI-RQ-KIND-VENT';
  }
}

export function questCostLabel(kind: RoomQuestKind): LoreId {
  switch (kind) {
    case 'salvage':
      return 'UI-RQ-COST-TIME';
    case 'purge':
      return 'UI-RQ-COST-HP';
    case 'vent_seal':
      return 'UI-RQ-COST-KIT';
  }
}

export function roomQuestHudLine(
  state: GameState,
): { prompt: LoreId; index: number; total: number; payoff: string; kind: RoomQuestKind } | null {
  const rq = state.roomQuest;
  if (!rq || rq.done) return null;
  const prompt = questStepPrompt(rq);
  if (!prompt) return null;
  const favor = favorForQuest(state);
  const payoff = favor ? FAVOR_LABEL[favor] : lore('UI-QUEST-PAYS-KIT');
  return {
    prompt,
    index: rq.stepIndex + 1,
    total: rq.steps.length,
    payoff,
    kind: rq.kind,
  };
}

/** Quest tracker — kind, step, cost, payoff. */
export function formatRoomQuestHudLine(state: GameState): string | null {
  const line = roomQuestHudLine(state);
  if (!line) return null;
  const kind = lore(questKindLabel(line.kind));
  const track =
    line.total > 1 ? `${kind} ${line.index}/${line.total}` : kind;
  const cost = lore(questCostLabel(line.kind));
  return `${track} — ${lore(line.prompt)} · ${lore('UI-QUEST-BILLS')} ${cost} · ${lore('UI-QUEST-PAYS')} ${line.payoff}`;
}

export function questBriefLogId(kind: RoomQuestKind): LoreId {
  switch (kind) {
    case 'salvage':
      return 'LOG-RQ-BRIEF-SALVAGE';
    case 'purge':
      return 'LOG-RQ-BRIEF-PURGE';
    case 'vent_seal':
      return 'LOG-RQ-BRIEF-VENT';
  }
}
