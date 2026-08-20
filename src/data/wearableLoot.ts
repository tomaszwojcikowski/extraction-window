import type { ItemKind } from './items';
import type { SectorId } from './encounters';
import { pick, type Rng } from '../sim/rng';

/** Biome-signature wearables — optional cache/hazard bait, never required for extract. */
const WEARABLE_BY_SECTOR: Partial<Record<SectorId, ItemKind[]>> = {
  duct: ['field_comm', 'grip_gloves', 'scan_band'],
  trench: ['survey_visor', 'scan_band', 'ablative_vest'],
  brine: ['mag_boots', 'grip_gloves', 'sealant'],
  fissure: ['grip_gloves', 'mag_boots', 'harness'],
  vault: ['field_comm', 'scan_band', 'survey_visor', 'ablative_vest'],
  approach: ['mag_boots', 'grip_gloves', 'blade'],
  ridge: ['harness', 'ablative_vest', 'pulse_baton'],
  ash: ['grip_gloves', 'mag_boots'],
  beacon: ['field_comm', 'scan_band'],
  ruin: ['survey_visor', 'harness'],
  spire: ['scan_band', 'field_comm'],
  reef: ['mag_boots', 'survey_visor'],
  canopy: ['survey_visor', 'grip_gloves'],
  flood: ['mag_boots', 'field_comm'],
  plains: ['harness', 'blade'],
};

const MID_WEARABLES: ItemKind[] = ['field_comm', 'scan_band', 'survey_visor'];

export function wearableLootForSector(sectorId: SectorId): ItemKind[] {
  return WEARABLE_BY_SECTOR[sectorId] ?? MID_WEARABLES;
}

export function pickWearableLoot(sectorId: SectorId, rng: Rng): ItemKind {
  return pick(rng, wearableLootForSector(sectorId));
}

/** Hazard/cache bait roll — sectors ≥ index 8 get stronger wearable bias. */
export function rollCacheWearable(
  sectorIndex: number,
  sectorId: SectorId,
  rng: Rng,
): ItemKind | null {
  if (sectorIndex < 8) return null;
  if (rng() > 0.55) return null;
  return pickWearableLoot(sectorId, rng);
}

export function rollHazardWearable(
  sectorIndex: number,
  sectorId: SectorId,
  rng: Rng,
): ItemKind | null {
  if (sectorIndex < 6) return null;
  if (rng() > 0.4) return null;
  return pickWearableLoot(sectorId, rng);
}
