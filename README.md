# Extraction Window

Solo turn-based sci-fi ADOM-lite for the browser. **Halcyon Survey Corps** from **CSV Halcyon** on **Meridian Shelf** — recover a spare **Nav Lattice** and extract via drop skiff before the **shear window** and **bus** clocks kill you.

Prior team’s field array never shut down cleanly; residual scan pressure keeps the ecology hot. Your field lamp, flares, and quiet stance are how you work the Shelf.

## Docs

| Doc | Role |
|-----|------|
| [docs/V1.md](./docs/V1.md) | **First-version scope** — pillars, cut list, engine, ship gates |
| [docs/GEM.md](./docs/GEM.md) | Scope filter — simulation-face test, mastery paths, cut rule |
| [docs/DESIGN_PRINCIPLES.md](./docs/DESIGN_PRINCIPLES.md) | Applied UI/feel principles + decision checklist |
| [docs/WORLD.md](./docs/WORLD.md) | Glossary, ecology thesis, rename checklist |
| [docs/LORE.md](./docs/LORE.md) | Mission lore bible (lore IDs) |
| [docs/art/ART_BIBLE.md](./docs/art/ART_BIBLE.md) | Locked look — palette, tiles, chrome, motion, rejects |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Layer rules (`sim/` never imports Phaser) |
| [docs/ADOM_DEPTH.md](./docs/ADOM_DEPTH.md) | Post-v1 depth waves |
| [PLAN.md](./PLAN.md) | Harness / balance numbers only (storm budget, WR band, playtest gates) |

## Run

```bash
npm install
npm run dev          # browser UI
npm run build        # production build
npm run test         # Vitest: unit + autopilot + balance
npm run test:unit    # sim / map / autopilot / data
npm run test:balance # win-rate band + lose-mix gates
npm run playtest:smoke
npm run playtest:cohere  # static spine/lore coherency
npm run playtest     # full seed suite → playtest-report.json
npx tsx scripts/playtest.ts --personas   # persona sweep: which channel kills each play style
```

## Controls

| Key | Action |
|-----|--------|
| WASD / arrows | Move (or navigate kit) — stepping onto kit picks it up |
| Shift + dir | Peek the wake footprint of the next tile (no turn spent) |
| `.` | Wait |
| `b` | Brace: +2 DEF through the enemy phase; cancels pounce bonus |
| `i` | Open field kit |
| `u` | Use selected item |
| `1`–`9` | Select kit slot |
| `p` | Mission PADD pages |
| `>` / `=` / Enter / Space | Hatch, beacon, pad, quest console, hail |
| `?` | Field manual |
| `m` | Mute / unmute |
| `Esc` | Close panel / open help |
| Title: `←` `→` mission ID, `R` random, `Enter` start |

## Stack (v1)

- **Rules:** headless TypeScript `src/sim/` (no Phaser)
- **Presentation:** Phaser **4.2.1** + Vite (see [docs/V1.md](./docs/V1.md))
- Vite + Vitest; keyboard-only; seeded runs
