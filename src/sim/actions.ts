import { hasItem, tryPickup, useSelected, fireDart, addItem } from './inventory';
import { playerAttack } from './combat';
import { pushLog, recordLoreEvent } from './log';
import { endPlayerTurn, advanceSector, checkLose, finishSectorTransition } from './turn';
import { finishTutorial } from './state';
import { addStatus } from './status';
import { pick, randInt } from './rng';
import { pickSkill } from './progression';
import { addEmStress } from './emStress';
import { mechanicsTryAction } from './mechanics';
import { isAdjacentSealed } from './mechanics/sealedHatch';
import { livingAllyAt } from './allyAi';
import { enemyAt, npcAt } from './spatial';
import { triggerOverwatch, triggerOverwatchOnAttack } from './ai';
import type { Action, GameState } from './types';
import type { ItemKind as IK } from '../data/items';

function onExitTile(state: GameState): boolean {
  const tile = state.tiles[state.player.y]?.[state.player.x];
  return tile?.kind === 'exit';
}

/** Drill bay → real plains. Shared by `>` / walk-on / wait-on-hatch. */
function completeTutorialExit(state: GameState): void {
  checkLose(state);
  if (state.status !== 'playing') return;
  finishTutorial(state);
  finishSectorTransition(state);
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
    pushLog(
      state,
      tile.kind === 'sealed' ? 'LOG-SEALED-BLOCK' : 'LOG-MOVE-BLOCKED',
    );
    return;
  }

  const foe = enemyAt(state, nx, ny);
  if (foe) {
    triggerOverwatchOnAttack(state, foe);
    playerAttack(state, foe, randInt(state.rng, -1, 1));
    endPlayerTurn(state);
    return;
  }

  const ally = livingAllyAt(state, nx, ny);
  if (ally) {
    // Swap with ally — never attack friendlies
    ally.x = state.player.x;
    ally.y = state.player.y;
    state.player.x = nx;
    state.player.y = ny;
    endPlayerTurn(state);
    return;
  }

  if (npcAt(state, nx, ny)) {
    pushLog(state, 'LOG-NPC-BLOCK');
    return;
  }

  triggerOverwatch(state, { x: nx, y: ny });
  state.player.x = nx;
  state.player.y = ny;
  // Walking over kit is the pickup: no separate verb, and the tile is cleared
  // of everything it can hold.
  while (state.items.some((i) => i.x === nx && i.y === ny)) {
    if (!tryPickup(state)) break;
  }

  // Drill bay: stepping onto the hatch starts the real drop (no extra key).
  if (state.tutorialActive && tile.kind === 'exit') {
    completeTutorialExit(state);
    return;
  }

  endPlayerTurn(state);
}


function tryExit(state: GameState): void {
  // Mechanics first (room quest, future beacon handshake, …)
  if (mechanicsTryAction(state, { type: 'exit' })) {
    endPlayerTurn(state);
    return;
  }

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
      pushLog(state, hasItem(state, 'relay_key') ? 'LOG-EXIT-NEED-BEACON' : 'LOG-NEED-KEY');
      endPlayerTurn(state);
      return;
    }
    if (state.sectorId === 'ruin' && !hasItem(state, 'relay_key')) {
      pushLog(state, 'LOG-EXIT-NEED-KEY');
      endPlayerTurn(state);
      return;
    }
    if (state.sectorId === 'vault' && !hasItem(state, 'nav_core')) {
      pushLog(state, 'LOG-EXIT-NEED-CORE');
      endPlayerTurn(state);
      return;
    }
    checkLose(state);
    if (state.status !== 'playing') return;
    if (state.tutorialActive) {
      completeTutorialExit(state);
      return;
    }
    if (!advanceSector(state)) {
      pushLog(state, 'LOG-EXIT-BLOCKED');
      return;
    }
    finishSectorTransition(state);
    return;
  }

  if (isAdjacentSealed(state)) {
    pushLog(state, 'LOG-SEALED-NEED-TOOL');
    return;
  }

  pushLog(state, 'LOG-INTERACT-MISS');
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
      const spendTurn = useSelected(state);
      if (spendTurn) endPlayerTurn(state);
      return state;
    }

    case 'aim':
      fireDart(state, action.dx, action.dy);
      endPlayerTurn(state);
      return state;

    case 'wait':
      if (state.ui.aimingDart) {
        state.ui.aimingDart = false;
        pushLog(state, 'LOG-AIM-MISS');
      }
      // Already on the drill hatch — waiting also commits the drop (recover stuck players).
      if (state.tutorialActive && onExitTile(state)) {
        completeTutorialExit(state);
        return state;
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
