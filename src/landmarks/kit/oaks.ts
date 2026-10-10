// Southern street furniture: live oaks with swaying Spanish moss (a mockingbird lives in each)
// and gas lamps with flickering flames. Savannah's squares are built from these.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken } from '../../style/palette';
import { contactShadow } from '../../style/shapes';
import { ease } from '../../core/Tween';
import { WALK } from './common';

const OAK = 0x4f8f4c;
const OAK_DARK = 0x447f42;
const BARK = 0x7a6048;
const MOSS = 0xb3bfa2;

// ---------- Live oak (tap: rustle, moss swings, a mockingbird pops out) ----------
export class LiveOak extends Prop {
  private crown = new Container();
  private moss: Graphics[] = [];
  private bird = new Container();
  private wing = new Graphics();
  private t = Math.random() * 10;
  private swing = 0;
  private flying = false;

  /** `front`: near side of the road (in front of the car); otherwise on the far sidewalk. */
  constructor(ctx: Ctx, x: number, private size = 260, front = false, y = front ? 80 : WALK - 2) {
    super(ctx, x, y);
    this.layer = front ? 'front' : 'back';
    this.view.zIndex = 2;
    const s = size;
    const g = new Graphics();
    contactShadow(g, 0, 0, s * 1.3);
    // Trunk splitting into wide, low, reaching limbs.
    g.roundRect(-s * 0.07, -s * 0.36, s * 0.14, s * 0.37, 6).fill(BARK);
    g.moveTo(-s * 0.05, -s * 0.3).quadraticCurveTo(-s * 0.25, -s * 0.36, -s * 0.5, -s * 0.44)
      .lineTo(-s * 0.5, -s * 0.38).quadraticCurveTo(-s * 0.25, -s * 0.3, -s * 0.03, -s * 0.22).fill(BARK);
    g.moveTo(s * 0.05, -s * 0.3).quadraticCurveTo(s * 0.28, -s * 0.38, s * 0.52, -s * 0.42)
      .lineTo(s * 0.52, -s * 0.36).quadraticCurveTo(s * 0.28, -s * 0.31, s * 0.04, -s * 0.22).fill(darken(BARK, 0.1));
    g.rect(s * 0.07 - s * 0.04, -s * 0.36, s * 0.04, s * 0.36).fill({ color: P.black, alpha: 0.08 });
    this.view.addChild(g);

    // Broad, flat canopy of overlapping blobs.
    const c = new Graphics();
    c.ellipse(-s * 0.42, -s * 0.48, s * 0.3, s * 0.13).fill(OAK);
    c.ellipse(s * 0.44, -s * 0.47, s * 0.3, s * 0.13).fill(OAK_DARK);
    c.ellipse(-s * 0.16, -s * 0.6, s * 0.36, s * 0.17).fill(OAK);
    c.ellipse(s * 0.2, -s * 0.6, s * 0.36, s * 0.17).fill(OAK_DARK);
    c.ellipse(0, -s * 0.68, s * 0.34, s * 0.15).fill(OAK);
    c.ellipse(-s * 0.16, -s * 0.74, s * 0.18, s * 0.05).fill({ color: P.white, alpha: 0.14 });
    this.crown.addChild(c);
    this.crown.pivot.set(0, -s * 0.36);
    this.crown.position.set(0, -s * 0.36);
    this.view.addChild(this.crown);

    // Spanish moss: soft grey-green drapes hanging from the canopy edge, pivoting at the top.
    for (let k = 0; k < 9; k++) {
      const mx = (-0.62 + k * 0.155) * s;
      const top = -s * (0.4 + Math.abs(Math.sin(k * 1.7)) * 0.08) - (Math.abs(mx) < s * 0.3 ? s * 0.08 : 0);
      const len = s * (0.12 + ((k * 5) % 4) * 0.035);
      const m = new Graphics();
      m.roundRect(-4, 0, 8, len, 4).fill(MOSS);
      m.roundRect(-8, len * 0.25, 5, len * 0.55, 2.5).fill({ color: MOSS, alpha: 0.85 });
      m.roundRect(3, len * 0.15, 5, len * 0.7, 2.5).fill({ color: darken(MOSS, 0.08), alpha: 0.9 });
      m.position.set(mx, top);
      this.moss.push(m);
      this.crown.addChild(m);
    }

    // A mockingbird hiding in the leaves (grey with white wing bars).
    const b = new Graphics();
    b.ellipse(0, 0, 11, 7).fill(0x8d949b);
    b.circle(8, -5, 5.5).fill(0x8d949b);
    b.poly([12, -6, 19, -5, 12, -3]).fill(0x2b2f33);
    b.circle(9, -6, 1.4).fill(0x111111);
    b.roundRect(-20, -3, 12, 4, 2).fill(0x6f767d);
    this.wing.roundRect(-8, -3, 14, 6, 3).fill(0x5f666d);
    this.wing.roundRect(-4, -1, 6, 2, 1).fill(P.white);
    this.bird.addChild(b, this.wing);
    this.bird.position.set(s * 0.1, -s * 0.62);
    this.bird.visible = false;
    this.view.addChild(this.bird);

    this.hits = [{ x: -s * 0.7, y: -s * 0.85, w: s * 1.4, h: s * 0.85 }];
    this.extent = [-s - 300, s + 300];
  }

