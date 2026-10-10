// Airplanes for the airports: a generic airliner (side view, nose toward +x) in four parody
// liveries, and a little high-wing prop plane for the hangar. Vehicle style rules apply:
// rounded, no outlines, darker belly band, one gloss stripe, no faces (engines get a single
// intake crescent, the cockpit one windscreen strip).
import { Container, Graphics } from 'pixi.js';
import { P, darken, lighten } from '../../style/palette';
import { contactShadow } from '../../style/shapes';

export type Livery = 'sunny' | 'teal' | 'coral' | 'sky';
export const LIVERIES: Livery[] = ['sunny', 'teal', 'coral', 'sky'];

interface LiveryColors {
  body: number;
  belly: number;
  stripe: number;
  tail: number;
  engine: number;
  emblem: (g: Graphics, x: number, y: number, s: number) => void;
}

const LOOKS: Record<Livery, LiveryColors> = {
  sunny: {
    body: 0xfbfaf6, belly: 0xd9dde3, stripe: 0xf7c934, tail: 0xf7c934, engine: 0xf2a33a,
    emblem: (g, x, y, s) => {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.circle(x + Math.cos(a) * s * 1.45, y + Math.sin(a) * s * 1.45, s * 0.28).fill(0xf27d2b);
      }
      g.circle(x, y, s).fill(0xf27d2b);
    },
  },
  teal: {
    body: 0xfbfaf6, belly: 0x2a9d9a, stripe: 0x2a9d9a, tail: 0x2a9d9a, engine: 0x2a9d9a,
    emblem: (g, x, y, s) => {
      g.moveTo(x - s * 1.3, y + s * 0.3)
        .quadraticCurveTo(x - s * 0.6, y - s * 0.9, x, y + s * 0.1)
        .quadraticCurveTo(x + s * 0.6, y + s * 0.9, x + s * 1.3, y - s * 0.3)
        .stroke({ width: s * 0.45, color: P.white, cap: 'round' });
    },
  },
  coral: {
    body: 0xfbfaf6, belly: 0xd9dde3, stripe: 0xf26b5b, tail: 0xf26b5b, engine: 0xf26b5b,
    emblem: (g, x, y, s) => {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        g.circle(x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7, s * 0.55).fill(P.white);
      }
      g.circle(x, y, s * 0.35).fill(0xf7c934);
    },
  },
  sky: {
    body: 0xeaf5fd, belly: 0x5aa6e0, stripe: 0x3f8fd8, tail: 0x5aa6e0, engine: 0xdfe6ee,
    emblem: (g, x, y, s) => {
      g.circle(x - s * 0.6, y + s * 0.2, s * 0.55).fill(P.white);
      g.circle(x + s * 0.05, y - s * 0.15, s * 0.75).fill(P.white);
      g.circle(x + s * 0.75, y + s * 0.25, s * 0.5).fill(P.white);
      g.roundRect(x - s * 1.1, y + s * 0.2, s * 2.3, s * 0.55, s * 0.27).fill(P.white);
    },
  },
};

/** Fuselage outline (unit length, nose at +0.5) with its bottom edge at y = b. */
function fuselage(g: Graphics, L: number, h: number, b: number): Graphics {
  const t = (h - b) / (1.7 * h); // how far up the tail upsweep a raised bottom starts
  g.moveTo(-0.32 * L, -h * L)
    .lineTo(0.36 * L, -h * L)
    .quadraticCurveTo(0.5 * L, -h * L, 0.5 * L, ((b - h) / 2 + 0.012) * L)
    .quadraticCurveTo(0.5 * L, b * L, 0.38 * L, b * L)
    .lineTo((-0.27 - t * 0.12) * L, b * L)
    .quadraticCurveTo(-0.42 * L, b * L, -0.5 * L, -h * 0.55 * L)
    .quadraticCurveTo(-0.5 * L, -h * L, -0.44 * L, -h * L)
    .closePath();
  return g;
}

export interface PlaneView {
  /** Origin at the main wheels' ground contact. */
  view: Container;
  /** Everything but the shadow; rotate this for pitch (pivot is the main gear). */
  body: Container;
  gear: Graphics;
  shadow: Graphics;
  beacon: Graphics;
  length: number;
}

