import { describe, expect, it } from 'vitest';
import { createGame, refreshVision } from '../../src/sim';
import { LIGHT_TEMP } from '../../src/sim/light';
import {
  localLightPoses,
  MAX_POINT_LIGHTS,
  MAX_SCONCE_SPOTS,
  PLAYER_LAMP_INTENSITY,
  sconceWorldPose,
} from '../../src/v2/fieldSources';
import { createSconce } from '../../src/v2/sconceMesh';

describe('v2 wall sconce mesh', () => {
  it('builds a bulb on the corridor face', () => {
    const rig = createSconce(LIGHT_TEMP.sconce);
    expect(rig.getObjectByName('bulb')).toBeTruthy();
    expect(rig.getObjectByName('plate')).toBeTruthy();
    expect(rig.getObjectByName('hood')).toBeTruthy();
  });
});

describe('v2 local light poses', () => {
  it('aims a sconce spot from the wall face into the corridor, not through it', () => {
    const pose = sconceWorldPose({
      x: 6,
      y: 5,
      mountX: 5,
      mountY: 5,
      radius: 2.5,
      intensity: 0.55,
      fixture: 'sconce',
      color: LIGHT_TEMP.sconce,
    });
    expect(pose.x).toBeGreaterThan(5.5);
    expect(pose.x).toBeLessThan(6.5);
    expect(pose.tx).toBe(6.5);
    expect(pose.tz).toBe(5.5);
    expect(pose.rotY).toBeCloseTo(Math.PI / 2);
  });

  it('keeps the surveyor lamp first and caps world spots', () => {
    const state = createGame(42, { skipTutorial: true });
    const sconce = state.lightSources.find((s) => s.fixture === 'sconce');
    expect(sconce).toBeTruthy();
    const mx = sconce!.mountX ?? sconce!.x;
    const my = sconce!.mountY ?? sconce!.y;
    state.explored[my]![mx] = true;
    state.visible[my]![mx] = true;
    state.explored[sconce!.y]![sconce!.x] = true;
    state.visible[sconce!.y]![sconce!.x] = true;
    const poses = localLightPoses(state, sconce!.x + 0.5, sconce!.y + 0.5);
    expect(poses.points[0]?.color).toBe(LIGHT_TEMP.lamp);
    expect(poses.points[0]?.intensity).toBe(PLAYER_LAMP_INTENSITY);
    expect(PLAYER_LAMP_INTENSITY).toBeGreaterThanOrEqual(8);
    expect(poses.points.length).toBeLessThanOrEqual(MAX_POINT_LIGHTS);
    expect(poses.spots.length).toBeGreaterThan(0);
    expect(poses.spots.length).toBeLessThanOrEqual(MAX_SCONCE_SPOTS);
  });

  it('still lights a hatch the surveyor is standing on', () => {
    const state = createGame(42, { skipTutorial: true });
    let hatch: { x: number; y: number } | null = null;
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.tiles[y]![x]!.kind === 'exit') {
          hatch = { x, y };
          break;
        }
      }
      if (hatch) break;
    }
    expect(hatch).toBeTruthy();
    state.player.x = hatch!.x;
    state.player.y = hatch!.y;
    refreshVision(state);
    const poses = localLightPoses(state, hatch!.x + 0.5, hatch!.y + 0.5);
    expect(poses.points[0]?.color).toBe(LIGHT_TEMP.lamp);
    expect(poses.points.some((p) => p.color === LIGHT_TEMP.standby)).toBe(true);
  });
});
