// Farm animals and the field fence behind the median.
import { Container, Graphics } from 'pixi.js';
import { Prop } from './Prop';
import type { Ctx } from '../core/Ctx';
import { P } from '../style/palette';
import { contactShadow } from '../style/shapes';
import { rand } from '../core/rng';
import { ease } from '../core/Tween';

const FIELD_Y = -86;

export class Fence extends Prop {
  constructor(ctx: Ctx, x: number, len: number) {
    super(ctx, x, FIELD_Y);
    this.layer = 'back';
    const g = new Graphics();
    for (let px = 0; px <= len; px += 90) g.roundRect(px - 3, -40, 6, 42, 2).fill(0x9c7a55);
    g.roundRect(0, -34, len, 4, 2).fill(0xb38e66);
    g.roundRect(0, -18, len, 4, 2).fill(0xb38e66);
    this.view.addChild(g);
    this.extent = [-100, len + 100];
  }
  hitTest(): boolean {
    return false;
  }
}

export class Cow extends Prop {
  private head = new Container();
  private tail = new Container();
  private body = new Container();
  private mooCool = 0;
  private looked = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, FIELD_Y + 10);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 130);
    // legs
    for (const lx of [-40, -26, 26, 40]) g.roundRect(lx - 5, -36, 10, 36, 4).fill(0xf4f1ea);
    for (const lx of [-40, -26, 26, 40]) g.roundRect(lx - 5, -6, 10, 6, 2).fill(0x4a4440);
    // body
    g.roundRect(-55, -82, 110, 52, 22).fill(0xfbf8f2);
    g.ellipse(-20, -66, 18, 12).fill(0x2e2a28);
    g.ellipse(22, -58, 14, 10).fill(0x2e2a28);
    g.ellipse(-42, -50, 9, 7).fill(0x2e2a28);
    g.ellipse(14, -78, 10, 5).fill(0x2e2a28);
    g.ellipse(10, -33, 12, 7).fill(0xf5b5b8);
    g.roundRect(-50, -82, 100, 3, 1.5).fill({ color: P.white, alpha: 0.6 });
    this.body.addChild(g);

    // tail
    const t = new Graphics();
    t.roundRect(-2, 0, 4, 34, 2).fill(0xf4f1ea);
    t.ellipse(0, 36, 5, 8).fill(0x2e2a28);
    this.tail.addChild(t);
    this.tail.position.set(-54, -76);
    this.tail.rotation = 0.25;

    // head (faces right toward travel; characters may have faces)
    const h = new Graphics();
    h.roundRect(-8, -18, 40, 34, 13).fill(0xfbf8f2);
    h.roundRect(14, -2, 24, 20, 9).fill(0xf5b5b8);
    h.circle(24, 6, 2.2).fill(0x8a5a5c);
    h.circle(32, 6, 2.2).fill(0x8a5a5c);
    h.circle(14, -8, 3.4).fill(0x1d1b1a);
    h.circle(15, -9, 1.1).fill(P.white);
    h.ellipse(-8, -16, 9, 5).fill(0x2e2a28);
    h.roundRect(-2, -26, 5, 9, 2.5).fill(0xe9dcc2);
    h.roundRect(10, -26, 5, 9, 2.5).fill(0xe9dcc2);
    this.head.addChild(h);
    this.head.position.set(54, -78);
    this.head.rotation = 0.5;

    this.body.addChild(this.tail, this.head);
    this.view.addChild(this.body);
    this.hits = [{ x: -60, y: -110, w: 130, h: 110 }];
  }

  onTap(): void {
    this.moo();
  }

  private moo(): void {
    if (this.mooCool > 0) {
      this.ctx.tweens.wobble(this.body, 0.05, 0.5, 0.06);
      this.ctx.sfx.pop();
      return;
    }
    this.mooCool = 0.9;
    this.ctx.sfx.moo();
    this.ctx.tweens.add(1.0, (p) => (this.head.rotation = -0.25 + Math.sin(p * Math.PI) * -0.3), { ease: ease.inOutSine, owner: this.head });
    this.ctx.tweens.add(1.2, (p) => (this.tail.rotation = 0.25 + Math.sin(p * Math.PI * 6) * 0.5 * (1 - p)), { owner: this.tail });
    this.ctx.tweens.wobble(this.body, 0.04, 0.8, 0.06);
  }

  update(dt: number): void {
    this.mooCool -= dt;
    const d = this.ctx.car.x - this.x;
    // Lift head to watch the car go by.
    if (!this.looked && Math.abs(d) < 600) {
      this.looked = true;
      this.ctx.tweens.add(0.6, (p) => (this.head.rotation = 0.5 - p * 0.75), { ease: ease.outBack, owner: this.head });
    }
    if (this.tail && Math.random() < dt * 0.4) {
      this.ctx.tweens.add(0.8, (p) => (this.tail.rotation = 0.25 + Math.sin(p * Math.PI * 3) * 0.3 * (1 - p)), { owner: this.tail });
    }
  }
}

