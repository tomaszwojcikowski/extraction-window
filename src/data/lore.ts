/** Lore registry — every player-facing string maps to an ID. */

export const LORE = {
  // UI
  'UI-TITLE': 'EXTRACTION WINDOW',
  'UI-SUBTITLE': 'Helix Cartographic Authority — Vire-7 Survey',
  'UI-PRESS-START': 'Press ENTER to begin survey',
  'UI-SEED': 'Seed',
  'UI-HP': 'HP',
  'UI-ENERGY': 'Energy',
  'UI-WINDOW': 'Window',
  'UI-SECTOR': 'Sector',
  'UI-ATK': 'ATK',
  'UI-DEF': 'DEF',
  'UI-INV': 'Inventory',
  'UI-LOG': 'Field Log',
  'UI-CONTROLS': 'WASD/Arrows move · . wait · g get · i inv · u use · > exit · Esc close',
  'UI-WIN': 'EXTRACTION COMPLETE',
  'UI-LOSE-HP': 'SURVEYOR DOWN — vital signs lost',
  'UI-LOSE-ENERGY': 'LIFE SUPPORT FAILURE — energy depleted',
  'UI-LOSE-STORM': 'WINDOW CLOSED — ion storm sealed the pad',
  'UI-LOSE-STUCK': 'MISSION ABORT — no viable path',
  'UI-RETRY': 'Press ENTER for new drop · Esc to title',

  // Mission
  'LOC-VIRE7': 'Vire-7',
  'OBJ-NAVCORE': 'Recover Nav Core and extract before the ion window closes.',
  'OBJ-RELAYKEY': 'Secure Relay Key from Ruin Belt caches.',
  'OBJ-BEACON': 'Authorize Beacon Relay with Relay Key to open inland path.',
  'OBJ-SHUTTLE': 'Reach shuttle pad with Nav Core.',
  'HAZ-STORM': 'Ion storm turn budget remaining.',

  // Sectors
  'SEC-PLAINS': 'Survey Plains',
  'SEC-FLOOD': 'Flood Basin',
  'SEC-CANOPY': 'Canopy Reach',
  'SEC-RUIN': 'Ruin Belt',
  'SEC-BEACON': 'Beacon Relay',
  'SEC-ASH': 'Ash Wastes',
  'SEC-VAULT': 'Cache Vault',
  'SEC-RIDGE': 'Ridge Approaches',

  // Items
  'ITEM-RELAY-KEY': 'Relay Key',
  'ITEM-RELAY-KEY-DESC': 'Beacon Relay inland authorization token.',
  'ITEM-NAV-CORE': 'Nav Core',
  'ITEM-NAV-CORE-DESC': 'Spare shuttle navigation core — extraction lock.',
  'ITEM-MED': 'Med Patch',
  'ITEM-MED-DESC': 'Stabilizes vitals (+HP).',
  'ITEM-ENERGY': 'Energy Cell',
  'ITEM-ENERGY-DESC': 'Life-support recharge (+Energy).',
  'ITEM-RATION': 'Field Ration',
  'ITEM-RATION-DESC': 'Minor HP and Energy recovery.',
  'ITEM-PROBE': 'Survey Probe',
  'ITEM-PROBE-DESC': 'Temporary ATK boost from RF ranging.',

  // Enemies
  'ENEMY-MITE': 'Signal Mite',
  'ENEMY-SPORE': 'Ion Spore',
  'ENEMY-WASP': 'Relay Wasp',
  'ENEMY-STALKER': 'Canopy Stalker',
  'ENEMY-LEECH': 'Flood Leech',
  'ENEMY-CRAWLER': 'Ash Crawler',
  'ENEMY-SENTINEL': 'Vault Sentinel',
  'ENEMY-SERPENT': 'Storm Serpent',

  // Logs
  'LOG-DROP': 'Drop confirmed. Orbital relay silent. Begin inland survey.',
  'LOG-MOVE-BLOCKED': 'Path obstructed.',
  'LOG-WAIT': 'Holding position. Life support ticks.',
  'LOG-HIT': 'Contact — hostiles engaged.',
  'LOG-KILL': 'Hostile neutralized.',
  'LOG-HURT': 'Vital signs dropping.',
  'LOG-PICKUP': 'Material secured.',
  'LOG-NO-PICKUP': 'Nothing to recover here.',
  'LOG-INV-FULL': 'Carry capacity exceeded.',
  'LOG-USE-MED': 'Med patch applied.',
  'LOG-USE-ENERGY': 'Energy cell slotted.',
  'LOG-USE-RATION': 'Ration consumed.',
  'LOG-USE-PROBE': 'Survey probe active — ATK up.',
  'LOG-USE-FAIL': 'No usable item selected.',
  'LOG-GOT-KEY': 'Relay Key acquired. Proceed to Beacon Relay.',
  'LOG-USED-KEY': 'Beacon authorized. Inland path open.',
  'LOG-NEED-KEY': 'Beacon sealed. Relay Key required.',
  'LOG-GOT-CORE': 'Nav Core secured. Return to shuttle pad.',
  'LOG-NEED-CORE': 'Shuttle refuses lock — Nav Core missing.',
  'LOG-SECTOR': 'Sector boundary crossed.',
  'LOG-EXIT-BLOCKED': 'Exit sealed.',
  'LOG-HAZARD': 'Ion hazard — energy drain.',
  'LOG-EXTRACT': 'Nav lock restored. Extraction complete.',
  'LOG-STORM-WARN': 'Storm window critical.',
} as const;

export type LoreId = keyof typeof LORE;

export function lore(id: LoreId): string {
  return LORE[id];
}
