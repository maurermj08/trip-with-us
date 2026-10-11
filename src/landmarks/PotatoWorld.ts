// Potato World: the grand finale (a theme-park parody — no mouse ears, no real marks).
// You drive through the gates onto a pastel parade street lined with rides and shops, and the
// family is waiting in front of the potato-domed castle. The rides live in kit/rides.ts.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken } from '../style/palette';
import { block, contactShadow } from '../style/shapes';
import { ease } from '../core/Tween';
import { rand } from '../core/rng';
import { CITIES } from '../world/Route';
import { signText } from '../signs/Signs';
import { Palm } from './kit/trees';
import { WALK, type CitySet } from './kit/common';
import { PARK, archWindow, awning, merlons, pennant, potatoDome, spud } from './kit/potatoArt';
import { Carousel, Monorail, SpudCups } from './kit/rides';

export { Carousel, Monorail, SpudCups } from './kit/rides';

const X0 = CITIES.find((c) => c.id === 'potato-world')!.x0;
const FLAG_COLORS = [PARK.coral, PARK.teal, PARK.gold, PARK.purple, PARK.pink];

/** A pennant that can wave and pop. */
function flagAt(parent: Container, x: number, y: number, len: number, color: number, flags: Graphics[]): Graphics {
  const f = new Graphics();
  pennant(f, len, color);
  f.position.set(x, y);
  parent.addChild(f);
  flags.push(f);
  return f;
}

function waveFlags(flags: Graphics[], t: number): void {
  flags.forEach((f, k) => {
    if (!f.destroyed) f.skew.y = Math.sin(t * 5 + k * 0.9) * 0.18;
  });
}

function popFlags(ctx: Ctx, flags: Graphics[]): void {
  flags.forEach((f, k) => ctx.tweens.add(0.5, (p) => !f.destroyed && f.scale.set(1 + Math.sin(p * Math.PI) * 0.7), { delay: k * 0.05, ease: ease.outQuad }));
}

// ---------- The grand entrance gate ----------

