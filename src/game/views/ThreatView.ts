import Phaser from 'phaser';
import { enemyThreatTiles } from '../../sim/ai';
import { Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import type { Enemy, GameState } from '../../sim/types';

/**
 * Ground marking for armed telegraphs.
 *
 * A windup used to be readable only as a text marker over the sprite, which
 * told the player something was coming but not where it would land. Painting
 * the threatened tiles turns the telegraph into the spatial question it is:
 * stand here and you are hit, step there and you are not.
 *
 * The marking lives exactly as long as the windup, so it never outlives the
 * turn it explains.
 */

type ThreatStyle = { color: number; alpha: number };

const STYLES: Record<NonNullable<Enemy['intent']>, ThreatStyle> = {
  // Melee charges read as impact; the standoff pulse and held shots read as
  // machine hazard so the player can tell "brace" apart from "leave".
  pounce: { color: Theme.rust, alpha: 0.3 },
  reach: { color: Theme.rust, alpha: 0.3 },
  zone: { color: Theme.scanWash, alpha: 0.26 },
  beam: { color: Theme.arcWhite, alpha: 0.32 },
  overwatch: { color: Theme.tape, alpha: 0.3 },
};

/** Diagonal hazard hatching, clipped to the tile. */
function hatchTile(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  size: number,
  color: number,
  alpha: number,
): void {
  const spacing = Math.max(4, Math.round(size / 5));
  g.lineStyle(1, color, alpha);
  for (let offset = -size; offset < size; offset += spacing) {
    const x0 = left + Math.max(0, offset);
    const y0 = top + Math.max(0, -offset);
    const x1 = left + Math.min(size, offset + size);
    const y1 = top + Math.min(size, size - offset);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokePath();
  }
}

/**
 * Paint threatened ground for every visible enemy holding a windup.
 * `pulse` (0..1) drives a slow breathe so the marking reads as live pressure.
 */
export function drawThreatZones(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  animFrame: number,
  tileDraw = TILE_DRAW,
): void {
  g.clear();
  const pulse = 0.72 + (animFrame % 4) * 0.09;

  for (const en of st.enemies) {
    if (!en.alive || en.windup <= 0 || !en.intent) continue;
    // Only telegraph threats the player can actually see coming.
    if (!(st.visible[en.y]?.[en.x] ?? false)) continue;

    const style = STYLES[en.intent];
    const tiles = enemyThreatTiles(st, en);

    for (const t of tiles) {
      if (!(st.visible[t.y]?.[t.x] ?? false)) continue;
      const left = t.x * tileDraw;
      const top = t.y * tileDraw;
      const standingHere = st.player.x === t.x && st.player.y === t.y;

      g.fillStyle(style.color, style.alpha * pulse * (standingHere ? 1.5 : 1));
      g.fillRect(left + 1, top + 1, tileDraw - 2, tileDraw - 2);
      hatchTile(g, left + 1, top + 1, tileDraw - 2, style.color, 0.28 * pulse);

      // The tile under your feet gets a hard edge — you are in the blast.
      if (standingHere) {
        g.lineStyle(2, style.color, 0.95 * pulse);
        g.strokeRect(left + 2, top + 2, tileDraw - 4, tileDraw - 4);
      }
    }
  }
}
