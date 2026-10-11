// The living parts of Washington's National Mall: cherry blossom trees, the Reflecting Pool with
// its ducks, the Tidal Basin with paddle boats, elms, squirrels, joggers and a school group,
// and an ice-cream truck (vehicles: no faces; people and animals may have them).
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, SKIN, darken, lighten } from '../../style/palette';
import { contactShadow, cornerRect } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { rand } from '../../core/rng';
import { WALK } from './common';
import { signText } from '../../signs/Signs';

export const BLOSSOM = [0xffc2d6, 0xffb0c9, 0xf7a3c0, 0xffd6e4];
const WATER = 0x6cc2e6;
const WATER_DEEP = 0x56b0d8;

// ---------- Cherry blossom tree ----------
export class CherryTree extends Prop {
  private crown = new Container();
  private t = rand(0, 5);
  private puffs: [number, number, number][] = [];

  /** `front`: on the near side of the road (front layer), otherwise behind the sidewalk. */
  constructor(ctx: Ctx, x: number, private size = 150, front = false, y?: number) {
    super(ctx, x, y ?? (front ? 64 : WALK - 2));
    this.layer = front ? 'front' : 'back';
    const s = size;
    const g = new Graphics();
    contactShadow(g, 0, 0, s * 0.9);
    // a low, spreading trunk with two big limbs
    g.moveTo(-s * 0.05, 0).quadraticCurveTo(-s * 0.02, -s * 0.25, -s * 0.22, -s * 0.48).lineTo(-s * 0.16, -s * 0.5)
      .quadraticCurveTo(s * 0.02, -s * 0.3, s * 0.03, -s * 0.36).quadraticCurveTo(s * 0.12, -s * 0.46, s * 0.26, -s * 0.5)
      .lineTo(s * 0.28, -s * 0.46).quadraticCurveTo(s * 0.1, -s * 0.34, s * 0.06, 0).closePath().fill(0x6e5246);
    this.view.addChild(g);
    // the blossom cloud
    const c = new Graphics();
    const blobs: [number, number, number, number][] = [
      [-0.3, -0.58, 0.26, 1], [0.0, -0.7, 0.32, 0], [0.32, -0.6, 0.26, 2], [-0.12, -0.5, 0.22, 3], [0.18, -0.46, 0.2, 1], [0.05, -0.85, 0.2, 2],
    ];
    for (const [bx, by, br, ci] of blobs) {
      c.circle(bx * s, by * s, br * s).fill(BLOSSOM[ci]);
      this.puffs.push([bx * s, by * s, br * s]);
    }
    c.circle(s * 0.18, -s * 0.62, s * 0.22).fill({ color: darken(BLOSSOM[2], 0.06), alpha: 0.6 });
    c.ellipse(-s * 0.12, -s * 0.84, s * 0.12, s * 0.05).fill({ color: P.white, alpha: 0.35 });
    // a few darker branch hints and white sparkles of open flowers
    for (let k = 0; k < 14; k++) {
      const [bx, by, br] = this.puffs[k % this.puffs.length];
      const a = (k * 2.4) % (Math.PI * 2);
      c.circle(bx + Math.cos(a) * br * 0.6, by + Math.sin(a) * br * 0.6, s * 0.018).fill(P.white);
    }
    this.crown.addChild(c);
    this.crown.pivot.set(0, -s * 0.45);
    this.crown.position.set(0, -s * 0.45);
    this.view.addChild(this.crown);
    this.hits = [{ x: -s * 0.6, y: -s * 1.05, w: s * 1.2, h: s * 1.05 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.crown;
  }

  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.sfx.sparkle();
    this.ctx.tweens.wobble(this.crown, 0.07, 0.9, 0.05);
    // petals swirl off in the breeze
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y - this.size * 0.7, count: 22, shape: 'heart', tint: BLOSSOM, spread: this.size * 0.5,
      speed: [40, 160], angle: [-2.8, -0.2], gravity: 40, drag: 1.2, life: [1.4, 2.2], size: [6, 10], spin: 4, vx: 60,
    });
  }

  update(dt: number): void {
    // an occasional petal drifts down
    this.t -= dt;
    if (this.t <= 0) {
      this.t = rand(1.2, 3.5);
      this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + rand(-this.size * 0.4, this.size * 0.4), y: this.y - this.size * 0.6, count: 1, shape: 'heart', tint: BLOSSOM,
        speed: [10, 40], angle: [0.2, 1.2], gravity: 25, drag: 0.6, life: [2.0, 3.0], size: [5, 8], spin: 3, vx: 30,
      });
    }
  }
}

