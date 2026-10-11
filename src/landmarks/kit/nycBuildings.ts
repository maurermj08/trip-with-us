// New York's buildings: brownstones with stoops, the Empire State, the Chrysler, the Flatiron,
// and a Times Square block of glowing (parody) signs with the New Year's ball on top.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken, lighten } from '../../style/palette';
import { block, contactShadow, cornerRect, windowGrid } from '../../style/shapes';
import { makeRng, rand } from '../../core/rng';
import { ease } from '../../core/Tween';
import { signText } from '../../signs/Signs';
import { WALK } from './common';

/**
 * Draw a landmark at true proportions, then shrink it so its crown stays on screen from the
 * road (the camera shows about 540 units above the street). Hits are scaled to match.
 */
function fitToView(p: Prop, s: number): void {
  const inner = new Container();
  inner.addChild(...p.view.removeChildren());
  inner.scale.set(s);
  p.view.addChild(inner);
  p.hits = p.hits.map((h) => ({ x: h.x * s, y: h.y * s, w: h.w * s, h: h.h * s }));
}

const LIGHT_SHOWS: number[][] = [
  [0xffffff, 0xffffff, 0xffffff],
  [0xe5483f, 0xffffff, 0x2f6fd1],
  [0xff8fb1, 0xff8fb1, 0xffffff],
  [0x7fe0a8, 0x7fe0a8, 0xfff1a8],
  [0xffd166, 0xff9f1c, 0xffd166],
  [0xb59cff, 0x7fd1ff, 0xff8fb1],
];

// ---------- Brownstone with a stoop ----------
export const BROWNSTONES = [0x9c6a52, 0x8a5c48, 0xa77860, 0xb08468, 0x93604d];

