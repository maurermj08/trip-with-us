// Florida roadside things: orange trees (oranges drop and bounce), orange crates to drive
// through, a friendly gator in a pond and the Welcome Center OJ stand.
import { Container, Graphics } from 'pixi.js';
import { Prop } from './Prop';
import { Boxes } from './RoadProps';
import { FARM_Z } from './FarmProps';
import type { Ctx } from '../core/Ctx';
import { P } from '../style/palette';
import { contactShadow } from '../style/shapes';
import { ease } from '../core/Tween';
import { rand } from '../core/rng';

const ORANGE = 0xff9f1c;
const ORANGE_DARK = 0xf08a0c;
const LEAF = 0x3f9a4a;
const LEAF_DARK = 0x2f8040;
const TRUNK = 0x8a6a4a;
/** Far-side ground line for grove trees (just behind the fence). */
const GROVE_Y = -80;

/** Draws a round citrus tree, base at (x, y). Returns the orange positions (local). */
export function orangeTree(g: Graphics, x: number, y: number, size: number, oranges = true): [number, number][] {
  g.roundRect(x - size * 0.06, y - size * 0.45, size * 0.12, size * 0.45, size * 0.04).fill(TRUNK);
  const cy = y - size * 0.72;
  g.circle(x - size * 0.22, cy + size * 0.08, size * 0.3).fill(LEAF);
  g.circle(x + size * 0.22, cy + size * 0.08, size * 0.3).fill(LEAF_DARK);
  g.circle(x, cy - size * 0.1, size * 0.36).fill(LEAF);
  g.circle(x + size * 0.12, cy - size * 0.02, size * 0.28).fill({ color: LEAF_DARK, alpha: 0.5 });
  g.ellipse(x - size * 0.12, cy - size * 0.3, size * 0.14, size * 0.06).fill({ color: P.white, alpha: 0.18 });
  const spots: [number, number][] = [];
  if (oranges) {
    for (const [dx, dy] of [[-0.3, 0.1], [-0.08, -0.25], [0.18, -0.12], [0.3, 0.16], [-0.14, 0.2], [0.06, 0.06]]) {
      const ox = x + dx * size, oy = cy + dy * size;
      g.circle(ox, oy, size * 0.06).fill(ORANGE);
      spots.push([ox, oy]);
    }
  }
  return spots;
}

// ---------- Orange tree (tap: oranges drop and bounce, then grow back) ----------
export class OrangeTree extends Prop {
  private canopy = new Container();
  private busy = false;
  private spots: [number, number][];

  constructor(ctx: Ctx, x: number, private size = 130) {
    super(ctx, x, GROVE_Y);
    this.layer = 'back';
    this.view.zIndex = FARM_Z.cow;
    const g = new Graphics();
    contactShadow(g, 0, 0, size * 0.8);
    this.spots = orangeTree(g, 0, 0, size);
    this.canopy.addChild(g);
    this.canopy.pivot.set(0, -size * 0.2);
    this.canopy.position.set(0, -size * 0.2);
    this.view.addChild(this.canopy);
    this.hits = [{ x: -size * 0.6, y: -size * 1.1, w: size * 1.2, h: size * 1.1 }];
    this.extent = [-400, 400];
  }

  hintTarget(): Container {
    return this.canopy;
  }

  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.tweens.wobble(this.canopy, 0.06, 0.7, 0.05);
    if (this.busy) return;
    this.busy = true;
    const picks = this.spots.slice(0, 3);
    picks.forEach(([ox, oy], i) => {
      const o = new Graphics().circle(0, 0, this.size * 0.07).fill(ORANGE);
      o.circle(-2, -2, this.size * 0.02).fill({ color: P.white, alpha: 0.5 });
      o.position.set(ox, oy);
      this.view.addChild(o);
      const vx = rand(-60, 60);
      // Drop, bounce twice and roll a little, then fade.
      this.ctx.tweens.add(1.2, (p) => {
        if (o.destroyed) return;
        const b = Math.abs(Math.cos(p * Math.PI * 2.5)) * (1 - p);
        o.y = oy + (-4 - oy) * Math.min(1, p * 2.2) - b * 26 * (p > 0.45 ? 1 : 0);
        o.x = ox + vx * p;
        o.rotation = p * 6;
      }, { delay: i * 0.18, done: () => i === 0 && this.ctx.sfx.boing(1.6) });
      this.ctx.tweens.add(0.6, (p) => !o.destroyed && (o.alpha = 1 - p), {
        delay: 3 + i * 0.1,
        done: () => {
          if (!o.destroyed) o.destroy();
          if (i === picks.length - 1) this.busy = false;
        },
      });
    });
  }
}

