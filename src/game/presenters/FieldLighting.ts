import Phaser from 'phaser';
import { TILE_DRAW } from '../../scenes/textures';
import { Theme, crackTextureKey } from '../../scenes/theme';
import { tileBrightness } from '../../sim/light';
import type { GameState } from '../../sim/types';
import { computeShearPressure, type ShearPressureSpec } from './ShearPressure';
import { pressureRevealAt } from './PressureReveal';
import { drawThreatZones } from '../views/ThreatView';
import { drawWakeTells } from './WakeTells';
import { drawPhaserLanes } from './PhaserLanes';
import type { LightView } from '../views/LightView';

export type ShadowCaster = {
  gx: number;
  gy: number;
  item?: boolean;
  body?: boolean;
};

export type FieldLightingHost = {
  lightView: LightView;
  tileSprites: Phaser.GameObjects.Image[][];
  tileKey(kind: string, x: number, y: number): string;
  animFrame: number;
  threatGfx: Phaser.GameObjects.Graphics;
  fieldMotes: Phaser.GameObjects.Graphics;
  firstLight: number | null;
  crackSprites: Map<string, Phaser.GameObjects.Image>;
  mapLayer: Phaser.GameObjects.Container;
  addCrackSprite(x: number, y: number, texture: string): Phaser.GameObjects.Image;
  shadowCasters(): Iterable<ShadowCaster>;
  applyAllActorLighting(sources: ReturnType<LightView['allSources']>): void;
  syncSconceOverlays(): void;
  bodyLightAt(): {
    enemy: (id: number) => { x: number; y: number } | null;
    ally: (id: number) => { x: number; y: number } | null;
  };
  refreshMoveLightFx(): void;
};

/** Biome-native field motes — ecology in the air, rebuilt each tick inside FOV. */
export function drawFieldMotes(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  animFrame: number,
  shear?: ShearPressureSpec,
): void {
  g.clear();
  let count = 0;
  const climax = shear?.state === 'Breaching';
  const arcing = shear?.state === 'Arcing';
  const maxMotes = climax ? 78 : arcing ? 62 : 52;
  const sector = st.sectorId;

  for (let y = 0; y < st.height && count < maxMotes; y++) {
    for (let x = 0; x < st.width && count < maxMotes; x++) {
      if (!st.visible[y]?.[x] || tileBrightness(st, x, y) < 0.22) continue;
      const hash = (x * 73856093) ^ (y * 19349663) ^ (st.seed * 83492791);
      const densBase =
        sector === 'ash' || sector === 'duct' || sector === 'brine' || sector === 'flood'
          ? 5
          : sector === 'canopy' || sector === 'reef'
            ? 6
            : 8;
      const dens = climax ? Math.max(3, densBase - 2) : arcing ? Math.max(4, densBase - 1) : densBase;
      if (Math.abs(hash) % dens !== animFrame % Math.min(4, dens)) continue;

      const ox = 4 + (Math.abs(hash >> 7) % Math.max(1, TILE_DRAW - 8));
      let oy = 4 + ((Math.abs(hash >> 13) + animFrame) % Math.max(1, TILE_DRAW - 8));
      const px = x * TILE_DRAW + ox;
      const py = y * TILE_DRAW + oy;

      if (sector === 'ash' || sector === 'approach') {
        oy = (oy + animFrame * 2) % Math.max(1, TILE_DRAW - 6);
        g.fillStyle(Theme.arc, 0.35);
        g.fillRect(px, y * TILE_DRAW + oy, 1, 2);
      } else if (sector === 'brine' || sector === 'flood' || sector === 'reef') {
        g.fillStyle(Theme.biolum, 0.4);
        g.fillRect(px, py, 2, 1);
        if ((hash & 3) === 0) {
          g.fillStyle(Theme.biolumDeep, 0.35);
          g.fillRect(px + 1, py + 2, 1, 1);
        }
      } else if (sector === 'duct' || sector === 'spire' || sector === 'vault') {
        oy = (TILE_DRAW - 6 - ((oy + animFrame) % Math.max(1, TILE_DRAW - 6))) | 0;
        g.fillStyle(Theme.inkDim, 0.32);
        g.fillRect(px, y * TILE_DRAW + oy, 1, 3);
      } else if (sector === 'canopy') {
        g.fillStyle(Theme.safe, 0.38);
        g.fillRect(px, py, 2, 1);
        g.fillRect(px + 1, py + 1, 1, 1);
      } else {
        const ion = (Math.abs(hash >> 4) + animFrame) % 6 === 0;
        g.fillStyle(ion ? Theme.biolum : Theme.inkBright, ion ? 0.45 : 0.26);
        g.fillRect(px, py, ion ? 2 : 1, ion ? 2 : 1);
      }
      if (climax && (hash & 7) === 0) {
        g.fillStyle(Theme.arcWhite, 0.32);
        g.fillRect(px + 1, py - 1, 1, 1);
      }
      count += 1;
    }
  }
}

