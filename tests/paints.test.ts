import { describe, expect, it } from 'vitest';
import { SHARED_PAINTS, art, withSharedPaints } from '../src/vehicle/art/registry';

describe('shared paints', () => {
  it('every vehicle offers its factory color first plus silver, white, black and the paint-can colors', () => {
    for (const v of art.vehicles.values()) {
      expect(v.paints.length).toBeGreaterThan(5);
      const ids = v.paints.map((p) => p.id);
      for (const want of ['white', 'black', 'red', 'yellow', 'blue', 'green', 'purple', 'pink']) expect(ids, v.id).toContain(want);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(art.vehicle('mini-countryman-2019').paints[0].id).toBe('island-blue');
  });

  it('skips a shared color that looks the same as a factory color', () => {
    const def = withSharedPaints({ ...art.vehicle('mini-countryman-2019'), paints: [{ id: 'x', name: 'X', swatch: '#c3c8cf', slots: {} }] }, SHARED_PAINTS);
    expect(def.paints.map((p) => p.id)).not.toContain('silver');
  });
});
