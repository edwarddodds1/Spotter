/**
 * Cavoodle — crop box for `assets/breed-line-art/cavoodle.png`
 *
 * The image is 256×682 px. All values are in pixels from the top-left of that file.
 *
 * | Field   | What to change |
 * |---------|----------------|
 * | **x**   | Move the box left (smaller x) or right (larger x). |
 * | **y**   | Move the box up (smaller y) or down (larger y). |
 * | **w**   | Narrower (smaller) or wider (larger) crop. |
 * | **h**   | Shorter (smaller) or taller (larger) crop. |
 * | **feetY** | Row where the paws sit on the **full PNG** (keeps feet aligned in the hex). |
 * | **dx** | Fine nudge after scaling: positive → right (viewport pixels). |
 * | **dy** | Fine nudge: positive → down. |
 * | **scale** | Extra zoom on this crop only (`1` = normal). Multiplies with `hexSpriteTweaks` if you set any there. |
 *
 * This file is the main place for Cavoodle framing; prefer **dx/dy/scale here** over `hexSpriteTweaks` for this breed.
 */
export const cavoodleLineArtCrop = {
  x: 0,
  y: 0,
  w: 150,
  h: 682,
  feetY: 648,
  dx: -9,
  dy: 65,
  scale: 3.5,
};
