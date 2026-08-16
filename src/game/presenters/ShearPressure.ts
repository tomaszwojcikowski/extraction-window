import { STORM_TURNS } from '../../campaign/spine';
import { Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';

export type ShearPressureState = 'Calm' | 'Charged' | 'Arcing' | 'Breaching';

export type ShearDrainLeg = 'storm' | 'bus' | 'both';

export type ShearPressureSpec = {
  /** 0–1 corrosion / dial fill — presentation-only compression of window + bus. */
  value: number;
  state: ShearPressureState;
  accent: number;
  /** Raw 0–1 window drain (storm closing). */
  windowDrain: number;
  /** Raw 0–1 bus reserve drain. */
  busDrain: number;
  /** Which leg is driving the blend — for sub-glyph pulse on the dial. */
  drainingLeg: ShearDrainLeg;
};

/** Diegetic Shear Pressure — window closing + bus reserve, one readable dial. */
export function computeShearPressure(st: GameState): ShearPressureSpec {
  const windowDrain = 1 - Math.max(0, st.stormTurns) / STORM_TURNS;
  const busDrain = 1 - st.player.energy / Math.max(1, st.player.maxEnergy);
  const windowContrib = windowDrain * 0.62;
  const busContrib = busDrain * 0.38;
  const value = Math.min(1, Math.max(0, windowContrib + busContrib));

  const legDelta = Math.abs(windowContrib - busContrib);
  const drainingLeg: ShearDrainLeg =
    legDelta < 0.06 ? 'both' : windowContrib >= busContrib ? 'storm' : 'bus';

  if (value < 0.25) {
    return { value, state: 'Calm', accent: Theme.biolumDeep, windowDrain, busDrain, drainingLeg };
  }
  if (value < 0.5) {
    return { value, state: 'Charged', accent: Theme.tape, windowDrain, busDrain, drainingLeg };
  }
  if (value < 0.75) {
    return { value, state: 'Arcing', accent: Theme.arc, windowDrain, busDrain, drainingLeg };
  }
  return { value, state: 'Breaching', accent: Theme.arcWhite, windowDrain, busDrain, drainingLeg };
}

/**
 * Center chrome for Charged+ — names pressure and which clock is leading,
 * without inventing a third resource called "Shear".
 */
export function shearReadoutLabel(spec: ShearPressureSpec): string {
  const leg =
    spec.drainingLeg === 'storm' ? 'WINDOW' : spec.drainingLeg === 'bus' ? 'POWER' : 'BOTH';
  return `PRESSURE  ${spec.state.toUpperCase()}  ·  ${leg}`;
}
