# Extraction Window — World Bible (Phase 0)

Design canon for the Halcyon / Meridian Shelf overhaul. Player-facing copy lives in `src/data/lore.ts`; this doc is the glossary and intent. Keep lore IDs stable where possible — change `lore()` strings first.

---

## Pitch (one sentence)

Meridian Shelf was a Halcyon relay staging ground; the prior team’s field array never shut down cleanly — residual scan pressure keeps the ecology hot until you pull a spare Nav Lattice and leave before **Power** runs out.

---

## Glossary

| Slot | Canon |
|------|-------|
| Title | **EXTRACTION WINDOW** (fiction — ion shear on the shelf; **not** a turn timer in v1) |
| Org | **Halcyon Survey Corps** |
| Ship | **CSV Halcyon** (civilian survey vessel) |
| Site | **Meridian Shelf** (class-M ridge / storm belt) |
| Shear / ion pressure | Environmental presentation — taxes **Power** and EM; dial on HUD |
| Power | **bus / life-support reserve** — sole death clock |
| Scanner | **field array / survey probe** |
| Med | **field hypo / seal gel** |
| Key | **Splice Key** |
| Shuttle | **drop skiff pad** |
| Handshake | **splice handshake** (multi-turn hold on beacon) |
| Core | **Nav Lattice** (extract McGuffin) |

**Tone:** terse field logbook + conflicting prior PADDs (wrong assumptions, half-true maps). No franchise trademarks. No comedy pastiche.

---

## Causal chain (rename map)

Keep IDs; player strings follow Halcyon canon.

| Beat | Lore / objective IDs | Player framing |
|------|----------------------|----------------|
| EM ecology | `CAUSE` via `LOG-DROP`, EM logs | Field-array / probe EM agitates Meridian fauna |
| Array down | `OBJ-NAVCORE`, vault | Only inland spare **Nav Lattice** restores skiff lock |
| Seal | `OBJ-RELAYKEY`, `OBJ-BEACON` | Inland path behind Emergency Beacon needs **Splice Key** |
| Clocks | `HAZ-STORM`, energy HUD | **Shear window** turn budget + **bus** drain under stress |
| Escape | `OBJ-SHUTTLE`, `LOG-EXTRACT` | Lattice present at **drop skiff pad** before window = 0 |

Legal order unchanged: Key → beacon handshake → Lattice → pad.

---

## Ecology thesis

Scan pressure (tools, nests, drop afterglow) raises the **EM meter**. High EM widens fauna interest and taxes the bus. **Sealant Foam** flushes EM residue. Pattern desync stays; framing is residual array bleed, not franchise scanners.

Early food chain (sectors 0–1 voice):

1. **Scar Mites** — graze residual field-array bleed on warm gear  
2. **Wash Spores** — bloom where mites stir shear-water EM; swell and burst  
3. **Pulse Wasps** — hunt bloom trails and anything broadcasting like a survey probe  

---

## Sector arc (15 beats)

All 15 sectors use Meridian names (Phase 2 fiction complete). Role/spine unchanged.

| # | ID | Name | Role |
|---|-----|------|------|
| 0 | plains | Relay Scar Flats | Drop; afterglow EM; scar mites |
| 1 | flood | Shearwash Basin | Standing shear-water; bus tax |
| 2 | canopy | Shear Canopy | Dense EM scatter; hunters |
| 3 | reef | Crystal Pulse Reef | Crystal scrub; reef skitters |
| 4 | spire | Array Mast Reach | Abandoned survey arrays |
| 5 | ruin | Crash Wreck Belt | Splice Key caches |
| 6 | beacon | Emergency Beacon | Splice handshake inland seal |
| 7 | trench | Inland Fault Cut | Inland after seal; deep fauna |
| 8 | duct | Bus Conduit Warren | Vent spines; duct drones |
| 9 | ash | Shear Ash Fields | Baseline radiation bus drain |
| 10 | brine | Pulse Brine Flats | Ion-brine pools before cache |
| 11 | vault | Contingency Cache | Spare Nav Lattice |
| 12 | fissure | Shear Fissure | Storm pressure climb |
| 13 | approach | Skiff Approach | Compact choke; pattern stress |
| 14 | ridge | Drop Skiff Ridge | Drop skiff pad; legal win |

---

## Field light (sim mechanic)

Illumination is a sim grid (`state.illumination`), not presentation-only:

| Source | Rules |
|--------|--------|
| Field lamp | Radius ≈ FOV×0.55; probe/sensor boost; **quiet ×0.45 intensity** |
| Plasma flare | Timed radiator (`life` ≈ stun window) |
| Beacon / skiff / hatch / quest | Small static radiators when explored |
| Biome ambient | Soft floor; ash/duct darker; **EM-HIGH** +scan wash |

**Gameplay:** `isLit` (≥0.12 tone-mapped) for microdart clear shots; soft **shadow** band for ambush preference and flare hints. FOV/explore memory stays binary. `LightView` draws from the same grid.

---

## Explicit do not

- Towns, shops, meta unlocks, overland map  
- Franchise names (Voyager, Starfleet, Isolinear, Type-9, tricorder, hypospray, Delta Quadrant, EPS as Starfleet jargon)  
- Fantasy magic  
- Big-bang GameScene / ECS / React HUD rewrite in this phase  

---

## Rename checklist (franchise → Halcyon)

| Old (avoid in player strings) | New |
|-------------------------------|-----|
| Voyager / U.S.S. Voyager | CSV Halcyon |
| Starfleet | Halcyon Survey Corps |
| Delta Quadrant / Site Theta-7 | Meridian Shelf |
| Isolinear Key | Splice Key |
| Isolinear handshake | splice handshake |
| Type-9 (pad / shuttle) | drop skiff pad |
| Nav Core | Nav Lattice |
| EPS (player-facing) | bus / life-support |
| tricorder | field array / survey probe |
| hypospray | field hypo |
| ion window (label) | shear window |

Internal IDs (`relay_key`, `nav_core`, `emStress`, sector ids) stay unless misleading.
