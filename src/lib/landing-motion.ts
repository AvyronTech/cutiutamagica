export type WorldMarker = { index: number; top: number; ready: boolean };
/** Two opaque scene layers at most; an unavailable next image never produces a blank frame. */
export function worldBlend(markers: WorldMarker[], viewportHeight: number) {
  let base = 0;
  if (viewportHeight <= 0) return { base, overlay: -1, progress: 0 };
  for (const marker of markers) {
    const progress = Math.max(
      0,
      Math.min(1, (viewportHeight * 0.78 - marker.top) / (viewportHeight * 0.56)),
    );
    if (!marker.ready) continue;
    if (progress === 1) base = marker.index;
    else if (progress > 0) return { base, overlay: marker.index, progress };
    else break;
  }
  return { base, overlay: -1, progress: 0 };
}
export function isIntentionalPress(
  start: { x: number; y: number } | null,
  end: { x: number; y: number },
  keyboard: boolean,
) {
  return keyboard || (!!start && Math.hypot(end.x - start.x, end.y - start.y) <= 8);
}
