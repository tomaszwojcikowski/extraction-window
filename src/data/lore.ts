/** Lore registry — every player-facing string maps to an ID. Halcyon Survey Corps / Meridian Shelf. */

export const LORE = {
  // UI
  'UI-TITLE': 'EXTRACTION WINDOW',
  'UI-ORG': 'CSV HALCYON',
  'UI-SUBTITLE': 'Halcyon Survey Corps · Meridian Shelf',
  'UI-SURVEY-TAG': 'Survey Team',
  'UI-BRIEF': 'Get the Lattice · extract on the skiff · Window and Bus both kill you',
  'UI-BRIEF-TUT': 'Drill first — then race Window and Bus to the skiff',
  'UI-MISSION-STATUS': 'MISSION STATUS',
  'UI-PRESS-START': 'ENTER — begin',
  'UI-SEED': 'Mission ID',
  'UI-SEED-HINT': '← → adjust · R randomize',
  'UI-HP': 'Vitals',
  'UI-ENERGY': 'Bus',
  'UI-WINDOW': 'Window',
  'UI-BAR-HP': 'HP',
  'UI-BAR-SHD': 'Shield',
  'UI-BAR-EPS': 'Bus',
  'UI-BAR-WINDOW': 'Window',
  'UI-BAR-XP': 'XP',
  'UI-SECTOR': 'Sector',
  'UI-ION-FRONT': 'ION FRONT',
  'UI-FRONT-CLEARING': 'FRONT CLEARING',
  'UI-TUT-SECTOR': 'DRILL',
  'UI-ATK': 'ATK',
  'UI-DEF': 'DEF',
  'UI-INV': 'Field kit',
  'UI-LOG': 'Log',
  'UI-OBJECTIVE': 'Objective',
  'UI-HELP': 'Field manual',
  'UI-HELP-TUT':
    'TRAINING BAY\n' +
    'Reach the east hatch. Window and Bus are paused here.\n' +
    '\n' +
    'WASD — move · Shift+direction — peek who notices you\n' +
    '. — wait · b — brace · f — shove · step on kit to take it\n' +
    'i — open kit · u — use selected item\n' +
    '\n' +
    'Yellow ion tiles drain Bus — Sealant (u) or take the south detour.\n' +
    'Lines from your feet = who notices you. Flare lights dark fights.\n' +
    '\n' +
    'Press ? after the hatch for the full manual.\n',
  'UI-HELP-BODY':
    'CONTROLS\n' +
    'WASD / arrows — move one tile\n' +
    'Shift+direction — peek who would notice you (no turn spent)\n' +
    '. — wait · b — brace · f — shove (then a direction)\n' +
    'i — kit · u — use or equip · step onto kit to pick it up\n' +
    'Enter / Space / > — hatch, beacon, pad, procedure, hail\n' +
    'p — PADD · 1/2 — pick skill · ? — help · m — mute · Esc — close\n' +
    '\n' +
    'TWO CLOCKS (both can kill you)\n' +
    'Window — turns left before the extract closes.\n' +
    'Bus — kit power. Hazards, EM, and drip drain it. Empty Bus = lose.\n' +
    '\n' +
    'COMBAT\n' +
    'Walk into a hostile to hit it.\n' +
    'Windup paints the tiles it will strike next turn.\n' +
    'At range: b brace, leave those tiles, or kill it.\n' +
    'Adjacent windup: f shove breaks the windup.\n' +
    'Shove into a wall = slam; into hazard = burn; into another foe = both fall.\n' +
    'Two+ hostiles touching you peel DEF — brace or fight in a doorway.\n' +
    '\n' +
    'LIGHT\n' +
    'LIT — safe read · SHADOW — ambush risk.\n' +
    'Flare lights a dark fight.\n' +
    '\n' +
    'EXTRACT (required order)\n' +
    '1 Splice Key · 2 beacon handshake · 3 Nav Lattice · 4 drop skiff pad\n' +
    'Optional procedures refund Window. Kit (med / Bus / Shield) keeps you alive.\n' +
    'On the skiff: > start · . hold · Power Cell skips a hold · Flare blocks the wave.\n' +
    '\n' +
    'HATCHES\n' +
    'Sector hatch (on it): Enter / Space — locked until Key / beacon / Lattice as required.\n' +
    'Sealed hatch (adjacent, optional): Sealant Foam (i then u) or equip Pulse Baton then >.\n' +
    '\n' +
    'HUD\n' +
    'HP · Shield · Bus · Window · XP\n' +
    'EM high — Sealant Foam flushes residue',
  'UI-KIT-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Procedures buy Window.',
  'UI-CONTROLS':
    'WASD move · Shift peek · . wait · b brace · f shove · i kit · ? help',
  'UI-MUTE-ON': 'Audio muted',
  'UI-MUTE-OFF': 'Audio on',
  'UI-HINT-EXIT': 'On hatch — Enter to go to the next sector',
  'UI-HINT-EXIT-NEED-KEY': 'Hatch locked — get the Splice Key in this wreck first',
  'UI-HINT-EXIT-NEED-CORE': 'Hatch locked — get the Nav Lattice first',
  'UI-HINT-EXIT-NEED-BEACON': 'Hatch locked — finish the beacon (>) first',
  'UI-HINT-BEACON': 'Beacon — press > to start the handshake',
  'UI-HINT-HANDSHAKE': 'Handshake running — stay on the beacon',
  'UI-HINT-SHUTTLE': 'Drop skiff — press > while carrying the Nav Lattice',
  'UI-HINT-UPLINK-HOLD': 'Uplink live — . to hold · Power Cell skips · Flare blocks the wave',
  'UI-HINT-DESYNC': 'Pattern desync — use a Power Cell before the skiff will lock',
  'UI-HINT-ITEM': 'Kit on this tile — step onto it to pick it up',
  'UI-HINT-AIM': 'Aim dart — press a direction toward a lit target within 3',
  'UI-HINT-USE-MED': 'HP low — open kit (i), select Field Hypo, press u',
  'UI-HINT-USE-ENERGY': 'Bus low — open kit (i), select Power Cell, press u',
  'UI-HINT-USE-ARMOR': 'Shield low — use a Shield Charge (u)',
  'UI-HINT-USE-PATCH': 'Bleeding — open kit (i), select Medpatch, press u',
  'UI-HINT-USE-SEALANT': 'Hazard underfoot — use Sealant Foam (u)',
  'UI-HINT-SEALED':
    'Sealed hatch (optional) — need Sealant Foam or equip Pulse Baton',
  'UI-HINT-SEALED-SEALANT':
    'Sealed hatch — i, select Sealant Foam, press u to open',
  'UI-HINT-PRY-SEALED': 'Sealed hatch — press > to pry open (Pulse Baton equipped)',
  'UI-HINT-ION-FRONT':
    'Ion front — Filter or Flare softens the next pulse',
  'UI-HINT-FLARE': 'In the dark near hostiles — Flare lights the fight',
  'UI-HINT-LIGHT':
    'LIT safe · SHADOW ambush risk — Flare lights a dark fight',
  'UI-HINT-EQUIP': 'Wearable in kit — i, select it, u to equip',
  'UI-HINT-CLOCKS':
    'Window = turns left · Bus = kit power — either hitting 0 ends the run',
  'UI-HINT-EXTRACT':
    'Required order: Splice Key → beacon → Nav Lattice → drop skiff',
  'UI-HINT-FLANK':
    'Two+ hostiles touching you — DEF drops; brace or fight in a doorway',
  'UI-HINT-SKILL': 'Choose a field skill — press 1 or 2 (move locked until then)',
  'UI-HINT-TELE': 'Windup painted — b brace, leave those tiles, or kill it',
  'UI-HINT-TELE-REACH': 'Windup next to you — f shove breaks it',
  'UI-HINT-SHOVE-DIR': 'Choose shove direction — press a direction key',
  'UI-HINT-BRAND': 'Branded elite — optional; Flare, Probe, or Filter match its brand',
  'UI-HINT-ALLY-DRONE': 'Drone lamp nearby — can cancel one overwatch every few turns',
  'UI-HINT-ALLY-ESCORT': 'Escort beside you — +1 DEF while adjacent',
  'UI-HINT-PREFER-DARK': 'This fauna prefers shadow — stay in LIT',
  'UI-HINT-PREFER-LIT': 'This hunter prefers light — break line of sight or find shadow',
  'UI-HINT-QUEST': 'Optional procedure here — press >',
  'UI-HINT-NPC': 'Field contact — press > to talk',
  'UI-HINT-COMMIT': 'Shift+direction peeks notice · release clears · . waits',
  'UI-HINT-PEEK-TEACH':
    'Lines from your feet show who notices you — Shift+direction peeks before you step',
  'UI-TUT-MOVE': 'WASD to move · Shift+direction peeks notice · . waits',
  'UI-TUT-LIGHT':
    'LIT is a safe read · SHADOW invites ambush — Flare lights dark fights',
  'UI-TUT-KIT': 'i opens kit · u uses item — scan salvage · Flare = light',
  'UI-TUT-HAZARD':
    'Ion tile drains Bus — step off, Sealant (u), or take the south detour',
  'UI-TUT-WAKE':
    'Lines from your feet = who notices you · Shift+direction peeks the next tile',
  'UI-TUT-FIGHT': 'Walk into them to hit · b brace · f shove if adjacent · Flare if dark',
  'UI-TUT-STALKER': 'Hunter winding up — Flare, brace, shove if adjacent, or go south',
  'UI-TUT-GOTO-HATCH': 'East hatch ends the drill — then Window and Bus start ticking',
  'UI-TUT-EXIT': 'On hatch — Enter to start the drop (Window and Bus go live)',
  'UI-QUEST-TRACK': 'OPTIONAL',
  'UI-RQ-SALVAGE': 'Salvage console — press >',
  'UI-RQ-PURGE': 'Purge nest — clear hostiles, then press >',
  'UI-RQ-VENT-A': 'Vent — use Sealant Foam here',
  'UI-RQ-VENT-B': 'Seal console — press > to finish',
  'UI-PAGES': 'Mission PADD',
  'UI-PAGES-EMPTY': 'No PADD pages recovered this mission.',
  'UI-PAGES-HINT': 'p or Esc — close',
  'UI-PAGES-PURPOSE':
    'Kit keeps you alive. Key and Lattice unlock extract. Procedures buy Window.',
  'UI-ACTIVE': 'SYS',
  'UI-END-SUMMARY': 'Last objective · proficiency',
  'UI-QUEST-KEY': 'SPLICE KEY',
  'UI-QUEST-CORE': 'LATTICE',
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
  'UI-LOSE-ENERGY': 'BUS FAILURE',
  'UI-LOSE-ENERGY-BODY': 'Bus hit 0 — kit power gone.',
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
  'OBJ-LOCAL-ROOM': '→ Optional procedure',
  'OBJ-TUT-HATCH': '→ East hatch (learn notice, Bus hazard, kit)',
  'OBJ-TUT-BRIEF': 'Training — Window and Bus paused until you leave',
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
  'SEC-DUCT': 'Bus Conduit Warren',
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
    'Conduit memo: abandoned bus junctions still vent; duct drones patrol seal points.',
  'CODEX-APPROACH':
    'Approach brief: Window pressure desyncs the Lattice — Power Cell before skiff lock.',
  'CODEX-GENERIC': 'PADD fragment recovered — Halcyon survey hand, incomplete.',
  // Fact-bound pages — each may only claim what src/data/codex.ts requires of it.
  'CODEX-FACT-NEST-SWARM':
    'Scrub note: nests hatch on footfall. Swarms read motion first, light second — skirt the beds.',
  'CODEX-FACT-BRINE-HUNTER':
    'Waterline note: pool glare hides the approach. Something patient works this flat — do not wade blind.',
  'CODEX-FACT-VENT-EM':
    'Conduit note: venting under contamination doubles the bus bill. Seal it or hold your breath and move.',
  'CODEX-FACT-TRIPWIRE':
    'Prior team strung wire across the approach. It still answers — and it tells the whole room.',
  'CODEX-FACT-SEALED':
    'Sealed hatch: optional. Stand beside it — Sealant Foam (u) or equip Pulse Baton and press >. Opens a short cache (+Window).',
  'CODEX-FACT-MACHINE':
    'Machine note: patrol units keep the old seal routes. They do not tire and they do not lose interest.',
  'CODEX-FACT-BRANDED':
    'Contact brief: marked specimen on this ground. It answers Flare, Probe, and Filter differently — route around or match the brand.',
  'CODEX-FACT-BRINE':
    'Brine flat: pulse salts sit in the pools. Filters buy minutes; boots buy nothing.',
  'CODEX-FACT-VENT':
    'Vent field: bus junctions still bleed here. Sealant pays for itself within a corridor.',
  'CODEX-FACT-RUBBLE':
    'Collapse note: rubble reads as cover until it shifts. Prior hand lost a window to a wrong line.',
  'CODEX-HOLO':
    'Archive holo: prior survey noted Splice Key wreckage inland — Window clock is the real enemy.',
  'CODEX-ENSIGN':
    'Stranded ensign: escort protocol armed — temporary ally expires when Bus fades.',
  'CODEX-TECH':
    'Field tech: Halcyon probe reboot successful — short combat assist only.',
  'CODEX-SURVEY':
    'Survey contact: bring a Nav Ping — optional favor for Window refund.',
  // Items
  'ITEM-RELAY-KEY': 'Splice Key',
  'ITEM-RELAY-KEY-DESC': 'Opens the Emergency Beacon handshake — required for inland path.',
  'ITEM-NAV-CORE': 'Nav Lattice',
  'ITEM-NAV-CORE-DESC': 'Locks the drop skiff for extract — required to win.',
  'ITEM-MED': 'Field Hypo',
  'ITEM-MED-DESC': 'Restore +18 HP.',
  'ITEM-ENERGY': 'Power Cell',
  'ITEM-ENERGY-DESC':
    '+20 Bus. Also clears pattern desync and skips one skiff uplink hold.',
  'ITEM-PROBE': 'Field Array Pulse',
  'ITEM-PROBE-DESC': '+3 ATK and +3 vision for a short time.',
  'ITEM-STIM': 'Combat Stim',
  'ITEM-STIM-DESC': '+3 ATK for 15 turns.',
  'ITEM-PLATE': 'Shield Charge',
  'ITEM-PLATE-DESC': 'Repair +10 Shield.',
  'ITEM-FLARE': 'Plasma Flare',
  'ITEM-FLARE-DESC':
    'Lights nearby tiles for 4 turns; damages and stuns adjacent foes; cancels overwatch; blocks the skiff pressure wave.',
  'ITEM-FILTER': 'Plasma Filter',
  'ITEM-FILTER-DESC': 'Halves Bus drain from hazards and plasma hits (50 turns).',
  'ITEM-BLADE': 'Combat Knife',
  'ITEM-BLADE-DESC': 'Equip for +1 ATK. Use again to stow.',
  'ITEM-BATON': 'Pulse Baton',
  'ITEM-BATON-DESC':
    'Equip for +1 ATK; melee stuns 1 turn. Adjacent sealed hatch: press > to pry. Use again to stow.',
  'ITEM-HARNESS': 'EVA Harness',
  'ITEM-HARNESS-DESC': 'Equip for +6 max Shield (refills). Use again to stow.',
  'ITEM-VEST': 'Ablative Vest',
  'ITEM-VEST-DESC': 'Equip for +4 max Shield and +1 DEF. Use again to stow.',
  'ITEM-DART': 'Plasma Microdart',
  'ITEM-DART-DESC': 'u then a direction: hit a lit target within 3 — damage and expose.',
  'ITEM-SEALANT': 'Sealant Foam',
  'ITEM-SEALANT-DESC':
    'Clears ion/vent/brine underfoot, flushes EM, or opens an adjacent sealed hatch (u).',
  'ITEM-MAPPER': 'Nav Ping',
  'ITEM-MAPPER-DESC': 'Marks the sector hatch for 40 turns (even through fog).',
  'ITEM-SALVAGE': 'Unknown Salvage',
  'ITEM-SALVAGE-DESC':
    'Step onto it to pick up, then u in the kit to scan. May give a useful item — or backlash.',

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
  'ENEMY-DUCT-NOTE': 'Bus junction machine — cuts a beam down the lane it faces.',
  'ENEMY-SERPENT-NOTE': 'Coils, then lunges one tile. Brace it or clear the ring.',
  'ENEMY-WRAITH-NOTE': 'Covers two tiles on the charge — stepping back will not break it.',
  'ENEMY-SENTINEL-NOTE': 'Arms overwatch on the tiles beside it — do not step in while it is locked.',
  'ENEMY-ELITE-NOTE': 'Elite fauna — strong kit drop and Window refund on kill.',
  'ENEMY-BOSS-NOTE': 'Campaign apex — optional detour, rich storm/XP/kit payoff.',
  'BRAND-FLAREBOUND': 'FLAREBOUND — Flares hit harder and stun longer; drops a Flare on kill.',
  'BRAND-WARDED': 'WARDED — its ion hits are softer; drops a Shield Charge on kill.',
  'BRAND-SHADOWBOUND': 'SHADOWBOUND — +1 notice against you in shadow; drops a Probe on kill.',

  // Logs
  'LOG-DROP':
    'Meridian Shelf drop. Field array still bleeding EM — fauna will wake. Recover Lattice; extract before Window or Bus hits 0.',
  'LOG-TUT-WELCOME':
    'Drill bay — Window and Bus paused. Lines from your feet show notice; ion tiles drain Bus. East hatch starts the real drop.',
  'LOG-TUT-LIGHT':
    'Lamp stops at walls. Badge: LIT safe · SHADOW ambush risk.',
  'LOG-TUT-HAZARD':
    'Ion tile drains Bus — Sealant (u) or take the south detour.',
  'LOG-TUT-WAKE':
    'Lines from your feet = who notices you. Shift+direction peeks the next tile (no turn).',
  'LOG-TUT-DONE':
    'Window and Bus are ticking. Order: Splice Key → beacon → Nav Lattice → drop skiff.',
  'LOG-MOVE-BLOCKED': 'Path obstructed.',
  'LOG-WAIT': 'Holding position. Bus ticks.',
  'LOG-HIT': 'You strike',
  'LOG-KILL': 'Hostile down',
  'LOG-HURT': 'You take a hit',
  'LOG-ARMOR-ABSORB': 'Shield absorbs',
  'LOG-ARMOR-RESEAT': 'Plating re-seated in the hatch — shield restored.',
  'LOG-PICKUP': 'Stowed in field kit.',
  'LOG-NPC-HAIL': 'Field contact hailed.',
  'LOG-NPC-SIGHT': 'Field contact on sensors.',
  'LOG-NPC-HOLO': 'Archive dump — Window refund.',
  'LOG-NPC-ENSIGN': 'Ensign transfers kit scrap and escort protocol.',
  'LOG-NPC-TECH': 'Tech reboots a Halcyon probe for temporary assist.',
  'LOG-NPC-SURVEY': 'Survey contact shares bearing notes — optional favor open.',
  'LOG-NPC-BLOCK': 'Contact occupies that tile — hail with > or step around.',
  'LOG-AGENDA-WANT-MED': 'Ensign needs a Field Hypo spare — hail again when you have one.',
  'LOG-AGENDA-WANT-SEALANT': 'Tech wants Sealant Foam or a Filter — hail again when ready.',
  'LOG-AGENDA-WANT-SURVEY': 'Contact wants a Nav Ping — hail again when you have one.',
  'LOG-AGENDA-NONE': 'Contact has nothing further.',
  'LOG-AGENDA-DONE': 'Favor repaid — Window refund.',
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
  'LOG-USE-ENERGY': 'Power cell slotted into bus.',
  'LOG-USE-PROBE': 'Field array pulse active — ATK up.',
  'LOG-USE-STIM': 'Combat stim active — ATK surge.',
  'LOG-USE-PLATE': 'Shield charge bonded — pool repaired.',
  'LOG-USE-FLARE': 'Plasma flare discharged — adjacent hostiles stunned.',
  'LOG-USE-FILTER': 'Plasma filter online — drain and plasma hits reduced.',
  'LOG-USE-BLADE': 'Combat knife equipped — ATK up while worn.',
  'LOG-USE-BATON': 'Pulse baton equipped — ATK up; melee stuns.',
  'LOG-USE-HARNESS': 'EVA harness equipped — shield capacity up.',
  'LOG-USE-VEST': 'Ablative vest equipped — Shield + DEF.',
  'LOG-UNEQUIP': 'Gear stowed in kit.',
  'LOG-USE-DART': 'Plasma microdart impact — target exposed.',
  'LOG-USE-SEALANT': 'Sealant foam set — vent/hazard neutralized.',
  'LOG-SEALED-OPEN': 'Sealant Foam opens the sealed hatch — path clear.',
  'LOG-SEALED-PRY': 'Pulse Baton pries the sealed hatch open.',
  'LOG-SEALED-CACHE': 'Sealed hatch cache — +6 Window.',
  'LOG-TRIPWIRE': 'Tripwire snaps — EM spike; nearby fauna alerted.',
  'LOG-BRINE-POOL': 'Brine pool drains the Bus.',
  'LOG-SCRUB-NEST': 'Scrub nest stirs — mite emerges.',
  'LOG-SEALANT-FAIL': 'No vent or hazard underfoot to seal.',
  'LOG-AIM-DART': 'Microdart ready — choose fire direction.',
  'LOG-AIM-MISS': 'Microdart spent — no valid visible target in range.',
  'LOG-USE-FAIL': 'No usable item selected.',
  'LOG-USE-EMPTY': 'Field kit empty — nothing to use.',
  'LOG-USE-QUEST': 'Objective item — not consumable (carry to beacon / drop skiff).',
  'LOG-DRAIN': 'Bus siphoned',
  'LOG-SPORE-BURST': 'Wash spore burst — power spike and burn.',
  'LOG-TELE-SWELL': 'Spore swelling — burst imminent.',
  'LOG-TELE-POUNCE': 'Hostile windup — one-tile lunge. Brace or clear the ring.',
  'LOG-TELE-REACH': 'Long windup — it can cover two tiles. Brace; backing off will not break it.',
  'LOG-CHARGE-WINDED': 'Overcommitted charge — it lands winded and open.',
  'LOG-TELE-ZONE': 'Rift charging a standoff pulse — leave the ring, plating will not hold.',
  'LOG-ZONE-PULSE': 'Ion pulse washes the ring — seams exposed.',
  'LOG-ZONE-FIZZLE': 'Ion pulse discharges into empty ground.',
  'LOG-TELE-BEAM': 'Drone beam charging — break line or brace.',
  'LOG-BEAM-FIRE': 'Drone ion beam rakes the lane.',
  'LOG-BEAM-BLOCKED': 'Drone beam splashes against cover.',
  'LOG-TELE-OVERWATCH': 'Sentinel overwatch locked — do not enter adjacent tiles.',
  'LOG-OVERWATCH-FIRE': 'Sentinel overwatch strikes first.',
  'LOG-BRACE': 'Brace set — defense reinforced; pounce impact blunted.',
  'LOG-SHOVE': 'Shoulder in — driven back a tile.',
  'LOG-SHOVE-SLAM': 'Backed against cover — it eats the impact.',
  'LOG-SHOVE-COLLIDE': 'Driven into the one behind it — both go down hard.',
  'LOG-PUNISH': 'It has lost its footing — the strike goes in clean.',
  'LOG-SHOVE-GROUND': 'Thrown into live ground.',
  'LOG-SHOVE-EMPTY': 'Nothing in reach to shove.',
  'LOG-SHOVE-WHICH': 'Shove which way?',
  'LOG-CONTAMINATION': 'Spore contamination tile tax drains the Bus.',
  'LOG-AMBUSH': 'Hunter breaks cover.',
  'LOG-AMBUSH-DARK': 'Hunter strikes from the dark — no telegraph.',
  'LOG-STATUS-BLEED': 'Bleed tick',
  'LOG-STATUS-ION': 'Plasma burn',
  'LOG-STATUS-BLIND': 'Optics washed — vision narrowed.',
  'LOG-STATUS-JAM': 'Kit jammed — Probe / Sealant blocked.',
  'LOG-JAM-BLOCK': 'Systems jammed — cannot apply Probe or Sealant.',
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
    'Shearwash Basin. Standing shear-water sheets the shelf — bus will feel every step; wash spores bloom in the wet EM.',
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
    'Bus Conduit Warren. Abandoned junction warren — vent spines and rubble chokes.',
  'LOG-SEC-ASH': 'Shear Ash Fields. Baseline radiation — bus drain elevated.',
  'LOG-SEC-BRINE':
    'Pulse Brine Flats. Ion-brine pools lace the shelf — hazard density spikes before the cache.',
  'LOG-SEC-VAULT':
    'Contingency Cache. Halcyon depot. Sentinels are site defense — EM-corrupted, still hostile.',
  'LOG-SEC-FISSURE':
    'Shear Fissure. Ion shear opens the rock — window tax rising; pad still inland.',
  'LOG-SEC-APPROACH':
    'Skiff Approach. Storm shear over the final choke — Drop Skiff Ridge ahead.',
  'LOG-SEC-RIDGE': 'Drop Skiff Ridge. Drop skiff pad ahead — Nav Lattice required for lock.',
  'LOG-EXIT-BLOCKED': 'Hatch will not open yet.',
  'LOG-HAZARD': 'Ion hazard — bus drain.',
  'LOG-EXTRACT': 'Nav lock restored. Extraction complete.',
  'LOG-FAVOR-GRANT': 'Extract favor secured.',
  'LOG-FAVOR-CONSUME': 'Extract favor spent.',
  'LOG-FAVOR-SHELTER': 'Favor: +15 Window on the final sector.',
  'LOG-FAVOR-HAZARD': 'Favor: hazard underfoot ignored this step.',
  'LOG-FAVOR-PATTERN': 'Favor: pattern buffer caught a desync spike.',
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
  'LOG-WINDUP-KILL': 'Windup interrupted — salvage bonus.',
  'LOG-USE-MAPPER': 'Nav ping — hatch bearing locked.',
  'LOG-RQ-SALVAGE': 'Survey salvage complete — kit and PADD page recovered.',
  'LOG-RQ-PURGE': 'Room purge complete — hostiles cleared; crate unlocked.',
  'LOG-RQ-PURGE-WAKE': 'Room purge — hostiles spawning.',
  'LOG-RQ-STORM': 'Survey procedure refunded Window.',
  'LOG-RQ-CHARGE': 'Anomaly charge — temporary combat/filter systems online.',
  'LOG-CODEX': 'PADD page filed.',
  'LOG-RQ-NEED': 'Anomaly still active — complete the survey procedure.',
  'LOG-RQ-STEP': 'Survey procedure step advanced.',
  'LOG-RQ-VENT': 'Vent seal complete — warren pressure dropping.',
  'LOG-RQ-VENT-SEALED': 'Vent cluster sealed — proceed to seal console.',
  'LOG-HS-START': 'Beacon handshake started — hold position for sync.',
  'LOG-HS-TICK': 'Beacon handshake syncing.',
  'LOG-HS-INTERRUPT': 'Handshake interrupted — left the beacon pad.',
  'LOG-PB-DESYNC': 'Nav Lattice desynced — use a Power Cell before the skiff will lock.',
  'LOG-PB-SYNC': 'Pattern buffer restabilized.',
  'LOG-PB-REJECT': 'Skiff refuses lock — pattern still desynced (need Power Cell).',
  'LOG-PB-STRESS': 'Pattern buffer under Window stress.',
  'LOG-EVT-AFTERGLOW':
    'Drop afterglow — EM spike. Sealant Foam helps clean residue.',
  'LOG-EVT-APPROACH': 'Pad approach — Window shear will pulse the Bus; watch the pattern buffer.',
  'LOG-EVT-SHEAR': 'Window shear pulse — Bus tax under pad approach pressure.',
  'LOG-ION-FRONT': 'Ion front forming — taxes EM and Bus; lit fauna track harder.',
  'LOG-ION-PULSE': 'Ion front pulse — +2 EM and -2 Bus; Filter or Flare dampens it.',
  'LOG-ION-DAMPEN': 'Ion front pulse dampened by field kit.',
  'LOG-ION-CLEAR': 'Ion front clearing — sector pressure subsides.',
  'LOG-XP': 'Survey proficiency gained.',
  'LOG-LEVEL': 'Survey proficiency advanced.',
  'LOG-SKILL': 'Field skill unlocked.',
  'LOG-SKILL-PICK': 'Choose a field skill — press 1 or 2.',
  'LOG-SKILL-NEED': 'Skill choice pending — press 1 or 2.',
  'LOG-EM-WARN': 'EM contamination rising — fauna growing agitated.',
  'LOG-EM-HIGH':
    'EM contamination critical — Bus tax and wider aggro. Sealant Foam flushes residue.',
  'LOG-EM-PURGE': 'EM contamination flushed.',
  'LOG-SALVAGE-ID': 'Array ID complete — known kit item.',
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
  'SKILL-SCAVENGER-DESC': '+15% salvage drops; safer unknown-crate scans.',
  'SKILL-OVERCHARGE-NAME': 'Overcharge Strike',
  'SKILL-OVERCHARGE-DESC': '+1 melee damage while vitals ≤ 50%.',
  'SKILL-ION-SKIN-NAME': 'Plasma Skin',
  'SKILL-ION-SKIN-DESC': 'Active filter also halves kinetic hits.',
  'SKILL-DEEP-RESERVE-NAME': 'Deep Reserve',
  'SKILL-DEEP-RESERVE-DESC': 'Skip one bus drip every 10 turns.',
  'SKILL-LAST-WINDOW-NAME': 'Last Window',
  'SKILL-LAST-WINDOW-DESC': '+1 DEF while Window ≤ 80.',
} as const;

export type LoreId = keyof typeof LORE;

export function lore(id: LoreId): string {
  return LORE[id];
}
