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
    cursor: { x: path[0]!.x, y: path[0]!.y },
    last: null,
    axis: 'col',
    used: emptyUsed(),
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

function resetAttempt(session: HackSession): void {
  session.buffer = [];
  session.last = null;
  session.axis = 'col';
  session.used = emptyUsed();
}

function failAttempt(state: GameState): 'retry' | 'resolved' {
  const session = state.consoleHack?.session;
  if (!session) return 'resolved';
  taxPower(state, POWER_TAX_HEAVY, 'LOG-HACK-FAIL');
  addEmStress(state, 8, 'lattice bounce');
  session.attempts -= 1;
  if (session.attempts <= 0) {
    const hack = state.consoleHack!;
    hack.session = null;
    hack.done = true;
    pushLog(state, 'LOG-HACK-LOCK');
    return 'resolved';
  }
  resetAttempt(session);
  return 'retry';
}

export function moveHackCursor(state: GameState, dx: number, dy: number): void {
  const session = state.consoleHack?.session;
  if (!session) return;
  const nx = Math.max(0, Math.min(HACK_SIZE - 1, session.cursor.x + dx));
  const ny = Math.max(0, Math.min(HACK_SIZE - 1, session.cursor.y + dy));
  session.cursor = { x: nx, y: ny };
}

export function abortHack(state: GameState): void {
  const hack = state.consoleHack;
  if (!hack?.session) return;
  hack.session = null;
  pushLog(state, 'LOG-HACK-ABORT');
}

/** Returns whether the sector turn should advance (success or lockout). */
export function pickHackCell(state: GameState): boolean {
  const hack = state.consoleHack;
  const session = hack?.session;
  if (!hack || !session) return false;
  const { x, y } = session.cursor;
  if (!canPickHackCell(session, x, y)) return false;

  session.used[y]![x] = true;
  session.buffer.push(session.grid[y]![x]!);
  const first = !session.last;
  session.last = { x, y };
  if (first) session.axis = 'col';
  else session.axis = session.axis === 'col' ? 'row' : 'col';

  if (session.buffer.length < HACK_LEN) return false;

  const ok = session.buffer.every((g, i) => g === session.target[i]);
  if (ok) {
    hack.session = null;
    hack.done = true;
    grantHackReward(state);
    return true;
  }
  return failAttempt(state) === 'resolved';
}

export function makeConsoleHack(pos: Pos): ConsoleHack {
  return { pos: { ...pos }, done: false, session: null };
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
