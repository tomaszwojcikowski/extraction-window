import type { EnemyTier } from '../sim/types';
import { MAX_LEVEL } from './progression';

/**
 * Campaign difficulty answering player level bumps + sector depth.
 * Sector clock stays primary; level closes the gap as XP/skills come online.
 *
 * Fauna is a wake tax, not sponge padding: ATK rises faster than HP so engaged
 * hits chew plating, while fights stay short enough that combat never becomes
 * the skill pillar (clocks and light still own the run).
 */

/** Sector-only depth (legacy curve) — used for HP. */
export function sectorDepth(sectorIndex: number): number {
  return 1 + Math.max(0, sectorIndex) * 0.035;
}

/**
 * Combined depth for HP — held soft so packs do not become long sponges.
 * L1 S0 → 1.0; L8 S14 → ~1.56.
 */
export function enemyDepth(sectorIndex: number, playerLevel = 1): number {
  const level = Math.max(1, Math.min(MAX_LEVEL, playerLevel));
  const levelTerm = (level - 1) * 0.01;
  return sectorDepth(sectorIndex) + levelTerm;
}

/**
 * ATK depth — steeper than HP so mid/late hits clear player DEF + vest and
 * tax the plating buffer that used to make every bump a sponge.
 * L1 S0 → 1.0; L8 S14 → ~1.91.
 */
export function enemyAtkDepth(sectorIndex: number, playerLevel = 1): number {
  const level = Math.max(1, Math.min(MAX_LEVEL, playerLevel));
  const sectorTerm = 1 + Math.max(0, sectorIndex) * 0.055;
  const levelTerm = (level - 1) * 0.02;
  return sectorTerm + levelTerm;
}

/** Extra pack size only at max level. */
export function enemyCountBonus(playerLevel: number): number {
  return playerLevel >= 8 ? 1 : 0;
}

/** Elite/boss HP rank — slight bite at high level. */
export function rankMul(playerLevel: number, tier: EnemyTier): number {
  if (tier === 'normal') return 1;
  return 1 + Math.max(0, playerLevel - 1) * 0.008;
}

export function scaleEnemyCombat(
  def: { hp: number; atk: number; def: number },
  sectorIndex: number,
  playerLevel: number,
  tier: EnemyTier = 'normal',
): { hp: number; atk: number; def: number } {
  const hpDepth = enemyDepth(sectorIndex, playerLevel);
  const atkDepth = enemyAtkDepth(sectorIndex, playerLevel);
  const hpMul = tier === 'elite' ? 1.4 : tier === 'boss' ? 2.1 : 1;
  const rank = rankMul(playerLevel, tier);
  return {
    hp: Math.ceil(def.hp * hpDepth * hpMul * rank),
    atk: Math.ceil(def.atk * atkDepth * rank),
    def: def.def,
  };
}
