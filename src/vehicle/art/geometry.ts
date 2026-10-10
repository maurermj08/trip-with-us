// Bounding boxes of SVG layers in root user space, honoring transforms. DOM-agnostic and
// rendering-free so anchors can be measured in tests and tools as well as the browser.
import { elementChildren, tagOf, type El } from './svgDoc';

export type Matrix = [number, number, number, number, number, number]; // a b c d e f

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function parseTransform(t: string | null): Matrix {
  let m: Matrix = IDENTITY;
  if (!t) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(t))) {
    const a = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    let n: Matrix;
    switch (match[1]) {
      case 'matrix': n = [a[0], a[1], a[2], a[3], a[4], a[5]]; break;
      case 'translate': n = [1, 0, 0, 1, a[0], a[1] ?? 0]; break;
      case 'scale': n = [a[0], 0, 0, a[1] ?? a[0], 0, 0]; break;
      case 'rotate': {
        const r = (a[0] * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        n = [c, s, -s, c, 0, 0];
        if (a.length >= 3) n = multiply(multiply([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      }
      case 'skewX': n = [1, 0, Math.tan((a[0] * Math.PI) / 180), 1, 0, 0]; break;
      default: n = [1, Math.tan((a[0] * Math.PI) / 180), 0, 1, 0, 0];
    }
    m = multiply(m, n);
  }
  return m;
}

export class BBox {
  x0 = Infinity;
  y0 = Infinity;
  x1 = -Infinity;
  y1 = -Infinity;
  add(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < this.x0) this.x0 = x;
    if (y < this.y0) this.y0 = y;
    if (x > this.x1) this.x1 = x;
    if (y > this.y1) this.y1 = y;
  }
  get empty(): boolean {
    return this.x0 > this.x1;
  }
  get w(): number {
    return this.x1 - this.x0;
  }
  get h(): number {
    return this.y1 - this.y0;
  }
  get cx(): number {
    return (this.x0 + this.x1) / 2;
  }
  get cy(): number {
    return (this.y0 + this.y1) / 2;
  }
}

const num = (el: El, a: string) => parseFloat(el.getAttribute(a) || '0') || 0;

/** Points from a path's data: endpoints and control points (enough for a tight-ish bbox). */
export function pathPoints(d: string): [number, number][] {
  const out: [number, number][] = [];
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const nextNum = () => parseFloat(tokens[i++]);
  const isNum = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      x = sx; y = sy;
      if (!isNum()) continue;
    }
    const pt = (px: number, py: number) => (rel ? [x + px, y + py] : [px, py]) as [number, number];
    switch (C) {
      case 'M': case 'L': case 'T': {
        const p = pt(nextNum(), nextNum());
        out.push(p);
        [x, y] = p;
        if (C === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
        break;
      }
      case 'H': { x = rel ? x + nextNum() : nextNum(); out.push([x, y]); break; }
      case 'V': { y = rel ? y + nextNum() : nextNum(); out.push([x, y]); break; }
      case 'C': {
        const p1 = pt(nextNum(), nextNum()), p2 = pt(nextNum(), nextNum()), p = pt(nextNum(), nextNum());
        out.push(p1, p2, p);
        [x, y] = p;
        break;
      }
      case 'S': case 'Q': {
        const p1 = pt(nextNum(), nextNum()), p = pt(nextNum(), nextNum());
        out.push(p1, p);
        [x, y] = p;
        break;
      }
      case 'A': {
        const rx = nextNum(), ry = nextNum(), rot = nextNum(), large = nextNum(), sweep = nextNum();
        const p = pt(nextNum(), nextNum());
        out.push(...arcPoints(x, y, rx, ry, rot, !!large, !!sweep, p[0], p[1]));
        [x, y] = p;
        break;
      }
      default:
        i++;
    }
    if (C === 'Z') continue;
  }
  return out;
}

/** Sample an SVG elliptical arc (endpoint parameterization → center parameterization). */
function arcPoints(x1: number, y1: number, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean, x2: number, y2: number): [number, number][] {
  if (!rx || !ry) return [[x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= Math.PI * 2;
  if (sweep && dt < 0) dt += Math.PI * 2;
  const out: [number, number][] = [];
  const n = 24;
  for (let k = 0; k <= n; k++) {
    const t = t1 + (dt * k) / n;
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    out.push([cp * ex - sp * ey + cx, sp * ex + cp * ey + cy]);
  }
  return out;
}

function shapePoints(el: El): [number, number][] {
  switch (tagOf(el)) {
    case 'circle': {
      const cx = num(el, 'cx'), cy = num(el, 'cy'), r = num(el, 'r');
      return [[cx - r, cy - r], [cx + r, cy + r], [cx - r, cy + r], [cx + r, cy - r]];
    }
    case 'ellipse': {
      const cx = num(el, 'cx'), cy = num(el, 'cy'), rx = num(el, 'rx'), ry = num(el, 'ry');
      return [[cx - rx, cy - ry], [cx + rx, cy + ry], [cx - rx, cy + ry], [cx + rx, cy - ry]];
    }
    case 'rect': {
      const x = num(el, 'x'), y = num(el, 'y'), w = num(el, 'width'), h = num(el, 'height');
      return [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    }
    case 'line':
      return [[num(el, 'x1'), num(el, 'y1')], [num(el, 'x2'), num(el, 'y2')]];
    case 'polygon': case 'polyline': {
      const v = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      const out: [number, number][] = [];
      for (let k = 0; k + 1 < v.length; k += 2) out.push([v[k], v[k + 1]]);
      return out;
    }
    case 'path':
      return pathPoints(el.getAttribute('d') || '');
    default:
      return [];
  }
}

/** Accumulated transform from the root down to (and including) `el`. */
export function ctm(el: El): Matrix {
  const chain: El[] = [];
  let n: Node | null = el;
  while (n && n.nodeType === 1) {
    chain.unshift(n as El);
    n = n.parentNode;
  }
  let m: Matrix = IDENTITY;
  for (const e of chain) if (tagOf(e) !== 'svg') m = multiply(m, parseTransform(e.getAttribute('transform')));
  return m;
}

/** Bounding box of an element and its descendants in root user space. */
export function bboxOf(el: El, skip?: (child: El) => boolean): BBox {
  const box = new BBox();
  const visit = (e: El, m: Matrix) => {
    const tag = tagOf(e);
    if (tag === 'defs' || tag === 'clippath' || tag === 'mask' || tag === 'style') return;
    if (e.getAttribute('display') === 'none') return;
    const mm = tag === 'svg' ? m : multiply(m, parseTransform(e.getAttribute('transform')));
    for (const [x, y] of shapePoints(e)) box.add(...apply(mm, x, y));
    for (const c of elementChildren(e)) if (!skip?.(c)) visit(c, mm);
  };
  const parent = el.parentNode && el.parentNode.nodeType === 1 ? ctm(el.parentNode as El) : IDENTITY;
  visit(el, parent);
  return box;
}

/** Treat a layer as a circle: center of its bbox, radius = half the larger side. */
export function circleOf(el: El): { x: number; y: number; r: number } {
  const b = bboxOf(el);
  return { x: b.cx, y: b.cy, r: Math.max(b.w, b.h) / 2 };
}
