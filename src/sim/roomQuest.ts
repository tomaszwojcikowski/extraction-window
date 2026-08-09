import type { LoreId } from '../data/lore';
import { lore } from '../data/lore';
import { ITEMS, INVENTORY_SLOTS, type ItemKind } from '../data/items';
import { ENEMIES } from '../data/enemies';
import { scaleEnemyCombat } from '../data/difficulty';
import { XP_ROOM_QUEST } from '../data/progression';
import { pushLog } from './log';
import { gainXp } from './progression';
import { pick, randInt } from './rng';
import { favorForQuest, grantExtractFavor } from './extractFavor';
import { pickFactCodex } from './facts';
import type { GameState, Pos, QuestStep, RoomQuest, RoomQuestKind } from './types';

const CODEX_BY_SECTOR: Partial<Record<string, LoreId>> = {
  spire: 'CODEX-SPIRE',
  trench: 'CODEX-TRENCH',
  brine: 'CODEX-BRINE',
  fissure: 'CODEX-FISSURE',
  vault: 'CODEX-VAULT',
  reef: 'CODEX-REEF',
  duct: 'CODEX-DUCT',
  approach: 'CODEX-APPROACH',
};


export function activeQuestStep(rq: RoomQuest): QuestStep | null {
  if (rq.done || rq.steps.length === 0) return null;
  return rq.steps[Math.min(rq.stepIndex, rq.steps.length - 1)] ?? null;
}

/** Keep legacy `pos` / `room` mirrors pointed at the active step. */
export function syncQuestActive(rq: RoomQuest): void {
  const step = rq.steps[Math.min(rq.stepIndex, rq.steps.length - 1)];
  if (!step) return;
  rq.pos = { x: step.pos.x, y: step.pos.y };
  rq.room = { ...step.room };
}

function makeSingleStep(
  kind: RoomQuestKind,
  pos: Pos,
  room: { x: number; y: number; w: number; h: number },
  prompt: LoreId,
): RoomQuest {
  const step: QuestStep = {
    id: `${kind}-0`,
    pos: { ...pos },
    room: { ...room },
    done: false,
    prompt,
  };
  return {
    kind,
    steps: [step],
    stepIndex: 0,
    pos: { ...pos },
    room: { ...room },
    stage: 0,
    done: false,
    spawnedIds: [],
  };
}

export function buildSingleRoomQuest(
  kind: RoomQuestKind,
  pos: Pos,
  room: { x: number; y: number; w: number; h: number },
): RoomQuest {
  const prompts: Record<RoomQuestKind, LoreId> = {
    salvage: 'UI-RQ-SALVAGE',
    purge: 'UI-RQ-PURGE',
    vent_seal: 'UI-RQ-VENT-A',
  };
  return makeSingleStep(kind, pos, room, prompts[kind]);
}

/** Vent seal is the only two-site quest: seal the vent, then lock it at the console. */
export function buildVentSealQuest(
  sites: Array<{ pos: Pos; room: { x: number; y: number; w: number; h: number } }>,
): RoomQuest {
  const a = sites[0]!;
  const b = sites[1] ?? sites[0]!;
  const steps: QuestStep[] = [
    {
      id: 'vent-a',
      pos: { ...a.pos },
      room: { ...a.room },
      done: false,
      prompt: 'UI-RQ-VENT-A',
    },
    {
      id: 'vent-b',
      pos: { ...b.pos },
      room: { ...b.room },
      done: false,
      prompt: 'UI-RQ-VENT-B',
    },
  ];
  return {
    kind: 'vent_seal',
    steps,
    stepIndex: 0,
    pos: { ...a.pos },
    room: { ...a.room },
    stage: 0,
    done: false,
    spawnedIds: [],
  };
}

function addLoot(state: GameState, kind: ItemKind): void {
  const def = ITEMS[kind];
  if (def.stackable) {
    const idx = state.inventory.findIndex((s) => s.kind === kind);
    if (idx >= 0) {
      state.inventory[idx]!.count += 1;
      return;
    }
  }
  if (state.inventory.length >= INVENTORY_SLOTS) return;
  state.inventory.push({ kind, count: 1 });
}

export function grantCodex(state: GameState): void {
  state.codexPages += 1;
  // Room facts first: prefer a page this ground can actually justify, and fall
  // back to the sector brief only when nothing binds.
  const page =
    pickFactCodex(state, state.codexLog) ?? CODEX_BY_SECTOR[state.sectorId] ?? 'CODEX-GENERIC';
  if (!state.codexLog.includes(page)) state.codexLog.push(page);
  applyPaddModifier(state, page);
  pushLog(state, 'LOG-CODEX');
  pushLog(state, page);
  gainXp(state, XP_ROOM_QUEST, 'quest');
}

