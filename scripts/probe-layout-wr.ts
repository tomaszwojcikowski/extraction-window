/**
 * Win-rate by layout grammar — which shapes are killing runs.
 *
 * Usage: `npx tsx scripts/probe-layout-wr.ts [seedCount]`
 */
import { layoutForSector } from '../src/map/layout';
import { getSector } from '../src/data/encounters';
import { CAMPAIGN_LENGTH } from '../src/campaign/spine';
import { runSeed } from '../tests/harness';

const count = Number(process.argv[2] ?? 60);
const seeds = Array.from({ length: count }, (_, i) => 2000 + i * 11);

// Map each sector index to its grammar for reporting how far runs get.
const grammarAt: string[] = [];
for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
  grammarAt.push(layoutForSector(getSector(i).id));
}

const bySectorDeath: Record<string, number> = {};
const byGrammarDeath: Record<string, number> = {};
let wins = 0;

for (const seed of seeds) {
  const r = runSeed(seed, 10000);
  if (r.status === 'won') {
    wins++;
    continue;
  }
  const sector = getSector(Math.min(r.sectorReached, CAMPAIGN_LENGTH - 1));
  const g = layoutForSector(sector.id);
  bySectorDeath[`${sector.id}`] = (bySectorDeath[`${sector.id}`] ?? 0) + 1;
  byGrammarDeath[g] = (byGrammarDeath[g] ?? 0) + 1;
}

console.log(`${wins}/${seeds.length} wins = ${((wins / seeds.length) * 100).toFixed(1)}%`);
console.log(
  'deaths by grammar: ' +
    Object.entries(byGrammarDeath)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(' '),
);
console.log(
  'deaths by sector: ' +
    Object.entries(bySectorDeath)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(' '),
);
console.log('campaign order grammars: ' + grammarAt.join(' → '));
