import Phaser from 'phaser';
import { enemyThreatTiles, flankBoxTiles, incomingFlankSeats } from '../../sim/ai';
import { Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import type { Enemy, GameState } from '../../sim/types';

/**
 * Ground marking for armed telegraphs and pack seats.
 *
 * A windup used to be readable only as a text marker over the sprite, which
 * told the player something was coming but not where it would land. Painting
 * the threatened tiles turns the telegraph into the spatial question it is:
 * stand here and you are hit, step there and you are not.
 *
 * Flank seats use the same honesty: incoming empty tiles are where a second
 * hunter will touch you; boxed tiles are the peel already paying out.
 * Windup hatch lives as long as the windup; flank marks live as long as the
 * surround.
 */

type ThreatStyle = { color: number; alpha: number };

const STYLES: Record<NonNullable<Enemy['intent']>, ThreatStyle> = {
  // Melee charges read as impact; the standoff pulse and held shots read as
  // machine hazard so leave-the-tile reads apart from soak-the-hit.
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
 * Paint threatened ground for every visible enemy holding a windup,
 * plus the contact seats a pack is actually taking.
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

  drawFlankGround(g, st, pulse, tileDraw);

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

function strokeTile(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  tileDraw: number,
  color: number,
  alpha: number,
  width: number,
): void {
  const left = x * tileDraw;
  const top = y * tileDraw;
  g.lineStyle(width, color, alpha);
  g.strokeRect(left + 2, top + 2, tileDraw - 4, tileDraw - 4);
}

/**
 * Incoming seats are the surround question (step to a doorway before they
 * touch both sides). Boxed tiles are the peel that is already paying out.
 * Windup hatch draws on top and wins any overlap.
 */
function drawFlankGround(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  pulse: number,
  tileDraw: number,
): void {
  const incoming = incomingFlankSeats(st);
  const boxed = flankBoxTiles(st);

  for (const t of incoming) {
    const left = t.x * tileDraw;
    const top = t.y * tileDraw;
    g.fillStyle(Theme.rust, 0.12 * pulse);
    g.fillRect(left + 1, top + 1, tileDraw - 2, tileDraw - 2);
    hatchTile(g, left + 1, top + 1, tileDraw - 2, Theme.rust, 0.2 * pulse);
    strokeTile(g, t.x, t.y, tileDraw, Theme.rust, 0.7 * pulse, 1);
  }

  for (const t of boxed) {
    if (!(st.visible[t.y]?.[t.x] ?? false)) continue;
    strokeTile(g, t.x, t.y, tileDraw, Theme.rust, 0.9 * pulse, 2);
  }

  if (boxed.length > 0) {
    strokeTile(g, st.player.x, st.player.y, tileDraw, Theme.rust, 0.95 * pulse, 2);
  }
}