export class Brownstone extends Prop {
  private panes: Graphics[] = [];
  private lit = false;
  constructor(ctx: Ctx, x: number, public w: number, color: number, private note: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.view.zIndex = 1;
    const h = 250 + (note % 3) * 22;
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w);
    block(g, 0, -h, w, h, color, { landmark: true, shade: darken(color, 0.1) });
    // cornice with brackets
    g.roundRect(-6, -h - 8, w + 12, 16, 4).fill(darken(color, 0.25));
    for (let bx = 8; bx < w; bx += 26) g.roundRect(bx, -h + 8, 8, 10, 2).fill(darken(color, 0.25));
    // rusticated ground floor (lighter stone)
    g.roundRect(0, -78, w, 78, 4).fill(lighten(color, 0.12));
    for (let ly = -70; ly < 0; ly += 14) g.rect(0, ly, w, 2).fill({ color: P.black, alpha: 0.06 });
    this.view.addChild(g);
    // windows: tall with stone lintels, 3 floors
    const cols = w > 210 ? [0.18, 0.5, 0.82] : [0.25, 0.75];
    for (const fy of [-h + 30, -h + 30 + 66, -h + 30 + 132].filter((y) => y < -110)) {
      for (const cx of cols) {
        const wx = w * cx - 15;
        const lintel = new Graphics().roundRect(wx - 4, fy - 8, 38, 7, 2).fill(darken(color, 0.25));
        const pane = new Graphics();
        this.drawPane(pane, false);
        pane.position.set(wx, fy);
        this.view.addChild(lintel, pane);
        this.panes.push(pane);
      }
    }
    // the stoop: steps up to a raised door on one side, with iron rails
    const sx = note % 2 ? w * 0.12 : w * 0.58;
    const d = new Graphics();
    d.roundRect(sx + 18, -118, 40, 66, 4).fill(0x4a2f24);
    d.moveTo(sx + 14, -118).arc(sx + 38, -118, 24, Math.PI, 0).closePath().fill(lighten(color, 0.25));
    d.circle(sx + 50, -84, 2.5).fill(0xf2c94c);
    for (let k = 0; k < 6; k++) d.roundRect(sx + 6 - k * 6, -52 + k * 9, 64 + k * 12, 9, 2).fill(k % 2 ? 0xb3a08e : 0xc2ae9a);
    d.moveTo(sx + 4, -60).lineTo(sx - 30, 0).stroke({ width: 3, color: 0x2b2f33, cap: 'round' });
    d.moveTo(sx + 72, -60).lineTo(sx + 104, 0).stroke({ width: 3, color: 0x2b2f33, cap: 'round' });
    // a planter on the landing
    d.roundRect(sx + 62, -66, 16, 14, 3).fill(0x8a5a33);
    d.circle(sx + 70, -70, 9).fill(0x5fae58);
    this.view.addChild(d);
    // fire escape on the wider ones
    if (w > 220) {
      const f = new Graphics();
      const fx = note % 2 ? w * 0.5 : w * 0.08;
      for (const fy of [-h + 96, -h + 162]) {
        f.roundRect(fx, fy, 84, 4, 2).fill(0x2b2f33);
        for (let k = 0; k <= 84; k += 12) f.rect(fx + k, fy - 18, 2, 18).fill(0x2b2f33);
        f.roundRect(fx, fy - 20, 84, 3, 1.5).fill(0x2b2f33);
      }
      f.moveTo(fx + 10, -h + 96).lineTo(fx + 70, -h + 162 - 20).stroke({ width: 3, color: 0x2b2f33 });
      this.view.addChild(f);
    }
    this.hits = [{ x: 0, y: -h - 10, w, h: h + 10 }];
    this.extent = [-200, w + 200];
  }

  private drawPane(g: Graphics, lit: boolean): void {
    g.clear();
    g.roundRect(0, 0, 30, 46, 3).fill(lit ? P.warmWindow : 0xbcd6e6);
    g.rect(14, 0, 2, 46).fill(P.white);
    g.rect(0, 20, 30, 2).fill(P.white);
    if (!lit) g.poly([3, 2, 9, 2, 3, 12]).fill({ color: P.white, alpha: 0.5 });
  }

  onTap(): void {
    this.ctx.sfx.pluck(this.note - 3, 0.18);
    this.lit = !this.lit;
    this.panes.forEach((p, i) => this.ctx.tweens.after(i * 0.04, () => !p.destroyed && this.drawPane(p, this.lit)));
    this.ctx.tweens.wobble(this.view, 0.008, 0.5, 0.02);
  }
}

