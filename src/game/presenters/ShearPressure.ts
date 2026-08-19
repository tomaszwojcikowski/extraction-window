import { EM_HIGH } from '../../sim/emStress';
import { lore } from '../../data/lore';
import { Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';

export type ShearPressureState = 'Calm' | 'Charged' | 'Arcing' | 'Breaching';

export type ShearDrainLeg = 'bus' | 'em' | 'both';

export type ShearPressureSpec = {
  /** 0–1 field strain dial — Power reserve + scan pressure. */
  value: number;
  state: ShearPressureState;
  accent: number;
  /** Raw 0–1 Power reserve drain. */
  busDrain: number;
  /** Raw 0–1 EM scan pressure. */
  emDrain: number;
  /** Which leg is driving the blend — for sub-glyph pulse on the dial. */
  drainingLeg: ShearDrainLeg;
};

/** Diegetic field strain — Power reserve + EM, one readable dial. */
export function computeShearPressure(st: GameState): ShearPressureSpec {
  const busDrain = 1 - st.player.energy / Math.max(1, st.player.maxEnergy);
  const emDrain = Math.min(1, st.emStress / EM_HIGH);
  const busContrib = busDrain * 0.72;
  const emContrib = emDrain * 0.28;
  const value = Math.min(1, Math.max(0, busContrib + emContrib));

  const legDelta = Math.abs(busContrib - emContrib);
  const drainingLeg: ShearDrainLeg =
    legDelta < 0.06 ? 'both' : busContrib >= emContrib ? 'bus' : 'em';

  if (value < 0.25) {
    return { value, state: 'Calm', accent: Theme.biolumDeep, busDrain, emDrain, drainingLeg };
  }
  if (value < 0.5) {
    return { value, state: 'Charged', accent: Theme.tape, busDrain, emDrain, drainingLeg };
  }
  if (value < 0.75) {
    return { value, state: 'Arcing', accent: Theme.arc, busDrain, emDrain, drainingLeg };
  }
  return { value, state: 'Breaching', accent: Theme.arcWhite, busDrain, emDrain, drainingLeg };
}

/** Center chrome for Charged+ — names the leading pressure and how bad it is. */
export function shearReadoutLabel(spec: ShearPressureSpec): string {
  const clocks =
    spec.drainingLeg === 'bus'
      ? lore('UI-ENERGY').toUpperCase()
      : spec.drainingLeg === 'em'
        ? lore('UI-EM').toUpperCase()
        : `${lore('UI-ENERGY').toUpperCase()} + ${lore('UI-EM').toUpperCase()}`;
  const severity = spec.state === 'Breaching' ? lore('UI-CLOCK-CRIT') : lore('UI-CLOCK-LOW');
  return `${clocks}  ${severity}`;
}
