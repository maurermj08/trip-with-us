import { describe, expect, it } from 'vitest';
import { normalizeId, findLayer, rootSvg, applyVisibility, isRuntimeHidden, layerName } from '../src/vehicle/art/svgDoc';
import { bboxOf, parseTransform, apply } from '../src/vehicle/art/geometry';
import { colorMap, recolorSvg, colorsIn } from '../src/vehicle/art/recolor';
import { deriveShade, deltaE, hexToLch, normHex } from '../src/vehicle/art/color';
import { measureArt, toDims } from '../src/vehicle/art/measure';
import { validateVehicle } from '../src/vehicle/art/validate';
import { xmlDom } from '../tools/art/dom';
import { loadArtLibrary, validateLibrary } from '../tools/art/library-fs';
import { generateVehicleSvg } from '../tools/art/vehicleSvg';
import { readFileSync } from 'node:fs';

describe('svg ids', () => {
  it('normalizes Illustrator layer names', () => {
    expect(normalizeId('wheel_x5F_front')).toBe('wheel-front');
    expect(normalizeId('body_1_')).toBe('body');
    expect(normalizeId('Anchor Roof')).toBe('anchor-roof');
    expect(normalizeId('opt-crossbars-2')).toBe('opt-crossbars');
  });

  it('finds nested layers by id or data-name', () => {
    const doc = xmlDom.parse('<svg xmlns="http://www.w3.org/2000/svg"><g id="Layer_1"><g data-name="wheel-front" id="wheel_x5F_front_1_"><circle r="2"/></g></g></svg>');
    const el = findLayer(rootSvg(doc), 'wheel-front');
    expect(el).toBeTruthy();
    expect(layerName(el!)).toBe('wheel-front');
  });

  it('hides everything but the included layer', () => {
    const doc = xmlDom.parse('<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="c"/></defs><g id="body"><rect/><g id="opt-x"><rect/></g></g><g id="wheel-front"><circle/></g><g id="other"/></svg>');
    const root = rootSvg(doc);
    applyVisibility(root, { include: ['body'], exclude: isRuntimeHidden });
    expect(findLayer(root, 'body')!.getAttribute('display')).toBeNull();
    expect(findLayer(root, 'opt-x')!.getAttribute('display')).toBe('none');
    expect(findLayer(root, 'wheel-front')!.getAttribute('display')).toBe('none');
    expect(findLayer(root, 'other')!.getAttribute('display')).toBe('none');
  });
});

describe('geometry', () => {
  it('honors nested transforms', () => {
    const doc = xmlDom.parse('<svg xmlns="http://www.w3.org/2000/svg"><g transform="translate(10 20)"><g id="a" transform="scale(2)"><circle cx="5" cy="5" r="1"/></g></g></svg>');
    const b = bboxOf(findLayer(rootSvg(doc), 'a')!);
    expect(b.cx).toBeCloseTo(20);
    expect(b.cy).toBeCloseTo(30);
    expect(b.w).toBeCloseTo(4);
  });

  it('measures arcs exactly', () => {
    const doc = xmlDom.parse('<svg xmlns="http://www.w3.org/2000/svg"><path id="p" d="M60 50 A10 10 0 1 0 40 50 A10 10 0 1 0 60 50Z"/></svg>');
    const b = bboxOf(findLayer(rootSvg(doc), 'p')!);
    expect(b.w).toBeCloseTo(20, 0);
    expect(b.h).toBeCloseTo(20, 0);
  });

  it('parses rotate about a point', () => {
    const m = parseTransform('rotate(90 10 10)');
    const [x, y] = apply(m, 20, 10);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(20);
  });
});

describe('recolor', () => {
  const tokens = { paint: { base: '#1f5f9e', shades: { dark: '#174a7c' } } };

  it('swaps base and derives shades, keeping references intact', () => {
    const svg = '<svg><style>.a{fill:#1F5F9E}</style><rect fill="#174a7c" clip-path="url(#1f5f9e)"/><rect style="fill:#1f5f9e"/><rect fill="#123456"/></svg>';
    const out = recolorSvg(svg, colorMap(tokens, { paint: '#c8102e' }));
    expect(out).toContain('fill:#c8102e}');
    expect(out).toContain('url(#1f5f9e)');
    expect(out).toContain('#123456');
    expect(colorsIn(out).has('#174a7c')).toBe(false);
  });

  it('derived shade keeps lightness offset and takes the new hue', () => {
    const shade = deriveShade('#1f5f9e', '#174a7c', '#c8102e');
    const [Ls] = hexToLch(shade), [Lb] = hexToLch('#c8102e');
    const [L0] = hexToLch('#1f5f9e'), [L1] = hexToLch('#174a7c');
    expect(Ls - Lb).toBeCloseTo(L1 - L0, 1);
    expect(deltaE(shade, '#c8102e')).toBeGreaterThan(0.03);
  });

  it('greys stay grey when recolored to grey', () => {
    const s = deriveShade('#b9bec4', '#959ba2', '#2a2a2a');
    expect(hexToLch(s)[1]).toBeLessThan(0.03);
    expect(normHex('#ABC')).toBe('#aabbcc');
  });
});

describe('art library', () => {
  const lib = loadArtLibrary();

  it('every file passes validation', () => {
    for (const { name, report } of validateLibrary(lib)) expect(report.errors, name).toEqual([]);
  });

  it('vehicles are sized within the shared band and keep the Mini dims', () => {
    const mini = lib.vehicles.find((v) => v.def.id === 'mini-countryman-2019')!;
    const d = toDims(measureArt(xmlDom.parse(mini.svg)));
    expect(d.half).toBeGreaterThan(98);
    expect(d.half).toBeLessThan(112);
    expect(Math.abs(d.wheels[0].x)).toBeGreaterThan(60);
    expect(Math.abs(d.wheels[0].x)).toBeLessThan(72);
    expect(d.wheels[0].r).toBeGreaterThan(18);
    expect(d.wheels[0].r).toBeLessThan(23);
    expect(d.roof.y).toBeLessThan(-85);
  });

  it('every vehicle part has a unique name', async () => {
    const { listParts, duplicatePartNames } = await import('../src/vehicle/art/parts');
    for (const v of lib.vehicles) {
      const parts = listParts(xmlDom.parse(v.svg));
      expect(duplicatePartNames(parts), v.def.id).toEqual([]);
      expect(parts.map((p) => p.path)).toContain('body/mirror');
    }
  });

  it('generated specs match the committed (or hand-edited) art layers', () => {
    for (const v of lib.vehicles) {
      const spec = JSON.parse(readFileSync(`art/vehicles/${v.def.id}/spec.json`, 'utf8'));
      const svg = generateVehicleSvg(spec, v.def);
      expect(validateVehicle(svg, v.def, xmlDom).errors).toEqual([]);
    }
  });
});
