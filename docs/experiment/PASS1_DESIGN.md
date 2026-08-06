# Pass 1 — Bold Design Brief

**Author:** Game Designer · **Branch:** `feat/bold-experiment` · **Status:** design only, no code

This is pass 1 of 3 on the experimental branch: **design → art → QA**. V1 conservatism is off. Balance band (55–85% WR) still matters *eventually*, but this pass optimizes for **feeling** and **decision quality**, not safety. Read alongside [`../V1.md`](../V1.md) (pillars), [`../WORLD.md`](../WORLD.md) (fiction), and [`../../src/sim/light.ts`](../../src/sim/light.ts) (the light math we're building on, not replacing).

---

## 1. North star

**Every light you switch on is a sentence you say out loud to something that's listening — Meridian Shelf should feel like a held breath, not a spreadsheet with a countdown.**

Today the shear window and bus are numbers you manage. Light is a toggle (lamp/flare/quiet) that mostly changes FOV radius and a hidden EM percentage. That's a simulation. We want a **tension loop**: light is legible, physical, and *loud* — and the clock isn't two numbers, it's one rising feeling you can read off the screen without opening a panel.

---

## 2. Three bold bets

We already own the hard part — `src/sim/light.ts` has real inverse-square irradiance, transmittance through scrub, tone-mapped brightness, a shadow band. Nobody can *see* that. Bet the pass on making the existing math **readable and felt**, and on compressing the dual-clock math into a single dial. No new meta systems.

### Bet 1 — "Show the Wake" (readable telegraph, spatial storytelling)

Right now EM/aggro is an invisible percentage that occasionally spikes a log line. Kill that as the primary feedback. Instead: **every turn that would change your light footprint previews exactly which sleeping/patrolling fauna it will wake, before you commit the move.**

- Standing in a lit tile with a sleeping mite three tiles off? Show a thin "tell" line or pulse on that mite *now*, not after it wakes.
- Stepping from shadow into lamp-light should visibly widen a "notice" ring on the ground the instant you preview/queue the move — Into the Breach's "see the punch before you throw it," applied to stealth instead of combat.
- Quiet stance's payoff (smaller radius, dimmer lamp, EM-HIGH aggro suppression) should read as *shrinking the tell*, not as a stat modifier in a tooltip.
- This replaces the EM% number as the thing players optimize against. The number can stay in `GameState` for the oracle; it should stop being the primary HUD readout.

**Why this is the bold part:** it turns "the ecology reacts to my light" from a mechanic you learn by getting bitten into a mechanic you can *see coming*, every single turn, for free. That's the difference between a stealth game and a stealth-flavored numbers game.

### Bet 2 — One gauge: Shear Pressure (risk/reward compression)

Collapse the dual clock (shear window turns + bus reserve) into a single, diegetic, rising-stakes dial: **Shear Pressure**. Under the hood the two sim clocks can still exist (don't break `turn.ts` / `spine.ts` math), but the player should never have to do mental arithmetic between two bars again.

- Named states, Into the Breach-clear: **Calm → Charged → Arcing → Breaching**. Each state visibly changes the world (light bleeds, ambient sound, palette pressure), not just a color-shift on a bar.
- At higher Shear Pressure states, deliberately widen the swing: richer salvage further from the safe path, shorter light tells, faster fauna. This is the Slay the Spire "press your luck" beat — every room-quest and every optional cache becomes a live bet against a dial the player can actually read at a glance.
- The moment-to-moment question should be **"do I go one more room at Arcing, or do I bail to bank what I have?"** — not "do I have enough bus to make it." Same underlying math, completely different felt decision.
- This is a compression of an existing pillar (dual clocks), not a new system. It should make Causal Extract (key → handshake → Lattice → pad) feel like it's racing something, instead of budgeting against it.

### Bet 3 — Light as matter (juice, physicality, wonder)

The sim already computes real falloff and transmittance. Presentation should *sell* that as a physical fact of the world, not a tint multiply.

- **Cast shadows, not just lit/unlit tiles.** A prop or enemy between a light source and a wall should throw a legible shadow shape. Silhouette-first: you should be able to identify a threat from its shadow before you see its sprite.
- **Flares are an event, not a buff.** A thrown flare should have a visible ignition beat, an expanding sphere with a hard edge matching `irradiance()`'s windowed falloff, and a felt "the room just changed" moment — closer to Hades' hit-stop juice than a lighting toggle.
- **First light, per sector.** Reuse the Outer Wilds trick: don't hard-cut fog-of-war open. On sector entry, let light sweep/reveal the first room over a beat or two so the player *sees* the space arrive instead of finding it already fully drawn. One wonder beat per sector, not per tile.
- Melee and hazard hits get weight — hit-stop, a camera kick, a directional flash — sold through tween/camera tricks, not a physics engine. (We are still **not** adding real-time physics or knockback as a system; this is juice on top of the existing turn resolution, not a new sim.)

---

## 3. What to cut or de-emphasize this pass

To let the above breathe, freeze scope elsewhere. Nothing below is deleted from the codebase — it's just not where this pass's attention or new surface area goes.

| Cut / freeze | Why |
|---|---|
| **LCARS chrome as the default visual identity** (`theme.ts` "LCARS ink," orange panels on black) | It's the exact generic-sci-fi-UI trap we're pushing against. Kill it as the look, not necessarily every line of code, this pass. |
| Numeric EM% / bus / window as **primary** HUD readouts | Superseded by Bet 1 (wake tells) and Bet 2 (Shear Pressure dial). Keep them as secondary/debug if useful, not the main read. |
| Wave 2/3 side systems: crafting recipes, NPC agendas, brand tags, `decode`/`calibrate`/`stabilize`/`relay_chain` room-quest variety | Don't grow these further this pass. They're fine as-is; they are not where the bold bets live and they dilute art/QA attention. |
| Full 15-sector content pass | Prototype the three bets on a **vertical slice** (2–3 representative sectors: one early/bright, one mid/dark, one late/pressure) before asking art to reskin all 15. |
| Precision balance tuning to 55–85% WR | Track direction, don't chase the number this pass. See Success Criteria. |
| Audio redesign | Out of scope unless a one-line sting is needed to sell Bet 3's flare/first-light beats. |
| Engine swap, meta-progression, alignment, shops, overland map | Still and forever out — unchanged from V1/ADOM_DEPTH guardrails. |

---

## 4. Art direction ask

Art owns the visual language for the three bets. The mandate: **physical, not decorative.** Light should look like it's made of something (glass, chemical burn, bioluminescence, worn optics) — never a gradient dropped on top of geometry.

**Kill:**
- LCARS — rounded orange/peach panels, chamfered bezel bars, hexagon-kit sci-fi-UI-pack wallpaper. If it would look at home on a starship bridge, it's wrong for a survey team squatting on a dead relay site with salvaged gear.
- Purple/magenta AI-sludge glow — the generic soft-purple bloom-everything look. Meridian's light sources each need a distinct, motivated color temperature (warm chemical flare, cool bioluminescent fauna, sickly EM-HIGH wash) — not a single default "sci-fi glow" palette.
- Decorative UI panels that don't correspond to a physical readout. If it's chrome, it should look like it's bolted to salvaged field gear, not a starship LCARS console.

**Build instead — an original silhouette language rooted in:**
- **Physical field-survey tech**: worn, scavenged, over-engineered-in-the-field. Think patched cable, hand-soldered probe housings, condensation on glass — not sleek starship interiors.
- **Meridian geology as character**: crystal-reef refraction, brine-flat reflections, ash-fall particulate catching light, duct-warren grime. The 15-sector biome identity (already named in `WORLD.md`) should read through *how light behaves there* (scrub scatters it, brine reflects it, ash chokes it) as much as through floor tint.
- **Silhouette-first enemies and props**: every threat must be identifiable from pure black silhouette alone, before color or detail — this is what makes Bet 1 (wake tells) and Bet 3 (cast shadows) actually work. If two enemies share a silhouette, that's a bug, not a style choice.
- **Shear Pressure as a diegetic object**, not a progress bar: something that visibly degrades/intensifies with the dial — a corroding HUD edge, rising ash/static in the frame, a physically cracking overlay — matched to the Calm → Charged → Arcing → Breaching states in Bet 2.

Deliver the vertical slice (2–3 sectors) before reskinning all 15. If a technique doesn't survive contact with the sim's actual light grid (`irradiance`, `lightTransmittance`, `toneMap`), it's not real — go look at the math before painting on top of it.

---

## 5. Success criteria (for QA)

This pass is judged on **legibility and feel**, not on hitting the WR band. Concretely:

1. **Wake-tell legibility** — In blind playtests, can a player correctly predict "will this wake something" *before* taking the action, without reading a log or wiki, by turn ~20? Track false predictions.
2. **Single-glance pressure read** — Can a player state their current Shear Pressure state (Calm/Charged/Arcing/Breaching) from the screen alone, with HUD numbers hidden/covered? This is a literal screenshot test, not a vibe check.
3. **Decision cadence** — Does a felt light/pressure trade-off decision occur roughly every 5–10 turns in the mid-game, not just in the tutorial? (Contrast: today's quiet-stance toggle is usually set-and-forget.)
4. **Wonder beat present** — Does first-light sector entry produce a discernible, distinct beat from the old instant-fog-reveal, on all vertical-slice sectors?
5. **Spine integrity** — Causal extract (key → beacon handshake → Lattice → pad) and legal-win/lose assertions must still hold. `playtest:cohere` must stay green; `playtest:smoke` must not crash or produce illegal states.
6. **Balance direction, not gate** — Run `test:balance` / `playtest` and report the number and its *lose-mix* (hp/storm/energy/stuck), but do not block the pass on being outside 55–85%. Flag anything that looks structurally broken (e.g., stuck% spiking, or WR collapsing toward 0% or 100%) versus just "outside band because it's spicier now."
7. **No LCARS/purple-sludge relapse** — Silhouette and light-language checks: can QA identify every enemy type from silhouette alone? Does any light source look like a generic gradient rather than a motivated physical source?

---

## 6. Non-goals for this pass

- No new meta-progression, alignment, shop, or cross-run systems (unchanged prohibition).
- No precision balance tuning to land inside 55–85% WR — direction and lose-mix sanity only.
- No full 15-sector art reskin — vertical slice (2–3 sectors) first.
- No audio redesign beyond what's needed to sell Bet 3's key beats (flare ignite, first-light).
- No engine swap, no real-time physics/knockback system, no `Action` union growth for these bets — reuse existing turn/action hooks (per `ARCHITECTURE.md`'s mechanic contract).
- No deep autopilot AI rewrite — it should keep functioning against the new dial/tells well enough not to crash or get permanently stuck; deep autopilot tuning is a later pass.
- Do not delete or rip out Wave 2/3 systems (crafting, brands, NPC agendas, extra room-quest kinds) — freeze, don't demolish.

---

## Message to Art

You're not reskinning a UI kit — you're designing what light is made of on a dead relay site. The sim already does real inverse-square falloff and shadow transmittance (`src/sim/light.ts`); nobody has ever gotten to see it properly. That's your canvas. I want three things from you before anything else: a silhouette language where every enemy is nameable in pure black, a light palette where every source (lamp, flare, fauna bioluminescence, EM-HIGH wash) has its own motivated color temperature, and a Shear Pressure object that feels like the world physically degrading, not a bar filling up. Kill the LCARS panels — I don't want another orange console on black. Kill the purple bloom-everything look — I don't want another sludge palette either. Give me something that looks like it was salvaged and field-repaired on a hostile ridge, not built in a shipyard. Start with 2–3 sectors, not fifteen — I'd rather see one sector nailed than fifteen sketched.

## Message to QA

Your job this pass is to be adversarial about *feeling*, not just correctness. I don't want a rubber stamp on 55–85% WR — that band doesn't matter yet. What matters: can a player actually predict what their light is about to wake up, and can they read the Shear Pressure state off the screen without opening a panel? Try to break the wake-tell — find the move that should have warned someone and didn't. Try to get confused about pressure state — find the moment the compressed dial hides information a player needed. Run the standard oracle (`playtest:cohere`, `playtest:smoke`, `test:balance`) and report numbers honestly, but the headline finding I want from you is qualitative: where did the tension loop break, and where did it sing. If the WR comes back at 30% or 95%, that's useful data, not a failure — tell me *why*, and whether it's "structurally broken" or just "spicier than the old band assumed."
