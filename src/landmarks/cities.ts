// One builder per city, keyed by CityId. Each places its props relative to the city's x0.
import type { Ctx } from '../core/Ctx';
import type { CityId } from '../world/Route';
import type { CitySet } from './kit/common';
import { buildNewYork } from './NewYork';
import { buildWashington } from './Washington';
import { buildRichmond } from './Richmond';
import { buildCharleston } from './Charleston';
import { buildSavannah } from './Savannah';
import { buildJacksonville } from './Jacksonville';
import { buildOrlando } from './Orlando';
import { buildPotatoWorld } from './PotatoWorld';

export const CITY_BUILDERS: Record<CityId, (ctx: Ctx, x0: number) => CitySet> = {
  'new-york': buildNewYork,
  washington: buildWashington,
  richmond: buildRichmond,
  charleston: buildCharleston,
  savannah: buildSavannah,
  jacksonville: buildJacksonville,
  orlando: buildOrlando,
  'potato-world': buildPotatoWorld,
};