/** Near side of the gate: two pillars on the near shoulder and the arch with the sign, over the road. */
export class GateArch extends Prop {
  private arch = new Container();
  private flags: Graphics[] = [];
  private lights: Graphics[] = [];
  private t = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 70);
    this.layer = 'front';
    const g = new Graphics();
    const PX = 330;
    // the arch band (one path): ends sit on the pillar tops, it peaks high over the road
    const outer = (u: number) => -330 - 120 * Math.sin(u * Math.PI);
    const inner = (u: number) => -286 - 112 * Math.sin(u * Math.PI);
    const band: number[] = [];
    for (let k = 0; k <= 32; k++) band.push(-PX + (k / 32) * PX * 2, outer(k / 32));
    for (let k = 32; k >= 0; k--) band.push(-PX + (k / 32) * PX * 2, inner(k / 32));
    g.poly(band).fill(PARK.pink);
    // gold edges along both curves
    const edge = (fy: (u: number) => number, dy: number) => {
      const pts: number[] = [];
      for (let k = 0; k <= 32; k++) pts.push(-PX + (k / 32) * PX * 2, fy(k / 32) + dy);
      for (let k = 32; k >= 0; k--) pts.push(-PX + (k / 32) * PX * 2, fy(k / 32) + dy + 7);
      g.poly(pts).fill(PARK.gold);
    };
    edge(outer, 0);
    edge(inner, -7);
    for (const side of [-1, 1]) {
      // pillars: pastel with gold rings and a potato-dome cap
      const px = side * PX;
      contactShadow(g, px, 0, 90);
      block(g, px - 30, -340, 60, 340, PARK.lavender, { landmark: true, shade: PARK.lavenderShade });
      g.roundRect(px - 36, -40, 72, 40, 8).fill(PARK.lavenderShade);
      for (const ry of [-120, -220, -330]) g.roundRect(px - 34, ry, 68, 12, 6).fill(PARK.gold);
      potatoDome(g, px, -340, 36);
    }
    this.arch.addChild(g);
    for (const side of [-1, 1]) flagAt(this.arch, side * PX + 2, -340 - 36 * 1.35 - 18, 40, side < 0 ? PARK.coral : PARK.teal, this.flags);
    // twinkle lights along the arch
    for (let k = 1; k < 16; k++) {
      const u = k / 16;
      const l = new Graphics().circle(0, 0, 4).fill(P.white);
      l.position.set(-PX + u * PX * 2, (outer(u) + inner(u)) / 2);
      l.tint = 0xfff1a8;
      this.lights.push(l);
      this.arch.addChild(l);
    }
    // the sign on top
    const s = new Graphics();
    s.roundRect(-196, -526, 392, 92, 22).fill(PARK.purple);
    s.roundRect(-188, -518, 376, 76, 18).fill(PARK.cream);
    s.roundRect(-188, -518, 376, 4, 2).fill({ color: P.white, alpha: 0.6 });
    spud(s, -158, -480, 40, 30, PARK.gold);
    spud(s, 158, -480, 40, 30, PARK.gold);
    this.arch.addChild(s);
    const name = signText('POTATO WORLD', 40, PARK.purple, '900');
    name.position.set(0, -480);
    this.arch.addChild(name);
    this.view.addChild(this.arch);
    this.hits = [{ x: -PX - 40, y: -540, w: PX * 2 + 80, h: 250 }, { x: -PX - 36, y: -340, w: 72, h: 340 }, { x: PX - 36, y: -340, w: 72, h: 340 }];
    this.bumpHalf = 20;
    this.bumpHeight = 5000;
    this.extent = [-900, 900];
  }

  hintTarget(): Container {
    return this.arch;
  }

  onTap(): void {
    this.ctx.sfx.fanfare();
    popFlags(this.ctx, this.flags);
    this.ctx.tweens.wobble(this.arch, 0.01, 0.8, 0.02);
    this.burst(14);
  }

  /** Driving under the arch: a confetti shower. */
  onBump(): void {
    this.ctx.sfx.fanfare();
    this.burst(30);
  }

  private burst(n: number): void {
    for (const sx of [-180, 0, 180]) {
      this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + sx, y: this.y - 420, count: Math.round(n / 3), shape: 'confetti',
        tint: [PARK.coral, PARK.gold, PARK.teal, PARK.purple, PARK.pink, P.white],
        speed: [120, 340], angle: [-2.8, -0.3], gravity: 320, drag: 0.6, life: [1.2, 2.0], size: [8, 13], spin: 8,
      });
    }
  }

  update(dt: number): void {
    this.t += dt;
    waveFlags(this.flags, this.t);
    this.lights.forEach((l, k) => (l.alpha = 0.5 + 0.5 * Math.max(0, Math.sin(this.t * 4 - k * 0.6))));
    // Never hide a flying car: the arch fades while the car is up high nearby.
    const car = this.ctx.car;
    const near = Math.abs(car.x - this.x) < 700 && car.alt > 150;
    const target = near ? 0.35 : 1;
    this.arch.alpha += (target - this.arch.alpha) * Math.min(1, dt * 6);
  }
}

