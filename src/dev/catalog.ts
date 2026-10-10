// Everything viewable in /dev. Each item knows its reference ID, its settings (fields),
// how to build itself into the sandbox, and which actions it offers.
import { Assets, Container, Sprite, type Texture } from 'pixi.js';
import type { Built, Context, DevEnv, Focus } from './Sandbox';
import type { Cfg, Field } from './ids';
import { art } from '../vehicle/art/registry';
import { buildVehicle } from '../vehicle/art/VehicleBuild';
import { VehicleView } from '../vehicle/VehicleView';
import { defaultChoice, SLOT_IDS, type VehicleChoice, type VehicleDef } from '../vehicle/art/schema';
import { validateVehicle } from '../vehicle/art/validate';
import { browserDom, findLayer, rootSvg } from '../vehicle/art/svgDoc';
import { listParts } from '../vehicle/art/parts';
import { bboxOf, type BBox } from '../vehicle/art/geometry';
import { STYLE } from '../vehicle/art/schema';
import { colorMap, recolorSvg } from '../vehicle/art/recolor';
import { destroyTexture, rasterize, toTexture, rasterStats } from '../vehicle/art/rasterize';
import type { Prop } from '../props/Prop';
import { BeachBall, Boxes, Mud, Puddle, Ramp, Rock } from '../props/RoadProps';
import { Birds, Cow, Fence } from '../props/FarmProps';
import { Billboard, GuideSign, InterstateShield, MileMarker, WelcomeSign } from '../signs/Signs';
import { BigTree, House, Mailbox, Suitcase, buildHome } from '../landmarks/Home';
import { Canopy, DuckStatue, PylonSign, Pump, Store, buildDuckies } from '../landmarks/Duckies';
import { BridgeTower, EndPark, Fountain, Greeters, Palm, RowHouse, Steeple, buildBridge, buildCharleston, launchFirework } from '../landmarks/Charleston';
import { AIRPORTS, BRIDGE, BRIDGES, CITIES, FINAL_CITY, RAMPS, REGIONS, ROUTE, WORLD_END, ZONES, mileMarkerX, regionAt, type BillboardDesign, type Placement, type Region } from '../world/Route';
import { Gator, OjStand, OrangeCrate, OrangeTree } from '../props/FloridaProps';
import { Bandshell, Flamingo, FloridaHouse, LakeEola, ObservationWheel, Swan, SwanBoat, buildOrlando } from '../landmarks/Orlando';
import { buildArrival } from '../landmarks/kit/arrival';
import { Airfield, ApproachLights, BaggageTrain, ControlTower, FuelTruck, Hangar, Radar, Terminal, Windsock, buildAirport } from '../landmarks/Airport';
import { FriendshipFountain, MidRise, TreatyOak, buildJacksonville } from '../landmarks/Jacksonville';
import { Tower, type TowerVariant } from '../landmarks/kit/towers';
import { Pelicans, RiverBand as JaxRiver, TallPalm, Tugboat } from '../landmarks/kit/riverfront';
import { BRICKS, Cathedral, CityHall, ForsythFountain, GasLamp, LiveOak, RiverBand, Riverboat, WavingGirl, Warehouse, buildSavannah } from '../landmarks/Savannah';
import { TALMADGE } from '../landmarks/bridges/CableStayed';
import { P } from '../style/palette';
import { Garage } from '../garage/Garage';
import { Camera } from '../core/Camera';
import type { Sfx } from '../audio/Sfx';

export interface DevItem {
  id: string;
  category: string;
  label: string;
  fields?: Field[];
  /** Default world context: none (plain), road, or the full parallax scene. */
  context?: Context;
  build(env: DevEnv, cfg: Cfg): Built | Promise<Built>;
}

// ---------- helpers ----------

const props = (env: DevEnv, list: Prop[]) => list.map((p) => env.addProp(p));

/** Frame a set of props using their hit boxes and drive-through ranges. */
function focusOf(list: Prop[], pad = 60): Focus {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of list) {
    for (const r of p.hits) {
      x0 = Math.min(x0, p.view.x + r.x);
      x1 = Math.max(x1, p.view.x + r.x + r.w);
      y0 = Math.min(y0, p.view.y + r.y);
      y1 = Math.max(y1, p.view.y + r.y + r.h);
    }
    if (p.bumpHalf) {
      x0 = Math.min(x0, p.x - p.bumpHalf);
      x1 = Math.max(x1, p.x + p.bumpHalf);
    }
  }
  if (x0 === Infinity) return { x: -200, y: -200, w: 400, h: 300 };
  y1 = Math.max(y1, 40);
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/** Tap / drive-through / test-car actions shared by world items. */
function worldActions(env: DevEnv, list: Prop[], focus: Focus) {
  const center = () => {
    const p = list[0];
    const r = p.hits[0];
    return r ? { x: p.view.x + r.x + r.w / 2, y: p.view.y + r.y + r.h / 2 } : { x: p.x, y: p.y - 20 };
  };
  return [
    { label: 'Tap it', run: () => list.forEach((p) => (p.hits.length ? p.onTap(center().x, center().y) : undefined)) },
    { label: 'Drive test car through', run: () => env.testCar.driveThrough(focus.x - 900, focus.x + focus.w + 900) },
    { label: 'Park test car nearby', run: () => env.testCar.park(focus.x - 160) },
    { label: 'Hide test car', run: () => env.testCar.hide() },
    { label: 'Jiggle (idle hint)', run: () => list.forEach((p) => p.jiggle()) },
  ];
}

/** A simple world item made of props. */
function propItem(id: string, category: string, label: string, make: (env: DevEnv, cfg: Cfg) => Prop[], opts: { fields?: Field[]; context?: Context } = {}): DevItem {
  return {
    id, category, label, fields: opts.fields, context: opts.context ?? 'road',
    build: (env, cfg) => {
      const list = props(env, make(env, cfg));
      const focus = focusOf(list);
      return { focus, actions: worldActions(env, list, focus) };
    },
  };
}

const sel = (key: string, label: string, options: [string, string][], def: string): Field => ({ key, label, type: 'select', options, default: def });
const range = (key: string, label: string, min: number, max: number, step: number, def: number, live = false): Field => ({ key, label, type: 'range', min, max, step, default: def, live });
const bool = (key: string, label: string, def = false, live = false): Field => ({ key, label, type: 'bool', default: def, live });

function choiceFrom(def: VehicleDef, cfg: Cfg): VehicleChoice {
  return {
    vehicleId: def.id,
    paintId: String(cfg.paint ?? def.paints[0].id),
    wheelId: String(cfg.wheel ?? def.wheels.default),
    accessoryIds: (cfg.acc as string[]) ?? [],
  };
}

interface RefInfo { image: string; wheelFront: [number, number]; wheelRear: [number, number]; flipX?: boolean }
const refs = import.meta.glob<RefInfo>('/art/vehicles/*/reference.json', { eager: true, import: 'default' });

