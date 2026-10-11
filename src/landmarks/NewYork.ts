// New York, NY: the biggest city of the trip (twice a normal city's street). Coming off the
// George Washington Bridge you drive down through the boroughs' greatest hits:
//   uptown brownstones with stoops → Central Park with a horse carriage → Midtown (Times Square,
//   the Chrysler, the Empire State, cabs, a subway, steam from a manhole) → the Flatiron →
//   the harbor: the Brooklyn Bridge across the East River and the Statue of Liberty.
// Every piece is tappable. The bridge itself is built from its BridgeSpec in ./bridges.
import type { Ctx } from '../core/Ctx';
import type { Prop } from '../props/Prop';
import { CITIES } from '../world/Route';
import { Tower } from './kit/towers';
import { RiverBand } from './kit/riverfront';
import { BROWNSTONES, Brownstone, Chrysler, EmpireState, Flatiron, NycMidRise, TimesSquare } from './kit/nycBuildings';
import { BrooklynBridge, Cab, CentralPark, FoodCart, HorseCarriage, Hydrant, Pigeons, StatueOfLiberty, SteamVent, SubwayEntrance } from './kit/nycStreet';
import type { CitySet } from './kit/common';

export { Brownstone, Chrysler, EmpireState, Flatiron, NycMidRise, TimesSquare, BROWNSTONES } from './kit/nycBuildings';
export { BrooklynBridge, Cab, CentralPark, FoodCart, HorseCarriage, Hydrant, Pigeons, StatueOfLiberty, SteamVent, SubwayEntrance } from './kit/nycStreet';

const X0 = CITIES.find((c) => c.id === 'new-york')!.x0;

/** NYC stone, brick and limestone for the filler buildings. */
const NYC_STONE = [0xd9cbb4, 0xc9a98a, 0xb8c2cc, 0xe3d9c6, 0xa88b78];

/** All positions are relative to x0 (the end of the George Washington Bridge). */
export function buildNewYork(ctx: Ctx, x0: number = X0): CitySet {
  const props: Prop[] = [];
  const at = (dx: number) => x0 + dx;

  // ---------- Uptown: a row of brownstones with stoops ----------
  let x = at(260);
  let i = 0;
  while (x < at(2250)) {
    const w = [230, 250, 215, 240][i % 4];
    props.push(new Brownstone(ctx, x, w, BROWNSTONES[i % BROWNSTONES.length], i));
    x += w + 2;
    i++;
  }
  props.push(new Cab(ctx, at(820)));
  props.push(new Pigeons(ctx, at(1450), 6));
  props.push(new FoodCart(ctx, at(2050), 'pretzel'));
  props.push(new Hydrant(ctx, at(640)));

  // ---------- Central Park, with a horse and carriage on the drive ----------
  props.push(new CentralPark(ctx, at(2400), 2300));
  props.push(new HorseCarriage(ctx, at(2550), 1900));
  props.push(new Pigeons(ctx, at(4300), 5));

  // ---------- Midtown ----------
  props.push(new NycMidRise(ctx, at(4800), 170, 380, NYC_STONE[0], 11, true));
  props.push(new TimesSquare(ctx, at(5000), 760));
  props.push(new SubwayEntrance(ctx, at(5880)));
  props.push(new Cab(ctx, at(5600), -1));
  props.push(new SteamVent(ctx, at(6020)));
  props.push(new Tower(ctx, at(6250), { variant: 'slab', w: 170, h: 560, note: 2, look: { body: 0x55697e, shade: 0x485a6d } }));
  props.push(new Chrysler(ctx, at(6520)));
  props.push(new NycMidRise(ctx, at(6660), 150, 300, NYC_STONE[1], 23, true));
  props.push(new EmpireState(ctx, at(7040)));
  props.push(new FoodCart(ctx, at(7330), 'hotdog'));
  props.push(new Cab(ctx, at(7520)));
  props.push(new Hydrant(ctx, at(7180)));

  // ---------- The Flatiron and downtown ----------
  props.push(new Tower(ctx, at(7720), { variant: 'granite', w: 160, h: 480, note: 4 }));
  props.push(new Flatiron(ctx, at(7880)));
  props.push(new NycMidRise(ctx, at(8150), 190, 340, NYC_STONE[2], 37));
  props.push(new Tower(ctx, at(8460), { variant: 'crown', w: 180, h: 600, note: 1, look: { body: 0x9fb5c9, shade: 0x8aa0b4 } }));
  props.push(new NycMidRise(ctx, at(8660), 160, 260, NYC_STONE[3], 41, true));
  props.push(new Cab(ctx, at(8980), -1));
  props.push(new Pigeons(ctx, at(9200), 6));
  props.push(new SteamVent(ctx, at(9300)));

  // ---------- The harbor: Brooklyn Bridge across the East River, Lady Liberty out front ----------
  props.push(new BrooklynBridge(ctx, at(9600), 2200));
  props.push(new RiverBand(ctx, at(9450), 2450));
  props.push(new StatueOfLiberty(ctx, at(10650)));

  return { props, doorX: x0 + 3900 };
}
