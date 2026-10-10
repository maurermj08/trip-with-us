// Home: where every trip starts. House, big tree, mailbox and the suitcase to load.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken } from '../style/palette';
import { block, contactShadow, cornerRect, roundTree } from '../style/shapes';
import { ease } from '../core/Tween';
import { ROAD_FAR } from '../world/Road';

const YARD = ROAD_FAR - 16;

class House extends Prop {
  private door = new Graphics();
  private windows: { g: Graphics; lit: boolean; x: number; y: number }[] = [];
  private doorOpen = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, YARD);
    this.layer = 'back';
    const W = 380, H = 190;
    const g = new Graphics();
    contactShadow(g, W / 2, 0, W * 1.05);
    // garage wing
    block(g, W - 20, -110, 150, 110, 0xf2e2b8);
    g.roundRect(W + 10, -86, 100, 86, 4).fill(0xfdf6e3);
    for (let k = 1; k < 4; k++) g.rect(W + 10, -86 + k * 21, 100, 2).fill({ color: P.black, alpha: 0.07 });
    g.poly([W - 30, -106, W + 55, -150, W + 140, -106]).fill(0x6e7b8b);
    // main house
    block(g, 0, -H, W, H, 0xf7e7bd);
    // roof
    g.moveTo(-18, -H + 4)
      .lineTo(W / 2 - 10, -H - 104)
      .quadraticCurveTo(W / 2, -H - 110, W / 2 + 10, -H - 104)
      .lineTo(W + 18, -H + 4)
      .quadraticCurveTo(W + 20, -H + 10, W + 12, -H + 10)
      .lineTo(-12, -H + 10)
      .quadraticCurveTo(-20, -H + 10, -18, -H + 4)
      .fill(0x6e7b8b);
    // chimney
    block(g, W * 0.72, -H - 96, 34, 60, 0xb5604c, { radius: 3, landmark: true });
    // porch
    g.roundRect(W / 2 - 80, -12, 160, 12, 3).fill(0xe9e2d0);
    g.roundRect(W / 2 - 86, -96, 172, 10, 3).fill(0x7e8a99);
    for (const px of [W / 2 - 78, W / 2 + 72]) g.roundRect(px, -88, 6, 76, 2).fill(P.white);
    this.view.addChild(g);

    // windows (tap to toggle the lights)
    const wins: [number, number][] = [[40, -150], [130, -150], [250, -150], [320, -150], [40, -78], [300, -78]];
    for (const [wx, wy] of wins) {
      const wg = new Graphics();
      const lit = wx === 250 && wy === -150;
      this.drawWindow(wg, lit);
      wg.position.set(wx, wy);
      this.view.addChild(wg);
      this.windows.push({ g: wg, lit, x: wx, y: wy });
    }
    // door
    this.door.roundRect(0, 0, 44, 72, 4).fill(0xc8463c);
    this.door.circle(36, 38, 3).fill(0xf2c94c);
    this.door.position.set(W / 2 - 22, -84);
    const doorway = new Graphics().roundRect(W / 2 - 22, -84, 44, 72, 4).fill(0x4a3a30);
    doorway.roundRect(W / 2 - 18, -80, 36, 30, 3).fill({ color: P.warmWindow, alpha: 0.8 });
    this.view.addChild(doorway, this.door);
    this.hits = [{ x: -20, y: -H - 110, w: W + 170, h: H + 110 }];
    this.extent = [-200, 800];
  }

  private drawWindow(g: Graphics, lit: boolean): void {
    g.clear();
    g.roundRect(-4, -4, 52, 56, 4).fill(P.white);
    g.roundRect(0, 0, 44, 48, 3).fill(lit ? P.warmWindow : 0xbfe0f2);
    g.rect(20.5, 0, 3, 48).fill(P.white);
    g.rect(0, 22.5, 44, 3).fill(P.white);
    if (!lit) g.poly([6, 2, 14, 2, 4, 20, -2 + 2, 20]).fill({ color: P.white, alpha: 0.5 });
    g.roundRect(-12, -4, 8, 56, 2).fill(0x5d7d9a);
    g.roundRect(48, -4, 8, 56, 2).fill(0x5d7d9a);
  }

  hintTarget(): Container {
    return this.door;
  }

  onTap(wx: number, wy: number): void {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    for (const w of this.windows) {
      if (lx > w.x - 16 && lx < w.x + 60 && ly > w.y - 10 && ly < w.y + 58) {
        w.lit = !w.lit;
        this.drawWindow(w.g, w.lit);
        this.ctx.sfx.pluck(w.lit ? 7 : 4, 0.14);
        this.ctx.tweens.wobble(w.g, 0.06, 0.4, 0.1);
        return;
      }
    }
    if (Math.abs(lx - 190) < 40 && ly > -90) {
      if (this.doorOpen) return;
      this.doorOpen = true;
      this.ctx.sfx.knock();
      this.ctx.tweens.add(0.3, (p) => (this.door.scale.x = 1 - p * 0.8), { ease: ease.outQuad, delay: 0.3 });
      this.ctx.tweens.add(0.3, (p) => (this.door.scale.x = 0.2 + p * 0.8), {
        ease: ease.outQuad, delay: 1.5, done: () => { this.doorOpen = false; this.ctx.sfx.door(); },
      });
      return;
    }
    this.ctx.sfx.thump(0.3);
    this.ctx.tweens.wobble(this.view, 0.015, 0.5, 0.03);
  }
}

