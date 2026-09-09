import { HANDSHAKE_TURNS } from '../../sim/mechanics/beaconHandshake';
import { LightTemp, Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';

export type HandshakeStage = {
  filled: boolean;
  hot: boolean;
  color: number;
  alpha: number;
};

export type HandshakePadView = {
  x: number;
  y: number;
  pulse: number;
  stages: HandshakeStage[];
};

/** Beacon pad sync ticks — Phaser-free so v1 and v2 share the same stages. */
export function handshakePadView(st: GameState, animFrame: number): HandshakePadView | null {
  if (!st.handshake?.active) return null;
  const pos = st.beaconPos ?? { x: st.player.x, y: st.player.y };
  if (!(st.visible[pos.y]?.[pos.x] ?? false) && !(st.explored[pos.y]?.[pos.x] ?? false)) {
    return null;
  }

  const progress = Math.max(0, Math.min(HANDSHAKE_TURNS, st.handshake.progress));
  const pulse = 0.55 + (animFrame % 4) * 0.1;
  const stages: HandshakeStage[] = [];
  for (let i = 0; i < HANDSHAKE_TURNS; i++) {
    const filled = i < progress;
    const hot = i === progress && st.handshake.active;
    stages.push({
      filled,
      hot,
      color: filled ? Theme.safe : hot ? LightTemp.beacon : Theme.inkDim,
      alpha: filled ? 0.9 * pulse : hot ? 0.75 * pulse : 0.35,
    });
  }
  return { x: pos.x, y: pos.y, pulse, stages };
}
