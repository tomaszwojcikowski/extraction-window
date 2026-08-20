import Phaser from 'phaser';
import { drawHintPlate } from '../../scenes/atmosphere';
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

/** Center shear readout + hint plate — extracted from GameScene. */
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
  drawHintPlate(refs.shearPlate, opts.screenW / 2, 7 + th / 2, tw, th, { originX: 0.5 });
  const strip = shearAccentStrip(opts.screenW, tw, th, shear.state);
  refs.shearPlate.fillStyle(accent, shear.state === 'Breaching' ? 1 : 0.9);
  refs.shearPlate.fillRect(strip.x, strip.y, strip.w, strip.h);

  return { stateChanged, enteredBreaching };
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
  const pw = Math.max(48, Math.ceil(textW) + 16);
  const ph = Math.max(16, Math.ceil(textH) + 8);
  const px = Math.round(screenW / 2 - pw / 2);
  const py = Math.round(7 + Math.ceil(textH) / 2 - ph / 2);
  const w = state === 'Breaching' ? 5 : 4;
  return { x: px - w - 1, y: py, w, h: ph };
}

/** Flash duration when shear state escalates. */
export function shearFlashMs(state: ShearPressureState): number {
  return state === 'Breaching' ? 420 : 200;
}
