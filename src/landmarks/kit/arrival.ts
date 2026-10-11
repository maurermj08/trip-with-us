// The end of the trip: the family (and dog) waiting at the door, fireworks, and the end park.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, SKIN } from '../../style/palette';
import { contactShadow, cornerRect, palmetto } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { rand } from '../../core/rng';
import { WALK } from './common';
import { CITY_LAYOUT, WORLD_END, type CitySpec } from '../../world/Route';
import { ROAD_FAR, ROAD_NEAR } from '../../world/Road';

// ---------- End of the road: a grassy turnaround ----------
export class EndPark extends Prop {
  private flowers: Graphics[] = [];
  /** `florida`: hibiscus colors and a little palm instead of spring flowers. */
  constructor(ctx: Ctx, x: number, florida = false) {
    super(ctx, x, 30);
    this.layer = 'front';
    const g = new Graphics();
    g.moveTo(-20, 0).quadraticCurveTo(-10, -86, 120, -90).lineTo(900, -90).lineTo(900, 300).lineTo(-20, 300).closePath().fill(P.grassNear);
    g.moveTo(-6, -20).quadraticCurveTo(4, -76, 120, -82).lineTo(900, -82).lineTo(900, -76).lineTo(120, -76).quadraticCurveTo(10, -70, -6, -20).fill({ color: P.white, alpha: 0.25 });
    this.view.addChild(g);
    if (florida) {
      palmetto(g, 640, -60, 190, 0.12);
      g.roundRect(520, -66, 220, 14, 7).fill({ color: P.white, alpha: 0.2 });
    }
    const colors = florida ? [0xe9506e, 0xff7aa2, 0xffb347, 0xff5e78, 0xffd166] : [0xf7a7c0, 0xfff27a, 0xffffff, 0xf28b82, 0xc5a3ff];
    for (let k = 0; k < 9; k++) {
      const f = new Graphics();
      f.roundRect(-1.5, -18, 3, 18, 1.5).fill(P.grassDark);
      const c = colors[k % colors.length];
      for (let p = 0; p < 5; p++) f.circle(Math.cos((p / 5) * Math.PI * 2) * 5, -20 + Math.sin((p / 5) * Math.PI * 2) * 5, 4.5).fill(c);
      f.circle(0, -20, 3.5).fill(0xf2b33d);
      f.position.set(60 + k * 46, -84 + (k % 2) * 30 + 40);
      this.view.addChild(f);
      this.flowers.push(f);
    }
    this.hits = [{ x: 0, y: -100, w: 500, h: 200 }];
    this.extent = [-300, 1200];
  }
  onTap(): void {
    this.ctx.sfx.sparkle();
    this.flowers.forEach((f, i) => {
      this.ctx.tweens.add(0.5, (p) => f.scale.set(1 + Math.sin(p * Math.PI) * 0.6), { delay: i * 0.05 });
    });
  }
}

// ---------- The family (and dog) waiting at the end ----------
interface Member {
  c: Container;
  arm: Container;
  body: Container;
  homeX: number;
  isDog: boolean;
  tail?: Container;
  tapped: boolean;
}

export class Greeters extends Prop {
  members: Member[] = [];
  out = false;
  private waveT = 0;
  readonly doorX: number;

  constructor(ctx: Ctx, x: number, doorX: number) {
    super(ctx, x, WALK + 2);
    this.layer = 'back';
    this.doorX = doorX;
    const defs = [
      { h: 112, shirt: 0x3f7fd1, pants: 0x3b4a5c, skin: SKIN[1], hair: 0x3a2a20, dx: -170 },
      { h: 104, shirt: 0xe9637a, pants: 0x5a4a6a, skin: SKIN[0], hair: 0xb5763c, dx: -80 },
      { h: 70, shirt: 0xf7c934, pants: 0x2f80d1, skin: SKIN[2], hair: 0x1f1a17, dx: 0 },
      { h: 92, shirt: 0x7fbf6a, pants: 0x7a6a5a, skin: SKIN[3], hair: 0xdcdcdc, dx: 80 },
    ];
    for (const d of defs) this.members.push(this.makePerson(d));
    this.members.push(this.makeDog(160));
    for (const m of this.members) {
      m.c.position.set(this.doorX - this.x, 0);
      m.c.scale.set(0);
      this.view.addChild(m.c);
    }
    this.hits = [{ x: -220, y: -130, w: 440, h: 140 }];
    this.extent = [-1500, 1500];
  }

