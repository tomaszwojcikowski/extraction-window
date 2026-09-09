/**
 * v2 slice 5 — orbit field, HTML HUD, title / end, and splice overlay.
 */
import { lore } from '../data/lore';
import { getSector } from '../data/encounters';
import { CAMPAIGN_LENGTH } from '../campaign/spine';
import {
  busIsCritical,
  describeObjective,
  stickyMilestone,
  type GameState,
} from '../sim';
import { EM_HIGH, EM_WARN } from '../sim/emStress';
import { formatRoomQuestHudLine } from '../sim/mechanics/roomQuestMechanic';
import { isHackOpen } from '../sim/mechanics/consoleHack';
import { Theme, ThemeCss } from '../scenes/theme';
import { contextHint } from '../game/presenters/ContextHints';
import { fieldHudChips, fitHudChips, formatHudMeta } from '../game/presenters/FieldHud';
import { formatFieldKitDock } from '../game/presenters/FieldKitDock';
import {
  formatHackContent,
  hackOverlayContent,
  type HackBoardView,
  type HackCellView,
  type HackChipView,
  type HackSessionView,
} from '../game/presenters/HackOverlayContent';
import { buildKitOverlayContent } from '../game/presenters/KitOverlayContent';
import { formatPaddContent, formatHelpContent, formatSkillPickContent, formatQuestOfferContent } from '../game/presenters/OverlayCopy';

export { formatHackContent } from '../game/presenters/HackOverlayContent';

export const HUD_BAR_SLOTS = 4;
export const HUD_BADGE_SLOTS = 8;

const V2_HELP_NOTE = 'v2: WASD follows the camera · Q E yaw · right-drag orbit';

export type HudChrome = {
  helpOpen: boolean;
  pagesOpen: boolean;
  logOpen: boolean;
};

export type HudModalKind =
  | 'none'
  | 'help'
  | 'padd'
  | 'kit'
  | 'skill'
  | 'quest'
  | 'hack'
  | 'end';

export type HudBar = {
  caption: string;
  value: string;
  ratio: number;
  fill: string;
  low: string;
  critical: boolean;
};

export type HudChipView = { label: string; fill: string };

export type HudSnapshot = {
  bars: HudBar[];
  meta: string;
  sector: string;
  chips: HudChipView[];
  objLocal: string;
  objCampaign: string;
  quest: string;
  urgency: string;
  urgencyHot: boolean;
  milestone: string;
  hint: string;
  dock: string;
  log: string;
  modal: HudModalKind;
  modalBody: string;
  modalAccent: string;
  powerShort: boolean;
  hack: HackBoardView | null;
};

export type HudEls = {
  bars: HTMLElement;
  chips: HTMLElement;
  meta: HTMLElement;
  sector: HTMLElement;
  objLocal: HTMLElement;
  objCampaign: HTMLElement;
  quest: HTMLElement;
  urgency: HTMLElement;
  milestone: HTMLElement;
  debug: HTMLElement;
  dock: HTMLElement;
  hint: HTMLElement;
  log: HTMLElement;
  modal: HTMLElement;
  modalBody: HTMLElement;
  hackBoard: HTMLElement;
};

export function tintCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function bindHud(root: Document | HTMLElement): HudEls {
  const q = (sel: string) => {
    const el = ('querySelector' in root ? root : document).querySelector(sel);
    if (!el) throw new Error(`v2 HUD missing ${sel}`);
    return el as HTMLElement;
  };
  return {
    bars: q('#bars'),
    chips: q('#chips'),
    meta: q('#meta'),
    sector: q('#sector'),
    objLocal: q('#obj-local'),
    objCampaign: q('#obj-campaign'),
    quest: q('#quest'),
    urgency: q('#urgency'),
    milestone: q('#milestone'),
    debug: q('#debug'),
    dock: q('#dock'),
    hint: q('#hint'),
    log: q('#log'),
    modal: q('#modal'),
    modalBody: q('#modal-body'),
    hackBoard: q('#hack-board'),
  };
}

