// Richmond, VA: the river city. The Canal Walk and its tour boat on the near side (starting at
// the flood wall), old brick tobacco warehouses with painted signs, Main Street Station's clock
// tower, the rail trestle with a passing train, downtown towers, the Virginia State Capitol on
// its hill, the Carillon bell tower, a mural wall and dogwoods in bloom.
// The James River crossing (rapids, Belle Isle footbridge) is built from its BridgeSpec in ./bridges.
import type { Ctx } from '../core/Ctx';
import type { Prop } from '../props/Prop';
import { CITIES } from '../world/Route';
import { Tower } from './kit/towers';
import { WALK, type CitySet } from './kit/common';
import { CanalBoat, CanalWalk } from './kit/rvaRiver';
import { Carillon, Dogwood, MuralWall, RvaWarehouse, StateCapitol, StationClock, Trestle } from './kit/rvaBuildings';

export { BelleIsleBridge, CanalBoat, CanalWalk, Heron, Kayaker, Rapids, TubeFloaters } from './kit/rvaRiver';
export { Carillon, Dogwood, MuralWall, RvaWarehouse, StateCapitol, StationClock, Trestle } from './kit/rvaBuildings';

const X0 = CITIES.find((c) => c.id === 'richmond')!.x0;

/** Warehouse brick colors and their ghost signs (parody names). */
const WAREHOUSES: [number, number, number, string][] = [
  // [offset, width, floors, sign]
  [260, 300, 4, 'JAMES RIVER BISCUIT CO.'],
  [600, 250, 5, 'OLD DOMINION FEED & SEED'],
  [1600, 290, 4, 'RIVER CITY SODA WORKS'],
  [1930, 230, 5, 'SEVEN HILLS SOAP'],
];
const WAREHOUSE_BRICK = [0xb05a43, 0xa4573f, 0xbd6a4c, 0x9c5a46];

/** All positions are relative to x0 (the end of the James River bridge). */
export function buildRichmond(ctx: Ctx, x0: number = X0): CitySet {
  const props: Prop[] = [];
  // Near side: the flood wall and the Canal Walk, with its tour boat.
  props.push(new CanalWalk(ctx, x0 + 140, 2800));
  props.push(new CanalBoat(ctx, x0 + 400, 2200));

  // Shockoe Bottom: brick warehouses, Main Street Station, and the trestle in front of them.
  WAREHOUSES.forEach(([dx, w, floors, sign], i) => props.push(new RvaWarehouse(ctx, x0 + dx, w, floors, WAREHOUSE_BRICK[i], sign, i)));
  props.push(new StationClock(ctx, x0 + 1080));
  props.push(new Trestle(ctx, x0 + 180, 2100));
  props.push(new Dogwood(ctx, x0 + 2300, WALK - 2, 170, true, false));

  // Downtown: a few towers in brick, glass and stone.
  props.push(new Tower(ctx, x0 + 2560, { variant: 'granite', w: 180, h: 470, note: 2, look: { body: 0xc9a58a, shade: 0xb48f74, glass: 0xf2e2d2, trim: 0xe6d0bc } }));
  props.push(new Tower(ctx, x0 + 2820, { variant: 'slab', w: 170, h: 560, note: 0, look: { body: 0x5a7590, shade: 0x4c6680 } }));
  props.push(new Tower(ctx, x0 + 3070, { variant: 'crown', w: 160, h: 430, note: 4, look: { body: 0xa7c3d6, shade: 0x92afc4 } }));

  // Capitol Square on its hill, with dogwoods around it.
  props.push(new Dogwood(ctx, x0 + 3420, WALK - 2, 150, false, false));
  props.push(new StateCapitol(ctx, x0 + 3800));
  props.push(new Dogwood(ctx, x0 + 4230, WALK - 2, 160, true, false));

  // Byrd Park's Carillon, a mural wall, and more dogwoods to the city's edge.
  props.push(new Carillon(ctx, x0 + 4700));
  props.push(new Dogwood(ctx, x0 + 4980, WALK - 2, 150, false, false));
  props.push(new MuralWall(ctx, x0 + 5180, 420));
  props.push(new Dogwood(ctx, x0 + 5800, WALK - 2, 170, true, false));

  // Near-side dogwoods past the canal.
  [3200, 4450, 5500, 6050].forEach((dx, k) => props.push(new Dogwood(ctx, x0 + dx, 80, 150 + (k % 2) * 30, k % 2 === 0, true)));
  return { props, doorX: x0 + 3900 };
}
