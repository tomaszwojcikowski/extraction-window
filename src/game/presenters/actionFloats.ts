import type { LoreId } from '../../data/lore';
import { ThemeCss } from '../../scenes/theme';

export type ActionFloat = {
  label: string;
  color: string;
};

/** Signed vitals deltas for kit / hurt floats when log detail is narrative. */
export type ActionFloatVitals = {
  hpDelta?: number;
  energyDelta?: number;
  armorDelta?: number;
};

/** Announce when encirclement appears or clears — DEF readout alone is easy to miss. */
export function flankEdgeFloat(before: number, after: number): ActionFloat | null {
  if (before === after) return null;
  if (after > before) {
    return { label: `FLANK −${after} DEF`, color: ThemeCss.rust };
  }
  return { label: 'FLANK CLEAR', color: ThemeCss.safe };
}

function signedDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Prefer a short combat subject · damage pair from formatCombatDetail. */
function shortCombatDetail(detail: string | undefined): string | null {
  if (!detail) return null;
  return detail.split(' · ').slice(0, 2).join(' · ');
}

function labelMentions(labels: ReadonlyArray<ActionFloat>, re: RegExp): boolean {
  return labels.some((l) => re.test(l.label));
}

/**
 * When a vitals channel moved but no log float already named it, print the
 * delta — catches hazard Power tax, armor-only hits with odd logs, etc.
 */
export function appendMissingVitalsFloats(
  labels: ActionFloat[],
  vitals?: ActionFloatVitals,
): ActionFloat[] {
  if (!vitals) return labels;
  const extra: ActionFloat[] = [];
  if (
    vitals.hpDelta !== undefined &&
    vitals.hpDelta !== 0 &&
    !labelMentions(labels, /\bHP\b|BLEED/)
  ) {
    extra.push({
      label: `HP ${signedDelta(vitals.hpDelta)}`,
      color: vitals.hpDelta > 0 ? ThemeCss.safe : ThemeCss.rust,
    });
  }
  if (
    vitals.armorDelta !== undefined &&
    vitals.armorDelta !== 0 &&
    !labelMentions(labels, /\bSHIELD\b/)
  ) {
    extra.push({
      label: `SHIELD ${signedDelta(vitals.armorDelta)}`,
      color: ThemeCss.inkBright,
    });
  }
  if (
    vitals.energyDelta !== undefined &&
    vitals.energyDelta !== 0 &&
    !labelMentions(labels, /\bPOWER\b|BURN/)
  ) {
    extra.push({
      label: `POWER ${signedDelta(vitals.energyDelta)}`,
      color: vitals.energyDelta > 0 ? ThemeCss.tape : ThemeCss.arc,
    });
  }
  return extra.length ? [...labels, ...extra] : labels;
}

/**
 * Select short, causal labels for recent events. The log remains the complete
 * history; these are deliberately transient presentation cues.
 */
