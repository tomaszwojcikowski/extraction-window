# Pass 4 Art — Notice Impact, Peek Teach, Fluid Lock

**Branch:** `cursor/pass4-feel-polish-44bc` · **Author:** Art · **Status:** shipped (Pass 4 vertical slice)

Inputs: [`PASS4_DESIGN.md`](./PASS4_DESIGN.md), fluid-move merge on main

---

## Shipped

### ONE BET — Notice Impact

When a step / wait / stance causes fauna to **newly notice**, **newly alert**, or **start closing distance** while a wake tell is honest, punch presentation ≤~180ms:

| Beat | Presentation |
|---|---|
| Tell line | Flash to rust, thicken |
| Fauna ring | Pop scale + rust tint on sprite |
| Camera | Micro shake + atmosphere pulse |

- Triggered from pre/post `NoticeSnap` deltas in `NoticeImpact.ts` — **no new Actions**, no Phaser in `src/sim/`.
- Honesty: visible + `wouldNoticeEnemy`; jammer-silenced mites/wasps/skitters never Impact.
- Corridor with no fauna in range: **zero** Impact.
- Never delays input queue / never reintroduces confirm.

### P0 — Shift-peek first-use teaching

- Hint id `UI-HINT-PEEK-TEACH` on the existing hint-line channel (same family as `UI-HINT-COMMIT`).
- Fires once early (drill or sectorIndex ≤ 2) when live wake tells / notice-range threat is visible.
- Consumed via `scriptedFired.peek_teach` on successful Shift-peek **or** Escape dismiss.
- Escape still clears peek; Shift release clears; WASD still immediate move.

### P1 — Peek vs live dual-read + quiet shrink

While Shift-peek is held:

- **Live** tells at feet: dim dashed inkMute lines (where I am).
- **Peek** dest tells: heavier solid tape/lamp/biolum lines + thicker dest ring (what I'm aiming).
- Jammer `use` while peeking still uses `keepMovePreview` — dest wake shrinks same frame under fluid move.

### P1 — Fluid-lock copy

Player-facing strings locked:

- `UI-HELP-BODY` — WASD move · Shift peek · `.` wait (unchanged model, already correct)
- `UI-CONTROLS` — now includes `. wait`
- `UI-TUT-MOVE` — peeks + waits
- `UI-HINT-COMMIT` / `UI-HINT-PEEK-TEACH` — no confirm/queue language

PASS1–3 design/art docs that describe confirm-on-`.` remain **historical** (per PASS4_DESIGN doc debt). Not rewritten.

---

## Skipped / deferred

| Item | Why |
|---|---|
| Shear room-feel amplify | Design reject as second bet |
| WR band chase | Explicit reject this pass |
| LCARS / silhouette audit | Post-experiment debt |
| Breaching climax juice | One bet discipline |
| `MAX_WAKE_TELLS` raise | Design defer |

---

## Controls (Pass 4 — canonical)

- **WASD / arrows** — move immediately (one tile)
- **Shift+direction** — peek wake footprint (ghost + dest tells); release Shift to clear
- **`.`** — wait only
- **Escape** — clear peek, or dismiss peek-teach hint, else help

---

## Files touched

- `src/game/presenters/NoticeImpact.ts` (new)
- `src/game/presenters/PeekTeach.ts` (new)
- `src/game/presenters/WakeTells.ts` — dual-read layers + Impact flash
- `src/game/presenters/ActionFeedback.ts` — (unchanged patterns reused)
- `src/game/input/InputController.ts` — dismiss peek teach
- `src/game/views/HudView.ts` — peek-teach hint priority
- `src/scenes/GameScene.ts` — Impact juice, dual-read draw, teach wiring
- `src/data/lore.ts` — PEEK-TEACH + fluid-lock strings
- `tests/game/pass4Presenters.test.ts` (new)

---

## Build / tests

- `npm run build`
- `npm run test:unit` (incl. `pass4Presenters`)
- `npm run playtest:smoke` when time allows

---

## Message to QA

Adjudicate **feel under fluid move**, not Pass 3 confirm.

1. **Fluid intact** — WASD never waits for `.`; `.` is wait-only in help/tut/controls.
2. **Peek teach** — First fauna-adjacent corridor (early): hint line teaches Shift+dir without `?`. After one peek or Escape, never nags.
3. **Dual-read** — Hold Shift+dir: dashed lines at feet + solid heavier lines from ghost dest. Toggle jammer (`u` on scrambler) while peeking — dest ring/tells shrink same frame; peek survives.
4. **Notice Impact** — Step into mite notice: rust tell flash + fauna pop + micro kick, then settle. Empty corridor: silence. Quiet/jammer on silenced kinds: no false snap.
5. **Spine** — `build` + `playtest:smoke` green; stuck 0; WR direction only (not a gate).

If the snap on notice makes wake tells feel like prophecy, recommend merge of Pass 4 art. If it is only flash noise, kill the bet and keep hygiene.
