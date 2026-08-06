# Pass 3 — Bold Design Finale Brief

**Author:** Game Designer · **Branch:** `feat/bold-experiment` · **Status:** design only, no code

Inputs: [`PASS1_DESIGN.md`](./PASS1_DESIGN.md), [`PASS1_QA.md`](./PASS1_QA.md), [`PASS2_DESIGN.md`](./PASS2_DESIGN.md), [`PASS2_ART.md`](./PASS2_ART.md), [`PASS2_QA.md`](./PASS2_QA.md)

Pass 1 proved light could be felt. Pass 2 proved planning could be seen. Pass 3 closes the loop: **one input rhythm, one spatial pressure language, one commit moment** — then we stop adding bets and judge whether the experiment earned a merge.

---

## 1. Accept / reject Pass 2 QA

### Accepted — ship or schedule

| Finding | Verdict | Why |
|---|---|---|
| **Preview-on-queue (P0)** | **Accept — closed** | `wakeTellsAt` + destination halo + shared predicates land the Into-the-Breach thesis. Criteria #1 moves from fail to conditional pass; human blind test is QA homework, not a design reopen. |
| **Guard / sentinel / neutral ring parity (P1)** | **Accept — closed** | Mirror matches `ai.ts`; false positive dead; brackets vs solid rings teach intent. No reopen. |
| **Shear draining-leg sub-glyphs (P2)** | **Accept — closed** | Storm ticks vs bus capsule restore planning without dual bars. Human screenshot test deferred to Pass 3 QA checklist. |
| **Soften two-step move (P1)** | **Accept — must-fix Pass 3** | Double-tap per idle step is ITB-accurate but roguelike-wrong. Preview ring stays; confirm rhythm changes. See §3. |
| **Exit flicker confusion (P1)** | **Accept — must-fix Pass 3** | Exit is mandatory route, not press-your-luck. Arc flicker on exit reads as glitch or fake optional path. Quest/poi only; exit gets stable treatment. See §3. |
| **Human blind wake-prediction test** | **Accept — QA gate** | Required before calling the experiment done; autopilot cannot adjudicate. |
| **Human screenshot + room-economy notes** | **Accept — QA gate** | Labels-covered shear read and one articulable Arcing+ spatial decision per mid-sector room. |
| **Oracle green, smoke WR 50%, stuck 0%** | **Accept** | Balance not blocking; telegraph and spatial pressure are the headline. |
| **Ambush-outside-FOV tell** | **Reject fix — keep parity** | Preview-on-commit softens the sting; still diegetic ecology. Watch in human test; do not reopen as bug. |
| **Autopilot preview blind spot** | **Accept as limitation** | Headless oracle validates code paths, not input feel. Not a blocker for merge if human checklist passes. |

### Rejected or frozen — not Pass 3 work

| Finding | Verdict | Why |
|---|---|---|
| **Revert preview or two-step entirely** | **Reject** | Preview is non-negotiable; only the *confirm* rhythm changes. |
| **`MAX_WAKE_TELLS = 8` cap raise** | **Defer post-experiment** | Unproven nest-density pain; don't spend finale bandwidth. |
| **Per-sector crack-path floor art** | **Defer post-experiment** | Generic Arcing flicker sufficient to prove Bet 2 spatial thesis. |
| **Silhouette / LCARS re-audit** | **Defer post-experiment** | Schedule with merge decision; not finale scope. |
| **Full 30-seed balance re-run** | **Defer** | Smoke green; report direction at sign-off. |
| **Second finale bet** | **Reject** | One bet. Discipline. |

---

## 2. Pass 3 north star

**Plan in the dark with a ghost at your feet, commit in the light with one key, and race a shelf that only shows you what you're gambling for when you're already past the point of pretending you're safe.**

---

## 3. Must-fix for Art (short list)

Two items. Both are presentation/input polish on shipped Pass 2 work — no new sim systems, no new `Action` types.

### P0 — Move preview input: queue on direction, confirm on `.`

