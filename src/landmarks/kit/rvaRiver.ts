// Richmond's James River: the rapids under the I-95 crossing (boulders and whitewater on the near
// side), a great blue heron on a rock, a kayaker and two tube floaters riding the rapids, the
// Belle Isle footbridge hanging under our deck, and the Canal Walk with its little tour boat.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, SKIN, darken } from '../../style/palette';
import { contactShadow, cornerRect } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { makeRng, rand, range } from '../../core/rng';
import { roadHeight } from '../../world/Terrain';
import { ROAD_NEAR } from '../../world/Road';

const RIVER = P.water;
const FOAM = 0xf4fbff;
/** The near-side water starts here (Road.ts draws it under every water bridge). */
const WATER_TOP = 64;

/** A river boulder: a lumpy rounded rock, shaded on the right, wet highlight on top. */
function boulder(g: Graphics, x: number, y: number, w: number, h: number, seed: number): void {
  const pts: number[] = [];
  const n = 18;
  for (let k = 0; k <= n; k++) {
    const a = Math.PI + (k / n) * Math.PI;
    const wob = 1 + 0.08 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 5 + seed * 2);
    pts.push(x + Math.cos(a) * w * 0.5 * wob, y + Math.sin(a) * h * wob);
  }
  g.poly(pts).fill(0x9a958c);
  g.poly([x + w * 0.12, y - h * 0.92, x + w * 0.5, y, x + w * 0.1, y]).fill({ color: 0x7f7a72, alpha: 0.9 });
  g.ellipse(x - w * 0.14, y - h * 0.7, w * 0.16, h * 0.12).fill({ color: P.white, alpha: 0.35 });
  g.ellipse(x, y + 1, w * 0.55, 4).fill({ color: darken(RIVER, 0.25), alpha: 0.6 });
}

/**
 * A grassy bank that bows out into the river from the span's edge (at `x`, facing `dir`): it
 * hides the straight edge where the road's grass meets the water, with a sandy rim and rocks.
 */
function riverBank(g: Graphics, x: number, dir: 1 | -1): void {
  const top = 28, bottom = 420;
  const pts: number[] = [x - dir * 40, top];
  const n = 20;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const y = top + (bottom - top) * t;
    pts.push(x + dir * (20 + 140 * Math.sin(t * Math.PI * 0.85) * (1 - t * 0.4)), y);
  }
  pts.push(x - dir * 40, bottom);
  const sand: number[] = [];
  for (let k = 2; k < pts.length - 2; k += 2) sand.push(pts[k] + dir * 12, pts[k + 1]);
  for (let k = pts.length - 4; k >= 2; k -= 2) sand.push(pts[k], pts[k + 1]);
  g.poly(sand).fill(0xd9c99a);
  g.poly(pts).fill(P.grassNear);
  for (let k = 0; k < 4; k++) {
    const t = 0.25 + k * 0.17;
    const bx = x + dir * (20 + 140 * Math.sin(t * Math.PI * 0.85) * (1 - t * 0.4) + 6);
    boulder(g, bx, top + (bottom - top) * t + 10, 46 - k * 6, 20 - k * 2, k * 3 + (dir > 0 ? 1 : 5));
  }
}

// ---------- The rapids: boulders with whitewater pillows and streaks that run downstream ----------
interface Rock { x: number; y: number; w: number; h: number; foam: Graphics; phase: number }
interface Streak { g: Graphics; x: number; y: number; v: number }

export class Rapids extends Prop {
  private rocks: Rock[] = [];
  private streaks: Streak[] = [];
  private t = 0;
  private boost = 0;

