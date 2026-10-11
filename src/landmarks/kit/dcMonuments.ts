// Washington's monuments along the National Mall: the Lincoln Memorial, the Jefferson Memorial,
// the Washington Monument (the tallest thing in the game) with its ring of flags, the World War II
// Memorial fountain and the U.S. Capitol. Every one answers a tap. No statues of real people.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken, lighten } from '../../style/palette';
import { block, contactShadow, roundedTri } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { rand } from '../../core/rng';
import { WALK } from './common';

export const MARBLE = 0xf4f1ea;
export const MARBLE_SHADE = 0xe0dbcf;
const MARBLE_DARK = 0xcfc8b8;
const INTERIOR = 0x6d7480;
const GOLD = 0xe2b33c;
const WATER = 0x6cc2e6;

/** A row of classical columns between x0 and x1, from y top to y bottom. */
export function columns(g: Graphics, x0: number, x1: number, top: number, bottom: number, n: number, cw: number, color = MARBLE): void {
  for (let k = 0; k < n; k++) {
    const cx = x0 + ((x1 - x0) * (k + 0.5)) / n;
    g.roundRect(cx - cw / 2, top + 6, cw, bottom - top - 12, cw * 0.3).fill(color);
    g.rect(cx + cw / 2 - cw * 0.3, top + 8, cw * 0.3, bottom - top - 16).fill({ color: P.black, alpha: 0.06 });
    g.roundRect(cx - cw * 0.7, top, cw * 1.4, 8, 3).fill(color);
    g.roundRect(cx - cw * 0.7, bottom - 8, cw * 1.4, 8, 3).fill(color);
  }
}

/** Stacked marble steps, widest at the bottom; returns the top step's y. */
export function steps(g: Graphics, cx: number, w: number, n: number, rise: number, inset: number, color = MARBLE): number {
  for (let k = 0; k < n; k++) {
    const ww = w - k * inset * 2;
    g.roundRect(cx - ww / 2, -rise * (k + 1), ww, rise, 2).fill(k % 2 ? color : darken(color, 0.03));
    g.rect(cx - ww / 2, -rise * (k + 1), ww, 1.5).fill({ color: P.white, alpha: 0.6 });
  }
  return -rise * n;
}

// ---------- The Lincoln Memorial ----------
export class LincolnMemorial extends Prop {
  private stepGlow: Graphics[] = [];
  private glow = new Graphics();
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    const W = 560;
    contactShadow(g, 0, 0, 680);
    // the broad flight of steps up from the Mall
    const nSteps = 7;
    for (let k = 0; k < nSteps; k++) {
      const ww = 640 - k * 16;
      const s = new Graphics().roundRect(-ww / 2, -9 * (k + 1), ww, 9, 2).fill(k % 2 ? MARBLE : MARBLE_SHADE);
      s.rect(-ww / 2, -9 * (k + 1), ww, 1.5).fill({ color: P.white, alpha: 0.6 });
      this.stepGlow.push(s);
      this.view.addChild(s);
    }
    const base = -9 * nSteps;
    // platform, the dark hall behind the colonnade (with a warm glow) and the colonnade itself
    block(g, -W / 2, base - 26, W, 26, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 3 });
    const top = base - 26 - 200;
    g.rect(-W / 2 + 20, top + 20, W - 40, 190).fill(INTERIOR);
    this.view.addChild(g);
    this.glow.ellipse(0, top + 120, 90, 80).fill({ color: 0xffe1a6, alpha: 0.5 });
    this.glow.ellipse(0, top + 130, 50, 60).fill({ color: 0xfff1c8, alpha: 0.6 });
    this.view.addChild(this.glow);
    const c = new Graphics();
    columns(c, -W / 2 + 4, W / 2 - 4, top, base - 26, 12, 22);
    // entablature with the frieze of wreaths, then the attic with its garlands
    block(c, -W / 2 - 6, top - 34, W + 12, 34, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 3 });
    for (let k = 0; k < 18; k++) c.circle(-W / 2 + 22 + k * ((W - 44) / 17), top - 17, 5).stroke({ width: 2, color: MARBLE_DARK });
    block(c, -W / 2 + 26, top - 74, W - 52, 40, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 3 });
    for (let k = 0; k < 8; k++) {
      const gx = -W / 2 + 60 + k * ((W - 120) / 7);
      c.moveTo(gx - 22, top - 62).quadraticCurveTo(gx, top - 46, gx + 22, top - 62).stroke({ width: 3, color: MARBLE_DARK, cap: 'round' });
    }
    c.roundRect(-W / 2 + 20, top - 78, W - 40, 6, 3).fill(lighten(MARBLE, 0.4));
    this.view.addChild(c);
    this.hits = [{ x: -320, y: top - 80, w: 640, h: -top + 80 }];
    this.extent = [-700, 700];
  }

  hintTarget(): Container {
    return this.glow;
  }

  onTap(): void {
    this.ctx.sfx.bell();
    this.ctx.tweens.add(1.2, (p) => !this.glow.destroyed && (this.glow.alpha = 1 + Math.sin(p * Math.PI) * 0.8, this.glow.scale.set(1 + Math.sin(p * Math.PI) * 0.15)));
    if (this.busy) return;
    this.busy = true;
    // the steps light up one after another, bottom to top
    this.stepGlow.forEach((s, k) => {
      this.ctx.tweens.add(0.5, (p) => !s.destroyed && (s.tint = Math.sin(p * Math.PI) > 0.2 ? 0xfff1c8 : 0xffffff), { delay: k * 0.08 });
    });
    this.ctx.tweens.after(1.2, () => (this.busy = false));
  }
}

