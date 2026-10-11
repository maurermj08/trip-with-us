// The trip's route skeleton: every trip drives the same sequence of legs, cities and set pieces.
// World units: x grows toward the destination, y=0 is the road contact line.
// The data lives in ./trip/ (pure, tested); this module is the public facade.
import { AIRPORTS, ARRIVE_X, BRIDGES, CITIES, CITY_LAYOUT, DUCKIES_STOPS, FINAL_CITY, GREET_X, STOP_X, WORLD_END, ZONE_LIST } from './trip/cities';
import type { BridgeSpec, ZoneSpec } from './trip/types';

export { AIRPORTS, ARRIVE_X, BRIDGES, CITIES, CITY_LAYOUT, DUCKIES_STOPS, FINAL_CITY, GREET_X, STOP_X, WORLD_END, ZONE_LIST };
export { ROUTE, RAMPS, MILES, MILE_COUNT, KEEP_OUT, mileMarkerX, layoutMiles, type Placement, type PlacementKind, type RampSpec, type BillboardDesign } from './trip/legs';
export { REGIONS, WATER_REGIONS, regionAt, skylineAt, timeOfDay, type Region, type SkylineStyle } from './trip/regions';
export type { AirportSpec, BridgeSpec, CityId, CitySpec, StateId, ZoneSpec } from './trip/types';

export const WORLD_START = 0;
export const CAR_START_X = 860;

/** The Ravenel Bridge (kept for older code; use BRIDGES for all of them). */
export const BRIDGE: BridgeSpec = BRIDGES[0];

const zone = (id: string) => ZONE_LIST.find((z) => z.id === id)!;

/** Named zones as [a, b] (legacy shape). */
export const ZONES = {
  home: [zone('home').a, zone('home').b],
  duckies: [zone('duckies').a, zone('duckies').b],
  charleston: [zone('charleston').a, zone('charleston').b],
  bridge: [zone('ravenel').a, zone('ravenel').b],
} as const;

export function zoneAt(x: number): ZoneSpec | null {
  for (const z of ZONE_LIST) if (x >= z.a && x <= z.b) return z;
  return null;
}

export function bridgeAt(x: number): BridgeSpec | null {
  for (const b of BRIDGES) if (x > b.start && x < b.end) return b;
  return null;
}

export function inZone(x: number, id: string): boolean {
  const z = id === 'bridge' ? zone('ravenel') : ZONE_LIST.find((zz) => zz.id === id);
  return !!z && x >= z.a && x <= z.b;
}

/** Stretches of road with no median barrier or highway poles. */
export function isOpenRoad(x: number): boolean {
  return zoneAt(x)?.open ?? false;
}

export function cityAt(x: number) {
  return CITIES.find((c) => x >= c.x0 && x <= c.x0 + c.len) ?? null;
}