**Pick:** **Queue on direction press → preview ring + wake tells at destination → confirm with `.` (wait key).** Reject the double-tap scheme and reject Shift-preview as the default path (modifier splits muscle memory; keep Shift as optional debug if already wired).

| Input | Behavior |
|---|---|
| **Direction (first press)** | Queue step to adjacent tile; show destination ground ring + `wakeTellsAt(dest)` lines; do **not** move. |
| **Same direction again** | Re-aim only — update queue + preview to new adjacent tile; still do **not** commit. |
| **`.` (wait / confirm)** | Commit queued step; clear queue. |
| **Any non-move action** | Clear queue + preview (unchanged Pass 2 rule). |
| **During move tween** | One-deep animation queue unchanged — flow mid-chain without `.` spam. |

**Keep:** Ghost/wake preview on every queued step without requiring a second direction tap. Quiet stance shrinks preview live (already shipped).

**Acceptance:**
- Crossing a 10-tile corridor while standing still: **10 direction presses + 10 `.` confirms**, not 20 direction presses.
- Shadow → lit queued step shows widened notice ring **before** `.`.
- Toggle quiet while queued → preview shrinks same frame.
- `playtest:smoke` / `playtest:cohere` stay green.

### P1 — Room-economy: flicker optional only; exit stays stable

**Pick:** **Arc tint flicker on `quest` and `poi` tiles only at Arcing+.** Exit tiles get **no flicker** — stable glyph, normal exit read. Mandatory route must not pulse like optional salvage.

| Tile kind | Calm / Charged | Arcing | Breaching |
|---|---|---|---|
| **quest / poi** (explored + visible) | Sealed / static | Arc flicker (~⅓ duty); peripheral motion | Faster flicker, higher contrast — same assets |
| **exit** | Normal exit art | **Stable** — no arc flicker | **Stable** — optional subtle frame stress on HUD only, not tile |

**Acceptance:**
- Arcing+ screenshot: player can point at **one flickering optional** without exit in the same visual language.
- Exit never reads as "new detour" or rendering glitch.
- `pressureRevealTint` unit tests updated: exit returns null at all shear states.
- No reachability / loot sim changes.

---

## 4. One finale bet — Commit ghost

**Thesis:** The moment between queue and confirm is the held breath. A **commit ghost** — brief illumination + wake footprint at the destination — makes that breath visible: you see the sentence you're about to say, then it resolves when you press `.`.

**Why this bet (not Breaching climax juice):** Room-economy already sells Arcing/Breaching spatially; another global palette crush duplicates shear chrome without fixing the last feel gap — **the commit beat**. Commit ghost completes Bet 1 (wake tells) and the new input scheme in one gesture. Breaching juice stays experimental debt for a post-merge polish pass if WR and cadence hold.

### Art ask

On queue (direction press, before `.`):

1. **Ghost figure** — semi-transparent player silhouette at destination tile (reuse move-tween ghost palette; ≤50% alpha).
2. **Wake footprint** — existing destination ring + tell lines (already shipped); ghost arrival should **coincide** with ring draw, not lag a frame.
3. **Resolve on confirm** — `.` commits move; ghost snaps into player sprite / tween; ring clears or hand off to live tells on new tile in same frame.
4. **Re-aim** — direction re-press moves ghost + ring to new dest without flash artifact.

On cancel (non-move action clears queue): ghost + ring fade ≤150ms.

**Constraints:** Presentation only; no preview sim fork. `wakeTellsAt` stays the single predicate path.

### QA criteria

1. **Ghost honesty** — Fauna tells on ghost dest match tells after `.` commit on same tile/stance (unit or scene test).
2. **No double-read** — Live tells at current tile + preview tells at ghost dest simultaneously; player can distinguish "where I am" vs "what I'm about to do" without log.
3. **Confirm clarity** — New player (or QA script): after 5 queued steps, can state "`.` commits, direction re-aims" without instruction doc.
4. **Performance** — No frame drop on queue spam in vertical-slice sector; ghost + ring + live tells ≤ existing Pass 2 overlay cost.
5. **Spine** — cohere + smoke green; causal extract untouched.

---

