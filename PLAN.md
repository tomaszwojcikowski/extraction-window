# Extraction Window — Build Spec

> **Canon for first version:** [`docs/V1.md`](docs/V1.md) + [`docs/WORLD.md`](docs/WORLD.md). Use this file for **harness and balance numbers only** (storm budget, WR band, playtest gates); scope, engine, and player-facing names are owned by V1 / WORLD / LORE.

Solo turn-based sci-fi roguelike for the browser. **Halcyon Survey Corps / Meridian Shelf** framing.

## Stack

- Phaser **4.2.1** + Vite + TypeScript
- **Headless sim** in `src/sim/` (no Phaser imports) — all game rules live here
- Phaser scenes only render state and forward keyboard actions via `applyAction`
- Minimal 24×24 procedural pixel art (`pixelArt: true`), survey-chrome UI
- Keyboard only

## Lore spine (must stay coherent)

Halcyon Survey Corps drop on **Meridian Shelf**. Long-range field array died mid-drop. Drop skiff needs spare **Nav Lattice**. Shear storm closes the extraction window (turn timer).

Architecture for future mechanics: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Causal chain:
1. Field-array / survey-probe EM agitates local ecology → hostile fauna
2. Array down → spare Nav Lattice only in inland Contingency Cache
3. Inland path sealed behind Emergency Beacon → needs Splice Key from Crash Wreck Belt
4. Shear window = environmental turn budget; bus / life-support drains under ion stress
5. Escape only with Lattice at drop skiff pad

Tone: terse field logbook + conflicting prior PADDs. No medieval/fantasy magic. No franchise trademarks.

Lore bible: `docs/LORE.md` + `src/data/lore.ts`. Every player-facing string maps to a lore entry ID.

## Campaign (15 sectors)

Fixed order: Relay Scar Flats → Shearwash Basin → Shear Canopy → **Crystal Pulse Reef** → Array Mast Reach → Crash Wreck Belt → Emergency Beacon → Inland Fault Cut → **Bus Conduit Warren** → Shear Ash Fields → Pulse Brine Flats → Contingency Cache → Shear Fissure → **Skiff Approach** → Drop Skiff Ridge

- Crash Wreck Belt always has Splice Key (random placement, reachable)
- Emergency Beacon: multi-turn splice handshake (hold pad) to open inland path
- Contingency Cache always has Nav Lattice (reachable); pattern buffer may desync under vents/EM
- Sector 15 (Drop Skiff Ridge): win if carrying synced Nav Lattice before shear window hits 0
- Lose: HP≤0 after the downed clock (or skip the save), bus≤0, or window expires
- Storm budget starts at **700** turns (late sectors tax extra from duct/vault); autopilot win-rate target **55–85%**

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
- Positional pressure: stunned / winded hostiles eat the next strike clean; each hostile in contact past the first costs a point of DEF (capped at 2), so doorways and breaking contact matter
- HP, bus Power (slow drain + hazards), ATK, DEF, personal Shields
- Inventory **16** slots; quest items occupy slots; two equip slots (tool + armor); **18** item kinds, one clear tool per job
- In-run XP/skills (levels 1–8); three room quests (salvage / purge / vent_seal) billing Window, HP and kit; mission PADD panel
- FOV + fog of war
- 21 enemy kinds + elites/bosses; biome encounter tables; silhouette reads the behaviour family, and armed windups paint the ground they threaten (lunge / reach / zone / beam / overwatch / swell)
- Mechanics registry: room quests, beacon handshake, quiet stance, pattern buffer, sealed hatches, scripted events
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
- Win-rate gate: **55–85%** full suite
- `npm run playtest:smoke` / `playtest:cohere` / `npm run build`

## Success

- Browser playable end-to-end
- Playtest suite runs without crashes; some seeds win, failures are clean lose/stuck with report
- Lore coherent with mechanics