interface Bird { c: Container; wing: Graphics; homeX: number; homeY: number; vx: number; vy: number; flying: boolean; t: number }

export class Birds extends Prop {
  private birds: Bird[] = [];
  private away = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, FIELD_Y - 34);
    this.layer = 'back';
    for (let k = 0; k < 5; k++) {
      const c = new Container();
      const g = new Graphics();
      const col = [0x5b6d8a, 0x7a5c48, 0x4b5563][k % 3];
      g.ellipse(0, -7, 9, 7).fill(col);
      g.circle(7, -13, 5).fill(col);
      g.poly([11, -14, 17, -12, 11, -11]).fill(0xf2b33d);
      g.circle(8, -14, 1.3).fill(0x111111);
      g.ellipse(2, -4, 6, 3).fill({ color: P.white, alpha: 0.25 });
      const wing = new Graphics().ellipse(0, 0, 8, 4).fill(0x3d4555);
      wing.position.set(-2, -8);
      c.addChild(g, wing);
      c.position.set(k * 34 - 70, 0);
      this.view.addChild(c);
      this.birds.push({ c, wing, homeX: c.x, homeY: 0, vx: 0, vy: 0, flying: false, t: 0 });
    }
    this.hits = [{ x: -90, y: -30, w: 180, h: 34 }];
    this.extent = [-2000, 2000];
  }

  onTap(): void {
    this.scatter();
  }

  private scatter(): void {
    if (this.away > 0) return;
    this.away = 5;
    this.ctx.sfx.tweet();
    this.ctx.tweens.after(0.15, () => this.ctx.sfx.tweet());
    for (const b of this.birds) {
      b.flying = true;
      b.vx = rand(80, 260);
      b.vy = -rand(200, 320);
    }
  }

  update(dt: number): void {
    const d = this.ctx.car.x - this.x;
    if (Math.abs(d) < 320 && this.ctx.car.speed > 150) this.scatter();
    if (this.away > 0) {
      this.away -= dt;
      if (this.away <= 0) {
        // Come home.
        for (const b of this.birds) {
          const sx = b.c.x, sy = b.c.y;
          b.flying = false;
          this.ctx.tweens.add(1.4, (p) => {
            b.c.x = sx + (b.homeX - sx) * p;
            b.c.y = sy + (b.homeY - sy) * p - Math.sin(p * Math.PI) * 40;
            b.wing.scale.y = Math.sin(p * 40);
          }, { ease: ease.inOutSine, done: () => (b.wing.scale.y = 1) });
        }
      }
    }
    for (const b of this.birds) {
      b.t += dt;
      if (b.flying) {
        b.vy += 60 * dt;
        b.vy = Math.max(b.vy, -300);
        b.c.x += b.vx * dt;
        b.c.y += b.vy * dt;
        b.wing.scale.y = Math.sin(b.t * 30);
      } else if (this.away <= 0 && Math.random() < dt * 0.3) {
        this.ctx.tweens.wobble(b.c, 0.2, 0.4, 0);
      }
    }
  }
}