/** A generic twin-engine airliner, nose toward +x, `length` world units long. */
export function makePlane(livery: Livery, length = 400): PlaneView {
  const L = length;
  const look = LOOKS[livery];
  const h = 0.068;
  const gearH = 0.095 * L;
  const mainX = -0.03 * L;
  const view = new Container();
  const body = new Container();
  const shadow = new Graphics();
  contactShadow(shadow, 0.05 * L, 0, L * 0.9, 0.12);
  view.addChild(shadow, body);

  // Everything is drawn relative to the main gear contact: shift x by -mainX, body centre at cy.
  const cy = -gearH - h * L;
  const art = new Container();
  art.position.set(-mainX, cy);
  body.addChild(art);

  // Landing gear (separate so it can fold away).
  const gear = new Graphics();
  for (const [gx, n] of [[0.38, 1], [-0.0, 2]] as const) {
    const x = gx * L - 0 * mainX;
    gear.roundRect(x - 3, h * L - 2, 6, gearH - 0.024 * L * 1.12, 3).fill(0x8e959e);
    for (let k = 0; k < n; k++) {
      const wx = x + (k - (n - 1) / 2) * 0.05 * L;
      gear.circle(wx, h * L + gearH - 0.024 * L * 1.12, 0.024 * L * 1.12).fill(0x2b2f33);
      gear.circle(wx, h * L + gearH - 0.024 * L * 1.12, 0.01 * L).fill(0x9aa3ad);
    }
  }
  art.addChild(gear);

  const g = new Graphics();
  // Far-side horizontal stabilizer peeks above the body.
  g.roundShape([{ x: -0.47 * L, y: -h * 0.6 * L }, { x: -0.36 * L, y: -h * 0.6 * L }, { x: -0.44 * L, y: -h * 1.5 * L }, { x: -0.5 * L, y: -h * 1.5 * L }], 0.01 * L).fill(darken(look.tail, 0.12));
  // Tail fin.
  g.roundShape([
    { x: -0.44 * L, y: -h * L + 2 }, { x: -0.25 * L, y: -h * L + 2 },
    { x: -0.42 * L, y: (-h - 0.19) * L }, { x: -0.5 * L, y: (-h - 0.19) * L },
  ], 0.018 * L).fill(look.tail);
  g.roundShape([
    { x: -0.42 * L, y: (-h - 0.1) * L }, { x: -0.36 * L, y: (-h - 0.1) * L },
    { x: -0.42 * L, y: (-h - 0.19) * L }, { x: -0.48 * L, y: (-h - 0.19) * L },
  ], 0.012 * L).fill(darken(look.tail, 0.08));
  look.emblem(g, -0.415 * L, (-h - 0.085) * L, 0.028 * L);
  // Fuselage: belly band, livery stripe, then the body colour.
  fuselage(g, L, h, h).fill(look.belly);
  fuselage(g, L, h, h * 0.42).fill(look.stripe);
  fuselage(g, L, h, h * 0.22).fill(look.body);
  // Right-side shade (light from the left) and the one gloss stripe.
  g.roundRect(-0.3 * L, -h * 0.82 * L, 0.62 * L, 0.012 * L, 0.006 * L).fill({ color: P.white, alpha: 0.7 });
  // Window row, a door, and one windscreen strip (never two "eyes").
  for (let x = -0.27; x < 0.3; x += 0.027) g.roundRect(x * L, -h * 0.42 * L, 0.012 * L, 0.018 * L, 0.006 * L).fill(0x4d6378);
  g.roundRect(0.325 * L, -h * 0.7 * L, 0.024 * L, h * 1.0 * L, 0.008 * L).fill(darken(look.body, 0.08));
  g.moveTo(0.415 * L, -h * 0.55 * L).lineTo(0.465 * L, -h * 0.5 * L).quadraticCurveTo(0.478 * L, -h * 0.3 * L, 0.46 * L, -h * 0.25 * L).lineTo(0.415 * L, -h * 0.28 * L).closePath().fill(0x34495e);
  // Near wing (seen nearly edge-on, swept back) and the engine under it.
  g.roundShape([
    { x: -0.17 * L, y: h * 0.55 * L }, { x: 0.13 * L, y: h * 0.2 * L },
    { x: 0.15 * L, y: h * 0.6 * L }, { x: -0.13 * L, y: h * 1.0 * L },
  ], 0.012 * L).fill(darken(look.body, 0.1));
  const ex0 = -0.02 * L, ex1 = 0.17 * L, ey = h * L + 0.03 * L, er = 0.037 * L;
  g.roundRect(ex0, ey - er, ex1 - ex0, er * 2, er).fill(look.engine);
  g.roundRect(ex0 + er * 0.5, ey - er, (ex1 - ex0) * 0.6, 0.006 * L, 0.003 * L).fill({ color: P.white, alpha: 0.4 });
  // Single intake crescent at the front of the nacelle.
  g.ellipse(ex1 - er * 0.25, ey, er * 0.42, er * 0.95).fill(0x3a4048);
  g.ellipse(ex1 - er * 0.5, ey, er * 0.42, er * 0.95).fill(look.engine);
  g.roundRect(ex0 - 0.02 * L, ey - er * 0.5, 0.03 * L, er, er * 0.5).fill(darken(look.engine, 0.2));
  art.addChild(g);

  // Red beacon on the tail tip (blinks in the airport's update).
  const beacon = new Graphics().circle(0, 0, 0.012 * L).fill(0xe5483f);
  beacon.position.set(-0.47 * L, (-h - 0.2) * L);
  art.addChild(beacon);

  return { view, body, gear, shadow, beacon, length: L };
}

