# Extraction Window — Art Bible

The locked look: **Halcyon field kit on the Meridian Shelf.** Material story, not a UI kit.

**Canon:** [`../GEM.md`](../GEM.md) scope filter · [`../DESIGN_PRINCIPLES.md`](../DESIGN_PRINCIPLES.md) UI/feel rules · [`../V1.md`](../V1.md) pillars · [`../WORLD.md`](../WORLD.md) glossary.

**Code is the source of truth** for values; this doc explains intent and forbids drift:

| Token set | Owner |
|-----------|-------|
| Role palette — what a colour *means* (world + CSS chrome) | [`src/scenes/theme.ts`](../../src/scenes/theme.ts) — `Theme`, `ThemeCss` |
| Material palette — what a surface *is* | `theme.ts` — `Material` |
| Emitter colour temperatures | [`src/sim/light.ts`](../../src/sim/light.ts) — `LIGHT_TEMP` (re-exported as `LightTemp`) |
| Biome floor tint + ambient | `theme.ts` — `BIOME_FLOOR_TINT`, `BIOME_AMBIENT` |
| Sim ambient exitance | `light.ts` — `SECTOR_AMBIENT` |

Add a colour only by adding a **named material, role, or emitter** in those tables.
No ad-hoc hex anywhere in the painting layer — `src/scenes`, `src/game/views`,
`src/game/presenters`. A surface shown under different light is that material
times `shade`/`mix` from [`tex/color.ts`](../../src/scenes/tex/color.ts), never a
second hex. [`palette.test.ts`](../../tests/game/palette.test.ts) fails the build
on an inline colour, so this is a rule the reviewer no longer has to police.

---

## 1. The one-line look

Painted alloy cases scuffed back to bare metal, bone-white silkscreen legends, reflective hazard tape, brine corrosion, and whatever the local ecology is glowing with — lit by hooded work lamps and burning magnesium.

Nothing here is a starship bridge console. Nothing is a default sci-fi glow: every emitter has a motivated colour temperature and should be nameable by colour alone with the sprite hidden.

---

## 2. Palette roles

| Role | Token | Material story |
|------|-------|----------------|
| Structure | `ground`, `groundDeep`, `panel`, `panelEdge` | Wet basalt, damp deck plate, painted alloy, machined bevel |
| Ink | `ink`, `inkBright`, `inkDim`, `inkMute` | Silkscreen legend on a painted case — bone, never phosphor green |
| Ecology | `biolum`, `biolumDeep` | Fauna and vent bioluminescence: cold, wet, green-cyan |
| Failure | `rust` | Brine corrosion — damage, failure |
| Player marks | `flag` | Surveyor's flagging tape — objectives the player cares about |
| Stored charge | `tape` | Reflective hazard tape — the Bus |
| Window closing | `arc`, `arcWhite` | Shear heat, then arc blow-out at Breaching |
| Contamination | `scanWash` | Sallow EM-HIGH wash — sickly, unwelcome |
| Safe / standby | `safe` | Hatch standby, all-clear |
| Survey memory | `fog`, `memory` | Unseen vs remembered ground |

The `phosphor*` / `ionHazard*` / `danger` / `quest` / `energy` / `storm` aliases are
**gone**, along with the phosphor-terminal framing they carried. `palette.test.ts`
fails if any of them come back under those names.

### Emitter temperatures

Each emitter is a *thing*: hooded halogen (`lamp`), magnesium stick (`flare`), animal (`fauna`), sodium relay (`beacon`), pad floods (`shuttle`), pattern tech (`pattern`), flagging (`marker`), scan wash (`scan`), hatch standby (`standby`).

Because `theme.ts` re-exports the sim table, **palette and gameplay lighting cannot drift apart** — keep it that way. Light gameplay is sim illumination drawn by `LightView`, never Phaser Light2D. Tile hue, bloom pools, casts, and actor tints share flood energy (wrap + scrub); bloom dies in thicket the way brightness does; casts clip at opaque tiles and stay faint in the SHADOW band so presentation does not lie about ambush darkness. Bloom is a few uneven, low-alpha washes with ray wobble — soft spill, not chalky onion rings or nested white sparks on every emitter.

---

### Materials

