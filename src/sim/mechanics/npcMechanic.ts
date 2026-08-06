import { ALLIES, NPCS, type AllyKind } from '../../data/npcs';
import { lore, type LoreId } from '../../data/lore';
import { XP_NPC_AGENDA } from '../../data/progression';
import { addItem, hasItem, removeOne } from '../inventory';
import { pushLog } from '../log';
import { gainXp } from '../progression';
import { randInt } from '../rng';
import { tryStabilizeScar } from '../status';
import { allyAt, enemyAt, manhattan, npcAt } from '../spatial';
import type { Action, Ally, FieldNpc, GameState, Pos } from '../types';
import type { Mechanic } from './types';

function nearHailNpc(state: GameState): FieldNpc | null {
  let best: FieldNpc | null = null;
  let bestD = 99;
  for (const n of state.npcs) {
    const d = manhattan(state.player.x, state.player.y, n.x, n.y);
    if (d > 1 || d >= bestD) continue;
    // First hail, or open unpaid agenda
    if (!n.talked || (n.agendaOpen && !n.agendaDone)) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

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

function grantNpcCodex(state: GameState, page: LoreId): void {
  if (!state.codexLog.includes(page)) {
    state.codexLog.push(page);
    state.codexPages += 1;
  }
  pushLog(state, page);
}

function noticeVisibleNpcs(state: GameState): void {
  for (const n of state.npcs) {
    if (n.talked) continue;
    if (state.noticedNpcIds.includes(n.id)) continue;
    if (!(state.visible[n.y]?.[n.x] ?? false)) continue;
    state.noticedNpcIds.push(n.id);
    pushLog(state, 'LOG-NPC-SIGHT', lore(NPCS[n.kind].loreName));
  }
}

function agendaWantLog(npc: FieldNpc): LoreId {
  switch (npc.kind) {
    case 'stranded_ensign':
      return 'LOG-AGENDA-WANT-MED';
    case 'field_tech':
      return 'LOG-AGENDA-WANT-QUIET';
    case 'survey_contact':
      return 'LOG-AGENDA-WANT-SURVEY';
    default:
      return 'LOG-AGENDA-NONE';
  }
}

function tryCompleteAgenda(state: GameState, npc: FieldNpc): boolean {
  if (!npc.agendaOpen || npc.agendaDone) return false;

  let ok = false;
  if (npc.kind === 'stranded_ensign') {
    if (hasItem(state, 'med')) {
      removeOne(state, 'med');
      ok = true;
    }
  } else if (npc.kind === 'field_tech') {
    if (state.player.jammerTurns > 0) {
      ok = true;
    } else if (hasItem(state, 'jammer')) {
      removeOne(state, 'jammer');
      ok = true;
    }
  } else if (npc.kind === 'survey_contact') {
    if (state.surveyedRoomIds.length > 0 || hasItem(state, 'mapper')) {
      if (state.surveyedRoomIds.length === 0 && hasItem(state, 'mapper')) {
        removeOne(state, 'mapper');
      }
      ok = true;
      // Matching Probe doctrine pays a little extra storm
      if (state.doctrineProbe > state.doctrineQuiet) {
        const extra = randInt(state.rng, 2, 4);
        state.stormTurns += extra;
        pushLog(state, 'LOG-AGENDA-PROBE-BONUS', `+${extra}`);
      }
    }
  } else {
    // archive_holo — no agenda
    pushLog(state, 'LOG-AGENDA-NONE');
    npc.agendaDone = true;
    return true;
  }

  if (!ok) {
    pushLog(state, agendaWantLog(npc));
    return true;
  }

  const storm = randInt(state.rng, 4, 8);
  state.stormTurns += storm;
  gainXp(state, XP_NPC_AGENDA, 'agenda');
  tryStabilizeScar(state);
  npc.agendaDone = true;
  pushLog(state, 'LOG-AGENDA-DONE', `+${storm}`);
  return true;
}

function hailNpc(state: GameState, npc: FieldNpc): boolean {
  if (npc.talked) {
    return tryCompleteAgenda(state, npc);
  }

  const def = NPCS[npc.kind];
  pushLog(state, 'LOG-NPC-HAIL', lore(def.loreName));
  grantNpcCodex(state, def.codex);

  if (npc.kind === 'archive_holo') {
    const storm = randInt(state.rng, 4, 8);
    state.stormTurns += storm;
    pushLog(state, 'LOG-NPC-HOLO', `+${storm}`);
  } else if (npc.kind === 'stranded_ensign') {
    addItem(state, 'med');
    addItem(state, 'energy');
    const allyKind: AllyKind = 'away_escort';
    pushLog(
      state,
      'LOG-NPC-ENSIGN',
      `Hypo + Power Cell · ${lore(ALLIES[allyKind].loreName)}`,
    );
    spawnAlly(state, allyKind, { x: npc.x, y: npc.y });
    npc.agendaOpen = true;
  } else if (npc.kind === 'field_tech') {
    const allyKind: AllyKind = 'probe_drone';
    pushLog(state, 'LOG-NPC-TECH', lore(ALLIES[allyKind].loreName));
    spawnAlly(state, allyKind, { x: npc.x, y: npc.y });
    npc.agendaOpen = true;
  } else if (npc.kind === 'survey_contact') {
    pushLog(state, 'LOG-NPC-SURVEY');
    npc.agendaOpen = true;
  }

  npc.talked = true;
  return true;
}

export function tryHailNpc(state: GameState): boolean {
  const npc = nearHailNpc(state);
  if (!npc) return false;
  return hailNpc(state, npc);
}

export const npcMechanic: Mechanic = {
  id: 'field_npc',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    return tryHailNpc(state);
  },

  onEndTurn(state: GameState): void {
    noticeVisibleNpcs(state);
  },

  contextHint(state: GameState): LoreId | null {
    if (nearHailNpc(state)) return 'UI-HINT-NPC';
    return null;
  },

  autopilotHint(state: GameState): Action | null {
    if (state.player.hp < state.player.maxHp * 0.55) return null;
    // Only first hail — ignore agenda crafts so WR stays stable
    for (const n of state.npcs) {
      if (n.talked) continue;
      const d = manhattan(state.player.x, state.player.y, n.x, n.y);
      if (d <= 1) return { type: 'exit' };
    }
    return null;
  },
};
