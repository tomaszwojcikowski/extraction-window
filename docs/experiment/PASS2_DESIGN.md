# Pass 2 — Bold Design Brief (After QA)

> **Historical.** Canonical input on main: WASD moves immediately, `.` waits, live wake tells at the player's feet. Shift-peek / move preview / confirm-on-`.` are permanently cut (Wave 24). Peek or confirm recommendations in this file are not current work.

**Author:** Game Designer · **Branch:** `feat/bold-experiment` · **Status:** design only, no code

Inputs: [`PASS1_DESIGN.md`](./PASS1_DESIGN.md), [`PASS1_ART.md`](./PASS1_ART.md), [`PASS1_QA.md`](./PASS1_QA.md)

Pass 1 proved the sim can *show* aggro and compress two clocks. Pass 2 finishes the planning loop and makes pressure change what the room *offers*, not just what the HUD says.

---

## 1. Acknowledge QA

### Accepted — ship fixes

| Finding | Verdict | Why |
|---|---|---|
| **Criteria #1 fail: no move-preview ring** | **Accept (P0)** | QA is right. Live-state sonar is half of Bet 1. Without preview-on-queue, players still learn wake by committing — exactly the old EM% loop with prettier paint. This is the pass opener. |
| **Guard false positive** (`dist <= aggro` ≠ engage gate) | **Accept (P1)** | Mirror must match `ai.ts` engage predicates, not a generic aggro radius. Design told Art to mirror `effectiveAggro`; that was imprecise for guard/sentinel/home behaviors. Fix the mirror; do not change guard AI this pass. |
| **Neutral scan-wash overload** (wander/swell rings teach "ring = wake") | **Accept (P1)** | Ring language must encode *intent*, not *proximity*. Neutral notice is informational; lit/dark prefer is actionable. Wrong mental model is worse than no ring. |
| **Shear hides which leg burns** (62/38 blend + muted captions) | **Accept (P2)** | Compression was the goal; amnesia was not. One sub-read on the draining leg restores planning without restoring the spreadsheet. |
| **Shear is label-readable, not glance-readable** | **Accept (directional)** | Screenshot test passed only because text spelled `SHEAR · CHARGED`. Pass 2's new bet addresses this by making pressure change the *world*, not just corrosion curves. |
| **Early game stays Calm too long** | **Accept (contextual)** | Fresh-run Calm is fine; the problem is Calm never *means* anything spatial. Room-economy bet fixes that at Arcing+, not by inflating early weights. |
| **Oracle green, WR 63%, stuck 0%** | **Accept** | Balance is not blocking. Tension loop breaks on telegraph timing, not numbers. |

### Rejected or deferred — not Pass 2 blockers

| Finding | Verdict | Why |
|---|---|---|
| **`MAX_WAKE_TELLS = 8` cap** | **Reject as must-fix; defer** | Dense-nest pain is real but unproven in vertical slice. Revisit if human playtest hits a hidden ninth threat; don't burn input-hook time on cap logic first. |
| **Ambush tell outside FOV feels like ESP** | **Reject fix; accept as parity** | Mirror matches sim: dark-prefer wakes via `(playerDark && dist <= aggro)` without FOV. Reads as "something in the dark noticed you" — diegetic for Meridian ecology, not a bug. Preview ring (P0) reduces the sting because the player chose the step. |
| **Silhouette / LCARS audit not run** | **Defer** | Valid debt. Schedule with vertical-slice art review once P0 preview lands; not competing with planning UI this pass. |
| **Decision cadence inconclusive** | **Defer to human playtest** | Autopilot cannot judge felt cadence. P0 preview is the precondition for measuring it. |
| **Per-sector shear palette bleed, audio stings** | **Defer** | Art Pass 1 deferrals stand. Room-economy bet replaces generic palette bleed with state-gated spatial reveals. |
| **Change guard AI instead of mirror** | **Reject** | Engage gate is tuned and cohere-green. Presentation lied; sim didn't. Fix the mirror. |

---

## 2. Pass 2 north star

**Meridian is a game you plan in the dark and commit in the light — every queued step shows you the sentence you're about to say, and every rise in Shear Pressure rewrites what the shelf is willing to show you.**

