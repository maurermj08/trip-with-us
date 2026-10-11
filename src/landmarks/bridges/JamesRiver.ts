// Richmond's I-95 crossing of the James River. Our road is the bridge deck; below it the river
// runs over the falls: boulders and whitewater, a heron on a rock, a kayaker and tube floaters
// riding the rapids, and the Belle Isle footbridge hanging under the deck.
import type { Ctx } from '../../core/Ctx';
import type { Prop } from '../../props/Prop';
import type { BridgeSpec } from '../../world/Route';
import { BelleIsleBridge, Heron, Kayaker, Rapids, TubeFloaters } from '../kit/rvaRiver';

export function buildJamesRiver(ctx: Ctx, spec: BridgeSpec): Prop[] {
  const [s0, s1] = spec.span;
  const len = s1 - s0;
  // The footbridge hangs in the middle, where our deck is highest (room underneath).
  const fbLen = 1100;
  const fbX = (spec.start + spec.end) / 2 - fbLen / 2;
  const rapids = new Rapids(ctx, s0 + 60, len - 120);
  const tops = rapids.rockTops();
  const perch = tops[Math.min(tops.length - 1, 3)];
  const perch2 = tops[Math.max(0, tops.length - 4)];
  return [
    new BelleIsleBridge(ctx, fbX, fbLen),
    rapids,
    new TubeFloaters(ctx, s0 + 100, len - 400),
    new Kayaker(ctx, s0 + 100, len - 300),
    new Heron(ctx, perch.x, perch.y, 1),
    new Heron(ctx, perch2.x, perch2.y, -1),
  ];
}
