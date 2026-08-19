/**
 * Cells whose hop wash changes — mid-step lighting skips the static map.
 * Pure helper (no Phaser) so unit tests stay headless.
 */
export function moveBlendDirtyCells(
  fromAlpha: number[][],
  toAlpha: number[][],
  fromTint: number[][],
  toTint: number[][],
): { x: number; y: number }[] {
  const dirty: { x: number; y: number }[] = [];
  const h = Math.min(fromAlpha.length, toAlpha.length, fromTint.length, toTint.length);
  for (let y = 0; y < h; y++) {
    const fa = fromAlpha[y];
    const ta = toAlpha[y];
    const ft = fromTint[y];
    const tt = toTint[y];
    if (!fa || !ta || !ft || !tt) continue;
    const w = Math.min(fa.length, ta.length, ft.length, tt.length);
    for (let x = 0; x < w; x++) {
      if ((fa[x] ?? 1) !== (ta[x] ?? 1) || (ft[x] ?? 0xffffff) !== (tt[x] ?? 0xffffff)) {
        dirty.push({ x, y });
      }
    }
  }
  return dirty;
}

export function cloneShroudGrid(src: boolean[][]): boolean[][] {
  return src.map((row) => row.slice());
}

/**
 * FOW cells must not start the hop at the fog sprite's opaque white wash —
 * that would stamp the real tile in at full opacity (a blink). Hold a fog
 * tint at alpha 1 so the art can fade in across the step.
 */
export function applyShroudRevealFrom(
  fromAlpha: number[][],
  fromTint: number[][],
  fromShroud: boolean[][],
  fogTint: number,
): void {
  const h = Math.min(fromAlpha.length, fromTint.length, fromShroud.length);
  for (let y = 0; y < h; y++) {
    const shroud = fromShroud[y];
    const fa = fromAlpha[y];
    const ft = fromTint[y];
    if (!shroud || !fa || !ft) continue;
    const w = Math.min(shroud.length, fa.length, ft.length);
    for (let x = 0; x < w; x++) {
      if (!shroud[x]) continue;
      fa[x] = 1;
      ft[x] = fogTint;
    }
  }
}

/** Ease-in so shroud holds, then the tile resolves — not a linear pop. */
export function shroudRevealEase(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return t * t;
}