export function hudSnapshot(state: GameState, chrome: HudChrome): HudSnapshot {
  const p = state.player;
  const bars: HudBar[] = [
    meter(lore('UI-BAR-HP'), `${p.hp}/${p.maxHp}`, p.hp / p.maxHp, Theme.safe, Theme.rust),
    meter(
      lore('UI-BAR-SHD'),
      `${p.armor}/${p.maxArmor}`,
      p.armor / Math.max(1, p.maxArmor),
      Theme.ink,
      Theme.rust,
    ),
    meter(
      lore('UI-BAR-EPS'),
      `${p.energy}/${p.maxEnergy}`,
      p.energy / p.maxEnergy,
      Theme.tape,
      Theme.arc,
    ),
    meter(
      lore('UI-BAR-XP'),
      state.xpToNext ? `${state.xp}/${state.xpToNext}` : `${state.xp}`,
      state.xpToNext > 0 ? state.xp / state.xpToNext : 1,
      Theme.flag,
      Theme.inkMute,
    ),
  ];

  const skillLock = Boolean(state.skillPick?.length);
  const busHot = busIsCritical(state);
  const emHot = state.emStress >= EM_HIGH;
  const emUrgentStrip = !skillLock && (emHot || state.emStress >= EM_WARN);
  const meta = formatHudMeta(state, { suppressEmMeta: emUrgentStrip });

  const sector = getSector(state.sectorIndex);
  let sectorLine: string;
  if (state.tutorialActive) {
    sectorLine = `${lore('UI-SECTOR')} ${lore('UI-TUT-SECTOR')}\n${lore('OBJ-TUT-BRIEF')}   ${lore('UI-SEED')} ${state.seed}`;
  } else {
    const ticks = Array.from({ length: CAMPAIGN_LENGTH }, (_, i) =>
      i <= state.sectorIndex ? '#' : '-',
    ).join(' ');
    sectorLine = `${lore('UI-SECTOR')} ${state.sectorIndex + 1}/${CAMPAIGN_LENGTH}  ${lore(sector.loreName)}\n${ticks}   ${lore('UI-SEED')} ${state.seed}`;
  }

  const desc = describeObjective(state);
  const quest = formatRoomQuestHudLine(state) ?? '';

  const urgencyParts: string[] = [];
  if (!skillLock) {
    if (busHot) urgencyParts.push(`▸ ${lore('HAZ-BUS')}  (${state.player.energy})`);
    if (emHot) urgencyParts.push(`▸ ${lore('UI-EM-CRIT')} ${state.emStress}`);
    else if (state.emStress >= EM_WARN) urgencyParts.push(`▸ ${lore('UI-EM-WARN')} ${state.emStress}`);
  }
  const urgency = urgencyParts.join(' · ');
  const sticky = stickyMilestone(state.loreEvents);
  const milestone = urgency ? '' : sticky ? lore(sticky) : '';

  const overlayUp =
    chrome.helpOpen ||
    chrome.pagesOpen ||
    state.ui.inventoryOpen ||
    skillLock ||
    Boolean(state.questOffer) ||
    isHackOpen(state);
  const hintId = overlayUp ? null : contextHint(state);
  const hint = hintId ? lore(hintId) : '';

  const logLines = chrome.logOpen
    ? state.log.slice(-5).map((l) => {
        const base = lore(l.loreId);
        return l.detail ? `- ${base} (${l.detail})` : `- ${base}`;
      })
    : [];
  const log = chrome.logOpen
    ? `${lore('UI-LOG')}  /  l close · ? help\n${logLines.join('\n')}`
    : '';

  const kit = buildKitOverlayContent(state);
  const modal = resolveModal(state, chrome);
  const { body, accent, powerShort } = modalCopy(state, modal, kit);

  return {
    bars,
    meta,
    sector: sectorLine,
    chips: fitHudChips(fieldHudChips(state), HUD_BADGE_SLOTS).map((c) => ({
      label: c.label,
      fill: tintCss(c.fill),
    })),
    objLocal: lore(desc.local),
    objCampaign: `${lore('UI-OBJECTIVE')}: ${lore(desc.campaign)}`,
    quest,
    urgency,
    urgencyHot: busHot || emHot,
    milestone,
    hint,
    dock: formatFieldKitDock(state),
    log,
    modal,
    modalBody: body,
    modalAccent: accent,
    powerShort,
    hack: modal === 'hack' ? hackOverlayContent(state) : null,
  };
}

