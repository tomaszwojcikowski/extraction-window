# Extraction Window — Field Lore Bible

Clinical field-ops logbook for Helix Cartographic Authority contract surveyors.
Tone: terse, procedural, no fantasy magic. All player-facing copy maps to entry IDs in `src/data/lore.ts`.

---

## Mission Context

**LOC-VIRE7** — Planetoid Vire-7, outer survey belt.
Helix Cartographic Authority (HCA) dropped Surveyor Unit for RF ground-truth of orbital maps.
Orbital relay failed mid-drop. Shuttle nav stack lost lock. Extraction window closes under ion storm.

**OBJ-NAVCORE** — Spare Nav Core stored inland at Helix Cache Vault.
**OBJ-RELAYKEY** — Beacon Relay inland seal requires Relay Key recovered from Ruin Belt caches.
**HAZ-STORM** — Ion storm: hard turn budget. Energy is life support under ion stress.

---

## Causal Chain

1. **CAUSE-RF** — Survey RF gear agitates local signal ecology → hostile fauna packs.
2. **CAUSE-RELAY** — Orbital relay down → only inland spare Nav Core can restore shuttle lock.
3. **CAUSE-SEAL** — Inland path sealed behind Beacon Relay hub → needs Relay Key.
4. **CAUSE-STORM** — Storm = environmental turn budget; Energy drains under ion stress / hazards.
5. **CAUSE-ESCAPE** — Escape only with Nav Core present at shuttle pad before window expires.

---

## Sectors (fixed order)

| ID | Name | Notes |
|----|------|-------|
| SEC-PLAINS | Survey Plains | Drop zone; low threat; exit south-east |
| SEC-FLOOD | Flood Basin | Standing ion-water; energy hazards |
| SEC-CANOPY | Canopy Reach | Dense cover; stalkers |
| SEC-RUIN | Ruin Belt | Relay Key guaranteed, reachable |
| SEC-BEACON | Beacon Relay | Spend Relay Key to open inland path |
| SEC-ASH | Ash Wastes | High radiation drain; crawlers |
| SEC-VAULT | Cache Vault | Nav Core guaranteed, reachable |
| SEC-RIDGE | Ridge Approaches / Shuttle Pad | Win with Core before storm = 0 |

---

## Player Strings (IDs)

See `src/data/lore.ts` for the full registry. Groups:

- `UI-*` — titles, HUD labels, end screens
- `LOG-*` — combat, pickup, sector transition, objective events
- `ITEM-*` — item names / descriptions
- `ENEMY-*` — enemy display names
- `OBJ-*` — objective prompts
- `SEC-*` — sector titles

---

## Legal Objective Order

1. Enter Ruin Belt → acquire Relay Key (`LOG-GOT-KEY`)
2. Enter Beacon Relay → spend key (`LOG-USED-KEY`) → inland opens
3. Enter Cache Vault → acquire Nav Core (`LOG-GOT-CORE`)
4. Reach Shuttle Pad with Core → extract (`LOG-EXTRACT`)

Win without Core is illegal. Key use before acquisition is illegal.
