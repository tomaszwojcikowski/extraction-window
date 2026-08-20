# Pass 4 QA — Notice Impact, Peek Teach, Fluid Lock

> **Historical.** Canonical input on main: WASD moves immediately, `.` waits, live wake tells at the player's feet. Shift-peek / move preview / confirm-on-`.` are permanently cut (Wave 24). Peek or confirm recommendations in this file are not current work.

**Branch:** `cursor/pass4-feel-polish-44bc` · **Author:** QA · **Status:** complete  
**Inputs:** [`PASS4_DESIGN.md`](./PASS4_DESIGN.md), [`PASS4_ART.md`](./PASS4_ART.md), [`PASS3_QA.md`](./PASS3_QA.md)  
**Art commit reviewed:** `9a37a97` (`feat: pass4 art — notice impact, peek teach, fluid-lock copy`)

> **Resolved since this report (Wave 4).** The two conditional code fixes landed: peek teach yields via `PEEK_TEACH_YIELDS_TO` (drill / tele / vitals), and chase Impact latches per enemy until it leaves notice (`pruneNoticeChaseLatch`). The hint line is now resolved once in `resolveHintLine`, so Escape no longer consumes a teach that was never displayed. The **human** gates below (Impact weight, Shift discoverability, dual-read glance) are still unpaid.

Adjudication is **feel under fluid move**, not Pass 3 confirm-on-`.`. Autopilot never Shift-peeks and never sees Impact juice. Oracle validates spine/legal/stuck/WR direction — **not** Impact weight, peek discoverability in play, or dual-read glance. Headless-limited findings are marked.

---

## Oracle summary

| Check | Result |
|---|---|
| `npm run build` | **PASS** |
| Unit (`tests/game/pass4Presenters.test.ts`) | **PASS** — 9 tests (Impact deltas, peek teach one-shot, fluid-lock copy) |
| Unit (`tests/game/pass1Presenters.test.ts`) | **PASS** — 20 tests (incl. exit null at Breaching) |
| Unit (`tests/game/movePreviewQueue.test.ts`) | **PASS** — 5 tests (adjacent peek; `previewMatchesCommit`) |
| Unit (tutorial / keymap / contextHints) | **PASS** — 37 tests |
| `npm run playtest:smoke` | **PASS** — 4/8 wins (50%), 0 crashes, illegal=0, allReachable |
| `npm run playtest:cohere` | **PASS** — 15 sectors, spine/legal/lore green |
| `npm run test:balance` (30 seeds) | **NOT RUN** — timebox; smoke WR direction-only (not a gate) |

Smoke lose-mix: hp 3, storm 1, energy 0, **stuck 0**. Avg win turns ~417. WR 50% direction-only vs prior Pass 3 smoke — flat, not a gate. Autopilot uses direct `applyAction` — never exercises Shift-peek, peek-teach hint, or Notice Impact presentation.

---

## Design pass / block criteria

| Criterion | Verdict | Evidence |
|---|---|---|
| **WASD never waits for `.`** | **PASS** | `InputController`: move → `commitTurnAction` immediately; `.` → `wait` only (`Keymap`). No queue-on-WASD / confirm-on-`.` path. |
| **Shift-peek findable without docs** | **PASS (code path) / HUMAN-GATE (feel)** | `UI-HINT-PEEK-TEACH` via `shouldShowPeekTeach` on hint line; consumed on peek or Escape. See P1 stomp vs drill. |
| **Notice Impact = tell → fight** | **PASS (unit causality) / HUMAN-GATE (weight)** | `noticeImpactIds` gates on visible + `wouldNoticeEnemy`; empty corridor / jammer silence unit-locked. Chase-every-step spam risk — see P1. |
| **Quiet shrinks peek live** | **PASS (code)** | `use` + peek → `keepMovePreview: true`; wake math respects jammer; same-frame `applyFieldLighting`. Human glance **not run**. |
| **Exit never flickers like quest/poi** | **PASS** | `PressureReveal.REVEAL_KINDS = {quest, poi}`; unit: exit null all Breaching frames. |
| **smoke / cohere green** | **PASS** | Both green; stuck 0. |

