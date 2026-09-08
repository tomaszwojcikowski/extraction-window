/**
 * v2 slice 3 — HTML HUD snapshot + paint.
 * Copy comes from Phaser-free presenters; this module does not mutate GameState.
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
import { HACK_MARKS, isHackOpen } from '../sim/mechanics/consoleHack';
import { Theme, ThemeCss } from '../scenes/theme';
import { contextHint } from '../game/presenters/ContextHints';
import { fieldHudChips, fitHudChips, formatHudMeta } from '../game/presenters/FieldHud';
import { formatFieldKitDock } from '../game/presenters/FieldKitDock';
import { buildKitOverlayContent } from '../game/presenters/KitOverlayContent';
import { formatPaddContent, formatHelpContent, formatSkillPickContent, formatQuestOfferContent } from '../game/presenters/OverlayCopy';

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
    Boolean(state.questOffer);
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
  els.modalBody.textContent = snap.modalBody;
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

/** Compact splice board so a terminal does not freeze the run without the Phaser overlay. */
export function formatHackContent(state: GameState): string {
  const hack = state.consoleHack;
  if (!hack) return '';
  if (hack.payout && !hack.session) {
    const items = hack.payout.items.length ? hack.payout.items.join(', ') : '—';
    const boosts = hack.payout.boosts.map((id) => lore(id)).join('\n');
    return [lore('UI-HACK-PAY-BADGE'), lore('UI-HACK-PAY'), items, boosts, lore('UI-HACK-PAY-KEYS')]
      .filter(Boolean)
      .join('\n');
  }
  const session = hack.session;
  if (!session) return `${lore('UI-HACK-TITLE')}\n${lore('UI-HACK-KEYS')}`;
  const target = session.target.map((g) => HACK_MARKS[g]).join(' ');
  const buffer = session.target
    .map((_, i) => (session.buffer[i] !== undefined ? HACK_MARKS[session.buffer[i]!] : '·'))
    .join(' ');
  const rows = session.grid.map((row, y) =>
    row
      .map((g, x) => {
        const mark = HACK_MARKS[g]!;
        if (session.used[y]![x]) return ' · ';
        if (session.cursor.x === x && session.cursor.y === y) return `[${mark}]`;
        return ` ${mark} `;
      })
      .join(''),
  );
  return [
    lore('UI-HACK-TITLE'),
    `${lore('UI-HACK-TARGET')} ${target}`,
    `${lore('UI-HACK-BUFFER')} ${buffer}`,
    `${lore('UI-HACK-TRIES')} ${session.attempts}`,
    '',
    ...rows,
    '',
    lore('UI-HACK-KEYS'),
  ].join('\n');
}
