// Road signs: mile markers, interstate / US route shields, green guide signs,
// billboards and the state welcome signs. All are parameterized; defaults reproduce the MVP signs.
import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import type { BillboardDesign, Placement, StateId } from '../world/Route';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken } from '../style/palette';
import { R, contactShadow, cornerRect, palmetto } from '../style/shapes';
import { drawDuck } from '../landmarks/duck';
import { POTATO_BOARDS, type PotatoBoard } from './PotatoSigns';

export const SIGN_FONT = 'Overpass, Arial, sans-serif';

export function signText(text: string, size: number, color: number = P.white, weight: TextStyleOptions['fontWeight'] = '800'): Text {
  const t = new Text({
    text,
    style: { fontFamily: SIGN_FONT, fontSize: size, fill: color, fontWeight: weight, align: 'center', letterSpacing: 0.5 },
    resolution: 3,
  });
  t.anchor.set(0.5);
  return t;
}

/** Green sign panel with the white inset border. */
export function greenPanel(g: Graphics, x: number, y: number, w: number, h: number): Graphics {
  g.roundRect(x, y, w, h, R.sign).fill(P.signGreen);
  g.roundRect(x + 5, y + 5, w - 10, h - 10, R.sign - 3).stroke({ width: 3, color: P.white });
  cornerRect(g, x + w * 0.72, y, w * 0.28, h, 0, R.sign, R.sign, 0).fill({ color: P.black, alpha: 0.07 });
  return g;
}

function post(g: Graphics, x: number, top: number, bottom: number, w = 6): void {
  g.roundRect(x - w / 2, top, w, bottom - top, 2).fill(P.signPost);
  g.rect(x + w / 2 - 2, top, 2, bottom - top).fill({ color: P.black, alpha: 0.08 });
}

// ---------- Mile marker (counts down 100 → 1) ----------
export class MileMarker extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number, public n: number) {
    super(ctx, x, 62);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, 0, 0, 26);
    post(g, 0, -60, 0, 5);
    this.view.addChild(g);
    const p = new Graphics();
    const pw = n >= 100 ? 54 : 42;
    greenPanel(p, -pw / 2, -46, pw, 58);
    this.sign.addChild(p);
    const t = signText(String(n), n >= 100 ? 22 : n >= 10 ? 24 : 30);
    t.position.set(0, -14);
    this.sign.addChild(t);
    this.sign.position.set(0, -58);
    this.sign.pivot.set(0, 0);
    this.view.addChild(this.sign);
    this.hits = [{ x: -26, y: -110, w: 52, h: 110 }];
  }

  hintTarget(): Container {
    return this.sign;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.sign, 0.25, 0.9, 0.1);
    this.ctx.sfx.pluck(((100 - this.n) % 10) + 2, 0.18);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 90, count: 6, shape: 'star', tint: [0xfff27a, P.white], speed: [80, 200], gravity: 200, life: [0.5, 0.9], size: [8, 12] });
  }
}

// ---------- Interstate shield (the real shape) ----------
// Outline in unit space (half-width 1, height 2.15), bottom point at (0, 0), y up negative:
// a crowned top with a dip in the middle, sides that bulge a little, curving into a soft point.
type Pt2 = [number, number];
function bez(p0: Pt2, p1: Pt2, p2: Pt2, p3: Pt2, n: number, out: Pt2[]): void {
  for (let k = 1; k <= n; k++) {
    const t = k / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}
const SHIELD_UNIT: Pt2[] = (() => {
  const H = 2.15;
  const right: Pt2[] = [[0, -H + 0.1]];
  bez([0, -H + 0.1], [0.22, -H - 0.06], [0.62, -H - 0.1], [0.98, -H + 0.04], 10, right); // crown
  bez([0.98, -H + 0.04], [1.1, -H * 0.62], [0.92, -H * 0.2], [0, 0], 18, right); // side to the point
  const left = right.slice(1, -1).reverse().map(([x, y]): Pt2 => [-x, y]);
  return [...right, ...left];
})();
const SHIELD_H = 2.15;

/** Shield outline points at half-width `hw`, optionally shrunk toward its middle by `inset`. */
function shieldPts(hw: number, inset = 0): Pt2[] {
  const cy = -SHIELD_H * 0.5 * hw;
  const k = (hw - inset) / hw;
  return SHIELD_UNIT.map(([x, y]): Pt2 => [x * hw * k, cy + (y * hw - cy) * k]);
}

/** Keep the part of a polygon above y = cut (smaller y). */
function clipAbove(pts: Pt2[], cut: number): Pt2[] {
  const out: Pt2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ain = a[1] <= cut, bin = b[1] <= cut;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (cut - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, cut]);
    }
  }
  return out;
}

