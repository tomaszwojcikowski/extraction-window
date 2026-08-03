# Extraction Window — Build Spec

Solo turn-based sci-fi roguelike for the browser. Implement this fully.

## Stack

- Phaser 3 + Vite + TypeScript
- **Headless sim** in `src/sim/` (no Phaser imports) — all game rules live here
- Phaser scenes only render state and forward keyboard actions via `applyAction`
- Minimal 16×16 pixel art (`pixelArt: true`)
- Keyboard only

## Lore spine (must stay coherent)

Contract surveyor for Helix Cartographic Authority on **Vire-7**. Orbital relay died mid-drop. Shuttle needs **Nav Core**. Ion storm closes extraction window (turn timer).

Causal chain:
1. Survey RF gear agitates “signal ecology” → hostile fauna
2. Relay down → spare Nav Core only in inland Helix Cache Vault
3. Inland path sealed behind Beacon Relay → needs Relay Key from Ruin Belt
4. Storm = environmental turn budget; energy = life support under ion stress
5. Escape only with Core at shuttle pad

Tone: clinical field-ops sci-fi logbook. No medieval/fantasy magic.

Lore bible: `docs/LORE.md` + `src/data/lore.ts`. Every player-facing string maps to a lore entry ID.

## Campaign (12 sectors)

Fixed order: Plains → Flood Basin → Canopy → Spire Reach → Ruin Belt → Beacon Relay hub → Fault Trench → Ash Wastes → Brine Shelf → Cache Vault → Fissure March → Ridge Approaches / Shuttle Pad

- Ruin Belt always has Relay Key (random placement, reachable)
- Beacon Relay: spend key to open inland path
- Cache Vault always has Nav Core (reachable)
- Sector 8 shuttle: win if carrying Nav Core before storm timer hits 0
- Lose: HP≤0, Energy≤0, or storm expires
- Target successful run pacing ~60–90 min for humans; autopilot may finish faster in turns

Partly procedural per seed: layouts, branches, enemy packs, loot, exact objective tiles. Same seed = same world.

## Mechanics

- Turn-based grid; WASD/arrows move; bump = melee; `.` wait; `g` get; `i` inventory; `u` use; `>` exit; Esc close
- HP, Energy (slow drain + hazards), ATK, DEF
- Inventory ~10 slots; quest items occupy slots
- FOV + fog of war
- ~6–8 enemy types; biome encounter tables; difficulty by sector index
- Seeded RNG (mulberry32)

## Required layout

```
src/
  sim/           # pure TS: state, actions, turn, combat, inventory, objectives, fov, rng
  map/           # generator, biomes
  campaign/      # spine
  data/          # enemies, items, lore, encounters
  ai/autopilot.ts
  scenes/        # Boot, Title, Game, End
  main.ts
scripts/playtest.ts
docs/LORE.md
```

## Playtest (required)

- `npm run playtest` — headless autopilot over multiple seeds → `playtest-report.json`
- Autopilot: path toward current objective, pick key/core, use heals when low, fight when blocked
- Assertions: no crash, objectives reachable at gen, win only with Core at shuttle, lore events legal order
- `npm run playtest:smoke` — fewer seeds
- `npm run dev` — browser UI
- `npm run build` — production build must succeed

## Success

- Browser playable end-to-end
- Playtest suite runs without crashes; some seeds win, failures are clean lose/stuck with report
- Lore coherent with mechanics
