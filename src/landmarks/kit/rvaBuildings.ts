// Richmond's buildings: old brick tobacco warehouses with painted ghost signs, Main Street
// Station's clock tower, the elevated rail trestle with a passing train, the Virginia State
// Capitol on its green hill, the Carillon bell tower, a mural wall and dogwoods in bloom.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken, lighten } from '../../style/palette';
import { block, contactShadow, cornerRect, roundedTri } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { rand } from '../../core/rng';
import { signText } from '../../signs/Signs';
import { pentaFreq } from '../../audio/Sfx';
import { WALK } from './common';

const BRICK = 0xb05a43;
const BRICK_DARK = 0x944a37;
const STONE = 0xe9e2d2;

/** A bell: a sine with a bright inharmonic partial and a slow ring-out. */
function bell(ctx: Ctx, freq: number, delay = 0, gain = 0.1): void {
  ctx.sfx.s.tone({ freq, dur: 1.6, type: 'sine', gain, delay });
  ctx.sfx.s.tone({ freq: freq * 2.4, dur: 0.6, type: 'sine', gain: gain * 0.3, delay });
  ctx.sfx.s.tone({ freq: freq * 0.5, dur: 1.2, type: 'sine', gain: gain * 0.25, delay });
}

/** A segmental-arched window (rounded top), lit or not. */
function archPane(g: Graphics, x: number, y: number, w: number, h: number, lit: boolean): void {
  g.clear();
  g.moveTo(x - 3, y + h).lineTo(x - 3, y + w * 0.3).quadraticCurveTo(x + w / 2, y - w * 0.35, x + w + 3, y + w * 0.3).lineTo(x + w + 3, y + h).closePath().fill(STONE);
  g.moveTo(x, y + h - 2).lineTo(x, y + w * 0.32).quadraticCurveTo(x + w / 2, y - w * 0.22, x + w, y + w * 0.32).lineTo(x + w, y + h - 2).closePath().fill(lit ? P.warmWindow : 0x8fb0c6);
  g.rect(x + w / 2 - 1, y + 2, 2, h - 4).fill(STONE);
  g.rect(x, y + h * 0.55, w, 2).fill(STONE);
}

// ---------- Tobacco warehouse with a painted ghost sign (tap: windows light, a low note) ----------
export class RvaWarehouse extends Prop {
  private panes: { g: Graphics; x: number; y: number; w: number; h: number }[] = [];
  private lit = false;
  private signBand = new Container();

  constructor(ctx: Ctx, x: number, public w: number, floors: number, color: number, sign: string, private note: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.view.zIndex = 1;
    const fh = 70;
    const h = floors * fh + 40;
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w, 0.1);
    block(g, 0, -h, w, h, color, { landmark: true, shade: darken(color, 0.1) });
    // stone base, brick piers between bays, corbelled cornice
    g.roundRect(0, -26, w, 26, 4).fill(0xc9bfae);
    const bays = Math.max(3, Math.round(w / 64));
    for (let b = 1; b < bays; b++) g.rect((w / bays) * b - 3, -h + 30, 6, h - 56).fill({ color: lighten(color, 0.12), alpha: 0.8 });
    g.roundRect(-5, -h - 6, w + 10, 12, 4).fill(darken(color, 0.2));
    for (let cx = 4; cx < w - 6; cx += 14) g.roundRect(cx, -h + 6, 9, 5, 2).fill(darken(color, 0.2));
    // loading doors
    for (let b = 0; b < bays; b += 2) g.roundRect((w / bays) * (b + 0.5) - 18, -64, 36, 64, 4).fill(0x4f3a2e);
    this.view.addChild(g);
    for (let f = 1; f < floors; f++) {
      for (let b = 0; b < bays; b++) {
        const pg = new Graphics();
        const pw = Math.min(30, w / bays - 22), ph = fh - 30;
        const px = (w / bays) * (b + 0.5) - pw / 2, py = -26 - f * fh + 8;
        archPane(pg, px, py, pw, ph, false);
        this.view.addChild(pg);
        this.panes.push({ g: pg, x: px, y: py, w: pw, h: ph });
      }
    }
    // the ghost sign: faded cream lettering painted high on the brick
    const sg = new Graphics();
    sg.roundRect(10, -h + 18, w - 20, 34, 3).fill({ color: 0xf2e6c8, alpha: 0.55 });
    this.signBand.addChild(sg);
    const t = signText(sign, 17, darken(color, 0.35), '900');
    if (t.width > w - 34) t.scale.set((w - 34) / t.width);
    t.position.set(w / 2, -h + 35);
    t.alpha = 0.85;
    this.signBand.addChild(t);
    this.view.addChild(this.signBand);
    this.hits = [{ x: 0, y: -h - 6, w, h: h + 6 }];
    this.extent = [-200, w + 200];
  }

  onTap(): void {
    this.lit = !this.lit;
    for (const p of this.panes) archPane(p.g, p.x, p.y, p.w, p.h, this.lit);
    this.ctx.sfx.pluck(this.note - 5, 0.18);
    this.ctx.tweens.wobble(this.view, 0.008, 0.5, 0.015);
    this.ctx.tweens.add(0.6, (p) => !this.signBand.destroyed && (this.signBand.alpha = 0.6 + 0.4 * Math.sin(p * Math.PI * 2)), { done: () => (this.signBand.alpha = 1) });
  }
}

