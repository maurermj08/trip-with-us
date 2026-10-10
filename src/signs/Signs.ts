// Road signs: mile markers, Interstate 95 shield, green guide sign,
// Duckies billboard and the South Carolina welcome sign.
import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
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

// ---------- Mile marker (counts down 10 → 1) ----------
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
    greenPanel(p, -21, -46, 42, 58);
    this.sign.addChild(p);
    const t = signText(String(n), n >= 10 ? 24 : 30);
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
    this.ctx.sfx.pluck(10 - this.n + 2, 0.18);
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

export class InterstateShield extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number) {
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
    const num = signText('95', 40);
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

// ---------- Green guide sign: Charleston exit ----------
export class GuideSign extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 70);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, -70, 0, 24);
    contactShadow(g, 70, 0, 24);
    post(g, -70, -300, 0, 9);
    post(g, 70, -300, 0, 9);
    this.view.addChild(g);

    const p = new Graphics();
    greenPanel(p, -150, -150, 300, 150);
    // exit tab on top right
    p.roundRect(40, -186, 110, 40, R.sign).fill(P.signGreen);
    p.roundRect(45, -181, 100, 34, R.sign - 3).stroke({ width: 3, color: P.white });
    // up-right arrow
    const ax = 108, ay = -50;
    p.moveTo(ax - 20, ay + 22).lineTo(ax + 12, ay - 10).stroke({ width: 7, color: P.white, cap: 'round' });
    p.poly([ax + 20, ay - 18, ax + 20, ay + 6, ax - 4, ay - 18]).fill(P.white);
    this.sign.addChild(p);
    const exit = signText('EXIT 221', 20);
    exit.position.set(95, -163);
    const i26 = new Graphics();
    drawShield(i26, 0.62);
    i26.position.set(-100, -66);
    const n26 = signText('26', 20);
    n26.position.set(-100, -84);
    const city = signText('Charleston', 36);
    city.position.set(-6, -110);
    this.sign.addChild(exit, i26, n26, city);
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

// ---------- Duckies billboard (far side, on tall poles) ----------
export class Billboard extends Prop {
  private board = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, -78);
    this.layer = 'back';
    const g = new Graphics();
    for (const px of [-150, 0, 150]) post(g, px, -170, 0, 12);
    g.roundRect(-250, -182, 500, 8, 3).fill(darken(P.signPost, 0.1));
    this.view.addChild(g);

    const b = new Graphics();
    b.roundRect(-260, -230, 520, 220, R.sign).fill(P.duckYellow);
    cornerRect(b, -260 + 520 * 0.72, -230, 520 * 0.28, 220, 0, R.sign, R.sign, 0).fill(P.duckYellowDark);
    b.roundRect(-260, -230, 520, 3, 2).fill({ color: P.white, alpha: 0.45 });
    b.roundRect(-245, -60, 490, 40, 6).fill(P.duckiesRed);
    this.board.addChild(b);
    const duck = new Graphics();
    drawDuck(duck, 0.95);
    duck.position.set(-170, -95);
    this.board.addChild(duck);
    const name = signText('DUCKIES', 64, P.duckiesRed, '900');
    name.position.set(70, -165);
    const tag = signText('NEXT EXIT  ·  CLEAN RESTROOMS', 18, P.white);
    tag.position.set(0, -40);
    // little gas pump icon
    const pump = new Graphics();
    pump.roundRect(150, -125, 26, 40, 4).fill(P.duckiesRed);
    pump.roundRect(155, -120, 16, 11, 2).fill(P.white);
    pump.roundRect(176, -112, 10, 4, 2).fill(P.duckiesRed);
    pump.roundRect(184, -112, 4, 24, 2).fill(P.duckiesRed);
    this.board.addChild(name, tag, pump);
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
    this.ctx.sfx.quack();
  }
}

// ---------- Welcome to South Carolina ----------
export class WelcomeSign extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 70);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, -50, 0, 22);
    contactShadow(g, 50, 0, 22);
    post(g, -50, -200, 0, 8);
    post(g, 50, -200, 0, 8);
    this.view.addChild(g);
    const p = new Graphics();
    p.roundRect(-120, -140, 240, 140, R.sign).fill(P.scBlue);
    p.roundRect(-114, -134, 228, 128, R.sign - 3).stroke({ width: 3, color: P.white });
    cornerRect(p, -120 + 240 * 0.72, -140, 240 * 0.28, 140, 0, R.sign, R.sign, 0).fill({ color: P.black, alpha: 0.08 });
    // palmetto + crescent (state flag motif) in white
    const tree = new Graphics();
    palmetto(tree, 0, 0, 70, 0, P.white);
    tree.position.set(-72, -22);
    p.moveTo(-100, -122).arc(-92, -116, 10, Math.PI * 0.85, Math.PI * 1.95).quadraticCurveTo(-94, -112, -100, -122).fill(P.white);
    this.sign.addChild(p, tree);
    const w = signText('WELCOME TO', 16);
    w.position.set(28, -104);
    const sc = signText('SOUTH\nCAROLINA', 28);
    sc.style.lineHeight = 28;
    sc.position.set(28, -58);
    this.sign.addChild(w, sc);
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
