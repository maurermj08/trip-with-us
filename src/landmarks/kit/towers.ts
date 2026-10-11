// Downtown high-rises shared by the big cities (Jacksonville now, Orlando later).
// One class, several silhouettes; colors are parameterized so each city can tint its skyline.
//   crown:   glass tower with a stepped crown whose light bands cycle colors (tap: rainbow chase)
//   slab:    dark glass slab; tap sends a wave of lit windows up the floors
//   granite: pink stone with vertical ribs and a pyramid cap; tap rings a bell
//   glass:   light glass tower with a slanted top and a big glint (tap: the glint sweeps)
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken, lighten } from '../../style/palette';
import { block, contactShadow, windowGrid } from '../../style/shapes';
import { makeRng } from '../../core/rng';
import { WALK } from './common';

export type TowerVariant = 'crown' | 'slab' | 'granite' | 'glass';

export interface TowerLook {
  body: number;
  shade: number;
  /** Window / glass color. */
  glass: number;
  /** Trim (caps, fins, crown). */
  trim: number;
}

export const TOWER_LOOKS: Record<TowerVariant, TowerLook> = {
  crown: { body: 0x8fb4d3, shade: 0x7a9fbf, glass: 0xc9e2f2, trim: 0xe8eef3 },
  slab: { body: 0x3d5a78, shade: 0x324c66, glass: 0x5f7f9e, trim: 0x8aa2ba },
  granite: { body: 0xdba7a1, shade: 0xc99390, glass: 0xf6dcd5, trim: 0xefc9c2 },
  glass: { body: 0xf3f6f8, shade: 0xdde5ea, glass: 0x8fd3d6, trim: 0xffffff },
};

const CROWN_COLORS = [0x7fd1ff, 0xff8fb1, 0xb59cff, 0x7fe0a8, 0xffd166];

export interface TowerOpts {
  w?: number;
  h?: number;
  variant?: TowerVariant;
  look?: Partial<TowerLook>;
  /** Pentatonic step for the slab's window run and the default tap note. */
  note?: number;
  seed?: number;
}

export class Tower extends Prop {
  readonly variant: TowerVariant;
  private body = new Container();
  private bands: Graphics[] = [];
  private floors: Graphics[] = [];
  private shine: Graphics | null = null;
  private t = Math.random() * 10;
  private chase = 0;
  private note: number;
  private look: TowerLook;
  readonly w: number;
  readonly h: number;

  constructor(ctx: Ctx, x: number, o: TowerOpts = {}) {
    super(ctx, x, WALK);
    this.layer = 'back';
    this.variant = o.variant ?? 'crown';
    this.look = { ...TOWER_LOOKS[this.variant], ...o.look };
    this.w = o.w ?? 200;
    this.h = o.h ?? 640;
    this.note = o.note ?? 0;
    const g = new Graphics();
    contactShadow(g, 0, 0, this.w * 1.15);
    this.body.addChild(g);
    const rng = makeRng(o.seed ?? Math.round(x));
    switch (this.variant) {
      case 'crown': this.drawCrown(g, rng); break;
      case 'slab': this.drawSlab(g); break;
      case 'granite': this.drawGranite(g, rng); break;
      case 'glass': this.drawGlass(g, rng); break;
    }
    // Wobble around the base so taps sway the whole tower a little.
    this.body.pivot.set(0, 0);
    this.view.addChild(this.body);
    const top = this.variant === 'crown' ? this.h + 150 : this.variant === 'granite' ? this.h + 90 : this.h + 30;
    this.hits = [{ x: -this.w / 2, y: -top, w: this.w, h: top }];
    this.extent = [-this.w - 300, this.w + 300];
  }