// ---------- A big round elm (lines the Mall) ----------
export class Elm extends Prop {
  private crown = new Container();
  constructor(ctx: Ctx, x: number, private size = 200) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const s = size;
    const g = new Graphics();
    contactShadow(g, 0, 0, s * 0.7);
    g.roundRect(-s * 0.05, -s * 0.5, s * 0.1, s * 0.5, s * 0.03).fill(0x6b5240);
    this.view.addChild(g);
    const c = new Graphics();
    c.ellipse(0, -s * 0.72, s * 0.42, s * 0.34).fill(0x5d9b4f);
    c.ellipse(-s * 0.2, -s * 0.62, s * 0.26, s * 0.22).fill(0x5d9b4f);
    c.ellipse(s * 0.22, -s * 0.64, s * 0.26, s * 0.22).fill(0x4f8c44);
    c.ellipse(-s * 0.12, -s * 0.86, s * 0.16, s * 0.08).fill({ color: P.white, alpha: 0.15 });
    this.crown.addChild(c);
    this.crown.pivot.set(0, -s * 0.5);
    this.crown.position.set(0, -s * 0.5);
    this.view.addChild(this.crown);
    this.hits = [{ x: -s * 0.45, y: -s * 1.08, w: s * 0.9, h: s * 1.08 }];
  }
  hintTarget(): Container {
    return this.crown;
  }
  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.sfx.tweet();
    this.ctx.tweens.wobble(this.crown, 0.05, 0.8, 0.04);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - this.size * 0.75, count: 8, shape: 'circle', tint: [0x5d9b4f, 0x7fb86a], speed: [60, 160], angle: [-2.8, -0.3], gravity: 300, life: [0.6, 1.0], size: [6, 9] });
  }
}

// ---------- A duck (an animal: it may have an eye) ----------
function duck(color: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.ellipse(0, -6, 13, 7).fill(0x8a6a4a);
  g.poly([-12, -8, -18, -12, -11, -4]).fill(0x8a6a4a);
  g.circle(10, -14, 6).fill(color);
  g.poly([15, -15, 22, -13, 15, -11]).fill(0xf2a33d);
  g.circle(11, -16, 1.4).fill(0x1d1b1a);
  g.ellipse(-2, -9, 7, 3).fill({ color: P.white, alpha: 0.35 });
  g.rect(5, -10, 7, 2).fill(P.white);
  c.addChild(g);
  return c;
}

// ---------- The Reflecting Pool: a long band of water behind the sidewalk, with ducks ----------
export class ReflectingPool extends Prop {
  private ducks: { c: Container; home: number; t: number; away: number }[] = [];

  constructor(ctx: Ctx, x: number, len: number) {
    super(ctx, x, WALK - 6);
    this.layer = 'back';
    const g = new Graphics();
    // granite rim, then the long still water (it reads as lying flat, behind the walk)
    g.roundRect(0, -30, len, 30, 10).fill(0xdcd5c5);
    g.roundRect(8, -25, len - 16, 20, 8).fill(WATER);
    g.roundRect(8, -14, len - 16, 9, 5).fill(WATER_DEEP);
    // pale reflection streaks (the sky, and a hint of the monuments at each end)
    for (let k = 0; k < Math.floor(len / 160); k++) g.roundRect(30 + k * 160 + (k % 3) * 20, -21 + (k % 2) * 6, 60, 2.5, 1.25).fill({ color: P.white, alpha: 0.55 });
    g.roundRect(len - 70, -22, 12, 14, 3).fill({ color: P.white, alpha: 0.35 });
    g.roundRect(30, -22, 40, 8, 3).fill({ color: P.white, alpha: 0.3 });
    this.view.addChild(g);
    const colors = [0x2f7d4a, 0x2f7d4a, 0x8a6a4a, 0x2f7d4a, 0x8a6a4a];
    for (let k = 0; k < 5; k++) {
      const d = duck(colors[k]);
      const home = len * (0.15 + k * 0.17);
      d.position.set(home, -10);
      if (k % 2) d.scale.x = -1;
      this.ducks.push({ c: d, home, t: rand(0, 6), away: 0 });
      this.view.addChild(d);
    }
    this.hits = [{ x: 0, y: -40, w: len, h: 44 }];
    this.extent = [-400, len + 400];
  }

