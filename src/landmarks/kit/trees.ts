// Trees for city streets (tappable).
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { palmetto } from '../../style/shapes';

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

