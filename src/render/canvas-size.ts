/** Logical height of the playfield; `pickWidth` derives the width from the window around it. */
export const LOGICAL_HEIGHT = 640;
const MIN_WIDTH = 720;
const MAX_WIDTH = 1280;

export interface CanvasSize {
  /** Pixels of the backing store: logical size x `scale` x device pixel ratio. */
  backing: { width: number; height: number };
  /** Size the canvas element takes on the page, in CSS pixels. */
  css: { width: number; height: number };
  /** CSS pixels per logical pixel. */
  scale: number;
}

/**
 * Fits a logical playfield into a window of `cssW` x `cssH` CSS pixels at its own aspect ratio, and
 * sizes the backing store for the device pixel ratio so drawing stays sharp at any DPR.
 */
export function canvasSize(cssW: number, cssH: number, dpr: number, logicalW: number, logicalH: number): CanvasSize {
  const scale = Math.min(cssW / logicalW, cssH / logicalH);
  const css = { width: logicalW * scale, height: logicalH * scale };
  return {
    backing: { width: Math.round(css.width * dpr), height: Math.round(css.height * dpr) },
    css,
    scale,
  };
}

/** Logical width for a window: its aspect ratio at the logical height, clamped to 720 to 1280. */
export function pickWidth(winW: number, winH: number): number {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, (winW / winH) * LOGICAL_HEIGHT)));
}