### Design block list (must not fire)

| Block if… | Fired? |
|---|---|
| Any confirm scheme returns | **No** — fluid move intact |
| Impact with no fauna/tell causality | **No** on unit cases; see P1 chase cadence nuance |
| Peek teaching is modal spam | **No** — one-shot hint line, not modal |
| stuck% spikes | **No** — stuck 0 / 8 |
| Player-facing copy says `.` commits moves | **No** — fluid-lock grep + unit |

---

## Checklist adjudication (Design §3–4 / Art message to QA)

### 1. Notice Impact — honesty / spam / quiet false positives

| Check | Verdict | Notes |
|---|---|---|
| Causal ids | **PASS (code)** | Newly noticed / newly alerted / enemy moved closer; requires post-turn visible + `wouldNoticeEnemy`. |
| Empty corridor silence | **PASS** | Unit: no enemies → `[]`. |
| Jammer / quiet silence | **PASS** | Mite/wasp/skitter silenced → no Impact (unit). Quiet = jammer timer (sim). |
| Still + already noticing | **PASS** | Unit: no spam while standing in range. |
| Player walks toward still noticer | **PASS** | `enemyMovedCloser` requires enemy tile change — no false chase on player approach. |
| Chase every approach step | **P1 RISK** | `chaseStart` name lies — **every** closer enemy step punches. Sustained chase = rust flash + shake per approach turn. Unit freezes that as feature. Headless cannot weigh "prophecy" vs "flash noise." |
| Juice delays input | **PASS** | `presentNoticeImpact` never sets `animating`; ≤180ms timer + sprite tween + micro shake only. |
| Multi-fauna nest | **P2** | No cap on Impact id count (unlike `MAX_WAKE_TELLS`); one camera shake shared — likely fine. |

### 2. Peek teach — one-shot + discoverability

| Check | Verdict | Notes |
|---|---|---|
| One-shot | **PASS** | `scriptedFired.peek_teach` via `markPeekTeachDone` on successful Shift-peek or Escape dismiss; unit locks show-then-never. |
| Early window | **PASS** | Drill (`tutorialActive`) or `sectorIndex ≤ 2`. |
| Threat gate | **PASS** | Live wake tells or visible `wouldNoticeEnemy` (mirrors WakeTells honesty). |
| Not modal | **PASS** | Hint-line channel only (`HudView` → `UI-HINT-PEEK-TEACH`). |
| Discoverability without `?` | **PARTIAL** | Code path exists; **HUMAN-GATE** on whether a new player finds Shift in the first fauna corridor. |
| Drill priority conflict | **P1 FAIL** | `HudView` **overrides** `contextHint` whenever `shouldShowPeekTeach`. Tutorial mechanic intentionally prioritizes stalker / fight / hatch coaching — peek teach stomps `UI-TUT-STALKER` / `UI-TUT-FIGHT` the moment the drill stalker is visible in notice/FOV. Design asked reuse of hint channel, not obliteration of the stalker beat. |

### 3. Dual-read live vs peek

| Check | Verdict | Notes |
|---|---|---|
| Live under peek | **PASS (code)** | `liveUnderPeek`: dim dashed `inkMute` from feet. |
| Peek dest | **PASS (code)** | Solid heavier tape/lamp/biolum + thicker dest ring; ghost α 0.35. |
| Quiet shrink while peeking | **PASS (code)** | `keepMovePreview` on jammer `use`; peek survives; tells recompute same frame. |
| Glance / readability | **HUMAN-GATE** | No screenshot; no unit on draw layers (Phaser). |

Peek honesty vs Pass 3: `MovePreviewQueue` is adjacent-only; `previewMatchesCommit` unit-locked. Pass 3 lead≥2 ghost lie is **closed**.

### 4. Fluid-lock copy grep

