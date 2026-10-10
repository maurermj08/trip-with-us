// Procedural parallax scenery. Back layers stay simple (the skyline is one flat haze color);
// all the detail lives in the near layer.
import { Container, Graphics } from 'pixi.js';
import { P, darken, lighten } from '../style/palette';
import { block, windowGrid, roundTree, pineTree, palmetto, liveOak, cloud, roundedTri, contactShadow, cornerRect } from '../style/shapes';
import { makeRng, range, pick, type Rng } from '../core/rng';
import { regionAt, type Region } from './Route';
import { ChunkLayer } from './ChunkLayer';

const isWater = (r: Region) => r === 'harbor' || r === 'marsh';

// ---------- Clouds ----------
export function cloudLayer(): ChunkLayer {
  return new ChunkLayer(0.06, 1600, (i, x0) => {
    const rng = makeRng(i * 7919 + 13);
    const g = new Graphics();
    const n = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      cloud(g, x0 + range(rng, 100, 1500), range(rng, -820, -420), range(rng, 150, 320), rng);
    }
    g.alpha = 0.92;
    return g;
  });
}

// ---------- Skyline (single pale haze color, no detail) ----------
export function skylineLayer(): ChunkLayer {
  const f = 0.2;
  return new ChunkLayer(f, 1400, (i, x0) => {
    const rng = makeRng(i * 104729 + 7);
    const g = new Graphics();
    const region = regionAt((x0 + 700) / f);
    const base = -150;
    // Soft rolling haze hills everywhere.
    const pts: number[] = [];
    for (let x = x0; x <= x0 + 1400; x += 50) {
      pts.push(x, base - 60 - 30 * Math.sin(x * 0.0023) - 18 * Math.sin(x * 0.0061 + 2));
    }
    pts.push(x0 + 1400, 600, x0, 600);
    g.poly(pts).fill(P.haze);
    if (region === 'town' || region === 'charleston' || region === 'harbor' || region === 'duckies') {
      let x = x0 + range(rng, 0, 80);
      while (x < x0 + 1400) {
        const w = range(rng, 50, 120);
        const h = range(rng, 90, region === 'town' ? 300 : 180);
        g.roundRect(x, base - h, w, h + 100, 6).fill(P.haze);
        if (region === 'charleston' && rng() < 0.3) {
          roundedTri(g, x + w / 2, base - h - 110, 26, 115, 4).fill(P.haze);
        }
        x += w + range(rng, 10, 90);
      }
    }
    return g;
  });
}

// ---------- Far hills ----------
export function farLayer(): ChunkLayer {
  const f = 0.45;
  return new ChunkLayer(f, 1200, (i, x0) => {
    const rng = makeRng(i * 31337 + 5);
    const g = new Graphics();
    const region = regionAt((x0 + 600) / f);
    const hillY = (x: number) => -130 - 40 * Math.sin(x * 0.0019) - 22 * Math.sin(x * 0.0051 + 1.3);
    if (isWater(region) || region === 'charleston') {
      const pts: number[] = [];
      for (let x = x0; x <= x0 + 1200; x += 60) pts.push(x, -110 - 12 * Math.sin(x * 0.003));
      pts.push(x0 + 1200, 600, x0, 600);
      g.poly(pts).fill(lighten(P.hill, 0.15));
      g.rect(x0, -95, 1200, 700).fill(lighten(P.water, 0.25));
      for (let k = 0; k < 6; k++) {
        g.roundRect(x0 + range(rng, 0, 1150), range(rng, -85, -40), range(rng, 20, 50), 3, 1.5).fill({ color: P.white, alpha: 0.5 });
      }
      return g;
    }
    const pts: number[] = [];
    for (let x = x0; x <= x0 + 1200; x += 40) pts.push(x, hillY(x));
    pts.push(x0 + 1200, 600, x0, 600);
    g.poly(pts).fill(P.hill);
    const n = region === 'farm' ? 5 : 14;
    for (let k = 0; k < n; k++) {
      const x = x0 + range(rng, 0, 1200);
      const r = range(rng, 12, 26);
      g.circle(x, hillY(x) + r * 0.4, r).fill(P.hillTree);
    }
    return g;
  });
}

