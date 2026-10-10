// Color math for recoloring art: sRGB <-> OKLab/OKLCH (perceptual, keeps silvers clean).

export function normHex(h: string): string {
  let s = h.trim().toLowerCase().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/.test(s)) throw new Error('Bad hex color: ' + h);
  return '#' + s;
}

export function hexToRgb(h: string): [number, number, number] {
  const s = normHex(h);
  return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgb([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export type Lch = [number, number, number];

export function hexToLch(h: string): Lch {
  const [L, a, b] = rgbToOklab(hexToRgb(h));
  return [L, Math.hypot(a, b), Math.atan2(b, a)];
}

export function lchToHex([L, C, H]: Lch): string {
  return rgbToHex(oklabToRgb([L, C * Math.cos(H), C * Math.sin(H)]));
}

/** Perceptual distance (OKLab euclidean). ~0.02 is barely noticeable. */
export function deltaE(h1: string, h2: string): number {
  const a = rgbToOklab(hexToRgb(h1)), b = rgbToOklab(hexToRgb(h2));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const GREY_C = 0.02;

/**
 * Given a token base, one of its shades, and a new base: the new shade keeps the shade's
 * lightness offset and chroma ratio, and takes the new hue.
 */
export function deriveShade(tokenBase: string, tokenShade: string, newBase: string): string {
  const [L0, C0] = hexToLch(tokenBase);
  const [Ls, Cs, Hs] = hexToLch(tokenShade);
  const [L1, C1, H1] = hexToLch(newBase);
  const L = Math.max(0, Math.min(1, L1 + (Ls - L0)));
  const C = C0 > GREY_C ? C1 * (Cs / C0) : Math.max(0, C1 + (Cs - C0));
  const H = C1 > GREY_C ? H1 : Hs;
  return lchToHex([L, C, H]);
}
