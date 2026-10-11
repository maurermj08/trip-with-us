// Duckies: a giant, friendly roadside gas station (a parody, not the real thing).
// Purely for fun: no fuel, no money.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken } from '../style/palette';
import { block, contactShadow, cornerRect, R, windowGrid } from '../style/shapes';
import { drawDuck } from './duck';
import { signText } from '../signs/Signs';
import { ease } from '../core/Tween';
import { makeRng, rand } from '../core/rng';
import { ROAD_FAR } from '../world/Road';
import { ZONES } from '../world/Route';

const LOT = ROAD_FAR - 4;

export class PylonSign extends Prop {
  private disc = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LOT - 30);
    this.layer = 'back';
    const g = new Graphics();
    g.roundRect(-9, -330, 18, 330, 4).fill(0x8a929b);
    g.rect(3, -330, 6, 330).fill({ color: P.black, alpha: 0.08 });
    g.roundRect(-70, -276, 140, 40, R.sign).fill(P.duckiesRed);
    this.view.addChild(g);
    const name = signText('DUCKIES', 26, P.white, '900');
    name.position.set(0, -256);
    this.view.addChild(name);
    const d = new Graphics();
    d.circle(0, 0, 86).fill(P.duckiesRed);
    d.circle(0, 0, 76).fill(P.white);
    d.circle(0, 0, 70).fill(0xfff4cf);
    const duck = new Graphics();
    drawDuck(duck, 0.78);
    duck.position.set(-6, 6);
    this.disc.addChild(d, duck);
    this.disc.position.set(0, -360);
    this.view.addChild(this.disc);
    this.hits = [{ x: -90, y: -450, w: 180, h: 450 }];
  }
  hintTarget(): Container {
    return this.disc;
  }
  onTap(): void {
    this.ctx.sfx.quack();
    this.ctx.tweens.add(0.9, (p) => (this.disc.scale.x = Math.cos(p * Math.PI * 4)), { ease: ease.outQuad, owner: this.disc, done: () => (this.disc.scale.x = 1) });
  }
}

export class Canopy extends Prop {
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LOT);
    this.layer = 'back';
    const g = new Graphics();
    for (const cx of [-360, 0, 360]) {
      g.roundRect(cx - 14, -270, 28, 270, 4).fill(P.duckiesRed);
      g.rect(cx + 4, -270, 10, 270).fill(P.duckiesRedDark);
      g.roundRect(cx - 22, -10, 44, 12, 4).fill(0xd9d4c7);
    }
    // roof slab hangs over the road
    g.roundRect(-480, -320, 960, 56, R.building).fill(P.duckiesRed);
    cornerRect(g, -480 + 960 * 0.72, -320, 960 * 0.28, 56, 0, R.building, R.building, 0).fill(P.duckiesRedDark);
    g.rect(-480, -292, 960, 12).fill(P.duckYellow);
    g.roundRect(-480, -320, 960, 3, 2).fill({ color: P.white, alpha: 0.45 });
    g.roundRect(-470, -266, 940, 8, 4).fill(0xfff6d8);
    this.view.addChild(g);
    const name = signText('DUCKIES', 22, P.white, '900');
    name.position.set(-300, -304);
    const name2 = signText('DUCKIES', 22, P.white, '900');
    name2.position.set(300, -304);
    this.view.addChild(name, name2);
    this.hits = [{ x: -480, y: -320, w: 960, h: 56 }];
    this.extent = [-700, 700];
  }
  onTap(): void {
    this.ctx.sfx.ding();
    this.ctx.tweens.wobble(this.view, 0.01, 0.6, 0.02);
  }
}

