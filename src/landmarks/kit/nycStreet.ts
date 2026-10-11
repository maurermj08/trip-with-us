// New York street life and the harbor: yellow cabs, food carts, a subway entrance, steam from a
// manhole, pigeons, a fire hydrant, Central Park with a horse carriage, the Statue of Liberty
// out in the harbor and the Brooklyn Bridge across the East River.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, SKIN, darken, lighten } from '../../style/palette';
import { contactShadow, cornerRect, roundTree } from '../../style/shapes';
import { rand } from '../../core/rng';
import { ease } from '../../core/Tween';
import { ROAD_FAR, LANE_Y } from '../../world/Road';
import { WALK } from './common';
import { pigeon } from './nycBuildings';

const CAB = 0xf7c934;

// ---------- Yellow cab parked at the curb (a vehicle: no face) ----------
export class Cab extends Prop {
  private car = new Container();
  private roofLight = new Graphics();
  private t = rand(0, 5);

  constructor(ctx: Ctx, x: number, dir: 1 | -1 = 1) {
    super(ctx, x, ROAD_FAR - 1);
    this.layer = 'back';
    this.view.zIndex = 3;
    const g = new Graphics();
    contactShadow(g, 0, 0, 150);
    // body: low sedan, darker lower band, one gloss stripe
    g.roundRect(-72, -40, 144, 30, 12).fill(CAB);
    g.moveTo(-42, -40).quadraticCurveTo(-34, -66, -10, -68).lineTo(24, -68).quadraticCurveTo(42, -66, 50, -40).closePath().fill(CAB);
    g.roundRect(-72, -20, 144, 10, 5).fill(darken(CAB, 0.15));
    g.roundRect(-34, -62, 34, 20, 5).fill(0xbfe0f2);
    g.roundRect(4, -62, 36, 20, 5).fill(0xbfe0f2);
    g.poly([-28, -60, -20, -60, -30, -44, -34, -44]).fill({ color: P.white, alpha: 0.5 });
    g.roundRect(-66, -36, 132, 3, 1.5).fill({ color: P.white, alpha: 0.45 });
    // the checker stripe (generic, no company marks)
    for (let k = 0; k < 14; k++) g.rect(-70 + k * 10, -30, 5, 5).fill(k % 2 ? 0x2b2f33 : P.white);
    g.roundRect(64, -34, 8, 8, 3).fill(0xfff1bf);
    g.roundRect(-72, -34, 6, 8, 3).fill(0xe5483f);
    // wheels
    for (const wx of [-44, 44]) {
      g.circle(wx, -10, 13).fill(0x24262a);
      g.circle(wx, -10, 6).fill(0xb8bec6);
    }
    this.car.addChild(g);
    this.roofLight.roundRect(-14, -78, 28, 10, 4).fill(0xfff4cf);
    this.car.addChild(this.roofLight);
    this.car.scale.set(0.82 * dir, 0.82);
    this.view.addChild(this.car);
    this.hits = [{ x: -62, y: -70, w: 124, h: 72 }];
    this.extent = [-400, 400];
  }

  hintTarget(): Container {
    return this.car;
  }

  onTap(): void {
    this.ctx.sfx.honk(1.15);
    const sy = this.car.scale.y;
    this.ctx.tweens.add(0.4, (p) => !this.car.destroyed && (this.car.scale.y = sy * (1 + Math.sin(p * Math.PI * 2) * 0.05)));
    this.ctx.tweens.add(0.9, (p) => !this.roofLight.destroyed && (this.roofLight.alpha = Math.sin(p * Math.PI * 6) > 0 ? 1 : 0.3), { done: () => (this.roofLight.alpha = 1) });
  }

  update(dt: number): void {
    // idling: a tiny engine shimmy
    this.t += dt;
    this.car.y = Math.sin(this.t * 28) * 0.4;
  }
}