// ---------- Empire State Building ----------
const EMPIRE_SCALE = 0.74;
const CHRYSLER_SCALE = 0.72;
export class EmpireState extends Prop {
  private crown = new Graphics();
  private body = new Container();
  private show = 1;
  private t = 0;
  private flash = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const stone = 0xd3c4a6, shade = 0xbba98a;
    const g = new Graphics();
    contactShadow(g, 0, 0, 360);
    const rng = makeRng(1931);
    // Setbacks: a wide base, the long shaft, then the stepped top.
    const tiers: [number, number][] = [[340, 120], [270, 420], [190, 520], [150, 566], [110, 600]];
    let prev = 0;
    for (const [w, top] of tiers) {
      block(g, -w / 2, -top, w, top - prev + 4, stone, { landmark: true, shade, radius: 4 });
      prev = top;
    }
    // vertical piers (the art-deco ribs) and window grids on the shaft
    for (let px = -125; px <= 125; px += 25) g.rect(px - 1.5, -420, 3, 300).fill({ color: lighten(stone, 0.25), alpha: 0.9 });
    windowGrid(g, -128, -414, 240, 288, rng, { scale: 1.1, lit: 0.18 });
    windowGrid(g, -160, -112, 300, 90, rng, { scale: 1.1, lit: 0.25 });
    // the entrance
    g.roundRect(-34, -64, 68, 64, 6).fill(0x3b4148);
    g.roundRect(-30, -60, 60, 26, 4).fill({ color: P.warmWindow, alpha: 0.8 });
    // the mast and needle
    block(g, -34, -660, 68, 64, stone, { landmark: true, shade, radius: 6 });
    g.roundRect(-22, -700, 44, 44, 8).fill(stone);
    g.roundRect(-12, -740, 24, 44, 8).fill(lighten(stone, 0.1));
    g.roundRect(-3, -812, 6, 76, 3).fill(0xb8bec6);
    g.circle(0, -814, 4).fill(0xe5483f);
    this.body.addChild(g);
    // the floodlit crown (tinted per light show)
    this.crown.roundRect(-55, -600, 110, 32, 6).fill(P.white);
    this.crown.roundRect(-34, -650, 68, 50, 6).fill(P.white);
    this.crown.roundRect(-22, -698, 44, 40, 6).fill(P.white);
    this.crown.alpha = 0.55;
    this.body.addChild(this.crown);
    this.view.addChild(this.body);
    this.hits = [{ x: -170, y: -820, w: 340, h: 820 }];
    this.extent = [-600, 600];
    fitToView(this, EMPIRE_SCALE);
  }

  hintTarget(): Container {
    return this.body;
  }

  onTap(): void {
    this.show = (this.show + 1) % LIGHT_SHOWS.length;
    this.flash = 1.2;
    this.ctx.sfx.chime();
    this.ctx.tweens.after(0.3, () => this.ctx.sfx.sparkle());
    this.ctx.tweens.wobble(this.body, 0.004, 0.7, 0.01);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 640 * EMPIRE_SCALE, count: 16, shape: 'star', tint: LIGHT_SHOWS[this.show], speed: [100, 280], gravity: 100, drag: 1, life: [0.8, 1.3], size: [10, 16] });
  }

  update(dt: number): void {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    const cols = LIGHT_SHOWS[this.show];
    this.crown.tint = cols[Math.floor(this.t * 1.5) % cols.length];
    this.crown.alpha = 0.7 + 0.2 * Math.sin(this.t * 2) + this.flash * 0.3;
  }
}

