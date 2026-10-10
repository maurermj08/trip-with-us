// Spec (meters) → layered vehicle SVG that follows the i95 style rules:
// rounded, no outlines, darker lower band, one gloss stripe, a glint per window, no faces.
import type { VehicleDef } from '../../src/vehicle/art/schema';
import type { SpecPoint, VehicleSpec } from './spec';
import { circle, el, ellipse, glintPath, group, path, roundRect, roundedPath, svgDoc, type RP } from './svg';

export const ART = { w: 400, h: 200, originX: 200, groundY: 180, u: 50 } as const;
const X = (x: number) => ART.originX + x * ART.u;
const Y = (y: number) => ART.groundY - y * ART.u;
const L = (m: number) => m * ART.u;

const FIXED = {
  glass: '#28323c',
  window: '#c9e2f2',
  well: '#16181b',
  tire: '#24262a',
  tireWall: '#303338',
  lens: '#fff6d2',
  lensClear: '#eef3f6',
  tail: '#e0413d',
  amber: '#ffa62b',
  anchor: '#ff00ff',
  guide: '#00b7ff',
};

function pts(p: SpecPoint[]): RP[] {
  return p.map(([x, y, r = 0]) => [X(x), Y(y), L(r)]);
}

function bounds(p: SpecPoint[]) {
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function token(def: VehicleDef, slot: keyof VehicleDef['tokens'], shade?: string): string {
  const t = def.tokens[slot];
  if (!t) throw new Error(`${def.id}: token "${slot}" is required by the spec`);
  if (!shade) return t.base;
  const s = t.shades?.[shade];
  if (!s) throw new Error(`${def.id}: token "${slot}.${shade}" is required by the spec`);
  return s;
}

const anchorDot = (id: string, x: number, y: number, r: number) =>
  group(id, [circle(x, y, r, { fill: FIXED.anchor, 'fill-opacity': 0.35 })]);

export function generateVehicleSvg(spec: VehicleSpec, def: VehicleDef): string {
  const paint = token(def, 'paint');
  const paintDark = token(def, 'paint', 'dark');
  const roofColor = spec.roof.slot === 'roof' ? token(def, 'roof') : paint;
  const clad = def.tokens.clad?.base ?? '#2a2d31';
  const trim = def.tokens.trim?.base ?? '#d5dbe1';
  const mirrors = token(def, 'mirrors');
  const archColor = spec.arches.slot === 'clad' ? clad : paintDark;
  const profile = roundedPath(pts(spec.profile));
  const pb = bounds(spec.profile);

  // --- body layer -----------------------------------------------------------
  const body: string[] = [];
  body.push(path(roundedPath(pts(spec.greenhouse)), { fill: FIXED.glass }));
  for (const w of spec.windows) {
    body.push(path(roundedPath(pts(w)), { fill: FIXED.window }));
    const b = bounds(w);
    const gh = L(b.y1 - b.y0) * 0.8;
    const gw = Math.max(4, L(b.x1 - b.x0) * 0.14);
    const gx = X(b.x0 + (b.x1 - b.x0) * 0.3);
    body.push(path(glintPath(gx, Y(b.y1) + L(b.y1 - b.y0) * 0.1, gw, gh), { fill: '#ffffff', 'fill-opacity': 0.55 }));
  }
  body.push(path(profile, { fill: paint }));
  // Bands follow the body shape via a clip path.
  const bands: string[] = [
    roundRect(X(pb.x0) - 5, Y(spec.lowerBand[1]), L(pb.x1 - pb.x0) + 10, L(spec.lowerBand[1] - spec.lowerBand[0]), 4, { fill: paintDark }),
    roundRect(X(pb.x0) + 6, Y(spec.gloss) - 1.5, L(pb.x1 - pb.x0) - 18, 3, 1.5, { fill: '#ffffff', 'fill-opacity': 0.28 }),
  ];
  if (spec.rocker) {
    bands.push(roundRect(X(pb.x0) - 5, Y(spec.rocker[1]), L(pb.x1 - pb.x0) + 10, L(spec.rocker[1] - spec.rocker[0]) + 10, 5, { fill: clad }));
  }
  body.push(el('g', { 'clip-path': 'url(#body-clip)' }, bands));

  // Roof panel (Mini: contrast roof) with a top highlight.
  const rb = bounds(spec.roof.points);
  body.push(path(roundedPath(pts(spec.roof.points)), { fill: roofColor }));
  body.push(roundRect(X(rb.x0) + 6, Y(rb.y1) + 0.8, L(rb.x1 - rb.x0) - 14, 2, 1, { fill: '#ffffff', 'fill-opacity': 0.5 }));

  if (spec.rails) {
    const { from, to, y, slot } = spec.rails;
    const c = slot === 'trim' ? trim : clad;
    body.push(roundRect(X(Math.min(from, to)), Y(y), L(Math.abs(to - from)), 3, 1.5, { fill: c }));
    for (const fx of [from, to]) body.push(roundRect(X(fx) - 2, Y(y) + 2, 4, 4, 1, { fill: c }));
  }

  // Wheel arches and wells (cladding), cut for the 12% oversized wheels.
  for (const w of [spec.wheels.front, spec.wheels.rear]) {
    const cx = X(w.x), cy = Y(w.r);
    const arch = (R: number) => `M${cx - R} ${Y(0.2)} L${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} L${cx + R} ${Y(0.2)}Z`;
    body.push(path(arch(L(spec.arches.r)), { fill: archColor }));
    body.push(path(arch(L(spec.arches.well)), { fill: FIXED.well }));
  }

  for (const [x0, x1, y0, y1] of spec.trimStrips ?? []) {
    body.push(roundRect(X(x0), Y(y1), L(x1 - x0), L(y1 - y0), L(y1 - y0) / 2, { fill: trim }));
  }
  for (const sx of spec.seams) {
    body.push(roundRect(X(sx) - 0.65, Y(spec.seamSpan[1]), 1.3, L(spec.seamSpan[1] - spec.seamSpan[0]), 0.6, { fill: paintDark, 'fill-opacity': 0.7 }));
  }
  for (const hx of spec.handles.x) {
    body.push(roundRect(X(hx), Y(spec.handles.y) - 1.3, L(spec.handles.w), 2.6, 1.3, { fill: trim }));
  }
  if (spec.scuttle) {
    const s = spec.scuttle;
    body.push(roundRect(X(s.x), Y(s.y + s.h), L(s.w), L(s.h), 2.5, { fill: clad }));
    body.push(roundRect(X(s.x) + 1.5, Y(s.y + s.h / 2) - 0.7, L(s.w) - 3, 1.4, 0.7, { fill: trim }));
  }

  // Mirror (cap is its own color slot).
  const m = spec.mirror;
  body.push(roundRect(X(m.x) - 3, Y(m.y) + L(m.ry) * 0.6, 6, 4, 1.5, { fill: clad }));
  body.push(ellipse(X(m.x), Y(m.y), L(m.rx), L(m.ry), { fill: mirrors }));

  // Lights: shapes only, never arranged as a face.
  let head: { x: number; y: number; r: number };
  if (spec.headlight.shape === 'round') {
    const h = spec.headlight;
    body.push(circle(X(h.x), Y(h.y), L(h.r), { fill: trim }));
    body.push(circle(X(h.x) + 0.5, Y(h.y), L(h.r) * 0.76, { fill: FIXED.lens }));
    body.push(circle(X(h.x) - L(h.r) * 0.2, Y(h.y) - L(h.r) * 0.3, L(h.r) * 0.22, { fill: '#ffffff', 'fill-opacity': 0.9 }));
    head = { x: X(h.x), y: Y(h.y), r: L(h.r) * 1.6 };
  } else {
    const hb = bounds(spec.headlight.points);
    body.push(path(roundedPath(pts(spec.headlight.points)), { fill: FIXED.lensClear }));
    body.push(roundRect(X(hb.x0) + L(hb.x1 - hb.x0) * 0.35, Y(hb.y1) + 2, L(hb.x1 - hb.x0) * 0.4, L(hb.y1 - hb.y0) * 0.4, 2, { fill: FIXED.lens }));
    head = { x: X((hb.x0 + hb.x1) / 2), y: Y((hb.y0 + hb.y1) / 2), r: Math.max(L(hb.x1 - hb.x0), L(hb.y1 - hb.y0)) * 0.8 };
  }
  const tb = bounds(spec.taillight.points);
  body.push(path(roundedPath(pts(spec.taillight.points)), { fill: FIXED.tail }));
  body.push(roundRect(X(tb.x0 + (tb.x1 - tb.x0) * 0.25), Y(tb.y1) + 2, 2, L(tb.y1 - tb.y0) * 0.45, 1, { fill: '#ffffff', 'fill-opacity': 0.4 }));
  if (spec.indicator) body.push(roundRect(X(spec.indicator.x) - 2.5, Y(spec.indicator.y) - 1.5, 5, 3, 1.5, { fill: FIXED.amber }));

  // --- helper layers ------------------------------------------------------------
  const wheelLayer = (id: string, w: { x: number; r: number }) =>
    group(id, [
      circle(X(w.x), Y(w.r), L(w.r), { fill: FIXED.tire }),
      circle(X(w.x), Y(w.r), L(w.r) * 0.72, { fill: '#d5dbe1' }),
      circle(X(w.x), Y(w.r), L(w.r) * 0.2, { fill: '#5b636c' }),
    ]);

  const roofTop = spec.rails ? spec.rails.y + 0.06 : rb.y1;
  const roofFrom = spec.rails ? Math.min(spec.rails.from, spec.rails.to) : rb.x0 + 0.2;
  const roofTo = spec.rails ? Math.max(spec.rails.from, spec.rails.to) : rb.x1 - 0.2;
  const crossbars: string[] = [];
  for (const t of [0.18, 0.82]) {
    const cx = X(roofFrom + (roofTo - roofFrom) * t);
    crossbars.push(roundRect(cx - 4, Y(roofTop) - 3.5, 8, 5, 2, { fill: '#1f2124' }));
  }

  const anchors = group('anchors', [
    anchorDot('anchor-head', head.x, head.y, head.r),
    anchorDot('anchor-tail', X((tb.x0 + tb.x1) / 2), Y((tb.y0 + tb.y1) / 2), Math.max(L(tb.x1 - tb.x0), L(tb.y1 - tb.y0)) * 0.7),
    anchorDot('anchor-hazard-front', X(spec.hazards.front[0]), Y(spec.hazards.front[1]), 3),
    anchorDot('anchor-hazard-rear', X(spec.hazards.rear[0]), Y(spec.hazards.rear[1]), 3),
    group('anchor-roof', [roundRect(X(roofFrom), Y(roofTop) - 1, L(roofTo - roofFrom), 2, 1, { fill: FIXED.anchor, 'fill-opacity': 0.35 })]),
    anchorDot('anchor-exhaust', X(spec.exhaust[0]), Y(spec.exhaust[1]), 3),
    anchorDot('anchor-hitch', X(pb.x0) + 2, Y(0.45), 3),
  ]);

  const tokenList = Object.entries(def.tokens)
    .flatMap(([slot, t]) => [`${slot}.base ${t!.base}`, ...Object.entries(t!.shades ?? {}).map(([k, v]) => `${slot}.${k} ${v}`)])
    .join(', ');

  return svgDoc(
    [0, 0, ART.w, ART.h],
    `i95 vehicle art: ${def.id}. Generated from spec.json; edit freely in Illustrator (see art/README.md). Tokens: ${tokenList}`,
    [
      el('defs', {}, [el('clipPath', { id: 'body-clip' }, [path(profile)])]),
      group('guide-ground', [roundRect(0, ART.groundY - 0.5, ART.w, 1, 0, { fill: FIXED.guide, 'fill-opacity': 0.6 })]),
      group('body', body),
      wheelLayer('wheel-rear', spec.wheels.rear),
      wheelLayer('wheel-front', spec.wheels.front),
      group('opt-crossbars', crossbars),
      anchors,
    ],
  );
}
