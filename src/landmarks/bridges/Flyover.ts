// Orlando's I-4 flyover: the road climbs onto a viaduct into downtown. Behind it, a second,
// higher ramp curves past on round columns, with a green overhead "DOWNTOWN" sign.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P } from '../../style/palette';
import { R } from '../../style/shapes';
import { signText, greenPanel, routeMarker } from '../../signs/Signs';
import type { BridgeSpec } from '../../world/Route';

export class FlyoverRamp extends Prop {
  private zoomCar = new Container();
  private zooming = false;
  private rampY: (lx: number) => number;
  private len: number;
  private sign = new Container();

  constructor(ctx: Ctx, spec: BridgeSpec) {
    super(ctx, spec.start, -70);
    this.layer = 'back';
    const len = (this.len = spec.end - spec.start);
    const peak = spec.top + 120; // the upper ramp rides higher than our road
    this.rampY = (lx: number) => -peak * Math.sin(Math.max(0, Math.min(1, lx / len)) * Math.PI);
    const g = new Graphics();
    // Columns.
    for (let lx = 400; lx < len - 300; lx += 520) {
      const y = this.rampY(lx);
      g.roundRect(lx - 14, y + 18, 28, -y - 10, 12).fill(0xd2d6db);
      g.rect(lx + 14 - 8, y + 18, 8, -y - 10).fill({ color: P.black, alpha: 0.07 });
    }
    // Deck band with its barrier, sampled along the curve.
    const top: number[] = [];
    const bottom: number[] = [];
    for (let lx = 0; lx <= len; lx += 40) {
      const y = this.rampY(lx);
      top.push(lx, y - 16);
      bottom.unshift(lx, y + 20);
    }
    g.poly([...top, ...bottom]).fill(0xc9ced5);
    const lip: number[] = [];
    const lipB: number[] = [];
    for (let lx = 0; lx <= len; lx += 40) {
      lip.push(lx, this.rampY(lx) - 16);
      lipB.unshift(lx, this.rampY(lx) - 12);
    }
    g.poly([...lip, ...lipB]).fill({ color: P.white, alpha: 0.6 });
    this.view.addChild(g);

    // A tiny car that zooms along the upper ramp when tapped (no face).
    const c = new Graphics();
    c.roundRect(-28, -22, 56, 16, 7).fill(0xe94b3c);
    c.roundRect(-16, -32, 30, 12, 6).fill(0xe94b3c);
    c.roundRect(-12, -30, 22, 8, 3).fill(0xcfe4f2);
    c.circle(-16, -6, 6).fill(0x24262a);
    c.circle(16, -6, 6).fill(0x24262a);
    this.zoomCar.addChild(c);
    this.zoomCar.visible = false;
    this.view.addChild(this.zoomCar);

    // Overhead green sign at the top of the climb (hangs over our road).
    const sg = new Graphics();
    const mid = len * 0.5;
    const deck = -(spec.top) - 44 + 70; // our road's far edge at the top, in this view's space
    sg.roundRect(mid - 6, deck - 330, 12, 330, 4).fill(P.signPost);
    sg.roundRect(mid - 6, deck - 334, 260, 12, 4).fill(P.signPost);
    greenPanel(sg, mid + 20, deck - 322, 230, 96);
    this.sign.addChild(sg);
    const sh = routeMarker('4', 0.55);
    sh.position.set(mid + 62, deck - 236);
    const t = signText('DOWNTOWN', 22);
    t.position.set(mid + 158, deck - 274);
    this.sign.addChild(sh, t);
    this.view.addChild(this.sign);

    this.hits = [{ x: 0, y: -peak - 30, w: len, h: peak + 30 }];
    this.extent = [-200, len + 200];
    void R;
  }

  onTap(wx: number): void {
    const lx = wx - this.view.x;
    if (Math.abs(lx - this.len * 0.5 - 130) < 140) {
      this.ctx.sfx.chime();
      this.ctx.tweens.wobble(this.sign, 0.02, 0.6, 0.02);
      return;
    }
    if (this.zooming) return;
    this.zooming = true;
    this.zoomCar.visible = true;
    this.ctx.sfx.whoosh();
    this.ctx.tweens.add(2.2, (p) => {
      if (this.zoomCar.destroyed) return;
      const x = p * this.len;
      this.zoomCar.position.set(x, this.rampY(x) - 16);
      const dx = 20;
      this.zoomCar.rotation = Math.atan2(this.rampY(x + dx) - this.rampY(x - dx), dx * 2);
    }, {
      done: () => {
        this.zooming = false;
        if (!this.zoomCar.destroyed) this.zoomCar.visible = false;
      },
    });
  }
}
