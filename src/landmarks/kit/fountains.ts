// City fountains: each has a sculpture, constant water, and a big splash on tap.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P } from '../../style/palette';
import { block, contactShadow } from '../../style/shapes';
import { WALK } from './common';

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

