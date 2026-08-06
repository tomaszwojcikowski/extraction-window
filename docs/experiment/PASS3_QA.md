# Pass 3 QA — Confirm-on-Wait, Exit Stable, Commit Ghost

**Branch:** `feat/bold-experiment` · **Author:** QA · **Status:** complete  
**Inputs:** [`PASS3_DESIGN.md`](./PASS3_DESIGN.md), [`PASS3_ART.md`](./PASS3_ART.md), [`PASS2_QA.md`](./PASS2_QA.md)  
**Art commit reviewed:** `13da84c` (`feat: pass3 art — confirm-on-wait, exit flicker fix, commit ghost`)

Autopilot bypasses preview input (`applyAction` direct). Oracle validates spine/legal/WR direction — **not** confirm cadence, ghost honesty in play, or §5 human checklist. Headless-limited findings are marked.

---

## Oracle summary

| Check | Result |
|---|---|
| `npm run build` | **PASS** |
| Unit (`tests/game/pass1Presenters.test.ts`) | **PASS** — 20 tests |
| Unit (`tests/game/movePreviewQueue.test.ts`) | **PASS** — 5 tests |
| `npm run playtest:smoke` | **PASS** — 4/8 wins (50%), 0 crashes, illegal=0, allReachable |
| `npm run playtest:cohere` | **PASS** — 15 sectors, spine/legal/lore green |
| `npm run test:balance` (30 seeds) | **NOT RUN** — timebox; smoke WR 50% in band |

Smoke lose-mix: hp 3, storm 1, energy 0, **stuck 0**. Avg win turns ~417. WR direction flat vs Pass 2 smoke (50%). Autopilot never queues / never presses `.` to commit.

---

## Pass 2 / Pass 3 must-fix re-verification

| Item | Art claim | QA verdict | Evidence |
|---|---|---|---|
| **Pass 2 — preview math** | `wakeTellsAt` + dest ring unchanged | **PASS** | Shared predicate; unit lit-step preview ≠ live; `GameScene.wakePreviewContext` → `wakeTellsAt(st, dest)` |
| **Pass 2 — guard / sentinel / neutral** | Parity + brackets | **PASS** | Pass 1 presenter suite still green (guard dist 4 silent; sentinel; mite brackets) |
| **Pass 2 — draining leg** | Sub-glyphs + metadata | **PASS (code)** | `drainingLeg` still exposed; human 2s screenshot **not run** |
| **P0 — confirm on `.`** | Dir queues; `.` commits; no double-tap | **PASS (code path)** | `InputController`: move → `queueMovePreview` only; wait + preview → `toMoveAction` then commit; mid-tween still `queueAction` one-deep |
| **P0 — corridor rhythm** | 1 dir + 1 `.` per adjacent step | **PASS (idle path)** | Idle: each step needs dir then `.`. Mid-tween buffer still auto-fires moves without `.` (design-accepted bypass) |
| **P0 — same-dir re-aim** | Design: re-aim adjacent; Art: peek lead++ | **FAIL vs design / honesty** | `applyDirectionQueue` advances `lead`; `previewTile` shows far tile; `toMoveAction` still one adjacent step — **ghost dest ≠ landing tile when lead > 1** |
| **P0 — cancel / fade** | Escape/kit/non-move clear; ≤150ms fade | **PASS** | `clearQueuedAction` → `hideCommitGhost(true)` duration 150; confirm uses fade=false |
| **P1 — exit stable** | No arc flicker on exit | **PASS** | `PressureReveal.REVEAL_KINDS = {quest, poi}`; unit: exit null at Breaching all frames |
| **Finale — commit ghost** | α≈0.35 silhouette synced with ring | **PARTIAL** | Sprite α 0.35, same `applyFieldLighting` frame as ring — **honest only at lead=1**; lead≥2 lies |
| **Design accept — quiet while queued** | Preview shrinks same frame | **FAIL** | `use` (jammer) hits `clearQueuedAction` then commit — cannot toggle quiet **and** keep queue. Shrink only if quiet already active when queued |

---