  constructor(ctx: Ctx, x: number, private len: number, seed = 7) {
    super(ctx, x, 0);
    this.layer = 'front';
    const rng = makeRng(seed);
    const g = new Graphics();
    // a few darker riffles so the river reads as moving water
    for (let k = 0; k < len / 120; k++) {
      g.roundRect(range(rng, 0, len - 140), range(rng, WATER_TOP + 12, WATER_TOP + 200), range(rng, 60, 140), 6, 3).fill({ color: darken(RIVER, 0.12), alpha: 0.5 });
    }
    this.view.addChild(g);
    // Natural rocky banks at both ends, so the river doesn't start at a straight grass edge.
    const banks = new Graphics();
    riverBank(banks, -60, 1);
    riverBank(banks, len + 60, -1);
    // Boulders in two loose rows (far row smaller), each with its own foam.
    let rx = 40;
    let k = 0;
    while (rx < len - 60) {
      const far = k % 2 === 0;
      const w = far ? range(rng, 40, 70) : range(rng, 60, 110);
      const h = w * range(rng, 0.38, 0.55);
      const y = far ? range(rng, WATER_TOP + 16, WATER_TOP + 34) : range(rng, WATER_TOP + 52, WATER_TOP + 100);
      const foam = new Graphics();
      // the pillow on the upstream (left) side and a tail of white water downstream
      foam.ellipse(-w * 0.55, -2, w * 0.28, 7).fill(FOAM);
      foam.ellipse(-w * 0.35, -6, w * 0.22, 6).fill({ color: FOAM, alpha: 0.85 });
      foam.ellipse(w * 0.55, 3, w * 0.35, 5).fill({ color: FOAM, alpha: 0.7 });
      foam.ellipse(w * 0.95, 4, w * 0.25, 3.5).fill({ color: FOAM, alpha: 0.5 });
      foam.position.set(rx, y);
      const rg = new Graphics();
      boulder(rg, rx, y, w, h, k * 1.7 + seed);
      this.view.addChild(foam, rg);
      this.rocks.push({ x: rx, y, w, h, foam, phase: rng() * 6 });
      rx += w + range(rng, 30, 120);
      k++;
    }
    for (let s = 0; s < Math.round(len / 90); s++) {
      const sg = new Graphics().roundRect(0, 0, rand(20, 50), 3, 1.5).fill({ color: FOAM, alpha: 0.8 });
      const st = { g: sg, x: rand(0, len), y: rand(WATER_TOP + 8, WATER_TOP + 160), v: rand(60, 120) };
      sg.position.set(st.x, st.y);
      this.streaks.push(st);
      this.view.addChild(sg);
    }
    this.view.addChild(banks);
    this.hits = [{ x: 0, y: WATER_TOP + 10, w: len, h: 220 }];
    this.extent = [-400, len + 400];
  }

  /** The highest boulders, for herons to stand on. */
  rockTops(): { x: number; y: number }[] {
    return this.rocks.map((r) => ({ x: this.x + r.x, y: r.y - r.h * 0.9 }));
  }

  onTap(wx: number): void {
    const lx = wx - this.view.x;
    let best = this.rocks[0];
    for (const r of this.rocks) if (Math.abs(r.x - lx) < Math.abs(best.x - lx)) best = r;
    this.boost = 1.2;
    this.ctx.sfx.splash(1.3);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x + best.x - best.w * 0.5, y: best.y - 4, count: 22, shape: 'drop', tint: [FOAM, RIVER, P.white],
      speed: [180, 420], angle: [-2.5, -0.6], gravity: 900, life: [0.5, 0.9], size: [7, 12], spin: 0, rotate: false,
    });
    this.ctx.tweens.wobble(best.foam, 0, 0.6, 0.3);
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    const sp = 1 + this.boost * 2;
    for (const r of this.rocks) {
      const s = 1 + 0.12 * Math.sin(this.t * 5 + r.phase) + this.boost * 0.25;
      r.foam.scale.set(s, 1 + 0.2 * Math.sin(this.t * 7 + r.phase));
      r.foam.alpha = 0.8 + 0.2 * Math.sin(this.t * 3 + r.phase);
    }
    for (const s of this.streaks) {
      s.x += s.v * sp * dt;
      if (s.x > this.len) s.x = 0;
      s.g.position.set(s.x, s.y + Math.sin(this.t * 3 + s.y) * 1.5);
      s.g.alpha = Math.min(1, s.x / 80, (this.len - s.x) / 80);
    }
  }
}

