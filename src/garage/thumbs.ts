// Chip pictures: brand badges, vehicle thumbnails, wheels, accessories, paint swatches.
// Built lazily (a couple per frame) and cached for the garage visit.
import { Container, Graphics, Sprite } from 'pixi.js';
import type { ArtRegistry } from '../vehicle/art/registry';
import { buildVehicle, choiceSlots, type VehicleBuild } from '../vehicle/art/VehicleBuild';
import { VehicleView } from '../vehicle/VehicleView';
import { colorMap, recolorSvg } from '../vehicle/art/recolor';
import { destroyTexture, rasterize, toTexture } from '../vehicle/art/rasterize';
import { defaultChoice, type VehicleChoice } from '../vehicle/art/schema';
import type { ChipSpec, GroupIcon } from './GarageModel';
import { darken } from '../style/palette';

/** Box the picture must fit in (design units). */
export const THUMB = { w: 104, h: 64 };

export interface Thumb {
  display: Container;
  destroy(): void;
}

const hexNum = (h: string) => parseInt(h.replace('#', ''), 16);

export function paintSwatch(hex: string): Container {
  const g = new Graphics();
  g.circle(0, 0, 27).fill(darken(hexNum(hex), 0.15));
  g.circle(0, 0, 24).fill(hexNum(hex));
  g.ellipse(-8, -10, 9, 5).fill({ color: 0xffffff, alpha: 0.45 });
  return g;
}

export function groupIcon(icon: GroupIcon): Container {
  const g = new Graphics();
  const ink = 0x6b7685;
  if (icon === 'paint') {
    // paint bucket with a drip
    g.roundRect(-14, -8, 28, 26, 5).fill(ink);
    g.roundRect(-16, -12, 32, 7, 3).fill(darken(ink, 0.2));
    g.moveTo(-10, -12).quadraticCurveTo(0, -30, 10, -12).stroke({ width: 3, color: ink, cap: 'round' });
    g.roundRect(4, -4, 6, 14, 3).fill(0xe94b3c);
  } else if (icon === 'wheels') {
    g.circle(0, 0, 18).fill(ink);
    g.circle(0, 0, 11).fill(0xd5dbe1);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.circle(Math.cos(a) * 6, Math.sin(a) * 6, 2.2).fill(ink);
    }
  } else {
    // roof box on a little car roof
    g.roundRect(-20, -14, 40, 12, 6).fill(ink);
    g.roundRect(-16, 2, 32, 12, 4).fill(darken(ink, 0.25));
    g.roundRect(-12, -2, 4, 5, 1).fill(ink);
    g.roundRect(8, -2, 4, 5, 1).fill(ink);
  }
  return g;
}

function blackPackIcon(): Container {
  const g = new Graphics();
  g.roundRect(-30, -6, 60, 18, 7).fill(0x9aa3ad);
  g.roundRect(-22, -18, 40, 14, 6).fill(0x1b1b1d);
  g.circle(-16, 14, 8).fill(0x1b1b1d);
  g.circle(16, 14, 8).fill(0x1b1b1d);
  g.ellipse(14, -9, 4, 3).fill(0x1b1b1d);
  return g;
}

export class ThumbFactory {
  private cache = new Map<string, Promise<Thumb>>();
  private queue: (() => void)[] = [];

  constructor(private reg: ArtRegistry, private uiPpu: () => number) {}

  /** Call once per frame: starts at most `n` queued builds. */
  pump(n = 2): void {
    for (let i = 0; i < n && this.queue.length; i++) this.queue.shift()!();
  }

  get(spec: ChipSpec, choice: VehicleChoice): Promise<Thumb> {
    const key = this.keyFor(spec, choice);
    let p = this.cache.get(key);
    if (!p) {
      p = new Promise<Thumb>((resolve, reject) => this.queue.push(() => this.make(spec, choice).then(resolve, reject)));
      this.cache.set(key, p);
    }
    return p;
  }

