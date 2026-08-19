import { describe, expect, it } from 'vitest';
import {
  actionFromKey,
  chromeFromKey,
  isHelpDismissKey,
  isLogDismissKey,
  isPagesDismissKey,
  isQueueableAction,
  slotIndexFromKey,
} from '../../src/game/input/Keymap';

function key(k: string, opts: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { key: k, shiftKey: false, code: '', ...opts } as KeyboardEvent;
}

describe('Keymap', () => {
  it('maps chrome mute / help / pages / log', () => {
    expect(chromeFromKey(key('m'))).toEqual({ kind: 'mute' });
    expect(chromeFromKey(key('?'))).toEqual({ kind: 'toggle_help' });
    expect(chromeFromKey(key('p'))).toEqual({ kind: 'toggle_pages' });
    expect(chromeFromKey(key('l'))).toEqual({ kind: 'toggle_log' });
    expect(chromeFromKey(key('L'))).toEqual({ kind: 'toggle_log' });
    expect(chromeFromKey(key('x'))).toBeNull();
  });

  it('maps slot digits and dismiss keys', () => {
    expect(slotIndexFromKey(key('3'))).toBe(2);
    expect(slotIndexFromKey(key('0'))).toBeNull();
    expect(isHelpDismissKey(key('Escape'))).toBe(true);
    expect(isLogDismissKey(key('l'))).toBe(true);
    expect(isPagesDismissKey(key('P'))).toBe(true);
  });

  it('maps hatch exit keys including Enter and =', () => {
    expect(actionFromKey(key('>'))).toEqual({ type: 'exit' });
    expect(actionFromKey(key('='))).toEqual({ type: 'exit' });
    expect(actionFromKey(key('Enter'))).toEqual({ type: 'exit' });
    expect(actionFromKey(key('NumpadEnter'))).toEqual({ type: 'exit' });
    expect(actionFromKey(key(' '))).toEqual({ type: 'exit' });
    expect(actionFromKey(key('x', { code: 'Space' }))).toEqual({ type: 'exit' });
    expect(actionFromKey(key('.', { shiftKey: true, code: 'Period' }))).toEqual({
      type: 'exit',
    });
  });

  it('maps gameplay actions', () => {
    expect(actionFromKey(key('ArrowUp'))).toEqual({ type: 'move', dx: 0, dy: -1 });
    expect(actionFromKey(key('w'))).toEqual({ type: 'move', dx: 0, dy: -1 });
    expect(actionFromKey(key('.'))).toEqual({ type: 'wait' });
    expect(actionFromKey(key('i'))).toEqual({ type: 'toggle_inventory' });
    expect(actionFromKey(key('Escape'))).toEqual({ type: 'close_ui' });
    expect(actionFromKey(key('z'))).toBeNull();
  });

  it('marks turn actions as queueable while tweens run', () => {
    expect(isQueueableAction({ type: 'move', dx: 1, dy: 0 })).toBe(true);
    expect(isQueueableAction({ type: 'wait' })).toBe(true);
    expect(isQueueableAction({ type: 'use' })).toBe(true);
    expect(isQueueableAction({ type: 'toggle_inventory' })).toBe(false);
    expect(isQueueableAction({ type: 'close_ui' })).toBe(false);
  });
});