// ---------- Chrysler Building ----------
export class Chrysler extends Prop {
  private crown = new Container();
  private glints: Graphics[] = [];
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const brick = 0xe2ddd3, shade = 0xcdc6b8;
    const g = new Graphics();
    contactShadow(g, 0, 0, 240);
    const rng = makeRng(1930);
    block(g, -110, -200, 220, 200, brick, { landmark: true, shade, radius: 4 });
    block(g, -80, -470, 160, 274, brick, { landmark: true, shade, radius: 4 });
    windowGrid(g, -100, -190, 200, 180, rng, { scale: 1, lit: 0.2 });
    windowGrid(g, -72, -462, 144, 256, rng, { scale: 1, lit: 0.18 });
    // the steel eagle gargoyles at the corner
    for (const s of [-1, 1]) g.poly([s * 80, -478, s * 104, -470, s * 80, -464]).fill(0xc0c7cf);
    // dark band under the crown
    g.roundRect(-82, -480, 164, 14, 4).fill(0x6d7680);
    this.view.addChild(g);
    // The crown: stacked stainless-steel arches with sunburst windows, then the needle.
    const c = new Graphics();
    const steel = 0xdfe4ea, steelShade = 0xc3cbd3;
    const arches = [[78, -480, 50], [64, -526, 44], [50, -566, 40], [36, -602, 34], [24, -632, 28]];
    for (const [hw, by, ah] of arches) {
      c.moveTo(-hw, by).lineTo(-hw, by - ah * 0.3).quadraticCurveTo(-hw, by - ah, 0, by - ah - 6).quadraticCurveTo(hw, by - ah, hw, by - ah * 0.3).lineTo(hw, by).closePath().fill(steel);
      c.moveTo(hw * 0.3, by - ah - 3).quadraticCurveTo(hw, by - ah, hw, by - ah * 0.3).lineTo(hw, by).lineTo(hw * 0.3, by).closePath().fill(steelShade);
      // triangular sunburst windows along the arch
      for (let k = -2; k <= 2; k++) {
        const a = (k / 3) * 1.1;
        const wx = Math.sin(a) * hw * 0.7, wy = by - ah * 0.55 - Math.cos(a) * ah * 0.25;
        c.poly([wx, wy - 8, wx - 4, wy + 4, wx + 4, wy + 4]).fill(0x5d6a78);
      }
    }
    c.poly([-8, -660, 0, -800, 8, -660]).fill(steel);
    c.poly([0, -800, 8, -660, 2, -660]).fill(steelShade);
    this.crown.addChild(c);
    // glints that run up the crown on tap
    for (let k = 0; k < 5; k++) {
      const gl = new Graphics().circle(0, 0, 5).fill(P.white);
      gl.position.set(0, -500 - k * 34);
      gl.alpha = 0;
      this.glints.push(gl);
      this.crown.addChild(gl);
    }
    this.view.addChild(this.crown);
    this.hits = [{ x: -110, y: -800, w: 220, h: 800 }];
    this.extent = [-500, 500];
    fitToView(this, CHRYSLER_SCALE);
  }

  hintTarget(): Container {
    return this.crown;
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    [0, 2, 4, 7, 9].forEach((st, i) => this.ctx.tweens.after(i * 0.08, () => this.ctx.sfx.pluck(st + 8, 0.12)));
    this.glints.forEach((gl, i) => this.ctx.tweens.add(0.5, (p) => {
      if (gl.destroyed) return;
      gl.alpha = Math.sin(p * Math.PI);
      gl.scale.set(1 + Math.sin(p * Math.PI) * 1.5);
    }, { delay: i * 0.1 }));
    this.ctx.tweens.after(0.6, () => {
      this.busy = false;
      this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 700 * CHRYSLER_SCALE, count: 18, shape: 'star', tint: [P.white, 0xdfe4ea, 0xfff1a8], speed: [80, 260], gravity: 90, drag: 1, life: [0.8, 1.3], size: [8, 14] });
    });
  }
}

// ---------- Flatiron Building ----------
export class Flatiron extends Prop {
  private pigeons: Graphics[] = [];
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const c = 0xe8d4b4, shade = 0xd3bc98;
    const g = new Graphics();
    contactShadow(g, 110, 0, 260);
    const h = 330;
    // the famous prow: a rounded narrow nose on the left widening to the right
    g.moveTo(14, 0).lineTo(14, -h).quadraticCurveTo(0, -h, 0, -h + 14).lineTo(0, -14).quadraticCurveTo(0, 0, 14, 0).closePath().fill(lighten(c, 0.08));
    g.rect(14, -h, 210, h).fill(c);
    g.rect(14 + 210 - 210 * 0.28, -h, 210 * 0.28, h).fill(shade);
    g.roundRect(-6, -h - 14, 236, 18, 6).fill(darken(c, 0.15));
    g.roundRect(-6, -h - 14, 236, 3, 1.5).fill({ color: P.white, alpha: 0.4 });
    for (const by of [-h + 40, -64]) g.rect(0, by, 224, 6).fill(darken(c, 0.12));
    // window bays
    const rng = makeRng(1902);
    windowGrid(g, 24, -h + 52, 190, h - 126, rng, { scale: 1.05, lit: 0.18 });
    for (let k = 0; k < 6; k++) g.roundRect(3, -h + 50 + k * 40, 8, 22, 3).fill({ color: P.windowGlass, alpha: 0.7 });
    // shop awnings at street level
    for (const [ax, col] of [[24, 0x2f6b5a], [124, 0x8a2f3b]] as const) {
      g.roundRect(ax, -52, 90, 16, 6).fill(col);
      g.roundRect(ax + 6, -36, 78, 36, 3).fill({ color: P.warmWindow, alpha: 0.7 });
    }
    this.view.addChild(g);
    for (let k = 0; k < 4; k++) {
      const p = pigeon();
      p.position.set(40 + k * 50, -h - 14);
      this.pigeons.push(p);
      this.view.addChild(p);
    }
    this.hits = [{ x: 0, y: -h - 30, w: 230, h: h + 30 }];
    this.extent = [-300, 500];
  }

  onTap(): void {
    this.ctx.sfx.tweet();
    this.ctx.sfx.bell();
    this.pigeons.forEach((p, i) => {
      const x0 = p.x, y0 = p.y;
      this.ctx.tweens.add(2.4, (t) => {
        if (p.destroyed) return;
        p.x = x0 + Math.sin(t * Math.PI * 2) * 70 + i * 6;
        p.y = y0 - Math.sin(t * Math.PI) * 120;
        p.scale.y = 1 + Math.sin(t * 60) * 0.3;
      }, { delay: i * 0.08, done: () => !p.destroyed && (p.position.set(x0, y0), p.scale.set(1)) });
    });
  }
}

