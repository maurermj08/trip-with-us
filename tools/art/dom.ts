// Node-side DOM for the art tools and tests (the browser uses its own DOMParser).
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { DomImpl } from '../../src/vehicle/art/svgDoc';

export const xmlDom: DomImpl = {
  parse: (text) => {
    const doc = new DOMParser({
      onError: (level, msg) => {
        if (level !== 'warning') throw new Error('SVG parse error: ' + msg);
      },
    }).parseFromString(text, 'image/svg+xml');
    return doc as unknown as Document;
  },
  serialize: (node) => new XMLSerializer().serializeToString(node as never),
};
