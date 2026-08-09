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

const CALIBRATE_WINDOW = 12;

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
    decode: 'UI-RQ-DECODE',
    stabilize: 'UI-RQ-STABILIZE',
    relay_chain: 'UI-RQ-RELAY-A',
    calibrate: 'UI-RQ-CAL-A',
    vent_seal: 'UI-RQ-VENT-A',
  };
  return makeSingleStep(kind, pos, room, prompts[kind]);
}

export function buildMultiRoomQuest(
  kind: 'relay_chain' | 'calibrate' | 'vent_seal',
  sites: Array<{ pos: Pos; room: { x: number; y: number; w: number; h: number } }>,
): RoomQuest {
  if (kind === 'relay_chain' && sites.length >= 2) {
    const a = sites[0]!;
    const b = sites[1]!;
    const steps: QuestStep[] = [
      {
        id: 'relay-a',
        pos: { ...a.pos },
        room: { ...a.room },
        done: false,
        prompt: 'UI-RQ-RELAY-A',
      },
      {
        id: 'relay-b',
        pos: { ...b.pos },
        room: { ...b.room },
        done: false,
        prompt: 'UI-RQ-RELAY-B',
      },
      {
        id: 'relay-return',
        pos: { ...a.pos },
        room: { ...a.room },
        done: false,
        prompt: 'UI-RQ-RELAY-RETURN',
      },
    ];
    const rq: RoomQuest = {
      kind,
      steps,
      stepIndex: 0,
      pos: { ...a.pos },
      room: { ...a.room },
      stage: 0,
      done: false,
      spawnedIds: [],
    };
    return rq;
  }
  if (kind === 'calibrate' && sites.length >= 2) {
    const a = sites[0]!;
    const b = sites[1]!;
    const steps: QuestStep[] = [
      {
        id: 'cal-a',
        pos: { ...a.pos },
        room: { ...a.room },
        done: false,
        prompt: 'UI-RQ-CAL-A',
      },
      {
        id: 'cal-b',
        pos: { ...b.pos },
        room: { ...b.room },
        done: false,
        prompt: 'UI-RQ-CAL-B',
      },
    ];
    return {
      kind,
      steps,
      stepIndex: 0,
      pos: { ...a.pos },
      room: { ...a.room },
      stage: 0,
      done: false,
      spawnedIds: [],
    };
  }
  // vent_seal
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
  if (kind === 'battery') kind = 'coolant';
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
    tier === 'good' ? ['mapper', 'lens', 'coolant', 'plate'] : ['patch', 'coolant', 'dart', 'filter'];
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
    ? ['plate', 'coolant', 'med', 'filter', 'mapper']
    : ['energy', 'med', 'dart', 'sealant', 'patch'];
  const a = pick(state.rng, loot);
  const b = pick(state.rng, loot);
  addLoot(state, a);
  addLoot(state, b);
  const names = [lore(ITEMS[a].loreName), lore(ITEMS[b].loreName)];
  if (better) {
    const c = pick(state.rng, ['coolant', 'plate', 'lens'] as ItemKind[]);
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
  const better = rq.kind === 'relay_chain' || rq.kind === 'calibrate' || rq.kind === 'vent_seal';
  if (rq.kind === 'relay_chain') pushLog(state, 'LOG-RQ-RELAY');
  else if (rq.kind === 'calibrate') pushLog(state, 'LOG-RQ-CALIBRATE');
  else if (rq.kind === 'vent_seal') pushLog(state, 'LOG-RQ-VENT');
  finishQuestLoot(state, better);
  clearAllQuestTiles(state);
}

/** Spawn a weak pack near the next step — used by scriptedEvents on relay step1. */
export function spawnRelayAmbushNearStep(state: GameState, near: Pos): void {
  const rq = state.roomQuest;
  if (!rq) return;
  const kinds = ['mite', 'reef_skitter'] as const;
  const n = randInt(state.rng, 1, 2);
  for (let i = 0; i < n; i++) {
    const kind = pick(state.rng, [...kinds]);
    const def = ENEMIES[kind];
    const scaled = scaleEnemyCombat(def, state.sectorIndex, state.level, 'normal');
    const ox = i === 0 ? 1 : -1;
    const x = Math.max(1, Math.min(state.width - 2, near.x + ox));
    const y = near.y;
    if (!state.tiles[y]?.[x]?.walkable) continue;
    state.enemies.push({
      id: state.nextEntityId++,
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
  }
  pushLog(state, 'LOG-RQ-RELAY-AMBUSH');
}

/** Call after player moves — purge wake / decode tick / calibrate timer. */
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
  if (
    rq.kind === 'decode' &&
    state.player.x === rq.pos.x &&
    state.player.y === rq.pos.y &&
    rq.stage < 3
  ) {
    rq.stage += 1;
    if (rq.stage < 3) pushLog(state, 'LOG-RQ-DECODE-TICK', `${rq.stage}/3`);
    else completeDecode(state);
  }

  // Calibrate soft timer after mast A locked
  if (rq.kind === 'calibrate' && rq.stepIndex === 1 && rq.stage > 0) {
    rq.stage -= 1;
    if (rq.stage <= 0) {
      pushLog(state, 'LOG-RQ-CAL-FAIL');
      rq.stepIndex = 0;
      rq.stage = 0;
      if (rq.steps[0]) rq.steps[0].done = false;
      if (rq.steps[1]) rq.steps[1].done = false;
      syncQuestActive(rq);
    }
  }
}

function completeDecode(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;
  rq.done = true;
  if (rq.steps[0]) rq.steps[0].done = true;
  pushLog(state, 'LOG-RQ-DECODE');
  grantQuestPayoff(state, 'good');
  grantCodex(state);
  grantExtractFavor(state, favorForQuest(state));
  clearAllQuestTiles(state);
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
    if (t && (t.kind === 'poi' || t.kind === 'quest')) {
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
  if (rq.kind === 'decode') {
    if (rq.stage >= 3 || rq.done) return false;
    const pIdx = state.inventory.findIndex((s) => s.kind === 'probe');
    if (pIdx >= 0) {
      const slot = state.inventory[pIdx]!;
      slot.count -= 1;
      if (slot.count <= 0) state.inventory.splice(pIdx, 1);
      completeDecode(state);
      return true;
    }
    pushLog(state, 'LOG-RQ-DECODE-TICK', `${rq.stage}/3`);
    return true;
  }
  if (rq.kind === 'stabilize') {
    pushLog(state, 'LOG-RQ-NEED');
    return true;
  }
  if (rq.kind === 'relay_chain') {
    advanceStep(state);
    return true;
  }
  if (rq.kind === 'calibrate') {
    if (rq.stepIndex === 0) {
      advanceStep(state);
      rq.stage = CALIBRATE_WINDOW;
      pushLog(state, 'LOG-RQ-CAL-TICK', `${CALIBRATE_WINDOW}`);
      return true;
    }
    // mast B within window
    advanceStep(state);
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

/**
 * Repair a cracked array node with sealant or a spare filter. Unlike vent_seal,
 * this is a single-site bus stabilization that grants a temporary hold charge.
 */
export function tryStabilizeQuest(state: GameState, withKind: 'sealant' | 'filter'): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.done) return false;
  syncQuestActive(rq);

  if (rq.kind === 'vent_seal' && rq.stepIndex === 0) {
    if (state.player.x !== rq.pos.x || state.player.y !== rq.pos.y) return false;
    if (withKind !== 'sealant') {
      pushLog(state, 'LOG-RQ-NEED');
      return false;
    }
    advanceStep(state);
    pushLog(state, 'LOG-RQ-VENT-SEALED');
    void withKind;
    return true;
  }

  if (rq.kind !== 'stabilize') return false;
  if (state.player.x !== rq.pos.x || state.player.y !== rq.pos.y) return false;
  rq.done = true;
  if (rq.steps[0]) rq.steps[0].done = true;
  state.player.armor = state.player.maxArmor;
  state.player.stabilizeTurns = Math.max(state.player.stabilizeTurns, 30);
  state.emStress = Math.max(0, state.emStress - 35);
  pushLog(state, 'LOG-RQ-STABILIZE');
  pushLog(state, 'LOG-EM-PURGE', '-35');
  grantQuestPayoff(state, 'good');
  grantCodex(state);
  grantExtractFavor(state, favorForQuest(state));
  clearAllQuestTiles(state);
  void withKind;
  return true;
}

const BASE_ROOM_QUEST_KINDS: RoomQuestKind[] = ['salvage', 'purge', 'vent_seal', 'decode'];
const RELAY_ROOM_QUEST_KINDS: RoomQuestKind[] = [...BASE_ROOM_QUEST_KINDS, 'relay_chain'];
const STABILIZE_ROOM_QUEST_KINDS: RoomQuestKind[] = [
  ...BASE_ROOM_QUEST_KINDS,
  'relay_chain',
  'stabilize',
];
const CALIBRATE_ROOM_QUEST_KINDS: RoomQuestKind[] = [...BASE_ROOM_QUEST_KINDS, 'calibrate'];
const DUAL_MAST_ROOM_QUEST_KINDS: RoomQuestKind[] = [
  ...BASE_ROOM_QUEST_KINDS,
  'relay_chain',
  'calibrate',
];

/**
 * Relay-chain is a midgame optional route investment. Dual-mast calibration
 * starts only after the beacon, when linked arrays fit the shelf fiction. Cracked
 * array-node stabilization is a lower-weight, short midgame detour before the
 * linked-array content becomes available.
 */
export function pickRoomQuestKind(rng: () => number, sectorIndex: number): RoomQuestKind {
  const pool =
    sectorIndex >= 7 && sectorIndex <= 10
      ? DUAL_MAST_ROOM_QUEST_KINDS
      : sectorIndex >= 5 && sectorIndex <= 6
        ? STABILIZE_ROOM_QUEST_KINDS
        : sectorIndex === 4
        ? RELAY_ROOM_QUEST_KINDS
        : sectorIndex >= 11 && sectorIndex <= 12
          ? CALIBRATE_ROOM_QUEST_KINDS
          : BASE_ROOM_QUEST_KINDS;
  return pool[Math.floor(rng() * pool.length)]!;
}

/** Multi-site builders for linked arrays and the vent-seal procedure. */
export function isMultiSiteKind(kind: RoomQuestKind): boolean {
  return kind === 'relay_chain' || kind === 'calibrate' || kind === 'vent_seal';
}

export function questStepPrompt(rq: RoomQuest): LoreId | null {
  if (rq.done) return null;
  const step = activeQuestStep(rq);
  return step?.prompt ?? null;
}