/** A little grey pigeon (birds may have faces). */
export function pigeon(): Graphics {
  const g = new Graphics();
  g.ellipse(0, -7, 10, 7).fill(0x8e96a3);
  g.ellipse(-6, -8, 6, 4).fill(0x7a8290);
  g.circle(7, -13, 5).fill(0x6f7886);
  g.ellipse(6, -9, 3, 2).fill(0x6fbf9f);
  g.poly([11, -14, 15, -12, 11, -11]).fill(0xe0a36b);
  g.circle(8, -14, 1.2).fill(0x111111);
  g.rect(-1, -1, 1.5, 3).fill(0xe08a7a);
  g.rect(3, -1, 1.5, 3).fill(0xe08a7a);
  return g;
}

// ---------- Times Square: a block of glowing parody signs with the ball on top ----------
const TS_SIGNS = [
  { text: 'BROADWAY', bg: 0xd8392b, fg: 0xffd166 },
  { text: 'BIG APPLE', bg: 0x2f6fd1, fg: P.white },
  { text: 'FIZZY POP', bg: 0xe94b3c, fg: P.white },
  { text: 'SHOW TONIGHT', bg: 0x7b5cc4, fg: 0xffd166 },
  { text: 'DONUTS', bg: 0xff8fb1, fg: P.white },
  { text: 'SNEAKS', bg: 0x2aa7a0, fg: P.white },
];

export class TimesSquare extends Prop {
  private boards: Container[] = [];
  private bulbs: Graphics[] = [];
  private ticker = new Container();
  private tickerText: Container;
  private ball = new Container();
  private ballY = 0;
  private t = 0;
  private chase = 0;
  private dropping = false;

