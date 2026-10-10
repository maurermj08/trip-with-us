// Orlando, FL: the end of the trip. Downtown towers, Lake Eola (the pagoda fountain, swan boats,
// live swans and the bandshell), a big observation wheel, and the Florida house where the
// family is waiting. The I-4 flyover is built from its BridgeSpec in ./bridges.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P } from '../style/palette';
import { block, contactShadow, cornerRect } from '../style/shapes';
import { ease } from '../core/Tween';
import { rand } from '../core/rng';
import { CITIES } from '../world/Route';
import { Mailbox } from './Home';
import { Palm } from './kit/trees';
import { Tower } from './kit/towers';
import { WALK, type CitySet } from './kit/common';

const X0 = CITIES.find((c) => c.id === 'orlando')!.x0;

/** Lake surface line (the lake is a band behind the sidewalk). */
const LAKE_TOP = -46;
const LAKE = 0x5bb6d6;
const LAKE_DEEP = 0x4aa3c6;

// ---------- Lake Eola: the lake band and the pagoda fountain ----------
const SHOWS: number[][] = [
  [P.water, 0xbfe6ff, P.white],
  [0xff9eb5, 0xffc2d4, P.white],
  [0x9fffc9, 0x6fe0b0, P.white],
  [0xffd166, 0xffe9a8, P.white],
  [0xc5a3ff, 0x9fd3ff, P.white],
];

export class LakeEola extends Prop {
  private t = 0;
  private boost = 0;
  private show = 0;
  private fountain = new Container();
  private lights: Graphics[] = [];

  constructor(ctx: Ctx, x: number, w = 1400) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const g = new Graphics();
    // the lake band, with a soft shore and ripples
    g.roundRect(-w / 2 - 30, LAKE_TOP - 8, w + 60, 64, 30).fill(0x9fd28a);
    g.roundRect(-w / 2, LAKE_TOP, w, 46, 22).fill(LAKE);
    g.roundRect(-w / 2 + 20, LAKE_TOP + 26, w - 40, 14, 7).fill(LAKE_DEEP);
    for (let k = 0; k < 9; k++) g.roundRect(-w / 2 + 60 + k * (w / 9), LAKE_TOP + 8 + (k % 3) * 9, 50, 3, 1.5).fill({ color: P.white, alpha: 0.45 });
    // a railing along the walk
    g.roundRect(-w / 2, -4, w, 4, 2).fill(0x5c6670);
    for (let px = -w / 2; px <= w / 2; px += 40) g.rect(px - 1.5, -18, 3, 16).fill(0x5c6670);
    g.roundRect(-w / 2, -20, w, 3, 1.5).fill(0x5c6670);
    this.view.addChild(g);