/** Shield geometry at scale s: width 70s, height ~76s, bottom point at (0, 0). */
export function shieldGeom(s: number): { hw: number; h: number; bandY: number; numY: number } {
  const hw = 35 * s * 0.98;
  const h = SHIELD_H * hw;
  return { hw, h, bandY: -h * 0.7, numY: -h * 0.36 };
}

export function drawShield(g: Graphics, s: number): void {
  const { hw, bandY } = shieldGeom(s);
  const flat = (p: Pt2[]) => p.flat();
  g.poly(flat(shieldPts(hw))).fill(P.white);
  const inner = shieldPts(hw, 3.6 * s);
  g.poly(flat(inner)).fill(P.shieldBlue);
  g.poly(flat(clipAbove(inner, bandY))).fill(P.shieldRed);
  // white rule between the band and the field
  const rule = clipAbove(inner, bandY + 2.4 * s).filter(([, y]) => y > bandY - 0.01);
  if (rule.length >= 2) {
    const xs = rule.map(([x]) => x);
    g.rect(Math.min(...xs), bandY, Math.max(...xs) - Math.min(...xs), 2.4 * s).fill(P.white);
  }
  // soft shade on the right
  g.poly(flat(clipAbove(inner, 0).filter(([x]) => x >= hw * 0.42).concat([[hw * 0.42, 0]]))).fill({ color: P.black, alpha: 0.06 });
}

/** A text fitted to a max width (scaled down if needed). */
function fitText(text: string, size: number, maxW: number, color: number = P.white): Text {
  const t = signText(text, size, color);
  if (t.width > maxW) t.scale.set(maxW / t.width);
  return t;
}

/** US route shield: white shield shape on a black square, black numbers. */
export function drawUsShield(g: Graphics, s: number): void {
  g.roundRect(-34 * s, -74 * s, 68 * s, 72 * s, 6 * s).fill(0x24262a);
  g.moveTo(-28 * s, -68 * s)
    .quadraticCurveTo(-14 * s, -62 * s, 0, -68 * s)
    .quadraticCurveTo(14 * s, -62 * s, 28 * s, -68 * s)
    .quadraticCurveTo(30 * s, -20 * s, 0, -6 * s)
    .quadraticCurveTo(-30 * s, -20 * s, -28 * s, -68 * s)
    .closePath()
    .fill(P.white);
}

/** A route marker for `shield` ("95", "4", "US17"…), drawn with its number, at scale s. */
export function routeMarker(shield: string, s: number): Container {
  const c = new Container();
  const g = new Graphics();
  const us = shield.startsWith('US');
  const num = us ? shield.slice(2) : shield;
  if (us) drawUsShield(g, s);
  else drawShield(g, s);
  c.addChild(g);
  if (us) {
    const t = fitText(num, 32 * s, 50 * s, 0x24262a);
    t.position.set(0, -36 * s);
    c.addChild(t);
  } else {
    const { hw, numY } = shieldGeom(s);
    const t = fitText(num, (num.length >= 3 ? 26 : 32) * s, hw * 1.45);
    t.position.set(0, numY);
    c.addChild(t);
  }
  return c;
}

export class InterstateShield extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number, route = '95') {
    super(ctx, x, 70);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, 0, 0, 30);
    post(g, 0, -150, 0);
    this.view.addChild(g);
    const sc = 1.25;
    const { hw, h, bandY, numY } = shieldGeom(sc);
    const sg = new Graphics();
    drawShield(sg, sc);
    this.sign.addChild(sg);
    // "INTERSTATE" sits inside the red band, the number in the blue field.
    const top = fitText('INTERSTATE', 9, hw * 1.35);
    top.position.set(0, (-h + 6 * sc + bandY) / 2 + 1);
    const num = fitText(route, route.length >= 3 ? 32 : 42, hw * 1.45);
    num.position.set(0, numY - 5);
    this.sign.addChild(top, num);
    this.sign.position.set(0, -120);
    this.view.addChild(this.sign);
    this.hits = [{ x: -48, y: -220, w: 96, h: 220 }];
  }

  hintTarget(): Container {
    return this.sign;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.sign, 0.22, 0.9, 0.1);
    this.ctx.sfx.boing(1.1);
  }
}

// ---------- Green guide sign: city exits (and the airport) ----------
export interface GuideOpts {
  city?: Placement['city'];
  exit?: string;
  shield?: string;
}

const GUIDE_NAMES: Record<NonNullable<Placement['city']>, string> = {
  'new-york': 'New York',
  washington: 'Washington',
  richmond: 'Richmond',
  charleston: 'Charleston',
  savannah: 'Savannah',
  jacksonville: 'Jacksonville',
  orlando: 'Orlando',
  'potato-world': 'Potato World',
  'downtown-orlando': 'Downtown',
  airport: 'Airport',
};