// ---------- vehicles ----------

function vehicleItem(def: VehicleDef): DevItem {
  const brand = art.brands.get(def.brand)?.name ?? def.brand;
  const fields: Field[] = [
    sel('paint', 'Paint', def.paints.map((p) => [p.id, p.name]), def.paints[0].id),
    sel('wheel', 'Wheels', def.wheels.options.map((w) => [w, art.wheels.get(w)?.name ?? w]), def.wheels.default),
    { key: 'acc', label: 'Accessories', type: 'multi', options: def.accessories.map((a) => [a, art.accessories.get(a)?.name ?? a]), default: [] },
    range('speed', 'Wheel speed', 0, 900, 10, 0, true),
    range('pitch', 'Pitch', -0.3, 0.3, 0.01, 0, true),
    range('wet', 'Wet', 0, 1, 0.05, 0, true),
    range('mud', 'Mud', 0, 1, 0.05, 0, true),
    bool('brake', 'Brake lights', false, true),
    bool('hazards', 'Hazards', false, true),
    bool('anchors', 'Show anchors', false, true),
    bool('true', 'True proportions (no squash)'),
    bool('ref', 'Reference photo overlay (local dev only)'),
    range('refAlpha', 'Photo opacity', 0, 1, 0.05, 0.45, true),
    bool('magenta', 'Recolor test (all slots magenta)'),
  ];
  return {
    id: `vehicle/${def.id}`, category: 'Vehicles', label: `${brand} ${def.year} ${def.model}`, fields, context: 'none',
    build: async (env, cfg) => {
      const choice = choiceFrom(def, cfg);
      let useDef = def;
      if (cfg.magenta) {
        useDef = { ...def, paints: [{ id: 'magenta', name: 'test', swatch: '#ff00ff', slots: Object.fromEntries(SLOT_IDS.map((s) => [s, '#ff00ff'])) }] };
        art.vehicles.set(def.id, useDef);
        choice.paintId = 'magenta';
      }
      const build = await buildVehicle(art, choice, env.ppu(1));
      art.vehicles.set(def.id, def);
      const view = new VehicleView(build, { trueProportions: !!cfg.true });
      env.addDisplay(view, 'car');
      let distance = 0;
      const refLayer = new Container();
      env.addDisplay(refLayer, 'fx');
      const ref = refs[`/art/vehicles/${def.id}/reference.json`];
      let refNote = ref ? `reference: ${ref.image}` : 'no reference.json';
      if (cfg.ref && ref) {
        try {
          const tex = await Assets.load<Texture>('../' + ref.image);
          const [front, rear] = build.measure.wheels;
          const s = Math.abs(front.x - rear.x) / Math.abs(ref.wheelFront[0] - ref.wheelRear[0]);
          const sx = ref.flipX ? -s : s;
          const sp = new Sprite(tex);
          sp.scale.set(sx, s);
          sp.position.set(front.x - ref.wheelFront[0] * sx, front.y - ref.wheelFront[1] * s);
          refLayer.addChild(sp);
        } catch {
          refNote = `reference photo ${ref.image} not available (it only exists on your machine; run npm run dev)`;
        }
      }
      const svg = await art.vehicleSvg(def.id);
      const report = validateVehicle(svg, def, browserDom);
      const d = build.dims;

      // Named parts: list, highlight (exact silhouette + outline), and pick by point.
      const doc = browserDom.parse(svg);
      const root = rootSvg(doc);
      const parts = listParts(doc).filter((p) => !p.name.startsWith('guide-'));
      const boxes = new Map<string, BBox>(parts.map((p) => [p.path, bboxOf(findLayer(root, p.name)!)]));
      const o = build.measure.origin;
      const ksx = cfg.true ? 1 : STYLE.squashX * build.gameScale, ksy = cfg.true ? 1 : STYLE.squashY * build.gameScale;
      let partPath: string | null = null;
      let partSprite: Sprite | null = null;
      let partTex: Texture | null = null;
      let partReq = 0;
      let pulse = 0;
      let liveCfg = cfg;
      const setPart = async (path: string | null) => {
        const req = ++partReq;
        partPath = path;
        partSprite?.destroy();
        partSprite = null;
        if (partTex) destroyTexture(partTex);
        partTex = null;
        if (!path) return;
        const name = path.split('/').pop()!;
        const r = await rasterize(svg, env.ppu(), { include: [name], exclude: (n) => n.startsWith('guide-') });
        if (req !== partReq || view.destroyed) return;
        // Solid magenta silhouette of exactly this part.
        const ctx2 = r.canvas.getContext('2d', { willReadFrequently: true })!;
        ctx2.globalCompositeOperation = 'source-in';
        ctx2.fillStyle = '#ff00ff';
        ctx2.fillRect(0, 0, r.canvas.width, r.canvas.height);
        partTex = toTexture(r);
        partSprite = new Sprite(partTex);
        partSprite.position.set(r.x - o.x, r.y - o.y);
        view.bodyBox.addChild(partSprite);
      };
      const partAt = (wx: number, wy: number): string | null => {
        const ax = wx / ksx + o.x, ay = wy / ksy + o.y;
        let best: string | null = null, bestArea = Infinity;
        for (const p of parts) {
          if (p.name === 'anchors' || (p.name.startsWith('anchor-') && !liveCfg.anchors)) continue;
          const b = boxes.get(p.path)!;
          const pad = 1.5;
          if (b.empty || ax < b.x0 - pad || ax > b.x1 + pad || ay < b.y0 - pad || ay > b.y1 + pad) continue;
          const area = Math.max(1, b.w * b.h);
          if (area < bestArea) {
            bestArea = area;
            best = p.path;
          }
        }
        return best;
      };
      return {
        // Include roof cargo and hitch accessories (a bike sticks out the back).
        focus: (() => {
          const hasHitch = build.accessories.some((a) => a.def.mount === 'hitch');
          const top = Math.min(-d.height, d.roof.y) - 40;
          const left = -d.half - 30 - (hasHitch ? 110 : 0);
          return { x: left, y: top, w: d.half + 30 - left, h: -top + 30 };
        })(),
        zoomSensitive: true,
        actions: [
          { label: 'Bounce', run: () => view.bounce(60) },
          { label: 'Flash lights', run: () => view.flashLights() },
          { label: 'Honk', run: () => env.sfx.honk(def.sound?.hornPitch ?? 1) },
          { label: 'Jiggle (idle hint)', run: () => env.tweens.wobble(view, 0.1, 0.8, 0.1) },
        ],
        parts,
        setPart: (p) => void setPart(p),
        partAt,
        update: (dt, c) => {
          liveCfg = c;
          pulse += dt;
          if (partSprite) partSprite.alpha = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(pulse * 6));
          distance += Number(c.speed) * dt;
          view.braking = !!c.brake;
          view.setHazards(!!c.hazards);
          view.pitch = Number(c.pitch);
          view.update(dt, distance, 0, false);
          view.wetness = Number(c.wet);
          view.muddiness = Number(c.mud) / 1.3;
          refLayer.alpha = Number(c.refAlpha);
        },
        overlay: (g, c) => {
          const z = 1 / Math.max(0.2, env.zoom());
          if (partPath) {
            const b = boxes.get(partPath);
            if (b && !b.empty) g.rect((b.x0 - o.x) * ksx - 2 * z, (b.y0 - o.y) * ksy - 2 * z, b.w * ksx + 4 * z, b.h * ksy + 4 * z).stroke({ width: 1.5 * z, color: 0xff00ff });
          }
          if (!c.anchors) return;
          g.rect(-d.half, -d.height, d.length, d.height).stroke({ width: z, color: 0xff00ff, alpha: 0.6 });
          for (const w of d.wheels) g.circle(w.x, w.y, w.r).stroke({ width: z, color: 0x00c853 });
          g.circle(d.head.x, d.head.y, 4).fill(0xffd600);
          g.circle(d.tail.x, d.tail.y, 4).fill(0xff1744);
          for (const hz of d.hazards) g.circle(hz.x, hz.y, 3).fill(0xff9100);
          g.rect(d.roof.x - d.roof.len / 2, d.roof.y - 1, d.roof.len, 2).fill(0x2979ff);
          g.circle(d.exhaust.x, d.exhaust.y, 3).fill(0x616161);
          g.circle(d.hitch.x, d.hitch.y, 3).fill(0x6d4c41);
        },
        info: () => [
          `In-game size: length ${d.length.toFixed(0)}, height ${d.height.toFixed(0)}, wheel r ${d.wheels[0].r.toFixed(1)}`,
          `Raster: ${build.body.tex.source.resolution} px/unit · live textures ${rasterStats().liveTextures}`,
          report.errors.length || report.warnings.length
            ? [...report.errors.map((e) => 'ERROR ' + e), ...report.warnings.map((w) => 'warn ' + w)].join('\n')
            : 'Validation: all checks pass',
          refNote,
          `Files: art/vehicles/${def.id}/art.svg · vehicle.json · spec.json`,
        ].join('\n'),
        destroy: () => {
          partReq++;
          if (partTex) destroyTexture(partTex);
          view.destroy({ children: true });
          build.destroy();
        },
      };
    },
  };
}

