// A VehicleChoice turned into ready-to-use textures + measurements.
import type { Texture } from 'pixi.js';
import { makeRng } from '../../core/rng';
import { bboxOf } from './geometry';
import { measureArt, toDims, type ArtMeasure } from './measure';
import { colorMap, recolorSvg } from './recolor';
import { bakeOverlay, destroyTexture, rasterize, toTexture } from './rasterize';
import type { ArtRegistry } from './registry';
import { STYLE, type AccessoryDef, type SlotColors, type VehicleChoice, type VehicleDef, type VehicleDims } from './schema';
import { browserDom, findLayer, isRuntimeHidden, rootSvg } from './svgDoc';

/** A texture plus where its top-left sits in car-local ART coordinates (origin, y down). */
export interface Part {
  tex: Texture;
  x: number;
  y: number;
}

export interface AccessoryPart extends Part {
  def: AccessoryDef;
}

export interface VehicleBuild {
  def: VehicleDef;
  choice: VehicleChoice;
  measure: ArtMeasure;
  dims: VehicleDims;
  gameScale: number;
  body: Part;
  mud: Part;
  wet: Part;
  /** One texture per wheel, sized 2r world units. */
  wheels: Texture[];
  accessories: AccessoryPart[];
  /** Art units the roof cargo point is raised by roof accessories. */
  roofLift: number;
  destroy(): void;
}

/** Canvas pixels per art unit for crisp rendering at a given on-screen scale. */
export function pixelsPerUnit(screenScale: number, resolution: number, displayScale = 1): number {
  const v = screenScale * resolution * STYLE.squashY * displayScale;
  return Math.max(1, Math.min(4, Math.ceil(v * 4) / 4));
}

export function choiceSlots(def: VehicleDef, choice: VehicleChoice, accs: AccessoryDef[]): SlotColors {
  const paint = def.paints.find((p) => p.id === choice.paintId) ?? def.paints[0];
  return Object.assign({}, paint.slots, ...accs.map((a) => a.slots ?? {}));
}

