// Arlington Memorial Bridge into Washington: our road is its deck. Road.ts draws the granite
// arches and balustrade; this adds the bridge's ornate lamp posts and the gilded pylons (simple
// gold-capped columns with eagles) that stand at both ends.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P } from '../../style/palette';
import { block, contactShadow } from '../../style/shapes';
import { roadHeight } from '../../world/Terrain';
import { ROAD_FAR, ROAD_NEAR } from '../../world/Road';
import type { BridgeSpec } from '../../world/Route';

const GOLD = 0xe2b33c;
const GOLD_DARK = 0xc8952a;
const GRANITE = 0xe2dccd;
const GRANITE_SHADE = 0xcdc5b2;
const IRON = 0x3b4148;

/** A stylized golden eagle with raised wings (origin at its feet). */
function eagle(g: Graphics, s: number): void {
  g.poly([-4 * s, -18 * s, -34 * s, -46 * s, -26 * s, -22 * s, -10 * s, -12 * s]).fill(GOLD);
  g.poly([4 * s, -18 * s, 34 * s, -46 * s, 26 * s, -22 * s, 10 * s, -12 * s]).fill(GOLD_DARK);
  g.ellipse(0, -14 * s, 9 * s, 14 * s).fill(GOLD);
  g.circle(2 * s, -30 * s, 6 * s).fill(GOLD);
  g.poly([7 * s, -31 * s, 13 * s, -29 * s, 7 * s, -27 * s]).fill(GOLD_DARK);
  g.circle(3 * s, -31 * s, 1.2 * s).fill(0x5a3a10);
  g.poly([-6 * s, -2 * s, 0, 4 * s, 6 * s, -2 * s]).fill(GOLD_DARK);
}

// ---------- A gilded pylon: granite pedestal, fluted column, gold capital and eagle ----------
export class GildedPylon extends Prop {
  private top = new Container();
  private shine = new Graphics();

  constructor(ctx: Ctx, x: number, front: boolean, private s = 1) {
    super(ctx, x, front ? ROAD_NEAR + 26 : ROAD_FAR - 10);
    this.layer = front ? 'front' : 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 120 * s);
    block(g, -44 * s, -64 * s, 88 * s, 64 * s, GRANITE, { landmark: true, shade: GRANITE_SHADE, radius: 4 });
    g.roundRect(-50 * s, -70 * s, 100 * s, 10 * s, 4).fill(GRANITE);
    block(g, -20 * s, -250 * s, 40 * s, 182 * s, GRANITE, { landmark: true, shade: GRANITE_SHADE, radius: 6 });
    for (const fx of [-11, -3, 5]) g.rect(fx * s, -244 * s, 2 * s, 170 * s).fill({ color: P.black, alpha: 0.06 });
    // gold capital and wreath
    g.roundRect(-28 * s, -262 * s, 56 * s, 14 * s, 5 * s).fill(GOLD);
    g.roundRect(-28 * s + 56 * s * 0.72, -262 * s, 56 * s * 0.28, 14 * s, 5 * s).fill(GOLD_DARK);
    g.circle(0, -150 * s, 13 * s).fill(GOLD);
    g.circle(0, -150 * s, 7 * s).fill(GRANITE);
    this.view.addChild(g);
    const e = new Graphics();
    eagle(e, 1.15 * s);
    this.top.addChild(e);
    this.top.position.set(0, -262 * s);
    this.view.addChild(this.top);
    // a gleam that sweeps over the gold on tap
    this.shine.poly([-8, -40, 4, -40, -4, 20, -16, 20]).fill({ color: P.white, alpha: 0.7 });
    this.shine.position.set(-40 * s, -270 * s);
    this.shine.alpha = 0;
    this.view.addChild(this.shine);
    this.hits = [{ x: -50 * s, y: -330 * s, w: 100 * s, h: 330 * s }];
    this.extent = [-400, 400];
  }

  hintTarget(): Container {
    return this.top;
  }

  onTap(): void {
    this.ctx.sfx.chime();
    this.ctx.tweens.wobble(this.top, 0.08, 0.8, 0.06);
    const sh = this.shine;
    this.ctx.tweens.add(0.7, (p) => {
      if (sh.destroyed) return;
      sh.x = (-40 + 80 * p) * this.s;
      sh.alpha = Math.sin(p * Math.PI);
    });
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 300 * this.s, count: 10, shape: 'star', tint: [GOLD, 0xfff1a8, P.white], speed: [80, 220], gravity: 120, life: [0.6, 1.0], size: [8, 14] });
  }
}

// ---------- The bridge's lamp posts, standing behind the far balustrade ----------
export class MemorialLamps extends Prop {
  private globes: Graphics[] = [];
  private busy = false;

  constructor(ctx: Ctx, private spec: BridgeSpec) {
    super(ctx, spec.start, 0);
    this.layer = 'back';
    const g = new Graphics();
    const len = spec.end - spec.start;
    for (let lx = 260; lx < len - 200; lx += 380) {
      const base = -roadHeight(spec.start + lx) + ROAD_FAR - 24;
      g.roundRect(lx - 9, base - 14, 18, 14, 3).fill(IRON);
      g.roundRect(lx - 3.5, base - 120, 7, 108, 3).fill(IRON);
      g.roundRect(lx - 6, base - 70, 12, 8, 3).fill(IRON);
      // twin arms with lanterns
      g.moveTo(lx, base - 112).quadraticCurveTo(lx - 22, base - 118, lx - 24, base - 104).stroke({ width: 3, color: IRON, cap: 'round' });
      g.moveTo(lx, base - 112).quadraticCurveTo(lx + 22, base - 118, lx + 24, base - 104).stroke({ width: 3, color: IRON, cap: 'round' });
      g.roundRect(lx - 4, base - 132, 8, 14, 3).fill(IRON);
      for (const ax of [-24, 0, 24]) {
        const y = ax === 0 ? base - 138 : base - 104;
        const glb = new Graphics().circle(0, 0, 8).fill(0xfff4cf);
        glb.position.set(lx + ax, y);
        glb.alpha = 0.85;
        this.globes.push(glb);
      }
    }
    this.view.addChild(g, ...this.globes);
    this.hits = [{ x: 0, y: -roadHeight(spec.start + len / 2) + ROAD_FAR - 170, w: len, h: 150 }];
    this.extent = [-300, len + 300];
  }

  onTap(wx: number): void {
    if (this.busy) return;
    this.busy = true;
    this.ctx.sfx.chime();
    // a wave of light runs along the lamps from the one you tapped
    const lx = wx - this.view.x;
    this.globes.forEach((glb) => {
      const d = Math.abs(glb.x - lx) / 400;
      this.ctx.tweens.add(0.6, (p) => {
        if (glb.destroyed) return;
        glb.tint = p < 1 ? 0xfff1a8 : 0xffffff;
        glb.scale.set(1 + Math.sin(p * Math.PI) * 0.5);
        glb.alpha = 0.85 + Math.sin(p * Math.PI) * 0.15;
      }, { delay: d * 0.3 });
    });
    this.ctx.tweens.after(1.6, () => (this.busy = false));
    void this.spec;
  }
}

export function buildMemorial(ctx: Ctx, spec: BridgeSpec): Prop[] {
  const a = spec.start + 130, b = spec.end - 130;
  return [
    new MemorialLamps(ctx, spec),
    new GildedPylon(ctx, a, false, 0.9),
    new GildedPylon(ctx, b, false, 0.9),
    new GildedPylon(ctx, a + 60, true, 0.72),
    new GildedPylon(ctx, b - 60, true, 0.72),
  ];
}