/** Far side of the gate: matching towers, a garland of flags, ticket booths and planters. */
export class GateFar extends Prop {
  private flags: Graphics[] = [];
  private garland = new Container();
  private t = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const g = new Graphics();
    const PX = 330;
    // ticket booths with striped awnings
    for (const bx of [-170, 170]) {
      contactShadow(g, bx, 0, 110);
      block(g, bx - 48, -120, 96, 120, PARK.cream, { landmark: true, shade: PARK.creamShade });
      g.roundRect(bx - 30, -96, 60, 40, 10).fill(PARK.sky);
      g.circle(bx - 2, -70, 9).fill(0xf3c9a5); // a friendly ticket seller
      g.roundRect(bx - 11, -62, 18, 8, 4).fill(PARK.purple);
      g.roundRect(bx - 36, -56, 72, 8, 3).fill(PARK.goldShade);
      // a peaked, striped roof (no scallops here: it keeps the booth from reading as a face)
      for (let k = 0; k < 6; k++) {
        const x0 = bx - 60 + k * 20;
        g.poly([x0, -122, x0 + 20, -122, bx + (x0 + 10 - bx) * 0.15 + 10, -170, bx + (x0 + 10 - bx) * 0.15 - 10, -170]).fill(k % 2 ? P.white : PARK.purple);
      }
      g.roundRect(bx - 62, -126, 124, 8, 4).fill(PARK.gold);
      g.roundRect(bx - 2, -196, 4, 28, 2).fill(PARK.goldShade);
    }
    // planters with flowers
    for (const fx of [-90, 90]) {
      g.roundRect(fx - 26, -26, 52, 26, 6).fill(PARK.lavenderShade);
      for (let k = 0; k < 4; k++) g.circle(fx - 18 + k * 12, -30 - (k % 2) * 6, 7).fill(FLAG_COLORS[k]);
    }
    this.view.addChild(g);
    // a sagging garland of little flags between the towers
    const line = new Graphics();
    const sag = (u: number) => -260 + Math.sin(u * Math.PI) * 40;
    const pts: number[] = [];
    for (let k = 0; k <= 20; k++) pts.push(-PX + (k / 20) * PX * 2, sag(k / 20));
    line.moveTo(pts[0], pts[1]);
    for (let k = 2; k < pts.length; k += 2) line.lineTo(pts[k], pts[k + 1]);
    line.stroke({ width: 2, color: 0x8a7a9a });
    this.garland.addChild(line);
    for (let k = 1; k < 14; k++) {
      const u = k / 14;
      const f = new Graphics();
      f.poly([-9, 0, 9, 0, 0, 20]).fill(FLAG_COLORS[k % FLAG_COLORS.length]);
      f.position.set(-PX + u * PX * 2, sag(u));
      this.garland.addChild(f);
      this.flags.push(f);
    }
    for (const bx of [-170, 170]) flagAt(this.view, bx + 2, -196, 28, bx < 0 ? PARK.coral : PARK.teal, this.flags);
    this.view.addChild(this.garland);
    this.hits = [{ x: -260, y: -280, w: 520, h: 280 }];
    this.extent = [-800, 800];
  }

  hintTarget(): Container {
    return this.garland;
  }

  onTap(): void {
    this.ctx.sfx.fanfare();
    popFlags(this.ctx, this.flags);
  }

  update(dt: number): void {
    this.t += dt;
    this.flags.forEach((f, k) => {
      if (!f.destroyed) f.rotation = Math.sin(this.t * 4 + k * 0.7) * 0.2;
    });
  }
}

