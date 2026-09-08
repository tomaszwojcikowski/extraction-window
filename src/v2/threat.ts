import { enemyThreatTiles, flankBoxTiles, incomingFlankSeats } from '../sim/ai';
import { Theme } from '../scenes/theme';
import type { Enemy, GameState } from '../sim/types';
import { beamLaneHot, tileHatchPulse, windupThreatPulse } from '../game/presenters/threatPulse';

const STYLES: Record<NonNullable<Enemy['intent']>, { color: number; alpha: number }> = {
  pounce: { color: Theme.rust, alpha: 0.3 },
  reach: { color: Theme.rust, alpha: 0.3 },
  zone: { color: Theme.scanWash, alpha: 0.26 },
  beam: { color: Theme.arcWhite, alpha: 0.32 },
  overwatch: { color: Theme.tape, alpha: 0.3 },
};

export type ThreatMark = {
  x: number;
  y: number;
  color: number;
  fill: number;
  hatch: number;
  stroke: number;
  strokeWidth: number;
  beam: boolean;
  beamVertical: boolean;
  endCap: boolean;
  spine: number;
};

/** Same facts as ThreatView — Phaser-free so the v2 field can paint them. */
export function collectThreatMarks(st: GameState, animFrame: number): ThreatMark[] {
  const marks: ThreatMark[] = [];

  for (const t of incomingFlankSeats(st)) {
    const pulse = tileHatchPulse(animFrame, t.x, t.y);
    marks.push({
      x: t.x,
      y: t.y,
      color: Theme.rust,
      fill: 0.12 * pulse,
      hatch: 0.2 * pulse,
      stroke: 0.7 * pulse,
      strokeWidth: 1,
      beam: false,
      beamVertical: false,
      endCap: false,
      spine: 0,
    });
  }

  const boxed = flankBoxTiles(st);
  for (const t of boxed) {
    if (!(st.visible[t.y]?.[t.x] ?? false)) continue;
    const pulse = tileHatchPulse(animFrame, t.x, t.y);
    marks.push({
      x: t.x,
      y: t.y,
      color: Theme.rust,
      fill: 0,
      hatch: 0,
      stroke: 0.9 * pulse,
      strokeWidth: 2,
      beam: false,
      beamVertical: false,
      endCap: false,
      spine: 0,
    });
  }
  if (boxed.length > 0) {
    const pulse = tileHatchPulse(animFrame, st.player.x, st.player.y);
    marks.push({
      x: st.player.x,
      y: st.player.y,
      color: Theme.rust,
      fill: 0,
      hatch: 0,
      stroke: 0.95 * pulse,
      strokeWidth: 2,
      beam: false,
      beamVertical: false,
      endCap: false,
      spine: 0,
    });
  }

  for (const en of st.enemies) {
    if (!en.alive || en.windup <= 0 || !en.intent) continue;
    if (!(st.visible[en.y]?.[en.x] ?? false)) continue;
    const style = STYLES[en.intent];
    const tiles = enemyThreatTiles(st, en);
    const isBeam = en.intent === 'beam';
    const pulse = windupThreatPulse(animFrame, en.windup);
    const beamDy = Math.sign(st.player.y - en.y);
    const beamVertical = beamDy !== 0;
    let maxBeamStep = 0;
    if (isBeam) {
      for (const t of tiles) {
        const d = Math.abs(t.x - en.x) + Math.abs(t.y - en.y);
        if (d > maxBeamStep) maxBeamStep = d;
      }
    }
    for (const t of tiles) {
      if (!(st.visible[t.y]?.[t.x] ?? false)) continue;
      const standingHere = st.player.x === t.x && st.player.y === t.y;
      const local = tileHatchPulse(animFrame, t.x, t.y);
      if (isBeam) {
        const step = Math.abs(t.x - en.x) + Math.abs(t.y - en.y);
        const endCap = step === maxBeamStep;
        const hot = beamLaneHot(animFrame, step, maxBeamStep) || standingHere;
        const fill = style.alpha * pulse * (standingHere ? 0.95 : 0.55);
        const spine = style.alpha * pulse * (hot ? 1.65 : 0.85);
        marks.push({
          x: t.x,
          y: t.y,
          color: style.color,
          fill,
          hatch: 0,
          stroke: standingHere ? 0.95 * pulse : 0,
          strokeWidth: standingHere ? 2 : 0,
          beam: true,
          beamVertical,
          endCap,
          spine,
        });
      } else {
        marks.push({
          x: t.x,
          y: t.y,
          color: style.color,
          fill: style.alpha * pulse * local * (standingHere ? 1.5 : 1),
          hatch: 0.28 * pulse * local,
          stroke: standingHere ? 0.95 * pulse : 0,
          strokeWidth: standingHere ? 2 : 0,
          beam: false,
          beamVertical: false,
          endCap: false,
          spine: 0,
        });
      }
    }
  }
  return marks;
}
