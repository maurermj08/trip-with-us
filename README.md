# i95

A gentle, fail-free side-scrolling road trip down I-95 (see `i95.md` for the design pillars).
MVP: one Mini Cooper Countryman, Duckies gas station, Charleston SC, a few signs.

## Run

```sh
npm install
npm run dev        # http://localhost:5173, and on your LAN for iPad testing
npm test           # physics + route unit tests
npm run build      # typecheck + production build to dist/
```

Add `?debug=1` to the URL for a position readout and jump-to-section buttons.

Headless screenshots (dev server running): `I95_URL=http://localhost:5173 npm run playtest -- out.png jump:26300 wait:1000`
(see `tools/playtest.mjs` for steps; output goes to `playtest/`).

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: install, test, build, then publish `dist/` to GitHub Pages.
The build uses relative asset paths (`base: './'`), so it works at `https://<user>.github.io/<repo>/`.

## Docs

- `i95.md`: design pillars and style rules (the source of truth)
- `docs/ROADMAP.md`: phases, status, and code seams for upcoming work
- `CLAUDE.md`: architecture, conventions and gotchas

## Vehicles and the Garage

The game opens in a **garage**: pick a brand, then a model, then wheels and accessories, and drive out the door. Vehicles are SVG art in `art/` that you can finish in Adobe Illustrator.

- `npm run lab` opens the **Vehicle Lab**, a live preview with a reference-photo overlay.
- `art/README.md` is the full guide: layers, colors, Illustrator settings, and adding a car.

## Controls (both work at once)

- **Zones**: hold the right side to go, the left side to brake. Touch the top of the screen to hop (slow) or fly (fast).
- **Direct**: press on the car and drag / fling it.
- **Desktop**: → / D go, ← / A brake, Space / ↑ lift, H honk.

## Layout

- `src/core`: game orchestration, camera, input, tweens, idle hints
- `src/vehicle`: car physics (`CarController`, pure and tested), `CarRig`, `VehicleView`, and the art pipeline (`src/vehicle/art`)
- `src/garage`: the vehicle chooser
- `art/`: vehicle, wheel, accessory and brand art (see `art/README.md`)
- `tools/art/`: art generator and validator
- `src/world`: route skeleton, terrain, road, parallax scenery, sky, prop factory
- `src/props`, `src/signs`, `src/landmarks`: everything tappable or drive-through
- `src/trip`: Leave → Travel → Arrive → Greet story
- `src/audio`: WebAudio synth; all sounds are generated in code
- `src/fx`: particles, iris wipe
- `tools/playtest.mjs`: headless screenshot driver
- `src/style`: palette and style-rule drawing helpers
