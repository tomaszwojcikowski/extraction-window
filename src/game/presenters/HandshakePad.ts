import Phaser from 'phaser';
import { HANDSHAKE_TURNS } from '../../sim/mechanics/beaconHandshake';
import { LightTemp, Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';

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
  if (!st.handshake?.active) return;
  const pos = st.beaconPos ?? { x: st.player.x, y: st.player.y };
  if (!(st.visible[pos.y]?.[pos.x] ?? false) && !(st.explored[pos.y]?.[pos.x] ?? false)) {
    return;
  }

  const cx = pos.x * tileDraw + tileDraw / 2;
  const cy = pos.y * tileDraw + tileDraw / 2;
  const progress = Math.max(0, Math.min(HANDSHAKE_TURNS, st.handshake.progress));
  const pulse = 0.55 + (animFrame % 4) * 0.1;
  const r = tileDraw * 0.42;

  g.lineStyle(1, LightTemp.beacon, 0.35 * pulse);
  g.strokeCircle(cx, cy, r);

  const stages = HANDSHAKE_TURNS;
  for (let i = 0; i < stages; i++) {
    const a0 = -Math.PI / 2 + (i / stages) * Math.PI * 2;
    const a1 = -Math.PI / 2 + ((i + 0.72) / stages) * Math.PI * 2;
    const filled = i < progress;
    const hot = i === progress && st.handshake.active;
    const color = filled ? Theme.safe : hot ? LightTemp.beacon : Theme.inkDim;
    const alpha = filled ? 0.9 * pulse : hot ? 0.75 * pulse : 0.35;
    g.lineStyle(filled || hot ? 2 : 1, color, alpha);
    g.beginPath();
    g.arc(cx, cy, r + 4, a0, a1, false);
    g.strokePath();
  }
}
