import { INVENTORY_SLOTS } from '../data/items';
import {
  hasItem,
  tryPickup,
  useSelected,
  findSlot,
  fireDart,
  addItem,
} from './inventory';
import { playerAttack, pushLog, recordLoreEvent } from './combat';
import { endPlayerTurn, advanceSector, checkLose, finishSectorTransition } from './turn';
import { addStatus } from './status';
import { pick, randInt } from './rng';
import { pickSkill } from './progression';
import { addEmStress } from './emStress';
import { mechanicsTryAction } from './mechanics';
import { grantPoiXp } from './mechanics/survey';
import type { Action, Enemy, GameState } from './types';
import type { ItemKind as IK } from '../data/items';

function enemyAt(state: GameState, x: number, y: number): Enemy | undefined {
  return state.enemies.find((e) => e.alive && e.x === x && e.y === y);
}

function tryMove(state: GameState, dx: number, dy: number): void {
  if (state.ui.aimingDart) {
    fireDart(state, dx, dy);
    endPlayerTurn(state);
    return;
  }

  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) {
    pushLog(state, 'LOG-MOVE-BLOCKED');
    return;
  }
  const tile = state.tiles[ny]![nx]!;
  if (!tile.walkable) {
    pushLog(state, 'LOG-MOVE-BLOCKED');
    return;
  }

  const foe = enemyAt(state, nx, ny);
  if (foe) {
    playerAttack(state, foe, randInt(state.rng, -1, 1));
    endPlayerTurn(state);
    return;
  }

  state.player.x = nx;
  state.player.y = ny;
  const ground = state.items.find((i) => i.x === nx && i.y === ny);
  if (ground) {
    if (ground.kind === 'relay_key' || ground.kind === 'nav_core') {
      tryPickup(state);
    } else if (
      ground.kind === 'salvage' ||
      state.inventory.length < INVENTORY_SLOTS ||
      findSlot(state, ground.kind) >= 0
    ) {
      tryPickup(state);
    }
  }
  endPlayerTurn(state);
}

function tryPoi(state: GameState): boolean {
  const tile = state.tiles[state.player.y]![state.player.x]!;
  if (tile.kind !== 'poi' || !state.poiPos || state.poiUsed) return false;
  if (state.player.x !== state.poiPos.x || state.player.y !== state.poiPos.y) return false;

  state.poiUsed = true;
  const kind = state.poiKind ?? 'console';
  if (kind === 'console') {
    pushLog(state, 'LOG-POI-CONSOLE');
    state.stormTurns += 25;
    const loot: IK[] = ['energy', 'dart', 'jammer', 'probe'];
    addItem(state, pick(state.rng, loot));
    pushLog(state, 'LOG-PICKUP');
    grantPoiXp(state);
  } else if (kind === 'nest') {
    pushLog(state, 'LOG-POI-NEST');
    addStatus(state.player, 'ion_burn', 3);
    addEmStress(state, 12, 'nest');
    // Wake / spawn pressure: alert nearby enemies
    for (const en of state.enemies) {
      if (!en.alive) continue;
      if (Math.abs(en.x - state.player.x) + Math.abs(en.y - state.player.y) <= 6) {
        en.alerted = true;
      }
    }
    state.lootTakenThisSector = true;
  } else {
    pushLog(state, 'LOG-POI-CACHE');
    const loot: IK[] = ['med', 'coolant', 'sealant', 'plate', 'flare', 'salvage'];
    addItem(state, pick(state.rng, loot));
    addItem(state, pick(state.rng, ['salvage', 'energy', 'patch'] as IK[]));
    pushLog(state, 'LOG-PICKUP');
    grantPoiXp(state);
  }
  // Convert POI to floor after use
  state.tiles[state.poiPos.y]![state.poiPos.x] = {
    kind: 'floor',
    walkable: true,
    transparent: true,
  };
  endPlayerTurn(state);
  return true;
}