/** A little high-wing prop plane (for the hangar), nose toward +x, origin at the wheels. */
export function makePropPlane(color = 0xe9637a, length = 150): { view: Container; prop: Graphics } {
  const L = length;
  const view = new Container();
  const g = new Graphics();
  contactShadow(g, 0, 0, L * 0.8, 0.12);
  // gear
  g.roundRect(0.18 * L - 2, -0.16 * L, 4, 0.14 * L, 2).fill(0x8e959e);
  g.roundRect(-0.06 * L - 2, -0.16 * L, 4, 0.14 * L, 2).fill(0x8e959e);
  for (const wx of [0.18, -0.06]) g.circle(wx * L, -0.045 * L, 0.05 * L).fill(0x2b2f33);
  g.circle(-0.42 * L, -0.03 * L, 0.025 * L).fill(0x2b2f33);
  // tail
  g.roundShape([{ x: -0.42 * L, y: -0.2 * L }, { x: -0.3 * L, y: -0.2 * L }, { x: -0.42 * L, y: -0.42 * L }, { x: -0.5 * L, y: -0.42 * L }], 0.03 * L).fill(color);
  // body
  g.roundShape([
    { x: -0.48 * L, y: -0.24 * L }, { x: 0.3 * L, y: -0.36 * L }, { x: 0.42 * L, y: -0.3 * L },
    { x: 0.42 * L, y: -0.14 * L }, { x: 0.22 * L, y: -0.1 * L }, { x: -0.44 * L, y: -0.16 * L },
  ], 0.05 * L).fill(0xfbfaf6);
  g.roundRect(-0.4 * L, -0.19 * L, 0.78 * L, 0.04 * L, 0.02 * L).fill(color);
  g.roundRect(0.0 * L, -0.33 * L, 0.18 * L, 0.1 * L, 0.03 * L).fill(0x4d6378);
  g.roundRect(0.03 * L, -0.32 * L, 0.04 * L, 0.03 * L, 0.015 * L).fill({ color: P.white, alpha: 0.5 });
  // high wing on top
  g.roundRect(-0.12 * L, -0.42 * L, 0.42 * L, 0.06 * L, 0.03 * L).fill(lighten(color, 0.1));
  g.roundRect(0.06 * L, -0.37 * L, 0.03 * L, 0.06 * L, 0.01 * L).fill(0x8e959e);
  // spinner
  g.circle(0.44 * L, -0.22 * L, 0.035 * L).fill(0x9aa3ad);
  view.addChild(g);
  const prop = new Graphics();
  prop.roundRect(-0.012 * L, -0.15 * L, 0.024 * L, 0.3 * L, 0.012 * L).fill(0x4a4f57);
  prop.position.set(0.46 * L, -0.22 * L);
  view.addChild(prop);
  return { view, prop };
}
