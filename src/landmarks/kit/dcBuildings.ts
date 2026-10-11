// Washington buildings: the White House behind its fence (with a lawn fountain and a flag), the
// red sandstone Smithsonian Castle, and a columned natural-history museum where a friendly
// dinosaur peeks over the roof when you tap it.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken } from '../../style/palette';
import { block, contactShadow, roundedTri } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { rand } from '../../core/rng';
import { WALK } from './common';
import { MARBLE, MARBLE_SHADE, columns, steps } from './dcMonuments';

const WATER = 0x6cc2e6;
const IRON = 0x2b2f33;

function usFlag(w: number, h: number): Graphics {
  const f = new Graphics();
  f.rect(0, 0, w, h).fill(0xe5483f);
  for (let sk = 1; sk < 7; sk += 2) f.rect(0, (sk * h) / 7, w, h / 7).fill(P.white);
  f.rect(0, 0, w * 0.44, h * 0.54).fill(0x2f4f9e);
  for (let k = 0; k < 6; k++) f.circle(w * 0.07 + (k % 3) * w * 0.14, h * 0.12 + Math.floor(k / 3) * h * 0.26, Math.max(0.8, h * 0.04)).fill(P.white);
  return f;
}

// ---------- The White House ----------
export class WhiteHouse extends Prop {
  private flag: Graphics;
  private t = 0;
  private flutter = 0;
  private fountainT = 0;
  private boost = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    const W = 560, H = 176, by = -46; // set back behind a strip of lawn
    // the lawn
    g.roundRect(-W / 2 - 80, by - 6, W + 160, 52, 14).fill(0x8cc46c);
    g.roundRect(-W / 2 - 80, by - 6, W + 160, 6, 3).fill({ color: P.white, alpha: 0.2 });
    contactShadow(g, 0, by, W + 40);
    // the house: main block, a ground floor and a main floor of pedimented windows
    block(g, -W / 2, by - H, W, H, P.white, { landmark: true, shade: 0xe9e8e3, radius: 4 });
    g.roundRect(-W / 2 - 6, by - H - 10, W + 12, 12, 4).fill(0xf2f1ec);
    // roof balustrade
    for (let bx = -W / 2; bx <= W / 2; bx += 10) g.roundRect(bx - 2, by - H - 24, 4, 14, 2).fill(0xf2f1ec);
    g.roundRect(-W / 2, by - H - 28, W, 5, 2).fill(0xf2f1ec);
    for (const row of [by - 140, by - 70]) {
      for (let k = 0; k < 8; k++) {
        const wx = -W / 2 + 34 + k * ((W - 68) / 7) - 14;
        if (Math.abs(wx + 14) < 120) continue;
        g.roundRect(wx, row, 28, 44, 4).fill(0xb9d4e6);
        g.rect(wx + 13, row, 2, 44).fill(P.white);
        if (row < by - 100) roundedTri(g, wx + 14, row - 16, 40, 12, 2).fill(0xe9e8e3);
        else g.roundRect(wx - 4, row - 8, 36, 6, 3).fill(0xe9e8e3);
      }
    }
    // the rounded south portico: a curved bow of columns with a balcony
    // (a curved bow: the wall behind the columns is shaded round its edges)
    g.ellipse(0, by - 4, 132, 18).fill(0xeeede8);
    g.rect(-118, by - H + 20, 236, H - 24).fill(0xeef0f1);
    g.rect(-118, by - H + 20, 40, H - 24).fill({ color: P.black, alpha: 0.05 });
    g.rect(78, by - H + 20, 40, H - 24).fill({ color: P.black, alpha: 0.09 });
    for (const dx of [-60, 0, 60]) {
      g.roundRect(dx - 13, by - 140, 26, 44, 4).fill(0xb9d4e6);
      g.roundRect(dx - 13, by - 70, 26, 50, 4).fill(0xb9d4e6);
    }
    columns(g, -118, 118, by - H + 14, by - 4, 6, 18, P.white);
    g.roundRect(-128, by - H + 4, 256, 14, 6).fill(P.white);
    for (let bx = -110; bx <= 110; bx += 12) g.roundRect(bx - 2, by - 104, 4, 16, 2).fill(P.white);
    g.roundRect(-118, by - 108, 236, 4, 2).fill(P.white);
    g.roundRect(-118, by - 86, 236, 5, 2).fill(P.white);
    // the flag pole on the roof
    g.roundRect(-1.5, by - H - 110, 3, 84, 1.5).fill(0xd9dde2);
    this.view.addChild(g);
    this.flag = usFlag(46, 28);
    this.flag.position.set(1.5, by - H - 110);
    this.view.addChild(this.flag);
    // the lawn fountain (a round basin) and the black iron fence in front
    const f = new Graphics();
    f.ellipse(-210, by + 24, 60, 10).fill(0xdcd5c5);
    f.ellipse(-210, by + 23, 52, 7).fill(WATER);
    f.roundRect(-W / 2 - 80, 4, W + 160, 4, 2).fill(IRON);
    f.roundRect(-W / 2 - 80, -40, W + 160, 4, 2).fill(IRON);
    for (let fx = -W / 2 - 80; fx <= W / 2 + 80; fx += 14) {
      f.roundRect(fx - 1.5, -44, 3, 52, 1.5).fill(IRON);
      f.poly([fx - 3, -44, fx, -52, fx + 3, -44]).fill(IRON);
    }
    for (const px of [-W / 2 - 80, -60, 60, W / 2 + 80]) {
      f.roundRect(px - 8, -60, 16, 68, 3).fill(0xe9e8e3);
      f.circle(px, -66, 7).fill(0xe9e8e3);
    }
    this.view.addChild(f);
    this.hits = [{ x: -W / 2 - 80, y: by - H - 120, w: W + 160, h: -by + H + 128 }];
    this.extent = [-800, 800];
  }

  hintTarget(): Container {
    return this.flag;
  }

  onTap(): void {
    this.ctx.sfx.splash(1.0);
    this.ctx.sfx.chime();
    this.flutter = 2.5;
    this.boost = 1.6;
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x - 210, y: this.y - 40, count: 18, shape: 'drop', tint: [WATER, P.white, 0xbfe6ff], speed: [150, 360], angle: [-2.3, -0.8], gravity: 900, life: [0.6, 1.0], size: [7, 12], rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.flutter = Math.max(0, this.flutter - dt);
    this.boost = Math.max(0, this.boost - dt);
    const amp = this.flutter > 0 ? 0.3 : 0.1;
    this.flag.scale.x = 1 - amp * 0.4 + Math.sin(this.t * (this.flutter > 0 ? 14 : 4)) * amp * 0.4;
    this.flag.skew.y = Math.sin(this.t * 3) * amp * 0.3;
    // the fountain's single jet
    this.fountainT += dt;
    const rate = this.boost > 0 ? 0.015 : 0.06;
    while (this.fountainT > rate) {
      this.fountainT -= rate;
      this.ctx.fx.spawn(this.ctx.layers.fxBack, {
        x: this.x - 210, y: this.y - 26, shape: 'drop', tint: [WATER, 0xbfe6ff, P.white],
        speed: [130, 180 + this.boost * 140], angle: [-1.75, -1.39], gravity: 700, drag: 0.2, life: [0.45, 0.6], size: [4, 7], spin: 0, rotate: false, alpha: 0.85,
      });
    }
  }
}

