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
  commitTurnAction(action: Action): void;
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
    host.toggleHelp();
    sfx.play('ui');
    return;
  }
  if (chrome?.kind === 'toggle_pages') {
    if (host.isHelpOpen()) host.toggleHelp(false);
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
    applyAction(state, action);
    sfx.play('ui');
    host.afterUiChrome();
    return;
  }

  // Move preview: first direction queues footprint; matching direction again commits.
  if (action.type === 'move' && !host.isAnimating()) {
    const queued = host.getQueuedAction();
    if (
      queued?.type === 'move' &&
      queued.dx === action.dx &&
      queued.dy === action.dy
    ) {
      host.clearQueuedAction();
      host.commitTurnAction(action);
      return;
    }
    host.queueAction(action);
    sfx.play('ui');
    return;
  }

  host.clearQueuedAction();
  host.commitTurnAction(action);
}