Roles say what a colour *means*; materials say what a surface *is*. Wet basalt
(`rock`), painted deck (`deck`), damp conduit lining (`conduit`), seam depth
(`recess`), shelf scrub (`foliage`), fallen plate (`debris`), nest lining
(`nest`), standing brine (`brine`), the surveyor's suit, and the field contacts
each have a name. The two vocabularies stay disjoint — a material that duplicates
a role gives the drawing code two ways to say one thing, and the test rejects it.

Wall faces are per-sector (`t_wall_<sector>_<0..3>`): cliff / bulkhead / conduit
families with grit, fasteners, and a sparse biome accent — not three stamped
blocks tinted by lighting. Corridors also get weak wall sconces (permanent
`lightSources` with `fixture: 'sconce'`) so work lights exist beyond POIs;
ambush rooms stay dark by role.

---

## 3. Type

| Use | Font |
|-----|------|
| Data, HUD, logs | `FONT_DATA` — IBM Plex Mono |
| Display / titles | `FONT_DISPLAY` — Share Tech Mono |

Monospace only. `FONT` is deprecated; import `FONT_DATA`.

---

## 4. Tiles and space

- 24×24 procedural pixel art, `pixelArt: true`, `roundPixels: true`.
- **Pattern carries identity; tint is secondary** — a biome must read from floor pattern with tint removed. `BIOME_FLOOR_TINT` is a lift, not a costume.
- **Every sector owns its motif.** `FLOOR_DECAL` in [`tex/deluxe.ts`](../../src/scenes/tex/deluxe.ts)
  keys one ground story per `SectorId`, and no two may be palette swaps of each
  other: grit scatter (plains), stepped ledges (ridge), leaf litter over a root
  run (canopy), ripple rings (flood), crust cells (brine), calcified spurs
  (reef), fallout dunes (ash), a branching crack (fissure), churned lanes
  (approach), revetment boards (trench), a dropped slab with rebar (ruin),
  grating slats (duct), a bolt grid (spire), chevroned seals (vault), pad
  markings (beacon). Cross-checks worth keeping: plains must not drift into
  ridge's banding, and duct must stay bare parallel bars or it becomes brine.
- Light *behaves* per biome: scrub scatters (canopy/plains lift), brine reflects (cool and bright), ash chokes (dark warm-grey), duct swallows it.
- Terrain that changes rules must be silhouette-distinct before it is colour-distinct: `hazard`, `vent`, `scrub`, `rubble`, `sealed`, `tripwire`, `brine_pool`, `scrub_nest`.
- Ordinary ground stays dull. Saturated paint on a walkable tile reads as a rule
  the tile does not have.

---

## 4a. Hostiles

- **Silhouette is the behaviour, not the species.** `silhouetteFor` in
  [`tex/deluxe.ts`](../../src/scenes/tex/deluxe.ts) derives the body plan from the
  `EnemyDef` behaviour fields — never from `kind`. Adding a hostile that reuses an
  existing family should reuse its shape; a genuinely new question earns a new shape.
- Twelve plans: scuttler, bloom, darter, crouched, annelid, bulwark, turret, emitter,
  chassis, coil, reacher, aperture.
- **Elites and bosses are crowned, not redesigned.** Tier styling is runtime: the crown
  comes from `def.brand` at bake time, extra bulk from `en.tier` in `syncActors`.
- Two hostiles sharing a body plan must be far apart in colour. Enforced by
  [`huntStyles.test.ts`](../../tests/sim/huntStyles.test.ts) — distance ≥ 70 for peers,
  ≥ 40 where one is the elite of the other. Glyphs are unique across the roster.
- **Damage type has a temperature.** Kinetic reads warm (amber, orange, rust), ion reads
  cool (cyan, blue, violet). This is the one colour rule that survives biome tint.
- **An armed windup paints the tiles it threatens.**
  [`ThreatView.ts`](../../src/game/views/ThreatView.ts) hatches the ground using
  `enemyThreatTiles` from the sim, so the overlay cannot drift from what actually
  resolves. Colour encodes the answer, not the attacker: rust = brace it, sallow = leave
  the ring, hazard tape = held shot, arc-white = beam lane.

---

## 5. Chrome budget

Enforcing `DESIGN_PRINCIPLES` §2 and §7:

