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
