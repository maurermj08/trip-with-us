// Drawing helpers that bake in the diorama style rules:
// rounded, no outlines, light from the left, soft contact shadows.
import { Graphics } from 'pixi.js';
import { P, darken, lighten } from './palette';
import type { Rng } from '../core/rng';

export const R = { building: 6, sign: 8, small: 3 };

/** Rectangle with independently rounded corners (tl, tr, br, bl). */
export function cornerRect(
  g: Graphics, x: number, y: number, w: number, h: number,
  tl: number, tr: number, br: number, bl: number,
): Graphics {
  g.moveTo(x + tl, y)
    .lineTo(x + w - tr, y)
    .quadraticCurveTo(x + w, y, x + w, y + tr)
    .lineTo(x + w, y + h - br)
    .quadraticCurveTo(x + w, y + h, x + w - br, y + h)
    .lineTo(x + bl, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - bl)
    .lineTo(x, y + tl)
    .quadraticCurveTo(x, y, x + tl, y)
    .closePath();
  return g;
}

export interface BlockOpts {
  radius?: number;
  /** Landmarks use a darker sibling color for the shade instead of black at 7%. */
  landmark?: boolean;
  shade?: number;
  cap?: boolean;
}

/** A building-like block: right 28% shaded, 3px white bevel cap on top. */
export function block(g: Graphics, x: number, y: number, w: number, h: number, color: number, o: BlockOpts = {}): Graphics {
  const r = Math.min(o.radius ?? R.building, w / 2, h / 2);
  g.roundRect(x, y, w, h, r).fill(color);
  const sw = w * 0.28;
  cornerRect(g, x + w - sw, y, sw, h, 0, r, r, 0);
  if (o.landmark || o.shade !== undefined) g.fill(o.shade ?? darken(color, 0.12));
  else g.fill({ color: P.black, alpha: 0.07 });
  if (o.cap !== false) {
    cornerRect(g, x, y, w, Math.min(3, h), r, r, 0, 0).fill({ color: P.white, alpha: 0.45 });
  }
  return g;
}

/** 5x6 rounded windows on a 9x11 pitch; most white at 75%, ~1 in 5 lit warm. */
export function windowGrid(
  g: Graphics, x: number, y: number, w: number, h: number, rng: Rng,
  opts: { scale?: number; lit?: number } = {},
): Graphics {
  const s = opts.scale ?? 1;
  const pw = 9 * s, ph = 11 * s, ww = 5 * s, wh = 6 * s;
  const cols = Math.floor((w + pw - ww) / pw);
  const rows = Math.floor((h + ph - wh) / ph);
  if (cols <= 0 || rows <= 0) return g;
  const ox = x + (w - ((cols - 1) * pw + ww)) / 2;
  const oy = y + (h - ((rows - 1) * ph + wh)) / 2;
  const lit = opts.lit ?? 0.2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const warm = rng() < lit;
      g.roundRect(ox + c * pw, oy + r * ph, ww, wh, 1.5 * s).fill(
        warm ? { color: P.warmWindow, alpha: 0.95 } : { color: P.windowGlass, alpha: 0.75 },
      );
    }
  }
  return g;
}

export function contactShadow(g: Graphics, cx: number, cy: number, w: number, alpha = 0.14): Graphics {
  return g.ellipse(cx, cy, w / 2, Math.max(3, w * 0.08)).fill({ color: P.black, alpha });
}

/** A slanted glint for glass. */
export function glint(g: Graphics, x: number, y: number, w: number, h: number, alpha = 0.55): Graphics {
  const s = h * 0.45;
  return g.poly([x + s, y, x + s + w, y, x + w, y + h, x, y + h]).fill({ color: P.white, alpha });
}

