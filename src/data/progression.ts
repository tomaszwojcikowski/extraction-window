import type { LoreId } from './lore';

export type SkillId =
  | 'triage'
  | 'scavenger'
  | 'overcharge'
  | 'ion_skin'
  | 'deep_reserve'
  | 'last_window';

export const MAX_LEVEL = 8;

/** XP required to advance FROM (level-1) TO level. Index = target level. */
export const XP_TO_REACH: Record<number, number> = {
  2: 55,
  3: 80,
  4: 110,
  5: 140,
  6: 170,
  7: 200,
  8: 240,
};

export interface LevelBump {
  maxHp?: number;
  maxEnergy?: number;
  atk?: number;
  def?: number;
  maxArmor?: number;
}

/** Stat bumps applied when reaching this level. */
export const LEVEL_BUMPS: Record<number, LevelBump> = {
  2: { maxHp: 4, maxEnergy: 2 },
  3: { atk: 1, maxArmor: 2 },
  4: { maxHp: 4, maxEnergy: 3 },
  5: { def: 1 },
  6: { maxHp: 4, atk: 1 },
  7: { maxArmor: 2, maxEnergy: 4 },
  8: { atk: 1, maxHp: 4 },
};

export interface SkillDef {
  id: SkillId;
  unlockLevel: number;
  loreName: LoreId;
  loreDesc: LoreId;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  triage: {
    id: 'triage',
    unlockLevel: 3,
    loreName: 'SKILL-TRIAGE-NAME',
    loreDesc: 'SKILL-TRIAGE-DESC',
  },
  scavenger: {
    id: 'scavenger',
    unlockLevel: 3,
    loreName: 'SKILL-SCAVENGER-NAME',
    loreDesc: 'SKILL-SCAVENGER-DESC',
  },
  overcharge: {
    id: 'overcharge',
    unlockLevel: 5,
    loreName: 'SKILL-OVERCHARGE-NAME',
    loreDesc: 'SKILL-OVERCHARGE-DESC',
  },
  ion_skin: {
    id: 'ion_skin',
    unlockLevel: 5,
    loreName: 'SKILL-ION-SKIN-NAME',
    loreDesc: 'SKILL-ION-SKIN-DESC',
  },
  deep_reserve: {
    id: 'deep_reserve',
    unlockLevel: 7,
    loreName: 'SKILL-DEEP-RESERVE-NAME',
    loreDesc: 'SKILL-DEEP-RESERVE-DESC',
  },
  last_window: {
    id: 'last_window',
    unlockLevel: 7,
    loreName: 'SKILL-LAST-WINDOW-NAME',
    loreDesc: 'SKILL-LAST-WINDOW-DESC',
  },
};

export const XP_KILL_BASE = 6;
export const XP_SECTOR = 18;
export const XP_ROOM_QUEST = 15;
export const XP_QUEST_ITEM = 22;
export const XP_BEACON = 15;
export const XP_ROOM_SURVEY = 4;
export const XP_SECTOR_SURVEY = 10;
export const XP_ELITE = 24;
export const XP_BOSS = 40;
export const XP_NPC_AGENDA = 5;

/** First mid-room survey storm refund range. */
export const STORM_ROOM_SURVEY = [2, 4] as const;
export const SURVEY_ROOM_CAP = 3;
/** Hatch explore% bonus when explored floors ≥ threshold. */
export const EXPLORE_BONUS_THRESHOLD = 0.55;
export const STORM_SECTOR_SURVEY = [8, 12] as const;
export const STORM_ELITE_KILL = [6, 10] as const;
export const STORM_BOSS_KILL = [12, 18] as const;

export function xpToNextForLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return XP_TO_REACH[level + 1] ?? 0;
}