  private makePerson(d: { h: number; shirt: number; pants: number; skin: number; hair: number; dx: number }): Member {
    const c = new Container();
    const body = new Container();
    const g = new Graphics();
    const h = d.h;
    const headR = h * 0.17;
    contactShadow(g, 0, 0, h * 0.5);
    g.roundRect(-h * 0.11, -h * 0.42, h * 0.09, h * 0.42, h * 0.04).fill(d.pants);
    g.roundRect(h * 0.02, -h * 0.42, h * 0.09, h * 0.42, h * 0.04).fill(d.pants);
    g.roundRect(-h * 0.17, -h * 0.78, h * 0.34, h * 0.42, h * 0.12).fill(d.shirt);
    cornerRect(g, h * 0.17 - h * 0.34 * 0.28, -h * 0.78, h * 0.34 * 0.28, h * 0.42, 0, h * 0.12, h * 0.12, 0).fill({ color: P.black, alpha: 0.07 });
    // head with simple happy face
    const hy = -h * 0.78 - headR * 0.9;
    g.circle(0, hy, headR).fill(d.skin);
    g.moveTo(-headR, hy - headR * 0.1).quadraticCurveTo(-headR, hy - headR * 1.25, 0, hy - headR * 1.1)
      .quadraticCurveTo(headR, hy - headR * 1.25, headR, hy - headR * 0.1).quadraticCurveTo(0, hy - headR * 0.7, -headR, hy - headR * 0.1).fill(d.hair);
    g.circle(-headR * 0.35, hy + headR * 0.05, headR * 0.12).fill(0x2a2a2a);
    g.circle(headR * 0.35, hy + headR * 0.05, headR * 0.12).fill(0x2a2a2a);
    g.moveTo(-headR * 0.35, hy + headR * 0.38).quadraticCurveTo(0, hy + headR * 0.7, headR * 0.35, hy + headR * 0.38).stroke({ width: Math.max(1.5, headR * 0.12), color: 0x6a3b2e, cap: 'round' });
    g.circle(-headR * 0.6, hy + headR * 0.3, headR * 0.18).fill({ color: 0xff8a7a, alpha: 0.45 });
    g.circle(headR * 0.6, hy + headR * 0.3, headR * 0.18).fill({ color: 0xff8a7a, alpha: 0.45 });
    // still arm
    g.roundRect(-h * 0.22, -h * 0.74, h * 0.08, h * 0.34, h * 0.04).fill(d.shirt);
    body.addChild(g);
    // waving arm (pivot at shoulder)
    const arm = new Container();
    const ag = new Graphics();
    ag.roundRect(-h * 0.04, -h * 0.36, h * 0.08, h * 0.36, h * 0.04).fill(d.shirt);
    ag.circle(0, -h * 0.37, h * 0.055).fill(d.skin);
    arm.addChild(ag);
    arm.position.set(h * 0.17, -h * 0.72);
    arm.rotation = 0.4;
    body.addChild(arm);
    c.addChild(body);
    return { c, arm, body, homeX: d.dx, isDog: false, tapped: false };
  }

  private makeDog(dx: number): Member {
    const c = new Container();
    const body = new Container();
    const g = new Graphics();
    contactShadow(g, 0, 0, 60);
    for (const lx of [-16, -8, 10, 18]) g.roundRect(lx - 3, -16, 6, 16, 3).fill(0xb07a48);
    g.roundRect(-24, -34, 52, 22, 11).fill(0xc68b52);
    g.circle(28, -38, 13).fill(0xc68b52);
    g.roundRect(32, -36, 14, 10, 5).fill(0xe0b083);
    g.circle(44, -33, 3).fill(0x2a2a2a);
    g.circle(30, -42, 2.2).fill(0x2a2a2a);
    g.ellipse(20, -40, 6, 11).fill(0x8a5a32);
    body.addChild(g);
    const tail = new Container();
    tail.addChild(new Graphics().roundRect(-3, -18, 6, 20, 3).fill(0xc68b52));
    tail.position.set(-22, -30);
    tail.rotation = -0.6;
    body.addChild(tail);
    c.addChild(body);
    const arm = new Container();
    return { c, arm, body, homeX: dx, isDog: true, tail, tapped: false };
  }