export function syncPressureCracks(
  host: FieldLightingHost,
  st: GameState,
  shear: ReturnType<typeof computeShearPressure>,
): void {
  const live = new Set<string>();
  for (let y = 0; y < st.height; y++) {
    for (let x = 0; x < st.width; x++) {
      const reveal = pressureRevealAt(st, shear, x, y, host.animFrame);
      if (!reveal) continue;
      const id = `${x},${y}`;
      live.add(id);
      let spr = host.crackSprites.get(id);
      if (!spr) {
        spr = host.addCrackSprite(
          x,
          y,
          crackTextureKey(reveal.sectorId, reveal.variant, reveal.urgent),
        );
        host.crackSprites.set(id, spr);
      } else {
        spr.setTexture(crackTextureKey(reveal.sectorId, reveal.variant, reveal.urgent));
      }
      spr.setVisible(reveal.visible);
      spr.setAlpha(reveal.alpha);
      if (reveal.urgent) {
        const pulse = 1 + 0.05 * Math.sin((host.animFrame + x + y) * 0.9);
        spr.setDisplaySize(TILE_DRAW * pulse, TILE_DRAW * pulse);
      } else {
        spr.setDisplaySize(TILE_DRAW, TILE_DRAW);
      }
    }
  }
  for (const [id, spr] of host.crackSprites) {
    if (!live.has(id)) {
      spr.destroy();
      host.crackSprites.delete(id);
    }
  }
}

/** Full field lighting pass — tile wash, motes, overlays, threat/wake/phaser lanes. */
export function applyFieldLightingPass(host: FieldLightingHost, st: GameState): void {
  const shear = computeShearPressure(st);
  host.lightView.syncTurn(st.turn);
  const sources = host.lightView.allSources(st, host.animFrame, host.bodyLightAt());

  if (host.lightView.hasMoveBlend()) {
    host.refreshMoveLightFx();
    return;
  }

  const pending = host.lightView.hasPendingMoveBlend();
  host.lightView.applyTileLighting(
    st,
    host.tileSprites,
    (kind, x, y) => host.tileKey(kind, x, y),
    sources,
    { paintSprites: !pending },
  );
  if (pending) return;

  drawFieldMotes(host.fieldMotes, st, host.animFrame, shear);
  host.lightView.drawBloom(sources, st.visible, st.tiles, st.sectorId);
  host.lightView.drawDynamicShadows(st, host.shadowCasters(), sources, host.firstLight);
  host.applyAllActorLighting(sources);

  drawThreatZones(host.threatGfx, st, host.animFrame);
  drawWakeTells(host.threatGfx, st, st.player.x, st.player.y, host.animFrame, TILE_DRAW);
  drawPhaserLanes(host.threatGfx, st, host.animFrame, TILE_DRAW);

  for (let y = 0; y < st.height; y++) {
    for (let x = 0; x < st.width; x++) {
      const tile = host.tileSprites[y]?.[x];
      if (!tile) continue;
      const patch = st.contamination.some((c) => c.x === x && c.y === y);
      if (patch && st.visible[y]?.[x]) {
        tile.setTint(Theme.biolum);
      } else {
        const tint = host.lightView.tileTintAt(x, y);
        if (tint !== undefined) tile.setTint(tint);
        else tile.clearTint();
      }
    }
  }
  host.syncSconceOverlays();
  syncPressureCracks(host, st, shear);
  if (host.firstLight !== null) {
    host.lightView.applySweep(st, host.tileSprites, host.firstLight);
  }
}
