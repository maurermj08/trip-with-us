// What sits along each leg of the trip. Positions are absolute world x.
// Mile markers count down 100 → 1 over the whole trip, evenly spaced around special zones;
// ramps always land between two markers.
import { BRIDGES, CITIES, CITY_LAYOUT, ZONE_LIST } from './cities';

const CITY_LEN = CITY_LAYOUT.len;
import type { CityId, StateId } from './types';

export type PlacementKind =
  | 'mile' | 'shield' | 'guide' | 'billboard' | 'welcome'
  | 'boxes' | 'puddle' | 'mud' | 'rock' | 'ramp' | 'ball'
  | 'cow' | 'fence' | 'birds'
  | 'orange-tree' | 'crate' | 'gator' | 'oj-stand'
  | 'potato-countdown' | 'potato-gantry';

export type BillboardDesign = 'duckies' | 'peaches' | 'oj' | 'chomp' | 'potato' | 'potato-castle' | 'potato-monorail' | 'potato-almost';

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
const MILE_LAST_X = BRIDGES[BRIDGES.length - 1].start - 1000; // just before the last bridge (the I-4 flyover)
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

export const RAMPS: RampSpec[] = [33400, 52000, 66500, 101000, 136000, 183000, 233500, 264000, 290500].map(rampNear);

const cityX = (id: CityId) => CITIES.find((c) => c.id === id)!.x0;

function buildRoute(): Placement[] {
  const p: Placement[] = [];
  const add = (x: number, kind: PlacementKind, extra: Partial<Placement> = {}) => p.push({ x, kind, ...extra });

  for (let n = MILE_COUNT; n >= 1; n--) add(mileMarkerX(n), 'mile', { n });
  for (const r of RAMPS) add(r.x, 'ramp', { len: r.len });

  // ---------- Leg 1: Home → Charleston (unchanged set pieces) ----------
  add(2500, 'shield', { shield: '95' });
  add(6000, 'boxes', { n: 3 });
  add(8600, 'boxes', { n: 2 });
  add(10600, 'fence', { len: 5200 });
  add(11500, 'cow');
  add(12700, 'birds');
  add(13600, 'cow');
  add(14300, 'cow');
  add(17600, 'billboard', { design: 'duckies' });
  add(21600, 'puddle');
  add(30800, 'ball');
  add(37200, 'boxes', { n: 4 });
  add(40600, 'fence', { len: 6000 });
  add(41300, 'mud', { len: 260 });
  add(42800, 'cow');
  add(44000, 'rock');
  add(44500, 'birds');
  add(46000, 'rock');
  add(49200, 'puddle');
  add(54200, 'boxes', { n: 3 });
  add(56400, 'welcome', { state: 'SC' });
  add(58500, 'mud', { len: 260 });
  add(61000, 'rock');
  add(64200, 'guide', { city: 'charleston', exit: '221', shield: '26' });
  add(70500, 'boxes', { n: 2 });
  add(72500, 'puddle');

  // ---------- Leg 2: Charleston → Savannah ----------
  add(87400, 'shield', { shield: '95' });
  add(88800, 'boxes', { n: 3 });
  add(90500, 'billboard', { design: 'peaches' });
  add(94800, 'puddle');
  add(98000, 'boxes', { n: 2 });
  add(104600, 'fence', { len: 5000 });
  add(105500, 'cow');
  add(107000, 'cow');
  add(108300, 'birds');
  add(109500, 'mud', { len: 260 });
  add(112000, 'rock');
  add(114000, 'boxes', { n: 3 });
  add(118000, 'ball');
  add(121800, 'puddle');
  add(125500, 'boxes', { n: 4 });
  add(130500, 'mud', { len: 260 });
  add(133000, 'rock');
  add(138400, 'fence', { len: 600 });
  add(138800, 'birds');
  add(142000, 'boxes', { n: 3 });
  add(146000, 'guide', { city: 'savannah', exit: '5', shield: 'US17' });
  add(148500, 'puddle');
  add(151000, 'boxes', { n: 2 });
  add(153500, 'rock');
  add(cityX('savannah') + 250, 'welcome', { state: 'GA' });

  // ---------- Leg 3: Savannah → Jacksonville ----------
  add(169400, 'shield', { shield: '95' });
  add(171000, 'boxes', { n: 2 });
  add(174000, 'ball');
  add(176500, 'boxes', { n: 3 });
  add(179800, 'puddle');
  add(186500, 'rock');
  add(189000, 'billboard', { design: 'oj' });
  add(192000, 'guide', { city: 'airport', exit: '29' });
  add(202500, 'mud', { len: 260 });
  add(205000, 'rock');
  add(207000, 'boxes', { n: 3 });
  add(211200, 'puddle');
  add(214400, 'fence', { len: 600 });
  add(214800, 'birds');
  add(217000, 'welcome', { state: 'FL' });
  add(218600, 'oj-stand');
  add(221000, 'boxes', { n: 3 });
  add(223500, 'gator');
  add(226500, 'fence', { len: 4800 });
  add(227500, 'cow');
  add(229200, 'cow');
  add(230300, 'birds');
  add(231500, 'mud', { len: 260 });
  add(235000, 'guide', { city: 'jacksonville', exit: '352', shield: '10' });
  add(237500, 'boxes', { n: 2 });

  // ---------- Leg 4: Jacksonville → Orlando ----------
  add(251400, 'shield', { shield: '95' });
  add(252500, 'boxes', { n: 2 });
  add(253000, 'billboard', { design: 'duckies' });
  add(255000, 'ball');
  add(261700, 'crate');
  add(260800, 'puddle');
  add(262600, 'fence', { len: 7000 });
  for (let x = 263000; x <= 269000; x += 750) add(x, 'orange-tree');
  add(266400, 'birds');
  add(270500, 'crate');
  add(272600, 'fence', { len: 4000 });
  add(273500, 'cow');
  add(275000, 'gator');
  add(276500, 'cow');
  add(277800, 'rock');
  add(279000, 'guide', { city: 'orlando', exit: '260B', shield: '4' });
  add(280500, 'shield', { shield: '4' });
  add(282500, 'billboard', { design: 'potato' });
  add(285000, 'boxes', { n: 3 });
  add(287800, 'puddle');
  add(293000, 'mud', { len: 260 });
  add(294500, 'guide', { city: 'airport', exit: '78' });
  add(306500, 'boxes', { n: 2 });
  add(308000, 'crate');
  add(309000, 'fence', { len: 3500 });
  for (let x = 309400; x <= 312400; x += 750) add(x, 'orange-tree');
  add(313500, 'rock');
  add(315500, 'shield', { shield: '4' });
  add(317000, 'boxes', { n: 2 });
  add(318500, 'guide', { city: 'downtown-orlando', exit: '83', shield: '4' });
  add(320000, 'puddle');

  // ---------- Hype for the finale: Potato World billboards and the NEXT EXIT gantry ----------
  // (all behind the road; the gantry and last billboard are on World Drive)
  add(266000, 'billboard', { design: 'potato-castle' });
  add(311500, 'billboard', { design: 'potato-monorail' });
  add(cityX('orlando') + CITY_LEN + 600, 'potato-gantry');
  add(cityX('orlando') + CITY_LEN + 1700, 'billboard', { design: 'potato-almost' });

  return p.sort((a, b) => a.x - b.x);
}

export const ROUTE: Placement[] = buildRoute();
