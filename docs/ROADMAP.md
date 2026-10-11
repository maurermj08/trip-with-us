# i95 Roadmap

We work through the phases one at a time: plan, build, play-test, polish. Every phase is checked against the design pillars in `i95.md`.

## Status

**MVP: done (2026-10-10).** One complete trip from Home along I-95, past Duckies, across the Ravenel Bridge, to Charleston SC, with greet and an iris back to a fresh trip.

- Both control schemes, hop and flight, car reactions.
- About 50 tappable or drive-through props, 5 sign types, mile markers 10→1.
- Idle hints, synthesized audio, 13 unit tests.
- Not yet verified on a real iPad: feel, frame rate and audio mix.

**Phase 1: done (2026-10-10).** Vehicle art pipeline, Vehicle Lab (now part of /dev), garage chooser. Details below.

**Phase 3: built (2026-10-10).** Four cities, four bridges, two airports, mile markers 100→1. The owner still needs to play-test it.

## Phase 1: Car chooser, design and styles: done (2026-10-10)

What shipped:
- **Vehicle art pipeline:** SVG art in `art/`, round-trippable through Illustrator. The browser rasterizes each layer, so the game shows exactly what Illustrator saved.
- **Data model:** tokens per color slot, OKLCH recoloring, paints, a wheel library, and accessories (roof box, bike rack, black pack). There is a validator, plus a generator (`spec.json` → `art.svg`) that won't overwrite hand edits.
- **/dev sandbox** (added after Phase 1):
  - It covers every item in the game with interactions, zoom, and copyable Object and Config reference IDs.
  - It includes the vehicle tools: reference-photo overlay, anchors, recolor test, validation.
- **Vehicles:** the 2019 MINI Countryman (Island Blue) and the 2019 Subaru Forester (Ice Silver). `MiniView` is replaced by the generic `VehicleView`, and every per-car number now comes from `dims`.
- **Garage scene:** brand → model → wheels and accessories on a momentum shelf. There's a turntable hero car, a drive-out-the-door start, and the iris back to the garage after the greeting. Captions appear in the garage only.

Next for vehicles:
- **Touch-ups:** the owner's final pass in Illustrator.
- **Paint choices:** the recolor system is ready; just add entries to `paints[]`.
- **More real cars:** add them with `art:gen`.
- **Bonus cars:** use `kind: "fun"` and `gameScale`.

Open questions:
- Should the garage pick be remembered across visits? The pillars say no saves; it's remembered for the session only.
- When the brand list gets long, the brand shelf may want sorting or grouping.

## Phase 2: Generic backgrounds, signs and sky (add and clean up)

**Goal:** a richer, more varied roadside. `i95.md` also lists "phase 2: a different mix of set pieces each time".

**Code seams:**
- `world/Scenery.ts` has a generator per region (suburb, pines, farm, town, lowcountry, marsh, harbor, charleston). `Route.regionAt` maps x to a region.
- `world/Sky.ts` handles day, golden hour and dusk crossfades. Weather or time-of-day variety would go here.
- `signs/Signs.ts` has mile marker, I-95 shield, guide sign, billboard and welcome sign. The `greenPanel()` and `drawShield()` helpers are reusable.
- `world/Route.ts` `buildRoute()` is a fixed list. A per-trip mix would need a seeded generator that keeps the skeleton (markers, zones, ramps clear of markers) and is guarded by `tests/Route.test.ts`.

**Known clean-up candidates (from MVP play-testing):**
- Skyline haze buildings sometimes appear too large or too close over farmland, because the region lookup runs ahead of the camera.
- Exhaust puffs read as grey dots on the lane line.
- The mud patch ellipses cover the lane line heavily.
- Near-shoulder signs and palms cross in front of the car. That's intentional diorama depth, but check that it reads well.
- The billboard tagline text is small.

## Phase 3: Cities and towns: built (2026-10-10, awaiting owner play-test)

The trip now runs **Home → Charleston → Savannah → Jacksonville → Orlando**, about 9–10 minutes. The family greeting, dusk, fireworks and the restart button happen only after Orlando. The other three cities are drive-through.

**What shipped:**
- **Data-driven trip** in `src/world/trip/` (pure data); `world/Route.ts` stays the facade.
  - `cities.ts`: `BRIDGES`, `CITIES`, `AIRPORTS`, `CITY_LAYOUT` and the zones.
  - `legs.ts`: mile markers 100→1, laid out evenly around keep-out zones, plus ramps and every placement.
  - `regions.ts`: regions, the skyline style for each x, and `timeOfDay()` (morning → day → golden hour).
- **City kit** in `landmarks/kit/`:
  - buildings, trees, oaks, towers, fountains, riverfront, planes;
  - arrival: `buildArrival`, greeters, the end park (with a Florida variant).
- **City builders** (`landmarks/cities.ts`, `CITY_BUILDERS`): each `build<City>(ctx, x0)` places its props relative to `x0`.
- **Bridges** in `landmarks/bridges/`:
  - the Ravenel and Talmadge (cable-stayed, `PylonStyle`);
  - the Main Street lift bridge (the span lifts on tap);
  - the I-4 flyover (crosses ground, not water, with an upper ramp and a DOWNTOWN sign).
