# Extraction Window

Solo turn-based sci-fi roguelike. **U.S.S. Voyager** away team on Site Theta-7 (Delta Quadrant) — recover the navigational core before the ion storm collapses the extraction window.

See [PLAN.md](./PLAN.md) and [docs/LORE.md](./docs/LORE.md).

## Run

```bash
npm install
npm run dev          # browser UI
npm run build        # production build
npm run test         # Vitest: unit + autopilot + balance
npm run test:unit    # sim / map / autopilot only
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
| `i` | Open away kit |
| `u` | Use selected item |
| `1`–`9` | Select kit slot |
| `p` | Mission PADD pages |
| `>` / `=` | Hatch / beacon / shuttle |
| `?` | Away team manual |
| `m` | Mute / unmute |
| `Esc` | Close panel / open help |
| Title: `←` `→` mission ID, `R` random, `Enter` start |
