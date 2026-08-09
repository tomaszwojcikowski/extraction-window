import { ENEMIES, type EnemyKind } from '../data/enemies';
import { FACT_CODEX, type SectorFact } from '../data/codex';
import type { LoreId } from '../data/lore';
import { EM_WARN } from './emStress';
import type { GameState } from './types';

/** Ecology buckets — a page may talk about swarms only if swarms are here. */
const FAUNA_BUCKET: Partial<Record<EnemyKind, SectorFact>> = {
  mite: 'fauna_swarm',
  wasp: 'fauna_swarm',
  spore: 'fauna_swarm',
  skitter: 'fauna_swarm',
  reef_skitter: 'fauna_swarm',
  stalker: 'fauna_hunter',
  leech: 'fauna_hunter',
  serpent: 'fauna_hunter',
  wraith: 'fauna_hunter',
  shear_wraith: 'fauna_hunter',
  crawler: 'fauna_hunter',
  mastling: 'fauna_hunter',
  rift: 'fauna_hunter',
  sentinel: 'fauna_machine',
  drone: 'fauna_machine',
  duct_drone: 'fauna_machine',
};

/**
 * What this sector can honestly claim right now.
 *
 * Reads the live map rather than generation-time metadata, so a page can only
 * describe terrain, ecology, and pressure the player could actually walk up to.
 */
export function collectSectorFacts(state: GameState): Set<SectorFact> {
  const facts = new Set<SectorFact>();

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      switch (state.tiles[y]![x]!.kind) {
        case 'vent':
          facts.add('vent');
          break;
        case 'hazard':
          facts.add('hazard');
          break;
        case 'brine_pool':
          facts.add('brine_pool');
          break;
        case 'sealed':
          facts.add('sealed');
          break;
        case 'tripwire':
          facts.add('tripwire');
          break;
        case 'scrub_nest':
          facts.add('scrub_nest');
          break;
        case 'rubble':
          facts.add('rubble');
          break;
        case 'beacon':
          facts.add('beacon_tile');
          break;
        case 'shuttle':
          facts.add('shuttle_tile');
          break;
        default:
          break;
      }
    }
  }

  for (const en of state.enemies) {
    if (!en.alive) continue;
    const bucket = FAUNA_BUCKET[en.kind];
    if (bucket) facts.add(bucket);
    if (ENEMIES[en.kind].brand) facts.add('fauna_branded');
  }

  if (state.poiPos && !state.poiUsed) {
    if (state.poiKind === 'nest') facts.add('poi_nest');
    else if (state.poiKind === 'cache_scar') facts.add('poi_cache');
    else facts.add('poi_console');
  }
  if (state.roomQuest && !state.roomQuest.done) facts.add('quest_site');
  if (state.npcs.length > 0) facts.add('npc');
  if (state.emStress >= EM_WARN) facts.add('em_warn');
  if (state.scanScars.length > 0) facts.add('scarred');

  return facts;
}

export function factsSatisfy(
  facts: ReadonlySet<SectorFact>,
  requires: readonly SectorFact[],
): boolean {
  return requires.length > 0 && requires.every((f) => facts.has(f));
}

/**
 * Most specific page whose facts all hold and which this run has not seen.
 * Returns null when nothing binds — callers fall back to the sector page.
 */
export function pickFactCodex(state: GameState, seen: readonly LoreId[]): LoreId | null {
  const facts = collectSectorFacts(state);
  let best: LoreId | null = null;
  let bestSpecificity = 0;
  for (const entry of FACT_CODEX) {
    if (seen.includes(entry.id)) continue;
    if (!factsSatisfy(facts, entry.requires)) continue;
    if (entry.requires.length > bestSpecificity) {
      best = entry.id;
      bestSpecificity = entry.requires.length;
    }
  }
  return best;
}
