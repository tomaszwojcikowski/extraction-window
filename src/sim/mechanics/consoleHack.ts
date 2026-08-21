import { lore, type LoreId } from '../../data/lore';
import { ITEMS, type ItemKind } from '../../data/items';
import { pickWearableLoot } from '../../data/wearableLoot';
import { addItem } from '../inventory';
import { pushLog } from '../log';
import { addEmStress, purgeEmStress } from '../emStress';
import { POWER_TAX_HEAVY, taxPower } from '../bus';
import { pick, randInt, type Rng } from '../rng';
import { grantCodex } from '../roomQuest';
import type { Action, ConsoleHack, GameState, HackGlyph, HackSession, Pos } from '../types';
import type { Mechanic } from './types';

export const HACK_SIZE = 5;
export const HACK_LEN = 4;
export const HACK_TRIES = 3;
export const HACK_MARKS = ['A', 'B', 'C', 'D'] as const;

const GLYPHS: HackGlyph[] = [0, 1, 2, 3];
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
  ];
}

export function generateHackSession(rng: Rng): HackSession {
  const grid = generateGrid(rng);
  const path = buildPath(rng);
  const target = path.map((p) => grid[p.y]![p.x]!);
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

export function hackHasSolution(grid: HackGlyph[][], target: HackGlyph[]): boolean {
  const n = grid.length;
  const walk = (x: number, y: number, axis: 'row' | 'col', depth: number, used: Set<string>): boolean => {
    if (grid[y]![x] !== target[depth]) return false;
    if (depth + 1 >= target.length) return true;
    const mark = `${x},${y}`;
    used.add(mark);
    const nextAxis = axis === 'col' ? 'row' : 'col';
    if (axis === 'col') {
      for (let ny = 0; ny < n; ny++) {
        if (!used.has(`${x},${ny}`) && walk(x, ny, nextAxis, depth + 1, used)) return true;
      }
    } else {
      for (let nx = 0; nx < n; nx++) {
        if (!used.has(`${nx},${y}`) && walk(nx, y, nextAxis, depth + 1, used)) return true;
      }
    }
    used.delete(mark);
    return false;
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (walk(x, y, 'col', 0, new Set())) return true;
    }
  }
  return false;
}

export function isHackOpen(state: GameState): boolean {
  return Boolean(state.consoleHack?.session);
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

function grantHackReward(state: GameState): void {
  const names: string[] = [];
  const kit = [...KIT_PAY];
  for (let i = 0; i < 3; i++) {
    const kind = pick(state.rng, kit);
    names.push(giveItem(state, kind));
  }
  names.push(giveItem(state, pickWearableLoot(state.sectorId, state.rng)));
  pushLog(state, 'LOG-PICKUP', names.join(', '));

  state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 20);
  state.player.armor = state.player.maxArmor;
  state.player.filterTurns = Math.max(state.player.filterTurns, 35);
  purgeEmStress(state, 15);
  grantCodex(state);
  pushLog(state, 'LOG-HACK-OK');
}

function setNote(state: GameState, note: HackPickResult): void {
  if (state.consoleHack) state.consoleHack.note = note;
}

function snapToLane(session: HackSession): void {
  if (canPickHackCell(session, session.cursor.x, session.cursor.y)) return;
  const lane = hackLaneCells(session);
  if (lane.length === 0) return;
  const { x, y } = session.cursor;
  lane.sort(
    (a, b) => Math.abs(a.x - x) + Math.abs(a.y - y) - (Math.abs(b.x - x) + Math.abs(b.y - y)),
  );
  session.cursor = { ...lane[0]! };
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
  if (!session.last) {
    session.cursor = {
      x: (session.cursor.x + dx + HACK_SIZE) % HACK_SIZE,
      y: (session.cursor.y + dy + HACK_SIZE) % HACK_SIZE,
    };
    return;
  }
  const along = session.axis === 'col' ? dy : dx;
  const across = session.axis === 'col' ? dx : dy;
  if (across !== 0 && along === 0) {
    setNote(state, 'blocked');
    return;
  }
  if (along === 0) return;
  const lane = hackLaneCells(session);
  if (lane.length === 0) return;
  const step = along > 0 ? 1 : -1;
  if (session.axis === 'col') {
    const x = session.last.x;
    let y = session.cursor.y;
    for (let i = 0; i < HACK_SIZE; i++) {
      y = (y + step + HACK_SIZE) % HACK_SIZE;
      if (lane.some((p) => p.x === x && p.y === y)) {
        session.cursor = { x, y };
        return;
      }
    }
  } else {
    const y = session.last.y;
    let x = session.cursor.x;
    for (let i = 0; i < HACK_SIZE; i++) {
      x = (x + step + HACK_SIZE) % HACK_SIZE;
      if (lane.some((p) => p.x === x && p.y === y)) {
        session.cursor = { x, y };
        return;
      }
    }
  }
}

export function abortHack(state: GameState): void {
  const hack = state.consoleHack;
  if (!hack?.session) return;
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
  snapToLane(session);

  if (session.buffer.length < HACK_LEN) {
    if (hackLaneCells(session).length === 0) return failAttempt(state);
    setNote(state, 'spliced');
    return 'spliced';
  }

  const ok = session.buffer.every((g, i) => g === session.target[i]);
  if (ok) {
    hack.session = null;
    hack.done = true;
    grantHackReward(state);
    setNote(state, 'win');
    return 'win';
  }
  return failAttempt(state);
}

export function makeConsoleHack(pos: Pos): ConsoleHack {
  return { pos: { ...pos }, done: false, session: null, note: null };
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
    if (state.consoleHack?.session) return { type: 'hack_abort' };
    return null;
  },
};
