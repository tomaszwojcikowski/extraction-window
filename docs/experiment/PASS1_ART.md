# Pass 1 Art — Wake Tells & Shear Pressure

**Branch:** `feat/bold-experiment` · **Author:** Art · **Status:** shipped (Pass 1 vertical slice)

Design brief: [`PASS1_DESIGN.md`](./PASS1_DESIGN.md)

---

## Shipped

### Bet 1 — Wake tells (readable telegraph)

- **`src/game/presenters/WakeTells.ts`** — presentation mirror of `effectiveAggro` + ambush notice rules. Caps at 8 closest visible enemies.
- **Map overlay** — thin notice line player → fauna, double pulse ring on target. Warm lamp tint for lit-prefer hunters; biolum-deep for dark-prefer; sallow scan-wash for neutral notice.
- Wired in `GameScene.applyFieldLighting()` so tells refresh every anim tick while lamp/stance/FOV change — no new sim systems.

### Bet 2 — Shear Pressure chrome (one gauge)

- **`src/game/presenters/ShearPressure.ts`** — 0–1 dial from `stormTurns` (62%) + `player.energy` reserve (38%). Named states: **Calm → Charged → Arcing → Breaching**.
- **Diegetic HUD** — center readout flashes state name on transition; `SHEAR · STATE` badge leads badge row; frame corrosion via `drawHudStripChrome({ corrosion, accent })`; ion arc sweep speed/alpha via existing `createArcSweep.setPressure`.
- **Demoted secondary reads** — window + bus bar captions/values muted when shear > 0.12; EM% dropped from meta line and urgency strip when shear is primary.

### Prior art (already on branch — not reworked)

- Field-kit palette, LCARS kill, wall-shaped light pools, contact shadows, flare ignition, first-light sector sweep.

---

## Skipped / deferred

| Item | Why |
|---|---|
| Move-preview wake ring (queued step before commit) | Timebox — current tells track live lamp/stance; preview-on-hover needs input hook not touched this pass |
| Per-sector shear palette bleed into floor tints | Bet 2 chrome only; biome light identity already in `LightView` |
| Cast-shadow silhouette QA pass | Wall-aware casts + tip clip landed; species silhouette shapes still deferred |
| Full 15-sector reskin | Explicit non-goal per design brief |
| Audio stings for shear state transitions | Out of scope unless one-line sting requested |

---

## Files touched

- `src/game/presenters/WakeTells.ts` (new)
- `src/game/presenters/ShearPressure.ts` (new)
- `src/scenes/GameScene.ts` — wake overlay, shear readout, chrome corrosion, arc sweep drive
- `src/game/views/HudView.ts` — shear badge, demoted bus/window/EM reads

---

## Build

Run: `npm run build` (no full playtest this session per art timebox).

---

## Message to QA

Your adversarial pass on **feeling**:

1. **Wake-tell legibility** — Stand lit with a dark-prefer mite or wasp at the edge of notice. Do you see the line + ring *before* it moves/charges? Toggle quiet stance — does the tell shrink/disappear for silenced kinds? Try to find a move that should warn and doesn't (especially ambush in shadow vs lamp).
2. **Shear screenshot test** — Cover the numeric window/bus bars. Can you name Calm/Charged/Arcing/Breaching from the center readout + frame corrosion + arc sweep alone?
3. **False positives** — Any ring on fauna that never actually wakes? Log the enemy kind + your light stance.
4. **Spine** — Causal extract path unchanged; run `playtest:smoke` / `playtest:cohere` when you pick this up (art skipped full playtest).

Report qualitative breaks first, WR second.

---

## Message to Game Designer

Wake tells piggyback `effectiveAggro` and ambush `alerted` gates — same math you already balance, just visible. Shear Pressure is **presentation-only**: 62/38 window/bus blend with thresholds at 0.25/0.5/0.75. Sim clocks untouched.

If the dial feels too calm early or too hot late, tweak weights in `computeShearPressure` — one function, no turn.ts surgery. If tells lie (especially quiet jammer or ion-front lit boost), flag the enemy kind and I'll adjust the mirror rules in `WakeTells.ts` without touching AI.

Next art pass candidate: **preview ring on queued move** (Into the Breach punch-before-throw) once input presents ghost steps.
