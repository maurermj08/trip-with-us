// Jacksonville's blue vertical-lift bridge (Main Street style), standing in the St. Johns River
// behind the road crossing. Tap: crossing bells, the span lifts while counterweights drop.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { ease } from '../../core/Tween';
import { roadHeight } from '../../world/Terrain';
import { ROAD_FAR } from '../../world/Road';

const BLUE = 0x2f7fd0;
const BLUE_DARK = 0x2566ad;
const PIER = 0xd2d6db;

/** A tower of steel: two legs with X-bracing. */
function trussTower(g: Graphics, cx: number, top: number, bottom: number, w: number): void {
  const leg = 10;
  g.roundRect(cx - w / 2, top, leg, bottom - top, 3).fill(BLUE);
  g.roundRect(cx + w / 2 - leg, top, leg, bottom - top, 3).fill(BLUE_DARK);
  for (let y = top + 20; y < bottom - 40; y += 60) {
    g.moveTo(cx - w / 2 + leg, y).lineTo(cx + w / 2 - leg, y + 60).stroke({ width: 4, color: BLUE, cap: 'round' });
    g.moveTo(cx + w / 2 - leg, y).lineTo(cx - w / 2 + leg, y + 60).stroke({ width: 4, color: BLUE, cap: 'round' });
    g.rect(cx - w / 2 + leg, y, w - leg * 2, 4).fill(BLUE);
  }
}

/** A flat Pratt truss span. */
function truss(g: Graphics, x0: number, y: number, len: number, h: number, curvedTop = false): void {
  const chord = 8;
  g.roundRect(x0, y + h - chord, len, chord, 3).fill(BLUE);
  if (curvedTop) {
    g.moveTo(x0, y + h - chord).quadraticCurveTo(x0 + len / 2, y - h * 0.4, x0 + len, y + h - chord).stroke({ width: chord, color: BLUE, cap: 'round' });
  } else {
    g.roundRect(x0, y, len, chord, 3).fill(BLUE);
  }
  const n = Math.max(2, Math.round(len / 56));
  for (let k = 0; k <= n; k++) {
    const vx = x0 + (k / n) * len;
    const topY = curvedTop ? y + h - chord - Math.sin((k / n) * Math.PI) * h * 0.7 : y;
    g.rect(vx - 2, topY, 4, y + h - topY).fill(BLUE_DARK);
    if (k < n) {
      const nx = x0 + ((k + 1) / n) * len;
      g.moveTo(vx, topY).lineTo(nx, y + h - chord).stroke({ width: 3, color: BLUE, alpha: 0.9 });
    }
  }
}

export class LiftBridge extends Prop {
  private span = new Container();
  private weights: Container[] = [];
  private lifted = false;
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 0);
    this.layer = 'back';
    const roadDeck = -roadHeight(x) + ROAD_FAR;
    const deck = roadDeck - 46; // just above the road bridge's barrier
    const towerTop = deck - 320;
    const gap = 620; // between the towers
    const g = new Graphics();
    // Piers in the river and approach trusses on both sides.
    for (const px of [-gap / 2 - 560, -gap / 2, gap / 2, gap / 2 + 560]) g.roundRect(px - 18, deck + 40, 36, 120, 6).fill(PIER);
    truss(g, -gap / 2 - 560, deck - 70, 520, 78, true);
    truss(g, gap / 2 + 40, deck - 70, 520, 78, true);
    // The towers (with machine houses on top).
    for (const tx of [-gap / 2, gap / 2]) {
      trussTower(g, tx, towerTop, deck + 40, 74);
      g.roundRect(tx - 46, towerTop - 38, 92, 40, 8).fill(BLUE);
      g.roundRect(tx - 46, towerTop - 38, 92, 3, 1.5).fill({ color: 0xffffff, alpha: 0.4 });
      g.roundRect(tx - 30, towerTop - 28, 18, 14, 3).fill(0xcfe4f2);
      g.roundRect(tx + 6, towerTop - 28, 18, 14, 3).fill(0xcfe4f2);
      // counterweight (moves opposite to the span)
      const w = new Container();
      w.addChild(new Graphics().roundRect(-24, 0, 48, 40, 6).fill(0x9aa3ad));
      w.position.set(tx, towerTop + 20);
      this.weights.push(w);
    }
    this.view.addChild(g, ...this.weights);
    // The lift span between the towers.
    const sg = new Graphics();
    truss(sg, -gap / 2 + 30, 0, gap - 60, 64);
    this.span.addChild(sg);
    this.span.y = deck - 64;
    this.view.addChild(this.span);
    this.hits = [{ x: -gap / 2 - 600, y: towerTop - 40, w: gap + 1200, h: deck - towerTop + 120 }];
    this.extent = [-1400, 1400];
  }

  hintTarget(): Container {
    return this.span;
  }

  onTap(): void {
    if (this.busy) return;
    this.busy = true;
    const sfx = this.ctx.sfx;
    [0, 0.25, 0.5].forEach((d) => this.ctx.tweens.after(d, () => sfx.crossingBell()));
    const y0 = this.span.y;
    const w0 = this.weights.map((w) => w.y);
    const lift = 220;
    const move = (p: number) => {
      if (this.span.destroyed) return;
      this.span.y = y0 - lift * p;
      this.weights.forEach((w, i) => (w.y = w0[i] + lift * 0.9 * p));
    };
    this.ctx.tweens.add(1.6, (p) => move(p), { ease: ease.inOutSine, delay: 0.4 });
    this.ctx.tweens.add(1.6, (p) => move(1 - p), {
      ease: ease.inOutSine, delay: 3.2,
      done: () => {
        this.busy = false;
        sfx.thump(0.3);
      },
    });
    this.lifted = !this.lifted;
  }
}
