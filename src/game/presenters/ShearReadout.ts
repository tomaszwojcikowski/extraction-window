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
  const pw = Math.max(48, tw + 16);
  const ph = Math.max(16, th + 8);
  const px = Math.round(opts.screenW / 2 - pw / 2);
  const py = Math.round(7 + th / 2 - ph / 2);
  refs.shearPlate.fillStyle(accent, 0.9);
  refs.shearPlate.fillRect(px + 1, py + 1, 3, ph - 3);

  return { stateChanged, enteredBreaching };
}

/** Flash duration when shear state escalates. */
export function shearFlashMs(state: ShearPressureState): number {
  return state === 'Breaching' ? 280 : 200;
}
