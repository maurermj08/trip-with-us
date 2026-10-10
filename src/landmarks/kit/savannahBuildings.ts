// Savannah buildings: River Street cotton warehouses (one is a candy shop), City Hall's gold
// dome and the twin-spired Cathedral of St. John the Baptist.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken, lighten } from '../../style/palette';
import { block, contactShadow, cornerRect, roundedTri } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { WALK } from './common';

/** Old Savannah grey and red brick tones. */
export const BRICKS = [0xb5654a, 0xa85c45, 0xc07a5a, 0x9c6a55, 0xb9826a];
const IRON = 0x2b2f33;
const STONE = 0xe6dccb;

/** A round-topped opening (doorway or window), bottom at y + h. */
function arch(g: Graphics, x: number, y: number, w: number, h: number, color: number | { color: number; alpha: number }): void {
  g.moveTo(x, y + h).lineTo(x, y + w / 2).arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0).lineTo(x + w, y + h).closePath().fill(color);
}

/** Iron balcony railing across [x, x + w] with its floor at y. */
function railing(g: Graphics, x: number, y: number, w: number): void {
  g.roundRect(x, y, w, 4, 2).fill(IRON);
  for (let bx = x + 2; bx <= x + w - 2; bx += 9) g.rect(bx, y - 20, 2, 20).fill(IRON);
  g.roundRect(x, y - 22, w, 3, 1.5).fill(IRON);
  for (let bx = x + 6; bx < x + w - 6; bx += 18) g.circle(bx + 3, y - 11, 3).stroke({ width: 1.5, color: IRON });
}

// ---------- River Street cotton warehouse (each one is a low note; one is a candy shop) ----------
export class Warehouse extends Prop {
  private panes: Graphics[] = [];
  private lit = false;
  private awning: Container | null = null;

  constructor(ctx: Ctx, x: number, public w: number, floors: number, color: number, private note: number, private candy = false) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.view.zIndex = 1;
    const fh = 78;
    const h = floors * fh + 30;
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w, 0.1);
    block(g, 0, -h, w, h, color, { landmark: true, shade: darken(color, 0.1) });
    // Stone ground floor band, brick courses and a corbelled cornice.
    g.roundRect(0, -fh - 6, w, fh + 6, 4).fill(STONE);
    cornerRect(g, w * 0.72, -fh - 6, w * 0.28, fh + 6, 0, 0, 4, 0).fill(darken(STONE, 0.08));
    for (let k = 1; k < floors; k++) g.rect(0, -fh - k * fh - 4, w, 4).fill({ color: lighten(color, 0.25), alpha: 0.7 });
    g.roundRect(-6, -h - 8, w + 12, 14, 4).fill(darken(color, 0.18));
    for (let cx = 4; cx < w - 6; cx += 16) g.roundRect(cx, -h + 6, 10, 6, 2).fill(darken(color, 0.18));
    this.view.addChild(g);

    // Arched ground-floor openings (big doors for cotton bales).
    const d = new Graphics();
    const nOpen = Math.max(2, Math.round(w / 90));
    const ow = Math.min(54, (w - 20) / nOpen - 14);
    for (let k = 0; k < nOpen; k++) {
      const ox = (w / nOpen) * (k + 0.5) - ow / 2;
      arch(d, ox - 4, -fh + 2, ow + 8, fh - 2, lighten(STONE, 0.3));
      arch(d, ox, -fh + 8, ow, fh - 8, candy ? 0xffe1ec : 0x5a4a40);
      if (!candy) d.rect(ox + ow / 2 - 1, -fh + 8 + ow / 2, 2, fh - 8 - ow / 2).fill({ color: 0x3e332c, alpha: 0.8 });
    }
    this.view.addChild(d);

    // Upper-floor arched windows; some lit when tapped.
    const cols = Math.max(2, Math.round(w / 70));
    for (let f = 1; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const pane = new Graphics();
        this.drawPane(pane, false);
        pane.position.set((w / cols) * (c + 0.5) - 14, -fh - f * fh + 16);
        this.view.addChild(pane);
        this.panes.push(pane);
      }
    }
    // Iron balcony along the first upper floor.
    if (floors >= 2 && note % 2 === 0) {
      const b = new Graphics();
      railing(b, 8, -fh - 12, w - 16);
      this.view.addChild(b);
    }

    if (candy) {
      // Striped awning over the shop front, a jar sign and a tray of pralines in the window.
      const a = new Container();
      const ag = new Graphics();
      const stripes = Math.round((w - 10) / 26);
      const sw = (w + 16) / stripes;
      for (let k = 0; k < stripes; k++) {
        cornerRect(ag, -8 + k * sw, 0, sw + 0.5, 30, k === 0 ? 6 : 0, k === stripes - 1 ? 6 : 0, 0, 0).fill(k % 2 ? P.white : 0xe95f8b);
        ag.circle(-8 + k * sw + sw / 2, 30, sw / 2).fill(k % 2 ? P.white : 0xe95f8b);
      }
      a.addChild(ag);
      a.position.set(0, -fh - 4);
      this.awning = a;
      this.view.addChild(a);
      const s = new Graphics();
      s.roundRect(w / 2 - 34, -fh - 44, 68, 32, 8).fill(0xfff3d6);
      s.circle(w / 2 - 14, -fh - 28, 9).fill(0xe95f8b);
      s.circle(w / 2 + 4, -fh - 28, 9).fill(0x8fd3c1);
      s.circle(w / 2 + 20, -fh - 28, 7).fill(0xffd166);
      for (let k = 0; k < 4; k++) s.ellipse(22 + k * 12, -24, 6, 3.5).fill(0x9a5f34);
      this.view.addChild(s);
    }
    this.hits = [{ x: 0, y: -h - 10, w, h: h + 10 }];
    this.extent = [-200, w + 200];
  }

  private drawPane(g: Graphics, lit: boolean): void {
    g.clear();
    arch(g, -3, -3, 34, 50, lighten(STONE, 0.2));
    arch(g, 0, 0, 28, 44, lit ? P.warmWindow : 0x9fc3d9);
    g.rect(13, 14, 2, 30).fill(lighten(STONE, 0.2));
    g.rect(0, 26, 28, 2).fill(lighten(STONE, 0.2));
    if (!lit) g.poly([4, 10, 9, 6, 3, 22, 1, 22]).fill({ color: P.white, alpha: 0.45 });
  }

  hintTarget(): Container {
    return this.awning ?? this.view;
  }

  onTap(): void {
    // A lower register than Rainbow Row: a walk along River Street plays a bass line.
    this.ctx.sfx.pluck(this.note - 5, 0.2);
    this.lit = !this.lit;
    for (const p of this.panes) this.drawPane(p, this.lit);
    this.ctx.tweens.wobble(this.view, 0.008, 0.5, 0.02);
    if (this.candy && this.awning) {
      this.ctx.sfx.pop();
      this.ctx.tweens.after(0.12, () => this.ctx.sfx.pop());
      this.ctx.tweens.wobble(this.awning, 0.05, 0.6, 0.1);
      this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + this.w / 2, y: this.y - 110, count: 12, shape: 'circle', tint: [0x9a5f34, 0xb87842, 0xe7c08a],
        speed: [160, 360], angle: [-2.6, -0.5], gravity: 900, life: [0.7, 1.1], size: [8, 13],
      });
    }
  }
}

