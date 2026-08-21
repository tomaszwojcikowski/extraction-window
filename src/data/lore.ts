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
    'Reach the east hatch. Power does not drip here.\n' +
    '\n' +
    'WASD — move · . — wait · step on kit to take it\n' +
    'i — open kit · u — use selected item\n' +
    '\n' +
    'Yellow tiles drain Power — walk around them, or use a Filter.\n' +
    'LIT is safer · SHADOW can ambush · Flare lights a dark fight.\n' +
    '\n' +
    'Press ? after the hatch for the full manual.\n',
  'UI-HELP-BODY':
    'CONTROLS\n' +
    'WASD / arrows — move one tile\n' +
    '. — wait\n' +
    'i — kit · u — use or equip · step onto kit to pick it up\n' +
    'Enter / Space / > — hatch, beacon, pad, optional site, talk\n' +
    'n — minimap · p — PADD · l — mission log · ? — help · m — mute · Esc — close\n' +
    'Title only: c — field bulletin (ship notes)\n' +
    'Amber dashed frame on a tile — optional site (see OPT line in HUD)\n' +
    '1 / 2 — pick field skill when prompted\n' +
    '\n' +
    'POWER CLOCK\n' +
    'Power — kit charge. Sector drip, hazards, EM, and kit spends drain it. Empty Power = lose.\n' +
    '\n' +
    'EXPLORATION PRESSURE\n' +
    'No turn timer. Shear and fauna raise pressure. The dial is not a countdown.\n' +
    '\n' +
    'COMBAT\n' +
    'Walk into a hostile to hit it. Worn Survey Phaser: step toward a visible foe 2–3 tiles along that cardinal to fire a beam (−Power); adjacent is still melee.\n' +
    'Hits compare ATK to DEF.\n' +
    'Impaired = weaker hits (jammed, blind, or kit full). Enhanced = stronger hits (stunned or exposed foe, stim, overcharge, or a first SHADOW strike on an unaware foe).\n' +
    'Windup paints the tiles it will strike next turn — leave those tiles, bump it, or kill it.\n' +
    'Catch fauna in the light they do not want: LIT vs shadow-hunters, SHADOW vs lamp-hunters, for +1.\n' +
    'Two+ hostiles touching you drop DEF — fight in a doorway or break contact.\n' +
    'Past 0 HP: you may stay up or go downed. Field Hypo (u) stabilizes. Extra hits while downed shorten the clock.\n' +
    'Painted side tiles show where a second hunter will touch you.\n' +
    '\n' +
    'LIGHT\n' +
    'LIT — safer read · SHADOW — ambush risk. Your lamp and flares change who notices you.\n' +
    'Some fauna bite harder in SHADOW — step to LIT. Fight them in the opposite light for +1. Flare lights a dark fight.\n' +
    '\n' +
    'EXTRACT (pink marker)\n' +
    '1 Splice Key · 2 beacon · 3 Nav Lattice · 4 drop skiff\n' +
    'On the skiff: > start · . hold · Power Cell skips · Flare blocks the wave.\n' +
    '\n' +
    'OPTIONAL (amber frame — skip anytime)\n' +
    'Room site · OPT badge · Enter / Space / > on the site.\n' +
    'Locked terminal in some rooms: splice a 5-mark lattice (WASD · Enter) — look ahead, a wrong channel bounces.\n' +
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
    'l — mission log (hidden by default)\n' +
    'EM high — Sealant Foam clears it',
  'UI-KIT-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Optional sites give extra rewards.',
  'UI-CONTROLS':
    'WASD move · . wait · i kit · n map · l log · ? help',
  'UI-CONTROLS-TITLE': 'WASD move · i kit · ? help · c bulletin',
  'UI-VERSION': 'Field build',
  'UI-CHANGELOG': 'FIELD BULLETIN',
  'UI-CHANGELOG-HINT': 'c — bulletin',
  'UI-CHANGELOG-BODY':
    'v1.7.0 — FIELD EAR\n' +
    '· Music beds track Power / shear / ion — storm mood retired\n' +
    '· Each biome colours the bed (rate / band / shear underlay)\n' +
    '· Flare, ion pulse, handshake, and kit-spend each have a voice\n' +
    '· Hatch-enter sting follows layout grammar (scatter→warren)\n' +
    '· Biome drones pick up grammar overlays; room roles tilt by shape\n' +
    '\n' +
    'v1.6.0 — FIELD READ\n' +
    '· Floor loot silhouettes: med, cell, flare, tool, wear\n' +
    '· Ion front tints the field, not only the HUD chip\n' +
    '· Allies and contacts stride like hostiles; escorts stay flat\n' +
    '· Blind / jam / marked wash the suit — sticky, not a punch\n' +
    '· Help, PADD, and bulletin share kit tape headers\n' +
    '· Breaching wakes hit harder; goal marker pulses on the meter tick\n' +
    '· Handshake pad shows sync stages; mapper memory ≠ fog\n' +
    '\n' +
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
  'UI-HINT-DESYNC': 'Skiff will not start — use a Power Cell',
  'UI-HINT-ITEM': 'Kit on this tile — step onto it to pick it up',
  'UI-HINT-ITEM-FULL': 'Kit full — free a slot (use an item), then step here again',
  'UI-HINT-AIM':
    'Aim dart — direction fires (lit, range 3) · . cancels · miss spends the dart',
  'UI-HINT-PHASER-TEACH':
    'Survey Phaser worn — step toward a visible hostile 2–3 tiles on a clear lane to fire (−4 Power). Adjacent stays melee.',
  'UI-HINT-PHASER-FIRE': 'Phaser lane live — step that direction to fire (−4 Power)',
  'UI-HINT-PHASER-LOW': 'Phaser needs 4 Power — use a Power Cell or walk in to melee',
  'UI-HINT-PHASER-RANGE':
    'Too close or too far for the phaser — stand 2–3 tiles away on a clear lane, or walk in',
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
    'EM high — open kit (i), select Sealant Foam, press u',
  'UI-HINT-SEALED':
    'Sealed hatch (optional) — need Sealant Foam or equip Pulse Baton',
  'UI-HINT-SEALED-SEALANT':
    'Sealed hatch — i, select Sealant Foam, press u to open',
  'UI-HINT-PRY-SEALED':
    'Sealed hatch — press Enter / Space / > to pry open (Pulse Baton equipped)',
  'UI-HINT-ION-FRONT':
    'Ion front — Filter or Flare stops the next pulse',
  'UI-HINT-FLARE':
    'Dark fight — open kit (i), select Plasma Flare, press u',
  'UI-HINT-LIGHT':
    'SHADOW — first unaware strike is Enhanced · LIT safer · Flare lights a dark fight',
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
  'UI-HINT-TELE': 'Windup painted — leave those tiles, bump it, or kill it',
  'UI-HINT-TELE-REACH': 'Two-tile windup — bump it, kill it, or step fully clear of the painted tiles',
  'UI-HINT-TELE-OVERWATCH':
    'Overwatch locked — do not step adjacent; Flare cancels or kill it',
  'UI-HINT-TELE-BEAM': 'Beam charging — break line of sight, bump it, or kill it',
  'UI-HINT-TELE-ZONE': 'Pulse charging — leave the painted ring, bump it, or kill it',
  'UI-HINT-BEACON-NEED-KEY':
    'Beacon sealed — carry the Splice Key, then Enter / Space / >',
  'UI-HINT-BRAND':
    'Branded elite — optional; equip its drop (Prism / Weave / Lens) or counter with Flare, Pulse, Filter',
  'UI-HINT-ALLY-DRONE': 'Drone lamp nearby — can cancel one overwatch every few turns',
  'UI-HINT-ALLY-ESCORT': 'Escort beside you — +1 DEF while adjacent',
  'UI-HINT-PREFER-DARK': 'This fauna prefers shadow — stay in LIT for +1',
  'UI-HINT-PREFER-LIT': 'This hunter prefers light — SHADOW is +1 and they notice you less',
  'UI-HINT-QUEST': 'Optional site — follow the amber OPT line',
  'UI-HINT-QUEST-REMOTE': 'Optional site — follow amber frame · see OPT line',
  'UI-HINT-CONSOLE': 'Locked terminal — Enter to splice',
  'UI-HINT-NPC': 'Someone here — press Enter / Space / > to talk',
  'UI-HINT-AGENDA-COMM':
    'Field comm worn — talk to a contact within two tiles · Enter / Space / >',
  'UI-AGENDA-CHIP-ENSIGN': 'JOB · hypo',
  'UI-AGENDA-CHIP-TECH': 'JOB · seal',
  'UI-AGENDA-CHIP-SURVEY': 'JOB · ping',
  'UI-TUT-MOVE': 'WASD move · . wait · lamp and Flare change who notices you',
  'UI-TUT-LIGHT':
    'LIT safer fights · SHADOW ambush risk — Flare (i → select → u) lights dark fights',
  'UI-TUT-KIT': 'Salvage in kit — i, select Salvage, u to scan (item or backlash)',
  'UI-TUT-HAZARD':
    'Yellow tile drains Power — step off, walk south around it, or use a Filter',
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
  'UI-QUEST-PAYS': 'gives',
  'UI-QUEST-BILLS': 'costs',
  'UI-QUEST-PAYS-KIT': 'kit + XP',
  'UI-QUEST-BADGE': 'OPT',
  'UI-RQ-KIND-SALVAGE': 'SALVAGE',
  'UI-RQ-KIND-PURGE': 'PURGE',
  'UI-RQ-KIND-VENT': 'VENT',
  'UI-RQ-COST-TIME': 'time',
  'UI-RQ-COST-HP': 'HP',
  'UI-RQ-COST-KIT': 'sealant',
  'UI-RQ-OFFER-HINT': 'Optional site — Enter / Space / > to review',
  'UI-RQ-OFFER-SALVAGE':
    'Optional salvage. Takes time. Gives kit and a note. Extract never needs this.',
  'UI-RQ-OFFER-PURGE':
    'Optional fight. Stepping in wakes hostiles and costs HP. Clear them, then take the crate. Gives kit.',
  'UI-RQ-OFFER-VENT':
    'Optional vent job. Use Sealant Foam on the vent, then the console. Two sites. Saves the skiff once.',
  'UI-QUEST-OFFER': 'OPTIONAL JOB',
  'UI-QUEST-ACCEPT': '1 / Enter — Accept',
  'UI-QUEST-DECLINE': '2 / Esc — Decline',
  'UI-NPC-OFFER-ENSIGN':
    'Stranded ensign. Accept: a Field Hypo, a Power Cell, and an escort. Later: bring a Field Hypo.',
  'UI-NPC-OFFER-TECH':
    'Field tech. Accept: a probe drone. Later: bring Sealant Foam or a Filter.',
  'UI-NPC-OFFER-SURVEY':
    'Survey contact. Accept: the optional site opens. Later: bring a Nav Ping.',
  'UI-NPC-COST-MED': 'later: Field Hypo',
  'UI-NPC-COST-SEALANT': 'later: foam / filter',
  'UI-NPC-COST-MAPPER': 'later: Nav Ping',
  'UI-NPC-OFFER-PAYOFF': 'kit + escort / site · later job gives extras',
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
  'UI-TAG-DARK-NOTICE': 'Shadow notice −',
  'UI-TAG-LIT-PEN': 'Lit status +',
  'UI-TAG-SALVAGE': 'Salvage fail −',
  'UI-TAG-STATUS-RED': 'Status ticks −',
  'UI-TAG-FOV-CAP': 'Vision −',
  'UI-TAG-FLARE-EM': 'Flare EM +',
  'UI-TAG-BLEED': 'Bleed −',
  'UI-TAG-ON-HIT-BLEED': 'Hit bleed +',
  'UI-TAG-ON-HIT-STUN': 'Hit stun +',
  'UI-TAG-HAZ-SKIP': 'No ion burn on hazards',
  'UI-TAG-HAZ-DRAIN': 'Hazard Power −',
  'UI-PAGES': 'Mission PADD',
  'UI-PAGES-EMPTY': 'No PADD notes yet.',
  'UI-PAGES-HINT': 'p or Esc — close',
  'UI-PAGES-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Optional sites give extra rewards.',
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
  'UI-WIN-BODY': 'Nav lock is back. The drop skiff will pick you up.',
  'UI-LOSE-HP': 'HP DEPLETED',
  'UI-LOSE-HP-BODY': 'HP reached 0.',
  'UI-LOSE-ENERGY': 'POWER FAILURE',
  'UI-LOSE-ENERGY-BODY': 'Power stayed at 0. The kit died.',
  'UI-LOSE-STUCK': 'MISSION ABORT',
  'UI-LOSE-STUCK-BODY': 'No path left to extract.',
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
  'OBJ-NAVCORE': 'Get the spare Nav Lattice from the inland cache.',
  'OBJ-RELAYKEY': 'Get the Splice Key from Crash Wreck Belt.',
  'OBJ-BEACON': 'Use the Splice Key at the beacon to open the inland path.',
  'OBJ-SHUTTLE': 'Reach the drop skiff pad with the Nav Lattice.',
  'OBJ-LOCAL-EXIT': '→ Sector hatch',
  'OBJ-LOCAL-KEY': '→ Splice Key',
  'OBJ-LOCAL-BEACON': '→ Beacon console',
  'OBJ-LOCAL-CORE': '→ Nav Lattice',
  'OBJ-LOCAL-SHUTTLE': '→ Drop skiff pad',
  'OBJ-LOCAL-ROOM': '⇢ Optional site',
  'OBJ-TUT-PHASER': '→ Phaser bay (2–3 tile lane drill)',
  'OBJ-TUT-HATCH': '→ East hatch (notice, Power hazard, phaser, kit)',
  'OBJ-TUT-BRIEF': 'Training — Power does not drip until you leave',
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
    'Old survey arrays still ping. Local fauna keyed to the beat.',
  'CODEX-TRENCH':
    'Beacon seal lifted. Deep fauna nest in the cut inland.',
  'CODEX-BRINE':
    'Hazard tiles hurt more here. Filters last longer after this note.',
  'CODEX-FISSURE':
    'Cracks drain Power. Keep a cell for the skiff approach.',
  'CODEX-VAULT':
    'Spare nav lattices were stored here in case the array went dark.',
  'CODEX-REEF':
    'Crystal banks scatter returns. Hunters ride the pulse.',
  'CODEX-DUCT':
    'Old junctions still vent. Drones patrol the seals.',
  'CODEX-APPROACH':
    'Shear can jam the skiff. Keep a Power Cell ready.',
  'CODEX-GENERIC': 'PADD fragment — incomplete.',
  // Fact-bound pages — each may only claim what src/data/codex.ts requires of it.
  'CODEX-FACT-NEST-SWARM':
    'Nests hatch when you step near. Swarms see motion first, light second — walk around the beds.',
  'CODEX-FACT-BRINE-HUNTER':
    'Sumps hide the approach. Something waits here — do not cross blind.',
  'CODEX-FACT-VENT-EM':
    'Vents under high EM cost more Power. Seal them, or move through fast.',
  'CODEX-FACT-TRIPWIRE':
    'Wire across the path. It still trips — and it wakes the room.',
  'CODEX-FACT-SEALED':
    'Sealed hatch — optional. Stand beside it. Sealant Foam (u) or wear Pulse Baton and Enter / Space / >. Opens a side cache.',
  'CODEX-FACT-MACHINE':
    'Patrol units keep the old routes. They do not tire.',
  'CODEX-FACT-BRANDED':
    'Marked specimen on this ground. Kill it for a drop — or route around it with Flare, Pulse, or Filter.',
  'CODEX-FACT-BRINE':
    'Sumps here drain Power. Filters help. Boots do not.',
  'CODEX-FACT-VENT':
    'Junctions still bleed. Use Sealant Foam (u) before the corridor drains you.',
  'CODEX-FACT-RUBBLE':
    'Rubble looks like cover until it shifts.',
  'CODEX-HOLO':
    'Prior survey: Splice Key wreckage inland. Power drain is the real enemy.',
  'CODEX-ENSIGN':
    'Escort armed. Ally leaves when Power fades.',
  'CODEX-TECH':
    'Probe drone online — short combat assist only.',
  'CODEX-SURVEY':
    'Bring a Nav Ping to unlock an optional site.',
  // Items
  'ITEM-RELAY-KEY': 'Splice Key',
  'ITEM-RELAY-KEY-DESC': 'Use at the beacon to open the inland path.',
  'ITEM-NAV-CORE': 'Nav Lattice',
  'ITEM-NAV-CORE-DESC': 'Needed on the drop skiff to extract.',
  'ITEM-MED': 'Field Hypo',
  'ITEM-MED-DESC': 'u — heal +22 HP and stop bleed. If downed, get up at 8 HP.',
  'ITEM-ENERGY': 'Power Cell',
  'ITEM-ENERGY-DESC':
    'u — Power +32. Also starts the skiff if it jammed, and skips one pad hold.',
  'ITEM-PROBE': 'Field Array Pulse',
  'ITEM-PROBE-DESC': 'u — spend 3 Power. See 4 tiles farther for 25 turns. Does not help damage.',
  'ITEM-STIM': 'Combat Stim',
  'ITEM-STIM-DESC': 'u — spend 2 Power. Hits are Enhanced for 15 turns.',
  'ITEM-PLATE': 'Shield Charge',
  'ITEM-PLATE-DESC': 'u — repair +12 Shield.',
  'ITEM-FLARE': 'Plasma Flare',
  'ITEM-FLARE-DESC':
    'u — spend 2 Power. Lights nearby tiles, hits and stuns adjacent foes, cancels overwatch, and blocks the skiff wave.',
  'ITEM-FILTER': 'Plasma Filter',
  'ITEM-FILTER-DESC': 'u — spend 1 Power. Halves hazard drain and plasma hits for 50 turns.',
  'ITEM-BLADE': 'Combat Knife',
  'ITEM-BLADE-DESC': 'Wear for +1 ATK. u again to stow.',
  'ITEM-BATON': 'Pulse Baton',
  'ITEM-BATON-DESC':
    'Wear for +1 ATK; melee stuns 2 turns. Next to a sealed hatch: Enter / Space / > to pry. u again to stow.',
  'ITEM-PHASER': 'Survey Phaser',
  'ITEM-PHASER-DESC':
    'Wear for +1 ATK. Step toward a visible foe 2–3 tiles away on a straight lane to fire (−4 Power). Adjacent is still melee. u again to stow.',
  'ITEM-HARNESS': 'EVA Harness',
  'ITEM-HARNESS-DESC': 'Wear for +6 max Shield (refills). u again to stow.',
  'ITEM-VEST': 'Ablative Vest',
  'ITEM-VEST-DESC': 'Wear for +4 max Shield and +1 DEF. u again to stow.',
  'ITEM-DART': 'Plasma Microdart',
  'ITEM-DART-DESC':
    'u, then a direction: hit a lit target within 3. Miss spends it. . cancels.',
  'ITEM-SEALANT': 'Sealant Foam',
  'ITEM-SEALANT-DESC':
    'u — clear EM, or open a sealed hatch beside you.',
  'ITEM-MAPPER': 'Nav Ping',
  'ITEM-MAPPER-DESC': 'u — shows the hatch through fog for 40 turns.',
  'ITEM-SALVAGE': 'Salvage',
  'ITEM-SALVAGE-DESC':
    'u — scan. May become kit, or spike EM and wake fauna.',
  'ITEM-COMM': 'Field Comm',
  'ITEM-COMM-DESC':
    'Wear — talk to contacts from 2 tiles away. u again to stow.',
  'ITEM-SCAN-BAND': 'Scan Band',
  'ITEM-SCAN-BAND-DESC':
    'Wear — salvage scans fail less when EM is high. u again to stow.',
  'ITEM-VISOR': 'Survey Visor',
  'ITEM-VISOR-DESC':
    'Wear — blind and jam last 1 turn less; vision 1 tile shorter; flares from shadow add EM. u again to stow.',
  'ITEM-GLOVES': 'Grip Gloves',
  'ITEM-GLOVES-DESC':
    'Wear — hazard tiles skip ion burn. u again to stow.',
  'ITEM-BOOTS': 'Mag Boots',
  'ITEM-BOOTS-DESC':
    'Wear — hazard and sump drain 1 less Power. u again to stow.',
  'ITEM-FLARE-PRISM': 'Flare Prism',
  'ITEM-FLARE-PRISM-DESC':
    'Wear — flares cost 1 less Power; shadow flares mark you longer. Elite drop. u again to stow.',
  'ITEM-WARD-WEAVE': 'Ward Weave',
  'ITEM-WARD-WEAVE-DESC':
    'Wear — +3 Shield, ion hits −2; vents cost +1 Power per step. Elite drop. u again to stow.',
  'ITEM-SHADOW-LENS': 'Shadow Lens',
  'ITEM-SHADOW-LENS-DESC':
    'Wear — hunters notice you less in shadow; blind and jam last longer in the light. Elite drop.',
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
    'Meridian Shelf. EM is high — fauna will notice you. Get the Nav Lattice. Extract before Power hits 0.',
  'LOG-TUT-WELCOME':
    'Training bay — Power does not drip. Room 1: light and yellow tiles. Room 2: phaser. East hatch starts the real drop.',
  'LOG-TUT-LIGHT':
    'Lamp stops at walls. LIT is safer. SHADOW can ambush.',
  'LOG-TUT-HAZARD':
    'Yellow tiles drain Power — walk around them, or use a Filter.',
  'LOG-TUT-WAKE':
    'Fauna notice your lamp and your shadow. Flare lights a dark fight.',
  'LOG-TUT-PHASER':
    'Phaser bay — fire 2–3 tiles away on a straight lane. Adjacent is melee. Fire once, then the hatch.',
  'LOG-TUT-DONE':
    'Power now drips. Order: Splice Key → beacon → Nav Lattice → drop skiff.',
  'LOG-MOVE-BLOCKED': 'Cannot walk there.',
  'LOG-WAIT': 'Holding position.',
  'LOG-HIT': 'You strike',
  'LOG-KILL': 'Hostile down',
  'LOG-HURT': 'You take a hit',
  'LOG-SHADOW-BITE': 'Harder bite in SHADOW — step to LIT',
  'LOG-ARMOR-ABSORB': 'Shield absorbs',
  'LOG-ARMOR-RESEAT': 'Hatch restock — Shield restored.',
  'LOG-PICKUP': 'Stowed in field kit.',
  'LOG-NPC-HAIL': 'You talk to a contact.',
  'LOG-NPC-SIGHT': 'Someone nearby.',
  'LOG-NPC-HOLO': 'Archive dump — Power Cell recovered.',
  'LOG-NPC-ENSIGN': 'Ensign gives kit scrap and an escort.',
  'LOG-NPC-TECH': 'Tech boots a probe drone for a short assist.',
  'LOG-NPC-SURVEY': 'Contact opens the optional site.',
  'LOG-NPC-BLOCK': 'Contact is on that tile — talk with Enter / Space / > or walk around.',
  'LOG-AGENDA-WANT-MED': 'Ensign needs a Field Hypo — talk again when you have one.',
  'LOG-AGENDA-WANT-SEALANT': 'Tech wants Sealant Foam or a Filter — talk again when ready.',
  'LOG-AGENDA-WANT-SURVEY': 'Contact wants a Nav Ping — talk again when you have one.',
  'LOG-AGENDA-NONE': 'Contact has nothing further.',
  'LOG-AGENDA-DONE': 'Job done — Power Cell plus extras.',
  'LOG-AGENDA-ALLY': 'Contact reset your companion timer.',
  'LOG-AGENDA-HEAL': 'Contact patched you up.',
  'LOG-AGENDA-BOOST': 'Contact marked the optional site for better loot.',
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
  'LOG-USE-PROBE': 'Lamp on — see 4 tiles farther (not extra damage).',
  'LOG-USE-STIM': 'Stim on — hits are Enhanced.',
  'LOG-USE-PLATE': 'Shield repaired.',
  'LOG-USE-FLARE': 'Flare — adjacent hostiles stunned.',
  'LOG-USE-FILTER': 'Filter on — drain and plasma hits reduced.',
  'LOG-USE-BLADE': 'Knife on — +1 ATK.',
  'LOG-USE-BATON': 'Baton on — +1 ATK; melee stuns.',
  'LOG-USE-PHASER-EQUIP': 'Phaser on — step toward a foe 2–3 tiles away to fire.',
  'LOG-USE-PHASER': 'Phaser beam (−4 Power).',
  'LOG-USE-HARNESS': 'Harness on — more Shield.',
  'LOG-USE-VEST': 'Vest on — Shield and DEF up.',
  'LOG-USE-COMM': 'Comm on — talk to contacts from 2 tiles.',
  'LOG-USE-SCAN-BAND': 'Scan band on — salvage is safer at high EM.',
  'LOG-USE-VISOR': 'Visor on — blind and jam shorter; vision shorter.',
  'LOG-USE-GLOVES': 'Gloves on — hazard tiles skip ion burn.',
  'LOG-USE-BOOTS': 'Boots on — hazard and sump drain less Power.',
  'LOG-USE-FLARE-PRISM': 'Prism on — cheaper flares, worse shadow marks.',
  'LOG-USE-WARD-WEAVE': 'Weave on — less ion damage; vents cost more Power.',
  'LOG-USE-SHADOW-LENS': 'Lens on — safer in shadow; worse in the light.',
  'LOG-UNEQUIP': 'Gear stowed in kit.',
  'LOG-USE-DART': 'Dart hit — target exposed.',
  'LOG-USE-SEALANT': 'Sealant Foam used.',
  'LOG-SEALED-BLOCK':
    'Sealed hatch — optional. Sealant Foam (u) or wear Pulse Baton then Enter / Space / >.',
  'LOG-SEALED-NEED-TOOL':
    'Sealed hatch — Sealant Foam (i then u) or wear Pulse Baton then Enter / Space / >.',
  'LOG-INTERACT-MISS':
    'Not on a sector hatch, beacon, or pad — stand on it, then Enter / Space / >. Sealed hatches open from beside.',
  'LOG-SEALED-OPEN': 'Sealant Foam opens the sealed hatch.',
  'LOG-SEALED-PRY': 'Pulse Baton pries the sealed hatch open.',
  'LOG-SEALED-CACHE': 'Sealed hatch cache opened.',
  'LOG-TRIPWIRE': 'Tripwire snaps — EM spike; nearby fauna alerted.',
  'LOG-SUMP': 'Sump drains Power.',
  'LOG-SCRUB-NEST': 'Scrub nest stirs — a mite comes out.',
  'LOG-SEALANT-FAIL': 'Foam clears EM, or opens a sealed hatch beside you.',
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
  'LOG-TELE-POUNCE': 'Hostile windup — one-tile lunge. Clear the ring, bump it, or kill it.',
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
  'LOG-SHADOW-AMBUSH': 'SHADOW ambush — unaware, Enhanced.',
  'LOG-LIGHT-MATCH': 'Wrong light for them — +1.',
  'LOG-CHARGE-BREAK': 'Charge broken — the windup drops.',
  'LOG-CRIT-SAVE': 'Past 0 HP — you stay on your feet.',
  'LOG-DOWNED': 'Past 0 HP — you are downed. Use Field Hypo (u) before the clock runs out.',
  'LOG-DOWNED-TICK': 'Hit while downed — the clock shortens.',
  'LOG-DOWNED-ACT': 'Downed — cannot strike. Field Hypo (u), move, or wait.',
  'LOG-STABILIZE': 'Field Hypo holds you together. You are on your feet.',
  'LOG-KEEP-CALM-FAIL': 'EM spike — kit jammed.',
  'LOG-PAY-PRICE': 'The extract takes a price.',
  'LOG-CONTAMINATION': 'Spore cloud drains Power.',
  'LOG-AMBUSH': 'Hunter breaks cover.',
  'LOG-AMBUSH-DARK': 'Hunter strikes from the dark — no telegraph.',
  'LOG-STATUS-BLEED': 'Bleed tick',
  'LOG-STATUS-ION': 'Plasma burn',
  'LOG-STATUS-BLIND': 'Optics washed — vision narrowed.',
  'LOG-STATUS-JAM': 'Kit jammed — lamp blocked.',
  'LOG-JAM-BLOCK': 'Kit jammed — cannot use the lamp.',
  'LOG-STATUS-MARKED': 'Marked — fauna notice you more.',
  'LOG-LOOT-DROP': 'Salvage drops from the carcass.',
  'LOG-BRAND-SIGHT': 'Branded hostile identified.',
  'LOG-BRAND-DROP': 'Branded wearable recovered from the kill.',
  'LOG-GOT-KEY': 'Splice Key found. Go to the Emergency Beacon.',
  'LOG-USED-KEY':
    'Beacon open. Inland path is clear — the cache has the Nav Lattice.',
  'LOG-NEED-KEY': 'Beacon sealed. You need the Splice Key.',
  'LOG-EXIT-NEED-KEY': 'Hatch locked — get the Splice Key in this wreck first.',
  'LOG-EXIT-NEED-CORE': 'Hatch locked — get the Nav Lattice first.',
  'LOG-EXIT-NEED-BEACON': 'Hatch locked — finish the beacon first.',
  'LOG-GOT-CORE': 'Nav Lattice found. Return to the drop skiff pad.',
  'LOG-NEED-CORE': 'Skiff will not start — you need the Nav Lattice.',
  'LOG-SECTOR': 'Sector boundary crossed.',
  'LOG-SEC-PLAINS':
    'Relay Scar Flats. Mites here. Power drains as you walk.',
  'LOG-SEC-FLOOD':
    'Shearwash Basin. Wet ground costs extra Power. Spores burst if you stay close.',
  'LOG-SEC-CANOPY':
    'Shear Canopy. Thick cover. Hunters stalk light.',
  'LOG-SEC-REEF':
    'Crystal Pulse Reef. Crystal banks hide ambushes. Stay LIT if you can.',
  'LOG-SEC-SPIRE':
    'Array Mast Reach. Old masts still hum. Feeders drink EM.',
  'LOG-SEC-RUIN':
    'Crash Wreck Belt. Find the Splice Key in a cache.',
  'LOG-SEC-BEACON': 'Emergency Beacon. Use the Splice Key here to open the inland path.',
  'LOG-SEC-TRENCH':
    'Inland Fault Cut. Deep fauna. No ship cover.',
  'LOG-SEC-DUCT':
    'Power Conduit Warren. Vents and rubble. Watch drones.',
  'LOG-SEC-ASH': 'Shear Ash Fields. Power drain is higher here.',
  'LOG-SEC-BRINE':
    'Pulse Brine Flats. Sumps drain Power. Cache is next.',
  'LOG-SEC-VAULT':
    'Contingency Cache. Sentinels guard the depot. Get the Nav Lattice.',
  'LOG-SEC-FISSURE':
    'Shear Fissure. Power drain spikes. The pad is still inland.',
  'LOG-SEC-APPROACH':
    'Skiff Approach. Storm pressure. Drop Skiff Ridge is next.',
  'LOG-SEC-RIDGE': 'Drop Skiff Ridge. Stand on the pad with the Nav Lattice to extract.',
  'LOG-EXIT-BLOCKED': 'Sector hatch will not open yet.',
  'LOG-HAZARD': 'Hazard tile — Power drain.',
  'LOG-EXTRACT': 'Nav lock is back. Extraction complete.',
  'LOG-FAVOR-GRANT': 'Optional reward saved.',
  'LOG-FAVOR-CONSUME': 'Optional reward spent.',
  'LOG-FAVOR-PATTERN': 'Skiff start saved — reward spent.',
  'LOG-UPLINK-START': 'Uplink started — stay on the pad.',
  'LOG-UPLINK-HOLD': 'Still holding the pad.',
  'LOG-UPLINK-TICK': 'Uplink climbing.',
  'LOG-UPLINK-WAVE-IN': 'Wave next hold — Flare to block, or Power Cell to skip.',
  'LOG-UPLINK-WAVE-HIT': 'Wave hits the pad.',
  'LOG-UPLINK-WAVE-REPEL': 'Flare blocks the wave.',
  'LOG-UPLINK-COOLANT': 'Power Cell skips a pad hold.',
  'LOG-UPLINK-FLARE': 'Flare ready for the wave.',
  'LOG-UPLINK-INTERRUPT': 'Uplink stopped — you left the pad.',
  'LOG-BUS-WARN': 'Power low — use a Power Cell.',
  'LOG-BUS-FAILING': 'Power at 0 — use a Power Cell this turn or the kit dies.',
  'LOG-WINDUP-KILL': 'Windup interrupted — recovered 2 Power.',
  'LOG-USE-MAPPER': 'Nav ping — hatch marked.',
  'LOG-USE-MAPPER-CACHE': 'Nav ping — cache marked on the minimap.',
  'LOG-CACHE-CLEAR': 'Sector caches cleared.',
  'LOG-COMM-CACHE-HINT': 'Comm hears a cache — use Nav Ping, then check the minimap.',
  'LOG-RQ-BRIEF-SALVAGE':
    'Optional SALVAGE — costs time · gives kit + XP · follow the amber frame.',
  'LOG-RQ-BRIEF-PURGE':
    'Optional PURGE — costs HP · gives kit + XP · follow the amber frame.',
  'LOG-RQ-BRIEF-VENT':
    'Optional VENT — costs Sealant Foam · saves the skiff once · two sites.',
  'LOG-RQ-OFFER': 'Optional job — accept or decline.',
  'LOG-RQ-ACCEPT': 'Optional job accepted.',
  'LOG-RQ-DECLINE': 'Optional job declined.',
  'LOG-RQ-DECLINED-SITE': 'Declined — no more work here.',
  'LOG-NPC-OFFER': 'Contact offers a job — accept or decline.',
  'LOG-AGENDA-ACCEPT': 'Job accepted.',
  'LOG-AGENDA-DECLINE': 'Job declined.',
  'LOG-QUEST-NEED': 'Pick first: 1 accept · 2 decline.',
  'LOG-RQ-SALVAGE': 'Salvage done — kit and a note.',
  'LOG-RQ-PURGE': 'Purge done — crate unlocked.',
  'LOG-RQ-PURGE-WAKE': 'Purge — hostiles spawning.',
  'LOG-RQ-PURGE-NEED-WAKE': 'Purge — step in to wake them first.',
  'LOG-RQ-PURGE-NEED-CLEAR': 'Purge — kill them before you take the crate.',
  'LOG-RQ-CHARGE': 'Optional site — short combat and filter boost.',
  'LOG-CODEX': 'PADD note saved.',
  'LOG-RQ-NEED': 'Optional site still open — finish the steps.',
  'LOG-RQ-VENT-NEED-SEALANT': 'Vent — use Sealant Foam on this tile.',
  'LOG-RQ-STEP': 'Optional site — step done.',
  'LOG-RQ-VENT': 'Vent sealed.',
  'LOG-RQ-VENT-SEALED': 'Vent sealed — go to the console.',
  'LOG-HS-START': 'Beacon handshake started — stay on the pad.',
  'LOG-HS-TICK': 'Handshake ticking.',
  'LOG-HS-INTERRUPT': 'Handshake stopped — you left the pad.',
  'LOG-PB-STRESS': 'Skiff may jam — keep a Power Cell ready.',
  'LOG-PB-SYNC': 'Skiff can start.',
  'LOG-PB-REJECT': 'Skiff will not start — use a Power Cell.',
  'LOG-PB-DESYNC': 'Skiff will not start — use a Power Cell.',
  'LOG-EVT-AFTERGLOW':
    'Drop afterglow — EM spike. Sealant Foam clears it.',
  'LOG-EVT-APPROACH': 'Approach — Power pulses. Keep a Power Cell for the skiff.',
  'LOG-EVT-SHEAR': 'Shear pulse — Power drain.',
  'LOG-ION-FRONT': 'Ion front — drains EM and Power. Lit fauna track you harder.',
  'LOG-ION-PULSE': 'Ion front pulse — +2 EM and −2 Power. Filter or Flare stops it.',
  'LOG-ION-DAMPEN': 'Ion front pulse stopped.',
  'LOG-ION-CLEAR': 'Ion front gone.',
  'LOG-XP': 'XP gained.',
  'LOG-LEVEL': 'Level up.',
  'LOG-SKILL': 'Field skill unlocked.',
  'LOG-SKILL-PICK': 'Choose a field skill — press 1 or 2.',
  'LOG-SKILL-NEED': 'Skill choice pending — press 1 or 2.',
  'LOG-HACK-OPEN': 'Locked terminal — splice the lattice.',
  'LOG-HACK-OK': 'Lattice spliced.',
  'LOG-HACK-FAIL': 'ICE bounce — lattice reset.',
  'LOG-HACK-LOCK': 'Terminal fried — lockout.',
  'LOG-HACK-ABORT': 'Splice aborted.',
  'UI-HACK-TITLE': 'Lattice lock',
  'UI-HACK-TARGET': 'Target',
  'UI-HACK-BUFFER': 'Buffer',
  'UI-HACK-TRIES': 'Tries',
  'UI-HACK-ANY': 'Pick a start — then look ahead.',
  'UI-HACK-COL': 'Same column. Wrong mark bounces.',
  'UI-HACK-ROW': 'Same row. Wrong mark bounces.',
  'UI-HACK-KEYS': 'WASD · Enter splice · Esc abort',
  'UI-HACK-CHIP': 'LOCK',
  'UI-HACK-LAB': 'LATTICE LAB',
  'UI-HACK-LAB-HINT': 'r new lock',
  'UI-HACK-PAY': 'Kit dump',
  'UI-HACK-PAY-BADGE': 'SPLICED',
  'UI-HACK-PAY-KEYS': 'Enter / Esc — stow',
  'UI-HACK-PAY-POWER': 'Power +20',
  'UI-HACK-PAY-ARMOR': 'Armor restored',
  'UI-HACK-PAY-FILTER': 'Filter 35',
  'UI-HACK-PAY-EM': 'EM purged',
  'UI-HACK-PAY-PADD': 'PADD note',
  'LOG-EM-WARN': 'EM rising — fauna getting agitated.',
  'LOG-EM-HIGH':
    'EM critical — extra Power drain and wider aggro. Sealant Foam clears it.',
  'LOG-EM-PURGE': 'EM cleared.',
  'LOG-SALVAGE-ID': 'Salvage scan done — kit recovered.',
  'LOG-SALVAGE-BAD': 'Bad salvage — EM spike and local wake.',
  'LOG-PADD-MOD': 'PADD note saved.',
  'UI-EM': 'EM',
  'UI-EM-CRIT': 'EM critical',
  'UI-EM-WARN': 'EM warning',
  'UI-SKIFF-LOCK': 'Skiff',
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
  'SKILL-ION-SKIN-DESC': 'While Filter is on, weapon hits are also halved.',
  'SKILL-DEEP-RESERVE-NAME': 'Deep Reserve',
  'SKILL-DEEP-RESERVE-DESC': 'Skip one Power drain every 10 turns.',
} as const;

export type LoreId = keyof typeof LORE;

export function lore(id: LoreId): string {
  return LORE[id];
}