// ---------- Main Street Station: red-brick clock tower beside a mansard-roofed station ----------
export class StationClock extends Prop {
  private hands: Container[] = [];
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.view.zIndex = 0;
    const g = new Graphics();
    contactShadow(g, 120, 0, 460, 0.1);
    // the station: brick, tall arched windows, a steep slate mansard with dormers
    block(g, 0, -230, 380, 230, BRICK, { landmark: true, shade: BRICK_DARK });
    g.roundRect(0, -30, 380, 30, 4).fill(0xc9bfae);
    for (let k = 0; k < 5; k++) {
      const wx = 30 + k * 70;
      g.moveTo(wx, -40).lineTo(wx, -150).quadraticCurveTo(wx + 18, -178, wx + 36, -150).lineTo(wx + 36, -40).closePath().fill(STONE);
      g.moveTo(wx + 4, -44).lineTo(wx + 4, -148).quadraticCurveTo(wx + 18, -170, wx + 32, -148).lineTo(wx + 32, -44).closePath().fill(0x8fb0c6);
    }
    g.poly([-10, -230, 26, -300, 354, -300, 390, -230]).fill(0x5d6672);
    g.poly([300, -300, 354, -300, 390, -230, 330, -230]).fill(0x4f5761);
    for (const dx of [60, 160, 260]) {
      g.roundRect(dx, -286, 34, 40, 6).fill(STONE);
      g.roundRect(dx + 6, -280, 22, 28, 4).fill(0x8fb0c6);
    }
    g.roundRect(-10, -306, 400, 8, 3).fill(0x4a525c);
    // the clock tower on the left end
    const tx = -40, tw = 110, top = -470;
    block(g, tx, top, tw, -top, BRICK, { landmark: true, shade: BRICK_DARK });
    for (let k = 1; k < 6; k++) g.rect(tx, top + k * 70, tw, 4).fill({ color: lighten(BRICK, 0.25), alpha: 0.6 });
    g.roundRect(tx - 8, top - 8, tw + 16, 14, 4).fill(STONE);
    // tall hipped roof in red tile with a finial
    g.poly([tx - 8, top - 6, tx + tw / 2, top - 120, tx + tw + 8, top - 6]).fill(0xb24a35);
    g.poly([tx + tw / 2, top - 120, tx + tw + 8, top - 6, tx + tw / 2 + 12, top - 6]).fill(0x983e2d);
    g.roundRect(tx + tw / 2 - 2, top - 146, 4, 30, 2).fill(0xd9a62c);
    g.circle(tx + tw / 2, top - 148, 5).fill(0xd9a62c);
    // the clock face
    const cx = tx + tw / 2, cy = top + 60;
    g.circle(cx, cy, 40).fill(STONE);
    g.circle(cx, cy, 34).fill(P.white);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.roundRect(cx + Math.cos(a) * 27 - 2, cy + Math.sin(a) * 27 - 2, 4, 4, 1).fill(0x2b3a52);
    }
    this.view.addChild(g);
    for (const [len, w, rot] of [[22, 4, -1.1], [30, 3, 0.9]] as const) {
      const hc = new Container();
      hc.addChild(new Graphics().roundRect(-w / 2, -len, w, len + 4, w / 2).fill(0x2b3a52));
      hc.position.set(cx, cy);
      hc.rotation = rot;
      this.hands.push(hc);
      this.view.addChild(hc);
    }
    this.view.addChild(new Graphics().circle(cx, cy, 4).fill(0xd9a62c));
    this.hits = [{ x: tx - 10, y: top - 150, w: 440, h: -top + 150 }];
    this.extent = [-300, 600];
  }

  hintTarget(): Container {
    return this.hands[1];
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    this.ctx.sfx.clockChime();
    this.hands.forEach((h, i) => {
      const r0 = h.rotation;
      this.ctx.tweens.add(1.4, (p) => !h.destroyed && (h.rotation = r0 + p * Math.PI * 2 * (i ? 2 : 1)), { ease: ease.inOutSine, done: () => (this.busy = false) });
    });
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x + 15, y: this.y - 410, count: 10, shape: 'star', tint: [0xffd166, P.white], speed: [80, 200], gravity: 80, life: [0.6, 1.0], size: [8, 14] });
  }
}

