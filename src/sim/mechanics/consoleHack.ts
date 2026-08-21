import { lore, type LoreId } from '../../data/lore';
import { ITEMS, type ItemKind } from '../../data/items';
import { pickWearableLoot } from '../../data/wearableLoot';
import { addItem } from '../inventory';
import { pushLog } from '../log';
import { addEmStress, purgeEmStress } from '../emStress';
import { POWER_TAX_HEAVY, taxPower } from '../bus';
import { pick, randInt, shuffle, type Rng } from '../rng';
import { grantCodex } from '../roomQuest';
import type { Action, ConsoleHack, GameState, HackGlyph, HackPayout, HackSession, Pos } from '../types';
import type { Mechanic } from './types';

export const HACK_SIZE = 5;
export const HACK_LEN = 5;
export const HACK_TRIES = 3;
export const HACK_MARKS = ['A', 'B', 'C', 'D', 'E'] as const;
const MAX_SOLUTIONS = 2;

const GLYPHS: HackGlyph[] = [0, 1, 2, 3, 4];
const KIT_PAY: ItemKind[] = ['plate', 'energy', 'mapper', 'probe', 'filter'];

function consoleTile(): { kind: 'console'; walkable: true; transparent: true } {
  return { kind: 'console', walkable: true, transparent: true };
}

function emptyUsed(): boolean[][] {
  return Array.from({ length: HACK_SIZE }, () => Array.from({ length: HACK_SIZE }, () => false));
}

function keyOf(p: Pos): string {
  return `${p.x},${p.y}`;
}

function generateGrid(rng: Rng): HackGlyph[][] {
  return Array.from({ length: HACK_SIZE }, () =>
    Array.from({ length: HACK_SIZE }, () => pick(rng, GLYPHS)),
  );
}

/** Always-solvable path: first cell free, then alternate column / row. */
function buildPath(rng: Rng): Pos[] {
  for (let attempt = 0; attempt < 24; attempt++) {
    let x = randInt(rng, 0, HACK_SIZE - 1);
    let y = randInt(rng, 0, HACK_SIZE - 1);
    const path: Pos[] = [{ x, y }];
    const used = new Set([keyOf({ x, y })]);
    // Play always asks for a column splice after the first pick.
    let axis: 'row' | 'col' = 'col';
    let ok = true;
    for (let i = 1; i < HACK_LEN; i++) {
      const candidates: Pos[] = [];
      if (axis === 'col') {
        for (let ny = 0; ny < HACK_SIZE; ny++) {
          const p = { x, y: ny };
          if (!used.has(keyOf(p))) candidates.push(p);
        }
      } else {
        for (let nx = 0; nx < HACK_SIZE; nx++) {
          const p = { x: nx, y };
          if (!used.has(keyOf(p))) candidates.push(p);
        }
      }
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const next = pick(rng, candidates);
      path.push(next);
      used.add(keyOf(next));
      x = next.x;
      y = next.y;
      axis = axis === 'col' ? 'row' : 'col';
    }
    if (ok) return path;
  }
  return [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ];
}

function sessionOf(grid: HackGlyph[][], target: HackGlyph[]): HackSession {
  return {
    grid,
    target,
    buffer: [],
    cursor: { x: 2, y: 2 },
    last: null,
    axis: 'col',
    used: emptyUsed(),
    picks: [],
    attempts: HACK_TRIES,
  };
}

/** Count lattice walks that match `target`. The painted path always counts as one. */
export function countHackSolutions(grid: HackGlyph[][], target: HackGlyph[]): number {
  const n = grid.length;
  let found = 0;
  const walk = (
    x: number,
    y: number,
    axis: 'row' | 'col',
    depth: number,
    used: Set<string>,
  ): void => {
    if (grid[y]![x] !== target[depth]) return;
    if (depth + 1 >= target.length) {
      found += 1;
      return;
    }
    const mark = `${x},${y}`;
    used.add(mark);
    const nextAxis = axis === 'col' ? 'row' : 'col';
    if (axis === 'col') {
      for (let ny = 0; ny < n; ny++) {
        if (!used.has(`${x},${ny}`)) walk(x, ny, nextAxis, depth + 1, used);
      }
    } else {
      for (let nx = 0; nx < n; nx++) {
        if (!used.has(`${nx},${y}`)) walk(nx, y, nextAxis, depth + 1, used);
      }
    }
    used.delete(mark);
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      walk(x, y, 'col', 0, new Set());
    }
  }
  return found;
}

export function hackHasSolution(grid: HackGlyph[][], target: HackGlyph[]): boolean {
  return countHackSolutions(grid, target) > 0;
}