const lineupItem: DevItem = {
  id: 'vehicle/lineup', category: 'Vehicles', label: 'Lineup (all vehicles)', context: 'none',
  build: async (env) => {
    let x = 0;
    const views: VehicleView[] = [];
    const builds: { destroy(): void }[] = [];
    for (const def of art.vehicles.values()) {
      const b = await buildVehicle(art, defaultChoice(def), env.ppu());
      const v = new VehicleView(b);
      v.x = x + b.dims.half;
      x += b.dims.length + 40;
      env.addDisplay(v, 'car');
      views.push(v);
      builds.push(b);
    }
    return {
      focus: { x: -40, y: -150, w: x + 40, h: 200 },
      zoomSensitive: true,
      update: (dt) => views.forEach((v) => v.update(dt, 0, 0, false)),
      tap: (wx, wy) => {
        const v = views.find((vv) => Math.abs(wx - vv.x) < vv.dims.half && wy < 0 && wy > -vv.dims.height);
        if (!v) return false;
        v.bounce(-50);
        v.flashLights();
        env.sfx.honk(v.build.def.sound?.hornPitch ?? 1);
        return true;
      },
      destroy: () => builds.forEach((b) => b.destroy()),
    };
  },
};

// ---------- vehicle parts ----------

async function spriteFromSvg(env: DevEnv, svg: string, scale = 1, include?: string[]): Promise<{ sp: Sprite; tex: Texture }> {
  const r = await rasterize(svg, env.ppu() * scale, include ? { include, exclude: (n) => n.startsWith('guide-') } : undefined);
  const tex = toTexture(r);
  const sp = new Sprite(tex);
  sp.position.set(r.x * scale, r.y * scale);
  sp.scale.set(scale);
  return { sp, tex };
}

function wheelItem(id: string): DevItem {
  const def = art.wheels.get(id)!;
  return {
    id: `wheel/${id}`, category: 'Vehicle parts', label: `Wheel · ${def.name}`, context: 'none',
    fields: [{ key: 'rims', label: 'Rim color', type: 'color', default: def.tokens.rims?.base ?? '#cccccc' }, range('speed', 'Spin', 0, 10, 0.1, 0, true)],
    build: async (env, cfg) => {
      const svg = recolorSvg(await art.wheelSvg(id), colorMap(def.tokens, { rims: String(cfg.rims) }));
      const { sp, tex } = await spriteFromSvg(env, svg);
      const holder = new Container();
      sp.position.set(-50, -50);
      holder.addChild(sp);
      holder.y = -50;
      env.addDisplay(holder);
      return {
        focus: { x: -70, y: -120, w: 140, h: 140 },
        zoomSensitive: true,
        update: (dt, c) => (holder.rotation += Number(c.speed) * dt),
        info: () => `File: art/wheels/${id}.svg (100×100, tire r=50)\nTokens: ${JSON.stringify(def.tokens)}`,
        destroy: () => destroyTexture(tex),
      };
    },
  };
}

function accessoryItem(id: string): DevItem {
  const def = art.accessories.get(id)!;
  const hosts = [...art.vehicles.values()].filter((v) => v.accessories.includes(id));
  return {
    id: `accessory/${id}`, category: 'Vehicle parts', label: `Accessory · ${def.name}`, context: 'none',
    fields: hosts.length ? [sel('on', 'Mounted on', hosts.map((v) => [v.id, `${v.year} ${v.model}`]), hosts[0].id)] : [],
    build: async (env, cfg) => {
      const host = art.vehicle(String(cfg.on ?? hosts[0]?.id ?? [...art.vehicles.keys()][0]));
      const build = await buildVehicle(art, { ...defaultChoice(host), accessoryIds: [id] }, env.ppu());
      const view = new VehicleView(build);
      view.x = 180;
      env.addDisplay(view);
      let tex: Texture | null = null;
      const p = art.accessorySvg(id);
      if (p) {
        const s = await spriteFromSvg(env, await p, 1, ['accessory']);
        tex = s.tex;
        const holder = new Container();
        holder.addChild(s.sp);
        holder.position.set(-180, -20);
        env.addDisplay(holder);
      }
      return {
        focus: { x: -260, y: -170, w: 560, h: 200 },
        zoomSensitive: true,
        update: (dt) => view.update(dt, 0, 0, false),
        info: () => `${p ? `File: art/accessories/${id}.svg` : 'Color pack (no art)'}\nDefinition: ${JSON.stringify(def)}`,
        destroy: () => {
          build.destroy();
          if (tex) destroyTexture(tex);
        },
      };
    },
  };
}