// ---------- The elevated rail trestle with a passing train (tap the train: horn and bell) ----------
const TRAIN_COLORS = [0x2a8f8b, 0xf2ead8, 0xe8913a];

export class Trestle extends Prop {
  private train = new Container();
  private pos: number;
  private speed = 150;
  private boost = 0;
  private wait = 0;
  private readonly deckY = -186;
  private readonly trainLen: number;

  constructor(ctx: Ctx, x: number, private len: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.view.zIndex = 2;
    const g = new Graphics();
    const steel = 0x6f7f74, steelDark = 0x5c6b61;
    // lattice bents on concrete footings
    for (let px = 60; px < len; px += 260) {
      g.roundRect(px - 22, -18, 44, 18, 4).fill(0xc9c5bb);
      g.poly([px - 18, -18, px - 8, this.deckY + 20, px + 8, this.deckY + 20, px + 18, -18]).fill(steel);
      for (let y = -40; y > this.deckY + 30; y -= 46) {
        g.moveTo(px - 15, y).lineTo(px + 15, y - 40).stroke({ width: 3, color: steelDark });
        g.moveTo(px + 15, y).lineTo(px - 15, y - 40).stroke({ width: 3, color: steelDark });
      }
    }
    // the deck girder and the rails
    g.roundRect(0, this.deckY, len, 22, 4).fill(steel);
    g.roundRect(0, this.deckY + 16, len, 6, 3).fill(steelDark);
    g.roundRect(0, this.deckY - 4, len, 4, 2).fill(0x4a4f55);
    for (let px = 8; px < len; px += 22) g.rect(px, this.deckY + 2, 2, 14).fill({ color: steelDark, alpha: 0.6 });
    this.view.addChild(g);
    // the train: a rounded locomotive and three passenger cars (parody colors, no face)
    const cars = 4;
    const cw = 150;
    for (let k = 0; k < cars; k++) {
      const c = new Graphics();
      const loco = k === 0;
      const body = loco ? TRAIN_COLORS[0] : TRAIN_COLORS[1];
      cornerRect(c, -cw / 2, -54, cw, 50, loco ? 8 : 10, loco ? 26 : 10, 4, 4).fill(body);
      c.roundRect(-cw / 2, -24, cw, 10, 4).fill(loco ? TRAIN_COLORS[2] : TRAIN_COLORS[0]);
      if (loco) {
        c.roundRect(cw / 2 - 40, -48, 30, 16, 6).fill(0xcfe4f2);
        c.circle(cw / 2 - 6, -16, 4).fill(0xfff1a8);
      } else {
        for (let w = 0; w < 4; w++) c.roundRect(-cw / 2 + 14 + w * 34, -46, 24, 16, 4).fill(0xcfe4f2);
      }
      c.roundRect(-cw / 2 + 6, -52, cw - 12, 3, 1.5).fill({ color: P.white, alpha: 0.5 });
      for (const wx of [-cw / 2 + 24, cw / 2 - 24]) c.circle(wx, -4, 8).fill(0x2b2f33);
      c.position.set(-k * (cw + 8), 0);
      this.train.addChild(c);
    }
    this.trainLen = cars * (cw + 8);
    this.train.y = this.deckY - 4;
    this.view.addChild(this.train);
    this.pos = rand(0, len);
    this.hits = [{ x: 0, y: this.deckY - 70, w: len, h: 90 }];
    this.extent = [-this.trainLen - 300, len + 300];
  }