/** Simple plane silhouette for airport signs (white, pointing up-right). */
function planeIcon(g: Graphics, x: number, y: number, s: number, color: number = P.white): void {
  const rot = -Math.PI / 4;
  const pt = (px: number, py: number): [number, number] => [x + (px * Math.cos(rot) - py * Math.sin(rot)) * s, y + (px * Math.sin(rot) + py * Math.cos(rot)) * s];
  const poly = (pts: [number, number][]) => g.poly(pts.flatMap(([a, b]) => pt(a, b))).fill(color);
  poly([[-26, -3], [22, -4], [28, 0], [22, 4], [-26, 3]]);
  poly([[-2, -3], [8, -3], [-6, -26], [-12, -26]]);
  poly([[-2, 3], [8, 3], [-6, 26], [-12, 26]]);
  poly([[-26, -2], [-20, -2], [-26, -12], [-30, -12]]);
  poly([[-26, 2], [-20, 2], [-26, 12], [-30, 12]]);
}

export class GuideSign extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number, o: GuideOpts = {}) {
    super(ctx, x, 70);
    const city = o.city ?? 'charleston';
    const exitNo = o.exit ?? '221';
    const shield = o.shield ?? (city === 'charleston' ? '26' : undefined);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, -70, 0, 24);
    contactShadow(g, 70, 0, 24);
    post(g, -70, -300, 0, 9);
    post(g, 70, -300, 0, 9);
    this.view.addChild(g);

    // Layout: route shield (or plane) on top, the destination below it, the arrow on the right,
    // so nothing ever overlaps.
    const name = GUIDE_NAMES[city];
    const PH = 160;
    const p = new Graphics();
    greenPanel(p, -150, -PH, 300, PH);
    // exit tab on top right
    p.roundRect(40, -PH - 36, 110, 40, R.sign).fill(P.signGreen);
    p.roundRect(45, -PH - 31, 100, 34, R.sign - 3).stroke({ width: 3, color: P.white });
    // up-right arrow
    const ax = 116, ay = -78;
    p.moveTo(ax - 18, ay + 20).lineTo(ax + 10, ay - 8).stroke({ width: 7, color: P.white, cap: 'round' });
    p.poly([ax + 18, ay - 16, ax + 18, ay + 6, ax - 4, ay - 16]).fill(P.white);
    const cx = -22;
    if (city === 'airport') planeIcon(p, cx, -118, 0.95);
    this.sign.addChild(p);
    const exit = signText(`EXIT ${exitNo}`, exitNo.length > 3 ? 18 : 20);
    exit.position.set(95, -PH - 13);
    this.sign.addChild(exit);
    if (shield) {
      const m = routeMarker(shield, 0.64);
      m.position.set(cx, -94);
      this.sign.addChild(m);
    }
    const label = signText(name, 36);
    const maxW = 220;
    if (label.width > maxW) label.scale.set(maxW / label.width);
    label.position.set(cx, city === 'airport' || shield ? -54 : -84);
    this.sign.addChild(label);
    this.sign.position.set(0, -170);
    this.view.addChild(this.sign);
    this.hits = [{ x: -160, y: -370, w: 320, h: 370 }];
    this.extent = [-400, 400];
  }

  hintTarget(): Container {
    return this.sign;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.sign, 0.06, 0.9, 0.05);
    this.ctx.sfx.chime();
  }
}

// ---------- Billboards (far side, on tall poles): Duckies plus a few roadside parodies ----------
const BOARD_W = 520;
const BOARD_H = 220;

/** The painted board itself, with its right-side shade and top highlight. */
function boardFace(b: Graphics, color: number, shade: number): void {
  b.roundRect(-BOARD_W / 2, -230, BOARD_W, BOARD_H, R.sign).fill(color);
  cornerRect(b, -BOARD_W / 2 + BOARD_W * 0.72, -230, BOARD_W * 0.28, BOARD_H, 0, R.sign, R.sign, 0).fill(shade);
  b.roundRect(-BOARD_W / 2, -230, BOARD_W, 3, 2).fill({ color: P.white, alpha: 0.45 });
}

function duckiesBoard(c: Container): void {
  const b = new Graphics();
  // Red board so the yellow duck pops (it sits on a cream badge, like the pylon sign).
  boardFace(b, P.duckiesRed, P.duckiesRedDark);
  b.roundRect(-245, -60, 490, 40, 6).fill(P.duckYellow);
  b.circle(-170, -112, 84).fill(P.duckYellow);
  b.circle(-170, -112, 77).fill(0xfff4cf);
  c.addChild(b);
  const duck = new Graphics();
  drawDuck(duck, 0.95);
  duck.position.set(-170, -95);
  c.addChild(duck);
  const name = signText('DUCKIES', 64, P.white, '900');
  name.position.set(70, -165);
  const tag = signText('NEXT EXIT  ·  CLEAN RESTROOMS', 18, P.duckiesRedDark);
  tag.position.set(0, -40);
  // little gas pump icon
  const pump = new Graphics();
  pump.roundRect(150, -125, 26, 40, 4).fill(P.white);
  pump.roundRect(155, -120, 16, 11, 2).fill(P.duckiesRed);
  pump.roundRect(176, -112, 10, 4, 2).fill(P.white);
  pump.roundRect(184, -112, 4, 24, 2).fill(P.white);
  c.addChild(name, tag, pump);
}