    // The fountain: a round, tiered "pagoda" with a spire, standing in the water.
    const f = new Graphics();
    const c = 0xeef0ee, s = 0xd7dbd8;
    f.ellipse(0, -2, 120, 14).fill(LAKE_DEEP);
    for (const [y, rw, h] of [[-30, 104, 30], [-66, 82, 30], [-100, 62, 28], [-130, 44, 26]] as const) {
      f.roundRect(-rw, y, rw * 2, h, 12).fill(c);
      f.rect(rw - rw * 2 * 0.28, y + 6, rw * 2 * 0.28 - 6, h - 8).fill(s);
      f.ellipse(0, y, rw + 8, 7).fill(s);
      f.ellipse(0, y - 1, rw, 4).fill({ color: P.white, alpha: 0.7 });
    }
    for (const ax of [-80, -40, 0, 40, 80]) f.moveTo(ax - 9, -30).arc(ax, -30, 9, Math.PI, 0).fill(0x9aa7b0);
    f.roundRect(-8, -186, 16, 58, 6).fill(c);
    f.poly([-6, -186, 0, -214, 6, -186]).fill(c);
    f.circle(0, -218, 5).fill(0xffd166);
    this.fountain.addChild(f);
    // colored light pucks around the base
    for (let k = 0; k < 7; k++) {
      const l = new Graphics().circle(0, 0, 6).fill(P.white);
      l.position.set(-90 + k * 30, -4);
      l.tint = SHOWS[0][0];
      this.lights.push(l);
      this.fountain.addChild(l);
    }
    this.fountain.position.set(0, LAKE_TOP + 30);
    this.view.addChild(this.fountain);
    this.hits = [{ x: -130, y: LAKE_TOP - 220, w: 260, h: 250 }];
    this.extent = [-w / 2 - 600, w / 2 + 600];
  }

  hintTarget(): Container {
    return this.fountain;
  }

  onTap(): void {
    // Each tap cycles the light show and fires a big burst.
    this.show = (this.show + 1) % SHOWS.length;
    this.boost = 1.6;
    this.ctx.sfx.splash(1.2);
    this.ctx.sfx.sparkle();
    this.ctx.tweens.wobble(this.fountain, 0.03, 0.8, 0.06);
    this.lights.forEach((l, k) => this.ctx.tweens.after(k * 0.06, () => !l.destroyed && (l.tint = SHOWS[this.show][k % 2])));
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y + LAKE_TOP - 190, count: 28, shape: 'drop', tint: SHOWS[this.show],
      speed: [220, 520], angle: [-2.5, -0.6], gravity: 900, life: [0.8, 1.3], size: [8, 14], spin: 0, rotate: false,
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    const rate = this.boost > 0 ? 0.012 : 0.04;
    const tint = SHOWS[this.show];
    while (this.t > rate) {
      this.t -= rate;
      const side = Math.random() < 0.5 ? -1 : 1;
      // the center jet and two side arcs
      this.ctx.fx.spawn(this.ctx.layers.fxBack, {
        x: this.x + side * 4, y: this.y + LAKE_TOP - 190, shape: 'drop', tint,
        speed: [160, 260 + this.boost * 220], angle: side < 0 ? [-1.85, -1.6] : [-1.55, -1.3],
        gravity: 700, drag: 0.2, life: [0.6, 0.85], size: [5, 8], spin: 0, rotate: false, alpha: 0.85,
      });
      if (Math.random() < 0.5) {
        this.ctx.fx.spawn(this.ctx.layers.fxBack, {
          x: this.x + side * 100, y: this.y + LAKE_TOP + 4, shape: 'drop', tint,
          speed: [120, 180], angle: side < 0 ? [-2.0, -1.8] : [-1.35, -1.15],
          gravity: 700, drag: 0.2, life: [0.4, 0.55], size: [4, 6], spin: 0, rotate: false, alpha: 0.8,
        });
      }
    }
  }
}

// ---------- Swan paddle boat (a boat: no face) ----------
export class SwanBoat extends Prop {
  private boat = new Container();
  private t = rand(0, 6);
  private homeX: number;
  private busy = false;

  constructor(ctx: Ctx, x: number, color = 0xffffff, private dir = 1) {
    super(ctx, x, WALK + LAKE_TOP + 24);
    this.layer = 'back';
    this.homeX = x;
    const g = new Graphics();
    // hull with a tucked tail, a big curved neck and a head (no eye: it's a boat)
    g.roundRect(-52, -30, 100, 30, 15).fill(color);
    g.poly([-52, -24, -70, -46, -44, -30]).fill(color);
    g.roundRect(-30, -40, 56, 14, 7).fill(0xf2c4d6);
    g.moveTo(30, -18).quadraticCurveTo(64, -40, 44, -78).quadraticCurveTo(38, -92, 52, -96).lineTo(56, -84)
      .quadraticCurveTo(50, -80, 54, -70).quadraticCurveTo(70, -40, 40, -10).closePath().fill(color);
    g.poly([54, -96, 70, -90, 56, -84]).fill(0xf29f4b);
    g.rect(48 - 100 * 0.28, -30, 100 * 0.28 - 4, 28).fill({ color: P.black, alpha: 0.06 });
    g.roundRect(-44, -30, 80, 3, 1.5).fill({ color: P.white, alpha: 0.5 });
    // two riders
    for (const [rx, shirt, skin] of [[-18, 0x3f7fd1, 0xf1c7a1], [4, 0xf7c934, 0xc68b62]] as const) {
      g.roundRect(rx - 7, -54, 14, 18, 6).fill(shirt);
      g.circle(rx, -60, 7).fill(skin);
    }
    this.boat.addChild(g);
    this.boat.scale.x = dir;
    this.view.addChild(this.boat);
    this.hits = [{ x: -75, y: -100, w: 150, h: 100 }];
    this.extent = [-600, 600];
  }

