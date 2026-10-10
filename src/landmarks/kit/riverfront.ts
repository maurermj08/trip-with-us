// River-city pieces: a riverwalk with the river on the near side of the road, tall Washingtonia
// palms, pelicans on pilings and a tug pushing a barge. Used by Jacksonville (the St. Johns).
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken } from '../../style/palette';
import { block, contactShadow } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { rand } from '../../core/rng';

const RIVER = P.water;
const RIVER_DEEP = 0x52a4d4;
/** Top of the water band (world y, near side of the road). */
export const RIVER_TOP = 62;

// ---------- The river along the near side, with a railed riverwalk ----------
export class RiverBand extends Prop {
  private glints: Graphics[] = [];
  private t = 0;
  /**
   * `openLeft`: the water runs straight on to the left (it continues the water under a bridge);
   * the walk and its rail then start `walkFrom` units in, where the bridge lands.
   */
  constructor(ctx: Ctx, x: number, private len: number, openLeft = false, walkFrom = 0) {
    super(ctx, x, 0);
    this.layer = 'front';
    const g = new Graphics();
    const L = len;
    // riverwalk pavers between the road and the rail
    const w0 = walkFrom;
    g.roundRect(w0, 34, L - w0, RIVER_TOP - 30, 4).fill(0xe6e0d2);
    for (let px = w0 + 20; px < L; px += 40) g.rect(px, 38, 1.5, RIVER_TOP - 38).fill({ color: P.black, alpha: 0.05 });
    // water, with the shoreline curving away at both ends
    const bottom = 420;
    if (openLeft) g.moveTo(-60, bottom).lineTo(-60, RIVER_TOP);
    else g.moveTo(-140, bottom).quadraticCurveTo(-60, RIVER_TOP, 60, RIVER_TOP);
    g.lineTo(L - 60, RIVER_TOP).quadraticCurveTo(L + 60, RIVER_TOP, L + 140, bottom).closePath().fill(RIVER);
    // Before the walk starts, water fills right up to the road (under the bridge's last stretch).
    if (openLeft && w0 > 0) g.rect(-60, 32, w0 + 60, RIVER_TOP - 30).fill(RIVER);
    const d0 = Math.max(40, w0);
    g.roundRect(d0, RIVER_TOP + 70, L - 40 - d0, bottom - RIVER_TOP - 70, 30).fill(RIVER_DEEP);
    g.rect(d0, RIVER_TOP, L - 40 - d0, 6).fill({ color: darken(RIVER, 0.15), alpha: 0.6 });
    // rail along the walk
    g.roundRect(w0, RIVER_TOP - 26, L - w0, 4, 2).fill(P.white);
    for (let px = w0 + 6; px < L; px += 34) g.roundRect(px, RIVER_TOP - 26, 3, 24, 1.5).fill(P.white);
    this.view.addChild(g);
    for (let k = 0; k < Math.floor(L / 260); k++) {
      const s = new Graphics().roundRect(0, 0, rand(30, 70), 3, 1.5).fill({ color: P.white, alpha: 0.6 });
      s.position.set(k * 260 + rand(40, 200), RIVER_TOP + rand(20, 160));
      this.glints.push(s);
      this.view.addChild(s);
    }
    this.hits = [{ x: 0, y: RIVER_TOP, w: L, h: 180 }];
    this.extent = [-300, L + 300];
  }

  onTap(wx: number, wy: number): void {
    this.ctx.sfx.plip();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: wx, y: wy, count: 8, shape: 'drop', tint: [RIVER, P.white], speed: [80, 220], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.7], size: [6, 10], rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.glints.forEach((s, k) => {
      s.x += dt * 12;
      if (s.x > this.len - 80) s.x = 40;
      s.alpha = 0.4 + 0.4 * Math.sin(this.t * 1.5 + k);
    });
  }
}

// ---------- Washingtonia palm: tall skinny trunk, small crown, brown skirt ----------
export function tallPalm(g: Graphics, x: number, y: number, h: number, lean = 0): { cx: number; cy: number } {
  const steps = 10;
  const pts: number[] = [];
  const back: number[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const px = x + lean * h * t * t;
    const half = 7 - t * 2.5;
    pts.push(px - half, y - h * t);
    back.unshift(px + half, y - h * t);
  }
  g.poly([...pts, ...back]).fill(0x9a8068);
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    g.roundRect(x + lean * h * t * t - 5, y - h * t, 10, 2, 1).fill({ color: darken(0x9a8068, 0.15), alpha: 0.6 });
  }
  const cx = x + lean * h, cy = y - h;
  // skirt of old fronds
  g.ellipse(cx, cy + 20, 13, 24).fill(0xb58f5c);
  for (let k = -2; k <= 2; k++) g.roundRect(cx + k * 5 - 1.5, cy + 8, 3, 30 - Math.abs(k) * 4, 1.5).fill(0x9c7a4c);
  return { cx, cy };
}

