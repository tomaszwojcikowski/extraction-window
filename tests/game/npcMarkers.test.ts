import { describe, expect, it } from 'vitest';
import { ThemeCss } from '../../src/scenes/theme';
import { npcQuestMarker, npcQuestMarkerColor } from '../../src/game/presenters/NpcMarkers';
import type { FieldNpc } from '../../src/sim/types';

function npc(overrides: Partial<FieldNpc> = {}): FieldNpc {
  return {
    id: 1,
    kind: 'stranded_ensign',
    x: 4,
    y: 4,
    talked: false,
    ...overrides,
  };
}

describe('npcQuestMarker', () => {
  it('shows ? while the contact is unhailed or the agenda is still open', () => {
    expect(npcQuestMarker(npc())).toBe('?');
    expect(
      npcQuestMarker(npc({ talked: true, agendaOpen: true, agendaDone: false })),
    ).toBe('?');
  });

  it('shows ! after the agenda is done or a one-shot hail has finished', () => {
    expect(
      npcQuestMarker(npc({ talked: true, agendaOpen: true, agendaDone: true })),
    ).toBe('!');
    expect(npcQuestMarker(npc({ talked: true }))).toBe('!');
  });

  it('shows ? while an accept/decline offer is open for that contact', () => {
    expect(npcQuestMarker(npc({ talked: false }), 1)).toBe('?');
  });

  it('paints active pings tape-yellow and completed pings safe', () => {
    expect(npcQuestMarkerColor('?')).toBe(ThemeCss.tape);
    expect(npcQuestMarkerColor('!')).toBe(ThemeCss.safe);
  });
});
