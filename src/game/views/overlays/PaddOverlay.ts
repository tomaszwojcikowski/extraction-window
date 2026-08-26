import Phaser from 'phaser';
import { lore, type LoreId } from '../../../data/lore';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';
import { describeObjective } from '../../../sim/objectives';
import { formatExtractBoxes } from '../../presenters/FieldHud';
import { fogSurveyKitKind } from '../../presenters/FieldKitDock';
import type { GameState } from '../../../sim/types';

/** Fixed panel budget — body grows only inside this cap (kit lesson). */
const PADD_MAX_H = 460;
const PADD_LINE = 18;

const SEP = '──────────────────────────────────';

/** Pure PADD copy — live next step first, notes after. */
export function formatPaddContent(state: GameState): string {
  const desc = describeObjective(state);
  const entries =
    state.codexLog.length === 0
      ? [lore('UI-PAGES-EMPTY')]
      : state.codexLog.map((id, i) => `${i + 1}  ${lore(id)}`);
  const notes = entries.join(`\n${SEP}\n`);
  const fogKind = fogSurveyKitKind(state);
  const fogLine: LoreId | null =
    fogKind === 'mapper' ? 'UI-HINT-MAPPER' : fogKind === 'probe' ? 'UI-HINT-PROBE' : null;
  return [
    `${lore('UI-PAGES')}  (${state.codexPages} pages)`,
    SEP,
    `${lore('UI-OBJECTIVE')}  ${lore(desc.local)}`,
    ...(fogLine ? [lore(fogLine)] : []),
    lore(desc.campaign),
    formatExtractBoxes(state),
    SEP,
    lore('UI-PAGES-PURPOSE'),
    SEP,
    notes,
    SEP,
    lore('UI-PAGES-HINT'),
  ].join('\n');
}

/** Draw the PADD / codex pages modal into existing Phaser objects. */
export function drawPaddOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  state: GameState,
): void {
  const w = 480;
  const body = formatPaddContent(state);
  const lines = body.split('\n').length;
  const h = Math.min(PADD_MAX_H, 56 + Math.max(4, lines) * PADD_LINE);
  const x = (screenW - w) / 2;
  const y = (screenH - h) / 2;
  drawFieldPanel(panel, x, y, w, h, Theme.flag);
  drawModalTapeHeader(panel, x, y, w, Theme.flag);
  text.setWordWrapWidth(w - 40);
  text.setPosition(x + 20, y + 28);
  text.setText(body);
}