function palmCrownTall(g: Graphics, r: number): void {
  // a round fan of fronds; the outer ones droop
  for (let k = 0; k < 13; k++) {
    const a = -Math.PI / 2 + (k - 6) * 0.42;
    const len = r * (k % 2 ? 0.8 : 1);
    const droop = Math.max(0, Math.abs(k - 6) - 2) * r * 0.12;
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len * 0.7 + droop;
    const mx = ex * 0.55, my = ey * 0.55 - r * 0.18;
    g.moveTo(0, 0).quadraticCurveTo(mx - 8, my - 8, ex, ey).quadraticCurveTo(mx + 8, my + 8, 0, 0).fill(k % 2 ? 0x4f9a52 : 0x5fae5a);
  }
  g.circle(0, 0, 9).fill(0x4a8a46);
}

export class TallPalm extends Prop {
  private crown = new Container();
  constructor(ctx: Ctx, x: number, y: number, h = 380, lean = 0.05, front = false) {
    super(ctx, x, y);
    this.layer = front ? 'front' : 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 60);
    const { cx, cy } = tallPalm(g, 0, 0, h, lean);
    this.view.addChild(g);
    const c = new Graphics();
    palmCrownTall(c, 70);
    this.crown.addChild(c);
    this.crown.position.set(cx, cy);
    this.view.addChild(this.crown);
    this.hits = [{ x: cx - 60, y: cy - 60, w: 120, h: 90 }, { x: -14, y: -h, w: 28, h }];
    this.extent = [-200, 200];
  }

  hintTarget(): Container {
    return this.crown;
  }

  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.tweens.wobble(this.crown, 0.14, 1.1, 0.04);
  }
}

// ---------- Pelicans on pilings: tap one and it dives for a fish ----------
interface Pelican { c: Container; home: { x: number; y: number }; busy: boolean; pouch: Graphics }

function drawPelican(): { c: Container; pouch: Graphics } {
  const c = new Container();
  const g = new Graphics();
  g.ellipse(0, -16, 22, 14).fill(0xd9d4cc);
  g.ellipse(-6, -14, 16, 9).fill(0x8f8a84);
  g.roundRect(-30, -16, 14, 6, 3).fill(0x8f8a84);
  g.roundRect(8, -46, 10, 30, 5).fill(0xe8e4dc);
  g.circle(14, -48, 9).fill(0xf4f0e6);
  g.ellipse(10, -52, 6, 3).fill(0xf2d16b);
  g.circle(17, -50, 2).fill(0x24262a);
  // long bill
  g.roundRect(18, -48, 34, 5, 2.5).fill(0xf2a33d);
  const pouch = new Graphics().moveTo(20, -44).quadraticCurveTo(34, -34, 50, -44).closePath().fill(0xe8913a);
  c.addChild(g, pouch);
  return { c, pouch };
}

export class Pelicans extends Prop {
  private birds: Pelican[] = [];
  constructor(ctx: Ctx, x: number, count = 3, spacing = 150) {
    super(ctx, x, 0);
    this.layer = 'front';
    const g = new Graphics();
    for (let k = 0; k < count; k++) {
      const px = k * spacing, top = RIVER_TOP + 30 + (k % 2) * 16;
      g.roundRect(px - 9, top, 18, 200, 8).fill(0x8a6a4a);
      g.roundRect(px + 3, top, 6, 200, 3).fill({ color: P.black, alpha: 0.1 });
      g.ellipse(px, top + 2, 9, 3).fill(0xa7845f);
      g.ellipse(px, RIVER_TOP + 110 + (k % 2) * 10, 22, 4).fill({ color: P.white, alpha: 0.4 });
    }
    this.view.addChild(g);
    for (let k = 0; k < count; k++) {
      const { c, pouch } = drawPelican();
      const home = { x: k * spacing, y: RIVER_TOP + 30 + (k % 2) * 16 };
      c.position.set(home.x, home.y);
      if (k % 2) c.scale.x = -1;
      this.view.addChild(c);
      this.birds.push({ c, home, busy: false, pouch });
    }
    this.hits = [{ x: -40, y: RIVER_TOP - 30, w: (count - 1) * spacing + 80, h: 120 }];
    this.extent = [-300, count * spacing + 300];
  }

  hintTarget(): Container {
    return this.birds[0].c;
  }

