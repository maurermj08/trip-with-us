import { Graphics } from 'pixi.js';
import { ease, type Tweens } from '../core/Tween';
import type { Sfx } from '../audio/Sfx';

/** Classic iris wipe: closes on a point, runs `midpoint` while black, then reopens. */
export class Iris extends Graphics {
  private r = -1;
  busy = false;

  constructor(private tweens: Tweens, private sfx: Sfx) {
    super();
  }

  /** Note: `midpoint` usually clears tweens, so the reopen is scheduled after it runs. */
  play(maxR: number, midpoint: () => void, done?: () => void): void {
    if (this.busy) return;
    this.busy = true;
    this.sfx.irisClose();
    this.r = maxR;
    this.tweens.add(0.9, (p) => (this.r = maxR * (1 - p)), {
      ease: ease.inQuad,
      done: () => {
        midpoint();
        this.r = 0;
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
    this.rect(0, 0, viewW, viewH).fill(0x23264a);
    if (this.r > 1) this.circle(cx, cy, this.r).cut();
  }
}
