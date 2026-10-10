// Drive-through things on the road: boxes, puddles, mud, rocks, the ramp and the beach ball.
import { Container, Graphics } from 'pixi.js';
import { Prop } from './Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken } from '../style/palette';
import { contactShadow, cornerRect } from '../style/shapes';
import { rand } from '../core/rng';
import { RAMPS, WORLD_END } from '../world/Route';
import { surfaceAt } from '../world/Terrain';

// ---------- Cardboard boxes (and Florida orange crates) ----------
const ORANGE = 0xff9f1c;

/** A slatted wooden crate full of oranges, bottom-centred at (0, 0), size s. */
function drawCrate(g: Graphics, s: number, k: number): void {
  const wood = k % 2 ? 0xe0a96d : 0xd89c5e;
  for (let i = 0; i < 3; i++) {
    const r = s * 0.16;
    g.circle(-s * 0.3 + i * s * 0.3, -s + r * 0.4, r).fill(ORANGE);
  }
  g.roundRect(-s / 2, -s * 0.9, s, s * 0.9, 3).fill(darken(wood, 0.25));
  for (let i = 0; i < 3; i++) g.roundRect(-s / 2, -s * 0.9 + i * s * 0.3, s, s * 0.24, 2).fill(wood);
  cornerRect(g, s / 2 - s * 0.28, -s * 0.9, s * 0.28, s * 0.9, 0, 3, 3, 0).fill({ color: P.black, alpha: 0.08 });
  g.roundRect(-s * 0.22, -s * 0.6, s * 0.44, s * 0.2, 3).fill(0xfff1d6);
  g.circle(0, -s * 0.5, s * 0.07).fill(ORANGE);
}
interface Flying { g: Graphics; vx: number; vy: number; spin: number; groundY: number; done: boolean }

export class Boxes extends Prop {
  private boxes: Graphics[] = [];
  private flying: Flying[] = [];
  private broken = false;

  /** `crate`: wooden orange crates (Florida) instead of cardboard boxes. */
  constructor(ctx: Ctx, x: number, n: number, private crate = false) {
    super(ctx, x, 6);
    const size = 50;
    const layout: [number, number][] =
      n <= 2 ? [[-0.5, 0], [0.5, 0]]
        : n === 3 ? [[-0.5, 0], [0.5, 0], [0, 1]]
          : [[-1, 0], [0, 0], [1, 0], [-0.5, 1]];
    const shadow = new Graphics();
    contactShadow(shadow, 0, 0, size * (n <= 3 ? 2.2 : 3.2));
    this.view.addChild(shadow);
    layout.forEach(([cx, row], k) => {
      const s = size * (0.9 + ((k * 37) % 10) / 50);
      const g = new Graphics();
      if (crate) drawCrate(g, s, k);
      else {
        g.roundRect(-s / 2, -s, s, s, 3).fill(k % 2 ? P.cardboard : darken(P.cardboard, 0.05));
        cornerRect(g, s / 2 - s * 0.28, -s, s * 0.28, s, 0, 3, 3, 0).fill({ color: P.black, alpha: 0.07 });
        g.roundRect(-s / 2, -s, s, 3, 1.5).fill({ color: P.white, alpha: 0.4 });
        g.rect(-4, -s, 8, s * 0.42).fill(P.tape);
        g.roundRect(-s * 0.3, -s * 0.35, s * 0.24, s * 0.14, 2).fill({ color: P.white, alpha: 0.55 });
      }
      g.pivot.set(0, -s / 2);
      g.position.set(cx * size * 1.02, -row * size * 0.98 - s / 2);
      this.view.addChild(g);
      this.boxes.push(g);
    });
    const w = (n <= 3 ? 2 : 3) * size;
    this.hits = [{ x: -w / 2, y: -size * (n >= 3 ? 2 : 1), w, h: size * (n >= 3 ? 2 : 1) }];
    this.bumpHalf = w / 2;
    this.bumpHeight = n >= 3 ? 100 : 50;
    this.extent = [-1200, 1600];
  }

  hintTarget(): Container {
    return this.boxes[this.boxes.length - 1] ?? this.view;
  }

  onTap(): void {
    if (this.broken) return;
    const top = this.boxes[this.boxes.length - 1];
    this.ctx.sfx.thump(0.4);
    this.ctx.tweens.wobble(top, 0.18, 0.6, 0.12);
    const y0 = top.y;
    this.ctx.tweens.add(0.45, (p) => (top.y = y0 - Math.sin(p * Math.PI) * 30), { owner: top });
  }

