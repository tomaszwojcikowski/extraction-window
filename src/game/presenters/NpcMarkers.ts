import { ThemeCss } from '../../scenes/theme';
import type { FieldNpc } from '../../sim/types';

export type NpcQuestMark = '?' | '!';

/**
 * Overhead quest ping for field contacts.
 * `?` while they still have a hail or open agenda; `!` after the job is done.
 */
export function npcQuestMarker(npc: FieldNpc): NpcQuestMark {
  if (npc.agendaDone || (npc.talked && !npc.agendaOpen)) return '!';
  return '?';
}

export function npcQuestMarkerColor(mark: NpcQuestMark): string {
  return mark === '?' ? ThemeCss.tape : ThemeCss.safe;
}
