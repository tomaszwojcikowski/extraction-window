import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/audio/sfx', () => ({
  sfx: {
    unlock: vi.fn(),
    play: vi.fn(),
    toggleMute: vi.fn(),
    isMuted: vi.fn(() => false),
  },
}));

vi.mock('../../src/audio/music', () => ({
  music: { prefetch: vi.fn() },
}));

import { createGame, type Action } from '../../src/sim';
import { handleGameKey, type InputHost } from '../../src/game/input/InputController';

function key(k: string, opts: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { key: k, shiftKey: false, code: '', ...opts } as KeyboardEvent;
}

function stubHost(over: Partial<InputHost> & { state?: ReturnType<typeof createGame> }): InputHost {
  const state = over.state ?? createGame(1);
  let queued: Action | null = null;
  return {
    getState: () => state,
    isAnimating: () => over.isAnimating?.() ?? false,
    isHelpOpen: () => over.isHelpOpen?.() ?? false,
    isPagesOpen: () => over.isPagesOpen?.() ?? false,
    isLogOpen: () => over.isLogOpen?.() ?? false,
    queueAction: (action) => {
      queued = action;
    },
    getQueuedAction: () => queued,
    clearQueuedAction: () => {
      queued = null;
    },
    syncFieldAudio: vi.fn(),
    showMuteHint: vi.fn(),
    startEndScene: vi.fn(),
    toggleHelp: vi.fn(),
    togglePages: vi.fn(),
    toggleLog: vi.fn(),
    toggleMinimap: vi.fn(),
    afterUiChrome: vi.fn(),
    showSkillHint: vi.fn(),
    commitTurnAction: vi.fn(),
    ...over,
  };
}

describe('handleGameKey modal blocking', () => {
  it('blocks movement while help is open', () => {
    const host = stubHost({ isHelpOpen: () => true });
    handleGameKey(key('w'), host);
    expect(host.commitTurnAction).not.toHaveBeenCalled();
  });

  it('dismisses help on Escape', () => {
    const host = stubHost({ isHelpOpen: () => true });
    handleGameKey(key('Escape'), host);
    expect(host.toggleHelp).toHaveBeenCalledWith(false);
  });

  it('blocks log toggle while help is open', () => {
    const host = stubHost({ isHelpOpen: () => true });
    handleGameKey(key('l'), host);
    expect(host.toggleLog).not.toHaveBeenCalled();
  });

  it('blocks hatch / wait while kit is open', () => {
    const st = createGame(1);
    st.ui.inventoryOpen = true;
    const turnBefore = st.turn;
    const host = stubHost({ state: st });
    handleGameKey(key('Enter'), host);
    handleGameKey(key('.'), host);
    expect(host.commitTurnAction).not.toHaveBeenCalled();
    expect(st.turn).toBe(turnBefore);
  });

  it('allows kit select and use while kit is open', () => {
    const st = createGame(1);
    st.ui.inventoryOpen = true;
    st.inventory = [{ kind: 'med', count: 1 }];
    const host = stubHost({ state: st });
    handleGameKey(key('1'), host);
    expect(st.ui.selectedSlot).toBe(0);
    handleGameKey(key('u'), host);
    expect(host.afterUiChrome).toHaveBeenCalled();
  });

  it('blocks other keys during skill pick', () => {
    const st = createGame(1);
    st.skillPick = ['triage', 'deep_reserve'];
    const host = stubHost({ state: st });
    handleGameKey(key('w'), host);
    expect(host.commitTurnAction).not.toHaveBeenCalled();
    expect(host.showSkillHint).toHaveBeenCalled();
  });

  it('accepts skill pick during move tweens', () => {
    const st = createGame(1);
    st.skillPick = ['triage', 'deep_reserve'];
    const host = stubHost({ state: st, isAnimating: () => true });
    handleGameKey(key('1'), host);
    expect(host.afterUiChrome).toHaveBeenCalled();
  });
});
