# Extraction Window — Build Spec

Solo turn-based sci-fi roguelike for the browser. **Voyager / Delta Quadrant away ops** framing.

## Stack

- Phaser 3 + Vite + TypeScript
- **Headless sim** in `src/sim/` (no Phaser imports) — all game rules live here
- Phaser scenes only render state and forward keyboard actions via `applyAction`
- Minimal 24×24 procedural pixel art (`pixelArt: true`), LCARS-adjacent chrome
- Keyboard only

## Lore spine (must stay coherent)

Starfleet away team from **U.S.S. Voyager** on **Site Theta-7** (Delta Quadrant). Long-range array died mid-drop. Type-9 needs **Nav Core**. Ion storm closes extraction window (turn timer).

Causal chain:
1. Tricorder EM agitates local ecology → hostile fauna
2. Array down → spare Nav Core only in inland Contingency Cache
3. Inland path sealed behind Emergency Beacon → needs Isolinear Key from Crash Wreck Belt
4. Ion window = environmental turn budget; EPS power = life support under ion stress
5. Escape only with Core at Type-9 pad

Tone: Starfleet field logbook. No medieval/fantasy magic.

Lore bible: `docs/LORE.md` + `src/data/lore.ts`. Every player-facing string maps to a lore entry ID.

## Campaign (12 sectors)

Fixed order: Drop Zone → Ion Floodplain → Canopy → Sensor Mast Reach → Crash Wreck Belt → Emergency Beacon → Fault Corridor → Radiogenic Ash → Nucleonic Brine → Contingency Cache → Gravimetric Fissure → Shuttle Ridge / Type-9

- Crash Wreck Belt always has Isolinear Key (random placement, reachable)
- Emergency Beacon: spend key to open inland path
- Contingency Cache always has Nav Core (reachable)
- Sector 12 (Shuttle Ridge) Type-9: win if carrying Nav Core before ion window hits 0
- Lose: HP≤0, EPS≤0, or window expires
- Storm budget starts at **500** turns (late sectors tax extra); autopilot win-rate target **~55–75%**

Partly procedural per seed: layouts, branches, enemy packs, loot, exact objective tiles. Same seed = same world. Biome generation flags differentiate flood lakes, canopy scrub, rubble mazes, vent corridors, vault choke rooms.

## Mechanics

- Turn-based grid; WASD/arrows move; bump = melee; `.` wait; `g` get; `i` kit; `u` use; `p` PADD; `>` exit; Esc close
- HP, EPS Power (slow drain + hazards), ATK, DEF, personal Shields
- Inventory **16** slots; quest items occupy slots; knife/EVA equip; power cell/coolant two-tier recharge
- In-run XP/skills (levels 1–8); room quests with window/kit payoffs; mission PADD panel
- FOV + fog of war
- ~13 enemy types; biome encounter tables; telegraph punish (pounce/swell)
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
- Assertions: no crash, objectives reachable at gen, win only with Core at shuttle, lore events legal order
- Win-rate gate: **55–85%** full suite (target band ~55–75%)
- `npm run playtest:smoke` / `playtest:cohere` / `npm run build`

## Success

- Browser playable end-to-end
- Playtest suite runs without crashes; some seeds win, failures are clean lose/stuck with report
- Lore coherent with mechanics