  hintTarget(): Container {
    return this.ducks[2].c;
  }

  onTap(wx: number): void {
    const lx = wx - this.view.x;
    this.ctx.sfx.plip();
    // a ring of ripples where you tapped
    const r = new Graphics();
    r.ellipse(0, 0, 20, 4).stroke({ width: 2, color: P.white, alpha: 0.8 });
    r.position.set(lx, -16);
    this.view.addChild(r);
    this.ctx.tweens.add(1.0, (p) => {
      if (r.destroyed) return;
      r.scale.set(1 + p * 3, 1 + p * 1.5);
      r.alpha = 1 - p;
    }, { done: () => !r.destroyed && r.destroy() });
    // nearby ducks quack and paddle away, then drift home
    let quacked = false;
    for (const d of this.ducks) {
      if (Math.abs(d.c.x - lx) > 260) continue;
      if (!quacked) {
        this.ctx.sfx.quack();
        quacked = true;
      }
      d.away = Math.sign(d.c.x - lx || 1) * rand(60, 120);
      d.c.scale.x = Math.sign(d.away);
      this.ctx.fx.emit(this.ctx.layers.fxBack, { x: this.view.x + d.c.x, y: this.y - 14, count: 4, shape: 'drop', tint: [WATER, P.white], speed: [40, 120], angle: [-2.6, -0.5], gravity: 600, life: [0.3, 0.5], size: [5, 8], rotate: false });
    }
  }

  update(dt: number): void {
    for (const d of this.ducks) {
      d.t += dt;
      if (d.away !== 0) {
        const target = d.home + d.away;
        d.c.x += (target - d.c.x) * Math.min(1, dt * 2);
        if (Math.abs(target - d.c.x) < 2) d.away *= 0.0001;
        if (Math.abs(d.away) < 1) d.away = 0;
      } else {
        d.c.x += Math.sin(d.t * 0.4) * dt * 8;
        if (Math.abs(d.c.x - d.home) > 2) d.c.x += (d.home - d.c.x) * dt * 0.15;
      }
      d.c.y = -10 + Math.sin(d.t * 2) * 1;
    }
  }
}

// ---------- The Tidal Basin (near side) with a paddle boat or two ----------
export class TidalBasin extends Prop {
  private glints: Graphics[] = [];
  private t = 0;

  /** `openLeft`: the water runs straight on to the left (it continues the river under a bridge). */
  constructor(ctx: Ctx, x: number, private len: number, openLeft = false) {
    super(ctx, x, 0);
    this.layer = 'front';
    const g = new Graphics();
    const top = 64, bottom = 420;
    // the basin (the same blue as the river under the bridge, so they join seamlessly)
    if (openLeft) g.moveTo(-2, bottom).lineTo(-2, top);
    else g.moveTo(-160, bottom).quadraticCurveTo(-70, top, 60, top);
    g.lineTo(len - 60, top).quadraticCurveTo(len + 70, top, len + 160, bottom).closePath().fill(P.water);
    g.roundRect(openLeft ? 200 : 30, top + 60, len - (openLeft ? 230 : 60), bottom, 40).fill({ color: WATER_DEEP, alpha: 0.6 });
    // the low stone edge right below the road's shoulder (it starts where the land does)
    const e0 = openLeft ? 240 : 40;
    g.roundRect(e0, top - 8, len - e0 - 40, 12, 5).fill(0xdcd5c5);
    g.rect(e0, top + 3, len - e0 - 40, 2).fill({ color: P.black, alpha: 0.08 });
    this.view.addChild(g);
    for (let k = 0; k < Math.floor(len / 220); k++) {
      const s = new Graphics().roundRect(0, 0, rand(30, 70), 3, 1.5).fill({ color: P.white, alpha: 0.6 });
      s.position.set(k * 220 + rand(40, 160), top + rand(24, 150));
      this.glints.push(s);
      this.view.addChild(s);
    }
    this.hits = [{ x: 0, y: top, w: len, h: 180 }];
    this.extent = [-300, len + 300];
  }