// ---------- Near scenery (all the detail) ----------
const NEAR_BASE = -74;

export function nearLayer(): ChunkLayer {
  const f = 0.82;
  return new ChunkLayer(f, 900, (i, x0) => {
    const rng = makeRng(i * 7477 + 3);
    const c = new Container();
    const g = new Graphics();
    c.addChild(g);
    const region = regionAt((x0 + 450) / f);

    if (isWater(region)) {
      g.rect(x0, NEAR_BASE - 8, 900, 800).fill(P.water);
      for (let k = 0; k < 10; k++) {
        g.roundRect(x0 + range(rng, 0, 860), range(rng, NEAR_BASE, NEAR_BASE + 80), range(rng, 20, 60), 3, 1.5).fill({ color: P.white, alpha: 0.45 });
      }
    } else {
      g.rect(x0, NEAR_BASE - 4, 900, 800).fill(P.grassFar);
    }

    switch (region) {
      case 'suburb': suburb(g, x0, rng); break;
      case 'pines': pines(g, x0, rng); break;
      case 'farm': farm(g, x0, rng); break;
      case 'town': town(g, x0, rng); break;
      case 'duckies': for (let x = x0 + 100; x < x0 + 900; x += range(rng, 200, 400)) roundTree(g, x, NEAR_BASE, range(rng, 90, 140)); break;
      case 'lowcountry': lowcountry(g, x0, rng); break;
      case 'marsh': marsh(g, x0, rng); break;
      case 'harbor': harbor(g, x0, rng); break;
      case 'charleston': charlestonBack(g, x0, rng); break;
    }
    return c;
  });
}

function suburb(g: Graphics, x0: number, rng: Rng): void {
  let x = x0 + range(rng, 20, 80);
  while (x < x0 + 860) {
    if (rng() < 0.55) {
      const w = range(rng, 110, 160);
      house(g, x, NEAR_BASE, w, range(rng, 60, 85), pick(rng, [0xf4e3c3, 0xcfe3f0, 0xf6d3c8, 0xe3ecd2, 0xfdf3dc]), rng);
      x += w + range(rng, 30, 80);
    } else {
      roundTree(g, x + 40, NEAR_BASE, range(rng, 90, 150), rng() < 0.5 ? P.leaf : P.leafLight);
      x += range(rng, 80, 140);
    }
  }
}

export function house(g: Graphics, x: number, base: number, w: number, h: number, color: number, rng: Rng): void {
  contactShadow(g, x + w / 2, base, w * 1.05);
  block(g, x, base - h, w, h, color);
  const roofH = h * 0.55;
  const roofC = pick(rng, [0x7d6a64, 0x5f6b78, 0x8e5a4f, 0x6b6f5a]);
  g.moveTo(x - 8, base - h + 3)
    .lineTo(x + w * 0.5 - 6, base - h - roofH + 4)
    .quadraticCurveTo(x + w * 0.5, base - h - roofH - 1, x + w * 0.5 + 6, base - h - roofH + 4)
    .lineTo(x + w + 8, base - h + 3)
    .quadraticCurveTo(x + w + 9, base - h + 6, x + w + 5, base - h + 6)
    .lineTo(x - 5, base - h + 6)
    .quadraticCurveTo(x - 9, base - h + 6, x - 8, base - h + 3)
    .fill(roofC);
  // door + windows
  g.roundRect(x + w * 0.42, base - h * 0.55, w * 0.16, h * 0.55, 3).fill(darken(color, 0.35));
  for (const wx of [x + w * 0.12, x + w * 0.68]) {
    const lit = rng() < 0.2;
    g.roundRect(wx, base - h * 0.75, w * 0.18, h * 0.32, 3).fill(lit ? P.warmWindow : { color: P.white, alpha: 0.8 });
  }
}

