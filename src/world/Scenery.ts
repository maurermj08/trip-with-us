// Procedural parallax scenery. Back layers stay simple (the skyline is one flat haze color);
// all the detail lives in the near layer.
import { Container, Graphics } from 'pixi.js';
import { P, darken, lighten } from '../style/palette';
import {
  block, windowGrid, roundTree, pineTree, palmetto, liveOak, cloud, roundedTri, contactShadow, cornerRect,
  longleafPine, sawPalmetto, cypress, mossyOak,
} from '../style/shapes';
import { makeRng, range, pick, type Rng } from '../core/rng';
import { AIRPORTS, CITIES, WATER_REGIONS, regionAt, skylineAt, type Region, type SkylineStyle } from './Route';
import { ChunkLayer } from './ChunkLayer';

const isWater = (r: Region) => WATER_REGIONS.has(r);

/** The Home → Charleston regions keep their original (pre-Phase 3) generators exactly. */
const LEG1 = new Set<Region>(['suburb', 'pines', 'farm', 'town', 'duckies', 'lowcountry', 'marsh', 'harbor', 'charleston']);

/** Florida is flat: 0 up to the Georgia coast, easing to 1 across the state line. */
function flatness(worldX: number): number {
  const t = Math.max(0, Math.min(1, (worldX - 210000) / 16000));
  return t * t * (3 - 2 * t);
}

const cityX0 = (id: string) => CITIES.find((c) => c.id === id)!.x0;

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
// The style is picked per building with skylineAt(), so a city's silhouette only rises where
// that city is near, never over the farmland next to it.

/** Landmark silhouettes at fixed world x (drawn into whichever chunks they overlap). */
type SkyMark = 'dome' | 'twin-spires' | 'crown-tower' | 'slab-tower' | 'wheel' | 'spire-tower' | 'control-tower';
const SKY_MARKS: [number, SkyMark][] = [
  [cityX0('savannah') + 1800, 'dome'],
  [cityX0('savannah') + 3300, 'twin-spires'],
  [cityX0('jacksonville') + 1400, 'crown-tower'],
  [cityX0('jacksonville') + 2500, 'slab-tower'],
  [cityX0('jacksonville') + 3700, 'crown-tower'],
  [cityX0('orlando') + 1300, 'spire-tower'],
  [cityX0('orlando') + 3200, 'wheel'],
  ...AIRPORTS.map((a): [number, SkyMark] => [a.x0 + a.len * 0.45, 'control-tower']),
];

function skyMark(g: Graphics, kind: SkyMark, x: number, base: number): void {
  const c = P.haze;
  switch (kind) {
    case 'dome':
      g.roundRect(x - 60, base - 150, 120, 250, 6).fill(c);
      g.roundRect(x - 34, base - 196, 68, 50, 4).fill(c);
      g.ellipse(x, base - 196, 34, 38).fill(c);
      g.roundRect(x - 6, base - 252, 12, 26, 4).fill(c);
      break;
    case 'twin-spires':
      g.roundRect(x - 70, base - 130, 140, 230, 6).fill(c);
      for (const dx of [-48, 48]) {
        g.roundRect(x + dx - 16, base - 210, 32, 90, 4).fill(c);
        roundedTri(g, x + dx, base - 300, 30, 94, 4).fill(c);
      }
      roundedTri(g, x, base - 186, 100, 60, 4).fill(c);
      break;
    case 'crown-tower':
      g.roundRect(x - 44, base - 310, 88, 410, 6).fill(c);
      g.roundRect(x - 33, base - 342, 66, 36, 4).fill(c);
      g.roundRect(x - 22, base - 368, 44, 30, 4).fill(c);
      g.roundRect(x - 12, base - 388, 24, 24, 4).fill(c);
      g.roundRect(x - 2, base - 420, 4, 36, 2).fill(c);
      break;
    case 'slab-tower':
      g.roundRect(x - 56, base - 280, 112, 380, 6).fill(c);
      g.roundRect(x - 34, base - 298, 68, 22, 4).fill(c);
      break;
    case 'spire-tower':
      g.roundRect(x - 44, base - 330, 88, 430, 6).fill(c);
      g.poly([x - 44, base - 328, x + 44, base - 372, x + 44, base - 320]).fill(c);
      g.roundRect(x + 30, base - 430, 5, 64, 2).fill(c);
      break;
    case 'wheel': {
      const r = 120, cy = base - 150;
      g.circle(x, cy, r).stroke({ width: 7, color: c });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        g.moveTo(x, cy).lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r).stroke({ width: 2.5, color: c });
        g.roundRect(x + Math.cos(a) * r - 9, cy + Math.sin(a) * r - 4, 18, 18, 5).fill(c);
      }
      g.poly([x - 6, cy, x + 6, cy, x + 70, base + 40, x + 54, base + 40]).fill(c);
      g.poly([x - 6, cy, x + 6, cy, x - 54, base + 40, x - 70, base + 40]).fill(c);
      g.circle(x, cy, 14).fill(c);
      break;
    }
    case 'control-tower':
      g.poly([x - 11, base + 40, x - 7, base - 110, x + 7, base - 110, x + 11, base + 40]).fill(c);
      g.roundRect(x - 24, base - 136, 48, 30, 7).fill(c);
      g.roundRect(x - 18, base - 148, 36, 14, 5).fill(c);
      g.roundRect(x - 1.5, base - 168, 3, 22, 1.5).fill(c);
      break;
  }
}