  hintTarget(): Container {
    return this.boat;
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    this.ctx.sfx.musicBox();
    // A happy spin: flip around twice.
    const d = this.dir;
    this.ctx.tweens.add(1.2, (p) => !this.boat.destroyed && (this.boat.scale.x = d * Math.cos(p * Math.PI * 4)), {
      ease: ease.inOutSine,
      done: () => (this.busy = false),
    });
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 60, count: 6, shape: 'heart', tint: [0xff9eb5, P.white], speed: [60, 140], angle: [-2.4, -0.7], gravity: -40, life: [0.8, 1.2], size: [10, 16] });
  }

  update(dt: number): void {
    this.t += dt;
    this.boat.y = Math.sin(this.t * 1.8) * 2;
    this.boat.rotation = Math.sin(this.t * 1.3) * 0.02;
    this.view.x = this.homeX + Math.sin(this.t * 0.25) * 60 * this.dir;
  }
}

// ---------- Live swan (an animal, so it may have an eye) ----------
export class Swan extends Prop {
  private bird = new Container();
  private wings: Graphics[] = [];
  private t = rand(0, 6);

  constructor(ctx: Ctx, x: number, dir = 1) {
    super(ctx, x, WALK + LAKE_TOP + 18);
    this.layer = 'back';
    const g = new Graphics();
    g.ellipse(0, -12, 26, 13).fill(P.white);
    g.poly([-24, -14, -36, -26, -18, -20]).fill(P.white);
    g.moveTo(14, -16).quadraticCurveTo(30, -26, 22, -44).quadraticCurveTo(18, -54, 28, -56).lineTo(30, -48)
      .quadraticCurveTo(26, -46, 28, -40).quadraticCurveTo(36, -24, 20, -8).closePath().fill(P.white);
    g.poly([28, -56, 40, -52, 30, -48]).fill(0xf29f4b);
    g.circle(28, -52, 1.8).fill(0x24262a);
    g.ellipse(4, -4, 22, 3).fill({ color: LAKE_DEEP, alpha: 0.6 });
    this.bird.addChild(g);
    for (const side of [-1, 1]) {
      const w = new Graphics().ellipse(0, 0, 18, 8).fill(side < 0 ? 0xf2f2f2 : P.white);
      w.position.set(-4, -18);
      w.pivot.set(10, 0);
      w.alpha = side < 0 ? 0 : 1;
      this.wings.push(w);
      this.bird.addChild(w);
    }
    this.bird.scale.x = dir;
    this.view.addChild(this.bird);
    this.hits = [{ x: -40, y: -60, w: 80, h: 60 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.bird;
  }

  onTap(): void {
    this.ctx.sfx.swanHonk();
    this.wings.forEach((w, k) => {
      this.ctx.tweens.add(0.9, (p) => {
        if (w.destroyed) return;
        w.alpha = 1;
        w.rotation = -Math.abs(Math.sin(p * Math.PI * 4)) * (0.9 + k * 0.2);
      }, { done: () => !w.destroyed && ((w.rotation = 0), (w.alpha = k === 0 ? 0 : 1)) });
    });
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 30, count: 5, shape: 'feather', tint: P.white, speed: [40, 120], gravity: 60, drag: 1.2, life: [1.0, 1.5], size: [8, 12], spin: 2 });
  }