export function paintHud(els: HudEls, snap: HudSnapshot, debug = ''): void {
  const meters = els.bars.querySelectorAll<HTMLElement>('[data-bar]');
  snap.bars.forEach((bar, i) => {
    const slot = meters[i];
    if (!slot) return;
    const cap = slot.querySelector('.cap');
    const val = slot.querySelector('.val');
    const fill = slot.querySelector<HTMLElement>('.fill');
    if (cap) cap.textContent = bar.caption;
    if (val) {
      val.textContent = bar.value;
      (val as HTMLElement).style.color = bar.critical ? ThemeCss.rust : ThemeCss.ink;
    }
    if (fill) {
      fill.style.width = `${Math.round(bar.ratio * 100)}%`;
      fill.style.background = bar.critical ? bar.low : bar.fill;
    }
  });

  els.chips.replaceChildren(
    ...snap.chips.map((chip) => {
      const el = document.createElement('span');
      el.className = 'chip';
      el.textContent = chip.label;
      el.style.color = chip.fill;
      el.style.borderColor = chip.fill;
      return el;
    }),
  );

  els.meta.textContent = snap.meta;
  els.sector.textContent = snap.sector;
  els.objLocal.textContent = snap.objLocal;
  els.objCampaign.textContent = snap.objCampaign;
  setLine(els.quest, snap.quest);
  setLine(els.urgency, snap.urgency);
  els.urgency.style.color = snap.urgencyHot ? ThemeCss.rust : ThemeCss.inkDim;
  setLine(els.milestone, snap.milestone);
  els.debug.textContent = debug;
  els.dock.textContent = snap.dock;
  setLine(els.hint, snap.hint);
  setLine(els.log, snap.log);

  const open = snap.modal !== 'none';
  els.modal.hidden = !open;
  els.modal.dataset.kind = snap.modal;
  els.modal.style.setProperty('--accent', snap.modalAccent);
  if (snap.powerShort) els.modal.dataset.short = '1';
  else delete els.modal.dataset.short;
  if (snap.hack) {
    els.modalBody.hidden = true;
    els.hackBoard.hidden = false;
    paintHackBoard(els.hackBoard, snap.hack);
  } else {
    els.modalBody.hidden = false;
    els.hackBoard.hidden = true;
    els.hackBoard.replaceChildren();
    els.modalBody.textContent = snap.modalBody;
  }
}

function meter(
  caption: string,
  value: string,
  ratio: number,
  fill: number,
  low: number,
): HudBar {
  const clamped = Math.max(0, Math.min(1, ratio));
  return {
    caption,
    value,
    ratio: clamped,
    fill: tintCss(fill),
    low: tintCss(low),
    critical: clamped <= 0.3,
  };
}

function setLine(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.hidden = text.length === 0;
}

function resolveModal(state: GameState, chrome: HudChrome): HudModalKind {
  if (state.status !== 'playing') return 'end';
  if (isHackOpen(state)) return 'hack';
  if (state.questOffer) return 'quest';
  if (state.skillPick && state.skillPick.length > 0) return 'skill';
  if (chrome.helpOpen) return 'help';
  if (chrome.pagesOpen) return 'padd';
  if (state.ui.inventoryOpen) return 'kit';
  return 'none';
}

function modalCopy(
  state: GameState,
  kind: HudModalKind,
  kit: ReturnType<typeof buildKitOverlayContent>,
): { body: string; accent: string; powerShort: boolean } {
  switch (kind) {
    case 'end':
      return { body: formatEndContent(state), accent: ThemeCss.rust, powerShort: false };
    case 'hack':
      return { body: formatHackContent(state), accent: ThemeCss.tape, powerShort: false };
    case 'quest':
      return {
        body: state.questOffer ? formatQuestOfferContent(state.questOffer) : '',
        accent: state.questOffer?.source === 'npc' ? ThemeCss.tape : ThemeCss.flag,
        powerShort: false,
      };
    case 'skill':
      return {
        body: formatSkillPickContent(state.skillPick ?? []),
        accent: ThemeCss.biolum,
        powerShort: false,
      };
    case 'help':
      return {
        body: `${formatHelpContent(state.tutorialActive)}\n\n${V2_HELP_NOTE}`,
        accent: ThemeCss.biolum,
        powerShort: false,
      };
    case 'padd':
      return { body: formatPaddContent(state), accent: ThemeCss.flag, powerShort: false };
    case 'kit':
      return {
        body: kit.lines.join('\n'),
        accent: kit.powerShort ? ThemeCss.rust : ThemeCss.tape,
        powerShort: kit.powerShort,
      };
    default:
      return { body: '', accent: ThemeCss.tape, powerShort: false };
  }
}