  hintTarget(): Container {
    return this.train;
  }

  onTap(): void {
    // a friendly two-tone train horn and the bell
    for (const f of [311, 392]) this.ctx.sfx.s.tone({ freq: f, dur: 0.7, hold: 0.55, type: 'sawtooth', gain: 0.05, filter: 1000, q: 2 });
    for (let k = 0; k < 4; k++) this.ctx.sfx.s.tone({ freq: 1250, dur: 0.15, type: 'triangle', gain: 0.05, delay: 0.8 + k * 0.22 });
    this.boost = 2.5;
    this.wait = 0;
  }

  update(dt: number): void {
    this.boost = Math.max(0, this.boost - dt);
    if (this.wait > 0) {
      this.wait -= dt;
      this.train.visible = false;
      return;
    }
    this.train.visible = true;
    this.pos += (this.speed + this.boost * 160) * dt;
    if (this.pos > this.len + this.trainLen) {
      this.pos = 0;
      this.wait = 3;
    }
    this.train.x = this.pos;
    // the cars only show over the trestle
    this.train.children.forEach((c) => {
      const cx = this.pos + c.x;
      c.alpha = Math.max(0, Math.min(1, (cx + 75) / 80, (this.len - cx + 75) / 80));
    });
  }
}

// ---------- The Virginia State Capitol on its green hill (tap: bell, flag, sparkles) ----------
export class StateCapitol extends Prop {
  private flag = new Graphics();
  private t = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    const white = 0xf6f3ec, shade = 0xe4ded2;
    // Capitol Square: a gentle green hill with a path
    g.moveTo(-340, 2).quadraticCurveTo(-240, -70, 0, -76).quadraticCurveTo(240, -70, 340, 2).closePath().fill(0x7fbf6a);
    g.moveTo(-60, 2).quadraticCurveTo(-30, -40, -16, -74).lineTo(16, -74).quadraticCurveTo(30, -40, 60, 2).closePath().fill(0xe8dfc8);
    const base = -72;
    // wings
    block(g, -230, base - 130, 120, 130, white, { landmark: true, shade });
    block(g, 110, base - 130, 120, 130, white, { landmark: true, shade });
    for (const wx of [-214, -174, -134, 126, 166, 206]) g.roundRect(wx, base - 104, 14, 54, 4).fill(0x9fb7c8);
    // podium, the main temple and its portico of six columns
    block(g, -130, base - 40, 260, 40, shade, { landmark: true, shade: 0xd2cbbd });
    block(g, -110, base - 200, 220, 160, white, { landmark: true, shade });
    for (const cx of [-94, -58, -22, 14, 50, 86]) {
      g.roundRect(cx, base - 186, 14, 146, 5).fill(P.white);
      g.roundRect(cx - 3, base - 190, 20, 8, 3).fill(shade);
    }
    g.roundRect(-118, base - 206, 236, 14, 4).fill(shade);
    roundedTri(g, 0, base - 262, 252, 58, 5).fill(white);
    g.poly([0, base - 262, 126, base - 204, 90, base - 204]).fill(shade);
    // the flagpole and Virginia's blue flag
    g.roundRect(-2, base - 330, 4, 70, 2).fill(0x9aa2ab);
    g.circle(0, base - 332, 4).fill(0xd9a62c);
    this.view.addChild(g);
    this.flag.roundRect(0, 0, 40, 26, 3).fill(0x1f3f7f);
    this.flag.circle(20, 13, 8).fill(0xf2ead8);
    this.flag.position.set(2, base - 326);
    this.view.addChild(this.flag);
    this.hits = [{ x: -240, y: base - 340, w: 480, h: 340 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.flag;
  }

  onTap(): void {
    this.ctx.sfx.bell();
    this.ctx.tweens.wobble(this.flag, 0.3, 1.0, 0.15);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 330, count: 14, shape: 'star', tint: [0xffd166, P.white, 0x9fd3ff], speed: [80, 240], gravity: 120, life: [0.6, 1.1], size: [8, 14] });
  }

  update(dt: number): void {
    this.t += dt;
    this.flag.skew.y = Math.sin(this.t * 3) * 0.08;
  }
}