/** A round fruit with a leaf and a highlight. */
function fruit(g: Graphics, x: number, y: number, r: number, color: number, blush?: number): void {
  g.circle(x, y, r).fill(color);
  if (blush) g.circle(x - r * 0.3, y + r * 0.15, r * 0.62).fill({ color: blush, alpha: 0.55 });
  g.circle(x + r * 0.32, y - r * 0.34, r * 0.18).fill({ color: P.white, alpha: 0.5 });
  g.ellipse(x + r * 0.28, y - r * 1.02, r * 0.38, r * 0.16).fill(0x4f9a3c);
  g.roundRect(x - 1.5, y - r * 1.12, 3, r * 0.3, 1.5).fill(0x6b4a2b);
}

function peachesBoard(c: Container): void {
  const b = new Graphics();
  boardFace(b, 0xffb37a, 0xf5a066);
  b.roundRect(-245, -60, 490, 40, 6).fill(0xf08a4b);
  fruit(b, -190, -122, 52, 0xffc48a, 0xf26b5b);
  fruit(b, -128, -98, 34, 0xffc48a, 0xf26b5b);
  // a little pile of pecans
  for (const [px, py] of [[-215, -64], [-190, -66], [-165, -64]]) b.ellipse(px, py, 12, 8).fill(0x8a5a33);
  c.addChild(b);
  const name = signText('PEACHES', 52, P.white, '900');
  name.position.set(80, -178);
  const amp = signText('& PECANS', 34, 0x8a4a22, '900');
  amp.position.set(80, -122);
  const tag = signText('FRESH  ·  NEXT EXIT', 18, P.white);
  tag.position.set(0, -40);
  c.addChild(name, amp, tag);
}

function ojBoard(c: Container): void {
  const b = new Graphics();
  boardFace(b, 0x4fb3e8, 0x41a3d8);
  b.roundRect(-245, -60, 490, 40, 6).fill(0x2f86c4);
  // a tall glass of orange juice and an orange
  b.roundRect(-212, -190, 64, 116, 10).fill({ color: P.white, alpha: 0.9 });
  b.roundRect(-206, -170, 52, 90, 8).fill(0xffa21f);
  b.roundRect(-200, -166, 10, 70, 4).fill({ color: P.white, alpha: 0.35 });
  b.roundRect(-170, -214, 6, 60, 3).fill(0xf25f5c);
  fruit(b, -112, -104, 34, 0xff9f1c);
  // a sun peeking
  b.circle(210, -190, 26).fill(0xffe066);
  c.addChild(b);
  const name = signText('FREE OJ', 60, P.white, '900');
  name.position.set(70, -160);
  const tag = signText('FLORIDA WELCOME CENTER', 18, P.white);
  tag.position.set(0, -40);
  c.addChild(name, tag);
}

/** A friendly cartoon gator head (big smile, round eyes on top). */
export function gatorHead(g: Graphics, x: number, y: number, s: number): void {
  const green = 0x5aa357, dark = 0x4a8f48;
  g.roundRect(x - 60 * s, y - 26 * s, 130 * s, 44 * s, 20 * s).fill(green);
  g.roundRect(x - 60 * s, y + 4 * s, 130 * s, 22 * s, 11 * s).fill(dark);
  g.circle(x - 34 * s, y - 30 * s, 16 * s).fill(green);
  g.circle(x - 6 * s, y - 30 * s, 16 * s).fill(green);
  for (const ex of [-34, -6]) {
    g.circle(x + ex * s, y - 32 * s, 10 * s).fill(P.white);
    g.circle(x + (ex + 2) * s, y - 31 * s, 5.5 * s).fill(0x24262a);
  }
  // smile with little triangle teeth
  g.moveTo(x - 40 * s, y + 4 * s).quadraticCurveTo(x + 10 * s, y + 18 * s, x + 66 * s, y + 2 * s).stroke({ width: 3 * s, color: 0x2f5f2f, cap: 'round' });
  for (let k = 0; k < 5; k++) {
    const tx = x - 26 * s + k * 20 * s;
    g.poly([tx - 4 * s, y + 6 * s + k * 0.6 * s, tx + 4 * s, y + 6 * s + k * 0.6 * s, tx, y + 13 * s]).fill(P.white);
  }
  g.circle(x + 58 * s, y - 14 * s, 3 * s).fill(0x2f5f2f);
  // back ridges
  for (let k = 0; k < 3; k++) g.circle(x + (20 + k * 18) * s, y - 26 * s, 7 * s).fill(dark);
}