export function skylineLayer(): ChunkLayer {
  const f = 0.2;
  return new ChunkLayer(f, 1400, (i, x0) => {
    const rng = makeRng(i * 104729 + 7);
    const g = new Graphics();
    const base = -150;
    // Soft rolling haze hills everywhere (flattening out in Florida).
    const pts: number[] = [];
    for (let x = x0; x <= x0 + 1400; x += 50) {
      const t = flatness(x / f);
      pts.push(x, base - 60 * (1 - 0.5 * t) - (30 * Math.sin(x * 0.0023) + 18 * Math.sin(x * 0.0061 + 2)) * (1 - 0.8 * t));
    }
    pts.push(x0 + 1400, 600, x0, 600);
    g.poly(pts).fill(P.haze);
    let x = x0 + range(rng, 0, 80);
    while (x < x0 + 1400) {
      const style: SkylineStyle = skylineAt(x / f);
      // Two draws per building in every style, so each city keeps its own deterministic layout.
      const a = rng(), b = rng();
      let w = 50 + 70 * a;
      switch (style) {
        case 'town':
          g.roundRect(x, base - (90 + 210 * b), w, 90 + 210 * b + 100, 6).fill(P.haze);
          break;
        case 'charleston': {
          const h = 90 + 90 * b;
          g.roundRect(x, base - h, w, h + 100, 6).fill(P.haze);
          if (rng() < 0.3) roundedTri(g, x + w / 2, base - h - 110, 26, 115, 4).fill(P.haze);
          break;
        }
        case 'savannah': {
          // Low and even: brick warehouses and rooflines under the oaks.
          w = 70 + 80 * a;
          const h = 50 + 70 * b;
          g.roundRect(x, base - h, w, h + 100, 6).fill(P.haze);
          break;
        }
        case 'jacksonville': {
          w = 45 + 65 * a;
          const h = 110 + 170 * b;
          g.roundRect(x, base - h, w, h + 100, 6).fill(P.haze);
          if (b > 0.65) g.roundRect(x + w * 0.2, base - h - 30, w * 0.6, 34, 4).fill(P.haze);
          break;
        }
        case 'orlando': {
          w = 45 + 60 * a;
          const h = 90 + 160 * b;
          g.roundRect(x, base - h, w, h + 100, 6).fill(P.haze);
          if (b > 0.55) g.poly([x, base - h + 2, x + w, base - h - 24, x + w, base - h + 2]).fill(P.haze);
          break;
        }
        case 'airport':
          // Long low terminal and hangar roofs.
          if (a < 0.5) {
            w = 120 + 140 * b;
            g.roundRect(x, base - 34, w, 134, 6).fill(P.haze);
            g.ellipse(x + w / 2, base - 34, w / 2, 16).fill(P.haze);
          }
          break;
        default:
          break;
      }
      x += w + range(rng, 10, 90);
    }
    for (const [wx, kind] of SKY_MARKS) {
      const lx = wx * f;
      if (lx > x0 - 160 && lx < x0 + 1400 + 160) skyMark(g, kind, lx, base);
    }
    return g;
  });
}

// ---------- Far hills ----------
/** Cities that sit on a river: the far layer shows the water and the far bank. */
const RIVER_CITY = new Set<Region>(['charleston', 'savannah', 'jacksonville']);

