// Named parts of an art file: every named group becomes a path like "body/mirror".
// Used by the /dev sandbox (Parts list, highlight, part reference IDs) and the validator.
import { elementChildren, layerName, rootSvg, tagOf, type El } from './svgDoc';

export interface PartInfo {
  /** Slash path of named groups, e.g. "body/window-front". */
  path: string;
  /** Last segment: the layer name (unique within a file). */
  name: string;
  depth: number;
}

const SKIP = new Set(['defs', 'clippath', 'mask', 'style', 'lineargradient', 'radialgradient', 'pattern', 'symbol']);

export function listParts(doc: Document): PartInfo[] {
  const out: PartInfo[] = [];
  const walk = (el: El, prefix: string[]) => {
    for (const c of elementChildren(el)) {
      if (SKIP.has(tagOf(c))) continue;
      const name = tagOf(c) === 'g' ? layerName(c) : '';
      if (name) {
        const path = [...prefix, name];
        out.push({ path: path.join('/'), name, depth: prefix.length });
        walk(c, path);
      } else {
        walk(c, prefix);
      }
    }
  };
  walk(rootSvg(doc), []);
  return out;
}

/** Part names that appear more than once (they can't be told apart by name). */
export function duplicatePartNames(parts: PartInfo[]): string[] {
  const seen = new Map<string, number>();
  for (const p of parts) seen.set(p.name, (seen.get(p.name) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([name]) => name);
}