  update(dt: number): void {
    this.t += dt;
    this.bird.y = Math.sin(this.t * 2.2) * 1.5;
  }
}

// ---------- Lake Eola bandshell ----------
export class Bandshell extends Prop {
  private shell = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 320);
    // stage
    g.roundRect(-150, -26, 300, 26, 6).fill(0xe8e1d2);
    g.roundRect(-150, -26, 300, 4, 2).fill({ color: P.white, alpha: 0.6 });
    // the shell: nested quarter-arches, lighter toward the inside
    const arches: [number, number][] = [[150, 0xf4f1ea], [124, 0xe9e5dc], [98, 0xdcd7cc], [72, 0xcfc9bd]];
    for (const [r, col] of arches) {
      g.moveTo(-r, -26).arc(0, -26, r, Math.PI, 0).lineTo(r - 14, -26).arc(0, -26, r - 14, 0, Math.PI, true).closePath().fill(col);
    }
    g.moveTo(-58, -26).arc(0, -26, 58, Math.PI, 0).closePath().fill(0x8fa0b0);
    // a music stand and two little stools
    g.roundRect(-2, -66, 4, 40, 2).fill(0x3a3f45);
    g.roundRect(-14, -74, 28, 10, 2).fill(0x3a3f45);
    this.shell.addChild(g);
    this.view.addChild(this.shell);
    this.hits = [{ x: -150, y: -180, w: 300, h: 180 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.shell;
  }

  onTap(): void {
    this.ctx.sfx.fanfare();
    this.ctx.tweens.wobble(this.shell, 0.02, 0.8, 0.05);
    for (let k = 0; k < 5; k++) {
      this.ctx.tweens.after(k * 0.16, () => this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + rand(-40, 40), y: this.y - 90, count: 2, shape: 'star', tint: [0xffd166, 0xff9eb5, 0x9fd3ff],
        speed: [60, 140], angle: [-2.2, -0.9], gravity: -80, drag: 1, life: [1.0, 1.5], size: [12, 18], spin: 1,
      }));
    }
  }
}

// ---------- A generic observation wheel ----------
export class ObservationWheel extends Prop {
  private wheel = new Container();
  private gondolas: Container[] = [];
  private lights: Graphics[] = [];
  private speed = 0.06;
  private boost = 0;
  private chase = 0;
  private t = 0;

