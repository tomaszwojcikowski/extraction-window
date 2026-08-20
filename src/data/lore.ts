/** Lore registry — every player-facing string maps to an ID. Halcyon Survey Corps / Meridian Shelf. */

export const LORE = {
  // UI
  'UI-TITLE': 'EXTRACTION WINDOW',
  'UI-ORG': 'CSV HALCYON',
  'UI-TITLE-TAGLINE': 'Meridian Shelf',
  'UI-SUBTITLE': 'Halcyon Survey Corps · Meridian Shelf',
  'UI-SURVEY-TAG': 'Survey Team',
  'UI-BRIEF': 'Nav Lattice → drop skiff · Power hits 0 and you lose',
  'UI-BRIEF-TUT':
    'Drill first — Power drip paused here · then Key → beacon → Lattice → skiff',
  'UI-MISSION-STATUS': 'MISSION STATUS',
  'UI-PRESS-START': 'Enter — begin',
  'UI-SEED': 'seed',
  'UI-SEED-HINT': '← → · r random',
  'UI-HP': 'HP',
  'UI-ENERGY': 'Power',
  'UI-BAR-HP': 'HP',
  'UI-BAR-SHD': 'Shield',
  'UI-BAR-EPS': 'Power',
  'UI-BAR-XP': 'XP',
  'UI-SECTOR': 'Sector',
  'UI-ION-FRONT': 'ION FRONT',
  'UI-FRONT-CLEARING': 'FRONT CLEARING',
  'UI-TUT-SECTOR': 'DRILL',
  'UI-ATK': 'ATK',
  'UI-DEF': 'DEF',
  'UI-POS-CONTROLLED': 'Controlled',
  'UI-POS-RISKY': 'Risky',
  'UI-POS-DESPERATE': 'Desperate',
  'UI-EXTRACT': 'Extract',
  'UI-STANCE-ENHANCED': 'Enhanced',
  'UI-STANCE-IMPAIRED': 'Impaired',
  'UI-ENCUMBERED': 'Kit full',
  'UI-FRITZ': 'Kit jammed',
  'UI-DOWNED': 'Downed',
  'UI-BUS-FAIL': 'Power fail',
  'UI-INV': 'Field kit',
  'UI-LOADOUT': 'Worn loadout',
  'UI-INV-BAG': 'kit bag',
  'UI-EQUIP-HEAD': 'Head',
  'UI-EQUIP-SUIT': 'Suit',
  'UI-EQUIP-HANDS': 'Hands',
  'UI-EQUIP-TOOL': 'Tool',
  'UI-EQUIP-FEET': 'Feet',
  'UI-EQUIP-COMM': 'Comm',
  'UI-EQUIP-RING': 'Ring',
  'UI-LOG': 'Log',
  'UI-OBJECTIVE': 'Objective',
  'UI-HELP': 'Field manual',
  'UI-HELP-TUT':
    'TRAINING BAY\n' +
    'Reach the east hatch. Power drip is paused here.\n' +
    '\n' +
    'WASD — move · . — wait · step on kit to take it\n' +
    'i — open kit · u — use selected item\n' +
    '\n' +
    'Yellow ion tiles drain Power — i, select Sealant Foam, u or take the south detour.\n' +
    'LIT is safer to read · SHADOW risks ambush · Flare lights dark fights.\n' +
    '\n' +
    'Press ? after the hatch for the full manual.\n',
  'UI-HELP-BODY':
    'CONTROLS\n' +
    'WASD / arrows — move one tile\n' +
    '. — wait\n' +
    'i — kit · u — use or equip · step onto kit to pick it up\n' +
    'Enter / Space / > — hatch, beacon, pad, optional site, hail\n' +
    'n — minimap · p — PADD · l — mission log · ? — help · m — mute · Esc — close\n' +
    'Title only: c — field bulletin (ship notes)\n' +
    'Amber dashed frame on a tile — optional site (see OPT line in HUD)\n' +
    '1 / 2 — pick field skill when prompted\n' +
    '\n' +
    'POWER CLOCK\n' +
    'Power — kit charge. Sector drip, hazards, EM, and kit spends drain it. Empty Power = lose.\n' +
    '\n' +
    'EXPLORATION PRESSURE\n' +
    'No turn timer — ion shear and fauna are the wake tax. Shear dial shows pressure, not a countdown.\n' +
    '\n' +
    'COMBAT\n' +
    'Walk into a hostile to hit it. Worn Survey Phaser: step toward a visible foe 2–3 tiles along that cardinal to fire a beam (−Power); adjacent is still melee.\n' +
    'Hits compare ATK to DEF.\n' +
    'Impaired = weaker hits (jammed, blind, or kit full). Enhanced = stronger hits (stunned or exposed foe, stim, or overcharge).\n' +
    'Windup paints the tiles it will strike next turn — leave those tiles or kill it.\n' +
    'Two+ hostiles touching you drop DEF — fight in a doorway or break contact.\n' +
    'Past 0 HP: you may stay up or go downed. Field Hypo (u) stabilizes. Extra hits while downed shorten the clock.\n' +
    'Painted side tiles show where a second hunter will touch you.\n' +
    '\n' +
    'LIGHT\n' +
    'LIT — safer read · SHADOW — ambush risk. Your lamp and flares change who notices you.\n' +
    'Some fauna bite harder in SHADOW — step to LIT. Flare lights a dark fight.\n' +
    '\n' +
    'EXTRACT (pink marker)\n' +
    '1 Splice Key · 2 beacon · 3 Nav Lattice · 4 drop skiff\n' +
    'On the skiff: > start · . hold · Power Cell skips · Flare blocks the wave.\n' +
    '\n' +
    'OPTIONAL (amber frame — skip anytime)\n' +
    'Side console · OPT badge · Enter / Space / > on the site.\n' +
    '\n' +
    'HATCHES\n' +
    'Sector hatch (on it): Enter / Space — locked until Key / beacon / Lattice as required.\n' +
    'Sealed hatch (adjacent, optional): Sealant Foam (i then u) or equip Pulse Baton then Enter / Space / >.\n' +
    '\n' +
    'HUD\n' +
    'HP · Shield · Power · XP\n' +
    'Risky / Desperate = two+ hostiles touching you (DEF already down).\n' +
    'Extract boxes (# filled) sit on the chip rail: Key → handshake → Lattice → pad.\n' +
    'Enhanced / Impaired / Downed / Kit full / Kit jammed are status chips.\n' +
    'l — mission log (hidden by default; field chips carry the beat)\n' +
    'EM high — Sealant Foam flushes residue',
  'UI-KIT-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Optional sites grant extract rewards.',
  'UI-CONTROLS':
    'WASD move · . wait · i kit · n map · l log · ? help',
  'UI-CONTROLS-TITLE': 'WASD move · i kit · ? help · c bulletin',
  'UI-VERSION': 'Field build',
  'UI-CHANGELOG': 'FIELD BULLETIN',
  'UI-CHANGELOG-HINT': 'c — bulletin',
  'UI-CHANGELOG-BODY':
    'v1.5.0 — SIGHT AND MOTION\n' +
    '· Flare and beacon light flash from the emitter, not a HUD blink\n' +
    '· Sector entry sweeps light in behind a front; first room arrives\n' +
    '· Hostiles hold windup poses; packs stride when they move\n' +
    '· Beam lanes travel with the countdown; last turn reads hotter\n' +
    '· Shear Arcing / Breaching crushes the field palette — no scanline\n' +
    '· Vents, beacons, and handshake pads pulse as live kit\n' +
    '\n' +
    'v1.4.0 — FIELD KIT READ\n' +
    '· Title / End screens match stamped kit plates\n' +
    '· Shear dial: hazard tape + pulsing Power / EM legs\n' +
    '· Optional sites: amber dashed frame above the console\n' +
    '· Kit overlay: worn / bag columns; panel no longer jumps\n' +
    '· Minimap: quest / cache / elite pips on kit chrome\n' +
    '· Shear escalate and breach audio stings (m mute)\n' +
    '\n' +
    'v1.3.0 — WRAP\n' +
    '· Clearer optional quest coaching · loadout readout\n' +
    '· Pages / PADD deploy · Breaching field motes\n' +
    '\n' +
    'Still the same extract: Key → beacon → Lattice → skiff.\n' +
    'Power empty = lose. No Window turn timer.',
  'UI-MUTE-ON': 'Audio muted',
  'UI-MUTE-OFF': 'Audio on',
  'UI-HINT-EXIT': 'On hatch — step onto it or press Enter / Space to leave',
  'UI-HINT-EXIT-NEED-KEY': 'Hatch locked — get the Splice Key in this wreck first',
  'UI-HINT-EXIT-NEED-CORE': 'Hatch locked — get the Nav Lattice first',
  'UI-HINT-EXIT-NEED-BEACON': 'Hatch locked — finish the beacon (Enter / Space / >) first',
  'UI-HINT-BEACON': 'Beacon — press Enter / Space / > to start the handshake',
  'UI-HINT-HANDSHAKE': 'Handshake live — . to wait · stay on the beacon (2 turns)',
  'UI-HINT-SHUTTLE': 'Drop skiff — press Enter / Space / > while carrying the Nav Lattice',
  'UI-HINT-UPLINK-HOLD': 'Uplink live — . to hold · Power Cell skips · Flare blocks the wave',
  'UI-HINT-DESYNC': 'Skiff will not lock — use a Power Cell',
  'UI-HINT-ITEM': 'Kit on this tile — step onto it to pick it up',
  'UI-HINT-ITEM-FULL': 'Kit full — free a slot (use an item), then step here again',
  'UI-HINT-AIM':
    'Aim dart — direction fires (lit, range 3) · . cancels · miss spends the dart',
  'UI-HINT-PHASER-TEACH':
    'Survey Phaser worn — step toward a visible hostile 2–3 tiles on a clear lane to fire (−4 Power). Adjacent stays melee.',
  'UI-HINT-PHASER-FIRE': 'Phaser lane live — step that direction to fire (−4 Power)',
  'UI-HINT-PHASER-LOW': 'Phaser needs 4 Power — use a Power Cell or walk in to melee',
  'UI-HINT-PHASER-RANGE':
    'Hostile off phaser band — stand 2–3 tiles away on a clear lane, or walk in to melee',
  'UI-HINT-PHASER-EQUIP':
    'Survey Phaser in kit — i, select, u to wear · step toward foe at 2–3 tiles to fire',
  'UI-PHASER-READY': 'Worn · READY · 2–3 tile lane · −4 Power per beam',
  'UI-PHASER-LOW': 'Worn · LOW POWER (need 4) · adjacent is still melee',
  'UI-PHASER-WEAR': 'Equip to fire at 2–3 tiles · −4 Power · adjacent stays melee',
  'UI-HINT-USE-MED': 'HP low — open kit (i), select Field Hypo, press u',
  'UI-HINT-USE-ENERGY': 'Power low — open kit (i), select Power Cell, press u',
  'UI-HINT-BUS-LOW': 'Power failing — pick up a Power Cell this turn',
  'UI-HINT-USE-ARMOR': 'Shield low — open kit (i), select Shield Charge, press u',
  'UI-HINT-USE-PATCH': 'Bleeding — open kit (i), select Field Hypo, press u',
  'UI-HINT-USE-SEALANT':
    'Hazard underfoot — open kit (i), select Sealant Foam, press u',
  'UI-HINT-SEALED':
    'Sealed hatch (optional) — need Sealant Foam or equip Pulse Baton',
  'UI-HINT-SEALED-SEALANT':
    'Sealed hatch — i, select Sealant Foam, press u to open',
  'UI-HINT-PRY-SEALED':
    'Sealed hatch — press Enter / Space / > to pry open (Pulse Baton equipped)',
  'UI-HINT-ION-FRONT':
    'Ion front — Filter or Flare softens the next pulse',
  'UI-HINT-FLARE':
    'Dark fight — open kit (i), select Plasma Flare, press u',
  'UI-HINT-LIGHT':
    'SHADOW — ambush risk · LIT safer · Flare (i → select → u) lights a dark fight',
  'UI-HINT-EQUIP': 'Wearable in kit — i, select it, u to equip',
  'UI-HINT-CLOCKS':
    'Power = kit charge — sector drip, hazards, and kit spends drain it. Empty Power = lose.',
  'UI-HINT-DOWNED':
    'Downed — u Field Hypo to stabilize, or step off the pack',
  'UI-HINT-EXTRACT':
    'Required order: Splice Key → beacon → Nav Lattice → drop skiff',
  'UI-HINT-FLANK':
    'Two+ hostiles touching you — DEF drops; fight in a doorway or break contact',
  'UI-HINT-FLANK-COMING':
    'Second hunter circling — doorway or break contact before they touch both sides',
  'UI-HINT-SKILL':
    'Choose a field skill — press 1 or 2 (move locked until then)',
  'UI-HINT-TELE': 'Windup painted — leave those tiles or kill it',
  'UI-HINT-TELE-REACH': 'Two-tile windup — kill it or step fully clear of the painted tiles',
  'UI-HINT-TELE-OVERWATCH':
    'Overwatch locked — do not step adjacent; Flare cancels or kill it',
  'UI-HINT-TELE-BEAM': 'Beam charging — break line of sight or kill it',
  'UI-HINT-TELE-ZONE': 'Pulse charging — leave the painted ring or kill it',
  'UI-HINT-BEACON-NEED-KEY':
    'Beacon sealed — carry the Splice Key, then Enter / Space / >',
  'UI-HINT-BRAND':
    'Branded elite — optional; equip its drop (Prism / Weave / Lens) or counter with Flare, Pulse, Filter',
  'UI-HINT-ALLY-DRONE': 'Drone lamp nearby — can cancel one overwatch every few turns',
  'UI-HINT-ALLY-ESCORT': 'Escort beside you — +1 DEF while adjacent',
  'UI-HINT-PREFER-DARK': 'This fauna prefers shadow — stay in LIT',
  'UI-HINT-PREFER-LIT': 'This hunter prefers light — break line of sight or find shadow',
  'UI-HINT-QUEST': 'Optional site — follow the amber OPT line',
  'UI-HINT-QUEST-REMOTE': 'Optional site — follow amber frame · see OPT line',
  'UI-HINT-NPC': 'Field contact — press Enter / Space / > to talk',
  'UI-HINT-AGENDA-COMM':
    'Field comm worn — open agenda contact within two tiles · Enter / Space / >',
  'UI-TUT-MOVE': 'WASD move · . wait · lamp and Flare change who notices you',
  'UI-TUT-LIGHT':
    'LIT safer fights · SHADOW ambush risk — Flare (i → select → u) lights dark fights',
  'UI-TUT-KIT': 'Salvage in kit — i, select Salvage, u to scan (item or backlash)',
  'UI-TUT-HAZARD':
    'Ion tile drains Power — step off, i→select Sealant Foam→u, or take the south detour',
  'UI-TUT-WAKE':
    'Fauna notice your lamp and shadow — stay LIT when you can · Flare for dark fights',
  'UI-TUT-FIGHT': 'Walk into them to hit · dark: i, select Plasma Flare, u',
  'UI-TUT-STALKER': 'Hunter winding up — Flare, leave the painted tiles, or go south',
  'UI-TUT-GOTO-PHASER':
    'East phaser bay — pick up Survey Phaser, wear it, fire at 2–3 tiles on a clear lane',
  'UI-TUT-PHASER-PICKUP': 'Survey Phaser on the deck — walk onto it, then i → u to wear',
  'UI-TUT-PHASER-EQUIP': 'Wear the phaser (u) — step toward a hostile 2–3 out to fire',
  'UI-TUT-PHASER':
    'Stand on the lane — step toward a mite 2–3 tiles away (−4 Power) · adjacent is melee',
  'UI-TUT-GOTO-HATCH': 'East hatch ends the drill — step on it (Power drip then goes live)',
  'UI-TUT-EXIT':
    'On hatch — step on it or press Enter / Space to start the drop (Power drip goes live)',
  'UI-QUEST-TRACK': 'OPT',
  'UI-QUEST-PAYS': 'pays',
  'UI-QUEST-BILLS': 'bills',
  'UI-QUEST-PAYS-KIT': 'kit + XP',
  'UI-QUEST-BADGE': 'OPT',
  'UI-RQ-KIND-SALVAGE': 'SALVAGE',
  'UI-RQ-KIND-PURGE': 'PURGE',
  'UI-RQ-KIND-VENT': 'VENT',
  'UI-RQ-COST-TIME': 'Power time',
  'UI-RQ-COST-HP': 'HP',
  'UI-RQ-COST-KIT': 'sealant',
  'UI-RQ-SALVAGE': 'Salvage console — Enter / Space / >',
  'UI-RQ-PURGE': 'Purge nest — step in to wake hostiles',
  'UI-RQ-PURGE-WAKE': 'Clear hostiles — then Enter / Space / >',
  'UI-RQ-PURGE-CLAIM': 'Claim crate — Enter / Space / >',
  'UI-RQ-VENT-A': 'Vent — Sealant Foam here (i → select → u)',
  'UI-RQ-VENT-B': 'Seal console — Enter / Space / > to finish',
  'UI-LOADOUT-CHIP': 'LOADOUT',
  'UI-LOADOUT-NET': 'Worn loadout',
  'UI-KIT-TAGS': 'Tags when worn',
  'UI-TAG-FLARE-RED': 'Flare Power −',
  'UI-TAG-FLARE-MARK': 'Shadow flare mark +',
  'UI-TAG-ION-RED': 'Ion damage −',
  'UI-TAG-VENT-EXTRA': 'Vent drain +',
  'UI-TAG-DARK-NOTICE': 'Dark notice −',
  'UI-TAG-LIT-PEN': 'Lit status +',
  'UI-TAG-SALVAGE': 'Salvage fail −',
  'UI-TAG-STATUS-RED': 'Status ticks −',
  'UI-TAG-FOV-CAP': 'FOV cap −',
  'UI-TAG-FLARE-EM': 'Flare EM +',
  'UI-TAG-BLEED': 'Bleed −',
  'UI-TAG-ON-HIT-BLEED': 'On-hit bleed +',
  'UI-TAG-ON-HIT-STUN': 'On-hit stun +',
  'UI-TAG-HAZ-SKIP': 'Hazard ion skip',
  'UI-TAG-HAZ-DRAIN': 'Hazard Power −',
  'UI-TAG-TRIP-EM': 'Tripwire EM −',
  'UI-PAGES': 'Mission PADD',
  'UI-PAGES-EMPTY': 'No PADD pages recovered this mission.',
  'UI-PAGES-HINT': 'p or Esc — close',
  'UI-PAGES-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Optional sites grant extract rewards.',
  'UI-ACTIVE': 'SYS',
  'UI-END-SUMMARY': 'Last objective · proficiency',
  'UI-QUEST-KEY': 'SPLICE KEY',
  'UI-QUEST-CORE': 'NAV LATTICE',
  'UI-RELAY-OPEN': 'BEACON OPEN',
  'UI-HANDSHAKE': 'HANDSHAKE',
  'UI-UPLINK': 'UPLINK',
  'UI-WAVE-NEXT': 'WAVE NEXT',
  'UI-PROBE': 'Vision',
  'UI-STIM': 'Stim',
  'UI-PLATE': 'Shield',
  'UI-ARMOR': 'Shield',
  'UI-TOOL': 'Tool',
  'UI-EQUIP-ARMOR': 'Suit',
  'UI-ALLY-DRONE': 'DRONE LAMP',
  'UI-ALLY-ESCORT': 'ESCORT',
  'UI-FILTER': 'Filter',
  'UI-WORN': 'worn',
  'UI-WEARABLE': 'equip',
  'UI-WIN': 'EXTRACTION COMPLETE',
  'UI-WIN-BODY': 'Nav lock restored. Halcyon confirms drop skiff pickup.',
  'UI-LOSE-HP': 'HP DEPLETED',
  'UI-LOSE-HP-BODY': 'HP reached 0 — fatal contact.',
  'UI-LOSE-ENERGY': 'POWER FAILURE',
  'UI-LOSE-ENERGY-BODY': 'Power stayed at 0 — kit charge gone.',
  'UI-LOSE-STUCK': 'MISSION ABORT',
  'UI-LOSE-STUCK-BODY': 'No viable path left to extract.',
  'UI-RETRY': 'ENTER — new survey team · ESC — title',
  'UI-EMPTY-INV': 'Field kit empty',
  'UI-INV-HINT': '↑↓ / WASD select · 1–9,0 jump · u act · i / Esc close',
  'UI-INV-SCROLL': 'slots',
  'UI-KIT-SCROLL-UP': '▲ more above',
  'UI-KIT-SCROLL-DOWN': '▼ more below',
  'UI-KIT-EMPTY-TIP': 'Step onto kit on the deck to stow it.',
  'UI-KIT-USE': 'u — use',
  'UI-KIT-EQUIP': 'u — equip',
  'UI-KIT-STOW': 'u — stow',
  'UI-KIT-QUEST': 'quest — deliver at objective',
  'UI-KIT-POWER': 'cost',
  'UI-KIT-POWER-HAVE': 'Power',
  'UI-KIT-POWER-READY': 'ready',
  'UI-KIT-POWER-SHORT': 'short',
  'UI-KIT-FEEDBACK': '!',
  'UI-DOCK-LEGEND': '? help · i kit · u use · . wait · Enter act · p PADD · n map · l log · m mute',
  'UI-SKILL-CHIP': 'Skills',

  // Mission
  'LOC-VIRE7': 'Meridian Shelf',
  'OBJ-NAVCORE': 'Recover spare Nav Lattice from inland Contingency Cache.',
  'OBJ-RELAYKEY': 'Secure Splice Key from Crash Wreck Belt — prior Halcyon wreckage.',
  'OBJ-BEACON': 'Authorize Emergency Beacon with Splice Key to open inland path.',
  'OBJ-SHUTTLE': 'Reach Drop Skiff Ridge pad with Nav Lattice.',
  'OBJ-LOCAL-EXIT': '→ Sector hatch',
  'OBJ-LOCAL-KEY': '→ Splice Key',
  'OBJ-LOCAL-BEACON': '→ Beacon console',
  'OBJ-LOCAL-CORE': '→ Nav Lattice',
  'OBJ-LOCAL-SHUTTLE': '→ Drop skiff pad',
  'OBJ-LOCAL-ROOM': '⇢ Optional site',
  'OBJ-TUT-PHASER': '→ Phaser bay (2–3 tile lane drill)',
  'OBJ-TUT-HATCH': '→ East hatch (notice, Power hazard, phaser, kit)',
  'OBJ-TUT-BRIEF': 'Training — Power drip paused until you leave',
  'HAZ-BUS': 'Power critical',
  'UI-CODEX': 'PADD',

  // Sectors
  'SEC-PLAINS': 'Relay Scar Flats',
  'SEC-FLOOD': 'Shearwash Basin',
  'SEC-CANOPY': 'Shear Canopy',
  'SEC-REEF': 'Crystal Pulse Reef',
  'SEC-SPIRE': 'Array Mast Reach',
  'SEC-RUIN': 'Crash Wreck Belt',
  'SEC-BEACON': 'Emergency Beacon',
  'SEC-TRENCH': 'Inland Fault Cut',
  'SEC-DUCT': 'Power Conduit Warren',
  'SEC-ASH': 'Shear Ash Fields',
  'SEC-BRINE': 'Pulse Brine Flats',
  'SEC-VAULT': 'Contingency Cache',
  'SEC-FISSURE': 'Shear Fissure',
  'SEC-APPROACH': 'Skiff Approach',
  'SEC-RIDGE': 'Drop Skiff Ridge',

  // Codex (in-run PADD pages)
  'CODEX-SPIRE':
    'Mast log: abandoned survey arrays still ping — local fauna keyed to the residual beat.',
  'CODEX-TRENCH':
    'Corridor note: beacon seal lift exposed fault fauna nesting in cut rock inland.',
  'CODEX-BRINE':
    'Brine sample: pulse salts amplify hazard tiles; plasma filters buy minutes, not hours.',
  'CODEX-FISSURE':
    'Fissure brief: ion shear widens cracks — Power drain spikes on the skiff approach.',
  'CODEX-VAULT':
    'Cache scrap: spare nav lattices were contingency for long-range array blackout events.',
  'CODEX-REEF':
    'Reef survey: pulse-crystal banks scatter array returns — hunters ride the pulse.',
  'CODEX-DUCT':
    'Conduit memo: abandoned power junctions still vent; duct drones patrol seal points.',
  'CODEX-APPROACH':
    'Approach brief: ion shear can block skiff lock — keep a Power Cell ready.',
  'CODEX-GENERIC': 'PADD fragment recovered — Halcyon survey hand, incomplete.',
  // Fact-bound pages — each may only claim what src/data/codex.ts requires of it.
  'CODEX-FACT-NEST-SWARM':
    'Scrub note: nests hatch on footfall. Swarms read motion first, light second — skirt the beds.',
  'CODEX-FACT-BRINE-HUNTER':
    'Waterline note: pool glare hides the approach. Something patient works this flat — do not wade blind.',
  'CODEX-FACT-VENT-EM':
    'Conduit note: venting under contamination doubles the Power bill. Seal it or hold your breath and move.',
  'CODEX-FACT-TRIPWIRE':
    'Prior team strung wire across the approach. It still answers — and it tells the whole room.',
  'CODEX-FACT-SEALED':
    'Sealed hatch: optional. Stand beside it — Sealant Foam (u) or equip Pulse Baton and Enter / Space / >. Opens a side cache.',
  'CODEX-FACT-MACHINE':
    'Machine note: patrol units keep the old seal routes. They do not tire and they do not lose interest.',
  'CODEX-FACT-BRANDED':
    'Contact brief: marked specimen on this ground. Kill it for a branded wearable — or route with Flare, Pulse, or Filter.',
  'CODEX-FACT-BRINE':
    'Brine flat: pulse salts sit in the pools. Filters buy minutes; boots buy nothing.',
  'CODEX-FACT-VENT':
    'Vent field: power junctions still bleed here. Sealant Foam (u) before the corridor drains you.',
  'CODEX-FACT-RUBBLE':
    'Collapse note: rubble reads as cover until it shifts. Prior hand lost a window to a wrong line.',
  'CODEX-HOLO':
    'Archive holo: prior survey noted Splice Key wreckage inland — Power bleed is the real enemy.',
  'CODEX-ENSIGN':
    'Stranded ensign: escort protocol armed — temporary ally expires when Power fades.',
  'CODEX-TECH':
    'Field tech: Halcyon probe reboot successful — short combat assist only.',
  'CODEX-SURVEY':
    'Survey contact: bring a Nav Ping — unlocks an optional site.',
  // Items
  'ITEM-RELAY-KEY': 'Splice Key',
  'ITEM-RELAY-KEY-DESC': 'Opens the Emergency Beacon handshake — required for inland path.',
  'ITEM-NAV-CORE': 'Nav Lattice',
  'ITEM-NAV-CORE-DESC': 'Locks the drop skiff for extract — required to win.',
  'ITEM-MED': 'Field Hypo',
  'ITEM-MED-DESC': 'u — restore +22 HP and clear bleed. Stabilizes downed (HP 8).',
  'ITEM-ENERGY': 'Power Cell',
  'ITEM-ENERGY-DESC':
    'u — Power +32. Also lets the skiff lock and skips one uplink hold.',
  'ITEM-PROBE': 'Field Array Pulse',
  'ITEM-PROBE-DESC': 'u — −3 Power · +4 vision for 25 turns. Lamp only — not a damage bonus.',
  'ITEM-STIM': 'Combat Stim',
  'ITEM-STIM-DESC': 'u — −2 Power · strikes are Enhanced for 15 turns.',
  'ITEM-PLATE': 'Shield Charge',
  'ITEM-PLATE-DESC': 'u — repair +12 Shield.',
  'ITEM-FLARE': 'Plasma Flare',
  'ITEM-FLARE-DESC':
    'u — −2 Power · lights nearby tiles for 4 turns; damages and stuns adjacent foes; cancels overwatch; blocks the skiff pressure wave.',
  'ITEM-FILTER': 'Plasma Filter',
  'ITEM-FILTER-DESC': 'u — −1 Power · halves Power drain from hazards and plasma hits (50 turns).',
  'ITEM-BLADE': 'Combat Knife',
  'ITEM-BLADE-DESC': 'Equip for +1 ATK. Use again to stow.',
  'ITEM-BATON': 'Pulse Baton',
  'ITEM-BATON-DESC':
    'Equip for +1 ATK; melee stuns 2 turns. Adjacent sealed hatch: Enter / Space / > to pry. Use again to stow.',
  'ITEM-PHASER': 'Survey Phaser',
  'ITEM-PHASER-DESC':
    'Equip for +1 ATK. Step toward a visible hostile 2–3 tiles along a cardinal lane to fire a beam (−4 Power). Adjacent is still melee. Use again to stow.',
  'ITEM-HARNESS': 'EVA Harness',
  'ITEM-HARNESS-DESC': 'Equip for +6 max Shield (refills). Use again to stow.',
  'ITEM-VEST': 'Ablative Vest',
  'ITEM-VEST-DESC': 'Equip for +4 max Shield and +1 DEF. Use again to stow.',
  'ITEM-DART': 'Plasma Microdart',
  'ITEM-DART-DESC':
    'u then a direction: hit a lit target within 3 — damage and expose. Miss spends it; . cancels.',
  'ITEM-SEALANT': 'Sealant Foam',
  'ITEM-SEALANT-DESC':
    'Clears ion/vent/brine underfoot, flushes EM, or opens an adjacent sealed hatch (u).',
  'ITEM-MAPPER': 'Nav Ping',
  'ITEM-MAPPER-DESC': 'u — marks the sector hatch for 40 turns (even through fog).',
  'ITEM-SALVAGE': 'Salvage',
  'ITEM-SALVAGE-DESC':
    'u to scan — may become a kit item, or EM backlash and wake.',
  'ITEM-COMM': 'Field Comm',
  'ITEM-COMM-DESC':
    'Wear on comm slot — hail open NPC agendas from two tiles away. Use again to stow.',
  'ITEM-SCAN-BAND': 'Scan Band',
  'ITEM-SCAN-BAND-DESC':
    'Wear on either ring — at high EM, salvage scans fail less often. Use again to stow.',
  'ITEM-VISOR': 'Survey Visor',
  'ITEM-VISOR-DESC':
    'Wear on head — blind/jam ticks −1; vision −1 tile; flaring from shadow adds EM. Stow with u.',
  'ITEM-GLOVES': 'Grip Gloves',
  'ITEM-GLOVES-DESC':
    'Wear on hands — hazard tiles skip ion burn on step. Use again to stow.',
  'ITEM-BOOTS': 'Mag Boots',
  'ITEM-BOOTS-DESC':
    'Wear on feet — brine/hazard Power tax −1; tripwire EM spike −1. Use again to stow.',
  'ITEM-FLARE-PRISM': 'Flare Prism',
  'ITEM-FLARE-PRISM-DESC':
    'Branded ring — flare spends −1 Power; shadow-flares mark +1 turn. Elite flarebound drop. Stow with u.',
  'ITEM-WARD-WEAVE': 'Ward Weave',
  'ITEM-WARD-WEAVE-DESC':
    'Branded suit — +3 Shield, ion −2; vent tiles cost +1 Power per step. Elite warded drop. Stow with u.',
  'ITEM-SHADOW-LENS': 'Shadow Lens',
  'ITEM-SHADOW-LENS-DESC':
    'Branded head mount — dark-prefer notice −1 in shadow; blind/jam +1 turn in lit tiles. Elite shadowbound drop.',
  // Enemies
  'ENEMY-MITE': 'Scar Mite',
  'ENEMY-SPORE': 'Wash Spore',
  'ENEMY-WASP': 'Pulse Wasp',
  'ENEMY-STALKER': 'Canopy Hunter',
  'ENEMY-LEECH': 'Shear Leech',
  'ENEMY-CRAWLER': 'Ash Crawler',
  'ENEMY-SENTINEL': 'Cache Sentinel',
  'ENEMY-SERPENT': 'Brine Coil',
  'ENEMY-WRAITH': 'Ash Wraith',
  'ENEMY-DRONE': 'Array Guard',
  'ENEMY-MASTLING': 'Array Feeder',
  'ENEMY-SKITTER': 'Fault Skitter',
  'ENEMY-RIFT': 'Fissure Rift',
  'ENEMY-REEF-SKITTER': 'Reef Skitter',
  'ENEMY-DUCT-DRONE': 'Duct Drone',
  'ENEMY-ELITE-SKIRM': 'Prime Skirmisher',
  'ENEMY-ELITE-WARD': 'Cache Warden',
  'ENEMY-ELITE-APEX': 'Apex Hunter',
  'ENEMY-WARDEN': 'Splice Warden',
  'ENEMY-CUSTODIAN': 'Pattern Custodian',
  'ENEMY-SOVEREIGN': 'Shear Sovereign',
  'NPC-HOLO': 'Archive Holo',
  'NPC-ENSIGN': 'Stranded Ensign',
  'NPC-TECH': 'Field Tech',
  'NPC-SURVEY': 'Survey Contact',
  'ALLY-DRONE': 'Halcyon Probe',
  'ALLY-ESCORT': 'Survey Escort',
  'ENEMY-MITE-NOTE': 'Packs thicken near your lamp — fight in a doorway or break contact.',
  'ENEMY-SPORE-NOTE': 'Swells, then bursts. Leave the painted tiles or kill it.',
  'ENEMY-WASP-NOTE': 'Closes fast on anything broadcasting — kill it or break line of sight.',
  'ENEMY-MASTLING-NOTE': 'Bites, then steps back. Close the gap or let it go.',
  'ENEMY-SKITTER-NOTE': 'Fast ambush — opens wounds on contact.',
  'ENEMY-RIFT-NOTE': 'Holds range and pulses ion. Shield will not save you — leave the ring.',
  'ENEMY-REEF-NOTE': 'Ambush from the crystal banks — plasma bite. Stay LIT if you can.',
  'ENEMY-DUCT-NOTE': 'Cuts a beam down the lane it faces — step off the line or kill it.',
  'ENEMY-SERPENT-NOTE': 'Coils, then lunges one tile. Clear the ring or kill it.',
  'ENEMY-WRAITH-NOTE': 'Covers two tiles on the charge — stepping back will not break it.',
  'ENEMY-SENTINEL-NOTE': 'Arms overwatch on the tiles beside it — do not step in while it is locked.',
  'ENEMY-DRONE-NOTE': 'Patrols sightlines — beam cut on the lane it faces.',
  'ENEMY-ELITE-NOTE': 'Elite fauna — strong kit drop on kill.',
  'ENEMY-BOSS-NOTE': 'Optional apex — strong kit drop on kill.',
  'BRAND-FLAREBOUND': 'FLAREBOUND — Flares hit harder and stun longer; drops a Flare on kill.',
  'BRAND-WARDED': 'WARDED — its ion hits are softer; drops a Shield Charge on kill.',
  'BRAND-SHADOWBOUND': 'SHADOWBOUND — +1 notice against you in shadow; drops a Field Array Pulse on kill.',

  // Logs
  'LOG-DROP':
    'Meridian Shelf drop. Field array still bleeding EM — fauna will wake. Recover Lattice; extract before Power hits 0.',
  'LOG-TUT-WELCOME':
    'Drill bay — Power drip paused. Room 1: notice + hazard. Room 2: Survey Phaser lanes. East hatch starts the real drop.',
  'LOG-TUT-LIGHT':
    'Lamp stops at walls. Badge: LIT safer · SHADOW ambush risk.',
  'LOG-TUT-HAZARD':
    'Ion tile drains Power — Sealant (i → select → u) or take the south detour.',
  'LOG-TUT-WAKE':
    'Fauna notice your lamp and shadow footprint — Flare lights dark fights.',
  'LOG-TUT-PHASER':
    'Phaser bay — cardinal lanes at 2–3 tiles. Adjacent stays melee. Fire once, then the hatch.',
  'LOG-TUT-DONE':
    'Power drip is live. Order: Splice Key → beacon → Nav Lattice → drop skiff.',
  'LOG-MOVE-BLOCKED': 'Cannot walk there.',
  'LOG-WAIT': 'Holding position.',
  'LOG-HIT': 'You strike',
  'LOG-KILL': 'Hostile down',
  'LOG-HURT': 'You take a hit',
  'LOG-SHADOW-BITE': 'Harder bite in SHADOW — step to LIT',
  'LOG-ARMOR-ABSORB': 'Shield absorbs',
  'LOG-ARMOR-RESEAT': 'Hatch restock — Shield restored.',
  'LOG-PICKUP': 'Stowed in field kit.',
  'LOG-NPC-HAIL': 'Field contact hailed.',
  'LOG-NPC-SIGHT': 'Field contact nearby.',
  'LOG-NPC-HOLO': 'Archive dump — Power Cell recovered.',
  'LOG-NPC-ENSIGN': 'Ensign transfers kit scrap and escort protocol.',
  'LOG-NPC-TECH': 'Tech reboots a Halcyon probe for temporary assist.',
  'LOG-NPC-SURVEY': 'Survey contact shares bearings — optional site open.',
  'LOG-NPC-BLOCK': 'Contact occupies that tile — hail with Enter / Space / > or step around.',
  'LOG-AGENDA-WANT-MED': 'Ensign needs a Field Hypo spare — hail again when you have one.',
  'LOG-AGENDA-WANT-SEALANT': 'Tech wants Sealant Foam or a Filter — hail again when ready.',
  'LOG-AGENDA-WANT-SURVEY': 'Contact wants a Nav Ping — hail again when you have one.',
  'LOG-AGENDA-NONE': 'Contact has nothing further.',
  'LOG-AGENDA-DONE': 'Contact repaid — Power Cell spare.',
  'LOG-ALLY-UP': 'Ally online.',
  'LOG-ALLY-HIT': 'Ally strikes',
  'LOG-ALLY-KILL': 'Ally downs hostile',
  'LOG-ALLY-HURT': 'Ally hit',
  'LOG-ALLY-DOWN': 'Ally down',
  'LOG-ALLY-EXPIRE': 'Ally offline',
  'LOG-ALLY-FULL': 'Ally slot full — dismiss or wait for expire.',
  'LOG-ALLY-NO-SPACE': 'No clear tile to deploy ally.',
  'LOG-DRONE-INTERRUPT': 'Drone lamp disrupts overwatch.',
  'LOG-NO-PICKUP': 'Nothing underfoot to recover.',
  'LOG-INV-FULL': 'Field kit is full — use an item to free a slot.',
  'LOG-ELITE-CONTACT': 'Elite fauna nearby — strong drop if engaged.',
  'LOG-BOSS-TELE': 'Apex hostile telegraphs — heavy strike incoming.',
  'LOG-BOSS-DOWN': 'Apex down — kit recovered.',
  'LOG-ELITE-DOWN': 'Elite down — salvage recovered.',
  'LOG-USE-MED': 'Field Hypo used — HP restored.',
  'LOG-USE-ENERGY': 'Power Cell slotted — Power restored.',
  'LOG-USE-PROBE': 'Field Array Pulse active — +4 vision (not damage).',
  'LOG-USE-STIM': 'Combat stim active — strikes Enhanced.',
  'LOG-USE-PLATE': 'Shield Charge bonded — Shield repaired.',
  'LOG-USE-FLARE': 'Plasma Flare discharged — adjacent hostiles stunned.',
  'LOG-USE-FILTER': 'Plasma Filter online — drain and plasma hits reduced.',
  'LOG-USE-BLADE': 'Combat knife equipped — +1 ATK while worn.',
  'LOG-USE-BATON': 'Pulse Baton equipped — +1 ATK; melee stuns.',
  'LOG-USE-PHASER-EQUIP': 'Survey phaser equipped — step toward a hostile 2–3 tiles out to fire.',
  'LOG-USE-PHASER': 'Survey phaser — beam along the lane (−4 Power).',
  'LOG-USE-HARNESS': 'EVA harness equipped — shield capacity up.',
  'LOG-USE-VEST': 'Ablative vest equipped — Shield + DEF.',
  'LOG-USE-COMM': 'Field comm online — agenda hail range extended.',
  'LOG-USE-SCAN-BAND': 'Scan band worn — salvage steadies at high EM.',
  'LOG-USE-VISOR': 'Survey visor mounted — blind/jam softened; vision capped.',
  'LOG-USE-GLOVES': 'Grip gloves worn — hazard ion contact muted.',
  'LOG-USE-BOOTS': 'Mag boots locked — brine and wire tax eased.',
  'LOG-USE-FLARE-PRISM': 'Flare Prism seated — cheaper flares, harsher shadow marks.',
  'LOG-USE-WARD-WEAVE': 'Ward Weave worn — ion blunted; vents tax Power.',
  'LOG-USE-SHADOW-LENS': 'Shadow Lens mounted — hunters shrink in shadow; lit tiles bite longer.',
  'LOG-UNEQUIP': 'Gear stowed in kit.',
  'LOG-USE-DART': 'Plasma microdart impact — target exposed.',
  'LOG-USE-SEALANT': 'Sealant Foam set — vent/hazard cleared.',
  'LOG-SEALED-BLOCK':
    'Sealed hatch — optional. Sealant Foam (u) or equip Pulse Baton then Enter / Space / >.',
  'LOG-SEALED-NEED-TOOL':
    'Sealed hatch — Sealant Foam (i then u) or equip Pulse Baton then Enter / Space / >.',
  'LOG-INTERACT-MISS':
    'Not on a sector hatch, beacon, or pad — stand on it, then Enter / Space / >. Sealed hatches open from beside.',
  'LOG-SEALED-OPEN': 'Sealant Foam opens the sealed hatch — path clear.',
  'LOG-SEALED-PRY': 'Pulse Baton pries the sealed hatch open.',
  'LOG-SEALED-CACHE': 'Sealed hatch cache opened.',
  'LOG-TRIPWIRE': 'Tripwire snaps — EM spike; nearby fauna alerted.',
  'LOG-BRINE-POOL': 'Brine pool drains Power.',
  'LOG-SCRUB-NEST': 'Scrub nest stirs — mite emerges.',
  'LOG-SEALANT-FAIL': 'No vent or hazard underfoot to seal.',
  'LOG-AIM-DART': 'Microdart ready — choose fire direction.',
  'LOG-AIM-MISS': 'Microdart spent — no valid visible target in range.',
  'LOG-AIM-CANCEL': 'Dart aim cancelled.',
  'LOG-USE-FAIL': 'No usable item selected.',
  'LOG-USE-EMPTY': 'Field kit empty — nothing to use.',
  'LOG-USE-NO-POWER': 'Not enough Power for that kit action.',
  'LOG-USE-QUEST': 'Objective item — not consumable (carry to beacon / drop skiff).',
  'LOG-DRAIN': 'Power siphoned',
  'LOG-SPORE-BURST': 'Wash spore burst — power spike and burn.',
  'LOG-TELE-SWELL': 'Spore swelling — burst imminent.',
  'LOG-TELE-POUNCE': 'Hostile windup — one-tile lunge. Clear the ring or kill it.',
  'LOG-TELE-REACH': 'Long windup — it can cover two tiles. Backing off will not break it.',
  'LOG-CHARGE-WINDED': 'Overcommitted charge — it lands winded and open.',
  'LOG-TELE-ZONE': 'Rift charging a standoff pulse — leave the ring, Shield will not hold.',
  'LOG-ZONE-PULSE': 'Ion pulse washes the ring — seams exposed.',
  'LOG-ZONE-FIZZLE': 'Ion pulse discharges into empty ground.',
  'LOG-TELE-BEAM': 'Drone beam charging — break line or kill it.',
  'LOG-BEAM-FIRE': 'Drone ion beam rakes the lane.',
  'LOG-BEAM-BLOCKED': 'Drone beam splashes against cover.',
  'LOG-TELE-OVERWATCH': 'Sentinel overwatch locked — do not enter adjacent tiles.',
  'LOG-OVERWATCH-FIRE': 'Sentinel overwatch strikes first.',
  'LOG-PUNISH': 'It is off balance — clean hit.',
  'LOG-ENHANCED': 'Strike lands Enhanced.',
  'LOG-IMPAIRED': 'Strike lands Impaired.',
  'LOG-CRIT-SAVE': 'Past 0 HP — you stay on your feet.',
  'LOG-DOWNED': 'Past 0 HP — you are downed. Use Field Hypo (u) before the clock runs out.',
  'LOG-DOWNED-TICK': 'Hit while downed — the clock shortens.',
  'LOG-DOWNED-ACT': 'Downed — cannot strike. Field Hypo (u), move, or wait.',
  'LOG-STABILIZE': 'Field Hypo holds you together. You are on your feet.',
  'LOG-KEEP-CALM-FAIL': 'EM spike — kit jammed.',
  'LOG-PAY-PRICE': 'The extract takes a price.',
  'LOG-CONTAMINATION': 'Spore contamination drains Power.',
  'LOG-AMBUSH': 'Hunter breaks cover.',
  'LOG-AMBUSH-DARK': 'Hunter strikes from the dark — no telegraph.',
  'LOG-STATUS-BLEED': 'Bleed tick',
  'LOG-STATUS-ION': 'Plasma burn',
  'LOG-STATUS-BLIND': 'Optics washed — vision narrowed.',
  'LOG-STATUS-JAM': 'Kit jammed — Field Array Pulse blocked.',
  'LOG-JAM-BLOCK': 'Systems jammed — cannot apply Field Array Pulse.',
  'LOG-STATUS-MARKED': 'Marked — fauna interest rising.',
  'LOG-LOOT-DROP': 'Salvage drops from the carcass.',
  'LOG-BRAND-SIGHT': 'Branded hostile identified.',
  'LOG-BRAND-DROP': 'Branded wearable recovered from the kill.',
  'LOG-GOT-KEY': 'Splice Key acquired from Crash Wreck Belt. Proceed to Emergency Beacon.',
  'LOG-USED-KEY':
    'Beacon authorized. Inland corridor open — Contingency Cache holds spare Nav Lattice.',
  'LOG-NEED-KEY': 'Beacon sealed. Splice Key required.',
  'LOG-EXIT-NEED-KEY': 'Hatch locked — recover the Splice Key in this wreck first.',
  'LOG-EXIT-NEED-CORE': 'Hatch locked — recover the Nav Lattice before vault will release you.',
  'LOG-EXIT-NEED-BEACON': 'Hatch locked — authorize the beacon console first.',
  'LOG-GOT-CORE': 'Nav Lattice secured from Contingency Cache. Return to Drop Skiff Ridge pad.',
  'LOG-NEED-CORE': 'Drop skiff refuses lock — Nav Lattice missing.',
  'LOG-SECTOR': 'Sector boundary crossed.',
  'LOG-SEC-PLAINS':
    'Relay Scar Flats. Drop burns still warm — scar mites graze residual array bleed on the flats.',
  'LOG-SEC-FLOOD':
    'Shearwash Basin. Standing shear-water sheets the shelf — Power will feel every step; wash spores bloom in the wet EM.',
  'LOG-SEC-CANOPY':
    'Shear Canopy. Dense EM scatter under the leaf decks — hunters stalk warm gear.',
  'LOG-SEC-REEF':
    'Crystal Pulse Reef. Crystal scatter and scrub banks — EM hunters ride the reef pulse.',
  'LOG-SEC-SPIRE':
    'Array Mast Reach. Abandoned survey arrays still hum — array feeders drink residual EM.',
  'LOG-SEC-RUIN':
    'Crash Wreck Belt. Prior survey wreckage — Splice Key in local caches.',
  'LOG-SEC-BEACON': 'Emergency Beacon hub. Authorize with Splice Key to unseal inland path.',
  'LOG-SEC-TRENCH':
    'Inland Fault Cut. Inland after seal — cut rock, deep fauna, no ship cover.',
  'LOG-SEC-DUCT':
    'Power Conduit Warren. Abandoned junction warren — vent spines and rubble chokes.',
  'LOG-SEC-ASH': 'Shear Ash Fields. Baseline radiation — Power drain elevated.',
  'LOG-SEC-BRINE':
    'Pulse Brine Flats. Ion-brine pools lace the shelf — hazard density spikes before the cache.',
  'LOG-SEC-VAULT':
    'Contingency Cache. Halcyon depot. Sentinels are site defense — EM-corrupted, still hostile.',
  'LOG-SEC-FISSURE':
    'Shear Fissure. Ion shear opens the rock — Power drain spikes; pad still inland.',
  'LOG-SEC-APPROACH':
    'Skiff Approach. Storm shear over the final choke — Drop Skiff Ridge ahead.',
  'LOG-SEC-RIDGE': 'Drop Skiff Ridge. Drop skiff pad ahead — Nav Lattice required for lock.',
  'LOG-EXIT-BLOCKED': 'Sector hatch will not open yet.',
  'LOG-HAZARD': 'Ion hazard — Power drain.',
  'LOG-EXTRACT': 'Nav lock restored. Extraction complete.',
  'LOG-FAVOR-GRANT': 'Optional-site reward secured.',
  'LOG-FAVOR-CONSUME': 'Optional-site reward spent.',
  'LOG-FAVOR-HAZARD': 'Hazard step skipped — reward spent.',
  'LOG-FAVOR-PATTERN': 'Skiff lock saved — reward spent.',
  'LOG-UPLINK-START': 'Nav Lattice uplink started — hold the ridge pad.',
  'LOG-UPLINK-HOLD': 'Uplink hold maintained.',
  'LOG-UPLINK-TICK': 'Uplink signal climbing.',
  'LOG-UPLINK-WAVE-IN': 'Pressure wave next hold — Flare to block or Power Cell to skip ahead.',
  'LOG-UPLINK-WAVE-HIT': 'Pressure wave hits the pad.',
  'LOG-UPLINK-WAVE-REPEL': 'Flare blocks the pressure wave.',
  'LOG-UPLINK-COOLANT': 'Power Cell skips an uplink hold.',
  'LOG-UPLINK-FLARE': 'Flare ready for the incoming pressure wave.',
  'LOG-UPLINK-INTERRUPT': 'Uplink interrupted — left the ridge pad.',
  'LOG-BUS-WARN': 'Power low — use a Power Cell.',
  'LOG-BUS-FAILING': 'Power at 0 — use a Power Cell this turn or the kit dies.',
  'LOG-WINDUP-KILL': 'Windup interrupted — salvage bonus.',
  'LOG-USE-MAPPER': 'Nav ping — hatch bearing locked.',
  'LOG-USE-MAPPER-CACHE': 'Nav ping — cache bearing locked on minimap.',
  'LOG-CACHE-CLEAR': 'Sector caches cleared — survey bonus.',
  'LOG-COMM-CACHE-HINT': 'Field comm picks up cache bearing — check minimap after Nav ping.',
  'LOG-RQ-BRIEF-SALVAGE':
    'Optional SALVAGE — bills Power time · pays kit + XP · follow amber frame.',
  'LOG-RQ-BRIEF-PURGE':
    'Optional PURGE — bills HP · pays Skip 1 hazard · follow amber frame.',
  'LOG-RQ-BRIEF-VENT':
    'Optional VENT SEAL — bills sealant · pays Block 1 skiff lock · two sites.',
  'LOG-RQ-SALVAGE': 'Optional salvage complete — kit and PADD page recovered.',
  'LOG-RQ-PURGE': 'Optional purge complete — hostiles cleared; crate unlocked.',
  'LOG-RQ-PURGE-WAKE': 'Optional purge — hostiles spawning.',
  'LOG-RQ-PURGE-NEED-WAKE': 'Purge nest — step in to wake hostiles first.',
  'LOG-RQ-PURGE-NEED-CLEAR': 'Purge nest — clear hostiles before claiming crate.',
  'LOG-RQ-CHARGE': 'Optional site — temporary combat/filter systems online.',
  'LOG-CODEX': 'PADD page filed.',
  'LOG-RQ-NEED': 'Optional site still open — finish the remaining steps.',
  'LOG-RQ-VENT-NEED-SEALANT': 'Vent seal — use Sealant Foam on the vent tile.',
  'LOG-RQ-STEP': 'Optional site — step done.',
  'LOG-RQ-VENT': 'Vent seal complete — warren pressure dropping.',
  'LOG-RQ-VENT-SEALED': 'Vent sealed — proceed to the seal console.',
  'LOG-HS-START': 'Beacon handshake started — hold position for sync.',
  'LOG-HS-TICK': 'Beacon handshake syncing.',
  'LOG-HS-INTERRUPT': 'Handshake interrupted — left the beacon pad.',
  'LOG-PB-STRESS': 'Skiff lock at risk — keep a Power Cell ready.',
  'LOG-PB-SYNC': 'Skiff lock clear.',
  'LOG-PB-REJECT': 'Skiff will not lock — use a Power Cell.',
  'LOG-PB-DESYNC': 'Skiff will not lock — use a Power Cell.',
  'LOG-EVT-AFTERGLOW':
    'Drop afterglow — EM spike. Sealant Foam helps clean residue.',
  'LOG-EVT-APPROACH': 'Pad approach — ion shear pulses Power; keep a Power Cell for skiff lock.',
  'LOG-EVT-SHEAR': 'Ion shear pulse — Power drain on the approach.',
  'LOG-ION-FRONT': 'Ion front forming — drains EM and Power; lit fauna track harder.',
  'LOG-ION-PULSE': 'Ion front pulse — +2 EM and -2 Power; Filter or Flare dampens it.',
  'LOG-ION-DAMPEN': 'Ion front pulse dampened by field kit.',
  'LOG-ION-CLEAR': 'Ion front clearing — sector pressure subsides.',
  'LOG-XP': 'XP gained.',
  'LOG-LEVEL': 'Level up.',
  'LOG-SKILL': 'Field skill unlocked.',
  'LOG-SKILL-PICK': 'Choose a field skill — press 1 or 2.',
  'LOG-SKILL-NEED': 'Skill choice pending — press 1 or 2.',
  'LOG-EM-WARN': 'EM contamination rising — fauna growing agitated.',
  'LOG-EM-HIGH':
    'EM contamination critical — Power drain and wider aggro. Sealant Foam flushes residue.',
  'LOG-EM-PURGE': 'EM contamination flushed.',
  'LOG-SALVAGE-ID': 'Salvage scan complete — kit item recovered.',
  'LOG-SALVAGE-BAD': 'Unstable salvage — EM backlash and local wake.',
  'LOG-PADD-MOD': 'PADD page filed — field notes updated.',
  'UI-EM': 'EM',
  'UI-EM-CRIT': 'EM critical',
  'UI-EM-WARN': 'EM warning',
  'UI-SKIFF-LOCK': 'Skiff lock',
  'UI-CLOCKS-LIVE': 'ION SHEAR ACTIVE',
  'UI-CLOCK-LOW': 'LOW',
  'UI-CLOCK-CRIT': 'CRITICAL',
  'UI-SKILL-PICK': 'Field skill',
  'UI-SKILL-CHOOSE': 'Press 1 or 2 to choose. Movement locked until you pick.',
  'UI-LEVEL': 'LVL',
  'UI-XP': 'XP',
  'UI-MAPPER': 'NAV',
  'SKILL-TRIAGE-NAME': 'Field Medicine',
  'SKILL-TRIAGE-DESC': 'On sector entry: restore +6 HP.',
  'SKILL-SCAVENGER-NAME': 'Scavenger Eye',
  'SKILL-SCAVENGER-DESC': '+15% salvage drops; safer salvage scans.',
  'SKILL-OVERCHARGE-NAME': 'Overcharge Strike',
  'SKILL-OVERCHARGE-DESC': 'While HP ≤ 50%, strikes are Enhanced.',
  'SKILL-ION-SKIN-NAME': 'Plasma Skin',
  'SKILL-ION-SKIN-DESC': 'Active filter also halves weapon hits.',
  'SKILL-DEEP-RESERVE-NAME': 'Deep Reserve',
  'SKILL-DEEP-RESERVE-DESC': 'Skip one Power drain every 10 turns.',
} as const;

export type LoreId = keyof typeof LORE;

export function lore(id: LoreId): string {
  return LORE[id];
}