  constructor(ctx: Ctx, x: number, private w = 760) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w);
    // three buildings of different heights, wall-to-wall signs
    const blds: [number, number, number][] = [[0, 230, 400], [240, 270, 470], [520, w - 520, 380]];
    for (const [bx, bw, bh] of blds) block(g, bx, -bh, bw, bh, 0x5a6270, { landmark: true, shade: 0x4c5361, radius: 4 });
    this.view.addChild(g);
    // the signs
    const spots: [number, number, number, number][] = [
      [14, -380, 200, 90], [14, -270, 200, 80], [254, -450, 240, 110], [254, -320, 240, 70],
      [534, -360, w - 548, 100], [534, -240, w - 548, 70],
    ];
    spots.forEach(([sx, sy, sw, sh], i) => {
      const def = TS_SIGNS[i % TS_SIGNS.length];
      const c = new Container();
      const b = new Graphics().roundRect(0, 0, sw, sh, 6).fill(def.bg);
      b.roundRect(0, 0, sw, 4, 2).fill({ color: P.white, alpha: 0.4 });
      c.addChild(b);
      const t = signText(def.text, Math.min(sh * 0.42, (sw / def.text.length) * 1.6), def.fg, '900');
      t.position.set(sw / 2, sh / 2);
      c.addChild(t);
      c.position.set(sx, sy);
      this.boards.push(c);
      this.view.addChild(c);
    });
    // marquee bulbs along the bottom of the big signs
    for (let bx = 20; bx < w - 20; bx += 22) {
      const l = new Graphics().circle(0, 0, 4).fill(P.white);
      l.position.set(bx, -150);
      l.tint = 0xfff1a8;
      this.bulbs.push(l);
      this.view.addChild(l);
    }
    // a news ticker with scrolling text
    const tk = new Graphics().roundRect(0, -136, w, 30, 4).fill(0x1d2026);
    this.ticker.addChild(tk);
    this.tickerText = new Container();
    const msg = signText('WELCOME TO NEW YORK  ★  HAVE A GREAT TRIP  ★  WELCOME TO NEW YORK  ★', 18, 0x7fe0a8, '800');
    msg.anchor.set(0, 0.5);
    msg.position.set(0, -121);
    this.tickerText.addChild(msg);
    const mask = new Graphics().roundRect(0, -136, w, 30, 4).fill(0xffffff);
    this.tickerText.mask = mask;
    this.ticker.addChild(this.tickerText, mask);
    this.view.addChild(this.ticker);
    // street level: shop fronts glowing
    const s = new Graphics();
    for (let sx = 10; sx < w - 60; sx += 120) s.roundRect(sx, -96, 100, 96, 4).fill({ color: P.warmWindow, alpha: 0.65 });
    this.view.addChild(s);
    // the New Year's ball on its pole on the middle building
    const pole = new Graphics().roundRect(372, -560, 8, 92, 3).fill(0xb8bec6);
    this.view.addChild(pole);
    const ballG = new Graphics();
    ballG.circle(0, 0, 22).fill(0xdfe4ea);
    for (let k = -2; k <= 2; k++) ballG.rect(-21, k * 8 - 1, 42, 2).fill({ color: 0x9fb4c8, alpha: 0.8 });
    ballG.circle(-8, -8, 6).fill({ color: P.white, alpha: 0.8 });
    this.ball.addChild(ballG);
    this.ballY = -572;
    this.ball.position.set(376, this.ballY);
    this.view.addChild(this.ball);
    this.hits = [{ x: 0, y: -600, w, h: 600 }];
    this.extent = [-400, w + 400];
  }

  hintTarget(): Container {
    return this.ball;
  }

  onTap(wx: number, wy: number): void {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    if (!this.dropping && Math.abs(lx - 376) < 60 && ly < -440) return this.dropBall();
    this.chase = 2.5;
    this.ctx.sfx.fanfare();
    this.boards.forEach((b, i) => this.ctx.tweens.after(i * 0.07, () => this.ctx.tweens.wobble(b, 0.03, 0.5, 0.06)));
  }

  /** The New Year's ball drops down its pole, then: confetti! */
  private dropBall(): void {
    this.dropping = true;
    const s = this.ctx.sfx;
    [0, 1, 2].forEach((k) => this.ctx.tweens.after(k * 0.35, () => s.pluck(4 - k, 0.14)));
    this.ctx.tweens.add(1.1, (p) => !this.ball.destroyed && (this.ball.y = this.ballY + 80 * p), { ease: ease.inOutSine });
    this.ctx.tweens.after(1.15, () => {
      s.firework();
      s.fanfare();
      this.chase = 3;
      this.ctx.fx.emit(this.ctx.layers.fx, { x: this.view.x + 376, y: this.view.y - 480, count: 40, shape: 'confetti', tint: [0xffd166, 0xff8fb1, 0x7fd1ff, 0x7fe0a8, P.white], speed: [120, 380], gravity: 260, drag: 0.8, life: [1.2, 2.0], size: [10, 16], spin: 6 });
    });
    this.ctx.tweens.add(1.4, (p) => !this.ball.destroyed && (this.ball.y = this.ballY + 80 * (1 - p)), { delay: 3.4, done: () => (this.dropping = false) });
  }

  update(dt: number): void {
    this.t += dt;
    this.chase = Math.max(0, this.chase - dt);
    // ticker scrolls (faster during a show)
    const txt = this.tickerText.children[0];
    txt.x -= dt * (this.chase > 0 ? 160 : 60);
    if (txt.x < -620) txt.x = this.w - 20;
    // bulbs chase
    const step = Math.floor(this.t * (this.chase > 0 ? 18 : 5));
    this.bulbs.forEach((b, i) => {
      const on = (i + step) % 3 === 0;
      b.alpha = on ? 1 : 0.35;
      b.tint = this.chase > 0 ? [0xff8fb1, 0xffd166, 0x7fd1ff][(i + step) % 3] : 0xfff1a8;
    });
    // the signs pulse a little, out of step
    this.boards.forEach((b, i) => (b.alpha = 0.88 + 0.12 * Math.sin(this.t * (2 + i * 0.4) + i)));
    // the ball sparkles
    this.ball.rotation = Math.sin(this.t * 2) * 0.05;
    if (Math.random() < dt * 2) this.ctx.fx.emit(this.ctx.layers.fx, { x: this.view.x + 376 + rand(-18, 18), y: this.view.y + this.ball.y + rand(-18, 18), count: 1, shape: 'star', tint: P.white, speed: [0, 20], gravity: 0, life: [0.3, 0.5], size: [6, 9] });
  }
}

