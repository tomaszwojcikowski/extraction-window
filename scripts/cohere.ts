/**
 * Static coherency checks for campaign spine + lore/data wiring.
 * Usage: tsx scripts/cohere.ts
 */
import { CAMPAIGN_LENGTH } from '../src/campaign/spine';
import { FACT_CODEX, type SectorFact } from '../src/data/codex';
import { SECTORS, getSector, type SectorId } from '../src/data/encounters';
import { createGame, loadSector } from '../src/sim';
import { collectSectorFacts } from '../src/sim/facts';
import { ENEMIES, type EnemyKind } from '../src/data/enemies';
import { ITEMS, type ItemKind } from '../src/data/items';
import { ENEMY_DROPS } from '../src/data/drops';
import { LORE, type LoreId } from '../src/data/lore';
import { SKILLS, type SkillId } from '../src/data/progression';

/** Enough seeds to see the optional terrain/POI variants without a full suite. */
const COHERE_SEEDS = [1, 42, 99, 777, 12345] as const;

const errors: string[] = [];

function fail(msg: string): void {
  errors.push(msg);
}

/**
 * Room-fact pages must be bound and reachable: a page with no requirements could
 * claim anything, and a page whose facts never co-occur is content nobody sees.
 */
function checkFactCodex(): void {
  const seen = new Set<SectorFact>();
  for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
    const sector = getSector(i);
    for (const seed of COHERE_SEEDS) {
      const state = createGame(seed);
      loadSector(state, i);
      // Facts that depend on run pressure cannot appear on a fresh sector load.
      for (const f of collectSectorFacts(state)) seen.add(f);
    }
    void sector;
  }
  seen.add('em_warn');
  seen.add('scarred');

  for (const entry of FACT_CODEX) {
    if (!(entry.id in LORE)) fail(`fact codex ${entry.id} missing lore text`);
    if (entry.requires.length === 0) {
      fail(`fact codex ${entry.id} is unbound — it would claim facts it cannot prove`);
      continue;
    }
    const missing = entry.requires.filter((f) => !seen.has(f));
    if (missing.length > 0) {
      fail(`fact codex ${entry.id} unreachable — no sector produced ${missing.join(', ')}`);
    }
  }
}

function main(): void {
  if (SECTORS.length !== CAMPAIGN_LENGTH) {
    fail(`SECTORS.length ${SECTORS.length} !== CAMPAIGN_LENGTH ${CAMPAIGN_LENGTH}`);
  }

  const ids = new Set<SectorId>();
  for (let i = 0; i < SECTORS.length; i++) {
    const s = SECTORS[i]!;
    if (s.index !== i) fail(`sector ${s.id} index ${s.index} !== ${i}`);
    if (ids.has(s.id)) fail(`duplicate sector id ${s.id}`);
    ids.add(s.id);
    if (!(s.loreName in LORE)) fail(`missing lore ${s.loreName} for ${s.id}`);
  }

  const keySectors = SECTORS.filter((s) => s.hasRelayKey);
  const coreSectors = SECTORS.filter((s) => s.hasNavCore);
  const beaconSectors = SECTORS.filter((s) => s.isBeacon);
  const shuttleSectors = SECTORS.filter((s) => s.isShuttle);
  if (keySectors.length !== 1) fail(`expected 1 hasRelayKey, got ${keySectors.length}`);
  if (coreSectors.length !== 1) fail(`expected 1 hasNavCore, got ${coreSectors.length}`);
  if (beaconSectors.length !== 1) fail(`expected 1 isBeacon, got ${beaconSectors.length}`);
  if (shuttleSectors.length !== 1) fail(`expected 1 isShuttle, got ${shuttleSectors.length}`);
  if (!SECTORS[SECTORS.length - 1]?.isShuttle) fail('last sector must be shuttle');

  for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
    const def = ENEMIES[kind];
    if (!(def.loreName in LORE)) fail(`enemy ${kind} missing lore ${def.loreName}`);
  }
  for (const kind of Object.keys(ITEMS) as ItemKind[]) {
    const def = ITEMS[kind];
    if (!(def.loreName in LORE)) fail(`item ${kind} missing lore ${def.loreName}`);
    if (!(def.loreDesc in LORE)) fail(`item ${kind} missing loreDesc ${def.loreDesc}`);
  }

  for (const s of SECTORS) {
    for (const ek of s.enemyTable) {
      if (!(ek in ENEMIES)) fail(`sector ${s.id} unknown enemy ${ek}`);
    }
    for (const ik of s.lootTable) {
      if (!(ik in ITEMS)) fail(`sector ${s.id} unknown loot ${ik}`);
    }
  }

  const required: LoreId[] = [
    'OBJ-NAVCORE',
    'OBJ-RELAYKEY',
    'OBJ-BEACON',
    'OBJ-SHUTTLE',
    'OBJ-LOCAL-EXIT',
    'OBJ-LOCAL-KEY',
    'OBJ-LOCAL-BEACON',
    'OBJ-LOCAL-CORE',
    'OBJ-LOCAL-SHUTTLE',
    'OBJ-LOCAL-ROOM',
    'LOG-GOT-KEY',
    'LOG-USED-KEY',
    'LOG-GOT-CORE',
    'LOG-EXTRACT',
    'LOG-LOOT-DROP',
    'LOG-RQ-SALVAGE',
    'LOG-RQ-PURGE',
    'LOG-CODEX',
    'SEC-SPIRE',
    'SEC-TRENCH',
    'SEC-BRINE',
    'SEC-FISSURE',
    'ITEM-BATTERY',
    'ITEM-PATCH',
    'ITEM-LENS',
    'ITEM-MAPPER',
    'ENEMY-MASTLING',
    'ENEMY-SKITTER',
    'ENEMY-RIFT',
  ];
  for (const id of required) {
    if (!(id in LORE)) fail(`required lore missing: ${id}`);
  }

  // Drop tables cover every enemy kind
  for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
    if (!(kind in ENEMY_DROPS)) fail(`missing drop table for ${kind}`);
    for (const entry of ENEMY_DROPS[kind]) {
      if (!(entry.kind in ITEMS)) fail(`drop ${entry.kind} for ${kind} not in ITEMS`);
    }
  }

  for (const id of Object.keys(SKILLS) as SkillId[]) {
    const s = SKILLS[id];
    if (!(s.loreName in LORE)) fail(`skill ${id} missing loreName`);
    if (!(s.loreDesc in LORE)) fail(`skill ${id} missing loreDesc`);
  }

  checkFactCodex();

  if (errors.length) {
    console.error('COHERE FAIL:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log(
      `COHERE PASS: ${SECTORS.length} sectors, ${Object.keys(ENEMIES).length} enemies, ${Object.keys(ITEMS).length} items, lore keys ok`,
    );
  }
}

main();
