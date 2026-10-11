// Pure data types for the trip (no Pixi). World units: x grows toward the destination.

export type CityId = 'new-york' | 'washington' | 'richmond' | 'charleston' | 'savannah' | 'jacksonville' | 'orlando' | 'potato-world';
export type StateId = 'NY' | 'NJ' | 'MD' | 'DC' | 'VA' | 'NC' | 'SC' | 'GA' | 'FL';
export type BridgeId = 'gwb' | 'memorial' | 'james-river' | 'ravenel' | 'talmadge' | 'main-street' | 'i4-flyover';
export type BridgeKind = 'suspension' | 'stone-arch' | 'girder' | 'cable-stayed' | 'lift' | 'flyover';

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
  /** The bridge that leads into the city (Potato World has none). */
  bridge?: BridgeId;
  /** Only the last city: the family greeting happens here. */
  final?: true;
}

export type ZoneKind = 'home' | 'stop' | 'bridge' | 'city' | 'airport';
export type Surface = 'sidewalk' | 'lot' | 'cobble' | 'riverwalk' | 'pavers' | 'parade' | 'avenue' | 'mall' | 'brick';

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