// ---------- Orange crates on the road (drive through: oranges everywhere) ----------
export class OrangeCrate extends Boxes {
  constructor(ctx: Ctx, x: number, n = 3) {
    super(ctx, x, n, true);
  }
}

// ---------- A friendly gator in a pond ----------
export class Gator extends Prop {
  private head = new Container();
  private jaw = new Graphics();
  private frog = new Container();
  private busy = false;
  private t = rand(0, 5);

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, -74);
    this.layer = 'back';
    this.view.zIndex = FARM_Z.cow;
    const g = new Graphics();
    // pond with reeds and a lily pad
    g.ellipse(0, 0, 220, 26).fill(0x5bb6d6);
    g.ellipse(-40, -6, 120, 8).fill({ color: P.white, alpha: 0.25 });
    for (const rx of [-210, -196, 196, 210, 184]) g.roundRect(rx - 2, -46, 4, 46, 2).fill(0x6aa84f);
    g.roundRect(-212, -60, 7, 22, 3.5).fill(0x8a5a33);
    g.roundRect(192, -58, 7, 20, 3.5).fill(0x8a5a33);
    g.ellipse(130, -2, 30, 8).fill(0x5fae4e);
    this.view.addChild(g);

    // gator: a long back with ridges just above the water, head on the right
    const body = new Graphics();
    body.roundRect(-120, -16, 170, 22, 11).fill(0x5aa357);
    for (let k = 0; k < 6; k++) body.circle(-104 + k * 26, -16, 7).fill(0x4a8f48);
    body.roundRect(-160, -8, 60, 12, 6).fill(0x5aa357);
    this.view.addChild(body);
    // head with jaw (characters may have faces)
    const h = new Graphics();
    h.roundRect(0, -26, 96, 22, 11).fill(0x5aa357);
    h.circle(16, -30, 12).fill(0x5aa357);
    h.circle(17, -32, 7.5).fill(P.white);
    h.circle(19, -31, 4).fill(0x24262a);
    h.circle(90, -22, 2.5).fill(0x2f5f2f);
    for (let k = 0; k < 4; k++) h.poly([34 + k * 14, -5, 42 + k * 14, -5, 38 + k * 14, 1]).fill(P.white);
    this.jaw.roundRect(0, 0, 92, 14, 7).fill(0x4a8f48);
    this.jaw.pivot.set(0, 0);
    this.jaw.position.set(2, -6);
    this.head.addChild(this.jaw, h);
    this.head.position.set(40, 0);
    this.head.pivot.set(0, 0);
    this.view.addChild(this.head);
    // frog on the lily pad
    const f = new Graphics();
    f.ellipse(0, -8, 11, 8).fill(0x7cc657);
    f.circle(-5, -15, 4).fill(0x7cc657);
    f.circle(5, -15, 4).fill(0x7cc657);
    f.circle(-5, -16, 2).fill(0x24262a);
    f.circle(5, -16, 2).fill(0x24262a);
    this.frog.addChild(f);
    this.frog.position.set(130, -4);
    this.view.addChild(this.frog);
    this.hits = [{ x: -220, y: -70, w: 440, h: 90 }];
    this.extent = [-600, 600];
  }

  hintTarget(): Container {
    return this.head;
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    const { sfx, tweens } = this.ctx;
    // Head rises, jaw opens and snaps twice ("chomp chomp"), then the frog hops away and back.
    tweens.add(0.3, (p) => !this.head.destroyed && (this.head.rotation = -0.35 * p), { ease: ease.outBack });
    tweens.add(0.5, (p) => !this.jaw.destroyed && (this.jaw.rotation = Math.abs(Math.sin(p * Math.PI * 2)) * 0.6), { delay: 0.25, done: () => sfx.chomp() });
    tweens.add(0.4, (p) => !this.head.destroyed && (this.head.rotation = -0.35 * (1 - p)), { delay: 1.0 });
    const fx0 = this.frog.x;
    tweens.add(0.6, (p) => {
      if (this.frog.destroyed) return;
      this.frog.x = fx0 + 120 * p;
      this.frog.y = -4 - Math.sin(p * Math.PI) * 60;
    }, { delay: 0.35, done: () => sfx.plip() });
    tweens.add(0.6, (p) => {
      if (this.frog.destroyed) return;
      this.frog.x = fx0 + 120 * (1 - p);
      this.frog.y = -4 - Math.sin(p * Math.PI) * 40;
    }, { delay: 2.2, done: () => (this.busy = false) });
    this.ctx.fx.emit(this.ctx.layers.fxBack, { x: this.x + 100, y: this.y - 10, count: 8, shape: 'drop', tint: [0x5bb6d6, P.white], speed: [80, 220], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.7], size: [6, 10], rotate: false });
  }

  update(dt: number): void {
    // Lazy bob in the water.
    this.t += dt;
    if (!this.busy) this.head.y = Math.sin(this.t * 1.6) * 2;
  }
}

