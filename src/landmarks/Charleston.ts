// Charleston, SC: Ravenel Bridge, Rainbow Row, St. Michael's steeple,
// the Pineapple Fountain at Waterfront Park, and the family waiting to say hi.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, SKIN, darken, lighten } from '../style/palette';
import { block, contactShadow, cornerRect, palmetto, roundedTri } from '../style/shapes';
import { ease } from '../core/Tween';
import { rand } from '../core/rng';
import { roadHeight } from '../world/Terrain';
import { ROAD_FAR } from '../world/Road';
import { WORLD_END } from '../world/Route';

const WALK = ROAD_FAR - 16;

// ---------- Ravenel Bridge tower with cable fans ----------
export class BridgeTower extends Prop {
  private lights: Graphics[] = [];
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 0);
    this.layer = 'back';
    const deckY = -roadHeight(x) + ROAD_FAR;
    const top = deckY - 440;
    const base = 70;
    const g = new Graphics();
    // cable fans (thin, so they read as cables)
    for (let k = 0; k < 11; k++) {
      const ay = top + 40 + k * 14;
      for (const s of [-1, 1]) {
        const dx = s * (90 + k * 62);
        const dy = -roadHeight(x + dx) + ROAD_FAR;
        g.moveTo(0, ay).lineTo(dx, dy).stroke({ width: 2, color: 0xeef2f6, alpha: 0.95 });
      }
    }
    // tapered diamond-ish pylon (two legs seen edge-on)
    g.poly([-30, base, -12, top + 20, 0, top, 12, top + 20, 30, base]).fill(0xe3e7ec);
    g.poly([4, top + 6, 12, top + 20, 30, base, 12, base]).fill(0xd2d7dd);
    g.roundRect(-6, top - 4, 12, 30, 4).fill(0xf2f4f7);
    g.roundRect(-40, deckY + 30, 80, 16, 4).fill(0xc7ccd3);
    this.view.addChild(g);
    for (let k = 0; k < 6; k++) {
      const l = new Graphics().circle(0, 0, 3.5).fill(0xfff1a8);
      l.position.set(0, top + 30 + k * 36);
      l.alpha = 0.25;
      this.lights.push(l);
      this.view.addChild(l);
    }
    this.hits = [{ x: -40, y: top, w: 80, h: base - top }];
    this.extent = [-800, 800];
  }
  onTap(): void {
    this.ctx.sfx.chime();
    this.lights.forEach((l, k) => {
      this.ctx.tweens.add(0.6, (p) => (l.alpha = 0.25 + Math.sin(p * Math.PI) * 0.75), { delay: (5 - k) * 0.08 });
    });
    this.ctx.tweens.wobble(this.view, 0.004, 0.6, 0);
  }
}

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

// ---------- Palmetto (tap to rustle) ----------
export class Palm extends Prop {
  private crown = new Container();
  constructor(ctx: Ctx, x: number, y: number, size: number, lean: number, front: boolean) {
    super(ctx, x, y);
    this.layer = front ? 'front' : 'back';
    const g = new Graphics();
    palmetto(g, 0, 0, size, lean);
    this.crown.addChild(g);
    this.view.addChild(this.crown);
    this.hits = [{ x: -size * 0.45, y: -size * 1.3, w: size * 0.9, h: size * 1.3 }];
  }
  hintTarget(): Container {
    return this.crown;
  }
  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.tweens.wobble(this.crown, 0.06, 0.9, 0.04);
  }
}

