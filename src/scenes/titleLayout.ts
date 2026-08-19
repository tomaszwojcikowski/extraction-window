/** Title screen layout — text positions only, no menu plates. */

export type TitleLayout = {
  window: { x: number; y: number; w: number; h: number };
  seedY: number;
  beginY: number;
  briefY: number;
  controlsY: number;
};

export function computeTitleLayout(width: number, height: number): TitleLayout {
  const windowW = Math.min(520, width - 96);
  const windowH = 152;
  const windowX = Math.round((width - windowW) / 2);
  const windowY = 88;

  return {
    window: { x: windowX, y: windowY, w: windowW, h: windowH },
    seedY: windowY + windowH + 36,
    beginY: windowY + windowH + 72,
    briefY: height - 72,
    controlsY: height - 50,
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

export function isTitleHelpDismissKey(e: KeyboardEvent): boolean {
  return e.key === 'Escape' || isTitleHelpKey(e) || isTitleStartKey(e);
}
