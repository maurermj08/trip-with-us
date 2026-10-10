// The fixed route skeleton: every trip drives the same sequence of set pieces.
// World units: x grows toward Charleston, y=0 is the road contact line.

export const WORLD_START = 0;
export const WORLD_END = 86200;
export const CAR_START_X = 860;

export const MILE_FIRST_X = 3200;
export const MILE_SPACING = 8000;

export const BRIDGE = { start: 76000, rise: 1000, top: 180, fall: 1000, end: 80400 };

export const ZONES = {
  home: [0, 1900],
  duckies: [25300, 29200],
  charleston: [80400, WORLD_END + 2000],
  bridge: [BRIDGE.start - 200, BRIDGE.end + 200],
} as const;

export const ARRIVE_X = 80600;
export const GREET_X = 84000;
/** Sky warms to golden hour over this stretch as the destination nears. */
export const GOLDEN_HOUR = { start: 79000, len: 6000 };

export type Region =
  | 'suburb' | 'pines' | 'farm' | 'town' | 'duckies' | 'lowcountry' | 'marsh' | 'harbor' | 'charleston';

const REGIONS: [number, Region][] = [
  [0, 'suburb'],
  [3600, 'pines'],
  [10000, 'farm'],
  [16500, 'town'],
  [25300, 'duckies'],
  [29200, 'pines'],
  [40000, 'farm'],
  [48000, 'town'],
  [56000, 'lowcountry'],
  [68000, 'marsh'],
  [75400, 'harbor'],
  [80800, 'charleston'],
];

export function regionAt(x: number): Region {
  let r: Region = REGIONS[0][1];
  for (const [start, name] of REGIONS) {
    if (x >= start) r = name;
    else break;
  }
  return r;
}

export function inZone(x: number, zone: keyof typeof ZONES): boolean {
  const [a, b] = ZONES[zone];
  return x >= a && x <= b;
}

/** Stretches of road with no median barrier or highway poles. */
export function isOpenRoad(x: number): boolean {
  return inZone(x, 'home') || inZone(x, 'duckies') || x >= ZONES.charleston[0];
}

export type PlacementKind =
  | 'mile' | 'shield' | 'guide' | 'billboard' | 'welcome'
  | 'boxes' | 'puddle' | 'mud' | 'rock' | 'ramp' | 'ball'
  | 'cow' | 'fence' | 'birds';

export interface Placement {
  x: number;
  kind: PlacementKind;
  n?: number;
  len?: number;
}

export interface RampSpec { x: number; len: number; height: number }

export const RAMPS: RampSpec[] = [
  { x: 33400, len: 300, height: 88 },
  { x: 52000, len: 300, height: 88 },
  { x: 66500, len: 300, height: 88 },
];

export function mileMarkerX(n: number): number {
  return MILE_FIRST_X + (10 - n) * MILE_SPACING;
}

function buildRoute(): Placement[] {
  const p: Placement[] = [];
  for (let n = 10; n >= 1; n--) p.push({ x: mileMarkerX(n), kind: 'mile', n });

  p.push({ x: 2500, kind: 'shield' });

  p.push({ x: 6000, kind: 'boxes', n: 3 });
  p.push({ x: 8600, kind: 'boxes', n: 2 });

  p.push({ x: 10600, kind: 'fence', len: 5200 });
  p.push({ x: 11500, kind: 'cow' });
  p.push({ x: 12700, kind: 'birds' });
  p.push({ x: 13600, kind: 'cow' });
  p.push({ x: 14300, kind: 'cow' });

  p.push({ x: 17600, kind: 'billboard' });

  p.push({ x: 20000, kind: 'puddle' });
  p.push({ x: 21600, kind: 'puddle' });
  p.push({ x: 23200, kind: 'puddle' });

  p.push({ x: 30800, kind: 'ball' });
  for (const r of RAMPS) p.push({ x: r.x, kind: 'ramp', len: r.len });

  p.push({ x: 37200, kind: 'boxes', n: 4 });

  p.push({ x: 40600, kind: 'fence', len: 6000 });
  p.push({ x: 41300, kind: 'mud', len: 600 });
  p.push({ x: 42800, kind: 'cow' });
  p.push({ x: 44000, kind: 'rock' });
  p.push({ x: 44500, kind: 'birds' });
  p.push({ x: 46000, kind: 'rock' });

  p.push({ x: 49200, kind: 'puddle' });
  p.push({ x: 54200, kind: 'boxes', n: 3 });

  p.push({ x: 56400, kind: 'welcome' });
  p.push({ x: 58500, kind: 'mud', len: 400 });
  p.push({ x: 61000, kind: 'rock' });
  p.push({ x: 64200, kind: 'guide' });
  p.push({ x: 70500, kind: 'boxes', n: 2 });
  p.push({ x: 72500, kind: 'puddle' });

  return p.sort((a, b) => a.x - b.x);
}

export const ROUTE: Placement[] = buildRoute();
