import { Container } from 'pixi.js';
import type { Ctx } from '../core/Ctx';

export type PropLayer = 'back' | 'roadDecor' | 'mid' | 'front';

export interface HitRect { x: number; y: number; w: number; h: number }

/**
 * Anything in the world that reacts to a tap and/or the car driving through it.
 * Contact never stops the car: no penalties, no damage.
 */
export abstract class Prop {
  readonly view = new Container();
  /** Local hit rectangles (relative to view position). */
  hits: HitRect[] = [];
  /** Half-width of the drive-through zone; 0 = not bumpable. */
  bumpHalf = 0;
  /** Car must be lower than this (height above road) to bump. */
  bumpHeight = 80;
  carInside = false;
  /** Visible extent for culling, relative to x. */
  extent: [number, number] = [-300, 300];
  layer: PropLayer = 'mid';

  constructor(protected ctx: Ctx, public x: number, public y = 0) {
    this.view.position.set(x, y);
  }

  hitTest(wx: number, wy: number, pad = 18): boolean {
    const lx = wx - this.view.x, ly = wy - this.view.y;
    for (const r of this.hits) {
      if (lx >= r.x - pad && lx <= r.x + r.w + pad && ly >= r.y - pad && ly <= r.y + r.h + pad) return true;
    }
    return false;
  }

  /** The thing to jiggle as an idle hint. */
  hintTarget(): Container {
    return this.view;
  }

  jiggle(): void {
    this.ctx.tweens.wobble(this.hintTarget(), 0.1, 0.7, 0.08);
  }

  onTap(_wx: number, _wy: number): void {
    this.jiggle();
    this.ctx.sfx.boing();
  }

  onBump(): void {}
  onLeave(): void {}
  update(_dt: number): void {}

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