// ---------- Pineapple Fountain ----------
export class Fountain extends Prop {
  private t = 0;
  private boost = 0;
  private sculpture = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 6);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 300);
    // round pool basin
    g.roundRect(-140, -34, 280, 34, 12).fill(0xd8d2c4);
    g.roundRect(-128, -30, 256, 12, 6).fill(P.water);
    g.roundRect(-140, -34, 280, 3, 2).fill({ color: P.white, alpha: 0.5 });
    // tiered pedestal
    block(g, -26, -110, 52, 80, 0xcdc6b6, { radius: 4 });
    g.ellipse(0, -110, 70, 12).fill(0xd8d2c4);
    g.ellipse(0, -113, 62, 7).fill(P.water);
    block(g, -16, -150, 32, 40, 0xcdc6b6, { radius: 4 });
    this.view.addChild(g);
    // the pineapple
    const pa = new Graphics();
    pa.ellipse(0, -18, 26, 34).fill(0xd9b14a);
    for (let r = 0; r < 5; r++) {
      for (let c = -2; c <= 2; c++) {
        const px = c * 10 + (r % 2) * 5, py = -40 + r * 10;
        if (Math.abs(px) < 22 - Math.abs(r - 2) * 2) pa.poly([px, py - 5, px + 5, py, px, py + 5, px - 5, py]).fill(0xc29a36);
      }
    }
    pa.ellipse(-8, -28, 6, 12).fill({ color: P.white, alpha: 0.25 });
    for (let k = -3; k <= 3; k++) {
      const a = -Math.PI / 2 + k * 0.32;
      pa.moveTo(0, -48).quadraticCurveTo(Math.cos(a) * 18 + 4, -48 + Math.sin(a) * 18, Math.cos(a) * 36, -50 + Math.sin(a) * 36)
        .quadraticCurveTo(Math.cos(a) * 18 - 4, -48 + Math.sin(a) * 18, 0, -48).fill(k % 2 ? 0x5e9a52 : 0x4c8644);
    }
    this.sculpture.addChild(pa);
    this.sculpture.position.set(0, -150);
    this.view.addChild(this.sculpture);
    this.hits = [{ x: -140, y: -250, w: 280, h: 250 }];
    this.extent = [-1200, 1200];
  }
  hintTarget(): Container {
    return this.sculpture;
  }
  onTap(): void {
    this.boost = 1.4;
    this.ctx.sfx.splash(1.3);
    this.ctx.tweens.wobble(this.sculpture, 0.06, 0.8, 0.1);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y - 210, count: 26, shape: 'drop', tint: [P.water, P.white, 0xbfe6ff],
      speed: [200, 480], angle: [-2.6, -0.5], gravity: 900, life: [0.8, 1.3], size: [8, 14], spin: 0, rotate: false,
    });
  }
  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    const rate = this.boost > 0 ? 0.015 : 0.05;
    while (this.t > rate) {
      this.t -= rate;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.ctx.fx.spawn(this.ctx.layers.fxBack, {
        x: this.x + side * 6, y: this.y - 200, shape: 'drop', tint: [P.water, 0xbfe6ff, P.white],
        speed: [120, 200 + this.boost * 200], angle: side < 0 ? [-2.3, -1.9] : [-1.25, -0.85],
        gravity: 700, drag: 0.2, life: [0.55, 0.75], size: [5, 8], spin: 0, rotate: false, alpha: 0.85,
      });
    }
  }
}

// ---------- End of the road: a grassy turnaround ----------
export class EndPark extends Prop {
  private flowers: Graphics[] = [];
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 30);
    this.layer = 'front';
    const g = new Graphics();
    g.moveTo(-20, 0).quadraticCurveTo(-10, -86, 120, -90).lineTo(900, -90).lineTo(900, 300).lineTo(-20, 300).closePath().fill(P.grassNear);
    g.moveTo(-6, -20).quadraticCurveTo(4, -76, 120, -82).lineTo(900, -82).lineTo(900, -76).lineTo(120, -76).quadraticCurveTo(10, -70, -6, -20).fill({ color: P.white, alpha: 0.25 });
    this.view.addChild(g);
    const colors = [0xf7a7c0, 0xfff27a, 0xffffff, 0xf28b82, 0xc5a3ff];
    for (let k = 0; k < 9; k++) {
      const f = new Graphics();
      f.roundRect(-1.5, -18, 3, 18, 1.5).fill(P.grassDark);
      const c = colors[k % colors.length];
      for (let p = 0; p < 5; p++) f.circle(Math.cos((p / 5) * Math.PI * 2) * 5, -20 + Math.sin((p / 5) * Math.PI * 2) * 5, 4.5).fill(c);
      f.circle(0, -20, 3.5).fill(0xf2b33d);
      f.position.set(60 + k * 46, -84 + (k % 2) * 30 + 40);
      this.view.addChild(f);
      this.flowers.push(f);
    }
    this.hits = [{ x: 0, y: -100, w: 500, h: 200 }];
    this.extent = [-300, 1200];
  }
  onTap(): void {
    this.ctx.sfx.sparkle();
    this.flowers.forEach((f, i) => {
      this.ctx.tweens.add(0.5, (p) => f.scale.set(1 + Math.sin(p * Math.PI) * 0.6), { delay: i * 0.05 });
    });
  }
}

