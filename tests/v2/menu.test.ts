import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { GAME_VERSION } from '../../src/data/version';
import { createGame } from '../../src/sim';
import { formatChangelogContent } from '../../src/game/presenters/OverlayCopy';
import {
  endSnapshot,
  formatMuteLabel,
  routeEndKey,
  routeTitleKey,
  titleModalBody,
  titleSnapshot,
} from '../../src/v2/menu';

function key(k: string, extra: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { key: k, code: '', shiftKey: false, repeat: false, ...extra } as KeyboardEvent;
}

describe('v2 title / end menus', () => {
  it('title copy uses lore and seed chrome', () => {
    const view = titleSnapshot(42, false);
    expect(view.title).toBe(lore('UI-TITLE'));
    expect(view.cta).toBe(lore('UI-PRESS-START'));
    expect(view.seed).toContain('00042');
    expect(view.footRight).toBe(formatMuteLabel(false));
  });

  it('title keys: start, seed, help, bulletin', () => {
    const chrome = { helpOpen: false, changelogOpen: false };
    expect(routeTitleKey(key('Enter'), chrome)).toEqual({ type: 'start' });
    expect(routeTitleKey(key('ArrowRight'), chrome)).toEqual({ type: 'seed', delta: 1 });
    expect(routeTitleKey(key('?'), chrome)).toEqual({ type: 'help', force: true });
    expect(routeTitleKey(key('c'), chrome)).toEqual({ type: 'changelog', force: true });
    expect(titleModalBody({ helpOpen: false, changelogOpen: true }).body).toContain(GAME_VERSION);
    expect(formatChangelogContent()).toContain(lore('UI-CHANGELOG'));
  });

  it('end copy names the verdict and retry keys', () => {
    const st = createGame(42, { skipTutorial: true });
    st.status = 'won';
    const view = endSnapshot(st, false);
    expect(view.title).toBe(lore('UI-WIN'));
    expect(view.cta).toBe(lore('UI-RETRY'));
    expect(routeEndKey(key('Enter'))).toEqual({ type: 'retry' });
    expect(routeEndKey(key('Escape'))).toEqual({ type: 'title' });
  });
});