// ---------- The Jefferson Memorial (round, domed, on the Tidal Basin) ----------
export class JeffersonMemorial extends Prop {
  private dome = new Container();
  private shine = new Graphics();

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 460);
    const base = steps(g, 0, 440, 5, 8, 10);
    // the round colonnade (seen from the side: a wide drum ringed with columns)
    block(g, -180, base - 18, 360, 18, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 3 });
    const top = base - 18 - 150;
    g.rect(-168, top + 16, 336, 140).fill(INTERIOR);
    columns(g, -176, 176, top, base - 18, 10, 18);
    block(g, -188, top - 22, 376, 22, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 3 });
    // the portico in front, with its pediment
    columns(g, -90, 90, top - 4, base - 18, 4, 24);
    block(g, -104, top - 30, 208, 28, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 3 });
    roundedTri(g, 0, top - 92, 240, 64, 4).fill(MARBLE);
    g.poly([0, top - 92, 120, top - 28, 70, top - 28]).fill(MARBLE_SHADE);
    this.view.addChild(g);
    // the low dome
    const d = new Graphics();
    d.moveTo(-170, 0).quadraticCurveTo(-160, -130, 0, -132).quadraticCurveTo(160, -130, 170, 0).closePath().fill(MARBLE);
    d.moveTo(40, -130).quadraticCurveTo(160, -128, 170, 0).lineTo(80, 0).quadraticCurveTo(90, -80, 40, -130).fill(MARBLE_SHADE);
    d.roundRect(-176, -6, 352, 10, 5).fill(MARBLE_DARK);
    d.ellipse(-70, -80, 22, 40).fill({ color: P.white, alpha: 0.35 });
    this.dome.addChild(d);
    this.dome.position.set(0, top - 20);
    this.view.addChild(this.dome);
    this.shine.ellipse(0, 0, 14, 60).fill({ color: P.white, alpha: 0.7 });
    this.shine.position.set(-120, top - 80);
    this.shine.alpha = 0;
    this.view.addChild(this.shine);
    this.hits = [{ x: -200, y: top - 160, w: 400, h: -top + 160 }];
    this.extent = [-600, 600];
  }

  hintTarget(): Container {
    return this.dome;
  }

  onTap(): void {
    this.ctx.sfx.chime();
    this.ctx.tweens.wobble(this.dome, 0.015, 0.7, 0.03);
    const sh = this.shine;
    this.ctx.tweens.add(0.8, (p) => {
      if (sh.destroyed) return;
      sh.x = -120 + 240 * p;
      sh.alpha = Math.sin(p * Math.PI);
    });
  }
}

