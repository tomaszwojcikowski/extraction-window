# Extraction Window — Art Bible

The locked look: **Halcyon field kit on the Meridian Shelf.** Material story, not a UI kit.

**Canon:** [`../GEM.md`](../GEM.md) scope filter · [`../DESIGN_PRINCIPLES.md`](../DESIGN_PRINCIPLES.md) UI/feel rules · [`../V1.md`](../V1.md) pillars · [`../WORLD.md`](../WORLD.md) glossary.

**Code is the source of truth** for values; this doc explains intent and forbids drift:

| Token set | Owner |
|-----------|-------|
| Palette (world + CSS chrome) | [`src/scenes/theme.ts`](../../src/scenes/theme.ts) — `Theme`, `ThemeCss` |
| Emitter colour temperatures | [`src/sim/light.ts`](../../src/sim/light.ts) — `LIGHT_TEMP` (re-exported as `LightTemp`) |
| Biome floor tint + ambient | `theme.ts` — `BIOME_FLOOR_TINT`, `BIOME_AMBIENT` |
| Sim ambient exitance | `light.ts` — `SECTOR_AMBIENT` |

Add a colour only by adding a **named material or emitter** in those tables. No ad-hoc hex in views or presenters.

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

Deprecated aliases (`phosphor*`, `ionHazard*`, `danger`, `quest`, `energy`, `storm`) exist for old call sites. **New code uses the current names**; do not reintroduce the phosphor-terminal framing they came from.

### Emitter temperatures

Each emitter is a *thing*: hooded halogen (`lamp`), red night filter (`lampQuiet`), magnesium stick (`flare`), animal (`fauna`), sodium relay (`beacon`), pad floods (`shuttle`), pattern tech (`pattern`), flagging (`marker`), scan wash (`scan`), hatch standby (`standby`).

Because `theme.ts` re-exports the sim table, **palette and gameplay lighting cannot drift apart** — keep it that way. Light gameplay is sim illumination drawn by `LightView`, never Phaser Light2D.

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
- Light *behaves* per biome: scrub scatters (canopy/plains lift), brine reflects (cool and bright), ash chokes (dark warm-grey), duct swallows it.
- Terrain that changes rules must be silhouette-distinct before it is colour-distinct: `hazard`, `vent`, `scrub`, `rubble`, `sealed`, `tripwire`, `brine_pool`, `scrub_nest`.

---

## 5. Chrome budget

Enforcing `DESIGN_PRINCIPLES` §2 and §7:

- Bars: HP · Shield · Bus · Window · XP. Meta line carries combat/EM plus **active** timers only — never a permanent equip dump.
- **One channel per beat.** When Shear owns the HUD, Window urgency and pulse stay suppressed; Quiet is badge plus log, not badge plus float plus camera.
- Wake tells cap at `MAX_WAKE_TELLS = 8` ([`WakeTells.ts`](../../src/game/presenters/WakeTells.ts)), nearest-first. Raising the cap requires a readability check, not a taste call.
- Juice ≤ ~200ms for notice/combat punches (~220ms for floats); climaxes may linger slightly. Empty corridor = zero Impact.
- Context hints are a single line and **yield** by priority: vitals/tele urgency → drill teaching → one-shot coaches (peek teach).

---

## 6. Motion

- Turn-based cadence stays legible: no motion that outlives the turn it explains.
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
| LCARS / silhouette audit | Open — sweep chrome and terrain silhouettes against §4 and §7 |
| `MAX_WAKE_TELLS` raise | Deferred — needs readability evidence |
| Breaching climax juice | Deferred — one-bet discipline |
| Per-sector crack-path art | Deferred |

## 9. Gates

An art or chrome change ships when:

1. Biomes still read with tint removed.
2. No new hex outside `theme.ts` / `light.ts`.
3. Chrome budget respected — no new always-on element without removing one.
4. `npm run build` and `npm run playtest:smoke` pass; presentation-only changes must not move sim legality.
