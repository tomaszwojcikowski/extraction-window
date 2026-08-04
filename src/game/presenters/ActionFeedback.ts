import type { LoreId } from '../../data/lore';
import type { LightView } from '../views/LightView';
import { Theme } from '../../scenes/theme';

/**
 * Emit ephemeral field lights from combat / kit / handshake lore events.
 * Presentation-only — called from GameScene after applyAction.
 */
export function emitActionLights(
  lights: LightView,
  opts: {
    newLogs: LoreId[];
    player: { x: number; y: number };
    hitTiles: { x: number; y: number }[];
    sporeTiles: { x: number; y: number }[];
    beaconPos?: { x: number; y: number } | null;
  },
): void {
  const { newLogs, player, hitTiles, sporeTiles, beaconPos } = opts;
  const has = (id: LoreId) => newLogs.includes(id);

  if (has('LOG-USE-FLARE')) {
    // Presentation bloom — sim already owns the lasting lightSource
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 5.5,
      color: 0xccffff,
      intensity: 1.35,
      life: 4,
    });
  }

  if (has('LOG-SPORE-BURST')) {
    for (const t of sporeTiles) {
      lights.addFxLight({
        x: t.x,
        y: t.y,
        radius: 3,
        color: 0x66ffaa,
        intensity: 0.8,
        life: 3,
      });
    }
    if (sporeTiles.length === 0) {
      lights.addFxLight({
        x: player.x,
        y: player.y,
        radius: 3,
        color: 0x66ffaa,
        intensity: 0.75,
        life: 3,
      });
    }
  }

  if (has('LOG-HIT') || has('LOG-KILL') || has('LOG-ALLY-HIT') || has('LOG-ALLY-KILL')) {
    for (const t of hitTiles) {
      lights.addFxLight({
        x: t.x,
        y: t.y,
        radius: 2,
        color: 0xffffff,
        intensity: 0.9,
        life: 1,
      });
    }
  }

  if (has('LOG-SURVEY-ROOM') || has('LOG-SURVEY-SECTOR')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 4,
      color: Theme.storm,
      intensity: 0.75,
      life: 2,
    });
  }

  if (has('LOG-NPC-HAIL') || has('LOG-ALLY-UP') || has('LOG-NPC-SIGHT')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 3.5,
      color: 0xa8d0ff,
      intensity: 0.7,
      life: 2,
    });
  }

  if (has('LOG-USE-PROBE') || has('LOG-USE-LENS')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 6,
      color: 0xa8d0ff,
      intensity: 0.7,
      life: 2,
    });
  }

  if (has('LOG-HS-START') || has('LOG-HS-TICK')) {
    lights.addFxLight({
      x: beaconPos?.x ?? player.x,
      y: beaconPos?.y ?? player.y,
      radius: 4.5,
      color: Theme.storm,
      intensity: 0.85,
      life: 2,
    });
  }

  if (has('LOG-PB-DESYNC')) {
    lights.addFxLight({
      x: player.x,
      y: player.y,
      radius: 2.5,
      color: 0xcc88ff,
      intensity: 0.65,
      life: 3,
    });
  }
}
