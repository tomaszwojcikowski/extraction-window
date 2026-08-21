import { EQUIP_TAGS, type ItemKind } from '../data/items';
import { lore, type LoreId } from '../data/lore';
import { EQUIP_SLOT_ORDER } from '../data/items';
import type { GameState } from './types';
import { wornTagSum } from './equipTags';

function withVal(id: LoreId, n: number): string {
  return `${lore(id)}${n}`;
}

function linesForKind(kind: ItemKind): string[] {
  const row = EQUIP_TAGS[kind as keyof typeof EQUIP_TAGS];
  if (!row) return [];
  const out: string[] = [];
  if ('flarePowerReduction' in row && row.flarePowerReduction)
    out.push(withVal('UI-TAG-FLARE-RED', row.flarePowerReduction));
  if ('shadowFlareMarkBonus' in row && row.shadowFlareMarkBonus)
    out.push(withVal('UI-TAG-FLARE-MARK', row.shadowFlareMarkBonus));
  if ('ionDamageReduction' in row && row.ionDamageReduction)
    out.push(withVal('UI-TAG-ION-RED', row.ionDamageReduction));
  if ('ventDrainExtra' in row && row.ventDrainExtra)
    out.push(withVal('UI-TAG-VENT-EXTRA', row.ventDrainExtra));
  if ('darkNoticeReduction' in row && row.darkNoticeReduction)
    out.push(withVal('UI-TAG-DARK-NOTICE', row.darkNoticeReduction));
  if ('litStatusPenalty' in row && row.litStatusPenalty)
    out.push(withVal('UI-TAG-LIT-PEN', row.litStatusPenalty));
  if ('salvageFailReduction' in row && row.salvageFailReduction)
    out.push(`${withVal('UI-TAG-SALVAGE', Math.round(row.salvageFailReduction * 100))}%`);
  if ('statusTurnReduction' in row && row.statusTurnReduction)
    out.push(withVal('UI-TAG-STATUS-RED', row.statusTurnReduction));
  if ('fovCap' in row && row.fovCap) out.push(withVal('UI-TAG-FOV-CAP', row.fovCap));
  if ('flareEmTax' in row && row.flareEmTax)
    out.push(withVal('UI-TAG-FLARE-EM', row.flareEmTax));
  if ('bleedDamage' in row && row.bleedDamage)
    out.push(withVal('UI-TAG-BLEED', row.bleedDamage));
  if ('onHitBleed' in row && row.onHitBleed)
    out.push(withVal('UI-TAG-ON-HIT-BLEED', row.onHitBleed));
  if ('onHitStun' in row && row.onHitStun)
    out.push(withVal('UI-TAG-ON-HIT-STUN', row.onHitStun));
  if ('hazardIonSkip' in row && row.hazardIonSkip) out.push(lore('UI-TAG-HAZ-SKIP'));
  if ('hazardDrainReduction' in row && row.hazardDrainReduction)
    out.push(withVal('UI-TAG-HAZ-DRAIN', row.hazardDrainReduction));
  return out;
}

export function equipTagLines(kind: ItemKind): string[] {
  return linesForKind(kind);
}

/** Net numeric tags across worn loadout for HUD chip. */
export function netLoadoutTagSummary(state: GameState): string[] {
  const parts: string[] = [];
  const flareRed = wornTagSum(state, 'flarePowerReduction');
  if (flareRed) parts.push(withVal('UI-TAG-FLARE-RED', flareRed));
  const ionRed = wornTagSum(state, 'ionDamageReduction');
  if (ionRed) parts.push(withVal('UI-TAG-ION-RED', ionRed));
  const ventExtra = wornTagSum(state, 'ventDrainExtra');
  if (ventExtra) parts.push(withVal('UI-TAG-VENT-EXTRA', ventExtra));
  const dark = wornTagSum(state, 'darkNoticeReduction');
  if (dark) parts.push(withVal('UI-TAG-DARK-NOTICE', dark));
  const litPen = wornTagSum(state, 'litStatusPenalty');
  if (litPen) parts.push(withVal('UI-TAG-LIT-PEN', litPen));
  const emTax = wornTagSum(state, 'flareEmTax');
  if (emTax) parts.push(withVal('UI-TAG-FLARE-EM', emTax));
  return parts;
}

export function hasWornLoadout(state: GameState): boolean {
  return EQUIP_SLOT_ORDER.some((s) => state.player.equip[s] !== null);
}