/** Round-canopy tree with a trunk and contact shadow. Origin at the base. */
export function roundTree(g: Graphics, x: number, y: number, size: number, color: number = P.leaf): Graphics {
  contactShadow(g, x, y, size * 0.9);
  g.roundRect(x - size * 0.06, y - size * 0.55, size * 0.12, size * 0.56, 2).fill(P.trunk);
  const r = size * 0.36;
  g.circle(x - r * 0.55, y - size * 0.62, r * 0.8).fill(color);
  g.circle(x + r * 0.55, y - size * 0.66, r * 0.85).fill(darken(color, 0.06));
  g.circle(x, y - size * 0.86, r).fill(color);
  g.circle(x - r * 0.35, y - size * 0.95, r * 0.35).fill({ color: P.white, alpha: 0.12 });
  return g;
}

/** Layered pine. Origin at the base. */
export function pineTree(g: Graphics, x: number, y: number, size: number, color: number = P.pine): Graphics {
  contactShadow(g, x, y, size * 0.5);
  g.roundRect(x - size * 0.04, y - size * 0.22, size * 0.08, size * 0.23, 2).fill(P.trunk);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const w = size * (0.5 - t * 0.13);
    const by = y - size * (0.15 + t * 0.26);
    const ty = by - size * 0.38;
    roundedTri(g, x, ty, w, by - ty, 5).fill(i % 2 ? darken(color, 0.05) : color);
  }
  return g;
}

/** Isoceles triangle (apex at x,ty) with softened corners. */
export function roundedTri(g: Graphics, x: number, ty: number, w: number, h: number, r: number): Graphics {
  const bl = { x: x - w / 2, y: ty + h }, br = { x: x + w / 2, y: ty + h };
  g.moveTo(x - r * 0.6, ty + r)
    .quadraticCurveTo(x, ty - r * 0.2, x + r * 0.6, ty + r)
    .lineTo(br.x - r * 0.3, br.y - r * 0.6)
    .quadraticCurveTo(br.x + r * 0.4, br.y, br.x - r, br.y)
    .lineTo(bl.x + r, bl.y)
    .quadraticCurveTo(bl.x - r * 0.4, bl.y, bl.x + r * 0.3, bl.y - r * 0.6)
    .closePath();
  return g;
}

/** Sabal palmetto: slender trunk with a starburst of fronds. Origin at base. */
export function palmetto(g: Graphics, x: number, y: number, size: number, lean = 0, mono?: number): Graphics {
  if (mono === undefined) contactShadow(g, x, y, size * 0.4);
  const topX = x + lean * size * 0.25;
  const topY = y - size;
  g.moveTo(x - size * 0.035, y)
    .quadraticCurveTo(x + lean * size * 0.05, y - size * 0.5, topX - size * 0.025, topY)
    .lineTo(topX + size * 0.025, topY)
    .quadraticCurveTo(x + lean * size * 0.05 + size * 0.05, y - size * 0.5, x + size * 0.04, y)
    .closePath()
    .fill(mono ?? 0x9b8566);
  palmCrown(g, topX, topY, size * 0.42, mono);
  return g;
}

export function palmCrown(g: Graphics, x: number, y: number, r: number, mono?: number): Graphics {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const droop = Math.abs(Math.cos(a)) * 0.45;
    const ex = x + Math.cos(a) * r;
    const ey = y + Math.sin(a) * r * 0.75 + droop * r;
    const nx = -Math.sin(a), ny = Math.cos(a);
    const w = r * 0.13;
    g.moveTo(x, y)
      .quadraticCurveTo((x + ex) / 2 + nx * w, (y + ey) / 2 + ny * w - r * 0.15, ex, ey)
      .quadraticCurveTo((x + ex) / 2 - nx * w, (y + ey) / 2 - ny * w - r * 0.1, x, y)
      .fill(mono ?? (i % 2 ? P.palm : darken(P.palm, 0.1)));
  }
  // drooping lower fronds
  for (const s of [-1, 1]) {
    g.moveTo(x, y)
      .quadraticCurveTo(x + s * r * 0.6, y - r * 0.05, x + s * r * 0.85, y + r * 0.45)
      .quadraticCurveTo(x + s * r * 0.45, y + r * 0.1, x, y + 2)
      .fill(mono ?? darken(P.palm, 0.15));
  }
  g.circle(x, y, r * 0.09).fill(mono ?? 0x7c6a4e);
  return g;
}

