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
| SEC-SPIRE | Spire Reach | Abandoned Helix survey masts; RF scatter intensifies |
| SEC-RUIN | Ruin Belt | Prior Helix survey wreckage; Relay Key in caches (guaranteed) |
| SEC-BEACON | Beacon Relay | Spend Relay Key to open inland path to Cache Vault |
| SEC-TRENCH | Fault Trench | Inland corridor after seal; deep fauna rising |
| SEC-ASH | Ash Wastes | Baseline radiation energy drain; crawlers |
| SEC-BRINE | Brine Shelf | Ion-brine pools; hazard density before vault |
| SEC-VAULT | Cache Vault | Helix depot; spare Nav Core; Vault Sentinels = RF-corrupted site defense |
| SEC-FISSURE | Fissure March | Storm pressure climb toward the pad |
| SEC-RIDGE | Ridge Approaches | Shuttle pad; win with Core before storm = 0 |

**Ruin Belt** — Remains of an earlier Helix ground survey that lost orbital lock and was abandoned. Contingency caches still hold Relay Keys for Beacon authorization.

**Vault Sentinels** — Automated Helix depot security. Signal ecology RF corruption flipped friend-or-foe; they treat active survey gear as hostile.

### One-room quests

Optional side-room anomalies (≤1 per sector): salvage, purge, decode, stabilize. Never required for extraction. Completing them can grant expedition **Pages** (in-run codex; reset each seed).

### New hostiles

- **Spire Mastling** — RF-fed skirmisher; ion damage
- **Fault Skitter** — fast ambush; applies bleed
- **Fissure Rift** — hunter; ion + expose

### Death drops

Hostiles may leave salvage on kill (depth-scaled chance). Never quest items.

## Terrain (sparse)

- Floor / rubble / scrub — open ground; scrub costs light energy
- Vent / hazard — ion stress drains life support (filter halves; sealant can neutralize underfoot)
- Exit / beacon / shuttle — mission structures
- POI (≤1 per sector) — optional anomaly (console / nest / cache scar); never required for win

## Signal ecology behaviors

Each biome signature hostile has a readable behavior (wander, swell burst, skirmish, ambush, drain, guard, sentinel hold, hunter chase). RF jammer briefly silences mites/wasps — survey RF is what agitates them.

## Field kit

Capacity 16 slots. Consumables: med, energy, ration, coolant, battery, probe, stim, plate (repairs ablative armor), flare, filter, dart, jammer, sealant, patch, lens, mapper. Equipment (separate from bag): scrap blade (tool +1 ATK), field harness (+6 max armor). Quest: Relay Key, Nav Core.

**Ablative armor** — hits strike armor pool before vitals. Bleed bypasses armor. Ion damage halved while filter is active. Kinetic vs ion damage types on hostiles.

**Surveyor proficiency (in-run)** — kills, sector clears, room quests, and objective beats grant XP. Levels auto-boost stats and unlock passive field skills (triage, scavenger, overcharge, ion skin, deep reserve, last window). Resets each drop; no cross-run meta.

Statuses (shared): stun, bleed, ion_burn, expose — tick on turns; HUD glyphs beside vitals.

## Field audio (synthesized)

Survey gear listens to local RF / ion stress. Ambient beds shift by biome (dry plains hum, flood drip, ash grit, vault carrier). Sparse music densifies as the storm window closes. `m` mutes all buses (SFX, ambient, music). No authored soundtrack files — procedural Web Audio only.

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
