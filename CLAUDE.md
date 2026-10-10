# i95: notes for Claude

Casual, fail-free side-scrolling road-trip game for young kids. TypeScript + Vite + PixiJS v8, no art or audio assets: everything is drawn with Pixi `Graphics` and every sound is synthesized with WebAudio. Primary target: iPad landscape in Safari (also desktop/phone).

- `i95.md`: the owner's design doc. **The design pillars and "Do Nots" are hard rules.** Check every feature against them.
- `docs/ROADMAP.md`: phased plan, with current status and the code seams each phase will touch.

## Commands

```sh
npm run dev          # Vite dev server (LAN-exposed for iPad testing)
npm test             # vitest: physics + route invariants (tests/)
npm run typecheck
npm run build        # typecheck + production build
npm run playtest -- out.png jump:26300 wait:1000 shot:a.png   # headless screenshots, see tools/playtest.mjs
```

Verify visual work with `npm run playtest` against a running dev server (`I95_URL=http://localhost:<port>`), then look at the PNGs in `playtest/`. Headless WebGL runs below 20fps and the game clamps dt to 1/20s, so game time runs slow there: wait longer than you'd expect. `?debug=1` shows a position readout and jump buttons. `window.game` is exposed for scripting.

## Design rules that shape code

- **No text in play.** The only text allowed is in-world signage (signs, billboards, store names), drawn with Overpass via `signText()`. No UI labels, tutorials, scores or timers. Hints are motion (jiggles, the chevron pulse), never words.
- **Nothing fails or blocks.** Contact never stops the car or penalizes. Props react, the car squashes, and the trip keeps going. Taps on things still count as driving zones (`Input` never swallows a drive touch).
- **Every touch answers.** Any tap gets sound and motion. Background taps get a ripple and a pentatonic pluck. Every `Prop` needs an `onTap`.
- **Parody names** for anything trademarked (Duckies = Buc-ee's, Potato World = Disney World, Over the Line = South of the Border). Real names are fine for cities and landmarks.
- **Style** (from `i95.md`), baked into `src/style/shapes.ts`, so use those helpers rather than re-deriving the rules:
  - Rounded shapes with no outlines. Radii: buildings 6, signs 8, small parts 2–4.
  - Light comes from the left. `block()` shades the right 28% (black at 7%, or a darker sibling color with `landmark: true`) and adds a 3px white cap at 45%.
  - `contactShadow()` goes under every vehicle and tree. `windowGrid()` draws 5×6 windows on a 9×11 pitch with about 1 in 5 lit.
  - Vehicles are squashed to 96% width and 107% height with wheels 12% oversize. They get a darker lower band, one gloss stripe, window glints, and **no faces**. People and animals may have faces.
  - The far skyline is a single haze color with no detail. All the detail lives in the near layer.

## Architecture (`src/`)

| Area | Files | Notes |
|---|---|---|
| Orchestration | `core/Game.ts` | Owns the scene graph, builds and tears down a trip, routes input, runs the frame loop. Keep feature logic out of it. |
| Core services | `core/Camera.ts`, `Input.ts`, `Tween.ts`, `IdleHinter.ts`, `Ctx.ts`, `rng.ts`, `debug.ts` | `Ctx` is the service bag passed to every prop and landmark. |
| Car | `vehicle/CarController.ts` (pure physics, unit-tested), `CarRig.ts` (view, shadow, reactions), `MiniView.ts` (the Mini drawing) | |
| World | `world/Route.ts` (pure data: route skeleton, zones, regions), `Terrain.ts`, `Road.ts`, `Scenery.ts` (parallax chunk generators), `Sky.ts`, `ChunkLayer.ts`, `PropFactory.ts` | |
| Things | `props/` (road and farm props, `Prop` base), `signs/Signs.ts`, `landmarks/` (Home, Duckies, Charleston incl. the Ravenel Bridge and greeters) | |
| Story | `trip/TripDirector.ts` | Leave → Travel → Arrive → Greet → iris to a fresh trip. Nothing persists. |
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
- **Landmark:** write a `build<Name>(ctx, x0)` that returns `Prop[]` positioned relative to `x0` (see `buildDuckies`). Add a zone in `Route.ts` if it needs open road with no barrier (`isOpenRoad`), and wire it into `Game.buildTrip`.
- **Sound:** add a method to `Sfx` built from `Synth.tone` / `Synth.noise`. Keep sounds soft, because the master bus is compressed.
- `tests/Route.test.ts` guards route invariants (markers count down 10→1, ramps clear of markers and the bridge, and so on). Extend it when you add placement rules.

## Gotchas

- Pixi v8: shape calls first, then `.fill()` / `.stroke()`. A path left unfilled gets filled by the next `.fill()`. Only `Container`s may have children; never `addChild` onto a `Graphics`. Holes use `.cut()`.
- `Tweens.wobble` saves the base rotation and scale and restores them when it finishes. Don't run your own tween on the same object's rotation or scale at the same time.
- Game positions in landmarks are still partly absolute: Charleston uses fixed x values tied to `GREET_X` and `WORLD_END`. See the roadmap for cities.
- Audio only starts after a user gesture (`synth.unlock()` runs on every input).
- Deployment: every push to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`, tests must pass). `vite.config.ts` uses `base: './'`, so keep every asset URL relative (no leading `/`).
- The repo is **public**: no secrets, personal data or copyrighted reference images. `mini.jpeg` is git-ignored for that reason.
