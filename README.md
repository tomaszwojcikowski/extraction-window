# Extraction Window

Solo turn-based sci-fi ADOM-lite for the browser. **Halcyon Survey Corps** from **CSV Halcyon** on **Meridian Shelf** — recover a spare **Nav Lattice** and extract via drop skiff before the **shear window** and **bus** clocks kill you.

Prior team’s field array never shut down cleanly; residual scan pressure keeps the ecology hot. Your field lamp, flares, and quiet stance are how you work the Shelf.

## Docs

| Doc | Role |
|-----|------|
| [docs/V1.md](./docs/V1.md) | **First-version scope** — pillars, cut list, engine, ship gates |
| [docs/WORLD.md](./docs/WORLD.md) | Glossary, ecology thesis, rename checklist |
| [docs/LORE.md](./docs/LORE.md) | Mission lore bible (lore IDs) |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Layer rules (`sim/` never imports Phaser) |
| [PLAN.md](./PLAN.md) | Build/balance harness notes *(franchise framing stale — prefer V1 + WORLD)* |

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
```

## Controls

| Key | Action |
|-----|--------|
| WASD / arrows | Move (or navigate kit) |
| `.` | Wait |
| `g` | Get item |
| `i` | Open field kit |
| `u` | Use selected item |
| `1`–`9` | Select kit slot |
| `p` | Mission PADD pages |
| `>` / `=` | Hatch / beacon / skiff |
| `?` | Field manual |
| `m` | Mute / unmute |
| `Esc` | Close panel / open help |
| Title: `←` `→` mission ID, `R` random, `Enter` start |

## Stack (v1)

- **Rules:** headless TypeScript `src/sim/` (no Phaser)
- **Presentation:** Phaser 3 → migrate to Phaser 4 for v1 polish (see [docs/V1.md](./docs/V1.md))
- Vite + Vitest; keyboard-only; seeded runs