// ---------- The Washington Monument and its ring of flags ----------
export class WashingtonMonument extends Prop {
  private lights: Graphics[] = [];
  private flags: Graphics[] = [];
  private shaft = new Container();
  private t = 0;
  private flutter = 0;
  private blink = 0;
  static readonly H = 880;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const H = WashingtonMonument.H;
    const g = new Graphics();
    // the grassy knoll
    g.ellipse(0, 0, 330, 34).fill(0x8cc46c);
    g.ellipse(0, -6, 300, 26).fill(0x9ed27c);
    contactShadow(g, 0, -10, 200);
    this.view.addChild(g);
    // the obelisk (slight taper), with the pyramidion on top
    const s = new Graphics();
    const b = 62, t = 42, top = -H;
    s.poly([-b, -10, -t, top, t, top, b, -10]).fill(0xf3efe6);
    s.poly([t - 2 * t * 0.28, top, t, top, b, -10, b - 2 * b * 0.28, -10]).fill(0xe4dccd);
    // the stone changes shade a third of the way up (the real monument does too)
    const y3 = -10 - (H - 10) * 0.17;
    const w3 = b - (b - t) * 0.17;
    s.poly([-w3, y3, -w3 + 1, y3 - 3, w3 - 1, y3 - 3, w3, y3]).fill({ color: darken(0xf3efe6, 0.05), alpha: 0.8 });
    s.poly([-b, -10, -w3, y3, w3, y3, b, -10]).fill({ color: lighten(0xf3efe6, 0.3), alpha: 0.35 });
    s.poly([-t, top, 0, top - 76, t, top]).fill(0xf3efe6);
    s.poly([0, top - 76, t, top, t * 0.44, top]).fill(0xe4dccd);
    // tiny observation windows near the top
    for (const wx of [-14, 6]) s.roundRect(wx, top + 30, 8, 14, 3).fill(0x8a919c);
    s.rect(-b + 2, -18, 2 * b - 4, 3).fill({ color: P.white, alpha: 0.5 });
    this.shaft.addChild(s);
    this.view.addChild(this.shaft);
    // red aircraft-warning lights on the pyramidion
    for (const lx of [-t + 6, t - 6]) {
      const l = new Graphics().circle(0, 0, 5).fill(0xff4d4d);
      l.position.set(lx, top - 6);
      this.lights.push(l);
      this.view.addChild(l);
    }
    // the ring of flags around the base (two arcs: the far side smaller and higher)
    const flagRow = (n: number, r: number, y: number, h: number) => {
      for (let k = 0; k < n; k++) {
        const fx = -r + (2 * r * k) / (n - 1);
        if (Math.abs(fx) < b + 14) continue;
        const pole = new Graphics().roundRect(fx - 1.5, y - h, 3, h, 1.5).fill(0xd9dde2);
        this.view.addChild(pole);
        const f = new Graphics();
        f.rect(0, 0, 30, 20).fill(0xe5483f);
        for (let sk = 1; sk < 7; sk += 2) f.rect(0, (sk * 20) / 7, 30, 20 / 7).fill(P.white);
        f.rect(0, 0, 13, 11).fill(0x2f4f9e);
        f.position.set(fx + 1.5, y - h);
        this.flags.push(f);
        this.view.addChild(f);
      }
    };
    flagRow(14, 250, -16, 110);
    flagRow(14, 290, 4, 126);
    this.hits = [{ x: -b - 10, y: top - 80, w: 2 * b + 20, h: -top + 80 }, { x: -300, y: -140, w: 600, h: 140 }];
    this.extent = [-800, 800];
  }

  hintTarget(): Container {
    return this.shaft;
  }

  onTap(): void {
    this.ctx.sfx.chime();
    this.ctx.sfx.whoosh();
    this.flutter = 2.5;
    this.blink = 2.5;
    this.ctx.tweens.wobble(this.shaft, 0.004, 0.8, 0.005);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 300, count: 12, shape: 'star', tint: [0xe5483f, P.white, 0x2f4f9e], speed: [100, 260], gravity: 160, life: [0.7, 1.2], size: [10, 16] });
  }

  update(dt: number): void {
    this.t += dt;
    this.flutter = Math.max(0, this.flutter - dt);
    this.blink = Math.max(0, this.blink - dt);
    const rate = this.blink > 0 ? 8 : 1;
    const on = Math.sin(this.t * Math.PI * 2 * rate * 0.5) > 0;
    this.lights.forEach((l) => (l.alpha = on ? 1 : 0.25));
    const amp = this.flutter > 0 ? 0.35 : 0.12;
    const spd = this.flutter > 0 ? 14 : 4;
    this.flags.forEach((f, k) => {
      f.scale.x = 1 - amp * 0.5 + Math.sin(this.t * spd + k * 0.7) * amp * 0.5;
      f.skew.y = Math.sin(this.t * spd * 0.8 + k) * amp * 0.4;
    });
  }
}