  private keyFor(spec: ChipSpec, choice: VehicleChoice): string {
    // Wheel pictures follow the rim color (e.g. black pack).
    if (spec.kind === 'wheel') {
      const def = this.reg.vehicle(choice.vehicleId);
      const accs = choice.accessoryIds.map((a) => this.reg.accessories.get(a)!).filter(Boolean);
      return `${spec.key}|${choiceSlots(def, choice, accs).rims ?? ''}`;
    }
    if (spec.kind === 'crumb-model') return `model:${spec.id}`;
    if (spec.kind === 'crumb-brand') return `brand:${spec.id}`;
    return spec.key;
  }

  private async svgThumb(svg: string, natW: number, natH: number, include?: string[]): Promise<Thumb> {
    const s = Math.min(THUMB.w / natW, THUMB.h / natH);
    const r = await rasterize(svg, s * this.uiPpu(), include ? { include, exclude: (n) => n.startsWith('guide-') } : undefined);
    const tex = toTexture(r);
    const sp = new Sprite(tex);
    sp.anchor.set(0.5);
    sp.scale.set(s);
    const c = new Container();
    c.addChild(sp);
    return { display: c, destroy: () => (c.destroy({ children: true }), destroyTexture(tex)) };
  }

  private async make(spec: ChipSpec, choice: VehicleChoice): Promise<Thumb> {
    const reg = this.reg;
    switch (spec.kind) {
      case 'brand':
      case 'crumb-brand':
        return this.svgThumb(reg.badge(spec.id), 120, 60);
      case 'model':
      case 'crumb-model': {
        const def = reg.vehicle(spec.id);
        const scale = THUMB.w / 240;
        const build: VehicleBuild = await buildVehicle(reg, defaultChoice(def), Math.max(0.5, scale * this.uiPpu() * 1.07));
        const view = new VehicleView(build);
        const c = new Container();
        view.scale.set(Math.min(THUMB.w / build.dims.length, THUMB.h / (build.dims.height + 4)));
        view.y = (build.dims.height * view.scale.y) / 2;
        c.addChild(view);
        return { display: c, destroy: () => (c.destroy({ children: true }), build.destroy()) };
      }
      case 'wheel': {
        const def = reg.vehicle(choice.vehicleId);
        const wheel = reg.wheels.get(spec.id)!;
        const accs = choice.accessoryIds.map((a) => reg.accessories.get(a)!).filter(Boolean);
        const svg = recolorSvg(await reg.wheelSvg(spec.id), colorMap(wheel.tokens, { rims: choiceSlots(def, choice, accs).rims }));
        return this.svgThumb(svg, 100 * 1.6, 100 * 1.6);
      }
      case 'accessory': {
        const p = reg.accessorySvg(spec.id);
        if (!p) {
          const c = new Container();
          c.addChild(blackPackIcon());
          return { display: c, destroy: () => c.destroy({ children: true }) };
        }
        const svg = await p;
        const vb = /viewBox="([^"]+)"/.exec(svg)?.[1].split(/\s+/).map(Number) ?? [0, 0, 100, 100];
        return this.svgThumb(svg, vb[2], vb[3], ['accessory']);
      }
      case 'paint': {
        const def = reg.vehicle(choice.vehicleId);
        const c = new Container();
        c.addChild(paintSwatch(def.paints.find((p) => p.id === spec.id)?.swatch ?? '#888888'));
        return { display: c, destroy: () => c.destroy({ children: true }) };
      }
      case 'divider': {
        const c = new Container();
        c.addChild(groupIcon(spec.icon ?? 'accessories'));
        return { display: c, destroy: () => c.destroy({ children: true }) };
      }
    }
  }

  destroyAll(): void {
    for (const p of this.cache.values()) void p.then((t) => t.destroy(), () => {});
    this.cache.clear();
    this.queue = [];
  }
}