function chompBoard(c: Container): void {
  const b = new Graphics();
  boardFace(b, 0x2e9d6a, 0x268a5c);
  b.roundRect(-245, -60, 490, 40, 6).fill(0xffd166);
  // water band and the gator
  b.roundRect(-245, -98, 210, 30, 12).fill(0x5bc0de);
  gatorHead(b, -150, -118, 0.95);
  c.addChild(b);
  const name = signText('CHOMP', 60, 0xffd166, '900');
  name.position.set(110, -176);
  const land = signText('LAND', 44, P.white, '900');
  land.position.set(110, -120);
  const tag = signText('GATORS  ·  GIFT SHOP  ·  12 MI', 18, 0x1f6b47);
  tag.position.set(0, -40);
  c.addChild(name, land, tag);
}

/** A friendly potato (no face, just a potato with a crown of sparkles). */
export function potato(g: Graphics, x: number, y: number, s: number): void {
  g.ellipse(x, y, 62 * s, 44 * s).fill(0xc9935a);
  g.ellipse(x + 18 * s, y + 6 * s, 40 * s, 30 * s).fill({ color: 0xb07f4b, alpha: 0.6 });
  for (const [dx, dy] of [[-30, -10], [8, -22], [26, 12], [-12, 18]]) g.circle(x + dx * s, y + dy * s, 4 * s).fill(0x9a6b3c);
  g.ellipse(x - 22 * s, y - 22 * s, 18 * s, 8 * s).fill({ color: P.white, alpha: 0.25 });
}

function potatoBoard(c: Container): void {
  const b = new Graphics();
  boardFace(b, 0x7b5cc4, 0x6c4fb3);
  b.roundRect(-245, -60, 490, 40, 6).fill(0xffd166);
  // castle silhouette behind the potato
  const cx = -160;
  b.roundRect(cx - 70, -150, 140, 80, 6).fill(0xb9a6ef);
  for (const [tx, h] of [[-58, 90], [0, 130], [58, 90]]) {
    b.roundRect(cx + tx - 14, -70 - h, 28, h, 4).fill(0xb9a6ef);
    roundedTriPoly(b, cx + tx, -70 - h - 40, 36, 42, 0xffd166);
  }
  potato(b, cx, -96, 0.9);
  for (const [sx, sy] of [[-230, -200], [-80, -206], [-60, -150]]) star(b, sx, sy, 10, 0xffd166);
  c.addChild(b);
  const name = signText('POTATO', 54, P.white, '900');
  name.position.set(100, -172);
  const world = signText('WORLD', 46, 0xffd166, '900');
  world.position.set(100, -118);
  const tag = signText('COMING SOON  ·  ORLANDO', 18, 0x4a3590);
  tag.position.set(0, -40);
  c.addChild(name, world, tag);
}

function roundedTriPoly(g: Graphics, x: number, ty: number, w: number, h: number, color: number): void {
  g.poly([x, ty, x + w / 2, ty + h, x - w / 2, ty + h]).fill(color);
}

function star(g: Graphics, x: number, y: number, r: number, color: number): void {
  const pts: number[] = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.poly(pts).fill(color);
}

function pizzaBoard(c: Container): void {
  const b = new Graphics();
  boardFace(b, 0xd8392b, 0xc22f22);
  b.roundRect(-245, -60, 490, 40, 6).fill(0xfff4cf);
  // a giant slice: crust, cheese, pepperoni
  b.poly([-235, -190, -95, -190, -165, -72]).fill(0xffd166);
  b.roundRect(-240, -200, 150, 16, 8).fill(0xd9a25c);
  for (const [px, py] of [[-195, -165], [-140, -168], [-165, -128], [-172, -100]]) b.circle(px, py, 10).fill(0xc0392b);
  b.ellipse(-190, -150, 14, 4).fill({ color: P.white, alpha: 0.35 });
  c.addChild(b);
  const name = signText('BIG SLICE', 54, P.white, '900');
  name.position.set(90, -170);
  const pz = signText('PIZZA', 40, 0xffd166, '900');
  pz.position.set(90, -118);
  const tag = signText('NEW YORK STYLE  ·  NEXT EXIT', 18, 0xc22f22);
  tag.position.set(0, -40);
  c.addChild(name, pz, tag);
}