// ---------- Food cart (hot dogs or pretzels) ----------
export class FoodCart extends Prop {
  private umbrella = new Container();
  constructor(ctx: Ctx, x: number, private kind: 'hotdog' | 'pretzel' = 'hotdog') {
    super(ctx, x, WALK + 2);
    this.layer = 'back';
    this.view.zIndex = 2;
    const g = new Graphics();
    contactShadow(g, 0, 0, 110);
    g.roundRect(-46, -58, 92, 44, 6).fill(0xdfe4ea);
    g.roundRect(-46, -58, 92, 10, 4).fill(kind === 'hotdog' ? 0xd8392b : 0x2f6fd1);
    cornerRect(g, 46 - 92 * 0.28, -58, 92 * 0.28, 44, 0, 6, 6, 0).fill({ color: P.black, alpha: 0.07 });
    g.circle(-28, -10, 10).fill(0x2b2f33);
    g.circle(26, -10, 10).fill(0x2b2f33);
    g.roundRect(46, -48, 20, 4, 2).fill(0x9aa3ad);
    // the goods on top
    if (kind === 'hotdog') {
      for (const hx of [-26, 0, 24]) {
        g.roundRect(hx - 11, -66, 22, 9, 4.5).fill(0xe8b56a);
        g.roundRect(hx - 9, -67, 18, 5, 2.5).fill(0xb4553a);
      }
    } else {
      for (const hx of [-22, 18]) {
        g.circle(hx - 6, -68, 8).fill(0xb06b2f);
        g.circle(hx + 6, -68, 8).fill(0xb06b2f);
        g.circle(hx - 6, -68, 3.5).fill(0xdfe4ea);
        g.circle(hx + 6, -68, 3.5).fill(0xdfe4ea);
      }
    }
    // the vendor (people may have faces)
    g.roundRect(54, -64, 22, 34, 8).fill(0x4f7fb8);
    g.roundRect(56, -30, 7, 30, 3).fill(0x3b4a5c);
    g.roundRect(67, -30, 7, 30, 3).fill(0x3b4a5c);
    g.circle(65, -74, 11).fill(SKIN[1]);
    g.roundRect(54, -88, 22, 8, 4).fill(0xd8392b);
    g.circle(62, -74, 1.6).fill(0x2a2a2a);
    g.circle(69, -74, 1.6).fill(0x2a2a2a);
    this.view.addChild(g);
    // striped umbrella
    const u = new Graphics();
    u.roundRect(-2, -60, 4, 60, 2).fill(0x9aa3ad);
    const cols = kind === 'hotdog' ? [0xd8392b, 0xffd166] : [0x2f6fd1, P.white];
    for (let k = 0; k < 6; k++) {
      const a0 = Math.PI + (k / 6) * Math.PI, a1 = Math.PI + ((k + 1) / 6) * Math.PI;
      u.moveTo(0, -60).lineTo(Math.cos(a0) * 64, -60 + Math.sin(a0) * 22).lineTo(Math.cos(a1) * 64, -60 + Math.sin(a1) * 22).closePath().fill(cols[k % 2]);
    }
    this.umbrella.addChild(u);
    this.umbrella.position.set(0, -58);
    this.view.addChild(this.umbrella);
    this.hits = [{ x: -70, y: -150, w: 150, h: 150 }];
    this.extent = [-300, 300];
  }

  hintTarget(): Container {
    return this.umbrella;
  }

  onTap(): void {
    this.ctx.sfx.pop();
    this.ctx.tweens.after(0.12, () => this.ctx.sfx.pop());
    this.ctx.tweens.wobble(this.umbrella, 0.18, 0.8, 0.08);
    const tint = this.kind === 'hotdog' ? [0xe8b56a, 0xb4553a, 0xffd166] : [0xb06b2f, 0xdfe4ea];
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 80, count: 7, shape: 'circle', tint, speed: [160, 320], angle: [-2.4, -0.7], gravity: 700, life: [0.7, 1.1], size: [12, 18] });
  }
}

