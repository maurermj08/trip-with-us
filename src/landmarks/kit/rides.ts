// Potato World rides: the monorail on its beam, the spinning Spud Cups and the carousel.
// Every ride runs on its own and speeds up (with music) when tapped.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, SKIN, darken } from '../../style/palette';
import { contactShadow } from '../../style/shapes';
import { WALK } from './common';
import { PARK, awning, pennant, potatoDome, spud } from './potatoArt';

// ---------- Monorail ----------
const BEAM_Y = -350;
const CAR_LEN = 150;

/** The car's outline as one path: rounded corners, or a long bullet nose at a lead end. */
function carShape(g: Graphics, nose: -1 | 0 | 1, h: number, r: number): Graphics {
  const x0 = -CAR_LEN / 2, x1 = CAR_LEN / 2, nl = 34;
  g.moveTo(nose < 0 ? x0 + 8 : x0 + r, -h);
  g.lineTo(nose > 0 ? x1 - 8 : x1 - r, -h);
  if (nose > 0) {
    g.bezierCurveTo(x1 + 16, -h, x1 + nl, -h * 0.62, x1 + nl, -h * 0.36);
    g.bezierCurveTo(x1 + nl, -h * 0.1, x1 + 16, 0, x1 - 8, 0);
  } else {
    g.quadraticCurveTo(x1, -h, x1, -h + r);
    g.lineTo(x1, -r);
    g.quadraticCurveTo(x1, 0, x1 - r, 0);
  }
  g.lineTo(nose < 0 ? x0 + 8 : x0 + r, 0);
  if (nose < 0) {
    g.bezierCurveTo(x0 - 16, 0, x0 - nl, -h * 0.1, x0 - nl, -h * 0.36);
    g.bezierCurveTo(x0 - nl, -h * 0.62, x0 - 16, -h, x0 + 8, -h);
  } else {
    g.quadraticCurveTo(x0, 0, x0, -r);
    g.lineTo(x0, -h + r);
    g.quadraticCurveTo(x0, -h, x0 + r, -h);
  }
  return g.closePath();
}

/**
 * One rounded monorail car (no face): pastel body, window band, stripe. `nose` = -1 / 1 / 0.
 * The nose is part of the body outline, and the stripe and skirt run into it (clipped to the
 * outline), so the ends read as one smooth shape.
 */
function monorailCar(color: number, nose: -1 | 0 | 1): Container {
  const c = new Container();
  const h = 50;
  const r = 22;
  const body = carShape(new Graphics(), nose, h, r).fill(PARK.cream);
  const d = new Graphics();
  const ext = 40; // run the bands past the ends; the mask trims them to the outline
  d.rect(-CAR_LEN / 2 - ext, -18, CAR_LEN + ext * 2, 10).fill(color);
  d.rect(-CAR_LEN / 2 - ext, -6, CAR_LEN + ext * 2, 6).fill(darken(color, 0.12));
  // windows (a band of rounded panes; the nose gets one big windscreen, never two eyes)
  for (let k = 0; k < 5; k++) d.roundRect(-CAR_LEN / 2 + 16 + k * 25, -42, 18, 16, 5).fill(PARK.sky);
  if (nose !== 0) {
    const wx = nose > 0 ? CAR_LEN / 2 - 2 : -CAR_LEN / 2 - 26;
    d.roundRect(wx, -42, 28, 15, 7).fill(darken(PARK.sky, 0.08));
  }
  d.rect(-CAR_LEN / 2 - ext, -h + 3, CAR_LEN + ext * 2, 3).fill({ color: P.white, alpha: 0.7 });
  const clip = carShape(new Graphics(), nose, h, r).fill(0xffffff);
  d.mask = clip;
  c.addChild(body, d, clip);
  return c;
}

export class Monorail extends Prop {
  private train = new Container();
  private t = 0;
  private speed = 240;
  private boost = 0;
  private pos = 0;