export async function buildVehicle(reg: ArtRegistry, choice: VehicleChoice, ppu: number): Promise<VehicleBuild> {
  const def = reg.vehicle(choice.vehicleId);
  const gameScale = def.gameScale ?? 1;
  const accs = choice.accessoryIds.map((id) => reg.accessories.get(id)).filter((a): a is AccessoryDef => !!a);
  const slots = choiceSlots(def, choice, accs);
  const raw = await reg.vehicleSvg(def.id);
  const svg = recolorSvg(raw, colorMap(def.tokens, slots));
  const measure = measureArt(browserDom.parse(svg));
  const roofLift = accs.reduce((s, a) => s + (a.mount === 'roof' ? a.stackHeight ?? 0 : 0), 0);
  const dims = toDims(measure, gameScale, roofLift);
  const textures: Texture[] = [];
  const keep = (t: Texture) => (textures.push(t), t);
  const local = (r: { x: number; y: number }) => ({ x: r.x - measure.origin.x, y: r.y - measure.origin.y });

  // Body (+ any opt-* layers switched on by accessories).
  const show = accs.flatMap((a) => a.showLayers ?? []);
  // Rendered at ppu × gameScale so scaled-up vehicles stay crisp; sizes stay in art units.
  const bodyR = await rasterize(svg, ppu * gameScale, { include: ['body', ...show], exclude: isRuntimeHidden });
  const bodyPos = local(bodyR);
  const bp = bodyR.ppu;

  // Mud splotches on the lower body and wet streaks along the shoulder, clipped to the body.
  const rng = makeRng(def.id.length * 977 + 13);
  const mudC = bakeOverlay(bodyR.canvas, (ctx, w, h) => {
    ctx.fillStyle = '#7a5534';
    for (let i = 0; i < 26; i++) {
      const x = rng() * w, y = h * (0.55 + rng() * 0.45), r = (3 + rng() * 6) * bp;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.8, y + r * 0.4, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Wheel arches in canvas px (a little larger than the oversized wheels): streaks skip them.
  const arches = measure.wheels.map((wh) => ({
    cx: (wh.x - bodyPos.x) * bp,
    cy: (wh.y - bodyPos.y) * bp,
    r: wh.r * STYLE.wheelScale * 1.22 * bp,
  }));
  const wetC = bakeOverlay(bodyR.canvas, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    const pad = 5 * bp;
    const streak = (x: number, y: number, len: number, t: number) => {
      // Split the streak wherever it would cross a wheel arch.
      let segs: [number, number][] = [[x, x + len]];
      for (const a of arches) {
        const near = Math.min(Math.abs(y - a.cy), Math.abs(y + t - a.cy));
        const d = y <= a.cy && y + t >= a.cy ? 0 : near;
        if (d >= a.r) continue;
        const c = Math.sqrt(a.r * a.r - d * d) + pad;
        segs = segs.flatMap(([s0, s1]): [number, number][] => {
          if (s1 <= a.cx - c || s0 >= a.cx + c) return [[s0, s1]];
          const out: [number, number][] = [];
          if (s0 < a.cx - c) out.push([s0, a.cx - c]);
          if (s1 > a.cx + c) out.push([a.cx + c, s1]);
          return out;
        });
      }
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 8 * bp) continue;
        ctx.beginPath();
        ctx.roundRect(s0, y, s1 - s0, t, t / 2);
        ctx.fill();
      }
    };
    streak(w * 0.05, h * 0.46, w * 0.88, 4 * bp);
    streak(w * 0.03, h * 0.58, w * 0.25, 2.5 * bp);
    streak(w * 0.6, h * 0.6, w * 0.3, 2.5 * bp);
  });
  const body = { tex: keep(toTexture(bodyR)), ...bodyPos };
  const mud = { tex: keep(toTexture({ canvas: mudC, ppu: bp })), ...bodyPos };
  const wet = { tex: keep(toTexture({ canvas: wetC, ppu: bp })), ...bodyPos };

  // Wheels: library art scaled to the oversized radius, rims recolored by slot.
  const wheelDef = reg.wheels.get(choice.wheelId) ?? reg.wheels.get(def.wheels.default)!;
  const wheelSvg = recolorSvg(await reg.wheelSvg(wheelDef.id), colorMap(wheelDef.tokens, { rims: slots.rims }));
  const wheels: Texture[] = [];
  const wheelCache = new Map<number, Texture>();
  for (const w of dims.wheels) {
    const key = Math.round(w.r * 10);
    let t = wheelCache.get(key);
    if (!t) {
      const r = await rasterize(wheelSvg, (2 * w.r * ppu) / 100, undefined, false);
      t = keep(toTexture({ canvas: r.canvas, ppu }));
      wheelCache.set(key, t);
    }
    wheels.push(t);
  }

  // Accessories, positioned so their guide-mount sits on the vehicle's mount point.
  const accessories: AccessoryPart[] = [];
  for (const a of accs) {
    const p = reg.accessorySvg(a.id);
    if (!p || a.mount === 'none') continue;
    const asvg = await p;
    const mountEl = findLayer(rootSvg(browserDom.parse(asvg)), 'guide-mount');
    const mb = mountEl ? bboxOf(mountEl) : null;
    const r = await rasterize(asvg, ppu * gameScale, { include: ['accessory'], exclude: (n) => n.startsWith('guide-') });
    const mx = mb ? mb.cx : 0, my = mb ? mb.y1 : 0;
    const [ox, oy] = a.offset ?? [0, 0];
    accessories.push({ def: a, tex: keep(toTexture(r)), x: r.x - mx + ox, y: r.y - my + oy });
  }

  return {
    def, choice, measure, dims, gameScale, body, mud, wet, wheels, accessories, roofLift,
    destroy: () => textures.forEach(destroyTexture),
  };
}
