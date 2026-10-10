// Read the vehicle's anchors and size from its SVG geometry (no rendering needed).
import { bboxOf, circleOf } from './geometry';
import { findLayer, isRuntimeHidden, layerName, rootSvg, viewBoxOf, type ViewBox } from './svgDoc';
import { STYLE, type Circle, type Pt, type VehicleDims } from './schema';

/** Art-space measurements relative to the car origin (ground, midway between bumpers). y is down. */
export interface ArtMeasure {
  vb: ViewBox;
  /** Origin in raw SVG user units. */
  origin: Pt;
  body: { x0: number; x1: number; top: number };
  wheels: Circle[];
  head: Circle;
  tail: Circle;
  hazards: Pt[];
  roof: Pt & { len: number };
  exhaust: Pt;
  hitch: Pt | null;
}

export function measureArt(doc: Document): ArtMeasure {
  const root = rootSvg(doc);
  const vb = viewBoxOf(root);
  const need = (name: string) => {
    const el = findLayer(root, name);
    if (!el) throw new Error(`Missing layer "${name}"`);
    return el;
  };
  const ground = bboxOf(need('guide-ground'));
  const groundY = ground.cy;
  // Hidden/helper layers nested inside body don't count toward its size.
  const bodyBox = bboxOf(need('body'), (c) => isRuntimeHidden(layerName(c)));
  const ox = bodyBox.cx;
  const rel = (c: { x: number; y: number; r: number }): Circle => ({ x: c.x - ox, y: c.y - groundY, r: c.r });
  const wf = rel(circleOf(need('wheel-front')));
  const wr = rel(circleOf(need('wheel-rear')));
  const roofEl = bboxOf(need('anchor-roof'));
  const hitchEl = findLayer(root, 'anchor-hitch');
  const hitch = hitchEl ? rel(circleOf(hitchEl)) : null;
  return {
    vb,
    origin: { x: ox, y: groundY },
    body: { x0: bodyBox.x0 - ox, x1: bodyBox.x1 - ox, top: bodyBox.y0 - groundY },
    wheels: [wf, wr],
    head: rel(circleOf(need('anchor-head'))),
    tail: rel(circleOf(need('anchor-tail'))),
    hazards: [rel(circleOf(need('anchor-hazard-front'))), rel(circleOf(need('anchor-hazard-rear')))],
    roof: { x: roofEl.cx - ox, y: roofEl.cy - groundY, len: Math.max(roofEl.w, 40) },
    exhaust: rel(circleOf(need('anchor-exhaust'))),
    hitch,
  };
}

/** Convert art measurements to world-unit dims with the style squash and game scale. */
export function toDims(m: ArtMeasure, gameScale = 1, roofLift = 0): VehicleDims {
  const sx = STYLE.squashX * gameScale, sy = STYLE.squashY * gameScale;
  const pt = (p: Pt): Pt => ({ x: p.x * sx, y: p.y * sy });
  const circ = (c: Circle): Circle => ({ x: c.x * sx, y: c.y * sy, r: c.r * gameScale });
  const length = (m.body.x1 - m.body.x0) * sx;
  return {
    half: length / 2,
    length,
    height: -m.body.top * sy,
    wheels: m.wheels.map((w) => {
      const r = w.r * STYLE.wheelScale * gameScale;
      return { x: w.x * sx, y: -r, r };
    }),
    roof: { ...pt({ x: m.roof.x, y: m.roof.y - roofLift }), len: m.roof.len * sx },
    exhaust: pt(m.exhaust),
    head: circ(m.head),
    tail: circ(m.tail),
    hazards: m.hazards.map(pt),
    hitch: pt(m.hitch ?? { x: m.body.x0 + 4, y: m.exhaust.y - 10 }),
  };
}