  onBump(): void {
    if (this.broken) return;
    this.broken = true;
    const car = this.ctx.car;
    this.ctx.sfx.crunch();
    this.ctx.bumpCar(0.8);
    for (const g of this.boxes) {
      this.flying.push({
        g,
        vx: Math.max(car.vx, 200) * rand(0.6, 1.3) + rand(-60, 120),
        vy: -rand(380, 640),
        spin: rand(-9, 9),
        groundY: 30 + rand(0, 60),
        done: false,
      });
      this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + g.x, y: this.y + g.y, count: 6, shape: this.crate ? 'circle' : 'square',
        tint: this.crate ? [ORANGE, ORANGE, 0xe0a96d] : [P.cardboard, P.cardboardDark, P.tape], speed: [150, 420], angle: [-2.8, -0.3],
        gravity: 1200, life: [0.6, 1.2], size: [6, 14], spin: 10, vx: car.vx * 0.5,
      });
    }
  }

  update(dt: number): void {
    for (const f of this.flying) {
      if (f.done) continue;
      f.vy += 1500 * dt;
      f.g.x += f.vx * dt;
      f.g.y += f.vy * dt;
      f.g.rotation += f.spin * dt;
      if (f.g.y > f.groundY && f.vy > 0) {
        f.vy *= -0.35;
        f.vx *= 0.6;
        f.spin *= 0.5;
        if (Math.abs(f.vy) < 60) {
          f.done = true;
          this.ctx.tweens.add(1.2, (p) => (f.g.alpha = 1 - p), { delay: 2.5 });
        }
      }
    }
  }
}

// ---------- Puddle ----------
export class Puddle extends Prop {
  private g = new Graphics();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 0);
    this.layer = 'roadDecor';
    const g = this.g;
    g.ellipse(0, 0, 90, 13).fill(P.puddle);
    g.ellipse(-30, -3, 40, 4).fill({ color: P.white, alpha: 0.45 });
    g.ellipse(40, 4, 22, 3).fill({ color: P.white, alpha: 0.3 });
    this.view.addChild(g);
    this.hits = [{ x: -90, y: -20, w: 180, h: 36 }];
    this.bumpHalf = 70;
    this.bumpHeight = 25;
  }

  hintTarget(): Container {
    return this.g;
  }

  private splash(big: number, vx: number): void {
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: -4, count: Math.round(14 * big), shape: 'drop', tint: [P.puddle, P.white, P.water],
      speed: [200 * big, 520 * big], angle: [-2.6, -0.5], gravity: 1400, life: [0.5, 0.9], size: [8, 14], spin: 0, rotate: false, vx, spread: 50,
    });
    this.ctx.tweens.wobble(this.g, 0, 0.6, 0.25);
  }

  onTap(): void {
    this.ctx.sfx.plip();
    this.splash(0.5, 0);
  }

  onBump(): void {
    const car = this.ctx.car;
    this.ctx.sfx.splash(Math.min(1.4, 0.7 + car.speed / 900));
    this.splash(0.8 + car.speed / 900, car.vx * 0.3);
    this.ctx.carView.wetness = 1;
    this.ctx.bumpCar(0.2);
  }
}

// ---------- Mud ----------
export class Mud extends Prop {
  private g = new Graphics();
  private lastSplat = 0;
  constructor(ctx: Ctx, x: number, len: number) {
    super(ctx, x + len / 2, 0);
    this.layer = 'roadDecor';
    const g = this.g;
    const n = Math.round(len / 60);
    for (let k = 0; k < n; k++) {
      const cx = -len / 2 + (k + 0.5) * (len / n);
      g.ellipse(cx, (k % 3) * 3 - 2, 52 + (k % 2) * 14, 13).fill(k % 2 ? P.mud : P.mudLight);
    }
    for (let k = 0; k < n; k++) g.circle(-len / 2 + k * (len / n) + 20, -4, 6).fill({ color: P.white, alpha: 0.12 });
    this.view.addChild(g);
    this.hits = [{ x: -len / 2, y: -20, w: len, h: 36 }];
    this.bumpHalf = len / 2;
    this.bumpHeight = 25;
    this.extent = [-len, len];
  }

  hintTarget(): Container {
    return this.g;
  }

