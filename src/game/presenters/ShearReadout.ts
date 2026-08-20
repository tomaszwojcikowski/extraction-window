import Phaser from 'phaser';
import { drawMenuPlate, drawTapeStrip } from '../../scenes/atmosphere';
import { Theme, ThemeCss } from '../../scenes/theme';
import { shearReadoutLabel, type ShearPressureSpec, type ShearPressureState } from './ShearPressure';

export type ShearReadoutRefs = {
  shearReadout: Phaser.GameObjects.Text;
  shearPlate: Phaser.GameObjects.Graphics;
};

export type ShearReadoutSyncResult = {
  stateChanged: boolean;
  enteredBreaching: boolean;
};

/** Center shear readout + instrument plate — colour tape before POWER/EM text. */
export function syncShearReadout(
  refs: ShearReadoutRefs,
  opts: {
    screenW: number;
    shear: ShearPressureSpec;
    prevState: ShearPressureState | null;
    flashUntil: number;
    now: number;
  },
): ShearReadoutSyncResult {
  const { shear, prevState, flashUntil, now } = opts;
  const stateChanged = prevState !== shear.state;
  const enteredBreaching = stateChanged && shear.state === 'Breaching' && prevState !== 'Breaching';
  const flash = flashUntil > now;

  if (shear.state === 'Calm') {
    refs.shearReadout.setVisible(false);
    refs.shearPlate.clear();
    refs.shearPlate.setVisible(false);
    return { stateChanged, enteredBreaching };
  }

  refs.shearReadout.setVisible(true);
  refs.shearReadout.setText(shearReadoutLabel(shear));
  refs.shearReadout.setColor(
    shear.state === 'Breaching'
      ? ThemeCss.arcWhite
      : shear.state === 'Arcing'
        ? ThemeCss.arc
        : ThemeCss.tape,
  );
  refs.shearReadout.setAlpha(flash ? 1 : 0.9);
  refs.shearReadout.setPosition(opts.screenW / 2, 7);
  const tw = Math.ceil(refs.shearReadout.width);
  const th = Math.ceil(refs.shearReadout.height);
  const accent =
    shear.state === 'Breaching' ? Theme.arcWhite : shear.state === 'Arcing' ? Theme.arc : Theme.tape;
  refs.shearPlate.setVisible(true);
  refs.shearPlate.clear();
  const plate = shearInstrumentPlate(opts.screenW, tw, th);
  drawMenuPlate(refs.shearPlate, plate.x, plate.y, plate.w, plate.h, { accent });
  const strip = shearAccentStrip(opts.screenW, tw, th, shear.state);
  drawTapeStrip(refs.shearPlate, strip.x, strip.y, strip.w, strip.h, accent, 0.95);

  return { stateChanged, enteredBreaching };
}

export function shearInstrumentPlate(
  screenW: number,
  textW: number,
  textH: number,
): { x: number; y: number; w: number; h: number } {
  const pw = Math.max(56, Math.ceil(textW) + 28);
  const ph = Math.max(18, Math.ceil(textH) + 10);
  return {
    x: Math.round(screenW / 2 - pw / 2),
    y: Math.round(7 + Math.ceil(textH) / 2 - ph / 2),
    w: pw,
    h: ph,
  };
}

/**
 * Hazard-tape strip sits left of the label so Charged+ reads as colour
 * before the player has to parse POWER / EM text.
 */
export function shearAccentStrip(
  screenW: number,
  textW: number,
  textH: number,
  state: ShearPressureState,
): { x: number; y: number; w: number; h: number } {
  const plate = shearInstrumentPlate(screenW, textW, textH);
  const w = state === 'Breaching' ? 18 : 14;
  return {
    x: plate.x - w - 2,
    y: plate.y + 4,
    w,
    h: Math.max(6, plate.h - 8),
  };
}

/** Flash duration when shear state escalates. */
export function shearFlashMs(state: ShearPressureState): number {
  return state === 'Breaching' ? 420 : 200;
}
