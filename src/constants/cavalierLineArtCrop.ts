/**
 * Cavalier King Charles — line-art PNG + crop (`assets/breed-line-art/cavalier-king-charles-spaniel.png`)
 *
 * Regenerate from a new source with:
 *   `node scripts/process-cavalier-line-art.mjs [path/to/source.png]`
 * Then set **sheet size** and **feetY** to match the script output (paw baseline Y on the PNG).
 */
export const cavalierLineArtSheetSize = { w: 156, h: 126 } as const;

export const cavalierLineArtCrop = {
  x: 0,
  y: 0,
  w: cavalierLineArtSheetSize.w,
  h: cavalierLineArtSheetSize.h,
  feetY: 117,
  dx: 0,
  dy: 0,
  scale: 1,
};