function brandItem(id: string): DevItem {
  const def = art.brands.get(id)!;
  return {
    id: `brand/${id}`, category: 'Vehicle parts', label: `Badge · ${def.name}`, context: 'none',
    build: async (env) => {
      const { sp, tex } = await spriteFromSvg(env, art.badge(id), 1);
      sp.position.set(-60, -80);
      env.addDisplay(sp);
      return { focus: { x: -80, y: -100, w: 160, h: 100 }, zoomSensitive: true, info: () => `File: art/brands/${id}/badge.svg\n${JSON.stringify(def)}`, destroy: () => destroyTexture(tex) };
    },
  };
}

// ---------- whole scenes / landmarks ----------

function groupItem(id: string, category: string, label: string, make: (env: DevEnv, cfg: Cfg) => Prop[], focus: Focus, extra: (env: DevEnv, list: Prop[]) => { label: string; run(): void }[] = () => [], context: Context = 'scene', fields?: Field[]): DevItem {
  return {
    id, category, label, context, fields,
    build: (env, cfg) => {
      const list = props(env, make(env, cfg));
      return { focus, actions: [...extra(env, list), ...worldActions(env, list, focus)] };
    },
  };
}

const OX = FINAL_CITY.x0;
const JX = CITIES.find((c) => c.id === 'jacksonville')!.x0;
const SAV = CITIES.find((c) => c.id === 'savannah')!.x0;

const BRIDGE_DEV_IDS: Record<string, string> = { talmadge: 'talmadge-bridge', 'main-street': 'main-street-bridge', 'i4-flyover': 'i4-flyover' };
const BRIDGE_DEV_LABELS: Record<string, string> = { talmadge: 'Talmadge Bridge (Savannah)', 'main-street': 'Main Street lift bridge (Jacksonville)', 'i4-flyover': 'I-4 flyover (Orlando)' };

const ROW_COLORS: [string, string][] = P.rainbow.map((_, i) => [String(i), `Pastel ${i + 1}`]);

// ---------- backgrounds ----------

// The leg 1 regions keep their hand-picked spots; the rest use the middle of their first stretch.
const REGION_X: Record<Region, number> = (() => {
  const out = {} as Record<Region, number>;
  REGIONS.forEach(([x, r], i) => {
    if (out[r] === undefined) out[r] = Math.round((x + (REGIONS[i + 1]?.[0] ?? x + 5000)) / 2);
  });
  return { ...out, suburb: 2400, pines: 6000, farm: 12500, town: 20000, duckies: 26000, lowcountry: 60000, marsh: 71000, harbor: 78000, charleston: 83000 };
})();

function regionItem(region: Region): DevItem {
  return {
    id: `background/${region}`, category: 'Backgrounds', label: `Scenery · ${region}`, context: 'scene',
    fields: [
      range('offset', 'Position along region', -3000, 3000, 100, 0),
      bool('clouds', 'Clouds', true, true), bool('skyline', 'Skyline (haze)', true, true), bool('far', 'Far hills', true, true),
      bool('near', 'Near scenery', true, true), bool('road', 'Road', true, true), bool('foreground', 'Foreground', true, true),
    ],
    build: (env, cfg) => {
      const x = REGION_X[region] + Number(cfg.offset);
      return {
        focus: { x: x - 700, y: -620, w: 1400, h: 900 },
        actions: [{ label: 'Drive test car through', run: () => env.testCar.driveThrough(x - 1500, x + 1500) }],
        update: (_dt, c) => {
          for (const n of ['clouds', 'skyline', 'far', 'near', 'road', 'foreground'] as const) env.setLayerVisible(n, !!c[n]);
        },
        info: () => `World x ≈ ${x} (region "${regionAt(x)}"). Generators: src/world/Scenery.ts, src/world/Road.ts`,
      };
    },
  };
}

function roadItem(id: string, label: string, x: number): DevItem {
  return {
    id: `background/road-${id}`, category: 'Backgrounds', label: `Road · ${label}`, context: 'road',
    build: (env) => ({
      focus: { x: x - 600, y: -320, w: 1200, h: 520 },
      actions: [{ label: 'Drive test car through', run: () => env.testCar.driveThrough(x - 1400, x + 1400) }],
      info: () => `World x ${x}. Drawn by src/world/Road.ts`,
    }),
  };
}

const skyItem: DevItem = {
  id: 'background/sky', category: 'Backgrounds', label: 'Sky (morning → day → golden → dusk)', context: 'scene',
  fields: [range('gold', 'Golden hour', 0, 1, 0.05, 0, true), range('dusk', 'Dusk', 0, 1, 0.05, 0, true), range('x', 'World x', 0, 86000, 500, 82000), range('morning', 'Morning', 0, 1, 0.05, 0, true)],
  build: (env, cfg) => {
    const x = Number(cfg.x);
    return {
      focus: { x: x - 700, y: -700, w: 1400, h: 900 },
      update: (_dt, c) => env.setSky(Number(c.gold), Number(c.dusk), Number(c.morning ?? 0)),
      actions: [{ label: 'Launch firework', run: () => launchFirework(env.ctx, x + (Math.random() - 0.5) * 600, -400 - Math.random() * 200) }],
    };
  },
};

// ---------- garage ----------

const garageItem: DevItem = {
  id: 'scene/garage', category: 'Scenes', label: 'Garage (vehicle chooser)', context: 'none',
  build: (env) => {
    const cam = new Camera();
    const { w, h } = env.viewSize();
    cam.resize(w, h);
    const root = new Container();
    root.scale.set(cam.scale);
    let g: Garage;
    const open = () => {
      g?.destroy();
      g = new Garage({
        sfx: env.sfx, fx: env.fx, tweens: env.tweens, art, cam, renderer: env.app.renderer,
        touch: () => env.sfx.pluck(6, 0.1),
        onGo: () => env.tweens.after(1.6, open),
      }, defaultChoice([...art.vehicles.values()][0]));
      root.addChild(g);
    };
    open();
    env.screen.addChild(root);
    return {
      focus: { x: 0, y: 0, w: 100, h: 100 },
      pointer: { down: (e) => g.onDown(e), move: (e) => g.onMove(e), up: (e) => g.onUp(e) },
      update: (dt) => {
        const s = env.viewSize();
        if (s.w !== cam.viewW * cam.scale || s.h !== cam.viewH * cam.scale) {
          cam.resize(s.w, s.h);
          root.scale.set(cam.scale);
          g.layout();
        }
        g.update(dt);
      },
      actions: [
        { label: 'Drive out (go)', run: () => g.go() },
        { label: 'Reset garage', run: open },
      ],
      info: () => 'Zoom/pan are off here: the garage is a full-screen scene. Drive out restarts it.',
      destroy: () => g.destroy(),
    };
  },
};

// ---------- fx & sound ----------

