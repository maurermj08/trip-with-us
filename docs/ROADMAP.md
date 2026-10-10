# i95 Roadmap

We work through the phases one at a time: plan, build, play-test, polish. Every phase is checked against the design pillars in `i95.md`.

## Status

**MVP: done (2026-10-10).** One complete trip from Home along I-95, past Duckies, across the Ravenel Bridge, to Charleston SC, with greet and an iris back to a fresh trip.

- Both control schemes, hop and flight, car reactions.
- About 50 tappable or drive-through props, 5 sign types, mile markers 10→1.
- Idle hints, synthesized audio, 13 unit tests.
- Not yet verified on a real iPad: feel, frame rate and audio mix.

**Phase 1: done (2026-10-10).** Vehicle art pipeline, Vehicle Lab (now part of /dev), garage chooser. Details below.

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

## Phase 3: Cities and towns

**Goal:** more destinations (pillar 3: the destination is a choice that changes flavor), plus towns to pass through.

**Code seams:**
- Charleston is hard-wired:
  - `landmarks/Charleston.ts` uses absolute x values.
  - `Route.ts` constants (`ARRIVE_X`, `GREET_X`, `GOLDEN_HOUR`, `ZONES.charleston`, the `BRIDGE`, region `'charleston'`) all describe one destination.
- Refactor toward a trip config: `{ destination, route length, regions, arrival builder }`. Make Charleston one destination built at `x0` like `buildDuckies(ctx, x0)`.
- Reusable city parts already exist and could move to a city kit:
  - `RowHouse`, `Steeple`, `Palm`, `Fountain`, `EndPark`
  - `Greeters` (the family), `launchFirework()`
- The Ravenel Bridge is part of the terrain (`Terrain.roadHeight`) as well as a landmark (`buildBridge`). Other cities may want their own bridges or none.
- The `TripDirector` takes `suitcase` and `greeters`. Keep greet generic so every destination gets a family welcome.

## Phase 4: Landmarks (Duckies, Potato World, Over the Line)

**Goal:** a landmark kit. Duckies needs a polish pass; Potato World and Over the Line are parodies.

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
