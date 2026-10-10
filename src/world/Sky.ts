import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { P, hex, lerpColor } from '../style/palette';

function gradientTexture(stops: [number, number][]): Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  for (const [o, col] of stops) grad.addColorStop(o, hex(col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  return Texture.from(c);
}

/**
 * Screen-fixed sky: day gradient with morning, golden-hour and dusk gradients crossfaded on top.
 * Also provides the matching tint for the scene so everything warms up together.
 */
export class Sky extends Container {
  private base = new Graphics();
  private day = new Sprite(gradientTexture([[0, P.skyTop], [1, P.skyBottom]]));
  private morn = new Sprite(gradientTexture([[0, P.mornTop], [1, P.mornBottom]]));
  private gold = new Sprite(gradientTexture([[0, P.goldTop], [1, P.goldBottom]]));
  private dusk = new Sprite(gradientTexture([[0, P.duskTop], [0.6, P.duskMid], [1, P.duskBottom]]));

  constructor() {
    super();
    this.gold.alpha = 0;
    this.dusk.alpha = 0;
    this.addChild(this.base, this.day, this.morn, this.gold, this.dusk);
  }

  /** horizonY: screen y (design units) where the gradient ends. */
  resize(viewW: number, viewH: number, horizonY: number): void {
    this.base.clear().rect(0, 0, viewW, viewH).fill(P.skyBottom);
    for (const s of [this.day, this.morn, this.gold, this.dusk]) {
      s.width = viewW;
      s.height = horizonY + 40;
    }
  }

  /** morning, gold, dusk: 0..1. Returns the tint to apply to the scene. */
  update(morning: number, gold: number, dusk: number): number {
    this.morn.alpha = morning;
    this.gold.alpha = gold;
    this.dusk.alpha = dusk;
    const day = lerpColor(lerpColor(0xffffff, 0xfff6ee, morning), 0xfff0dc, gold);
    return lerpColor(day, 0xe6d2e4, dusk);
  }
}
