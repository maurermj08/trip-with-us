// Reference IDs for the /dev sandbox.
//   Object ID: what you're looking at        e.g. vehicle/subaru-forester-2019
//   Config ID: object + its settings         e.g. vehicle/subaru-forester-2019?acc=bike-rack&wheel=steelie
// Config IDs only list settings that differ from the defaults, and are also the URL hash,
// so pasting one into /dev (or opening /dev/#<id>) restores that exact setup.

export type FieldValue = string | number | boolean | string[];
export type Cfg = Record<string, FieldValue>;

export interface FieldBase {
  key: string;
  label: string;
  /** Live fields update the running item without rebuilding it. */
  live?: boolean;
}

export type Field =
  | (FieldBase & { type: 'select'; options: [string, string][]; default: string })
  | (FieldBase & { type: 'multi'; options: [string, string][]; default: string[] })
  | (FieldBase & { type: 'range'; min: number; max: number; step: number; default: number })
  | (FieldBase & { type: 'bool'; default: boolean })
  | (FieldBase & { type: 'color'; default: string });

export function defaults(fields: Field[]): Cfg {
  return Object.fromEntries(fields.map((f) => [f.key, Array.isArray(f.default) ? [...f.default] : f.default]));
}

const same = (a: FieldValue, b: FieldValue) =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',') : a === b;

function encodeValue(v: FieldValue): string {
  if (Array.isArray(v)) return [...v].sort().map(encodeURIComponent).join(',');
  return encodeURIComponent(String(v));
}

/** Object ID + non-default settings, in field order. */
export function configId(objectId: string, fields: Field[], cfg: Cfg): string {
  const parts: string[] = [];
  for (const f of fields) {
    const v = cfg[f.key];
    if (v === undefined || same(v, f.default)) continue;
    parts.push(`${f.key}=${Array.isArray(v) && !v.length ? '' : encodeValue(v)}`);
  }
  return parts.length ? `${objectId}?${parts.join('&')}` : objectId;
}

export interface ParsedId {
  objectId: string;
  params: Record<string, string>;
}

export function parseId(id: string): ParsedId {
  const s = id.trim().replace(/^#/, '').replace(/^.*\/dev\/?#/, '');
  const q = s.indexOf('?');
  const objectId = q < 0 ? s : s.slice(0, q);
  const params: Record<string, string> = {};
  if (q >= 0) {
    for (const kv of s.slice(q + 1).split('&')) {
      if (!kv) continue;
      const i = kv.indexOf('=');
      params[i < 0 ? kv : kv.slice(0, i)] = i < 0 ? 'true' : kv.slice(i + 1);
    }
  }
  return { objectId, params };
}

/** Apply parsed params onto defaults, coercing to each field's type. Unknown keys are ignored. */
export function applyParams(fields: Field[], params: Record<string, string>): Cfg {
  const cfg = defaults(fields);
  for (const f of fields) {
    const raw = params[f.key];
    if (raw === undefined) continue;
    switch (f.type) {
      case 'multi':
        cfg[f.key] = raw ? raw.split(',').map(decodeURIComponent).filter((x) => f.options.some(([v]) => v === x)) : [];
        break;
      case 'range': {
        const n = Number(raw);
        if (Number.isFinite(n)) cfg[f.key] = Math.max(f.min, Math.min(f.max, n));
        break;
      }
      case 'bool':
        cfg[f.key] = raw === 'true' || raw === '1';
        break;
      case 'select': {
        const v = decodeURIComponent(raw);
        if (f.options.some(([o]) => o === v)) cfg[f.key] = v;
        break;
      }
      case 'color':
        cfg[f.key] = decodeURIComponent(raw);
        break;
    }
  }
  return cfg;
}