export function farLayer(): ChunkLayer {
  const f = 0.45;
  return new ChunkLayer(f, 1200, (i, x0) => {
    const rng = makeRng(i * 31337 + 5);
    const g = new Graphics();
    const region = regionAt((x0 + 600) / f);
    const flat = (x: number) => 1 - 0.8 * flatness(x / f);
    const hillY = (x: number) => -130 + 30 * (1 - flat(x)) - (40 * Math.sin(x * 0.0019) + 22 * Math.sin(x * 0.0051 + 1.3)) * flat(x);
    if (isWater(region) || RIVER_CITY.has(region)) {
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
    if (LEG1.has(region)) {
      const n = region === 'farm' ? 5 : 14;
      for (let k = 0; k < n; k++) {
        const x = x0 + range(rng, 0, 1200);
        const r = range(rng, 12, 26);
        g.circle(x, hillY(x) + r * 0.4, r).fill(P.hillTree);
      }
      return g;
    }
    farFlorida(g, x0, region, rng, hillY);
    return g;
  });
}

/** Far-layer silhouettes for the Phase 3 regions (all in the soft hill-tree green). */
function farFlorida(g: Graphics, x0: number, region: Region, rng: Rng, hillY: (x: number) => number): void {
  const c = P.hillTree;
  switch (region) {
    case 'flatwoods':
    case 'gaCoast':
      // tall thin pines on the horizon
      for (let k = 0; k < 16; k++) {
        const x = x0 + range(rng, 0, 1200), y = hillY(x) + 6, h = range(rng, 40, 80);
        g.rect(x - 1.5, y - h, 3, h).fill(c);
        g.ellipse(x, y - h, range(rng, 9, 14), 7).fill(c);
      }
      break;
    case 'citrus':
      // neat grove rows
      for (let x = x0 + 20; x < x0 + 1200; x += 34) {
        const y = hillY(x);
        g.circle(x, y + 6, 13).fill(darken(c, 0.06));
        g.circle(x + 17, y + 14, 12).fill(c);
      }
      break;
    case 'pasture':
      for (let k = 0; k < 6; k++) {
        const x = x0 + range(rng, 0, 1200);
        palmetto(g, x, hillY(x) + 8, range(rng, 50, 80), range(rng, -0.3, 0.3), c);
      }
      for (let k = 0; k < 3; k++) {
        const x = x0 + range(rng, 0, 1200);
        g.ellipse(x, hillY(x) + 4, 30, 16).fill(c);
      }
      break;
    case 'lakes': {
      const lx = x0 + range(rng, 0, 500);
      g.roundRect(lx, hillY(lx) + 8, range(rng, 400, 700), 26, 13).fill(lighten(P.water, 0.25));
      for (let k = 0; k < 10; k++) {
        const x = x0 + range(rng, 0, 1200);
        cypressSilhouette(g, x, hillY(x) + 8, range(rng, 40, 70), c);
      }
      break;
    }
    case 'airport':
      for (let k = 0; k < 4; k++) {
        const x = x0 + range(rng, 0, 1200);
        g.circle(x, hillY(x) + 6, range(rng, 10, 18)).fill(c);
      }
      break;
    default:
      // suburbs and downtowns: rooftops and treetops
      for (let k = 0; k < 10; k++) {
        const x = x0 + range(rng, 0, 1200);
        if (rng() < 0.35) palmetto(g, x, hillY(x) + 8, range(rng, 50, 70), range(rng, -0.2, 0.2), c);
        else g.circle(x, hillY(x) + 6, range(rng, 12, 22)).fill(c);
      }
  }
}

function cypressSilhouette(g: Graphics, x: number, y: number, h: number, c: number): void {
  g.poly([x - h * 0.08, y, x - h * 0.02, y - h * 0.7, x + h * 0.02, y - h * 0.7, x + h * 0.08, y]).fill(c);
  g.ellipse(x, y - h * 0.75, h * 0.2, h * 0.12).fill(c);
  g.ellipse(x, y - h * 0.92, h * 0.13, h * 0.09).fill(c);
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
      case 'port': port(g, x0, rng); break;
      case 'savannah': savannahBack(g, x0, rng); break;
      case 'gaCoast': gaCoast(g, x0, rng); break;
      case 'river': river(g, x0, rng); break;
      case 'jacksonville': downtown(g, x0, rng, JAX_GLASS, 160, 380); break;
      case 'flatwoods': flatwoods(g, x0, rng); break;
      case 'citrus': citrus(g, x0, rng); break;
      case 'pasture': pasture(g, x0, rng); break;
      case 'lakes': lakes(g, x0, rng); break;
      case 'airport': airportBack(g, x0, rng); break;
      case 'floridaSuburb': floridaSuburb(g, x0, rng); break;
      case 'orlando': downtown(g, x0, rng, ORLANDO_GLASS, 150, 340); break;
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
    // Rooftop water tanks: an occasional accent (more than this reads as busy).
    if (rng() < 0.04 && w > 90) waterTower(g, x + range(rng, 18, w - 52), top, rng);
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

// ---------- Phase 3 regions: Georgia coast and Florida ----------

const CONTAINERS = [0xd8564a, 0x2f7fd0, 0xf2b33d, 0x3fa36b, 0xe8833a, 0x7a8a99, 0x8e6bbf];

/** Savannah port: a concrete quay with container stacks and big gantry cranes. */
function port(g: Graphics, x0: number, rng: Rng): void {
  const quay = NEAR_BASE - 6;
  g.rect(x0, quay - 4, 900, 26).fill(0xcfcac0);
  g.rect(x0, quay + 18, 900, 5).fill(0xb3ada2);
  let x = x0 + range(rng, 0, 60);
  while (x < x0 + 880) {
    const stacks = 2 + Math.floor(rng() * 3);
    for (let s2 = 0; s2 < stacks; s2++) {
      const tall = 1 + Math.floor(rng() * 4);
      for (let k = 0; k < tall; k++) {
        const col = pick(rng, CONTAINERS);
        block(g, x + s2 * 62, quay - 4 - (k + 1) * 24, 60, 23, col, { radius: 2 });
        for (let r = 1; r < 6; r++) g.rect(x + s2 * 62 + r * 10, quay - 4 - (k + 1) * 24 + 3, 1.5, 17).fill({ color: P.black, alpha: 0.08 });
      }
    }
    x += stacks * 62 + range(rng, 60, 200);
  }
  if (rng() < 0.75) gantryCrane(g, x0 + range(rng, 150, 750), quay - 4, rng() < 0.5 ? 0xd8564a : 0x3f78c4);
}

function gantryCrane(g: Graphics, x: number, base: number, accent: number): void {
  const white = 0xeef0f2, h = 250;
  // legs (two A-frames seen side-on) and the portal beam
  for (const lx of [-50, 50]) g.roundRect(x + lx - 6, base - h, 12, h, 3).fill(white);
  g.roundRect(x - 60, base - h - 4, 120, 16, 4).fill(white);
  g.roundRect(x - 56, base - h * 0.45, 112, 10, 3).fill(white);
  g.moveTo(x - 44, base - h * 0.45).lineTo(x + 44, base - h + 10).stroke({ width: 5, color: white });
  // boom reaching out over the water (left) and the back reach
  g.roundRect(x - 230, base - h - 30, 330, 14, 4).fill(accent);
  g.moveTo(x - 20, base - h - 80).lineTo(x - 220, base - h - 26).stroke({ width: 3, color: white });
  g.moveTo(x + 10, base - h - 80).lineTo(x + 95, base - h - 26).stroke({ width: 3, color: white });
  g.roundRect(x - 26, base - h - 84, 40, 66, 4).fill(white);
  // machinery house and the hanging spreader
  g.roundRect(x - 70, base - h - 22, 52, 28, 4).fill(accent);
  g.roundRect(x - 70, base - h - 22, 52, 3, 1.5).fill({ color: P.white, alpha: 0.45 });
  g.rect(x - 141, base - h - 16, 2, 110).fill(0x5d6670);
  g.roundRect(x - 170, base - h + 92, 60, 10, 3).fill(0xf2b33d);
}

const BRICK = [0xb5654a, 0xa85a44, 0xc47a5a, 0x9c6b52, 0xb8735a];

/** Savannah: brick cotton warehouses, steeples and live oaks dripping with moss. */
function savannahBack(g: Graphics, x0: number, rng: Rng): void {
  let x = x0 + range(rng, 0, 40);
  while (x < x0 + 880) {
    const r = rng();
    if (r < 0.28) {
      mossyOak(g, x + 70, NEAR_BASE, range(rng, 150, 200));
      x += 150;
      continue;
    }
    const w = range(rng, 90, 160), h = range(rng, 90, 170);
    const col = pick(rng, BRICK);
    block(g, x, NEAR_BASE - h, w, h, col);
    g.roundRect(x - 3, NEAR_BASE - h - 6, w + 6, 10, 3).fill(darken(col, 0.15));
    // tall arched windows in rows
    for (let wy = NEAR_BASE - h + 18; wy < NEAR_BASE - 40; wy += 46) {
      for (let wx = x + 12; wx < x + w - 24; wx += 26) {
        g.roundRect(wx, wy, 14, 26, 7).fill(rng() < 0.18 ? P.warmWindow : 0x5b4a44);
      }
    }
    g.roundRect(x + w * 0.35, NEAR_BASE - 34, w * 0.3, 34, 12).fill(0x4a3b36);
    if (rng() < 0.12) {
      g.roundRect(x + w / 2 - 12, NEAR_BASE - h - 50, 24, 50, 3).fill(0xf3efe4);
      roundedTri(g, x + w / 2, NEAR_BASE - h - 120, 24, 74, 3).fill(0xf3efe4);
    }
    x += w + range(rng, 2, 16);
  }
}

/** Georgia coast: marsh hammocks with mossy oaks, tidal creeks and shrimp boats. */
function gaCoast(g: Graphics, x0: number, rng: Rng): void {
  let x = x0;
  while (x < x0 + 900) {
    const w = range(rng, 160, 320);
    g.roundRect(x, NEAR_BASE - 6, w, 34, 12).fill(0xa7c46c);
    marshGrass(g, x + 6, NEAR_BASE + 2, w - 12);
    if (rng() < 0.55) mossyOak(g, x + w * 0.5, NEAR_BASE - 2, range(rng, 130, 180));
    else if (rng() < 0.5) palmetto(g, x + w * 0.4, NEAR_BASE - 2, range(rng, 130, 180), range(rng, -0.3, 0.3));
    if (rng() < 0.25) egret(g, x + w * 0.85, NEAR_BASE + 4);
    x += w;
    const gap = range(rng, 80, 220);
    if (rng() < 0.35) shrimpBoat(g, x + gap / 2, NEAR_BASE - 2, rng);
    x += gap;
  }
}

function shrimpBoat(g: Graphics, x: number, y: number, rng: Rng): void {
  const hull = pick(rng, [0xffffff, 0x3f9a8a, 0x2f4d7a]);
  cornerRect(g, x - 46, y - 14, 92, 16, 2, 2, 10, 10).fill(hull);
  g.rect(x - 46, y - 4, 92, 3).fill(0xd8392b);
  block(g, x + 6, y - 38, 30, 24, 0xf6f3ea, { radius: 3 });
  g.roundRect(x + 10, y - 32, 9, 8, 2).fill(0x8fb6d0);
  g.rect(x - 2, y - 82, 3, 68).fill(0x7c6a5a);
  // outrigger booms with nets
  for (const s of [-1, 1]) {
    g.moveTo(x, y - 74).lineTo(x + s * 54, y - 46).stroke({ width: 2.5, color: 0x7c6a5a });
    g.poly([x + s * 54, y - 46, x + s * 46, y - 20, x + s * 60, y - 20]).fill({ color: 0x9aa3ad, alpha: 0.7 });
  }
}

/** The St. Johns River: open water with the odd tug or sailboat and old pilings. */
function river(g: Graphics, x0: number, rng: Rng): void {
  for (let k = 0; k < 3; k++) {
    const px = x0 + range(rng, 0, 880);
    g.roundRect(px, NEAR_BASE - 12, 8, 30, 3).fill(0x8a6a4e);
  }
  const r = rng();
  if (r < 0.4) tug(g, x0 + range(rng, 150, 750), NEAR_BASE - 4);
  else if (r < 0.75) sailboat(g, x0 + range(rng, 100, 800), NEAR_BASE - 6, range(rng, 0.8, 1.1), rng);
}

function tug(g: Graphics, x: number, y: number): void {
  cornerRect(g, x - 44, y - 16, 88, 18, 3, 3, 12, 12).fill(0xd8392b);
  g.rect(x - 44, y - 8, 88, 3).fill(0x24262a);
  block(g, x - 20, y - 40, 40, 24, P.white, { radius: 3 });
  block(g, x - 12, y - 56, 24, 16, P.white, { radius: 3 });
  g.roundRect(x - 8, y - 52, 16, 7, 2).fill(0x8fb6d0);
  g.roundRect(x + 10, y - 66, 8, 22, 2).fill(0x24262a);
  g.roundRect(x + 10, y - 66, 8, 5, 2).fill(0xd8392b);
  for (const tx of [-36, 36]) g.circle(x + tx, y - 6, 5).fill(0x24262a);
}

const JAX_GLASS = [0x9fc3dc, 0xb7cfe0, 0x8fb3cf, 0xd7dde3, 0xe7d8c6, 0xc7b6a6];
const ORLANDO_GLASS = [0xe9eef2, 0xbfe3e6, 0x9fd3d8, 0xd9e6ef, 0xf2efe8, 0xa9d6e8];

/** Modern downtown: glass towers with tall palms between them. */
function downtown(g: Graphics, x0: number, rng: Rng, colors: number[], hMin: number, hMax: number): void {
  let x = x0 + range(rng, 0, 40);
  while (x < x0 + 880) {
    if (rng() < 0.22) {
      palmetto(g, x + 20, NEAR_BASE, range(rng, 180, 240), range(rng, -0.2, 0.2));
      x += 50;
      continue;
    }
    const w = range(rng, 80, 150), h = range(rng, hMin, hMax);
    const col = pick(rng, colors);
    const top = NEAR_BASE - h;
    contactShadow(g, x + w / 2, NEAR_BASE, w);
    block(g, x, top, w, h, col);
    windowGrid(g, x + 8, top + 14, w - 16 - w * 0.06, h - 34, rng);
    const crown = rng();
    if (crown < 0.25) g.poly([x, top + 2, x + w, top - 36, x + w, top + 2]).fill(darken(col, 0.06));
    else if (crown < 0.45) g.roundRect(x + w * 0.2, top - 26, w * 0.6, 28, 4).fill(lighten(col, 0.2));
    x += w + range(rng, 6, 34);
  }
}

/** Florida flatwoods: tall longleaf pines over saw palmetto. */
function flatwoods(g: Graphics, x0: number, rng: Rng): void {
  let x = x0 + range(rng, 0, 40);
  while (x < x0 + 900) {
    longleafPine(g, x, NEAR_BASE, range(rng, 180, 260), range(rng, -0.25, 0.25));
    if (rng() < 0.7) sawPalmetto(g, x + range(rng, 10, 40), NEAR_BASE + 4, range(rng, 60, 100));
    x += range(rng, 45, 100);
  }
}

function citrusTree(g: Graphics, x: number, y: number, size: number): void {
  contactShadow(g, x, y, size * 0.8);
  g.roundRect(x - size * 0.05, y - size * 0.4, size * 0.1, size * 0.4, 2).fill(0x8a6a4a);
  g.circle(x - size * 0.2, y - size * 0.6, size * 0.28).fill(0x3f9a4a);
  g.circle(x + size * 0.2, y - size * 0.6, size * 0.28).fill(0x2f8040);
  g.circle(x, y - size * 0.8, size * 0.32).fill(0x3f9a4a);
  for (const [dx, dy] of [[-0.25, -0.55], [0.05, -0.85], [0.24, -0.62], [-0.06, -0.62]]) g.circle(x + dx * size, y + dy * size, size * 0.055).fill(0xff9f1c);
}

/** Orange groves: two neat staggered rows. */
function citrus(g: Graphics, x0: number, rng: Rng): void {
  g.rect(x0, NEAR_BASE - 18, 900, 6).fill({ color: 0xc9b98a, alpha: 0.5 });
  const step = 74;
  const start = x0 - (x0 % step);
  for (let x = start; x < x0 + 900; x += step) citrusTree(g, x + step / 2, NEAR_BASE - 14, 78);
  for (let x = start; x < x0 + 900; x += step) citrusTree(g, x, NEAR_BASE + 2, 96);
  if (rng() < 0.2) {
    const bx = x0 + range(rng, 100, 700);
    block(g, bx, NEAR_BASE - 54, 110, 54, 0xf3e3c3, { radius: 4 });
    g.poly([bx - 8, NEAR_BASE - 52, bx + 55, NEAR_BASE - 84, bx + 118, NEAR_BASE - 52]).fill(0xc9734a);
  }
}

/** Cattle pasture: open grass, cabbage palms, a lone oak and egrets. */
function pasture(g: Graphics, x0: number, rng: Rng): void {
  for (let fx = x0; fx < x0 + 900; fx += 60) g.roundRect(fx, NEAR_BASE - 26, 4, 26, 2).fill(0x9a8466);
  g.rect(x0, NEAR_BASE - 20, 900, 3).fill(0x9a8466);
  let x = x0 + range(rng, 0, 200);
  while (x < x0 + 900) {
    const r = rng();
    if (r < 0.55) {
      // a little stand of cabbage palms
      const n = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) palmetto(g, x + k * 34, NEAR_BASE, range(rng, 160, 230), range(rng, -0.35, 0.35));
    } else if (r < 0.75) {
      liveOak(g, x + 60, NEAR_BASE, range(rng, 140, 190));
    } else {
      for (let k = 0; k < 3; k++) egret(g, x + k * 26, NEAR_BASE + 6);
    }
    x += range(rng, 220, 420);
  }
}

/** Central Florida lakes: blue water, cypress along the shore, lily pads. */
function lakes(g: Graphics, x0: number, rng: Rng): void {
  g.rect(x0, NEAR_BASE - 8, 900, 800).fill(P.water);
  for (let k = 0; k < 8; k++) g.roundRect(x0 + range(rng, 0, 860), range(rng, NEAR_BASE + 4, NEAR_BASE + 70), range(rng, 20, 60), 3, 1.5).fill({ color: P.white, alpha: 0.45 });
  let x = x0 + range(rng, 0, 80);
  while (x < x0 + 900) {
    if (rng() < 0.6) {
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) cypress(g, x + k * 30, NEAR_BASE - 4 + (k % 2) * 6, range(rng, 140, 210));
      x += n * 30 + range(rng, 60, 160);
    } else {
      for (let k = 0; k < 4; k++) g.ellipse(x + k * 22, NEAR_BASE + 20 + (k % 2) * 10, 10, 4).fill(0x5fae4e);
      if (rng() < 0.5) g.circle(x + 30, NEAR_BASE + 18, 4).fill(0xf7a7c0);
      x += range(rng, 120, 220);
    }
  }
}

