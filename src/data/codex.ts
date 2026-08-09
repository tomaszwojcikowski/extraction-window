import type { LoreId } from './lore';

/**
 * Room facts — what is verifiably present where the player is standing.
 *
 * PADD pages are written backward from these: geometry and contents come first,
 * then the fiction that explains them. A page may only claim what its facts
 * guarantee, so a note about flooded pools never surfaces in a dry sector.
 */
export type SectorFact =
  // Terrain the player can point at
  | 'vent'
  | 'hazard'
  | 'brine_pool'
  | 'sealed'
  | 'tripwire'
  | 'scrub_nest'
  | 'rubble'
  // Ecology actually on this map
  | 'fauna_swarm'
  | 'fauna_hunter'
  | 'fauna_machine'
  | 'fauna_branded'
  // Mission furniture
  | 'quest_site'
  | 'npc'
  | 'beacon_tile'
  | 'shuttle_tile'
  // Run pressure
  | 'em_warn';

export interface CodexEntry {
  id: LoreId;
  /** All facts must hold before the page may be granted. Never empty. */
  requires: readonly SectorFact[];
}

/**
 * Fact-bound pages, checked most-specific first. Every entry must require at
 * least one fact; `playtest:cohere` fails an unbound or unreachable page.
 */
export const FACT_CODEX: readonly CodexEntry[] = [
  { id: 'CODEX-FACT-NEST-SWARM', requires: ['scrub_nest', 'fauna_swarm'] },
  { id: 'CODEX-FACT-BRINE-HUNTER', requires: ['brine_pool', 'fauna_hunter'] },
  { id: 'CODEX-FACT-VENT-EM', requires: ['vent', 'em_warn'] },
  { id: 'CODEX-FACT-TRIPWIRE', requires: ['tripwire'] },
  { id: 'CODEX-FACT-SEALED', requires: ['sealed'] },
  { id: 'CODEX-FACT-MACHINE', requires: ['fauna_machine'] },
  { id: 'CODEX-FACT-BRANDED', requires: ['fauna_branded'] },
  { id: 'CODEX-FACT-BRINE', requires: ['brine_pool'] },
  { id: 'CODEX-FACT-VENT', requires: ['vent'] },
  { id: 'CODEX-FACT-RUBBLE', requires: ['rubble'] },
];