  hintTarget(): Container {
    return this.crown;
  }

  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.tweens.wobble(this.crown, 0.03, 0.9, 0.03);
    this.swing = 1;
    if (this.flying) return;
    this.flying = true;
    const b = this.bird;
    const s = this.size;
    const hx = s * 0.1, hy = -s * 0.62;
    b.visible = true;
    b.scale.set(1);
    this.ctx.sfx.tweet();
    this.ctx.tweens.after(0.25, () => this.ctx.sfx.tweet());
    this.ctx.tweens.after(0.5, () => this.ctx.sfx.tweet());
    // Pop up, loop out over the street and come back to hide.
    this.ctx.tweens.add(2.4, (p) => {
      if (b.destroyed) return;
      const a = p * Math.PI * 2;
      b.x = hx + Math.sin(a) * s * 0.55;
      b.y = hy - Math.sin(p * Math.PI) * s * 0.45 - Math.sin(a) * 20;
      b.scale.x = Math.cos(a) >= 0 ? 1 : -1;
      this.wing.scale.y = Math.sin(p * 70);
    }, {
      ease: ease.inOutSine,
      done: () => {
        if (b.destroyed) return;
        b.visible = false;
        this.wing.scale.y = 1;
        this.flying = false;
      },
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.swing = Math.max(0, this.swing - dt * 0.5);
    const amp = 0.05 + this.swing * 0.35;
    this.moss.forEach((m, k) => (m.rotation = Math.sin(this.t * (1.1 + this.swing * 4) + k * 0.8) * amp));
  }
}

// ---------- Gas lamp (tap: the flame flares up and dings) ----------
export class GasLamp extends Prop {
  private flame = new Graphics();
  private glow = new Graphics();
  private lantern = new Container();
  private t = Math.random() * 10;
  private flare = 0;

  constructor(ctx: Ctx, x: number, front = false, y = front ? 66 : WALK - 1, private note = 0) {
    super(ctx, x, y);
    this.layer = front ? 'front' : 'back';
    this.view.zIndex = 3;
    const ink = 0x2b2f33;
    const g = new Graphics();
    contactShadow(g, 0, 0, 34);
    g.roundRect(-9, -14, 18, 14, 4).fill(ink);
    g.roundRect(-4, -150, 8, 140, 3).fill(ink);
    g.roundRect(-7, -60, 14, 6, 3).fill(ink);
    g.roundRect(-12, -152, 24, 6, 3).fill(ink);
    g.roundRect(-14, -154, 28, 2, 1).fill({ color: P.white, alpha: 0.25 });
    this.view.addChild(g);
    // Lantern: tapered glass box with a little roof and finial.
    const l = this.lantern;
    this.glow.circle(0, 0, 30).fill({ color: 0xfff1a8, alpha: 0.25 });
    this.glow.position.set(0, -20);
    const lg = new Graphics();
    lg.poly([-11, 0, 11, 0, 15, -36, -15, -36]).fill({ color: 0xfff7d6, alpha: 0.9 });
    lg.roundRect(-2, -36, 4, 36, 2).fill(ink);
    lg.poly([-18, -36, 18, -36, 0, -50]).fill(ink);
    lg.circle(0, -52, 4).fill(ink);
    lg.roundRect(-12, -2, 24, 5, 2).fill(ink);
    this.flame.ellipse(0, -14, 5, 9).fill(0xffb347);
    this.flame.ellipse(0, -12, 2.5, 5).fill(0xfff1a8);
    l.addChild(this.glow, lg, this.flame);
    l.position.set(0, -152);
    l.pivot.set(0, 0);
    this.view.addChild(l);
    this.hits = [{ x: -22, y: -210, w: 44, h: 210 }];
    this.extent = [-200, 200];
  }

  hintTarget(): Container {
    return this.lantern;
  }

  onTap(): void {
    this.flare = 1;
    this.ctx.sfx.pluck(this.note + 7, 0.12);
    this.ctx.tweens.wobble(this.lantern, 0.12, 0.8, 0.05);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 170, count: 6, shape: 'star', tint: [0xfff1a8, 0xffb347], speed: [60, 160], gravity: 120, life: [0.5, 0.8], size: [6, 10] });
  }

  update(dt: number): void {
    this.t += dt;
    this.flare = Math.max(0, this.flare - dt * 0.6);
    const f = 1 + Math.sin(this.t * 13) * 0.06 + Math.sin(this.t * 7.3) * 0.05 + this.flare * 0.7;
    this.flame.scale.set(f, f);
    this.flame.y = -14 * (f - 1);
    this.glow.alpha = 0.6 + Math.sin(this.t * 5) * 0.1 + this.flare;
    this.glow.scale.set(1 + this.flare * 0.8);
  }
}