export class Pump extends Prop {
  private nozzle = new Container();
  private body = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LOT);
    this.layer = 'back';
    const g = new Graphics();
    g.roundRect(-46, -8, 92, 10, 4).fill(0xd9d4c7);
    block(g, -26, -112, 52, 104, P.white, { radius: R.building });
    g.roundRect(-26, -112, 52, 22, R.building).fill(P.duckiesRed);
    g.roundRect(-16, -82, 32, 20, 3).fill(0x2b3a48);
    g.roundRect(-12, -78, 18, 4, 2).fill(0x8fe3a2);
    g.roundRect(-16, -54, 32, 6, 3).fill(P.duckYellow);
    const logo = new Graphics();
    drawDuck(logo, 0.16);
    logo.position.set(0, -32);
    this.body.addChild(g, logo);
    const n = new Graphics();
    n.roundRect(0, 0, 8, 30, 3).fill(0x3a3d42);
    n.roundRect(-2, 0, 14, 10, 3).fill(P.duckYellow);
    this.nozzle.addChild(n);
    this.nozzle.position.set(26, -80);
    const hose = new Graphics();
    hose.moveTo(30, -50).quadraticCurveTo(46, -20, 28, -12).stroke({ width: 4, color: 0x3a3d42, cap: 'round' });
    this.body.addChild(hose, this.nozzle);
    this.view.addChild(this.body);
    this.hits = [{ x: -30, y: -115, w: 60, h: 115 }];
  }
  hintTarget(): Container {
    return this.body;
  }
  onTap(): void {
    this.ctx.sfx.glugDing();
    this.ctx.tweens.add(1.2, (p) => (this.nozzle.rotation = Math.sin(p * Math.PI * 6) * 0.4 * (1 - p)), { owner: this.nozzle });
    this.ctx.tweens.wobble(this.body, 0.05, 0.6, 0.06);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 120, count: 10, shape: 'star', tint: [0xfff27a, P.white], speed: [80, 220], gravity: 120, life: [0.6, 1.0], size: [8, 14] });
    const car = this.ctx.car;
    if (Math.abs(car.x - this.x) < 300) {
      this.ctx.carView.flashLights();
      this.ctx.tweens.after(0.6, () =>
        this.ctx.fx.emit(this.ctx.layers.fx, { x: car.x, y: -car.alt - 60, count: 14, shape: 'star', tint: [P.white, 0xbfe6ff], speed: [60, 200], gravity: 60, life: [0.5, 1.0], size: [8, 14], spread: 80 }));
    }
  }
}

/** Red-and-white striped awning with a scalloped edge; top-left at (x, y). */
function stripedAwning(g: Graphics, x: number, y: number, w: number, h: number, stripes: number): void {
  const sw = w / stripes;
  for (let k = 0; k < stripes; k++) {
    const c = k % 2 ? P.white : P.duckiesRed;
    g.rect(x + k * sw, y, sw + 0.5, h).fill(c);
    g.circle(x + k * sw + sw / 2, y + h, sw / 2).fill(c);
  }
  g.roundRect(x - 4, y - 5, w + 8, 7, 3).fill(P.duckiesRedDark);
  g.rect(x + w - w * 0.28, y, w * 0.28, h).fill({ color: P.black, alpha: 0.06 });
}

/** A cuddly duck plush (softer and rounder than the mascot, with a ribbon bow); feet at (0, 0). */
export function drawPlush(g: Graphics): Graphics {
  g.ellipse(0, -2, 18, 4).fill({ color: P.black, alpha: 0.12 });
  // body and a stubby wing
  g.ellipse(-2, -14, 19, 15).fill(P.duckYellow);
  g.ellipse(-8, -13, 9, 7).fill(P.duckYellowDark);
  // head
  g.circle(4, -34, 13).fill(P.duckYellow);
  g.circle(0, -39, 4).fill({ color: P.white, alpha: 0.35 });
  // soft rounded bill and a sleepy-happy eye
  g.roundRect(13, -35, 13, 8, 4).fill(P.duckOrange);
  g.circle(9, -37, 2.2).fill(0x1b1b1b);
  g.circle(5, -31, 3).fill({ color: 0xff8a7a, alpha: 0.5 });
  // ribbon bow at the neck
  g.poly([4, -22, -7, -27, -7, -17]).fill(0xe9637a);
  g.poly([4, -22, 15, -27, 15, -17]).fill(0xe9637a);
  g.circle(4, -22, 3.2).fill(0xd94f68);
  // little tag on the side
  g.roundRect(-20, -12, 7, 9, 2).fill(P.white);
  g.circle(-16.5, -9, 1.6).fill(P.duckiesRed);
  return g;
}

