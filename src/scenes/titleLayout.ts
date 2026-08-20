/** Title screen layout — hero window + plated strip anchors. */

export type TitleLayout = {
  window: { x: number; y: number; w: number; h: number };
  seedY: number;
  beginY: number;
  briefY: number;
  controlsY: number;
  /** Plated strip behind mission seed. */
  seedPlate: { x: number; y: number; w: number; h: number };
  /** Plated strip behind begin CTA. */
  beginPlate: { x: number; y: number; w: number; h: number };
  /** Footer mute / org strip height. */
  footerY: number;
};

export function computeTitleLayout(width: number, height: number): TitleLayout {
  const windowW = Math.min(520, width - 96);
  const windowH = 152;
  const windowX = Math.round((width - windowW) / 2);
  const windowY = 88;
  const seedY = windowY + windowH + 36;
  const beginY = windowY + windowH + 72;
  const seedPlateW = Math.min(360, width - 120);
  const beginPlateW = Math.min(280, width - 160);

  return {
    window: { x: windowX, y: windowY, w: windowW, h: windowH },
    seedY,
    beginY,
    briefY: height - 72,
    controlsY: height - 50,
    seedPlate: {
      x: Math.round((width - seedPlateW) / 2),
      y: seedY - 14,
      w: seedPlateW,
      h: 28,
    },
    beginPlate: {
      x: Math.round((width - beginPlateW) / 2),
      y: beginY - 14,
      w: beginPlateW,
      h: 28,
    },
    footerY: height - 40,
  };
}

export function formatMissionSeed(seed: number): string {
  return String(seed).padStart(5, '0');
}

export function isTitleStartKey(e: KeyboardEvent): boolean {
  return (
    e.key === 'Enter' ||
    e.key === 'NumpadEnter' ||
    e.key === ' ' ||
    e.code === 'Space' ||
    e.code === 'Enter' ||
    e.code === 'NumpadEnter'
  );
}

export function isTitleHelpKey(e: KeyboardEvent): boolean {
  return e.key === '?' || (e.key === '/' && e.shiftKey);
}

export function isTitleChangelogKey(e: KeyboardEvent): boolean {
  return e.key === 'c' || e.key === 'C';
}

export function isTitleHelpDismissKey(e: KeyboardEvent): boolean {
  return e.key === 'Escape' || isTitleHelpKey(e) || isTitleStartKey(e);
}

export function isTitleChangelogDismissKey(e: KeyboardEvent): boolean {
  return e.key === 'Escape' || isTitleChangelogKey(e) || isTitleStartKey(e);
}