export function formatEndContent(state: GameState): string {
  if (state.status === 'won') {
    return `${lore('UI-MISSION-STATUS')}\n\n${lore('UI-WIN')}\n\n${lore('UI-WIN-BODY')}\n\nR — new seed`;
  }
  const title =
    state.loseReason === 'hp'
      ? 'UI-LOSE-HP'
      : state.loseReason === 'energy'
        ? 'UI-LOSE-ENERGY'
        : 'UI-LOSE-STUCK';
  const body =
    state.loseReason === 'hp'
      ? 'UI-LOSE-HP-BODY'
      : state.loseReason === 'energy'
        ? 'UI-LOSE-ENERGY-BODY'
        : 'UI-LOSE-STUCK-BODY';
  return `${lore('UI-MISSION-STATUS')}\n\n${lore(title)}\n\n${lore(body)}\n\nR — new seed`;
}

function paintHackBoard(root: HTMLElement, board: HackBoardView): void {
  root.replaceChildren();
  const badge = el('p', 'hack-badge', board.badge);
  root.append(badge);
  if (board.kind === 'payout') {
    root.append(el('p', 'hack-title', board.title));
    for (const line of board.items) root.append(el('p', 'hack-pay', line));
    for (const line of board.boosts) root.append(el('p', 'hack-pay', line));
    root.append(el('p', 'hack-keys', board.keys));
    return;
  }
  if (board.kind === 'idle') {
    root.append(el('p', 'hack-keys', board.keys));
    return;
  }
  paintHackSession(root, board);
}

function paintHackSession(root: HTMLElement, board: HackSessionView): void {
  const row = el('div', 'hack-seq');
  row.append(seqCol(board.targetLabel, board.target));
  row.append(seqCol(board.bufferLabel, board.buffer));
  const pips = el('div', 'hack-pips');
  pips.setAttribute('aria-label', `${board.tries}/${board.triesMax}`);
  for (let i = 0; i < board.triesMax; i++) {
    const pip = el('span', i < board.tries ? 'hack-pip is-on' : 'hack-pip');
    pips.append(pip);
  }
  row.append(pips);
  root.append(row);

  const grid = el('div', 'hack-grid');
  grid.style.setProperty('--hack-size', String(board.size));
  if (board.axis) grid.dataset.axis = board.axis;
  if (board.last) {
    grid.dataset.lastX = String(board.last.x);
    grid.dataset.lastY = String(board.last.y);
  }
  for (const cell of board.cells) grid.append(paintHackCell(cell, board));
  root.append(grid);

  const hint = el('p', board.hintFail ? 'hack-hint is-fail' : 'hack-hint', board.hint);
  root.append(hint);
  root.append(el('p', 'hack-keys', board.keys));
}

function seqCol(label: string, chips: HackChipView[]): HTMLElement {
  const col = el('div', 'hack-seq-col');
  col.append(el('span', 'hack-seq-label', label));
  const strip = el('div', 'hack-chips');
  for (const chip of chips) strip.append(paintHackChip(chip));
  col.append(strip);
  return col;
}

function paintHackChip(chip: HackChipView): HTMLElement {
  const node = el('span', 'hack-chip', chip.mark);
  node.style.color = chip.color;
  node.style.setProperty('--chip', chip.color);
  if (chip.empty) node.classList.add('is-empty');
  if (chip.live) node.classList.add('is-live');
  if (chip.miss) node.classList.add('is-miss');
  return node;
}

function paintHackCell(cell: HackCellView, board: HackSessionView): HTMLElement {
  const node = el('span', 'hack-cell', cell.mark);
  node.style.color = cell.color;
  if (cell.used) node.classList.add('is-used');
  if (cell.legal) node.classList.add('is-legal');
  if (cell.cursor) node.classList.add('is-cursor');
  if (cell.blocked) node.classList.add('is-blocked');
  if (cell.pickOrder >= 0) {
    node.classList.add('is-picked');
    node.dataset.order = String(cell.pickOrder + 1);
  }
  if (board.axis && board.last) {
    if (board.axis === 'col' && cell.x === board.last.x) node.classList.add('is-axis');
    if (board.axis === 'row' && cell.y === board.last.y) node.classList.add('is-axis');
  }
  return node;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