  onTap(wx: number): void {
    this.ctx.sfx.squelch();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: wx, y: -6, count: 8, shape: 'circle', tint: [P.mud, P.mudLight], speed: [120, 300], angle: [-2.6, -0.5], gravity: 1200, life: [0.4, 0.8], size: [6, 12] });
  }

  onBump(): void {
    this.ctx.sfx.squelch();
    this.ctx.bumpCar(0.3);
  }

  update(dt: number): void {
    if (!this.carInside) return;
    const car = this.ctx.car;
    if (car.height > 10) return;
    this.lastSplat -= dt;
    this.ctx.carView.muddiness = Math.min(1, this.ctx.carView.muddiness + dt * 1.5);
    if (this.lastSplat <= 0 && car.speed > 30) {
      this.lastSplat = 0.06;
      for (const w of this.ctx.carView.dims.wheels) {
        const wx = car.x + w.x;
        this.ctx.fx.emit(this.ctx.layers.fx, { x: wx, y: -4, count: 2, shape: 'circle', tint: [P.mud, P.mudLight], speed: [100, 300], angle: [-2.9, -1.8], gravity: 1300, life: [0.4, 0.7], size: [5, 11] });
      }
      if (Math.random() < 0.08) this.ctx.sfx.squelch();
    }
  }
}

// ---------- Rock: kicked along, the car bonks over it ----------
export class Rock extends Prop {
  private g = new Graphics();
  private vx = 0;
  private vy = 0;
  private alt = 0;
  private cool = 0;
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 10);
    this.layer = 'front';
    const g = this.g;
    contactShadow(g, 0, 0, 52, 0.16);
    g.moveTo(-24, 0).quadraticCurveTo(-27, -22, -8, -27).quadraticCurveTo(14, -32, 22, -16).quadraticCurveTo(28, -2, 18, 0).closePath().fill(P.rock);
    g.moveTo(8, -28).quadraticCurveTo(24, -22, 22, -10).quadraticCurveTo(26, -1, 18, 0).lineTo(8, 0).closePath().fill(P.rockDark);
    g.ellipse(-8, -22, 8, 3).fill({ color: P.white, alpha: 0.4 });
    this.view.addChild(g);
    this.hits = [{ x: -28, y: -32, w: 56, h: 34 }];
    this.extent = [-800, 3000];
  }

  hintTarget(): Container {
    return this.g;
  }

  onTap(): void {
    this.ctx.sfx.bonk();
    this.vy = 380;
    this.vx += 40;
  }

  update(dt: number): void {
    const car = this.ctx.car;
    this.cool -= dt;
    const half = this.ctx.carView.dims.half;
    const front = car.x + half - 10;
    if (this.cool <= 0 && car.height < 30 && front > this.x - 20 && car.x - half < this.x && car.vx > 20) {
      this.cool = 0.4;
      this.vx = car.vx * 1.25 + 120;
      this.vy = 260 + car.vx * 0.2;
      this.ctx.sfx.bonk();
      this.ctx.car.hop(160 + car.vx * 0.12);
      this.ctx.bumpCar(0.6);
      this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: -6, count: 6, shape: 'circle', tint: 0xd8cfbe, speed: [60, 160], angle: [-3, -0.2], gravity: -40, life: [0.4, 0.8], size: [10, 18], grow: 1.6, alpha: 0.6 });
    }
    if (this.alt > 0 || this.vy !== 0 || this.vx !== 0) {
      this.vy -= 1800 * dt;
      this.alt += this.vy * dt;
      if (this.alt <= 0) {
        this.alt = 0;
        this.vy = Math.abs(this.vy) > 140 ? -this.vy * 0.35 : 0;
        this.vx *= 0.75;
      }
      this.vx *= Math.exp(-dt * 1.4);
      if (Math.abs(this.vx) < 5 && this.alt === 0) this.vx = 0;
      this.x += this.vx * dt;
      this.g.rotation += (this.vx * dt) / 24;
    }
    this.view.position.set(this.x, this.y - this.alt);
  }
}

// ---------- Ramp ----------
export class Ramp extends Prop {
  private g = new Graphics();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 0);
    this.layer = 'roadDecor';
    const spec = RAMPS.find((r) => r.x === x)!;
    const g = this.g;
    const pts: number[] = [];
    for (let t = 0; t <= 1.0001; t += 0.05) pts.push(t * spec.len, -spec.height * t * t);
    pts.push(spec.len, 4, 0, 4);
    g.poly(pts).fill(P.wood);
    // Support struts
    for (const t of [0.45, 0.72, 0.97]) {
      const sx = t * spec.len;
      g.roundRect(sx - 4, -spec.height * t * t, 8, spec.height * t * t + 4, 2).fill(P.woodDark);
    }
    // Hazard stripes on the face
    const face = new Graphics();
    face.poly([spec.len - 12, -spec.height, spec.len, -spec.height, spec.len, 4, spec.len - 12, 4]).fill(0xff8a2a);
    for (let y = -spec.height + 6; y < 0; y += 16) face.poly([spec.len - 12, y, spec.len, y - 6, spec.len, y + 2, spec.len - 12, y + 8]).fill(P.white);
    // Top surface highlight
    const top: number[] = [];
    for (let t = 0; t <= 1.0001; t += 0.05) top.push(t * spec.len, -spec.height * t * t);
    for (let t = 1; t >= -0.0001; t -= 0.05) top.push(t * spec.len, -spec.height * t * t + 5);
    g.poly(top).fill({ color: P.white, alpha: 0.35 });
    this.view.addChild(g, face);
    this.hits = [{ x: 0, y: -spec.height, w: spec.len, h: spec.height + 4 }];
    this.extent = [-200, spec.len + 200];
  }

  hintTarget(): Container {
    return this.g;
  }

  onTap(): void {
    this.ctx.sfx.boing(0.8);
    this.ctx.tweens.wobble(this.g, 0, 0.6, 0.12);
  }
}

