// Savannah, GA: River Street's cotton warehouses (and a candy shop), City Hall's gold dome,
// the twin-spired cathedral and squares of live oaks with gas lamps, ending at the Forsyth Park
// fountain. On the near side the Savannah River runs past, with a paddle-wheel riverboat and
// the Waving Girl. The Talmadge Bridge is built from its BridgeSpec in ./bridges.
import { Container, Graphics } from 'pixi.js';
import type { Ctx } from '../core/Ctx';
import { Prop } from '../props/Prop';
import { P, darken, lighten } from '../style/palette';
import { block, contactShadow } from '../style/shapes';
import { ease } from '../core/Tween';
import { CITIES } from '../world/Route';
import { WALK, type CitySet } from './kit/common';
import { BRICKS, Cathedral, CityHall, Warehouse } from './kit/savannahBuildings';
import { GasLamp, LiveOak } from './kit/oaks';

export { BRICKS, Cathedral, CityHall, Warehouse } from './kit/savannahBuildings';
export { GasLamp, LiveOak } from './kit/oaks';

const SAVANNAH_X0 = CITIES.find((c) => c.id === 'savannah')!.x0;
/** Top of the river on the near side (just below the road's near curb). */
const RIVER_Y = 74;
const RIVER = 0x4f9fcf;

// ---------- The river along the near side (tap: ripples and a plip) ----------
export class RiverBand extends Prop {
  constructor(ctx: Ctx, x: number, len: number) {
    super(ctx, x, RIVER_Y);
    this.layer = 'front';
    const g = new Graphics();
    // Granite edge, then water down past the bottom of the screen.
    g.roundRect(-40, -10, len + 80, 14, 5).fill(0xb9b3a6);
    g.roundRect(-40, -10, len + 80, 3, 2).fill({ color: P.white, alpha: 0.45 });
    g.rect(-40, 4, len + 80, 600).fill(RIVER);
    for (let k = 0; k < len / 90; k++) {
      const wx = (k * 157) % len, wy = 30 + ((k * 53) % 140);
      g.roundRect(wx, wy, 36 + (k % 3) * 14, 4, 2).fill({ color: P.white, alpha: 0.28 });
    }
    this.view.addChild(g);
    this.hits = [{ x: -40, y: 0, w: len + 80, h: 220 }];
    this.extent = [-200, len + 200];
  }

  onTap(wx: number, wy: number): void {
    this.ctx.sfx.plip();
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: wx, y: wy, count: 8, shape: 'drop', tint: [RIVER, P.white, 0xbfe6ff],
      speed: [80, 220], angle: [-2.6, -0.5], gravity: 800, life: [0.4, 0.7], size: [6, 10], rotate: false,
    });
  }
}

// ---------- Paddle-wheel riverboat ----------
// Cruises up and down the river band, turning around at each end; the wheel throws spray, the
// stacks puff now and then, the flag flutters and a wake trails behind. Tap: steam whistle.
const BOAT_SCALE = 0.72;

export class Riverboat extends Prop {
  private boat = new Container();
  private wheel = new Graphics();
  private flag = new Container();
  private stacks: [number, number][] = [[-70, -150], [-30, -150]];
  private t = 0;
  private cool = 0;
  private dir = 1;
  private turning = false;
  private sprayT = 0;
  private puffT = 1;
  private wakeT = 0;