/** A plain NYC mid-rise used as filler between landmarks (stone or brick, window grid, water tank). */
export class NycMidRise extends Prop {
  private panes = new Graphics();
  private lit = false;
  constructor(ctx: Ctx, x: number, private w: number, private h: number, color: number, private seed = 1, tank = false) {
    super(ctx, x, WALK - 1);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w);
    block(g, 0, -h, w, h, color);
    g.roundRect(-4, -h - 6, w + 8, 10, 3).fill(darken(color, 0.18));
    g.roundRect(0, -46, w, 46, 3).fill(darken(color, 0.12));
    g.roundRect(10, -40, w - 20, 34, 3).fill({ color: P.warmWindow, alpha: 0.6 });
    if (tank) {
      // the classic wooden rooftop water tank
      g.roundRect(w * 0.6 - 2, -h - 34, 4, 28, 1).fill(0x5a4636);
      g.roundRect(w * 0.6 + 26, -h - 34, 4, 28, 1).fill(0x5a4636);
      g.roundRect(w * 0.6 - 6, -h - 72, 40, 40, 4).fill(0x9a7656);
      for (let k = 1; k < 4; k++) g.rect(w * 0.6 - 6, -h - 72 + k * 10, 40, 2).fill({ color: P.black, alpha: 0.12 });
      g.poly([w * 0.6 - 9, -h - 72, w * 0.6 + 14, -h - 92, w * 0.6 + 37, -h - 72]).fill(0x6e5a48);
    }
    this.view.addChild(g, this.panes);
    this.drawPanes();
    this.hits = [{ x: 0, y: -h, w, h }];
    this.extent = [-200, w + 200];
  }

  private drawPanes(): void {
    this.panes.clear();
    windowGrid(this.panes, 8, -this.h + 12, this.w - 16, this.h - 70, makeRng(this.seed), { scale: 1.05, lit: this.lit ? 0.85 : 0.15 });
  }

  onTap(): void {
    this.lit = !this.lit;
    this.drawPanes();
    this.ctx.sfx.tick();
    this.ctx.tweens.wobble(this.view, 0.006, 0.4, 0.02);
  }
}

/** Rounded rect helper with a right-side shade for small props. */
export function shadedRect(g: Graphics, x: number, y: number, w: number, h: number, r: number, color: number): void {
  g.roundRect(x, y, w, h, r).fill(color);
  cornerRect(g, x + w * 0.72, y, w * 0.28, h, 0, r, r, 0).fill({ color: P.black, alpha: 0.07 });
}