// ---------- City Hall: gold dome over a stone drum with a clock ----------
export class CityHall extends Prop {
  private hands = new Container();
  private dome = new Container();
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 6);
    this.layer = 'back';
    this.view.zIndex = 0;
    const g = new Graphics();
    const c = 0xece4d4, sh = 0xd9cfbc;
    contactShadow(g, 0, 0, 340);
    // Main block with columns and a pediment.
    block(g, -150, -300, 300, 300, c, { landmark: true, shade: sh });
    for (const px of [-110, -55, 0, 55, 110]) g.roundRect(px - 9, -250, 18, 230, 5).fill(P.white);
    g.roundRect(-150, -22, 300, 22, 4).fill(sh);
    roundedTri(g, 0, -340, 220, 44, 4).fill(c);
    g.roundRect(-140, -300, 280, 8, 3).fill(lighten(c, 0.4));
    for (const wx of [-128, -73, -18, 37, 92]) g.roundRect(wx + 10, -230, 16, 40, 3).fill(0x8fb0c6);
    // Drum with the clock.
    block(g, -78, -440, 156, 110, c, { landmark: true, shade: sh });
    for (const px of [-62, -32, 32, 62]) g.roundRect(px - 5, -432, 10, 96, 4).fill(P.white);
    g.circle(0, -388, 26).fill(0x2b3a52);
    g.circle(0, -388, 22).fill(P.white);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.circle(Math.cos(a) * 17, -388 + Math.sin(a) * 17, 1.6).fill(0x2b3a52);
    }
    this.view.addChild(g);
    const hh = new Graphics();
    hh.roundRect(-1.5, -14, 3, 15, 1.5).fill(0x2b3a52);
    hh.roundRect(-1.5, -1.5, 11, 3, 1.5).fill(0x2b3a52);
    hh.circle(0, 0, 2.5).fill(0xd9a62c);
    this.hands.addChild(hh);
    this.hands.position.set(0, -388);
    this.view.addChild(this.hands);
    // Gold dome with ribs and a lantern on top.
    const d = new Graphics();
    const gold = 0xe8b84a, goldSh = 0xd19f33;
    d.moveTo(-84, 0).quadraticCurveTo(-84, -100, 0, -104).quadraticCurveTo(84, -100, 84, 0).closePath().fill(gold);
    d.moveTo(24, -102).quadraticCurveTo(84, -96, 84, 0).lineTo(36, 0).quadraticCurveTo(40, -70, 24, -102).fill(goldSh);
    for (const rx of [-52, -18, 18, 52]) {
      d.moveTo(rx, 0).quadraticCurveTo(rx * 0.7, -70, rx * 0.15, -102).stroke({ width: 3, color: lighten(gold, 0.25), alpha: 0.7 });
    }
    d.ellipse(-36, -60, 10, 26).fill({ color: P.white, alpha: 0.3 });
    d.roundRect(-90, -6, 180, 12, 5).fill(c);
    block(d, -14, -140, 28, 40, c, { landmark: true, shade: sh, radius: 4 });
    d.moveTo(-18, -140).quadraticCurveTo(0, -166, 18, -140).closePath().fill(gold);
    d.circle(0, -170, 6).fill(gold);
    this.dome.addChild(d);
    this.dome.position.set(0, -440);
    this.view.addChild(this.dome);
    this.hits = [{ x: -150, y: -620, w: 300, h: 620 }];
    this.extent = [-400, 400];
  }

  hintTarget(): Container {
    return this.dome;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.dome, 0.04, 0.9, 0.05);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y - 520, count: 14, shape: 'star', tint: [0xffd166, 0xfff1a8, P.white],
      speed: [100, 300], gravity: 200, life: [0.6, 1.1], size: [8, 14],
    });
    if (this.busy) return;
    this.busy = true;
    this.ctx.sfx.clockChime();
    const r0 = this.hands.rotation;
    this.ctx.tweens.add(1.6, (p) => !this.hands.destroyed && (this.hands.rotation = r0 + p * Math.PI * 4), {
      ease: ease.inOutSine,
      done: () => (this.busy = false),
    });
  }
}

