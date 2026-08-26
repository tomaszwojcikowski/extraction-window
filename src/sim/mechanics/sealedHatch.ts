import type { LoreId } from '../../data/lore';
import { hasItem, addItem } from '../inventory';
import { pushLog } from '../log';
import { gainXp } from '../progression';
import { XP_SEALED } from '../../data/progression';
import type { Action, GameState, Pos, Tile } from '../types';
import type { Mechanic } from './types';
import type { ItemKind } from '../../data/items';
import { pickWearableLoot } from '../../data/wearableLoot';
import { lore } from '../../data/lore';
import { ITEMS } from '../../data/items';

const FLOOR: Tile = { kind: 'floor', walkable: true, transparent: true };

const MID_KIT: ItemKind[] = ['energy', 'med', 'sealant', 'flare', 'plate'];

function adjacentSealed(state: GameState): Pos | null {
  const dirs: Pos[] = [
    { x: state.player.x + 1, y: state.player.y },
    { x: state.player.x - 1, y: state.player.y },
    { x: state.player.x, y: state.player.y + 1 },
    { x: state.player.x, y: state.player.y - 1 },
  ];
  for (const p of dirs) {
    if (p.x < 0 || p.y < 0 || p.x >= state.width || p.y >= state.height) continue;
    if (state.tiles[p.y]![p.x]!.kind === 'sealed') return p;
  }
  return null;
}

/** True when a sealed hatch is within one cardinal step. */
export function isAdjacentSealed(state: GameState): boolean {
  return adjacentSealed(state) !== null;
}

function sealedCacheDrop(state: GameState, x: number, y: number): void {
  // Always pay mid kit so sealant/baton spend is never empty.
  let kind: ItemKind = MID_KIT[Math.floor(state.rng() * MID_KIT.length)]!;
  if (state.sectorIndex >= 4 && state.rng() < 0.28) {
    const roll = state.rng();
    if (state.sectorIndex >= 10 && roll > 0.72) {
      kind = pickWearableLoot(state.sectorId, state.rng);
    } else {
      kind = roll < 0.55 ? 'field_comm' : roll < 0.85 ? 'scan_band' : 'survey_visor';
    }
  }
  if (addItem(state, kind)) {
    pushLog(state, 'LOG-SEALED-CACHE', lore(ITEMS[kind].loreName));
  } else {
    state.items.push({ id: state.nextEntityId++, kind, x, y });
    pushLog(state, 'LOG-SEALED-CACHE', lore(ITEMS[kind].loreName));
  }
  gainXp(state, XP_SEALED, 'quest');
}

/** Open a sealed hatch tile to floor. */
export function openSealedTile(state: GameState, x: number, y: number, how: 'sealant' | 'pry'): void {
  state.tiles[y]![x] = { ...FLOOR };
  pushLog(state, how === 'sealant' ? 'LOG-SEALED-OPEN' : 'LOG-SEALED-PRY');
  sealedCacheDrop(state, x, y);
}

/** Sealant foam on an adjacent sealed hatch (inventory use path). */
export function tryOpenAdjacentSealed(state: GameState): boolean {
  const p = adjacentSealed(state);
  if (!p) return false;
  openSealedTile(state, p.x, p.y, 'sealant');
  return true;
}

/**
 * Pulse baton pry: stand adjacent and press `>` with baton equipped.
 */
export function tryPrySealed(state: GameState): boolean {
  if (state.player.equip.tool !== 'pulse_baton') return false;
  const p = adjacentSealed(state);
  if (!p) return false;
  openSealedTile(state, p.x, p.y, 'pry');
  return true;
}

export const sealedHatchMechanic: Mechanic = {
  id: 'sealed_hatch',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    return tryPrySealed(state);
  },

  contextHint(state: GameState): LoreId | null {
    if (!adjacentSealed(state)) return null;
    if (state.player.equip.tool === 'pulse_baton') return 'UI-HINT-PRY-SEALED';
    if (hasItem(state, 'sealant')) return 'UI-HINT-SEALED-SEALANT';
    return 'UI-HINT-SEALED';
  },
};
