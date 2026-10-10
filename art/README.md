# i95 art: vehicles, wheels, accessories and brands

Everything a car is made of lives in this folder as **SVG you can open in Adobe Illustrator**. The game draws exactly what's in these files: the browser renders each layer, so transforms, gradients, clip groups and CSS styling from Illustrator all work.

## Where things are

```
art/
  vehicles/<brand>-<model>-<year>/
    art.svg          ← the car drawing (edit this in Illustrator)
    vehicle.json     ← name, year, color tokens, paints, wheel + accessory options, horn/engine flavor
    spec.json        ← generator input (meters); only used to (re)generate a first draft
    reference.json   ← which reference photo lines up with this car, and where its wheel centers are
  wheels/<id>.svg + wheels.json          ← shared wheel library (any car can use any wheel)
  accessories/<id>.svg + accessories.json ← roof box, bike rack… (+ color packs that have no art)
  brands/<id>/badge.svg + brand.json     ← simplified, badge-*inspired* emblems (never real logos)
  .generated.json    ← fingerprints of generator output (protects your edits; don't edit)
reference/           ← reference photos (git-ignored: never committed or published)
```

## Look at your work: the Vehicle Lab

```sh
npm run lab          # opens http://localhost:5173/lab.html
```

- **Pick:** the vehicle, paint, wheels and accessories.
- **Animate:** speed, bounce, lights, brake, hazards, wet and mud.
- **Anchors & size box:** shows where the lights, roof cargo, exhaust and hitch attach.
- **True proportions + Reference photo:** overlays the photo from `reference/`, lined up on the wheel centers, so you can compare shapes.
- **Recolor test:** turns every recolorable color magenta. Anything that stays its original color isn't using a token (see Colors below).
- **Validation:** the same checks as `npm run art:check`.

**Saving an SVG reloads the Lab automatically.**

## Rules for a vehicle `art.svg`

### Artboard and scale
- The artboard is **400 × 200 px**. The car **faces right** and its tires sit on the ground line, which defaults to y = 180.
- The scale is **50 px per meter**, drawn at **true proportions**. The game adds the style squash itself (96% width, 107% height) and makes the wheels 12% bigger, so don't bake those in.

### Layer names
Lowercase, with hyphens. Illustrator saves each layer name as the group id.

| Layer | What it is |
|---|---|
| `guide-ground` | a thin horizontal line at tire-bottom height |
| `body` | **everything that doesn't move on its own**: paint, glass, glints, cladding, lights, mirrors, trim |
| `wheel-front`, `wheel-rear` | a circle the size of the real tire. The game swaps in the chosen wheel from `art/wheels`. Keep the bottom exactly on the ground line |
| `anchor-head`, `anchor-tail` | circles: where the headlight and taillight glows go, and their size |
| `anchor-hazard-front`, `anchor-hazard-rear` | small circles where the amber hazards blink |
| `anchor-roof` | a thin bar on top of the roof rails. Roof boxes and the suitcase sit here |
| `anchor-exhaust` | where exhaust puffs come out |
| `anchor-hitch` | optional: where a hitch accessory (bike rack) mounts |
| `opt-…` | optional parts that accessories switch on, e.g. `opt-crossbars` under a roof box |

### Working with layers
- Layers may be nested. Illustrator's own wrapper groups (like `Layer_1`) are fine.
- **Lock** helper layers instead of hiding them. Export can drop hidden layers.

### Style rules (from `i95.md`)
- Rounded shapes with **no outlines** (strokes trigger a warning).
- Light comes from the left.
- One **darker lower band**, **one gloss stripe**, and **a glint on every window**.
- **No faces**: lights must never read as eyes and a mouth.
- No text and no embedded images. Convert any lettering to outlines.

### Colors (tokens)
- **Recolorable colors use exact token hexes.** These are listed in `vehicle.json` → `tokens`, and in the comment at the top of each generated `art.svg`. Example tokens:
  - `paint.base`, `paint.dark` (the lower band)
  - `roof.base` (e.g. the Mini's white roof)
  - `mirrors.base`, `clad.base` (black plastic), `trim.base` (silver bits)
- **Make a swatch for each token in Illustrator and only use those.** A color that's "almost" a token won't recolor; the validator warns about these near-misses.
- **Use white or black at an opacity** for shading, gloss and glints. Those work with every paint color automatically.

### Saving from Illustrator
Use **File › Save As › SVG**, with these settings:
- SVG Profile: **SVG 1.1**
- CSS Properties: **Presentation Attributes**
- Decimal Places: **2**
- **Turn off** Responsive
- **Turn off** "Preserve Illustrator Editing Capabilities" (it bloats the file)

**Export As › SVG** also works with Styling = Presentation Attributes and Object IDs = Layer Names.

## Your edits are safe from the generator

`npm run art:gen` only overwrites an `art.svg` it wrote itself and that hasn't changed since. Once you edit a file in Illustrator, the generator leaves it alone. Instead it writes `art.generated.svg` next to it, which is git-ignored, so you can compare old and new in the Lab. `--force` overrides this. To lock a file permanently, set `"art": "hand"` in `vehicle.json`.

## Adding a new car

1. **Photo:** put a clean side-profile photo in `reference/`, such as `reference/outback.jpg`.
2. **Data files:** create `art/vehicles/<brand>-<model>-<year>/` with `vehicle.json`, `spec.json` and `reference.json`. Copy the Forester's and adjust them; Claude can write these from the photo.
3. **Draft:** run `npm run art:gen -- <id>` to get a draft `art.svg` that already follows the style rules.
4. **Compare:** run `npm run lab`, turn on **True proportions** and **Reference photo**, and tweak `spec.json` until the silhouette matches.
5. **Finish:** do the final touch-ups in Illustrator.
6. **Check:** run `npm run art:check` (also part of `npm test`).

**New brand:** add `art/brands/<id>/brand.json` and a `badge.svg`. Keep the emblem simplified and inspired by the real one, never a copy.

## Wheels and accessories

- **Wheels:**
  - Each is a 100 × 100 artboard, centered, with the tire filling the full circle (radius 50).
  - Rim colors are tokens (`rims.base`, plus shades) so packs like "black pack" can recolor them.
  - List a wheel in a vehicle's `wheels.options` to offer it.
- **Accessories:**
  - Art goes in a group with the id `accessory`, plus a `guide-mount` marker. The mount point is the bottom center of `guide-mount`.
  - `accessories.json` sets:
    - `mount`: `roof`, `hitch`, or `none` for color packs
    - `stackHeight`: how far the roof cargo point rises
    - `showLayers`: e.g. `opt-crossbars`
    - `slots`: color overrides, e.g. `{ "roof": "#1b1b1d" }`
    - `excludes`
- The library parts in `tools/art/library.ts` were generated once. Edit the SVGs directly from now on.

## Rules of thumb (pillar 3: choices express, never decide)

- All vehicles share the same physics. Picking a car changes only its look and sounds.
- A test keeps every vehicle's in-game size inside a shared band. A bonus vehicle that's much bigger in real life sets `gameScale` in `vehicle.json`.