const fxItem: DevItem = {
  id: 'fx/particles', category: 'FX & sound', label: 'Particles', context: 'none',
  build: (env) => {
    const L = env.ctx.layers;
    const at = { x: 0, y: -60 };
    const e = (o: Parameters<typeof env.fx.emit>[1]) => env.fx.emit(L.fx, o);
    return {
      focus: { x: -300, y: -320, w: 600, h: 400 },
      actions: [
        { label: 'Splash', run: () => e({ ...at, count: 18, shape: 'drop', tint: [P.puddle, P.white], speed: [200, 520], angle: [-2.6, -0.5], gravity: 1400, size: [8, 14], spin: 0, rotate: false }) },
        { label: 'Dust', run: () => e({ ...at, count: 10, shape: 'circle', tint: [0xe9e0cf, 0xd8cdb8], speed: [40, 200], angle: [-3, -0.15], gravity: -30, drag: 2, size: [10, 18], grow: 1.8, alpha: 0.75 }) },
        { label: 'Box debris', run: () => e({ ...at, count: 16, shape: 'square', tint: [P.cardboard, P.cardboardDark, P.tape], speed: [150, 420], angle: [-2.8, -0.3], gravity: 1200, size: [6, 14], spin: 10 }) },
        { label: 'Mud', run: () => e({ ...at, count: 14, shape: 'circle', tint: [P.mud, P.mudLight], speed: [120, 300], angle: [-2.6, -0.5], gravity: 1200, size: [6, 12] }) },
        { label: 'Hearts', run: () => e({ ...at, count: 8, shape: 'heart', tint: [0xff6f91, 0xff9eb5, 0xe94b3c], speed: [60, 160], angle: [-2.4, -0.7], gravity: -60, drag: 1.2, life: [1, 1.6], size: [14, 22], spin: 1 }) },
        { label: 'Stars', run: () => e({ ...at, count: 12, shape: 'star', tint: [0xfff27a, P.white], speed: [80, 240], gravity: 150, size: [8, 14] }) },
        { label: 'Feathers', run: () => e({ ...at, count: 12, shape: 'feather', tint: [P.duckYellow, 0xfff6c8, P.white], speed: [100, 300], angle: [-3, -0.1], gravity: 120, drag: 2, life: [1, 1.8], size: [10, 16], spin: 3 }) },
        { label: 'Firework', run: () => launchFirework(env.ctx, (Math.random() - 0.5) * 300, -260) },
      ],
    };
  },
};

const SOUNDS: (keyof Sfx)[] = [
  'honk', 'beepBeep', 'boing', 'whoosh', 'thump', 'squeak', 'crunch', 'bonk', 'splash', 'plip', 'squelch', 'moo', 'quack', 'tweet',
  'glugDing', 'ding', 'bell', 'chime', 'giggle', 'boof', 'rustle', 'door', 'knock', 'engineStart', 'pop', 'whistleUp', 'firework',
  'sparkle', 'irisClose', 'irisOpen', 'tick',
];

const soundItem: DevItem = {
  id: 'fx/sounds', category: 'FX & sound', label: 'Sound board', context: 'none',
  build: (env) => ({
    focus: { x: -200, y: -150, w: 400, h: 200 },
    actions: [
      ...SOUNDS.map((s) => ({ label: s, run: () => (env.sfx[s] as (a?: number) => void).call(env.sfx) })),
      ...[0, 2, 4, 5, 7, 9].map((n) => ({ label: `pluck ${n}`, run: () => env.sfx.pluck(n) })),
    ],
    info: () => 'All sounds are synthesized in src/audio/Sfx.ts. Tap anything first if audio is silent (browsers need a gesture).',
  }),
};

// ---------- the catalog ----------

