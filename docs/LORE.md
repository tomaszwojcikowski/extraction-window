# Extraction Window — Mission Lore Bible

Starfleet away-ops logbook for U.S.S. Voyager Delta Quadrant missions.
Tone: terse Starfleet procedure, no fantasy magic. All player-facing copy maps to entry IDs in `src/data/lore.ts`.

---

## Mission Context

**LOC-VIRE7** — Uncharted Class-M world **Site Theta-7**, Delta Quadrant.
Voyager drops an away team for ground survey after long-range subspace array failure mid-transit. Type-9 shuttle nav stack lost lock. Extraction window closes under an ion storm front.

**OBJ-NAVCORE** — Spare navigational core stored inland at Contingency Cache (Starfleet depot).
**OBJ-RELAYKEY** — Emergency Beacon inland seal requires Isolinear Key recovered from Crash Wreck Belt caches.
**HAZ-STORM** — Ion storm: hard turn budget. EPS power is life support under ion stress (slow drip + hazards; Radiogenic Ash adds baseline drain).

---

## Causal Chain

1. **CAUSE-EM** — Tricorder / away EM agitates local ecology → hostile fauna packs.
   Player beat: `LOG-DROP` + EM/Beacon-named hostiles + Tricorder Pulse ranging.
2. **CAUSE-ARRAY** — Long-range array down → only inland spare Nav Core can restore Type-9 lock.
3. **CAUSE-SEAL** — Inland path sealed behind Emergency Beacon → needs Isolinear Key.
4. **CAUSE-STORM** — Ion window = environmental turn budget; EPS drains under ion stress / hazards.
5. **CAUSE-ESCAPE** — Escape only with Nav Core present at Type-9 pad before window expires.

---

## Sectors (fixed order)

| ID | Name | Notes |
|----|------|-------|
| SEC-PLAINS | Drop Zone | Beam-in flats; low threat |
| SEC-FLOOD | Ion Floodplain | Standing ion-water; elevated hazard tiles |
| SEC-CANOPY | Canopy Sector | Dense EM scatter; hunters |
| SEC-SPIRE | Sensor Mast Reach | Abandoned Starfleet arrays; EM intensifies |
| SEC-RUIN | Crash Wreck Belt | Prior wreckage; Isolinear Key in caches (guaranteed) |
| SEC-BEACON | Emergency Beacon | Spend Isolinear Key to open inland path |
| SEC-TRENCH | Fault Corridor | Inland after seal; deep fauna |
| SEC-ASH | Radiogenic Ash | Baseline radiation EPS drain |
| SEC-BRINE | Nucleonic Brine | Ion-brine pools before cache |
| SEC-VAULT | Contingency Cache | Starfleet depot; spare Nav Core; EM-corrupted sentinels |
| SEC-FISSURE | Gravimetric Fissure | Storm pressure climb toward the pad |
| SEC-RIDGE | Shuttle Ridge | Type-9 pad; win with Core before window = 0 |

**Crash Wreck Belt** — Remains of an earlier Starfleet ground survey that lost array lock and was abandoned. Contingency caches still hold Isolinear Keys for beacon authorization.

**Cache Sentinels** — Automated depot security. EM corruption flipped friend-or-foe; they treat active away gear as hostile.

### One-room quests

Optional side-room anomalies (≤1 per sector): salvage, purge, decode, stabilize. Never required for extraction. Completing them can grant mission **PADD** pages (in-run codex; reset each seed).

### Hostiles

- **Array Feeder** — EM-fed skirmisher; plasma damage
- **Fault Skitter** — fast ambush; applies bleed
- **Fissure Rift** — hunter; plasma + expose

### Death drops

Hostiles may leave salvage on kill (depth-scaled chance). Never quest items.

## Terrain (sparse)

- Floor / rubble / scrub — open ground; scrub is sight-block only
- Vent / hazard — ion stress drains EPS (filter halves; sealant can neutralize underfoot)
- Hatch / beacon / shuttle — mission structures
- POI (≤1 per sector) — optional anomaly (console / nest / cache scar); never required for win

## Ecology behaviors

Each biome signature hostile has a readable behavior (wander, swell burst, skirmish, ambush, drain, guard, sentinel hold, hunter chase). EM scrambler briefly silences mites/wasps — tricorder EM is what agitates them.

## Away kit

Capacity 16 slots. Consumables: hypospray, power cell, ration, EPS coolant, tricorder pulse, stim, shield charge, plasma flare, plasma filter, microdart, EM scrambler, sealant, dermal seal, tricorder lens, nav ping. Equipment: combat knife (+1 ATK), EVA harness (+6 max shields). Quest: Isolinear Key, Nav Core.

**Personal shields** — hits strike shield pool before vitals. Bleed bypasses shields. Plasma damage halved while filter is active. Kinetic vs plasma (ion) damage types on hostiles.

**Away proficiency (in-run)** — kills, sector clears, room quests, and objective beats grant XP. Levels auto-boost stats and unlock passive field skills. Resets each mission; no cross-run meta.

Statuses: stun, bleed, plasma burn, expose — tick on turns; HUD glyphs beside vitals.

## Field audio (synthesized)

Away gear listens to local EM / ion stress. Ambient beds shift by biome. Sparse music densifies as the ion window closes. `m` mutes all buses. Procedural Web Audio only.

---

## Player Strings (IDs)

See `src/data/lore.ts` for the full registry.

---

## ADOM → Extraction Window

What classic ADOM did well, and how EW translates it (in-run only):

| ADOM strength | EW translation |
|---------------|----------------|
| Hunger / clocks | Dual clocks: **ion window** + **EPS power** |
| Corruption | **EM contamination** from tricorder tools / nests; tax + wider fauna aggro; flush with coolant/sealant/stabilize |
| Unidentified items | **Unknown Salvage** crates — scan with `u` (risk of backlash) |
| Distinct dungeons | Biome gen + **scrub blocks sight**; brine hazard tax; vault loot-wake |
| Talent identity | **Skill forks** at L3/L5/L7 — pick 1 of 2 |
| Lore that matters | **PADD pages** grant lasting run mods (FOV, filter, quiet vault, DEF, window) |
| Side content | Room quests / POIs with storm + kit payoffs |
| Dense keyboard log | Mission log + sticky causal milestones |

Out of scope (by design): towns/shops, alignment, meta unlocks, overland world map.

---

## Legal Objective Order

1. Enter Crash Wreck Belt → acquire Isolinear Key (`LOG-GOT-KEY`)
2. Enter Emergency Beacon → spend key (`LOG-USED-KEY`) → inland opens
3. Enter Contingency Cache → acquire Nav Core (`LOG-GOT-CORE`)
4. Reach Type-9 pad with Core → extract (`LOG-EXTRACT`)

Win without Core is illegal. Key use before acquisition is illegal.