  /** `range`: how far (each way) the boat cruises from x. */
  constructor(ctx: Ctx, x: number, private range = 1200) {
    super(ctx, x, RIVER_Y + 150);
    this.layer = 'front';
    this.boat.scale.set(BOAT_SCALE);
    const g = new Graphics();
    const white = 0xfbf8f0, trim = 0xc8473d;
    // Hull and three decks of railings.
    g.ellipse(10, 6, 240, 16).fill({ color: 0x2f6f99, alpha: 0.35 });
    g.moveTo(-210, -30).lineTo(210, -30).quadraticCurveTo(236, -30, 224, 0).lineTo(-196, 0).quadraticCurveTo(-214, -10, -210, -30).fill(white);
    g.roundRect(-206, -16, 424, 8, 3).fill(trim);
    block(g, -180, -84, 330, 54, white, { radius: 6, shade: 0xe9e3d6 });
    block(g, -150, -128, 250, 44, white, { radius: 6, shade: 0xe9e3d6 });
    g.roundRect(-190, -90, 350, 8, 4).fill(trim);
    g.roundRect(-160, -134, 270, 8, 4).fill(trim);
    // Railings along the open decks.
    for (const [ry, rx0, rx1] of [[-92, -186, 156], [-136, -156, 106]] as const) {
      for (let rx = rx0; rx <= rx1; rx += 12) g.rect(rx, ry - 12, 2, 12).fill(trim);
    }
    for (let k = 0; k < 9; k++) g.roundRect(-160 + k * 34, -72, 22, 26, 5).fill(0x9fc3d9);
    for (let k = 0; k < 6; k++) g.roundRect(-130 + k * 36, -118, 22, 22, 5).fill(0x9fc3d9);
    // Little passengers at a few windows.
    for (const [px, py, col] of [[-149, -60, 0xf7c934], [-47, -60, 0x3f7fd1], [-113, -106, 0xe9637a], [31, -106, 0x7fbf6a]] as const) {
      g.circle(px, py - 6, 5).fill(0xf1c7a1);
      g.roundRect(px - 6, py, 12, 8, 3).fill(col);
    }
    // Pilot house and twin stacks with crowns.
    block(g, -10, -168, 70, 40, white, { radius: 6, shade: 0xe9e3d6 });
    g.roundRect(-4, -160, 58, 14, 4).fill(0x9fc3d9);
    for (const [sx, sy] of this.stacks) {
      g.roundRect(sx - 8, sy - 60, 16, 70, 4).fill(0x2b2f33);
      g.roundRect(sx - 12, sy - 66, 24, 10, 4).fill(0x2b2f33);
      for (let k = 0; k < 3; k++) g.circle(sx - 8 + k * 8, sy - 68, 3.5).fill(0xd9a62c);
      g.roundRect(sx - 8, sy - 40, 16, 6, 2).fill(trim);
    }
    g.roundRect(118, -190, 3, 60, 1.5).fill(0x2b2f33);
    this.boat.addChild(g);
    // Flag on its own so it can flutter.
    const f = new Graphics();
    f.poly([0, 0, 30, 6, 28, 10, 0, 16]).fill(trim);
    f.poly([0, 6, 29, 8, 0, 10]).fill(0xfbf8f0);
    this.flag.addChild(f);
    this.flag.position.set(121, -190);
    this.boat.addChild(this.flag);
    // Red stern paddle wheel (turns), half in the water.
    const w = this.wheel;
    w.circle(0, 0, 54).fill(trim);
    w.circle(0, 0, 44).fill(darken(trim, 0.15));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      w.poly([Math.cos(a - 0.12) * 12, Math.sin(a - 0.12) * 12, Math.cos(a - 0.12) * 54, Math.sin(a - 0.12) * 54, Math.cos(a + 0.12) * 54, Math.sin(a + 0.12) * 54, Math.cos(a + 0.12) * 12, Math.sin(a + 0.12) * 12]).fill(trim);
    }
    w.circle(0, 0, 12).fill(lighten(trim, 0.3));
    w.position.set(-226, -20);
    this.boat.addChildAt(w, 0);
    // Waterline wash in front of the wheel.
    const wash = new Graphics();
    wash.rect(-300, 6, 560, 80).fill(RIVER);
    wash.roundRect(-290, 4, 120, 5, 2.5).fill({ color: P.white, alpha: 0.6 });
    this.boat.addChild(wash);
    this.view.addChild(this.boat);
    this.hits = [{ x: -170, y: -150, w: 330, h: 160 }];
    this.extent = [-range - 700, range + 700];
  }

  hintTarget(): Container {
    return this.boat;
  }

  onTap(): void {
    this.answer();
    this.ctx.tweens.wobble(this.boat, 0.03, 1.0, 0.03);
  }

  /** World position of a point on the boat (boat-local, unscaled). */
  private at(lx: number, ly: number): { x: number; y: number } {
    return { x: this.x + this.boat.x + lx * this.boat.scale.x, y: this.y + this.boat.y + ly * BOAT_SCALE };
  }

  private puff(count: number, size: [number, number]): void {
    for (const [sx, sy] of this.stacks) {
      const p = this.at(sx, sy - 66);
      this.ctx.fx.emit(this.ctx.layers.fx, {
        x: p.x, y: p.y, count, shape: 'circle', tint: [P.white, 0xeef2f6, 0xdfe3e8],
        speed: [30, 90], angle: [-2.0, -1.2], gravity: -60, drag: 0.8, life: [1.0, 1.6], size, grow: 2.2, alpha: 0.8, vx: -this.dir * 20,
      });
    }
  }

  /** Whistle and steam (also called when the Waving Girl waves). */
  answer(horn = false): void {
    if (this.cool > 0) return;
    this.cool = 1.6;
    if (horn) this.ctx.sfx.shipHorn();
    else this.ctx.sfx.steamWhistle();
    this.puff(6, [14, 22]);
  }

  /** Turn around at the end of the run: squash, flip and carry on the other way. */
  private turn(): void {
    this.turning = true;
    const from = this.dir;
    this.dir = -from;
    this.ctx.tweens.add(1.4, (p) => {
      if (this.boat.destroyed) return;
      this.boat.scale.x = BOAT_SCALE * from * Math.cos(p * Math.PI);
      this.boat.scale.y = BOAT_SCALE * (1 + Math.sin(p * Math.PI) * 0.06);
    }, {
      ease: ease.inOutSine,
      done: () => {
        this.turning = false;
        if (!this.boat.destroyed) this.boat.scale.set(BOAT_SCALE * this.dir, BOAT_SCALE);
      },
    });
  }

  private wake(): void {
    const sx = this.boat.scale.x;
    const r = new Graphics().roundRect(-30, -2, 60, 4, 2).fill({ color: P.white, alpha: 0.6 });
    r.position.set(this.boat.x - 250 * sx, this.boat.y + 14 + Math.random() * 10);
    this.view.addChildAt(r, 0);
    const x0 = r.x, drift = -this.dir * 30;
    this.ctx.tweens.add(2.4, (p) => {
      if (r.destroyed) return;
      r.scale.x = 1 + p * 2.2;
      r.x = x0 + drift * p;
      r.alpha = 1 - p;
    }, { done: () => !r.destroyed && r.destroy() });
  }

  update(dt: number): void {
    this.t += dt;
    this.cool = Math.max(0, this.cool - dt);
    // Bob, and cruise the river (slow down near the ends, then turn around).
    this.boat.y = Math.sin(this.t * 1.4) * 2.5;
    this.boat.rotation = Math.sin(this.t * 0.9) * 0.008;
    if (!this.turning) {
      const ahead = this.range - this.dir * this.boat.x;
      const v = 70 * Math.min(1, 0.25 + ahead / 300);
      this.boat.x += this.dir * v * dt;
      if (this.dir * this.boat.x >= this.range) this.turn();
    }
    this.hits[0].x = this.boat.x - 170;
    const working = !this.turning;
    this.wheel.rotation -= dt * (working ? 2.2 : 0.8);
    // Spray off the paddle wheel, thrown astern.
    this.sprayT -= dt;
    if (working && this.sprayT <= 0) {
      this.sprayT = 0.07;
      const p = this.at(-226, 20);
      this.ctx.fx.spawn(this.ctx.layers.fx, {
        x: p.x, y: p.y, shape: 'drop', tint: [P.white, 0xbfe6ff, RIVER],
        speed: [90, 180], angle: this.dir > 0 ? [-2.9, -2.2] : [-0.95, -0.25],
        gravity: 700, drag: 0.3, life: [0.35, 0.55], size: [5, 8], spin: 0, rotate: false, alpha: 0.85,
      });
    }
    // A puff from the stacks now and then, and the wake.
    this.puffT -= dt;
    if (this.puffT <= 0) {
      this.puffT = 1.4 + Math.random() * 1.2;
      this.puff(1, [10, 16]);
    }
    this.wakeT -= dt;
    if (working && this.wakeT <= 0) {
      this.wakeT = 0.45;
      this.wake();
    }
    this.flag.scale.y = 1 + Math.sin(this.t * 7) * 0.12;
    this.flag.skew.y = Math.sin(this.t * 5.3) * 0.12;
  }
}