  constructor(ctx: Ctx, x: number, private len: number) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const g = new Graphics();
    // tapered white columns
    for (let lx = 120; lx < len; lx += 560) {
      contactShadow(g, lx, 0, 70);
      g.poly([lx - 18, 0, lx - 10, BEAM_Y + 20, lx + 10, BEAM_Y + 20, lx + 18, 0]).fill(0xeef1f4);
      g.poly([lx + 4, BEAM_Y + 20, lx + 10, BEAM_Y + 20, lx + 18, 0, lx + 8, 0]).fill(0xd8dee5);
      g.roundRect(lx - 30, BEAM_Y + 14, 60, 12, 5).fill(0xe4e9ee);
    }
    // the beam
    g.roundRect(-60, BEAM_Y, len + 120, 22, 9).fill(0xf4f6f8);
    g.roundRect(-60, BEAM_Y + 14, len + 120, 8, 4).fill(0xdde3e9);
    g.roundRect(-60, BEAM_Y, len + 120, 3, 1.5).fill({ color: P.white, alpha: 0.8 });
    this.view.addChild(g);
    const colors = [PARK.teal, PARK.coral, PARK.purple];
    [-1, 0, 1].forEach((n, i) => {
      const car = monorailCar(colors[i], (n === 1 ? 1 : n === -1 ? -1 : 0) as -1 | 0 | 1);
      car.x = n * (CAR_LEN + 6);
      this.train.addChild(car);
    });
    // little couplers
    const cpl = new Graphics();
    for (const cx of [-(CAR_LEN + 6) / 2, (CAR_LEN + 6) / 2]) cpl.roundRect(cx - 6, -30, 12, 18, 4).fill(0xc9d0d8);
    this.train.addChildAt(cpl, 0);
    this.train.y = BEAM_Y;
    this.pos = len * 0.35;
    this.view.addChild(this.train);
    this.extent = [-800, len + 800];
    this.updateTrain();
  }

  hintTarget(): Container {
    return this.train;
  }

  private updateTrain(): void {
    const span = this.len + 900;
    const p = ((this.pos % span) + span) % span - 450;
    this.train.x = p;
    // fade in and out at the ends of the line so it can loop
    const edge = Math.min(p + 450, this.len + 450 - p);
    this.train.alpha = Math.max(0, Math.min(1, edge / 260));
    const half = (CAR_LEN + 6) * 1.5 + 20;
    this.hits = [{ x: p - half, y: BEAM_Y - 60, w: half * 2, h: 70 }];
  }

  onTap(): void {
    this.boost = 2.5;
    this.ctx.sfx.paChime();
    this.ctx.tweens.wobble(this.train, 0.02, 0.6, 0.04);
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x + this.train.x, y: this.y + BEAM_Y - 60, count: 8, shape: 'star',
      tint: [PARK.gold, P.white, PARK.pink], speed: [80, 200], gravity: 120, life: [0.5, 0.9], size: [8, 14],
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    this.pos += dt * (this.speed + this.boost * 320);
    this.train.y = BEAM_Y - 2 + Math.sin(this.t * 6) * 0.8;
    this.updateTrain();
  }
}

// ---------- Spud Cups (spinning potato teacups) ----------
interface Cup { c: Container; band: Graphics; spin: number; phase: number }

