import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { formatExtractBoxes } from '../../src/game/presenters/FieldHud';
import { formatPaddContent } from '../../src/game/views/overlays/PaddOverlay';
import { createGame, describeObjective } from '../../src/sim';

describe('PADD briefing', () => {
  it('leads with the live next step on the plains', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    const body = formatPaddContent(st);
    expect(body).toContain(`${lore('UI-OBJECTIVE')}  ${lore('OBJ-LOCAL-EXIT')}`);
    expect(body).toContain(lore('OBJ-SURVEY-KEY'));
    expect(body).toContain(formatExtractBoxes(st));
    expect(body).toContain(lore('UI-PAGES-PURPOSE'));
  });

  it('names Field Array Pulse when the live hatch is still in fog', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    st.scriptedFired.teach_equip = true;
    const pos = describeObjective(st).pos;
    expect(pos).not.toBeNull();
    st.explored[pos!.y]![pos!.x] = false;
    st.visible[pos!.y]![pos!.x] = false;
    const body = formatPaddContent(st);
    expect(body).toContain(lore('UI-HINT-PROBE'));
    expect(body.indexOf(lore('UI-HINT-PROBE'))).toBeGreaterThan(
      body.indexOf(lore('OBJ-LOCAL-EXIT')),
    );
  });

  it('names the phaser bay while the drill is live', () => {
    const st = createGame(42, { skipTutorial: false });
    const body = formatPaddContent(st);
    expect(body).toContain(lore('OBJ-TUT-PHASER'));
    expect(body).toContain(lore('OBJ-TUT-BRIEF'));
  });
});
