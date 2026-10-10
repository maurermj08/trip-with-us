import { describe, expect, it } from 'vitest';
import { GarageModel, type Catalog } from '../src/garage/GarageModel';
import type { AccessoryDef, VehicleDef } from '../src/vehicle/art/schema';

const v = (id: string, brand: string, extra: Partial<VehicleDef> = {}): VehicleDef => ({
  id, brand, model: id, year: 2019, kind: 'suv', tokens: {},
  paints: [{ id: 'p1', name: 'P1', swatch: '#111111', slots: {} }],
  wheels: { default: 'w1', options: ['w1', 'w2'] },
  accessories: ['box', 'bikes', 'pack'],
  ...extra,
});

const accs: AccessoryDef[] = [
  { id: 'box', name: 'Box', mount: 'roof' },
  { id: 'skis', name: 'Skis', mount: 'roof' },
  { id: 'bikes', name: 'Bikes', mount: 'hitch' },
  { id: 'pack', name: 'Pack', mount: 'none', excludes: [] },
];

const vehicles = [
  v('mini', 'mini'),
  v('forester', 'subaru', { paints: [{ id: 'silver', name: 'S', swatch: '#ccc', slots: {} }, { id: 'red', name: 'R', swatch: '#c00', slots: {} }], accessories: ['box', 'skis'] }),
  v('outback', 'subaru'),
];

const cat: Catalog = {
  brands: [{ id: 'mini', name: 'MINI', color: '#000' }, { id: 'subaru', name: 'Subaru', color: '#00f' }, { id: 'empty', name: 'Empty', color: '#fff' }],
  vehiclesOf: (b) => vehicles.filter((x) => x.brand === b),
  vehicle: (id) => vehicles.find((x) => x.id === id)!,
  accessory: (id) => accs.find((a) => a.id === id),
  wheelName: (id) => id,
};

const start = () => new GarageModel(cat, { vehicleId: 'mini', paintId: 'p1', wheelId: 'w1', accessoryIds: [] });

describe('GarageModel', () => {
  it('starts at brands and hides brands without vehicles', () => {
    const m = start();
    expect(m.chips().map((c) => c.id)).toEqual(['mini', 'subaru']);
    expect(m.chips().find((c) => c.id === 'mini')!.selected).toBe(true);
  });

  it('brand → models previews the first model; model → customize', () => {
    const m = start();
    const ch = m.select(m.chips().find((c) => c.id === 'subaru')!);
    expect(ch).toEqual({ vehicle: true, look: false, level: true });
    expect(m.level).toBe('models');
    expect(m.choice.vehicleId).toBe('forester');
    expect(m.chips().map((c) => c.kind)).toEqual(['crumb-brand', 'model', 'model']);
    m.select(m.chips().find((c) => c.id === 'outback')!);
    expect(m.level).toBe('custom');
    expect(m.choice.vehicleId).toBe('outback');
  });

  it('crumbs go back up a level', () => {
    const m = start();
    m.select(m.chips().find((c) => c.id === 'mini')!);
    m.select(m.chips().find((c) => c.kind === 'model')!);
    expect(m.chips()[0].kind).toBe('crumb-brand');
    expect(m.chips()[1].kind).toBe('crumb-model');
    m.select(m.chips()[1]);
    expect(m.level).toBe('models');
    m.select(m.chips()[0]);
    expect(m.level).toBe('brands');
  });

  it('customize shows paint only when there is a choice', () => {
    const m = start();
    m.level = 'custom';
    expect(m.chips().some((c) => c.kind === 'paint')).toBe(false);
    m.choice = { vehicleId: 'forester', paintId: 'silver', wheelId: 'w1', accessoryIds: [] };
    const paints = m.chips().filter((c) => c.kind === 'paint');
    expect(paints).toHaveLength(2);
    expect(m.select(paints[1]).look).toBe(true);
    expect(m.choice.paintId).toBe('red');
  });

  it('accessories toggle, one per mount, and carry over when supported', () => {
    const m = start();
    m.level = 'custom';
    const acc = (id: string) => m.chips().find((c) => c.kind === 'accessory' && c.id === id)!;
    m.select(acc('box'));
    m.select(acc('bikes'));
    m.select(acc('pack'));
    expect(m.choice.accessoryIds.sort()).toEqual(['bikes', 'box', 'pack']);
    m.select(acc('pack'));
    expect(m.choice.accessoryIds.sort()).toEqual(['bikes', 'box']);
    // Switching model keeps only what the new one supports.
    m.level = 'models';
    m.choice.vehicleId = 'mini';
    m.select({ key: 'b', kind: 'brand', id: 'subaru', caption: '', selected: false });
    expect(m.choice.vehicleId).toBe('forester');
    expect(m.choice.accessoryIds).toEqual(['box']);
    m.level = 'custom';
    m.select(acc('skis'));
    expect(m.choice.accessoryIds).toEqual(['skis']);
  });

  it('a picked color carries over to other models that offer it', () => {
    const m = start();
    m.level = 'custom';
    // forester offers silver/red; mini only p1
    m.choice = { vehicleId: 'forester', paintId: 'silver', wheelId: 'w1', accessoryIds: [] };
    expect(m.setPaint('red')).toBe(true);
    expect(m.setPaint('nope')).toBe(false);
    m.select({ key: 'm', kind: 'model', id: 'outback', caption: '', selected: false });
    expect(m.choice.paintId).toBe('p1'); // outback has no red: factory color
    m.setPaint('p1');
    m.select({ key: 'm', kind: 'model', id: 'forester', caption: '', selected: false });
    expect(m.choice.paintId).toBe('silver'); // forester has no p1: factory color
    m.setPaint('red');
    m.select({ key: 'm', kind: 'model', id: 'outback', caption: '', selected: false });
    m.select({ key: 'm', kind: 'model', id: 'forester', caption: '', selected: false });
    expect(m.choice.paintId).toBe('silver'); // the last pick (p1, via outback's default) isn't on forester
  });

  it('keeps the chosen color when the next model offers it', () => {
    const m = start();
    m.choice = { vehicleId: 'forester', paintId: 'silver', wheelId: 'w1', accessoryIds: [] };
    expect(m.setPaint('red')).toBe(true);
    // a second subaru that also offers red
    const cat2: Catalog = { ...cat, vehiclesOf: (b) => [...cat.vehiclesOf(b), v('crosstrek', 'subaru', { paints: [{ id: 'red', name: 'R', swatch: '#c00', slots: {} }, { id: 'blue', name: 'B', swatch: '#00c', slots: {} }] })], vehicle: (id) => (id === 'crosstrek' ? cat2.vehiclesOf('subaru').find((x) => x.id === id)! : cat.vehicle(id)) };
    const m2 = new GarageModel(cat2, m.choice);
    m2.setPaint('red');
    m2.select({ key: 'm', kind: 'model', id: 'crosstrek', caption: '', selected: false });
    expect(m2.choice.paintId).toBe('red');
  });
});
