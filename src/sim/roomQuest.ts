import type { LoreId } from '../data/lore';
import { ITEMS, INVENTORY_SLOTS, type ItemKind } from '../data/items';
import { ENEMIES } from '../data/enemies';
import { pushLog } from './combat';
import { pick, randInt } from './rng';
import type { GameState, RoomQuest, RoomQuestKind } from './types';

const CODEX_BY_SECTOR: Partial<Record<string, LoreId>> = {
  spire: 'CODEX-SPIRE',
  trench: 'CODEX-TRENCH',
  brine: 'CODEX-BRINE',
  fissure: 'CODEX-FISSURE',
  vault: 'CODEX-VAULT',
};

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
  const page = CODEX_BY_SECTOR[state.sectorId] ?? 'CODEX-GENERIC';
  pushLog(state, 'LOG-CODEX');
  pushLog(state, page);
}

function inRoom(rq: RoomQuest, x: number, y: number): boolean {
  return (
    x >= rq.room.x &&
    y >= rq.room.y &&
    x < rq.room.x + rq.room.w &&
    y < rq.room.y + rq.room.h
  );
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
    const x = Math.min(rq.room.x + rq.room.w - 2, Math.max(rq.room.x + 1, rq.pos.x + (i === 0 ? 1 : -1)));
    const y = rq.pos.y;
    const id = state.nextEntityId++;
    state.enemies.push({
      id,
      kind,
      x,
      y,
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      def: def.def,
      alive: true,
      statuses: {},
      alerted: true,
      swellTurns: 0,
      homeX: x,
      homeY: y,
      skirmishRetreat: false,
      windup: 0,
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
    ? ['plate', 'battery', 'med', 'filter', 'mapper']
    : ['energy', 'med', 'dart', 'sealant', 'patch'];
  addLoot(state, pick(state.rng, loot));
  addLoot(state, pick(state.rng, loot));
  if (better) addLoot(state, pick(state.rng, ['battery', 'plate', 'lens'] as ItemKind[]));
  pushLog(state, 'LOG-PICKUP');
  grantCodex(state);
}

/** Call after player moves — purge wake / decode tick. */
export function tickRoomQuest(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;

  if (rq.kind === 'purge' && rq.stage === 0 && inRoom(rq, state.player.x, state.player.y)) {
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
}

function completeDecode(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;
  rq.done = true;
  state.stormTurns += 40;
  pushLog(state, 'LOG-RQ-DECODE');
  grantCodex(state);
  clearQuestTile(state);
}

function clearQuestTile(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq) return;
  state.tiles[rq.pos.y]![rq.pos.x] = {
    kind: 'floor',
    walkable: true,
    transparent: true,
  };
}

/** Interact with room-quest console via > */
export function tryRoomQuest(state: GameState): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.done) return false;
  if (state.player.x !== rq.pos.x || state.player.y !== rq.pos.y) return false;

  if (rq.kind === 'salvage') {
    rq.done = true;
    pushLog(state, 'LOG-RQ-SALVAGE');
    finishQuestLoot(state, false);
    clearQuestTile(state);
    return true;
  }
  if (rq.kind === 'purge') {
    if (rq.stage < 2) {
      pushLog(state, 'LOG-RQ-NEED');
      return true;
    }
    rq.done = true;
    pushLog(state, 'LOG-RQ-PURGE');
    finishQuestLoot(state, true);
    clearQuestTile(state);
    return true;
  }
  if (rq.kind === 'decode') {
    if (rq.stage >= 3 || rq.done) return false;
    // Spend probe to finish immediately
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
  return false;
}

/** Sealant/filter used on stabilize quest tile. */
export function tryStabilizeQuest(state: GameState, withKind: 'sealant' | 'filter'): boolean {
  const rq = state.roomQuest;
  if (!rq || rq.done || rq.kind !== 'stabilize') return false;
  if (state.player.x !== rq.pos.x || state.player.y !== rq.pos.y) return false;
  rq.done = true;
  state.player.armor = state.player.maxArmor;
  state.player.stabilizeTurns = Math.max(state.player.stabilizeTurns, 30);
  pushLog(state, 'LOG-RQ-STABILIZE');
  grantCodex(state);
  clearQuestTile(state);
  void withKind;
  return true;
}

export function pickRoomQuestKind(rng: () => number): RoomQuestKind {
  const kinds: RoomQuestKind[] = ['salvage', 'purge', 'decode', 'stabilize'];
  return kinds[Math.floor(rng() * kinds.length)]!;
}