## Success criteria / design §5 checklist

| # | Criterion | Verdict | Notes |
|---|---|---|---|
| 1 | **Wake blind test** | **HUMAN-GATE** | Not run. Autopilot blind. Code path can support prediction at lead=1; lead≥2 teaches wrong tile. |
| 2 | **Input feel — `.` ≤5 steps** | **FAIL (shipped UX)** | Confirm scheme works in code, but **help/tutorial still teach old model** (`MOVE … one tile per turn`; `WAIT . — hold position`). No in-game string says "`.` commits queued step." Players need a doc or discovery-by-stuck — **explicit merge block**. |
| 3 | **Shear screenshot** | **HUMAN-GATE** | Draining-leg code still present; labels-covered read not run. |
| 4 | **Room-economy** | **PASS (code) / HUMAN-GATE (feel)** | Quest/poi flicker at Arcing+; exit stable. Human "one press-your-luck decision" not run — but exit-as-optional confusion from Pass 2 is **closed in code**. |
| 5 | **Commit ghost honesty** | **FAIL** | lead=1: shared `wakeTellsAt` → honest. lead≥2: ghost + tells at peek tile; `.` moves adjacent only (`toMoveAction` ignores lead). **Block criterion hit.** No unit asserting preview dest === post-commit tile. |
| 6 | **Oracle** | **PASS** | cohere + smoke green; stuck 0; WR 50% direction-only |

### Design §5 "bold direction proven" layers

| Layer | Verdict |
|---|---|
| Wake tells + preview | **PASS** (Pass 2 hold) |
| Input rhythm (queue / `.` / re-aim) | **PARTIAL** — confirm-on-`.` yes; Art peek ≠ design re-aim; help opaque |
| Commit ghost | **FAIL** until peek honesty fixed |
| Shear Pressure dial | **PASS (code)** / human gate on glance |
| Room-economy exit stable | **PASS** |
| Pass 1 Bet 3 frozen | **PASS** — no regression in oracle |

**Bold direction proven?** **Not yet.** Oracle green ≠ loop proven. Two block-list items fire; human checklist 1–5 unfinished.

---

## Feel breaks & findings

### P0 — Commit ghost / peek honesty (`MovePreviewQueue.ts`, `GameScene.ts`)

1. **Peek lead breaks ghost honesty (BLOCK).** Same direction advances `lead`; preview ghost + `wakeTellsAt` render at `player + dir * lead`; `.` commits `{ move, dx, dy }` one tile. Corridor peek (dir×2, `.`) shows fauna footprint two tiles out, then lands one tile short. Design block: *Ghost dest tells ≠ post-commit tells.* Art documented peek as a feature; Design §3 asked adjacent re-aim only. **Fix:** clamp lead=1 (match design) **or** keep lookahead ring without wake/ghost at far tile **or** assert previewDest === commit tile in tests and never diverge.

2. **No honesty unit for commit path.** `movePreviewQueue.test.ts` celebrates lead=2 preview at (7,5) without asserting commit still targets (6,5). That test freezes the lie.

### P0 — Confirm discoverability (`lore.ts` help)

3. **Players need a doc (BLOCK).** `UI-HELP-BODY` / tut lines: WASD = move one tile; `.` = wait only. Ghost appears on first WASD with no commit until `.` — looks broken unless you read PASS3_ART. Design block: *players would need a doc to learn confirm.* Update help + tut + any context hint before merge conversation.

### P1 — Input / acceptance gaps

4. **Quiet-while-queued acceptance unmet.** Non-move clears queue; jammer `use` cannot shrink a live preview. If Design still wants that beat, quiet activation must not clear preview (or needs another toggle).

5. **Preview replaces live tells.** With queue active, `applyFieldLighting` draws only dest tells — live tile lines suppressed. Silhouette vs ghost distinguishes presence; tell dual-read (§4 QA criterion 2) is not implemented. Acceptable clutter trade if Design signs off; not a block-list item.