function crabsBoard(c: Container): void {
  const b = new Graphics();
  boardFace(b, 0x2f6fb0, 0x285f99);
  b.roundRect(-245, -60, 490, 40, 6).fill(0xffd166);
  // a happy red crab
  const x = -165, y = -118, col = 0xe8652c;
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) b.moveTo(x + s * 30, y + 6 + k * 8).lineTo(x + s * 58, y + 22 + k * 10).stroke({ width: 6, color: col, cap: 'round' });
    b.moveTo(x + s * 26, y - 12).lineTo(x + s * 46, y - 40).stroke({ width: 8, color: col, cap: 'round' });
    b.circle(x + s * 48, y - 48, 15).fill(col);
    b.poly([x + s * 48, y - 48, x + s * 64, y - 68, x + s * 58, y - 46]).fill(col);
  }
  b.ellipse(x, y, 44, 28).fill(col);
  b.ellipse(x - 14, y - 10, 14, 6).fill({ color: P.white, alpha: 0.35 });
  for (const s of [-1, 1]) {
    b.roundRect(x + s * 12 - 2, y - 40, 4, 16, 2).fill(col);
    b.circle(x + s * 12, y - 42, 7).fill(P.white);
    b.circle(x + s * 12, y - 42, 3.5).fill(0x24262a);
  }
  b.moveTo(x - 12, y + 6).quadraticCurveTo(x, y + 14, x + 12, y + 6).stroke({ width: 3, color: 0x8a2f12, cap: 'round' });
  c.addChild(b);
  const name = signText('CRAB', 58, P.white, '900');
  name.position.set(100, -172);
  const sh = signText('SHACK', 44, 0xffd166, '900');
  sh.position.set(100, -118);
  const tag = signText('STEAMED CRABS  ·  NEXT EXIT', 18, 0x1f4f80);
  tag.position.set(0, -40);
  c.addChild(name, sh, tag);
}

const BOARDS: Partial<Record<BillboardDesign, (c: Container) => void>> = {
  pizza: pizzaBoard,
  crabs: crabsBoard,
  duckies: duckiesBoard,
  peaches: peachesBoard,
  oj: ojBoard,
  chomp: chompBoard,
  potato: potatoBoard,
};

export class Billboard extends Prop {
  private board = new Container();
  constructor(ctx: Ctx, x: number, public design: BillboardDesign = 'duckies') {
    super(ctx, x, -78);
    this.layer = 'back';
    const g = new Graphics();
    for (const px of [-150, 0, 150]) post(g, px, -170, 0, 12);
    g.roundRect(-250, -182, 500, 8, 3).fill(darken(P.signPost, 0.1));
    this.view.addChild(g);
    (BOARDS[design] ?? POTATO_BOARDS[design as PotatoBoard])(this.board);
    this.board.pivot.set(0, -120);
    this.board.position.set(0, -270);
    this.view.addChild(this.board);
    this.hits = [{ x: -260, y: -400, w: 520, h: 400 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.board;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.board, 0.05, 0.9, 0.04);
    const sfx = this.ctx.sfx;
    const fxAt = (tint: number[], shape: 'star' | 'circle' = 'circle') =>
      this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x - 160, y: this.y - 420, count: 8, shape, tint, speed: [80, 220], gravity: 300, life: [0.6, 1.0], size: [10, 16] });
    switch (this.design) {
      case 'duckies': sfx.quack(); break;
      case 'pizza': sfx.pop(); fxAt([0xffd166, 0xc0392b]); break;
      case 'crabs': sfx.chomp(); fxAt([0xe8652c, 0xffd166]); break;
      case 'peaches': sfx.pop(); fxAt([0xffc48a, 0xf26b5b]); break;
      case 'oj': sfx.glugDing(); fxAt([0xff9f1c, 0xffd166]); break;
      case 'chomp': sfx.chomp(); break;
      case 'potato': sfx.sparkle(); fxAt([0xffd166, P.white], 'star'); break;
      default: sfx.fanfare(); fxAt([0xffd166, 0xff9eb5, P.white], 'star'); break;
    }
  }
}

// ---------- Welcome to <state> ----------
interface WelcomeLook {
  color: number;
  name: string;
  /** Draws the state motif into the left side of the panel. */
  motif: (g: Graphics, sign: Container) => void;
}

/** Crescent moon as one outline: a circle with an offset circle bitten out. Opens toward `tilt`. */
function crescent(g: Graphics, x: number, y: number, R: number, tilt: number, color: number): void {
  const r = R * 0.86, d = R * 0.42;
  const xi = (d * d + R * R - r * r) / (2 * d);
  const yi = Math.sqrt(Math.max(0, R * R - xi * xi));
  const th = Math.atan2(yi, xi), ph = Math.atan2(yi, xi - d);
  const pts: number[] = [];
  const put = (px: number, py: number) => {
    const c = Math.cos(tilt), s = Math.sin(tilt);
    pts.push(x + px * c - py * s, y + px * s + py * c);
  };
  const N = 28;
  for (let k = 0; k <= N; k++) {
    const a = th + ((Math.PI * 2 - 2 * th) * k) / N;
    put(R * Math.cos(a), R * Math.sin(a));
  }
  for (let k = 0; k <= N; k++) {
    const b = Math.PI * 2 - ph - ((Math.PI * 2 - 2 * ph) * k) / N;
    put(d + r * Math.cos(b), r * Math.sin(b));
  }
  g.poly(pts).fill(color);
}

