// Washington, D.C.: the grandest city on the trip, laid out roughly like the National Mall from
// west to east. Off the Memorial Bridge: the Tidal Basin (paddle boats, cherry blossoms) with the
// Jefferson Memorial, the Lincoln Memorial and the long Reflecting Pool, the World War II
// Memorial fountain, the Washington Monument (the tallest thing in the game), the White House,
// the Smithsonian Castle, a museum with a dinosaur, and the U.S. Capitol at the far end.
// The Memorial Bridge itself is built from its BridgeSpec in ./bridges/Memorial.ts.
import type { Ctx } from '../core/Ctx';
import type { Prop } from '../props/Prop';
import { CITIES } from '../world/Route';
import type { CitySet } from './kit/common';
import { Capitol, JeffersonMemorial, LincolnMemorial, WashingtonMonument, WWIIFountain } from './kit/dcMonuments';
import { Museum, SmithsonianCastle, WhiteHouse } from './kit/dcBuildings';
import { CherryTree, Elm, IceCreamTruck, PaddleBoat, ReflectingPool, Squirrel, TidalBasin, Walkers } from './kit/dcPark';

export { Capitol, JeffersonMemorial, LincolnMemorial, WashingtonMonument, WWIIFountain } from './kit/dcMonuments';
export { Museum, SmithsonianCastle, WhiteHouse } from './kit/dcBuildings';
export { CherryTree, Elm, IceCreamTruck, PaddleBoat, ReflectingPool, Squirrel, TidalBasin, Walkers } from './kit/dcPark';

const X0 = CITIES.find((c) => c.id === 'washington')!.x0;

/** Where each piece sits, relative to x0 (the end of the Memorial Bridge). Used by /dev too. */
export const DC = {
  basin: -250, basinLen: 3050,
  jefferson: 900,
  lincoln: 2050,
  pool: 2450, poolLen: 1850,
  wwii: 4800,
  monument: 5900,
  iceCream: 6560,
  whiteHouse: 7500,
  castle: 9150,
  museum: 10050,
  capitol: 11200,
} as const;

export function buildWashington(ctx: Ctx, x0: number = X0): CitySet {
  const props: Prop[] = [];
  const at = (dx: number) => x0 + dx;

  // ---- far side (back layer), west to east: big things first so later ones draw over them ----
  props.push(new CherryTree(ctx, at(480), 150));
  props.push(new JeffersonMemorial(ctx, at(DC.jefferson)));
  for (const [dx, s] of [[620, 130], [1240, 160], [1420, 130]] as const) props.push(new CherryTree(ctx, at(dx), s));
  props.push(new Squirrel(ctx, at(1330), 90));
  props.push(new Elm(ctx, at(1660), 210));
  props.push(new LincolnMemorial(ctx, at(DC.lincoln)));
  props.push(new ReflectingPool(ctx, at(DC.pool), DC.poolLen));
  props.push(new Walkers(ctx, at(2700), 'joggers', 1400));
  props.push(new Elm(ctx, at(4420), 200));
  props.push(new WWIIFountain(ctx, at(DC.wwii), 640));
  props.push(new WashingtonMonument(ctx, at(DC.monument)));
  props.push(new IceCreamTruck(ctx, at(DC.iceCream)));
  props.push(new CherryTree(ctx, at(6860), 140));
  props.push(new Squirrel(ctx, at(6920), 80));
  props.push(new WhiteHouse(ctx, at(DC.whiteHouse)));
  props.push(new Elm(ctx, at(8060), 190));
  props.push(new SmithsonianCastle(ctx, at(DC.castle)));
  props.push(new Museum(ctx, at(DC.museum)));
  props.push(new Walkers(ctx, at(9500), 'school', 700));
  props.push(new Elm(ctx, at(10560), 200));
  props.push(new CherryTree(ctx, at(10640), 140));
  props.push(new Capitol(ctx, at(DC.capitol)));
  props.push(new Elm(ctx, at(11860), 190));

  // ---- near side (front layer): the Tidal Basin with paddle boats, blossoms along the lawn ----
  props.push(new TidalBasin(ctx, at(DC.basin), DC.basinLen, true));
  props.push(new PaddleBoat(ctx, at(800), 170, 0x3f8fd8, 1));
  props.push(new PaddleBoat(ctx, at(1950), 128, 0x2fa3a0, -1));
  for (const [dx, s] of [[360, 120], [1460, 130], [2600, 115], [4100, 120], [7000, 125], [9900, 120]] as const) {
    props.push(new CherryTree(ctx, at(dx), s, true));
  }
  return { props, doorX: x0 + 3900 };
}