function pines(g: Graphics, x0: number, rng: Rng): void {
  const items: [number, number, boolean][] = [];
  let x = x0 + range(rng, 0, 40);
  while (x < x0 + 900) {
    items.push([x, range(rng, 110, 230), rng() < 0.2]);
    x += range(rng, 35, 90);
  }
  // back row first (taller, darker), then front row
  for (const [px, s, round] of items) {
    if (round) roundTree(g, px, NEAR_BASE - 4, s * 0.7, P.leaf);
    else pineTree(g, px, NEAR_BASE - 4, s, rng() < 0.5 ? P.pine : P.pineLight);
  }
}

function farm(g: Graphics, x0: number, rng: Rng): void {
  // crop rows
  for (let k = 0; k < 3; k++) g.rect(x0, NEAR_BASE - 2 + k * 8, 900, 3).fill({ color: P.grassDark, alpha: 0.25 });
  const roll = rng();
  if (roll < 0.45) {
    const bx = x0 + range(rng, 80, 500);
    barn(g, bx, NEAR_BASE, rng);
    if (rng() < 0.7) silo(g, bx + 210, NEAR_BASE);
  }
  for (let k = 0; k < 4; k++) {
    const hx = x0 + range(rng, 0, 880);
    contactShadow(g, hx, NEAR_BASE + 2, 36);
    g.circle(hx, NEAR_BASE - 14, 16).fill(0xe2bf62);
    g.circle(hx - 4, NEAR_BASE - 17, 7).fill({ color: 0xf2d98a, alpha: 0.9 });
  }
  if (rng() < 0.7) roundTree(g, x0 + range(rng, 600, 880), NEAR_BASE, range(rng, 120, 170));
}

function barn(g: Graphics, x: number, base: number, rng: Rng): void {
  const w = 170, h = 95;
  const red = pick(rng, [0xc8463c, 0xbd3f39]);
  contactShadow(g, x + w / 2, base, w * 1.1);
  block(g, x, base - h, w, h, red, { landmark: true });
  // gambrel roof
  g.poly([x - 8, base - h + 2, x + 22, base - h - 40, x + w / 2, base - h - 62, x + w - 22, base - h - 40, x + w + 8, base - h + 2]).fill(0x7c4a3e);
  g.roundRect(x + w / 2 - 34, base - 62, 68, 62, 4).fill(0xf5efe3);
  g.roundRect(x + w / 2 - 28, base - 56, 56, 56, 3).fill(darken(red, 0.12));
  g.poly([x + w / 2 - 28, base - 56, x + w / 2 - 22, base - 56, x + w / 2 + 28, base - 6, x + w / 2 + 28, base]).fill(0xf5efe3);
  g.poly([x + w / 2 + 28, base - 56, x + w / 2 + 22, base - 56, x + w / 2 - 28, base - 6, x + w / 2 - 28, base]).fill(0xf5efe3);
  g.roundRect(x + w / 2 - 12, base - h - 30, 24, 22, 3).fill(0xf5efe3);
}

function silo(g: Graphics, x: number, base: number): void {
  const w = 44, h = 150;
  block(g, x, base - h, w, h, 0xd9dde2, { radius: 4 });
  g.ellipse(x + w / 2, base - h, w / 2 + 1, 20).fill(0xb8bec6);
  for (let y = base - h + 20; y < base; y += 18) g.rect(x, y, w, 2).fill({ color: P.black, alpha: 0.06 });
}

function town(g: Graphics, x0: number, rng: Rng): void {
  let x = x0 + range(rng, 0, 40);
  while (x < x0 + 880) {
    if (rng() < 0.18) {
      roundTree(g, x + 35, NEAR_BASE, range(rng, 80, 120));
      x += 80;
      continue;
    }
    const w = range(rng, 80, 170);
    const h = range(rng, 120, 320);
    const color = pick(rng, [0xe8d6c0, 0xd6c3b0, 0xc9d5df, 0xe3c7b6, 0xd8d0c4, 0xbfcbd6, 0xf0e2c8]);
    const top = NEAR_BASE - h;
    contactShadow(g, x + w / 2, NEAR_BASE, w);
    block(g, x, top, w, h, color);
    windowGrid(g, x + 8, top + 12, w - 16 - w * 0.06, h - 30, rng);
    if (rng() < 0.4 && w > 90) waterTower(g, x + range(rng, 18, w - 52), top, rng);
    x += w + range(rng, 4, 30);
  }
  if (rng() < 0.15) bigWaterTower(g, x0 + range(rng, 200, 700), NEAR_BASE);
}

