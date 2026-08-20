import { ThemeCss } from '../../scenes/theme';
import type { FieldNpc } from '../../sim/types';

export type NpcQuestMark = '?' | '!';

/**
 * Overhead quest ping for field contacts.
 * `?` while they still have a hail, open offer, or open agenda; `!` after done/declined.
 */
export function npcQuestMarker(npc: FieldNpc, offerNpcId?: number | null): NpcQuestMark {
  if (offerNpcId !== undefined && offerNpcId !== null && npc.id === offerNpcId) return '?';
  if (npc.agendaDone || (npc.talked && !npc.agendaOpen)) return '!';
  return '?';
}

export function npcQuestMarkerColor(mark: NpcQuestMark): string {
  return mark === '?' ? ThemeCss.tape : ThemeCss.safe;
}
