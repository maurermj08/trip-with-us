// Where everything big sits along the trip: bridges, cities, airports, zones.
// Home → Charleston keeps its original positions; each new leg is ~82k long.
import type { AirportSpec, BridgeSpec, CitySpec, Surface, ZoneSpec } from './types';
import { TRIP_SHIFT } from './shift';

/** Layout inside a city, relative to its x0 (the template Charleston was built with). */
export const CITY_LAYOUT = { arrive: 200, greet: 3600, greeters: 4100, stop: 4460, end: 5800, len: 6200 } as const;

const bridge = (b: Omit<BridgeSpec, 'end' | 'span'> & { len: number; span?: [number, number] }): BridgeSpec => ({
  ...b,
  end: b.start + b.len,
  span: b.span ?? [b.start + 250, b.start + b.len - 250],
});

export const BRIDGES: BridgeSpec[] = [
  // ---- the north-east legs ----
  // George Washington Bridge over the Hudson: the biggest climb of the trip.
  bridge({ id: 'gwb', kind: 'suspension', start: 16800, len: 6200, rise: 1500, top: 260, fall: 1500, under: 'water', pierStep: 760 }),
  // Arlington Memorial Bridge over the Potomac: low granite arches.
  bridge({ id: 'memorial', kind: 'stone-arch', start: 86000, len: 4400, rise: 900, top: 110, fall: 900, under: 'water', pierStep: 420 }),
  // I-95 over the James River into Richmond.
  bridge({ id: 'james-river', kind: 'girder', start: 124000, len: 4200, rise: 1000, top: 150, fall: 1000, under: 'water', pierStep: 520 }),
  // ---- the original legs ----
  bridge({ id: 'ravenel', kind: 'cable-stayed', start: TRIP_SHIFT + 76000, len: 4400, rise: 1000, top: 180, fall: 1000, under: 'water', pierStep: 520 }),
  bridge({ id: 'talmadge', kind: 'cable-stayed', start: TRIP_SHIFT + 158000, len: 4400, rise: 1100, top: 200, fall: 1100, under: 'water', pierStep: 560 }),
  bridge({ id: 'main-street', kind: 'lift', start: TRIP_SHIFT + 240000, len: 4400, rise: 900, top: 110, fall: 900, under: 'water', pierStep: 480 }),
  bridge({ id: 'i4-flyover', kind: 'flyover', start: TRIP_SHIFT + 322000, len: 4400, rise: 1300, top: 150, fall: 1300, under: 'ground', pierStep: 600, span: [TRIP_SHIFT + 322400, TRIP_SHIFT + 326000] }),
];

export const CITIES: CitySpec[] = [
  // The two biggest cities get twice the street.
  { id: 'new-york', name: 'New York', state: 'NY', x0: 23000, len: 12000, bridge: 'gwb' },
  { id: 'washington', name: 'Washington', state: 'DC', x0: 90400, len: 12000, bridge: 'memorial' },
  { id: 'richmond', name: 'Richmond', state: 'VA', x0: 128200, len: CITY_LAYOUT.len, bridge: 'james-river' },
  { id: 'charleston', name: 'Charleston', state: 'SC', x0: TRIP_SHIFT + 80400, len: CITY_LAYOUT.len, bridge: 'ravenel' },
  { id: 'savannah', name: 'Savannah', state: 'GA', x0: TRIP_SHIFT + 162400, len: CITY_LAYOUT.len, bridge: 'talmadge' },
  { id: 'jacksonville', name: 'Jacksonville', state: 'FL', x0: TRIP_SHIFT + 244400, len: CITY_LAYOUT.len, bridge: 'main-street' },
  { id: 'orlando', name: 'Orlando', state: 'FL', x0: TRIP_SHIFT + 326400, len: CITY_LAYOUT.len, bridge: 'i4-flyover' },
  // The grand finale: a short "World Drive" past Orlando, then through the gates.
  { id: 'potato-world', name: 'Potato World', state: 'FL', x0: TRIP_SHIFT + 326400 + CITY_LAYOUT.len + 2600, len: 7800, final: true },
];

export const AIRPORTS: AirportSpec[] = [
  { id: 'regional', size: 'small', x0: TRIP_SHIFT + 196000, len: 4400 },
  { id: 'international', size: 'large', x0: TRIP_SHIFT + 298000, len: 7200 },
];

export const FINAL_CITY: CitySpec = CITIES.find((c) => c.final)!;
export const ARRIVE_X = FINAL_CITY.x0 + CITY_LAYOUT.arrive;
export const GREET_X = FINAL_CITY.x0 + CITY_LAYOUT.greet;
export const WORLD_END = FINAL_CITY.x0 + CITY_LAYOUT.end;
/** The white stop line at the end of the trip (just past the family): the car's front stops here. */
export const STOP_X = FINAL_CITY.x0 + CITY_LAYOUT.stop;

export const CITY_SURFACE: Record<string, Surface> = {
  'new-york': 'avenue',
  washington: 'mall',
  richmond: 'brick',
  charleston: 'sidewalk',
  savannah: 'cobble',
  jacksonville: 'riverwalk',
  orlando: 'pavers',
  'potato-world': 'parade',
};

/** Every special stretch of road, sorted by x. */
const HOME_ZONE: ZoneSpec = { id: 'home', kind: 'home', a: 0, b: 1900, open: true, surface: 'sidewalk' };
const DUCKIES_ZONE: ZoneSpec = { id: 'duckies', kind: 'stop', a: TRIP_SHIFT + 25300, b: TRIP_SHIFT + 29200, open: true, surface: 'lot' };
/** A second Duckies in Florida, between Jacksonville and Orlando. */
const DUCKIES_FL_ZONE: ZoneSpec = { id: 'duckies-fl', kind: 'stop', a: TRIP_SHIFT + 256000, b: TRIP_SHIFT + 259900, open: true, surface: 'lot' };

/** Every Duckies stop (left edge of the lot). */
export const DUCKIES_STOPS: number[] = [DUCKIES_ZONE.a, DUCKIES_FL_ZONE.a];

export const ZONE_LIST: ZoneSpec[] = [
  HOME_ZONE,
  DUCKIES_ZONE,
  DUCKIES_FL_ZONE,
  ...BRIDGES.map((b): ZoneSpec => ({ id: b.id, kind: 'bridge', a: b.start - 200, b: b.end, open: false })),
  ...CITIES.map((c): ZoneSpec => ({ id: c.id, kind: 'city', a: c.x0, b: c.final ? WORLD_END + 2000 : c.x0 + c.len, open: true, surface: CITY_SURFACE[c.id] })),
  ...AIRPORTS.map((a): ZoneSpec => ({ id: `airport-${a.id}`, kind: 'airport', a: a.x0, b: a.x0 + a.len, open: false })),
].sort((p, q) => p.a - q.a);
