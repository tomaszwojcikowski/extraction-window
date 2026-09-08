import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { applyAction, createGame } from '../../src/sim';
import { buildKitOverlayContent } from '../../src/game/presenters/KitOverlayContent';
import { formatPaddContent, formatHelpContent } from '../../src/game/presenters/OverlayCopy';
import { HUD_BAR_SLOTS, hudSnapshot, type HudChrome } from '../../src/v2/hud';

const chromeOff: HudChrome = { helpOpen: false, pagesOpen: false, logOpen: false };

describe('v2 HUD snapshot', () => {
  it('paints four bars and field copy from createGame', () => {
    const st = createGame(42, { skipTutorial: true });
    const snap = hudSnapshot(st, chromeOff);
    expect(snap.bars).toHaveLength(HUD_BAR_SLOTS);
    expect(snap.bars[0]!.ratio).toBe(1);
    expect(snap.bars[0]!.caption).toBe(lore('UI-BAR-HP'));
    expect(snap.objLocal.length).toBeGreaterThan(0);
    expect(snap.dock.length).toBeGreaterThan(0);
    expect(snap.chips.length).toBeGreaterThan(0);
    expect(snap.modal).toBe('none');
  });

  it('kit overlay uses presenter lines and does not close the bag', () => {
    const st = createGame(42, { skipTutorial: true });
    applyAction(st, { type: 'toggle_inventory' });
    expect(st.ui.inventoryOpen).toBe(true);
    const expected = buildKitOverlayContent(st).lines.join('\n');
    const snap = hudSnapshot(st, chromeOff);
    expect(snap.modal).toBe('kit');
    expect(snap.modalBody).toBe(expected);
    expect(st.ui.inventoryOpen).toBe(true);
  });

  it('help / PADD chrome does not mutate kit or pages state', () => {
    const st = createGame(42, { skipTutorial: true });
    const open = st.ui.inventoryOpen;
    const help = hudSnapshot(st, { helpOpen: true, pagesOpen: false, logOpen: false });
    expect(help.modal).toBe('help');
    expect(help.modalBody).toContain(formatHelpContent(false));
    expect(st.ui.inventoryOpen).toBe(open);

    const padd = hudSnapshot(st, { helpOpen: false, pagesOpen: true, logOpen: false });
    expect(padd.modal).toBe('padd');
    expect(padd.modalBody).toBe(formatPaddContent(st));
    expect(st.ui.inventoryOpen).toBe(open);
  });
});