  onTap(wx: number, wy: number): void {
    this.ctx.sfx.plip();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: wx, y: wy, count: 8, shape: 'drop', tint: [P.water, P.white], speed: [80, 220], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.7], size: [6, 10], rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.glints.forEach((s, k) => {
      s.x += dt * 10;
      if (s.x > this.len - 80) s.x = 60;
      s.alpha = 0.4 + 0.4 * Math.sin(this.t * 1.4 + k);
    });
  }
}

/** A pedal boat on the Tidal Basin: a little two-seater (a boat: no face). */
export class PaddleBoat extends Prop {
  private boat = new Container();
  private wheel = new Graphics();
  private t = rand(0, 6);
  private homeX: number;
  private spin = 0;
  private dx = 0;

  constructor(ctx: Ctx, x: number, y: number, color = 0x3f8fd8, private dir: 1 | -1 = 1) {
    super(ctx, x, y);
    this.layer = 'front';
    this.homeX = x;
    const g = new Graphics();
    g.ellipse(0, 4, 60, 8).fill({ color: P.black, alpha: 0.08 });
    g.moveTo(-54, -14).lineTo(52, -14).quadraticCurveTo(64, -14, 58, 2).lineTo(-48, 2).quadraticCurveTo(-60, 0, -54, -14).fill(color);
    g.roundRect(-50, -14, 100, 4, 2).fill(lighten(color, 0.35));
    g.rect(58 - 106 * 0.28, -14, 106 * 0.28 - 6, 16).fill({ color: P.black, alpha: 0.07 });
    // canopy on two posts
    g.roundRect(-36, -58, 4, 44, 2).fill(P.white);
    g.roundRect(28, -58, 4, 44, 2).fill(P.white);
    g.roundRect(-46, -64, 88, 10, 5).fill(0xffd166);
    for (let k = 0; k < 4; k++) g.roundRect(-46 + k * 22, -64, 11, 10, 3).fill(P.white);
    // two riders
    for (const [rx, shirt, skin, hair] of [[-14, 0xe9637a, SKIN[0], 0xb5763c], [10, 0x3f7fd1, SKIN[2], 0x1f1a17]] as const) {
      g.roundRect(rx - 8, -34, 16, 20, 7).fill(shirt);
      g.circle(rx, -40, 7).fill(skin);
      g.ellipse(rx, -45, 7, 3.5).fill(hair);
      g.circle(rx + 2.5, -40, 1.1).fill(0x2a2a2a);
    }
    this.boat.addChild(g);
    // the paddle wheel at the stern
    this.wheel.circle(0, 0, 13).fill(darken(color, 0.2));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      this.wheel.roundRect(Math.cos(a) * 9 - 3, Math.sin(a) * 9 - 3, 6, 6, 2).fill(P.white);
    }
    this.wheel.position.set(-52, -4);
    this.boat.addChild(this.wheel);
    this.boat.scale.x = dir;
    this.view.addChild(this.boat);
    this.hits = [{ x: -66, y: -70, w: 132, h: 76 }];
    this.extent = [-700, 700];
  }

  hintTarget(): Container {
    return this.boat;
  }

  onTap(): void {
    this.ctx.sfx.giggle();
    this.spin = 2.2;
    this.dx = this.dir * rand(120, 200);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.view.x - this.dir * 50, y: this.y - 6, count: 10, shape: 'drop', tint: [WATER, P.white], speed: [80, 200], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.7], size: [6, 10], rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.spin = Math.max(0, this.spin - dt);
    this.wheel.rotation += dt * (1 + this.spin * 6) * this.dir;
    // pedal out on a tap, then drift back home
    const target = this.homeX + this.dx + Math.sin(this.t * 0.3) * 40;
    this.view.x += (target - this.view.x) * Math.min(1, dt * (this.spin > 0 ? 1.4 : 0.3));
    if (this.spin <= 0) this.dx *= Math.exp(-dt * 0.25);
    this.boat.y = Math.sin(this.t * 1.8) * 2.5;
    this.boat.rotation = Math.sin(this.t * 1.3) * 0.025;
  }
}

// ---------- A squirrel at the foot of a tree ----------
export class Squirrel extends Prop {
  private body = new Container();
  private tail = new Graphics();
  private busy = false;
  private t = rand(0, 4);