/** Classic wooden rooftop water tank on stilts. */
function waterTower(g: Graphics, x: number, roof: number, rng: Rng): void {
  const w = 34, legH = 16, tankH = 36;
  const wood = pick(rng, [0xa47a52, 0x9a7458, 0x8f6c4e]);
  g.rect(x + 4, roof - legH, 3, legH).fill(0x5d5a58);
  g.rect(x + w - 7, roof - legH, 3, legH).fill(0x5d5a58);
  g.rect(x + 2, roof - legH * 0.6, w - 4, 2).fill(0x5d5a58);
  block(g, x, roof - legH - tankH, w, tankH, wood, { radius: 3 });
  g.rect(x, roof - legH - tankH * 0.35, w, 2).fill({ color: P.black, alpha: 0.18 });
  g.rect(x, roof - legH - tankH * 0.7, w, 2).fill({ color: P.black, alpha: 0.18 });
  roundedTri(g, x + w / 2, roof - legH - tankH - 18, w + 6, 20, 3).fill(darken(wood, 0.2));
}

function bigWaterTower(g: Graphics, x: number, base: number): void {
  for (const lx of [-30, -10, 10, 30]) g.rect(x + lx - 2, base - 170, 4, 170).fill(0x9aa3ad);
  g.rect(x - 34, base - 90, 68, 3).fill(0x9aa3ad);
  g.ellipse(x, base - 190, 52, 38).fill(0xd8e4ee);
  g.ellipse(x + 18, base - 190, 26, 34).fill({ color: P.black, alpha: 0.06 });
  g.ellipse(x - 14, base - 214, 22, 6).fill({ color: P.white, alpha: 0.45 });
}

function lowcountry(g: Graphics, x0: number, rng: Rng): void {
  let x = x0 + range(rng, 0, 60);
  while (x < x0 + 900) {
    const r = rng();
    if (r < 0.45) {
      palmetto(g, x, NEAR_BASE, range(rng, 140, 220), range(rng, -0.4, 0.4));
      x += range(rng, 50, 110);
    } else if (r < 0.75) {
      liveOak(g, x + 60, NEAR_BASE, range(rng, 140, 200));
      x += range(rng, 150, 220);
    } else {
      pineTree(g, x, NEAR_BASE, range(rng, 150, 220));
      x += range(rng, 40, 80);
    }
  }
}

function marshGrass(g: Graphics, x: number, base: number, w: number): void {
  for (let k = 0; k < w; k += 7) {
    const h = 14 + ((k * 37) % 13);
    g.roundRect(x + k, base - h, 4, h, 2).fill(k % 14 ? 0xb3c46a : 0x9fb35c);
  }
}

function marsh(g: Graphics, x0: number, rng: Rng): void {
  let x = x0;
  while (x < x0 + 900) {
    const w = range(rng, 120, 260);
    g.roundRect(x, NEAR_BASE - 4, w, 30, 10).fill(0xa7c46c);
    marshGrass(g, x + 6, NEAR_BASE + 2, w - 12);
    if (rng() < 0.5) palmetto(g, x + w * 0.5, NEAR_BASE - 2, range(rng, 130, 190), range(rng, -0.3, 0.3));
    if (rng() < 0.25) egret(g, x + w * 0.8, NEAR_BASE + 4);
    x += w + range(rng, 40, 160);
  }
}

function egret(g: Graphics, x: number, base: number): void {
  g.rect(x - 1, base - 18, 2, 18).fill(0x333333);
  g.ellipse(x, base - 24, 12, 7).fill(P.white);
  g.roundRect(x + 6, base - 42, 3, 18, 1.5).fill(P.white);
  g.circle(x + 8, base - 43, 4).fill(P.white);
  g.poly([x + 11, base - 44, x + 20, base - 42, x + 11, base - 41]).fill(0xf2c14e);
}