// ---------- Great blue heron on a rock (tap: wings spread, a croak) ----------
export class Heron extends Prop {
  private bird = new Container();
  private neck = new Container();
  private wings: Graphics[] = [];
  private busy = false;
  private t = rand(0, 6);

  constructor(ctx: Ctx, x: number, y: number, dir: 1 | -1 = 1) {
    super(ctx, x, y);
    this.layer = 'front';
    const blue = 0x8a9db3, dark = 0x6e8299;
    const legs = new Graphics();
    legs.roundRect(-5, -34, 3, 34, 1.5).fill(0xc9a24a);
    legs.roundRect(3, -34, 3, 34, 1.5).fill(0xc9a24a);
    this.bird.addChild(legs);
    for (const s of [-1, 1]) {
      const w = new Graphics();
      w.moveTo(0, 0).quadraticCurveTo(-30, -6, -46, 6).quadraticCurveTo(-24, 14, 0, 10).closePath().fill(s < 0 ? dark : blue);
      w.position.set(4, -54);
      w.alpha = s < 0 ? 0 : 1;
      this.wings.push(w);
    }
    const body = new Graphics();
    body.ellipse(0, -52, 22, 13).fill(blue);
    body.poly([-18, -52, -36, -42, -16, -44]).fill(dark);
    body.ellipse(-4, -56, 10, 4).fill({ color: P.white, alpha: 0.25 });
    this.bird.addChild(this.wings[0], body, this.wings[1]);
    // the S-curved neck and head with its long yellow bill
    const n = new Graphics();
    n.moveTo(-5, 0).quadraticCurveTo(-10, -18, 0, -30).quadraticCurveTo(10, -40, 2, -50).lineTo(10, -50)
      .quadraticCurveTo(18, -40, 8, -28).quadraticCurveTo(0, -16, 6, 0).closePath().fill(0xe9eef3);
    n.ellipse(6, -54, 9, 7).fill(0xe9eef3);
    n.roundRect(-2, -60, 16, 4, 2).fill(0x2d3540);
    n.poly([12, -56, 34, -53, 12, -51]).fill(0xe8b54a);
    n.circle(8, -56, 1.8).fill(0x24262a);
    this.neck.addChild(n);
    this.neck.position.set(12, -60);
    this.neck.pivot.set(0, 0);
    this.bird.addChild(this.neck);
    this.bird.scale.x = dir;
    const sh = new Graphics();
    contactShadow(sh, 0, 0, 30, 0.12);
    this.view.addChild(sh, this.bird);
    this.hits = [{ x: -40, y: -130, w: 80, h: 130 }];
    this.extent = [-400, 400];
  }

  hintTarget(): Container {
    return this.bird;
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    // a deep "frahnk" croak
    this.ctx.sfx.s.tone({ freq: 210, to: 150, dur: 0.28, type: 'sawtooth', gain: 0.08, filter: 700, q: 4 });
    this.ctx.sfx.s.noise({ dur: 0.2, gain: 0.05, type: 'bandpass', freq: 500 });
    this.wings.forEach((w, k) => {
      this.ctx.tweens.add(1.1, (p) => {
        if (w.destroyed) return;
        w.alpha = 1;
        w.rotation = -Math.abs(Math.sin(p * Math.PI * 3)) * (0.7 + k * 0.4);
        w.scale.set(1 + Math.sin(p * Math.PI) * 0.5);
      }, { done: () => !w.destroyed && ((w.rotation = 0), w.scale.set(1), (w.alpha = k === 0 ? 0 : 1)) });
    });
    const b = this.bird;
    this.ctx.tweens.add(0.7, (p) => !b.destroyed && (b.y = -Math.sin(p * Math.PI) * 26), { ease: ease.inOutSine, delay: 0.15, done: () => (this.busy = false) });
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 60, count: 4, shape: 'feather', tint: [0xe9eef3, 0x8a9db3], speed: [40, 120], gravity: 60, drag: 1.2, life: [0.9, 1.4], size: [8, 12], spin: 2 });
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.busy) this.neck.rotation = Math.sin(this.t * 0.7) * 0.08 + (Math.sin(this.t * 0.23) > 0.92 ? 0.35 : 0);
  }
}