export class SpudCups extends Prop {
  private ring = new Container();
  private cups: Cup[] = [];
  private hub = new Container();
  private angle = 0;
  private boost = 0;
  private t = 0;
  private readonly R = 175;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 520);
    // the round platform: skirt + top disc with a pastel ring pattern
    g.ellipse(0, -10, 250, 40).fill(PARK.lavenderShade);
    g.rect(-250, -22, 500, 14).fill(PARK.lavenderShade);
    g.ellipse(0, -22, 250, 40).fill(PARK.lavender);
    g.ellipse(0, -22, 190, 28).fill(PARK.pink);
    g.ellipse(0, -22, 120, 18).fill(PARK.cream);
    g.ellipse(-70, -36, 90, 8).fill({ color: P.white, alpha: 0.35 });
    // tiny lights around the skirt
    for (let k = 0; k < 12; k++) g.circle(-230 + k * 42, -12 + Math.abs(k - 5.5) * 1.2, 3.2).fill(PARK.gold);
    this.view.addChild(g);
    this.ring.sortableChildren = true;
    this.view.addChild(this.ring);
    // the hub: a giant golden potato on a striped pedestal
    const h = new Graphics();
    h.roundRect(-18, -120, 36, 100, 10).fill(PARK.pink);
    for (let k = 0; k < 4; k++) h.roundRect(-18, -112 + k * 24, 36, 8, 4).fill(P.white);
    spud(h, 0, -150, 92, 62, PARK.gold);
    h.roundRect(-3, -206, 6, 26, 3).fill(PARK.goldShade);
    const flag = new Graphics();
    pennant(flag, 30, PARK.coral);
    flag.position.set(2, -206);
    this.hub.addChild(h, flag);
    this.hub.zIndex = 0;
    this.ring.addChild(this.hub);
    const cupColors = [PARK.pink, PARK.mint, PARK.sky, PARK.lavender, 0xffe2a8, PARK.coral];
    for (let k = 0; k < 6; k++) {
      const c = new Container();
      const cg = new Graphics();
      // riders peeking out (people may have faces; kept tiny and simple)
      for (const [rx, skin, shirt] of [[-14, SKIN[k % SKIN.length], 0x3f7fd1], [12, SKIN[(k + 2) % SKIN.length], 0xf7c934]] as const) {
        cg.roundRect(rx - 8, -62, 16, 18, 6).fill(shirt);
        cg.circle(rx, -68, 8).fill(skin);
        cg.circle(rx - 2.5, -69, 1.2).fill(0x2a2a2a);
        cg.circle(rx + 2.5, -69, 1.2).fill(0x2a2a2a);
      }
      // the cup: a potato bowl with a pastel band and a little handle
      cg.moveTo(-46, -48).quadraticCurveTo(-46, 4, 0, 4).quadraticCurveTo(46, 4, 46, -48).closePath().fill(PARK.spud);
      cg.ellipse(0, -48, 46, 10).fill(PARK.spudShade);
      cg.ellipse(14, -22, 18, 20).fill({ color: PARK.spudShade, alpha: 0.6 });
      for (const [dx, dy] of [[-24, -30], [20, -14], [-6, -8]]) cg.ellipse(dx, dy, 3, 2.4).fill(PARK.spudSpot);
      cg.roundRect(-30, -42, 8, 30, 4).fill({ color: P.white, alpha: 0.28 });
      // saucer
      cg.ellipse(0, 6, 54, 10).fill(darken(cupColors[k], 0.1));
      c.addChild(cg);
      const band = new Graphics();
      band.roundRect(-44, -36, 88, 10, 5).fill(cupColors[k]);
      c.addChild(band);
      this.ring.addChild(c);
      this.cups.push({ c, band, spin: 1 + (k % 3) * 0.4, phase: (k / 6) * Math.PI * 2 });
    }
    this.hits = [{ x: -260, y: -230, w: 520, h: 240 }];
    this.extent = [-600, 600];
    this.place();
  }

  hintTarget(): Container {
    return this.hub;
  }

  private place(): void {
    for (const cup of this.cups) {
      const a = this.angle + cup.phase;
      const z = Math.sin(a); // -1 back … 1 front
      const s = 0.82 + 0.18 * (z + 1) / 2;
      cup.c.position.set(Math.cos(a) * this.R, -26 + z * 22);
      cup.c.scale.set(s);
      cup.c.zIndex = z > 0 ? 2 + z : -1 + z;
      cup.c.rotation = Math.sin(this.t * cup.spin * 2 + cup.phase) * 0.12;
      // each cup spins on its own: the band slides like it's turning
      cup.band.scale.x = Math.cos(this.t * cup.spin * 3 + cup.phase);
    }
  }

  onTap(): void {
    this.boost = 3;
    this.ctx.sfx.musicBox();
    this.ctx.tweens.wobble(this.hub, 0.08, 0.7, 0.08);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 200, count: 10, shape: 'star', tint: [PARK.gold, PARK.pink, P.white], speed: [80, 220], gravity: 140, life: [0.6, 1.0], size: [10, 16] });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    this.angle += dt * (0.6 + this.boost * 0.9);
    this.place();
  }
}

// ---------- Carousel with potato-horses ----------
interface Horse { c: Container; pole: Graphics; phase: number }

