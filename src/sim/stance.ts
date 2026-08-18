import { INVENTORY_SLOTS } from '../data/items';
import { meleeDamage } from './combatMath';
import { hasSkill } from './progression';
import { randInt, type Rng } from './rng';
import { hasStatus } from './status';
import type { Enemy, GameState } from './types';

export type CombatStance = 'impaired' | 'normal' | 'enhanced';
export type FieldPosition = 'controlled' | 'risky' | 'desperate';

export const IMPAIRED_DIE = 4;
export const ENHANCED_DIE = 12;

/** Kit is full — Cairn encumbered. Starting 9-slot loadout is not. */
export function encumbered(state: GameState): boolean {
  return state.inventory.length >= INVENTORY_SLOTS;
}

export function fieldPosition(peel: number, exposed: boolean): FieldPosition {
  if (exposed || peel >= 2) return 'desperate';
  if (peel === 1) return 'risky';
  return 'controlled';
}

export function attackStance(opts: {
  helpless: boolean;
  boosted: boolean;
  impaired: boolean;
}): CombatStance {
  if (opts.helpless) return 'enhanced';
  if (opts.impaired) return 'impaired';
  if (opts.boosted) return 'enhanced';
  return 'normal';
}

export function playerAttackStance(state: GameState, enemy: Enemy): CombatStance {
  const helpless = hasStatus(enemy, 'stun') || hasStatus(enemy, 'expose');
  const boosted =
    state.player.stimTurns > 0 ||
    (hasSkill(state, 'overcharge') && state.player.hp <= state.player.maxHp * 0.5);
  const impaired =
    hasStatus(state.player, 'jam') ||
    hasStatus(state.player, 'blind') ||
    encumbered(state);
  return attackStance({ helpless, boosted, impaired });
}

export function enemyAttackStance(
  state: GameState,
  shadowBite: boolean,
): CombatStance {
  if (hasStatus(state.player, 'expose') || shadowBite) return 'enhanced';
  return 'normal';
}

/** Next bump without a chosen foe — HUD ready stance. */
export function playerReadyStance(state: GameState): CombatStance {
  const boosted =
    state.player.stimTurns > 0 ||
    (hasSkill(state, 'overcharge') && state.player.hp <= state.player.maxHp * 0.5);
  const impaired =
    hasStatus(state.player, 'jam') ||
    hasStatus(state.player, 'blind') ||
    encumbered(state);
  return attackStance({ helpless: false, boosted, impaired });
}

/**
 * Stance for the bump you would actually take: a helpless neighbour wins,
 * otherwise the ready stance (stim / jam / full kit).
 */
export function playerHudStance(state: GameState): CombatStance {
  let best = playerReadyStance(state);
  for (const en of state.enemies) {
    if (!en.alive) continue;
    if (Math.abs(en.x - state.player.x) + Math.abs(en.y - state.player.y) !== 1) continue;
    const s = playerAttackStance(state, en);
    if (s === 'enhanced') return 'enhanced';
    if (s === 'impaired') best = 'impaired';
  }
  return best;
}

/**
 * Normal keeps atk−def+variance. Impaired is a d4 (weapon ignored).
 * Enhanced is a d12 minus armour/def, capped at 12.
 */
export function resolveHit(
  weapon: number,
  armor: number,
  variance: number,
  stance: CombatStance,
  rng: Rng,
): number {
  const def = Math.max(0, armor);
  if (stance === 'impaired') return randInt(rng, 1, IMPAIRED_DIE);
  if (stance === 'enhanced') {
    return Math.min(ENHANCED_DIE, Math.max(1, randInt(rng, 1, ENHANCED_DIE) - def));
  }
  return meleeDamage(weapon, def, variance);
}