/** Live oak with Spanish moss. Origin at base. */
export function liveOak(g: Graphics, x: number, y: number, size: number): Graphics {
  contactShadow(g, x, y, size * 1.2);
  g.roundRect(x - size * 0.06, y - size * 0.4, size * 0.12, size * 0.41, 3).fill(0x7a6048);
  const c = 0x4f8f4c;
  g.ellipse(x - size * 0.3, y - size * 0.48, size * 0.34, size * 0.16).fill(c);
  g.ellipse(x + size * 0.32, y - size * 0.5, size * 0.36, size * 0.17).fill(darken(c, 0.07));
  g.ellipse(x, y - size * 0.6, size * 0.4, size * 0.2).fill(c);
  for (let i = -3; i <= 3; i++) {
    const mx = x + i * size * 0.12;
    g.roundRect(mx - 2, y - size * 0.45, 4, size * (0.1 + ((i + 5) % 3) * 0.05), 2).fill(P.moss);
  }
  return g;
}

/** Fluffy cloud of overlapping circles. */
/**
 * A puffy cloud drawn as ONE outline (the union of a rounded base and a row of puffs), so it
 * stays a single flat shape even when the cloud layer is semi-transparent.
 */
export function cloud(g: Graphics, x: number, y: number, w: number, rng: Rng): Graphics {
  const n = 4 + Math.floor(rng() * 3);
  const h = w * 0.28;
  const puffs: { cx: number; cy: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const r = h * (0.45 + Math.sin(t * Math.PI) * 0.5) * (0.8 + rng() * 0.3);
    puffs.push({ cx: x - w / 2 + t * w, cy: y - h * 0.4 - r * 0.3, r });
  }
  // The base: a rounded rect (corner radius rr).
  const bx0 = x - w / 2, bx1 = x + w / 2, by0 = y - h * 0.5, by1 = y + h * 0.1, rr = h * 0.3;
  const span = (px: number): [number, number] | null => {
    let top = Infinity, bot = -Infinity;
    if (px >= bx0 && px <= bx1) {
      const dx = Math.max(bx0 + rr - px, px - (bx1 - rr), 0);
      const inset = dx > 0 ? rr - Math.sqrt(Math.max(0, rr * rr - dx * dx)) : 0;
      top = by0 + inset;
      bot = by1 - inset;
    }
    for (const p of puffs) {
      const dx = px - p.cx;
      if (Math.abs(dx) >= p.r) continue;
      const d = Math.sqrt(p.r * p.r - dx * dx);
      top = Math.min(top, p.cy - d);
      bot = Math.max(bot, p.cy + d);
    }
    return top < bot ? [top, bot] : null;
  };
  const minX = Math.min(bx0, ...puffs.map((p) => p.cx - p.r));
  const maxX = Math.max(bx1, ...puffs.map((p) => p.cx + p.r));
  const steps = 72;
  const tops: number[] = [];
  const bots: number[] = [];
  for (let k = 0; k <= steps; k++) {
    // Ease the samples toward the ends, where the outline curves fastest.
    const t = 0.5 - 0.5 * Math.cos((k / steps) * Math.PI);
    const px = minX + 0.001 + (maxX - minX - 0.002) * t;
    const s = span(px);
    if (!s) continue;
    tops.push(px, s[0]);
    bots.unshift(px, s[1]);
  }
  g.poly([...tops, ...bots]).fill(P.cloud);
  return g;
}

// ---------- Southern / Florida plants (Phase 3) ----------