/** The palmetto from the South Carolina flag: a gently tapered trunk under a fan of fronds. */
function flagPalmetto(g: Graphics, x: number, base: number, h: number, color: number): void {
  const ty = base - h * 0.6;
  g.moveTo(x - h * 0.05, base)
    .quadraticCurveTo(x - h * 0.028, base - h * 0.32, x - h * 0.022, ty)
    .lineTo(x + h * 0.022, ty)
    .quadraticCurveTo(x + h * 0.028, base - h * 0.32, x + h * 0.05, base)
    .closePath()
    .fill(color);
  const cy = ty + h * 0.02;
  const leaf = (deg: number, len: number, wid: number, droop: number) => {
    const a = (deg * Math.PI) / 180;
    const tx = x + Math.cos(a) * len, tyy = cy + Math.sin(a) * len + droop;
    const mx = (x + tx) / 2, my = (cy + tyy) / 2;
    const nx = -Math.sin(a) * wid, ny = Math.cos(a) * wid;
    g.moveTo(x, cy).quadraticCurveTo(mx + nx, my + ny, tx, tyy).quadraticCurveTo(mx - nx, my - ny, x, cy).fill(color);
  };
  const L = h * 0.4;
  for (const [deg, k] of [[-160, 0.8], [-140, 0.92], [-118, 1], [-98, 1.04], [-82, 1.04], [-62, 1], [-40, 0.92], [-20, 0.8]] as const) leaf(deg, L * k, h * 0.05, 0);
  // two drooping fronds
  leaf(185, L * 0.78, h * 0.045, h * 0.1);
  leaf(-5, L * 0.78, h * 0.045, h * 0.1);
  g.ellipse(x, cy, h * 0.06, h * 0.045).fill(color);
}

/** Text fitted to the right two-thirds of a welcome panel. */
const WELCOME_TEXT_X = 34;
const WELCOME_TEXT_W = 150;

