// 2019 Mini Cooper Countryman, side profile facing right.
// Island Blue body, white roof and mirror caps, black cladding, silver star-spoke wheels.
// Body is squashed to 96% width / 107% height; wheels are 12% oversize and stay round.
import { Container, Graphics } from 'pixi.js';
import { P } from '../style/palette';
import { glint } from '../style/shapes';

const M = P.mini;
export const BODY_SX = 0.96;
export const BODY_SY = 1.07;
export const WHEEL_R = 20;
export const WHEEL_X = 65;
/** Half the car length in world units, used for collisions and hit tests. */
export const CAR_HALF = 104;

function drawWheel(g: Graphics): void {
  const r = WHEEL_R;
  g.circle(0, 0, r).fill(M.tire);
  g.circle(0, 0, r * 0.86).fill(M.tireWall);
  g.circle(0, 0, r * 0.72).fill(M.silver);
  g.circle(0, 0, r * 0.64).fill(M.rimDark);
  // Five twin spokes.
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    for (const off of [-0.17, 0.17]) {
      const b = a + off;
      const r0 = r * 0.16, r1 = r * 0.66;
      const w0 = 1.1, w1 = 2.0;
      const c = Math.cos(b), s = Math.sin(b), nx = -s, ny = c;
      g.poly([
        c * r0 + nx * w0, s * r0 + ny * w0,
        c * r1 + nx * w1, s * r1 + ny * w1,
        c * r1 - nx * w1, s * r1 - ny * w1,
        c * r0 - nx * w0, s * r0 - ny * w0,
      ]).fill(M.silver);
    }
  }
  g.circle(0, 0, r * 0.2).fill(M.silver);
  g.circle(0, 0, r * 0.09).fill(M.clad);
  g.circle(-r * 0.32, -r * 0.4, r * 0.12).fill({ color: P.white, alpha: 0.35 });
}

function drawBody(g: Graphics): void {
  // Wheel centers in body (pre-squash) coordinates.
  const wx = WHEEL_X / BODY_SX;
  const wy = -WHEEL_R / BODY_SY;

  // Greenhouse (black pillars and glass area).
  g.moveTo(57, -54)
    .lineTo(24, -76)
    .quadraticCurveTo(19, -79, 12, -79)
    .lineTo(-83, -78)
    .quadraticCurveTo(-89, -78, -91, -73)
    .lineTo(-96, -57)
    .lineTo(57, -55)
    .closePath()
    .fill(M.glass);

  // Windows, each with a glint.
  g.poly([46, -57, 23, -73, -6, -73, -6, -57]).fill(M.window);
  g.poly([-11, -57, -11, -73, -50, -73, -50, -57]).fill(M.window);
  g.poly([-55, -57, -55, -73, -79, -73, -87, -61, -87, -57]).fill(M.window);
  glint(g, 4, -72, 7, 14, 0.6);
  glint(g, -33, -72, 6, 14, 0.6);
  glint(g, -72, -72, 5, 12, 0.6);

  // Body shell.
  g.moveTo(98, -11)
    .lineTo(104, -16)
    .quadraticCurveTo(108, -22, 107, -30)
    .lineTo(104, -40)
    .quadraticCurveTo(102, -45.5, 95, -47)
    .lineTo(54, -55.5)
    .lineTo(-90, -56.5)
    .quadraticCurveTo(-96, -56.5, -98, -50)
    .lineTo(-104, -32)
    .quadraticCurveTo(-107, -26, -106, -18)
    .lineTo(-102, -11)
    .closePath()
    .fill(M.blue);

  // Darker lower band and the single gloss stripe.
  g.roundRect(-101, -33, 205, 11, 4).fill(M.blueDark);
  g.roundRect(-90, -52, 176, 3, 1.5).fill({ color: P.white, alpha: 0.28 });

  // White roof with rails and spoiler.
  g.moveTo(25, -78)
    .quadraticCurveTo(21, -87, 10, -87)
    .lineTo(-86, -87)
    .quadraticCurveTo(-92, -87, -94, -83)
    .lineTo(-99, -80)
    .quadraticCurveTo(-100, -77, -96, -77)
    .lineTo(-88, -78)
    .lineTo(12, -79.5)
    .closePath()
    .fill(M.roof);
  g.roundRect(-72, -92, 80, 3, 1.5).fill(M.silver);
  g.roundRect(3, -90, 4, 4, 1).fill(M.silver);
  g.roundRect(-70, -90, 4, 4, 1).fill(M.silver);
  g.roundRect(-82, -86.5, 96, 2, 1).fill({ color: P.white, alpha: 0.6 });

  // Black cladding: wheel arches, rocker, bumpers.
  for (const cx of [wx, -wx]) {
    g.moveTo(cx - 28, -11)
      .lineTo(cx - 28, wy)
      .arc(cx, wy, 28, Math.PI, Math.PI * 2)
      .lineTo(cx + 28, -11)
      .closePath()
      .fill(M.clad);
    g.circle(cx, wy, 23.5).fill(M.well);
  }
  g.roundRect(-104, -21, 208, 11, 5).fill(M.clad);
  g.roundRect(-40, -15.5, 80, 3.5, 1.75).fill(M.silver);

  // Door seams, handles, side scuttle.
  g.roundRect(-8.5, -55, 1.3, 33, 0.6).fill({ color: M.blueDark, alpha: 0.7 });
  g.roundRect(-53, -55, 1.3, 33, 0.6).fill({ color: M.blueDark, alpha: 0.7 });
  g.roundRect(14, -50, 10, 2.6, 1.3).fill(M.silver);
  g.roundRect(-34, -50, 10, 2.6, 1.3).fill(M.silver);
  g.roundRect(71, -41, 11, 7, 2.5).fill(M.clad);
  g.roundRect(72.5, -38.3, 8, 1.4, 0.7).fill(M.silver);

  // Mirror with white cap.
  g.roundRect(44, -58, 6, 4, 1.5).fill(M.clad);
  g.ellipse(44, -60.5, 6.5, 4.5).fill(M.roof);

  // Headlight (round, Mini signature) and tail light.
  g.circle(98, -38, 7).fill(M.silver);
  g.circle(98.5, -38, 5.3).fill(M.headlight);
  g.circle(97, -40, 1.6).fill({ color: P.white, alpha: 0.9 });
  g.roundRect(-104, -53, 6, 15, 2.5).fill(M.tail);
  g.roundRect(-103, -51, 2, 6, 1).fill({ color: P.white, alpha: 0.4 });
  // Front indicator in bumper.
  g.roundRect(100, -26, 5, 3, 1.5).fill(M.amber);
}

