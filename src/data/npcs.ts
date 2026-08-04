import type { LoreId } from './lore';

export type NpcKind = 'archive_holo' | 'stranded_ensign' | 'field_tech';
export type AllyKind = 'probe_drone' | 'away_escort';

export interface NpcDef {
  kind: NpcKind;
  loreName: LoreId;
  glyph: string;
  color: number;
  /** PADD page granted on first hail. */
  codex: LoreId;
}

export interface AllyDef {
  kind: AllyKind;
  loreName: LoreId;
  glyph: string;
  color: number;
  hp: number;
  atk: number;
  def: number;
  /** Lifetime in ally ticks. */
  turns: number;
  aggro: number;
}

export const NPCS: Record<NpcKind, NpcDef> = {
  archive_holo: {
    kind: 'archive_holo',
    loreName: 'NPC-HOLO',
    glyph: 'H',
    color: 0x66ccee,
    codex: 'CODEX-HOLO',
  },
  stranded_ensign: {
    kind: 'stranded_ensign',
    loreName: 'NPC-ENSIGN',
    glyph: 'E',
    color: 0xd4a574,
    codex: 'CODEX-ENSIGN',
  },
  field_tech: {
    kind: 'field_tech',
    loreName: 'NPC-TECH',
    glyph: 'T',
    color: 0x88aa77,
    codex: 'CODEX-TECH',
  },
};

export const ALLIES: Record<AllyKind, AllyDef> = {
  probe_drone: {
    kind: 'probe_drone',
    loreName: 'ALLY-DRONE',
    glyph: 'd',
    color: 0x99bbff,
    hp: 8,
    atk: 3,
    def: 1,
    turns: 20,
    aggro: 6,
  },
  away_escort: {
    kind: 'away_escort',
    loreName: 'ALLY-ESCORT',
    glyph: 'e',
    color: 0xe8c090,
    hp: 12,
    atk: 4,
    def: 1,
    turns: 22,
    aggro: 6,
  },
};

/** Pick contact kind by sector depth. */
export function npcKindForSector(index: number): NpcKind {
  if (index <= 4) return 'archive_holo';
  if (index <= 9) return 'stranded_ensign';
  return 'field_tech';
}
