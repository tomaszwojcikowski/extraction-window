import Phaser from 'phaser';
import type { GameState } from '../../sim/types';
import type { ShearPressureSpec } from './ShearPressure';
import {
  collectWakeTells,
  wakeTellColor,
  wakeTellPulse,
} from './wakeTellMarks';

export {
  collectWakeTells,
  MAX_WAKE_TELLS,
  wakeTellColor,
  wakeTellPulse,
  wakeTellsAt,
} from './wakeTellMarks';
export type { WakeTell, WakeTellKind } from './wakeTellMarks';

/** Paint notice lines + rings on the threat layer (caller must not clear first). */
export function drawWakeTells(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  px: number,
  py: number,
  animFrame: number,
  tileDraw: number,
  shear?: Pick<ShearPressureSpec, 'state'>,
): void {
  const { pulse, lineW } = wakeTellPulse(animFrame, shear);
  const tells = collectWakeTells(st, px, py);
  const fromX = px * tileDraw + tileDraw / 2;
  const fromY = py * tileDraw + tileDraw / 2;

  for (const tell of tells) {
    const color = wakeTellColor(tell.kind);
    const toX = tell.ex * tileDraw + tileDraw / 2;
    const toY = tell.ey * tileDraw + tileDraw / 2;
    const onFeet = tell.ex === px && tell.ey === py;

    g.lineStyle(lineW, color, Math.min(1, 0.42 * pulse));
    g.beginPath();
    g.moveTo(fromX, fromY);
    g.lineTo(toX, toY);
    g.strokePath();

    const r = tileDraw * (0.34 + 0.06 * Math.min(1.2, pulse));
    g.lineStyle(onFeet ? lineW + 1 : lineW, color, Math.min(1, (onFeet ? 0.95 : 0.72) * pulse));
    g.strokeCircle(toX, toY, r);
    g.lineStyle(1, color, Math.min(1, 0.35 * pulse));
    g.strokeCircle(toX, toY, r + 3);
  }
}
