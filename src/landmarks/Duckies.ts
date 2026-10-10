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

class PylonSign extends Prop {
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

class Canopy extends Prop {
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

class Pump extends Prop {
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

class Store extends Prop {
  private door = new Container();
  private doorL = new Graphics();
  private doorR = new Graphics();
  private logo = new Container();
  private open = false;
  static readonly W = 1300;
  static readonly H = 230;
  private doorX: number;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LOT - 36);
    this.layer = 'back';
    const W = Store.W, H = Store.H;
    const g = new Graphics();
    contactShadow(g, W / 2, 0, W * 1.02, 0.12);
    block(g, 0, -H, W, H, 0xecd9b2, { landmark: true, shade: 0xdcc69c });
    // stone base and red trim
    g.roundRect(0, -36, W, 36, 4).fill(0xc9b38c);
    g.rect(0, -H + 10, W, 26).fill(P.duckiesRed);
    g.rect(0, -H + 36, W, 6).fill(P.duckYellow);
    // windows
    const rng = makeRng(42);
    for (const wx of [60, 300, 820, 1060]) {
      g.roundRect(wx, -150, 180, 90, 6).fill(0xbfe0f2);
      g.poly([wx + 30, -150, wx + 60, -150, wx + 20, -60, wx - 10 + 10, -60]).fill({ color: P.white, alpha: 0.4 });
      windowGrid(g, wx + 10, -142, 160, 20, rng, { lit: 0.5 });
    }
    this.view.addChild(g);

    // big logo on the parapet
    const lg = new Graphics();
    lg.circle(0, 0, 70).fill(P.duckiesRed);
    lg.circle(0, 0, 62).fill(0xfff4cf);
    const duck = new Graphics();
    drawDuck(duck, 0.62);
    duck.position.set(-4, 6);
    this.logo.addChild(lg, duck);
    this.logo.position.set(W / 2, -H - 20);
    this.view.addChild(this.logo);
    const name = signText('DUCKIES', 22, P.white, '900');
    name.position.set(W / 2 - 250, -H + 23);
    const name2 = signText('DUCKIES', 22, P.white, '900');
    name2.position.set(W / 2 + 250, -H + 23);
    this.view.addChild(name, name2);

    // double glass door
    this.doorX = W / 2;
    const frame = new Graphics();
    frame.roundRect(-58, -126, 116, 126, 5).fill(0x3b4148);
    frame.roundRect(-52, -120, 104, 120, 4).fill(0xfff2c6);
    this.doorL.roundRect(-52, -120, 52, 120, 3).fill(0x9fcbe2);
    this.doorL.roundRect(-46, -112, 10, 90, 4).fill({ color: P.white, alpha: 0.4 });
    this.doorR.roundRect(0, -120, 52, 120, 3).fill(0x9fcbe2);
    this.doorR.roundRect(8, -112, 10, 90, 4).fill({ color: P.white, alpha: 0.4 });
    this.door.addChild(frame, this.doorL, this.doorR);
    this.door.position.set(this.doorX, 0);
    this.view.addChild(this.door);

    this.hits = [{ x: 0, y: -H - 90, w: W, h: H + 90 }];
    this.extent = [-300, W + 300];
  }

  hintTarget(): Container {
    return this.door;
  }

  onTap(wx: number): void {
    const lx = wx - this.view.x;
    if (Math.abs(lx - this.doorX) < 90) this.openDoor();
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
      this.doorL.x = -48 * p;
      this.doorR.x = 48 * p;
    }, { ease: ease.outQuad });
    this.ctx.tweens.after(0.4, () => this.tossSnack());
    this.ctx.tweens.after(1.6, () => {
      this.ctx.sfx.door();
      this.ctx.tweens.add(0.35, (p) => {
        this.doorL.x = -48 * (1 - p);
        this.doorR.x = 48 * (1 - p);
      }, { ease: ease.outQuad, done: () => (this.open = false) });
    });
  }

  private tossSnack(): void {
    const bag = new Container();
    const g = new Graphics();
    const color = [0xe94b3c, 0x2f80d1, 0xf7a23b, 0x4caf50][Math.floor(Math.random() * 4)];
    g.roundRect(-14, -36, 28, 36, 5).fill(color);
    g.roundRect(-14, -36, 28, 6, 3).fill(darken(color, 0.2));
    const d = new Graphics();
    drawDuck(d, 0.12);
    d.position.set(0, -16);
    bag.addChild(g, d);
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
          bag.position.set(30 + this.ctx.carView.roof.children.length * 4, 0);
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

class DuckStatue extends Prop {
  private duck = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LOT - 36);
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

