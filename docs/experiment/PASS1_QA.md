# Pass 1 QA — Adversarial Review (Wake + Shear)

> **Historical.** Canonical input on main: WASD moves immediately, `.` waits, live wake tells at the player's feet. Shift-peek / move preview / confirm-on-`.` are permanently cut (Wave 24). Peek or confirm recommendations in this file are not current work.

**Branch:** `feat/bold-experiment` · **Author:** QA · **Status:** complete  
**Inputs:** [`PASS1_DESIGN.md`](./PASS1_DESIGN.md), [`PASS1_ART.md`](./PASS1_ART.md)

---

## Oracle summary

| Check | Result |
|---|---|
| `npm run build` | **PASS** |
| `npm run playtest:smoke` | **PASS** — 4/8 wins (50%), 0 crashes, 0 illegal, allReachable |
| `npm run playtest:cohere` | **PASS** — 15 sectors, spine/legal assertions green |
| `npm run test:balance` (30 seeds) | **PASS** — 63.3% WR (19/30), lose-mix hp:8 / storm:3 / energy:0 / stuck:0 |
| Unit (`tests/game/pass1Presenters.test.ts`) | **PASS** — shear thresholds + wake mirror edge cases |

Smoke lose-mix: hp 3, storm 1, energy 0, stuck 0. Full suite inside 55–85% band; not structurally broken. Energy deaths at 0% — bus pressure is felt via HP/storm, not E-death.

---

## Success criteria (design §5)

| # | Criterion | Verdict | Notes |
|---|---|---|---|
| 1 | Wake-tell legibility | **FAIL (partial)** | Live-state tells work for visible enemies in notice range; **no move-preview ring** (Art deferred). Player cannot predict wake from a *queued step* before commit — core Into-the-Breach ask missing. |
| 2 | Single-glance Shear Pressure | **PASS (conditional)** | Center `SHEAR · STATE` readout + badge + frame corrosion + arc sweep are enough to name state with bars covered **after first transition flash**. Calm↔Charged boundary (~0.25) is subtle without the numeric badge. |
| 3 | Decision cadence (light/pressure every 5–10 turns mid-game) | **INCONCLUSIVE** | Autopilot cannot judge felt cadence. Code paths exist (stance toggles retune tells; shear demotes EM/bus/window). Needs human mid-sector play — not blocked on oracle. |
| 4 | Wonder beat (first-light sector entry) | **PASS** | `GameScene.startFirstLight()` + `LightView.applySweep()` still wired; wake overlay runs in same `applyFieldLighting()` pass without clobbering sweep. Not regressed by Pass 1 presenters. |
| 5 | Spine integrity | **PASS** | cohere + smoke green; causal extract path untouched. |
| 6 | Balance direction | **PASS** | 63.3% WR, diverse lose channels, 0% stuck. Directionally sane; not gating Pass 2. |
| 7 | No LCARS / silhouette audit | **NOT RUN** | Visual QA deferred — no headless silhouette pass. Art claims LCARS kill on branch; QA did not re-audit sprites this session. |

---

## Feel breaks & bugs (concrete)

### Wake tells (`WakeTells.ts`)

1. **Missing preview-on-queue (design Bet 1)** — Tells reflect *current* tile light/stance only. Stepping from shadow into lamp-light does not widen a notice ring on the destination until after the move resolves. Art acknowledged deferral; for QA this is a **criteria #1 fail**, not debt.

2. **Guard false positive** — `collectWakeTells` uses `dist <= aggro` for all non-ambush behaviors. `guard` AI engages at `dist <= 2 || lootTaken || (alerted && dist <= aggro)` (`ai.ts` ~446–448). Crawler (aggro 7) at Manhattan 4: **ring shows, crawler stays home**. Repro: unit test `flags guard false-positive` in `tests/game/pass1Presenters.test.ts`.

3. **Neutral scan-wash overload** — Enemies in notice range without `lightPrefer` get the same sallow ring as genuine dark/lit hunters. Wanderers (mite when not silenced, spore swell) show "you're noticed" but may only random-walk — **teaches wrong mental model** ("ring = wake").

4. **Cap at 8** (`MAX_WAKE_TELLS`) — Ninth+ closest visible threat gets no line. Dense nest / purge-wake scenarios can hide the bite you care about.

5. **Visibility gate** — Correct for fog, but ambush in shadow at aggro range **outside FOV** still gets a tell (darkBoost path). AI also wakes via `(playerDark && dist <= aggro)` without FOV. Mirror is consistent; **feels like ESP** if player hasn't seen the mite yet this turn.

6. **Quiet stance payoff** — Jammer correctly suppresses tells for mite/wasp/reef_skitter (`silenced()`). Verified in unit test. **Good.**

