import Phaser from 'phaser';
import { enemyThreatTiles, flankBoxTiles, incomingFlankSeats } from '../../sim/ai';
import { Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import type { Enemy, GameState } from '../../sim/types';
import { beamLaneHot, tileHatchPulse, windupThreatPulse } from '../presenters/threatPulse';

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

/** BEAM intent tiles are a strict cardinal lane — use a straight streak. */
function drawBeamLane(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  size: number,
  color: number,
  alpha: number,
  vertical: boolean,
  endCap: boolean,
): void {
  g.fillStyle(color, alpha);
  const mid = size / 2;
  // Center spine.
  if (vertical) {
    g.fillRect(left + mid - 1, top + 4, 2, size - 8);
  } else {
    g.fillRect(left + 4, top + mid - 1, size - 8, 2);
  }

  // End-cap on the furthest tile so the player reads "lane distance".
  if (endCap) {
    g.fillRect(mid - 3 + left, mid - 3 + top, 6, 6);
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

  drawFlankGround(g, st, animFrame, tileDraw);

  for (const en of st.enemies) {
    if (!en.alive || en.windup <= 0 || !en.intent) continue;
    // Only telegraph threats the player can actually see coming.
    if (!(st.visible[en.y]?.[en.x] ?? false)) continue;

    const style = STYLES[en.intent];
    const tiles = enemyThreatTiles(st, en);
    const isBeam = en.intent === 'beam';
    const pulse = windupThreatPulse(animFrame, en.windup);

    // `enemyThreatTiles()` for BEAM is a strict axis-aligned lane, so we can
    // draw straight markings based on the enemy→player axis.
    const beamDx = Math.sign(st.player.x - en.x);
    const beamDy = Math.sign(st.player.y - en.y);
    const beamVertical = beamDy !== 0; // dx==0 for cardinal lanes; dy encodes axis.
    void beamDx;

    let maxBeamStep = 0;
    if (isBeam) {
      for (const t of tiles) {
        const d = Math.abs(t.x - en.x) + Math.abs(t.y - en.y);
        if (d > maxBeamStep) maxBeamStep = d;
      }
    }

    for (const t of tiles) {
      if (!(st.visible[t.y]?.[t.x] ?? false)) continue;
      const left = t.x * tileDraw;
      const top = t.y * tileDraw;
      const standingHere = st.player.x === t.x && st.player.y === t.y;
      const local = tileHatchPulse(animFrame, t.x, t.y);

      if (isBeam) {
        // BEAM tiles: no diagonal crosshatch. A lane streak reads directionally.
        const step = Math.abs(t.x - en.x) + Math.abs(t.y - en.y);
        const endCap = step === maxBeamStep;
        const hot = beamLaneHot(animFrame, step, maxBeamStep) || standingHere;
        const baseAlpha = style.alpha * pulse * (standingHere ? 0.95 : 0.55);
        const spineAlpha = style.alpha * pulse * (hot ? 1.65 : 0.85);
        g.fillStyle(style.color, baseAlpha);
        g.fillRect(left + 1, top + 1, tileDraw - 2, tileDraw - 2);
        drawBeamLane(g, left, top, tileDraw, style.color, spineAlpha, beamVertical, endCap);
      } else {
        g.fillStyle(style.color, style.alpha * pulse * local * (standingHere ? 1.5 : 1));
        g.fillRect(left + 1, top + 1, tileDraw - 2, tileDraw - 2);
        hatchTile(g, left + 1, top + 1, tileDraw - 2, style.color, 0.28 * pulse * local);
      }

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
  animFrame: number,
  tileDraw: number,
): void {
  const incoming = incomingFlankSeats(st);
  const boxed = flankBoxTiles(st);

  for (const t of incoming) {
    const left = t.x * tileDraw;
    const top = t.y * tileDraw;
    const pulse = tileHatchPulse(animFrame, t.x, t.y);
    g.fillStyle(Theme.rust, 0.12 * pulse);
    g.fillRect(left + 1, top + 1, tileDraw - 2, tileDraw - 2);
    hatchTile(g, left + 1, top + 1, tileDraw - 2, Theme.rust, 0.2 * pulse);
    strokeTile(g, t.x, t.y, tileDraw, Theme.rust, 0.7 * pulse, 1);
  }

  for (const t of boxed) {
    if (!(st.visible[t.y]?.[t.x] ?? false)) continue;
    const pulse = tileHatchPulse(animFrame, t.x, t.y);
    strokeTile(g, t.x, t.y, tileDraw, Theme.rust, 0.9 * pulse, 2);
  }

  if (boxed.length > 0) {
    const pulse = tileHatchPulse(animFrame, st.player.x, st.player.y);
    strokeTile(g, st.player.x, st.player.y, tileDraw, Theme.rust, 0.95 * pulse, 2);
  }
}