// ---------- The castle ----------
export class Castle extends Prop {
  private flags: Graphics[] = [];
  private windows: Graphics[] = [];
  private tops: [number, number][] = [];
  private lit = false;
  private t = 0;
  /** Drawn at 0.8 so the whole castle (turret domes included) fits on screen at the greeting. */
  private art = new Container();
  private static readonly S = 0.8;
  readonly doorX: number;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 820, 0.12);
    const wall = PARK.pink, wallSh = PARK.pinkShade;
    const keep = PARK.lavender, keepSh = PARK.lavenderShade;

    // back to front: the central spire tower, the inner towers, the keep, then the outer wall
    block(g, -58, -620, 116, 220, keep, { landmark: true, shade: keepSh });
    archWindow(g, -16, -590, 32, 50, PARK.sky);
    this.tops.push([0, potatoDome(g, 0, -620, 74)]);
    for (const side of [-1, 1]) {
      const tx = side * 158;
      block(g, tx - 40, -520, 80, 300, wall, { landmark: true, shade: wallSh });
      archWindow(g, tx - 12, -490, 24, 40, PARK.sky);
      archWindow(g, tx - 12, -410, 24, 40, PARK.sky);
      this.tops.push([tx, potatoDome(g, tx, -520, 50)]);
    }
    // the keep with its rose window and crenellations
    block(g, -175, -430, 350, 200, keep, { landmark: true, shade: keepSh });
    merlons(g, -175, -430, 350, keep);
    g.circle(0, -350, 40).fill(P.white);
    g.circle(0, -350, 34).fill(PARK.sky);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.circle(Math.cos(a) * 20, -350 + Math.sin(a) * 20, 8).fill([PARK.pink, PARK.gold, PARK.mint, PARK.coral][k % 4]);
    }
    g.circle(0, -350, 9).fill(PARK.gold);
    // the outer wall
    block(g, -320, -250, 640, 250, wall, { landmark: true, shade: wallSh });
    merlons(g, -320, -250, 640, wall);
    g.roundRect(-320, -32, 640, 32, 6).fill(darken(wall, 0.08));
    // side towers (round, so a lighter left and a shaded right)
    for (const side of [-1, 1]) {
      const tx = side * 330;
      block(g, tx - 48, -400, 96, 400, PARK.cream, { landmark: true, shade: PARK.creamShade });
      g.roundRect(tx - 52, -400, 104, 14, 7).fill(PARK.gold);
      archWindow(g, tx - 14, -360, 28, 46, PARK.sky);
      archWindow(g, tx - 14, -270, 28, 46, PARK.sky);
      archWindow(g, tx - 14, -180, 28, 46, PARK.sky);
      this.tops.push([tx, potatoDome(g, tx, -400, 60)]);
    }
    // hanging banners with the gold potato emblem
    for (const bx of [-215, 215]) {
      g.roundRect(bx - 28, -232, 56, 110, 6).fill(PARK.purple);
      g.poly([bx - 28, -126, bx, -104, bx + 28, -126]).fill(PARK.purple);
      spud(g, bx, -186, 34, 24, PARK.gold, false);
      g.roundRect(bx - 32, -236, 64, 8, 4).fill(PARK.gold);
    }
    // the grand doorway: gold arch, purple doors, steps and a balcony over it
    g.roundRect(-82, -196, 164, 196, 82).fill(PARK.gold);
    g.roundRect(-68, -182, 136, 182, 68).fill(PARK.purpleDark);
    g.roundRect(-60, -174, 120, 174, 60).fill(PARK.purple);
    g.rect(-2, -174, 4, 174).fill(PARK.purpleDark);
    for (const px of [-46, 10]) g.roundRect(px, -96, 36, 70, 8).fill({ color: PARK.purpleDark, alpha: 0.5 });
    g.circle(-14, -80, 5).fill(PARK.gold);
    g.circle(14, -80, 5).fill(PARK.gold);
    for (let k = 0; k < 3; k++) g.roundRect(-100 - k * 14, -10 + k * 5, 200 + k * 28, 10, 4).fill(darken(PARK.cream, k * 0.04));
    g.roundRect(-110, -236, 220, 12, 5).fill(PARK.gold);
    for (let bx = -104; bx <= 104; bx += 13) g.roundRect(bx - 2, -262, 4, 28, 2).fill(PARK.gold);
    g.roundRect(-110, -266, 220, 7, 3.5).fill(PARK.gold);
    this.art.addChild(g);
    this.art.scale.set(Castle.S);
    this.view.addChild(this.art);

    // wall windows that can light up
    for (const [wx, wy] of [[-270, -200], [-200, -110], [-130, -200], [130, -200], [200, -110], [270, -200], [-90, -400], [70, -400]] as const) {
      const w = new Graphics();
      this.drawWin(w, false);
      w.position.set(wx - 13, wy);
      this.windows.push(w);
      this.art.addChild(w);
    }
    // pennants on every turret
    this.tops.forEach(([tx, ty], k) => flagAt(this.art, tx + 2, ty - 6, k === 0 ? 56 : 40, FLAG_COLORS[k % FLAG_COLORS.length], this.flags));
    this.doorX = x;
    const S = Castle.S;
    this.hits = [{ x: -380 * S, y: -780 * S, w: 760 * S, h: 780 * S }];
    this.extent = [-1100, 1100];
  }

  private drawWin(g: Graphics, lit: boolean): void {
    g.clear();
    archWindow(g, 0, 0, 26, 44, lit ? P.warmWindow : PARK.sky);
  }

  hintTarget(): Container {
    return this.view;
  }

  onTap(): void {
    this.ctx.sfx.fanfare();
    this.ctx.sfx.sparkle();
    popFlags(this.ctx, this.flags);
    this.lit = !this.lit;
    this.windows.forEach((w, k) => this.ctx.tweens.after(k * 0.06, () => !w.destroyed && this.drawWin(w, this.lit)));
    this.tops.forEach(([tx, ty], k) => this.ctx.tweens.after(k * 0.08, () => this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x + tx * Castle.S, y: this.y + ty * Castle.S, count: 8, shape: 'star', tint: [PARK.gold, P.white, PARK.pink],
      speed: [80, 240], gravity: 140, life: [0.6, 1.1], size: [10, 16],
    })));
  }

  update(dt: number): void {
    this.t += dt;
    waveFlags(this.flags, this.t);
  }
}