- **Cities:**
  - **Savannah:** River Street warehouses, a candy shop, City Hall dome, the cathedral, Forsyth fountain, live oaks and gas lamps, a riverboat, the Waving Girl.
  - **Jacksonville:** towers (crown, slab, granite), Friendship Fountain, Treaty Oak, pelicans, a tug and barge.
  - **Orlando:** glass towers, Lake Eola (pagoda fountain light shows, swan boats, swans, bandshell), an observation wheel, and the Florida house with a flamingo, where the family comes out.
- **Two airports** (`landmarks/Airport.ts`), one small regional and one large:
  - departing planes and, at the large one, landings;
  - a control tower and a hangar with a prop plane;
  - a windsock, a fuel truck and a baggage train;
  - parody liveries only.
- **Signs:**
  - `GuideSign({city, exit, shield})` with I-26, US 17, I-10 and I-4 shields and an airport icon;
  - `WelcomeSign(state)` for SC, GA and FL;
  - `InterstateShield(route)`;
  - billboard designs: Duckies, Peaches & Pecans, Free OJ, Chomp Land, and a Potato World teaser.
- **Florida props:** orange trees, orange crates, a gator pond, and the OJ stand at the Welcome Center.
- **Scenery:** new regions:
  - port, savannah, gaCoast, river, jacksonville, flatwoods, citrus, pasture, lakes, airport, floridaSuburb, orlando.
  
  The skyline now picks its style per building, which fixes the haze city over farmland.
- **Sky:** a morning gradient at Home, and golden hour from the big airport onward.
- **/dev:** every new piece is listed under `city/savannah/*`, `city/jacksonville/*`, `city/orlando/*`, `landmark/airport/*`, the bridge IDs, the new signs and the Florida props. The debug jump buttons are generated from the trip data.

**Not done / next:**
- **iPad check:** test performance on the iPad (about 4× more props). If trip start-up is slow, add `PropStream` (build props near the camera).
- **Potato World:** the Phase 4 Disney parody has no reserved stretch of road in Orlando yet. Only the teaser billboard exists, at 282.5k.
- **Region seams:** the far layer switches abruptly where water and land regions meet, for example at the regional airport.

## Phase 4: Landmarks (Duckies, Potato World, Over the Line)

**Goal:** a landmark kit. Duckies needs a polish pass; Potato World and Over the Line are parodies.

**Done (2026-10-11):**
- **Potato World is the trip's final stop.** It sits 2.6k past Orlando, after a short "World Drive" (`landmarks/PotatoWorld.ts`, `kit/rides.ts`, `kit/potatoArt.ts`).
  - You drive through the entrance gate onto a pastel parade street.
  - Along the street: the Spud Cups, a carousel with potato-horses, a monorail on its beam, shops and a balloon cart.
  - The castle is at the end. The family greets you at its door, with fireworks over it.
- **Hype on the way** (`signs/PotatoSigns.ts`):
  - countdown signs from the Florida line (250 → 10 MI);
  - castle, monorail and "Almost!" billboards;
  - a NEXT EXIT gantry.
- **Duckies polish:** a grand portico entrance with the duck badge over the doors. A plush duck can now come out of the store.
- **Port of Savannah** (`landmarks/Port.ts`): animated, tappable gantry cranes loading a container ship. The scenery cranes animate too, using `ChunkLayer` `onTick`.
- **Over the Line** is still to do.

**Pattern:**
- `build<Name>(ctx, x0): Prop[]`, with every piece positioned relative to `x0`. `buildDuckies` already follows it.
- Add a zone in `Route.ts` so `isOpenRoad` drops the median barrier and the road draws a lot or sidewalk (see `Road.ts`).
- Landmarks are made of several tappable `Prop`s, each with its own reaction.

**Open questions:**
- Do landmarks appear on every trip, or rotate with the per-trip mix from Phase 2?

## Phase 5: Initial gameplay elements (start screen, end/restart screen)

**Watch the pillars:**
- `i95.md` "Do Nots" include a win screen or ending, text, saves and profiles.
- Pillar 8 says arrival is a welcome, not a win, and the next trip starts fresh.

A start screen and a restart flow can still fit if they are wordless and diegetic. Examples:
- a title diorama where tapping the car starts the trip
- the greet scene settling into a calm "tap the car to go again" state, which `TripDirector.nextReady` already does

Agree on the approach before building.

**Code seams:**
- The game now boots into the **Garage** (Phase 1), which already acts as a wordless start screen. A title moment could live there, or before it.
- Lifecycle hooks:
  - `Game.openGarage()`, `start()`, `endTrip()` (garage ↔ trip with the iris)
  - `buildTrip()` / `destroyTrip()`
- `main.ts` loads fonts, then opens the garage. `?car=` skips the garage.

## Cross-cutting backlog

- Play-test on a real iPad: speed and flight feel, 60fps, audio mix, touch hit sizes.
- The plan mentioned an optional gentle procedural music loop. It isn't built yet.