export class MiniView extends Container {
  readonly tilt = new Container();
  readonly spring = new Container();
  readonly bodyBox = new Container();
  readonly roof = new Container();
  private wheels: Graphics[] = [];
  private headGlow = new Graphics();
  private tailGlow = new Graphics();
  private hazards: Graphics[] = [];
  private wet = new Graphics();
  private mud = new Graphics();

  private springY = 0;
  private springV = 0;
  private flash = 0;
  private hazardOn = false;
  private hazardT = 0;
  wetness = 0;
  muddiness = 0;
  braking = false;
  pitch = 0;

  constructor() {
    super();
    this.addChild(this.tilt);
    this.tilt.addChild(this.spring);

    const body = new Graphics();
    drawBody(body);
    this.bodyBox.addChild(body);
    this.bodyBox.scale.set(BODY_SX, BODY_SY);

    // Mud splotches and wet shine sit on the body.
    for (const [x, y, r] of [[-80, -26, 7], [-55, -30, 5], [-20, -27, 6], [30, -29, 5], [60, -26, 7], [88, -30, 4], [-40, -40, 4], [10, -42, 3]]) {
      this.mud.circle(x, y, r).fill(P.mud);
      this.mud.circle(x + r * 0.8, y + 3, r * 0.6).fill(P.mud);
    }
    this.mud.alpha = 0;
    this.wet.roundRect(-92, -54, 180, 5, 2.5).fill({ color: P.white, alpha: 0.6 });
    this.wet.roundRect(-96, -46, 50, 3, 1.5).fill({ color: P.white, alpha: 0.5 });
    this.wet.roundRect(30, -45, 60, 3, 1.5).fill({ color: P.white, alpha: 0.5 });
    this.wet.alpha = 0;
    this.bodyBox.addChild(this.mud, this.wet);

    this.headGlow.circle(0, 0, 22).fill({ color: 0xfff1a8, alpha: 0.55 });
    this.headGlow.circle(0, 0, 11).fill({ color: 0xffffff, alpha: 0.8 });
    this.headGlow.position.set(98 * BODY_SX, -38 * BODY_SY);
    this.headGlow.alpha = 0;
    this.tailGlow.circle(0, 0, 16).fill({ color: 0xff4d3d, alpha: 0.55 });
    this.tailGlow.position.set(-101 * BODY_SX, -46 * BODY_SY);
    this.tailGlow.alpha = 0;
    for (const x of [101, -102]) {
      const h = new Graphics().circle(0, 0, 9).fill({ color: M.amber, alpha: 0.85 });
      h.position.set(x * BODY_SX, -27 * BODY_SY);
      h.alpha = 0;
      this.hazards.push(h);
    }

    // Roof cargo sits on top of the roof rails.
    this.roof.position.set(-30 * BODY_SX, -92 * BODY_SY);

    this.spring.addChild(this.bodyBox, this.roof, this.tailGlow, this.headGlow, ...this.hazards);

    for (const x of [WHEEL_X, -WHEEL_X]) {
      const w = new Graphics();
      drawWheel(w);
      w.position.set(x, -WHEEL_R);
      this.wheels.push(w);
      this.tilt.addChild(w);
    }
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
    for (const w of this.wheels) w.rotation = distance / WHEEL_R;

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
    this.headGlow.scale.set(0.8 + this.flash * 0.6);
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