// ---------- A container ship passing slowly further out on the river (tap: deep horn) ----------
export class PassingShip extends Prop {
  private ship = new Container();
  private funnel = 0;
  private cool = 0;
  private t = 0;

  /** Sails right → left over [x - range, x + range], then slips back in from the right. */
  constructor(ctx: Ctx, x: number, private range = 1500, private speed = 34) {
    super(ctx, x, RIVER_Y + 128);
    this.layer = 'front';
    const s = 0.5;
    this.ship.scale.set(s);
    const g = new Graphics();
    const len = 820, deck = -70;
    // Hull: bow on the left (it sails left), superstructure aft on the right.
    g.ellipse(len / 2, 6, len / 2 + 30, 10).fill({ color: 0x2f6f99, alpha: 0.3 });
    g.moveTo(-30, deck).lineTo(len, deck).lineTo(len - 6, 0).lineTo(20, 0).quadraticCurveTo(-8, -24, -30, deck).fill(0x2f5d4f);
    g.moveTo(-6, -18).lineTo(len - 4, -18).lineTo(len - 6, 0).lineTo(20, 0).quadraticCurveTo(6, -8, -6, -18).fill(0xc8473d);
    g.roundRect(-26, deck, len + 22, 4, 2).fill(lighten(0x2f5d4f, 0.35));
    const cols = [0xd8564a, 0x2f7fd0, 0xf2b33d, 0x3fa36b, 0xe8833a, 0x8e6bbf, 0x2aa7a0];
    let k = 0;
    for (let bx = 60; bx < len - 200; bx += 50) {
      const rows = 2 + (k % 3 === 1 ? 1 : 0);
      for (let r = 0; r < rows; r++) {
        const col = cols[(k * 3 + r * 5) % cols.length];
        g.roundRect(bx, deck - (r + 1) * 22, 48, 21, 2).fill(col);
        for (let q = 1; q < 6; q++) g.rect(bx + q * 8, deck - (r + 1) * 22 + 3, 1.5, 15).fill({ color: P.black, alpha: 0.1 });
      }
      k++;
    }
    block(g, len - 170, deck - 120, 110, 120, P.white, { radius: 6, shade: 0xe4e8ec });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.roundRect(len - 158 + c * 25, deck - 108 + r * 32, 14, 12, 3).fill(0x8fb6d0);
    g.roundRect(len - 190, deck - 128, 150, 12, 4).fill(P.white);
    this.funnel = len - 90;
    block(g, this.funnel - 18, deck - 170, 36, 44, 0xe7e2d8, { radius: 5 });
    g.roundRect(this.funnel - 18, deck - 158, 36, 10, 3).fill(0xf2b33d);
    this.ship.addChild(g);
    this.ship.x = range - len * s;
    this.view.addChild(this.ship);
    this.hits = [{ x: 0, y: -125, w: len * s, h: 130 }];
    this.extent = [-range - 300, range + 700];
  }

