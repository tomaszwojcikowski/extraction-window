import type { ItemKind } from '../../data/items';

/** Ground stamp family — presentation only; sim kinds map into a few silhouettes. */
export type LootStamp =
  | 'crate'
  | 'key'
  | 'core'
  | 'med'
  | 'energy'
  | 'flare'
  | 'tool'
  | 'wear';

export function lootStampFor(kind: ItemKind): LootStamp {
  switch (kind) {
    case 'relay_key':
      return 'key';
    case 'nav_core':
      return 'core';
    case 'med':
      return 'med';
    case 'energy':
      return 'energy';
    case 'flare':
      return 'flare';
    case 'dart':
    case 'blade':
    case 'pulse_baton':
    case 'phaser':
    case 'probe':
    case 'stim':
    case 'filter':
    case 'sealant':
    case 'mapper':
      return 'tool';
    case 'plate':
    case 'harness':
    case 'ablative_vest':
    case 'field_comm':
    case 'scan_band':
    case 'survey_visor':
    case 'grip_gloves':
    case 'mag_boots':
    case 'flare_prism':
    case 'ward_weave':
    case 'shadow_lens':
      return 'wear';
    default:
      return 'crate';
  }
}

export function itemTextureKey(kind: ItemKind): string {
  const stamp = lootStampFor(kind);
  if (stamp === 'key') return 't_key';
  if (stamp === 'core') return 't_nav_core';
  if (stamp === 'crate') return 't_item';
  return `t_item_${stamp}`;
}