export class Store extends Prop {
  private door = new Container();
  private doorL = new Graphics();
  private doorR = new Graphics();
  private logo = new Container();
  private open = false;
  static readonly W = 1300;
  static readonly H = 230;
  /** The grand entrance portico in the middle of the front. */
  static readonly PORCH_W = 320;
  static readonly PORCH_H = 330;
  private doorX: number;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LOT - 30); // sits just inside the lot's back edge (no gap)
    this.layer = 'back';
    const W = Store.W, H = Store.H;
    const cream = 0xecd9b2, creamShade = 0xdcc69c;
    const g = new Graphics();
    contactShadow(g, W / 2, 0, W * 1.02, 0.12);
    block(g, 0, -H, W, H, cream, { landmark: true, shade: creamShade });
    // stone base and red trim
    g.roundRect(0, -36, W, 36, 4).fill(0xc9b38c);
    g.rect(0, -H + 10, W, 26).fill(P.duckiesRed);
    g.rect(0, -H + 36, W, 6).fill(P.duckYellow);
    // windows, each with a little striped awning
    const rng = makeRng(42);
    for (const wx of [60, 290, 830, 1060]) {
      g.roundRect(wx, -150, 180, 90, 6).fill(0xbfe0f2);
      g.poly([wx + 30, -150, wx + 60, -150, wx + 20, -60, wx - 10 + 10, -60]).fill({ color: P.white, alpha: 0.4 });
      windowGrid(g, wx + 10, -142, 160, 20, rng, { lit: 0.5 });
      g.roundRect(wx - 8, -60, 196, 8, 3).fill(0xd8c7a3);
      stripedAwning(g, wx - 10, -176, 200, 22, 8);
    }
    this.view.addChild(g);

    // ---- the grand entrance portico, centered and taller than the parapet ----
    const cx = W / 2;
    const PW = Store.PORCH_W, PH = Store.PORCH_H;
    const pg = new Graphics();
    contactShadow(pg, cx, 0, PW * 1.15, 0.1);
    block(pg, cx - PW / 2, -PH, PW, PH, 0xf3e3c0, { landmark: true, shade: 0xe3cfa6 });
    // red arched gable with yellow trim
    const gx0 = cx - PW / 2 - 16, gx1 = cx + PW / 2 + 16, gy = -PH + 6;
    pg.moveTo(gx0, gy).quadraticCurveTo(cx, -PH - 120, gx1, gy).quadraticCurveTo(gx1 + 4, gy + 14, gx1 - 8, gy + 14)
      .lineTo(gx0 + 8, gy + 14).quadraticCurveTo(gx0 - 4, gy + 14, gx0, gy).fill(P.duckYellow);
    pg.moveTo(gx0 + 14, gy + 2).quadraticCurveTo(cx, -PH - 98, gx1 - 14, gy + 2).closePath().fill(P.duckiesRed);
    pg.moveTo(cx + 40, -PH - 40).quadraticCurveTo(cx + PW * 0.32, -PH - 22, gx1 - 14, gy + 2).lineTo(cx + 40, gy + 2).closePath().fill(P.duckiesRedDark);
    pg.circle(cx, -PH - 66, 9).fill(P.duckYellow);
    // cornice band under the gable
    pg.roundRect(cx - PW / 2 - 10, -PH + 14, PW + 20, 14, 5).fill(P.duckYellow);
    pg.roundRect(cx - PW / 2 - 10, -PH + 14, PW + 20, 3, 1.5).fill({ color: P.white, alpha: 0.5 });
    // columns with capitals and bases
    for (const colX of [cx - PW / 2 + 22, cx + PW / 2 - 22]) {
      pg.roundRect(colX - 13, -PH + 34, 26, PH - 44, 6).fill(P.white);
      pg.rect(colX + 13 - 26 * 0.28, -PH + 40, 26 * 0.28 - 2, PH - 56).fill({ color: P.black, alpha: 0.06 });
      pg.roundRect(colX - 18, -PH + 28, 36, 12, 4).fill(0xf7f1e3);
      pg.roundRect(colX - 18, -16, 36, 14, 4).fill(0xe8dcc3);
    }
    // door surround: warm glow and transom fan light
    pg.roundRect(cx - 84, -186, 168, 186, 8).fill(0x8a4b32);
    pg.moveTo(cx - 76, -150).quadraticCurveTo(cx, -212, cx + 76, -150).closePath().fill(0xfff2c6);
    for (const k of [-2, -1, 0, 1, 2]) pg.moveTo(cx, -150).lineTo(cx + k * 30, -150 - (36 - Math.abs(k) * 6)).stroke({ width: 3, color: 0x8a4b32, cap: 'round' });
    pg.roundRect(cx - 76, -152, 152, 4, 2).fill(0x8a4b32);
    // scalloped awning over the doors
    stripedAwning(pg, cx - 100, -232, 200, 26, 7);
    // planters with round shrubs and flowers
    for (const px of [cx - PW / 2 - 52, cx + PW / 2 + 52]) {
      contactShadow(pg, px, 0, 70);
      pg.roundRect(px - 30, -34, 60, 34, 6).fill(P.duckiesRed);
      pg.roundRect(px - 30, -34, 60, 6, 3).fill(P.duckiesRedDark);
      pg.circle(px - 12, -46, 20).fill(0x4f9a4a);
      pg.circle(px + 12, -48, 22).fill(0x5aaa52);
      pg.circle(px, -60, 18).fill(0x5aaa52);
      for (const [fx, fy] of [[-14, -54], [8, -62], [16, -44], [-2, -42]]) pg.circle(px + fx, fy, 5).fill(P.duckYellow);
    }
    // welcome mat
    pg.roundRect(cx - 70, -6, 140, 9, 4).fill(P.duckYellow);
    pg.roundRect(cx - 60, -4, 120, 3, 1.5).fill(P.duckiesRed);
    this.view.addChild(pg);

    // the big duck badge, mounted on the portico right over the doors
    const lg = new Graphics();
    lg.circle(0, 0, 66).fill(P.duckYellow);
    lg.circle(0, 0, 60).fill(P.duckiesRed);
    lg.circle(0, 0, 53).fill(0xfff4cf);
    lg.circle(-18, -22, 12).fill({ color: P.white, alpha: 0.35 });
    const duck = new Graphics();
    drawDuck(duck, 0.56);
    duck.position.set(-4, 4);
    this.logo.addChild(lg, duck);
    this.logo.position.set(cx, -PH + 8);
    this.view.addChild(this.logo);

    // the two name panels, symmetric about the entrance
    for (const side of [-1, 1]) {
      const nx = cx + side * 330;
      const name = signText('DUCKIES', 22, P.white, '900');
      name.position.set(nx, -H + 23);
      this.view.addChild(name);
    }

    // wide double glass doors (they slide apart when tapped)
    this.doorX = cx;
    const frame = new Graphics();
    frame.roundRect(-76, -146, 152, 146, 5).fill(0x3b4148);
    frame.roundRect(-70, -140, 140, 140, 4).fill(0xfff2c6);
    for (const [d, sx] of [[this.doorL, -1], [this.doorR, 1]] as const) {
      const x0 = sx < 0 ? -70 : 0;
      d.roundRect(x0, -140, 70, 140, 3).fill(0x3b4148);
      d.roundRect(x0 + 5, -134, 60, 130, 3).fill(0x9fcbe2);
      d.roundRect(x0 + 11, -126, 10, 100, 4).fill({ color: P.white, alpha: 0.4 });
      d.roundRect(sx < 0 ? -12 : 6, -80, 6, 30, 3).fill(0xd9a62c);
    }
    this.door.addChild(frame, this.doorL, this.doorR);
    this.door.position.set(this.doorX, 0);
    this.view.addChild(this.door);

    this.hits = [{ x: 0, y: -PH - 120, w: W, h: PH + 120 }];
    this.extent = [-300, W + 300];
  }

  hintTarget(): Container {
    return this.door;
  }

  onTap(wx: number, wy: number): void {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    if (Math.abs(lx - this.doorX) < 100 && ly > -210) this.openDoor();
    else {
      this.ctx.sfx.quack();
      this.ctx.tweens.wobble(this.logo, 0.15, 0.8, 0.1);
    }
  }

  private openDoor(): void {
    if (this.open) return;
    this.open = true;
    this.ctx.sfx.ding();
    this.ctx.tweens.add(0.35, (p) => {
      this.doorL.x = -62 * p;
      this.doorR.x = 62 * p;
    }, { ease: ease.outQuad });
    this.ctx.tweens.after(0.4, () => this.tossSnack());
    this.ctx.tweens.after(1.6, () => {
      this.ctx.sfx.door();
      this.ctx.tweens.add(0.35, (p) => {
        this.doorL.x = -62 * (1 - p);
        this.doorR.x = 62 * (1 - p);
      }, { ease: ease.outQuad, done: () => (this.open = false) });
    });
  }

  private tossSnack(): void {
    const bag = new Container();
    if (Math.random() < 0.25) {
      // Sometimes it's a cuddly duck plush instead of a snack bag.
      bag.addChild(drawPlush(new Graphics()));
    } else {
      const g = new Graphics();
      const color = [0xe94b3c, 0x2f80d1, 0xf7a23b, 0x4caf50][Math.floor(Math.random() * 4)];
      g.roundRect(-14, -36, 28, 36, 5).fill(color);
      g.roundRect(-14, -36, 28, 6, 3).fill(darken(color, 0.2));
      const d = new Graphics();
      drawDuck(d, 0.12);
      d.position.set(0, -16);
      bag.addChild(g, d);
    }
    const sx = this.view.x + this.doorX, sy = this.view.y - 10;
    bag.position.set(sx, sy);
    this.ctx.layers.fx.addChild(bag);
    this.ctx.sfx.pop();
    const car = this.ctx.car;
    const nearCar = Math.abs(car.x - sx) < 900 && !car.held;
    const tx = nearCar ? car.x : sx + rand(-60, 60);
    const roofY = () => -this.ctx.car.alt + this.ctx.carView.roofPoint().y - 4;
    const ty = nearCar ? roofY() : sy + 40;
    const peak = Math.min(sy, ty) - 220;
    this.ctx.tweens.add(0.9, (p) => {
      const x = sx + ((nearCar ? this.ctx.car.x + this.ctx.carView.roofPoint().x : tx) - sx) * p;
      const yLin = sy + ((nearCar ? roofY() : ty) - sy) * p;
      bag.position.set(x, yLin + (peak - Math.min(sy, ty)) * Math.sin(p * Math.PI));
      bag.rotation = p * Math.PI * 2;
    }, {
      done: () => {
        bag.rotation = 0;
        if (nearCar && this.ctx.carView.roof.children.length < 5) {
          bag.removeFromParent();
          // Line goodies up beside the suitcase (front, back, front…) so they stay visible.
          const k = this.ctx.carView.roof.children.length - 1;
          bag.position.set((k % 2 ? -1 : 1) * (48 + Math.floor(Math.max(0, k) / 2) * 22), 0);
          this.ctx.carView.roof.addChild(bag);
          this.ctx.sfx.boing(1.4);
          this.ctx.carView.bounce(40);
          this.ctx.tweens.wobble(bag, 0.3, 0.6, 0.2);
        } else {
          this.ctx.sfx.thump(0.3);
          this.ctx.tweens.add(1, (p) => (bag.alpha = 1 - p), { delay: 3, done: () => bag.destroy({ children: true }) });
        }
      },
    });
  }
}

