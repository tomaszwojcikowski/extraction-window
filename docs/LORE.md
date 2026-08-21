# Extraction Window — Mission Lore Bible

Halcyon Survey Corps field logbook for Meridian Shelf extraction runs.
Tone: terse procedure + conflicting prior PADDs. No fantasy magic. All player-facing copy maps to entry IDs in `src/data/lore.ts`.

**Design bible:** [`docs/WORLD.md`](WORLD.md) (glossary, ecology thesis, rename checklist).  
**First-version scope:** [`docs/V1.md`](V1.md) (pillars, cut list, engine, ship gates, fiction audit).

---

## Mission Context

**LOC-VIRE7** — Class-M ridge **Meridian Shelf**.
CSV Halcyon drops a survey team after the long-range field array fails mid-transit. Drop skiff nav stack lost lock. Extraction closes under a shear/ion storm front.

**OBJ-NAVCORE** — Spare **Nav Lattice** stored inland at Contingency Cache (Halcyon depot).
**OBJ-RELAYKEY** — Emergency Beacon inland seal requires **Splice Key** recovered from Crash Wreck Belt caches.
**HAZ-STORM** — Shear window: hard turn budget. Bus / life-support reserve drains under ion stress (slow drip + hazards; Shear Ash Fields adds baseline drain).

---

## Causal Chain

1. **CAUSE-EM** — Field array / survey-probe EM agitates local ecology → hostile fauna packs.
   Player beat: `LOG-DROP` + EM-named hostiles + Field Array Pulse ranging.
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
| SEC-CANOPY | Shear Canopy | Dense EM scatter; hunters |
| SEC-REEF | Crystal Pulse Reef | Crystal scrub; reef skitters; early multiroom vent seal |
| SEC-SPIRE | Array Mast Reach | Abandoned survey arrays; EM intensifies |
| SEC-RUIN | Crash Wreck Belt | Prior wreckage; Splice Key in caches (guaranteed) |
| SEC-BEACON | Emergency Beacon | Sustained splice handshake opens inland path |
| SEC-TRENCH | Inland Fault Cut | Inland after seal; deep fauna |
| SEC-DUCT | Bus Conduit Warren | Vent spines; duct drones |
| SEC-ASH | Shear Ash Fields | Baseline radiation bus drain |
| SEC-BRINE | Pulse Brine Flats | Ion runoff sumps before cache |
| SEC-VAULT | Contingency Cache | Halcyon depot; spare Nav Lattice; pattern-buffer hook |
| SEC-FISSURE | Shear Fissure | Storm pressure climb toward the pad |
| SEC-APPROACH | Skiff Approach | Compact choke; storm shear; pattern stress |
| SEC-RIDGE | Drop Skiff Ridge | Drop skiff pad; win with synced Lattice before window = 0 |

**Crash Wreck Belt** — Remains of an earlier Halcyon ground survey that lost array lock and was abandoned. Contingency caches still hold Splice Keys for beacon authorization.

**Cache Sentinels** — Automated depot security. EM corruption flipped friend-or-foe; they treat active survey gear as hostile.

### Room quests

Optional side-room anomalies (≤1 per sector): salvage, purge (single-site) and the two-site vent_seal. Each bills a different resource — Power opportunity, HP, kit — and each grants a different extraction favor. Never required for extraction. Completing them can grant mission **PADD** pages (in-run codex; reset each seed). HUD shows an active QUEST tracker with step text and 1/N.

### Hostiles (early food chain)

- **Scar Mite** — grazes residual field-array bleed
- **Wash Spore** — blooms on stirred shear-water EM; swell burst
- **Pulse Wasp** — hunts bloom trails / probe signatures
- Later biomes: Array Feeder, Fault Skitter, Fissure Rift, Reef Skitter, Duct Drone

21 kinds across 8 behaviours. The roster is built so each family asks a
different question, and so the answer is readable before it lands:

| Family | Reads as | The question |
| --- | --- | --- |
| Wander / swell | Low scuttler; inflating pod | Ignore it, or kill the pod before it bursts? |
| Skirmish | Winged darter | It bites and gives ground — chase or let it go? |
| Ambush | Crouched, waiting | Light the room, or accept a strike from the dark? |
| Drain | Segmented siphon | Spend the Bus, or spend a filter? |
| Guard | Planted plated shell | Take the loot and wake it, or route around? |
| Sentinel — turret | Levelled barrel | Do not step into the arc while it is locked |
| Sentinel — emitter | Dish and lane prongs | Break the lane, or brace the beam? |
| Hunter — lunge | Coiled, raised head | Brace it, or clear the two-tile ring |
| Hunter — reach | Long swept limbs | Brace — it covers two tiles, so backing off fails |
| Hunter — zone | Ring around a core | Leave the ring; plating does nothing |

Elites and bosses are crowned versions of a family, not new creatures.