  hintTarget(): Container {
    return this.ship;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.ship, 0.01, 0.9, 0.02);
    if (this.cool > 0) return;
    this.cool = 2;
    this.ctx.sfx.shipHorn();
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x + this.ship.x + this.funnel * 0.5, y: this.y - 122, count: 8, shape: 'circle', tint: [P.white, 0xe6e9ee],
      speed: [30, 90], angle: [-2.0, -1.3], gravity: -50, drag: 0.8, life: [1.2, 1.8], size: [12, 20], grow: 2.2, alpha: 0.8,
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.cool = Math.max(0, this.cool - dt);
    this.ship.x -= this.speed * dt;
    this.ship.y = Math.sin(this.t * 0.8) * 1.5;
    const w = 820 * 0.5;
    // Fade out past the left end and come back in from the right.
    this.ship.alpha = Math.max(0, Math.min(1, (this.ship.x + w + this.range) / 300, (this.range - this.ship.x) / 300));
    if (this.ship.x + w < -this.range) this.ship.x = this.range;
    this.hits[0].x = this.ship.x;
  }
}

// ---------- The Waving Girl statue and her dog (tap: she waves, the boats answer) ----------
export class WavingGirl extends Prop {
  private arm = new Container();
  private cloth = new Container();
  private tail = new Container();
  /** Boats that answer her wave. */
  boats: Riverboat[] = [];

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, RIVER_Y - 6);
    this.layer = 'front';
    this.view.scale.set(0.8);
    const bronze = 0x6f8b7a, bronzeSh = 0x5f7a6a;
    const g = new Graphics();
    contactShadow(g, 0, 0, 110);
    // Granite pedestal.
    block(g, -42, -70, 84, 70, 0xcfc8ba, { radius: 5, shade: 0xbab2a2 });
    g.roundRect(-50, -78, 100, 12, 5).fill(0xdcd6ca);
    // Girl: long dress, head with a bun; characters may have faces.
    g.moveTo(-22, -78).lineTo(-12, -160).lineTo(12, -160).lineTo(24, -78).closePath().fill(bronze);
    g.moveTo(6, -160).lineTo(12, -160).lineTo(24, -78).lineTo(10, -78).closePath().fill(bronzeSh);
    g.roundRect(-11, -176, 22, 20, 8).fill(bronze);
    g.circle(0, -186, 13).fill(bronze);
    g.circle(-10, -192, 7).fill(bronzeSh);
    g.circle(5, -187, 1.8).fill(0x3d4f45);
    g.moveTo(2, -180).quadraticCurveTo(6, -177, 9, -180).stroke({ width: 1.5, color: 0x3d4f45, cap: 'round' });
    // Collie at her side.
    g.ellipse(-46, -96, 22, 12).fill(bronze);
    g.roundRect(-64, -96, 7, 20, 3).fill(bronze);
    g.roundRect(-34, -96, 7, 20, 3).fill(bronze);
    g.circle(-26, -110, 10).fill(bronze);
    g.ellipse(-18, -106, 8, 5).fill(bronze);
    g.poly([-30, -118, -26, -128, -22, -117]).fill(bronzeSh);
    g.circle(-24, -112, 1.6).fill(0x3d4f45);
    this.view.addChild(g);
    const t = new Graphics();
    t.roundRect(-16, -3, 18, 6, 3).fill(bronze);
    this.tail.addChild(t);
    this.tail.position.set(-66, -100);
    this.view.addChild(this.tail);
    // Raised arm holding a cloth that flutters.
    const a = new Graphics();
    a.roundRect(-4, -46, 8, 48, 4).fill(bronze);
    a.circle(0, -48, 5).fill(bronze);
    this.arm.addChild(a);
    const c = new Graphics();
    c.moveTo(0, 0).quadraticCurveTo(20, -6, 34, 4).quadraticCurveTo(22, 10, 26, 26).quadraticCurveTo(10, 16, 0, 10).closePath().fill(lighten(bronze, 0.15));
    this.cloth.addChild(c);
    this.cloth.position.set(0, -50);
    this.arm.addChild(this.cloth);
    this.arm.position.set(10, -164);
    this.arm.rotation = 0.25;
    this.view.addChild(this.arm);
    this.hits = [{ x: -75, y: -250, w: 140, h: 250 }].map((r) => ({ x: r.x * 0.8, y: r.y * 0.8, w: r.w * 0.8, h: r.h * 0.8 }));
    this.extent = [-300, 300];
  }

  hintTarget(): Container {
    return this.arm;
  }

  private t = 0;
  private waving = 0;

  onTap(): void {
    this.waving = 2.4;
    this.ctx.sfx.giggle();
    this.ctx.tweens.add(0.5, (p) => !this.tail.destroyed && (this.tail.rotation = Math.sin(p * Math.PI * 6) * 0.5));
    this.ctx.tweens.after(0.4, () => this.ctx.sfx.boof());
    this.boats.forEach((b, i) => this.ctx.tweens.after(1.0 + i * 0.6, () => b.answer(true)));
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x + 24, y: this.y - 190, count: 8, shape: 'heart', tint: [0xf7a7c0, 0xffffff], speed: [60, 160], gravity: -40, life: [0.8, 1.2], size: [10, 14] });
  }

  update(dt: number): void {
    this.t += dt;
    this.waving = Math.max(0, this.waving - dt);
    const w = this.waving > 0 ? Math.sin(this.t * 9) * 0.45 : 0;
    this.arm.rotation = 0.25 + w;
    this.cloth.rotation = Math.sin(this.t * (this.waving > 0 ? 14 : 3)) * (this.waving > 0 ? 0.35 : 0.12);
    this.tail.rotation = this.waving > 0 ? Math.sin(this.t * 20) * 0.5 : Math.sin(this.t * 2) * 0.1;
  }
}