/** PADD pages change the run (ADOM lore that matters). */
function applyPaddModifier(state: GameState, page: LoreId): void {
  switch (page) {
    case 'CODEX-SPIRE':
      state.paddMods.fovBonus = Math.max(state.paddMods.fovBonus, 1);
      pushLog(state, 'LOG-PADD-MOD', '+FOV');
      break;
    case 'CODEX-BRINE':
      state.paddMods.filterBonus = Math.max(state.paddMods.filterBonus, 15);
      state.paddMods.brineSeal = true;
      pushLog(state, 'LOG-PADD-MOD', 'filter+/seal');
      break;
    case 'CODEX-VAULT':
      state.paddMods.quietVault = true;
      pushLog(state, 'LOG-PADD-MOD', 'quiet vault');
      break;
    case 'CODEX-TRENCH':
      state.stormTurns += 15;
      pushLog(state, 'LOG-PADD-MOD', '+15 window');
      break;
    case 'CODEX-FISSURE':
      state.player.def += 1;
      pushLog(state, 'LOG-PADD-MOD', '+1 DEF');
      break;
    case 'CODEX-REEF':
      state.paddMods.fovBonus = Math.max(state.paddMods.fovBonus, 1);
      purgeEmViaPadd(state);
      pushLog(state, 'LOG-PADD-MOD', 'reef FOV');
      break;
    case 'CODEX-DUCT':
      state.stormTurns += 10;
      pushLog(state, 'LOG-PADD-MOD', '+10 window');
      break;
    case 'CODEX-APPROACH':
      state.player.filterTurns = Math.max(state.player.filterTurns, 20);
      pushLog(state, 'LOG-PADD-MOD', 'filter pulse');
      break;
    default:
      purgeEmViaPadd(state);
      break;
  }
}

function purgeEmViaPadd(state: GameState): void {
  state.emStress = Math.max(0, state.emStress - 10);
}

/** Storm refund / temporary systems charge / unique consumable — changes the run. */
function grantQuestPayoff(state: GameState, tier: 'basic' | 'good'): void {
  const refund = tier === 'good' ? 20 : 12;
  state.stormTurns += refund;
  pushLog(state, 'LOG-RQ-STORM', `+${refund}`);

  if (tier === 'good' || state.rng() < 0.45) {
    state.player.filterTurns = Math.max(state.player.filterTurns, 35);
    state.player.stimTurns = Math.max(state.player.stimTurns, 12);
    pushLog(state, 'LOG-RQ-CHARGE');
  }

  const unique: ItemKind[] =
    tier === 'good' ? ['mapper', 'probe', 'energy', 'plate'] : ['med', 'energy', 'dart', 'filter'];
  addLoot(state, pick(state.rng, unique));
}

function inRoom(room: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h;
}

function spawnPurgeHostiles(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;
  const kinds = ['mite', 'wasp', 'skitter'] as const;
  const n = randInt(state.rng, 1, 2);
  rq.spawnedIds = [];
  for (let i = 0; i < n; i++) {
    const kind = pick(state.rng, [...kinds]);
    const def = ENEMIES[kind];
    const scaled = scaleEnemyCombat(def, state.sectorIndex, state.level, 'normal');
    const x = Math.min(rq.room.x + rq.room.w - 2, Math.max(rq.room.x + 1, rq.pos.x + (i === 0 ? 1 : -1)));
    const y = rq.pos.y;
    const id = state.nextEntityId++;
    state.enemies.push({
      id,
      kind,
      x,
      y,
      hp: scaled.hp,
      maxHp: scaled.hp,
      atk: scaled.atk,
      def: scaled.def,
      alive: true,
      statuses: {},
      alerted: true,
      swellTurns: 0,
      homeX: x,
      homeY: y,
      skirmishRetreat: false,
      windup: 0,
      beamCooldown: 0,
      tier: 'normal',
    });
    rq.spawnedIds.push(id);
  }
  rq.stage = 1;
  pushLog(state, 'LOG-RQ-PURGE-WAKE');
}

function purgeCleared(state: GameState): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.spawnedIds.length === 0) return false;
  return rq.spawnedIds.every((id) => {
    const en = state.enemies.find((e) => e.id === id);
    return !en || !en.alive;
  });
}

