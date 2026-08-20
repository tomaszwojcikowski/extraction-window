# Pass 2 Art — Preview Wakes, Engage Parity, Shear Room-Economy

> **Historical.** Canonical input on main: WASD moves immediately, `.` waits, live wake tells at the player's feet. Shift-peek / move preview / confirm-on-`.` are permanently cut (Wave 24). Peek or confirm recommendations in this file are not current work.

**Branch:** `feat/bold-experiment` · **Author:** Art · **Status:** shipped (Pass 2 vertical slice)

Inputs: [`PASS2_DESIGN.md`](./PASS2_DESIGN.md), [`PASS1_QA.md`](./PASS1_QA.md)

---

## Shipped

### P0 — Move-preview wake ring

- **`wakeTellsAt(state, x, y)`** — pure helper; live tells call it at player tile, preview at queued destination.
- **Two-step move input** — first direction press queues footprint + preview ring; matching direction again commits (minimal input hook, no new `Action` types). During move tweens, one-deep `queuedAction` buffer unchanged.
- **Destination ground ring** — warm/phosphor halo at preview tile; tell lines originate from destination when preview active.
- **Quiet stance** — preview uses same `effectiveAggroAt` / jammer shrink as live tells.

### P1 — Engage-gate parity

- **`wouldNoticeEnemy`** mirrors `ai.ts` per behavior:
  - **guard:** `dist <= 2 || lootTaken || (alerted && dist <= aggro)`
  - **sentinel:** `dist <= aggro`
  - **ambush / wander / swell / skirmish / drain / hunter:** existing sim gates
- Live + preview share identical predicates via `wakeTellsAt`.

### P1 — Prefer-type ring differentiation

- **Lit-prefer / dark-prefer:** solid double pulse ring + warm lamp / biolum-deep line (actionable).
- **Neutral wander / swell (pre-burst):** corner-bracket glyph, lower alpha — awareness, not chase telegraph.

### P2 — Shear storm / bus sub-read

- **`computeShearPressure`** exposes `windowDrain`, `busDrain`, `drainingLeg`.
- **Top HUD tape strip:** storm tick marks vs bus capsule; draining leg pulses at Charged+ (corrosion > 0.12). No dual bars restored.

### New bet — Shear room-economy (minimal slice)

- **`PressureReveal.ts`** — at **Arcing+**, explored+visible `quest` / `exit` / `poi` tiles flicker arc tint (faster at Breaching). Presentation-only; no loot / reachability changes.

---

## Skipped / deferred

| Item | Why |
|---|---|
| Hover / hold-direction adjacent preview | Timebox; two-step queue covers P0 acceptance |
| Per-sector crack-path art on floor tiles | Generic arc flicker on optional tile kinds suffices for vertical slice |
| `MAX_WAKE_TELLS` cap raise | Design defer |
| Silhouette / LCARS re-audit | Post-P0 schedule |
| Full playtest suite | Timebox — `build` + unit tests only |

---

## Files touched

- `src/game/presenters/WakeTells.ts` — preview helper, engage parity, neutral brackets
- `src/game/presenters/ShearPressure.ts` — draining leg metadata
- `src/game/presenters/PressureReveal.ts` (new)
- `src/scenes/atmosphere.ts` — shear leg sub-glyphs on HUD strip
- `src/scenes/GameScene.ts` — preview wiring, pressure tints
- `src/game/input/InputController.ts` — two-step move queue
- `tests/game/pass1Presenters.test.ts` — guard/sentinel/preview tests

---

## Build

- `npm run build`
- Unit: `tests/game/pass1Presenters.test.ts`

---

## Message to QA

1. **Criteria #1 (preview telegraph)** — Press a direction once: destination ring + fauna tells appear before the step commits. Press the same direction again to commit. Toggle quiet while queued — preview ring should shrink live. Crawler at Manhattan 4 with no loot/alert: **no ring** (guard false-positive fixed).
2. **Ring honesty** — Wander/swell idle = corner brackets (low alpha). Lit/dark hunters = solid warm/biolum rings. Preview and live must match for the same tile.
3. **Shear sub-read** — Cover window/bus bar captions. At Charged+, storm tick marks vs bus capsule on top HUD tape — which leg pulses?
4. **Room-economy** — Force Arcing+ (`stormTurns` low or energy drain). Explored quest/exit/poi tiles should arc-flicker; Calm/Charged should not. Confirm no illegal reachability / auto-collect.
5. **Input change** — Moves are two-step when idle (queue → confirm). Re-run criteria #1 blind test with this flow.

Report telegraph timing before WR.

---

## Message to Game Designer

Preview ring lands via two-step direction input — ITB punch-before-throw without new sim types. Engage mirror now uses your guard gate verbatim; sentinel at aggro, wander/swell demoted to bracket language.

Shear leg sub-glyphs sit on the tape strip — one pulse, not two bars. Room-economy is three tile kinds × Arcing threshold flicker; enough to feel the shelf slip, not enough to paint fifteen sectors.

If two-step move feels heavy in human playtest, we can swap confirm to `.` wait or a dedicated key without touching wake math.