// ---------- Subway entrance: rumble and a gust of wind ----------
export class SubwayEntrance extends Prop {
  private globes: Graphics[] = [];
  private frame = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK + 2);
    this.layer = 'back';
    this.view.zIndex = 2;
    const g = new Graphics();
    contactShadow(g, 0, 0, 160);
    // stairs going down (seen as a dark opening) behind green rails
    g.roundRect(-70, -16, 140, 16, 3).fill(0x3b4148);
    for (let k = 0; k < 4; k++) g.rect(-64 + k * 6, -14 + k * 3, 128 - k * 12, 2).fill({ color: P.white, alpha: 0.12 });
    const rail = 0x2f6b4f;
    for (const s of [-1, 1]) {
      g.roundRect(s * 70 - 3, -60, 6, 60, 2).fill(rail);
      g.roundRect(s > 0 ? 6 : -70, -60, 64, 5, 2).fill(rail);
      for (let k = 1; k < 5; k++) g.rect(s > 0 ? 6 + k * 13 : -70 + k * 13, -56, 2, 40).fill(rail);
    }
    this.frame.addChild(g);
    for (const s of [-1, 1]) {
      const post = new Graphics().roundRect(s * 70 - 2, -96, 4, 36, 2).fill(rail);
      const globe = new Graphics().circle(s * 70, -102, 10).fill(0x7fe0a8);
      globe.circle(s * 70 - 3, -105, 3).fill({ color: P.white, alpha: 0.6 });
      this.frame.addChild(post, globe);
      this.globes.push(globe);
    }
    this.view.addChild(this.frame);
    this.hits = [{ x: -80, y: -116, w: 160, h: 116 }];
    this.extent = [-300, 300];
  }

  hintTarget(): Container {
    return this.frame;
  }

  onTap(): void {
    const s = this.ctx.sfx;
    // a train rumbles by underneath: low noise + clackety ticks, the globes flicker, wind gusts up
    s.s.noise({ dur: 1.6, gain: 0.16, type: 'lowpass', freq: 220, to: 120, attack: 0.25 });
    for (let k = 0; k < 8; k++) s.s.tone({ freq: 160, to: 110, dur: 0.05, type: 'triangle', gain: 0.08, delay: 0.2 + k * 0.16 });
    this.ctx.tweens.wobble(this.frame, 0.02, 1.4, 0.04);
    this.globes.forEach((gl) => this.ctx.tweens.add(1.4, (p) => !gl.destroyed && (gl.alpha = Math.sin(p * 40) > 0 ? 1 : 0.5), { done: () => (gl.alpha = 1) }));
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 20, count: 14, shape: 'streak', tint: P.white, speed: [200, 420], angle: [-1.9, -1.2], gravity: 0, drag: 1.5, life: [0.4, 0.7], size: [24, 40], alpha: 0.6 });
  }
}

// ---------- Steam from a manhole in the road (drive through it!) ----------
export class SteamVent extends Prop {
  private cover = new Graphics();
  private t = 0;
  private boost = 0;
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, LANE_Y + 10);
    this.layer = 'roadDecor';
    this.cover.ellipse(0, 0, 30, 7).fill(0x4b4f56);
    this.cover.ellipse(0, -1, 24, 5).fill(0x5d6168);
    for (let k = -2; k <= 2; k++) this.cover.rect(k * 8 - 1, -4, 2, 6).fill({ color: P.black, alpha: 0.2 });
    // the orange-and-white steam chimney
    const stack = new Graphics();
    stack.roundRect(-9, -46, 18, 44, 6).fill(0xf28c3a);
    for (const sy of [-38, -22]) stack.rect(-9, sy, 18, 7).fill(P.white);
    this.view.addChild(this.cover, stack);
    this.hits = [{ x: -32, y: -56, w: 64, h: 64 }];
    this.bumpHalf = 40;
    this.bumpHeight = 60;
    this.extent = [-500, 500];
  }

  onTap(): void {
    this.boost = 1.2;
    this.ctx.sfx.whoosh();
  }

  onBump(): void {
    this.boost = 1.4;
    this.ctx.sfx.whoosh();
    this.ctx.bumpCar(0.2);
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    const rate = this.boost > 0 ? 0.03 : 0.14;
    while (this.t > rate) {
      this.t -= rate;
      this.ctx.fx.spawn(this.ctx.layers.mid, {
        x: this.x + rand(-4, 4), y: this.y - 48, shape: 'circle', tint: [0xf2f4f7, 0xe3e7ec], speed: [30, 70 + this.boost * 120],
        angle: [-1.8, -1.35], gravity: -30, drag: 1, life: [1.0, 1.6], size: [14, 20], grow: 2.6, alpha: 0.55, rotate: false,
      });
    }
  }
}

// ---------- Pigeons pecking on the sidewalk (scatter when the car zooms by) ----------
interface Bird { g: Graphics; homeX: number; vx: number; vy: number; flying: boolean; t: number }

export class Pigeons extends Prop {
  private birds: Bird[] = [];
  private away = 0;
  constructor(ctx: Ctx, x: number, n = 6) {
    super(ctx, x, WALK + 6);
    this.layer = 'back';
    this.view.zIndex = 4;
    for (let k = 0; k < n; k++) {
      const g = pigeon();
      g.position.set(k * 26 - n * 13, 0);
      if (k % 3 === 1) g.scale.x = -1;
      this.view.addChild(g);
      this.birds.push({ g, homeX: g.x, vx: 0, vy: 0, flying: false, t: rand(0, 6) });
    }
    this.hits = [{ x: -n * 13 - 14, y: -24, w: n * 26 + 14, h: 28 }];
    this.extent = [-1500, 1500];
  }

  onTap(): void {
    this.scatter();
  }