function finishQuestLoot(state: GameState, better: boolean): void {
  const loot: ItemKind[] = better
    ? ['plate', 'energy', 'med', 'filter', 'mapper']
    : ['energy', 'med', 'dart', 'sealant', 'med'];
  const a = pick(state.rng, loot);
  const b = pick(state.rng, loot);
  addLoot(state, a);
  addLoot(state, b);
  const names = [lore(ITEMS[a].loreName), lore(ITEMS[b].loreName)];
  if (better) {
    const c = pick(state.rng, ['energy', 'plate', 'probe'] as ItemKind[]);
    addLoot(state, c);
    names.push(lore(ITEMS[c].loreName));
  }
  pushLog(state, 'LOG-PICKUP', names.join(', '));
  grantQuestPayoff(state, better ? 'good' : 'basic');
  grantCodex(state);
  grantExtractFavor(state, favorForQuest(state));
}

function flashQuestStep(state: GameState): void {
  state.ui.questFlash = Math.max(state.ui.questFlash, 4);
}

function advanceStep(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;
  const cur = rq.steps[rq.stepIndex];
  if (cur) cur.done = true;
  flashQuestStep(state);
  if (rq.stepIndex + 1 >= rq.steps.length) {
    completeMultiQuest(state);
    return;
  }
  rq.stepIndex += 1;
  syncQuestActive(rq);
  pushLog(state, 'LOG-RQ-STEP', `${rq.stepIndex + 1}/${rq.steps.length}`);
}

function completeMultiQuest(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;
  rq.done = true;
  pushLog(state, 'LOG-RQ-VENT');
  finishQuestLoot(state, true);
  clearAllQuestTiles(state);
}

/** Call after player moves — purge wake / decode tick / calibrate timer. */
/** Call after the player moves — purge is the only quest that wakes on entry. */
export function tickRoomQuest(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;
  syncQuestActive(rq);

  if (rq.kind === 'purge' && rq.stage === 0 && inRoom(rq.room, state.player.x, state.player.y)) {
    spawnPurgeHostiles(state);
  }
  if (rq.kind === 'purge' && rq.stage === 1 && purgeCleared(state)) {
    rq.stage = 2;
  }
}

function clearAllQuestTiles(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq) return;
  const seen = new Set<string>();
  for (const step of rq.steps) {
    const key = `${step.pos.x},${step.pos.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const t = state.tiles[step.pos.y]?.[step.pos.x];
    if (t && (t.kind === 'landmark' || t.kind === 'quest')) {
      state.tiles[step.pos.y]![step.pos.x] = {
        kind: 'floor',
        walkable: true,
        transparent: true,
      };
    }
  }
}

/** Interact with room-quest console via > */
export function tryRoomQuest(state: GameState): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.done) return false;
  syncQuestActive(rq);
  if (state.player.x !== rq.pos.x || state.player.y !== rq.pos.y) return false;

  if (rq.kind === 'salvage') {
    rq.done = true;
    if (rq.steps[0]) rq.steps[0].done = true;
    pushLog(state, 'LOG-RQ-SALVAGE');
    finishQuestLoot(state, false);
    clearAllQuestTiles(state);
    return true;
  }
  if (rq.kind === 'purge') {
    if (rq.stage < 2) {
      pushLog(state, 'LOG-RQ-NEED');
      return true;
    }
    rq.done = true;
    if (rq.steps[0]) rq.steps[0].done = true;
    pushLog(state, 'LOG-RQ-PURGE');
    finishQuestLoot(state, true);
    clearAllQuestTiles(state);
    return true;
  }
  if (rq.kind === 'vent_seal') {
    if (rq.stepIndex === 0) {
      pushLog(state, 'LOG-RQ-NEED');
      return true;
    }
    advanceStep(state);
    return true;
  }
  return false;
}

/** Seal the first vent site with sealant — the kit cost that opens site B. */
export function trySealVentSite(state: GameState): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.done) return false;
  syncQuestActive(rq);
  if (rq.kind !== 'vent_seal' || rq.stepIndex !== 0) return false;
  if (state.player.x !== rq.pos.x || state.player.y !== rq.pos.y) return false;
  advanceStep(state);
  pushLog(state, 'LOG-RQ-VENT-SEALED');
  return true;
}

const ROOM_QUEST_KINDS: RoomQuestKind[] = ['salvage', 'purge', 'vent_seal'];

/** Every sector draws from the same three; depth changes the danger, not the ask. */
export function pickRoomQuestKind(rng: () => number): RoomQuestKind {
  return pick(rng, ROOM_QUEST_KINDS);
}

/** Multi-site builders for linked arrays and the vent-seal procedure. */
export function isMultiSiteKind(kind: RoomQuestKind): boolean {
  return kind === 'vent_seal';
}

export function questStepPrompt(rq: RoomQuest): LoreId | null {
  if (rq.done) return null;
  const step = activeQuestStep(rq);
  return step?.prompt ?? null;
}
