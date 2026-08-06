# Pass 4 — Post-Merge Feel Brief (Fluid Move)

**Author:** Game Designer · **Branch:** `cursor/pass4-design-fluid-4e9e` · **Status:** design only, no code

Inputs: [`PASS3_DESIGN.md`](./PASS3_DESIGN.md), [`PASS3_QA.md`](./PASS3_QA.md), [`PASS3_ART.md`](./PASS3_ART.md), current `InputController.ts`, `WakeTells.ts`, `ShearPressure.ts`, `PressureReveal.ts`, lore MOVE/PEEK strings.

**Doc debt:** PASS1–3 briefs still describe confirm-on-`.` / queue-on-WASD in places. Treat those input sections as **historical**. Canonical input now: **WASD moves immediately**; **Shift+direction** optional wake peek (ghost + destination tells); **`.`** is wait; live wake tells at feet stay. Do not re-implement Pass 3 confirm.

---

## 1. Verdict on forced wake-commit

**Forced wake-commit is dead.** Player feedback landed: *"wake commit is not fun."* The feel-fix on main restores roguelike flow — one press, one tile — and keeps planning as an **opt-in** gesture.

| Pass 3 bet | Disposition |
|---|---|
| Queue on direction → confirm on `.` | **Rejected permanently** — paperwork cadence, not Meridian tension |
| Commit ghost as "held breath" on every step | **Retargeted** — ghost lives on **Shift-peek only**, not on every WASD |
| Preview math (`wakeTellsAt`, dest ring, quiet shrink) | **Keep** — still the Into-the-Breach telegraph, now on demand |
| Exit-stable room-economy | **Keep** — quest/poi flicker at Arcing+; exit boring on purpose |
| Shear Pressure dial + draining-leg glyphs | **Keep** — presentation compression stays |

**Preview bet now:** Shift+direction ghost + `wakeTellsAt(dest)`. Live tells at feet remain always-on sonar. Planning is available without taxing every corridor step.

---

## 2. North star (post-merge)

**Move like a roguelike, read pressure like a breach map — fluid steps, honest wake at your feet, and a shelf that gets louder the closer it comes to cracking.**

---

## 3. One bold bet — Notice Impact

**Thesis:** Live wake tells already answer *"who would notice me here."* What still feels soft is the **resolve** — the beat when a tell becomes a fight. Under fluid move, that resolve happens constantly. Sell it.

**Pick:** When a step (or wait/stance change) causes fauna to **notice / engage** — or when a live tell line connects to a hostile that starts a chase this turn — punch the presentation for one beat: thicken or flash the tell line, spike the notice ring, brief fauna silhouette flash or camera micro-kick, then settle back to normal tell language. This is combat juice on **notice**, not a new damage formula.

**Why this bet (not the other candidates):**

| Candidate | Why not Pass 4's single bet |
|---|---|
| Shear room-feel amplify | Room-economy + dial already sell Arcing spatially in code; amplify is polish, not the fun gap after fluid move |
| Shift-peek discoverability | Critical hygiene — lives in **must-fix**, not the creative bet |
| Light-as-matter payoff | Pass 1 Bet 3 still green/frozen; wall-shaped light shipped; don't reopen as the headline |

**Why Notice Impact wins:** Confirm-on-`.` tried to put the ITB emotion *before* the step and killed flow. Fluid move puts the emotion *after* the step. Notice Impact makes wake tells feel like prophecy fulfilled — the line you saw at your feet becomes a punch you feel — without a second confirm key, without new `Action` types, without Phaser imports in `src/sim/`.

### Art ask

1. **Trigger** — Presentation-only, keyed off existing turn outcome / wake predicates already mirrored in `WakeTells.ts` (engage/notice that was latent → active, or tell target that opens combat this turn). Prefer listening to logs/state deltas already produced; do not invent new sim Action types.
2. **Juice budget** — One short beat (≤ ~200ms feel): tell line flash → ring pop on fauna → optional micro camera kick or hit-stop-adjacent tween already used in `ActionFeedback`. No new persistent HUD chrome, no floating badges, no LCARS.
3. **Honesty** — Only punch fauna the player could already see via live/peek tells (visible + notice predicates). No ESP beyond accepted ambush-outside-FOV parity.
4. **Quiet / jammer** — Suppressed notice stays quiet; no false Impact when stance/jammer prevents wake.

### QA criteria (for the bet)

1. **Causal read** — Player can say "that flash was the mite that had a tell on me" without opening help.
2. **No spam** — Corridor walk with no fauna in range: zero Impact noise.
3. **Fluid intact** — WASD still one-press move; Impact never delays input queue or reintroduces confirm.
4. **Spine** — `playtest:smoke` green; stuck% not spiked; no illegal states.

---

## 4. Must-fix for Art (≤3)

Presentation / input feel only. No balance retune. No new sim systems.

### P0 — Shift-peek first-use teaching (no docs)

**Leftover from Pass 3 P0 discoverability**, retargeted under fluid move.

Help/lore already name PEEK (`UI-HELP-BODY`, `UI-CONTROLS`, `UI-HINT-COMMIT`, tut MOVE). That is necessary but not sufficient — Pass 3 failed when players needed a doc. **Teach peek in play once**, without a wiki and without a second confirm scheme.

