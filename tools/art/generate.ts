// npm run art:gen -- <vehicle-id ...> | --all | --library   [--force]
// Writes art/vehicles/<id>/art.svg from spec.json, and the wheel/accessory library.
// Hand-edited files are protected (see protect.ts).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { VehicleDef } from '../../src/vehicle/art/schema';
import type { VehicleSpec } from './spec';
import { generateVehicleSvg } from './vehicleSvg';
import { ACCESSORIES, WHEELS } from './library';
import { ART_DIR, writeProtected, type WriteResult } from './protect';

const args = process.argv.slice(2);
const force = args.includes('--force');
const all = args.includes('--all');
const library = args.includes('--library') || all;
let ids = args.filter((a) => !a.startsWith('--'));
const vehiclesDir = resolve(ART_DIR, 'vehicles');
if (all) ids = readdirSync(vehiclesDir).filter((d) => existsSync(resolve(vehiclesDir, d, 'spec.json')));

const report = (file: string, r: WriteResult) => {
  const rel = file.replace(ART_DIR + '/', 'art/');
  const msg = {
    written: 'written',
    unchanged: 'unchanged',
    protected: `PROTECTED (hand-edited): wrote ${rel.replace(/\.svg$/, '.generated.svg')} instead; use --force to overwrite`,
  }[r];
  console.log(`${rel}: ${msg}`);
};

for (const id of ids) {
  const dir = resolve(vehiclesDir, id);
  const def = JSON.parse(readFileSync(resolve(dir, 'vehicle.json'), 'utf8')) as VehicleDef;
  const spec = JSON.parse(readFileSync(resolve(dir, 'spec.json'), 'utf8')) as VehicleSpec;
  const file = resolve(dir, 'art.svg');
  report(file, writeProtected(file, generateVehicleSvg(spec, def), { force, locked: def.art === 'hand' }));
}

if (library) {
  for (const w of WHEELS) {
    const file = resolve(ART_DIR, 'wheels', `${w.def.id}.svg`);
    report(file, writeProtected(file, w.svg(), { force }));
  }
  writeFileSync(resolve(ART_DIR, 'wheels', 'wheels.json'), JSON.stringify(WHEELS.map((w) => w.def), null, 2) + '\n');
  for (const a of ACCESSORIES) {
    if (!a.svg) continue;
    const file = resolve(ART_DIR, 'accessories', `${a.def.id}.svg`);
    report(file, writeProtected(file, a.svg(), { force }));
  }
  writeFileSync(resolve(ART_DIR, 'accessories', 'accessories.json'), JSON.stringify(ACCESSORIES.map((a) => a.def), null, 2) + '\n');
}

if (!ids.length && !library) console.log('usage: npm run art:gen -- <vehicle-id ...> | --all | --library [--force]');
