/**
 * v2 field key switchboard — same priority as InputController, minus SFX/minimap.
 * Overlays only return Actions; chrome flags stay in the host.
 */
import type { Action, GameState } from '../sim';
import { isHackOpen } from '../sim/mechanics/consoleHack';
import {
  actionFromKey,
  chromeFromKey,
  isHelpDismissKey,
  isLogDismissKey,
  isPagesDismissKey,
  isQueueableAction,
  slotIndexFromKey,
} from '../game/input/Keymap';
import { moveFromScreenIntent, screenIntentFromKey } from './screenMove';

export type V2ChromeKind = 'help' | 'pages' | 'log';

export type V2Command =
  | { type: 'noop' }
  | { type: 'debug_sector'; dir: 1 | -1 }
  | { type: 'debug_reseed' }
  | { type: 'yaw'; dir: 1 | -1 }
  | { type: 'mute' }
  | { type: 'chrome'; key: V2ChromeKind; force?: boolean }
  | { type: 'ui'; action: Action }
  | { type: 'turn'; action: Action }
  | { type: 'queue'; action: Action };

export type V2InputHost = {
  helpOpen: boolean;
  pagesOpen: boolean;
  logOpen: boolean;
  animating: boolean;
  lookX: number;
  lookZ: number;
};

export function fieldLocked(state: GameState, host: V2InputHost): boolean {
  return (
    host.helpOpen ||
    host.pagesOpen ||
    host.logOpen ||
    Boolean(state.skillPick?.length) ||
    Boolean(state.questOffer) ||
    isHackOpen(state) ||
    state.ui.inventoryOpen ||
    state.status !== 'playing'
  );
}

export function routeV2Key(e: KeyboardEvent, state: GameState, host: V2InputHost): V2Command {
  if (e.key === ']' || e.key === '}') return { type: 'debug_sector', dir: 1 };
  if (e.key === '[' || e.key === '{') return { type: 'debug_sector', dir: -1 };
  if (e.key === 'r' || e.key === 'R') return { type: 'debug_reseed' };

  const chrome = chromeFromKey(e);
  if (chrome?.kind === 'mute') return { type: 'mute' };
  if (chrome?.kind === 'toggle_minimap') return { type: 'noop' };

  if (isHackOpen(state)) return routeHack(e, state);

  if (state.questOffer) {
    if (e.key === '1' || e.key === 'Enter') return { type: 'ui', action: { type: 'quest_offer', accept: true } };
    if (e.key === '2' || e.key === 'Escape') return { type: 'ui', action: { type: 'quest_offer', accept: false } };
    return { type: 'noop' };
  }

  if (state.skillPick && state.skillPick.length > 0) {
    if (e.key === '1' || e.key === '2') {
      const id = state.skillPick[parseInt(e.key, 10) - 1];
      if (id) return { type: 'ui', action: { type: 'pick_skill', id } };
    }
    return { type: 'noop' };
  }

  if (state.status !== 'playing') return { type: 'noop' };

  if (!e.repeat && (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E')) {
    if (fieldLocked(state, host)) return { type: 'noop' };
    return { type: 'yaw', dir: e.key === 'q' || e.key === 'Q' ? -1 : 1 };
  }

  if (host.animating && !fieldLocked(state, host)) {
    const queued = fieldTurnAction(e, host);
    if (queued && isQueueableAction(queued)) return { type: 'queue', action: queued };
    return { type: 'noop' };
  }

  if (host.helpOpen) {
    if (isHelpDismissKey(e) || chrome?.kind === 'toggle_help') {
      return { type: 'chrome', key: 'help', force: false };
    }
    return { type: 'noop' };
  }

  if (host.pagesOpen) {
    if (isPagesDismissKey(e) || chrome?.kind === 'toggle_pages') {
      return { type: 'chrome', key: 'pages', force: false };
    }
    return { type: 'noop' };
  }

  if (host.logOpen) {
    if (isLogDismissKey(e) || chrome?.kind === 'toggle_log') {
      return { type: 'chrome', key: 'log', force: false };
    }
    return { type: 'noop' };
  }

  if (state.ui.inventoryOpen) return routeKit(e);

  if (chrome?.kind === 'toggle_help') return { type: 'chrome', key: 'help' };
  if (chrome?.kind === 'toggle_pages') return { type: 'chrome', key: 'pages' };
  if (chrome?.kind === 'toggle_log') return { type: 'chrome', key: 'log' };

  const slotIdx = slotIndexFromKey(e);
  if (slotIdx !== null) return { type: 'ui', action: { type: 'select_slot', index: slotIdx } };

  const mapped = actionFromKey(e);
  if (mapped?.type === 'close_ui' && !state.ui.inventoryOpen) {
    if (state.ui.aimingDart) return { type: 'ui', action: { type: 'close_ui' } };
    if (host.pagesOpen) return { type: 'chrome', key: 'pages', force: false };
    return { type: 'chrome', key: 'help', force: true };
  }
  if (mapped?.type === 'toggle_inventory' || mapped?.type === 'close_ui') {
    return { type: 'ui', action: mapped };
  }

  const turn = fieldTurnAction(e, host);
  if (turn) return { type: 'turn', action: turn };
  return { type: 'noop' };
}

function routeHack(e: KeyboardEvent, state: GameState): V2Command {
  if (e.key === 'Escape') return { type: 'ui', action: { type: 'hack_abort' } };
  const hackAction = actionFromKey(e);
  if (hackAction?.type === 'move') {
    if (state.consoleHack?.payout && !state.consoleHack.session) return { type: 'noop' };
    return { type: 'ui', action: { type: 'hack_move', dx: hackAction.dx, dy: hackAction.dy } };
  }
  if (hackAction?.type === 'exit' || hackAction?.type === 'wait') {
    return { type: 'ui', action: { type: 'hack_pick' } };
  }
  return { type: 'noop' };
}

function routeKit(e: KeyboardEvent): V2Command {
  const slotIdx = slotIndexFromKey(e);
  if (slotIdx !== null) return { type: 'ui', action: { type: 'select_slot', index: slotIdx } };
  const action = actionFromKey(e);
  if (
    action &&
    (action.type === 'toggle_inventory' ||
      action.type === 'close_ui' ||
      action.type === 'use' ||
      action.type === 'move')
  ) {
    return { type: 'ui', action };
  }
  return { type: 'noop' };
}

function fieldTurnAction(e: KeyboardEvent, host: V2InputHost): Action | null {
  const intent = screenIntentFromKey(e);
  if (intent) {
    const step = moveFromScreenIntent(intent, host.lookX, host.lookZ);
    return { type: 'move', dx: step.dx, dy: step.dy };
  }
  const action = actionFromKey(e);
  if (!action) return null;
  if (action.type === 'wait' || action.type === 'exit' || action.type === 'use') return action;
  return null;
}