export function collectActionFloatLabels(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  vitals?: ActionFloatVitals,
): ActionFloat[] {
  const labels: ActionFloat[] = [];
  for (const log of logs) {
    let next: ActionFloat | null = null;
    switch (log.loreId) {
      case 'LOG-ARMOR-ABSORB':
        next = {
          label:
            vitals?.armorDelta !== undefined && vitals.armorDelta !== 0
              ? `SHIELD ${signedDelta(vitals.armorDelta)}`
              : `SHIELD ${log.detail ?? 'HIT'}`,
          color: ThemeCss.inkBright,
        };
        break;
      case 'LOG-DRAIN':
      case 'LOG-BEAM-FIRE':
        next = {
          label: log.detail
            ? `POWER ${shortCombatDetail(log.detail) ?? log.detail}`
            : vitals?.energyDelta !== undefined && vitals.energyDelta !== 0
              ? `POWER ${signedDelta(vitals.energyDelta)}`
              : 'POWER DRAIN',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-HAZARD':
      case 'LOG-SUMP':
      case 'LOG-CONTAMINATION':
      case 'LOG-ION-PULSE':
      case 'LOG-UPLINK-WAVE-HIT':
        next = {
          label:
            vitals?.energyDelta !== undefined && vitals.energyDelta !== 0
              ? `POWER ${signedDelta(vitals.energyDelta)}`
              : log.detail
                ? `POWER ${shortCombatDetail(log.detail) ?? log.detail}`
                : 'POWER DRAIN',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-ION-WAKE-FAULT':
        next = { label: 'FAULT WAKE', color: ThemeCss.rust };
        break;
      case 'LOG-ION-WAKE-VENT':
        next = { label: 'VENT SURGE', color: ThemeCss.arc };
        break;
      case 'LOG-ION-WAKE-ASH':
        next = { label: 'ASH SCOUR', color: ThemeCss.rust };
        break;
      case 'LOG-ION-WAKE-BRINE':
        next = { label: 'BRINE SWELL', color: ThemeCss.arc };
        break;
      case 'LOG-SHADOW-BITE':
        next = { label: 'SHADOW +1', color: ThemeCss.rust };
        break;
      case 'LOG-SHADOW-AMBUSH':
        next = { label: 'AMBUSH', color: ThemeCss.flag };
        break;
      case 'LOG-LIGHT-MATCH':
        next = {
          label: log.detail === 'SHADOW' ? 'DARK +1' : 'LIT +1',
          color: ThemeCss.flag,
        };
        break;
      case 'LOG-CHARGE-BREAK':
        next = { label: 'CHARGE BREAK', color: ThemeCss.tape };
        break;
      case 'LOG-CHARGE-WINDED':
        next = { label: 'WINDED · OPEN', color: ThemeCss.flag };
        break;
      case 'LOG-ENHANCED':
        next = { label: 'ENHANCED', color: ThemeCss.flag };
        break;
      case 'LOG-IMPAIRED':
        next = { label: 'IMPAIRED', color: ThemeCss.inkDim };
        break;
      case 'LOG-WINDUP-KILL':
        next = { label: 'BREAK · SALVAGE', color: ThemeCss.tape };
        break;
      case 'LOG-HURT':
        next = {
          label:
            vitals?.hpDelta !== undefined && vitals.hpDelta < 0
              ? `HP ${signedDelta(vitals.hpDelta)}`
              : shortCombatDetail(log.detail)
                ? `HP · ${shortCombatDetail(log.detail)}`
                : 'HP HIT',
          color: ThemeCss.rust,
        };
        break;
      case 'LOG-HIT':
        next = {
          label: shortCombatDetail(log.detail)
            ? `HIT · ${shortCombatDetail(log.detail)}`
            : 'HIT',
          color: ThemeCss.flag,
        };
        break;
      case 'LOG-STATUS-BLEED':
        next = {
          label:
            vitals?.hpDelta !== undefined && vitals.hpDelta < 0
              ? `BLEED · HP ${signedDelta(vitals.hpDelta)}`
              : 'BLEED',
          color: ThemeCss.rust,
        };
        break;
      case 'LOG-STATUS-ION':
        next = {
          label:
            vitals?.energyDelta !== undefined && vitals.energyDelta < 0
              ? `BURN · POWER ${signedDelta(vitals.energyDelta)}`
              : 'BURN · POWER',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-STATUS-BLIND':
        next = { label: 'BLIND', color: ThemeCss.inkDim };
        break;
      case 'LOG-STATUS-JAM':
        next = { label: 'JAMMED', color: ThemeCss.rust };
        break;
      case 'LOG-STATUS-MARKED':
        next = { label: 'MARKED', color: ThemeCss.tape };
        break;
      case 'LOG-USE-MED':
        next = {
          label:
            vitals?.hpDelta !== undefined && vitals.hpDelta > 0
              ? `HP ${signedDelta(vitals.hpDelta)}`
              : 'HYPO · HP',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-USE-ENERGY':
        next = {
          label:
            vitals?.energyDelta !== undefined && vitals.energyDelta > 0
              ? `POWER ${signedDelta(vitals.energyDelta)}`
              : 'POWER CELL',
          color: ThemeCss.tape,
        };
        break;
      case 'LOG-USE-PLATE':
        next = {
          label:
            vitals?.armorDelta !== undefined && vitals.armorDelta > 0
              ? `SHIELD ${signedDelta(vitals.armorDelta)}`
              : 'SHIELD CHARGE',
          color: ThemeCss.inkBright,
        };
        break;
      case 'LOG-USE-FLARE':
        next = {
          label: log.detail ? `FLARE · ${log.detail}` : 'FLARE · LIGHT',
          color: ThemeCss.tape,
        };
        break;
      case 'LOG-USE-FILTER':
        next = { label: 'FILTER ONLINE', color: ThemeCss.arc };
        break;
      case 'LOG-USE-DART':
        next = { label: 'DART · EXPOSE', color: ThemeCss.flag };
        break;
      case 'LOG-USE-PHASER':
        next = {
          label: log.detail
            ? `PHASER · ${log.detail}`
            : vitals?.energyDelta !== undefined && vitals.energyDelta < 0
              ? `PHASER · POWER ${signedDelta(vitals.energyDelta)}`
              : 'PHASER · BEAM',
          color: ThemeCss.arcWhite,
        };
        break;
      case 'LOG-USE-PHASER-EQUIP':
        next = { label: 'PHASER EQUIPPED', color: ThemeCss.arcWhite };
        break;
      case 'LOG-SALVAGE-ID':
        next = {
          label: log.detail ? `STOWED · ${log.detail}` : 'STOWED',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-SALVAGE-BAD':
        next = { label: 'SALVAGE BACKLASH', color: ThemeCss.rust };
        break;
      case 'LOG-AIM-CANCEL':
        next = { label: 'AIM CANCELLED', color: ThemeCss.inkDim };
        break;
      case 'LOG-TELE-REACH':
        next = { label: 'REACH INCOMING', color: ThemeCss.rust };
        break;
      case 'LOG-TELE-ZONE':
        next = { label: 'PULSE RING', color: ThemeCss.scanWash };
        break;
      case 'LOG-TELE-SWELL':
        next = { label: 'SWELL · BURST SOON', color: ThemeCss.arc };
        break;
      case 'LOG-ARMOR-RESEAT':
        next = {
          label:
            vitals?.armorDelta !== undefined && vitals.armorDelta > 0
              ? `SHIELD ${signedDelta(vitals.armorDelta)}`
              : 'SHIELD RESTORED',
          color: ThemeCss.inkBright,
        };
        break;
      case 'LOG-BUS-WARN':
        next = { label: 'POWER LOW', color: ThemeCss.tape };
        break;
      case 'LOG-BUS-FAILING':
        next = { label: 'POWER FAIL · LAST TURN', color: ThemeCss.rust };
        break;
      case 'LOG-HS-START':
      case 'LOG-HS-TICK':
        next = {
          label: log.detail ? `HANDSHAKE ${log.detail}` : 'HANDSHAKE',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-HS-INTERRUPT':
        next = { label: 'HANDSHAKE BROKEN', color: ThemeCss.rust };
        break;
      case 'LOG-UPLINK-START':
      case 'LOG-UPLINK-TICK':
      case 'LOG-UPLINK-HOLD':
        next = {
          label: log.detail ? `UPLINK ${log.detail}` : 'UPLINK',
          color: ThemeCss.arc,
        };
        break;
      case 'LOG-UPLINK-INTERRUPT':
        next = { label: 'UPLINK BROKEN', color: ThemeCss.rust };
        break;
      case 'LOG-EXTRACT':
        next = { label: 'EXTRACT LOCK', color: ThemeCss.safe };
        break;
      case 'LOG-HACK-OK':
        next = {
          label: log.detail ? `DUMP · ${log.detail}` : 'KIT DUMP',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-PICKUP':
        next = {
          label: log.detail ? `STOWED · ${log.detail}` : 'STOWED',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-TELE-POUNCE':
      case 'LOG-BOSS-TELE':
        next = { label: 'POUNCE INCOMING', color: ThemeCss.rust };
        break;
      case 'LOG-TELE-BEAM':
        next = { label: 'BEAM READY', color: ThemeCss.arcWhite };
        break;
      case 'LOG-TELE-OVERWATCH':
        next = { label: 'OVERWATCH', color: ThemeCss.tape };
        break;
      case 'LOG-PUNISH':
        next = { label: 'OPEN · CLEAN HIT', color: ThemeCss.flag };
        break;
      case 'LOG-SEALED-OPEN':
      case 'LOG-SEALED-PRY':
        next = { label: 'SEALED OPEN', color: ThemeCss.safe };
        break;
      case 'LOG-SEALED-CACHE':
        next = {
          label: log.detail ? `CACHE ${log.detail}` : 'CACHE OPEN',
          color: ThemeCss.safe,
        };
        break;
      case 'LOG-SEALED-BLOCK':
      case 'LOG-SEALED-NEED-TOOL':
        next = { label: 'SEALED · SEALANT OR BATON', color: ThemeCss.tape };
        break;
      case 'LOG-MOVE-BLOCKED':
        next = { label: 'BLOCKED', color: ThemeCss.inkDim };
        break;
      case 'LOG-EXIT-BLOCKED':
        next = { label: 'CANNOT OPEN', color: ThemeCss.tape };
        break;
      case 'LOG-INTERACT-MISS':
        next = { label: 'STAND ON HATCH', color: ThemeCss.inkDim };
        break;
      case 'LOG-USE-EMPTY':
        next = { label: 'KIT EMPTY', color: ThemeCss.inkDim };
        break;
      case 'LOG-USE-FAIL':
        next = { label: 'SELECT AN ITEM', color: ThemeCss.inkDim };
        break;
      case 'LOG-USE-NO-POWER':
        next = { label: 'NOT ENOUGH POWER', color: ThemeCss.tape };
        break;
      case 'LOG-JAM-BLOCK':
        next = { label: 'JAMMED · VISION', color: ThemeCss.rust };
        break;
      case 'LOG-EXIT-NEED-KEY':
      case 'LOG-NEED-KEY':
        next = { label: 'NEED SPLICE KEY', color: ThemeCss.tape };
        break;
      case 'LOG-EXIT-NEED-CORE':
      case 'LOG-NEED-CORE':
        next = { label: 'NEED NAV LATTICE', color: ThemeCss.flag };
        break;
      case 'LOG-EXIT-NEED-BEACON':
        next = { label: 'AUTHORIZE BEACON', color: ThemeCss.arc };
        break;
    }
    if (next) labels.push(next);
  }
  return appendMissingVitalsFloats(labels, vitals);
}

/** Pickup floats stay visible even when the turn log is noisy. */
const PICKUP_PIN_LORE = new Set<LoreId>(['LOG-PICKUP', 'LOG-SALVAGE-ID']);

function mergeCappedFloats(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  labels: ActionFloat[],
  flank?: ActionFloat | null,
): ActionFloat[] {
  const pinned = logs
    .filter((l) => PICKUP_PIN_LORE.has(l.loreId))
    .flatMap((log) => collectActionFloatLabels([log]));
  const pinnedLabels = new Set(pinned.map((p) => p.label));
  const rest = labels.filter((l) => !pinnedLabels.has(l.label));
  const reserve = pinned.length + (flank ? 1 : 0);
  const restCap = Math.max(0, ACTION_FLOAT_CAP - reserve);
  return [...rest.slice(-restCap), ...pinned, ...(flank ? [flank] : [])];
}

/** Cap floats so the newest consequences stay readable without stacking a wall. */
const ACTION_FLOAT_CAP = 3;

/** Cap at three floats — last events win so the newest consequence stays visible. */
export function actionFloatLabels(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  vitals?: ActionFloatVitals,
): ActionFloat[] {
  const all = collectActionFloatLabels(logs, vitals);
  if (all.length <= ACTION_FLOAT_CAP) return all;
  return mergeCappedFloats(logs, all);
}

/** Labels that deserve a world-anchored float — rail carries the rest. */
const WORLD_FLOAT_RES =
  /^(STOWED|HP [+-]|FLANK|SHADOW \+1|LIT \+1|DARK \+1|AMBUSH|CHARGE BREAK|WINDED|ENHANCED|OPEN · CLEAN HIT|CACHE OPEN|EXTRACT LOCK|SEALED OPEN|HANDSHAKE BROKEN|UPLINK BROKEN|PHASER ·|FAULT WAKE|VENT SURGE|ASH SCOUR|BRINE SWELL)|INCOMING|OVERWATCH|BEAM READY|PULSE RING|SWELL ·/;

/** Subset of causal floats to paint over the player — salient beats only. */
export function worldActionFloats(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  opts?: {
    vitals?: ActionFloatVitals;
    flankBefore?: number;
    flankAfter?: number;
  },
): ActionFloat[] {
  return causalActionFloats(logs, opts).filter((l) => WORLD_FLOAT_RES.test(l.label));
}

/** Log floats plus flank edge, still capped. */
export function causalActionFloats(
  logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
  opts?: {
    vitals?: ActionFloatVitals;
    flankBefore?: number;
    flankAfter?: number;
  },
): ActionFloat[] {
  const labels = collectActionFloatLabels(logs, opts?.vitals);
  const flank =
    opts?.flankBefore !== undefined && opts.flankAfter !== undefined
      ? flankEdgeFloat(opts.flankBefore, opts.flankAfter)
      : null;
  return mergeCappedFloats(logs, labels, flank);
}