// ---------- A kayaker riding the rapids downstream (tap: splash, paddle spin, a whoop) ----------
export class Kayaker extends Prop {
  private boat = new Container();
  private paddle = new Container();
  private t = rand(0, 10);
  private pos: number;
  private spin = 0;

  constructor(ctx: Ctx, x: number, private range: number, private yy = WATER_TOP + 72, color = 0xe5483f) {
    super(ctx, x, 0);
    this.layer = 'front';
    this.pos = rand(0, range);
    const g = new Graphics();
    g.moveTo(-46, -4).quadraticCurveTo(0, 8, 46, -4).quadraticCurveTo(30, -12, 0, -11).quadraticCurveTo(-30, -12, -46, -4).closePath().fill(color);
    g.ellipse(0, -10, 14, 4).fill(darken(color, 0.3));
    g.roundRect(-30, -9, 60, 2, 1).fill({ color: P.white, alpha: 0.4 });
    // the paddler: life vest, helmet, a happy face
    g.roundRect(-8, -32, 16, 22, 6).fill(0xffc94a);
    g.circle(0, -40, 8).fill(SKIN[1]);
    g.moveTo(-8, -42).quadraticCurveTo(0, -54, 8, -42).closePath().fill(0x2f80d1);
    g.circle(3, -40, 1.3).fill(0x2a2a2a);
    g.moveTo(-1, -36).quadraticCurveTo(3, -33, 6, -36).stroke({ width: 1.4, color: 0x6a3b2e, cap: 'round' });
    this.boat.addChild(g);
    const pg = new Graphics();
    pg.roundRect(-34, -1.5, 68, 3, 1.5).fill(0x3b4148);
    pg.ellipse(-36, 0, 7, 4).fill(0xffc94a);
    pg.ellipse(36, 0, 7, 4).fill(0xffc94a);
    this.paddle.addChild(pg);
    this.paddle.position.set(0, -24);
    this.boat.addChild(this.paddle);
    const wake = new Graphics();
    wake.ellipse(-50, 0, 20, 3).fill({ color: FOAM, alpha: 0.7 });
    wake.ellipse(52, -1, 12, 2.5).fill({ color: FOAM, alpha: 0.6 });
    this.view.addChild(wake, this.boat);
    this.hits = [{ x: -60, y: -60, w: 120, h: 70 }];
    this.extent = [-600, range + 600];
    this.place();
  }

  hintTarget(): Container {
    return this.boat;
  }

  private place(): void {
    this.view.position.set(this.x + this.pos, this.yy + Math.sin(this.t * 2.2) * 3);
    this.view.alpha = Math.max(0, Math.min(1, this.pos / 120, (this.range - this.pos) / 120));
  }

  hitTest(wx: number, wy: number, pad = 18): boolean {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    return lx > -60 - pad && lx < 60 + pad && ly > -60 - pad && ly < 10 + pad;
  }

  onTap(): void {
    this.spin = 1;
    this.ctx.sfx.splash(0.8);
    this.ctx.sfx.giggle();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.view.x, y: this.view.y - 6, count: 14, shape: 'drop', tint: [FOAM, RIVER], speed: [140, 320], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.8], size: [6, 10], rotate: false });
    this.ctx.tweens.wobble(this.boat, 0.2, 0.7, 0.1);
  }

  update(dt: number): void {
    this.t += dt;
    this.pos += dt * 70;
    if (this.pos > this.range) this.pos = 0;
    this.spin = Math.max(0, this.spin - dt);
    // paddling strokes, plus a fast twirl after a tap
    this.paddle.rotation = Math.sin(this.t * 4) * 0.5 + this.spin * Math.PI * 6;
    this.boat.rotation = Math.sin(this.t * 2.7) * 0.05;
    this.place();
  }
}

