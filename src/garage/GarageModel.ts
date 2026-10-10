// Pure garage state: which shelf level is showing and what the child has picked.
// Brand → model (year + model) → customize (paint, wheels, accessories). No rendering here.
import type { AccessoryDef, BrandDef, VehicleChoice, VehicleDef } from '../vehicle/art/schema';
import { defaultChoice } from '../vehicle/art/schema';

export interface Catalog {
  brands: BrandDef[];
  vehiclesOf(brandId: string): VehicleDef[];
  vehicle(id: string): VehicleDef;
  accessory(id: string): AccessoryDef | undefined;
  wheelName(id: string): string;
}

export type Level = 'brands' | 'models' | 'custom';
export type ChipKind = 'crumb-brand' | 'crumb-model' | 'brand' | 'model' | 'paint' | 'wheel' | 'accessory' | 'divider';
export type GroupIcon = 'paint' | 'wheels' | 'accessories';

export interface ChipSpec {
  key: string;
  kind: ChipKind;
  id: string;
  caption: string;
  selected: boolean;
  icon?: GroupIcon;
}

export interface Change {
  /** A different vehicle model is on stage. */
  vehicle: boolean;
  /** Paint / wheels / accessories changed (same model). */
  look: boolean;
  /** The shelf shows a different level. */
  level: boolean;
}

const NONE: Change = { vehicle: false, look: false, level: false };

export class GarageModel {
  level: Level = 'brands';
  choice: VehicleChoice;

  constructor(private cat: Catalog, choice: VehicleChoice) {
    this.choice = { ...choice, accessoryIds: [...choice.accessoryIds] };
  }

  get vehicle(): VehicleDef {
    return this.cat.vehicle(this.choice.vehicleId);
  }

  get brandId(): string {
    return this.vehicle.brand;
  }

  chips(): ChipSpec[] {
    const v = this.vehicle;
    const brand = this.cat.brands.find((b) => b.id === v.brand);
    const crumbs: ChipSpec[] = [];
    if (this.level !== 'brands') crumbs.push({ key: 'crumb-brand', kind: 'crumb-brand', id: v.brand, caption: brand?.name ?? v.brand, selected: false });
    if (this.level === 'custom') crumbs.push({ key: 'crumb-model', kind: 'crumb-model', id: v.id, caption: `${v.year} ${v.model}`, selected: false });

    if (this.level === 'brands') {
      return this.cat.brands
        .filter((b) => this.cat.vehiclesOf(b.id).length)
        .map((b) => ({ key: `brand:${b.id}`, kind: 'brand', id: b.id, caption: b.name, selected: b.id === v.brand }));
    }
    if (this.level === 'models') {
      return [
        ...crumbs,
        ...this.cat.vehiclesOf(v.brand).map((m): ChipSpec => ({
          key: `model:${m.id}`, kind: 'model', id: m.id, caption: `${m.year} ${m.model}`, selected: m.id === v.id,
        })),
      ];
    }
    const out: ChipSpec[] = [...crumbs];
    if (v.paints.length > 1) {
      out.push({ key: 'div:paint', kind: 'divider', id: 'paint', caption: '', selected: false, icon: 'paint' });
      for (const p of v.paints) out.push({ key: `paint:${p.id}`, kind: 'paint', id: p.id, caption: p.name, selected: p.id === this.choice.paintId });
    }
    if (v.wheels.options.length > 1) {
      out.push({ key: 'div:wheels', kind: 'divider', id: 'wheels', caption: '', selected: false, icon: 'wheels' });
      for (const w of v.wheels.options) out.push({ key: `wheel:${w}`, kind: 'wheel', id: w, caption: this.cat.wheelName(w), selected: w === this.choice.wheelId });
    }
    if (v.accessories.length) {
      out.push({ key: 'div:acc', kind: 'divider', id: 'accessories', caption: '', selected: false, icon: 'accessories' });
      for (const a of v.accessories) {
        out.push({ key: `acc:${a}`, kind: 'accessory', id: a, caption: this.cat.accessory(a)?.name ?? a, selected: this.choice.accessoryIds.includes(a) });
      }
    }
    return out;
  }

  select(chip: ChipSpec): Change {
    switch (chip.kind) {
      case 'crumb-brand':
        return this.goto('brands');
      case 'crumb-model':
        return this.goto('models');
      case 'divider':
        return NONE;
      case 'brand': {
        // Picking a brand shows its first model right away (every touch answers).
        const first = this.cat.vehiclesOf(chip.id)[0];
        const changed = !!first && first.brand !== this.vehicle.brand;
        if (changed) this.choice = this.carryOver(defaultChoice(first));
        this.level = 'models';
        return { vehicle: changed, look: false, level: true };
      }
      case 'model': {
        const changed = chip.id !== this.choice.vehicleId;
        if (changed) this.choice = this.carryOver(defaultChoice(this.cat.vehicle(chip.id)));
        this.level = 'custom';
        return { vehicle: changed, look: false, level: true };
      }
      case 'paint':
        return this.setPaint(chip.id) ? { vehicle: false, look: true, level: false } : NONE;
      case 'wheel':
        if (this.choice.wheelId === chip.id) return NONE;
        this.choice.wheelId = chip.id;
        return { vehicle: false, look: true, level: false };
      case 'accessory':
        this.toggleAccessory(chip.id);
        return { vehicle: false, look: true, level: false };
    }
  }

  private goto(level: Level): Change {
    if (this.level === level) return NONE;
    this.level = level;
    return { vehicle: false, look: false, level: true };
  }

  /** Keep the color and accessories the new vehicle also supports (red stays red when switching). */
  private carryOver(next: VehicleChoice): VehicleChoice {
    const v = this.cat.vehicle(next.vehicleId);
    next.accessoryIds = this.choice.accessoryIds.filter((a) => v.accessories.includes(a));
    if (this.paintChosen && v.paints.some((p) => p.id === this.choice.paintId)) next.paintId = this.choice.paintId;
    return next;
  }

  /** True once the child picked a color (until then each model shows its factory color). */
  private paintChosen = false;

  /** Paint the current vehicle (e.g. from a paint can). Returns false if it doesn't offer that color. */
  setPaint(paintId: string): boolean {
    if (!this.vehicle.paints.some((p) => p.id === paintId)) return false;
    this.paintChosen = true;
    if (this.choice.paintId === paintId) return false;
    this.choice.paintId = paintId;
    return true;
  }

  private toggleAccessory(id: string): void {
    const ids = this.choice.accessoryIds;
    if (ids.includes(id)) {
      this.choice.accessoryIds = ids.filter((x) => x !== id);
      return;
    }
    const a = this.cat.accessory(id);
    const clashes = (x: string) => (a?.excludes ?? []).includes(x) || (this.cat.accessory(x)?.excludes ?? []).includes(id);
    // Only one accessory per mount point (one roof item, one hitch item).
    const sameMount = (x: string) => a && a.mount !== 'none' && this.cat.accessory(x)?.mount === a.mount;
    this.choice.accessoryIds = [...ids.filter((x) => !clashes(x) && !sameMount(x)), id];
  }
}
