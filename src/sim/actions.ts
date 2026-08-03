import { hasItem, removeOne, tryPickup, useSelected, syncObjectiveFlags, findSlot } from './inventory';
import { playerAttack, pushLog, recordLoreEvent } from './combat';
import { endPlayerTurn, advanceSector, checkLose, finishSectorTransition } from './turn';
import { randInt } from './rng';
import type { Action, Enemy, GameState } from './types';

function enemyAt(state: GameState, x: number, y: number): Enemy | undefined {
  return state.enemies.find((e) => e.alive && e.x === x && e.y === y);
}

function tryMove(state: GameState, dx: number, dy: number): void {
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
  // Auto-pickup quest items and consumables when space allows
  const ground = state.items.find((i) => i.x === nx && i.y === ny);
  if (ground) {
    if (ground.kind === 'relay_key' || ground.kind === 'nav_core') {
      tryPickup(state);
    } else if (state.inventory.length < 10 || findSlot(state, ground.kind) >= 0) {
      tryPickup(state);
    }
  }
  endPlayerTurn(state);
}

function tryExit(state: GameState): void {
  const { x, y } = state.player;
  const tile = state.tiles[y]![x]!;

  if (tile.kind === 'beacon' || (state.sectorId === 'beacon' && state.beaconPos &&
      x === state.beaconPos.x && y === state.beaconPos.y)) {
    if (state.objectives.beaconOpen) {
      // Already open — treat as standing on beacon, move to exit
      pushLog(state, 'LOG-EXIT-BLOCKED');
      return;
    }
    if (!hasItem(state, 'relay_key')) {
      pushLog(state, 'LOG-NEED-KEY');
      endPlayerTurn(state);
      return;
    }
    removeOne(state, 'relay_key');
    state.objectives.usedRelayKey = true;
    state.objectives.beaconOpen = true;
    syncObjectiveFlags(state);
    pushLog(state, 'LOG-USED-KEY');
    recordLoreEvent(state, 'LOG-USED-KEY');
    // Open exit
    if (state.exitPos) {
      state.tiles[state.exitPos.y]![state.exitPos.x] = {
        kind: 'exit',
        walkable: true,
        transparent: true,
      };
    }
    endPlayerTurn(state);
    return;
  }

  if (tile.kind === 'shuttle' || (state.sectorId === 'ridge' && state.shuttlePos &&
      x === state.shuttlePos.x && y === state.shuttlePos.y)) {
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
    // Do not advance while already dead / window closed (desync guard)
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

/**
 * Apply a player action. Pure sim — no Phaser.
 */
export function applyAction(state: GameState, action: Action): GameState {
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'close_ui':
      state.ui.inventoryOpen = false;
      return state;

    case 'toggle_inventory':
      state.ui.inventoryOpen = !state.ui.inventoryOpen;
      return state;

    case 'select_slot':
      state.ui.selectedSlot = action.index;
      return state;

    case 'use':
      if (state.ui.inventoryOpen || state.inventory.length > 0) {
        useSelected(state);
        endPlayerTurn(state);
      }
      return state;

    case 'get':
      tryPickup(state);
      endPlayerTurn(state);
      return state;

    case 'wait':
      pushLog(state, 'LOG-WAIT');
      endPlayerTurn(state);
      return state;

    case 'exit':
      tryExit(state);
      return state;

    case 'move':
      if (state.ui.inventoryOpen) {
        // Navigate inventory with move keys
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