// ---------- The Carillon: a tall Georgian bell tower (tap: a carillon tune, the bells swing) ----------
const CARILLON_TUNE = [7, 5, 4, 2, 4, 5, 7, 7, 9, 7];

export class Carillon extends Prop {
  private bells: Container[] = [];
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    const c = 0xd9b48f, sh = 0xc49e78;
    contactShadow(g, 0, 0, 200);
    block(g, -60, -300, 120, 300, c, { landmark: true, shade: sh });
    g.roundRect(-66, -40, 132, 40, 4).fill(STONE);
    // a tall arched doorway and slit windows
    g.moveTo(-20, -40).lineTo(-20, -100).quadraticCurveTo(0, -124, 20, -100).lineTo(20, -40).closePath().fill(0x6a5444);
    for (const wy of [-170, -240]) g.roundRect(-8, wy, 16, 40, 8).fill(0x8a7462);
    g.roundRect(-70, -306, 140, 12, 4).fill(STONE);
    // the open belfry stage (bells hang inside), a stepped stage and a white cupola
    block(g, -48, -420, 96, 114, c, { landmark: true, shade: sh });
    for (const ax of [-36, 6]) {
      g.moveTo(ax, -320).lineTo(ax, -390).quadraticCurveTo(ax + 15, -410, ax + 30, -390).lineTo(ax + 30, -320).closePath().fill(0x4e5560);
    }
    g.roundRect(-54, -426, 108, 10, 4).fill(STONE);
    block(g, -34, -480, 68, 54, STONE, { landmark: true, shade: 0xd8d2c4 });
    g.moveTo(-26, -480).quadraticCurveTo(0, -540, 26, -480).closePath().fill(0x9fb3a6);
    g.roundRect(-2, -560, 4, 28, 2).fill(0xd9a62c);
    g.circle(0, -562, 4).fill(0xd9a62c);
    this.view.addChild(g);
    for (const bx of [-21, 21]) {
      const b = new Container();
      const bg = new Graphics();
      bg.moveTo(-9, 0).quadraticCurveTo(-9, -18, 0, -18).quadraticCurveTo(9, -18, 9, 0).lineTo(12, 4).lineTo(-12, 4).closePath().fill(0xd9a62c);
      b.addChild(bg);
      b.position.set(bx, -372);
      b.pivot.set(0, -18);
      b.y -= 18;
      this.bells.push(b);
      this.view.addChild(b);
    }
    this.hits = [{ x: -70, y: -566, w: 140, h: 566 }];
    this.extent = [-300, 300];
  }

  hintTarget(): Container {
    return this.bells[0];
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    CARILLON_TUNE.forEach((st, i) => {
      bell(this.ctx, pentaFreq(st, 392), i * 0.32, 0.08);
      this.ctx.tweens.after(i * 0.32, () => {
        const b = this.bells[i % 2];
        if (!b.destroyed) this.ctx.tweens.wobble(b, 0.5, 0.6, 0);
      });
    });
    this.ctx.tweens.after(CARILLON_TUNE.length * 0.32 + 0.4, () => (this.busy = false));
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 380, count: 10, shape: 'star', tint: [0xffd166, P.white], speed: [60, 180], gravity: -30, drag: 1, life: [1.0, 1.6], size: [10, 16] });
  }
}