/** Airport grounds: mown stripes, hangars and runway edge lights. */
function airportBack(g: Graphics, x0: number, rng: Rng): void {
  for (let k = 0; k < 900; k += 120) g.rect(x0 + k, NEAR_BASE - 4, 60, 800).fill({ color: P.white, alpha: 0.06 });
  g.rect(x0, NEAR_BASE - 2, 900, 14).fill(0x9aa0a6);
  for (let k = 20; k < 900; k += 60) g.circle(x0 + k, NEAR_BASE - 4, 3).fill(0xfff1a8);
  if (rng() < 0.55) {
    const hx = x0 + range(rng, 60, 600), w = range(rng, 180, 240), h = 70;
    contactShadow(g, hx + w / 2, NEAR_BASE - 2, w);
    block(g, hx, NEAR_BASE - 2 - h, w, h, 0xd9dee3);
    g.ellipse(hx + w / 2, NEAR_BASE - 2 - h, w / 2, 26).fill(0xbfc7cf);
    g.roundRect(hx + w * 0.15, NEAR_BASE - 2 - h * 0.75, w * 0.7, h * 0.75, 3).fill(0x8f99a3);
    for (let k = 1; k < 6; k++) g.rect(hx + w * 0.15 + (w * 0.7 * k) / 6, NEAR_BASE - 2 - h * 0.75, 1.5, h * 0.75).fill({ color: P.white, alpha: 0.25 });
  }
  if (rng() < 0.4) {
    const wx = x0 + range(rng, 100, 800);
    g.rect(wx - 1.5, NEAR_BASE - 70, 3, 68).fill(0xd8dde2);
    g.poly([wx, NEAR_BASE - 70, wx + 34, NEAR_BASE - 64, wx + 34, NEAR_BASE - 56, wx, NEAR_BASE - 54]).fill(0xf28b3a);
    g.rect(wx + 11, NEAR_BASE - 68, 8, 13).fill(P.white);
  }
}