// ---------- Two friends floating down on inner tubes (tap: splash, a spin and giggles) ----------
export class TubeFloaters extends Prop {
  private tubes: Container[] = [];
  private t = rand(0, 10);
  private pos: number;
  private spin = 0;

  constructor(ctx: Ctx, x: number, private range: number, private yy = WATER_TOP + 40) {
    super(ctx, x, 0);
    this.layer = 'front';
    this.pos = rand(0, range);
    const looks: [number, number, number][] = [[0xff8fb1, SKIN[0], 0x6b4a2b], [0x7fd8c0, SKIN[2], 0x1f1a17]];
    looks.forEach(([tube, skin, hair], i) => {
      const c = new Container();
      const g = new Graphics();
      g.ellipse(0, 0, 26, 9).fill(tube);
      g.ellipse(0, -2, 13, 4).fill(darken(RIVER, 0.15));
      g.ellipse(-12, -4, 7, 2).fill({ color: P.white, alpha: 0.45 });
      // the rider sits in the hole: arms out, smiling
      g.roundRect(-7, -22, 14, 18, 6).fill(i ? 0xf7c934 : 0x3f7fd1);
      g.circle(0, -29, 8).fill(skin);
      g.moveTo(-8, -31).quadraticCurveTo(0, -41, 8, -31).closePath().fill(hair);
      g.circle(-3, -29, 1.3).fill(0x2a2a2a);
      g.circle(3, -29, 1.3).fill(0x2a2a2a);
      g.moveTo(-3, -25).quadraticCurveTo(0, -22, 3, -25).stroke({ width: 1.3, color: 0x6a3b2e, cap: 'round' });
      g.roundRect(-20, -14, 13, 3, 1.5).fill(skin);
      g.roundRect(7, -14, 13, 3, 1.5).fill(skin);
      c.addChild(g);
      c.position.set(i * 62, i * 10);
      this.tubes.push(c);
      this.view.addChild(c);
    });
    this.hits = [{ x: -40, y: -50, w: 140, h: 70 }];
    this.extent = [-600, range + 600];
  }

  hintTarget(): Container {
    return this.tubes[0];
  }

  hitTest(wx: number, wy: number, pad = 18): boolean {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    return lx > -40 - pad && lx < 100 + pad && ly > -50 - pad && ly < 20 + pad;
  }

  onTap(): void {
    this.spin = 1.2;
    this.ctx.sfx.splash(0.7);
    this.ctx.sfx.giggle();
    this.tubes.forEach((c) => this.ctx.tweens.wobble(c, 0.25, 0.9, 0.1));
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.view.x + 30, y: this.view.y - 4, count: 12, shape: 'drop', tint: [FOAM, RIVER], speed: [120, 280], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.8], size: [6, 10], rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.pos += dt * 40;
    if (this.pos > this.range) this.pos = 0;
    this.spin = Math.max(0, this.spin - dt);
    this.view.position.set(this.x + this.pos, this.yy);
    this.view.alpha = Math.max(0, Math.min(1, this.pos / 120, (this.range - this.pos) / 120));
    this.tubes.forEach((c, i) => {
      c.y = i * 10 + Math.sin(this.t * 2 + i * 1.7) * 3;
      c.scale.x = this.spin > 0 ? Math.cos(this.spin * Math.PI * 4 + i) : 1;
    });
  }
}

// ---------- The Belle Isle footbridge: a little suspension walkway hanging under the I-95 deck ----------
export class BelleIsleBridge extends Prop {
  private deck = new Container();
  private walkers: { c: Container; s: number; v: number }[] = [];
  private sway = 0;
  private t = 0;
  private readonly deckY: number;

