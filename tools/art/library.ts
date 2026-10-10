// Shared parts library: wheels (100x100, centered, tire r=50) and accessories.
// Generated once, then owned by art/ (protected like vehicle art once hand-edited).
import type { AccessoryDef, WheelDef } from '../../src/vehicle/art/schema';
import { circle, group, path, ringPath, roundRect, roundedPath, svgDoc } from './svg';

const TIRE = '#24262a';
const WALL = '#303338';

function spokes(n: number, twin: boolean, r0: number, r1: number, w0: number, w1: number, fill: string): string[] {
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k * Math.PI * 2) / n - Math.PI / 2;
    for (const off of twin ? [-0.17, 0.17] : [0]) {
      const b = a + off;
      const c = Math.cos(b), s = Math.sin(b), nx = -s, ny = c;
      const p = (r: number, w: number, sgn: number) => `${(50 + c * r + nx * w * sgn).toFixed(2)} ${(50 + s * r + ny * w * sgn).toFixed(2)}`;
      out.push(path(`M${p(r0, w0, 1)} L${p(r1, w1, 1)} L${p(r1, w1, -1)} L${p(r0, w0, -1)}Z`, { fill }));
    }
  }
  return out;
}

const glint = () => circle(34, 30, 6, { fill: '#ffffff', 'fill-opacity': 0.35 });

export const WHEELS: { def: WheelDef; svg: () => string }[] = [
  {
    def: { id: 'mini-star-spoke', name: 'Star spoke (silver)', tokens: { rims: { base: '#d5dbe1', shades: { dark: '#5b636c' } } } },
    svg: () => svgDoc([0, 0, 100, 100], 'i95 wheel: mini-star-spoke. Tokens: rims.base #d5dbe1, rims.dark #5b636c', [
      group('wheel', [
        circle(50, 50, 50, { fill: TIRE }), circle(50, 50, 43, { fill: WALL }),
        circle(50, 50, 36, { fill: '#d5dbe1' }), circle(50, 50, 32, { fill: '#5b636c' }),
        ...spokes(5, true, 8, 33, 2.8, 5, '#d5dbe1'),
        circle(50, 50, 10, { fill: '#d5dbe1' }), circle(50, 50, 4.5, { fill: '#2a2d31' }), glint(),
      ]),
    ]),
  },
  {
    def: { id: 'subaru-machined-5', name: 'Machined 5 twin-spoke', tokens: { rims: { base: '#c9ced3', shades: { dark: '#3a3d42' } } } },
    svg: () => svgDoc([0, 0, 100, 100], 'i95 wheel: subaru-machined-5. Tokens: rims.base #c9ced3, rims.dark #3a3d42', [
      group('wheel', [
        circle(50, 50, 50, { fill: TIRE }), circle(50, 50, 43, { fill: WALL }),
        circle(50, 50, 37, { fill: '#3a3d42' }),
        ...spokes(5, true, 9, 35, 3.5, 6.5, '#c9ced3'),
        path(ringPath(50, 50, 33.5, 37), { fill: '#c9ced3', 'fill-rule': 'evenodd' }),
        circle(50, 50, 11, { fill: '#3a3d42' }), circle(50, 50, 6, { fill: '#c9ced3' }), glint(),
      ]),
    ]),
  },
  {
    def: { id: 'steelie', name: 'Black steelie', tokens: { rims: { base: '#3c4047', shades: { light: '#5c6168' } } } },
    svg: () => svgDoc([0, 0, 100, 100], 'i95 wheel: steelie. Tokens: rims.base #3c4047, rims.light #5c6168', [
      group('wheel', [
        circle(50, 50, 50, { fill: TIRE }), circle(50, 50, 43, { fill: WALL }),
        circle(50, 50, 36, { fill: '#3c4047' }),
        path(ringPath(50, 50, 28, 31), { fill: '#5c6168', 'fill-rule': 'evenodd' }),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const a = (k / 8) * Math.PI * 2;
          return circle(50 + Math.cos(a) * 21, 50 + Math.sin(a) * 21, 4, { fill: '#1d1f22' });
        }),
        circle(50, 50, 12, { fill: '#5c6168' }), circle(50, 50, 5, { fill: '#3c4047' }), glint(),
      ]),
    ]),
  },
];

const mount = (x: number, y: number) => group('guide-mount', [roundRect(x - 4, y - 1, 8, 1, 0.5, { fill: '#00b7ff', 'fill-opacity': 0.6 })]);

export const ACCESSORIES: { def: AccessoryDef; svg?: () => string }[] = [
  {
    def: { id: 'roof-box', name: 'Roof box', mount: 'roof', stackHeight: 35, showLayers: ['opt-crossbars'] },
    svg: () => svgDoc([0, 0, 140, 40], 'i95 accessory: roof-box. Mount = bottom center of guide-mount.', [
      group('accessory', [
        path(roundedPath([[8, 36, 4], [2, 24, 8], [26, 8, 12], [118, 6, 10], [138, 22, 8], [132, 36, 4]]), { fill: '#2b2d31' }),
        roundRect(24, 10, 92, 3, 1.5, { fill: '#ffffff', 'fill-opacity': 0.35 }),
        roundRect(10, 26, 120, 4, 2, { fill: '#1d1e21' }),
      ]),
      mount(70, 38),
    ]),
  },
  {
    def: { id: 'bike-rack', name: 'Bike on hitch rack', mount: 'hitch', offset: [4, 0] },
    svg: () => svgDoc([0, 0, 90, 64], 'i95 accessory: bike-rack. Mount = bottom center of guide-mount.', [
      group('accessory', [
        roundRect(58, 44, 30, 5, 2, { fill: '#3a3d42' }),
        roundRect(60, 22, 5, 26, 2, { fill: '#3a3d42' }),
        path(ringPath(20, 42, 13, 17), { fill: '#24262a', 'fill-rule': 'evenodd' }),
        path(ringPath(62, 42, 13, 17), { fill: '#24262a', 'fill-rule': 'evenodd' }),
        path('M18.5 42.5 L34.5 22.5 L37.5 25.5 L21.5 45.5Z', { fill: '#e94b3c' }),
        path('M36 22 L60 22 L60 26 L36 26Z', { fill: '#e94b3c' }),
        path('M38 24 L42 42 L38 42 L35 25Z', { fill: '#e94b3c' }),
        path('M58 24 L63.5 41 L60 42.5 L55 25Z', { fill: '#e94b3c' }),
        roundRect(30, 15, 12, 4, 2, { fill: '#2b2d31' }),
        roundRect(56, 14, 10, 4, 2, { fill: '#2b2d31' }),
        circle(40, 42, 3.5, { fill: '#5b636c' }),
      ]),
      mount(76, 50),
    ]),
  },
  { def: { id: 'black-pack', name: 'Black pack', mount: 'none', slots: { roof: '#1b1b1d', mirrors: '#1b1b1d', rims: '#2a2c30' } } },
];