// ---------- Beach ball: bounces along ahead of the car ----------
export class BeachBall extends Prop {
  private ball = new Container();
  private shadow = new Graphics();
  private vx = 0;
  private vy = 0;
  private alt = 0;
  private r = 28;
  private cool = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 12);
    this.layer = 'front';
    contactShadow(this.shadow, 0, 0, 56, 0.15);
    const g = new Graphics();
    const colors = [0xe94b3c, 0xffffff, 0xf7c934, 0xffffff, 0x2f80d1, 0xffffff];
    const r = this.r;
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 1) / 6) * Math.PI * 2;
      g.moveTo(0, 0).arc(0, 0, r, a0, a1).closePath().fill(colors[k]);
    }
    g.circle(0, 0, 6).fill(0xffffff);
    const shine = new Graphics().ellipse(-9, -11, 9, 5).fill({ color: P.white, alpha: 0.55 });
    shine.rotation = -0.5;
    const shade = new Graphics();
    shade.moveTo(r * 0.3, -r * 0.95).arc(0, 0, r, -1.25, 1.25).quadraticCurveTo(r * 0.7, 0, r * 0.3, -r * 0.95).fill({ color: P.black, alpha: 0.08 });
    this.ball.addChild(g);
    this.view.addChild(this.shadow, this.ball, shade, shine);
    this.ball.y = -r;
    shade.y = -r;
    shine.y = -r;
    this.hits = [{ x: -r, y: -r * 2, w: r * 2, h: r * 2 }];
    this.extent = [-1e6, 1e6];
  }

  hintTarget(): Container {
    return this.ball;
  }

  onTap(): void {
    this.vy = 560;
    this.vx += 60;
    this.ctx.sfx.boing(1.3);
  }

  update(dt: number): void {
    const car = this.ctx.car;
    this.cool -= dt;
    const ground = surfaceAt(this.x);
    // Car nudges the ball when its nose reaches it.
    const nose = car.x + this.ctx.carView.dims.half;
    const carBottom = car.alt;
    const ballAlt = ground + this.alt;
    if (this.cool <= 0 && Math.abs(nose - (this.x - this.r)) < 30 + Math.max(0, car.vx - this.vx) * dt
      && carBottom < ballAlt + this.r * 2 && car.alt + this.ctx.carView.dims.height > ballAlt) {
      this.cool = 0.25;
      this.vx = Math.max(this.vx, car.vx) + 160;
      this.vy = 360 + car.speed * 0.35;
      this.ctx.sfx.boing(1.2 + Math.random() * 0.3);
      this.ctx.bumpCar(0.25);
    }
    this.vy -= 1500 * dt;
    this.alt += this.vy * dt;
    if (this.alt <= 0) {
      this.alt = 0;
      if (this.vy < -120) {
        this.vy = -this.vy * 0.62;
        if (this.vy > 200) this.ctx.sfx.s.tone({ freq: 300 + Math.random() * 80, to: 200, dur: 0.08, type: 'sine', gain: 0.07 });
      } else this.vy = 0;
      this.vx *= Math.exp(-dt * 0.8);
    } else {
      this.vx *= Math.exp(-dt * 0.15);
    }
    this.x += this.vx * dt;
    if (this.x > WORLD_END - 300) {
      this.x = WORLD_END - 300;
      this.vx = -Math.abs(this.vx) * 0.5;
    }
    this.ball.rotation += (this.vx * dt) / this.r;
    const gy = -ground;
    this.view.position.set(this.x, this.y + gy);
    for (const c of this.view.children) if (c !== this.shadow) c.y = -this.r - this.alt;
    this.hits[0].y = -this.r * 2 - this.alt;
    const k = Math.max(0.4, 1 - this.alt / 400);
    this.shadow.scale.set(k);
    this.shadow.alpha = k;
  }
}