function harbor(g: Graphics, x0: number, rng: Rng): void {
  if (rng() < 0.8) sailboat(g, x0 + range(rng, 100, 800), NEAR_BASE + range(rng, 10, 50), range(rng, 0.7, 1.1), rng);
}

export function sailboat(g: Graphics, x: number, y: number, s: number, rng: Rng): void {
  const hull = pick(rng, [0xffffff, 0x2f4d7a, 0xd8392b]);
  cornerRect(g, x - 40 * s, y - 10 * s, 80 * s, 12 * s, 2, 2, 8 * s, 8 * s).fill(hull);
  g.rect(x - 1.5 * s, y - 90 * s, 3 * s, 80 * s).fill(0x7c6a5a);
  g.poly([x + 3 * s, y - 88 * s, x + 3 * s, y - 14 * s, x + 38 * s, y - 14 * s]).fill(0xfdfbf5);
  g.poly([x - 3 * s, y - 70 * s, x - 3 * s, y - 14 * s, x - 30 * s, y - 14 * s]).fill(0xf3efe4);
}

function charlestonBack(g: Graphics, x0: number, rng: Rng): void {
  let x = x0 + range(rng, 0, 40);
  while (x < x0 + 880) {
    if (rng() < 0.3) {
      palmetto(g, x + 20, NEAR_BASE, range(rng, 150, 210), range(rng, -0.3, 0.3));
      x += 60;
      continue;
    }
    const w = range(rng, 70, 120), h = range(rng, 110, 190);
    const color = pick(rng, P.rainbow);
    block(g, x, NEAR_BASE - h, w, h, color);
    windowGrid(g, x + 8, NEAR_BASE - h + 12, w - 22, h - 26, rng);
    x += w + range(rng, 2, 20);
  }
}

// ---------- Foreground (in front of the road, moves faster for depth) ----------
export function foregroundLayer(): ChunkLayer {
  const f = 1.25;
  return new ChunkLayer(f, 1000, (i, x0) => {
    const rng = makeRng(i * 6151 + 17);
    const g = new Graphics();
    const region = regionAt((x0 + 500) / f);
    let x = x0 + range(rng, 0, 200);
    while (x < x0 + 1000) {
      const y = range(rng, 215, 250);
      if (region === 'harbor') {
        // reeds poking up from the water's edge
        for (let k = 0; k < 6; k++) g.roundRect(x + k * 7, y - 30 - (k % 3) * 8, 4, 40 + (k % 3) * 8, 2).fill(k % 2 ? 0xa7b85f : 0x93a653);
      } else if (rng() < 0.55) {
        bush(g, x, y, range(rng, 50, 90), region === 'charleston' ? 0x5c9d55 : P.grassDark);
      } else {
        // wildflower clump
        const col = pick(rng, [0xfff27a, 0xffffff, 0xf7a7c0, 0xc5a3ff, 0xffb36b]);
        for (let k = 0; k < 5; k++) {
          const fx = x + k * 11 - 22, fy = y - 18 - ((k * 7) % 12);
          g.roundRect(fx - 1.5, fy, 3, y - fy, 1.5).fill(P.grassDark);
          g.circle(fx, fy, 6).fill(col);
          g.circle(fx, fy, 2.4).fill(0xf2b33d);
        }
      }
      x += range(rng, 220, 480);
    }
    return g;
  });
}

function bush(g: Graphics, x: number, y: number, w: number, c: number): void {
  g.circle(x - w * 0.25, y - w * 0.22, w * 0.3).fill(c);
  g.circle(x + w * 0.25, y - w * 0.2, w * 0.28).fill(darken(c, 0.06));
  g.circle(x, y - w * 0.36, w * 0.34).fill(c);
  g.circle(x - w * 0.12, y - w * 0.5, w * 0.12).fill({ color: P.white, alpha: 0.12 });
  g.rect(x - w * 0.5, y - w * 0.2, w, w * 0.4).fill(c);
}