7. **Ion-front lit boost** — `effectiveAggro` adds +1 for lit-prefer under ion front; tell mirror includes this. Not manually fuzzed in-game; trust sim parity unless playtest says otherwise.

### Shear Pressure (`ShearPressure.ts`, `HudView.ts`, `GameScene.ts`)

1. **Dual-clock compression hides which leg is burning** — 62/38 blend is fine for one dial, but muting bus/window captions when `shear > 0.12` means a player at **Charged** cannot tell "storm closing" vs "bus empty" without reopening mental math. Urgency strip still flashes raw storm count at ≤80 turns — partial save.

2. **Early game reads Calm too long** — Fresh run: `value = 0` until meaningful window/bus drain. Design wanted press-your-luck; first ~sector feels like old dual-clock with extra chrome.

3. **State name is doing heavy lifting** — Corrosion/arc sweep deltas between Calm and Charged are modest. Screenshot test passes **only** because center readout and badge literally spell `SHEAR · CHARGED`. Diegetic object goal (Bet 2) not fully met — **label-backed, not purely visual**.

4. **EM demotion** — EM% dropped from meta/urgency when shear primary. Aligns with design. Oracle/autopilot unaffected.

### First-light / ignition (regression check)

- `releaseFirstLight()` on committed turn still clears sweep gate.
- Flare ignition path in `GameScene` (~1276) and `LightView.ignite()` untouched by wake/shear wiring.
- **No regression found.**

---

## Must-fix before Pass 2

| Priority | Item | Owner hint |
|---|---|---|
| **P0** | Move-preview wake ring on queued step (Into-the-Breach telegraph) | Art + input hook |
| **P1** | Guard (and audit sentinel/home behaviors) — tell predicate must match engage gate | `WakeTells.ts` mirror rules |
| **P1** | Differentiate neutral notice vs lit/dark prefer (glyph, dash pattern, or suppress wander/swell idle rings) | Art + `WakeTells.ts` |
| **P2** | Shear: expose *which leg* is driving state (split tick marks or pulse bus vs window sub-glyph) without restoring full dual-clock | Design + Art |

---

## Acceptable debt (Pass 2+)

- `MAX_WAKE_TELLS = 8` cap — revisit if nest density proves painful.
- Calm/Charged corrosion delta subtlety — polish pass once state-driven world bleed lands.
- Silhouette / LCARS relapse audit — schedule with vertical-slice art review.
- Decision cadence — human playtest note, not autopilot.
- Per-sector shear palette bleed (Art deferred).
- Audio stings on shear state transition.

---

## Message to Game Designer

You asked for "see the punch before you throw it." Pass 1 delivers **live-state sonar**, not **preview-on-queue**. That's half the Bet 1 thesis — players still learn wake by committing moves in lit footprints. Art timed out the input hook; I'm calling criteria #1 **failed**, not "good enough for Pass 2."

The guard false positive is on you too: you told Art to mirror `effectiveAggro`, but guard doesn't use aggro as engage range. Either narrow the tell to behaviors that actually chase, or change guard AI — pick one, don't ship both.

Shear Pressure is presentation-only and **honest** — sim clocks untouched, WR 63% with sane lose-mix. But the dial is **label-readable**, not **glance-readable**. I covered the numeric bars and still needed the words `SHEAR · ARCING`. If Pass 2 doesn't make Calm vs Charged obvious from corrosion/arc alone, you're still managing two clocks with extra steps.

WR is not your problem this pass. Stuck at 0%, energy deaths at 0%. The tension loop breaks on **telegraph timing**, not balance.

---

## Message to Art

Wake lines and pulse rings are **clean** — warm lamp / biolum-deep / scan-wash reads at a glance when the enemy kind matches. Quiet shrink works; I verified jammer suppression.

What's missing is the **ring on the ground before the step**. You documented the deferral; QA doesn't waive it. Without preview, the overlay is a fancy EM% — reactive decoration, not planning UI.

Shear chrome: badge + center flash on transition carry the state. Frame corrosion and arc sweep are **supporting cast**, not the lead. For the screenshot test I used your text labels, not pure diegesis. Push corrosion contrast harder at 0.25/0.5/0.75 thresholds, or accept that you're shipping a named state machine with vibes.

Don't hide bus/window reads without giving back **which leg hurts**. Muting captions at shear > 0.12 trades spreadsheet for guesswork. One icon flicker on the draining leg would fix it.

LCARS kill and silhouette audit: **not verified this pass.** Don't claim victory until QA runs black-silhouette sheets on the vertical slice.

---

## Tests added

- `tests/game/pass1Presenters.test.ts` — shear threshold mapping; wake jammer suppression; ambush dark/lit FOV edge; guard false-positive documentation.
