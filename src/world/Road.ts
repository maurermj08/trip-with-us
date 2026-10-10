// The highway itself: Jersey barrier + light poles behind, asphalt with a yellow
// left edge line and white dashed lanes, grass shoulder in front. Follows the
// terrain so it arches over the Ravenel Bridge.
import { Graphics } from 'pixi.js';
import { P, darken } from '../style/palette';
import { makeRng, range } from '../core/rng';
import { roadHeight } from './Terrain';
import { BRIDGE, inZone, isOpenRoad } from './Route';
import { ChunkLayer } from './ChunkLayer';

export const ROAD_FAR = -44;
export const ROAD_NEAR = 30;
export const LANE_Y = -16;
const BARRIER_H = 28;
const STEP = 20;
const WATER_Y = 64;
const BRIDGE_WATER = [BRIDGE.start + 250, BRIDGE.end - 250];

const underBridge = (x: number) => x > BRIDGE_WATER[0] && x < BRIDGE_WATER[1];

export function roadLayer(): ChunkLayer {
  const W = 1200;
  return new ChunkLayer(1, W, (i, x0) => {
    if (x0 + W < -2000) return null;
    const g = new Graphics();
    const rng = makeRng(i * 977 + 11);
    const xs: number[] = [];
    for (let x = x0; x <= x0 + W; x += STEP) xs.push(x);
    const h = (x: number) => -roadHeight(x);

    // Ground in front of the road (grass), or harbor water under the bridge.
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      if (underBridge(a)) {
        g.rect(a, WATER_Y, b - a + 0.5, 700).fill(P.water);
      } else {
        g.poly([a, h(a) + ROAD_NEAR, b + 0.5, h(b) + ROAD_NEAR, b + 0.5, 800, a, 800]).fill(P.grassNear);
      }
    }
    if (xs.some(underBridge)) {
      for (let k = 0; k < 14; k++) {
        const sx = x0 + range(rng, 0, W);
        if (underBridge(sx)) g.roundRect(sx, WATER_Y + range(rng, 10, 200), range(rng, 30, 80), 4, 2).fill({ color: P.white, alpha: 0.5 });
      }
      // Bridge piers.
      for (let x = Math.ceil(x0 / 520) * 520; x < x0 + W; x += 520) {
        const top = h(x) + ROAD_NEAR + 14;
        if (top < WATER_Y - 10) {
          g.roundRect(x - 16, top, 32, WATER_Y - top + 6, 4).fill(0xd2d6db);
          g.rect(x + 16 - 9, top, 9, WATER_Y - top + 6).fill({ color: P.black, alpha: 0.07 });
        }
      }
    }

    // Jersey barrier (median) and highway light poles, only on the interstate.
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      if (isOpenRoad(a)) continue;
      const top = (x: number) => h(x) + ROAD_FAR - BARRIER_H;
      g.poly([a, top(a), b + 0.5, top(b), b + 0.5, h(b) + ROAD_FAR + 2, a, h(a) + ROAD_FAR + 2]).fill(P.barrier);
      g.poly([a, top(a), b + 0.5, top(b), b + 0.5, top(b) + 3, a, top(a) + 3]).fill({ color: P.white, alpha: 0.45 });
      g.poly([a, h(a) + ROAD_FAR - 8, b + 0.5, h(b) + ROAD_FAR - 8, b + 0.5, h(b) + ROAD_FAR + 2, a, h(a) + ROAD_FAR + 2]).fill(P.barrierShade);
    }
    for (let x = Math.ceil(x0 / 120) * 120; x < x0 + W; x += 120) {
      if (isOpenRoad(x)) continue;
      g.rect(x, h(x) + ROAD_FAR - BARRIER_H + 3, 1.5, BARRIER_H - 3).fill({ color: P.black, alpha: 0.06 });
    }
    for (let x = Math.ceil(x0 / 640) * 640; x < x0 + W; x += 640) {
      if (isOpenRoad(x) || isOpenRoad(x + 40)) continue;
      lightPole(g, x, h(x) + ROAD_FAR - BARRIER_H);
    }

    // Far-side sidewalk / lot in the open (non-interstate) stretches.
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      if (!isOpenRoad(a)) continue;
      const lot = inZone(a, 'duckies');
      g.rect(a, h(a) + ROAD_FAR - (lot ? 36 : 16), b - a + 0.5, lot ? 36 : 16).fill(lot ? 0x8d9299 : P.sidewalk);
      g.rect(a, h(a) + ROAD_FAR - 4, b - a + 0.5, 4).fill(lot ? 0x7f848b : P.curb);
    }

    // Asphalt band.
    const road: number[] = [];
    for (const x of xs) road.push(x, h(x) + ROAD_FAR);
    for (let k = xs.length - 1; k >= 0; k--) road.push(xs[k], h(xs[k]) + ROAD_NEAR);
    g.poly(road).fill(P.road);

    // Deck edge for the bridge, gravel shoulder elsewhere.
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      const deck = roadHeight(a) > 2 || underBridge(a);
      g.poly([a, h(a) + ROAD_NEAR, b + 0.5, h(b) + ROAD_NEAR, b + 0.5, h(b) + ROAD_NEAR + (deck ? 16 : 5), a, h(a) + ROAD_NEAR + (deck ? 16 : 5)])
        .fill(deck ? 0xd2d6db : P.gravel);
    }

    // Lines: yellow left edge (far side), white dashes, white near edge.
    const open = (x: number) => isOpenRoad(x);
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      const edgeColor = open(a) ? P.laneWhite : P.edgeYellow;
      if (!open(a) || inZone(a, 'charleston')) {
        line(g, a, b, h, ROAD_FAR + 5, 4, open(a) ? P.edgeYellow : edgeColor);
      }
      line(g, a, b, h, ROAD_NEAR - 6, 3, { color: P.laneWhite, alpha: 0.85 });
    }
    for (let x = Math.ceil(x0 / 160) * 160; x < x0 + W; x += 160) {
      const y0 = h(x) + LANE_Y, y1 = h(x + 70) + LANE_Y;
      g.poly([x, y0 - 2, x + 70, y1 - 2, x + 70, y1 + 2, x, y0 + 2]).fill(P.laneWhite);
    }

    // Grass tufts and wildflowers on the near shoulder.
    for (let k = 0; k < 9; k++) {
      const x = x0 + range(rng, 0, W);
      if (underBridge(x)) continue;
      const y = h(x) + ROAD_NEAR + range(rng, 26, 210);
      tuft(g, x, y, rng() < 0.3 ? [0xfff27a, 0xffffff, 0xf7a7c0][Math.floor(rng() * 3)] : 0);
    }
    return g;
  });
}

