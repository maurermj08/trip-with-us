// Scenery regions along the trip, the skyline style above them, and the time of day.
import { AIRPORTS, CITIES, FINAL_CITY } from './cities';
import type { SkyKey } from './types';

export type Region =
  // Home → Charleston
  | 'suburb' | 'pines' | 'farm' | 'town' | 'duckies' | 'lowcountry' | 'marsh' | 'harbor' | 'charleston'
  // Georgia
  | 'port' | 'savannah' | 'gaCoast'
  // Florida
  | 'river' | 'jacksonville' | 'flatwoods' | 'citrus' | 'pasture' | 'lakes' | 'airport' | 'floridaSuburb' | 'orlando';

export const REGIONS: [number, Region][] = [
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
  // → Savannah
  [86600, 'lowcountry'],
  [96000, 'pines'],
  [106000, 'farm'],
  [116000, 'town'],
  [124000, 'lowcountry'],
  [140000, 'marsh'],
  [154000, 'port'],
  [162800, 'savannah'],
  // → Jacksonville
  [168600, 'lowcountry'],
  [176000, 'gaCoast'],
  [186000, 'pines'],
  [194000, 'airport'],
  [201000, 'gaCoast'],
  [210000, 'marsh'],
  [218000, 'flatwoods'],
  [226000, 'pasture'],
  [232000, 'town'],
  [237000, 'river'],
  [244800, 'jacksonville'],
  // → Orlando
  [250600, 'flatwoods'],
  [262000, 'citrus'],
  [272000, 'pasture'],
  [280000, 'flatwoods'],
  [290000, 'lakes'],
  [296000, 'airport'],
  [306000, 'citrus'],
  [314000, 'floridaSuburb'],
  [326800, 'orlando'],
];

export const WATER_REGIONS = new Set<Region>(['harbor', 'marsh', 'port', 'river', 'gaCoast']);

export function regionAt(x: number): Region {
  let r: Region = REGIONS[0][1];
  for (const [start, name] of REGIONS) {
    if (x >= start) r = name;
    else break;
  }
  return r;
}

/** What the far haze skyline shows. City skylines start rising ~6k before each city. */
export type SkylineStyle = 'hills' | 'town' | 'charleston' | 'savannah' | 'jacksonville' | 'orlando' | 'airport' | 'flat';

const SKYLINE: [number, SkylineStyle][] = (() => {
  const keys: [number, SkylineStyle][] = [[0, 'hills']];
  for (const [x, r] of REGIONS) {
    if (r === 'town' || r === 'duckies') keys.push([x, 'town']);
    else if (r === 'flatwoods' || r === 'citrus' || r === 'pasture' || r === 'lakes' || r === 'floridaSuburb') keys.push([x, 'flat']);
    else if (r === 'airport') keys.push([x, 'airport']);
    else if (r !== 'charleston' && r !== 'savannah' && r !== 'jacksonville' && r !== 'orlando') keys.push([x, 'hills']);
  }
  for (const c of CITIES) {
    keys.push([c.x0 - 6000, c.id]);
    keys.push([c.x0 + (c.final ? 20000 : c.len + 1500), 'hills']);
  }
  keys.sort((a, b) => a[0] - b[0]);
  // A city skyline wins over the regions it overlaps.
  const out: [number, SkylineStyle][] = [];
  let city: SkylineStyle | null = null;
  let cityEnd = -1;
  for (const [x, s] of keys) {
    if (s === 'charleston' || s === 'savannah' || s === 'jacksonville' || s === 'orlando') {
      const c = CITIES.find((cc) => cc.id === s)!;
      city = s;
      cityEnd = c.x0 + (c.final ? 20000 : c.len + 1500);
      out.push([x, s]);
    } else if (city && x < cityEnd) {
      continue;
    } else {
      city = null;
      out.push([x, s]);
    }
  }
  return out;
})();

export function skylineAt(x: number): SkylineStyle {
  let s: SkylineStyle = 'hills';
  for (const [start, style] of SKYLINE) {
    if (x >= start) s = style;
    else break;
  }
  return s;
}

/** Morning at home, day for most of the trip, golden hour from the big airport to Orlando. */
export const SKY_KEYS: SkyKey[] = [
  { x: 0, morning: 1, gold: 0 },
  { x: 30000, morning: 0, gold: 0 },
  { x: AIRPORTS[1].x0 - 2000, morning: 0, gold: 0 },
  { x: AIRPORTS[1].x0 + AIRPORTS[1].len, morning: 0, gold: 0.35 },
  { x: FINAL_CITY.x0, morning: 0, gold: 1 },
];

export function timeOfDay(x: number): { morning: number; gold: number } {
  const k = SKY_KEYS;
  if (x <= k[0].x) return { morning: k[0].morning, gold: k[0].gold };
  for (let i = 1; i < k.length; i++) {
    if (x <= k[i].x) {
      const t = (x - k[i - 1].x) / (k[i].x - k[i - 1].x);
      return { morning: k[i - 1].morning + (k[i].morning - k[i - 1].morning) * t, gold: k[i - 1].gold + (k[i].gold - k[i - 1].gold) * t };
    }
  }
  const last = k[k.length - 1];
  return { morning: last.morning, gold: last.gold };
}