// ---------- Forsyth Park fountain (tap: big splash, the water turns green, then back) ----------
const BLUE_WATER = [P.water, 0xbfe6ff, P.white];
const GREEN_WATER = [0x4fbf6a, 0x9fe3a8, P.white];

export class ForsythFountain extends Prop {
  private t = 0;
  private boost = 0;
  private green = 0;
  private pools: { g: Graphics; w: number; h: number }[] = [];
  private figure = new Container();

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 6);
    this.layer = 'back';
    this.view.zIndex = 1;
    const iron = 0xf4f2ec, ironSh = 0xdedad0;
    const g = new Graphics();
    contactShadow(g, 0, 0, 380);
    // Wide basin with an iron rail.
    g.roundRect(-180, -36, 360, 36, 14).fill(0xd8d2c4);
    g.roundRect(-180, -36, 360, 3, 2).fill({ color: P.white, alpha: 0.5 });
    for (let rx = -176; rx <= 176; rx += 16) g.roundRect(rx - 1.5, -58, 3, 22, 1.5).fill(0x2b2f33);
    g.roundRect(-180, -60, 360, 4, 2).fill(0x2b2f33);
    // Pedestal and two tiers of cast-iron bowls.
    block(g, -30, -126, 60, 92, iron, { radius: 6, shade: ironSh });
    g.ellipse(0, -126, 96, 14).fill(iron);
    block(g, -12, -196, 24, 70, iron, { radius: 4, shade: ironSh });
    g.ellipse(0, -196, 56, 10).fill(iron);
    block(g, -7, -236, 14, 40, iron, { radius: 3, shade: ironSh });
    // Little tritons spouting at the base.
    for (const sx of [-1, 1]) {
      g.circle(sx * 60, -52, 10).fill(iron);
      g.ellipse(sx * 60, -40, 13, 8).fill(iron);
    }
    this.view.addChild(g);
    // Water surfaces (recolored when the fountain goes green).
    for (const [y, w, h] of [[-32, 330, 12], [-129, 176, 6], [-198, 100, 5]] as const) {
      const p = new Graphics();
      p.y = y;
      this.pools.push({ g: p, w, h });
      this.view.addChild(p);
    }
    this.drawPools();
    // The figure on top holding a staff.
    const f = new Graphics();
    f.roundRect(-8, -40, 16, 40, 6).fill(iron);
    f.circle(0, -48, 9).fill(iron);
    f.roundRect(10, -66, 3, 60, 1.5).fill(iron);
    f.moveTo(8, -36).lineTo(14, -40).stroke({ width: 4, color: iron, cap: 'round' });
    this.figure.addChild(f);
    this.figure.position.set(0, -236);
    this.view.addChild(this.figure);
    this.hits = [{ x: -180, y: -310, w: 360, h: 310 }];
    this.extent = [-1200, 1200];
  }

  private drawPools(): void {
    const c = this.green > 0 ? 0x4fbf6a : P.water;
    for (const { g: p, w, h } of this.pools) {
      p.clear().roundRect(-w / 2, -h / 2, w, h, h / 2).fill(c);
      p.roundRect(-w / 2 + 10, -h / 2, w * 0.4, 2, 1).fill({ color: P.white, alpha: 0.5 });
    }
  }

  hintTarget(): Container {
    return this.figure;
  }

  onTap(): void {
    this.boost = 1.4;
    const wasGreen = this.green > 0;
    this.green = 4;
    if (!wasGreen) this.drawPools();
    this.ctx.sfx.splash(1.3);
    this.ctx.sfx.sparkle();
    this.ctx.tweens.wobble(this.figure, 0.08, 0.8, 0.1);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y - 250, count: 28, shape: 'drop', tint: GREEN_WATER,
      speed: [200, 480], angle: [-2.6, -0.5], gravity: 900, life: [0.8, 1.3], size: [8, 14], spin: 0, rotate: false,
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    if (this.green > 0) {
      this.green -= dt;
      if (this.green <= 0) this.drawPools();
    }
    const tint = this.green > 0 ? GREEN_WATER : BLUE_WATER;
    const rate = this.boost > 0 ? 0.015 : 0.045;
    while (this.t > rate) {
      this.t -= rate;
      const r = Math.random();
      // Top jet, the two bowls overflowing and the tritons' spouts.
      const o = r < 0.4
        ? { x: this.x, y: this.y - 296, speed: [80, 140 + this.boost * 200] as [number, number], angle: [-1.9, -1.25] as [number, number] }
        : r < 0.7
          ? { x: this.x + (Math.random() < 0.5 ? -54 : 54), y: this.y - 198, speed: [30, 70] as [number, number], angle: [-1.6, -1.5] as [number, number] }
          : r < 0.85
            ? { x: this.x + (Math.random() < 0.5 ? -94 : 94), y: this.y - 128, speed: [30, 70] as [number, number], angle: [-1.6, -1.5] as [number, number] }
            : { x: this.x + (Math.random() < 0.5 ? -50 : 50), y: this.y - 58, speed: [90, 140] as [number, number], angle: (Math.random() < 0.5 ? [-2.6, -2.3] : [-0.8, -0.5]) as [number, number] };
      this.ctx.fx.spawn(this.ctx.layers.fxBack, {
        ...o, shape: 'drop', tint, gravity: 700, drag: 0.2, life: [0.5, 0.7], size: [5, 8], spin: 0, rotate: false, alpha: 0.85,
      });
    }
  }
}