  private scatter(): void {
    if (this.away > 0) return;
    this.away = 4;
    this.ctx.sfx.tweet();
    this.ctx.tweens.after(0.12, () => this.ctx.sfx.tweet());
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 10, count: 6, shape: 'feather', tint: [0x8e96a3, 0xb8bec6], speed: [60, 160], gravity: 80, drag: 1.4, life: [0.8, 1.3], size: [8, 12], spin: 3 });
    for (const b of this.birds) {
      b.flying = true;
      b.vx = rand(-60, 220);
      b.vy = -rand(220, 340);
    }
  }

  update(dt: number): void {
    const d = this.ctx.car.x - this.x;
    if (Math.abs(d) < 260 && this.ctx.car.speed > 220) this.scatter();
    if (this.away > 0) {
      this.away -= dt;
      if (this.away <= 0) {
        for (const b of this.birds) {
          const sx = b.g.x, sy = b.g.y;
          b.flying = false;
          this.ctx.tweens.add(1.3, (p) => {
            if (b.g.destroyed) return;
            b.g.x = sx + (b.homeX - sx) * p;
            b.g.y = sy * (1 - p) - Math.sin(p * Math.PI) * 30;
          }, { ease: ease.inOutSine });
        }
      }
    }
    for (const b of this.birds) {
      b.t += dt;
      if (b.flying) {
        b.vy += 80 * dt;
        b.g.x += b.vx * dt;
        b.g.y += b.vy * dt;
        b.g.scale.y = 0.8 + Math.abs(Math.sin(b.t * 26)) * 0.4;
      } else if (this.away <= 0) {
        // pecking
        b.g.rotation = Math.max(0, Math.sin(b.t * 5)) * 0.35;
      }
    }
  }
}

// ---------- Fire hydrant on the near side (tap: it sprays!) ----------
export class Hydrant extends Prop {
  private body = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 60);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, 0, 0, 40);
    g.roundRect(-12, -34, 24, 34, 6).fill(0xd8392b);
    g.roundRect(-16, -6, 32, 6, 3).fill(0xb92d21);
    g.roundRect(-10, -44, 20, 12, 6).fill(0xd8392b);
    g.roundRect(-4, -50, 8, 8, 3).fill(0xb92d21);
    g.roundRect(-18, -26, 8, 8, 3).fill(0xb92d21);
    g.roundRect(10, -26, 8, 8, 3).fill(0xb92d21);
    g.roundRect(-9, -32, 4, 24, 2).fill({ color: P.white, alpha: 0.35 });
    this.body.addChild(g);
    this.view.addChild(this.body);
    this.hits = [{ x: -22, y: -54, w: 44, h: 54 }];
  }

  hintTarget(): Container {
    return this.body;
  }

  onTap(): void {
    this.ctx.sfx.splash(1.2);
    this.ctx.tweens.wobble(this.body, 0.1, 0.6, 0.12);
    for (let k = 0; k < 6; k++) {
      this.ctx.tweens.after(k * 0.12, () => this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + 14, y: this.y - 22, count: 8, shape: 'drop', tint: [P.water, 0xbfe6ff, P.white],
        speed: [260, 420], angle: [-0.9, -0.4], gravity: 900, life: [0.5, 0.9], size: [8, 12], rotate: false,
      }));
    }
  }
}