  /** Pop out of the door one by one and line up on the sidewalk. */
  emerge(): void {
    if (this.out) return;
    this.out = true;
    this.members.forEach((m, i) => {
      const delay = 0.35 * i;
      const sx = this.doorX - this.x;
      this.ctx.tweens.add(0.3, (p) => m.c.scale.set(p), { delay, ease: ease.outBack });
      this.ctx.tweens.after(delay, () => (m.isDog ? this.ctx.sfx.boof() : this.ctx.sfx.pop()));
      this.ctx.tweens.add(0.7, (p) => {
        m.c.x = sx + (m.homeX - sx) * p;
        m.c.y = -Math.abs(Math.sin(p * Math.PI * 3)) * 18;
      }, { delay: delay + 0.2, ease: ease.inOutSine });
    });
  }

  hintTarget(): Container {
    const m = this.members.find((mm) => !mm.tapped) ?? this.members[0];
    return m.body;
  }

  get allGreeted(): boolean {
    return this.members.every((m) => m.tapped);
  }

  onTap(wx: number): void {
    if (!this.out) {
      this.ctx.sfx.knock();
      return;
    }
    const lx = wx - this.view.x;
    let best = this.members[0];
    for (const m of this.members) if (Math.abs(m.c.x - lx) < Math.abs(best.c.x - lx)) best = m;
    this.greet(best);
  }

  private greet(m: Member): void {
    m.tapped = true;
    const wx = this.view.x + m.c.x;
    if (m.isDog) {
      this.ctx.sfx.boof();
      this.ctx.tweens.add(0.5, (p) => (m.c.y = -Math.sin(p * Math.PI) * 40), { ease: ease.outQuad });
    } else {
      this.ctx.sfx.giggle();
      this.ctx.tweens.wobble(m.body, 0.1, 0.7, 0.2);
    }
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: wx, y: this.y - 120, count: 7, shape: 'heart', tint: [0xff6f91, 0xff9eb5, 0xe94b3c],
      speed: [60, 160], angle: [-2.4, -0.7], gravity: -60, drag: 1.2, life: [1.0, 1.6], size: [14, 22], spin: 1,
    });
  }

  update(dt: number): void {
    this.waveT += dt;
    if (!this.out) return;
    this.members.forEach((m, i) => {
      if (m.isDog) {
        if (m.tail) m.tail.rotation = -0.6 + Math.sin(this.waveT * 18) * 0.5;
      } else {
        m.arm.rotation = Math.PI * 0.85 + Math.sin(this.waveT * 7 + i) * 0.35;
      }
    });
  }
}

// ---------- Fireworks over the harbor ----------
export function launchFirework(ctx: Ctx, x: number, targetY: number): void {
  const palettes = [
    [0xff6f91, 0xffc75f, 0xffffff],
    [0x7fd8ff, 0x9fffc9, 0xffffff],
    [0xc5a3ff, 0xff9eb5, 0xfff27a],
    [0xffd166, 0xef476f, 0x06d6a0],
  ];
  ctx.sfx.whistleUp();
  ctx.fx.firework(ctx.layers.skyFx, x + rand(-30, 30), 40, targetY, palettes[Math.floor(Math.random() * palettes.length)], () => ctx.sfx.firework());
}


// ---------- The stop line: a solid white bar across the road where the trip ends ----------
export class StopLine extends Prop {
  private bar = new Graphics();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 0);
    this.layer = 'roadDecor';
    this.bar.roundRect(-8, ROAD_FAR + 3, 16, ROAD_NEAR - ROAD_FAR - 6, 3).fill(P.white);
    this.bar.roundRect(-8, ROAD_FAR + 3, 5, ROAD_NEAR - ROAD_FAR - 6, 2).fill({ color: P.black, alpha: 0.05 });
    this.view.addChild(this.bar);
    this.hits = [{ x: -20, y: ROAD_FAR, w: 40, h: ROAD_NEAR - ROAD_FAR }];
  }
  onTap(): void {
    this.ctx.sfx.ding();
    this.ctx.tweens.wobble(this.bar, 0, 0.5, 0.15);
  }
}

/** The ending at the final city: the family by the door, the stop line and the grassy turnaround past it. */
export function buildArrival(ctx: Ctx, city: CitySpec, doorX: number): { props: Prop[]; greeters: Greeters } {
  const greeters = new Greeters(ctx, city.x0 + CITY_LAYOUT.greeters, doorX);
  return { props: [greeters, new StopLine(ctx, city.x0 + CITY_LAYOUT.stop), new EndPark(ctx, WORLD_END + 110, city.state === 'FL')], greeters };
}
