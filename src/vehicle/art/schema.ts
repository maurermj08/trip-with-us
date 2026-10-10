// Data formats for the vehicle art pipeline. See art/README.md for the owner-facing guide.

/** Recolorable color slots. Art uses each slot's token hexes; recolor swaps them. */
export type SlotId = 'paint' | 'roof' | 'mirrors' | 'rims' | 'trim' | 'clad';
export const SLOT_IDS: SlotId[] = ['paint', 'roof', 'mirrors', 'rims', 'trim', 'clad'];

/** A slot's token colors as authored in the SVG: a base plus named shades of it. */
export interface SlotTokens {
  base: string;
  shades?: Record<string, string>;
}

export type Tokens = Partial<Record<SlotId, SlotTokens>>;
/** New base colors per slot (shades are derived). */
export type SlotColors = Partial<Record<SlotId, string>>;

export interface Paint {
  id: string;
  /** Human name, shown only in the Lab / garage captions. */
  name: string;
  /** Chip color in the garage. */
  swatch: string;
  /** New base colors (usually just `paint`). Empty = the art as authored. */
  slots: SlotColors;
}

export type VehicleKind = 'car' | 'suv' | 'minivan' | 'taxi' | 'truck' | 'fun';

/** art/vehicles/<id>/vehicle.json */
export interface VehicleDef {
  id: string;
  brand: string;
  model: string;
  year: number;
  kind: VehicleKind;
  /** Extra in-game scale for vehicles far from car size (bonus vehicles). Default 1. */
  gameScale?: number;
  /** "hand" locks art.svg against the generator forever. */
  art?: 'generated' | 'hand';
  tokens: Tokens;
  /** [0] is the default. */
  paints: Paint[];
  wheels: { default: string; options: string[] };
  accessories: string[];
  /** Flavor only: never affects physics. */
  sound?: { hornPitch?: number; engineBase?: number };
}

/** art/wheels/wheels.json entries. */
export interface WheelDef {
  id: string;
  name: string;
  tokens: Tokens;
}

export type AccessoryMount = 'roof' | 'hitch' | 'none';

/** art/accessories/accessories.json entries. */
export interface AccessoryDef {
  id: string;
  name: string;
  mount: AccessoryMount;
  /** Art units the roof cargo point rises (e.g. a roof box). */
  stackHeight?: number;
  /** Vehicle layers (opt-*) this accessory switches on. */
  showLayers?: string[];
  /** Slot color overrides (e.g. a black pack). */
  slots?: SlotColors;
  /** Accessory ids that can't be combined with this one. */
  excludes?: string[];
  /** Mount offset in art units. */
  offset?: [number, number];
}

/** art/brands/<id>/brand.json */
export interface BrandDef {
  id: string;
  /** Garage caption only. */
  name: string;
  /** Chip accent color. */
  color: string;
}

/** What the child picked. Held in memory only (no saves). */
export interface VehicleChoice {
  vehicleId: string;
  paintId: string;
  wheelId: string;
  accessoryIds: string[];
}

export interface Pt { x: number; y: number }
export interface Circle { x: number; y: number; r: number }

/**
 * Vehicle measurements in WORLD units relative to the car origin (ground, between the bumpers),
 * y up-negative like the world. Already include the style squash, wheel oversize and gameScale.
 */
export interface VehicleDims {
  half: number;
  length: number;
  height: number;
  wheels: Circle[];
  roof: Pt & { len: number };
  exhaust: Pt;
  head: Circle;
  tail: Circle;
  hazards: Pt[];
  hitch: Pt;
}

/** Style rules applied at runtime (i95.md): squash bodies, oversize wheels. */
export const STYLE = {
  squashX: 0.96,
  squashY: 1.07,
  wheelScale: 1.12,
  /** Art units per meter. 1 art unit = 1 world unit (before squash). */
  unitsPerMeter: 50,
} as const;

export const REQUIRED_LAYERS = [
  'guide-ground',
  'body',
  'wheel-front',
  'wheel-rear',
  'anchor-head',
  'anchor-tail',
  'anchor-hazard-front',
  'anchor-hazard-rear',
  'anchor-roof',
  'anchor-exhaust',
] as const;

export function defaultChoice(def: VehicleDef): VehicleChoice {
  return { vehicleId: def.id, paintId: def.paints[0].id, wheelId: def.wheels.default, accessoryIds: [] };
}