export class DuckStatue extends Prop {
  private duck = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LOT - 30); // sits just inside the lot's back edge (no gap)
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 180);
    block(g, -70, -40, 140, 40, 0xbfb4a0, { radius: R.building });
    this.view.addChild(g);
    const d = new Graphics();
    drawDuck(d, 2.0);
    // Feet at the container origin so the squash grows from the pedestal.
    d.position.set(0, -132);
    this.duck.addChild(d);
    this.duck.position.set(0, -40);
    this.view.addChild(this.duck);
    this.hits = [{ x: -100, y: -300, w: 200, h: 300 }];
    this.extent = [-300, 300];
  }
  hintTarget(): Container {
    return this.duck;
  }
  onTap(): void {
    this.ctx.sfx.quack();
    this.ctx.tweens.wobble(this.duck, 0.12, 0.9, 0.18);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y - 200, count: 12, shape: 'feather', tint: [P.duckYellow, 0xfff6c8, P.white],
      speed: [100, 300], angle: [-3, -0.1], gravity: 120, drag: 2, life: [1.0, 1.8], size: [10, 16], spin: 3,
    });
  }
}

/** Builds the whole stop with its left edge at x0 (defaults to the route's Duckies zone). */
export function buildDuckies(ctx: Ctx, x0: number = ZONES.duckies[0]): Prop[] {
  return [
    new PylonSign(ctx, x0 + 450),
    new Canopy(ctx, x0 + 1300),
    new Pump(ctx, x0 + 1120),
    new Pump(ctx, x0 + 1480),
    new Store(ctx, x0 + 1950),
    new DuckStatue(ctx, x0 + 3450),
  ];
}

