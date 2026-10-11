// Drawing helpers for Potato World: the park palette, a friendly spud (no face), potato-dome
// turret roofs, pennants and scalloped awnings. Pure drawing, no props.
import type { Graphics } from 'pixi.js';
import { P, darken, lighten } from '../../style/palette';

/** Pastel park palette. */
export const PARK = {
  pink: 0xf7c9dc,
  pinkShade: 0xe9b2c9,
  lavender: 0xd6c6f4,
  lavenderShade: 0xc2aeea,
  mint: 0xbfe9d6,
  mintShade: 0xa4dbc3,
  cream: 0xfff3de,
  creamShade: 0xf1e1c4,
  sky: 0xc4e3f7,
  gold: 0xf2c14e,
  goldShade: 0xd9a531,
  purple: 0x7b5cc4,
  purpleDark: 0x6248ad,
  teal: 0x2aa7a0,
  coral: 0xff8a7a,
  spud: 0xd6a066,
  spudShade: 0xbf8a52,
  spudSpot: 0xa8743f,
  roof: 0xd59a52,
  roofShade: 0xbd8240,
  leaf: 0x5fae5a,
  leafDark: 0x4c9a4a,
};

/**
 * A lumpy potato shape (one path) centred on (x, y), w × h, with a soft shade, eye-spots
 * (dimples, never a face) and a highlight.
 */
export function spud(g: Graphics, x: number, y: number, w: number, h: number, color: number = PARK.spud, spots = true): Graphics {
  const pts: number[] = [];
  const n = 28;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    // gentle lumps so it reads as a potato, not an egg
    const r = 1 + 0.06 * Math.sin(a * 3 + 0.6) + 0.035 * Math.sin(a * 5 + 1.7);
    pts.push(x + Math.cos(a) * (w / 2) * r, y + Math.sin(a) * (h / 2) * r);
  }
  g.poly(pts).fill(color);
  // right-side shade (light from the left)
  g.ellipse(x + w * 0.16, y + h * 0.08, w * 0.3, h * 0.36).fill({ color: darken(color, 0.12), alpha: 0.55 });
  if (spots) {
    for (const [dx, dy] of [[-0.24, -0.12], [0.06, -0.26], [0.22, 0.12], [-0.08, 0.22]]) {
      g.ellipse(x + dx * w, y + dy * h, Math.max(1.5, w * 0.03), Math.max(1.2, h * 0.035)).fill(darken(color, 0.25));
    }
  }
  g.ellipse(x - w * 0.18, y - h * 0.24, w * 0.16, h * 0.1).fill({ color: P.white, alpha: 0.3 });
  return g;
}

/**
 * A potato-dome turret roof: a tall rounded dome (golden-brown, lumpy like a spud) sitting on a
 * collar, with a gold finial. Base centre at (x, y), radius r. Returns the finial top y.
 */
export function potatoDome(g: Graphics, x: number, y: number, r: number, color: number = PARK.roof): number {
  const h = r * 1.35;
  // dome as one path: base corners, bulging sides, rounded top
  g.moveTo(x - r, y)
    .bezierCurveTo(x - r * 1.12, y - h * 0.55, x - r * 0.55, y - h, x, y - h)
    .bezierCurveTo(x + r * 0.55, y - h, x + r * 1.12, y - h * 0.55, x + r, y)
    .closePath()
    .fill(color);
  // shade on the right 28%
  g.moveTo(x + r * 0.44, y - h * 0.9)
    .bezierCurveTo(x + r * 0.9, y - h * 0.75, x + r * 1.1, y - h * 0.4, x + r, y)
    .lineTo(x + r * 0.5, y)
    .bezierCurveTo(x + r * 0.62, y - h * 0.4, x + r * 0.6, y - h * 0.7, x + r * 0.44, y - h * 0.9)
    .fill(darken(color, 0.1));
  // potato eye-spots and a highlight
  for (const [dx, dy] of [[-0.45, 0.35], [0.1, 0.62], [0.42, 0.3], [-0.12, 0.2]]) {
    g.ellipse(x + dx * r, y - dy * h, r * 0.06, r * 0.045).fill(darken(color, 0.24));
  }
  g.ellipse(x - r * 0.42, y - h * 0.62, r * 0.14, r * 0.3).fill({ color: P.white, alpha: 0.3 });
  // collar
  g.roundRect(x - r * 1.08, y - 4, r * 2.16, 10, 5).fill(PARK.gold);
  // finial
  g.roundRect(x - 2.5, y - h - r * 0.42, 5, r * 0.46, 2.5).fill(PARK.gold);
  g.circle(x, y - h - r * 0.44, Math.max(4, r * 0.11)).fill(PARK.gold);
  return y - h - r * 0.5;
}

/** A small triangular pennant on a pole; origin at the pole top. */
export function pennant(g: Graphics, len: number, color: number, pole = 0): Graphics {
  if (pole > 0) g.roundRect(-1.5, 0, 3, pole, 1.5).fill(PARK.goldShade);
  g.moveTo(1, 2).quadraticCurveTo(len * 0.5, 4, len, len * 0.22 + 2).quadraticCurveTo(len * 0.5, len * 0.36 + 4, 1, len * 0.46 + 2).closePath().fill(color);
  return g;
}

/** Scalloped, striped awning: a band from (x, y) w wide, h tall with round drops. */
export function awning(g: Graphics, x: number, y: number, w: number, h: number, a: number, b: number): Graphics {
  const n = Math.max(3, Math.round(w / 34));
  const sw = w / n;
  for (let k = 0; k < n; k++) {
    const c = k % 2 ? b : a;
    g.rect(x + k * sw, y, sw + 0.5, h).fill(c);
    g.circle(x + k * sw + sw / 2, y + h, sw / 2).fill(c);
  }
  g.rect(x, y, w, 4).fill({ color: P.white, alpha: 0.35 });
  return g;
}

/** Arched window (rounded top) with a light frame. */
export function archWindow(g: Graphics, x: number, y: number, w: number, h: number, glass: number, frame: number = P.white): Graphics {
  g.roundRect(x - 3, y - 3, w + 6, h + 6, w / 2 + 3).fill(frame);
  g.roundRect(x, y, w, h, w / 2).fill(glass);
  g.roundRect(x + w * 0.18, y + h * 0.18, w * 0.18, h * 0.5, w * 0.09).fill({ color: P.white, alpha: 0.35 });
  return g;
}

/** Rounded crenellations along a wall top from x to x+w at y. */
export function merlons(g: Graphics, x: number, y: number, w: number, color: number, size = 22): Graphics {
  const n = Math.max(2, Math.round(w / (size * 1.6)));
  const step = w / n;
  for (let k = 0; k < n; k++) g.roundRect(x + k * step + step * 0.18, y - size, step * 0.64, size + 4, 5).fill(color);
  return g;
}

/** A lighter tint for highlights on pastel walls. */
export const pale = (c: number) => lighten(c, 0.35);
