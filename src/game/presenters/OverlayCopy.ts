import { lore, type LoreId } from '../../data/lore';
import { SKILLS, type SkillId } from '../../data/progression';
import { describeObjective } from '../../sim/objectives';
import type { GameState, QuestOffer } from '../../sim/types';
import { formatExtractBoxes } from './FieldHud';
import { fogSurveyKitKind } from './FieldKitDock';

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

/** Pure help copy — Phaser and HTML HUD share this. */
export function formatHelpContent(tutorialActive = false): string {
  if (tutorialActive) {
    return `${lore('UI-HELP')}\n\n${lore('UI-HELP-TUT')}\nESC or ? — close`;
  }
  return (
    `${lore('UI-HELP')}\n\n` +
    `${lore('UI-KIT-PURPOSE')}\n\n` +
    `────────────────────────────────\n` +
    `${lore('UI-HELP-BODY')}\n` +
    `────────────────────────────────\n` +
    `ESC or ? — close`
  );
}

/** Pure skill-fork copy — Phaser and HTML HUD share this. */
export function formatSkillPickContent(skillPick: readonly SkillId[]): string {
  const lines: string[] = [];
  lines.push(lore('UI-SKILL-PICK').toUpperCase());
  lines.push('');
  for (let i = 0; i < skillPick.length; i++) {
    const id = skillPick[i]!;
    const def = SKILLS[id];
    lines.push(`${i + 1}  ${lore(def.loreName).toUpperCase()}  —  ${lore(def.loreDesc)}`);
  }
  lines.push('');
  lines.push(lore('UI-SKILL-CHOOSE'));
  return lines.join('\n');
}

/** Pure accept/decline copy — Phaser and HTML HUD share this. */
export function formatQuestOfferContent(offer: QuestOffer): string {
  const lines: string[] = [];
  lines.push(lore('UI-QUEST-OFFER').toUpperCase());
  lines.push('');
  lines.push(lore(offer.title).toUpperCase());
  lines.push(lore(offer.body));
  lines.push('');
  if (offer.costLine) {
    lines.push(`${lore('UI-QUEST-BILLS')} ${lore(offer.costLine)}`);
  }
  if (offer.payoffLine) {
    lines.push(`${lore('UI-QUEST-PAYS')} ${lore(offer.payoffLine)}`);
  }
  lines.push('');
  lines.push(lore('UI-QUEST-ACCEPT'));
  lines.push(lore('UI-QUEST-DECLINE'));
  return lines.join('\n');
}
