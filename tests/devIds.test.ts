import { describe, expect, it } from 'vitest';
import { applyParams, configId, defaults, parseId, type Field } from '../src/dev/ids';

const fields: Field[] = [
  { key: 'paint', label: 'Paint', type: 'select', options: [['a', 'A'], ['b', 'B']], default: 'a' },
  { key: 'acc', label: 'Acc', type: 'multi', options: [['roof-box', 'Box'], ['bike-rack', 'Bike']], default: [] },
  { key: 'wet', label: 'Wet', type: 'range', min: 0, max: 1, step: 0.1, default: 0, live: true },
  { key: 'true', label: 'True', type: 'bool', default: false },
];

describe('dev ids', () => {
  it('object id alone when everything is default', () => {
    expect(configId('vehicle/x', fields, defaults(fields))).toBe('vehicle/x');
  });

  it('config id lists only changed settings, sorted multi values', () => {
    const cfg = { ...defaults(fields), acc: ['roof-box', 'bike-rack'], wet: 0.5 };
    expect(configId('vehicle/x', fields, cfg)).toBe('vehicle/x?acc=bike-rack,roof-box&wet=0.5');
  });

  it('round-trips through parse + apply, ignoring junk', () => {
    const id = 'vehicle/x?acc=bike-rack,nope&wet=7&true=1&zzz=3&paint=b';
    const p = parseId('https://example.com/trip/dev/#' + id);
    expect(p.objectId).toBe('vehicle/x');
    const cfg = applyParams(fields, p.params);
    expect(cfg).toEqual({ paint: 'b', acc: ['bike-rack'], wet: 1, true: true });
    expect(parseId('#vehicle/x').objectId).toBe('vehicle/x');
  });
});
