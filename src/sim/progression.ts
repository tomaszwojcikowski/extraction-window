import {
  LEVEL_BUMPS,
  MAX_LEVEL,
  SKILLS,
  type SkillId,
  xpToNextForLevel,
} from '../data/progression';
import { lore } from '../data/lore';
import { pushLog } from './combat';
import type { GameState } from './types';

export function hasSkill(state: GameState, id: SkillId): boolean {
  return state.skills.includes(id);
}

function applyLevelBump(state: GameState, level: number): void {
  const bump = LEVEL_BUMPS[level];
  if (!bump) return;
  const p = state.player;
  if (bump.maxHp) {
    p.maxHp += bump.maxHp;
    p.hp = Math.min(p.maxHp, p.hp + bump.maxHp);
  }
  if (bump.maxEnergy) {
    p.maxEnergy += bump.maxEnergy;
    p.energy = Math.min(p.maxEnergy, p.energy + bump.maxEnergy);
  }
  if (bump.atk) p.atk += bump.atk;
  if (bump.def) p.def += bump.def;
  if (bump.maxArmor) {
    p.maxArmor += bump.maxArmor;
    p.armor = Math.min(p.maxArmor, p.armor + bump.maxArmor);
  }
}

function unlockSkillsForLevel(state: GameState, level: number): void {
  for (const skill of Object.values(SKILLS)) {
    if (skill.unlockLevel !== level) continue;
    if (state.skills.includes(skill.id)) continue;
    state.skills.push(skill.id);
    pushLog(state, 'LOG-SKILL', lore(skill.loreName));
  }
}

/** Award XP; auto level-up with stat bumps and milestone skills. */
export function gainXp(state: GameState, amount: number, detail?: string): void {
  if (amount <= 0 || state.level >= MAX_LEVEL) {
    if (amount > 0 && state.level >= MAX_LEVEL) {
      // Cap: ignore further XP at max
    }
    return;
  }

  state.xp += amount;
  pushLog(state, 'LOG-XP', detail ? `+${amount} ${detail}` : `+${amount}`);

  while (state.level < MAX_LEVEL && state.xp >= state.xpToNext && state.xpToNext > 0) {
    state.xp -= state.xpToNext;
    state.level += 1;
    applyLevelBump(state, state.level);
    unlockSkillsForLevel(state, state.level);
    state.xpToNext = xpToNextForLevel(state.level);
    pushLog(state, 'LOG-LEVEL', `LVL ${state.level}`);
  }
}
