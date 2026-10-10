// Charleston, SC: Rainbow Row, St. Michael's steeple, palmettos and the Pineapple Fountain at
// Waterfront Park. A drive-through city now (the family greeting happens at the end of the trip).
// The Ravenel Bridge is built from its BridgeSpec in ./bridges.
import type { Ctx } from '../core/Ctx';
import type { Prop } from '../props/Prop';
import { P } from '../style/palette';
import { CITIES } from '../world/Route';
import { RowHouse, Steeple } from './kit/buildings';
import { Palm } from './kit/trees';
import { Fountain } from './kit/fountains';
import { WALK, type CitySet } from './kit/common';

// Re-exports so older imports (the /dev sandbox, the director) keep working.
export { RowHouse, Steeple } from './kit/buildings';
export { Palm } from './kit/trees';
export { Fountain } from './kit/fountains';
export { EndPark, Greeters, launchFirework } from './kit/arrival';
export { BridgeTower } from './bridges/CableStayed';
export { buildBridge } from './bridges';

const CHARLESTON_X0 = CITIES.find((c) => c.id === 'charleston')!.x0;

/** All positions are relative to x0 (the end of the Ravenel Bridge). */
export function buildCharleston(ctx: Ctx, x0: number = CHARLESTON_X0): CitySet {
  const props: Prop[] = [];
  const steepleX = x0 + 1950;
  props.push(new Steeple(ctx, steepleX));
  // Rainbow Row: each house plays a note when tapped.
  let x = x0 + 900;
  let i = 0;
  let doorX = 0;
  const widths = [240, 260, 220, 280, 240, 250, 230, 270, 240, 260, 230, 250, 260];
  while (x < x0 + 4300) {
    const w = widths[i % widths.length];
    if (Math.abs(x + w / 2 - steepleX) < 200) {
      x += 230;
      continue;
    }
    const h = 250 + ((i * 53) % 90);
    props.push(new RowHouse(ctx, x, w, h, P.rainbow[i % P.rainbow.length], i, true));
    if (x + w / 2 > x0 + 3750 && !doorX) doorX = x + w / 2;
    x += w + 4;
    i++;
  }
  // Palmettos on the near side and between buildings.
  [500, 1600, 2700, 5550].forEach((dx, k) => props.push(new Palm(ctx, x0 + dx, 70, 200 + (k % 3) * 30, (k % 2) * 0.3 - 0.15, true)));
  props.push(new Palm(ctx, x0 + 4600, WALK - 2, 230, -0.2, false));
  props.push(new Palm(ctx, x0 + 5300, WALK - 2, 200, 0.25, false));
  props.push(new Fountain(ctx, x0 + 4950));
  return { props, doorX: doorX || x0 + 3900 };
}
