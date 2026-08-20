/** Player lore must not teach a Window turn timer — Power is the sole death clock. */
export const CLOCK_LIE_PATTERNS: ReadonlyArray<RegExp> = [
  /Window and Power both kill/i,
  /Window = turns/i,
  /turns left before the extract/i,
  /Window refund/i,
  /Window closes faster/i,
  /Window clock/i,
  /\+Window/,
  /Window and Power are (live|ticking|paused)/i,
  /Window — turns/i,
  /HP · Shield · Power · Window/i,
  /TWO CLOCKS/i,
  /Window pressure/i,
  /Window shear pulse/i,
];

export function findClockLies(lore: Readonly<Record<string, string>>): string[] {
  const hits: string[] = [];
  for (const [id, text] of Object.entries(lore)) {
    for (const pat of CLOCK_LIE_PATTERNS) {
      if (pat.test(text)) {
        hits.push(`${id}: ${text.slice(0, 96)}`);
        break;
      }
    }
  }
  return hits;
}

/** Player lore must not teach Shift-peek / confirm-on-`.` — Wave 24 cut. */
export const PEEK_LIE_PATTERNS: ReadonlyArray<RegExp> = [
  /Shift\s*\+?\s*(peek|direction|dir)/i,
  /Shift peek/i,
  /hold Shift/i,
  /peek wake/i,
  /peek-teach/i,
  /confirm-on-\./i,
  /queue(?:s|d)? (?:the )?move/i,
];

export function findPeekLies(lore: Readonly<Record<string, string>>): string[] {
  const hits: string[] = [];
  for (const [id, text] of Object.entries(lore)) {
    for (const pat of PEEK_LIE_PATTERNS) {
      if (pat.test(text)) {
        hits.push(`${id}: ${text.slice(0, 96)}`);
        break;
      }
    }
  }
  return hits;
}