class BigTree extends Prop {
  private crown = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, YARD);
    this.layer = 'back';
    const g = new Graphics();
    roundTree(g, 0, 0, 260, P.leaf);
    this.crown.addChild(g);
    this.view.addChild(this.crown);
    this.hits = [{ x: -110, y: -300, w: 220, h: 300 }];
  }
  hintTarget(): Container {
    return this.crown;
  }
  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.tweens.wobble(this.crown, 0.05, 0.8, 0.05);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y - 200, count: 10, shape: 'feather', tint: [P.leaf, P.leafLight, 0xa8d86e],
      speed: [40, 160], angle: [-3, 0], gravity: 160, drag: 2.5, life: [1.2, 2.2], size: [10, 16], spin: 4, spread: 80,
    });
  }
}

class Mailbox extends Prop {
  private flag = new Graphics();
  private up = false;
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 64);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, 0, 0, 30);
    g.roundRect(-4, -70, 8, 70, 2).fill(0x8a6a4a);
    g.roundRect(-26, -100, 52, 34, 14).fill(0x2f6db2);
    g.roundRect(-26, -84, 52, 18, 4).fill(0x2f6db2);
    g.roundRect(-22, -98, 40, 3, 1.5).fill({ color: P.white, alpha: 0.4 });
    this.flag.roundRect(-2, -26, 4, 26, 2).fill(0xd23b3b);
    this.flag.roundRect(-2, -26, 14, 10, 2).fill(0xd23b3b);
    this.flag.position.set(20, -80);
    this.flag.rotation = Math.PI / 2;
    this.view.addChild(g, this.flag);
    this.hits = [{ x: -30, y: -110, w: 60, h: 110 }];
  }
  onTap(): void {
    this.up = !this.up;
    const from = this.flag.rotation, to = this.up ? 0 : Math.PI / 2;
    this.ctx.tweens.add(0.4, (p) => (this.flag.rotation = from + (to - from) * p), { ease: ease.outBack });
    this.ctx.sfx.ding();
    this.ctx.tweens.wobble(this.view, 0.06, 0.5, 0.05);
  }
}

