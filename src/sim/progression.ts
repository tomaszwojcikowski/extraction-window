import {
  LEVEL_BUMPS,
  MAX_LEVEL,
  SKILLS,
  type SkillId,
  xpToNextForLevel,
} from '../data/progression';
import { lore } from '../data/lore';
import { pushLog } from './log';
import type { GameState } from './types';

/** ADOM-style talent forks — pick 1 of 2 at milestone levels. */
export const SKILL_FORKS: Partial<Record<number, [SkillId, SkillId]>> = {
  3: ['triage', 'scavenger'],
  5: ['overcharge', 'ion_skin'],
  7: ['deep_reserve', 'last_window'],
};

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

function offerSkillFork(state: GameState, level: number): void {
  const fork = SKILL_FORKS[level];
  if (!fork) return;
  let options = fork.filter((id) => !state.skills.includes(id));
  if (options.length === 0) return;
  if (options.length === 1) {
    pickSkill(state, options[0]!);
    return;
  }
  // Doctrine bias at level 7: Quiet → last_window first; Probe → deep_reserve first
  if (level === 7 && options.length === 2) {
    const quietLead = state.doctrineQuiet >= state.doctrineProbe + 2;
    const probeLead = state.doctrineProbe >= state.doctrineQuiet + 2;
    if (quietLead && options.includes('last_window')) {
      options = ['last_window', ...options.filter((id) => id !== 'last_window')];
    } else if (probeLead && options.includes('deep_reserve')) {
      options = ['deep_reserve', ...options.filter((id) => id !== 'deep_reserve')];
    }
  }
  state.skillPick = options as SkillId[];
  pushLog(state, 'LOG-SKILL-PICK', `${lore(SKILLS[options[0]!].loreName)} / ${lore(SKILLS[options[1]!].loreName)}`);
}

/** Tally Quiet vs Probe doctrine; log once when crossing 3. */
export function bumpDoctrine(state: GameState, which: 'quiet' | 'probe'): void {
  if (which === 'quiet') {
    state.doctrineQuiet += 1;
    if (state.doctrineQuiet === 3) {
      state.emStress = Math.max(0, state.emStress - 1);
      pushLog(state, 'LOG-DOCTRINE-QUIET', '-1 EM now');
    }
  } else {
    state.doctrineProbe += 1;
    if (state.doctrineProbe === 3) {
      state.stormTurns += 5;
      pushLog(state, 'LOG-DOCTRINE-PROBE', '+5 window now');
    }
  }
}

export function pickSkill(state: GameState, id: SkillId): boolean {
  if (!state.skillPick || !state.skillPick.includes(id)) return false;
  if (state.skills.includes(id)) {
    state.skillPick = null;
    return false;
  }
  state.skills.push(id);
  state.skillPick = null;
  pushLog(state, 'LOG-SKILL', lore(SKILLS[id].loreName));
  return true;
}

/** Award XP; auto level-up with stat bumps and milestone skill forks. */
export function gainXp(state: GameState, amount: number, detail?: string): void {
  if (amount <= 0 || state.level >= MAX_LEVEL) {
    return;
  }

  state.xp += amount;
  pushLog(state, 'LOG-XP', detail ? `+${amount} ${detail}` : `+${amount}`);

  while (state.level < MAX_LEVEL && state.xp >= state.xpToNext && state.xpToNext > 0) {
    state.xp -= state.xpToNext;
    state.level += 1;
    applyLevelBump(state, state.level);
    offerSkillFork(state, state.level);
    state.xpToNext = xpToNextForLevel(state.level);
    pushLog(state, 'LOG-LEVEL', `LVL ${state.level}`);
  }
}
