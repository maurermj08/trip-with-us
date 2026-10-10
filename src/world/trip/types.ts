// Pure data types for the trip (no Pixi). World units: x grows toward the destination.

export type CityId = 'charleston' | 'savannah' | 'jacksonville' | 'orlando';
export type StateId = 'SC' | 'GA' | 'FL';
export type BridgeId = 'ravenel' | 'talmadge' | 'main-street' | 'i4-flyover';
export type BridgeKind = 'cable-stayed' | 'lift' | 'flyover';

export interface BridgeSpec {
  id: BridgeId;
  kind: BridgeKind;
  /** Arch profile: cosine up over `rise`, flat at `top`, cosine down over `fall`. */
  start: number;
  rise: number;
  top: number;
  fall: number;
  end: number;
  /** What's under the deck. */
  under: 'water' | 'ground';
  /** Where water (or the open gap) is drawn under the deck. */
  span: [number, number];
  pierStep: number;
}

export interface CitySpec {
  id: CityId;
  name: string;
  state: StateId;
  /** The city street starts here (= its bridge's end). */
  x0: number;
  len: number;
  bridge: BridgeId;
  /** Only the last city: the family greeting happens here. */
  final?: true;
}

export type ZoneKind = 'home' | 'stop' | 'bridge' | 'city' | 'airport';
export type Surface = 'sidewalk' | 'lot' | 'cobble' | 'riverwalk' | 'pavers';

export interface ZoneSpec {
  id: string;
  kind: ZoneKind;
  a: number;
  b: number;
  /** Open road: no median barrier or highway poles. */
  open: boolean;
  surface?: Surface;
}

export type AirportSize = 'small' | 'large';
export interface AirportSpec {
  id: 'regional' | 'international';
  size: AirportSize;
  x0: number;
  len: number;
}

export interface SkyKey {
  x: number;
  morning: number;
  gold: number;
}
