// Turns the route skeleton (pure data in Route.ts) into live props.
// To add a new roadside thing: add a PlacementKind in Route.ts, a Prop class, and a case here.
import type { Ctx } from '../core/Ctx';
import type { Prop } from '../props/Prop';
import { BeachBall, Boxes, Mud, Puddle, Ramp, Rock } from '../props/RoadProps';
import { Birds, Cow, Fence } from '../props/FarmProps';
import { Gator, OjStand, OrangeCrate, OrangeTree } from '../props/FloridaProps';
import { Billboard, GuideSign, InterstateShield, MileMarker, WelcomeSign } from '../signs/Signs';
import type { Placement } from './Route';

export function createProp(ctx: Ctx, p: Placement): Prop {
  switch (p.kind) {
    case 'mile': return new MileMarker(ctx, p.x, p.n!);
    case 'shield': return new InterstateShield(ctx, p.x, p.shield);
    case 'guide': return new GuideSign(ctx, p.x, { city: p.city, exit: p.exit, shield: p.shield });
    case 'billboard': return new Billboard(ctx, p.x, p.design);
    case 'welcome': return new WelcomeSign(ctx, p.x, p.state);
    case 'boxes': return new Boxes(ctx, p.x, p.n ?? 2);
    case 'puddle': return new Puddle(ctx, p.x);
    case 'mud': return new Mud(ctx, p.x, p.len ?? 400);
    case 'rock': return new Rock(ctx, p.x);
    case 'ramp': return new Ramp(ctx, p.x);
    case 'ball': return new BeachBall(ctx, p.x);
    case 'cow': return new Cow(ctx, p.x);
    case 'fence': return new Fence(ctx, p.x, p.len ?? 2000);
    case 'birds': return new Birds(ctx, p.x);
    case 'orange-tree': return new OrangeTree(ctx, p.x);
    case 'crate': return new OrangeCrate(ctx, p.x);
    case 'gator': return new Gator(ctx, p.x);
    case 'oj-stand': return new OjStand(ctx, p.x);
  }
}
