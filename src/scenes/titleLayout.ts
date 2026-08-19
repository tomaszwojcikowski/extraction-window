/** Title screen layout — pure geometry for 960×640 baseline. */

export type TitlePlate = { x: number; y: number; w: number; h: number };

export type TitleLayout = {
  window: TitlePlate;
  seedPlate: TitlePlate;
  beginPlate: TitlePlate;
  footerPlate: TitlePlate;
  helpPlate: TitlePlate;
};

export function computeTitleLayout(width: number, height: number): TitleLayout {
  const windowW = Math.min(540, width - 80);
  const windowH = 168;
  const windowX = Math.round((width - windowW) / 2);
  const windowY = 72;

  const seedW = Math.min(360, width - 96);
  const seedH = 52;
  const seedX = Math.round((width - seedW) / 2);
  const seedY = windowY + windowH + 28;

  const beginW = 240;
  const beginH = 36;
  const beginX = Math.round((width - beginW) / 2);
  const beginY = seedY + seedH + 16;

  const footW = Math.min(640, width - 48);
  const footH = 72;
  const footX = Math.round((width - footW) / 2);
  const footY = height - 124;

  const helpW = Math.min(520, width - 48);
  const helpH = Math.min(480, height - 64);
  const helpX = Math.round((width - helpW) / 2);
  const helpY = Math.round((height - helpH) / 2);

  return {
    window: { x: windowX, y: windowY, w: windowW, h: windowH },
    seedPlate: { x: seedX, y: seedY, w: seedW, h: seedH },
    beginPlate: { x: beginX, y: beginY, w: beginW, h: beginH },
    footerPlate: { x: footX, y: footY, w: footW, h: footH },
    helpPlate: { x: helpX, y: helpY, w: helpW, h: helpH },
  };
}

export function formatMissionSeed(seed: number, seedLabel: string): string {
  return `MISSION  ${String(seed).padStart(5, '0')}  /  ${seedLabel}`;
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

export function isTitleHelpDismissKey(e: KeyboardEvent): boolean {
  return e.key === 'Escape' || isTitleHelpKey(e) || isTitleStartKey(e);
}