  constructor(ctx: Ctx, x: number, private climb = 120) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    g.ellipse(0, -10, 11, 8).fill(0x8b8f96);
    g.circle(9, -18, 6).fill(0x8b8f96);
    g.circle(8, -24, 2.5).fill(0x8b8f96);
    g.circle(11, -19, 1.3).fill(0x1d1b1a);
    g.circle(15, -17, 1.2).fill(0x5a4a4a);
    g.ellipse(-2, -7, 6, 4).fill(0xd8d4cc);
    this.tail.ellipse(0, -12, 7, 14).fill(0x9aa0a8);
    this.tail.position.set(-12, -6);
    this.tail.rotation = -0.3;
    this.body.addChild(this.tail, g);
    this.view.addChild(this.body);
    this.hits = [{ x: -26, y: -36, w: 52, h: 38 }];
  }

  hintTarget(): Container {
    return this.body;
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    this.ctx.sfx.squeak();
    // scamper up the tree trunk behind it and back down
    this.ctx.tweens.add(0.6, (p) => {
      if (this.body.destroyed) return;
      this.body.y = -this.climb * p;
      this.body.rotation = -Math.PI / 2 * Math.min(1, p * 3);
    }, { ease: ease.outQuad });
    this.ctx.tweens.add(0.7, (p) => {
      if (this.body.destroyed) return;
      this.body.y = -this.climb * (1 - p);
      this.body.rotation = -Math.PI / 2 * (1 - Math.min(1, p * 1.5));
    }, { delay: 1.4, ease: ease.inOutSine, done: () => (this.busy = false) });
    this.ctx.tweens.after(0.6, () => this.ctx.sfx.tick());
  }

  update(dt: number): void {
    this.t += dt;
    this.tail.rotation = -0.3 + Math.sin(this.t * 3) * 0.15;
  }
}

// ---------- People on the walk: a few joggers and a school group with a teacher ----------
interface Walker {
  c: Container;
  legs: Graphics[];
  arm: Container;
  x0: number;
  range: number;
  speed: number;
  dir: number;
  phase: number;
  hop: number;
}

function person(h: number, shirt: number, pants: number, skin: number, hair: number): { c: Container; legs: Graphics[]; arm: Container } {
  const c = new Container();
  const legs: Graphics[] = [];
  for (const lx of [-h * 0.06, h * 0.06]) {
    const l = new Graphics().roundRect(-h * 0.045, 0, h * 0.09, h * 0.42, h * 0.04).fill(pants);
    l.position.set(lx, -h * 0.42);
    legs.push(l);
    c.addChild(l);
  }
  const g = new Graphics();
  g.roundRect(-h * 0.16, -h * 0.78, h * 0.32, h * 0.4, h * 0.12).fill(shirt);
  cornerRect(g, h * 0.16 - h * 0.32 * 0.28, -h * 0.78, h * 0.32 * 0.28, h * 0.4, 0, h * 0.12, h * 0.12, 0).fill({ color: P.black, alpha: 0.07 });
  const r = h * 0.16, hy = -h * 0.78 - r * 0.9;
  g.circle(0, hy, r).fill(skin);
  g.moveTo(-r, hy - r * 0.1).quadraticCurveTo(-r, hy - r * 1.25, 0, hy - r * 1.1).quadraticCurveTo(r, hy - r * 1.25, r, hy - r * 0.1)
    .quadraticCurveTo(0, hy - r * 0.7, -r, hy - r * 0.1).fill(hair);
  g.circle(r * 0.4, hy + r * 0.05, r * 0.12).fill(0x2a2a2a);
  g.moveTo(r * 0.05, hy + r * 0.4).quadraticCurveTo(r * 0.35, hy + r * 0.62, r * 0.6, hy + r * 0.38).stroke({ width: Math.max(1.2, r * 0.12), color: 0x6a3b2e, cap: 'round' });
  c.addChild(g);
  const arm = new Container();
  arm.addChild(new Graphics().roundRect(-h * 0.04, 0, h * 0.08, h * 0.32, h * 0.04).fill(shirt));
  arm.position.set(h * 0.02, -h * 0.74);
  c.addChild(arm);
  return { c, legs, arm };
}

