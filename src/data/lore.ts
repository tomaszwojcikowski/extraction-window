/** Lore registry — every player-facing string maps to an ID. Halcyon Survey Corps / Meridian Shelf. */

export const LORE = {
  // UI
  'UI-TITLE': 'EXTRACTION WINDOW',
  'UI-ORG': 'CSV HALCYON',
  'UI-SUBTITLE': 'Halcyon Survey Corps · Meridian Shelf',
  'UI-SURVEY-TAG': 'Survey Team',
  'UI-BRIEF': 'Recover the Nav Lattice · reach the drop skiff before the Window closes',
  'UI-BRIEF-TUT': 'Training bay first — then extract before the Window closes',
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
    'Reach the east hatch.\n' +
    '\n' +
    'WASD move · Shift+dir peek wake · . wait\n' +
    'Step on kit to take it · i kit · u use · Enter on hatch\n' +
    '\n' +
    'Ion tiles tax Bus — sealant (u) or south alcove.\n' +
    'Window clock starts after you leave.\n' +
    '\n' +
    '? after the hatch for the full manual.\n',
  'UI-HELP-BODY':
    'CONTROLS\n' +
    'WASD / arrows — move one tile\n' +
    'Shift+dir — peek wake (release to clear)\n' +
    '. — wait · b — brace · f — shove (then a direction)\n' +
    'i — kit · u — use / equip (step on kit to take it)\n' +
    'Enter / Space / > — hatch, beacon, pad, scan, hail\n' +
    'p — PADD notes · 1/2 — pick skill · ? — help · m — mute\n' +
    'Esc — close peek / kit / PADD / help\n' +
    '\n' +
    'COMBAT\n' +
    'Walk into a hostile to strike it.\n' +
    'A windup paints the ground it threatens. Winding up at range —\n' +
    'brace, or leave the painted tiles. Winding up next to you —\n' +
    'f shoves it and breaks the set.\n' +
    'A shove deals nothing on open floor, so pick your ground: cover\n' +
    'behind it turns the push into a slam, caustic footing does worse,\n' +
    'and a second hostile stacked behind takes both of them down.\n' +
    'Anything off its footing eats the next strike clean.\n' +
    'Every hostile in contact past the first pries a point off DEF —\n' +
    'fight in a doorway, or brace to cover your sides.\n' +
    '\n' +
    'PRIORITIES\n' +
    'Kit keeps you alive (med / Bus / Shield).\n' +
    'Splice Key + Nav Lattice unlock extract — they are not consumables.\n' +
    'Survey procedures refund Window and grant XP / PADD.\n' +
    'Drop skiff: > start uplink · . hold · Coolant skips a hold · Flare repels the wave.\n' +
    '\n' +
    'HUD\n' +
    'HP · Shield · Bus · Window · XP\n' +
    'ATK / DEF combat · EM contamination (Coolant / Sealant / Quiet)\n' +
    'LIT / SHADOW / QUIET — how fauna reads your lamp (Quiet stance via EM Scrambler)\n' +
    'KEY / Lattice badges · Quiet stance (Scrambler item)',
  'UI-KIT-PURPOSE':
    'Kit = survive. Key + Lattice = extract. Procedures = Window + XP.',
  'UI-CONTROLS':
    'WASD move · Shift peek · . wait · i kit · ? help',
  'UI-MUTE-ON': 'Audio muted',
  'UI-MUTE-OFF': 'Audio on',
  'UI-HINT-EXIT': 'On hatch — Enter to advance',
  'UI-HINT-BEACON': 'Beacon — press > to start handshake',
  'UI-HINT-HANDSHAKE': 'Handshake syncing — hold on the beacon',
  'UI-HINT-SHUTTLE': 'Drop skiff — press > with Nav Lattice',
  'UI-HINT-UPLINK-HOLD': 'Uplink live — . hold · Coolant skips · Flare repels',
  'UI-HINT-DESYNC': 'Pattern desync — use Bus Coolant before skiff lock',
  'UI-HINT-ITEM': 'Salvage here — press g',
  'UI-HINT-AIM': 'Aim dart — direction to a lit target within 3',
  'UI-HINT-USE-MED': 'HP critical — kit (i) · Field Hypo (u)',
  'UI-HINT-USE-ENERGY': 'Bus low — kit (i) · Power Cell / Coolant (u)',
  'UI-HINT-USE-ARMOR': 'Shield thin — Shield Charge (u)',
  'UI-HINT-USE-PATCH': 'Bleeding — kit (i) · Medpatch (u)',
  'UI-HINT-USE-SEALANT': 'Hazard here — Sealant Foam (u)',
  'UI-HINT-SEALED': 'Sealed hatch — Sealant or baton pry (>)',
  'UI-HINT-PRY-SEALED': 'Sealed hatch — pry with baton (>)',
  'UI-HINT-QUIET':
    'Quiet — lamp dims; fauna less interested; adjacent pounces may skip telegraph',
  'UI-HINT-QUIET-EM':
    'EM high — Scrambler (u) for Quiet (cuts aggro; FOV shrinks)',
  'UI-HINT-ION-FRONT':
    'Ion front — Filter, Flare, or Scrambler dampens the next pulse',
  'UI-HINT-FLARE': 'Dark near hostiles — Flare lights the fight',
  'UI-HINT-LIGHT':
    'LIT clear · SHADOW ambush band · QUIET dims the lamp (Scrambler)',
  'UI-HINT-EQUIP': 'Gear in kit — i, select, u to equip',
  'UI-HINT-EXPLORE': 'Explore more — hatch survey bonus near 55%',
  'UI-HINT-SKILL': 'Field skill — press 1 or 2 (move locked)',
  'UI-HINT-TELE': 'Hostile winding up — b brace · clear the ground · or kill it',
  'UI-HINT-TELE-REACH': 'Winding up in reach — f shove breaks its set',
  'UI-HINT-SHOVE-DIR': 'Shove which way? — press a direction',
  'UI-HINT-BRAND': 'Branded elite — optional reward; route around or counter-kit',
  'UI-HINT-ALLY-DRONE': 'Drone lamp — can interrupt one overwatch every few turns',
  'UI-HINT-ALLY-ESCORT': 'Escort cover while adjacent — +1 DEF',
  'UI-HINT-PREFER-DARK': 'Fauna likes shadow — stay LIT',
  'UI-HINT-PREFER-LIT': 'Hunter likes light — break line or find shadow',
  'UI-HINT-QUEST': 'Survey procedure here — press >',
  'UI-HINT-NPC': 'Field contact — press > to hail',
  'UI-HINT-COMMIT': 'Shift+dir peeks wake · release clears · . waits',
  'UI-HINT-PEEK-TEACH':
    'Wake lines at your feet — Shift+dir peeks before you step',
  'UI-TUT-MOVE': 'WASD move · Shift+dir peek wake · . wait',
  'UI-TUT-LIGHT':
    'Your lamp stops at walls. Badge: LIT clear · SHADOW ambush · QUIET dim',
  'UI-TUT-KIT': 'i kit · u use — ID salvage / flare / seal',
  'UI-TUT-HAZARD':
    'Ion hazard taxes Bus — cross, Sealant (u), or south alcove',
  'UI-TUT-WAKE':
    'Lines from your feet = who notices you · Shift+dir peeks next tile',
  'UI-TUT-FIGHT': 'Bump to fight · b brace · flare if dark',
  'UI-TUT-STALKER': 'Stalker winding up — flare, brace, or slip south',
  'UI-TUT-GOTO-HATCH': 'East hatch ends training — Window clock starts after',
  'UI-TUT-EXIT': 'On hatch — Enter (or walk off) to begin the drop',
  'UI-SURVEY': 'SRV',
  'UI-EXPLORE': 'EXP',
  'UI-QUEST-TRACK': 'QUEST',
  'UI-RQ-SALVAGE': 'Salvage console — press >',
  'UI-RQ-PURGE': 'Purge nest — clear hostiles, then >',
  'UI-RQ-VENT-A': 'Vent cluster — use Sealant Foam here',
  'UI-RQ-VENT-B': 'Seal console — press > to lock the warren',
  'UI-PAGES': 'Mission PADD',
  'UI-PAGES-EMPTY': 'No PADD pages recovered this survey mission.',
  'UI-PAGES-HINT': 'p or esc — close',
  'UI-PAGES-PURPOSE':
    'Kit = survive. Key + Lattice = extract. Procedures = Window + XP.',
  'UI-ACTIVE': 'SYS',
  'UI-END-SUMMARY': 'Last objective / proficiency',
  'UI-QUEST-KEY': 'KEY',
  'UI-QUEST-CORE': 'CORE',
  'UI-RELAY-OPEN': 'BEACON OPEN',
  'UI-PROBE': 'ARY',
  'UI-STIM': 'STIM',
  'UI-PLATE': 'Shield',
  'UI-ARMOR': 'Shield',
  'UI-TOOL': 'TOOL',
  'UI-EQUIP-ARMOR': 'SUIT',
  'UI-ALLY-DRONE': 'DRONE LAMP',
  'UI-ALLY-ESCORT': 'ESCORT COVER',
  'UI-FILTER': 'FILTER',
  'UI-JAMMER': 'Quiet',
  'UI-WIN': 'EXTRACTION COMPLETE',
  'UI-WIN-BODY': 'Nav lock restored. Halcyon confirms drop skiff pickup.',
  'UI-LOSE-HP': 'SURVEY OFFICER DOWN',
  'UI-LOSE-HP-BODY': 'Vital signs lost. Hostile contact fatal.',
  'UI-LOSE-ENERGY': 'BUS FAILURE',
  'UI-LOSE-ENERGY-BODY': 'Bus depleted under ion stress.',
  'UI-LOSE-STORM': 'WINDOW COLLAPSED',
  'UI-LOSE-STORM-BODY': 'Window sealed the ridge pad. Halcyon cannot lock.',
  'UI-LOSE-STUCK': 'MISSION ABORT',
  'UI-LOSE-STUCK-BODY': 'No viable extraction path remaining.',
  'UI-RETRY': 'ENTER — new survey team · ESC — title',
  'UI-EMPTY-INV': 'Field kit empty',
  'UI-INV-HINT': '↑↓ or 1–9 select · u use/equip (again to stow) · esc close',

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
  'OBJ-LOCAL-ROOM': '→ Survey anomaly',
  'OBJ-TUT-HATCH': '→ Drill hatch (learn wake, hazard, kit)',
  'OBJ-TUT-BRIEF': 'Training bay — Window paused until you leave the hatch',
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
    'Approach brief: Window pressure desyncs nav pattern buffers — Coolant before skiff lock.',
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
    'Hatch memo: pressure seals held. Whatever is behind them cost the last crew their window.',
  'CODEX-FACT-MACHINE':
    'Machine note: patrol units keep the old seal routes. They do not tire and they do not lose interest.',
  'CODEX-FACT-BRANDED':
    'Contact brief: marked specimen on this ground. Counter-kit first — it answers flare and dark differently.',
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
    'Survey contact: map a mid-room or bring a Nav Ping — optional favor for Window refund.',
  // Items
  'ITEM-RELAY-KEY': 'Splice Key',
  'ITEM-RELAY-KEY-DESC': 'Emergency Beacon inland authorization crystal.',
  'ITEM-NAV-CORE': 'Nav Lattice',
  'ITEM-NAV-CORE-DESC': 'Spare drop-skiff navigational lattice — extraction lock.',
  'ITEM-MED': 'Field Hypo',
  'ITEM-MED-DESC': 'Primary heal — restore +18 HP. Use when vitals drop.',
  'ITEM-ENERGY': 'Power Cell',
  'ITEM-ENERGY-DESC': 'Standard Bus recharge — +20 Bus.',
  'ITEM-PROBE': 'Field Array Pulse',
  'ITEM-PROBE-DESC': 'Temporary attack boost and wider sensor range (+3).',
  'ITEM-STIM': 'Combat Stim',
  'ITEM-STIM-DESC': 'Short ATK surge (+3 ATK, 15 turns).',
  'ITEM-PLATE': 'Shield Charge',
  'ITEM-PLATE-DESC': 'Repair personal Shield pool (+10 Shield).',
  'ITEM-FLARE': 'Plasma Flare',
  'ITEM-FLARE-DESC':
    '4-turn light; burst damage + stun adjacent hostiles; cancels sentinel overwatch and repels the skiff uplink wave.',
  'ITEM-FILTER': 'Plasma Filter',
  'ITEM-FILTER-DESC': 'Halves environmental Bus drain and plasma hits (50 turns).',
  'ITEM-BLADE': 'Combat Knife',
  'ITEM-BLADE-DESC': 'Tool: +1 ATK while worn. Use again to stow.',
  'ITEM-BATON': 'Pulse Baton',
  'ITEM-BATON-DESC': 'Tool: +1 ATK; melee stuns 1 turn. Use again to stow.',
  'ITEM-HARNESS': 'EVA Harness',
  'ITEM-HARNESS-DESC': 'Suit: +6 max Shield and refill. Use again to stow.',
  'ITEM-VEST': 'Ablative Vest',
  'ITEM-VEST-DESC': 'Suit: +4 max Shield, +1 DEF while worn. Use again to stow.',
  'ITEM-DART': 'Plasma Microdart',
  'ITEM-DART-DESC': 'Aim (u then a direction): hit a visible target within 3 tiles — expose + damage.',
  'ITEM-JAMMER': 'EM Scrambler',
  'ITEM-JAMMER-DESC':
    'Quiet stance — FOV shrinks, fauna interest drops; at EM-HIGH suppresses aggro bump; mites/wasps silence (12 turns).',
  'ITEM-SEALANT': 'Sealant Foam',
  'ITEM-SEALANT-DESC': 'Neutralize hazard/vent underfoot for this sector visit.',
  'ITEM-MAPPER': 'Nav Ping',
  'ITEM-MAPPER-DESC': 'Sensor ping — chevron to sector hatch for 40 turns (even unexplored).',
  'ITEM-SALVAGE': 'Unknown Salvage',
  'ITEM-SALVAGE-DESC':
    'Unidentified crate — stow with g, then use (u) in the kit to array-scan. May backlash.',

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
  'BRAND-FLAREBOUND': 'FLAREBOUND — plasma flares hit harder and stun longer; recover a Flare Prism on kill.',
  'BRAND-WARDED': 'WARDED — ion lattice softens its own ion strikes; recover Ward Weave on kill.',
  'BRAND-SHADOWBOUND': 'SHADOWBOUND — gains +1 aggro against targets in shadow; recover a Shadow Lens on kill.',

  // Logs
  'LOG-DROP':
    'Survey team on Meridian Shelf. Long-range field array silent. Residual scan pressure agitating local ecology — hostiles probable.',
  'LOG-TUT-WELCOME':
    'Training bay — Window paused. Wake lines show who notices you; ion tiles tax Bus. East hatch starts the real drop.',
  'LOG-TUT-LIGHT':
    'Lamp stops at walls. Badge: LIT clear · SHADOW ambush · QUIET dims lamp (Scrambler).',
  'LOG-TUT-HAZARD':
    'Ion hazard drains Bus — seal with Sealant (u) or take the south alcove.',
  'LOG-TUT-WAKE':
    'Wake lines = fauna interest. Shift+dir peeks the next tile without moving.',
  'LOG-TUT-DONE': 'Training complete — Relay Scar Flats. Window is live.',
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
  'LOG-AGENDA-WANT-QUIET': 'Tech wants a Scrambler or active Quiet — hail again when ready.',
  'LOG-AGENDA-WANT-SURVEY': 'Contact wants a surveyed room this sector or a Nav Ping.',
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
  'LOG-SURVEY-ROOM': 'Mid-room surveyed — Window and proficiency tick up.',
  'LOG-SURVEY-SECTOR': 'Sector survey complete — hatch explore bonus.',
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
  'LOG-USE-JAMMER': 'Quiet stance online — Scrambler dims the lamp.',
  'LOG-USE-SEALANT': 'Sealant foam set — vent/hazard neutralized.',
  'LOG-SEALED-OPEN': 'Sealant cracks the sealed hatch — floor cleared.',
  'LOG-SEALED-PRY': 'Pulse baton pries the sealed hatch open.',
  'LOG-SEALED-CACHE': 'Hatch cache recovered — Window refunded.',
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
  'LOG-STATUS-JAM': 'Kit jammed — Probe / Scrambler blocked.',
  'LOG-JAM-BLOCK': 'Systems jammed — cannot apply Probe or Scrambler.',
  'LOG-STATUS-FATIGUE': 'Fatigue — Bus tax until it clears (harness cancels).',
  'LOG-STATUS-MARKED': 'Marked — fauna interest rising.',
  'LOG-LOOT-DROP': 'Salvage drops from the carcass.',
  'LOG-BRAND-SIGHT': 'Branded hostile identified.',
  'LOG-BRAND-DROP': 'Branded field kit recovered.',
  'LOG-GOT-KEY': 'Splice Key acquired from Crash Wreck Belt. Proceed to Emergency Beacon.',
  'LOG-USED-KEY':
    'Beacon authorized. Inland corridor open — Contingency Cache holds spare Nav Lattice.',
  'LOG-NEED-KEY': 'Beacon sealed. Splice Key required.',
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
  'LOG-EXIT-BLOCKED': 'Hatch sealed.',
  'LOG-HAZARD': 'Ion hazard — bus drain.',
  'LOG-EXTRACT': 'Nav lock restored. Extraction complete.',
  'LOG-FAVOR-GRANT': 'Extract favor secured.',
  'LOG-FAVOR-CONSUME': 'Extract favor spent.',
  'LOG-FAVOR-SHELTER': 'Storm shelter unfolded — final window widened.',
  'LOG-FAVOR-HAZARD': 'Safe-step favor absorbed the terrain hazard.',
  'LOG-FAVOR-PATTERN': 'Pattern-buffer fail-safe caught the shear spike.',
  'LOG-UPLINK-START': 'Nav Lattice uplink started — hold the ridge pad.',
  'LOG-UPLINK-HOLD': 'Uplink hold maintained.',
  'LOG-UPLINK-TICK': 'Uplink signal climbing.',
  'LOG-UPLINK-WAVE-IN': 'Pressure wave inbound next hold — flare to repel or coolant to accelerate.',
  'LOG-UPLINK-WAVE-HIT': 'Pressure wave hits the pad.',
  'LOG-UPLINK-WAVE-REPEL': 'Flare bloom repels the pressure wave.',
  'LOG-UPLINK-COOLANT': 'Coolant overclocks the uplink.',
  'LOG-UPLINK-FLARE': 'Flare primed for the incoming pressure wave.',
  'LOG-UPLINK-INTERRUPT': 'Uplink interrupted — left the ridge pad.',
  'LOG-STORM-WARN': 'Window low.',
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
  'LOG-PB-DESYNC': 'Nav Lattice pattern buffer desynced — coolant required before skiff lock.',
  'LOG-PB-SYNC': 'Pattern buffer restabilized.',
  'LOG-PB-REJECT': 'Drop skiff rejects lock — pattern buffer still desynced.',
  'LOG-PB-STRESS': 'Pattern buffer under Window stress.',
  'LOG-QUIET-ON':
    'Quiet stance online — sensors narrowed; soft shadow can hide adjacent pounces.',
  'LOG-QUIET-OFF': 'Quiet stance offline — sensors and fauna interest return.',
  'LOG-QUIET-EM': 'Quiet stance holding — EM-HIGH aggro bump suppressed while FOV stays tight.',
  'LOG-EVT-AFTERGLOW': 'Drop afterglow — residual field-array EM spike.',
  'LOG-EVT-APPROACH': 'Pad approach — Window shear will pulse the Bus; watch the pattern buffer.',
  'LOG-EVT-SHEAR': 'Window shear pulse — Bus tax under pad approach pressure.',
  'LOG-ION-FRONT': 'Ion front forming — taxes EM and Bus; lit fauna track harder.',
  'LOG-ION-PULSE': 'Ion front pulse — +2 EM and -2 Bus; Quiet, Filter, or Flare dampens it.',
  'LOG-ION-DAMPEN': 'Ion front pulse dampened by field kit.',
  'LOG-ION-CLEAR': 'Ion front clearing — sector pressure subsides.',
  'LOG-XP': 'Survey proficiency gained.',
  'LOG-LEVEL': 'Survey proficiency advanced.',
  'LOG-SKILL': 'Field skill unlocked.',
  'LOG-SKILL-PICK': 'Choose a field skill — press 1 or 2.',
  'LOG-SKILL-NEED': 'Skill choice pending — press 1 or 2.',
  'LOG-EM-WARN': 'EM contamination rising — fauna growing agitated.',
  'LOG-EM-HIGH':
    'EM contamination critical — Bus tax and wider aggro. Quiet stance (Scrambler) suppresses the bump.',
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
