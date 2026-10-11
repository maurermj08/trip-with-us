// Scenery regions along the trip, the skyline style above them, and the time of day.
import { AIRPORTS, CITIES } from './cities';
import { TRIP_SHIFT } from './shift';
import type { CitySpec, SkyKey } from './types';

export type Region =
  // Home → New York → Washington → Richmond (the north-east legs)
  | 'hudson' | 'nyc' | 'industrial' | 'potomac' | 'dc' | 'jamesRiver' | 'richmond'
  // Home → Charleston (the original first leg)
  | 'suburb' | 'pines' | 'farm' | 'town' | 'duckies' | 'lowcountry' | 'marsh' | 'harbor' | 'charleston'
  // Georgia
  | 'port' | 'savannah' | 'gaCoast'
  // Florida
  | 'river' | 'jacksonville' | 'flatwoods' | 'citrus' | 'pasture' | 'lakes' | 'airport' | 'floridaSuburb' | 'orlando'
  // The finale
  | 'potatoWorld';

export const REGIONS: [number, Region][] = [
  [0, 'suburb'],
  // ---- the north-east legs ----
  [3600, 'pines'],
  [9000, 'town'],
  [13800, 'hudson'],
  [23000, 'nyc'],
  [35000, 'industrial'],
  [44000, 'farm'],
  [52000, 'pines'],
  [59000, 'marsh'],
  [66000, 'farm'],
  [74000, 'town'],
  [81500, 'potomac'],
  [90400, 'dc'],
  [102400, 'pines'],
  [110000, 'farm'],
  [117500, 'town'],
  [122500, 'jamesRiver'],
  [128200, 'richmond'],
  [134400, 'suburb'],
  // ---- the original legs (TRIP_SHIFT later than before) ----
  [TRIP_SHIFT + 3600, 'pines'],
  [TRIP_SHIFT + 10000, 'farm'],
  [TRIP_SHIFT + 16500, 'town'],
  [TRIP_SHIFT + 25300, 'duckies'],
  [TRIP_SHIFT + 29200, 'pines'],
  [TRIP_SHIFT + 40000, 'farm'],
  [TRIP_SHIFT + 48000, 'town'],
  [TRIP_SHIFT + 56000, 'lowcountry'],
  [TRIP_SHIFT + 68000, 'marsh'],
  [TRIP_SHIFT + 75400, 'harbor'],
  [TRIP_SHIFT + 80800, 'charleston'],
  // → Savannah
  [TRIP_SHIFT + 86600, 'lowcountry'],
  [TRIP_SHIFT + 96000, 'pines'],
  [TRIP_SHIFT + 106000, 'farm'],
  [TRIP_SHIFT + 116000, 'town'],
  [TRIP_SHIFT + 124000, 'lowcountry'],
  [TRIP_SHIFT + 140000, 'marsh'],
  [TRIP_SHIFT + 154000, 'port'],
  [TRIP_SHIFT + 162800, 'savannah'],
  // → Jacksonville
  [TRIP_SHIFT + 168600, 'lowcountry'],
  [TRIP_SHIFT + 176000, 'gaCoast'],
  [TRIP_SHIFT + 186000, 'pines'],
  [TRIP_SHIFT + 194000, 'airport'],
  [TRIP_SHIFT + 201000, 'gaCoast'],
  [TRIP_SHIFT + 210000, 'marsh'],
  [TRIP_SHIFT + 218000, 'flatwoods'],
  [TRIP_SHIFT + 226000, 'pasture'],
  [TRIP_SHIFT + 232000, 'town'],
  [TRIP_SHIFT + 237000, 'river'],
  [TRIP_SHIFT + 244800, 'jacksonville'],
  // → Orlando
  [TRIP_SHIFT + 250600, 'flatwoods'],
  [TRIP_SHIFT + 256000, 'duckies'],
  [TRIP_SHIFT + 259900, 'flatwoods'],
  [TRIP_SHIFT + 262000, 'citrus'],
  [TRIP_SHIFT + 272000, 'pasture'],
  [TRIP_SHIFT + 280000, 'flatwoods'],
  [TRIP_SHIFT + 290000, 'lakes'],
  [TRIP_SHIFT + 296000, 'airport'],
  [TRIP_SHIFT + 306000, 'citrus'],
  [TRIP_SHIFT + 314000, 'floridaSuburb'],
  [TRIP_SHIFT + 326800, 'orlando'],
  // World Drive, then the park.
  [TRIP_SHIFT + 332600, 'floridaSuburb'],
  [TRIP_SHIFT + 334400, 'potatoWorld'],
];

export const WATER_REGIONS = new Set<Region>(['harbor', 'marsh', 'port', 'river', 'gaCoast', 'hudson', 'potomac', 'jamesRiver']);

export function regionAt(x: number): Region {
  let r: Region = REGIONS[0][1];
  for (const [start, name] of REGIONS) {
    if (x >= start) r = name;
    else break;
  }
  return r;
}

/** What the far haze skyline shows. City skylines start rising ~6k before each city. */
export type SkylineStyle = 'hills' | 'town' | 'nyc' | 'dc' | 'richmond' | 'charleston' | 'savannah' | 'jacksonville' | 'orlando' | 'potato' | 'airport' | 'flat';

const CITY_SKYLINE: Record<CitySpec['id'], SkylineStyle> = {
  'new-york': 'nyc', washington: 'dc', richmond: 'richmond',
  charleston: 'charleston', savannah: 'savannah', jacksonville: 'jacksonville', orlando: 'orlando', 'potato-world': 'potato',
};
const isCitySkyline = (s: SkylineStyle) => Object.values(CITY_SKYLINE).includes(s);

const SKYLINE: [number, SkylineStyle][] = (() => {
  const keys: [number, SkylineStyle][] = [[0, 'hills']];
  for (const [x, r] of REGIONS) {
    if (r === 'town' || r === 'duckies') keys.push([x, 'town']);
    else if (r === 'flatwoods' || r === 'citrus' || r === 'pasture' || r === 'lakes' || r === 'floridaSuburb') keys.push([x, 'flat']);
    else if (r === 'airport') keys.push([x, 'airport']);
    else if (!['charleston', 'savannah', 'jacksonville', 'orlando', 'potatoWorld', 'nyc', 'dc', 'richmond'].includes(r)) keys.push([x, 'hills']);
  }
  for (const c of CITIES) {
    keys.push([c.x0 - 6000, CITY_SKYLINE[c.id]]);
    keys.push([c.x0 + (c.final ? 20000 : c.len + 1500), 'hills']);
  }
  keys.sort((a, b) => a[0] - b[0]);
  // A city skyline wins over the regions it overlaps.
  const out: [number, SkylineStyle][] = [];
  let city: SkylineStyle | null = null;
  let cityEnd = -1;
  for (const [x, s] of keys) {
    if (isCitySkyline(s)) {
      const c = CITIES.find((cc) => CITY_SKYLINE[cc.id] === s)!;
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

/** Morning at home, day for most of the trip, golden hour from the big airport to Orlando (and on to the park). */
export const SKY_KEYS: SkyKey[] = [
  { x: 0, morning: 1, gold: 0 },
  { x: 30000, morning: 0, gold: 0 },
  { x: AIRPORTS[1].x0 - 2000, morning: 0, gold: 0 },
  { x: AIRPORTS[1].x0 + AIRPORTS[1].len, morning: 0, gold: 0.35 },
  { x: CITIES.find((c) => c.id === 'orlando')!.x0, morning: 0, gold: 1 },
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
