// DOM-agnostic SVG helpers. Work with the browser DOM and with @xmldom/xmldom (tests, tools).

export type El = Element;

/** Illustrator writes layer names as ids (escaping some chars) or as data-name. */
export function normalizeId(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.replace(/_x([0-9A-Fa-f]{2})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.trim().toLowerCase();
  // Illustrator de-duplicates with suffixes like body_1_ or body-2.
  s = s.replace(/_\d+_$/, '').replace(/-\d+$/, '');
  s = s.replace(/[\s_]+/g, '-');
  return s;
}

export function layerName(el: El): string {
  return normalizeId(el.getAttribute('data-name') || el.getAttribute('id'));
}

export function elementChildren(el: El | Document): El[] {
  const out: El[] = [];
  const nodes = el.childNodes;
  for (let i = 0; i < nodes.length; i++) if (nodes[i].nodeType === 1) out.push(nodes[i] as El);
  return out;
}

export function tagOf(el: El): string {
  return (el.localName || el.nodeName).toLowerCase().replace(/^svg:/, '');
}

export function rootSvg(doc: Document): El {
  const root = doc.documentElement as El;
  if (!root || tagOf(root) !== 'svg') throw new Error('Not an SVG document');
  return root;
}

/** Depth-first search for a layer by normalized name. */
export function findLayer(root: El, name: string): El | null {
  if (layerName(root) === name) return root;
  for (const c of elementChildren(root)) {
    const f = findLayer(c, name);
    if (f) return f;
  }
  return null;
}

export function allLayerNames(root: El): string[] {
  const out: string[] = [];
  const walk = (el: El) => {
    const n = layerName(el);
    if (n) out.push(n);
    elementChildren(el).forEach(walk);
  };
  walk(root);
  return out;
}

export function walk(root: El, fn: (el: El, ancestors: El[]) => void, ancestors: El[] = []): void {
  fn(root, ancestors);
  const next = [...ancestors, root];
  for (const c of elementChildren(root)) walk(c, fn, next);
}

/** Elements that define resources rather than draw; never hidden. */
const RESOURCE_TAGS = new Set([
  'defs', 'style', 'lineargradient', 'radialgradient', 'clippath', 'mask', 'pattern', 'symbol',
  'title', 'desc', 'metadata', 'filter', 'stop',
]);

export interface VisibilityRule {
  /** Layers to draw (with everything inside them). */
  include: string[];
  /** Layers never drawn, even inside included ones. */
  exclude: (name: string) => boolean;
}

/** Layers the runtime never draws as part of another layer. */
export function isRuntimeHidden(name: string): boolean {
  return (
    name.startsWith('guide-') || name.startsWith('ref-') || name.startsWith('anchor-') ||
    name === 'wheel-front' || name === 'wheel-rear' || name.startsWith('opt-')
  );
}

/**
 * Hide everything except the included layers (in place). Ancestors of included layers stay
 * visible but their other drawable content is hidden. Resources (defs, gradients...) are kept.
 */
export function applyVisibility(root: El, rule: VisibilityRule): void {
  const include = new Set(rule.include);
  const containsIncluded = (el: El): boolean =>
    include.has(layerName(el)) || elementChildren(el).some(containsIncluded);
  const hide = (el: El) => el.setAttribute('display', 'none');

  const visit = (el: El, inIncluded: boolean) => {
    const tag = tagOf(el);
    if (RESOURCE_TAGS.has(tag)) return;
    const name = layerName(el);
    const explicitlyIncluded = include.has(name);
    if (name && !explicitlyIncluded && rule.exclude(name)) {
      hide(el);
      return;
    }
    if (inIncluded || explicitlyIncluded) {
      if (explicitlyIncluded) el.removeAttribute('display');
      elementChildren(el).forEach((c) => visit(c, true));
      return;
    }
    if (tag === 'svg' || containsIncluded(el)) {
      elementChildren(el).forEach((c) => visit(c, false));
      return;
    }
    hide(el);
  };
  visit(root, false);
}

export interface ViewBox { x: number; y: number; w: number; h: number }

export function viewBoxOf(root: El): ViewBox {
  const vb = root.getAttribute('viewBox');
  if (vb) {
    const [x, y, w, h] = vb.trim().split(/[\s,]+/).map(Number);
    return { x, y, w, h };
  }
  const w = parseFloat(root.getAttribute('width') || '400');
  const h = parseFloat(root.getAttribute('height') || '200');
  return { x: 0, y: 0, w, h };
}

/** Make the root render at an explicit pixel size (Safari needs width/height + xmlns). */
export function sizeRoot(root: El, vb: ViewBox, ppu: number): void {
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  root.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  root.setAttribute('width', String(Math.ceil(vb.w * ppu)));
  root.setAttribute('height', String(Math.ceil(vb.h * ppu)));
  root.removeAttribute('style');
}

export interface DomImpl {
  parse(text: string): Document;
  serialize(node: Node): string;
}

/** Browser implementation (falls back to throwing in Node; tools/tests pass xmldom). */
export const browserDom: DomImpl = {
  parse: (text) => {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const err = doc.getElementsByTagName('parsererror')[0];
    if (err) throw new Error('SVG parse error: ' + err.textContent);
    return doc;
  },
  serialize: (node) => new XMLSerializer().serializeToString(node),
};