function tryExit(state: GameState): void {
  // Mechanics first (room quest, future beacon handshake, …)
  if (mechanicsTryAction(state, { type: 'exit' })) {
    endPlayerTurn(state);
    return;
  }
  if (tryPoi(state)) return;

  const { x, y } = state.player;
  const tile = state.tiles[y]![x]!;

  // Beacon authorization is owned by beaconHandshake mechanic (multi-turn).

  if (
    tile.kind === 'shuttle' ||
    (state.sectorId === 'ridge' &&
      state.shuttlePos &&
      x === state.shuttlePos.x &&
      y === state.shuttlePos.y)
  ) {
    if (!hasItem(state, 'nav_core')) {
      pushLog(state, 'LOG-NEED-CORE');
      return;
    }
    state.status = 'won';
    pushLog(state, 'LOG-EXTRACT');
    recordLoreEvent(state, 'LOG-EXTRACT');
    return;
  }

  if (tile.kind === 'exit') {
    if (state.sectorId === 'beacon' && !state.objectives.beaconOpen) {
      pushLog(state, 'LOG-NEED-KEY');
      endPlayerTurn(state);
      return;
    }
    if (state.sectorId === 'ruin' && !hasItem(state, 'relay_key')) {
      pushLog(state, 'LOG-EXIT-BLOCKED');
      endPlayerTurn(state);
      return;
    }
    if (state.sectorId === 'vault' && !hasItem(state, 'nav_core')) {
      pushLog(state, 'LOG-EXIT-BLOCKED');
      endPlayerTurn(state);
      return;
    }
    checkLose(state);
    if (state.status !== 'playing') return;
    if (!advanceSector(state)) {
      pushLog(state, 'LOG-EXIT-BLOCKED');
      return;
    }
    finishSectorTransition(state);
    return;
  }

  pushLog(state, 'LOG-EXIT-BLOCKED');
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.status !== 'playing') return state;

  // ADOM talent fork — must choose before continuing
  if (state.skillPick) {
    if (action.type === 'pick_skill') {
      pickSkill(state, action.id);
      return state;
    }
    if (action.type === 'select_slot' && state.skillPick[action.index]) {
      pickSkill(state, state.skillPick[action.index]!);
      return state;
    }
    if (action.type === 'close_ui' || action.type === 'toggle_inventory') {
      return state;
    }
    pushLog(state, 'LOG-SKILL-NEED');
    return state;
  }

  switch (action.type) {
    case 'pick_skill':
      return state;

    case 'close_ui':
      state.ui.inventoryOpen = false;
      state.ui.aimingDart = false;
      return state;

    case 'toggle_inventory':
      state.ui.inventoryOpen = !state.ui.inventoryOpen;
      return state;

    case 'select_slot':
      state.ui.selectedSlot = action.index;
      return state;

    case 'use': {
      if (state.ui.inventoryOpen || state.inventory.length > 0) {
        const spendTurn = useSelected(state);
        if (spendTurn) endPlayerTurn(state);
      }
      return state;
    }

    case 'aim':
      fireDart(state, action.dx, action.dy);
      endPlayerTurn(state);
      return state;

    case 'get':
      if (tryPickup(state)) endPlayerTurn(state);
      return state;

    case 'wait':
      if (state.ui.aimingDart) {
        state.ui.aimingDart = false;
        pushLog(state, 'LOG-AIM-MISS');
      }
      pushLog(state, 'LOG-WAIT');
      endPlayerTurn(state);
      return state;

    case 'exit':
      tryExit(state);
      return state;

    case 'move':
      if (state.ui.inventoryOpen) {
        const n = state.inventory.length;
        if (n === 0) return state;
        if (action.dy < 0 || action.dx < 0) {
          state.ui.selectedSlot = (state.ui.selectedSlot - 1 + n) % n;
        } else if (action.dy > 0 || action.dx > 0) {
          state.ui.selectedSlot = (state.ui.selectedSlot + 1) % n;
        }
        return state;
      }
      tryMove(state, action.dx, action.dy);
      return state;
  }
}
