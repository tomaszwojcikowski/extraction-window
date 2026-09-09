import { describe, expect, it } from 'vitest';
import { ALLIES, NPCS, type AllyKind, type NpcKind } from '../../src/data/npcs';
import { createContact, poseContact } from '../../src/v2/contactMesh';

describe('v2 contact rigs', () => {
  it('builds a bob group for every NPC and ally kind', () => {
    const kinds = [...(Object.keys(NPCS) as NpcKind[]), ...(Object.keys(ALLIES) as AllyKind[])];
    expect(kinds.length).toBe(6);
    for (const kind of kinds) {
      const rig = createContact(kind);
      expect(rig.getObjectByName('bob'), kind).toBeTruthy();
      expect(rig.userData.contactKind).toBe(kind);
    }
  });

  it('hovers the archive holo and probe drone', () => {
    expect(createContact('archive_holo').userData.hover).toBe(true);
    expect(createContact('probe_drone').userData.hover).toBe(true);
    expect(createContact('stranded_ensign').userData.hover).toBe(false);
  });

  it('swings opposite hips on a crew stride', () => {
    const rig = createContact('field_tech');
    poseContact(rig, 0, 0.5, 1);
    const hipL = rig.getObjectByName('hipL')!.rotation.x;
    const hipR = rig.getObjectByName('hipR')!.rotation.x;
    expect(hipL).toBeGreaterThan(0.3);
    expect(hipR).toBe(-hipL);
    expect(rig.getObjectByName('tool')).toBeTruthy();
  });
});
