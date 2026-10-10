// Recolor SVG text by swapping slot token colors. Works on Illustrator output whether it uses
// presentation attributes, style="" or a <style> block, because it edits the text directly.
import { deriveShade, normHex } from './color';
import type { SlotColors, SlotId, Tokens } from './schema';

const HEX = /(url\(\s*|href\s*=\s*["']|id\s*=\s*["'])?#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;

/** Map of token hex → replacement hex for the requested slot colors. */
export function colorMap(tokens: Tokens, colors: SlotColors): Map<string, string> {
  const map = new Map<string, string>();
  for (const [slot, newBase] of Object.entries(colors) as [SlotId, string][]) {
    const t = tokens[slot];
    if (!t || !newBase) continue;
    const base = normHex(t.base), nb = normHex(newBase);
    if (base === nb) continue;
    map.set(base, nb);
    for (const shade of Object.values(t.shades ?? {})) map.set(normHex(shade), deriveShade(base, shade, nb));
  }
  return map;
}

/** Replace token colors in SVG text. References like url(#id) and href="#id" are left alone. */
export function recolorSvg(svg: string, map: Map<string, string>): string {
  if (map.size === 0) return svg;
  return svg.replace(HEX, (whole, ref: string | undefined, hex: string) => {
    if (ref) return whole;
    const to = map.get(normHex(hex));
    return to ?? whole;
  });
}

/** Every distinct color used in the SVG text (normalized), for validation. */
export function colorsIn(svg: string): Set<string> {
  const out = new Set<string>();
  for (const m of svg.matchAll(HEX)) if (!m[1]) out.add(normHex(m[2]));
  return out;
}

/** All token hexes (bases and shades) declared for a set of tokens. */
export function tokenHexes(tokens: Tokens): Map<string, string> {
  const out = new Map<string, string>();
  for (const [slot, t] of Object.entries(tokens)) {
    if (!t) continue;
    out.set(normHex(t.base), `${slot}.base`);
    for (const [k, v] of Object.entries(t.shades ?? {})) out.set(normHex(v), `${slot}.${k}`);
  }
  return out;
}
