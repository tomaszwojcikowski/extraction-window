import { ENEMY_DROPS, dropChance } from '../data/drops';
import { ENEMIES } from '../data/enemies';
import {
  STORM_BOSS_KILL,
  STORM_ELITE_KILL,
  XP_BOSS,
  XP_ELITE,
  XP_KILL_BASE,
} from '../data/progression';
import { lore } from '../data/lore';
import type { ItemKind } from '../data/items';
import { pushLog } from './log';
import { gainXp, hasSkill } from './progression';
import { randInt } from './rng';
import { leaveContamination } from './contamination';
import type { Enemy, GameState } from './types';

/** Mark hostile dead without XP / drops / kill log (ally kills, despawn). */
export function markEnemyDead(enemy: Enemy): void {
  enemy.alive = false;
  enemy.hp = 0;
}

function forceDrop(state: GameState, enemy: Enemy, kind: ItemKind): void {
  state.items.push({
    id: state.nextEntityId++,
    kind,
    x: enemy.x,
    y: enemy.y,
  });
}

function pickFromTable(state: GameState, enemy: Enemy): ItemKind | null {
  const table = ENEMY_DROPS[enemy.kind];
  if (!table.length) return null;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = state.rng() * total;
  let kind = table[0]!.kind;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      kind = entry.kind;
      break;
    }
  }
  return kind;
}

function tryDeathDrop(state: GameState, enemy: Enemy, bonusChance = 0): void {
  if (enemy.tier === 'elite' || enemy.tier === 'boss') {
    const brandDrop = ENEMIES[enemy.kind].brandDrop;
    if (brandDrop) {
      forceDrop(state, enemy, brandDrop);
      pushLog(state, 'LOG-BRAND-DROP', lore(ENEMIES[enemy.kind].loreName));
    }
    return;
  }
  let chance = dropChance(state.sectorIndex) + bonusChance;
  if (hasSkill(state, 'scavenger')) chance = Math.min(0.95, chance + 0.15);
  if (state.rng() > chance) return;
  const kind = pickFromTable(state, enemy);
  if (!kind) return;
  forceDrop(state, enemy, kind);
  pushLog(state, 'LOG-LOOT-DROP', lore(ENEMIES[enemy.kind].loreName));
}

/** Player-credited kill: log, drops, XP, elite/boss storm refunds. */
export function killEnemy(state: GameState, enemy: Enemy): void {
  const windupInterrupt = enemy.windup > 0 || enemy.swellTurns >= 2;
  markEnemyDead(enemy);
  if (enemy.kind === 'spore') leaveContamination(state, enemy);
  pushLog(state, 'LOG-KILL', lore(ENEMIES[enemy.kind].loreName));
  tryDeathDrop(state, enemy, windupInterrupt ? 0.25 : 0);
  let xp =
    XP_KILL_BASE + Math.floor(enemy.maxHp / 2) + (windupInterrupt ? XP_KILL_BASE : 0);
  if (enemy.tier === 'elite') {
    xp = Math.max(xp, XP_ELITE);
    const storm = randInt(state.rng, STORM_ELITE_KILL[0], STORM_ELITE_KILL[1]);
    state.stormTurns += storm;
    pushLog(state, 'LOG-ELITE-DOWN', `+${storm}`);
  } else if (enemy.tier === 'boss') {
    xp = Math.max(xp, XP_BOSS);
    const storm = randInt(state.rng, STORM_BOSS_KILL[0], STORM_BOSS_KILL[1]);
    state.stormTurns += storm;
    state.scriptedFired[`boss_cleared_${state.sectorId}`] = true;
    pushLog(state, 'LOG-BOSS-DOWN', `+${storm}`);
  }
  gainXp(state, xp);
  if (windupInterrupt) pushLog(state, 'LOG-WINDUP-KILL');
}
