import { ROAD_FAR } from '../../world/Road';

/** Sidewalk line on the far side of a city street: buildings and people stand here. */
export const WALK = ROAD_FAR - 16;

import type { Prop } from '../../props/Prop';

/** What a city builder returns. `doorX` is where a family could come out (the final city). */
export interface CitySet {
  props: Prop[];
  doorX: number;
}