function tightenDecoys(rng: Rng, grid: HackGlyph[][], target: HackGlyph[], path: Pos[]): void {
  const locked = new Set(path.map(keyOf));
  const decoys: Pos[] = [];
  for (let y = 0; y < HACK_SIZE; y++) {
    for (let x = 0; x < HACK_SIZE; x++) {
      if (!locked.has(keyOf({ x, y }))) decoys.push({ x, y });
    }
  }
  for (const p of shuffle(rng, decoys)) {
    let best = grid[p.y]![p.x]!;
    let bestN = countHackSolutions(grid, target);
    for (const g of shuffle(rng, [...GLYPHS])) {
      grid[p.y]![p.x] = g;
      const n = countHackSolutions(grid, target);
      if (n >= 1 && n < bestN) {
        best = g;
        bestN = n;
        if (n === 1) break;
      }
    }
    grid[p.y]![p.x] = best;
  }
}

export function generateHackSession(rng: Rng): HackSession {
  let best: HackSession | null = null;
  let bestN = Infinity;
  for (let attempt = 0; attempt < 32; attempt++) {
    const path = buildPath(rng);
    const target = Array.from({ length: HACK_LEN }, () => pick(rng, GLYPHS));
    const grid = generateGrid(rng);
    for (let i = 0; i < path.length; i++) {
      const p = path[i]!;
      grid[p.y]![p.x] = target[i]!;
    }
    tightenDecoys(rng, grid, target, path);
    const n = countHackSolutions(grid, target);
    if (n >= 1 && n < bestN) {
      best = sessionOf(grid, target);
      bestN = n;
      if (n <= MAX_SOLUTIONS) return best;
    }
  }
  return best ?? sessionOf(generateGrid(rng), [0, 1, 2, 3, 4]);
}

export function isHackOpen(state: GameState): boolean {
  return Boolean(state.consoleHack?.session || state.consoleHack?.payout);
}

export function onConsoleTile(state: GameState): boolean {
  const hack = state.consoleHack;
  if (!hack || hack.done) return false;
  return state.player.x === hack.pos.x && state.player.y === hack.pos.y;
}

export type HackPickResult = 'blocked' | 'spliced' | 'win' | 'fail' | 'lockout';

export function nextHackGlyph(session: HackSession): HackGlyph | null {
  return session.target[session.buffer.length] ?? null;
}

export function hackLaneCells(session: HackSession): Pos[] {
  const out: Pos[] = [];
  if (!session.last) {
    for (let y = 0; y < HACK_SIZE; y++) {
      for (let x = 0; x < HACK_SIZE; x++) {
        if (canPickHackCell(session, x, y)) out.push({ x, y });
      }
    }
    return out;
  }
  if (session.axis === 'col') {
    const x = session.last.x;
    for (let y = 0; y < HACK_SIZE; y++) {
      if (canPickHackCell(session, x, y)) out.push({ x, y });
    }
  } else {
    const y = session.last.y;
    for (let x = 0; x < HACK_SIZE; x++) {
      if (canPickHackCell(session, x, y)) out.push({ x, y });
    }
  }
  return out;
}

export function canPickHackCell(session: HackSession, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= HACK_SIZE || y >= HACK_SIZE) return false;
  if (session.used[y]![x]) return false;
  if (!session.last) return true;
  if (session.axis === 'col') return x === session.last.x && y !== session.last.y;
  return y === session.last.y && x !== session.last.x;
}

export function hackConstraintHint(session: HackSession): LoreId {
  if (!session.last) return 'UI-HACK-ANY';
  return session.axis === 'col' ? 'UI-HACK-COL' : 'UI-HACK-ROW';
}

export function openHackSession(state: GameState): boolean {
  const hack = state.consoleHack;
  if (!hack || hack.done || hack.session) return false;
  if (!onConsoleTile(state)) return false;
  hack.session = generateHackSession(state.rng);
  pushLog(state, 'LOG-HACK-OPEN');
  return true;
}

function giveItem(state: GameState, kind: ItemKind): string {
  if (addItem(state, kind)) return lore(ITEMS[kind].loreName);
  state.items.push({
    id: state.nextEntityId++,
    kind,
    x: state.player.x,
    y: state.player.y,
  });
  return lore(ITEMS[kind].loreName);
}