// ---------- Central Park: a stone wall, big trees, lamps and benches ----------
export class CentralPark extends Prop {
  private trees: Container[] = [];
  constructor(ctx: Ctx, x: number, len: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.view.zIndex = 0;
    const g = new Graphics();
    // lawn and a curving path behind the wall
    g.roundRect(-20, -60, len + 40, 64, 20).fill(0x8fcf6f);
    g.roundRect(0, -30, len, 12, 6).fill(0xe6dcc6);
    // a big grey rock outcrop (Manhattan schist!)
    g.ellipse(len * 0.62, -40, 70, 34).fill(0xa8a49c);
    g.ellipse(len * 0.6, -50, 40, 18).fill(0xbcb8b0);
    // a little pond with a rowboat
    g.ellipse(len * 0.3, -44, 110, 16).fill(P.water);
    g.ellipse(len * 0.3 - 30, -48, 30, 3).fill({ color: P.white, alpha: 0.5 });
    g.roundRect(len * 0.3 + 10, -54, 40, 10, 5).fill(0xb3743b);
    this.view.addChild(g);
    // trees (each one rustles on its own)
    for (let tx = 80; tx < len - 40; tx += 170 + ((tx * 7) % 60)) {
      const c = new Container();
      const t = new Graphics();
      roundTree(t, 0, -40, 150 + ((tx * 13) % 50), (tx / 170) % 2 > 1 ? P.leaf : 0x4f9e55);
      c.addChild(t);
      c.position.set(tx, 0);
      c.pivot.set(0, -40);
      c.y = -40;
      this.trees.push(c);
      this.view.addChild(c);
    }
    // low stone wall along the avenue, with lamps and benches in front
    const w = new Graphics();
    w.roundRect(0, -16, len, 18, 4).fill(0xc9c1b2);
    w.roundRect(0, -16, len, 4, 2).fill({ color: P.white, alpha: 0.4 });
    for (let lx = 140; lx < len; lx += 420) {
      w.roundRect(lx - 2, -96, 4, 82, 2).fill(0x2b2f33);
      w.circle(lx, -100, 8).fill(0xfff1bf);
      w.roundRect(lx + 60, -30, 70, 6, 3).fill(0x2f6b4f);
      w.roundRect(lx + 60, -46, 70, 6, 3).fill(0x2f6b4f);
      w.rect(lx + 64, -30, 4, 14).fill(0x2b2f33);
      w.rect(lx + 122, -30, 4, 14).fill(0x2b2f33);
    }
    this.view.addChild(w);
    this.hits = [{ x: 0, y: -260, w: len, h: 260 }];
    this.extent = [-300, len + 300];
  }

  onTap(wx: number): void {
    const lx = wx - this.view.x;
    let best = this.trees[0];
    for (const t of this.trees) if (Math.abs(t.x - lx) < Math.abs(best.x - lx)) best = t;
    this.ctx.sfx.rustle();
    this.ctx.sfx.tweet();
    if (best) {
      this.ctx.tweens.wobble(best, 0.06, 0.9, 0.05);
      this.ctx.fx.emit(this.ctx.layers.fx, { x: this.view.x + best.x, y: this.view.y - 160, count: 8, shape: 'feather', tint: [0x5fae58, 0x79c46a], speed: [40, 140], gravity: 80, drag: 1.2, life: [0.9, 1.4], size: [8, 12], spin: 3 });
    }
  }
}

// ---------- A horse and carriage on the park drive (the horse may have a face) ----------
export class HorseCarriage extends Prop {
  private rig = new Container();
  private legs: Graphics[] = [];
  private t = 0;
  private dir = 1;
  private pos = 0;
  private speed = 40;
  private trot = 0;

  constructor(ctx: Ctx, x: number, private range = 1600) {
    super(ctx, x, WALK - 24);
    this.layer = 'back';
    this.view.zIndex = 1;
    const g = new Graphics();
    contactShadow(g, 0, 0, 220);
    // the carriage (black with red wheels and a folded hood)
    g.roundRect(-110, -66, 92, 36, 10).fill(0x2b2f33);
    g.moveTo(-110, -66).quadraticCurveTo(-120, -110, -70, -108).lineTo(-60, -66).closePath().fill(0x3b4148);
    g.roundRect(-104, -60, 80, 4, 2).fill({ color: P.white, alpha: 0.25 });
    for (const [wx, r] of [[-96, 22], [-34, 16]] as const) {
      g.circle(wx, -r, r).fill(0xc0392b);
      g.circle(wx, -r, r - 5).fill(0x2b2f33);
      g.circle(wx, -r, 4).fill(0xc0392b);
    }
    // the driver in a top hat
    g.roundRect(-46, -98, 22, 30, 8).fill(0x2f4f7a);
    g.circle(-35, -108, 10).fill(SKIN[0]);
    g.circle(-32, -109, 1.5).fill(0x2a2a2a);
    g.roundRect(-46, -128, 22, 14, 3).fill(0x1f2226);
    g.roundRect(-50, -116, 30, 4, 2).fill(0x1f2226);
    // shafts to the horse
    g.roundRect(-24, -52, 46, 4, 2).fill(0x5a4636);
    this.rig.addChild(g);
    // the horse
    const horse = 0xf1ece4, mane = 0x8a6a4a;
    for (const lx of [24, 36, 66, 78]) {
      const l = new Graphics().roundRect(-4, 0, 8, 36, 3).fill(darken(horse, 0.08));
      l.roundRect(-4, 30, 8, 6, 2).fill(0x3b3b3b);
      l.position.set(lx, -38);
      this.legs.push(l);
      this.rig.addChild(l);
    }
    const h = new Graphics();
    h.roundRect(16, -74, 72, 38, 18).fill(horse);
    h.moveTo(78, -70).lineTo(98, -102).quadraticCurveTo(102, -108, 110, -104).lineTo(118, -88).quadraticCurveTo(112, -82, 104, -84).lineTo(92, -60).closePath().fill(horse);
    h.poly([96, -104, 100, -116, 104, -104]).fill(horse);
    h.moveTo(80, -72).quadraticCurveTo(88, -96, 98, -104).lineTo(94, -92).quadraticCurveTo(86, -80, 84, -66).closePath().fill(mane);
    h.circle(106, -96, 2).fill(0x2a2a2a);
    h.ellipse(16, -62, 6, 16).fill(mane);
    h.roundRect(20, -72, 60, 3, 1.5).fill({ color: P.white, alpha: 0.4 });
    // a feather plume on the bridle
    h.circle(100, -114, 6).fill(0xe5483f);
    this.rig.addChild(h);
    this.view.addChild(this.rig);
    this.hits = [{ x: -130, y: -130, w: 260, h: 130 }];
    this.extent = [-200, range + 400];
  }

