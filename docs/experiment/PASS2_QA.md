# Pass 2 QA — Preview Wakes, Engage Parity, Room-Economy

> **Historical.** Canonical input on main: WASD moves immediately, `.` waits, live wake tells at the player's feet. Shift-peek / move preview / confirm-on-`.` are permanently cut (Wave 24). Peek or confirm recommendations in this file are not current work.

**Branch:** `feat/bold-experiment` · **Author:** QA · **Status:** complete  
**Inputs:** [`PASS2_DESIGN.md`](./PASS2_DESIGN.md), [`PASS2_ART.md`](./PASS2_ART.md), [`PASS1_QA.md`](./PASS1_QA.md)

---

## Oracle summary

| Check | Result |
|---|---|
| `npm run build` | **PASS** |
| `npm run playtest:smoke` | **PASS** — 4/8 wins (50%), 0 crashes, 0 illegal, allReachable |
| `npm run playtest:cohere` | **PASS** — 15 sectors, spine/legal assertions green |
| Unit (`tests/game/pass1Presenters.test.ts`) | **PASS** — 19 tests (Pass 1 + Pass 2 preview/parity/reveal) |
| `npm run test:balance` (30 seeds) | **NOT RUN** — timebox; smoke WR 50% in band |

Smoke lose-mix: hp 3, storm 1, energy 0, stuck 0. Autopilot bypasses two-step input (`applyAction` direct); oracle does not judge move cadence.

---

## Pass 1 must-fix re-verification

| Pass 1 item | Art claim | QA verdict | Evidence |
|---|---|---|---|
| **P0 — move-preview ring** | `wakeTellsAt` + destination halo + two-step queue | **PASS** | Pure helper at `WakeTells.ts:118`; `GameScene.wakePreviewContext()` wires queued dest; unit: lit-step preview differs from live; `drawWakeTells` renders `previewDest` ring |
| **P1 — guard false positive** | Mirror `ai.ts` guard gate | **PASS** | `wouldNoticeEnemy` guard case matches `ai.ts:446–448`; crawler dist 4 → no ring; dist 2 / loot / alerted → ring; old `flags guard false-positive` test inverted |
| **P1 — sentinel parity** | `dist <= aggro` | **PASS** | Unit: sentinel dist 3 in aggro 5 → ring |
| **P1 — neutral vs prefer rings** | Brackets for wander/swell; solid for lit/dark | **PASS** | `neutralNotice` + `drawCornerBrackets` vs double pulse rings; unit: mite neutral, wasp lit-boost on lit tile |
| **P2 — shear draining leg** | `drainingLeg` + tape sub-glyphs | **PASS (code)** | `computeShearPressure` exposes `windowDrain`/`busDrain`/`drainingLeg`; `atmosphere.ts` storm ticks vs bus capsule pulse at `corrosion > 0.12`. Headless cannot screenshot-cover labels — defer human 2-second read |

---

## Pass 2 success criteria (design §6)

| # | Criterion | Verdict | Notes |
|---|---|---|---|
| 1 | **Preview telegraph** | **PASS (conditional)** | Queue → ring + tells at destination before commit; quiet shrinks via shared `effectiveAggroAt`. **Blind prediction test** (≤ Pass 1 false-predict baseline by turn ~20) **not run** — requires human with two-step flow. Autopilot never exercises preview input. |
| 2 | **Tell honesty** | **PASS** | Zero guard false positives in unit suite; preview/live parity test on same tile; swell pre-burst bracketed. Ambush-outside-FOV still parity (design accepted). |
| 3 | **Shear legibility** | **PASS (partial)** | Sub-glyphs + room-economy tint improve glance read. Center `SHEAR · STATE` text still carries weight at Calm↔Charged boundary. Screenshot-with-labels-covered: **not run** this session. |
| 4 | **Room-economy beat** | **PASS (partial)** | `PressureReveal.ts` gates quest/exit/poi flicker at Arcing+; Calm null in unit test; no sim/reachability touch. **Human “one press-your-luck decision per room” not run.** Exit flicker may read as mandatory-path noise (see below). |
| 5 | **Spine integrity** | **PASS** | cohere + smoke green |
| 6 | **Balance direction** | **PASS (smoke only)** | 50% smoke WR; no stuck; diverse lose channels. Full 30-seed not re-run. |

---

## Feel breaks & findings

### P0 preview (`WakeTells.ts`, `GameScene.ts`, `InputController.ts`)

1. **Preview math is honest** — `wakeTellsAt(st, dest)` shared by live and preview; destination ring + lines from dest tile. Verified stepping shadow→lit widens lit-boost on preview only.

2. **Two-step move when idle** — First direction press queues + shows preview; matching direction commits. Non-move actions clear queue. During animation, one-deep queue bypasses confirm (unchanged Pass 1 buffer). **Feel concern:** every idle step costs 2 keypresses; re-aiming overwrites queue (good) but habitual roguelike players will feel input tax before they learn the preview loop.

3. **Quiet live-shrink** — Jammer shrinks aggro via `effectiveAggroAt` (sentinel dist 5 in/out of range verified). Silenced kinds (mite/wasp/reef_skitter) correctly suppressed entirely.

### P1 engage parity

4. **Guard gate fixed** — No ring at Manhattan 4 without loot/alert; ring at dist 2, loot-taken extended, alerted+aggro. Matches sim.

5. **Neutral brackets** — Wander/swell pre-burst flagged `neutralNotice`; lower alpha brackets vs solid hunter rings. QA can distinguish “might shuffle” vs “lit hunter” from unit flags; in-game contrast adequate for slice.

