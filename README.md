# Extraction Window

Solo turn-based sci-fi roguelike. Helix Cartographic Authority surveyor on Vire-7 — recover the Nav Core before the ion storm closes the extraction window.

See [PLAN.md](./PLAN.md) and [docs/LORE.md](./docs/LORE.md).

## Run

```bash
npm install
npm run dev          # browser UI
npm run build        # production build
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
| `i` | Open kit |
| `u` | Use selected item |
| `1`–`9` | Select kit slot |
| `>` / `=` | Exit / beacon / shuttle |
| `?` | Field manual |
| `m` | Mute / unmute |
| `Esc` | Close panel / open help |
| Title: `←` `→` seed, `R` random, `Enter` start |
