# Extraction Window — Mission Lore Bible

Halcyon Survey Corps field logbook for Meridian Shelf extraction runs.
Tone: terse procedure + conflicting prior PADDs. No fantasy magic. All player-facing copy maps to entry IDs in `src/data/lore.ts`.

**Design bible:** [`docs/WORLD.md`](WORLD.md) (glossary, ecology thesis, rename checklist).

---

## Mission Context

**LOC-VIRE7** — Class-M ridge **Meridian Shelf**.
CSV Halcyon drops a survey team after the long-range field array fails mid-transit. Drop skiff nav stack lost lock. Extraction closes under a shear/ion storm front.

**OBJ-NAVCORE** — Spare **Nav Lattice** stored inland at Contingency Cache (Halcyon depot).
**OBJ-RELAYKEY** — Emergency Beacon inland seal requires **Splice Key** recovered from Crash Wreck Belt caches.
**HAZ-STORM** — Shear window: hard turn budget. Bus / life-support reserve drains under ion stress (slow drip + hazards; Radiogenic Ash adds baseline drain).

---

## Causal Chain

1. **CAUSE-EM** — Field array / survey-probe EM agitates local ecology → hostile fauna packs.
   Player beat: `LOG-DROP` + EM-named hostiles + Field Array Pulse ranging. Quiet stance suppresses EM-HIGH aggro bump.
2. **CAUSE-ARRAY** — Long-range array down → only inland spare Nav Lattice can restore drop skiff lock.
3. **CAUSE-SEAL** — Inland path sealed behind Emergency Beacon → needs Splice Key.
4. **CAUSE-STORM** — Shear window = environmental turn budget; bus drains under ion stress / hazards.
5. **CAUSE-ESCAPE** — Escape only with Nav Lattice present at drop skiff pad before window expires.

---

## Sectors (fixed order)

| ID | Name | Notes |
|----|------|-------|
| SEC-PLAINS | Relay Scar Flats | Drop flats; residual array afterglow; scar mites |
| SEC-FLOOD | Shearwash Basin | Standing shear-water; elevated hazard tiles |
| SEC-CANOPY | Canopy Sector | Dense EM scatter; hunters *(Phase 2 rename)* |
| SEC-REEF | Nucleonic Reef | Crystal scrub; reef skitters; early multiroom calibrate |
| SEC-SPIRE | Sensor Mast Reach | Abandoned survey arrays; EM intensifies |
| SEC-RUIN | Crash Wreck Belt | Prior wreckage; Splice Key in caches (guaranteed) |
| SEC-BEACON | Emergency Beacon | Sustained splice handshake opens inland path |
| SEC-TRENCH | Fault Corridor | Inland after seal; deep fauna |
| SEC-DUCT | EPS Conduit Warren | Vent spines; duct drones *(Phase 2: bus warren)* |
| SEC-ASH | Radiogenic Ash | Baseline radiation bus drain |
| SEC-BRINE | Nucleonic Brine | Ion-brine pools before cache |
| SEC-VAULT | Contingency Cache | Halcyon depot; spare Nav Lattice; pattern-buffer hook |
| SEC-FISSURE | Gravimetric Fissure | Storm pressure climb toward the pad |
| SEC-APPROACH | Pad Approach | Compact choke; storm shear; pattern stress |
| SEC-RIDGE | Shuttle Ridge | Drop skiff pad; win with synced Lattice before window = 0 |

**Crash Wreck Belt** — Remains of an earlier Halcyon ground survey that lost array lock and was abandoned. Contingency caches still hold Splice Keys for beacon authorization.

**Cache Sentinels** — Automated depot security. EM corruption flipped friend-or-foe; they treat active survey gear as hostile.

### Room quests

Optional side-room anomalies (≤1 per sector): salvage, purge, decode, stabilize (single-site), plus multiroom relay_chain / calibrate / vent_seal. Never required for extraction. Completing them can grant mission **PADD** pages (in-run codex; reset each seed). HUD shows an active QUEST tracker with step text and 1/N.

### Hostiles (early food chain)

- **Scar Mite** — grazes residual field-array bleed
- **Wash Spore** — blooms on stirred shear-water EM; swell burst
- **Pulse Wasp** — hunts bloom trails / probe signatures
- Later biomes: Array Feeder, Fault Skitter, Fissure Rift, Reef Skitter, Duct Drone, Shear Wraith *(display rename Phase 2)*

