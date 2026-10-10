// Tiny SVG writer used by the generators. Output is plain, Illustrator-friendly SVG:
// groups with ids (= layer names), presentation attributes, no transforms, no CSS.

export type Attrs = Record<string, string | number | undefined>;

const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

export function el(tag: string, attrs: Attrs = {}, children: string[] = []): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}="${typeof v === 'number' ? fmt(v) : v}"`)
    .join(' ');
  const open = a ? `<${tag} ${a}` : `<${tag}`;
  return children.length ? `${open}>\n${indent(children.join('\n'))}\n</${tag}>` : `${open}/>`;
}

export function group(id: string, children: string[], attrs: Attrs = {}): string {
  return el('g', { id, ...attrs }, children);
}

function indent(s: string): string {
  return s.split('\n').map((l) => '  ' + l).join('\n');
}

export type P = [number, number];
export type RP = [number, number, number?];

/**
 * A closed polygon with rounded corners (quadratic corners), points as [x, y, radius].
 * Coordinates are already in SVG space.
 */
export function roundedPath(points: RP[]): string {
  const n = points.length;
  const segs: string[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = points[i];
    const [px, py] = points[(i - 1 + n) % n];
    const [nx, ny] = points[(i + 1) % n];
    const lp = Math.hypot(px - x, py - y), ln = Math.hypot(nx - x, ny - y);
    const d = Math.min(r, lp / 2, ln / 2);
    const ax = x + ((px - x) / (lp || 1)) * d, ay = y + ((py - y) / (lp || 1)) * d;
    const bx = x + ((nx - x) / (ln || 1)) * d, by = y + ((ny - y) / (ln || 1)) * d;
    if (i === 0) segs.push(`M${fmt(ax)} ${fmt(ay)}`);
    else segs.push(`L${fmt(ax)} ${fmt(ay)}`);
    if (d > 0) segs.push(`Q${fmt(x)} ${fmt(y)} ${fmt(bx)} ${fmt(by)}`);
    else segs.push(`L${fmt(bx)} ${fmt(by)}`);
  }
  return segs.join(' ') + 'Z';
}

export function roundRect(x: number, y: number, w: number, h: number, r: number, attrs: Attrs = {}): string {
  return el('rect', { x, y, width: w, height: h, rx: Math.min(r, w / 2, h / 2), ...attrs });
}

export function circle(cx: number, cy: number, r: number, attrs: Attrs = {}): string {
  return el('circle', { cx, cy, r, ...attrs });
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, attrs: Attrs = {}): string {
  return el('ellipse', { cx, cy, rx, ry, ...attrs });
}

export function path(d: string, attrs: Attrs = {}): string {
  return el('path', { d, ...attrs });
}

/** Slanted window glint (style rule: one glint per window). */
export function glintPath(x: number, y: number, w: number, h: number): string {
  const s = h * 0.45;
  return `M${fmt(x + s)} ${fmt(y)} L${fmt(x + s + w)} ${fmt(y)} L${fmt(x + w)} ${fmt(y + h)} L${fmt(x)} ${fmt(y + h)}Z`;
}

/** Ring (donut) as a single even-odd path: no strokes needed. */
export function ringPath(cx: number, cy: number, r0: number, r1: number): string {
  const c = (r: number) => `M${fmt(cx + r)} ${fmt(cy)} A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx - r)} ${fmt(cy)} A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx + r)} ${fmt(cy)}Z`;
  return c(r1) + ' ' + c(r0);
}

export function svgDoc(viewBox: [number, number, number, number], comment: string, children: string[]): string {
  const [x, y, w, h] = viewBox;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${comment} -->
${el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h }, children)}
`;
}
