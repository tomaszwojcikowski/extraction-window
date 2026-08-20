# Extraction Window — Build Spec

> **Canon for first version:** [`docs/V1.md`](docs/V1.md) + [`docs/WORLD.md`](docs/WORLD.md). Use this file for **harness and balance numbers only** (WR band, lose-mix gates, playtest commands); scope, engine, and player-facing names are owned by V1 / WORLD / LORE.

**Status (v1.6.0):** Waves 51–58 graphical presentation (loot silhouettes, ion-front field, ally frames, status wash, modal parity, wake/goal, handshake/mapper). Prior `v1.5.0`: Waves 43–50 graphics & animation. Detail: [`docs/V1.md`](docs/V1.md) · [`docs/ADOM_DEPTH.md`](docs/ADOM_DEPTH.md).

Solo turn-based sci-fi roguelike for the browser. **Halcyon Survey Corps / Meridian Shelf** framing.

## Stack

- Phaser **4.2.1** + Vite + TypeScript
- **Headless sim** in `src/sim/` (no Phaser imports) — all game rules live here
- Phaser scenes only render state and forward keyboard actions via `applyAction`
- Minimal 24×24 procedural pixel art (`pixelArt: true`), survey-chrome UI
- Keyboard only

## Lore spine (must stay coherent)

Halcyon Survey Corps drop on **Meridian Shelf**. Long-range field array died mid-drop. Drop skiff needs spare **Nav Lattice**. **Power** (bus reserve) is the sole death clock; ion shear and EM are exploration pressure, not a turn timer.

Architecture for future mechanics: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Causal chain:
1. Field-array / survey-probe EM agitates local ecology → hostile fauna
2. Array down → spare Nav Lattice only in inland Contingency Cache
3. Inland path sealed behind Emergency Beacon → needs Splice Key from Crash Wreck Belt
4. Bus / life-support drains under sector drip, hazards, kit spends, and ion stress
5. Escape only with Lattice at drop skiff pad

Tone: terse field logbook + conflicting prior PADDs. No medieval/fantasy magic. No franchise trademarks.

Lore bible: `docs/LORE.md` + `src/data/lore.ts`. Every player-facing string maps to a lore entry ID.

## Campaign (15 sectors)

Fixed order: Relay Scar Flats → Shearwash Basin → Shear Canopy → **Crystal Pulse Reef** → Array Mast Reach → Crash Wreck Belt → Emergency Beacon → Inland Fault Cut → **Bus Conduit Warren** → Shear Ash Fields → Pulse Brine Flats → Contingency Cache → Shear Fissure → **Skiff Approach** → Drop Skiff Ridge

- Crash Wreck Belt always has Splice Key (random placement, reachable)
- Emergency Beacon: multi-turn splice handshake (hold pad) to open inland path
- Contingency Cache always has Nav Lattice (reachable); pattern buffer may desync under vents/EM
- Sector 15 (Drop Skiff Ridge): win if carrying synced Nav Lattice at drop skiff pad
- Lose: HP≤0 after the downed clock (or skip the save), or Power≤0
- Autopilot win-rate target **55–85%** (300-seed band gate)

Partly procedural per seed: layouts, room roles, multiroom quests, branches, enemy packs, loot, exact objective tiles. Same seed = same world. Biome generation flags differentiate flood lakes, canopy/reef scrub, rubble mazes, vent corridors, vault choke rooms.

**Every sector has a shape.** Six layout grammars own placement and wiring so
sectors stop sharing one topology: `scatter` (plains/flood/approach — open chain),
`spine` (ridge — west→east run with optional pockets off the path), `hub`
(beacon/vault — central crossing kept quiet, land and leave on opposite arms),
`lattice` (duct/trench — coarse grid, orthogonal runs), `branch`
(canopy/reef/spire — tree with dead ends), `warren` (ruin/ash/fissure/brine —
tight packing, one ring of loops). Walking into the duct and walking into the
plains are different shapes, not the same shape with different paint.

**Every room has a job.** A room is assigned a role at generation and the role owns
its contents, so the sector's hostile and loot budgets are concentrated rather than
smeared evenly across the floor: `nest` (a pack behind cover that hides its size),
`cache` (piled kit with something in the way), `hazard` (caustic ground with one dry
lane), `post` (one hostile holding a sightline), `thicket` (growth too dense to see
through), `collapse` (cover everywhere — a shoving room), `quiet` (empty, which is
what makes the rest read as loud). Which roles a sector can draw is derived from what
it actually contains, so the shelf sectors have no `hazard` or `post` rooms at all
and the duct has all seven — the absence is the identity.

## Mechanics

- Turn-based grid; WASD/arrows move (stepping onto kit takes it); bump = melee; `.` wait; `i` kit; `u` use/equip; `p` PADD; `l` mission log; Enter / Space / `>` interact; Esc close
- Combat answers: walk into a hostile to strike; leave painted windup tiles or kill mid-charge; Pulse Baton stuns on hit
- Positional pressure: stunned / winded hostiles eat the next strike clean; each hostile in contact past the first costs a point of DEF (capped at 3), so doorways and breaking contact matter
- HP, bus Power (sector drip + hazards + kit spends), ATK, DEF, personal Shields
- Inventory **16** slots; **8** paper-doll wear slots + bag; **26** item kinds (8 wearables), one clear tool per job
- In-run XP/skills (levels 1–8); three room quests (salvage / purge / vent_seal) billing kit/Power opportunity, HP, and sealant; mission PADD panel
- FOV + fog of war
- 21 enemy kinds + elites/bosses; biome encounter tables; silhouette reads the behaviour family, and armed windups paint the ground they threaten (lunge / reach / zone / beam / overwatch / swell)
- Mechanics registry: room quests, beacon handshake, pattern buffer, sealed hatches, ion fronts, scripted events
- Seeded RNG (mulberry32)

## Required layout

```
src/
  sim/           # pure TS: state, actions, turn, combat, inventory, objectives, fov, rng
  map/           # generator, biomes
  campaign/      # spine
  data/          # enemies, items, lore, encounters, progression, drops
  ai/autopilot.ts
  scenes/        # Boot, Title, Game, End
  main.ts
scripts/playtest.ts
scripts/cohere.ts
docs/LORE.md
```

## Playtest (required)

- `npm run playtest` — headless autopilot over multiple seeds → `playtest-report.json`
- Assertions: no crash, objectives reachable at gen, win only with Lattice at skiff, lore events legal order
- Win-rate gate: **55–85%** on **300 generated seeds** (`test:balance`)
- Lose-mix gate: **hp + energy** both present; stuck &lt;20% of full suite
- `npm run playtest:smoke` / `playtest:cohere` / `npm run build`
- Held-out measurement: `npx tsx scripts/probe-wr.ts 500` (offset seed stream from gate)

## Success

- Browser playable end-to-end
- Playtest suite runs without crashes; some seeds win, failures are clean lose/stuck with report
- Lore coherent with mechanics