// ---------- Cathedral of St. John the Baptist: twin spires, rose window ----------
export class Cathedral extends Prop {
  private spires: Container[] = [];
  private rose = new Container();

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    this.view.zIndex = 0;
    const c = 0xf2ece2, sh = 0xdfd6c8;
    const spireCol = 0x9fb3a6, spireSh = 0x89a092;
    const g = new Graphics();
    contactShadow(g, 0, 0, 360);
    // Nave front with a gable.
    block(g, -90, -300, 180, 300, c, { landmark: true, shade: sh });
    roundedTri(g, 0, -360, 180, 64, 6).fill(c);
    g.poly([0, -360, 90, -298, 50, -298]).fill(sh);
    // Big pointed doorway.
    g.moveTo(-34, 0).lineTo(-34, -80).quadraticCurveTo(-34, -120, 0, -136).quadraticCurveTo(34, -120, 34, -80).lineTo(34, 0).closePath().fill(0x7b5a44);
    g.roundRect(-1, -126, 2, 126, 1).fill(0x5d4232);
    this.view.addChild(g);
    // Rose window.
    const r = new Graphics();
    r.circle(0, 0, 36).fill(lighten(c, 0.5));
    r.circle(0, 0, 31).fill(0x4f6fb0);
    const petals = [0xe4574f, 0xf2c14e, 0x5bb07a, 0x9a6fcf];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      r.circle(Math.cos(a) * 19, Math.sin(a) * 19, 8).fill(petals[k % 4]);
    }
    r.circle(0, 0, 9).fill(0xf2c14e);
    this.rose.addChild(r);
    this.rose.position.set(0, -220);
    this.view.addChild(this.rose);
    // Twin towers with tall green-grey spires; each pivots at its base so it can sway.
    for (const sx of [-1, 1]) {
      const t = new Container();
      const tg = new Graphics();
      block(tg, -42, -420, 84, 420, c, { landmark: true, shade: sh });
      for (const wy of [-380, -300, -220]) tg.moveTo(-10, wy + 44).lineTo(-10, wy + 12).quadraticCurveTo(0, wy, 10, wy + 12).lineTo(10, wy + 44).closePath().fill(0x55606b);
      for (const px of [-42, 42]) {
        tg.roundRect(px - 7, -440, 14, 30, 4).fill(c);
        roundedTri(tg, px, -470, 14, 34, 2).fill(spireCol);
      }
      roundedTri(tg, 0, -660, 72, 244, 8).fill(spireCol);
      tg.poly([0, -660, 36, -416, 12, -416]).fill(spireSh);
      tg.roundRect(-2, -700, 4, 44, 2).fill(0xd9a62c);
      tg.roundRect(-12, -688, 24, 4, 2).fill(0xd9a62c);
      t.addChild(tg);
      t.position.set(sx * 130, 0);
      this.spires.push(t);
      this.view.addChild(t);
    }
    this.hits = [{ x: -175, y: -700, w: 350, h: 700 }];
    this.extent = [-450, 450];
  }

  hintTarget(): Container {
    return this.rose;
  }

  onTap(): void {
    this.ctx.sfx.peal();
    this.spires.forEach((s, i) => this.ctx.tweens.after(i * 0.35, () => this.ctx.tweens.wobble(s, 0.025, 1.0, 0)));
    this.ctx.tweens.wobble(this.rose, 0.4, 1.2, 0.08);
  }
}
