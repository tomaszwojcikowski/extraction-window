import { STORM_TURNS } from '../../campaign/spine';
import { Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';

export type ShearPressureState = 'Calm' | 'Charged' | 'Arcing' | 'Breaching';

export type ShearPressureSpec = {
  /** 0–1 corrosion / dial fill — presentation-only compression of window + bus. */
  value: number;
  state: ShearPressureState;
  accent: number;
};

/** Diegetic Shear Pressure — window closing + bus reserve, one readable dial. */
export function computeShearPressure(st: GameState): ShearPressureSpec {
  const windowDrain = 1 - Math.max(0, st.stormTurns) / STORM_TURNS;
  const busDrain = 1 - st.player.energy / Math.max(1, st.player.maxEnergy);
  const value = Math.min(1, Math.max(0, windowDrain * 0.62 + busDrain * 0.38));

  if (value < 0.25) {
    return { value, state: 'Calm', accent: Theme.biolumDeep };
  }
  if (value < 0.5) {
    return { value, state: 'Charged', accent: Theme.tape };
  }
  if (value < 0.75) {
    return { value, state: 'Arcing', accent: Theme.arc };
  }
  return { value, state: 'Breaching', accent: Theme.arcWhite };
}
