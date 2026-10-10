// Road signs: mile markers, interstate / US route shields, green guide signs,
// billboards and the state welcome signs. All are parameterized; defaults reproduce the MVP signs.
import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import type { BillboardDesign, Placement, StateId } from '../world/Route';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken } from '../style/palette';
import { R, contactShadow, cornerRect, palmetto } from '../style/shapes';
import { drawDuck } from '../landmarks/duck';

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

// ---------- Interstate 95 shield ----------
export function drawShield(g: Graphics, s: number): void {
  // Classic shield outline: flat-ish top with a dip, curved sides tapering to a point.
  const w = 70 * s, h = 76 * s;
  const shape = (inset: number) => {
    const x0 = -w / 2 + inset, x1 = w / 2 - inset, y0 = -h + inset, y1 = -inset * 0.6;
    g.moveTo(x0, y0 + 6 * s)
      .quadraticCurveTo(x0 * 0.5, y0 - 3 * s, 0, y0 + 5 * s)
      .quadraticCurveTo(x1 * 0.5, y0 - 3 * s, x1, y0 + 6 * s)
      .quadraticCurveTo(x1 + 4 * s, y0 + h * 0.55, 0, y1)
      .quadraticCurveTo(x0 - 4 * s, y0 + h * 0.55, x0, y0 + 6 * s)
      .closePath();
  };
  shape(0);
  g.fill(P.white);
  shape(4 * s);
  g.fill(P.shieldBlue);
  // red top band
  const x0 = -w / 2 + 4 * s, x1 = w / 2 - 4 * s, y0 = -h + 4 * s;
  g.moveTo(x0, y0 + 6 * s)
    .quadraticCurveTo(x0 * 0.5, y0 - 3 * s, 0, y0 + 5 * s)
    .quadraticCurveTo(x1 * 0.5, y0 - 3 * s, x1, y0 + 6 * s)
    .lineTo(x1 + 0.6 * s, y0 + 20 * s)
    .lineTo(x0 - 0.6 * s, y0 + 20 * s)
    .closePath()
    .fill(P.shieldRed);
  g.rect(x0, y0 + 20 * s, x1 - x0, 2.5 * s).fill(P.white);
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
  const t = signText(num, (num.length >= 3 ? 24 : 32) * s, us ? 0x24262a : P.white);
  t.position.set(0, us ? -36 * s : -34 * s);
  c.addChild(t);
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
    const sg = new Graphics();
    drawShield(sg, 1.25);
    this.sign.addChild(sg);
    const top = signText('INTERSTATE', 8.5);
    top.position.set(0, -82);
    const num = signText(route, route.length >= 3 ? 30 : 40);
    num.position.set(0, -42);
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
  charleston: 'Charleston',
  savannah: 'Savannah',
  jacksonville: 'Jacksonville',
  orlando: 'Orlando',
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

    const name = GUIDE_NAMES[city];
    const nameSize = name.length > 10 ? 30 : 36;
    const p = new Graphics();
    greenPanel(p, -150, -150, 300, 150);
    // exit tab on top right
    p.roundRect(40, -186, 110, 40, R.sign).fill(P.signGreen);
    p.roundRect(45, -181, 100, 34, R.sign - 3).stroke({ width: 3, color: P.white });
    // up-right arrow
    const ax = 108, ay = -50;
    p.moveTo(ax - 20, ay + 22).lineTo(ax + 12, ay - 10).stroke({ width: 7, color: P.white, cap: 'round' });
    p.poly([ax + 20, ay - 18, ax + 20, ay + 6, ax - 4, ay - 18]).fill(P.white);
    if (city === 'airport') planeIcon(p, -96, -64, 1.1);
    this.sign.addChild(p);
    const exit = signText(`EXIT ${exitNo}`, exitNo.length > 3 ? 18 : 20);
    exit.position.set(95, -163);
    this.sign.addChild(exit);
    if (shield) {
      const m = routeMarker(shield, 0.62);
      m.position.set(-100, -66);
      this.sign.addChild(m);
    }
    const label = signText(name, nameSize);
    label.position.set(-6, -110);
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

const BOARDS: Record<BillboardDesign, (c: Container) => void> = {
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
    BOARDS[design](this.board);
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
      case 'peaches': sfx.pop(); fxAt([0xffc48a, 0xf26b5b]); break;
      case 'oj': sfx.glugDing(); fxAt([0xff9f1c, 0xffd166]); break;
      case 'chomp': sfx.chomp(); break;
      case 'potato': sfx.sparkle(); fxAt([0xffd166, P.white], 'star'); break;
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

const WELCOME: Record<StateId, WelcomeLook> = {
  SC: {
    color: P.scBlue,
    name: 'SOUTH\nCAROLINA',
    motif: (p, sign) => {
      // palmetto + crescent (state flag motif) in white
      const tree = new Graphics();
      palmetto(tree, 0, 0, 70, 0, P.white);
      tree.position.set(-72, -22);
      p.moveTo(-100, -122).arc(-92, -116, 10, Math.PI * 0.85, Math.PI * 1.95).quadraticCurveTo(-94, -112, -100, -122).fill(P.white);
      sign.addChild(tree);
    },
  },
  GA: {
    color: 0x2e6f9e,
    name: 'GEORGIA',
    motif: (p) => {
      fruit(p, -72, -64, 36, 0xffb37a, 0xf26b5b);
    },
  },
  FL: {
    color: 0x1e88c7,
    name: 'FLORIDA',
    motif: (p, sign) => {
      p.circle(-60, -96, 22).fill(0xffd166);
      p.roundRect(-114, -34, 92, 22, 8).fill(0x7fd1f0);
      const tree = new Graphics();
      palmetto(tree, 0, 0, 64, 0.15, 0x2f9e5a);
      tree.position.set(-82, -16);
      sign.addChild(tree);
      const g = new Graphics();
      fruit(g, -42, -40, 14, 0xff9f1c);
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
    const w = signText('WELCOME TO', 16);
    w.position.set(28, -104);
    const two = look.name.includes('\n');
    const name = signText(look.name, two ? 28 : look.name.length > 7 ? 27 : 30);
    name.style.lineHeight = 28;
    name.position.set(28, two ? -58 : -66);
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
