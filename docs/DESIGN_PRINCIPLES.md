# Design principles for Extraction Window

A short, applied summary of established game-design ideas that fit this project’s pillars — dual clocks, causal extract, field light, kit pressure, in-run mastery, headless truth ([`V1.md`](./V1.md)).

Use this when proposing features, reviewing UI/copy, or writing pass briefs. Prefer **one principle that explains the change** over inventing new systems.

---

## How to use this doc

1. Name the **aesthetic** you want (feeling), not the feature.
2. Check it against the **principles** below.
3. Run the **decision checklist** before coding.
4. Prefer presentation honesty over new `sim/` rules unless the pillar requires it.

---

## Target aesthetics (MDA)

[MDA](https://users.cs.northwestern.edu/~hunicke/pubs/MDA.pdf) (Hunicke, LeBlanc, Zubek): designers build **Mechanics → Dynamics → Aesthetics**; players experience the reverse.

For Meridian Shelf, the aesthetics we care about most:

| Aesthetic | What it should feel like here |
|-----------|-------------------------------|
| **Challenge** | Two clocks (Window + Bus) and fauna that punish careless light/wake |
| **Discovery** | Reading the shelf — wake lines, LIT/SHADOW/QUIET, sealed routes |
| **Tension / drama** | Shear pressure rising; hatch → real drop; uplink hold |
| **Expression** | Kit loadout, Quiet vs loud, skill forks — not towns/meta unlocks |
| **Submission / flow** | Fluid WASD cadence; opt-in Shift-peek (forced wake-commit is dead — Pass 4) |

If a feature doesn’t serve one of these (or a V1 pillar), it’s probably noise.

---

## Principles (applied)

### 1. Map first, log second

**Idea:** Put the important signal on the field (or a single HUD tell). The mission log confirms; it doesn’t replace seeing.

**Lineage:** RogueBasin UI guidance; Cogmind “map dynamics” (feedback on the map, not only in text).

**Apply here**

- Wake lines, notice impact, wall-cut light, shear dial / badges.
- Combat and notice juice on sprites/tells before stacking another log line.
- Context hints for *what to do now*; logs for *what just happened*.

**Anti-pattern:** Teaching a mechanic only in a multi-line log while the map stays silent.

---

### 2. Show what’s needed now; hide the rest

**Idea:** Ambient UI shows decision-critical state. Detail lives one key away (kit, PADD, help, skill pick).

**Lineage:** Progressive disclosure; RogueBasin “relevant now”; modern roguelike accessibility essays (transparent systems without a wiki).

**Apply here**

- Bars: HP · Shield · Bus · Window · XP.
- Meta line: combat/EM + *active* timers/statuses — not permanent equip dump.
- Shear Calm: don’t triple-signal (center + badge + bar). Escalate chrome when Charged+.
- Drill `?` = short page; full manual after the hatch.

**Anti-pattern:** Always-on ALL-CAPS soup that players learn to ignore.

---

### 3. One name per system

**Idea:** Same concept should not wear three labels in HUD, help, and lore.

**Lineage:** Clarity of mechanics (Darren Grey / modern RL UI practice); glossary discipline in [`WORLD.md`](./WORLD.md).

**Apply here (canonical player words)**

| Prefer | Avoid mixing in UI |
|--------|-------------------|
| Bus | Energy / EPS / life-support (help may gloss once) |
| Window | Storm / shear storm (Shear = pressure *presentation*) |
| Shield | Armor / SHD |
| Quiet | Jammer / scrambler as the *item*; Quiet as the *stance* |
| Nav Lattice / Splice Key | CORE / KEY only as short badges |

**Anti-pattern:** Help says “energy,” bar says “BUS,” log says “life-support.”

---

### 4. Teach at the moment of need

**Idea:** Narrow hints when the system appears; skip front-loaded manuals.

**Lineage:** Contextual tutorials (wider-audience RL design); “bake teaching into the environment.”

**Apply here**

- Drill bay: move → light → hazard → kit → wake → fight → hatch.
- One-shot coaches (peek teach) that **yield** to tele/vitals/drill priority.
- Visible ion tax before abstract Bus lectures.
- Autopilot WR band still validates that teaching didn’t soft-lock the run.

**Anti-pattern:** Wall-of-text `?` before the player has a body on the map; hints that never yield to combat urgency.

---

### 5. Preview is opt-in; commit is fluid

**Idea:** Planning tools must not tax every step. Prophecy is available; flow is default.

**Lineage:** Into-the-Breach-style telegraphs as *optional* read; Pass 3/4 experiment (forced wake-commit rejected).

**Apply here**

- WASD moves immediately; `.` waits.
- Shift+dir peeks wake/ghost; release clears.
- Live wake at feet stays; Notice Impact sells *resolve*, not a second confirm.

**Anti-pattern:** Reintroducing queue-on-WASD / confirm-on-`.` “for clarity.”

---

### 6. Honest presentation

**Idea:** What the player sees must match what `sim/` decided. Juice amplifies truth; it does not invent ESP.

**Lineage:** Architecture rule (`sim/` never imports Phaser); juice/game-feel research (feedback that reinforces causality).

**Apply here**

- Illumination / LIT / SHADOW / QUIET drive combat hooks; bloom is decoration around that grid.
- Wake Impact only for fauna the player could already read via live/peek tells.
- Threat overlays draw the same tiles the sim will resolve against — `ThreatView` renders `enemyThreatTiles`, so the hatching cannot promise or hide a tile the attack does not use.
- A rule that quietly changes a number has to show that number moving. Encirclement rides the DEF readout as `DEF 4+1−2` rather than earning a badge, so the penalty is legible where its effect is.
- Autopilot + playtests are the balance oracle (55–85% WR) — feel changes that break legality are bugs.

**Anti-pattern:** PointLight (or any FX) that reads as light through walls while help says “pool stops at walls.”

---

### 7. Juice with a budget

**Idea:** Amplify feedback on *meaningful* state changes; silence routine motion.

**Lineage:** Juicy design / game feel (abundant feedback *when it clarifies*).

**Apply here**

- Budget ≤ ~200ms for notice/combat punches; no new persistent chrome.
- Corridor walking with no fauna = zero Impact noise.
- One signal channel per beat when possible (tell flash *or* badge *or* log — not all three shouting).

**Anti-pattern:** Continuous shear/log/badge spam that trains the player to mute the UI mentally.

---

### 8. Few verbs, deep systems

**Idea:** Small command set; depth from interacting systems, not chorded hotkeys.

**Lineage:** RogueBasin interface; TGGW / modern RL (contextual use, inventory default actions).

**Apply here**

- Move (which is also how you pick things up), wait, brace, shove, kit/use, interact (`>` / Enter), peek.
- Kit `u` = use *or* equip; interact is contextual (hatch / beacon / pad / hail).
- Help lists verbs first; “why gather” second.
- A verb earns its letter by being a decision the existing ones cannot express, and by being wrong to press sometimes. `retreat` was cut for failing the first test — it was a step that cost Bus. Shove passes both: it answers a windup already in reach, and on open floor it is a wasted turn.

**Anti-pattern:** New letter per niche action when `u` / `>` / kit already covers it.

---

### 9. Fair information, unfair outcomes

**Idea:** Roguelikes can be lethal; they should not be cryptic about *why*.

**Lineage:** Transparent systems; “everything in the game, not the wiki.”

**Apply here**

- Telegraphs for windups; wake lines for notice; Bus/Window numbers stay visible.
- Ambush-in-shadow is a *known* Quiet/SHADOW trade, taught in drill + badge.
- Legal win path stays causal (Key → handshake → Lattice → pad) — feel polish never softens assertLegalWin.

**Anti-pattern:** Hidden timers or silent state flips that only appear in postmortem.

---

### 10. Iterate from dynamics you can measure

**Idea:** Change mechanics → observe dynamics (WR, lose mix, illegal wins) → retune.

**Lineage:** MDA tuning loop; this repo’s playtest harness.

**Apply here**

- After major sim/UI-to-action changes: `build` → `playtest:smoke` (+ full `playtest` when win/sector/inventory/autopilot touched).
- Pass briefs state a **single bold bet** and QA criteria (see `docs/experiment/PASS*_DESIGN.md`).
- Separate the rule from the policy before reading a result. A player option cannot lower the win rate on its own; when the number drops after adding one, the oracle's new habit is the suspect. Ablate it before touching the rule.
- **A turn spent on defence is a turn the Window still bills.** Answering telegraphs by bracing, retreating to better footing, and shoving to thin a crowd each cost the oracle 6–20 points, because the enemy simply re-establishes and the clock keeps running. Defensive options have to convert into damage or position that survives the enemy phase, or they are traps dressed as choices.
- 30 seeds cannot see a 5-point move. Confirm anything near a band edge on 200+.

**Anti-pattern:** Shipping three overlapping feel bets without a kill criterion.

---

## Decision checklist

Before implementing a UI/feel/systems change:

- [ ] Which **aesthetic** and **V1 pillar** does this serve?
- [ ] Can the player **see it on the map** (or one clear HUD tell) without reading the log?
- [ ] Does it use **existing verbs** and **canonical names**?
- [ ] Is teaching **contextual** and willing to **yield** to higher priority hints?
- [ ] Is presentation **honest** to `sim/`?
- [ ] Is the **juice budget** finite, with a quiet default?
- [ ] What **playtest / unit** proves we didn’t break clocks, legality, or WR band?

If more than two boxes fail, shrink the proposal.

---

## Mapping to current systems

| System | Principle weight |
|--------|------------------|
| Dual clocks + Shear Pressure | Challenge, progressive disclosure, juice budget |
| Wake tells + Shift-peek + Notice Impact | Map first, opt-in preview, honest juice |
| Field light / LIT·SHADOW·QUIET | Discovery, one name, honest presentation |
| Drill bay + context hints | Teach at need |
| Kit / Quiet / EM | Few verbs, fair info |
| Autopilot + playtest | Measure dynamics |

---

## References (short)

- Hunicke, LeBlanc, Zubek — *MDA: A Formal Approach to Game Design and Game Research* ([PDF](https://users.cs.northwestern.edu/~hunicke/pubs/MDA.pdf))
- RogueBasin — [Roguelike Interface](https://roguebasin.com/index.php/Roguelike_Interface)
- Grid Sage / Cogmind — [Map Dynamics](https://www.gridsagegames.com/blog/2014/02/map-dynamics/)
- Game Developer — [Traditional roguelike to a wider audience](https://www.gamedeveloper.com/design/creating-a-traditional-roguelike-to-a-wider-audience---a-step-into-the-darkness) (transparency, contextual tutorials)
- The Ground Gives Way — [User Interface](https://www.thegroundgivesway.com/user-interface/) (clarity, contextual actions)
- Hicks et al. — juicy / game-feel framing (DiGRA 2018)

Internal: [`V1.md`](./V1.md), [`WORLD.md`](./WORLD.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`experiment/PASS4_DESIGN.md`](./experiment/PASS4_DESIGN.md).
