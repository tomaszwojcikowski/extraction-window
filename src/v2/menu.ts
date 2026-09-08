/**
 * v2 title / end screens — HTML copy + keys, shared lore with the Phaser menus.
 */
import { lore, type LoreId } from '../data/lore';
import { GAME_VERSION } from '../data/version';
import { SKILLS } from '../data/progression';
import { shortEquipName } from '../data/items';
import { EQUIP_SLOT_ORDER, describeObjective, type GameState } from '../sim';
import { ThemeCss } from '../scenes/theme';
import {
  formatMissionSeed,
  isTitleChangelogDismissKey,
  isTitleChangelogKey,
  isTitleHelpDismissKey,
  isTitleHelpKey,
  isTitleStartKey,
} from '../scenes/titleLayout';
import { formatChangelogContent, formatHelpContent } from '../game/presenters/OverlayCopy';

export type MenuKind = 'title' | 'end';

export type TitleChrome = {
  helpOpen: boolean;
  changelogOpen: boolean;
};

export type MenuView = {
  kind: MenuKind;
  kicker: string;
  title: string;
  tag: string;
  body: string;
  summary: string;
  seed: string;
  cta: string;
  brief: string;
  controls: string;
  footLeft: string;
  footRight: string;
  accent: string;
  won: boolean;
};

export type TitleCommand =
  | { type: 'noop' }
  | { type: 'mute' }
  | { type: 'help'; force: boolean }
  | { type: 'changelog'; force: boolean }
  | { type: 'seed'; delta: number }
  | { type: 'seed_random' }
  | { type: 'start' };

export type EndCommand =
  | { type: 'noop' }
  | { type: 'mute' }
  | { type: 'retry' }
  | { type: 'title' };

export type MenuEls = {
  root: HTMLElement;
  kicker: HTMLElement;
  title: HTMLElement;
  tag: HTMLElement;
  body: HTMLElement;
  summary: HTMLElement;
  seed: HTMLElement;
  cta: HTMLElement;
  brief: HTMLElement;
  controls: HTMLElement;
  footLeft: HTMLElement;
  footRight: HTMLElement;
};

export function bindMenu(root: Document | HTMLElement): MenuEls {
  const q = (sel: string) => {
    const el = root.querySelector(sel);
    if (!el) throw new Error(`v2 menu missing ${sel}`);
    return el as HTMLElement;
  };
  return {
    root: q('#menu'),
    kicker: q('#menu-kicker'),
    title: q('#menu-title'),
    tag: q('#menu-tag'),
    body: q('#menu-body'),
    summary: q('#menu-summary'),
    seed: q('#menu-seed'),
    cta: q('#menu-cta'),
    brief: q('#menu-brief'),
    controls: q('#menu-controls'),
    footLeft: q('#menu-foot-l'),
    footRight: q('#menu-foot-r'),
  };
}

export function formatMuteLabel(muted: boolean): string {
  return muted ? `m ${lore('UI-MUTE-ON')}` : `m ${lore('UI-MUTE-OFF')}`;
}

export function titleSnapshot(seed: number, muted: boolean): MenuView {
  return {
    kind: 'title',
    kicker: '',
    title: lore('UI-TITLE'),
    tag: lore('UI-TITLE-TAGLINE'),
    body: '',
    summary: '',
    seed: `${formatMissionSeed(seed)}  ·  ${lore('UI-SEED-HINT')}`,
    cta: lore('UI-PRESS-START'),
    brief: lore('UI-BRIEF'),
    controls: lore('UI-CONTROLS-TITLE'),
    footLeft: `${lore('UI-ORG')}  ·  ${GAME_VERSION}  ·  ${lore('UI-CHANGELOG-HINT')}`,
    footRight: formatMuteLabel(muted),
    accent: ThemeCss.tape,
    won: false,
  };
}

