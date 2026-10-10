// Everything in art/, bundled by Vite. Definitions load eagerly (small JSON); SVG text loads
// lazily so a garage with many cars only pays for what it shows.
import type { AccessoryDef, BrandDef, VehicleDef, WheelDef } from './schema';

const vehicleDefs = import.meta.glob<VehicleDef>('/art/vehicles/*/vehicle.json', { eager: true, import: 'default' });
const vehicleSvgs = import.meta.glob<string>(['/art/vehicles/*/art.svg'], { query: '?raw', import: 'default' });
const wheelDefs = import.meta.glob<WheelDef[]>('/art/wheels/wheels.json', { eager: true, import: 'default' });
const wheelSvgs = import.meta.glob<string>(['/art/wheels/*.svg', '!/art/wheels/*.generated.svg'], { query: '?raw', import: 'default' });
const accessoryDefs = import.meta.glob<AccessoryDef[]>('/art/accessories/accessories.json', { eager: true, import: 'default' });
const accessorySvgs = import.meta.glob<string>(['/art/accessories/*.svg', '!/art/accessories/*.generated.svg'], { query: '?raw', import: 'default' });
const brandDefs = import.meta.glob<BrandDef>('/art/brands/*/brand.json', { eager: true, import: 'default' });
const brandBadges = import.meta.glob<string>('/art/brands/*/badge.svg', { query: '?raw', import: 'default', eager: true });

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((d) => [d.id, d]));

export class ArtRegistry {
  readonly vehicles = byId(Object.values(vehicleDefs).sort((a, b) => a.brand.localeCompare(b.brand) || a.year - b.year || a.model.localeCompare(b.model)));
  readonly wheels = byId(Object.values(wheelDefs).flat());
  readonly accessories = byId(Object.values(accessoryDefs).flat());
  readonly brands = byId(Object.values(brandDefs).sort((a, b) => a.name.localeCompare(b.name)));
  private cache = new Map<string, Promise<string>>();

  private load(table: Record<string, () => Promise<string>>, path: string): Promise<string> {
    let p = this.cache.get(path);
    if (!p) {
      const loader = table[path];
      if (!loader) return Promise.reject(new Error(`Missing art file ${path}`));
      p = loader();
      this.cache.set(path, p);
    }
    return p;
  }

  vehicle(id: string): VehicleDef {
    const d = this.vehicles.get(id);
    if (!d) throw new Error(`Unknown vehicle ${id}`);
    return d;
  }

  vehicleSvg(id: string): Promise<string> {
    return this.load(vehicleSvgs, `/art/vehicles/${id}/art.svg`);
  }

  wheelSvg(id: string): Promise<string> {
    return this.load(wheelSvgs, `/art/wheels/${id}.svg`);
  }

  accessorySvg(id: string): Promise<string> | null {
    const path = `/art/accessories/${id}.svg`;
    return accessorySvgs[path] ? this.load(accessorySvgs, path) : null;
  }

  badge(brandId: string): string {
    return brandBadges[`/art/brands/${brandId}/badge.svg`] ?? '';
  }

  vehiclesOf(brandId: string): VehicleDef[] {
    return [...this.vehicles.values()].filter((v) => v.brand === brandId);
  }
}

export const art = new ArtRegistry();
