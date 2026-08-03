import { SECTORS, getSector, type SectorId } from '../data/encounters';
import type { LoreId } from '../data/lore';

export const CAMPAIGN_LENGTH = SECTORS.length;

/** Starting storm window — tuned for ~60–90 min human play; autopilot finishes sooner. */
export const STORM_TURNS = 1300;

export const PLAYER_BASE = {
  hp: 50,
  maxHp: 50,
  energy: 95,
  maxEnergy: 95,
  atk: 6,
  def: 2,
  armor: 10,
  maxArmor: 10,
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