// ---------- The family (and dog) waiting at the end ----------
interface Member {
  c: Container;
  arm: Container;
  body: Container;
  homeX: number;
  isDog: boolean;
  tail?: Container;
  tapped: boolean;
}

export class Greeters extends Prop {
  members: Member[] = [];
  out = false;
  private waveT = 0;
  readonly doorX: number;

  constructor(ctx: Ctx, x: number, doorX: number) {
    super(ctx, x, WALK + 2);
    this.layer = 'back';
    this.doorX = doorX;
    const defs = [
      { h: 112, shirt: 0x3f7fd1, pants: 0x3b4a5c, skin: SKIN[1], hair: 0x3a2a20, dx: -170 },
      { h: 104, shirt: 0xe9637a, pants: 0x5a4a6a, skin: SKIN[0], hair: 0xb5763c, dx: -80 },
      { h: 70, shirt: 0xf7c934, pants: 0x2f80d1, skin: SKIN[2], hair: 0x1f1a17, dx: 0 },
      { h: 92, shirt: 0x7fbf6a, pants: 0x7a6a5a, skin: SKIN[3], hair: 0xdcdcdc, dx: 80 },
    ];
    for (const d of defs) this.members.push(this.makePerson(d));
    this.members.push(this.makeDog(160));
    for (const m of this.members) {
      m.c.position.set(this.doorX - this.x, 0);
      m.c.scale.set(0);
      this.view.addChild(m.c);
    }
    this.hits = [{ x: -220, y: -130, w: 440, h: 140 }];
    this.extent = [-1500, 1500];
  }

