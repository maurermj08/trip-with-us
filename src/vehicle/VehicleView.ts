// Any vehicle, built from its art (see src/vehicle/art). Facing right, origin on the ground
// midway between the bumpers. Body squashed 96%/107%, wheels 12% oversize and kept round.
import { Container, Graphics, Sprite } from 'pixi.js';
import { STYLE, type VehicleDims } from './art/schema';
import type { Part, VehicleBuild } from './art/VehicleBuild';

const AMBER = 0xffa62b;

function partSprite(p: Part): Sprite {
  const s = new Sprite(p.tex);
  s.position.set(p.x, p.y);
  return s;
}

export interface VehicleViewOptions {
  /** Lab only: draw at true proportions (no squash, no wheel oversize) to compare with photos. */
  trueProportions?: boolean;
}

export class VehicleView extends Container {
  readonly tilt = new Container();
  readonly spring = new Container();
  /** Squashed container holding the body art. */
  readonly bodyBox = new Container();
  /** Roof cargo mount (suitcase, snack bags). Children stack on top of roof accessories. */
  readonly roof = new Container();
  readonly dims: VehicleDims;
  private scaled = new Container();
  private wheels: Sprite[] = [];
  private mud: Sprite;
  private wet: Sprite;
  private headGlow = new Graphics();
  private tailGlow = new Graphics();
  private hazards: Graphics[] = [];

  private springY = 0;
  private springV = 0;
  private flash = 0;
  private hazardOn = false;
  private hazardT = 0;
  wetness = 0;
  muddiness = 0;
  braking = false;
  pitch = 0;

  constructor(readonly build: VehicleBuild, opts: VehicleViewOptions = {}) {
    super();
    const d = (this.dims = build.dims);
    const gs = build.gameScale;
    const true_ = !!opts.trueProportions;
    this.addChild(this.tilt);
    this.tilt.addChild(this.spring);

    // Body + baked overlays, squashed by the style rule. Hitch accessories sit behind the body.
    this.scaled.scale.set(gs);
    this.bodyBox.scale.set(true_ ? 1 : STYLE.squashX, true_ ? 1 : STYLE.squashY);
    const roofBase = new Container();
    for (const a of build.accessories) {
      const s = partSprite(a);
      if (a.def.mount === 'hitch') {
        s.position.set(build.measure.hitch?.x ?? build.measure.body.x0, build.measure.hitch?.y ?? -20);
        s.x += a.x;
        s.y += a.y;
        this.bodyBox.addChild(s);
      } else {
        s.position.set(build.measure.roof.x + a.x, build.measure.roof.y + a.y);
        roofBase.addChild(s);
      }
    }
    this.mud = partSprite(build.mud);
    this.wet = partSprite(build.wet);
    this.mud.alpha = 0;
    this.wet.alpha = 0;
    this.bodyBox.addChild(partSprite(build.body), this.mud, this.wet, roofBase);
    this.scaled.addChild(this.bodyBox);

    this.headGlow.circle(0, 0, 1).fill({ color: 0xfff1a8, alpha: 0.55 });
    this.headGlow.circle(0, 0, 0.5).fill({ color: 0xffffff, alpha: 0.8 });
    this.headGlow.position.set(d.head.x, d.head.y);
    this.headGlow.alpha = 0;
    this.tailGlow.circle(0, 0, 1).fill({ color: 0xff4d3d, alpha: 0.55 });
    this.tailGlow.position.set(d.tail.x, d.tail.y);
    this.tailGlow.scale.set(Math.max(10, d.tail.r * 1.4));
    this.tailGlow.alpha = 0;
    for (const h of d.hazards) {
      const g = new Graphics().circle(0, 0, 9).fill({ color: AMBER, alpha: 0.85 });
      g.position.set(h.x, h.y);
      g.alpha = 0;
      this.hazards.push(g);
    }

    this.roof.position.set(d.roof.x, d.roof.y);
    this.spring.addChild(this.scaled, this.roof, this.tailGlow, this.headGlow, ...this.hazards);

    build.wheels.forEach((tex, i) => {
      const w = d.wheels[i];
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      const k = true_ ? 1 / STYLE.wheelScale : 1;
      s.scale.set(k);
      s.position.set(true_ ? build.measure.wheels[i].x : w.x, true_ ? build.measure.wheels[i].y : w.y);
      this.wheels.push(s);
      this.tilt.addChild(s);
    });
  }

  /** Car-local point where roof cargo sits (after squash), e.g. for things tossed onto the roof. */
  roofPoint(): { x: number; y: number } {
    return { x: this.roof.x, y: this.roof.y + this.spring.y };
  }

  /** Called on landings and bumps: compress the suspension. */
  bounce(v: number): void {
    this.springV += v;
  }

  flashLights(): void {
    this.flash = 1;
  }

  setHazards(on: boolean): void {
    if (on && !this.hazardOn) this.hazardT = 0;
    this.hazardOn = on;
  }

  update(dt: number, distance: number, accel: number, held: boolean): void {
    this.wheels.forEach((w, i) => (w.rotation = distance / this.dims.wheels[i].r));

    // Spring-damper suspension; accel leans the body (squat on gas, dive on brake).
    const k = 260, damp = 13;
    const lean = Math.max(-1, Math.min(1, accel / 900));
    this.springV += (-k * this.springY - damp * this.springV) * dt;
    this.springY += this.springV * dt;
    const sq = Math.max(-0.12, Math.min(0.12, this.springY * 0.012));
    this.spring.y = this.springY;
    this.spring.scale.set(1 + sq * 0.6, 1 - sq);
    this.spring.rotation = -lean * 0.025 + (held ? Math.sin(performance.now() / 90) * 0.04 : 0);
    this.tilt.rotation = this.pitch;

    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.headGlow.alpha = this.flash;
    this.headGlow.scale.set(Math.max(14, this.dims.head.r * 1.5) * (0.8 + this.flash * 0.6));
    const tailTarget = this.braking ? 1 : 0;
    this.tailGlow.alpha += (tailTarget - this.tailGlow.alpha) * Math.min(1, dt * 12);

    this.hazardT += dt;
    const blink = this.hazardOn && Math.floor(this.hazardT * 5) % 2 === 0;
    for (const h of this.hazards) h.alpha = blink ? 1 : 0;

    this.wetness = Math.max(0, this.wetness - dt / 9);
    this.muddiness = Math.max(0, this.muddiness - dt / 14);
    this.wet.alpha = this.wetness;
    this.mud.alpha = Math.min(1, this.muddiness * 1.3);
  }
}
