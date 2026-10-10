// Temporary end-of-trip restart button (a placeholder until a nicer ending flow is designed).
// A round button with a circular arrow drawn as a shape: no text, per the design pillars.
import { Container, Graphics } from 'pixi.js';
import { ease, type Tweens } from '../core/Tween';
import { P } from '../style/palette';

const R = 44;
const MARGIN = 24;

export class RestartButton extends Container {
  private shown = false;
  private icon = new Container();
  private spin = 0;

  constructor(private tweens: Tweens) {
    super();
    const g = new Graphics();
    g.circle(0, 4, R).fill({ color: P.black, alpha: 0.18 });
    g.circle(0, 0, R).fill(P.white);
    g.circle(0, 0, R - 6).fill(0x2f80d1);
    g.ellipse(-12, -16, 16, 9).fill({ color: P.white, alpha: 0.25 });
    // circular arrow: an open ring plus an arrowhead
    const a = new Graphics();
    a.arc(0, 0, 18, -Math.PI * 0.35, Math.PI * 1.45).stroke({ width: 7, color: P.white, cap: 'round' });
    const tip = { x: Math.cos(-Math.PI * 0.35) * 18, y: Math.sin(-Math.PI * 0.35) * 18 };
    a.poly([tip.x - 9, tip.y - 7, tip.x + 9, tip.y - 2, tip.x - 2, tip.y + 11]).fill(P.white);
    this.icon.addChild(a);
    this.addChild(g, this.icon);
    this.visible = false;
    this.scale.set(0);
  }

  layout(viewW: number): void {
    this.position.set(viewW - MARGIN - R, MARGIN + R);
  }

  /** Pop in / out. */
  setShown(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    if (on) {
      this.visible = true;
      this.tweens.add(0.45, (p) => !this.destroyed && this.scale.set(p), { ease: ease.outBack });
    } else {
      this.visible = false;
      this.scale.set(0);
    }
  }

  get isShown(): boolean {
    return this.shown;
  }

  /** Design-unit hit test (generous for small fingers). */
  hit(sx: number, sy: number): boolean {
    return this.shown && Math.hypot(sx - this.x, sy - this.y) < R + 14;
  }

  press(): void {
    this.tweens.add(0.35, (p) => !this.destroyed && this.scale.set(1 - Math.sin(p * Math.PI) * 0.2));
  }

  update(dt: number): void {
    if (!this.shown) return;
    // a gentle idle wiggle so it reads as tappable
    this.spin += dt;
    this.icon.rotation = Math.sin(this.spin * 2) * 0.12;
  }
}
