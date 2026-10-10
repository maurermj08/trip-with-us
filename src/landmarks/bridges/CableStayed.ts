// Cable-stayed bridge pylons with cable fans: the Ravenel (Charleston) and the Talmadge (Savannah).
import { Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { roadHeight } from '../../world/Terrain';
import { ROAD_FAR } from '../../world/Road';

export interface PylonStyle {
  /** Height above the deck. */
  height: number;
  /** Pointed diamond top (Ravenel) or flat-topped tapered column (Talmadge). */
  top: 'diamond' | 'flat';
  color: number;
  shade: number;
  cables: number;
  /** Where cables anchor on the pylon (from its top) and how far apart. */
  anchor0: number;
  anchorStep: number;
  /** Horizontal reach of the first cable and the step between cables. */
  reach0: number;
  reachStep: number;
  /** Red aviation beacon on top. */
  beacon: boolean;
}

export const RAVENEL: PylonStyle = {
  height: 440, top: 'diamond', color: 0xe3e7ec, shade: 0xd2d7dd, cables: 11, anchor0: 40, anchorStep: 14, reach0: 90, reachStep: 62, beacon: false,
};

export const TALMADGE: PylonStyle = {
  height: 320, top: 'flat', color: 0xdcd9d1, shade: 0xc9c5bb, cables: 9, anchor0: 24, anchorStep: 13, reach0: 70, reachStep: 58, beacon: true,
};

export class BridgeTower extends Prop {
  private lights: Graphics[] = [];
  private cables: Graphics[] = [];
  private beacon: Graphics | null = null;
  private t = 0;

  constructor(ctx: Ctx, x: number, private style: PylonStyle = RAVENEL) {
    super(ctx, x, 0);
    this.layer = 'back';
    const s = style;
    const deckY = -roadHeight(x) + ROAD_FAR;
    const top = deckY - s.height;
    const base = 70;
    // Cable fans (thin, so they read as cables). One Graphics per cable row so they can shimmer.
    for (let k = 0; k < s.cables; k++) {
      const c = new Graphics();
      const ay = top + s.anchor0 + k * s.anchorStep;
      for (const side of [-1, 1]) {
        const dx = side * (s.reach0 + k * s.reachStep);
        const dy = -roadHeight(x + dx) + ROAD_FAR;
        c.moveTo(0, ay).lineTo(dx, dy).stroke({ width: 2, color: 0xeef2f6, alpha: 0.95 });
      }
      this.cables.push(c);
      this.view.addChild(c);
    }
    const g = new Graphics();
    if (s.top === 'diamond') {
      // Tapered diamond-ish pylon (two legs seen edge-on).
      g.poly([-30, base, -12, top + 20, 0, top, 12, top + 20, 30, base]).fill(s.color);
      g.poly([4, top + 6, 12, top + 20, 30, base, 12, base]).fill(s.shade);
      g.roundRect(-6, top - 4, 12, 30, 4).fill(0xf2f4f7);
    } else {
      // Flat-topped tapered column (the H-frame's two legs overlap in side view).
      g.poly([-23, base, -15, top + 4, 15, top + 4, 23, base]).fill(s.color);
      g.poly([15 - 30 * 0.28, top + 4, 15, top + 4, 23, base, 23 - 46 * 0.28, base]).fill(s.shade);
      g.roundRect(-18, top - 8, 36, 12, 4).fill(0xeeece6);
      g.roundRect(-18, top - 8, 36, 3, 1.5).fill({ color: 0xffffff, alpha: 0.45 });
      // Lighter band hinting at the crossbeam below the deck.
      g.roundRect(-24, deckY + 22, 48, 10, 3).fill(0xe6e3dc);
    }
    g.roundRect(-40, deckY + 30, 80, 16, 4).fill(0xc7ccd3);
    this.view.addChild(g);
    for (let k = 0; k < 6; k++) {
      const l = new Graphics().circle(0, 0, 3.5).fill(0xfff1a8);
      l.position.set(0, top + 30 + k * ((s.height - 60) / 6));
      l.alpha = 0.25;
      this.lights.push(l);
      this.view.addChild(l);
    }
    if (s.beacon) {
      this.beacon = new Graphics().circle(0, 0, 5).fill(0xe5483f);
      this.beacon.position.set(0, top - 12);
      this.view.addChild(this.beacon);
    }
    this.hits = [{ x: -40, y: top - 16, w: 80, h: base - top + 16 }];
    this.extent = [-800, 800];
  }

  onTap(): void {
    if (this.style.beacon) {
      // Talmadge: the cables shimmer top to bottom with a harp run.
      this.ctx.sfx.harp();
      this.cables.forEach((c, k) => this.ctx.tweens.add(0.5, (p) => !c.destroyed && (c.alpha = 1 - Math.sin(p * Math.PI) * 0.7), { delay: k * 0.04 }));
    } else {
      this.ctx.sfx.chime();
    }
    this.lights.forEach((l, k) => {
      this.ctx.tweens.add(0.6, (p) => !l.destroyed && (l.alpha = 0.25 + Math.sin(p * Math.PI) * 0.75), { delay: (5 - k) * 0.08 });
    });
    this.ctx.tweens.wobble(this.view, 0.004, 0.6, 0);
  }

  update(dt: number): void {
    if (!this.beacon) return;
    this.t += dt;
    this.beacon.alpha = 0.35 + 0.65 * (Math.sin(this.t * Math.PI * 2) > 0 ? 1 : 0);
  }
}
