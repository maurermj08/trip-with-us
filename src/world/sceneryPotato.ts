// Scenery for the Potato World region (near, far and the skyline). Scenery.ts calls these from
// its region switches; everything is deterministic from the chunk's rng.
import type { Graphics } from 'pixi.js';
import type { Rng } from '../core/rng';
import { P, darken, lerpColor } from '../style/palette';
import { contactShadow } from '../style/shapes';

const range = (rng: Rng, a: number, b: number) => a + (b - a) * rng();
const pick = <T,>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)];

const HEDGE = 0x6cbf66;
const HEDGE_DARK = 0x5aa857;
const BLOOMS = [0xff8fb1, 0xffd166, 0xffffff, 0xc5a3ff, 0xff8a7a];
const PASTEL = [0xf7c9dc, 0xd6c6f4, 0xbfe9d6, 0xc4e3f7, 0xfff3de];
const ROOF = 0xd59a52;

/** Near layer (parallax 0.82): hedges, topiary, flower beds, little pavilions and lamp posts. */
export function potatoNear(g: Graphics, x0: number, rng: Rng, base: number): void {
  // a manicured hedge running the length of the park, with a scalloped top
  g.roundRect(x0 - 4, base - 30, 908, 34, 10).fill(HEDGE_DARK);
  for (let x = x0; x <= x0 + 900; x += 30) g.circle(x, base - 30, 17).fill(HEDGE);
  let x = x0 + range(rng, 20, 80);
  while (x < x0 + 880) {
    const r = rng();
    if (r < 0.3) {
      // topiary ball on a stem
      const s = range(rng, 0.8, 1.2);
      g.roundRect(x - 3, base - 70 * s, 6, 44 * s, 3).fill(0x8a6a4a);
      g.circle(x, base - 82 * s, 26 * s).fill(HEDGE);
      g.circle(x + 8 * s, base - 76 * s, 16 * s).fill({ color: HEDGE_DARK, alpha: 0.6 });
      g.circle(x - 8 * s, base - 92 * s, 6 * s).fill({ color: P.white, alpha: 0.25 });
      x += range(rng, 70, 120);
    } else if (r < 0.55) {
      // a round flower bed bursting over the hedge
      const w = range(rng, 70, 120);
      for (let k = 0; k < 9; k++) g.circle(x + (k / 8) * w, base - 34 - ((k * 7) % 3) * 6, 7).fill(pick(rng, BLOOMS));
      x += w + range(rng, 30, 60);
    } else if (r < 0.75) {
      // a little pastel pavilion with a potato-dome roof
      const w = range(rng, 70, 100);
      const h = range(rng, 60, 80);
      const c = pick(rng, PASTEL);
      contactShadow(g, x + w / 2, base, w);
      g.roundRect(x, base - h, w, h, 6).fill(c);
      g.rect(x + w * 0.72, base - h, w * 0.28, h).fill(darken(c, 0.07));
      g.roundRect(x + w * 0.35, base - h * 0.6, w * 0.3, h * 0.6, w * 0.15).fill(darken(c, 0.25));
      // a small potato-dome roof on a gold collar, with a finial
      const rx = x + w / 2, rr = w * 0.3, ry = base - h;
      g.moveTo(rx - rr, ry).bezierCurveTo(rx - rr * 1.1, ry - rr * 0.8, rx - rr * 0.5, ry - rr * 1.3, rx, ry - rr * 1.3)
        .bezierCurveTo(rx + rr * 0.5, ry - rr * 1.3, rx + rr * 1.1, ry - rr * 0.8, rx + rr, ry).closePath().fill(ROOF);
      g.ellipse(rx + rr * 0.1, ry - rr * 0.7, rr * 0.06, rr * 0.05).fill(darken(ROOF, 0.25));
      g.ellipse(rx - rr * 0.4, ry - rr * 0.8, rr * 0.12, rr * 0.25).fill({ color: P.white, alpha: 0.3 });
      g.roundRect(rx - rr * 1.05, ry - 3, rr * 2.1, 7, 3.5).fill(0xf2c14e);
      g.roundRect(rx - 1.5, ry - rr * 1.3 - 12, 3, 14, 1.5).fill(0xf2c14e);
      x += w + range(rng, 40, 90);
    } else {
      // ornate lamp post
      g.roundRect(x - 3, base - 110, 6, 110, 3).fill(0x6248ad);
      g.roundRect(x - 10, base - 126, 20, 20, 7).fill(0xfff3de);
      g.ellipse(x, base - 128, 12, 6).fill(0x6248ad);
      x += range(rng, 60, 110);
    }
  }
}