  constructor(ctx: Ctx, x: number, private r = 270) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const hub = -r - 70;
    const legs = new Graphics();
    contactShadow(legs, 0, 0, 260);
    // A-frame legs and a base building
    legs.poly([-110, 0, -84, 0, 4, hub, -6, hub]).fill(0xdfe4ea);
    legs.poly([110, 0, 84, 0, -4, hub, 6, hub]).fill(0xcfd5dc);
    block(legs, -90, -50, 180, 50, 0x2aa7a0, { radius: 8 });
    legs.roundRect(-70, -36, 140, 14, 5).fill(0xcfeeea);
    this.view.addChild(legs);
    // the turning wheel: rim, inner ring and spokes
    const w = new Graphics();
    const N = 16;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      w.moveTo(0, 0).lineTo(Math.cos(a) * r, Math.sin(a) * r).stroke({ width: 3, color: 0xe6ebf0 });
    }
    w.circle(0, 0, r).stroke({ width: 10, color: 0xf4f6f8 });
    w.circle(0, 0, r * 0.62).stroke({ width: 4, color: 0xe6ebf0 });
    w.circle(0, 0, 26).fill(0xdfe4ea);
    w.circle(0, 0, 12).fill(0x2aa7a0);
    this.wheel.addChild(w);
    for (let k = 0; k < N * 2; k++) {
      const a = (k / (N * 2)) * Math.PI * 2;
      const l = new Graphics().circle(0, 0, 4.5).fill(P.white);
      l.position.set(Math.cos(a) * r, Math.sin(a) * r);
      l.tint = 0xfff1a8;
      l.alpha = 0.5;
      this.lights.push(l);
      this.wheel.addChild(l);
    }
    this.wheel.position.set(0, hub);
    this.view.addChild(this.wheel);
    // gondolas stay upright (they live outside the wheel and follow its rim)
    const colors = [0x2aa7a0, 0xff9eb5, 0xffd166, 0x7fc8f8];
    for (let k = 0; k < N; k++) {
      const c = new Container();
      const g = new Graphics();
      g.roundRect(-2, -8, 4, 10, 2).fill(0xb8c0c8);
      g.roundRect(-20, 0, 40, 34, 14).fill(colors[k % colors.length]);
      g.roundRect(-14, 6, 28, 12, 5).fill(0xd9f1fb);
      cornerRect(g, 20 - 40 * 0.28, 0, 40 * 0.28, 34, 0, 14, 14, 0).fill({ color: P.black, alpha: 0.08 });
      c.addChild(g);
      this.gondolas.push(c);
      this.view.addChild(c);
    }
    this.placeGondolas();
    this.hits = [{ x: -r - 30, y: hub - r - 30, w: r * 2 + 60, h: -hub + r + 30 }];
    this.extent = [-r - 900, r + 900];
  }

  hintTarget(): Container {
    return this.wheel;
  }

  private placeGondolas(): void {
    const N = this.gondolas.length;
    this.gondolas.forEach((c, k) => {
      const a = this.wheel.rotation + (k / N) * Math.PI * 2;
      c.position.set(this.wheel.x + Math.cos(a) * this.r, this.wheel.y + Math.sin(a) * this.r);
    });
  }

  onTap(): void {
    this.boost = 3;
    this.chase = 3;
    this.ctx.sfx.musicBox();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y + this.wheel.y, count: 12, shape: 'star', tint: [0xffd166, 0xff9eb5, P.white], speed: [120, 320], gravity: 120, drag: 1, life: [0.8, 1.3], size: [10, 16] });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    this.chase = Math.max(0, this.chase - dt);
    this.wheel.rotation += dt * (this.speed + this.boost * 0.25);
    this.placeGondolas();
    const n = this.lights.length;
    this.lights.forEach((l, k) => {
      if (this.chase > 0) {
        const on = (k + Math.floor(this.t * 20)) % 4 === 0;
        l.alpha = on ? 1 : 0.3;
        l.tint = [0xff9eb5, 0xffd166, 0x9fffc9, 0x9fd3ff][Math.floor(k / (n / 4))];
      } else {
        l.alpha = 0.45 + 0.35 * Math.sin(this.t * 2 + k * 0.4);
        l.tint = 0xfff1a8;
      }
    });
  }
}

