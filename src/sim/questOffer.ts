import { lore, type LoreId } from '../data/lore';
import { ALLIES, NPCS, type AllyKind } from '../data/npcs';
import { addItem } from './inventory';
import { pushLog } from './log';
import { spawnAlly } from './allySpawn';
import { clearAllQuestTiles } from './roomQuest';
import type { FieldNpc, GameState, QuestOffer, RoomQuestKind } from './types';

function questKindLabel(kind: RoomQuestKind): LoreId {
  switch (kind) {
    case 'salvage':
      return 'UI-RQ-KIND-SALVAGE';
    case 'purge':
      return 'UI-RQ-KIND-PURGE';
    case 'vent_seal':
      return 'UI-RQ-KIND-VENT';
  }
}

function questCostLabel(kind: RoomQuestKind): LoreId {
  switch (kind) {
    case 'salvage':
      return 'UI-RQ-COST-TIME';
    case 'purge':
      return 'UI-RQ-COST-HP';
    case 'vent_seal':
      return 'UI-RQ-COST-KIT';
  }
}

function roomOfferBody(kind: RoomQuestKind): LoreId {
  switch (kind) {
    case 'salvage':
      return 'UI-RQ-OFFER-SALVAGE';
    case 'purge':
      return 'UI-RQ-OFFER-PURGE';
    case 'vent_seal':
      return 'UI-RQ-OFFER-VENT';
  }
}

export function openRoomQuestOffer(state: GameState): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.done || rq.offer !== 'pending') return false;
  if (state.questOffer) return false;
  state.questOffer = {
    source: 'room',
    title: questKindLabel(rq.kind),
    body: roomOfferBody(rq.kind),
    costLine: questCostLabel(rq.kind),
    payoffLine: 'UI-QUEST-PAYS-KIT',
  };
  pushLog(state, 'LOG-RQ-OFFER', lore(questKindLabel(rq.kind)));
  return true;
}

export function openNpcQuestOffer(state: GameState, npc: FieldNpc): boolean {
  if (state.questOffer) return false;
  if (npc.talked) return false;
  const def = NPCS[npc.kind];
  let body: LoreId;
  let cost: LoreId | null;
  switch (npc.kind) {
    case 'stranded_ensign':
      body = 'UI-NPC-OFFER-ENSIGN';
      cost = 'UI-NPC-COST-MED';
      break;
    case 'field_tech':
      body = 'UI-NPC-OFFER-TECH';
      cost = 'UI-NPC-COST-SEALANT';
      break;
    case 'survey_contact':
      body = 'UI-NPC-OFFER-SURVEY';
      cost = 'UI-NPC-COST-MAPPER';
      break;
    default:
      return false;
  }
  state.questOffer = {
    source: 'npc',
    npcId: npc.id,
    title: def.loreName,
    body,
    costLine: cost,
    payoffLine: 'UI-NPC-OFFER-PAYOFF',
  };
  pushLog(state, 'LOG-NPC-OFFER', lore(def.loreName));
  return true;
}

/** Resolve the open offer. Does not spend a turn. */
export function resolveQuestOffer(state: GameState, accept: boolean): boolean {
  const offer = state.questOffer;
  if (!offer) return false;
  if (offer.source === 'room') return resolveRoomOffer(state, accept);
  return resolveNpcOffer(state, offer, accept);
}

function resolveRoomOffer(state: GameState, accept: boolean): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.offer !== 'pending') {
    state.questOffer = null;
    return false;
  }
  state.questOffer = null;
  if (accept) {
    rq.offer = 'accepted';
    pushLog(state, 'LOG-RQ-ACCEPT', lore(questKindLabel(rq.kind)));
    return true;
  }
  rq.offer = 'declined';
  rq.done = true;
  clearAllQuestTiles(state);
  pushLog(state, 'LOG-RQ-DECLINE', lore(questKindLabel(rq.kind)));
  return true;
}

function resolveNpcOffer(state: GameState, offer: QuestOffer, accept: boolean): boolean {
  const npc = state.npcs.find((n) => n.id === offer.npcId);
  state.questOffer = null;
  if (!npc || npc.talked) return false;

  if (!accept) {
    npc.talked = true;
    npc.agendaOpen = false;
    npc.agendaDone = false;
    pushLog(state, 'LOG-AGENDA-DECLINE', lore(NPCS[npc.kind].loreName));
    return true;
  }

  pushLog(state, 'LOG-AGENDA-ACCEPT', lore(NPCS[npc.kind].loreName));
  completeNpcFirstHail(state, npc);
  return true;
}

function grantNpcCodex(state: GameState, page: LoreId): void {
  if (!state.codexLog.includes(page)) {
    state.codexLog.push(page);
    state.codexPages += 1;
  }
  pushLog(state, page);
}

/** First-hail rewards after the surveyor accepts the contact job. */
export function completeNpcFirstHail(state: GameState, npc: FieldNpc): void {
  const def = NPCS[npc.kind];
  pushLog(state, 'LOG-NPC-HAIL', lore(def.loreName));
  grantNpcCodex(state, def.codex);

  if (npc.kind === 'stranded_ensign') {
    addItem(state, 'med');
    addItem(state, 'energy');
    const allyKind: AllyKind = 'away_escort';
    pushLog(
      state,
      'LOG-NPC-ENSIGN',
      `Hypo + Power Cell · ${lore(ALLIES[allyKind].loreName)}`,
    );
    spawnAlly(state, allyKind, { x: npc.x, y: npc.y });
    npc.agendaOpen = true;
  } else if (npc.kind === 'field_tech') {
    const allyKind: AllyKind = 'probe_drone';
    pushLog(state, 'LOG-NPC-TECH', lore(ALLIES[allyKind].loreName));
    spawnAlly(state, allyKind, { x: npc.x, y: npc.y });
    npc.agendaOpen = true;
  } else if (npc.kind === 'survey_contact') {
    pushLog(state, 'LOG-NPC-SURVEY');
    npc.agendaOpen = true;
    // Survey contacts hand off the sector's optional site when still pending.
    if (state.roomQuest && state.roomQuest.offer === 'pending' && !state.roomQuest.done) {
      state.roomQuest.offer = 'accepted';
      pushLog(state, 'LOG-RQ-ACCEPT', lore(questKindLabel(state.roomQuest.kind)));
    }
  }

  npc.talked = true;
}
