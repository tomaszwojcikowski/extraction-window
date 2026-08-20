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
`src/game/presenters`, `src/art`. A surface shown under different light is that material
times `shade`/`mix` from [`tex/color.ts`](../../src/scenes/tex/color.ts), never a
second hex. Field sprites are authored 48×48 PNG sheets in [`public/art/`](../../public/art);
pixels must snap to the named palette (or a hostile `def.color` shade).
[`palette.test.ts`](../../tests/game/palette.test.ts) fails the build
on an inline colour or a stray PNG pixel, so this is a rule the reviewer no longer has to police.

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
| Stored charge | `tape` | Reflective hazard tape — Power |
| Window closing | `arc`, `arcWhite` | Shear heat, then arc blow-out at Breaching |
| Contamination | `scanWash` | Sallow EM-HIGH wash — sickly, unwelcome |
| Safe / standby | `safe` | Hatch standby, all-clear |
| Survey memory | `fog`, `memory` | Unseen vs remembered ground |

The `phosphor*` / `ionHazard*` / `danger` / `quest` / `energy` / `storm` aliases are
**gone**, along with the phosphor-terminal framing they carried. `palette.test.ts`
fails if any of them come back under those names.

### Emitter temperatures

Each emitter is a *thing*: hooded halogen (`lamp`), magnesium stick (`flare`), animal (`fauna`), sodium relay (`beacon`), pad floods (`shuttle`), pattern tech (`pattern`), flagging (`marker`), scan wash (`scan`), hatch standby (`standby`).

Because `theme.ts` re-exports the sim table, **palette and gameplay lighting cannot drift apart** — keep it that way. Light gameplay is sim illumination drawn by `LightView`, never Phaser Light2D. Tile hue, bloom pools, casts, and actor tints share flood energy (wrap + scrub); bloom dies in thicket the way brightness does; casts clip at opaque tiles and stay faint in the SHADOW band so presentation does not lie about ambush darkness. Bloom is two soft ray-marched washes plus one core — spill, not onion rings or nested white sparks.

**Dynamic shadows (one language):** opaque tiles throw soft floor umbra from flood-lit faces (`occluderShadows.ts`). Bodies and ground kit get a single contact plant under the feet — no actor cast wedges, no furniture silhouette system (those fought the wall umbra). Umbra must not punch through stone or invent brightness in the SHADOW band. Reject drop-shadow filter stacks and fake through-wall casts.

---

### Materials

Roles say what a colour *means*; materials say what a surface *is*. Wet basalt
(`rock`), painted deck (`deck`), damp conduit lining (`conduit`), seam depth
(`recess`), shelf scrub (`foliage`), fallen plate (`debris`), nest lining
(`nest`), standing brine (`brine`), the surveyor's suit, and the field contacts
each have a name. The two vocabularies stay disjoint — a material that duplicates
a role gives the drawing code two ways to say one thing, and the test rejects it.

Wall faces are three family sheets (`t_wall_<cliff|bulkhead|conduit>_<role>_<wear>`)
with a biome lift at light time — not 180 per-sector stamps. Role (0–3) is neighbor
mass; wear (0–2) is a seed-stable 2×2 patch so a corridor weathers together without
wallpaper tiling.
Corridors also get weak wall sconces (permanent `lightSources` with
`fixture: 'sconce'`) so work lights exist beyond POIs; ambush rooms stay dark by role.

---

## 3. Type

| Use | Font |
|-----|------|
| Data, HUD, logs | `FONT_DATA` — IBM Plex Mono |
| Display / titles | `FONT_DISPLAY` — Share Tech Mono |

Monospace only. `FONT` is deprecated; import `FONT_DATA`.

---

## 4. Tiles and space

- 48×48 authored pixel sprites (`public/art/*.png`), `pixelArt: true`, `roundPixels: true`.
  Boot loads atlas sheets; runtime does not `generateTexture` from Graphics.