(Bolder than Pass 1's "held breath, not spreadsheet": planning is now explicit, and pressure is spatial, not decorative.)

---

## 3. Must-fix backlog for Art

Ordered. No new sim systems unless noted. Acceptance is binary — QA re-runs criteria #1 and shear sub-read check.

### P0 — Move-preview wake ring (Into-the-Breach telegraph)

**Ask:** On queued step (before commit), render the wake footprint the step *would* produce — widened notice ring on ground at destination, tell lines to fauna that *would* enter engage/notice, stance-aware (quiet shrinks the preview the same way it shrinks live tells).

**Input hook:** Art + minimal input presentation — ghost step from existing move queue / hover preview path; no new `Action` types.

**Acceptance:**
- Player standing in shadow, lamp on, queues step into lit tile → destination ring + fauna tells visible **before** Enter/commit.
- Toggling quiet stance while step is queued → preview ring shrinks live (same frame as live tells).
- QA blind test: by turn ~20, player correctly predicts "this queued step wakes X" without taking the step; track false predictions ≤ Pass 1 live-tell baseline.
- `playtest:smoke` / `playtest:cohere` stay green.

### P1 — Guard / sentinel engage parity

**Ask:** `WakeTells.ts` (live + preview) predicates must match `ai.ts` engage gates per behavior — guard: `dist <= 2 || lootTaken || (alerted && dist <= aggro)`; audit sentinel and home/station behaviors the same way.

**Acceptance:**
- Unit test `flags guard false-positive` **removed or inverted** — crawler at Manhattan 4 with no loot/alert → **no ring**.
- Guard at dist 2 with lamp → ring. Loot taken → ring at extended range. Document sentinel/home in same test file.
- Preview ring uses identical predicates (no live-only vs preview-only drift).

### P1 — Prefer-type ring differentiation

**Ask:** Three distinct notice languages, not one scan-wash for "anything in range":
- **Lit-prefer / dark-prefer:** keep warm lamp / biolum-deep pulse (actionable wake).
- **Neutral (wander, swell idle):** dashed ring, lower alpha, or corner-bracket glyph — "awareness," not "imminent chase."
- Option: suppress neutral idle rings entirely unless `alerted` or aggro engage is imminent.

**Acceptance:**
- QA can name which rings mean "will chase if I step" vs "might shuffle" without reading logs.
- No new false-positive class introduced by differentiation.

### P2 — Shear storm / bus sub-read

**Ask:** On the diegetic Shear Pressure object, expose *which leg* is driving the blend without restoring full dual bars:
- Split tick marks, or a small bus-glyph vs window-glyph with the draining leg pulsing.
- Do **not** un-mute full numeric captions at Charged+; sub-glyph only.

**Acceptance:**
- Bars covered, state name covered: player can answer "storm closing" vs "bus draining" within 2 seconds at Charged+.
- Screenshot test for Calm/Charged/Arcing/Breaching still passes with center readout covered (sub-read + corrosion/arc, not text).

---

## 4. One new bold bet — Shear Pressure room-economy

**Thesis:** Shear Pressure should change what the *room shows you*, not just how cracked the HUD frame looks. At **Arcing+**, the shelf "slips" — stress-fractured optional paths, flickering salvage nodes, and bypass caches become *visible* that were illegible or absent at Calm/Charged. Press-your-luck becomes spatial: "Do I detour for that flickering cache at Arcing, or hold the safe corridor at Charged?"

**Why this bet:** QA proved the dial is honest but label-backed. World-gated reveals make Arcing/Breaching *glance-readable* — you feel the state because the geometry changed, not because a badge updated. It also gives early Calm meaning by contrast: the room is withholding until you push.

**Art ask:**
- Define 2–3 **pressure-gated visual reveals** on vertical-slice sectors (not all 15): e.g. hairline crack path at Arcing, pulsing salvage glint on optional cache, brief stress-shimmer on a risky duct bypass.
- Reveals are **presentation-only** — tied to `computeShearPressure` state thresholds (≥ Arcing), no new loot tables or map gen.
- Gated elements must read in peripheral vision (motion or contrast), not tooltip text.
- At Breaching, reveals intensify (faster flicker, wider crack read) — same assets, higher urgency.

**QA criteria:**
- Calm/Charged sector screenshot: gated optional path/cache **not** prominently readable (or clearly "sealed").
- Same screenshot at Arcing+ (sim state forced or played to): gated element **obvious** without reading `SHEAR · ARCING`.
- Player can articulate one "press your luck" spatial decision per mid-sector room at Arcing+ in human playtest notes.
- No illegal states; optional caches remain optional — reveals don't auto-collect or alter reachability.

**Not in scope for this bet:** new room-quest types, loot RNG changes, autopilot rewrite.

---

## 5. Cuts this pass — frozen scope

| Freeze | Why |
|---|---|
| **Bet 3 expansion** (cast-shadow silhouette combat, flare juice pass, first-light tweaks) | Landed or QA-green in Pass 1. Don't dilute P0 input hook. |
| **Full 15-sector reskin / per-sector shear palette bleed** | Vertical slice only; room-economy bet uses 2–3 sectors. |
| **Wave 2/3 systems** (crafting, brands, NPC agendas, decode/calibrate/stabilize/relay_chain growth) | Unchanged freeze from Pass 1. |
| **Guard AI / engage range changes** | Mirror fix only. |
| **`MAX_WAKE_TELLS` cap raise** | Defer until nest-density pain proven. |
| **Silhouette sheet audit / LCARS re-audit** | Schedule post-P0; not blocking. |
| **Audio redesign** (shear stings, flare stings) | Out of scope unless one-line sting needed for room-economy flicker (optional). |
| **Precision 55–85% WR tuning** | Report direction; don't gate. |
| **Engine swap, meta-progression, alignment, shops, overland, new Action types** | Permanent guardrails. |
| **Second or third new bet** | One bet. Discipline. |

Pass 1 bets **stay** — wake tells, Shear Pressure dial, light-as-matter. Pass 2 *completes* Bet 1 (preview) and *extends* Bet 2 (room-economy). Bet 3 frozen.

---

## 6. Success criteria (for QA, Pass 2)

1. **Preview telegraph** — Criteria #1 pass: queued-step wake prediction before commit (see P0 acceptance).
2. **Tell honesty** — Zero guard/sentinel false positives; neutral vs prefer rings distinguishable (P1).
3. **Shear legibility** — State from world + chrome without text labels; draining leg identifiable at Charged+ (P2 + room-economy).
4. **Room-economy beat** — At least one obvious Arcing-gated spatial decision per vertical-slice sector (human note).
5. **Spine integrity** — `playtest:cohere`, `playtest:smoke` green; causal extract untouched.
6. **Balance direction** — `test:balance` report WR + lose-mix; no structural stuck/WR collapse.

---

## Message to Art

You shipped clean live tells and honest shear chrome — QA confirmed quiet jammer and palette reads. Pass 2 opens with the deferral you documented: **preview ring on the queued step**. That's the input hook you asked for; it's P0 and nothing else ships until it works. Mirror guard/sentinel engage exactly — I gave you bad shorthand on `effectiveAggro`; use `ai.ts` gates.

Differentiate neutral rings from hunters. Wanderers shouldn't scream "wake" in the same voice as a lit-prefer wasp.

Shear sub-read: one draining-leg flicker, not two bars back.

Then the new bet: **At Arcing, the room slips.** Show me stress-fractured optional paths and flickering caches that were invisible at Calm — presentation-only, 2–3 sectors, peripheral-readable. I want players to feel Arcing in the geometry before they read the badge. Nail preview + one sector of room-economy before touching sector fourteen.

## Message to QA

You were right — criteria #1 failed, not "debt." Pass 2 opens on preview-on-queue; I'm not waiving it again. Guard false positive is a design spec bug; mirror fix accepted, AI frozen.

I'm keeping ambush-outside-FOV as parity, not ESP — push back in playtest if preview doesn't soften it.

Room-economy is the one new bet: Arcing+ must change what's visible in the room without altering loot sim. Try to force illegal reachability; try to read Arcing with all text covered.

Re-run criteria #1, #2 (with labels covered this time), and guard unit tests. WR still isn't the headline — telegraph timing and spatial pressure are. If preview passes and room-economy sings, we've got a game you plan in the dark.