// ---------- The Florida house (stucco, barrel-tile roof, screened lanai) ----------
export class FloridaHouse extends Prop {
  private windows: { g: Graphics; lit: boolean }[] = [];
  readonly doorX: number;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const W = 420, H = 150;
    const wall = 0xf6dcc0, roof = 0xd9734e, roofDark = 0xc4613f;
    const g = new Graphics();
    contactShadow(g, W / 2 + 60, 0, W * 1.3);
    // screened lanai on the right
    g.roundRect(W - 10, -110, 150, 110, 6).fill({ color: 0x8fa0b0, alpha: 0.35 });
    for (let k = 0; k <= 5; k++) g.rect(W - 10 + k * 29, -110, 3, 110).fill(P.white);
    g.roundRect(W - 14, -116, 158, 8, 3).fill(P.white);
    g.roundRect(W + 20, -30, 60, 22, 8).fill(0x7fd1f0);
    // walls
    block(g, 0, -H, W, H, wall);
    // barrel-tile hip roof: a soft trapezoid with rows of scallops
    g.moveTo(-26, -H + 6).lineTo(70, -H - 86).quadraticCurveTo(W / 2, -H - 96, W - 70, -H - 86).lineTo(W + 26, -H + 6)
      .quadraticCurveTo(W + 28, -H + 14, W + 18, -H + 14).lineTo(-18, -H + 14).quadraticCurveTo(-28, -H + 14, -26, -H + 6).fill(roof);
    for (let row = 0; row < 4; row++) {
      const y = -H - 70 + row * 22;
      const inset = 70 - row * 22;
      for (let tx = -10 + inset; tx < W + 10 - inset; tx += 18) g.moveTo(tx, y).arc(tx + 9, y, 9, Math.PI, 0).fill({ color: roofDark, alpha: 0.55 });
    }
    g.poly([W - 70, -H - 86, W + 26, -H + 6, W - 20, -H + 6]).fill({ color: P.black, alpha: 0.06 });
    // arched entry with a door (the family comes out here)
    const dx = W / 2;
    g.roundRect(dx - 44, -110, 88, 110, 40).fill(0xeac7a4);
    this.view.addChild(g);
    const doorway = new Graphics();
    doorway.roundRect(dx - 26, -88, 52, 88, 24).fill(0x2f7f86);
    doorway.circle(dx + 14, -42, 3).fill(0xf2c94c);
    doorway.roundRect(dx - 40, -4, 80, 4, 2).fill(0xd9cbb6);
    this.view.addChild(doorway);
    for (const wx of [40, 120, 280, 350]) {
      const wg = new Graphics();
      this.drawWindow(wg, false);
      wg.position.set(wx, -110);
      this.view.addChild(wg);
      this.windows.push({ g: wg, lit: false });
    }
    // garage door on the left and a hibiscus bush
    const gd = new Graphics();
    gd.roundRect(-150, -96, 140, 96, 6).fill(0xf0d2b2);
    gd.roundRect(-140, -84, 120, 84, 4).fill(P.white);
    for (let k = 1; k < 4; k++) gd.rect(-140, -84 + k * 21, 120, 2).fill({ color: P.black, alpha: 0.07 });
    gd.moveTo(-160, -92).lineTo(-80, -136).lineTo(0, -92).fill(roof);
    for (const [bx, col] of [[300, 0xe9506e], [80, 0xff7aa2]] as const) {
      gd.circle(bx, -14, 22).fill(0x3f9a4a);
      gd.circle(bx - 12, -22, 6).fill(col);
      gd.circle(bx + 10, -18, 6).fill(col);
      gd.circle(bx, -30, 6).fill(col);
    }
    this.view.addChildAt(gd, 0);
    this.doorX = x + dx;
    this.hits = [{ x: -160, y: -H - 96, w: W + 310, h: H + 96 }];
    this.extent = [-400, 900];
  }

  private drawWindow(g: Graphics, lit: boolean): void {
    g.clear();
    g.roundRect(-4, -4, 52, 60, 22).fill(P.white);
    g.roundRect(0, 0, 44, 52, 20).fill(lit ? P.warmWindow : 0xbfe0f2);
    g.rect(20.5, 0, 3, 52).fill(P.white);
    g.rect(0, 26, 44, 3).fill(P.white);
    if (!lit) g.poly([6, 6, 14, 6, 6, 20]).fill({ color: P.white, alpha: 0.5 });
  }

  onTap(wx: number, wy: number): void {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    // tap a window to toggle its light; anywhere else knocks
    const hit = this.windows.find((w) => Math.abs(w.g.x + 22 - lx) < 34 && Math.abs(w.g.y + 26 - ly) < 40);
    if (hit) {
      hit.lit = !hit.lit;
      this.drawWindow(hit.g, hit.lit);
      this.ctx.sfx.tick();
      return;
    }
    this.ctx.sfx.knock();
    this.ctx.tweens.wobble(this.view, 0.004, 0.5, 0.01);
  }
}

