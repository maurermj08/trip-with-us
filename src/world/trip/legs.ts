// What sits along each leg of the trip. Positions are absolute world x.
// Mile markers count down 100 → 1 over the whole trip, evenly spaced around special zones;
// ramps always land between two markers.
import { BRIDGES, CITIES, CITY_LAYOUT, ZONE_LIST } from './cities';
import { TRIP_SHIFT } from './shift';

const CITY_LEN = CITY_LAYOUT.len;
import type { CityId, StateId } from './types';

export type PlacementKind =
  | 'mile' | 'shield' | 'guide' | 'billboard' | 'welcome'
  | 'boxes' | 'puddle' | 'mud' | 'rock' | 'ramp' | 'ball'
  | 'cow' | 'fence' | 'birds'
  | 'orange-tree' | 'crate' | 'gator' | 'oj-stand'
  | 'potato-countdown' | 'potato-gantry';

export type BillboardDesign = 'pizza' | 'crabs' | 'duckies' | 'peaches' | 'oj' | 'chomp' | 'potato' | 'potato-castle' | 'potato-monorail' | 'potato-almost';

export interface Placement {
  x: number;
  kind: PlacementKind;
  n?: number;
  len?: number;
  /** Guide signs. */
  city?: CityId | 'downtown-orlando' | 'airport';
  exit?: string;
  shield?: string;
  /** Welcome signs. */
  state?: StateId;
  /** Billboards. */
  design?: BillboardDesign;
}

export interface RampSpec { x: number; len: number; height: number }

export const MILE_COUNT = 100;
export const MILE_FIRST_X = 3200;
const MILE_LAST_X = BRIDGES.find((b) => b.id === 'i4-flyover')!.start - 1000; // just before the I-4 flyover
const MILE_KEEP_OUT_PAD = 400;

/** Stretches markers and ramps stay out of (everything special except home). */
export const KEEP_OUT: [number, number][] = ZONE_LIST.filter((z) => z.kind !== 'home').map((z) => [z.a - MILE_KEEP_OUT_PAD, z.b + MILE_KEEP_OUT_PAD]);

/** Evenly spaced positions over [first, last], measured only along road outside keep-outs. */
export function layoutMiles(first: number, last: number, count: number, keepOut: [number, number][]): number[] {
  const merged = [...keepOut].sort((a, b) => a[0] - b[0]).reduce<[number, number][]>((acc, r) => {
    const top = acc[acc.length - 1];
    if (top && r[0] <= top[1]) top[1] = Math.max(top[1], r[1]);
    else acc.push([r[0], r[1]]);
    return acc;
  }, []);
  const gaps: [number, number][] = [];
  let cur = first;
  for (const [a, b] of merged) {
    if (b < first || a > last) continue;
    if (a > cur) gaps.push([cur, Math.min(a, last)]);
    cur = Math.max(cur, b);
  }
  if (cur < last) gaps.push([cur, last]);
  const total = gaps.reduce((s, [a, b]) => s + (b - a), 0);
  const step = total / (count - 1);
  const out: number[] = [];
  for (let k = 0; k < count; k++) {
    let d = Math.min(k * step, total - 1e-6);
    for (const [a, b] of gaps) {
      if (d <= b - a) {
        out.push(Math.round(a + d));
        break;
      }
      d -= b - a;
    }
  }
  return out;
}

/** MILES[0] is marker 100 (nearest home), MILES[99] is marker 1. */
export const MILES = layoutMiles(MILE_FIRST_X, MILE_LAST_X, MILE_COUNT, KEEP_OUT);
export const mileMarkerX = (n: number): number => MILES[MILE_COUNT - n];

const RAMP_LEN = 300;
const RAMP_H = 88;

/** A ramp centred between the two markers closest to `target`, clear of every zone. */
function rampNear(target: number): RampSpec {
  const options = MILES.slice(0, -1)
    .map((m, i) => (m + MILES[i + 1]) / 2 - RAMP_LEN / 2)
    .filter((x) => !KEEP_OUT.some(([a, b]) => x + RAMP_LEN > a && x < b))
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
  return { x: Math.round(options[0]), len: RAMP_LEN, height: RAMP_H };
}

/** Ramps on the north-east legs (at most a few per leg; each snaps to between two markers). */
const NE_RAMP_TARGETS = [9500, 49000, 71000, 113500];

export const RAMPS: RampSpec[] = [
  // north-east legs
  ...NE_RAMP_TARGETS,
  // the original legs
  ...[33400, 52000, 66500, 101000, 136000, 183000, 233500, 264000, 290500].map((x) => TRIP_SHIFT + x),
].map(rampNear);

const cityX = (id: CityId) => CITIES.find((c) => c.id === id)!.x0;