// ---------- The World War II Memorial: an oval pool of fountains ringed by pillars ----------
export class WWIIFountain extends Prop {
  private t = 0;
  private boost = 0;
  private jets: number[] = [];

  constructor(ctx: Ctx, x: number, private w = 700) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const g = new Graphics();
    const W = w;
    // the two arched pavilions at the ends
    for (const side of [-1, 1]) {
      const px = side * (W / 2 + 20);
      block(g, px - 46, -170, 92, 170, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 4 });
      g.moveTo(px - 26, 0).lineTo(px - 26, -96).arc(px, -96, 26, Math.PI, 0).lineTo(px + 26, 0).closePath().fill(0x9fb4c4);
      g.circle(px, -140, 13).stroke({ width: 3, color: GOLD });
    }
    // the ring of granite pillars, each with a bronze wreath
    for (let k = 0; k < 14; k++) {
      const px = -W / 2 + 50 + k * ((W - 100) / 13);
      block(g, px - 9, -82, 18, 82, 0xd8d2c4, { landmark: true, shade: 0xc8c1b1, radius: 3 });
      g.circle(px, -66, 5).stroke({ width: 2.5, color: 0x9a7a3a });
    }
    // the oval pool in front
    g.ellipse(0, -8, W * 0.42, 22).fill(0xdcd5c5);
    g.ellipse(0, -9, W * 0.4, 17).fill(WATER);
    g.ellipse(0, -5, W * 0.34, 9).fill(0x56b0d8);
    this.view.addChild(g);
    for (let k = 0; k < 9; k++) this.jets.push(-W * 0.32 + k * ((W * 0.64) / 8));
    this.hits = [{ x: -W / 2 - 70, y: -180, w: W + 140, h: 180 }];
    this.extent = [-900, 900];
  }

  onTap(): void {
    this.boost = 2;
    this.ctx.sfx.splash(1.4);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 140, count: 26, shape: 'drop', tint: [WATER, P.white, 0xbfe6ff], spread: this.w * 0.3, speed: [180, 420], angle: [-2.4, -0.7], gravity: 900, life: [0.7, 1.1], size: [8, 13], spin: 0, rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    const rate = this.boost > 0 ? 0.012 : 0.05;
    while (this.t > rate) {
      this.t -= rate;
      const jx = this.jets[Math.floor(Math.random() * this.jets.length)];
      this.ctx.fx.spawn(this.ctx.layers.fxBack, {
        x: this.x + jx, y: this.y - 14, shape: 'drop', tint: [WATER, 0xbfe6ff, P.white],
        speed: [140, 220 + this.boost * 160], angle: [-1.72, -1.42],
        gravity: 700, drag: 0.2, life: [0.45, 0.65], size: [4, 7], spin: 0, rotate: false, alpha: 0.85,
      });
    }
  }
}