  /** `deckY`: walkway height (world y); it hangs between the river and our road's underside. */
  constructor(ctx: Ctx, x: number, private len: number, deckY = -6) {
    super(ctx, x, 0);
    this.layer = 'back';
    this.deckY = deckY;
    const g = new Graphics();
    // concrete piers at each end, standing in the river
    for (const px of [0, len]) {
      g.roundRect(px - 16, deckY - 20, 32, WATER_TOP - deckY + 26, 6).fill(0xc9ccd1);
      g.rect(px + 16 - 9, deckY - 20, 9, WATER_TOP - deckY + 26).fill({ color: P.black, alpha: 0.08 });
    }
    this.view.addChild(g);
    // the walkway hangs from the underside of the highway above on pairs of slanted cables
    // (like the real one under the Lee Bridge); it sways when tapped
    const d = new Graphics();
    for (let hx = 36; hx < len - 20; hx += 72) {
      const under = -roadHeight(this.x + hx) + ROAD_NEAR + 16 - deckY;
      if (under > -12) continue;
      d.moveTo(hx - 24, under).lineTo(hx, 0).lineTo(hx + 24, under).stroke({ width: 2, color: 0x5c6670 });
    }
    d.roundRect(0, 0, len, 8, 3).fill(0xb7bcc3);
    d.roundRect(0, 6, len, 4, 2).fill(0x8e959d);
    d.roundRect(0, -16, len, 2.5, 1.25).fill(0x5c6670);
    for (let px = 16; px < len; px += 32) d.rect(px, -16, 1.5, 16).fill(0x5c6670);
    this.deck.addChild(d);
    this.deck.position.set(0, deckY);
    this.view.addChild(this.deck);
    // a few people out for a walk to the island
    const shirts = [0xe9637a, 0x3f7fd1, 0x7fbf6a, 0xf7c934];
    for (let k = 0; k < 4; k++) {
      const c = new Container();
      const p = new Graphics();
      p.roundRect(-3, -10, 2.5, 10, 1).fill(0x3b4a5c);
      p.roundRect(0.5, -10, 2.5, 10, 1).fill(0x3b4a5c);
      p.roundRect(-4.5, -21, 9, 12, 4).fill(shirts[k]);
      p.circle(0, -25, 4.2).fill(SKIN[k % SKIN.length]);
      c.addChild(p);
      const s = (k + 0.3) / 4 * len;
      c.position.set(s, 0);
      this.walkers.push({ c, s, v: (k % 2 ? -1 : 1) * rand(14, 22) });
      this.deck.addChild(c);
    }
    this.hits = [{ x: 0, y: deckY - 60, w: len, h: 80 }];
    this.extent = [-300, len + 300];
  }

  hintTarget(): Container {
    return this.deck;
  }

  onTap(): void {
    this.sway = 1;
    // a little bouncy plucked run across the walkway, and everyone waves (hops)
    [0, 2, 4, 7, 9].forEach((st, i) => this.ctx.tweens.after(i * 0.07, () => this.ctx.sfx.pluck(st + 3, 0.1)));
    this.walkers.forEach((w, i) => this.ctx.tweens.add(0.4, (p) => !w.c.destroyed && (w.c.y = -Math.sin(p * Math.PI) * 8), { delay: i * 0.08 }));
  }

  update(dt: number): void {
    this.t += dt;
    this.sway = Math.max(0, this.sway - dt * 0.6);
    this.deck.y = this.deckY + Math.sin(this.t * 9) * 5 * this.sway;
    this.deck.rotation = Math.sin(this.t * 6) * 0.004 * this.sway;
    for (const w of this.walkers) {
      w.s += w.v * dt;
      if (w.s < 20 || w.s > this.len - 20) w.v = -w.v;
      w.s = Math.max(20, Math.min(this.len - 20, w.s));
      w.c.x = w.s;
      w.c.scale.x = w.v < 0 ? -1 : 1;
      w.c.children[0].y = -Math.abs(Math.sin(this.t * 8 + w.s)) * 1.5;
    }
  }
}