export function buildCatalog(): DevItem[] {
  const items: DevItem[] = [];
  for (const v of art.vehicles.values()) items.push(vehicleItem(v));
  items.push(lineupItem);
  for (const w of art.wheels.keys()) items.push(wheelItem(w));
  for (const a of art.accessories.keys()) items.push(accessoryItem(a));
  for (const b of art.brands.keys()) items.push(brandItem(b));

  // Road props (native route positions so ramps and terrain line up).
  items.push(
    propItem('prop/boxes', 'Road props', 'Cardboard boxes', (env, c) => [new Boxes(env.ctx, 6000, Number(c.n))], { fields: [sel('n', 'Boxes', [['2', '2'], ['3', '3'], ['4', '4']], '3')] }),
    propItem('prop/puddle', 'Road props', 'Puddle', (env) => [new Puddle(env.ctx, 20000)]),
    propItem('prop/mud', 'Road props', 'Mud patch', (env, c) => [new Mud(env.ctx, 41300, Number(c.len))], { fields: [range('len', 'Length', 120, 1200, 20, 600)] }),
    propItem('prop/rock', 'Road props', 'Rock', (env) => [new Rock(env.ctx, 44000)]),
    propItem('prop/ramp', 'Road props', 'Ramp', (env) => [new Ramp(env.ctx, RAMPS[0].x)]),
    propItem('prop/beach-ball', 'Road props', 'Beach ball', (env) => [new BeachBall(env.ctx, 30800)]),
    propItem('animal/cow', 'Farm & animals', 'Cow', (env) => [new Fence(env.ctx, 11100, 900), new Cow(env.ctx, 11500)]),
    propItem('animal/birds', 'Farm & animals', 'Birds on a fence', (env) => [new Fence(env.ctx, 12300, 900), new Birds(env.ctx, 12700)]),
    propItem('prop/fence', 'Farm & animals', 'Field fence', (env, c) => [new Fence(env.ctx, 10600, Number(c.len))], { fields: [range('len', 'Length', 200, 3000, 50, 900)] }),
    propItem('sign/mile-marker', 'Signs', 'Mile marker', (env, c) => [new MileMarker(env.ctx, mileMarkerX(Number(c.n)), Number(c.n))], {
      fields: [range('n', 'Number', 1, 100, 1, 7)],
    }),
    propItem('sign/interstate-shield', 'Signs', 'Interstate shield', (env, c) => [new InterstateShield(env.ctx, 2500, String(c.route))], {
      fields: [sel('route', 'Route', [['95', 'I-95'], ['4', 'I-4'], ['10', 'I-10'], ['26', 'I-26']], '95')],
    }),
    propItem('sign/guide', 'Signs', 'Green guide sign', (env, c) => {
      const city = String(c.city) as NonNullable<Placement['city']>;
      const p = ROUTE.find((q) => q.kind === 'guide' && q.city === city)!;
      return [new GuideSign(env.ctx, 64200, { city, exit: p.exit, shield: p.shield })];
    }, {
      fields: [sel('city', 'Destination', [['charleston', 'Charleston (I-26)'], ['savannah', 'Savannah (US 17)'], ['jacksonville', 'Jacksonville (I-10)'], ['orlando', 'Orlando (I-4)'], ['downtown-orlando', 'Downtown Orlando'], ['airport', 'Airport']], 'charleston')],
    }),
    propItem('sign/duckies-billboard', 'Signs', 'Duckies billboard', (env) => [new Billboard(env.ctx, 17600)]),
    propItem('sign/billboard', 'Signs', 'Billboard (all designs)', (env, c) => [new Billboard(env.ctx, 17600, String(c.design) as BillboardDesign)], {
      fields: [sel('design', 'Design', [['duckies', 'Duckies'], ['peaches', 'Peaches & Pecans'], ['oj', 'Free OJ'], ['chomp', 'Chomp Land'], ['potato', 'Potato World teaser']], 'peaches')],
    }),
    propItem('sign/welcome-sc', 'Signs', 'Welcome to South Carolina', (env) => [new WelcomeSign(env.ctx, 56400)]),
    propItem('sign/welcome-ga', 'Signs', 'Welcome to Georgia', (env) => [new WelcomeSign(env.ctx, 56400, 'GA')]),
    propItem('sign/welcome-fl', 'Signs', 'Welcome to Florida', (env) => [new WelcomeSign(env.ctx, 56400, 'FL')]),
    propItem('prop/orange-tree', 'Florida', 'Orange tree (tap: oranges drop)', (env, c) => [new OrangeTree(env.ctx, 264000, Number(c.size))], { context: 'scene', fields: [range('size', 'Size', 80, 200, 10, 130)] }),
    propItem('prop/citrus-grove', 'Florida', 'Citrus grove (fence + trees)', (env) => [new Fence(env.ctx, 262600, 3000), ...[263000, 263750, 264500, 265250].map((x) => new OrangeTree(env.ctx, x))], { context: 'scene' }),
    propItem('prop/orange-crate', 'Florida', 'Orange crates (drive through)', (env, c) => [new OrangeCrate(env.ctx, 257500, Number(c.n))], { fields: [sel('n', 'Crates', [['2', '2'], ['3', '3'], ['4', '4']], '3')] }),
    propItem('animal/gator', 'Florida', 'Friendly gator in a pond', (env) => [new Gator(env.ctx, 223500)], { context: 'scene' }),
    propItem('prop/oj-stand', 'Florida', 'Welcome Center OJ stand', (env) => [new OjStand(env.ctx, 218600)], { context: 'scene' }),
  );

  // Landmarks.
  const dz = ZONES.duckies[0];
  items.push(
    groupItem('landmark/home', 'Landmarks', 'Home (whole)', (env) => buildHome(env.ctx).props, { x: -100, y: -420, w: 1200, h: 560 }),
    propItem('landmark/home/house', 'Landmarks', 'Home · house', (env) => [new House(env.ctx, 150)]),
    propItem('landmark/home/tree', 'Landmarks', 'Home · big tree', (env) => [new BigTree(env.ctx, 70)]),
    propItem('landmark/home/mailbox', 'Landmarks', 'Home · mailbox', (env) => [new Mailbox(env.ctx, 120)]),
    {
      id: 'landmark/home/suitcase', category: 'Landmarks', label: 'Home · suitcase', context: 'road',
      build: (env) => {
        const s = env.addProp(new Suitcase(env.ctx, 440));
        env.testCar.park(860);
        const focus = { x: 300, y: -200, w: 700, h: 300 };
        return {
          focus,
          actions: [
            { label: 'Tap (hop onto car)', run: () => s.onTap() },
            { label: 'Chase the car', run: () => (s.chase(), env.testCar.driveThrough(860, 3000)) },
          ],
        };
      },
    },
    groupItem('landmark/duckies', 'Landmarks', 'Duckies (whole)', (env) => buildDuckies(env.ctx), { x: dz, y: -700, w: 3900, h: 820 }),
    propItem('landmark/duckies/pylon', 'Landmarks', 'Duckies · pylon sign', (env) => [new PylonSign(env.ctx, dz + 450)], { context: 'scene' }),
    propItem('landmark/duckies/canopy', 'Landmarks', 'Duckies · canopy + pumps', (env) => [new Canopy(env.ctx, dz + 1300), new Pump(env.ctx, dz + 1120), new Pump(env.ctx, dz + 1480)]),
    propItem('landmark/duckies/store', 'Landmarks', 'Duckies · store (tap door)', (env) => [new Store(env.ctx, dz + 1950)]),
    propItem('landmark/duckies/statue', 'Landmarks', 'Duckies · duck statue', (env) => [new DuckStatue(env.ctx, dz + 3450)]),
    groupItem('landmark/ravenel-bridge', 'Landmarks', 'Ravenel Bridge (whole)', (env) => buildBridge(env.ctx), { x: BRIDGE.start - 200, y: -800, w: BRIDGE.end - BRIDGE.start + 400, h: 1000 }),
    propItem('landmark/ravenel-bridge/tower', 'Landmarks', 'Ravenel Bridge · tower', (env) => [new BridgeTower(env.ctx, 77400)], { context: 'scene' }),
    ...BRIDGES.slice(1).map((b) => groupItem(`landmark/${BRIDGE_DEV_IDS[b.id]}`, 'Landmarks', BRIDGE_DEV_LABELS[b.id], (env) => buildBridge(env.ctx, b), { x: b.start - 200, y: -800, w: b.end - b.start + 400, h: 1000 })),
    groupItem('landmark/airport/regional', 'Landmarks', 'Airport · regional (whole)', (env) => buildAirport(env.ctx, AIRPORTS[0]), { x: AIRPORTS[0].x0 - 300, y: -800, w: AIRPORTS[0].len + 600, h: 900 },
      (_env, list) => [{ label: 'Take off', run: () => (list.find((p) => p instanceof Airfield) as Airfield | undefined)?.takeoff() }]),
    groupItem('landmark/airport/international', 'Landmarks', 'Airport · international (whole)', (env) => buildAirport(env.ctx, AIRPORTS[1]), { x: AIRPORTS[1].x0 - 900, y: -800, w: AIRPORTS[1].len + 1200, h: 900 },
      (_env, list) => [{ label: 'Take off', run: () => (list.find((p) => p instanceof Airfield) as Airfield | undefined)?.takeoff() }]),
    groupItem('landmark/airport/plane', 'Landmarks', 'Airport · runway + departing plane', (env) => [new Airfield(env.ctx, AIRPORTS[0].x0, 2400, false)], { x: AIRPORTS[0].x0 - 300, y: -700, w: 2000, h: 800 },
      (_env, list) => [{ label: 'Take off', run: () => (list[0] as Airfield).takeoff() }]),
    propItem('landmark/airport/terminal', 'Landmarks', 'Airport · terminal (tap: PA + travelers)', (env, c) => [new Terminal(env.ctx, AIRPORTS[0].x0 + 900, c.large ? 2000 : 1050, !!c.large)], { context: 'scene', fields: [bool('large', 'Large (jet bridges + parked planes)')] }),
    propItem('landmark/airport/control-tower', 'Landmarks', 'Airport · control tower', (env, c) => [new ControlTower(env.ctx, AIRPORTS[0].x0 + 2250, Number(c.h))], { context: 'scene', fields: [range('h', 'Height', 240, 440, 20, 300)] }),
    propItem('landmark/airport/hangar', 'Landmarks', 'Airport · hangar + prop plane', (env) => [new Hangar(env.ctx, AIRPORTS[0].x0 + 3100, 520, 200)], { context: 'scene' }),
    propItem('landmark/airport/windsock', 'Landmarks', 'Airport · windsock', (env) => [new Windsock(env.ctx, AIRPORTS[0].x0 + 3900)], { context: 'scene' }),
    propItem('landmark/airport/fuel-truck', 'Landmarks', 'Airport · fuel truck', (env) => [new FuelTruck(env.ctx, AIRPORTS[0].x0 + 2050)], { context: 'scene' }),
    propItem('landmark/airport/baggage-train', 'Landmarks', 'Airport · baggage train', (env) => [new BaggageTrain(env.ctx, AIRPORTS[0].x0 + 2550, 450)], { context: 'scene' }),
    propItem('landmark/airport/radar', 'Landmarks', 'Airport · radar', (env) => [new Radar(env.ctx, AIRPORTS[1].x0 + 3700)], { context: 'scene' }),
    propItem('landmark/airport/approach-lights', 'Landmarks', 'Airport · approach lights', (env) => [new ApproachLights(env.ctx, AIRPORTS[1].x0 - 700)], { context: 'scene' }),
    propItem('landmark/talmadge-bridge/tower', 'Landmarks', 'Talmadge Bridge · tower', (env) => [new BridgeTower(env.ctx, BRIDGES[1].start + 1600, TALMADGE)], { context: 'scene' }),
  );

  // Cities.
  items.push(
    groupItem('city/charleston', 'Cities', 'Charleston (whole)', (env) => buildCharleston(env.ctx).props, { x: 80600, y: -760, w: WORLD_END + 900 - 80600, h: 960 }, (env, list) => {
      const greeters = list.find((p) => p instanceof Greeters) as Greeters | undefined;
      return [
        { label: 'Family comes out', run: () => greeters?.emerge() },
        { label: 'Fireworks', run: () => [0, 1, 2].forEach((k) => env.tweens.after(k * 0.6, () => launchFirework(env.ctx, 84300 + k * 300, -480))) },
      ];
    }),
    propItem('city/charleston/rainbow-row-house', 'Cities', 'Charleston · Rainbow Row house', (env, c) => [new RowHouse(env.ctx, 82800, Number(c.w), Number(c.h), P.rainbow[Number(c.color)], Number(c.color), !!c.door)], {
      context: 'scene',
      fields: [sel('color', 'Color', ROW_COLORS, '0'), range('w', 'Width', 180, 320, 10, 250), range('h', 'Height', 220, 360, 10, 290), bool('door', 'Front door', true)],
    }),
    propItem('city/charleston/steeple', 'Cities', "Charleston · St. Michael's steeple", (env) => [new Steeple(env.ctx, 82350)], { context: 'scene' }),
    propItem('city/charleston/fountain', 'Cities', 'Charleston · Pineapple Fountain', (env) => [new Fountain(env.ctx, 85350)], { context: 'scene' }),
    propItem('city/charleston/palmetto', 'Cities', 'Charleston · palmetto', (env, c) => [new Palm(env.ctx, 83000, c.front ? 70 : -60, Number(c.size), Number(c.lean), !!c.front)], {
      context: 'scene',
      fields: [range('size', 'Size', 120, 280, 10, 210), range('lean', 'Lean', -0.5, 0.5, 0.05, 0), bool('front', 'Near side (in front of road)', true)],
    }),
    {
      id: 'city/charleston/greeters', category: 'Cities', label: 'Charleston · family + dog', context: 'scene',
      build: (env) => {
        const g = env.addProp(new Greeters(env.ctx, 84500, 84300));
        g.emerge();
        const focus = { x: 84200, y: -260, w: 600, h: 330 };
        return { focus, actions: [{ label: 'Come out again', run: () => ((g.out = false), g.emerge()) }, ...worldActions(env, [g], focus)] };
      },
    },
    propItem('city/charleston/end-park', 'Cities', 'Charleston · end of the road', (env) => [new EndPark(env.ctx, WORLD_END + 110)], { context: 'scene' }),
    groupItem('city/savannah', 'Cities', 'Savannah (whole)', (env) => buildSavannah(env.ctx, SAV).props, { x: SAV, y: -760, w: 6200, h: 1000 }),
    propItem('city/savannah/warehouse', 'Cities', 'Savannah · River Street warehouse', (env, c) => [new Warehouse(env.ctx, SAV + 1000, Number(c.w), Number(c.floors), BRICKS[Number(c.color)], Number(c.color), !!c.candy)], {
      context: 'scene',
      fields: [sel('color', 'Brick', BRICKS.map((_, i) => [String(i), `Brick ${i + 1}`] as [string, string]), '0'), range('w', 'Width', 200, 320, 10, 260), range('floors', 'Floors', 2, 5, 1, 3), bool('candy', 'Candy shop', false)],
    }),
    propItem('city/savannah/city-hall', 'Cities', 'Savannah · City Hall gold dome', (env) => [new CityHall(env.ctx, SAV + 1350)], { context: 'scene' }),
    propItem('city/savannah/cathedral', 'Cities', 'Savannah · Cathedral of St. John', (env) => [new Cathedral(env.ctx, SAV + 3800)], { context: 'scene' }),
    propItem('city/savannah/forsyth-fountain', 'Cities', 'Savannah · Forsyth Park fountain', (env) => [new ForsythFountain(env.ctx, SAV + 5300)], { context: 'scene' }),
    propItem('city/savannah/live-oak', 'Cities', 'Savannah · live oak with moss', (env, c) => [new LiveOak(env.ctx, SAV + 3050, Number(c.size), !!c.front)], {
      context: 'scene',
      fields: [range('size', 'Size', 160, 340, 10, 260), bool('front', 'Near side (in front of road)', false)],
    }),
    propItem('city/savannah/gas-lamp', 'Cities', 'Savannah · gas lamp', (env, c) => [new GasLamp(env.ctx, SAV + 2900, !!c.front)], { context: 'scene', fields: [bool('front', 'Near side (in front of road)', false)] }),
    propItem('city/savannah/riverboat', 'Cities', 'Savannah · paddle-wheel riverboat', (env) => [new RiverBand(env.ctx, SAV + 1300, 1200), new Riverboat(env.ctx, SAV + 1900)], { context: 'scene' }),
    {
      id: 'city/savannah/waving-girl', category: 'Cities', label: 'Savannah · Waving Girl + riverboat', context: 'scene',
      build: (env) => {
        env.addProp(new RiverBand(env.ctx, SAV + 300, 2200));
        const boat = env.addProp(new Riverboat(env.ctx, SAV + 1500));
        const girl = env.addProp(new WavingGirl(env.ctx, SAV + 900));
        girl.boats.push(boat);
        const focus = { x: SAV + 500, y: -300, w: 1500, h: 560 };
        return { focus, actions: [{ label: 'Wave', run: () => girl.onTap() }, ...worldActions(env, [girl, boat], focus)] };
      },
    },
    propItem('city/savannah/river', 'Cities', 'Savannah · river (near side)', (env) => [new RiverBand(env.ctx, SAV + 300, 3000)], { context: 'scene' }),
    groupItem('city/jacksonville', 'Cities', 'Jacksonville (whole)', (env) => buildJacksonville(env.ctx).props, { x: JX - 300, y: -900, w: 6600, h: 1200 }),
    propItem('city/jacksonville/tower', 'Cities', 'Jacksonville · tower', (env, c) => [new Tower(env.ctx, JX + 1100, { variant: c.variant as TowerVariant, w: Number(c.w), h: Number(c.h) })], {
      context: 'scene',
      fields: [sel('variant', 'Variant', [['crown', 'Crown (color lights)'], ['slab', 'Dark glass slab'], ['granite', 'Pink granite'], ['glass', 'Light glass (Orlando)']], 'crown'), range('w', 'Width', 140, 260, 10, 210), range('h', 'Height', 400, 800, 20, 700)],
    }),
    propItem('city/jacksonville/mid-rise', 'Cities', 'Jacksonville · mid-rise', (env) => [new MidRise(env.ctx, JX + 780, 150, 320, 0xcfd8e0, 2)], { context: 'scene' }),
    propItem('city/jacksonville/treaty-oak', 'Cities', 'Jacksonville · Treaty Oak (squirrel)', (env) => [new TreatyOak(env.ctx, JX + 2150)], { context: 'scene' }),
    propItem('city/jacksonville/friendship-fountain', 'Cities', 'Jacksonville · Friendship Fountain', (env) => [new FriendshipFountain(env.ctx, JX + 4800)], { context: 'scene' }),
    propItem('city/jacksonville/palm', 'Cities', 'Jacksonville · tall riverwalk palm', (env, c) => [new TallPalm(env.ctx, JX + 2550, -60, Number(c.h), Number(c.lean))], {
      context: 'scene', fields: [range('h', 'Height', 260, 460, 10, 380), range('lean', 'Lean', -0.15, 0.15, 0.01, 0.05)],
    }),
    propItem('city/jacksonville/river', 'Cities', 'Jacksonville · St. Johns riverwalk', (env) => [new JaxRiver(env.ctx, JX - 240, 2000, true, 240)], { context: 'scene' }),
    propItem('city/jacksonville/pelicans', 'Cities', 'Jacksonville · pelicans on pilings', (env) => [new JaxRiver(env.ctx, JX + 900, 1000), new Pelicans(env.ctx, JX + 1250, 3, 150)], { context: 'scene' }),
    propItem('city/jacksonville/tugboat', 'Cities', 'Jacksonville · tug + barge', (env) => [new JaxRiver(env.ctx, JX + 500, 2200), new Tugboat(env.ctx, JX + 600, 1800, 0.3)], { context: 'scene' }),
    groupItem('city/orlando', 'Cities', 'Orlando (whole, with the ending)', (env) => {
      const set = buildOrlando(env.ctx);
      return [...set.props, ...buildArrival(env.ctx, FINAL_CITY, set.doorX).props];
    }, { x: OX + 200, y: -760, w: WORLD_END + 900 - OX - 200, h: 960 }, (env, list) => {
      const greeters = list.find((p) => p instanceof Greeters) as Greeters | undefined;
      return [
        { label: 'Family comes out', run: () => greeters?.emerge() },
        { label: 'Fireworks', run: () => [0, 1, 2].forEach((k) => env.tweens.after(k * 0.6, () => launchFirework(env.ctx, OX + 3200 + k * 300, -560))) },
      ];
    }),
    propItem('city/orlando/lake-eola', 'Cities', 'Orlando · Lake Eola fountain (tap: light show)', (env) => [new LakeEola(env.ctx, OX + 2080, 1300)], { context: 'scene' }),
    propItem('city/orlando/swan-boat', 'Cities', 'Orlando · swan paddle boat', (env) => [new LakeEola(env.ctx, OX + 2080, 1300), new SwanBoat(env.ctx, OX + 1750)], { context: 'scene' }),
    propItem('city/orlando/swan', 'Cities', 'Orlando · swan', (env) => [new LakeEola(env.ctx, OX + 2080, 1300), new Swan(env.ctx, OX + 1980)], { context: 'scene' }),
    propItem('city/orlando/bandshell', 'Cities', 'Orlando · bandshell', (env) => [new Bandshell(env.ctx, OX + 2900)], { context: 'scene' }),
    propItem('city/orlando/observation-wheel', 'Cities', 'Orlando · observation wheel', (env) => [new ObservationWheel(env.ctx, OX + 3290, 240)], { context: 'scene' }),
    propItem('city/orlando/house', 'Cities', 'Orlando · Florida house', (env) => [new FloridaHouse(env.ctx, OX + 3700)], { context: 'scene' }),
    propItem('city/orlando/flamingo', 'Cities', 'Orlando · lawn flamingo', (env) => [new Flamingo(env.ctx, OX + 4330)], { context: 'scene' }),
    propItem('city/orlando/end-park', 'Cities', 'Orlando · end of the road (Florida)', (env) => [new EndPark(env.ctx, WORLD_END + 110, true)], { context: 'scene' }),
  );

  // Backgrounds.
  for (const r of Object.keys(REGION_X) as Region[]) items.push(regionItem(r));
  items.push(
    roadItem('interstate', 'Interstate (barrier + poles)', 5000),
    roadItem('home-street', 'Home street (open road)', 1000),
    roadItem('duckies-lot', 'Duckies lot', ZONES.duckies[0] + 1500),
    roadItem('bridge', 'Ravenel Bridge deck', 78200),
    roadItem('charleston-street', 'Charleston street', 82000),
    roadItem('savannah-cobble', 'Savannah cobblestone street', 164000),
    roadItem('jacksonville-riverwalk', 'Jacksonville riverwalk', 246000),
    roadItem('orlando-pavers', 'Orlando brick pavers', 328000),
    roadItem('talmadge-deck', 'Talmadge Bridge deck', 160200),
    roadItem('lift-bridge-deck', 'Main Street lift bridge deck', 242200),
    roadItem('flyover', 'I-4 flyover over ground', 324200),
    roadItem('airport', 'Airport stretch (barrier)', 197000),
    skyItem,
  );

  items.push(garageItem, fxItem, soundItem);
  return items;
}