  private drawCrown(g: Graphics, rng: () => number): void {
    const { w, h } = this;
    const L = this.look;
    block(g, -w / 2, -h, w, h, L.body, { landmark: true, shade: L.shade });
    windowGrid(g, -w / 2 + 12, -h + 20, w - 34, h - 50, rng, { scale: 1.6, lit: 0.15 });
    // lobby
    g.roundRect(-w * 0.3, -46, w * 0.6, 46, 4).fill(darken(L.body, 0.25));
    g.roundRect(-w * 0.26, -40, w * 0.52, 34, 3).fill({ color: P.warmWindow, alpha: 0.7 });
    // stepped crown: three tiers, each with a light band that can change color
    let tw = w * 0.86, ty = -h;
    for (let k = 0; k < 3; k++) {
      const th = 46;
      block(g, -tw / 2, ty - th, tw, th, L.trim, { landmark: true, shade: darken(L.trim, 0.1), radius: 4 });
      const band = new Graphics().roundRect(-tw / 2 + 8, ty - th + 16, tw - 16, 12, 6).fill(P.white);
      band.tint = CROWN_COLORS[k];
      this.bands.push(band);
      ty -= th;
      tw *= 0.72;
    }
    // spire
    g.roundRect(-4, ty - 60, 8, 62, 4).fill(L.trim);
    const tip = new Graphics().circle(0, ty - 64, 7).fill(P.white);
    tip.tint = CROWN_COLORS[3];
    this.bands.push(tip);
    this.body.addChild(...this.bands);
  }

  private drawSlab(g: Graphics): void {
    const { w, h } = this;
    const L = this.look;
    block(g, -w / 2, -h, w, h, L.body, { landmark: true, shade: L.shade });
    // white vertical fin on the left edge and a cap
    g.roundRect(-w / 2, -h, 10, h, 4).fill(lighten(L.body, 0.35));
    g.roundRect(-w / 2 - 6, -h - 12, w + 12, 14, 5).fill(L.trim);
    // floors as strips so a wave of light can run up them
    const pitch = 26;
    for (let y = -60; y > -h + 30; y -= pitch) {
      const f = new Graphics();
      for (let x = -w / 2 + 18; x < w / 2 - 14; x += 22) f.roundRect(x, 0, 16, 14, 3).fill(P.white);
      f.position.set(0, y - 14);
      f.tint = L.glass;
      f.alpha = 0.9;
      this.floors.push(f);
    }
    g.roundRect(-w * 0.35, -44, w * 0.7, 44, 4).fill(darken(L.body, 0.25));
    g.roundRect(-w * 0.3, -38, w * 0.6, 32, 3).fill({ color: P.warmWindow, alpha: 0.75 });
    this.body.addChild(...this.floors);
    // a few floors start lit
    this.floors.forEach((f, i) => i % 5 === 2 && (f.tint = P.warmWindow));
    const gl = new Graphics();
    slimGlint(gl, -w / 2 + 20, -h + 30, 26, h * 0.5, w, 0.18);
    this.body.addChild(gl);
  }

  private drawGranite(g: Graphics, rng: () => number): void {
    const { w, h } = this;
    const L = this.look;
    // base, shaft with setbacks, pyramid cap
    block(g, -w / 2, -h * 0.25, w, h * 0.25, L.body, { landmark: true, shade: L.shade });
    const w2 = w * 0.82;
    block(g, -w2 / 2, -h * 0.85, w2, h * 0.6 + 2, L.body, { landmark: true, shade: L.shade });
    const w3 = w * 0.62;
    block(g, -w3 / 2, -h, w3, h * 0.15 + 2, L.body, { landmark: true, shade: L.shade });
    g.poly([-w3 / 2 - 4, -h, 0, -h - 90, w3 / 2 + 4, -h]).fill(L.trim);
    g.poly([0, -h - 90, w3 / 2 + 4, -h, w3 * 0.22, -h]).fill(darken(L.trim, 0.1));
    // vertical ribs of windows
    for (let x = -w2 / 2 + 16; x < w2 / 2 - 14; x += 24) {
      g.roundRect(x, -h * 0.83, 10, h * 0.56, 4).fill({ color: darken(L.body, 0.18), alpha: 0.6 });
      for (let y = -h * 0.82; y < -h * 0.3; y += 30) if (rng() < 0.18) g.roundRect(x + 2, y, 6, 12, 2).fill(P.warmWindow);
    }
    // arched entrance
    g.roundRect(-30, -64, 60, 64, 4).fill(darken(L.body, 0.3));
    g.moveTo(-30, -64).arc(0, -64, 30, Math.PI, 0).closePath().fill(darken(L.body, 0.3));
    g.roundRect(-22, -70, 44, 60, 3).fill({ color: P.warmWindow, alpha: 0.6 });
    for (let x = -w / 2 + 20; x < w / 2 - 20; x += 40) if (Math.abs(x) > 40) g.roundRect(x, -h * 0.2, 16, h * 0.12, 3).fill(L.glass);
  }

