import { Graphics } from 'pixi.js';
import { ease, type Tweens } from '../core/Tween';
import type { Sfx } from '../audio/Sfx';

const IRIS_COLOR = 0x23264a;

/** Classic iris wipe: closes on a point, runs `midpoint` while black, then reopens. */
export class Iris extends Graphics {
  private r = -1;
  busy = false;

  constructor(private tweens: Tweens, private sfx: Sfx) {
    super();
  }

  /**
   * `midpoint` runs while the screen is fully closed; if it returns a promise (e.g. building
   * vehicle art) the iris stays shut until it resolves. It may clear tweens: the reopen is
   * scheduled after it runs.
   */
  play(maxR: number, midpoint: () => void | Promise<void>, done?: () => void): void {
    if (this.busy) return;
    this.busy = true;
    this.sfx.irisClose();
    this.r = maxR;
    this.tweens.add(0.9, (p) => (this.r = maxR * (1 - p)), {
      ease: ease.inQuad,
      done: async () => {
        this.r = 0;
        try {
          await midpoint();
        } catch (e) {
          console.error(e);
        }
        this.tweens.after(0.3, () => this.sfx.irisOpen());
        this.tweens.add(0.9, (p) => (this.r = maxR * p), {
          ease: ease.outQuad,
          delay: 0.3,
          done: () => {
            this.r = -1;
            this.busy = false;
            done?.();
          },
        });
      },
    });
  }

  /** Redraw centered on (cx, cy) in screen design units. */
  draw(viewW: number, viewH: number, cx: number, cy: number): void {
    this.clear();
    if (this.r < 0) return;
    // A thick ring instead of a rect with a cut-out hole: holes that reach past the
    // rect's edges triangulate badly.
    const far = Math.max(Math.hypot(cx, cy), Math.hypot(viewW - cx, cy), Math.hypot(cx, viewH - cy), Math.hypot(viewW - cx, viewH - cy)) + 4;
    if (this.r <= 1) this.rect(0, 0, viewW, viewH).fill(IRIS_COLOR);
    else if (this.r < far) this.circle(cx, cy, (this.r + far) / 2).stroke({ width: far - this.r, color: IRIS_COLOR });
  }
}