/** Far layer (0.45): pastel blossom trees on the hills and distant ride silhouettes. */
export function potatoFar(g: Graphics, x0: number, rng: Rng, hillY: (x: number) => number): void {
  const soft = (c: number) => lerpColor(c, P.hill, 0.45);
  for (let k = 0; k < 10; k++) {
    const x = x0 + range(rng, 0, 1200);
    const r = range(rng, 12, 22);
    g.circle(x, hillY(x) + r * 0.4, r).fill(soft(pick(rng, [0xf7c9dc, 0xd6c6f4, P.hillTree, P.hillTree])));
  }
  const kind = rng();
  const x = x0 + range(rng, 200, 1000);
  const y = hillY(x) + 6;
  const c = lerpColor(0xd6c6f4, P.hill, 0.35);
  if (kind < 0.35) {
    // a distant wheel
    const r = range(rng, 50, 70);
    g.poly([x - r * 0.6, y, x - 4, y - r - 10, x + 4, y - r - 10, x + r * 0.6, y]).fill(c);
    g.circle(x, y - r - 10, r).stroke({ width: 5, color: c });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI;
      g.moveTo(x - Math.cos(a) * r, y - r - 10 - Math.sin(a) * r).lineTo(x + Math.cos(a) * r, y - r - 10 + Math.sin(a) * r).stroke({ width: 2, color: c });
    }
  } else if (kind < 0.7) {
    // a roller coaster's humps on stilts
    const w = range(rng, 220, 320);
    const top = (u: number) => y - 40 - 50 * Math.abs(Math.sin(u * Math.PI * 1.5));
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      g.rect(x + u * w - 1.5, top(u), 3, y - top(u)).fill(c);
    }
    let first = true;
    for (let k = 0; k <= 40; k++) {
      const u = k / 40;
      if (first) g.moveTo(x + u * w, top(u));
      else g.lineTo(x + u * w, top(u));
      first = false;
    }
    g.stroke({ width: 5, color: c });
  } else {
    // a far-off turret with a dome
    g.roundRect(x - 14, y - 90, 28, 90, 4).fill(c);
    g.ellipse(x, y - 90, 20, 26).fill(lerpColor(ROOF, P.hill, 0.4));
    g.roundRect(x - 1.5, y - 130, 3, 18, 1.5).fill(c);
  }
}

/**
 * Skyline (0.2, single haze color): castle turrets, a wheel, a coaster or low park roofs at x.
 * `a`, `b` are the two per-building random draws; returns the width used.
 */
export function potatoSkyline(g: Graphics, x: number, base: number, a: number, b: number, haze: number): number {
  if (a < 0.22) {
    // castle cluster: three turrets with rounded domes and spires
    const w = 90 + 40 * b;
    g.roundRect(x, base - 70, w, 170, 6).fill(haze);
    for (const [fx, h, r] of [[0.18, 120, 13], [0.5, 170, 18], [0.82, 120, 13]] as const) {
      const tx = x + fx * w;
      g.roundRect(tx - r, base - h, r * 2, h, 4).fill(haze);
      g.ellipse(tx, base - h, r * 1.3, r * 1.7).fill(haze);
      g.poly([tx - 2, base - h - r * 1.5, tx, base - h - r * 2.6, tx + 2, base - h - r * 1.5]).fill(haze);
    }
    return w;
  }
  if (a < 0.4) {
    // a big wheel
    const r = 55 + 30 * b;
    const cy = base - r - 30;
    g.poly([x + r - r * 0.6, base + 100, x + r - 3, cy, x + r + 3, cy, x + r + r * 0.6, base + 100]).fill(haze);
    g.circle(x + r, cy, r).stroke({ width: 6, color: haze });
    g.circle(x + r, cy, r * 0.5).stroke({ width: 3, color: haze });
    return r * 2;
  }
  if (a < 0.55) {
    // coaster humps
    const w = 140 + 80 * b;
    const top = (u: number) => base - 50 - 60 * Math.abs(Math.sin(u * Math.PI * 1.5));
    for (let k = 0; k <= 6; k++) g.rect(x + (k / 6) * w - 2, top(k / 6), 4, base + 100 - top(k / 6)).fill(haze);
    for (let k = 0; k <= 30; k++) {
      const u = k / 30;
      if (k === 0) g.moveTo(x + u * w, top(u));
      else g.lineTo(x + u * w, top(u));
    }
    g.stroke({ width: 6, color: haze });
    return w;
  }
  // low park roofs with the odd dome
  const w = 60 + 70 * a;
  const h = 40 + 50 * b;
  g.roundRect(x, base - h, w, h + 100, 6).fill(haze);
  if (b > 0.5) g.ellipse(x + w / 2, base - h, w * 0.3, 22).fill(haze);
  return w;
}
