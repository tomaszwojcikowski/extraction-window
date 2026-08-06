# Pass 3 Art — Confirm-on-Wait, Exit Stable, Commit Ghost

**Branch:** `feat/bold-experiment` · **Author:** Art · **Status:** shipped (Pass 3 vertical slice)

Inputs: [`PASS3_DESIGN.md`](./PASS3_DESIGN.md), [`PASS2_ART.md`](./PASS2_ART.md)

---

## Shipped

### P0 — Move preview input (confirm on `.`)

| Input | Behavior |
|---|---|
| **Direction** | Queue adjacent step; show destination ring + `wakeTellsAt(dest)` + commit ghost. Does **not** move. |
| **Same direction again** | Re-aim — advance preview one tile along vector if walkable; otherwise hold current preview. |
| **Other direction** | Retarget queue + preview to new adjacent tile. |
| **`.` (wait)** | Commit queued step (one tile); clear queue. With no queue, pass turn as before. |
| **Escape / kit / non-move** | Clear queue + preview (150ms ghost fade). |
| **During move tween** | One-deep animation queue unchanged — no `.` spam mid-chain. |

`wakeTellsAt` math and destination ring unchanged from Pass 2. Quiet stance still shrinks preview live.

### P1 — Room-economy: exit stable

- **`PressureReveal.ts`** — arc tint flicker on **`quest` and `poi` only** at Arcing+.
- **Exit tiles** — no flicker at any shear state; mandatory route reads stable.

### Finale bet — Commit ghost

- Semi-transparent player silhouette (`playerTextureKey`, **α ≈ 0.35**) at queued destination.
- Drawn same frame as wake preview ring; hidden when no queue.
- Re-aim moves ghost + ring together; confirm snaps into live player tween; cancel fades ≤150ms.

---

## Skipped / deferred

| Item | Why |
|---|---|
| Breaching climax juice (palette crush, mote spike) | Design defer — room-economy sells pressure spatially |
| Full playtest suite | Timebox — `build` + presenter unit tests only |
| LCARS / silhouette sector audit | Post-merge schedule |
| `MAX_WAKE_TELLS` cap raise | Design defer |

---

## Controls (Pass 3)

- **Arrows / WASD** — queue a step (preview ring + ghost + wake tells)
- **`.`** — confirm queued step
- **Same direction while queued** — peek one tile further along that line (walkable only)
- **Other direction while queued** — retarget preview
- **Escape** — clear queue (opens help when kit closed)
- **Mid-tween** — latest direction/action buffers one-deep (unchanged)

---

## Files touched

- `src/game/input/MovePreviewQueue.ts` (new) — queue / re-aim / preview tile helpers
- `src/game/input/InputController.ts` — confirm-on-wait, re-aim on direction
- `src/game/presenters/PressureReveal.ts` — exit removed from flicker set
- `src/scenes/GameScene.ts` — move preview queue, commit ghost sprite
- `tests/game/movePreviewQueue.test.ts` (new)
- `tests/game/pass1Presenters.test.ts` — exit stable at Breaching

---

## Build

- `npm run build`
- Unit: `tests/game/pass1Presenters.test.ts`, `tests/game/movePreviewQueue.test.ts`

---

## Message to QA

1. **Input feel (P0)** — Corridor traverse: **one direction press + one `.` per tile**, not double-tap. After ~5 queued steps, confirm you can state "`.` commits, direction re-aims" without the doc.
2. **Preview honesty** — Shadow → lit queued step shows widened notice ring **before** `.`. Toggle quiet while queued — ring shrinks same frame. Ghost dest tells must match post-`.` tells on same tile/stance.
3. **Commit ghost** — Silhouette at destination syncs with ring; no lag frame; cancel (Escape / kit) fades ≤150ms; no double-read confusion between live tile and ghost dest.
4. **Room-economy (P1)** — Arcing+ screenshot: **one flickering optional** (quest/poi); **exit never flickers**. No reachability / auto-collect regression.
5. **Spine** — `playtest:cohere` + `playtest:smoke` are your gate; this pass only ran build + unit tests.

Run the human checklist in PASS3_DESIGN §5 before merge recommendation.

---

## Message to Game Designer

Double-tap is dead. Direction queues the held breath; `.` commits it. Same vector peeks one tile ahead for corridor planning without costing an extra confirm per step.

Exit is boring on purpose — only optional caches breathe at Arcing+. Commit ghost closes Bet 1: you see the sentence at your feet before you say it.

If corridor + ghost + `.` sing in three sectors, the experiment earned its merge conversation. Breaching juice stays post-merge debt unless human play asks for it.