  private makePerson(d: { h: number; shirt: number; pants: number; skin: number; hair: number; dx: number }): Member {
    const c = new Container();
    const body = new Container();
    const g = new Graphics();
    const h = d.h;
    const headR = h * 0.17;
    contactShadow(g, 0, 0, h * 0.5);
    g.roundRect(-h * 0.11, -h * 0.42, h * 0.09, h * 0.42, h * 0.04).fill(d.pants);
    g.roundRect(h * 0.02, -h * 0.42, h * 0.09, h * 0.42, h * 0.04).fill(d.pants);
    g.roundRect(-h * 0.17, -h * 0.78, h * 0.34, h * 0.42, h * 0.12).fill(d.shirt);
    cornerRect(g, h * 0.17 - h * 0.34 * 0.28, -h * 0.78, h * 0.34 * 0.28, h * 0.42, 0, h * 0.12, h * 0.12, 0).fill({ color: P.black, alpha: 0.07 });
    // head with simple happy face
    const hy = -h * 0.78 - headR * 0.9;
    g.circle(0, hy, headR).fill(d.skin);
    g.moveTo(-headR, hy - headR * 0.1).quadraticCurveTo(-headR, hy - headR * 1.25, 0, hy - headR * 1.1)
      .quadraticCurveTo(headR, hy - headR * 1.25, headR, hy - headR * 0.1).quadraticCurveTo(0, hy - headR * 0.7, -headR, hy - headR * 0.1).fill(d.hair);
    g.circle(-headR * 0.35, hy + headR * 0.05, headR * 0.12).fill(0x2a2a2a);
    g.circle(headR * 0.35, hy + headR * 0.05, headR * 0.12).fill(0x2a2a2a);
    g.moveTo(-headR * 0.35, hy + headR * 0.38).quadraticCurveTo(0, hy + headR * 0.7, headR * 0.35, hy + headR * 0.38).stroke({ width: Math.max(1.5, headR * 0.12), color: 0x6a3b2e, cap: 'round' });
    g.circle(-headR * 0.6, hy + headR * 0.3, headR * 0.18).fill({ color: 0xff8a7a, alpha: 0.45 });
    g.circle(headR * 0.6, hy + headR * 0.3, headR * 0.18).fill({ color: 0xff8a7a, alpha: 0.45 });
    // still arm
    g.roundRect(-h * 0.22, -h * 0.74, h * 0.08, h * 0.34, h * 0.04).fill(d.shirt);
    body.addChild(g);
    // waving arm (pivot at shoulder)
    const arm = new Container();
    const ag = new Graphics();
    ag.roundRect(-h * 0.04, -h * 0.36, h * 0.08, h * 0.36, h * 0.04).fill(d.shirt);
    ag.circle(0, -h * 0.37, h * 0.055).fill(d.skin);
    arm.addChild(ag);
    arm.position.set(h * 0.17, -h * 0.72);
    arm.rotation = 0.4;
    body.addChild(arm);
    c.addChild(body);
    return { c, arm, body, homeX: d.dx, isDog: false, tapped: false };
  }

  private makeDog(dx: number): Member {
    const c = new Container();
    const body = new Container();
    const g = new Graphics();
    contactShadow(g, 0, 0, 60);
    for (const lx of [-16, -8, 10, 18]) g.roundRect(lx - 3, -16, 6, 16, 3).fill(0xb07a48);
    g.roundRect(-24, -34, 52, 22, 11).fill(0xc68b52);
    g.circle(28, -38, 13).fill(0xc68b52);
    g.roundRect(32, -36, 14, 10, 5).fill(0xe0b083);
    g.circle(44, -33, 3).fill(0x2a2a2a);
    g.circle(30, -42, 2.2).fill(0x2a2a2a);
    g.ellipse(20, -40, 6, 11).fill(0x8a5a32);
    body.addChild(g);
    const tail = new Container();
    tail.addChild(new Graphics().roundRect(-3, -18, 6, 20, 3).fill(0xc68b52));
    tail.position.set(-22, -30);
    tail.rotation = -0.6;
    body.addChild(tail);
    c.addChild(body);
    const arm = new Container();
    return { c, arm, body, homeX: dx, isDog: true, tail, tapped: false };
  }

  /** Pop out of the door one by one and line up on the sidewalk. */
  emerge(): void {
    if (this.out) return;
    this.out = true;
    this.members.forEach((m, i) => {
      const delay = 0.35 * i;
      const sx = this.doorX - this.x;
      this.ctx.tweens.add(0.3, (p) => m.c.scale.set(p), { delay, ease: ease.outBack });
      this.ctx.tweens.after(delay, () => (m.isDog ? this.ctx.sfx.boof() : this.ctx.sfx.pop()));
      this.ctx.tweens.add(0.7, (p) => {
        m.c.x = sx + (m.homeX - sx) * p;
        m.c.y = -Math.abs(Math.sin(p * Math.PI * 3)) * 18;
      }, { delay: delay + 0.2, ease: ease.inOutSine });
    });
  }

  hintTarget(): Container {
    const m = this.members.find((mm) => !mm.tapped) ?? this.members[0];
    return m.body;
  }

  get allGreeted(): boolean {
    return this.members.every((m) => m.tapped);
  }

