// The highway itself: Jersey barrier + light poles behind, asphalt with a yellow
// left edge line and white dashed lanes, grass shoulder in front. Follows the
// terrain so it arches over every bridge (water under river bridges, grass under the flyover).
import { Graphics } from 'pixi.js';
import { P, darken } from '../style/palette';
import { makeRng, range } from '../core/rng';
import { roadHeight } from './Terrain';
import { BRIDGES, isOpenRoad, zoneAt, type BridgeSpec, type ZoneSpec } from './Route';
import { ChunkLayer } from './ChunkLayer';

export const ROAD_FAR = -44;
export const ROAD_NEAR = 30;
export const LANE_Y = -16;
const BARRIER_H = 28;
const STEP = 20;
/** Water surface (or the ground under a flyover), below the road. */
const WATER_Y = 64;

/** The bridge whose open span covers x (water or ground drawn under the deck). */
function spanAt(x: number): BridgeSpec | null {
  for (const b of BRIDGES) if (x > b.span[0] && x < b.span[1]) return b;
  return null;
}
const underBridge = (x: number) => spanAt(x) !== null;

/** Arlington Memorial Bridge (Washington): granite arches, balustrades and no Jersey barrier. */
const MEMORIAL = BRIDGES.find((b) => b.id === 'memorial') ?? null;
const onMemorial = (x: number) => !!MEMORIAL && x >= MEMORIAL.start && x <= MEMORIAL.end;
const GRANITE = 0xe2dccd;
const GRANITE_SHADE = 0xcdc5b2;

/** Granite arch spans under a stone-arch bridge: piers with a round arch between each pair. */
function stoneArches(g: Graphics, br: BridgeSpec, x0: number, W: number, h: (x: number) => number): void {
  const step = br.pierStep;
  const deckY = (x: number) => h(x) + ROAD_NEAR + 16;
  for (let p = Math.floor((x0 - step) / step) * step; p < x0 + W + step; p += step) {
    if (p < br.span[0] - step || p > br.span[1]) continue;
    const a = Math.max(p, br.span[0] - 60), b = Math.min(p + step, br.span[1] + 60);
    if (b - a < 80) continue;
    const pw = 22;
    const spring = WATER_Y - 6;
    // spandrel wall: deck underside along the top, the arch opening cut along the bottom
    const pts: number[] = [];
    for (let x = a; x <= b; x += 20) pts.push(x, deckY(x));
    pts.push(b, deckY(b), b, WATER_Y + 6, b - pw, WATER_Y + 6, b - pw, spring);
    const l = a + pw, r = b - pw;
    const crown = Math.min(deckY((a + b) / 2) + 14, spring - 10);
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const ang = t * Math.PI;
      pts.push(r - (r - l) * (0.5 - 0.5 * Math.cos(ang)), spring - (spring - crown) * Math.sin(ang));
    }
    pts.push(l, spring, l, WATER_Y + 6, a, WATER_Y + 6);
    g.poly(pts).fill(GRANITE);
    // right-side shade on each pier, the arch ring and a keystone
    g.rect(b - pw * 0.6, deckY(b), pw * 0.6, WATER_Y + 6 - deckY(b)).fill({ color: P.black, alpha: 0.06 });
    const ring: number[] = [];
    for (let k = 0; k <= 24; k++) {
      const ang = (k / 24) * Math.PI;
      ring.push(r - (r - l) * (0.5 - 0.5 * Math.cos(ang)), spring - (spring - crown) * Math.sin(ang));
    }
    for (let k = 24; k >= 0; k--) {
      const ang = (k / 24) * Math.PI;
      ring.push(r + 6 - (r - l + 12) * (0.5 - 0.5 * Math.cos(ang)), spring - (spring - crown + 6) * Math.sin(ang));
    }
    g.poly(ring).fill(GRANITE_SHADE);
    g.roundRect((l + r) / 2 - 6, crown - 10, 12, 14, 2).fill(GRANITE_SHADE);
    // a soft reflection of the arch in the water
    g.ellipse((l + r) / 2, WATER_Y + 18, (r - l) * 0.42, 6).fill({ color: P.white, alpha: 0.18 });
  }
}