- Bars: HP · Shield · Bus · Window · XP. Meta line carries combat/EM plus **active** timers only — never a permanent equip dump.
- **Meters are instruments.** `drawMeter` in [`atmosphere.ts`](../../src/scenes/atmosphere.ts) draws a recessed trough with a machined lip, quarter ticks, and rust flecks when critical — never a flat filled rectangle. Badges stay stencilled plates with a colour tab (`drawStencilBadge`), not pills.
- **Chrome is stamped kit.** Context hints sit on a left-taped `drawHintPlate` note, modals on scuffed `drawFieldPanel` cases, Window urgency is a hard tape strip (no alpha breathe). Sector progress uses stencil ticks (`#` / `-`). Meta/log separators stay `/` or spaces — not middot dashboards. Title/end CTAs blink hard on/off like a dead lamp, never soft-fade.
- **One channel per beat.** When Shear owns the HUD, Window urgency and pulse stay suppressed.
- Wake tells cap at `MAX_WAKE_TELLS = 8` ([`WakeTells.ts`](../../src/game/presenters/WakeTells.ts)), nearest-first. Raising the cap requires a readability check, not a taste call.
- Juice ≤ ~200ms for notice/combat punches (~220ms for floats); climaxes may linger slightly. Empty corridor = zero Impact.
- HUD stat changes ease meters (~140ms) and stamp readouts (~90ms hard flash + 1px lift) — instrument motion, not soft UI pulses. Log feed does not stamp every turn.
- Context hints are a single line and **yield** by priority: vitals/tele urgency → drill teaching → one-shot coaches (peek teach).
- CSS hex strings (`'#rrggbb'`) are the same rule as `0x` paints — both must come from `Theme` / `ThemeCss`. Enforced by [`palette.test.ts`](../../tests/game/palette.test.ts).

---

## 6. Motion

- Turn-based cadence stays legible: no motion that outlives the turn it explains.
- Tile steps slide (~150ms). The surveyor takes a short hop so a one-tile move
  reads as a step; hostiles and escorts stay flat so packs stay readable.
  The personal lamp and tile wash travel with that hop (`LightView` move blend) —
  light does not snap to the destination ahead of the sprite.
- Camera cues are ranked, one per turn, profiled as punch / snap / pressure / bloom / reward / hush ([`EventCamera.ts`](../../src/game/presenters/EventCamera.ts)).
- Zoom scales map/entity layers, never the HUD.
- Never delay the input queue for an effect.

---

## 7. Rejects (anti-default)

Not this game's look, even when it is the fastest default:

- Purple/magenta neon cyberpunk; club glow; chromatic-aberration glitch
- LCARS / starship-bridge chrome: rounded elbow panels, orange-on-black bridge trim
- Phosphor-green terminal nostalgia (the deprecated aliases are a legacy, not a direction)
- Cream / terracotta poster art; pastel indie-cozy palettes
- SaaS chrome: pill buttons, rounded cards, drop shadows, gradient CTAs
- Emoji, or icon-only status with no text label
- Unmotivated glow — any emitter you cannot name as a physical object
- Bloom or FX that reads as light through walls while help says the pool stops at walls

---

## 8. Open art debt

Carried from [`../experiment/PASS4_ART.md`](../experiment/PASS4_ART.md):

| Item | State |
|------|-------|
| LCARS / silhouette audit | Hostiles (§4a), terrain (§4), and HUD meters/badges (§5) done |
| Per-sector crack-path art | Done — `drawPressureCrack` / `pressureRevealAt` overlay motifs at Arcing+ |
| `MAX_WAKE_TELLS` raise | Deferred — needs readability evidence |
| Breaching climax juice | Partial — hot crack motif + pinpricks at Breaching; full climax still deferred |

## 9. Gates

An art or chrome change ships when:

1. Biomes still read with tint removed — checked on the sheet's desaturated row, not asserted from memory.
2. No new hex outside `theme.ts` / `light.ts`; `npm run test:unit` enforces it.
3. Chrome budget respected — no new always-on element without removing one.
4. Art changes are eyeballed on the contact sheet — `npm run dev`, open `/sheet.html`.
   It bakes the real textures for every hostile, every sector floor (in colour and
   desaturated), every rule-changing tile, every wall family, every telegraph, and
   the field-kit meters/badges, so a silhouette collision, a palette-swap biome, an
   unpainted threat, or a flat UI bar shows up there before it reaches a run. If the
   browser cannot reach the dev server, start it as `npx vite --host 127.0.0.1` —
   the default binding is IPv6-only.
5. `npm run build` and `npm run playtest:smoke` pass; presentation-only changes must not move sim legality.