function line(g: Graphics, a: number, b: number, h: (x: number) => number, y: number, w: number, fill: number | { color: number; alpha: number }) {
  g.poly([a, h(a) + y - w / 2, b + 0.5, h(b) + y - w / 2, b + 0.5, h(b) + y + w / 2, a, h(a) + y + w / 2]).fill(fill);
}

function lightPole(g: Graphics, x: number, base: number): void {
  const H = 230;
  g.roundRect(x - 4, base - H, 8, H, 3).fill(P.pole);
  g.rect(x + 1.5, base - H, 2.5, H).fill({ color: P.black, alpha: 0.07 });
  g.moveTo(x - 3, base - H + 6)
    .quadraticCurveTo(x - 2, base - H - 18, x + 30, base - H - 18)
    .lineTo(x + 30, base - H - 12)
    .quadraticCurveTo(x + 4, base - H - 12, x + 3, base - H + 6)
    .fill(P.pole);
  g.roundRect(x + 22, base - H - 22, 34, 11, 5).fill(darken(P.pole, 0.1));
  g.roundRect(x + 26, base - H - 13, 26, 4, 2).fill(P.lamp);
  g.roundRect(x - 9, base - 6, 18, 6, 2).fill(darken(P.pole, 0.15));
}

function tuft(g: Graphics, x: number, y: number, flower: number): void {
  for (let k = -2; k <= 2; k++) {
    const hgt = 12 - Math.abs(k) * 2.5;
    g.roundRect(x + k * 4 - 1.5, y - hgt, 3, hgt, 1.5).fill(k % 2 ? P.grassDark : darken(P.grassNear, 0.12));
  }
  if (flower) {
    g.circle(x, y - 14, 4).fill(flower);
    g.circle(x, y - 14, 1.6).fill(0xf2b33d);
  }
}