const STUCCO = [0xf6e7d0, 0xf3d9c9, 0xd9ece6, 0xfbeed5, 0xe8e1f2, 0xfde2c4];

/** Florida suburbs: stucco houses with barrel-tile roofs, palms and pool cages. */
function floridaSuburb(g: Graphics, x0: number, rng: Rng): void {
  let x = x0 + range(rng, 10, 60);
  while (x < x0 + 860) {
    const r = rng();
    if (r < 0.6) {
      const w = range(rng, 140, 190);
      stuccoHouse(g, x, NEAR_BASE, w, range(rng, 50, 64), pick(rng, STUCCO), rng);
      x += w + range(rng, 20, 50);
    } else if (r < 0.8) {
      palmetto(g, x + 20, NEAR_BASE, range(rng, 150, 210), range(rng, -0.3, 0.3));
      x += range(rng, 50, 90);
    } else {
      // screened pool cage
      const w = range(rng, 100, 140), h = 52;
      g.roundRect(x, NEAR_BASE - h, w, h, 6).fill({ color: 0xdfe8ee, alpha: 0.55 });
      for (let k = 1; k < 6; k++) g.rect(x + (w * k) / 6, NEAR_BASE - h, 1.5, h).fill({ color: 0x9aa3ad, alpha: 0.6 });
      g.rect(x, NEAR_BASE - h * 0.5, w, 1.5).fill({ color: 0x9aa3ad, alpha: 0.6 });
      x += w + range(rng, 20, 40);
    }
  }
}