**Pick:** First time the player stands with a live wake tell visible (or adjacent lit/shadow threat in notice range) early in the vertical slice, surface a single diegetic cue that Shift+direction shows the footprint *before* stepping — reuse hint-line / tut channel already in scene (same family as `UI-HINT-COMMIT`), not a modal or sticker overlay. After one successful peek (or dismiss), stay quiet.

**Acceptance:**
- New player (or QA script) finds Shift-peek within ~the first fauna-adjacent corridor without opening `?`.
- Cue never reappears as nag chrome after first success/dismiss.
- Escape still clears peek; release Shift clears; fluid WASD unchanged.

### P1 — Peek vs live dual-read

Pass 3 QA: with preview active, dest tells replaced live tells — "where I am" vs "what I'm aiming" was silhouette-only.

**Ask:** While Shift-peek is held, player can distinguish **live tile** wake from **peek dest** wake without log (opacity, origin, or ring language — Art's call). Quiet-while-peeking already keeps preview on jammer `use` (`keepMovePreview`) — make the shrink **readable in the same frame**.

**Acceptance:**
- Peek on → ghost + dest tells; live presence still readable (or explicitly dimmed with a rule QA can state).
- Toggle quiet while peeking → dest ring/tells shrink same frame; peek survives.

### P1 — Stale confirm copy / chrome audit (fluid-lock)

Sweep any remaining UI string, hint, or comment path that still implies "WASD queues / `.` commits." Lore MOVE/PEEK/WAIT on main look correct; lock them with a quick grep pass so Pass 3 confirm cannot resurrect in chrome.

**Acceptance:**
- No player-facing string teaches confirm-on-`.`.
- `.` remains wait-only in help and tut.

---

## 5. Explicit reject list (this pass)

| Reject | Why |
|---|---|
| **Any new confirm / queue-on-move scheme** | Player veto; fluid move is the law |
| **LCARS revisit / full silhouette sector audit** | Still post-experiment debt; not Pass 4 |
| **Balance retune / WR band chase** | Autopilot band 55–85% — report direction only; no weight rewrites |
| **Breaching climax palette crush as second bet** | One bet. Discipline. Optional later if humans ask |
| **New `Action` types / sim forks for preview** | Unavoidable-only; prefer presentation on existing outcomes |
| **`src/sim/` importing Phaser** | Hard constraint |
| **`MAX_WAKE_TELLS` cap raise** | Still unproven nest-density pain |
| **Per-sector crack-path floor art** | Polish after Notice Impact sings |
| **Wave 2/3 system growth** | Still frozen |

---

## 6. Definition of done

Pass 4 is **done** when a human can play 2–3 vertical-slice sectors and articulate:

> *I walk freely; lines at my feet show who notices me; when something wakes, I feel the snap; Shift peeks the next tile when I'm careful; when the shelf hits Arcing the optional caches breathe and the exit doesn't lie.*

### Proven layers (hold from merge + Pass 4)

| Layer | Expectation |
|---|---|
| Fluid move | WASD immediate; `.` wait |
| Live wake tells | At feet, engage-parity predicates |
| Shift-peek | Adjacent ghost + `wakeTellsAt(dest)`; discoverable in play |
| Notice Impact | One bold juice beat on real notice/engage |
| Shear + room-economy | Dial + quest/poi flicker; exit stable |
| Oracle | `build` + `playtest:smoke` green; stuck 0; WR direction only |

### Not required this pass

Human shear labels-covered screenshot and full 30-seed balance — nice if free, not a gate. WR band not a gate. Stuck% spike or illegal states **block**.

---

## Message to Art

Forced commit is ash. You already shipped the right skeleton on main: fluid WASD, Shift-peek ghost, live tells, exit-stable flicker, field-kit light.

Pass 4 is **one bet and three hygiene items**:

1. **Notice Impact** — make wake *pay off* when fauna actually notices. Juice the resolve, not the HUD.
2. **Teach Shift-peek once in the field** — help strings exist; first-use cue must land without `?`.
3. **Dual-read + quiet-shrink while peeking** — peek must not erase "where I am," and jammer quiet must visibly shrink the ghost footprint.
4. **Grep-kill any leftover confirm-on-`.` copy.**

No new Actions. No sim Phaser. No LCARS. No balance pass. Ship Impact on the vertical slice before touching sector fourteen.

## Message to QA

Adjudicate **feel under fluid move**, not Pass 3's confirm checklist.

**Pass if:** WASD never waits for `.`; Shift-peek found without docs; Notice Impact reads as the tell that just became a fight; quiet shrinks peek live; exit still never flickers like quest/poi; smoke/cohere green.

**Block if:** Any confirm scheme returns; Impact fires with no fauna/tell causality; peek teaching is modal spam; stuck% spikes; player-facing copy still says `.` commits moves.

Autopilot still cannot judge Impact weight or peek discoverability — human hands on 2–3 VS sectors. Report telegraph *resolve* and pressure readability before WR. If the snap on notice makes wake tells feel like prophecy, recommend merge of Pass 4 art; if it just adds flash noise, kill the bet and keep hygiene only.