// ---------- Street pieces ----------

/** A pastel park shop with a scalloped awning and a little sign. */
export class ParkShop extends Prop {
  private awn = new Container();
  private glow = new Graphics();
  private on = false;

  constructor(ctx: Ctx, x: number, w: number, color: number, label: string, stripe: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const h = 230;
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w * 1.05);
    block(g, 0, -h, w, h, color, { landmark: true, shade: darken(color, 0.07) });
    // a curly gable on top
    g.moveTo(w * 0.2, -h).quadraticCurveTo(w / 2, -h - 70, w * 0.8, -h).closePath().fill(color);
    g.circle(w / 2, -h - 38, 16).fill(P.white);
    spud(g, w / 2, -h - 38, 22, 16, PARK.gold, false);
    // shop windows and a door
    g.roundRect(18, -120, w * 0.36, 80, 8).fill(PARK.sky);
    g.roundRect(w - 18 - w * 0.36, -120, w * 0.36, 80, 8).fill(PARK.sky);
    g.roundRect(w / 2 - 22, -100, 44, 100, 20).fill(darken(color, 0.3));
    for (const wx of [w * 0.25, w * 0.75]) archWindow(g, wx - 14, -205, 28, 40, PARK.sky);
    this.glow.alpha = 0;
    this.glow.roundRect(18, -120, w * 0.36, 80, 8).fill(P.warmWindow);
    this.glow.roundRect(w - 18 - w * 0.36, -120, w * 0.36, 80, 8).fill(P.warmWindow);
    this.view.addChild(g, this.glow);
    const a = new Graphics();
    awning(a, -8, 0, w + 16, 22, stripe, P.white);
    this.awn.addChild(a);
    this.awn.position.set(0, -146);
    this.view.addChild(this.awn);
    const sg = new Graphics().roundRect(w / 2 - 70, -h + 14, 140, 36, 10).fill(PARK.cream);
    const t = signText(label, 20, PARK.purple, '900');
    t.position.set(w / 2, -h + 32);
    this.view.addChild(sg, t);
    this.hits = [{ x: 0, y: -h - 70, w, h: h + 70 }];
    this.extent = [-300, w + 300];
  }

  hintTarget(): Container {
    return this.awn;
  }

  onTap(): void {
    this.on = !this.on;
    this.glow.alpha = this.on ? 0.85 : 0;
    this.ctx.sfx.pop();
    this.ctx.sfx.chime();
    this.ctx.tweens.wobble(this.awn, 0.04, 0.6, 0.1);
  }
}