// ---------- Florida Welcome Center OJ stand ----------
export class OjStand extends Prop {
  private cups: Graphics[] = [];
  private sign = new Container();
  private next = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, -70);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 240);
    // counter
    g.roundRect(-110, -70, 220, 70, 8).fill(0xfff1d6);
    g.roundRect(-110, -70, 220, 10, 5).fill(0xf2d3a2);
    g.rect(110 - 220 * 0.28, -60, 220 * 0.28, 60).fill({ color: P.black, alpha: 0.06 });
    g.circle(-60, -34, 16).fill(ORANGE);
    g.circle(0, -34, 16).fill(ORANGE);
    g.circle(60, -34, 16).fill(ORANGE);
    // posts and striped awning
    g.roundRect(-104, -170, 8, 100, 3).fill(P.white);
    g.roundRect(96, -170, 8, 100, 3).fill(P.white);
    for (let k = 0; k < 8; k++) g.roundRect(-126 + k * 31.5, -184, 31.5, 34, k === 0 ? 6 : 0).fill(k % 2 ? P.white : ORANGE);
    for (let k = 0; k < 8; k++) g.circle(-110 + k * 31.5, -150, 15.75).fill(k % 2 ? P.white : ORANGE);
    this.view.addChild(g);
    // a few cups of OJ on the counter
    for (let k = 0; k < 4; k++) {
      const c = new Graphics();
      c.roundRect(-8, -24, 16, 24, 3).fill({ color: P.white, alpha: 0.9 });
      c.roundRect(-6, -18, 12, 16, 2).fill(ORANGE);
      c.position.set(-75 + k * 50, -70);
      this.cups.push(c);
      this.view.addChild(c);
    }
    // big orange on a pole as the sign
    const s = new Graphics();
    s.roundRect(-4, -110, 8, 110, 3).fill(P.signPost);
    s.circle(0, -130, 34).fill(ORANGE);
    s.circle(12, -142, 8).fill({ color: P.white, alpha: 0.4 });
    s.ellipse(14, -166, 14, 6).fill(LEAF);
    s.circle(-10, -122, 18).fill({ color: ORANGE_DARK, alpha: 0.35 });
    this.sign.addChild(s);
    this.sign.position.set(170, 0);
    this.view.addChild(this.sign);
    this.hits = [{ x: -130, y: -200, w: 340, h: 200 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.sign;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.sign, 0.12, 0.8, 0.08);
    this.ctx.sfx.glugDing();
    const cup = this.cups[this.next % this.cups.length];
    this.next++;
    // A cup of OJ hops up to the car, with sparkles when it arrives.
    const sx = this.x + cup.x, sy = this.y + cup.y;
    const flyer = new Graphics();
    flyer.roundRect(-8, -24, 16, 24, 3).fill({ color: P.white, alpha: 0.95 });
    flyer.roundRect(-6, -18, 12, 16, 2).fill(ORANGE);
    flyer.roundRect(2, -34, 3, 16, 1.5).fill(0xf25f5c);
    this.ctx.layers.fx.addChild(flyer);
    cup.alpha = 0;
    this.ctx.tweens.add(0.9, (p) => {
      if (flyer.destroyed) return;
      const car = this.ctx.car;
      const tx = car.x, ty = -car.alt - 120;
      flyer.position.set(sx + (tx - sx) * p, sy + (ty - sy) * p - Math.sin(p * Math.PI) * 160);
      flyer.rotation = p * Math.PI * 2;
    }, {
      ease: ease.inOutSine,
      done: () => {
        this.ctx.fx.emit(this.ctx.layers.fx, { x: flyer.x, y: flyer.y, count: 10, shape: 'star', tint: [ORANGE, 0xffd166, P.white], speed: [80, 240], gravity: 300, life: [0.5, 0.9], size: [8, 14] });
        this.ctx.sfx.sparkle();
        flyer.destroy();
        this.ctx.tweens.add(0.4, (p) => !cup.destroyed && (cup.alpha = p), { delay: 1.5 });
      },
    });
  }
}