// ---------- Pink lawn flamingo ----------
export class Flamingo extends Prop {
  private bird = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK + 4);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 40);
    g.roundRect(-1.5, -50, 3, 50, 1.5).fill(0xe46a8f);
    g.roundRect(4, -44, 3, 22, 1.5).fill(0xe46a8f);
    g.ellipse(0, -60, 22, 13).fill(0xff8fb1);
    g.poly([-20, -62, -32, -70, -18, -54]).fill(0xff8fb1);
    g.moveTo(14, -64).quadraticCurveTo(26, -80, 16, -96).quadraticCurveTo(12, -104, 20, -106).lineTo(22, -98)
      .quadraticCurveTo(20, -94, 22, -90).quadraticCurveTo(30, -76, 18, -58).closePath().fill(0xff8fb1);
    g.poly([20, -106, 32, -100, 24, -96]).fill(0x2a2a2a);
    g.circle(19, -102, 1.6).fill(0x2a2a2a);
    this.bird.addChild(g);
    this.view.addChild(this.bird);
    this.hits = [{ x: -34, y: -110, w: 70, h: 110 }];
  }
  hintTarget(): Container {
    return this.bird;
  }
  onTap(): void {
    this.ctx.sfx.squeak();
    this.ctx.tweens.wobble(this.bird, 0.3, 0.9, 0.1);
  }
}

/** All positions are relative to x0 (the end of the I-4 flyover). */
export function buildOrlando(ctx: Ctx, x0: number = X0): CitySet {
  const props: Prop[] = [];
  // Big things first so they draw behind the rest.
  props.push(new ObservationWheel(ctx, x0 + 3290, 240));
  // Downtown: modern white and teal glass towers.
  const TEAL = { body: 0x7fcfc8, shade: 0x67b8b1, glass: 0xd8f3f0 };
  const WHITE = { body: 0xeef2f4, shade: 0xd9e0e4, glass: 0xbfe3ef };
  props.push(new Tower(ctx, x0 + 380, { variant: 'glass', w: 190, h: 560, note: 2, look: WHITE }));
  props.push(new Tower(ctx, x0 + 640, { variant: 'glass', w: 210, h: 720, note: 4, look: TEAL }));
  props.push(new Tower(ctx, x0 + 920, { variant: 'crown', w: 180, h: 620, note: 0, look: WHITE }));
  props.push(new Tower(ctx, x0 + 1180, { variant: 'glass', w: 170, h: 480, note: 3, look: TEAL }));
  // Lake Eola with its fountain, swans, swan boats and the bandshell.
  props.push(new LakeEola(ctx, x0 + 2080, 1300));
  props.push(new SwanBoat(ctx, x0 + 1750, 0xffffff, 1));
  props.push(new SwanBoat(ctx, x0 + 2520, 0xffffff, -1));
  props.push(new Swan(ctx, x0 + 1980, 1));
  props.push(new Swan(ctx, x0 + 2360, -1));
  props.push(new Bandshell(ctx, x0 + 2900));
  // The Florida house at the end of the street (the family comes out of its door).
  const house = new FloridaHouse(ctx, x0 + 3700);
  props.push(house);
  props.push(new Flamingo(ctx, x0 + 4330));
  props.push(new Mailbox(ctx, x0 + 3560));
  // Palms on the near side and behind.
  [500, 1500, 2900, 4800, 5500].forEach((dx, k) => props.push(new Palm(ctx, x0 + dx, 70, 210 + (k % 3) * 30, (k % 2) * 0.3 - 0.15, true)));
  [4550, 5050].forEach((dx, k) => props.push(new Palm(ctx, x0 + dx, WALK - 2, 230 - k * 20, k ? 0.2 : -0.2, false)));
  return { props, doorX: house.doorX };
}
