# Extraction Window

Solo turn-based sci-fi ADOM-lite for the browser. **Halcyon Survey Corps** from **CSV Halcyon** on **Meridian Shelf** — recover a spare **Nav Lattice** and extract via drop skiff before **Power** (bus reserve) hits zero. Exploration is allowed; ion shear and fauna are the wake tax.

Prior team’s field array never shut down cleanly; residual scan pressure keeps the ecology hot. Your field lamp and flares are how you work the Shelf.

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
| [PLAN.md](./PLAN.md) | Harness / balance numbers only (WR band, lose-mix gates, playtest commands) |

## Run

```bash
npm install
npm run dev          # Three.js field at / · Phaser v1 at /v1.html
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
| WASD / arrows | Move (follows camera yaw on the orbit field) — stepping onto kit picks it up |
| `.` | Wait |
| `i` | Open field kit |
| `u` | Use or equip selected item |
| `1`–`9` | Select kit slot |
| `n` | Field sketch (minimap) |
| `p` | Mission PADD pages |
| `l` | Mission log (hidden by default; field chips carry recent beats) |
| Enter / Space / `>` / `=` | Hatch, beacon, pad, optional site, hail |
| `?` | Field manual |
| `m` | Mute / unmute |
| `Esc` | Close panel / open help |
| Title: `←` `→` mission ID, `R` random, `Enter` start |
| `Q` `E` | Yaw the orbit camera (Three.js field) |
| Right-drag / left-click | Orbit inspect / step toward the pointer |
| v1 (`/v1.html`) | Phaser field — keyboard only |

## Stack

- **Rules:** headless TypeScript `src/sim/` (no Phaser, no Three.js)
- **Presentation (default):** Three.js orbit field at `/` — sim flood tint, 3D surveyor and fauna, combat tells, wake/handshake marks, HTML HUD, field sketch, title/end, shared audio, lattice-lock overlay, no bloom. [`v2.html`](./v2.html) redirects here.
- **Presentation (v1):** Phaser **4.2.1** at [`v1.html`](./v1.html) (see [docs/V1.md](./docs/V1.md))
- Vite + Vitest; keyboard-only; seeded runs

## Deploy

- **GitHub Pages:** push to `main` or tag `v*` runs [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Vite `base: './'` keeps asset paths relative. Live: https://tomaszwojcikowski.github.io/extraction-window/
- **itch.io / Playables:** upload the `dist/` folder from `npm run build` (same relative-asset build).