## 5. Definition of done — "bold direction proven"

The experiment is **done** when a human can play 2–3 vertical-slice sectors and articulate the loop without opening a wiki:

> *I queue a step, I see who I'd wake, I commit with `.`, and when the shelf gets Arcing the optional caches start breathing — exits don't lie to me.*

### Proven (merge candidates)

These ship to mainline if the checklist passes:

| Layer | Merge |
|---|---|
| **Wake tells + preview** | `wakeTellsAt`, engage parity, neutral brackets, destination ring |
| **Input rhythm** | Queue on direction, confirm on `.`, re-aim on direction |
| **Commit ghost** | Finale presentation beat on queue/confirm |
| **Shear Pressure dial** | State readout, corrosion/arc, draining-leg sub-glyphs |
| **Room-economy** | Arcing+ flicker on quest/poi only; exit stable |
| **Pass 1 Bet 3 (frozen but green)** | First-light sweep, flare ignition — no regression |

### Stays experimental / post-merge

| Item | Disposition |
|---|---|
| LCARS kill + full silhouette audit | Art pass on 15 sectors, not experiment gate |
| Per-sector crack-path floor art | Polish after merge if room-economy sings |
| Breaching climax juice (palette crush + mote density + tell intensity spike) | Optional juice pass; not required to prove thesis |
| `MAX_WAKE_TELLS` cap, audio stings, full balance band tuning | Tuning pass after merge |
| Wave 2/3 system growth | Still frozen |

### QA sign-off checklist (human-required)

1. **Wake blind test** — By turn ~20, queued-step wake prediction without commit; false predictions ≤ Pass 1 live-tell baseline.
2. **Input feel** — Corridor traverse without double-tap frustration; `.` confirm learned ≤5 steps.
3. **Shear screenshot** — Name Calm/Charged/Arcing/Breaching with center readout + bar captions covered; draining leg identifiable ≤2s at Charged+.
4. **Room-economy** — One articulable press-your-luck spatial decision per mid-sector room at Arcing+; exit not mistaken for optional flicker.
5. **Commit ghost** — Ghost dest matches post-commit wake footprint; no ESP confusion beyond accepted ambush parity.
6. **Oracle** — `playtest:cohere`, `playtest:smoke` green; `test:balance` reported (direction, not gate).

**Bold direction proven** = checklist 1–5 pass on human play + checklist 6 green on oracle. WR band still not a gate; stuck% spike or illegal states **block** merge regardless of feel scores.

---

## Message to Art

You closed Pass 2. Pass 3 is two polishes and one beat — nothing else.

**Input:** Kill double-tap confirm. Direction queues + previews; `.` commits; same direction re-aims. The preview ring and `wakeTellsAt` math stay exactly as shipped — you're only changing which key fires commit.

**Room-economy:** Pull exit out of `PressureReveal` flicker. Quest and poi breathe at Arcing+; exit stays boring on purpose. Mandatory path cannot look like optional salvage.

**Finale:** **Commit ghost** at the queued destination — silhouette + ring together, resolve on `.`. This is the held breath made visible. Don't add Breaching palette crush this pass; room-economy already sells pressure spatially.

Ship one vertical-slice sector with all three before touching sector fourteen. If ghost + `.` confirm feels good in a corridor, we're done.

## Message to QA

Pass 2 fixes hold — preview math, guard mirror, brackets, draining leg. Pass 3 is feel closure, not another criteria reopen.

**Adjudicate:** `.` confirm scheme (not double-tap), exit stable vs quest/poi flicker, commit ghost honesty. Run the human checklist in §5; autopilot still won't teach you input weight.

**Accept:** Ambush-outside-FOV parity; smoke-only balance; animation-phase queue bypass.

**Block merge if:** Ghost dest tells ≠ post-commit tells; exit still flickers like optional tiles; players need a doc to learn confirm; cohere/smoke red; stuck% spikes.

Report telegraph timing and spatial pressure before WR. If the loop sings in three sectors, recommend merge — and tell me whether Breaching juice is worth a post-merge day or dead weight.