// ---------- The U.S. Capitol (dome, drum colonnade, wings; a plain lantern on top) ----------
export class Capitol extends Prop {
  static readonly SCALE = 0.8;
  private dome = new Container();
  private flags: Graphics[] = [];
  private windows: Graphics[] = [];
  private t = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 1100);
    // One long, continuous facade (like the real Capitol): a rusticated ground floor, the main
    // floor with two rows of windows, and one balustrade roofline running the whole width.
    // Porticos with pediments mark the middle (on the grand stairs) and the two end wings.
    const HALF = 500, ROOF = -210, GROUND = -44;
    const centre = { cx: 0, half: 175, cols: 8, cw: 18 };
    const wings = [-370, 370].map((cx) => ({ cx, half: 85, cols: 6, cw: 14 }));
    const inPortico = (px: number) => Math.abs(px) < centre.half + 12 || wings.some((w) => Math.abs(px - w.cx) < w.half + 12);
    // ground floor and main floor
    g.roundRect(-HALF, GROUND, HALF * 2, -GROUND, 3).fill(darken(MARBLE, 0.06));
    for (let px = -HALF + 30; px < HALF - 10; px += 40) {
      if (!inPortico(px)) g.moveTo(px - 8, -6).lineTo(px - 8, -26).arc(px, -26, 8, Math.PI, 0).lineTo(px + 8, -6).closePath().fill(0x9fb4c4);
    }
    g.rect(-HALF, ROOF, HALF * 2, GROUND - ROOF).fill(MARBLE);
    for (let px = -HALF + 30; px < HALF - 10; px += 40) {
      if (inPortico(px)) continue;
      g.roundRect(px - 9, -184, 18, 34, 7).fill(0x9fb4c4);
      g.roundRect(px - 9, -122, 18, 30, 6).fill(0x9fb4c4);
    }
    // cornice and balustrade along the whole roofline
    g.roundRect(-HALF - 6, ROOF - 6, HALF * 2 + 12, 12, 4).fill(lighten(MARBLE, 0.5));
    g.roundRect(-HALF - 2, ROOF - 24, HALF * 2 + 4, 5, 2).fill(MARBLE);
    for (let px = -HALF + 6; px <= HALF - 6; px += 12) g.roundRect(px - 2.5, ROOF - 20, 5, 15, 2).fill(MARBLE);
    // porticos: a slightly projecting bay, columns, entablature and a pediment
    const portico = (p: { cx: number; half: number; cols: number; cw: number }, pedH: number) => {
      g.rect(p.cx - p.half, ROOF, p.half * 2, GROUND - ROOF).fill(lighten(MARBLE, 0.3));
      g.rect(p.cx - p.half + 10, ROOF + 18, p.half * 2 - 20, GROUND - ROOF - 22).fill(0xd9d3c4);
      columns(g, p.cx - p.half + 4, p.cx + p.half - 4, ROOF + 10, GROUND, p.cols, p.cw);
      g.roundRect(p.cx - p.half - 8, ROOF - 8, p.half * 2 + 16, 22, 3).fill(MARBLE);
      roundedTri(g, p.cx, ROOF - 8 - pedH, p.half * 2 + 30, pedH, 4).fill(MARBLE);
      roundedTri(g, p.cx, ROOF - 8 - pedH + 10, p.half * 2 - 10, pedH - 16, 3).fill(lighten(MARBLE, 0.35));
    };
    for (const w of wings) portico(w, 46);
    portico(centre, 64);
    // the grand stairs up to the middle portico
    steps(g, 0, centre.half * 2 + 70, 5, 9, 10);
    // light from the left: the right end of the building sits in a little shade
    g.rect(HALF - 280, ROOF - 24, 280, -ROOF + 24).fill({ color: P.black, alpha: 0.05 });
    // a flag above each wing
    for (const w of wings) {
      const top = ROOF - 8 - 46;
      g.roundRect(w.cx - 1.5, top - 66, 3, 66, 1.5).fill(0xd9dde2);
      const f = new Graphics();
      f.rect(0, 0, 32, 20).fill(0xe5483f);
      for (let sk = 1; sk < 7; sk += 2) f.rect(0, (sk * 20) / 7, 32, 20 / 7).fill(P.white);
      f.rect(0, 0, 14, 11).fill(0x2f4f9e);
      f.position.set(w.cx + 1.5, top - 66);
      this.flags.push(f);
    }
    this.view.addChild(g, ...this.flags);
    // the dome rises from behind the portico: drum colonnade, upper drum, dome, lantern
    const d = new Graphics();
    block(d, -150, -150, 300, 150, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 4 });
    d.rect(-140, -138, 280, 120).fill(0xd9d3c4);
    columns(d, -146, 146, -146, -6, 12, 13);
    d.roundRect(-158, -162, 316, 16, 5).fill(MARBLE);
    block(d, -124, -226, 248, 64, MARBLE, { landmark: true, shade: MARBLE_SHADE, radius: 4 });
    for (let k = 0; k < 9; k++) {
      const wg = new Graphics().roundRect(0, 0, 12, 34, 6).fill(0x9fb4c4);
      wg.position.set(-108 + k * 26, -214);
      this.windows.push(wg);
    }
    // the dome
    d.moveTo(-128, -226).quadraticCurveTo(-120, -380, 0, -386).quadraticCurveTo(120, -380, 128, -226).closePath().fill(MARBLE);
    d.moveTo(30, -385).quadraticCurveTo(120, -380, 128, -226).lineTo(70, -226).quadraticCurveTo(76, -330, 30, -385).fill(MARBLE_SHADE);
    for (const rx of [-90, -50, -16, 16, 50, 90]) d.moveTo(rx * 1.05, -228).quadraticCurveTo(rx * 0.85, -330, rx * 0.25, -382).stroke({ width: 2.5, color: MARBLE_DARK, alpha: 0.7 });
    d.ellipse(-60, -320, 14, 36).fill({ color: P.white, alpha: 0.35 });
    // the lantern: a little ring of columns with a rounded cap
    d.roundRect(-30, -428, 60, 44, 8).fill(MARBLE);
    for (let k = 0; k < 4; k++) d.roundRect(-24 + k * 14, -422, 6, 34, 3).fill(0xd9d3c4);
    d.moveTo(-34, -428).quadraticCurveTo(0, -470, 34, -428).closePath().fill(MARBLE);
    d.circle(0, -472, 8).fill(MARBLE);
    this.dome.addChild(d, ...this.windows);
    // (a touch smaller and sitting lower behind the portico, so the lantern stays on screen)
    this.dome.scale.set(0.82);
    this.dome.position.set(0, ROOF - 18);
    this.view.addChildAt(this.dome, 0);
    // drawn a little smaller than life so the whole dome fits on screen
    const k = Capitol.SCALE;
    this.view.scale.set(k);
    this.hits = [{ x: -HALF * k, y: -620 * k, w: HALF * 2 * k, h: 620 * k }];
    this.extent = [-1000, 1000];
  }

  hintTarget(): Container {
    return this.dome;
  }

  onTap(): void {
    this.ctx.sfx.peal();
    this.ctx.tweens.after(0.9, () => this.ctx.sfx.fanfare());
    this.ctx.tweens.wobble(this.dome, 0.01, 0.8, 0.02);
    this.windows.forEach((w, k) => this.ctx.tweens.after(k * 0.06, () => !w.destroyed && (w.tint = 0xfff1a8)));
    this.ctx.tweens.after(2.4, () => this.windows.forEach((w) => !w.destroyed && (w.tint = 0xffffff)));
    for (let k = 0; k < 4; k++) {
      this.ctx.tweens.after(k * 0.25, () => this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + rand(-110, 110), y: this.y - 450 + rand(-30, 30), count: 8, shape: 'star', tint: [GOLD, 0xfff1a8, P.white],
        speed: [80, 220], gravity: 140, life: [0.6, 1.1], size: [10, 16],
      }));
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.flags.forEach((f, k) => {
      f.scale.x = 0.9 + Math.sin(this.t * 4 + k) * 0.1;
      f.skew.y = Math.sin(this.t * 3.2 + k) * 0.06;
    });
  }
}

void ease;