// ---------- The Smithsonian Castle (red sandstone towers) ----------
export class SmithsonianCastle extends Prop {
  private flag: Graphics;
  private birds: Container[] = [];
  private t = 0;
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const red = 0xb55a4a, shade = 0x9e4c3f, trim = 0xd88e7c, roof = 0x5e6670;
    const g = new Graphics();
    contactShadow(g, 0, 0, 640);
    // the long main hall with arched windows
    block(g, -260, -170, 520, 170, red, { landmark: true, shade, radius: 4 });
    for (let k = 0; k < 9; k++) {
      const wx = -236 + k * 56;
      g.moveTo(wx, -30).lineTo(wx, -96).arc(wx + 12, -96, 12, Math.PI, 0).lineTo(wx + 24, -30).closePath().fill(0x7d9ab0);
      g.moveTo(wx, -112).lineTo(wx, -140).arc(wx + 12, -140, 12, Math.PI, 0).lineTo(wx + 24, -112).closePath().fill(0x7d9ab0);
    }
    for (let k = 0; k < 26; k++) g.roundRect(-260 + k * 20, -182, 12, 12, 2).fill(red);
    g.rect(-260, -172, 520, 4).fill(trim);
    // towers: a tall square one with a steep cap, an octagonal one, and small corner turrets
    const tower = (tx: number, tw: number, th: number, cap: 'pyramid' | 'merlons' | 'cone') => {
      block(g, tx - tw / 2, -th, tw, th, red, { landmark: true, shade, radius: 4 });
      for (let wy = -th + 40; wy < -60; wy += 56) {
        g.moveTo(tx - 8, wy + 30).lineTo(tx - 8, wy + 8).arc(tx, wy + 8, 8, Math.PI, 0).lineTo(tx + 8, wy + 30).closePath().fill(0x7d9ab0);
      }
      if (cap === 'pyramid') {
        g.poly([tx - tw / 2 - 6, -th, tx, -th - tw * 1.1, tx + tw / 2 + 6, -th]).fill(roof);
        g.poly([tx, -th - tw * 1.1, tx + tw / 2 + 6, -th, tx + tw * 0.15, -th]).fill(darken(roof, 0.15));
      } else if (cap === 'cone') {
        g.poly([tx - tw / 2 - 4, -th, tx, -th - tw * 0.9, tx + tw / 2 + 4, -th]).fill(roof);
      } else {
        for (let k = 0; k < 4; k++) g.roundRect(tx - tw / 2 + k * (tw / 4) + 2, -th - 12, tw / 4 - 5, 14, 2).fill(red);
      }
    };
    tower(-215, 64, 250, 'cone');
    tower(-100, 74, 340, 'pyramid');
    tower(40, 58, 290, 'merlons');
    tower(130, 52, 260, 'cone');
    tower(230, 66, 220, 'merlons');
    g.roundRect(-30, -60, 60, 60, 6).fill(0x5a3a30);
    g.moveTo(-30, -60).arc(0, -60, 30, Math.PI, 0).closePath().fill(0x5a3a30);
    this.view.addChild(g);
    // flag on the tallest tower
    const pole = new Graphics().roundRect(-101.5, -340 - 81 - 60, 3, 64, 1.5).fill(0xd9dde2);
    this.view.addChild(pole);
    this.flag = usFlag(34, 20);
    this.flag.position.set(-98.5, -340 - 81 - 60);
    this.view.addChild(this.flag);
    // pigeons resting on the hall's roof (they fly off on a tap)
    for (let k = 0; k < 4; k++) {
      const b = new Container();
      const bg = new Graphics();
      bg.ellipse(0, -6, 8, 6).fill(0x8a919c);
      bg.circle(6, -11, 4).fill(0x9aa1ab);
      bg.poly([9, -12, 13, -11, 9, -10]).fill(0xe0a050);
      bg.circle(7, -12, 1).fill(0x1d1b1a);
      b.addChild(bg);
      b.position.set(-200 + k * 120 + rand(-20, 20), -182);
      this.birds.push(b);
      this.view.addChild(b);
    }
    this.hits = [{ x: -270, y: -500, w: 540, h: 500 }];
    this.extent = [-700, 700];
  }

  hintTarget(): Container {
    return this.flag;
  }

  onTap(): void {
    this.ctx.sfx.peal();
    if (this.busy) return;
    this.busy = true;
    this.ctx.tweens.after(0.2, () => this.ctx.sfx.tweet());
    // the pigeons flutter up into a loop and settle back
    this.birds.forEach((b, k) => {
      const x0 = b.x, y0 = b.y;
      this.ctx.tweens.add(2.2, (p) => {
        if (b.destroyed) return;
        b.x = x0 + Math.sin(p * Math.PI * 2) * (80 + k * 20);
        b.y = y0 - Math.sin(p * Math.PI) * (160 + k * 30);
        b.rotation = Math.sin(p * 30) * 0.3;
      }, { delay: k * 0.1, ease: ease.inOutSine, done: () => k === 3 && (this.busy = false) });
    });
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 200, count: 8, shape: 'feather', tint: [0x9aa1ab, P.white], speed: [60, 160], gravity: 80, drag: 1.2, life: [1.0, 1.6], size: [8, 12], spin: 2 });
  }

  update(dt: number): void {
    this.t += dt;
    this.flag.scale.x = 0.9 + Math.sin(this.t * 4) * 0.1;
    this.flag.skew.y = Math.sin(this.t * 3) * 0.05;
  }
}

