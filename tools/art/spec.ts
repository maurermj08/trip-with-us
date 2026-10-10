// art/vehicles/<id>/spec.json: generator input. All values in METERS, car facing right,
// origin on the ground midway between the bumpers, y up. Read values off a side-profile
// photo scaled by reference.json (see art/README.md "Adding a car").

/** [x, y, cornerRadius] */
export type SpecPoint = [number, number, number?];

export interface VehicleSpec {
  /** Body shell silhouette below the glass: bumpers, hood, beltline. Clockwise or not. */
  profile: SpecPoint[];
  /** Dark glass area including pillars (drawn behind the body shell). */
  greenhouse: SpecPoint[];
  /** Light window panes, each gets a glint. */
  windows: SpecPoint[][];
  /** Roof panel; color slot (e.g. "roof" for the Mini's white roof, "paint" otherwise). */
  roof: { points: SpecPoint[]; slot: 'roof' | 'paint' };
  wheels: { front: { x: number; r: number }; rear: { x: number; r: number } };
  /** Cladding/arch style. */
  arches: { r: number; well: number; slot: 'clad' | 'paint' };
  /** Lower cladding strip [y0, y1] following the body shape. */
  rocker?: [number, number];
  /** Darker lower paint band [y0, y1]. */
  lowerBand: [number, number];
  /** Gloss stripe height. */
  gloss: number;
  rails?: { from: number; to: number; y: number; slot: 'trim' | 'clad' };
  mirror: { x: number; y: number; rx: number; ry: number };
  headlight: { shape: 'round'; x: number; y: number; r: number } | { shape: 'poly'; points: SpecPoint[] };
  taillight: { points: SpecPoint[] };
  indicator?: { x: number; y: number };
  /** Bright trim strips, e.g. a lower skid strip: [x0, x1, y0, y1]. */
  trimStrips?: [number, number, number, number][];
  seams: number[];
  /** Door seam vertical span [y0, y1]. */
  seamSpan: [number, number];
  handles: { x: number[]; y: number; w: number };
  scuttle?: { x: number; y: number; w: number; h: number };
  hazards: { front: [number, number]; rear: [number, number] };
  exhaust: [number, number];
}
