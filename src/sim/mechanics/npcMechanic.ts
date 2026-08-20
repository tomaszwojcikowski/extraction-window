import { NPCS } from '../../data/npcs';
import { lore, type LoreId } from '../../data/lore';
import { XP_NPC_AGENDA } from '../../data/progression';
import { addItem, hasItem, removeOne } from '../inventory';
import { pushLog } from '../log';
import { gainXp } from '../progression';
import { isItemWorn } from '../equip';
import { nearestUnlootedCache } from '../cacheSurvey';
import { openNpcQuestOffer } from '../questOffer';
import { spawnAlly } from '../allySpawn';
import { manhattan } from '../spatial';
import type { Action, FieldNpc, GameState } from '../types';
import type { Mechanic } from './types';

const COMM_HAIL_RANGE = 2;

function commWorn(state: GameState): boolean {
  return isItemWorn(state, 'field_comm');
}

function hailRange(state: GameState, forAgenda: boolean): number {
  if (forAgenda && commWorn(state)) return COMM_HAIL_RANGE;
  return 1;
}

function nearHailNpc(state: GameState): FieldNpc | null {
  let best: FieldNpc | null = null;
  let bestD = 99;
  for (const n of state.npcs) {
    const d = manhattan(state.player.x, state.player.y, n.x, n.y);
    const maxR = n.talked && n.agendaOpen && !n.agendaDone ? hailRange(state, true) : 1;
    if (d > maxR || d >= bestD) continue;
    if (!n.talked || (n.agendaOpen && !n.agendaDone)) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

function npcWithOpenAgendaInRange(state: GameState): FieldNpc | null {
  for (const n of state.npcs) {
    if (!n.agendaOpen || n.agendaDone) continue;
    const d = manhattan(state.player.x, state.player.y, n.x, n.y);
    if (d <= hailRange(state, true)) return n;
  }
  return null;
}

export { spawnAlly };

function grantNpcCodex(state: GameState, page: LoreId): void {
  if (!state.codexLog.includes(page)) {
    state.codexLog.push(page);
    state.codexPages += 1;
  }
  pushLog(state, page);
}

function noticeVisibleNpcs(state: GameState): void {
  for (const n of state.npcs) {
    if (n.talked) continue;
    if (state.noticedNpcIds.includes(n.id)) continue;
    if (!(state.visible[n.y]?.[n.x] ?? false)) continue;
    state.noticedNpcIds.push(n.id);
    pushLog(state, 'LOG-NPC-SIGHT', lore(NPCS[n.kind].loreName));
  }
}

function agendaWantLog(npc: FieldNpc): LoreId {
  switch (npc.kind) {
    case 'stranded_ensign':
      return 'LOG-AGENDA-WANT-MED';
    case 'field_tech':
      return 'LOG-AGENDA-WANT-SEALANT';
    case 'survey_contact':
      return 'LOG-AGENDA-WANT-SURVEY';
    default:
      return 'LOG-AGENDA-NONE';
  }
}

function tryCompleteAgenda(state: GameState, npc: FieldNpc): boolean {
  if (!npc.agendaOpen || npc.agendaDone) return false;

  let ok = false;
  if (npc.kind === 'stranded_ensign') {
    if (hasItem(state, 'med')) {
      removeOne(state, 'med');
      ok = true;
    }
  } else if (npc.kind === 'field_tech') {
    if (hasItem(state, 'sealant')) {
      removeOne(state, 'sealant');
      ok = true;
    } else if (hasItem(state, 'filter')) {
      removeOne(state, 'filter');
      ok = true;
    }
  } else if (npc.kind === 'survey_contact') {
    if (hasItem(state, 'mapper')) {
      removeOne(state, 'mapper');
      ok = true;
    }
  } else {
    pushLog(state, 'LOG-AGENDA-NONE');
    npc.agendaDone = true;
    return true;
  }

  if (!ok) {
    pushLog(state, agendaWantLog(npc));
    return true;
  }

  gainXp(state, XP_NPC_AGENDA, 'agenda');
  npc.agendaDone = true;
  addItem(state, 'energy');
  pushLog(state, 'LOG-AGENDA-DONE');
  return true;
}

function hailNpc(state: GameState, npc: FieldNpc): boolean {
  if (npc.talked) {
    return tryCompleteAgenda(state, npc);
  }

  // Archive holo has no agenda job — immediate handoff, no modal.
  if (npc.kind === 'archive_holo') {
    const def = NPCS[npc.kind];
    pushLog(state, 'LOG-NPC-HAIL', lore(def.loreName));
    grantNpcCodex(state, def.codex);
    addItem(state, 'energy');
    pushLog(state, 'LOG-NPC-HOLO');
    npc.talked = true;
    return true;
  }

  // Agenda contacts open the accept/decline offer modal (no turn until resolved).
  return openNpcQuestOffer(state, npc);
}

export function tryHailNpc(state: GameState): boolean {
  const npc = nearHailNpc(state);
  if (!npc) return false;
  return hailNpc(state, npc);
}

export const npcMechanic: Mechanic = {
  id: 'field_npc',

  onSectorEnter(state: GameState): void {
    if (!commWorn(state)) return;
    const key = `comm_cache_hint_${state.sectorIndex}`;
    if (state.scriptedFired[key]) return;
    if (!nearestUnlootedCache(state)) return;
    state.scriptedFired[key] = true;
    pushLog(state, 'LOG-COMM-CACHE-HINT');
  },

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    return tryHailNpc(state);
  },

  onEndTurn(state: GameState): void {
    noticeVisibleNpcs(state);
  },

  contextHint(state: GameState): LoreId | null {
    if (nearHailNpc(state)) return 'UI-HINT-NPC';
    if (commWorn(state) && npcWithOpenAgendaInRange(state)) {
      return 'UI-HINT-AGENDA-COMM';
    }
    return null;
  },

  autopilotHint(state: GameState): Action | null {
    if (state.player.hp < state.player.maxHp * 0.55) return null;
    for (const n of state.npcs) {
      if (n.talked) continue;
      const d = manhattan(state.player.x, state.player.y, n.x, n.y);
      if (d <= 1) return { type: 'exit' };
    }
    return null;
  },
};