### P2 shear sub-read

6. **Draining leg exposed** — `drainingLeg` flips storm vs bus; tape strip glyphs pulse the hot leg. Bus-only drain case covered in unit test. Human 2-second storm-vs-bus quiz still needed with captions covered.

### Room-economy bet (`PressureReveal.ts`)

7. **Arcing+ flicker works technically** — Explored+visible quest/exit/poi tiles get arc tint on flicker frames; Breaching faster/whiter; unseen/unexplored skipped (no ESP).

8. **Helps glance-read at Arcing** — Optional tiles that were static at Calm gain motion — shelf “slips.” Contrast vs Calm is real.

9. **Confusion risk** — **Exit tiles flicker the same as quest/poi.** Exit is not optional press-your-luck; pulsing exit may read as “new optional detour” rather than “storm stress.” Generic arc tint on all three kinds doesn’t differentiate cache vs bypass vs exit. Flicker duty cycle (~⅓ frames at Arcing) can look like rendering glitch if player doesn’t know the bet.

10. **No illegal states** — Presentation-only tint; cohere/smoke green; no auto-collect or reachability change found in code review.

### Input regression

11. **Autopilot blind spot** — Headless playtest never double-taps. Preview acceptance is code-verified; cadence/WR impact unknown until human or autopilot teaches confirm step.

---

## Must-fix before Pass 3

| Priority | Item | Owner hint |
|---|---|---|
| **P0** | Human blind test: queued-step wake prediction by turn ~20; track false predictions vs Pass 1 live-tell baseline | QA + human |
| **P1** | **Soften two-step move** — add `.`/Space confirm (or hold-to-preview) so direction keys aren’t double-tapped every idle step; keep preview ring | Art + input |
| **P1** | Room-economy: **stop flickering exit tiles** or use distinct glyph; reserve arc flicker for quest/poi optional caches | Art |
| **P2** | Human screenshot test: shear state + draining leg with center readout and bar captions covered | QA |
| **P2** | Human room-economy note: one articulable press-your-luck spatial decision per mid-sector room at Arcing+ | QA + human |

---

## Acceptable debt (Pass 3+)

- `MAX_WAKE_TELLS = 8` cap — design defer stands.
- Ambush-outside-FOV tell — parity accepted; preview should soften sting (watch in human test).
- Silhouette / LCARS re-audit — still not run.
- Per-sector crack-path floor art — generic flicker sufficient for slice.
- Calm↔Charged corrosion delta subtlety without text.
- Full 30-seed balance re-run — smoke green; not blocking.
- Audio sting for room-economy flicker — optional.

---

## Message to Art

Preview ring **lands**. `wakeTellsAt` is the right abstraction — live and preview share one predicate path, and the destination halo reads before commit. Guard false positive is **dead**; sentinel and swell bracket tests green. Quiet shrink on preview matches live. P0 and P1 mirror work is shippable.

**Push back on two-step move:** I’m not calling for revert, but **soften before Pass 3.** Two taps per idle step is ITB-accurate and passes acceptance on paper, yet this isn’t a grid tactics game with one move per turn — it’s a roguelike where you may hammer directions for forty turns. Animation-phase queue bypass helps flow mid-chain, but standing still costs double input. Your `.`/wait escape hatch is the right fix: queue on direction, confirm on wait, re-tap direction to re-aim without committing. Don’t make players double-tap north forty times to cross a corridor.

Neutral brackets vs hunter rings: **keep.** Wander no longer screams chase. Good.

Shear sub-glyphs: code path is there; I believe the storm ticks vs bus capsule until a human covers the text.

**Room-economy:** Arcing flicker **helps** peripheral “something opened up” read, but **exit in the same bucket as quest/poi confuses.** Flicker the optional caches; leave exit stable or give it a different stress language. Right now it can look like a GPU hiccup or a fake optional path on the mandatory route.

---

## Message to Game Designer

Pass 1 failures you owned are **fixed in code**: preview-on-queue, guard mirror, neutral differentiation, draining-leg metadata. Criteria #1 moves from **fail to conditional pass** pending human blind test.

**Double-tap:** Accept the input hook for Pass 2 closure; **do not bake it in as final feel.** Recommend confirm-on-wait for Pass 3 unless human playtest proves players prefer double-tap after three sectors. Autopilot can’t adjudicate — WR stayed 50% smoke but says nothing about input weight.

**Room-economy bet:** Directionally correct — Arcing changes the shelf without touching sim. Calm/Charged sealed, Arcing+ obvious in code. Two gaps: (1) exit flicker undermines “optional press-your-luck” thesis; (2) one generic tint for all optional kinds doesn’t yet support “detour for cache vs hold corridor.” Enough for vertical slice; tighten before calling Bet 2 glance-readable.

Shear is still **label-assisted** at low thresholds; sub-glyphs + world flicker are progress, not full diegesis. WR isn’t the headline — you were right. Telegraph timing is better; spatial pressure needs human eyes.

**Ambush-outside-FOV:** Preview softens it in theory (player chose the step). I’ll watch in human test; not reopening as bug.

---

## Tests added / extended

`tests/game/pass1Presenters.test.ts` — Pass 2 coverage:

- Preview/live tell parity at same tile
- Guard alerted extended range
- Swell pre-burst neutral notice
- Quiet jammer aggro shrink (sentinel edge)
- `pressureRevealTint` — Calm null, Arcing tint, unseen skip
