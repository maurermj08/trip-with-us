// Load the whole art/ folder from disk (tools and tests).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AccessoryDef, BrandDef, VehicleDef, WheelDef } from '../../src/vehicle/art/schema';
import { validateAccessory, validateVehicle, validateWheel, type Report } from '../../src/vehicle/art/validate';
import { xmlDom } from './dom';
import { ART_DIR } from './protect';

export interface ArtLibraryFs {
  vehicles: { def: VehicleDef; svg: string }[];
  wheels: { def: WheelDef; svg: string }[];
  accessories: { def: AccessoryDef; svg: string | null }[];
  brands: { def: BrandDef; badge: string }[];
}

const json = <T>(p: string) => JSON.parse(readFileSync(p, 'utf8')) as T;
const dirs = (p: string) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

export function loadArtLibrary(): ArtLibraryFs {
  const vehicles = dirs(resolve(ART_DIR, 'vehicles')).map((id) => {
    const d = resolve(ART_DIR, 'vehicles', id);
    return { def: json<VehicleDef>(resolve(d, 'vehicle.json')), svg: readFileSync(resolve(d, 'art.svg'), 'utf8') };
  });
  const wheels = json<WheelDef[]>(resolve(ART_DIR, 'wheels', 'wheels.json')).map((def) => ({
    def,
    svg: readFileSync(resolve(ART_DIR, 'wheels', `${def.id}.svg`), 'utf8'),
  }));
  const accessories = json<AccessoryDef[]>(resolve(ART_DIR, 'accessories', 'accessories.json')).map((def) => {
    const f = resolve(ART_DIR, 'accessories', `${def.id}.svg`);
    return { def, svg: existsSync(f) ? readFileSync(f, 'utf8') : null };
  });
  const brands = dirs(resolve(ART_DIR, 'brands')).map((id) => {
    const d = resolve(ART_DIR, 'brands', id);
    return { def: json<BrandDef>(resolve(d, 'brand.json')), badge: readFileSync(resolve(d, 'badge.svg'), 'utf8') };
  });
  return { vehicles, wheels, accessories, brands };
}

export function validateLibrary(lib: ArtLibraryFs): { name: string; report: Report }[] {
  const out: { name: string; report: Report }[] = [];
  const wheelIds = new Set(lib.wheels.map((w) => w.def.id));
  const accIds = new Set(lib.accessories.map((a) => a.def.id));
  const brandIds = new Set(lib.brands.map((b) => b.def.id));
  for (const v of lib.vehicles) {
    const r = validateVehicle(v.svg, v.def, xmlDom);
    if (!brandIds.has(v.def.brand)) r.errors.push(`unknown brand "${v.def.brand}"`);
    for (const w of [v.def.wheels.default, ...v.def.wheels.options]) if (!wheelIds.has(w)) r.errors.push(`unknown wheel "${w}"`);
    for (const a of v.def.accessories) if (!accIds.has(a)) r.errors.push(`unknown accessory "${a}"`);
    if (!v.def.paints.length) r.errors.push('needs at least one paint');
    out.push({ name: `vehicles/${v.def.id}`, report: r });
  }
  for (const w of lib.wheels) out.push({ name: `wheels/${w.def.id}`, report: validateWheel(w.svg, w.def.tokens, xmlDom) });
  for (const a of lib.accessories) {
    if (a.svg) out.push({ name: `accessories/${a.def.id}`, report: validateAccessory(a.svg, xmlDom) });
  }
  for (const b of lib.brands) {
    const r: Report = { errors: [], warnings: [] };
    if (/<text|<image/i.test(b.badge)) r.errors.push('badges must be shapes only (no text or images)');
    out.push({ name: `brands/${b.def.id}`, report: r });
  }
  return out;
}