### Death drops

Hostiles may leave salvage on kill (depth-scaled chance). Never quest items.

## Terrain (sparse)

- Floor / rubble / scrub — open ground; scrub is sight-block only
- Vent / hazard — ion stress drains bus (filter halves; sealant can neutralize underfoot)
- Hatch / beacon / shuttle — mission structures
- POI (≤1 per sector) — optional anomaly (console / nest / cache scar); never required for win

## Ecology behaviors

Each biome signature hostile has a readable behavior (wander, swell burst, skirmish, ambush, drain, guard, sentinel hold, hunter chase). EM scrambler briefly silences mites/wasps — field-array EM is what agitates them. At EM-HIGH, quiet stance suppresses the contamination aggro bump (FOV cost stays).

## Away kit

Capacity 16 slots. Consumables: field hypo, power cell, ration, bus coolant, field array pulse, stim, shield charge, plasma flare, plasma filter, microdart, EM scrambler, sealant, dermal seal, array lens, nav ping. Equipment: combat knife (+1 ATK), EVA harness (+6 max shields). Quest: Splice Key, Nav Lattice.

**Personal shields** — hits strike shield pool before vitals. Bleed bypasses shields. Plasma damage halved while filter is active. Kinetic vs plasma (ion) damage types on hostiles.

**Away proficiency (in-run)** — kills, sector clears, room quests, and objective beats grant XP. Levels auto-boost stats and unlock passive field skills. Resets each mission; no cross-run meta.

Statuses: stun, bleed, plasma burn, expose — tick on turns; HUD glyphs beside vitals.

## Field audio (synthesized)

Away gear listens to local EM / ion stress. Ambient drones shift by biome; melodic beds tint to the sector and densify as the shear window closes. Nearby hostiles trigger a combat danger layer. `m` mutes all buses. Procedural Web Audio only.

---

## Player Strings (IDs)

See `src/data/lore.ts` for the full registry.

---

## ADOM → Extraction Window

What classic ADOM did well, and how EW translates it (in-run only):

| ADOM strength | EW translation |
|---------------|----------------|
| Hunger / clocks | Dual clocks: **shear window** + **bus power** |
| Corruption | **EM contamination** from field-array tools / nests; tax + wider fauna aggro; flush with coolant/sealant/stabilize; quiet suppresses EM-HIGH aggro bump |
| Unidentified items | **Unknown Salvage** crates — scan with `u` (risk of backlash) |
| Distinct dungeons | Biome gen + **scrub blocks sight**; brine hazard tax; vault loot-wake |
| Talent identity | **Skill forks** at L3/L5/L7 — pick 1 of 2 |
| Lore that matters | **PADD pages** grant lasting run mods (FOV, filter, quiet vault, DEF, window) |
| Side content | Room quests / POIs with storm + kit payoffs |
| Dense keyboard log | Mission log + sticky causal milestones |

Out of scope (by design): towns/shops, alignment, meta unlocks, overland world map.

---

## Legal Objective Order

1. Enter Crash Wreck Belt → acquire Splice Key (`LOG-GOT-KEY`)
2. Enter Emergency Beacon → spend key (`LOG-USED-KEY`) → inland opens
3. Enter Contingency Cache → acquire Nav Lattice (`LOG-GOT-CORE`)
4. Reach drop skiff pad with Lattice → extract (`LOG-EXTRACT`)

Win without Lattice is illegal. Key use before acquisition is illegal.

---

## Rename checklist (player-facing)

| Avoid | Prefer |
|-------|--------|
| Voyager / U.S.S. / Starfleet | CSV Halcyon / Halcyon Survey Corps |
| Delta Quadrant / Site Theta-7 | Meridian Shelf |
| Isolinear Key / Isolinear handshake | Splice Key / splice handshake |
| Type-9 | drop skiff pad |
| Nav Core | Nav Lattice |
| EPS (labels) | bus / life-support |
| tricorder | field array / survey probe |
| hypospray | field hypo |
| ion window (HUD) | shear window |

Full glossary: [`docs/WORLD.md`](WORLD.md).