6. **Mid-tween bypass still teaches a second rhythm.** After first `.`, buffered directions during tween commit without `.`. Idle = confirm scheme; flowing = old roguelike spam. Design accepted; call it out so nobody "fixes" it as a bug mid-merge.

### P1 — Room-economy (closed)

7. **Exit stable — Pass 2 P1 closed.** `pressureRevealTint` never tints `exit`. Quest/poi still duty-cycle flicker at Arcing; Breaching faster/whiter. No sim/reachability touch. Headless cannot screenshot "one flickering optional" — code gate passes.

### P2 — Debt / human gates

8. **§5 human checklist unpaid:** wake blind prediction, shear labels-covered, room-economy articulable decision, confirm learned in ≤5 steps with real hands. Autopilot cannot adjudicate.

9. **Ambush-outside-FOV** — still parity; not reopened.

10. **Performance** — ghost + ring + tells in existing lighting pass; no spam stress measured (slice assumption).

---

## Merge recommendation

**Block.**

| Blocker | Why |
|---|---|
| **Ghost dest ≠ post-commit when lead > 1** | Explicit design block; peek feature as shipped |
| **Confirm UX opaque** | Help/tut still teach wait-only `.`; design block |
| **§5 human checklist** | Not run — do not call "bold direction proven" on oracle alone |

Not blockers: exit flicker (fixed), cohere/smoke (green), stuck% (0), WR band (smoke 50%).

**Unblock path (minimal):** (1) kill or demote peek so ghost/tells always match the one-tile commit dest + unit lock; (2) rewrite MOVE/WAIT help (+ tut) to teach queue → `.` commit → dir re-aims; (3) human smoke of §5 items 1–5 on 2–3 VS sectors.

---

## Breaching climax juice

**Dead weight for the merge thesis; optional post-merge polish only if humans ask for climax punch.**

Room-economy + exit-stable already sell Arcing/Breaching spatially in code. Palette crush / mote spike / tell intensity would duplicate shear chrome without fixing the real leftover gaps (honesty + discoverability). Do not schedule Breaching juice ahead of peek fix and help copy.

---

## Message to Art

Confirm-on-`.` **lands in the switchboard** — double-tap is dead, mid-tween buffer untouched, cancel fade is real, exit out of the flicker set. Commit ghost α and same-frame ring draw are fine **for lead=1**.

**Push back hard on peek:** You shipped corridor lookahead that **lies**. Ghost + wake at lead≥2, commit at lead 1. That is exactly the honesty block Design wrote. Design asked same-dir to re-aim the **adjacent** tile; you inventored a second planning language and didn't unit-lock commit dest. Either clamp lead or stop putting tells/ghost on the far tile.

**Help is wrong.** WASD does not move; `.` is not only wait. Ship copy with the input change or QA will keep blocking on "needs a doc."

Quiet-while-queued shrink is still impossible because `use` clears the queue — don't claim that acceptance until the clear rule changes.

---

## Message to Game Designer

Pass 2 closes that you owned are still green: preview math, guard mirror, brackets, draining metadata, and now **exit stable**. Oracle: cohere PASS, smoke 50% WR, stuck 0 — telegraph/spine not the failure mode.

Pass 3 **does not earn merge yet.** Two of your own block lines fire: ghost honesty under Art's peek, and confirm discoverability (help still teaches the pre-experiment model). I will not rubber-stamp "bold direction proven" on headless greens while a new player cannot state "`.` commits" from the game itself.

Accept animation-phase bypass and ambush FOV parity as before. Human §5 checklist remains unpaid — that is still the real proof, not WR.

**Breaching juice:** skip for merge; fix honesty + copy first. If three human sectors sing after that, reopen juice as optional chrome — not thesis.

---

## Tests observed (Art-shipped; QA did not add)

- `tests/game/movePreviewQueue.test.ts` — queue / lead advance / retarget / wall clamp
- `tests/game/pass1Presenters.test.ts` — exit null at Breaching; prior Pass 1–2 presenter coverage

**Missing (should land with unblock):** previewDest === commit tile for all queue states; help/lore regression that MOVE/WAIT strings mention confirm-on-wait.