- **Pattern carries identity; tint is secondary** — a biome must read from floor pattern with tint removed. `BIOME_FLOOR_TINT` is a lift, not a costume.
- **Every sector owns its motif.** Floor painters in [`src/art/paint/floors.ts`](../../src/art/paint/floors.ts)
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
  [`src/art/silhouette.ts`](../../src/art/silhouette.ts) derives the body plan from the
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
  resolves. Incoming pack seats use `incomingFlankSeats` / `flankBoxTiles` from
  the same AI pick. Colour encodes the answer, not the attacker: rust = eat the charge,
  kill mid-windup, or step to a doorway before a second hunter seats; sallow = leave the ring; hazard tape = held shot;
  arc-white = beam lane.

---

## 5. Chrome budget

Enforcing `DESIGN_PRINCIPLES` §2 and §7:

- Bars: HP · Shield · Power · Window · XP. Meta line carries combat/EM plus **active** timers only — never a permanent equip dump.
- **Meters are instruments.** `drawMeter` in [`atmosphere.ts`](../../src/scenes/atmosphere.ts) draws a recessed trough with a machined lip, quarter ticks, and rust flecks when critical — never a flat filled rectangle. Badges stay stencilled plates with a colour tab (`drawStencilBadge`), not pills.
- **Chrome is stamped kit.** Context hints sit on a left-taped `drawHintPlate` note, modals on scuffed `drawFieldPanel` cases, Window urgency is a hard tape strip (no alpha breathe). Sector progress uses stencil ticks (`#` / `-`). Meta/log separators stay `/` or spaces — not middot dashboards. Title/end CTAs blink hard on/off like a dead lamp, never soft-fade.
- **Mission log is opt-in.** Bottom strip height is `0` until `l` opens `HUD_BOTTOM_LOG`. While closed, recent causal floats dock as plated chips (`SignalRail`) — confirm in the text feed, don’t keep a permanent ticker.
- **Title is an aperture.** `drawTitleWindow` is a recessed survey glass in the case lid (sight brackets, grit, stepped scan tick); mission ID / begin / footer sit on `drawMenuPlate` strips — not a floating text stack.
- **One channel per beat.** When Shear owns the HUD, Window urgency and pulse stay suppressed.
- Juice ≤ ~200ms for notice/combat punches (~220ms for floats); climaxes may linger slightly. Empty corridor = zero Impact.
- HUD stat changes ease meters (~140ms) and stamp readouts (~90ms hard flash + 1px lift) — instrument motion, not soft UI pulses. Log feed does not stamp every turn.
- Context hints are a single line and **yield** by priority: vitals/tele urgency → drill teaching → pillar coaches.
- CSS hex strings (`'#rrggbb'`) are the same rule as `0x` paints — both must come from `Theme` / `ThemeCss`. Enforced by [`palette.test.ts`](../../tests/game/palette.test.ts).

---

## 6. Motion

- Turn-based cadence stays legible: no motion that outlives the turn it explains.
- Tile steps slide (~130ms). The surveyor takes a short hop so a one-tile move
  reads as a step; hostiles and escorts stay flat so packs stay readable.
  Player and other movers tween in **parallel** (not stacked phases).
  Mid-hop lamp wash only tints cells that change; bloom/shadows step ~8×/hop.
  The personal lamp and tile wash travel with that hop (`LightView` move blend) —
  light does not snap to the destination ahead of the sprite.
- Camera cues are ranked, one per turn, profiled as punch / snap / pressure / bloom / reward ([`EventCamera.ts`](../../src/game/presenters/EventCamera.ts)).
- Hostile PNG frames: 0 patrol idle, 1 stride/alert, 2 windup. `setTexture` only when the key changes.
- Zoom scales map/entity layers, never the HUD.
- Never delay the input queue for an effect.

**Perf (do not tighten):**