  private drawGlass(g: Graphics, rng: () => number): void {
    const { w, h } = this;
    const L = this.look;
    // slanted roof: the right side is taller
    g.poly([-w / 2, -h + 40, w / 2, -h - 20, w / 2, 0, -w / 2, 0]).fill(L.body);
    g.poly([w / 2 - w * 0.28, -h - 20 + w * 0.28 * (60 / w), w / 2, -h - 20, w / 2, 0, w / 2 - w * 0.28, 0]).fill(L.shade);
    // a wide band of colored glass
    g.roundRect(-w / 2 + 16, -h + 70, w * 0.5, h - 120, 6).fill(L.glass);
    windowGrid(g, w * 0.05, -h + 60, w * 0.4, h - 110, rng, { scale: 1.5, lit: 0.12 });
    g.roundRect(-w * 0.3, -44, w * 0.6, 44, 4).fill(darken(L.glass, 0.2));
    this.shine = new Graphics();
    slimGlint(this.shine, -w / 2 + 24, -h + 80, 22, h - 140, w, 0.4);
    // Keep the glint (and its sweep on tap) on the glass: clip it to the tower's outline.
    const clip = new Graphics().poly([-w / 2, -h + 40, w / 2, -h - 20, w / 2, 0, -w / 2, 0]).fill(0xffffff);
    this.body.addChild(clip, this.shine);
    this.shine.mask = clip;
  }

  hintTarget(): Container {
    return this.body;
  }

  onTap(): void {
    const { sfx, tweens } = this.ctx;
    tweens.wobble(this.body, 0.006, 0.8, 0.01);
    switch (this.variant) {
      case 'crown':
        sfx.chime();
        this.chase = 2.5;
        break;
      case 'slab': {
        // A wave of lit windows runs up the floors, then fades back.
        const L = this.look;
        this.floors.forEach((f, i) => {
          tweens.after(i * 0.05, () => !f.destroyed && (f.tint = P.warmWindow));
          tweens.after(1.6 + i * 0.03, () => !f.destroyed && (f.tint = i % 5 === 2 ? P.warmWindow : L.glass));
        });
        [0, 1, 2, 3, 4].forEach((k) => tweens.after(k * 0.12, () => sfx.pluck(this.note + k, 0.1)));
        break;
      }
      case 'granite':
        sfx.bell();
        break;
      case 'glass': {
        sfx.sparkle();
        const s = this.shine;
        if (s) tweens.add(0.9, (p) => !s.destroyed && (s.x = p * this.w * 0.75, s.alpha = Math.sin(p * Math.PI) + 0.3));
        break;
      }
    }
  }

  update(dt: number): void {
    if (!this.bands.length) return;
    this.t += dt;
    this.chase = Math.max(0, this.chase - dt);
    // Slow color cycle normally; a fast rainbow chase after a tap.
    const speed = this.chase > 0 ? 8 : 0.4;
    this.bands.forEach((b, k) => {
      b.tint = CROWN_COLORS[Math.floor(this.t * speed + k) % CROWN_COLORS.length];
    });
  }
}

/** A window glint whose slant stays within the tower's width (tall towers made it overshoot). */
function slimGlint(g: Graphics, x: number, y: number, w: number, h: number, towerW: number, alpha: number): void {
  const s = Math.min(h * 0.45, towerW * 0.3);
  g.poly([x + s, y, x + s + w, y, x + w, y + h, x, y + h]).fill({ color: P.white, alpha });
}