**Telegraphs.** An armed windup paints the ground it threatens, colour-coded by
the answer it wants: rust for a charge you can eat or interrupt, sallow wash for
the rift's pulse you have to step out of, hazard tape for a held shot, arc-white
for a beam lane. A two-tile charge overcommits and lands winded, so reading the
tell buys a free turn against it.

**Answers.** A windup is answered by leaving the painted ground or killing the
hostile mid-charge. Walk into a hostile to strike. Equip a Pulse Baton for on-hit
stun (and to pry adjacent sealed hatches). Flare can interrupt a held shot. There
is no separate brace or shove hotkey — those verbs stay cut until they earn a
letter (see [`DESIGN_PRINCIPLES.md`](DESIGN_PRINCIPLES.md) §8).

**Footing.** Anything knocked off balance — winded by its own two-tile charge, or
clipped by a baton / flare stun — eats the next strike clean (`LOG-PUNISH`), so
the setup turn buys a turn back instead of only denying one. The same currency
runs the other way: every hostile in contact past the first pries a point of
defence off the surveyor, to a limit of two. That is what a doorway is worth.

### Death drops

Hostiles may leave salvage on kill (depth-scaled chance). Never quest items.

## Terrain (sparse)

- Floor / rubble / scrub — open ground; scrub is sight-block only
- Vent / hazard / sump — ion stress drains bus (filter halves; hazard also burns)
- **Sealed hatch** — optional cache door; stand adjacent, open with Sealant Foam (`u`) or equip Pulse Baton then Enter / Space / `>`; opens a side cache. Never required for extract
- Hatch / beacon / shuttle — mission structures
- Landmark — decorative room centrepiece; nothing to interact with

## Ecology behaviors

Each biome signature hostile has a readable behavior (wander, swell burst, skirmish, ambush, drain, guard, sentinel hold, hunter chase). EM scrambler briefly silences mites/wasps — field-array EM is what agitates them. At EM-HIGH, quiet stance suppresses the contamination aggro bump (FOV cost stays).

## Away kit

Capacity 16 slots, and one clear tool per job — 18 kinds total.

| Tool | Job |
|------|-----|
| Field Hypo | Heal, and stop bleeding |
| Power Cell | Restore the bus, and resync a desynced pattern buffer |
| Sealant Foam | Purge EM contamination, or open an adjacent sealed hatch |
| Shield Charge | Repair plating mid-sector |
| Plasma Filter | Blunt ion damage |
| Field Array Pulse | See further |
| Nav Ping | Remember the layout |
| Plasma Flare, Plasma Microdart, Combat Stim | Fight |
| Unknown Salvage | The one gamble: scan it for kit, or take the backlash |

Equipment (two slots — tool and armor): Combat Knife, Pulse Baton; EVA Harness, Ablative Vest. Quest: Splice Key, Nav Lattice.

**Personal shields** — hits strike the shield pool before vitals; bleed bypasses it. Plating is a per-sector shield: it re-seats in full at each hatch, and Shield Charge is the mid-sector repair. Plasma damage halved while filter is active. Kinetic vs plasma (ion) damage types on hostiles.

**Away proficiency (in-run)** — kills, sector clears, room quests, and objective beats grant XP. Levels auto-boost stats and unlock passive field skills. Resets each mission; no cross-run meta.

Statuses: stun, bleed, plasma burn, expose — tick on turns; HUD glyphs beside vitals.

## Field audio

Away gear listens to local EM / ion stress. **Sampled ambient music beds**
(`public/audio/music/`) crossfade by mood (title / field / shear / critical / combat / end).
Each biome **colours** the shared field/shear beds (playback rate, band filters, optional
shear underlay) so hatch changes read as a new place without fifteen unique tracks.
Procedural biome drones stay as a quiet underlayer, with layout-grammar overlays.
One-shot SFX are synthesized (flare, ion, handshake, kit spend, grammar hatch-enter).
`m` mutes all buses. See `public/audio/music/CREDITS.md` for track provenance.

---

## Player Strings (IDs)

See `src/data/lore.ts` for the full registry.

---

## ADOM → Extraction Window

What classic ADOM did well, and how EW translates it (in-run only):

| ADOM strength | EW translation |
|---------------|----------------|
| Hunger / clocks | Dual clocks: **shear window** + **bus power** |
| Corruption | **EM contamination** from field-array tools / nests; tax + wider fauna aggro; flush with sealant; quiet suppresses EM-HIGH aggro bump |
| Unidentified items | **Unknown Salvage** crates — scan with `u` (risk of backlash) |
| Distinct dungeons | Biome gen + **scrub blocks sight**; brine hazard tax; vault loot-wake |
| Talent identity | **Skill forks** at L3/L5/L7 — pick 1 of 2 |
| Lore that matters | **PADD pages** grant lasting run mods (FOV, filter, quiet vault, DEF, window) |
| Side content | Three room quests with storm + kit payoffs, one per resource |
| Dense keyboard log | Mission log (`l`, collapsed by default) + causal floats / signal chips + sticky milestones |

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