// ---------- A painted mural wall: sun, river and cardinals (tap: the colors shift) ----------
const MURAL_SETS = [
  [0xffb347, 0x2fa3a0, 0xe5483f, 0x7b5cc4, 0xffd166],
  [0xff8fb1, 0x3f7fd1, 0xf7c934, 0x2e9d6a, 0xff9f1c],
  [0x9fd3ff, 0xe95f8b, 0x7fe0a8, 0xffb347, 0xc5a3ff],
];

export class MuralWall extends Prop {
  private art = new Graphics();
  private set = 0;

  constructor(ctx: Ctx, x: number, private w = 420, private h = 220) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w, 0.1);
    block(g, 0, -h, w, h, BRICK, { landmark: true, shade: BRICK_DARK });
    g.roundRect(-4, -h - 6, w + 8, 10, 4).fill(darken(BRICK, 0.2));
    this.view.addChild(g, this.art);
    this.paint();
    this.hits = [{ x: 0, y: -h, w, h }];
    this.extent = [-200, w + 200];
  }

  private paint(): void {
    const [a, b, c, d, e] = MURAL_SETS[this.set];
    const { w, h } = this;
    const g = this.art;
    g.clear();
    g.roundRect(12, -h + 12, w - 24, h - 24, 8).fill(lighten(b, 0.55));
    // a big sun with rays
    g.circle(w * 0.25, -h * 0.62, 38).fill(a);
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2;
      g.poly([w * 0.25 + Math.cos(ang) * 44, -h * 0.62 + Math.sin(ang) * 44, w * 0.25 + Math.cos(ang + 0.15) * 62, -h * 0.62 + Math.sin(ang + 0.15) * 62, w * 0.25 + Math.cos(ang - 0.15) * 62, -h * 0.62 + Math.sin(ang - 0.15) * 62]).fill(a);
    }
    // rolling river waves
    for (let k = 0; k < 3; k++) {
      const y = -50 - k * 18;
      const pts: number[] = [12, -12];
      for (let px = 12; px <= w - 12; px += 12) pts.push(px, y + Math.sin(px * 0.05 + k) * 6);
      pts.push(w - 12, -12);
      g.poly(pts).fill(k === 0 ? b : k === 1 ? lighten(b, 0.25) : lighten(b, 0.45));
    }
    // two cardinals (Virginia's bird) and a heart
    for (const [bx, by, col] of [[w * 0.62, -h * 0.66, c], [w * 0.78, -h * 0.55, d]] as const) {
      g.ellipse(bx, by, 16, 11).fill(col);
      g.circle(bx + 12, by - 8, 8).fill(col);
      g.poly([bx + 10, by - 16, bx + 14, by - 26, bx + 18, by - 14]).fill(col);
      g.poly([bx + 18, by - 9, bx + 26, by - 6, bx + 18, by - 4]).fill(0xffb347);
      g.circle(bx + 14, by - 10, 1.8).fill(0x24262a);
      g.poly([bx - 14, by, bx - 30, by - 8, bx - 26, by + 4]).fill(darken(col, 0.15));
    }
    g.moveTo(w * 0.5, -h * 0.4).bezierCurveTo(w * 0.5 - 22, -h * 0.4 - 20, w * 0.5 - 22, -h * 0.4 + 6, w * 0.5, -h * 0.4 + 18)
      .bezierCurveTo(w * 0.5 + 22, -h * 0.4 + 6, w * 0.5 + 22, -h * 0.4 - 20, w * 0.5, -h * 0.4).fill(e);
  }

  onTap(): void {
    this.set = (this.set + 1) % MURAL_SETS.length;
    this.paint();
    this.ctx.sfx.sparkle();
    this.ctx.tweens.wobble(this.art, 0, 0.5, 0.05);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x + this.w / 2, y: this.y - this.h / 2, count: 14, shape: 'confetti', tint: MURAL_SETS[this.set], speed: [100, 260], gravity: 300, life: [0.6, 1.1], size: [8, 12], spin: 4 });
  }
}