- Actor/prop `setTexture` and FOV mote/threat redraw: once per `animFrame` (~420ms), not every Phaser `update`.
- Mid-hop lamp wash tints **dirty cells only**; bloom/shadows step ~8×/hop. Skip motes mid-hop.
- Field motes capped at 52 / 62 / 78 (Calm / Arcing / Breaching). Spike alpha/size, not uncapped count.
- Live `LightView.ignite` Graphics: at most one (reuse/restart). First-light front is one ADD circle, not a second full-grid lighting pass.
- No per-hostile idle tweens. No per-tile landmark scale tweens. No full-screen overlay that redraws every frame.

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
- Umbra that punches through opaque tiles or invents brightness in the SHADOW ambush band

---

## 8. Open art debt

Carried from [`../experiment/PASS4_ART.md`](../experiment/PASS4_ART.md):

| Item | State |
|------|-------|
| LCARS / silhouette audit | Hostiles (§4a), terrain (§4), and HUD meters/badges (§5) done |
| Per-sector crack-path art | Done — `drawPressureCrack` / `pressureRevealAt` overlay motifs at Arcing+ |
| Breaching climax juice | Done — mote spike at Arcing/Breaching + hotter shear_breach cue |
| Title/End kit-case chrome parity | Done — Wave 33 |
| Shear glance (tape + pulsing legs) | Done — Wave 34 |
| Quest vs cache pressure motifs | Done — Wave 35 |
| HUD chip overflow (+N) | Done — Wave 36 |
| Kit trough + plated detail | Done — Wave 37 |
| Minimap kit chrome + pips | Done — Wave 38 |
| Shear escalate audio stings | Done — Wave 39 |
| Contact sheet motif QA | Done — Wave 40 |
| Meridian hostile display names | Done — Wave 41 |
| Light-as-matter ignite + first-light front | Done — Wave 43 |
| Behavior-linked hostile frames | Done — Wave 44 |
| Windup-synced telegraphs | Done — Wave 45 |
| Combat/phaser contact juice | Done — Wave 46 |
| Arcing/Breaching field crush (no scanline) | Done — Wave 47 |
| Prop 4-frame + bloom pulse | Done — Wave 48 |
| Sector-enter bloom + handshake ignite | Done — Wave 49 |
| Animation sheet + motion/perf rules | Done — Wave 50 |
| Ground loot family silhouettes | Done — Wave 51 |
| Ion-front field tint / mote temperature | Done — Wave 52 |
| Ally/NPC idle·stride·assist frames | Done — Wave 53 |
| Blind/jam/marked diegetic wash | Done — Wave 54 |
| Help/PADD/bulletin modal tape parity | Done — Wave 55 |
| Wake Breaching weight + goal instrument pulse | Done — Wave 56 |
| Handshake pad stages + mapper memory wash | Done — Wave 57 |
| Sheet QA + ship `v1.6.0` | Done — Wave 58 |
| Authored PNG field sheets | Done — Wave 61: atlas load, 48px sprites, family walls, crack overlay |

## 9. Gates

An art or chrome change ships when:

1. Biomes still read with tint removed — checked on the sheet's desaturated row, not asserted from memory.
2. No new hex outside `theme.ts` / `light.ts`; `npm run test:unit` enforces it.
3. Chrome budget respected — no new always-on element without removing one.
4. Art changes are eyeballed on the contact sheet — `npm run dev`, open `/sheet.html`.
   It shows the real PNG atlas frames for every hostile, every sector floor (in colour and
   desaturated), every rule-changing tile, every wall family, every telegraph, and
   the field-kit meters/badges, so a silhouette collision, a palette-swap biome, an
   unpainted threat, or a flat UI bar shows up there before it reaches a run. If the
   browser cannot reach the dev server, start it as `npx vite --host 127.0.0.1` —
   the default binding is IPv6-only.
   After painting, `npm run art:export` rewrites `public/art/*.png`.
5. `npm run build` and `npm run playtest:smoke` pass; presentation-only changes must not move sim legality.