| Surface | Verdict |
|---|---|
| `UI-HELP-BODY` / `UI-CONTROLS` / `UI-TUT-MOVE` / `UI-HINT-COMMIT` / `UI-HINT-PEEK-TEACH` | **PASS** — WASD move · Shift peek · `.` wait; unit rejects queue/confirm/commits |
| Repo player-facing (`src/**/*.ts`) confirm-on-`.` / "commits queued" | **PASS** — no matches |
| `UI-HINT-UPLINK-HOLD` "press . to hold" | **OK** — uplink hold, not move confirm |
| `UI-WIN-BODY` "confirms drop skiff" | **OK** — narrative verb |
| PASS1–3 design/art docs | Historical per PASS4_DESIGN doc debt — not player-facing |
| Code comments ("queued destination") | **P2** — presenter comments only |

### 5. Exit stable still holds

**PASS.** `REVEAL_KINDS` unchanged; Pass 1 presenter suite still asserts exit null through Breaching frames. Quest/poi still flicker at Arcing+. No sim/reachability touch.

### 6. Oracle numbers

| Metric | Value |
|---|---|
| Smoke WR | 50% (4/8) |
| Crashes / illegal | 0 / 0 |
| Stuck | **0** |
| allReachable | true |
| Avg win turns | ~417 |
| Lose mix | hp 3, storm 1 |
| Cohere | 15 sectors PASS |

---

## Success criteria / design §6 layers

| Layer | Verdict |
|---|---|
| Fluid move | **PASS** |
| Live wake tells | **PASS** (Pass 1–2 hold; dual-read additive) |
| Shift-peek discoverable in play | **PARTIAL** — teach path shipped; drill stomp + human gate |
| Notice Impact | **PARTIAL** — causal units green; chase cadence + human weight unpaid |
| Shear + room-economy exit stable | **PASS** |
| Oracle | **PASS** |

**Bold feel proven?** **Not on headless alone.** Hard design blocks do **not** fire. Remaining risk is whether Impact reads as prophecy or noise, and whether peek teach lands without eating the drill.

---

## Feel breaks & findings

### P1 — Peek teach stomps drill coaching (`HudView.ts` vs `tutorialMechanic`)

1. **Hint override has no urgency / tutorial yield.** When `shouldShowPeekTeach` is true, HudView replaces whatever `contextHint` returned — including `UI-TUT-STALKER`, `UI-TUT-FIGHT`, tele, vitals. Drill stalker is ambush + in-FOV ⇒ `wouldNotice` ⇒ teach fires in the exact first fauna corridor. One-shot is good; **priority is wrong.** **Fix:** yield to `tutorialActive` mechanic hints and/or windup/tele/vitals; teach only when `contextHint` is idle coaching (or defer peek teach until post-drill / sectorIndex≥1).

### P1 — Notice Impact chase cadence (`NoticeImpact.ts`)

2. **Every closer step punches, not "chase start."** `chaseStart = p.wouldNotice && p.visible && enemyMovedCloser` — no edge latch. Corridor kite vs hunter = rust flash + camera shake every approach turn. Design thesis is resolve snap when tell becomes fight; sustained chase may be flash noise (block-adjacent if humans say so). **Fix:** latch per-enemy until leave-notice / lose-visible, or cool down (~N turns), or restrict chase punch to `newlyAlerted` + first closer step only. Add unit that still fauna + two closer steps does **not** Impact twice if latch chosen.

### P2 — Debt / human gates / missing locks

3. **§6 human checklist unpaid:** Impact causal read in play, Impact spam feel, Shift found ≤ first fauna corridor without `?`, dual-read + quiet-shrink glance, exit-vs-poi articulable. Autopilot cannot adjudicate.

4. **No dual-read / keepMovePreview integration unit** — only code inspection. Worth a thin pure-layer assert if Art exposes layer helpers; otherwise human.

5. **Presenter comments still say "queued"** (`WakeTells.ts`) — not player-facing; clean when touching.

6. **Ambush-outside-FOV parity** — still accepted; Impact correctly requires `visible` post-turn (no ESP beyond parity).