  hintTarget(): Container {
    return this.rig;
  }

  onTap(): void {
    // a neigh: a wobbly falling whinny, then a sleigh-bell jingle and a quick trot
    const s = this.ctx.sfx.s;
    s.tone({ freq: 760, to: 420, dur: 0.6, type: 'sawtooth', gain: 0.06, filter: 1600, q: 4, vibrato: 40, vibratoRate: 16 });
    for (let k = 0; k < 4; k++) s.tone({ freq: 2100 + k * 120, dur: 0.15, type: 'sine', gain: 0.04, delay: 0.5 + k * 0.08 });
    this.trot = 2.5;
    this.ctx.tweens.wobble(this.rig, 0.04, 0.6, 0.05);
  }

  update(dt: number): void {
    this.t += dt;
    this.trot = Math.max(0, this.trot - dt);
    const v = this.speed * (this.trot > 0 ? 3 : 1);
    this.pos += v * dt * this.dir;
    if (this.pos > this.range) this.dir = -1;
    if (this.pos < 0) this.dir = 1;
    this.rig.x = this.pos;
    this.rig.scale.x = this.dir;
    // clip-clop: legs swing, the body bobs
    const f = this.trot > 0 ? 14 : 6;
    this.legs.forEach((l, i) => (l.rotation = Math.sin(this.t * f + (i % 2) * Math.PI) * 0.35));
    this.rig.y = -Math.abs(Math.sin(this.t * f)) * (this.trot > 0 ? 3 : 1.2);
    if (this.trot > 0 && Math.random() < dt * 6) this.ctx.sfx.s.tone({ freq: 340, to: 260, dur: 0.05, type: 'triangle', gain: 0.05 });
  }
}

