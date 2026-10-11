# i95: notes for Claude

Casual, fail-free side-scrolling road-trip game for young kids. TypeScript + Vite + PixiJS v8. The world is drawn in code with Pixi `Graphics`. **Vehicles are SVG art in `art/`** that the owner finishes in Illustrator. Every sound is synthesized with WebAudio. Primary target: iPad landscape in Safari (also desktop/phone).

- `i95.md`: the owner's design doc. **The design pillars and "Do Nots" are hard rules.** Check every feature against them.
- `docs/ROADMAP.md`: phased plan, with current status and the code seams each phase will touch.
- `art/README.md`: the owner-facing guide to vehicle art: layers, tokens, Illustrator settings, adding a car.

## Commands

```sh
npm run dev          # Vite dev server (LAN-exposed for iPad testing)
npm test             # vitest: physics, route, art validation, recolor, garage model (tests/)
npm run typecheck
npm run build        # typecheck + production build: the game + the /dev sandbox
npm run art:gen -- <vehicle-id> | --all | --library [--force]   # spec.json → art.svg (never clobbers hand edits)
npm run art:check    # validate everything in art/
npm run playtest -- out.png jump:26300 wait:1000 shot:a.png   # headless screenshots, see tools/playtest.mjs
```

Verify visual work with `npm run playtest` against a running dev server (`I95_URL=http://localhost:<port>`), then look at the PNGs in `playtest/`. Headless WebGL runs below 20fps and the game clamps dt to 1/20s, so game time runs slow there: wait longer than you'd expect. `?debug=1` shows a position readout and jump buttons. `window.game` is exposed for scripting.

- **Garage vs trip:** the game boots into the **Garage**. `?car=<vehicle-id>` skips it, and the playtest tool adds `car=mini-countryman-2019` by default. Use `I95_GARAGE=1` to start in the garage, with the steps `pick:<chip-key>` and `go`.
- **Sandbox screenshots:** `I95_PAGE=dev/ I95_HASH='<reference id>'`, or use the `open:<id>` step.

### The /dev sandbox (owner's kitchen-sink viewer)

Open it by going to the `/dev/` path: `http://localhost:5173/dev/` locally, and `…/trip-with-us/dev/` on the live site. There's no npm script for it, by the owner's choice.

`dev/index.html` + `src/dev/` (`main.ts` UI shell, `Sandbox.ts` viewport, `catalog.ts` items, `ids.ts` reference IDs). It ships to Pages at `/dev/`.

- **What it shows:** every vehicle, part, prop, sign, landmark (and its pieces), city piece, background region, road type, the sky, the garage, particles and sounds.
- **How it behaves:** each item is shown alone, with the game's real classes, taps, test-car drive-through, and pan/zoom.
- **Reference IDs:** the owner reports problems with these.
  - **Object ID**, e.g. `vehicle/subaru-forester-2019`.
  - **Config ID**: the object ID plus only the non-default settings, e.g. `vehicle/subaru-forester-2019?wheel=steelie&acc=bike-rack`.
  - **Part ID** (vehicles): the config ID plus `part=<path>`, e.g. `…?acc=roof-box&part=body/mirror`. The path is the named-group path inside the SVG. Opening it highlights that part.
  - To reproduce a report, open `/dev/#<id>` or paste the ID into "Go".
- **Keep it complete.** When you add a vehicle, prop, sign, landmark, city piece or scenery region, add it to `buildCatalog()` in `src/dev/catalog.ts`. Give it a stable ID (`category/name[/piece]`) and expose its constructor options as fields. Never rename existing IDs; old reports reference them.

## Design rules that shape code