---

## Merge recommendation

**Conditional.**

Hard Pass 4 **block** lines do not fire: confirm scheme is dead, Impact units show fauna/tell causality, peek teach is not modal spam, stuck 0, fluid-lock copy clean, exit stable, smoke/cohere green.

Do **not** rubber-stamp "prophecy fulfilled" on oracle greens. Two code fixes should land before calling Pass 4 art merge-clean; human smoke still required for the bet.

| Conditional item | Why |
|---|---|
| Peek-teach hint priority | Drill stalker beat is eaten by teach in the first fauna window |
| Impact chase latch / cooldown | Sustained approach may be flash noise — bet-kill risk |
| Human 2–3 VS sectors | Impact weight + peek discoverability + dual-read glance |

Not blockers: fluid WASD, `.` wait-only copy, exit stable, jammer quiet false-Impact units, empty-corridor silence, Pass 3 peek-lead honesty (adjacent-only + `previewMatchesCommit`), oracle.

---

## Explicit fix list (for parent / Art)

1. **HudView peek-teach priority** — Do not override tutorial mechanic hints, windup/tele, or critical vitals. Teach when the hint line would otherwise be empty / low-priority, or after drill ends.
2. **Notice Impact chase cadence** — Latch or cool down `enemyMovedCloser` punches so sustained chase is not per-step shake; unit-lock the chosen rule.
3. **Human smoke (2–3 VS sectors)** — Confirm: Impact reads as the tell that woke; empty corridors stay silent; Shift found from teach without `?`; dual-read + jammer quiet shrink readable; exit still boring vs quest/poi flicker.
4. **Optional:** thin unit that `shouldShowPeekTeach` does not win over `UI-TUT-STALKER` when stalker windup visible.

If humans call Impact flash noise after (2), **kill the bet** and keep hygiene (peek teach fix + fluid lock + dual-read) only — per Design.

---

## Message to Art

Fluid move holds. Confirm-on-`.` is ash in input and in player-facing copy — fluid-lock grep is clean. Adjacent Shift-peek + `previewMatchesCommit` closes the Pass 3 lead lie. Dual-read layers and `keepMovePreview` quiet-shrink are wired correctly in code. Exit stable still green.

**Push back on Impact chase:** You unit-tested "punches on chase start" but implemented **every closer step**. That is how a bet becomes corridor strobe. Latch it or own the spam in writing after human hands.

**Push back on peek teach priority:** One-shot hint line is the right channel; stomping `UI-TUT-STALKER` in the drill's first fauna window is not "teach in the field" — it is fighting the drill for the same pixel. Yield to tutorial / tele.

Oracle cannot bless Impact weight. Ship the two fixes, then human smoke — do not ask QA to recommend on flash timers alone.

---

## Message to Game Designer

Pass 3 leftovers you cared about under fluid move are largely closed in code: no confirm resurrection, peek honesty adjacent-only, exit stable, help teaches wait-only `.`, stuck 0, smoke/cohere green.

Pass 4's **one bet** is not yet proven. Causal units look honest; chase cadence and unpaid human read are the remaining bet-kill risks. Peek-teach hygiene lands but currently steals the drill's stalker line — fix before calling discoverability done.

I will not recommend unconditional merge of Pass 4 art on headless greens. Conditional after priority + chase latch (or explicit Design accept of per-step chase juice) + human articulation of your §6 sentence on 2–3 VS sectors.

---

## Tests observed (Art-shipped; QA did not add)

- `tests/game/pass4Presenters.test.ts` — Impact deltas, jammer silence, empty corridor, peek teach one-shot, fluid-lock lore
- `tests/game/movePreviewQueue.test.ts` — adjacent peek / `previewMatchesCommit`
- `tests/game/pass1Presenters.test.ts` — exit stable + prior presenter coverage

**Missing (should land with conditional fixes):** peek-teach yields to tut stalker/tele; Impact chase latch/cooldown rule; optional keepPreview quiet shrink pure assert.
