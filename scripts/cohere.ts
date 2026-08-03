/**
 * Static coherency checks for campaign spine + lore/data wiring.
 * Usage: tsx scripts/cohere.ts
 */
import { CAMPAIGN_LENGTH } from '../src/campaign/spine';
import { SECTORS, type SectorId } from '../src/data/encounters';
import { ENEMIES, type EnemyKind } from '../src/data/enemies';
import { ITEMS, type ItemKind } from '../src/data/items';
import { LORE, type LoreId } from '../src/data/lore';

const errors: string[] = [];

function fail(msg: string): void {
  errors.push(msg);
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
    'LOG-GOT-KEY',
    'LOG-USED-KEY',
    'LOG-GOT-CORE',
    'LOG-EXTRACT',
    'SEC-SPIRE',
    'SEC-TRENCH',
    'SEC-BRINE',
    'SEC-FISSURE',
  ];
  for (const id of required) {
    if (!(id in LORE)) fail(`required lore missing: ${id}`);
  }

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