// ---------- Flowering dogwood (tap: petals drift down) ----------
export class Dogwood extends Prop {
  private crown = new Container();
  private petals: number[];

  constructor(ctx: Ctx, x: number, y: number, size: number, pink: boolean, front: boolean) {
    super(ctx, x, y);
    this.layer = front ? 'front' : 'back';
    const bloom = pink ? 0xf6a9c4 : 0xfdf7f2;
    const bloomShade = pink ? 0xe98fb0 : 0xece4dc;
    this.petals = pink ? [0xf6a9c4, 0xffd3e2, P.white] : [0xfdf7f2, P.white, 0xffe9f0];
    const g = new Graphics();
    contactShadow(g, 0, 0, size * 0.9);
    // a low, spreading trunk with branches
    g.poly([-size * 0.05, 0, -size * 0.03, -size * 0.4, size * 0.03, -size * 0.4, size * 0.05, 0]).fill(0x7a5c46);
    g.moveTo(0, -size * 0.32).lineTo(-size * 0.3, -size * 0.52).stroke({ width: size * 0.035, color: 0x7a5c46, cap: 'round' });
    g.moveTo(0, -size * 0.36).lineTo(size * 0.32, -size * 0.5).stroke({ width: size * 0.035, color: 0x7a5c46, cap: 'round' });
    this.view.addChild(g);
    const c = new Graphics();
    const cy = -size * 0.6;
    // a broad layered canopy of blossoms, with a little green showing
    for (const [dx, dy, r] of [[-0.3, 0.05, 0.25], [0.3, 0.06, 0.24], [0, -0.08, 0.3], [-0.14, -0.2, 0.2], [0.18, -0.18, 0.2]] as const) {
      c.circle(dx * size, cy + dy * size, r * size).fill(dx > 0.1 ? bloomShade : bloom);
    }
    for (const [dx, dy] of [[-0.36, 0.14], [0.36, 0.16], [0.05, 0.12]] as const) c.ellipse(dx * size, cy + dy * size, size * 0.08, size * 0.04).fill(0x6fa85a);
    // four-petal flowers dotted over the canopy
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 * 3.3;
      const r = size * (0.08 + 0.2 * ((k * 37) % 10) / 10);
      const fx = Math.cos(a) * r * 1.4, fy = cy + Math.sin(a) * r * 0.8;
      for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * Math.PI * 2 + Math.PI / 4;
        c.circle(fx + Math.cos(pa) * 3.5, fy + Math.sin(pa) * 3.5, 3).fill(P.white);
      }
      c.circle(fx, fy, 1.6).fill(0x9ac05a);
    }
    c.ellipse(-size * 0.16, cy - size * 0.2, size * 0.1, size * 0.04).fill({ color: P.white, alpha: 0.35 });
    this.crown.addChild(c);
    this.crown.pivot.set(0, -size * 0.4);
    this.crown.position.set(0, -size * 0.4);
    this.view.addChild(this.crown);
    this.hits = [{ x: -size * 0.55, y: -size * 0.95, w: size * 1.1, h: size * 0.95 }];
    this.extent = [-300, 300];
  }

  hintTarget(): Container {
    return this.crown;
  }

  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.sfx.sparkle();
    this.ctx.tweens.wobble(this.crown, 0.06, 0.9, 0.05);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y + this.crown.y - 60, count: 16, shape: 'heart', tint: this.petals,
      speed: [40, 140], angle: [-3, 0], gravity: 60, drag: 1.4, life: [1.2, 2.0], size: [8, 12], spin: 3, spread: 60,
    });
  }
}
