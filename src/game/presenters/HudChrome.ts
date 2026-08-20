import Phaser from 'phaser';
import type { SectorId } from '../../data/encounters';
import { lore } from '../../data/lore';
import { drawHudStripChrome } from '../../scenes/atmosphere';
import { HUD_BOTTOM_DOCK } from '../GameHost';
import type { ShearPressureSpec, ShearPressureState } from './ShearPressure';

export type HudChromeRefs = {
  topPanel: Phaser.GameObjects.Graphics;
  bottomPanel: Phaser.GameObjects.Graphics;
  bottomDockPanel: Phaser.GameObjects.Graphics;
  dockLegendText: Phaser.GameObjects.Text;
};

/** Top/bottom HUD strip chrome — extracted from GameScene. */
export function drawHudChrome(
  refs: HudChromeRefs,
  opts: {
    screenW: number;
    screenH: number;
    topHeight: number;
    bottomInset: number;
    logOpen: boolean;
    shear: ShearPressureSpec;
    sectorId: SectorId;
    biomeAccent: number;
    animFrame: number;
  },
): void {
  const {
    screenW: w,
    screenH: h,
    topHeight: TOP,
    bottomInset: bottom,
    logOpen,
    shear,
    biomeAccent,
    animFrame,
  } = opts;
  void opts.sectorId;
  drawHudStripChrome(refs.topPanel, {
    y: 0,
    height: TOP,
    width: w,
    side: 'top',
    corrosion: shear.value,
    accent: shear.accent,
    biomeAccent,
    drainingLeg: shear.drainingLeg,
    animFrame,
  });
  refs.bottomPanel.setVisible(logOpen);
  if (logOpen) {
    drawHudStripChrome(refs.bottomPanel, {
      y: h - bottom,
      height: bottom - HUD_BOTTOM_DOCK,
      width: w,
      side: 'bottom',
      corrosion: shear.value,
      accent: shear.accent,
      biomeAccent,
    });
  }
  drawHudStripChrome(refs.bottomDockPanel, {
    y: h - HUD_BOTTOM_DOCK,
    height: HUD_BOTTOM_DOCK,
    width: w,
    side: 'bottom',
    corrosion: 0,
    accent: shear.accent,
    biomeAccent,
  });
  const legendStr = lore('UI-DOCK-LEGEND');
  refs.dockLegendText.setText(legendStr);
  refs.dockLegendText.setPosition(w - refs.dockLegendText.width - 10, h - HUD_BOTTOM_DOCK + 3);
}
