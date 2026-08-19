/** Lore registry — every player-facing string maps to an ID. Halcyon Survey Corps / Meridian Shelf. */

export const LORE = {
  // UI
  'UI-TITLE': 'EXTRACTION WINDOW',
  'UI-ORG': 'CSV HALCYON',
  'UI-SUBTITLE': 'Halcyon Survey Corps · Meridian Shelf',
  'UI-SURVEY-TAG': 'Survey Team',
  'UI-BRIEF': 'Nav Lattice → drop skiff · Window and Power both kill you',
  'UI-BRIEF-TUT':
    'Drill first — Window and Power both kill you · then Key → beacon → Lattice → skiff',
  'UI-MISSION-STATUS': 'MISSION STATUS',
  'UI-PRESS-START': 'ENTER — begin',
  'UI-SEED': 'Mission ID',
  'UI-SEED-HINT': '← → adjust · R randomize',
  'UI-HP': 'Vitals',
  'UI-ENERGY': 'Power',
  'UI-WINDOW': 'Window',
  'UI-BAR-HP': 'HP',
  'UI-BAR-SHD': 'Shield',
  'UI-BAR-EPS': 'Power',
  'UI-BAR-WINDOW': 'Window',
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
  'UI-FRITZ': 'Fritz',
  'UI-DOWNED': 'Downed',
  'UI-INV': 'Field kit',
  'UI-LOG': 'Log',
  'UI-OBJECTIVE': 'Objective',
  'UI-HELP': 'Field manual',
  'UI-HELP-TUT':
    'TRAINING BAY\n' +
    'Reach the east hatch. Window and Power are paused here.\n' +
    '\n' +
    'WASD — move · . — wait · step on kit to take it\n' +
    'i — open kit · u — use selected item\n' +
    '\n' +
    'Yellow ion tiles drain Power — i→select Sealant Foam→u or take the south detour.\n' +
    'LIT is safer to read · SHADOW risks ambush · Flare lights dark fights.\n' +
    '\n' +
    'Press ? after the hatch for the full manual.\n',
  'UI-HELP-BODY':
    'CONTROLS\n' +
    'WASD / arrows — move one tile\n' +
    '. — wait\n' +
    'i — kit · u — use or equip · step onto kit to pick it up\n' +
    'Enter / Space / > — hatch, beacon, pad, optional site, hail\n' +
    'p — PADD · l — mission log · 1/2 — pick skill · ? — help · m — mute · Esc — close\n' +
    '\n' +
    'TWO CLOCKS (both can kill you)\n' +
    'Window — turns left before the extract closes.\n' +
    'Power — kit charge. Hazards, EM, and drip drain it. Empty Power = lose.\n' +
    '\n' +
    'COMBAT\n' +
    'Walk into a hostile to hit it. Worn Survey Phaser: step toward a visible foe 2–3 tiles along that cardinal to fire a beam (−Power); adjacent is still melee.\n' +
    'Normal hits are atk minus def.\n' +
    'Impaired (d4) if jammed, blind, or the kit is full. Enhanced (d12) vs a stunned or exposed foe, on stim, or overcharge.\n' +
    'Windup paints the tiles it will strike next turn — leave those tiles or kill it.\n' +
    'Two+ hostiles touching you peel DEF — fight in a doorway or break contact.\n' +
    'Overflow past 0 HP: save or downed. Med stabilizes. Extra hits while downed shorten the clock.\n' +
    'Painted side tiles show where a second hunter will touch you.\n' +
    '\n' +
    'LIGHT\n' +
    'LIT — safer read · SHADOW — ambush risk. Your lamp and flares change who notices you.\n' +
    'Dark-prefer fauna bite harder in SHADOW — step to LIT. Flare lights a dark fight.\n' +
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
    'HP · Shield · Power · Window · XP\n' +
    'Risky / Desperate names peel on the meta line — peel already taxes DEF.\n' +
    'Extract boxes (# filled) sit on the chip rail: Key → handshake → Lattice → pad.\n' +
    'Enhanced / Impaired / Downed / Kit full / Fritz are chips, not ATK soup.\n' +
    'l — mission log (hidden by default; field chips carry the beat)\n' +
    'EM high — Sealant Foam flushes residue',
  'UI-KIT-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Optional sites pay extract rewards.',
  'UI-CONTROLS':
    'WASD move · . wait · i kit · l log · ? help',
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
  'UI-HINT-DESYNC': 'Pattern desync — use a Power Cell before the skiff will lock',
  'UI-HINT-ITEM': 'Kit on this tile — step onto it to pick it up',
  'UI-HINT-ITEM-FULL': 'Kit full — free a slot (use an item), then step here again',
  'UI-HINT-AIM':
    'Aim dart — direction fires (lit, range 3) · . cancels · miss spends the dart',
  'UI-HINT-USE-MED': 'HP low — open kit (i), select Field Hypo, press u',
  'UI-HINT-USE-ENERGY': 'Power low — open kit (i), select Power Cell, press u',
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
    'Window = turns left · Power = kit charge — either hitting 0 ends the run',
  'UI-HINT-DOWNED':
    'Downed — u Field Hypo to stabilize, or step off the pack',
  'UI-HINT-EXTRACT':
    'Required order: Splice Key → beacon → Nav Lattice → drop skiff',
  'UI-HINT-FLANK':
    'Two+ hostiles touching you — DEF drops; fight in a doorway or break contact',
  'UI-HINT-FLANK-COMING':
    'Second hunter circling — doorway or break contact before they touch both sides',
  'UI-HINT-SKILL':
    'Choose a field skill — press 1 or 2 (effects above; move locked until then)',
  'UI-HINT-TELE': 'Windup painted — leave those tiles or kill it',
  'UI-HINT-TELE-REACH': 'Two-tile windup — kill it or step fully clear of the painted tiles',
  'UI-HINT-TELE-OVERWATCH':
    'Overwatch locked — do not step adjacent; Flare cancels or kill it',
  'UI-HINT-TELE-BEAM': 'Beam charging — break line of sight or kill it',
  'UI-HINT-TELE-ZONE': 'Pulse charging — leave the painted ring or kill it',
  'UI-HINT-BEACON-NEED-KEY':
    'Beacon sealed — carry the Splice Key, then Enter / Space / >',
  'UI-HINT-BRAND': 'Branded elite — optional; Flare, Probe, or Filter match its brand',
  'UI-HINT-ALLY-DRONE': 'Drone lamp nearby — can cancel one overwatch every few turns',
  'UI-HINT-ALLY-ESCORT': 'Escort beside you — +1 DEF while adjacent',
  'UI-HINT-PREFER-DARK': 'This fauna prefers shadow — stay in LIT',
  'UI-HINT-PREFER-LIT': 'This hunter prefers light — break line of sight or find shadow',
  'UI-HINT-QUEST': 'Optional site — follow the amber OPT line',
  'UI-HINT-NPC': 'Field contact — press Enter / Space / > to talk',
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
  'UI-TUT-GOTO-HATCH': 'East hatch ends the drill — step on it (Window and Power then tick)',
  'UI-TUT-EXIT':
    'On hatch — step on it or press Enter / Space to start the drop (Window and Power go live)',
  'UI-QUEST-TRACK': 'OPT',
  'UI-QUEST-PAYS': 'pays',
  'UI-QUEST-BADGE': 'OPT',
  'UI-QUEST-REWARD': 'reward',
  'UI-RQ-SALVAGE': 'Salvage console — Enter / Space / >',
  'UI-RQ-PURGE': 'Purge nest — clear hostiles, then Enter / Space / >',
  'UI-RQ-VENT-A': 'Vent — Sealant Foam here (i → select → u)',
  'UI-RQ-VENT-B': 'Seal console — Enter / Space / > to finish',
  'UI-PAGES': 'Mission PADD',
  'UI-PAGES-EMPTY': 'No PADD pages recovered this mission.',
  'UI-PAGES-HINT': 'p or Esc — close',
  'UI-PAGES-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Optional sites pay extract rewards.',
  'UI-ACTIVE': 'SYS',
  'UI-END-SUMMARY': 'Last objective · proficiency',
  'UI-QUEST-KEY': 'SPLICE KEY',
  'UI-QUEST-CORE': 'NAV LATTICE',
  'UI-RELAY-OPEN': 'BEACON OPEN',
  'UI-HANDSHAKE': 'HANDSHAKE',
  'UI-UPLINK': 'UPLINK',
  'UI-WAVE-NEXT': 'WAVE NEXT',
  'UI-PROBE': 'PROBE',
  'UI-STIM': 'STIM',
  'UI-PLATE': 'Shield',
  'UI-ARMOR': 'Shield',
  'UI-TOOL': 'Tool',
  'UI-EQUIP-ARMOR': 'Suit',
  'UI-ALLY-DRONE': 'DRONE LAMP',
  'UI-ALLY-ESCORT': 'ESCORT',
  'UI-FILTER': 'FILTER',
  'UI-WORN': 'worn',
  'UI-WEARABLE': 'equip',
  'UI-WIN': 'EXTRACTION COMPLETE',
  'UI-WIN-BODY': 'Nav lock restored. Halcyon confirms drop skiff pickup.',
  'UI-LOSE-HP': 'SURVEY OFFICER DOWN',
  'UI-LOSE-HP-BODY': 'HP reached 0 — fatal contact.',
  'UI-LOSE-ENERGY': 'POWER FAILURE',
  'UI-LOSE-ENERGY-BODY': 'Power hit 0 — kit charge gone.',
  'UI-LOSE-STORM': 'WINDOW COLLAPSED',
  'UI-LOSE-STORM-BODY': 'Window hit 0 — the extract closed.',
  'UI-LOSE-STUCK': 'MISSION ABORT',
  'UI-LOSE-STUCK-BODY': 'No viable path left to extract.',
  'UI-RETRY': 'ENTER — new survey team · ESC — title',
  'UI-EMPTY-INV': 'Field kit empty',
  'UI-INV-HINT': '↑↓ or 1–9 select · u use/equip (again to stow) · Esc close',

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
  'OBJ-TUT-HATCH': '→ East hatch (learn notice, Power hazard, kit)',
  'OBJ-TUT-BRIEF': 'Training — Window and Power paused until you leave',
  'HAZ-STORM': 'Window critical',
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
    'Fissure brief: ion shear widens cracks — skiff approach under rising window tax.',
  'CODEX-VAULT':
    'Cache scrap: spare nav lattices were contingency for long-range array blackout events.',
  'CODEX-REEF':
    'Reef survey: pulse-crystal banks scatter array returns — hunters ride the pulse.',
  'CODEX-DUCT':
    'Conduit memo: abandoned power junctions still vent; duct drones patrol seal points.',
  'CODEX-APPROACH':
    'Approach brief: Window pressure desyncs the Lattice — Power Cell before skiff lock.',
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
    'Sealed hatch: optional. Stand beside it — Sealant Foam (u) or equip Pulse Baton and Enter / Space / >. Opens a short cache (+Window).',
  'CODEX-FACT-MACHINE':
    'Machine note: patrol units keep the old seal routes. They do not tire and they do not lose interest.',
  'CODEX-FACT-BRANDED':
    'Contact brief: marked specimen on this ground. It answers Flare, Probe, and Filter differently — route around or match the brand.',
  'CODEX-FACT-BRINE':
    'Brine flat: pulse salts sit in the pools. Filters buy minutes; boots buy nothing.',
  'CODEX-FACT-VENT':
    'Vent field: power junctions still bleed here. Sealant pays for itself within a corridor.',
  'CODEX-FACT-RUBBLE':
    'Collapse note: rubble reads as cover until it shifts. Prior hand lost a window to a wrong line.',
  'CODEX-HOLO':
    'Archive holo: prior survey noted Splice Key wreckage inland — Window clock is the real enemy.',
  'CODEX-ENSIGN':
    'Stranded ensign: escort protocol armed — temporary ally expires when Power fades.',
  'CODEX-TECH':
    'Field tech: Halcyon probe reboot successful — short combat assist only.',
  'CODEX-SURVEY':
    'Survey contact: bring a Nav Ping — unlocks an optional procedure.',
  // Items
  'ITEM-RELAY-KEY': 'Splice Key',
  'ITEM-RELAY-KEY-DESC': 'Opens the Emergency Beacon handshake — required for inland path.',
  'ITEM-NAV-CORE': 'Nav Lattice',
  'ITEM-NAV-CORE-DESC': 'Locks the drop skiff for extract — required to win.',
  'ITEM-MED': 'Field Hypo',
  'ITEM-MED-DESC': 'Restore +22 HP and clear bleed. Stabilizes downed (HP 8).',
  'ITEM-ENERGY': 'Power Cell',
  'ITEM-ENERGY-DESC':
    'Refills Power bar +32. Also clears pattern desync and skips one skiff uplink hold.',
  'ITEM-PROBE': 'Field Array Pulse',
  'ITEM-PROBE-DESC': '+4 vision for 25 turns. Lamp only — not a damage bonus.',
  'ITEM-STIM': 'Combat Stim',
  'ITEM-STIM-DESC': 'Strikes are Enhanced for 15 turns.',
  'ITEM-PLATE': 'Shield Charge',
  'ITEM-PLATE-DESC': 'Repair +12 Shield.',
  'ITEM-FLARE': 'Plasma Flare',
  'ITEM-FLARE-DESC':
    'Lights nearby tiles for 4 turns; damages and stuns adjacent foes; cancels overwatch; blocks the skiff pressure wave.',
  'ITEM-FILTER': 'Plasma Filter',
  'ITEM-FILTER-DESC': 'Halves Power drain from hazards and plasma hits (50 turns).',
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
  'ITEM-MAPPER-DESC': 'Marks the sector hatch for 40 turns (even through fog).',
  'ITEM-SALVAGE': 'Salvage',
  'ITEM-SALVAGE-DESC':
    'u to scan — may become a kit item, or EM backlash and wake.',
  // Enemies
  'ENEMY-MITE': 'Scar Mite',
  'ENEMY-SPORE': 'Wash Spore',
  'ENEMY-WASP': 'Pulse Wasp',
  'ENEMY-STALKER': 'Canopy Hunter',
  'ENEMY-LEECH': 'Shear Leech',
  'ENEMY-CRAWLER': 'Ash Crawler',
  'ENEMY-SENTINEL': 'Cache Sentinel',
  'ENEMY-SERPENT': 'Plasma Serpent',
  'ENEMY-WRAITH': 'Ash Plasma Wraith',
  'ENEMY-DRONE': 'Security Drone',
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
  'ENEMY-MITE-NOTE': 'Grazes residual field-array bleed — packs thicken near warm gear.',
  'ENEMY-SPORE-NOTE': 'Blooms on stirred shear-water EM — swells, then bursts.',
  'ENEMY-WASP-NOTE': 'Hunts bloom trails and anything broadcasting like a survey probe.',
  'ENEMY-MASTLING-NOTE': 'EM-fed skirmisher — bites, then gives ground a step.',
  'ENEMY-SKITTER-NOTE': 'Fast ambush — opens wounds on contact.',
  'ENEMY-RIFT-NOTE': 'Holds range and pulses ion. Plating will not save you — leave the ring.',
  'ENEMY-REEF-NOTE': 'Crystal-bank ambush — plasma bite.',
  'ENEMY-DUCT-NOTE': 'Power junction machine — cuts a beam down the lane it faces.',
  'ENEMY-SERPENT-NOTE': 'Coils, then lunges one tile. Clear the ring or kill it.',
  'ENEMY-WRAITH-NOTE': 'Covers two tiles on the charge — stepping back will not break it.',
  'ENEMY-SENTINEL-NOTE': 'Arms overwatch on the tiles beside it — do not step in while it is locked.',
  'ENEMY-ELITE-NOTE': 'Elite fauna — strong kit drop and Window refund on kill.',
  'ENEMY-BOSS-NOTE': 'Campaign apex — optional detour, rich storm/XP/kit payoff.',
  'BRAND-FLAREBOUND': 'FLAREBOUND — Flares hit harder and stun longer; drops a Flare on kill.',
  'BRAND-WARDED': 'WARDED — its ion hits are softer; drops a Shield Charge on kill.',
  'BRAND-SHADOWBOUND': 'SHADOWBOUND — +1 notice against you in shadow; drops a Probe on kill.',

  // Logs
  'LOG-DROP':
    'Meridian Shelf drop. Field array still bleeding EM — fauna will wake. Recover Lattice; extract before Window or Power hits 0.',
  'LOG-TUT-WELCOME':
    'Drill bay — Window and Power paused. LIT/SHADOW changes who notices you; ion tiles drain Power. East hatch starts the real drop.',
  'LOG-TUT-LIGHT':
    'Lamp stops at walls. Badge: LIT safer · SHADOW ambush risk.',
  'LOG-TUT-HAZARD':
    'Ion tile drains Power — Sealant (i → select → u) or take the south detour.',
  'LOG-TUT-WAKE':
    'Fauna notice your lamp and shadow footprint — Flare lights dark fights.',
  'LOG-TUT-DONE':
    'Window and Power are ticking. Order: Splice Key → beacon → Nav Lattice → drop skiff.',
  'LOG-MOVE-BLOCKED': 'Cannot walk there.',
  'LOG-WAIT': 'Holding position.',
  'LOG-HIT': 'You strike',
  'LOG-KILL': 'Hostile down',
  'LOG-HURT': 'You take a hit',
  'LOG-SHADOW-BITE': 'Harder bite in SHADOW — step to LIT',
  'LOG-ARMOR-ABSORB': 'Shield absorbs',
  'LOG-ARMOR-RESEAT': 'Plating re-seated in the hatch — shield restored.',
  'LOG-PICKUP': 'Stowed in field kit.',
  'LOG-NPC-HAIL': 'Field contact hailed.',
  'LOG-NPC-SIGHT': 'Field contact on sensors.',
  'LOG-NPC-HOLO': 'Archive dump — Window refund.',
  'LOG-NPC-ENSIGN': 'Ensign transfers kit scrap and escort protocol.',
  'LOG-NPC-TECH': 'Tech reboots a Halcyon probe for temporary assist.',
  'LOG-NPC-SURVEY': 'Survey contact shares bearing notes — optional procedure open.',
  'LOG-NPC-BLOCK': 'Contact occupies that tile — hail with Enter / Space / > or step around.',
  'LOG-AGENDA-WANT-MED': 'Ensign needs a Field Hypo spare — hail again when you have one.',
  'LOG-AGENDA-WANT-SEALANT': 'Tech wants Sealant Foam or a Filter — hail again when ready.',
  'LOG-AGENDA-WANT-SURVEY': 'Contact wants a Nav Ping — hail again when you have one.',
  'LOG-AGENDA-NONE': 'Contact has nothing further.',
  'LOG-AGENDA-DONE': 'Contact repaid — Window refund.',
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
  'LOG-INV-FULL': 'Field kit capacity exceeded.',
  'LOG-ELITE-CONTACT': 'Elite fauna on sensors — strong drop if engaged.',
  'LOG-BOSS-TELE': 'Apex hostile telegraphs — heavy strike incoming.',
  'LOG-BOSS-DOWN': 'Campaign apex neutralized — kit and Window refunded.',
  'LOG-ELITE-DOWN': 'Elite down — salvage and Window refund.',
  'LOG-USE-MED': 'Field hypo administered.',
  'LOG-USE-ENERGY': 'Power Cell slotted — Power restored.',
  'LOG-USE-PROBE': 'Field array pulse active — ATK up.',
  'LOG-USE-STIM': 'Combat stim active — strikes Enhanced.',
  'LOG-USE-PLATE': 'Shield charge bonded — pool repaired.',
  'LOG-USE-FLARE': 'Plasma flare discharged — adjacent hostiles stunned.',
  'LOG-USE-FILTER': 'Plasma filter online — drain and plasma hits reduced.',
  'LOG-USE-BLADE': 'Combat knife equipped — ATK up while worn.',
  'LOG-USE-BATON': 'Pulse baton equipped — ATK up; melee stuns.',
  'LOG-USE-PHASER-EQUIP': 'Survey phaser equipped — step toward a hostile 2–3 tiles out to fire.',
  'LOG-USE-PHASER': 'Survey phaser — beam along the lane.',
  'LOG-USE-HARNESS': 'EVA harness equipped — shield capacity up.',
  'LOG-USE-VEST': 'Ablative vest equipped — Shield + DEF.',
  'LOG-UNEQUIP': 'Gear stowed in kit.',
  'LOG-USE-DART': 'Plasma microdart impact — target exposed.',
  'LOG-USE-SEALANT': 'Sealant foam set — vent/hazard neutralized.',
  'LOG-SEALED-BLOCK':
    'Sealed hatch — optional. Sealant Foam (u) or equip Pulse Baton then Enter / Space / >.',
  'LOG-SEALED-NEED-TOOL':
    'Sealed hatch — Sealant Foam (i then u) or equip Pulse Baton then Enter / Space / >.',
  'LOG-INTERACT-MISS':
    'Not on a sector hatch, beacon, or pad — stand on it, then Enter / Space / >. Sealed hatches open from beside.',
  'LOG-SEALED-OPEN': 'Sealant Foam opens the sealed hatch — path clear.',
  'LOG-SEALED-PRY': 'Pulse Baton pries the sealed hatch open.',
  'LOG-SEALED-CACHE': 'Sealed hatch cache — +6 Window.',
  'LOG-TRIPWIRE': 'Tripwire snaps — EM spike; nearby fauna alerted.',
  'LOG-BRINE-POOL': 'Brine pool drains Power.',
  'LOG-SCRUB-NEST': 'Scrub nest stirs — mite emerges.',
  'LOG-SEALANT-FAIL': 'No vent or hazard underfoot to seal.',
  'LOG-AIM-DART': 'Microdart ready — choose fire direction.',
  'LOG-AIM-MISS': 'Microdart spent — no valid visible target in range.',
  'LOG-AIM-CANCEL': 'Dart aim cancelled.',
  'LOG-USE-FAIL': 'No usable item selected.',
  'LOG-USE-EMPTY': 'Field kit empty — nothing to use.',
  'LOG-USE-QUEST': 'Objective item — not consumable (carry to beacon / drop skiff).',
  'LOG-DRAIN': 'Power siphoned',
  'LOG-SPORE-BURST': 'Wash spore burst — power spike and burn.',
  'LOG-TELE-SWELL': 'Spore swelling — burst imminent.',
  'LOG-TELE-POUNCE': 'Hostile windup — one-tile lunge. Clear the ring or kill it.',
  'LOG-TELE-REACH': 'Long windup — it can cover two tiles. Backing off will not break it.',
  'LOG-CHARGE-WINDED': 'Overcommitted charge — it lands winded and open.',
  'LOG-TELE-ZONE': 'Rift charging a standoff pulse — leave the ring, plating will not hold.',
  'LOG-ZONE-PULSE': 'Ion pulse washes the ring — seams exposed.',
  'LOG-ZONE-FIZZLE': 'Ion pulse discharges into empty ground.',
  'LOG-TELE-BEAM': 'Drone beam charging — break line or kill it.',
  'LOG-BEAM-FIRE': 'Drone ion beam rakes the lane.',
  'LOG-BEAM-BLOCKED': 'Drone beam splashes against cover.',
  'LOG-TELE-OVERWATCH': 'Sentinel overwatch locked — do not enter adjacent tiles.',
  'LOG-OVERWATCH-FIRE': 'Sentinel overwatch strikes first.',
  'LOG-PUNISH': 'It has lost its footing — the strike goes in clean.',
  'LOG-ENHANCED': 'Strike lands Enhanced.',
  'LOG-IMPAIRED': 'Strike lands Impaired.',
  'LOG-CRIT-SAVE': 'Overflow — you stay on your feet, seams open.',
  'LOG-DOWNED': 'Overflow — you are downed. Med before the clock runs out.',
  'LOG-DOWNED-TICK': 'Hit while downed — the clock shortens.',
  'LOG-DOWNED-ACT': 'Downed — cannot strike. Med, move, or wait.',
  'LOG-STABILIZE': 'Med holds you together. You are on your feet.',
  'LOG-KEEP-CALM-FAIL': 'EM fritz — kit jammed.',
  'LOG-PAY-PRICE': 'The extract takes a price.',
  'LOG-CONTAMINATION': 'Spore contamination tile tax drains Power.',
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
  'LOG-BRAND-DROP': 'Branded field kit recovered.',
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
    'Shear Fissure. Ion shear opens the rock — window tax rising; pad still inland.',
  'LOG-SEC-APPROACH':
    'Skiff Approach. Storm shear over the final choke — Drop Skiff Ridge ahead.',
  'LOG-SEC-RIDGE': 'Drop Skiff Ridge. Drop skiff pad ahead — Nav Lattice required for lock.',
  'LOG-EXIT-BLOCKED': 'Sector hatch will not open yet.',
  'LOG-HAZARD': 'Ion hazard — Power drain.',
  'LOG-EXTRACT': 'Nav lock restored. Extraction complete.',
  'LOG-FAVOR-GRANT': 'Procedure reward secured.',
  'LOG-FAVOR-CONSUME': 'Procedure reward spent.',
  'LOG-FAVOR-SHELTER': '+15 Window applied on the final sector.',
  'LOG-FAVOR-HAZARD': 'Hazard step skipped — reward spent.',
  'LOG-FAVOR-PATTERN': 'Desync blocked — reward spent.',
  'LOG-UPLINK-START': 'Nav Lattice uplink started — hold the ridge pad.',
  'LOG-UPLINK-HOLD': 'Uplink hold maintained.',
  'LOG-UPLINK-TICK': 'Uplink signal climbing.',
  'LOG-UPLINK-WAVE-IN': 'Pressure wave next hold — Flare to block or Power Cell to skip ahead.',
  'LOG-UPLINK-WAVE-HIT': 'Pressure wave hits the pad.',
  'LOG-UPLINK-WAVE-REPEL': 'Flare blocks the pressure wave.',
  'LOG-UPLINK-COOLANT': 'Power Cell skips an uplink hold.',
  'LOG-UPLINK-FLARE': 'Flare ready for the incoming pressure wave.',
  'LOG-UPLINK-INTERRUPT': 'Uplink interrupted — left the ridge pad.',
  'LOG-STORM-WARN': 'Window low — extract soon.',
  'LOG-WINDOW-TAX': 'Shear pressure deepens — the Window burns faster from here.',
  'LOG-WINDUP-KILL': 'Windup interrupted — salvage bonus.',
  'LOG-USE-MAPPER': 'Nav ping — hatch bearing locked.',
  'LOG-RQ-SALVAGE': 'Salvage procedure complete — kit and PADD page recovered.',
  'LOG-RQ-PURGE': 'Purge procedure complete — hostiles cleared; crate unlocked.',
  'LOG-RQ-PURGE-WAKE': 'Purge procedure — hostiles spawning.',
  'LOG-RQ-STORM': 'Procedure refunded Window.',
  'LOG-RQ-CHARGE': 'Procedure charge — temporary combat/filter systems online.',
  'LOG-CODEX': 'PADD page filed.',
  'LOG-RQ-NEED': 'Procedure still open — finish the remaining steps.',
  'LOG-RQ-STEP': 'Procedure step advanced.',
  'LOG-RQ-VENT': 'Vent seal complete — warren pressure dropping.',
  'LOG-RQ-VENT-SEALED': 'Vent sealed — proceed to the seal console.',
  'LOG-HS-START': 'Beacon handshake started — hold position for sync.',
  'LOG-HS-TICK': 'Beacon handshake syncing.',
  'LOG-HS-INTERRUPT': 'Handshake interrupted — left the beacon pad.',
  'LOG-PB-STRESS': 'Pattern buffer stressed — keep a Power Cell ready before the skiff.',
  'LOG-PB-SYNC': 'Pattern buffer restabilized.',
  'LOG-PB-REJECT': 'Skiff refuses lock — pattern still desynced (need Power Cell).',
  'LOG-PB-DESYNC': 'Nav Lattice desynced — use a Power Cell before the skiff will lock.',
  'LOG-EVT-AFTERGLOW':
    'Drop afterglow — EM spike. Sealant Foam helps clean residue.',
  'LOG-EVT-APPROACH': 'Pad approach — Window shear will pulse Power; watch the pattern buffer.',
  'LOG-EVT-SHEAR': 'Window shear pulse — Power tax under pad approach pressure.',
  'LOG-ION-FRONT': 'Ion front forming — taxes EM and Power; lit fauna track harder.',
  'LOG-ION-PULSE': 'Ion front pulse — +2 EM and -2 Power; Filter or Flare dampens it.',
  'LOG-ION-DAMPEN': 'Ion front pulse dampened by field kit.',
  'LOG-ION-CLEAR': 'Ion front clearing — sector pressure subsides.',
  'LOG-XP': 'Survey proficiency gained.',
  'LOG-LEVEL': 'Survey proficiency advanced.',
  'LOG-SKILL': 'Field skill unlocked.',
  'LOG-SKILL-PICK': 'Choose a field skill — press 1 or 2 (read the effects on the urgency line).',
  'LOG-SKILL-NEED': 'Skill choice pending — press 1 or 2 (effects on the urgency line).',
  'LOG-EM-WARN': 'EM contamination rising — fauna growing agitated.',
  'LOG-EM-HIGH':
    'EM contamination critical — Power tax and wider aggro. Sealant Foam flushes residue.',
  'LOG-EM-PURGE': 'EM contamination flushed.',
  'LOG-SALVAGE-ID': 'Salvage scan complete — kit item recovered.',
  'LOG-SALVAGE-BAD': 'Unstable salvage — EM backlash and local wake.',
  'LOG-PADD-MOD': 'PADD page alters field parameters.',
  'UI-EM': 'EM',
  'UI-SKILL-PICK': 'Field skill',
  'UI-LEVEL': 'LVL',
  'UI-XP': 'XP',
  'UI-MAPPER': 'NAV',
  'SKILL-TRIAGE-NAME': 'Field Medicine',
  'SKILL-TRIAGE-DESC': 'On sector entry: restore +6 HP.',
  'SKILL-SCAVENGER-NAME': 'Scavenger Eye',
  'SKILL-SCAVENGER-DESC': '+15% salvage drops; safer salvage scans.',
  'SKILL-OVERCHARGE-NAME': 'Overcharge Strike',
  'SKILL-OVERCHARGE-DESC': 'While vitals ≤ 50%, strikes are Enhanced.',
  'SKILL-ION-SKIN-NAME': 'Plasma Skin',
  'SKILL-ION-SKIN-DESC': 'Active filter also halves kinetic hits.',
  'SKILL-DEEP-RESERVE-NAME': 'Deep Reserve',
  'SKILL-DEEP-RESERVE-DESC': 'Skip one Power drip every 10 turns.',
  'SKILL-LAST-WINDOW-NAME': 'Last Window',
  'SKILL-LAST-WINDOW-DESC': '+1 DEF while Window ≤ 80.',
} as const;

export type LoreId = keyof typeof LORE;

export function lore(id: LoreId): string {
  return LORE[id];
}