/** A balloon cart: tap and a balloon floats away (a new one grows back). */
export class BalloonCart extends Prop {
  private balloons: Container[] = [];
  private t = 0;
  private next = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK + 4);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 120);
    g.circle(-34, -14, 14).fill(0x5a5f66);
    g.circle(34, -14, 14).fill(0x5a5f66);
    block(g, -56, -80, 112, 56, PARK.mint, { landmark: true, shade: PARK.mintShade });
    awning(g, -60, -92, 120, 14, PARK.coral, P.white);
    // the seller (people may have faces)
    g.roundRect(-12, -126, 24, 40, 10).fill(PARK.teal);
    g.circle(0, -138, 12).fill(0xd9a07a);
    g.circle(-4, -139, 1.6).fill(0x2a2a2a);
    g.circle(4, -139, 1.6).fill(0x2a2a2a);
    g.moveTo(-4, -133).quadraticCurveTo(0, -130, 4, -133).stroke({ width: 1.5, color: 0x6a3b2e });
    this.view.addChild(g);
    const colors = [PARK.coral, PARK.gold, PARK.teal, PARK.purple, PARK.pink, 0x7fc8f8];
    colors.forEach((c, k) => {
      const b = new Container();
      const s = new Graphics();
      const bx = -36 + k * 14, by = -250 - (k % 3) * 24;
      s.moveTo(6, -120).lineTo(bx, by + 22).stroke({ width: 1.2, color: 0x8a8a8a });
      s.ellipse(bx, by, 18, 22).fill(c);
      s.poly([bx - 4, by + 22, bx + 4, by + 22, bx, by + 28]).fill(c);
      s.ellipse(bx - 6, by - 8, 5, 8).fill({ color: P.white, alpha: 0.4 });
      b.addChild(s);
      this.balloons.push(b);
      this.view.addChild(b);
    });
    this.hits = [{ x: -70, y: -300, w: 140, h: 300 }];
    this.extent = [-400, 400];
  }

  onTap(): void {
    const b = this.balloons[this.next % this.balloons.length];
    this.next++;
    this.ctx.sfx.pop();
    this.ctx.sfx.whistleUp();
    const drift = rand(-80, 120);
    this.ctx.tweens.add(3.2, (p) => {
      if (b.destroyed) return;
      b.y = -p * 700;
      b.x = Math.sin(p * 6) * 20 + drift * p;
      b.alpha = p < 0.8 ? 1 : (1 - p) * 5;
    }, {
      ease: ease.inQuad,
      done: () => {
        if (b.destroyed) return;
        b.position.set(0, 0);
        b.scale.set(0);
        b.alpha = 1;
        this.ctx.tweens.add(0.6, (p) => !b.destroyed && b.scale.set(p), { delay: 1, ease: ease.outBack });
      },
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.balloons.forEach((b, k) => (b.rotation = Math.sin(this.t * 1.5 + k) * 0.03));
  }
}

/** A potato-shaped topiary in a pastel planter. */
export class Topiary extends Prop {
  private bush = new Container();
  constructor(ctx: Ctx, x: number, y: number, front: boolean, private size = 1) {
    super(ctx, x, y);
    this.layer = front ? 'front' : 'back';
    const s = size;
    const g = new Graphics();
    contactShadow(g, 0, 0, 80 * s);
    g.roundRect(-30 * s, -34 * s, 60 * s, 34 * s, 8 * s).fill(front ? PARK.lavender : PARK.pink);
    g.roundRect(-34 * s, -38 * s, 68 * s, 10 * s, 5 * s).fill(front ? PARK.lavenderShade : PARK.pinkShade);
    this.view.addChild(g);
    const b = new Graphics();
    b.roundRect(-4 * s, -60 * s, 8 * s, 26 * s, 3 * s).fill(0x8a6a4a);
    spud(b, 0, -96 * s, 70 * s, 84 * s, PARK.leaf, false);
    b.circle(-14 * s, -112 * s, 5 * s).fill(PARK.pink);
    b.circle(12 * s, -88 * s, 5 * s).fill(PARK.gold);
    this.bush.addChild(b);
    this.bush.pivot.set(0, -40 * s);
    this.bush.position.set(0, -40 * s);
    this.view.addChild(this.bush);
    this.hits = [{ x: -40 * s, y: -140 * s, w: 80 * s, h: 140 * s }];
  }
  hintTarget(): Container {
    return this.bush;
  }
  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.sfx.boing(1.4);
    this.ctx.tweens.wobble(this.bush, 0.12, 0.8, 0.12);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 110 * this.size, count: 6, shape: 'heart', tint: [PARK.pink, PARK.coral], speed: [60, 140], angle: [-2.4, -0.7], gravity: -40, life: [0.8, 1.2], size: [10, 14] });
  }
}