/** Longleaf pine: tall bare trunk with a few tufted needle puffs at the top. Origin at base. */
export function longleafPine(g: Graphics, x: number, y: number, size: number, lean = 0): Graphics {
  contactShadow(g, x, y, size * 0.25);
  const tx = x + lean * size * 0.15;
  g.moveTo(x - size * 0.022, y)
    .quadraticCurveTo(x + lean * size * 0.05, y - size * 0.5, tx - size * 0.012, y - size * 0.92)
    .lineTo(tx + size * 0.012, y - size * 0.92)
    .quadraticCurveTo(x + lean * size * 0.05 + size * 0.03, y - size * 0.5, x + size * 0.022, y)
    .closePath()
    .fill(0x8a6a4e);
  const c = 0x4f8a4a;
  // short crooked branches ending in small needle tufts
  const tufts: [number, number, number][] = [[-0.11, -0.8, 0.05], [0.12, -0.84, 0.055], [-0.03, -0.96, 0.06], [0.14, -0.7, 0.045], [-0.13, -0.68, 0.04], [0.04, -0.88, 0.05], [-0.08, -0.9, 0.045]];
  for (const [dx, dy] of tufts) g.moveTo(tx, y + dy * size + 6).lineTo(tx + dx * size, y + dy * size).stroke({ width: 2, color: 0x7a5c44 });
  tufts.forEach(([dx, dy, r], i) => {
    const px = tx + dx * size, py = y + dy * size;
    g.ellipse(px, py, r * size * 1.5, r * size * 0.8).fill(i % 2 ? darken(c, 0.08) : c);
    g.ellipse(px, py - r * size * 0.3, r * size * 0.9, r * size * 0.5).fill(lighten(c, 0.08));
  });
  return g;
}

/** Saw palmetto: a low clump of fan fronds. Origin at base. */
export function sawPalmetto(g: Graphics, x: number, y: number, w: number, color = 0x6f9f5a): Graphics {
  const h = w * 0.55;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.08 + (i / 6) * 0.84);
    const ex = x + Math.cos(a) * w * 0.55, ey = y + Math.sin(a) * h;
    const nx = -Math.sin(a) * w * 0.07, ny = Math.cos(a) * w * 0.07;
    g.moveTo(x, y)
      .quadraticCurveTo((x + ex) / 2 + nx, (y + ey) / 2 + ny, ex, ey)
      .quadraticCurveTo((x + ex) / 2 - nx, (y + ey) / 2 - ny, x, y)
      .fill(i % 2 ? darken(color, 0.1) : color);
  }
  return g;
}

/** Bald cypress: flared base, straight trunk, flat feathery crown. Origin at base. */
export function cypress(g: Graphics, x: number, y: number, size: number): Graphics {
  const trunk = 0x8b6b52;
  g.poly([x - size * 0.09, y, x - size * 0.03, y - size * 0.25, x - size * 0.025, y - size * 0.7, x + size * 0.025, y - size * 0.7, x + size * 0.03, y - size * 0.25, x + size * 0.09, y]).fill(trunk);
  const c = 0x6a9a58;
  g.ellipse(x, y - size * 0.72, size * 0.2, size * 0.1).fill(darken(c, 0.06));
  g.ellipse(x - size * 0.06, y - size * 0.86, size * 0.16, size * 0.09).fill(c);
  g.ellipse(x + size * 0.05, y - size * 0.98, size * 0.12, size * 0.07).fill(c);
  return g;
}

/** Live oak dripping with long Spanish moss (Savannah squares, Georgia coast). Origin at base. */
export function mossyOak(g: Graphics, x: number, y: number, size: number): Graphics {
  liveOak(g, x, y, size);
  for (let i = -5; i <= 5; i++) {
    const mx = x + i * size * 0.07;
    const len = size * (0.12 + ((i * 7 + 20) % 5) * 0.035);
    g.roundRect(mx - 2.5, y - size * 0.47, 5, len, 2.5).fill({ color: P.moss, alpha: 0.95 });
  }
  return g;
}
