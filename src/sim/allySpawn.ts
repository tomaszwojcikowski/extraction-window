import { ALLIES, type AllyKind } from '../data/npcs';
import { lore } from '../data/lore';
import { pushLog } from './log';
import { allyAt, enemyAt, npcAt } from './spatial';
import type { Ally, GameState, Pos } from './types';

function openNeighbor(state: GameState, ox: number, oy: number): Pos | null {
  const dirs: Pos[] = [
    { x: ox + 1, y: oy },
    { x: ox - 1, y: oy },
    { x: ox, y: oy + 1 },
    { x: ox, y: oy - 1 },
    { x: ox, y: oy },
  ];
  for (const p of dirs) {
    if (p.x < 0 || p.y < 0 || p.x >= state.width || p.y >= state.height) continue;
    if (!state.tiles[p.y]![p.x]!.walkable) continue;
    if (p.x === state.player.x && p.y === state.player.y) continue;
    if (enemyAt(state, p.x, p.y)) continue;
    if (allyAt(state, p.x, p.y)) continue;
    if (npcAt(state, p.x, p.y) && !(p.x === ox && p.y === oy)) continue;
    return p;
  }
  return null;
}

/** Cap one living ally; refuse spawn if one is still active. */
export function spawnAlly(state: GameState, kind: AllyKind, near: Pos): boolean {
  if (state.allies.some((a) => a.alive)) {
    pushLog(state, 'LOG-ALLY-FULL');
    return false;
  }
  const pos = openNeighbor(state, near.x, near.y);
  if (!pos) {
    pushLog(state, 'LOG-ALLY-NO-SPACE');
    return false;
  }
  const def = ALLIES[kind];
  const ally: Ally = {
    id: state.nextEntityId++,
    kind,
    x: pos.x,
    y: pos.y,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    def: def.def,
    turnsLeft: def.turns,
    alive: true,
    roleCooldown: 0,
  };
  state.allies.push(ally);
  pushLog(
    state,
    'LOG-ALLY-UP',
    `${lore(def.loreName)} · ${kind === 'probe_drone' ? lore('UI-ALLY-DRONE') : lore('UI-ALLY-ESCORT')}`,
  );
  return true;
}