const WELCOME: Record<StateId, WelcomeLook> = {
  NY: {
    color: 0x1f3f7f,
    name: 'NEW YORK',
    motif: (p) => {
      // the Big Apple
      fruit(p, -74, -62, 32, 0xe5483f);
    },
  },
  NJ: {
    color: 0x2e6f9e,
    name: 'NEW\nJERSEY',
    motif: (p) => {
      // the Garden State: a big sunny flower
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        p.ellipse(-74 + Math.cos(a) * 20, -74 + Math.sin(a) * 20, 12, 12).fill(0xffd166);
      }
      p.circle(-74, -74, 14).fill(0xe8913a);
      p.roundRect(-77, -60, 6, 44, 3).fill(0x4f9a3c);
      p.ellipse(-62, -34, 12, 5).fill(0x4f9a3c);
    },
  },
  MD: {
    color: 0x1f6f7a,
    name: 'MARYLAND',
    motif: (p) => {
      // a friendly blue-crab-turned-red (Maryland's favourite)
      const c = 0xe8652c, x = -74, y = -62;
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) p.moveTo(x + s * 18, y + 4 + k * 5).lineTo(x + s * 36, y + 14 + k * 7).stroke({ width: 4, color: c, cap: 'round' });
        p.moveTo(x + s * 16, y - 8).lineTo(x + s * 28, y - 26).stroke({ width: 5, color: c, cap: 'round' });
        p.circle(x + s * 30, y - 32, 9).fill(c);
        p.poly([x + s * 30, y - 32, x + s * 40, y - 44, x + s * 36, y - 30]).fill(c);
      }
      p.ellipse(x, y, 26, 16).fill(c);
      p.ellipse(x - 8, y - 6, 9, 4).fill({ color: P.white, alpha: 0.35 });
      for (const s of [-1, 1]) {
        p.roundRect(x + s * 7 - 1.5, y - 24, 3, 12, 1.5).fill(c);
        p.circle(x + s * 7, y - 25, 4).fill(P.white);
        p.circle(x + s * 7, y - 25, 2).fill(0x24262a);
      }
    },
  },
  DC: {
    color: 0x23408e,
    name: 'WASHINGTON\nD.C.',
    motif: (p) => {
      // the Monument with the city flag's three stars
      p.poly([-82, -18, -78, -104, -70, -104, -66, -18]).fill(P.white);
      p.poly([-78, -104, -74, -118, -70, -104]).fill(P.white);
      p.rect(-70, -104, 4, 86).fill({ color: P.black, alpha: 0.08 });
      for (const sx of [-102, -74, -46]) {
        const pts: number[] = [];
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const r = k % 2 ? 4 : 9;
          pts.push(sx + Math.cos(a) * r, -126 + 6 + Math.sin(a) * r);
        }
        if (sx !== -74) p.poly(pts).fill(0xe5483f);
      }
      p.roundRect(-112, -24, 76, 6, 3).fill(0xe5483f);
    },
  },
  VA: {
    color: 0x1f4f8a,
    name: 'VIRGINIA',
    motif: (p) => {
      // a dogwood blossom (the state flower)
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k / 4) * Math.PI * 2;
        const cx = -74 + Math.cos(a) * 18, cy = -66 + Math.sin(a) * 18;
        p.ellipse(cx, cy, 16, 16).fill(P.white);
        p.circle(-74 + Math.cos(a) * 31, -66 + Math.sin(a) * 31, 3.5).fill(0xd9667e);
      }
      p.circle(-74, -66, 9).fill(0x9ac05a);
      for (let k = 0; k < 6; k++) p.circle(-74 + Math.cos(k) * 5, -66 + Math.sin(k) * 5, 2).fill(0xf2c94c);
    },
  },
  NC: {
    color: 0x2a5d8a,
    name: 'NORTH\nCAROLINA',
    motif: (p) => {
      // a striped lighthouse on the dunes
      const x = -74;
      p.roundRect(x - 40, -30, 80, 14, 7).fill(0xe8d49a);
      p.poly([x - 13, -30, x - 8, -104, x + 8, -104, x + 13, -30]).fill(P.white);
      for (let k = 0; k < 4; k++) {
        const y0 = -38 - k * 18, y1 = y0 - 9;
        const w0 = 13 - (k * 18 + 8) * 0.067, w1 = w0 - 9 * 0.067;
        p.poly([x - w0, y0, x - w1, y1, x + w1, y1, x + w0, y0]).fill(0x24262a);
      }
      p.roundRect(x - 10, -116, 20, 12, 3).fill(0xfff1a8);
      p.poly([x - 12, -116, x, -128, x + 12, -116]).fill(0x24262a);
    },
  },
  SC: {
    color: P.scBlue,
    name: 'SOUTH\nCAROLINA',
    motif: (p) => {
      // The state flag: crescent up top, palmetto below (white on indigo).
      crescent(p, -94, -110, 11, -0.65, P.white);
      flagPalmetto(p, -70, -20, 96, P.white);
    },
  },
  GA: {
    color: 0x2e6f9e,
    name: 'GEORGIA',
    motif: (p) => {
      fruit(p, -74, -66, 34, 0xffb37a, 0xf26b5b);
    },
  },
  FL: {
    color: 0x1e88c7,
    name: 'FLORIDA',
    motif: (p, sign) => {
      p.circle(-60, -100, 20).fill(0xffd166);
      p.roundRect(-112, -34, 88, 20, 8).fill(0x7fd1f0);
      const tree = new Graphics();
      palmetto(tree, 0, 0, 64, 0.15, 0x2f9e5a);
      tree.position.set(-84, -18);
      sign.addChild(tree);
      const g = new Graphics();
      fruit(g, -44, -40, 13, 0xff9f1c);
      sign.addChild(g);
    },
  },
};

export class WelcomeSign extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number, public state: StateId = 'SC') {
    super(ctx, x, 70);
    const look = WELCOME[state];
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, -50, 0, 22);
    contactShadow(g, 50, 0, 22);
    post(g, -50, -200, 0, 8);
    post(g, 50, -200, 0, 8);
    this.view.addChild(g);
    const p = new Graphics();
    p.roundRect(-120, -140, 240, 140, R.sign).fill(look.color);
    p.roundRect(-114, -134, 228, 128, R.sign - 3).stroke({ width: 3, color: P.white });
    cornerRect(p, -120 + 240 * 0.72, -140, 240 * 0.28, 140, 0, R.sign, R.sign, 0).fill({ color: P.black, alpha: 0.08 });
    this.sign.addChild(p);
    look.motif(p, this.sign);
    const w = fitText('WELCOME TO', 16, WELCOME_TEXT_W);
    w.position.set(WELCOME_TEXT_X, -106);
    const two = look.name.includes('\n');
    const name = signText(look.name, two ? 26 : 30);
    name.style.lineHeight = 27;
    if (name.width > WELCOME_TEXT_W) name.scale.set(WELCOME_TEXT_W / name.width);
    name.position.set(WELCOME_TEXT_X, two ? -56 : -64);
    this.sign.addChild(w, name);
    this.sign.position.set(0, -60);
    this.view.addChild(this.sign);
    this.hits = [{ x: -125, y: -210, w: 250, h: 210 }];
    this.extent = [-300, 300];
  }

  hintTarget(): Container {
    return this.sign;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.sign, 0.08, 0.9, 0.06);
    this.ctx.sfx.chime();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 220, count: 10, shape: 'star', tint: [0xfff27a, P.white, 0x9fd3ff], speed: [80, 240], gravity: 150, life: [0.6, 1.0], size: [8, 14] });
  }
}