export class Walkers extends Prop {
  private people: Walker[] = [];
  private t = 0;

  /** `kind`: 'joggers' run back and forth; 'school' is a teacher leading a line of kids. */
  constructor(ctx: Ctx, x: number, private kind: 'joggers' | 'school', private range = 600) {
    super(ctx, x, WALK + 4);
    this.layer = 'back';
    const shirts = [0xf7c934, 0x7fbf6a, 0x3f7fd1, 0xe9637a, 0xc5a3ff, 0xff9f43];
    if (kind === 'joggers') {
      for (let k = 0; k < 2; k++) {
        const p = person(96, k ? 0xe94b3c : 0x2fa3a0, 0x3b4a5c, SKIN[k * 2], k ? 0x3a2a20 : 0xb5763c);
        this.add(p, k * 160, k ? -1 : 1, 120, 96);
      }
    } else {
      const t = person(110, 0x5a6a8a, 0x3b4148, SKIN[1], 0x5a3a28);
      this.add(t, 0, 1, 34, 110);
      for (let k = 0; k < 5; k++) {
        const kid = person(62 + (k % 2) * 6, shirts[k], [0x2f80d1, 0x5a4a6a][k % 2], SKIN[(k + 1) % SKIN.length], [0x1f1a17, 0xb5763c, 0x3a2a20][k % 3]);
        this.add(kid, -60 - k * 46, 1, 34, 64);
      }
    }
    this.hits = [{ x: -range * 0.1 - 300, y: -130, w: range + 600, h: 140 }];
    this.extent = [-range - 600, range + 600];
  }

  private add(p: { c: Container; legs: Graphics[]; arm: Container }, offset: number, dir: number, speed: number, _h: number): void {
    p.c.x = offset;
    p.c.scale.x = dir;
    this.people.push({ c: p.c, legs: p.legs, arm: p.arm, x0: 0, range: this.range, speed, dir, phase: rand(0, 6), hop: 0 });
    this.view.addChild(p.c);
  }

  hintTarget(): Container {
    return this.people[0].c;
  }

  /** Only the people themselves are tappable (not the whole stretch they walk along). */
  hitTest(wx: number, wy: number, pad = 18): boolean {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    return this.people.some((p) => Math.abs(lx - p.c.x) < 26 + pad && ly > -120 - pad && ly < 6 + pad);
  }

  onTap(wx: number): void {
    const lx = wx - this.view.x;
    let best = this.people[0];
    for (const p of this.people) if (Math.abs(p.c.x - lx) < Math.abs(best.c.x - lx)) best = p;
    // everyone near waves and hops; a tap on the school group gets giggles
    this.ctx.sfx.giggle();
    for (const p of this.people) {
      if (Math.abs(p.c.x - best.c.x) > 260) continue;
      p.hop = 0.5;
    }
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.view.x + best.c.x, y: this.y - 120, count: 6, shape: 'heart', tint: [0xff6f91, 0xff9eb5], speed: [60, 140], angle: [-2.4, -0.7], gravity: -60, drag: 1.2, life: [0.9, 1.4], size: [12, 18], spin: 1 });
  }

  update(dt: number): void {
    this.t += dt;
    for (const p of this.people) {
      p.phase += dt * (this.kind === 'joggers' ? 9 : 6);
      // walk the loop: out to the end of the range, turn around, come back
      p.c.x += p.dir * p.speed * dt;
      if (p.c.x > this.range && p.dir > 0) p.dir = -1;
      if (p.c.x < -this.range * 0.1 - (this.kind === 'school' ? 260 : 0) && p.dir < 0) p.dir = 1;
      p.c.scale.x = p.dir;
      const sw = Math.sin(p.phase) * (this.kind === 'joggers' ? 0.55 : 0.35);
      p.legs[0].rotation = sw;
      p.legs[1].rotation = -sw;
      p.hop = Math.max(0, p.hop - dt);
      if (p.hop > 0) {
        p.arm.rotation = Math.PI * 0.85 + Math.sin(this.t * 14) * 0.3;
        p.c.y = -Math.abs(Math.sin(p.hop * Math.PI * 2)) * 14;
      } else {
        p.arm.rotation = -sw * 0.8;
        p.c.y = this.kind === 'joggers' ? -Math.abs(Math.sin(p.phase)) * 4 : 0;
      }
    }
  }
}

