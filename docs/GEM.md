# Extraction Window — Meridian GEM (what deserves to exist)

The **scope filter**: whether a feature belongs in this game at all. Once something passes here, [`DESIGN_PRINCIPLES.md`](DESIGN_PRINCIPLES.md) governs *how* it is built and presented, and [`art/ART_BIBLE.md`](art/ART_BIBLE.md) governs how it looks.

**Canon:** [`V1.md`](V1.md) pillars · [`WORLD.md`](WORLD.md) ecology · [`ARCHITECTURE.md`](ARCHITECTURE.md) layers · [`ADOM_DEPTH.md`](ADOM_DEPTH.md) waves.

---

## 1. Simulation-face question

> Does this reinforce **surveying a hostile residual-scan shelf under Power pressure and exploration wake tax**?

A feature passes only if you can name the pressure it adds in one sentence. "It looks cool" or "roguelikes have this" is a reframe or a defer, not a ship.

| Pillar | The pressure it owns |
|--------|----------------------|
| Power clock | Bus reserve — sector drip, hazards, kit spends; the only timed death channel |
| Exploration pressure | EM, wake/fauna, optional quests bill HP/kit/Power opportunity — not a turn timer |
| Causal extract | Key → handshake → Lattice → pad; no shortcut, no fetch-quest padding |
| Field light | Lamp / flare change notice, aggro, dart clarity — not tint |
| Kit + pressure | 16-slot bag + worn loadout (head/suit/hands/tool/feet/comm/rings), consumables; scarcity forces improvisation |
| In-run mastery | Levels 1–8 and forks, learned inside one run |
| Headless truth | `sim/` owns rules; presentation may not invent them |

### Worked verdicts

| Candidate | Verdict | Why |
|-----------|---------|-----|
| Unknown salvage as one gamble | Ship | Tech is opaque; scanning costs turns you owe the clocks. Shipped as tiers, later cut to a single kind — three fail rates taught nothing three times |
| Scan scars at sustained EM-HIGH | Cut | Shipped, then cut: the body cost never surfaced anywhere the player could read it |
| Sealed hatch kit payout | Ship | Rewards reading terrain over sprinting (Power/kit, not Window time) |
| Wave 5 utility catch-all slot | Cut | No distinct pressure — replaced by named paper-doll slots (Wave 19+) filled only when each passes GEM |
| Cross-run unlocks | Cut | Moves mastery out of the run |
| Towns / shops | Cut | Turns scarcity into a shopping list |
| Real-time physics / knockback | Cut | Breaks turn legibility and the oracle |
| Weather as spectacle | Reframe | Only as ion-front EM/Bus pressure with filter/flare counters |

---

## 2. Paths to mastery — distinct failure modes

No single correct build. Each path must fail *differently*; if two paths die the same way, one of them is a skin.

| Path | Fantasy | Distinct failure mode |
|------|---------|-----------------------|
| Shadow survey | Move dark, careful | Cornered in the dark without flares |
| Probe / flare | Light as a weapon; clarity on demand | EM spiral into a wake cascade |
| Kinetic kit | Solve rooms with force | Bus bankruptcy and empty consumables late |
| Companion / contact | Agendas, escort cover, drone lamp | Value soft-locked if ignored while clocks run |

**Measurable target:** the playtest death mix shows more than one dominant channel. A single cause above ~70% of losses means the paths have collapsed into one curve — retune before adding content.

This is the scope-level companion to `DESIGN_PRINCIPLES` §10 (iterate from dynamics you can measure).

---

## 3. Fiction filter

- Player strings map to a lore ID ([`LORE.md`](LORE.md)); no franchise names or trademarks.
- Terse field-log voice; conflicting prior PADDs are allowed, prophecy and cosmogony dumps are not.
- Rooms explain themselves from what is actually in them — residue, fauna pressure, terrain — rather than narrating shelf history at the player.
- No fantasy magic; every effect has a mundane industrial or biological cause.

---

## 4. Cut rule

When a candidate does not stress **light, kit, clocks, or scan pressure**: **defer, don't dilute.** Record it in the relevant wave doc instead of shipping it half-wired.

Two standing constraints on every wave:

- Optional content never becomes required for extract.
- No wave ships outside the **55–85%** autopilot WR band.
