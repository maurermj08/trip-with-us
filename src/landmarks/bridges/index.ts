// Builds the landmark structures for any bridge spec (towers, lift span, flyover ramp).
import type { Ctx } from '../../core/Ctx';
import type { Prop } from '../../props/Prop';
import { BRIDGE, type BridgeSpec } from '../../world/Route';
import { BridgeTower, TALMADGE } from './CableStayed';
import { LiftBridge } from './LiftBridge';
import { FlyoverRamp } from './Flyover';
import { buildGwb } from './GeorgeWashington';
import { buildMemorial } from './Memorial';
import { buildJamesRiver } from './JamesRiver';

export function buildBridge(ctx: Ctx, spec: BridgeSpec = BRIDGE): Prop[] {
  switch (spec.id) {
    case 'gwb':
      return buildGwb(ctx, spec);
    case 'memorial':
      return buildMemorial(ctx, spec);
    case 'james-river':
      return buildJamesRiver(ctx, spec);
    case 'ravenel':
      return [new BridgeTower(ctx, spec.start + 1400), new BridgeTower(ctx, spec.start + 3000)];
    case 'talmadge':
      return [new BridgeTower(ctx, spec.start + 1600, TALMADGE), new BridgeTower(ctx, spec.start + 2800, TALMADGE)];
    case 'main-street':
      return [new LiftBridge(ctx, spec.start + spec.rise + (spec.end - spec.start - spec.rise - spec.fall) / 2)];
    case 'i4-flyover':
      return [new FlyoverRamp(ctx, spec)];
  }
}