/** The granite balustrade on the far side of the Memorial Bridge deck (instead of a Jersey barrier). */
function balustrade(g: Graphics, a: number, b: number, h: (x: number) => number, base: number, height: number): void {
  const top = (x: number) => h(x) + base - height;
  g.poly([a, top(a), b + 0.5, top(b), b + 0.5, top(b) + 6, a, top(a) + 6]).fill(GRANITE);
  g.poly([a, top(a), b + 0.5, top(b), b + 0.5, top(b) + 2, a, top(a) + 2]).fill({ color: P.white, alpha: 0.6 });
  g.poly([a, h(a) + base - 7, b + 0.5, h(b) + base - 7, b + 0.5, h(b) + base + 2, a, h(a) + base + 2]).fill(GRANITE_SHADE);
  for (let x = Math.ceil(a / 12) * 12; x < b; x += 12) {
    const t = top(x) + 6, bot = h(x) + base - 7;
    g.roundRect(x - 2.5, t, 5, bot - t, 2.5).fill(GRANITE);
  }
}

/** The St. Johns (Main Street) shoreline: a sandy curve from the span's start, bowing toward the
 * viewer and to the left. Sampled once; `shoreY(x)` gives the curve's y over [start - 300, start]. */
const SHORE = (() => {
  const b = BRIDGES.find((br) => br.id === 'main-street');
  if (!b) return null;
  const s0 = b.span[0];
  const pts: [number, number][] = [];
  for (let k = 0; k <= 32; k++) {
    const t = k / 32;
    pts.push([
      (1 - t) * (1 - t) * s0 + 2 * (1 - t) * t * (s0 - 30) + t * t * (s0 - 300),
      (1 - t) * (1 - t) * WATER_Y + 2 * (1 - t) * t * (WATER_Y + 150) + t * t * (WATER_Y + 360),
    ]);
  }
  return { s0, pts };
})();
function shoreY(x: number): number | null {
  if (!SHORE || x > SHORE.s0 + STEP || x < SHORE.s0 - 300) return null;
  if (x >= SHORE.s0) return WATER_Y; // the ground segment that straddles the span start
  const p = SHORE.pts;
  for (let k = 0; k < p.length - 1; k++) {
    const [ax, ay] = p[k], [bx, by] = p[k + 1];
    if (x <= ax && x >= bx) return ay + ((ax - x) / (ax - bx || 1)) * (by - ay);
  }
  return null;
}

/** Far-side strip colors for each open-road surface: [fill, curb, height]. */
const SURFACE: Record<NonNullable<ZoneSpec['surface']>, [number, number, number]> = {
  sidewalk: [P.sidewalk, P.curb, 16],
  lot: [0x8d9299, 0x7f848b, 36],
  cobble: [0x9b9184, 0xb9ad9c, 18],
  riverwalk: [0xe6e0d2, 0xd2cab6, 18],
  pavers: [0xc98f6c, 0xe2b79a, 18],
  parade: [0xf3c6c9, 0xfbe3c4, 20],
  avenue: [0xc9ccd1, 0xb3b7bd, 18],
  mall: [0xe8dfc8, 0xd7cba9, 20],
  brick: [0xb8735a, 0xd29a80, 18],
};

