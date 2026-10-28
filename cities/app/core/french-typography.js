// Display text only: no DOM repair, no data mutation and no HTML interpolation.
// Escaped code points keep the source legible in editors and automated tools.
export function frenchTypography(text) {
  return String(text).replace(/(?<=[\p{L}\p{N}\}\)])[ \u00a0\u202f]*([:;!?%]+)(?=\s|$)/gu, '\u00a0$1');
}