  onTap(wx: number): void {
    const lx = wx - this.x;
    const free = this.birds.filter((b) => !b.busy).sort((a, b) => Math.abs(a.home.x - lx) - Math.abs(b.home.x - lx));
    const b = free[0];
    if (!b) {
      this.ctx.sfx.squeak();
      return;
    }
    b.busy = true;
    const { tweens, sfx, fx, layers } = this.ctx;
    const dir = b.c.scale.x;
    const dx = 70 * dir;
    // Hop up, arc over and plunge, splash, bob up with a full pouch, gulp, fly home.
    tweens.add(0.7, (p) => {
      if (b.c.destroyed) return;
      b.c.x = b.home.x + dx * p;
      b.c.y = b.home.y - Math.sin(p * Math.PI) * 90 + p * 60;
      b.c.rotation = dir * p * 1.6;
    }, {
      ease: ease.inOutSine,
      done: () => {
        sfx.splash(0.8);
        fx.emit(layers.fx, { x: this.x + b.c.x, y: this.y + b.home.y + 60, count: 12, shape: 'drop', tint: [0x4fa6d6, P.white], speed: [120, 320], angle: [-2.6, -0.5], gravity: 900, life: [0.5, 0.8], size: [6, 11], rotate: false });
      },
    });
    tweens.add(0.4, (p) => {
      if (b.c.destroyed) return;
      b.c.rotation = dir * 1.6 * (1 - p);
      b.c.y = b.home.y + 60 - p * 20;
      b.pouch.scale.y = 1 + p * 0.9;
    }, { delay: 1.0, done: () => sfx.gulp() });
    tweens.add(0.5, (p) => !b.pouch.destroyed && (b.pouch.scale.y = 1.9 - p * 0.9), { delay: 1.8 });
    tweens.add(0.8, (p) => {
      if (b.c.destroyed) return;
      b.c.x = b.home.x + dx * (1 - p);
      b.c.y = b.home.y + 40 * (1 - p) - Math.sin(p * Math.PI) * 50;
    }, { delay: 2.0, ease: ease.inOutSine, done: () => (b.busy = false) });
  }
}

// ---------- Tug pushing a barge up the river (tap: horn and smoke puffs) ----------
export class Tugboat extends Prop {
  private boat = new Container();
  private stack = new Container();
  private dist: number;
  private pos = 0;
  constructor(ctx: Ctx, x: number, span: number, start = 0.2) {
    super(ctx, x, RIVER_TOP + 46);
    this.layer = 'front';
    this.dist = span;
    this.pos = start * span;
    const g = new Graphics();
    // barge in front (to the right) with colorful containers
    g.roundRect(70, -10, 300, 30, 10).fill(0x7d6a5a);
    g.roundRect(70, -10, 300, 6, 3).fill(0x95806d);
    const colors = [0xe9637a, 0x3f7fd1, 0xf2b33d, 0x5aa357, 0xe9637a, 0x3f7fd1];
    colors.forEach((c, k) => block(g, 86 + (k % 3) * 92, -46 - Math.floor(k / 3) * 34, 86, 34, c, { radius: 3 }));
    // tug: hull, cabin, wheelhouse windows (no face), stack
    g.roundRect(-70, -6, 140, 30, 14).fill(0xd8392b);
    g.roundRect(-70, -6, 140, 6, 3).fill(0x24262a);
    g.roundRect(56, -14, 18, 34, 8).fill(0x3a3a3a);
    block(g, -40, -46, 70, 40, P.white, { radius: 5 });
    block(g, -30, -78, 52, 34, P.white, { radius: 5 });
    g.roundRect(-24, -70, 40, 12, 3).fill(0x7fb6dc);
    g.roundRect(-60, 8, 120, 6, 3).fill({ color: P.black, alpha: 0.15 });
    this.boat.addChild(g);
    const s = new Graphics();
    s.roundRect(-8, -40, 16, 40, 4).fill(0x24262a);
    s.roundRect(-8, -32, 16, 6, 2).fill(0xf2b33d);
    this.stack.addChild(s);
    this.stack.position.set(-50, -40);
    this.boat.addChild(this.stack);
    this.view.addChild(this.boat);
    this.hits = [];
    this.extent = [-400, span + 600];
    this.syncHits();
  }

  private syncHits(): void {
    this.boat.x = this.pos;
    this.hits = [{ x: this.pos - 80, y: -90, w: 460, h: 120 }];
  }

  hintTarget(): Container {
    return this.boat;
  }

  onTap(): void {
    this.ctx.sfx.shipHorn();
    this.ctx.tweens.wobble(this.boat, 0.03, 1, 0.03);
    this.ctx.tweens.wobble(this.stack, 0.15, 0.8, 0.1);
    for (let k = 0; k < 3; k++) {
      this.ctx.tweens.after(k * 0.25, () => this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + this.boat.x - 50, y: this.y - 84, count: 1, shape: 'circle', tint: 0xe9edf1, speed: [30, 60], angle: [-2, -1.4], gravity: -40, life: [1.2, 1.6], size: [16, 22], grow: 2.2, alpha: 0.85,
      }));
    }
  }

  update(dt: number): void {
    // Chugs slowly upriver; loops back once it's past the end.
    this.pos += dt * 28;
    if (this.pos > this.dist) this.pos = 0;
    this.syncHits();
    this.boat.y = Math.sin(this.pos * 0.05) * 2;
    // Fade in and out at the ends of its run so the loop never pops.
    this.boat.alpha = Math.max(0, Math.min(1, this.pos / 200, (this.dist - this.pos) / 200));
  }
}