/** All positions are relative to x0 (the end of the Talmadge Bridge). */
export function buildSavannah(ctx: Ctx, x0: number = SAVANNAH_X0): CitySet {
  const props: Prop[] = [];

  // River Street: a row of brick cotton warehouses; the candy shop is the fourth.
  let x = x0 + 650;
  let i = 0;
  const widths = [250, 300, 220, 260, 280, 240, 290];
  const hallX = x0 + 1350;
  while (x < x0 + 2650) {
    const w = widths[i % widths.length];
    // Leave a gap so City Hall stands on the street with its whole front showing.
    if (x + w > hallX - 128 && x < hallX + 128) {
      x = hallX + 134;
      continue;
    }
    props.push(new Warehouse(ctx, x, w, 3 + (i % 3 === 1 ? 1 : 0), BRICKS[i % BRICKS.length], i, i === 3));
    x += w + 6;
    i++;
  }
  // City Hall stands in its own gap in the row, gold dome on top.
  props.push(new CityHall(ctx, hallX));

  // The river with the Waving Girl and a riverboat (near side).
  props.push(new RiverBand(ctx, x0 + 300, 3000));
  const ship = new PassingShip(ctx, x0 + 1800, 1500);
  const boat = new Riverboat(ctx, x0 + 1900, 1250);
  const girl = new WavingGirl(ctx, x0 + 900);
  girl.boats.push(boat);
  props.push(ship, boat, girl);

  // Squares: live oaks and gas lamps around the cathedral.
  props.push(new Cathedral(ctx, x0 + 3800));
  for (const [dx, size] of [[3050, 300], [3420, 240], [4250, 280], [4650, 250]] as const) props.push(new LiveOak(ctx, x0 + dx, size));
  [2900, 3250, 3600, 4050, 4450, 4800].forEach((dx, k) => props.push(new GasLamp(ctx, x0 + dx, false, undefined, k)));

  // Forsyth Park: the fountain framed by oaks.
  props.push(new ForsythFountain(ctx, x0 + 5300));
  props.push(new LiveOak(ctx, x0 + 4980, 230), new LiveOak(ctx, x0 + 5700, 300));
  props.push(new GasLamp(ctx, x0 + 5080, false, undefined, 2), new GasLamp(ctx, x0 + 5520, false, undefined, 4));

  // Near side: oaks dripping moss over the road past the river.
  for (const dx of [3500, 4500, 5900]) props.push(new LiveOak(ctx, x0 + dx, 230, true, 205));
  [3900, 5000].forEach((dx, k) => props.push(new GasLamp(ctx, x0 + dx, true, undefined, k + 3)));

  return { props, doorX: x0 + 3900 };
}
