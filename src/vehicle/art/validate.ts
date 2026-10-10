// Checks a vehicle/wheel/accessory SVG against the art conventions (art/README.md).
// Pure: used by tests, the `npm run art:check` CLI and the Vehicle Lab.
import { deltaE } from './color';
import { bboxOf } from './geometry';
import { measureArt, toDims } from './measure';
import { colorsIn, tokenHexes } from './recolor';
import { allLayerNames, findLayer, rootSvg, tagOf, walk, type DomImpl } from './svgDoc';
import { REQUIRED_LAYERS, type Tokens, type VehicleDef } from './schema';

export interface Report {
  errors: string[];
  warnings: string[];
}

/** In-game size band so no vehicle is much bigger/smaller than the others (pillar 3). */
export const SIZE_BAND = { length: [180, 260], height: [70, 115] } as const;

/** OKLab distance under which a non-token color was probably meant to be the token. */
const NEAR_MISS = 0.012;

const FORBIDDEN = new Set(['image', 'text', 'foreignobject', 'script']);

function common(svg: string, doc: Document, tokens: Tokens, r: Report): void {
  const root = rootSvg(doc);
  walk(root, (el, anc) => {
    const tag = tagOf(el);
    if (FORBIDDEN.has(tag)) r.errors.push(`<${tag}> is not allowed (outline text, embed no images)`);
    const stroke = el.getAttribute('stroke') || /stroke\s*:\s*(?!none)/.exec(el.getAttribute('style') || '')?.[0];
    const helper = [el, ...anc].some((a) => /^(guide|ref|anchor)-/.test((a.getAttribute('data-name') || a.getAttribute('id') || '').toLowerCase()));
    if (stroke && stroke !== 'none' && !helper) r.warnings.push(`stroke on <${tag}${el.getAttribute('id') ? ' #' + el.getAttribute('id') : ''}> (style rule: no outlines)`);
  });
  const toks = tokenHexes(tokens);
  const used = colorsIn(svg);
  for (const [hex, name] of toks) if (!used.has(hex)) r.warnings.push(`token ${name} ${hex} is not used in the art`);
  for (const c of used) {
    // White/black are the conventional shading colors (glints, gloss, shade): never tokens.
    if (toks.has(c) || c === '#ffffff' || c === '#000000') continue;
    for (const [hex, name] of toks) {
      const d = deltaE(c, hex);
      if (d > 0 && d < NEAR_MISS) r.warnings.push(`${c} is very close to token ${name} ${hex}: use the exact token so recolor works`);
    }
  }
}

export function validateVehicle(svg: string, def: VehicleDef, dom: DomImpl): Report {
  const r: Report = { errors: [], warnings: [] };
  let doc: Document;
  try {
    doc = dom.parse(svg);
  } catch (e) {
    r.errors.push(String(e));
    return r;
  }
  const root = rootSvg(doc);
  const names = new Set(allLayerNames(root));
  for (const l of REQUIRED_LAYERS) if (!names.has(l)) r.errors.push(`missing layer "${l}"`);
  common(svg, doc, def.tokens, r);
  if (r.errors.length) return r;

  const m = measureArt(doc);
  for (const [i, w] of m.wheels.entries()) {
    const gap = Math.abs(w.y + w.r);
    if (gap > 1) r.errors.push(`wheel ${i ? 'rear' : 'front'} bottom is ${gap.toFixed(1)} units off the ground line`);
  }
  if (m.wheels[0].x < m.wheels[1].x) r.errors.push('wheel-front must be to the right of wheel-rear (cars face right)');
  if (m.head.x < 0) r.warnings.push('anchor-head is behind the middle of the car (cars face right)');
  const dims = toDims(m, def.gameScale ?? 1);
  if (dims.length < SIZE_BAND.length[0] || dims.length > SIZE_BAND.length[1]) {
    r.errors.push(`in-game length ${dims.length.toFixed(0)} outside ${SIZE_BAND.length.join('-')} (use gameScale)`);
  }
  if (dims.height < SIZE_BAND.height[0] || dims.height > SIZE_BAND.height[1]) {
    r.errors.push(`in-game height ${dims.height.toFixed(0)} outside ${SIZE_BAND.height.join('-')} (use gameScale)`);
  }
  for (const opt of [...names].filter((n) => n.startsWith('opt-'))) {
    const b = bboxOf(findLayer(root, opt)!);
    if (b.empty) r.warnings.push(`layer ${opt} is empty`);
  }
  return r;
}

/** Wheels: 100x100 viewBox, centered, tire radius 50. */
export function validateWheel(svg: string, tokens: Tokens, dom: DomImpl): Report {
  const r: Report = { errors: [], warnings: [] };
  let doc: Document;
  try {
    doc = dom.parse(svg);
  } catch (e) {
    r.errors.push(String(e));
    return r;
  }
  common(svg, doc, tokens, r);
  const b = bboxOf(rootSvg(doc));
  if (Math.abs(b.cx - 50) > 1.5 || Math.abs(b.cy - 50) > 1.5) r.errors.push(`wheel must be centered at 50,50 (is ${b.cx.toFixed(1)},${b.cy.toFixed(1)})`);
  if (Math.abs(b.w - 100) > 2) r.errors.push(`wheel tire diameter must be 100 (is ${b.w.toFixed(1)})`);
  return r;
}

/** Accessories: anything, plus a guide-mount whose bottom center is the mount point. */
export function validateAccessory(svg: string, dom: DomImpl): Report {
  const r: Report = { errors: [], warnings: [] };
  let doc: Document;
  try {
    doc = dom.parse(svg);
  } catch (e) {
    r.errors.push(String(e));
    return r;
  }
  common(svg, doc, {}, r);
  if (!findLayer(rootSvg(doc), 'guide-mount')) r.errors.push('missing layer "guide-mount"');
  return r;
}