/** An ornate park lamppost with a pastel glass lantern. */
export class ParkLamp extends Prop {
  private glow = new Graphics();
  private on = false;
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK + 2);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 40);
    g.roundRect(-10, -16, 20, 16, 4).fill(PARK.purpleDark);
    g.roundRect(-4, -200, 8, 186, 4).fill(PARK.purpleDark);
    g.roundRect(-30, -170, 60, 6, 3).fill(PARK.purpleDark);
    for (const lx of [-26, 26]) {
      g.roundRect(lx - 9, -196, 18, 26, 7).fill(PARK.cream);
      g.roundRect(lx - 11, -200, 22, 6, 3).fill(PARK.purpleDark);
    }
    g.roundRect(-11, -226, 22, 28, 8).fill(PARK.cream);
    potatoDome(g, 0, -228, 12, PARK.purpleDark);
    this.glow.circle(-26, -183, 20).fill({ color: 0xfff1a8, alpha: 0.5 });
    this.glow.circle(26, -183, 20).fill({ color: 0xfff1a8, alpha: 0.5 });
    this.glow.circle(0, -212, 22).fill({ color: 0xfff1a8, alpha: 0.5 });
    this.glow.alpha = 0.35;
    this.view.addChild(this.glow, g);
    this.hits = [{ x: -36, y: -260, w: 72, h: 260 }];
  }
  onTap(): void {
    this.on = !this.on;
    this.glow.alpha = this.on ? 1 : 0.35;
    this.ctx.sfx.ding();
    this.ctx.tweens.wobble(this.view, 0.05, 0.6, 0.03);
  }
}

/** All positions are relative to x0 (the park entrance). */
export function buildPotatoWorld(ctx: Ctx, x0: number = X0): CitySet {
  const props: Prop[] = [];
  // Draw order in the back layer = push order: monorail behind everything, the castle behind the street.
  props.push(new Monorail(ctx, x0 + 600, 5200));
  const castle = new Castle(ctx, x0 + 3900);
  props.push(castle);
  props.push(new GateFar(ctx, x0 + 300));
  props.push(new SpudCups(ctx, x0 + 1250));
  props.push(new Carousel(ctx, x0 + 2050));
  props.push(new ParkShop(ctx, x0 + 2550, 250, PARK.mint, 'FRIES', PARK.coral));
  props.push(new ParkShop(ctx, x0 + 2830, 230, PARK.sky, 'SWEETS', PARK.purple));
  props.push(new BalloonCart(ctx, x0 + 3200));
  for (const dx of [700, 1700, 2450, 3330, 4620, 5100]) props.push(new ParkLamp(ctx, x0 + dx));
  for (const dx of [820, 1600, 2380]) props.push(new Topiary(ctx, x0 + dx, WALK + 4, false, 1.1));
  for (const [dx, s] of [[4500, 1.2], [4780, 1], [5250, 1.2]] as const) props.push(new Topiary(ctx, x0 + dx, WALK + 4, false, s));
  props.push(new Palm(ctx, x0 + 5450, WALK - 2, 220, -0.15, false));
  props.push(new Palm(ctx, x0 + 5650, WALK - 2, 190, 0.2, false));
  // Near side: topiaries in planters and a few palms along the parade route.
  for (const dx of [900, 1900, 2900, 4900]) props.push(new Topiary(ctx, x0 + dx, 74, true, 0.8));
  for (const [dx, s] of [[-300, 200], [1400, 210], [5500, 220]] as const) props.push(new Palm(ctx, x0 + dx, 70, s, 0.1, true));
  // The gate's near arch goes in front of the car (front layer).
  props.push(new GateArch(ctx, x0 + 300));
  return { props, doorX: castle.doorX };
}
