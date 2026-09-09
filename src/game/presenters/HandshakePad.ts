import Phaser from 'phaser';
import { LightTemp } from '../../scenes/theme';
import type { GameState } from '../../sim/types';
import { handshakePadView } from './handshakeTells';

export { handshakePadView } from './handshakeTells';
export type { HandshakePadView, HandshakeStage } from './handshakeTells';

/**
 * Beacon pad sync ticks — spatial handshake progress (Wave 57).
 * Stages fill as `handshake.progress` climbs; one Graphic layer, no stacked ADD.
 */
export function drawHandshakePad(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  animFrame: number,
  tileDraw: number,
): void {
  const view = handshakePadView(st, animFrame);
  if (!view) return;

  const cx = view.x * tileDraw + tileDraw / 2;
  const cy = view.y * tileDraw + tileDraw / 2;
  const r = tileDraw * 0.42;

  g.lineStyle(1, LightTemp.beacon, 0.35 * view.pulse);
  g.strokeCircle(cx, cy, r);

  const stages = view.stages.length;
  for (let i = 0; i < stages; i++) {
    const stage = view.stages[i]!;
    const a0 = -Math.PI / 2 + (i / stages) * Math.PI * 2;
    const a1 = -Math.PI / 2 + ((i + 0.72) / stages) * Math.PI * 2;
    g.lineStyle(stage.filled || stage.hot ? 2 : 1, stage.color, stage.alpha);
    g.beginPath();
    g.arc(cx, cy, r + 4, a0, a1, false);
    g.strokePath();
  }
}