// ---------- Statue of Liberty, out in the harbor (near side, front layer) ----------
export class StatueOfLiberty extends Prop {
  private statue = new Container();
  private flame = new Graphics();
  private t = 0;
  private flare = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 232);
    this.layer = 'front';
    // (it stands out in the harbor, so it's drawn smaller and stays below the road)
    this.statue.scale.set(0.7);
    const copper = 0x7fbfa8, copperDark = 0x6aa892, stone = 0xd8cfbe;
    const g = new Graphics();
    // Liberty Island: a little green island with the star-shaped fort
    g.ellipse(0, 0, 150, 26).fill(0x8fcf6f);
    g.ellipse(-40, -4, 60, 8).fill({ color: P.white, alpha: 0.2 });
    g.roundRect(-70, -18, 140, 20, 6).fill(0xc9c1b2);
    // the pedestal
    g.roundRect(-38, -96, 76, 80, 6).fill(stone);
    g.rect(38 - 76 * 0.28, -96, 76 * 0.28, 80).fill(darken(stone, 0.1));
    g.roundRect(-44, -102, 88, 10, 4).fill(lighten(stone, 0.1));
    g.roundRect(-14, -84, 28, 30, 6).fill(darken(stone, 0.2));
    this.statue.addChild(g);
    // the lady: robe, raised right arm with the torch, tablet, crown
    const s = new Graphics();
    s.moveTo(-26, -102).quadraticCurveTo(-30, -150, -16, -192).lineTo(16, -192).quadraticCurveTo(30, -150, 26, -102).closePath().fill(copper);
    s.moveTo(8, -190).quadraticCurveTo(26, -150, 26, -102).lineTo(12, -102).quadraticCurveTo(16, -150, 2, -190).closePath().fill(copperDark);
    for (let k = -2; k <= 2; k++) s.moveTo(k * 7, -186).quadraticCurveTo(k * 9, -146, k * 10, -104).stroke({ width: 2, color: copperDark, alpha: 0.7 });
    // tablet arm (left)
    s.roundRect(-30, -170, 14, 30, 4).fill(copperDark);
    s.roundRect(-24, -176, 6, 30, 3).fill(copper);
    // head and crown
    s.circle(0, -202, 12).fill(copper);
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI + 0.25 + (k / 6) * (Math.PI - 0.5);
      s.poly([Math.cos(a) * 10, -204 + Math.sin(a) * 8, Math.cos(a) * 24, -204 + Math.sin(a) * 22, Math.cos(a + 0.12) * 11, -204 + Math.sin(a + 0.12) * 9]).fill(copper);
    }
    s.circle(-4, -203, 1.6).fill(copperDark);
    s.circle(4, -203, 1.6).fill(copperDark);
    // raised arm with the torch
    s.moveTo(10, -188).lineTo(30, -250).lineTo(40, -246).lineTo(22, -186).closePath().fill(copper);
    s.roundRect(28, -262, 16, 12, 4).fill(copperDark);
    s.roundRect(26, -266, 20, 6, 3).fill(0xd9b44a);
    this.statue.addChild(s);
    this.flame.ellipse(0, 0, 9, 14).fill(0xffd166);
    this.flame.ellipse(0, 3, 5, 8).fill(0xff9f1c);
    this.flame.position.set(36, -276);
    this.statue.addChild(this.flame);
    this.view.addChild(this.statue);
    this.hits = [{ x: -60, y: -205, w: 120, h: 205 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.statue;
  }

  onTap(): void {
    this.flare = 2;
    this.ctx.sfx.fanfare();
    this.ctx.sfx.sparkle();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x + 25, y: this.y - 193, count: 20, shape: 'star', tint: [0xffd166, 0xff9f1c, P.white], speed: [120, 300], gravity: 60, drag: 1, life: [0.8, 1.4], size: [10, 16] });
  }

  update(dt: number): void {
    this.t += dt;
    this.flare = Math.max(0, this.flare - dt);
    const k = 1 + Math.sin(this.t * 9) * 0.1 + this.flare * 0.7;
    this.flame.scale.set(k, k * (1 + Math.sin(this.t * 13) * 0.08));
    if (this.flare > 0 && Math.random() < dt * 30) {
      this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x + 25, y: this.y - 198, count: 1, shape: 'circle', tint: [0xffd166, 0xff9f1c], speed: [30, 80], angle: [-2, -1.1], gravity: -60, life: [0.4, 0.7], size: [6, 10] });
    }
  }
}

// ---------- The Brooklyn Bridge across the East River (in the distance, behind the street) ----------
export class BrooklynBridge extends Prop {
  private lights: Graphics[] = [];
  private bridge = new Container();
  private t = 0;
  private sparkle = 0;