// ---------- An ice-cream truck (parody: "Mister Scoop"; a vehicle, so no face) ----------
export class IceCreamTruck extends Prop {
  private truck = new Container();
  private cone = new Container();
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK + 6);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 230);
    // body: tall box with a cab on the right
    g.roundRect(-110, -118, 170, 100, 12).fill(P.white);
    g.roundRect(60, -84, 56, 66, 12).fill(P.white);
    g.roundRect(70, -78, 34, 24, 6).fill(0xbfe0f2);
    g.roundRect(-110, -40, 226, 22, 8).fill(0xff8fb1);
    g.roundRect(-110 + 226 * 0.72, -118, 226 * 0.28 - 4, 100, 12).fill({ color: P.black, alpha: 0.05 });
    // serving window with a striped awning
    g.roundRect(-90, -100, 110, 44, 6).fill(0x8fd3e8);
    for (let k = 0; k < 6; k++) g.roundRect(-96 + k * 21, -112, 21, 12, k === 0 ? 5 : 2).fill(k % 2 ? P.white : 0xff8fb1);
    // sprinkles and a big cone on the side
    for (const [sx, sy, c] of [[-60, -60, 0xffd166], [-30, -64, 0x7fd1ff], [0, -58, 0xb59cff], [-80, -54, 0x7fe0a8]] as const) g.roundRect(sx, sy, 8, 3, 1.5).fill(c);
    // wheels
    for (const wx of [-70, 80]) {
      g.circle(wx, -16, 17).fill(0x2b2f33);
      g.circle(wx, -16, 7).fill(0xc7ccd3);
    }
    this.truck.addChild(g);
    const name = new Graphics();
    name.roundRect(-108, -138, 150, 22, 8).fill(0xff8fb1);
    this.truck.addChild(name);
    const label = signText('MISTER SCOOP', 13, P.white, '900');
    label.position.set(-33, -127);
    this.truck.addChild(label);
    // the giant cone on the roof
    const cg = new Graphics();
    cg.poly([-14, -20, 14, -20, 0, 22]).fill(0xe0a96d);
    for (let k = 0; k < 3; k++) cg.moveTo(-10 + k * 7, -16).lineTo(-2 + k * 4, 10).stroke({ width: 1.5, color: 0xc98d53 });
    cg.circle(-6, -26, 12).fill(0xffc2d6);
    cg.circle(7, -27, 12).fill(0xfff4cf);
    cg.circle(0, -38, 11).fill(0xa76d4b);
    cg.circle(2, -50, 4).fill(0xe5483f);
    this.cone.addChild(cg);
    this.cone.position.set(-40, -158);
    this.truck.addChild(this.cone);
    this.view.addChild(this.truck);
    this.hits = [{ x: -120, y: -210, w: 250, h: 210 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.cone;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.cone, 0.2, 0.8, 0.12);
    this.ctx.tweens.wobble(this.truck, 0.01, 0.5, 0.03);
    if (this.busy) return;
    this.busy = true;
    this.ctx.sfx.musicBox();
    // a little cone hops out of the window and bounces
    const c = new Graphics();
    c.poly([-6, -8, 6, -8, 0, 10]).fill(0xe0a96d);
    c.circle(0, -12, 7).fill([0xffc2d6, 0xfff4cf, 0xa76d4b][Math.floor(rand(0, 3))]);
    const sx = this.x - 40, sy = this.y - 80;
    c.position.set(sx, sy);
    this.ctx.layers.fx.addChild(c);
    const vx = rand(-140, 140);
    this.ctx.tweens.add(1.0, (p) => {
      if (c.destroyed) return;
      c.position.set(sx + vx * p, sy - Math.sin(p * Math.PI) * 140 + p * 70);
      c.rotation = p * 4;
    }, {
      done: () => {
        this.ctx.sfx.pop();
        this.ctx.fx.emit(this.ctx.layers.fx, { x: c.x, y: c.y, count: 8, shape: 'star', tint: [0xffc2d6, 0xfff4cf, 0xffd166], speed: [60, 180], gravity: 300, life: [0.4, 0.7], size: [8, 12] });
        if (!c.destroyed) c.destroy();
        this.busy = false;
      },
    });
  }
}