/** The suitcase hops onto the roof rack when tapped, or chases the car if it leaves without it. */
export class Suitcase extends Prop {
  readonly bag = new Container();
  loaded = false;
  private flying = false;
  private chasing = false;
  private alt = 0;
  private hopT = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 58);
    this.layer = 'front';
    const g = new Graphics();
    g.roundRect(-34, -50, 68, 50, 8).fill(0x2fa3a0);
    cornerRect(g, 34 - 68 * 0.28, -50, 68 * 0.28, 50, 0, 8, 8, 0).fill(darken(0x2fa3a0, 0.12));
    g.roundRect(-34, -50, 68, 3, 2).fill({ color: P.white, alpha: 0.45 });
    g.roundRect(-14, -60, 28, 12, 5).fill(0x24504f);
    g.roundRect(-9, -56, 18, 6, 3).fill(0x2fa3a0);
    g.roundRect(-34, -30, 68, 6, 2).fill(0x24504f);
    g.circle(-18, -40, 6).fill(0xf7c934);
    g.roundRect(8, -46, 16, 10, 3).fill(0xf28b82);
    this.bag.addChild(g);
    const shadow = new Graphics();
    contactShadow(shadow, 0, 0, 70);
    this.view.addChild(shadow, this.bag);
    this.hits = [{ x: -36, y: -62, w: 72, h: 64 }];
    this.extent = [-1e6, 1e6];
  }

  hintTarget(): Container {
    return this.bag;
  }

  onTap(): void {
    if (this.loaded || this.flying) return;
    this.launch();
  }

  /** The car left without it: hop along after the car. */
  chase(): void {
    if (this.loaded || this.flying) return;
    this.chasing = true;
  }

  private launch(): void {
    this.flying = true;
    this.chasing = false;
    const ctx = this.ctx;
    ctx.sfx.boing(1.1);
    const sx = this.view.x, sy = this.view.y - this.alt;
    this.view.children[0].visible = false;
    this.ctx.tweens.add(0.75, (p) => {
      const car = ctx.car;
      const tx = car.x - 28, ty = -car.alt - 98;
      const x = sx + (tx - sx) * p;
      const y = sy + (ty - sy) * p - Math.sin(p * Math.PI) * 180;
      this.view.position.set(x, y);
      this.bag.rotation = -p * Math.PI * 2;
    }, {
      ease: ease.inOutSine,
      done: () => {
        this.attach();
        ctx.sfx.thump(0.6);
        ctx.tweens.after(0.08, () => ctx.sfx.boing(1.3));
        ctx.carView.bounce(70);
        ctx.tweens.wobble(this.bag, 0.25, 0.7, 0.2);
      },
    });
  }

  private attach(): void {
    this.bag.rotation = 0;
    this.bag.removeFromParent();
    this.bag.position.set(0, 0);
    this.ctx.carView.roof.addChildAt(this.bag, 0);
    this.loaded = true;
    this.flying = false;
    this.chasing = false;
    this.view.visible = false;
  }

  /** Put it straight on the roof (debug jumps). */
  loadNow(): void {
    if (this.loaded || this.flying) return;
    this.attach();
  }

  update(dt: number): void {
    if (!this.chasing) return;
    const car = this.ctx.car;
    this.hopT += dt * 7;
    this.alt = Math.abs(Math.sin(this.hopT)) * 40;
    const speed = Math.max(car.vx + 250, 450);
    this.x += Math.sign(car.x - this.x) * Math.min(Math.abs(car.x - this.x), speed * dt);
    this.view.position.set(this.x, this.y - this.alt);
    if (Math.sin(this.hopT) * Math.sin(this.hopT - dt * 7) < 0) this.ctx.sfx.s.tone({ freq: 500, to: 700, dur: 0.06, type: 'sine', gain: 0.05 });
    if (Math.abs(car.x - this.x) < 160) this.launch();
  }
}

export interface HomeSet {
  props: Prop[];
  suitcase: Suitcase;
}

export function buildHome(ctx: Ctx): HomeSet {
  const suitcase = new Suitcase(ctx, 440);
  return {
    suitcase,
    props: [new BigTree(ctx, 70), new House(ctx, 150), new Mailbox(ctx, 120), suitcase],
  };
}