  constructor(ctx: Ctx, x: number, len = 2200) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.view.zIndex = -5;
    const S = 0.62; // it's across the river: smaller
    const g = new Graphics();
    // the East River and Brooklyn's far bank (drawn by the bridge itself, behind everything)
    const riverTop = -150;
    g.roundRect(-140, riverTop, len + 280, -riverTop + 6, 40).fill(P.water);
    g.roundRect(-140, riverTop - 30, len + 280, 34, 16).fill(0x9fcf86);
    for (let k = 0; k < 9; k++) g.roundRect(k * (len / 9) + 30, riverTop + 24 + (k % 3) * 22, 60, 3, 1.5).fill({ color: P.white, alpha: 0.45 });
    this.view.addChild(g);
    // the bridge itself: deck, two gothic stone towers, a web of cables
    const b = new Graphics();
    const deckY = riverTop - 60;
    const towersX = [len * 0.27, len * 0.73];
    const towerH = 330 * S, towerW = 120 * S;
    const stone = 0xc8b79a, stoneShade = 0xb09f82;
    const topY = deckY - towerH;
    // cables first (behind the towers)
    const cable = (x0: number, y0: number, x1: number, y1: number, sag: number, steps = 18) => {
      b.moveTo(x0, y0);
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        b.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag);
      }
      b.stroke({ width: 3, color: 0x7c7466 });
    };
    const ta = towersX[0], tb = towersX[1];
    cable(0, deckY + 2, ta, topY + 14, 30);
    cable(ta, topY + 14, tb, topY + 14, towerH * 0.8);
    cable(tb, topY + 14, len, deckY + 2, 30);
    // suspenders and the famous diagonal stays (the web)
    for (let x = 20; x < len - 20; x += 22) {
      let cy: number;
      if (x < ta) cy = deckY + 2 + (topY + 14 - deckY - 2) * (x / ta) + Math.sin((x / ta) * Math.PI) * 30;
      else if (x > tb) cy = topY + 14 + (deckY + 2 - topY - 14) * ((x - tb) / (len - tb)) + Math.sin(((x - tb) / (len - tb)) * Math.PI) * 30;
      else cy = topY + 14 + Math.sin(((x - ta) / (tb - ta)) * Math.PI) * towerH * 0.8;
      b.moveTo(x, cy).lineTo(x, deckY).stroke({ width: 1.2, color: 0x7c7466, alpha: 0.7 });
    }
    for (const t of towersX) {
      for (let k = 1; k <= 7; k++) {
        b.moveTo(t, topY + 20).lineTo(t - k * 48, deckY).stroke({ width: 1.2, color: 0x7c7466, alpha: 0.6 });
        b.moveTo(t, topY + 20).lineTo(t + k * 48, deckY).stroke({ width: 1.2, color: 0x7c7466, alpha: 0.6 });
      }
    }
    // the deck
    b.roundRect(-20, deckY - 6, len + 40, 14, 4).fill(0x8a7f6e);
    b.roundRect(-20, deckY - 6, len + 40, 3, 1.5).fill({ color: P.white, alpha: 0.3 });
    // stone anchorages at both ends: the deck runs into them on the banks
    for (const ax of [-70, len - 30]) {
      b.roundRect(ax, deckY - 22, 100, riverTop - deckY + 26, 6).fill(stone);
      b.rect(ax + 72, deckY - 22, 28, riverTop - deckY + 26).fill(stoneShade);
      b.roundRect(ax - 4, deckY - 28, 108, 10, 4).fill(lighten(stone, 0.12));
      for (const wy of [deckY + 4, deckY + 30]) b.roundRect(ax + 18, wy, 64, 12, 6).fill(darken(stone, 0.18));
    }
    // gothic stone towers with twin pointed arches
    for (const t of towersX) {
      const x0 = t - towerW / 2;
      b.roundRect(x0, topY, towerW, deckY - topY + 140, 4).fill(stone);
      b.rect(x0 + towerW * 0.72, topY, towerW * 0.28, deckY - topY + 140).fill(stoneShade);
      b.roundRect(x0 - 4, topY - 8, towerW + 8, 12, 3).fill(lighten(stone, 0.12));
      for (const ax of [x0 + towerW * 0.18, x0 + towerW * 0.58]) {
        const aw = towerW * 0.24, ah = towerH * 0.5;
        const ay = topY + towerH * 0.22;
        b.moveTo(ax, ay + ah).lineTo(ax, ay + aw * 0.6).quadraticCurveTo(ax, ay, ax + aw / 2, ay - aw * 0.4).quadraticCurveTo(ax + aw, ay, ax + aw, ay + aw * 0.6).lineTo(ax + aw, ay + ah).closePath().fill(0x7a8a99);
      }
      // stone pier in the water
      b.roundRect(x0 - 8, deckY + 100, towerW + 16, 46, 6).fill(stoneShade);
    }
    this.bridge.addChild(b);
    this.view.addChild(this.bridge);
    // lights along the deck (twinkle on tap)
    for (let x = 30; x < len; x += 90) {
      const l = new Graphics().circle(0, 0, 3.5).fill(0xfff1a8);
      l.position.set(x, deckY - 8);
      l.alpha = 0.4;
      this.lights.push(l);
      this.view.addChild(l);
    }
    this.hits = [{ x: 0, y: topY - 20, w: len, h: deckY - topY + 60 }];
    this.extent = [-800, len + 800];
  }

  onTap(): void {
    this.sparkle = 2.5;
    this.ctx.sfx.bell();
    this.ctx.tweens.after(0.4, () => this.ctx.sfx.shipHorn());
    this.ctx.tweens.wobble(this.bridge, 0.003, 0.6, 0);
  }

  update(dt: number): void {
    this.t += dt;
    this.sparkle = Math.max(0, this.sparkle - dt);
    this.lights.forEach((l, k) => {
      l.alpha = this.sparkle > 0 ? 0.4 + 0.6 * Math.max(0, Math.sin(this.t * 9 - k * 0.5)) : 0.45 + 0.15 * Math.sin(this.t * 1.4 + k);
    });
  }
}