function stuccoHouse(g: Graphics, x: number, base: number, w: number, h: number, color: number, rng: Rng): void {
  contactShadow(g, x + w / 2, base, w * 1.05);
  block(g, x, base - h, w, h, color);
  // low hip roof in terracotta barrel tile
  const roof = pick(rng, [0xd9824f, 0xc96f45, 0xe0956a]);
  const ry = base - h + 4, rh = 30;
  g.poly([x - 10, ry, x + 26, ry - rh, x + w - 26, ry - rh, x + w + 10, ry]).fill(roof);
  for (let tx = x + 4; tx < x + w; tx += 9) g.rect(tx, ry - rh * 0.85 * Math.min(1, Math.min(tx - x + 10, x + w + 10 - tx) / 36), 2, rh * 0.85 * Math.min(1, Math.min(tx - x + 10, x + w + 10 - tx) / 36)).fill({ color: P.black, alpha: 0.1 });
  g.roundRect(x - 10, ry - 3, w + 20, 5, 2.5).fill(darken(roof, 0.12));
  // garage door, front door, windows
  g.roundRect(x + w * 0.58, base - h * 0.62, w * 0.34, h * 0.62, 3).fill(0xf7f4ee);
  for (let k = 1; k < 4; k++) g.rect(x + w * 0.58, base - h * 0.62 + (h * 0.62 * k) / 4, w * 0.34, 1.5).fill({ color: P.black, alpha: 0.08 });
  g.roundRect(x + w * 0.4, base - h * 0.6, w * 0.1, h * 0.6, 3).fill(darken(color, 0.3));
  g.roundRect(x + w * 0.1, base - h * 0.7, w * 0.2, h * 0.34, 3).fill(rng() < 0.2 ? P.warmWindow : { color: P.white, alpha: 0.8 });
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
      if (region === 'harbor' || region === 'river' || region === 'gaCoast' || region === 'lakes') {
        // reeds poking up from the water's edge
        for (let k = 0; k < 6; k++) g.roundRect(x + k * 7, y - 30 - (k % 3) * 8, 4, 40 + (k % 3) * 8, 2).fill(k % 2 ? 0xa7b85f : 0x93a653);
      } else if (!LEG1.has(region) && FL_FOREGROUND.has(region) && rng() < 0.6) {
        sawPalmetto(g, x, y, range(rng, 90, 140), 0x5f9450);
        if (rng() < 0.3) g.circle(x + 30, y - 30, 8).fill(0xf25f8a).circle(x + 30, y - 30, 3).fill(0xffe066);
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

const FL_FOREGROUND = new Set<Region>(['flatwoods', 'citrus', 'pasture', 'airport', 'floridaSuburb', 'orlando', 'jacksonville', 'gaCoast']);

function bush(g: Graphics, x: number, y: number, w: number, c: number): void {
  g.circle(x - w * 0.25, y - w * 0.22, w * 0.3).fill(c);
  g.circle(x + w * 0.25, y - w * 0.2, w * 0.28).fill(darken(c, 0.06));
  g.circle(x, y - w * 0.36, w * 0.34).fill(c);
  g.circle(x - w * 0.12, y - w * 0.5, w * 0.12).fill({ color: P.white, alpha: 0.12 });
  g.rect(x - w * 0.5, y - w * 0.2, w, w * 0.4).fill(c);
}