export function endSnapshot(state: GameState, muted: boolean): MenuView {
  const won = state.status === 'won';
  const { titleId, bodyId } = endLore(state);
  const skillNames = state.skills.map((id) => lore(SKILLS[id].loreName)).join(', ');
  const loadout = EQUIP_SLOT_ORDER.map((s) => state.player.equip[s]).filter(
    (k): k is NonNullable<typeof k> => k !== null,
  );
  const worn = loadout.length > 0 ? loadout.map((k) => shortEquipName(k)).join(' · ') : null;
  const summary = [
    `OBJ  ${lore(describeObjective(state).campaign)}`,
    `LVL  ${state.level}${skillNames ? `  /  ${skillNames}` : ''}`,
    worn ? `KIT  ${worn}` : null,
    `MISSION ${state.seed}   /   turn ${state.turn}`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    kind: 'end',
    kicker: lore('UI-MISSION-STATUS'),
    title: lore(titleId),
    tag: '',
    body: lore(bodyId),
    summary,
    seed: '',
    cta: lore('UI-RETRY'),
    brief: '',
    controls: 'Esc · title',
    footLeft: lore('UI-ORG'),
    footRight: formatMuteLabel(muted),
    accent: won ? ThemeCss.safe : ThemeCss.rust,
    won,
  };
}

export function paintMenu(els: MenuEls, view: MenuView, modal: 'none' | 'help' | 'changelog'): void {
  els.root.hidden = false;
  els.root.dataset.kind = view.kind;
  els.root.dataset.won = view.won ? '1' : '0';
  els.root.classList.toggle('is-modal', modal !== 'none');
  els.root.style.setProperty('--accent', view.accent);
  setText(els.kicker, view.kicker);
  els.title.textContent = view.title;
  setText(els.tag, view.tag);
  setText(els.body, view.body);
  setText(els.summary, view.summary);
  setText(els.seed, view.seed);
  els.cta.textContent = view.cta;
  setText(els.brief, view.brief);
  setText(els.controls, view.controls);
  els.footLeft.textContent = view.footLeft;
  els.footRight.textContent = view.footRight;
}

export function hideMenu(els: MenuEls): void {
  els.root.hidden = true;
}

export function titleModalBody(chrome: TitleChrome): { kind: 'none' | 'help' | 'changelog'; body: string } {
  if (chrome.helpOpen) return { kind: 'help', body: formatHelpContent(false) };
  if (chrome.changelogOpen) return { kind: 'changelog', body: formatChangelogContent() };
  return { kind: 'none', body: '' };
}

export function routeTitleKey(e: KeyboardEvent, chrome: TitleChrome): TitleCommand {
  if (e.key === 'm' || e.key === 'M') return { type: 'mute' };
  if (chrome.helpOpen) {
    if (isTitleHelpDismissKey(e)) return { type: 'help', force: false };
    return { type: 'noop' };
  }
  if (chrome.changelogOpen) {
    if (isTitleChangelogDismissKey(e)) return { type: 'changelog', force: false };
    return { type: 'noop' };
  }
  if (isTitleHelpKey(e)) return { type: 'help', force: true };
  if (isTitleChangelogKey(e)) return { type: 'changelog', force: true };
  if (e.key === 'ArrowLeft') return { type: 'seed', delta: -1 };
  if (e.key === 'ArrowRight') return { type: 'seed', delta: 1 };
  if (e.key === 'r' || e.key === 'R') return { type: 'seed_random' };
  if (isTitleStartKey(e)) return { type: 'start' };
  return { type: 'noop' };
}

export function routeEndKey(e: KeyboardEvent): EndCommand {
  if (e.key === 'm' || e.key === 'M') return { type: 'mute' };
  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') return { type: 'retry' };
  if (e.key === 'Escape') return { type: 'title' };
  return { type: 'noop' };
}

function endLore(state: GameState): { titleId: LoreId; bodyId: LoreId } {
  if (state.status === 'won') return { titleId: 'UI-WIN', bodyId: 'UI-WIN-BODY' };
  if (state.loseReason === 'hp') return { titleId: 'UI-LOSE-HP', bodyId: 'UI-LOSE-HP-BODY' };
  if (state.loseReason === 'energy') return { titleId: 'UI-LOSE-ENERGY', bodyId: 'UI-LOSE-ENERGY-BODY' };
  return { titleId: 'UI-LOSE-STUCK', bodyId: 'UI-LOSE-STUCK-BODY' };
}

function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.hidden = text.length === 0;
}
