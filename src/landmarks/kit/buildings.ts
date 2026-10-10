// City buildings shared by every city (Charleston is the template).
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken, lighten } from '../../style/palette';
import { block, contactShadow, roundedTri } from '../../style/shapes';
import { WALK } from './common';

// ---------- Rainbow Row house ----------
export class RowHouse extends Prop {
  private shutters: Graphics[] = [];
  private panes: Graphics[] = [];
  private lit = false;

  constructor(ctx: Ctx, x: number, public w: number, h: number, color: number, private note: number, hasDoor = true) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w, 0.1);
    block(g, 0, -h, w, h, color, { landmark: true, shade: darken(color, 0.08) });
    // parapet + cornice
    g.roundRect(-6, -h - 6, w + 12, 14, 4).fill(lighten(color, 0.35));
    if (note % 3 === 0) {
      g.moveTo(w * 0.2, -h - 6).quadraticCurveTo(w / 2, -h - 40, w * 0.8, -h - 6).fill(color);
    }
    // stucco band between floors
    g.rect(0, -h * 0.36, w, 5).fill({ color: P.white, alpha: 0.35 });
    g.rect(0, -h * 0.68, w, 5).fill({ color: P.white, alpha: 0.35 });
    this.view.addChild(g);

    // tall windows with dark green shutters, three per floor
    const floors = [-h * 0.92, -h * 0.6, -h * 0.3];
    const cols = w > 230 ? [0.2, 0.5, 0.8] : [0.28, 0.72];
    floors.forEach((fy, fi) => {
      cols.forEach((cx) => {
        if (fi === 2 && hasDoor && Math.abs(cx - 0.5) < 0.05) return;
        const wx = w * cx - 16;
        const pane = new Graphics();
        this.drawPane(pane, false);
        pane.position.set(wx, fy);
        this.view.addChild(pane);
        this.panes.push(pane);
        for (const sx of [-14, 34]) {
          const s = new Graphics().roundRect(0, 0, 12, 46, 2).fill(P.shutter);
          s.roundRect(2, 4, 8, 2, 1).fill({ color: P.white, alpha: 0.15 });
          s.roundRect(2, 14, 8, 2, 1).fill({ color: P.white, alpha: 0.15 });
          s.roundRect(2, 24, 8, 2, 1).fill({ color: P.white, alpha: 0.15 });
          s.position.set(wx + sx + (sx < 0 ? 0 : 0), fy - 2);
          s.pivot.set(sx < 0 ? 0 : 12, 0);
          s.x += sx < 0 ? 0 : 12;
          this.view.addChild(s);
          this.shutters.push(s);
        }
      });
    });
    if (hasDoor) {
      const d = new Graphics();
      d.roundRect(w / 2 - 22, -86, 44, 86, 4).fill(0x2f4f43);
      d.moveTo(w / 2 - 26, -86).arc(w / 2, -86, 26, Math.PI, 0).closePath().fill(lighten(color, 0.5));
      d.circle(w / 2 + 12, -40, 3).fill(0xf2c94c);
      d.roundRect(w / 2 - 34, -6, 68, 6, 2).fill(0xd9d4c7);
      this.view.addChild(d);
    }
    // iron balcony on some
    if (note % 2 === 1) {
      const b = new Graphics();
      const by = -h * 0.6 + 50;
      b.roundRect(w * 0.12, by, w * 0.76, 4, 2).fill(0x2b2f33);
      for (let bx = w * 0.12; bx <= w * 0.88; bx += 10) b.rect(bx, by - 22, 2, 22).fill(0x2b2f33);
      b.roundRect(w * 0.12, by - 24, w * 0.76, 3, 1.5).fill(0x2b2f33);
      this.view.addChild(b);
    }
    this.hits = [{ x: 0, y: -h - 40, w, h: h + 40 }];
    this.extent = [-200, w + 200];
  }

  private drawPane(g: Graphics, lit: boolean): void {
    g.clear();
    g.roundRect(-3, -3, 38, 50, 3).fill(P.white);
    g.roundRect(0, 0, 32, 44, 2).fill(lit ? P.warmWindow : 0xbfdcee);
    g.rect(15, 0, 2, 44).fill(P.white);
    g.rect(0, 14, 32, 2).fill(P.white);
    g.rect(0, 29, 32, 2).fill(P.white);
    if (!lit) g.poly([4, 1, 10, 1, 3, 13, 0, 13]).fill({ color: P.white, alpha: 0.5 });
  }

  onTap(): void {
    // Each house is a note: tapping along the row plays a little tune.
    this.ctx.sfx.pluck(this.note, 0.18);
    this.lit = !this.lit;
    for (const p of this.panes) this.drawPane(p, this.lit);
    this.shutters.forEach((s, i) => {
      this.ctx.tweens.add(0.5, (p) => (s.scale.x = Math.cos(p * Math.PI * 2) * 0.5 + 0.5), { delay: i * 0.015 });
    });
    this.ctx.tweens.wobble(this.view, 0.01, 0.5, 0.02);
  }

  hintTarget(): Container {
    return this.view;
  }
}

// ---------- St. Michael's steeple ----------
export class Steeple extends Prop {
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const g = new Graphics();
    const c = 0xf7f4ec;
    block(g, -80, -260, 160, 260, c, { landmark: true, shade: 0xe6e1d4 });
    block(g, -50, -360, 100, 104, c, { landmark: true, shade: 0xe6e1d4 });
    block(g, -36, -440, 72, 84, c, { landmark: true, shade: 0xe6e1d4 });
    block(g, -24, -500, 48, 64, c, { landmark: true, shade: 0xe6e1d4 });
    roundedTri(g, 0, -660, 44, 164, 6).fill(c);
    g.poly([0, -660, 22, -496, 6, -496]).fill(0xe6e1d4);
    g.circle(0, -310, 22).fill(0x2b2f33);
    g.circle(0, -310, 18).fill(P.white);
    g.rect(-1, -322, 2, 13).fill(0x2b2f33);
    g.rect(-1, -311, 10, 2).fill(0x2b2f33);
    for (const [wx, wy, ww, wh] of [[-30, -400, 18, 34], [12, -400, 18, 34], [-14, -480, 28, 26]]) {
      g.moveTo(wx, wy + wh).lineTo(wx, wy + ww / 2).arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0).lineTo(wx + ww, wy + wh).closePath().fill(0x55606b);
    }
    for (const px of [-60, -20, 20, 60]) g.roundRect(px - 7, -230, 14, 200, 4).fill(P.white);
    roundedTri(g, 0, -300, 180, 44, 4).fill(c);
    this.view.addChild(g);
    this.hits = [{ x: -80, y: -660, w: 160, h: 660 }];
    this.extent = [-200, 200];
  }
  onTap(): void {
    this.ctx.sfx.bell();
    this.ctx.tweens.wobble(this.view, 0.008, 1.2, 0);
  }
}

