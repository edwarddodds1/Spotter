/**
 * Shared math for hex tiles, thumbs, featured card, and breed mini icon.
 * Fits the crop rectangle (w×h) in the viewport with `min(vpW/w, vpH/h)` (“contain”).
 */

export type SpriteSheetCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
  feetY?: number;
  dx?: number;
  dy?: number;
  scale?: number;
};

export type HexSpriteTweak = { dx: number; dy: number; scale: number };

export function layoutSpriteInViewport(
  crop: SpriteSheetCrop,
  tweak: HexSpriteTweak,
  spriteSheet: { w: number; h: number },
  vpW: number,
  vpH: number,
  baselineInset: number,
  /** Multiply tweak.dx/dy when viewport is scaled (e.g. featured card vs 56px hex). Default 1. */
  tweakNudgeScale = 1,
  /**
   * Featured card historically used `(dx + tweak.dx) * nudgeScale`; hex/thumb use `dx + tweak.dx * nudgeScale`.
   */
  combineNudgesBeforeViewportScale = false,
) {
  const { x, y, w, h, feetY = y + h, dx = 0, dy = 0, scale = 1 } = crop;
  const fitScale = Math.min(vpW / w, vpH / h) * scale * tweak.scale;
  const scaledCropW = w * fitScale;
  const padX = (vpW - scaledCropW) / 2;
  const baselineY = vpH - baselineInset;
  const nudgeX = combineNudgesBeforeViewportScale
    ? (dx + tweak.dx) * tweakNudgeScale
    : dx + tweak.dx * tweakNudgeScale;
  const nudgeY = combineNudgesBeforeViewportScale
    ? (dy + tweak.dy) * tweakNudgeScale
    : dy + tweak.dy * tweakNudgeScale;
  return {
    left: padX - x * fitScale + nudgeX,
    top: baselineY - feetY * fitScale + nudgeY,
    spriteWidth: spriteSheet.w * fitScale,
    spriteHeight: spriteSheet.h * fitScale,
  };
}