- **No text in play.** The only text allowed is in-world signage (signs, billboards, store names), drawn with Overpass via `signText()`. No UI labels, tutorials, scores or timers. Hints are motion (jiggles, the chevron pulse), never words.
- **Nothing fails or blocks.** Contact never stops the car or penalizes. Props react, the car squashes, and the trip keeps going. Taps on things still count as driving zones (`Input` never swallows a drive touch).
- **Every touch answers.** Any tap gets sound and motion. Background taps get a ripple and a pentatonic pluck. Every `Prop` needs an `onTap`.
- **Parody names** for trademarked businesses and places (Duckies = Buc-ee's, Potato World = Disney World, Over the Line = South of the Border). Real names are fine for cities and landmarks.
- **Real vehicles** are drawn as their real make, model and year. Garage captions may name them; that's the **only** text outside signage. Brand **emblems are simplified, inspired-by shapes, never real logos**, because the repo is public.
- **Style** (from `i95.md`), baked into `src/style/shapes.ts`, so use those helpers rather than re-deriving the rules:
  - Rounded shapes with no outlines. Radii: buildings 6, signs 8, small parts 2–4.
  - Light comes from the left. `block()` shades the right 28% (black at 7%, or a darker sibling color with `landmark: true`) and adds a 3px white cap at 45%.
  - `contactShadow()` goes under every vehicle and tree. `windowGrid()` draws 5×6 windows on a 9×11 pitch with about 1 in 5 lit.
  - Vehicles are squashed to 96% width and 107% height with wheels 12% oversize. They get a darker lower band, one gloss stripe, window glints, and **no faces**. People and animals may have faces.
    - The squash and oversize are applied at runtime (`STYLE` in `vehicle/art/schema.ts`), so vehicle art is drawn at true proportions.
    - The generator (`tools/art/vehicleSvg.ts`) bakes in the other vehicle rules.
    - It names every part as a group inside `body` (`body/mirror`, `body/window-front`…). `vehicle/art/parts.ts` lists them.
    - Part names must be unique per file, and must not end in `-<digit>` (stripped as an Illustrator duplicate suffix).
  - The far skyline is a single haze color with no detail. All the detail lives in the near layer.

## Architecture (`src/`)

| Area | Files | Notes |
|---|---|---|
| Orchestration | `core/Game.ts` | Owns the scene graph, builds and tears down a trip, routes input, runs the frame loop. Keep feature logic out of it. |
| Core services | `core/Camera.ts`, `Input.ts`, `Tween.ts`, `IdleHinter.ts`, `Ctx.ts`, `rng.ts`, `debug.ts` | `Ctx` is the service bag passed to every prop and landmark. |
| Car | `vehicle/CarController.ts` (pure physics, unit-tested, shared by every vehicle), `CarRig.ts` (view, shadow, reactions), `VehicleView.ts` (any vehicle, built from art) | Read sizes from `view.dims` (`half`, `height`, `wheels`, `roof`, `exhaust`…). No per-car magic numbers. Roof cargo goes in `view.roof`, positioned with `view.roofPoint()`. |
| Vehicle art | `vehicle/art/`: `registry.ts` (`import.meta.glob` over `art/`), `svgDoc.ts` (layer lookup, Illustrator id normalizing, visibility split), `geometry.ts` (bboxes with transforms), `measure.ts` (anchors → `VehicleDims`), `recolor.ts` + `color.ts` (token swap, OKLCH shades), `rasterize.ts` (SVG → canvas → texture), `VehicleBuild.ts`, `validate.ts` | Pure modules are DOM-agnostic: tests and tools pass `xmlDom` (`tools/art/dom.ts`). |
| Garage | `garage/Garage.ts` (scene and pointer handling), `GarageModel.ts` (pure brand → model → customize state, unit-tested), `Shelf.ts` (momentum chip row), `thumbs.ts` (lazy chip pictures), `garageRoom.ts` (room art) | `Game.mode` is `'garage'` or `'trip'`. In garage mode the trip `Input` is disabled and the garage owns the pointer. |
| Art tools | `tools/art/`: `generate.ts`, `vehicleSvg.ts` (spec → SVG with style rules), `library.ts` (wheels, accessories), `protect.ts` (hash manifest guards hand edits), `validate.ts`, `library-fs.ts` | Run with `tsx`. |
| Dev sandbox | `dev/index.html` + `src/dev/` | Vehicle items include the old Lab tools: reference overlay (local only, from git-ignored `reference/`), anchors, recolor test, validation. |
| World | `world/trip/` (pure trip data: `cities.ts` bridges/cities/airports/zones, `legs.ts` markers/ramps/placements, `regions.ts` regions/skyline/time of day), `world/Route.ts` (facade + zone helpers), `Terrain.ts`, `Road.ts`, `Scenery.ts` (parallax chunk generators), `Sky.ts`, `ChunkLayer.ts`, `PropFactory.ts` | |
| Things | `props/` (road, farm and Florida props, `Prop` base), `signs/Signs.ts` (parameterized), `landmarks/` (Home, Duckies, `Port`, `Charleston`/`Savannah`/`Jacksonville`/`Orlando`, `Airport`, `PotatoWorld` (the final stop)), `signs/PotatoSigns.ts`, `landmarks/kit/` (shared city parts + `arrival.ts`), `landmarks/bridges/` (one builder per `BridgeSpec`), `landmarks/cities.ts` (`CITY_BUILDERS`) | |
| Story | `trip/TripDirector.ts` | Garage → Leave → Travel → Arrive → Greet → iris back to the garage (`endTrip`) with the same pick. Nothing persists beyond the page session. |
| Audio | `audio/Synth.ts` (primitives), `Sfx.ts` (named sounds), `Engine.ts` (continuous hum and wind) | |
| FX | `fx/Particles.ts` (pooled sprites, fireworks), `fx/Iris.ts` | |

### Coordinates

- **World units:** x grows toward the destination and y grows **down**. The road contact line is y = 0. The car's `alt` is height above that line (up is positive), so it renders at y = -alt.
- **Design units:** the screen is 768 tall (`Camera.DESIGN_H`). The camera anchor sits at 36% of the screen width and 30% of the design height above the bottom.
- **Parallax:** each `ChunkLayer` has a factor (clouds 0.06, skyline 0.2, far 0.45, near 0.82, world 1, foreground 1.25). Scenery chunks are deterministic per chunk index, and their region is looked up with `regionAt(layerX / factor)`.

### Layer order (inside `world`, back to front)

`skyFx` (fireworks) → `back` (things behind the median: cows, Duckies, Rainbow Row) → `fxBack` → road chunks (barrier, poles, asphalt, shoulder) → `roadDecor` (puddles, mud, ramps) → `mid` (boxes, wind streaks) → `shadow` → `car` → `front` (near-shoulder signs, rocks, ball, palms) → `fx`.

Each `Prop` picks its layer with `prop.layer`. Props are culled by `extent`, updated near the camera, and bumped when the car overlaps `bumpHalf` (below `bumpHeight`).

### Adding things

- **Roadside set piece:** add a `PlacementKind` and a placement in `Route.ts`, write a `Prop` subclass (`hits`, `onTap`, optional `onBump` and `update`), and add a case in `world/PropFactory.ts`.
- **Landmark:** write a `build<Name>(ctx, x0)` that returns `Prop[]` positioned relative to `x0` (see `buildDuckies`). Add a zone in `world/trip/cities.ts` if it needs open road with no barrier (`isOpenRoad`), and wire it into `Game.buildTrip`.
- **City:** add a `CitySpec` + its `BridgeSpec` in `world/trip/cities.ts`, a `build<City>(ctx, x0): CitySet` (see `Charleston.ts`), and register it in `landmarks/cities.ts`. The city flagged `final` gets the arrival (family, end park); the others are drive-through.
- **Anything new:** also add it to the /dev catalog (see above).
- **Sound:** add a method to `Sfx` built from `Synth.tone` / `Synth.noise`. Keep sounds soft, because the master bus is compressed.
- **Colors:** `art/paints.json` is the shared palette.
  - Every vehicle gets it after its factory paints (`withSharedPaints` in `registry.ts`).
  - The garage shelf has one paint can per shared color; tapping it calls `GarageModel.setPaint`.
- **Vehicle:** follow `art/README.md` → "Adding a new car".
  - Physics must stay shared (pillar 3). Flavor is only `vehicle.json` → `sound` and the art.
  - `tests/art.test.ts` enforces the size band and validates everything in `art/`.
- `tests/Route.test.ts` guards trip invariants (markers count down 100→1 outside every zone, ramps clear of markers and zones, cities in order after their bridges, signs in the right legs, sky keys). Extend it when you add placement rules.

## Gotchas

- Pixi v8: shape calls first, then `.fill()` / `.stroke()`. A path left unfilled gets filled by the next `.fill()`. Only `Container`s may have children; never `addChild` onto a `Graphics`.
  - `.cut()` holes that extend past the outer shape triangulate badly. `Iris` uses a thick stroked ring instead.
- Rasterized art textures:
  - Use `ImageSource`, **not** `CanvasSource`. `CanvasSource` recomputes the pixel size as (w / resolution) × resolution and, on float round-off, resets `canvas.width`, which wipes the canvas.
  - Pipeline canvases are created with `willReadFrequently` (CPU-backed).
- `Tweens` drops a tween or timer that throws, so one destroyed target can't freeze the game. Still guard `destroyed` in tweens on short-lived objects (chips, garage).
- A scenery chunk can animate: set `onTick(dt)` on the container its builder returns (`ChunkLayer.tick`, called every frame). Keep rng consumption unchanged when adding animated parts, so layouts stay deterministic.
- `Tweens.wobble` saves the base rotation and scale and restores them when it finishes. Don't run your own tween on the same object's rotation or scale at the same time.
- **Trip order:** Home → New York → Washington → Richmond → Charleston → Savannah → Jacksonville → Orlando → Potato World.
  - The north-east legs were added in front of the original trip. Everything from the original Home → Charleston leg onward is written as `TRIP_SHIFT + <original x>` (`world/trip/shift.ts`).
  - New absolute positions should be derived from city or bridge specs where possible.
- Landmark positions are relative to their city's `x0`. The arrival (greeters at `x0 + CITY_LAYOUT.greeters`, end park at `WORLD_END`) comes from the final city.
- Audio only starts after a user gesture (`synth.unlock()` runs on every input).
- Deployment: every push to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`, tests must pass). `vite.config.ts` uses `base: './'`, so keep every asset URL relative (no leading `/`).
- The repo is **public**: no secrets, personal data or copyrighted reference images. Reference photos live in git-ignored `reference/`, and `*.jpg` / `*.jpeg` are ignored everywhere.