function buildRoute(): Placement[] {
  const p: Placement[] = [];
  const add = (x: number, kind: PlacementKind, extra: Partial<Placement> = {}) => p.push({ x, kind, ...extra });

  for (let n = MILE_COUNT; n >= 1; n--) add(mileMarkerX(n), 'mile', { n });
  for (const r of RAMPS) add(r.x, 'ramp', { len: r.len });

  // ---------- North-east leg A: Home → New York (over the George Washington Bridge) ----------
  add(2500, 'shield', { shield: '95' });
  add(5200, 'welcome', { state: 'NY' });
  add(7200, 'boxes', { n: 2 });
  add(11800, 'guide', { city: 'new-york', exit: '1', shield: '95' });
  add(12900, 'puddle');
  add(14600, 'rock');

  // ---------- North-east leg B: New York → Washington DC (NJ, Maryland, the Potomac) ----------
  add(36600, 'shield', { shield: '95' });
  add(38600, 'welcome', { state: 'NJ' });
  add(40800, 'billboard', { design: 'pizza' });
  add(43200, 'boxes', { n: 3 });
  add(45000, 'fence', { len: 4800 });
  add(46000, 'cow');
  add(47600, 'birds');
  add(52800, 'puddle');
  add(55200, 'boxes', { n: 2 });
  add(57600, 'mud', { len: 260 });
  add(61800, 'welcome', { state: 'MD' });
  add(63800, 'billboard', { design: 'crabs' });
  add(66500, 'fence', { len: 3600 });
  add(67400, 'cow');
  add(68800, 'cow');
  add(73800, 'ball');
  add(76400, 'boxes', { n: 4 });
  add(78400, 'guide', { city: 'washington', exit: '170', shield: '395' });
  add(80200, 'puddle');
  add(84200, 'welcome', { state: 'DC' });

  // ---------- North-east leg C: Washington → Richmond (Virginia) ----------
  add(104200, 'shield', { shield: '95' });
  add(106000, 'welcome', { state: 'VA' });
  add(108200, 'boxes', { n: 3 });
  add(111000, 'fence', { len: 3800 });
  add(112000, 'cow');
  add(113000, 'birds');
  add(117000, 'puddle');
  add(119600, 'guide', { city: 'richmond', exit: '74', shield: '64' });
  add(121600, 'rock');

  // ---------- Richmond → the original first leg (the Carolinas) ----------
  add(135600, 'shield', { shield: '95' });
  add(137800, 'welcome', { state: 'NC' });

  // ---------- Leg 1: the Carolinas → Charleston (the original first leg, unchanged set pieces) ----------
  add(TRIP_SHIFT + 6000, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 8600, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 10600, 'fence', { len: 5200 });
  add(TRIP_SHIFT + 11500, 'cow');
  add(TRIP_SHIFT + 12700, 'birds');
  add(TRIP_SHIFT + 13600, 'cow');
  add(TRIP_SHIFT + 14300, 'cow');
  add(TRIP_SHIFT + 17600, 'billboard', { design: 'duckies' });
  add(TRIP_SHIFT + 21600, 'puddle');
  add(TRIP_SHIFT + 30800, 'ball');
  add(TRIP_SHIFT + 37200, 'boxes', { n: 4 });
  add(TRIP_SHIFT + 40600, 'fence', { len: 6000 });
  add(TRIP_SHIFT + 41300, 'mud', { len: 260 });
  add(TRIP_SHIFT + 42800, 'cow');
  add(TRIP_SHIFT + 44000, 'rock');
  add(TRIP_SHIFT + 44500, 'birds');
  add(TRIP_SHIFT + 46000, 'rock');
  add(TRIP_SHIFT + 49200, 'puddle');
  add(TRIP_SHIFT + 54200, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 56400, 'welcome', { state: 'SC' });
  add(TRIP_SHIFT + 58500, 'mud', { len: 260 });
  add(TRIP_SHIFT + 61000, 'rock');
  add(TRIP_SHIFT + 64200, 'guide', { city: 'charleston', exit: '221', shield: '26' });
  add(TRIP_SHIFT + 70500, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 72500, 'puddle');

  // ---------- Leg 2: Charleston → Savannah ----------
  add(TRIP_SHIFT + 87400, 'shield', { shield: '95' });
  add(TRIP_SHIFT + 88800, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 90500, 'billboard', { design: 'peaches' });
  add(TRIP_SHIFT + 94800, 'puddle');
  add(TRIP_SHIFT + 98000, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 104600, 'fence', { len: 5000 });
  add(TRIP_SHIFT + 105500, 'cow');
  add(TRIP_SHIFT + 107000, 'cow');
  add(TRIP_SHIFT + 108300, 'birds');
  add(TRIP_SHIFT + 109500, 'mud', { len: 260 });
  add(TRIP_SHIFT + 112000, 'rock');
  add(TRIP_SHIFT + 114000, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 118000, 'ball');
  add(TRIP_SHIFT + 121800, 'puddle');
  add(TRIP_SHIFT + 125500, 'boxes', { n: 4 });
  add(TRIP_SHIFT + 130500, 'mud', { len: 260 });
  add(TRIP_SHIFT + 133000, 'rock');
  add(TRIP_SHIFT + 138400, 'fence', { len: 600 });
  add(TRIP_SHIFT + 138800, 'birds');
  add(TRIP_SHIFT + 142000, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 146000, 'guide', { city: 'savannah', exit: '5', shield: 'US17' });
  add(TRIP_SHIFT + 148500, 'puddle');
  add(TRIP_SHIFT + 151000, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 153500, 'rock');
  add(cityX('savannah') + 250, 'welcome', { state: 'GA' });

  // ---------- Leg 3: Savannah → Jacksonville ----------
  add(TRIP_SHIFT + 169400, 'shield', { shield: '95' });
  add(TRIP_SHIFT + 171000, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 174000, 'ball');
  add(TRIP_SHIFT + 176500, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 179800, 'puddle');
  add(TRIP_SHIFT + 186500, 'rock');
  add(TRIP_SHIFT + 189000, 'billboard', { design: 'oj' });
  add(TRIP_SHIFT + 192000, 'guide', { city: 'airport', exit: '29' });
  add(TRIP_SHIFT + 202500, 'mud', { len: 260 });
  add(TRIP_SHIFT + 205000, 'rock');
  add(TRIP_SHIFT + 207000, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 211200, 'puddle');
  add(TRIP_SHIFT + 214400, 'fence', { len: 600 });
  add(TRIP_SHIFT + 214800, 'birds');
  add(TRIP_SHIFT + 217000, 'welcome', { state: 'FL' });
  add(TRIP_SHIFT + 218600, 'oj-stand');
  add(TRIP_SHIFT + 221000, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 223500, 'gator');
  add(TRIP_SHIFT + 226500, 'fence', { len: 4800 });
  add(TRIP_SHIFT + 227500, 'cow');
  add(TRIP_SHIFT + 229200, 'cow');
  add(TRIP_SHIFT + 230300, 'birds');
  add(TRIP_SHIFT + 231500, 'mud', { len: 260 });
  add(TRIP_SHIFT + 235000, 'guide', { city: 'jacksonville', exit: '352', shield: '10' });
  add(TRIP_SHIFT + 237500, 'boxes', { n: 2 });

  // ---------- Leg 4: Jacksonville → Orlando ----------
  add(TRIP_SHIFT + 251400, 'shield', { shield: '95' });
  add(TRIP_SHIFT + 252500, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 253000, 'billboard', { design: 'duckies' });
  add(TRIP_SHIFT + 255000, 'ball');
  add(TRIP_SHIFT + 261700, 'crate');
  add(TRIP_SHIFT + 260800, 'puddle');
  add(TRIP_SHIFT + 262600, 'fence', { len: 7000 });
  for (let x = TRIP_SHIFT + 263000; x <= TRIP_SHIFT + 269000; x += 750) add(x, 'orange-tree');
  add(TRIP_SHIFT + 266400, 'birds');
  add(TRIP_SHIFT + 270500, 'crate');
  add(TRIP_SHIFT + 272600, 'fence', { len: 4000 });
  add(TRIP_SHIFT + 273500, 'cow');
  add(TRIP_SHIFT + 275000, 'gator');
  add(TRIP_SHIFT + 276500, 'cow');
  add(TRIP_SHIFT + 277800, 'rock');
  add(TRIP_SHIFT + 279000, 'guide', { city: 'orlando', exit: '260B', shield: '4' });
  add(TRIP_SHIFT + 280500, 'shield', { shield: '4' });
  add(TRIP_SHIFT + 282500, 'billboard', { design: 'potato' });
  add(TRIP_SHIFT + 285000, 'boxes', { n: 3 });
  add(TRIP_SHIFT + 287800, 'puddle');
  add(TRIP_SHIFT + 293000, 'mud', { len: 260 });
  add(TRIP_SHIFT + 294500, 'guide', { city: 'airport', exit: '78' });
  add(TRIP_SHIFT + 306500, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 308000, 'crate');
  add(TRIP_SHIFT + 309000, 'fence', { len: 3500 });
  for (let x = TRIP_SHIFT + 309400; x <= TRIP_SHIFT + 312400; x += 750) add(x, 'orange-tree');
  add(TRIP_SHIFT + 313500, 'rock');
  add(TRIP_SHIFT + 315500, 'shield', { shield: '4' });
  add(TRIP_SHIFT + 317000, 'boxes', { n: 2 });
  add(TRIP_SHIFT + 318500, 'guide', { city: 'downtown-orlando', exit: '83', shield: '4' });
  add(TRIP_SHIFT + 320000, 'puddle');

  // ---------- Hype for the finale: Potato World billboards and the NEXT EXIT gantry ----------
  // (all behind the road; the gantry and last billboard are on World Drive)
  add(TRIP_SHIFT + 266000, 'billboard', { design: 'potato-castle' });
  add(TRIP_SHIFT + 311500, 'billboard', { design: 'potato-monorail' });
  add(cityX('orlando') + CITY_LEN + 600, 'potato-gantry');
  add(cityX('orlando') + CITY_LEN + 1700, 'billboard', { design: 'potato-almost' });

  return p.sort((a, b) => a.x - b.x);
}

export const ROUTE: Placement[] = buildRoute();
