import { Graphics, type Container } from 'pixi.js';
import type { Tweens } from './Tween';
import type { Sfx } from '../audio/Sfx';
import { P } from '../style/palette';

const IDLE_HINT_AFTER = 6;
const HINT_EVERY = 3.2;
const GO_HINT_DUR = 1.6;

/**
 * Scaffold, don't instruct: when the child pauses, the next touchable thing jiggles.
 * Also draws the "go this way" chevron pulse on the right edge (a shape, never text).
 */
export class IdleHinter {
  readonly goHint = new Graphics();
  private idle = 0;
  private clock = 0;
  private goT = 0;
  private time = 0;

  constructor(private tweens: Tweens, private sfx: Sfx) {}

  poke(): void {
    this.idle = 0;
    this.clock = 0;
  }

  showGoHint(): void {
    this.goT = GO_HINT_DUR;
  }

  reset(): void {
    this.poke();
    this.goT = 0;
  }

  /** `targets` is only called when a hint is due. `active` false pauses hinting (touching, transitions). */
  update(dt: number, active: boolean, targets: () => Container[], viewW: number, groundY: number): void {
    this.time += dt;
    this.idle += dt;
    if (this.idle > IDLE_HINT_AFTER && active) {
      this.clock -= dt;
      if (this.clock <= 0) {
        this.clock = HINT_EVERY;
        for (const t of targets()) this.tweens.wobble(t, 0.1, 0.8, 0.1);
        this.sfx.tick();
      }
    }

    this.goT = Math.max(0, this.goT - dt);
    const g = this.goHint;
    g.clear();
    if (this.goT <= 0) return;
    const a = Math.sin((1 - this.goT / GO_HINT_DUR) * Math.PI) * 0.55;
    const x = viewW - 70 + Math.sin(this.time * 8) * 6;
    const y = groundY - 120;
    for (let k = 0; k < 2; k++) {
      const ox = x + k * 26;
      g.moveTo(ox - 12, y - 26).lineTo(ox + 12, y).lineTo(ox - 12, y + 26)
        .stroke({ width: 10, color: P.white, alpha: a * (k ? 0.6 : 1), cap: 'round', join: 'round' });
    }
  }
}