export class Carousel extends Prop {
  private ring = new Container();
  private horses: Horse[] = [];
  private top = new Container();
  private angle = 0;
  private boost = 0;
  private t = 0;
  private readonly R = 150;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 440);
    // platform
    g.ellipse(0, -8, 210, 32).fill(PARK.goldShade);
    g.rect(-210, -22, 420, 14).fill(PARK.goldShade);
    g.ellipse(0, -22, 210, 32).fill(PARK.gold);
    g.ellipse(0, -22, 170, 24).fill(PARK.cream);
    for (let k = 0; k < 10; k++) g.circle(-190 + k * 42, -10 + Math.abs(k - 4.5) * 1.4, 3).fill(P.white);
    this.view.addChild(g);
    this.ring.sortableChildren = true;
    this.view.addChild(this.ring);
    // centre column (mirrored panels)
    const col = new Graphics();
    col.roundRect(-34, -300, 68, 280, 12).fill(PARK.pink);
    col.roundRect(10, -300, 24, 280, 10).fill(PARK.pinkShade);
    for (let k = 0; k < 4; k++) col.roundRect(-24, -276 + k * 62, 40, 44, 8).fill(PARK.sky);
    col.zIndex = 0;
    this.ring.addChild(col);
    for (let k = 0; k < 6; k++) {
      const c = new Container();
      const pole = new Graphics();
      pole.roundRect(-3, -280, 6, 260, 3).fill(PARK.gold);
      c.addChild(pole);
      const h = new Graphics();
      // potato-horse: a potato body, legs, a little horse head and a mane (eyes ok: it's an animal)
      for (const lx of [-26, -12, 14, 28]) h.roundRect(lx - 4, -8, 8, 30, 4).fill(PARK.spudShade);
      spud(h, 0, -14, 84, 46, [PARK.spud, 0xe6b77e, 0xc98c56][k % 3]);
      h.roundRect(28, -54, 22, 40, 10).fill(PARK.spud);
      h.roundRect(36, -64, 34, 22, 11).fill(PARK.spud);
      h.circle(52, -58, 2.6).fill(0x2a2a2a);
      h.roundRect(24, -62, 10, 30, 5).fill([PARK.coral, PARK.purple, PARK.teal][k % 3]);
      h.roundRect(-12, -40, 28, 10, 5).fill([PARK.coral, PARK.purple, PARK.teal][(k + 1) % 3]); // saddle
      h.roundRect(-50, -22, 14, 26, 7).fill(darken(PARK.spud, 0.15)); // tail
      h.position.set(0, -110);
      c.addChild(h);
      this.ring.addChild(c);
      this.horses.push({ c, pole, phase: (k / 6) * Math.PI * 2 });
    }
    // striped tent canopy with a scalloped valance and a potato finial
    const t = new Graphics();
    const stripes = 10;
    for (let k = 0; k < stripes; k++) {
      const a0 = -230 + (k * 460) / stripes, a1 = -230 + ((k + 1) * 460) / stripes;
      t.poly([0, -400, a0, -300, a1, -300]).fill(k % 2 ? P.white : PARK.coral);
    }
    t.poly([0, -400, 120, -300, 230, -300]).fill({ color: P.black, alpha: 0.06 });
    awning(t, -236, -306, 472, 22, PARK.purple, PARK.lavender);
    for (let k = 0; k < 11; k++) t.circle(-220 + k * 44, -286, 4).fill(PARK.gold);
    const ft = potatoDome(t, 0, -398, 22, PARK.gold);
    const flag = new Graphics();
    pennant(flag, 34, PARK.teal);
    flag.position.set(2, ft + 4);
    this.top.addChild(t, flag);
    this.view.addChild(this.top);
    this.hits = [{ x: -240, y: -440, w: 480, h: 440 }];
    this.extent = [-600, 600];
    this.place();
  }

  hintTarget(): Container {
    return this.top;
  }

  private place(): void {
    for (const hr of this.horses) {
      const a = this.angle + hr.phase;
      const z = Math.sin(a);
      const s = 0.8 + 0.2 * (z + 1) / 2;
      hr.c.position.set(Math.cos(a) * this.R, -22 + z * 18);
      hr.c.scale.set(s);
      hr.c.zIndex = z > 0 ? 2 + z : -1 + z;
      const bob = Math.sin(this.t * 3 + hr.phase * 2) * 16;
      hr.c.children[1].y = -110 + bob;
      // horses face the way they travel
      hr.c.children[1].scale.x = Math.cos(a + Math.PI / 2) > 0 ? 1 : -1;
    }
  }

  onTap(): void {
    this.boost = 3;
    this.ctx.sfx.musicBox();
    this.ctx.tweens.wobble(this.top, 0.03, 0.7, 0.04);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 420, count: 10, shape: 'confetti', tint: [PARK.coral, PARK.gold, PARK.teal, PARK.purple], speed: [100, 260], gravity: 260, life: [0.8, 1.3], size: [8, 12], spin: 6 });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    this.angle += dt * (0.5 + this.boost * 0.8);
    this.place();
  }
}