export function roadLayer(): ChunkLayer {
  const W = 1200;
  return new ChunkLayer(1, W, (i, x0) => {
    if (x0 + W < -2000) return null;
    const g = new Graphics();
    const rng = makeRng(i * 977 + 11);
    const xs: number[] = [];
    for (let x = x0; x <= x0 + W; x += STEP) xs.push(x);
    const h = (x: number) => -roadHeight(x);

    // Ground in front of the road (grass), or water / low ground under a bridge.
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      const span = spanAt(a);
      if (span?.under === 'water') {
        g.rect(a, WATER_Y, b - a + 0.5, 4000).fill(P.water);
      } else if (span) {
        // Under the flyover: grass with a frontage road.
        g.rect(a, WATER_Y, b - a + 0.5, 4000).fill(P.grassNear);
        g.rect(a, WATER_Y + 6, b - a + 0.5, 22).fill(0x8a8f96);
        g.rect(a, WATER_Y + 16, b - a + 0.5, 2).fill({ color: P.white, alpha: 0.6 });
      } else {
        const ya = shoreY(a), yb = shoreY(b);
        if (ya !== null && yb !== null) {
          // the bank above the shoreline, the river below it
          g.poly([a, h(a) + ROAD_NEAR, b + 0.5, h(b) + ROAD_NEAR, b + 0.5, yb, a, ya]).fill(P.grassNear);
          g.poly([a, ya, b + 0.5, yb, b + 0.5, 4000, a, 4000]).fill(P.water);
        } else {
          g.poly([a, h(a) + ROAD_NEAR, b + 0.5, h(b) + ROAD_NEAR, b + 0.5, 4000, a, 4000]).fill(P.grassNear);
        }
      }
    }
    // Main Street (St. Johns) crossing: a sandy rim along the curved shoreline (the ground pass
    // above already put grass above the curve and water below it).
    for (const br of BRIDGES) {
      if (br.id !== 'main-street' || !SHORE) continue;
      const s0 = br.span[0];
      if (s0 + 20 >= x0 && s0 - 320 <= x0 + W) {
        const curve = SHORE.pts;
        const sand: number[] = [];
        for (const [cx, cy] of curve) sand.push(cx, cy);
        for (let k = curve.length - 1; k >= 0; k--) sand.push(curve[k][0] - 14, curve[k][1]);
        g.poly(sand).fill(0xe6d7a6);
        for (let k = 0; k < curve.length; k += 4) g.roundRect(curve[k][0] + 10, curve[k][1] + 4, 26, 3, 1.5).fill({ color: P.white, alpha: 0.45 });
      }
      // At the far end the bank slopes up from the water to where the deck lands.
      const s1 = br.span[1];
      if (s1 + 200 >= x0 && s1 - 20 <= x0 + W) {
        const top = h(s1) + ROAD_NEAR + 16;
        g.poly([s1 - 1, top, s1 + 170, WATER_Y, s1 - 1, WATER_Y]).fill(P.water);
        g.poly([s1 - 1, top, s1 + 170, WATER_Y, s1 + 184, WATER_Y, s1 + 13, top]).fill(0xe6d7a6);
      }
    }
    // George Washington Bridge: the Hudson's banks run diagonally toward the viewer at both ends
    // (water on the river side, a sandy rim, grass on the land side).
    for (const br of BRIDGES) {
      if (br.id !== 'gwb') continue;
      for (const [sx, side] of [[br.span[0], -1], [br.span[1], 1]] as const) {
        if (sx + 1000 < x0 || sx - 1000 > x0 + W) continue;
        const top = h(sx) + ROAD_NEAR + 14;
        const y2 = top + 700;
        const bx = sx + side * 0.9 * (y2 - top); // where the shoreline leaves the screen
        g.poly([sx, top, bx, y2, sx - side * 400, y2, sx - side * 400, top]).fill(P.water);
        g.poly([sx, top, bx, y2, bx + side * 16, y2, sx + side * 16, top]).fill(0xe6d7a6);
        g.poly([sx + side * 16, top, bx + side * 16, y2, bx + side * 22, y2, sx + side * 22, top]).fill({ color: P.white, alpha: 0.35 });
      }
    }
    for (const br of BRIDGES) {
      if (br.end < x0 || br.start > x0 + W) continue;
      if (br.under === 'water') {
        for (let k = 0; k < 14; k++) {
          const sx = x0 + range(rng, 0, W);
          if (spanAt(sx) === br) g.roundRect(sx, WATER_Y + range(rng, 10, 200), range(rng, 30, 80), 4, 2).fill({ color: P.white, alpha: 0.5 });
        }
      }
      if (br.kind === 'stone-arch') {
        stoneArches(g, br, x0, W, h);
        continue;
      }
      // Piers (round columns under the flyover).
      const pier = 0xd2d6db;
      for (let x = Math.ceil(x0 / br.pierStep) * br.pierStep; x < x0 + W; x += br.pierStep) {
        if (x <= br.start || x >= br.end) continue;
        // (the St. Johns crossing's piers stand only in the water, never on the banks)
        if (br.id === 'main-street' && spanAt(x) !== br) continue;
        // (the George Washington Bridge hangs from its towers: no piers, just the tower footings)
        if (br.id === 'gwb') continue;
        const top = h(x) + ROAD_NEAR + 14;
        if (top < WATER_Y - 10) {
          const w = br.kind === 'flyover' ? 26 : 32;
          g.roundRect(x - w / 2, top, w, WATER_Y - top + 6, br.kind === 'flyover' ? 10 : 4).fill(pier);
          g.rect(x + w / 2 - w * 0.28, top, w * 0.28, WATER_Y - top + 6).fill({ color: P.black, alpha: 0.07 });
        }
      }
    }

    // Jersey barrier (median) and highway light poles, only on the interstate.
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      if (isOpenRoad(a)) continue;
      if (onMemorial(a)) {
        balustrade(g, a, b, h, ROAD_FAR + 2, BARRIER_H + 2);
        continue;
      }
      const top = (x: number) => h(x) + ROAD_FAR - BARRIER_H;
      g.poly([a, top(a), b + 0.5, top(b), b + 0.5, h(b) + ROAD_FAR + 2, a, h(a) + ROAD_FAR + 2]).fill(P.barrier);
      g.poly([a, top(a), b + 0.5, top(b), b + 0.5, top(b) + 3, a, top(a) + 3]).fill({ color: P.white, alpha: 0.45 });
      g.poly([a, h(a) + ROAD_FAR - 8, b + 0.5, h(b) + ROAD_FAR - 8, b + 0.5, h(b) + ROAD_FAR + 2, a, h(a) + ROAD_FAR + 2]).fill(P.barrierShade);
    }
    for (let x = Math.ceil(x0 / 120) * 120; x < x0 + W; x += 120) {
      if (isOpenRoad(x) || onMemorial(x)) continue;
      g.rect(x, h(x) + ROAD_FAR - BARRIER_H + 3, 1.5, BARRIER_H - 3).fill({ color: P.black, alpha: 0.06 });
    }
    for (let x = Math.ceil(x0 / 640) * 640; x < x0 + W; x += 640) {
      if (isOpenRoad(x) || isOpenRoad(x + 40)) continue;
      // (the Memorial Bridge has its own lamp posts, built with the bridge)
      if (onMemorial(x) || onMemorial(x + 60)) continue;
      lightPole(g, x, h(x) + ROAD_FAR - BARRIER_H);
    }

    // Far-side sidewalk / lot in the open (non-interstate) stretches.
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      const z = zoneAt(a);
      if (!z?.open) continue;
      const [fill, curb, hh] = SURFACE[z.surface ?? 'sidewalk'];
      g.rect(a, h(a) + ROAD_FAR - hh, b - a + 0.5, hh).fill(fill);
      g.rect(a, h(a) + ROAD_FAR - 4, b - a + 0.5, 4).fill(curb);
      if (z.surface === 'cobble' || z.surface === 'pavers' || z.surface === 'parade' || z.surface === 'brick' || z.surface === 'avenue') {
        for (let cx = a; cx < b; cx += 10) g.rect(cx, h(a) + ROAD_FAR - hh + 6, 1, hh - 10).fill({ color: P.black, alpha: 0.06 });
      }
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
        .fill(deck ? (onMemorial(a) ? GRANITE : 0xd2d6db) : P.gravel);
    }
    // Memorial Bridge: a dentil course along the near deck edge.
    for (let x = Math.ceil(x0 / 16) * 16; x < x0 + W; x += 16) {
      if (!onMemorial(x) || roadHeight(x) <= 2 && !underBridge(x)) continue;
      g.rect(x, h(x) + ROAD_NEAR + 10, 8, 6).fill(GRANITE_SHADE);
    }

    // Lines: yellow left edge (far side), white dashes, white near edge.
    const open = (x: number) => isOpenRoad(x);
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      const edgeColor = open(a) ? P.laneWhite : P.edgeYellow;
      if (!open(a) || zoneAt(a)?.kind === 'city') {
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