// ---------- The Canal Walk: brick-edged canal on the near side, with a flood wall at its start ----------
export const CANAL_TOP = 66;

export class CanalWalk extends Prop {
  private glints: Graphics[] = [];
  private t = 0;

  constructor(ctx: Ctx, x: number, private len: number) {
    super(ctx, x, 0);
    this.layer = 'front';
    const brick = 0xb8735a, brickDark = 0x9c5f49;
    const g = new Graphics();
    const bottom = 250;
    // the brick towpath between the road and the canal
    g.roundRect(0, 34, len, CANAL_TOP - 30, 8).fill(0xd8b89e);
    for (let px = 20; px < len; px += 26) g.rect(px, 38, 1.5, CANAL_TOP - 38).fill({ color: P.black, alpha: 0.06 });
    // the canal: water between two brick walls
    g.roundRect(0, CANAL_TOP, len, bottom - CANAL_TOP, 10).fill(brick);
    g.roundRect(14, CANAL_TOP + 14, len - 28, 120, 8).fill(RIVER);
    g.roundRect(14, CANAL_TOP + 70, len - 28, 64, 8).fill(darken(RIVER, 0.12));
    g.roundRect(0, CANAL_TOP, len, 8, 4).fill(0xcfa489);
    // brick courses on the far wall face
    for (let row = 0; row < 2; row++) for (let px = 6 + row * 13; px < len - 10; px += 26) g.roundRect(px, CANAL_TOP + 2 + row * 6, 20, 3, 1).fill({ color: brickDark, alpha: 0.5 });
    // the near wall and a black iron rail along the towpath
    g.roundRect(0, CANAL_TOP + 134, len, bottom - CANAL_TOP - 134, 6).fill(brickDark);
    g.roundRect(0, CANAL_TOP - 22, len, 3, 1.5).fill(0x2b2f33);
    for (let px = 12; px < len; px += 40) g.roundRect(px, CANAL_TOP - 22, 2.5, 22, 1).fill(0x2b2f33);
    // the flood wall at the start: a tall concrete wall with high-water marks
    // (it starts below the road's near edge, so it never covers the asphalt)
    g.roundRect(-140, 36, 150, bottom - 36, 6).fill(0xd6d2c8);
    g.rect(-140 + 150 * 0.72, 36, 150 * 0.28, bottom - 36).fill({ color: P.black, alpha: 0.07 });
    g.roundRect(-140, 32, 150, 10, 4).fill(0xe8e4da);
    for (const [hy, c] of [[70, 0x3f7fd1], [110, 0x2fa3a0], [150, 0xe8913a]] as const) {
      g.roundRect(-128, hy, 120, 3, 1.5).fill(c);
      g.circle(-120, hy + 1.5, 4).fill(c);
    }
    this.view.addChild(g);
    for (let k = 0; k < Math.floor(len / 200); k++) {
      const s = new Graphics().roundRect(0, 0, rand(24, 50), 3, 1.5).fill({ color: P.white, alpha: 0.6 });
      s.position.set(k * 200 + rand(40, 150), CANAL_TOP + rand(24, 120));
      this.glints.push(s);
      this.view.addChild(s);
    }
    this.hits = [{ x: -140, y: CANAL_TOP, w: len + 140, h: 150 }];
    this.extent = [-400, len + 300];
  }

  onTap(wx: number, wy: number): void {
    this.ctx.sfx.plip();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: wx, y: Math.max(wy, this.y + CANAL_TOP + 20), count: 8, shape: 'drop', tint: [RIVER, P.white], speed: [80, 200], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.7], size: [6, 10], rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.glints.forEach((s, k) => {
      s.x += dt * 8;
      if (s.x > this.len - 70) s.x = 30;
      s.alpha = 0.4 + 0.4 * Math.sin(this.t * 1.4 + k);
    });
  }
}

