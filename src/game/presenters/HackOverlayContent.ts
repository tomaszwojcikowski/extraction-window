import { lore } from '../../data/lore';
import { Theme, ThemeCss } from '../../scenes/theme';
import type { ConsoleHack, GameState, HackGlyph, HackPayout, HackSession } from '../../sim/types';
import {
  HACK_LEN,
  HACK_MARKS,
  HACK_SIZE,
  HACK_TRIES,
  hackConstraintHint,
  hackLaneCells,
  isHackOpen,
} from '../../sim/mechanics/consoleHack';

/** Glyph fills — same order as `HACK_MARKS`. Phaser and HTML share these. */
export const HACK_GLYPH_COLOR = [Theme.ink, Theme.biolum, Theme.tape, Theme.flag, Theme.safe] as const;

export type HackChipView = {
  mark: string;
  color: string;
  empty: boolean;
  live: boolean;
  miss: boolean;
};

export type HackCellView = {
  x: number;
  y: number;
  mark: string;
  color: string;
  used: boolean;
  legal: boolean;
  cursor: boolean;
  blocked: boolean;
  pickOrder: number;
};

export type HackPayoutView = {
  kind: 'payout';
  badge: string;
  title: string;
  items: string[];
  boosts: string[];
  keys: string;
};

export type HackSessionView = {
  kind: 'session';
  badge: string;
  targetLabel: string;
  bufferLabel: string;
  target: HackChipView[];
  buffer: HackChipView[];
  tries: number;
  triesMax: number;
  axis: 'row' | 'col' | null;
  last: { x: number; y: number } | null;
  size: number;
  cells: HackCellView[];
  hint: string;
  hintFail: boolean;
  keys: string;
};

export type HackIdleView = {
  kind: 'idle';
  badge: string;
  keys: string;
};

export type HackBoardView = HackPayoutView | HackSessionView | HackIdleView;

function cssColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function glyphColor(glyph: HackGlyph): string {
  return cssColor(HACK_GLYPH_COLOR[glyph]!);
}

function chip(
  glyph: HackGlyph | null,
  opts: { empty?: boolean; live?: boolean; miss?: boolean },
): HackChipView {
  const empty = Boolean(opts.empty) || glyph === null;
  const miss = Boolean(opts.miss);
  return {
    mark: glyph === null ? '·' : HACK_MARKS[glyph]!,
    color: empty ? ThemeCss.inkMute : miss ? ThemeCss.rust : glyphColor(glyph),
    empty,
    live: Boolean(opts.live),
    miss,
  };
}

function payoutView(payout: HackPayout): HackPayoutView {
  return {
    kind: 'payout',
    badge: lore('UI-HACK-PAY-BADGE'),
    title: lore('UI-HACK-PAY').toUpperCase(),
    items: payout.items.map((n) => `· ${n}`),
    boosts: payout.boosts.map((id) => `· ${lore(id)}`),
    keys: lore('UI-HACK-PAY-KEYS'),
  };
}

function sessionView(hack: ConsoleHack, session: HackSession): HackSessionView {
  const live = session.buffer.length;
  const lane = new Set(hackLaneCells(session).map((p) => `${p.x},${p.y}`));
  const target: HackChipView[] = [];
  const buffer: HackChipView[] = [];
  for (let i = 0; i < HACK_LEN; i++) {
    const glyph = session.target[i]!;
    target.push(chip(glyph, { live: i === live }));
    const have = i < session.buffer.length;
    const bglyph = have ? session.buffer[i]! : null;
    const miss = have && bglyph !== session.target[i];
    buffer.push(chip(bglyph, { empty: !have, miss }));
  }

  const cells: HackCellView[] = [];
  for (let y = 0; y < HACK_SIZE; y++) {
    for (let x = 0; x < HACK_SIZE; x++) {
      const glyph = session.grid[y]![x]!;
      const used = session.used[y]![x]!;
      const cursor = session.cursor.x === x && session.cursor.y === y;
      const legal = lane.has(`${x},${y}`);
      const order = session.picks.findIndex((p) => p.x === x && p.y === y);
      cells.push({
        x,
        y,
        mark: HACK_MARKS[glyph]!,
        color: used ? ThemeCss.inkMute : glyphColor(glyph),
        used,
        legal,
        cursor,
        blocked: cursor && hack.note === 'blocked',
        pickOrder: order,
      });
    }
  }

  return {
    kind: 'session',
    badge: lore('UI-HACK-TITLE').toUpperCase(),
    targetLabel: lore('UI-HACK-TARGET'),
    bufferLabel: lore('UI-HACK-BUFFER'),
    target,
    buffer,
    tries: session.attempts,
    triesMax: HACK_TRIES,
    axis: session.last ? session.axis : null,
    last: session.last ? { x: session.last.x, y: session.last.y } : null,
    size: HACK_SIZE,
    cells,
    hint: lore(hackConstraintHint(session)),
    hintFail: hack.note === 'fail',
    keys: lore('UI-HACK-KEYS'),
  };
}

/** Phaser-free splice board — HTML HUD paints this; overlays still only read state. */
export function hackOverlayContent(state: GameState): HackBoardView | null {
  if (!isHackOpen(state) || !state.consoleHack) return null;
  const hack = state.consoleHack;
  if (hack.payout && !hack.session) return payoutView(hack.payout);
  if (!hack.session) {
    return { kind: 'idle', badge: lore('UI-HACK-TITLE'), keys: lore('UI-HACK-KEYS') };
  }
  return sessionView(hack, hack.session);
}

/** Compact splice copy — tests and any text-only fallback. */
export function formatHackContent(state: GameState): string {
  const board = hackOverlayContent(state);
  if (!board) return '';
  if (board.kind === 'payout') {
    return [board.badge, board.title, ...board.items, ...board.boosts, board.keys]
      .filter(Boolean)
      .join('\n');
  }
  if (board.kind === 'idle') return `${board.badge}\n${board.keys}`;
  const target = board.target.map((c) => c.mark).join(' ');
  const buffer = board.buffer.map((c) => c.mark).join(' ');
  const rows: string[] = [];
  for (let y = 0; y < board.size; y++) {
    const row = board.cells.slice(y * board.size, (y + 1) * board.size);
    rows.push(
      row
        .map((cell) => {
          if (cell.used) return ' · ';
          if (cell.cursor) return `[${cell.mark}]`;
          return ` ${cell.mark} `;
        })
        .join(''),
    );
  }
  return [
    board.badge,
    `${board.targetLabel} ${target}`,
    `${board.bufferLabel} ${buffer}`,
    `${lore('UI-HACK-TRIES')} ${board.tries}`,
    '',
    ...rows,
    '',
    board.keys,
  ].join('\n');
}
