import { ENEMIES, type EnemyKind } from '../../src/data/enemies';
import { ALLIES, type AllyKind } from '../../src/data/npcs';
import { createGame } from '../../src/sim';
import type { Ally, Enemy, EnemyTier, GameState } from '../../src/sim/types';

/** Fixed RNG for deterministic combat unit tests. */
export function fixedRng(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const v = sequence[i % sequence.length] ?? 0;
    i += 1;
    return v;
  };
}

export function makeEnemy(
  overrides: Partial<Enemy> & { kind?: EnemyKind } = {},
): Enemy {
  const kind = overrides.kind ?? 'mite';
  const def = ENEMIES[kind];
  const x = overrides.x ?? 5;
  const y = overrides.y ?? 5;
  return {
    id: overrides.id ?? 9001,
    kind,
    x,
    y,
    hp: overrides.hp ?? def.hp,
    maxHp: overrides.maxHp ?? def.hp,
    atk: overrides.atk ?? def.atk,
    def: overrides.def ?? def.def,
    alive: overrides.alive ?? true,
    statuses: overrides.statuses ?? {},
    alerted: overrides.alerted ?? false,
    firstContactBite: overrides.firstContactBite ?? true,
    swellTurns: overrides.swellTurns ?? 0,
    homeX: overrides.homeX ?? x,
    homeY: overrides.homeY ?? y,
    skirmishRetreat: overrides.skirmishRetreat ?? false,
    windup: overrides.windup ?? 0,
    intent: overrides.intent,
    beamCooldown: overrides.beamCooldown ?? 0,
    tier: (overrides.tier ?? 'normal') as EnemyTier,
  };
}

export function makeAlly(
  overrides: Partial<Ally> & { kind?: AllyKind } = {},
): Ally {
  const kind = overrides.kind ?? 'probe_drone';
  const def = ALLIES[kind];
  return {
    id: overrides.id ?? 8001,
    kind,
    x: overrides.x ?? 4,
    y: overrides.y ?? 5,
    hp: overrides.hp ?? def.hp,
    maxHp: overrides.maxHp ?? def.hp,
    atk: overrides.atk ?? def.atk,
    def: overrides.def ?? def.def,
    turnsLeft: overrides.turnsLeft ?? def.turns,
    alive: overrides.alive ?? true,
    roleCooldown: overrides.roleCooldown ?? 0,
  };
}

/** Boot a run and clear field fauna so combat fixtures own the board. */
export function combatArena(seed = 42): GameState {
  const st = createGame(seed);
  st.enemies = [];
  st.allies = [];
  st.npcs = [];
  st.player.armor = 0;
  st.player.filterTurns = 0;
  st.log = [];
  return st;
}

export function lastLog(state: GameState, loreId: string) {
  return [...state.log].reverse().find((l) => l.loreId === loreId);
}