function grantHackReward(state: GameState): HackPayout {
  const names: string[] = [];
  const kit = [...KIT_PAY];
  for (let i = 0; i < 3; i++) {
    const kind = pick(state.rng, kit);
    names.push(giveItem(state, kind));
  }
  names.push(giveItem(state, pickWearableLoot(state.sectorId, state.rng)));

  state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 20);
  state.player.armor = state.player.maxArmor;
  state.player.filterTurns = Math.max(state.player.filterTurns, 35);
  purgeEmStress(state, 15);
  grantCodex(state);

  const payout: HackPayout = {
    items: names,
    boosts: [
      'UI-HACK-PAY-POWER',
      'UI-HACK-PAY-ARMOR',
      'UI-HACK-PAY-FILTER',
      'UI-HACK-PAY-EM',
      'UI-HACK-PAY-PADD',
    ],
  };
  pushLog(state, 'LOG-HACK-OK', names.join(', '));
  return payout;
}

function setNote(state: GameState, note: HackPickResult): void {
  if (state.consoleHack) state.consoleHack.note = note;
}

function resetAttempt(session: HackSession): void {
  session.buffer = [];
  session.last = null;
  session.axis = 'col';
  session.used = emptyUsed();
  session.picks = [];
  session.cursor = { x: 2, y: 2 };
}

function failAttempt(state: GameState): 'fail' | 'lockout' {
  const session = state.consoleHack?.session;
  if (!session) return 'lockout';
  taxPower(state, POWER_TAX_HEAVY, 'LOG-HACK-FAIL');
  addEmStress(state, 8, 'lattice bounce');
  session.attempts -= 1;
  if (session.attempts <= 0) {
    const hack = state.consoleHack!;
    hack.session = null;
    hack.done = true;
    setNote(state, 'lockout');
    pushLog(state, 'LOG-HACK-LOCK');
    return 'lockout';
  }
  resetAttempt(session);
  setNote(state, 'fail');
  return 'fail';
}

export function moveHackCursor(state: GameState, dx: number, dy: number): void {
  const session = state.consoleHack?.session;
  if (!session) return;
  session.cursor = {
    x: (session.cursor.x + dx + HACK_SIZE) % HACK_SIZE,
    y: (session.cursor.y + dy + HACK_SIZE) % HACK_SIZE,
  };
}

export function abortHack(state: GameState): void {
  const hack = state.consoleHack;
  if (!hack) return;
  if (hack.payout) {
    hack.payout = null;
    return;
  }
  if (!hack.session) return;
  hack.session = null;
  pushLog(state, 'LOG-HACK-ABORT');
}

/** Mutates the open lock. Caller ends the sector turn on win / lockout. */
export function pickHackCell(state: GameState): HackPickResult {
  const hack = state.consoleHack;
  const session = hack?.session;
  if (!hack || !session) return 'blocked';
  const { x, y } = session.cursor;
  if (!canPickHackCell(session, x, y)) {
    setNote(state, 'blocked');
    return 'blocked';
  }

  session.used[y]![x] = true;
  session.picks.push({ x, y });
  session.buffer.push(session.grid[y]![x]!);
  const first = !session.last;
  session.last = { x, y };
  if (first) session.axis = 'col';
  else session.axis = session.axis === 'col' ? 'row' : 'col';

  const slot = session.buffer.length - 1;
  if (session.buffer[slot] !== session.target[slot]) return failAttempt(state);

  if (session.buffer.length >= HACK_LEN) {
    hack.session = null;
    hack.done = true;
    hack.payout = grantHackReward(state);
    setNote(state, 'win');
    return 'win';
  }

  if (hackLaneCells(session).length === 0) return failAttempt(state);
  setNote(state, 'spliced');
  return 'spliced';
}

export function makeConsoleHack(pos: Pos): ConsoleHack {
  return { pos: { ...pos }, done: false, session: null, note: null, payout: null };
}

/** Lab / `hack.html`: plant a terminal on the surveyor and open the modal. */
export function forceOpenHackLab(state: GameState): void {
  const pos = { x: state.player.x, y: state.player.y };
  state.tiles[pos.y]![pos.x] = consoleTile();
  state.consoleHack = makeConsoleHack(pos);
  openHackSession(state);
}

export const consoleHackMechanic: Mechanic = {
  id: 'console_hack',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    return openHackSession(state);
  },

  contextHint(state: GameState): LoreId | null {
    if (state.consoleHack?.session) return null;
    if (!onConsoleTile(state)) return null;
    return 'UI-HINT-CONSOLE';
  },

  autopilotHint(state: GameState): Action | null {
    if (state.consoleHack?.payout) return { type: 'hack_abort' };
    if (state.consoleHack?.session) return { type: 'hack_abort' };
    return null;
  },
};