// ---------- A natural history museum (columns, a small green dome) with a dinosaur ----------
export class Museum extends Prop {
  private dino = new Container();
  private doors: Graphics;
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const W = 540, H = 200;
    // the dinosaur hides behind the roof (drawn first)
    const d = new Graphics();
    const green = 0x7cc26a;
    d.moveTo(-40, 0).quadraticCurveTo(-30, -120, 30, -170).quadraticCurveTo(48, -182, 64, -172)
      .quadraticCurveTo(72, -160, 58, -152).quadraticCurveTo(10, -120, 10, 0).closePath().fill(green);
    d.ellipse(58, -170, 26, 15).fill(green);
    d.circle(64, -176, 4).fill(P.white);
    d.circle(65, -176, 2).fill(0x1d1b1a);
    d.moveTo(70, -164).quadraticCurveTo(78, -160, 82, -166).stroke({ width: 2.5, color: 0x3f7a35, cap: 'round' });
    for (let k = 0; k < 5; k++) d.circle(-2 + k * 7, -126 - k * 9, 4).fill(0x5aa850);
    this.dino.addChild(d);
    this.dino.position.set(120, -H + 230);
    this.view.addChild(this.dino);
    const g = new Graphics();
    contactShadow(g, 0, 0, W + 60);
    // a small green dome behind the portico
    g.moveTo(-90, -H - 30).quadraticCurveTo(-80, -H - 130, 0, -H - 134).quadraticCurveTo(80, -H - 130, 90, -H - 30).closePath().fill(0x7fae9a);
    g.moveTo(30, -H - 133).quadraticCurveTo(80, -H - 130, 90, -H - 30).lineTo(50, -H - 30).quadraticCurveTo(54, -H - 100, 30, -H - 133).fill(0x6c9a86);
    block(g, -100, -H - 40, 200, 40, 0xece6d8, { landmark: true, shade: 0xdcd5c4, radius: 3 });
    const base = steps(g, 0, 300, 4, 8, 10, 0xece6d8);
    block(g, -W / 2, -H, W, H, 0xece6d8, { landmark: true, shade: 0xdcd5c4, radius: 4 });
    for (const row of [-H + 40, -H + 110]) {
      for (let k = 0; k < 10; k++) {
        const wx = -W / 2 + 26 + k * ((W - 52) / 9) - 11;
        if (Math.abs(wx + 11) < 140) continue;
        g.roundRect(wx, row, 22, 40, 4).fill(0x9fb4c4);
      }
    }
    // the portico
    columns(g, -130, 130, -H + 10, base, 6, 22, MARBLE);
    block(g, -142, -H - 16, 284, 26, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 3 });
    roundedTri(g, 0, -H - 70, 300, 56, 4).fill(MARBLE);
    this.view.addChild(g);
    this.doors = new Graphics();
    this.doors.roundRect(-26, base - 70, 52, 70, 6).fill(0x6b5240);
    this.doors.roundRect(-22, base - 66, 44, 26, 4).fill({ color: P.warmWindow, alpha: 0.5 });
    this.view.addChild(this.doors);
    this.hits = [{ x: -W / 2, y: -H - 140, w: W, h: H + 140 }];
    this.extent = [-700, 700];
  }

  hintTarget(): Container {
    return this.doors;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.doors, 0.04, 0.5, 0.06);
    if (this.busy) {
      this.ctx.sfx.knock();
      return;
    }
    this.busy = true;
    const s = this.ctx.sfx;
    // a friendly dinosaur pops up over the roof, says hello and ducks back down
    s.s.tone({ freq: 160, to: 90, dur: 0.6, type: 'sawtooth', gain: 0.08, filter: 600, q: 3, attack: 0.05 });
    s.s.tone({ freq: 220, to: 140, dur: 0.5, type: 'sine', gain: 0.06, delay: 0.1 });
    const y0 = this.dino.y;
    this.ctx.tweens.add(0.6, (p) => !this.dino.destroyed && (this.dino.y = y0 - 230 * p), { ease: ease.outBack });
    this.ctx.tweens.after(0.7, () => s.giggle());
    this.ctx.tweens.add(0.5, (p) => !this.dino.destroyed && (this.dino.rotation = Math.sin(p * Math.PI * 2) * 0.08), { delay: 0.6 });
    this.ctx.tweens.add(0.6, (p) => !this.dino.destroyed && (this.dino.y = y0 - 230 * (1 - p)), {
      delay: 2.2, ease: ease.inOutSine, done: () => (this.busy = false),
    });
  }
}