  onTap(wx: number): void {
    if (!this.out) {
      this.ctx.sfx.knock();
      return;
    }
    const lx = wx - this.view.x;
    let best = this.members[0];
    for (const m of this.members) if (Math.abs(m.c.x - lx) < Math.abs(best.c.x - lx)) best = m;
    this.greet(best);
  }

  private greet(m: Member): void {
    m.tapped = true;
    const wx = this.view.x + m.c.x;
    if (m.isDog) {
      this.ctx.sfx.boof();
      this.ctx.tweens.add(0.5, (p) => (m.c.y = -Math.sin(p * Math.PI) * 40), { ease: ease.outQuad });
    } else {
      this.ctx.sfx.giggle();
      this.ctx.tweens.wobble(m.body, 0.1, 0.7, 0.2);
    }
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: wx, y: this.y - 120, count: 7, shape: 'heart', tint: [0xff6f91, 0xff9eb5, 0xe94b3c],
      speed: [60, 160], angle: [-2.4, -0.7], gravity: -60, drag: 1.2, life: [1.0, 1.6], size: [14, 22], spin: 1,
    });
  }

  update(dt: number): void {
    this.waveT += dt;
    if (!this.out) return;
    this.members.forEach((m, i) => {
      if (m.isDog) {
        if (m.tail) m.tail.rotation = -0.6 + Math.sin(this.waveT * 18) * 0.5;
      } else {
        m.arm.rotation = Math.PI * 0.85 + Math.sin(this.waveT * 7 + i) * 0.35;
      }
    });
  }
}

// ---------- Fireworks over the harbor ----------
export function launchFirework(ctx: Ctx, x: number, targetY: number): void {
  const palettes = [
    [0xff6f91, 0xffc75f, 0xffffff],
    [0x7fd8ff, 0x9fffc9, 0xffffff],
    [0xc5a3ff, 0xff9eb5, 0xfff27a],
    [0xffd166, 0xef476f, 0x06d6a0],
  ];
  ctx.sfx.whistleUp();
  ctx.fx.firework(ctx.layers.skyFx, x + rand(-30, 30), 40, targetY, palettes[Math.floor(Math.random() * palettes.length)], () => ctx.sfx.firework());
}

export interface CharlestonSet {
  props: Prop[];
  greeters: Greeters;
  fountain: Prop;
}

export function buildBridge(ctx: Ctx): Prop[] {
  return [new BridgeTower(ctx, 77400), new BridgeTower(ctx, 79000)];
}

export function buildCharleston(ctx: Ctx): CharlestonSet {
  const props: Prop[] = [];
  props.push(new Steeple(ctx, 82350));
  // Rainbow Row
  let x = 81300;
  let i = 0;
  let doorX = 0;
  const widths = [240, 260, 220, 280, 240, 250, 230, 270, 240, 260, 230, 250, 260];
  while (x < 84700) {
    const w = widths[i % widths.length];
    if (Math.abs(x + w / 2 - 82350) < 200) {
      x += 230;
      continue;
    }
    const h = 250 + ((i * 53) % 90);
    const house = new RowHouse(ctx, x, w, h, P.rainbow[i % P.rainbow.length], i, true);
    props.push(house);
    if (x + w / 2 > 84150 && !doorX) doorX = x + w / 2;
    x += w + 4;
    i++;
  }
  // Palmettos along the near side and between buildings
  // Near-side palmettos, kept clear of the greeting spot.
  for (const [k, px] of [80900, 82000, 83100, 85950].entries()) props.push(new Palm(ctx, px, 70, 200 + (k % 3) * 30, (k % 2) * 0.3 - 0.15, true));
  props.push(new Palm(ctx, 85000, WALK - 2, 230, -0.2, false));
  props.push(new Palm(ctx, 85700, WALK - 2, 200, 0.25, false));
  const fountain = new Fountain(ctx, 85350);
  props.push(fountain);
  props.push(new EndPark(ctx, WORLD_END + 110));
  const greeters = new Greeters(ctx, 84500, doorX || 84300);
  props.push(greeters);
  return { props, greeters, fountain };
}

