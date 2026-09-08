import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../../src/sim';
import { fieldLocked, routeV2Key, type V2InputHost } from '../../src/v2/input';

function key(k: string, extra: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { key: k, code: '', shiftKey: false, repeat: false, ...extra } as KeyboardEvent;
}

function host(over: Partial<V2InputHost> = {}): V2InputHost {
  return {
    helpOpen: false,
    pagesOpen: false,
    logOpen: false,
    animating: false,
    lookX: 0,
    lookZ: -1,
    ...over,
  };
}

describe('v2 HUD input routing', () => {
  it('WASD on the field is camera-relative turn move', () => {
    const st = createGame(42, { skipTutorial: true });
    const cmd = routeV2Key(key('w'), st, host());
    expect(cmd).toEqual({ type: 'turn', action: { type: 'move', dx: 0, dy: -1 } });
  });

  it('WASD in the kit is grid nav, not a field step', () => {
    const st = createGame(42, { skipTutorial: true });
    applyAction(st, { type: 'toggle_inventory' });
    const cmd = routeV2Key(key('s'), st, host());
    expect(cmd).toEqual({ type: 'ui', action: { type: 'move', dx: 0, dy: 1 } });
    expect(fieldLocked(st, host())).toBe(true);
  });

  it('i / p / ? open kit, PADD, and help without a turn action', () => {
    const st = createGame(42, { skipTutorial: true });
    expect(routeV2Key(key('i'), st, host())).toEqual({
      type: 'ui',
      action: { type: 'toggle_inventory' },
    });
    expect(routeV2Key(key('p'), st, host())).toEqual({ type: 'chrome', key: 'pages' });
    expect(routeV2Key(key('?'), st, host())).toEqual({ type: 'chrome', key: 'help' });
  });

  it('m mutes instead of no-op', () => {
    const st = createGame(42, { skipTutorial: true });
    expect(routeV2Key(key('m'), st, host())).toEqual({ type: 'mute' });
  });

  it('help swallows field move', () => {
    const st = createGame(42, { skipTutorial: true });
    expect(routeV2Key(key('w'), st, host({ helpOpen: true }))).toEqual({ type: 'noop' });
    expect(routeV2Key(key('Escape'), st, host({ helpOpen: true }))).toEqual({
      type: 'chrome',
      key: 'help',
      force: false,
    });
  });
});