/** The Canal Walk tour boat: a long flat boat with a striped canopy (tap: horn, everyone waves). */
export class CanalBoat extends Prop {
  private boat = new Container();
  private t = rand(0, 10);
  private pos = 0;
  private dir = 1;
  private riders: Container[] = [];

  constructor(ctx: Ctx, x: number, private range: number) {
    super(ctx, x, CANAL_TOP + 76);
    this.layer = 'front';
    const g = new Graphics();
    const L = 220;
    // hull
    cornerRect(g, -L / 2, -18, L, 22, 4, 4, 14, 14).fill(0x2f5f8a);
    g.roundRect(-L / 2, -20, L, 6, 3).fill(0xf2ede0);
    g.roundRect(-L / 2 + 6, -4, L - 12, 3, 1.5).fill({ color: P.white, alpha: 0.3 });
    // canopy on posts
    for (const px of [-90, -30, 30, 90]) g.roundRect(px - 2, -62, 4, 44, 2).fill(0xf2ede0);
    for (let k = 0; k < 8; k++) g.roundRect(-L / 2 + 6 + k * ((L - 12) / 8), -70, (L - 12) / 8 + 0.5, 12, k === 0 ? 5 : 0).fill(k % 2 ? 0xf2ede0 : 0x2fa3a0);
    g.roundRect(-L / 2 + 6, -72, L - 12, 4, 2).fill(0x2a8f8b);
    this.boat.addChild(g);
    const shirts = [0xe9637a, 0xf7c934, 0x3f7fd1, 0x7fbf6a, 0xc5a3ff];
    for (let k = 0; k < 5; k++) {
      const c = new Container();
      const p = new Graphics();
      p.roundRect(-6, -18, 12, 14, 5).fill(shirts[k]);
      p.circle(0, -23, 6).fill(SKIN[k % SKIN.length]);
      c.addChild(p);
      c.position.set(-80 + k * 40, -16);
      this.riders.push(c);
      this.boat.addChild(c);
    }
    // a captain at the stern tiller
    const cap = new Graphics();
    cap.roundRect(-L / 2 + 4, -40, 12, 20, 5).fill(0xffffff);
    cap.circle(-L / 2 + 10, -46, 6).fill(SKIN[3]);
    cap.roundRect(-L / 2 + 2, -54, 16, 5, 2).fill(0x2b2f33);
    this.boat.addChild(cap);
    this.view.addChild(this.boat);
    this.hits = [{ x: -120, y: -80, w: 240, h: 90 }];
    this.extent = [-600, range + 600];
  }

  hintTarget(): Container {
    return this.boat;
  }

  hitTest(wx: number, wy: number, pad = 18): boolean {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    return lx > -120 - pad && lx < 120 + pad && ly > -80 - pad && ly < 10 + pad;
  }

  onTap(): void {
    // a cheerful two-note boat horn
    for (const [f, d] of [[392, 0], [494, 0.22]] as const) {
      this.ctx.sfx.s.tone({ freq: f, dur: 0.24, hold: 0.18, type: 'sawtooth', gain: 0.06, delay: d, filter: 1100, q: 2 });
    }
    this.riders.forEach((r, i) => this.ctx.tweens.add(0.4, (p) => !r.destroyed && (r.y = -16 - Math.sin(p * Math.PI) * 8), { delay: i * 0.06 }));
    this.ctx.tweens.wobble(this.boat, 0.04, 0.8, 0.04);
  }

  update(dt: number): void {
    this.t += dt;
    this.pos += this.dir * dt * 30;
    if (this.pos > this.range) {
      this.pos = this.range;
      this.dir = -1;
    } else if (this.pos < 0) {
      this.pos = 0;
      this.dir = 1;
    }
    this.boat.scale.x = this.dir;
    this.view.position.set(this.x + this.pos, this.y + Math.sin(this.t * 1.8) * 1.5);
  }
}

