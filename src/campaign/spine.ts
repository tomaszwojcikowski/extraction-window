import { SECTORS, getSector, type SectorId } from '../data/encounters';
import type { LoreId } from '../data/lore';

export const CAMPAIGN_LENGTH = SECTORS.length;

/** Starting storm window — ~90–120 min target with 15 sectors. */
export const STORM_TURNS = 700;

export const PLAYER_BASE = {
  hp: 52,
  maxHp: 52,
  energy: 100,
  maxEnergy: 100,
  atk: 6,
  def: 2,
  armor: 12,
  maxArmor: 12,
};

export function sectorLore(id: SectorId): LoreId {
  return getSector(SECTORS.findIndex((s) => s.id === id)).loreName;
}

export function objectivePrompt(flags: {
  hasRelayKey: boolean;
  usedRelayKey: boolean;
  hasNavCore: boolean;
  sectorId: SectorId;
}): LoreId {
  if (flags.sectorId === 'ridge') return 'OBJ-SHUTTLE';
  if (!flags.hasNavCore && flags.sectorId === 'vault') return 'OBJ-NAVCORE';
  if (!flags.usedRelayKey && (flags.sectorId === 'beacon' || !flags.hasRelayKey)) {
    if (!flags.hasRelayKey) return 'OBJ-RELAYKEY';
    return 'OBJ-BEACON';
  }
  if (!flags.hasNavCore) return 'OBJ-NAVCORE';
  return 'OBJ-SHUTTLE';
}
