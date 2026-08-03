# Extraction Window — Field Lore Bible

Clinical field-ops logbook for Helix Cartographic Authority contract surveyors.
Tone: terse, procedural, no fantasy magic. All player-facing copy maps to entry IDs in `src/data/lore.ts`.

---

## Mission Context

**LOC-VIRE7** — Planetoid Vire-7, outer survey belt.
Helix Cartographic Authority (HCA) dropped Surveyor Unit for RF ground-truth of orbital maps.
Orbital relay failed mid-drop. Shuttle nav stack lost lock. Extraction window closes under ion storm.

**OBJ-NAVCORE** — Spare Nav Core stored inland at Cache Vault (Helix depot).
**OBJ-RELAYKEY** — Beacon Relay inland seal requires Relay Key recovered from Ruin Belt caches.
**HAZ-STORM** — Ion storm: hard turn budget. Energy is life support under ion stress (slow drip + hazards; Ash Wastes add baseline radiation drain).

---

## Causal Chain

1. **CAUSE-RF** — Survey RF gear agitates local signal ecology → hostile fauna packs.
   Player beat: `LOG-DROP` + Signal/Relay-named hostiles + Survey Probe RF ranging.
2. **CAUSE-RELAY** — Orbital relay down → only inland spare Nav Core can restore shuttle lock.
3. **CAUSE-SEAL** — Inland path sealed behind Beacon Relay hub → needs Relay Key.
4. **CAUSE-STORM** — Storm = environmental turn budget; Energy drains under ion stress / hazards.
5. **CAUSE-ESCAPE** — Escape only with Nav Core present at shuttle pad before window expires.

---

## Sectors (fixed order)

| ID | Name | Notes |
|----|------|-------|
| SEC-PLAINS | Survey Plains | Drop zone; low threat |
| SEC-FLOOD | Flood Basin | Standing ion-water; elevated hazard tiles |
| SEC-CANOPY | Canopy Reach | Dense RF scatter; stalkers |
| SEC-RUIN | Ruin Belt | Prior Helix survey wreckage; Relay Key in caches (guaranteed) |
| SEC-BEACON | Beacon Relay | Spend Relay Key to open inland path to Cache Vault |
| SEC-ASH | Ash Wastes | Baseline radiation energy drain; crawlers |
| SEC-VAULT | Cache Vault | Helix depot; spare Nav Core; Vault Sentinels = RF-corrupted site defense |
| SEC-RIDGE | Ridge Approaches | Shuttle pad; win with Core before storm = 0 |

**Ruin Belt** — Remains of an earlier Helix ground survey that lost orbital lock and was abandoned. Contingency caches still hold Relay Keys for Beacon authorization.

**Vault Sentinels** — Automated Helix depot security. Signal ecology RF corruption flipped friend-or-foe; they treat active survey gear as hostile.

## Terrain (sparse)

- Floor / rubble / scrub — open ground; scrub costs light energy
- Vent / hazard — ion stress drains life support (filter halves)
- Exit / beacon / shuttle — mission structures

## Field kit

Capacity 16 slots. Consumables: med, energy, ration, coolant, probe, stim, plate, flare, filter. Upgrades: scrap blade (+1 ATK). Quest: Relay Key, Nav Core.

---

## Player Strings (IDs)

See `src/data/lore.ts` for the full registry. Groups:

- `UI-*` — titles, HUD labels, end screens, inventory/help chrome, contextual hints
- `LOG-*` — combat, pickup, sector transition, objective events
- `ITEM-*` — item names / descriptions (descriptions shown for selected kit slot)
- `ENEMY-*` — enemy display names (shown in kill log detail)
- `OBJ-*` — objective prompts
- `SEC-*` — sector titles
- `LOC-*` / `HAZ-*` — mission tags; `LOC-VIRE7` on title; `HAZ-STORM` when window ≤ 50

---

## Legal Objective Order

1. Enter Ruin Belt → acquire Relay Key (`LOG-GOT-KEY`)
2. Enter Beacon Relay → spend key (`LOG-USED-KEY`) → inland opens
3. Enter Cache Vault → acquire Nav Core (`LOG-GOT-CORE`)
4. Reach Shuttle Pad with Core → extract (`LOG-EXTRACT`)

Win without Core is illegal. Key use before acquisition is illegal.
