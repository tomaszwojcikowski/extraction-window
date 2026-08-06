import { applyAction, type Action, type GameState } from '../../sim';
import { sfx } from '../../audio/sfx';
import {
  actionFromKey,
  chromeFromKey,
  isHelpDismissKey,
  isPagesDismissKey,
  isQueueableAction,
  slotIndexFromKey,
} from './Keymap';
import { toMoveAction, type MovePreviewQueue } from './MovePreviewQueue';

export type CommitTurnOpts = {
  /** Keep queued move ghost/tells after a non-move turn (quiet toggle while queued). */
  keepMovePreview?: boolean;
};

/**
 * Scene-facing hooks for chrome / turn commit. InputController owns key
 * switchboards; GameScene remains the host for overlays and applyAction side effects.
 */
export type InputHost = {
  getState(): GameState;
  isAnimating(): boolean;
  isHelpOpen(): boolean;
  isPagesOpen(): boolean;
  queueAction(action: Action): void;
  queueMovePreview(dx: number, dy: number): void;
  getMovePreview(): MovePreviewQueue | null;
  getQueuedAction(): Action | null;
  clearQueuedAction(): void;
  syncFieldAudio(force?: boolean): void;
  /** Brief mute on/off tip in the hint line. */
  showMuteHint(muted: boolean): void;
  startEndScene(): void;
  toggleHelp(force?: boolean): void;
  togglePages(force?: boolean): void;
  /** After kit/chrome UI actions — redraw HUD (and items when needed). */
  afterUiChrome(opts?: { syncItems?: boolean }): void;
  showSkillHint(): void;
  commitTurnAction(action: Action, opts?: CommitTurnOpts): void;
};

/**
 * Handle a keydown for the playing field. Behavior-identical to the former
 * GameScene.onKey switchboard — mute, overlays, skill fork, slots, then turns.
 */
export function handleGameKey(e: KeyboardEvent, host: InputHost): void {
  sfx.unlock();

  // While tweens run, accept mute + one-deep gameplay queue — drop other input.
  if (host.isAnimating()) {
    const chrome = chromeFromKey(e);
    if (chrome?.kind === 'mute') {
      sfx.toggleMute();
      host.syncFieldAudio(true);
      return;
    }
    const queued = actionFromKey(e);
    if (queued && isQueueableAction(queued)) host.queueAction(queued);
    return;
  }

  const chrome = chromeFromKey(e);
  if (chrome?.kind === 'mute') {
    sfx.toggleMute();
    host.syncFieldAudio(true);
    host.showMuteHint(sfx.isMuted());
    return;
  }

  const state = host.getState();
  if (state.status !== 'playing') {
    host.startEndScene();
    return;
  }

  if (chrome?.kind === 'toggle_help') {
    host.clearQueuedAction();
    host.toggleHelp();
    sfx.play('ui');
    return;
  }
  if (chrome?.kind === 'toggle_pages') {
    if (host.isHelpOpen()) host.toggleHelp(false);
    host.clearQueuedAction();
    host.togglePages();
    sfx.play('ui');
    return;
  }
  if (host.isPagesOpen()) {
    if (isPagesDismissKey(e)) {
      host.togglePages(false);
      sfx.play('ui');
    }
    return;
  }
  if (host.isHelpOpen()) {
    if (isHelpDismissKey(e)) {
      host.toggleHelp(false);
      sfx.play('ui');
    }
    return;
  }

  if (state.skillPick) {
    if (e.key === '1' || e.key === '2') {
      const idx = parseInt(e.key, 10) - 1;
      const id = state.skillPick[idx];
      if (id) {
        applyAction(state, { type: 'pick_skill', id });
        sfx.play('ui');
        host.afterUiChrome();
      }
      return;
    }
    // Movement / kit locked until a fork is chosen — keep the skill hint visible
    host.showSkillHint();
    return;
  }

  const slotIdx = slotIndexFromKey(e);
  if (slotIdx !== null) {
    // Keep move preview so jammer can be selected/used while a step is queued.
    applyAction(state, { type: 'select_slot', index: slotIdx });
    if (!state.ui.inventoryOpen) applyAction(state, { type: 'toggle_inventory' });
    sfx.play('ui');
    host.afterUiChrome({ syncItems: true });
    return;
  }

  const action = actionFromKey(e);
  if (!action) return;

  // Escape opens help when kit is closed (actionFromKey maps Escape → close_ui)
  if (action.type === 'close_ui' && !state.ui.inventoryOpen) {
    host.clearQueuedAction();
    if (host.isPagesOpen()) {
      host.togglePages(false);
      sfx.play('ui');
      return;
    }
    host.toggleHelp(true);
    sfx.play('ui');
    return;
  }

  if (action.type === 'toggle_inventory' || action.type === 'close_ui') {
    // Kit open/close keeps preview — quiet toggle while queued needs selected jammer.
    applyAction(state, action);
    sfx.play('ui');
    host.afterUiChrome();
    return;
  }

  // Move preview: direction queues + wake footprint; `.` confirms the queued step.
  if (action.type === 'move' && !host.isAnimating()) {
    host.queueMovePreview(action.dx, action.dy);
    sfx.play('ui');
    return;
  }

  if (action.type === 'wait' && !host.isAnimating()) {
    const preview = host.getMovePreview();
    if (preview) {
      host.clearQueuedAction();
      host.commitTurnAction(toMoveAction(preview));
      return;
    }
    host.commitTurnAction(action);
    return;
  }

  // Use (e.g. jammer) while queued: apply stance, keep ghost so wake tells shrink live.
  if (action.type === 'use' && host.getMovePreview()) {
    host.commitTurnAction(action, { keepMovePreview: true });
    return;
  }

  host.clearQueuedAction();
  host.commitTurnAction(action);
}
