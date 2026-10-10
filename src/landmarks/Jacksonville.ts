// Jacksonville, FL: the tallest downtown towers of the trip, Treaty Oak, Friendship Fountain and
// tall riverwalk palms, with the St. Johns River along the near side (pelicans on pilings, a tug
// pushing a barge). A drive-through city. The blue Main Street lift bridge is in ./bridges.
import { Container, Graphics } from 'pixi.js';
import type { Ctx } from '../core/Ctx';
import { Prop } from '../props/Prop';
import { P, darken } from '../style/palette';
import { block, contactShadow, windowGrid } from '../style/shapes';
import { makeRng } from '../core/rng';
import { ease } from '../core/Tween';
import { CITIES } from '../world/Route';
import { WALK, type CitySet } from './kit/common';
import { Tower } from './kit/towers';
import { Pelicans, RiverBand, TallPalm, Tugboat } from './kit/riverfront';

const X0 = CITIES.find((c) => c.id === 'jacksonville')!.x0;
const LEN = CITIES.find((c) => c.id === 'jacksonville')!.len;

// ---------- Mid-rise filler between the towers (tap: windows light up) ----------
export class MidRise extends Prop {
  private lights = new Graphics();
  private lit = false;
  constructor(ctx: Ctx, x: number, private w: number, private h: number, color: number, seed = 1) {
    super(ctx, x, WALK);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w);
    block(g, 0, -h, w, h, color);
    windowGrid(g, 10, -h + 14, w - 28, h - 50, makeRng(seed), { scale: 1.5 });
    g.roundRect(w * 0.2, -40, w * 0.6, 40, 4).fill(darken(color, 0.25));
    this.view.addChild(g, this.lights);
    this.hits = [{ x: 0, y: -h, w, h }];
    this.extent = [-200, w + 200];
  }
  onTap(): void {
    this.lit = !this.lit;
    this.ctx.sfx.pluck(this.lit ? 7 : 4, 0.14);
    this.lights.clear();
    if (this.lit) windowGrid(this.lights, 10, -this.h + 14, this.w - 28, this.h - 50, makeRng(9), { scale: 1.5, lit: 1 });
    this.ctx.tweens.wobble(this.view, 0.01, 0.5, 0.03);
  }
}

// ---------- Treaty Oak: huge, low, spreading limbs (tap: a squirrel runs along a limb) ----------
export class TreatyOak extends Prop {
  private canopy = new Container();
  private squirrel = new Container();
  private busy = false;
  /** A path along the big left-to-right limb (local coords). */
  private limb: [number, number][] = [[-250, -70], [-170, -110], [-80, -150], [0, -168], [90, -150], [190, -112], [270, -72]];

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 2);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 620, 0.12);
    const bark = 0x7a6048, barkDark = 0x684f3a;
    // thick short trunk and limbs that sweep out and droop low
    g.roundRect(-34, -150, 68, 152, 24).fill(bark);
    g.roundRect(10, -150, 24, 152, 12).fill(barkDark);
    for (const side of [-1, 1]) {
      g.moveTo(0, -120).quadraticCurveTo(side * 160, -190, side * 290, -66).lineTo(side * 284, -52).quadraticCurveTo(side * 150, -160, 0, -96).closePath().fill(side < 0 ? bark : barkDark);
      g.moveTo(0, -140).quadraticCurveTo(side * 90, -230, side * 170, -230).lineTo(side * 168, -218).quadraticCurveTo(side * 90, -210, 0, -124).closePath().fill(bark);
    }
    this.view.addChild(g);
    // canopy clumps (wide and low, like the real one)
    const c = new Graphics();
    const leaf = 0x4f8f4c, leafDark = 0x447f42;
    const clumps: [number, number, number, number][] = [
      [-260, -110, 90, 52], [-170, -190, 120, 68], [-40, -240, 150, 80], [110, -220, 140, 74], [240, -130, 100, 56],
      [0, -180, 170, 60], [-110, -140, 110, 50], [170, -160, 110, 54],
    ];
    clumps.forEach(([cx, cy, rx, ry], k) => c.ellipse(cx, cy, rx, ry).fill(k % 3 === 2 ? leafDark : leaf));
    c.ellipse(-80, -270, 60, 18).fill({ color: P.white, alpha: 0.12 });
    // the right 28% sits a touch darker
    c.ellipse(190, -170, 90, 60).fill({ color: P.black, alpha: 0.05 });
    this.canopy.addChild(c);
    this.canopy.pivot.set(0, -150);
    this.canopy.position.set(0, -150);
    this.view.addChild(this.canopy);
    // the limb the squirrel runs along shows below the leaves
    const lg = new Graphics();
    for (let i = 1; i < this.limb.length; i++) {
      const [ax, ay] = this.limb[i - 1], [bx, by] = this.limb[i];
      lg.moveTo(ax, ay + 6).lineTo(bx, by + 6).stroke({ width: 12, color: bark, cap: 'round' });
    }
    this.view.addChild(lg);
    // squirrel (characters may have faces)
    const s = new Graphics();
    s.ellipse(0, -8, 11, 7).fill(0x8a6a50);
    s.circle(9, -14, 6).fill(0x8a6a50);
    s.circle(11, -15, 1.6).fill(0x1d1b1a);
    s.circle(7, -20, 2.4).fill(0x8a6a50);
    s.moveTo(-9, -8).quadraticCurveTo(-26, -30, -12, -32).quadraticCurveTo(-4, -22, -6, -10).closePath().fill(0x9c7b5f);
    this.squirrel.addChild(s);
    this.squirrel.visible = false;
    this.view.addChild(this.squirrel);
    this.hits = [{ x: -320, y: -320, w: 640, h: 320 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.canopy;
  }

  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.tweens.wobble(this.canopy, 0.02, 0.9, 0.03);
    if (this.busy) return;
    this.busy = true;
    const path = Math.random() < 0.5 ? this.limb : [...this.limb].reverse();
    const sq = this.squirrel;
    sq.visible = true;
    sq.scale.x = path[0][0] < path[path.length - 1][0] ? 1 : -1;
    this.ctx.sfx.squeak();
    this.ctx.tweens.add(1.6, (p) => {
      if (sq.destroyed) return;
      const f = p * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(f));
      const t = f - i;
      sq.x = path[i][0] + (path[i + 1][0] - path[i][0]) * t;
      sq.y = path[i][1] + (path[i + 1][1] - path[i][1]) * t - Math.abs(Math.sin(p * 30)) * 5;
    }, {
      ease: ease.inOutSine,
      done: () => {
        this.ctx.sfx.squeak();
        this.ctx.tweens.after(0.4, () => {
          if (!sq.destroyed) sq.visible = false;
          this.busy = false;
        });
      },
    });
  }
}

// ---------- Friendship Fountain: all water, center jet, ring jets, colored light pucks ----------
const SHOWS = [
  { name: 'center', tint: [P.water, 0xbfe6ff, P.white], puck: 0x7fd1ff },
  { name: 'ring', tint: [0xff9fc4, P.white, 0xffd1e3], puck: 0xff8fb1 },
  { name: 'wave', tint: [0x8ff0d0, P.white, 0xbff7e6], puck: 0x7fe0a8 },
  { name: 'all', tint: [0xffd98a, P.white, 0xfff0c8], puck: 0xffd166 },
] as const;

export class FriendshipFountain extends Prop {
  private show = 0;
  private t = 0;
  private acc = 0;
  private boost = 0;
  private pucks: Graphics[] = [];
  private pool = new Container();
  /** Solid-looking water (columns and arcs), redrawn every frame; particles add the spray. */
  private water = new Graphics();
  private readonly R = 280;
  private readonly jets = 8;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WALK - 4);
    this.layer = 'back';
    const R = this.R;
    const g = new Graphics();
    contactShadow(g, 0, 0, R * 2.3);
    // wide, low round basin seen from the side
    g.roundRect(-R - 20, -40, R * 2 + 40, 40, 14).fill(0xd8d2c4);
    g.roundRect(-R - 20, -40, R * 2 + 40, 3, 2).fill({ color: P.white, alpha: 0.5 });
    g.rect(R + 20 - (R * 2 + 40) * 0.28, -34, (R * 2 + 40) * 0.28 - 6, 30).fill({ color: P.black, alpha: 0.05 });
    g.roundRect(-R, -40, R * 2, 14, 7).fill(P.water);
    // center pedestal (low, so it's "all water")
    g.roundRect(-34, -64, 68, 26, 10).fill(0xcfc8b8);
    g.ellipse(0, -64, 40, 8).fill(P.water);
    this.view.addChild(g);
    // light pucks along the rim
    for (let k = 0; k < 9; k++) {
      const p = new Graphics().ellipse(0, 0, 14, 4).fill(P.white);
      p.position.set(-R + 30 + k * ((R * 2 - 60) / 8), -33);
      p.tint = SHOWS[0].puck;
      this.pucks.push(p);
      this.pool.addChild(p);
    }
    this.view.addChild(this.water, this.pool);
    this.hits = [{ x: -R - 20, y: -380, w: R * 2 + 40, h: 380 }];
    this.extent = [-1200, 1200];
  }

  hintTarget(): Container {
    return this.pool;
  }

  onTap(): void {
    this.show = (this.show + 1) % SHOWS.length;
    this.boost = 1.2;
    const s = SHOWS[this.show];
    this.ctx.sfx.splash(1.2);
    this.ctx.sfx.pluck(this.show * 2 + 3, 0.12);
    this.pucks.forEach((p, k) => this.ctx.tweens.after(k * 0.04, () => !p.destroyed && (p.tint = s.puck)));
    this.ctx.fx.emit(this.ctx.layers.fx, {
      x: this.x, y: this.y - 300, count: 24, shape: 'drop', tint: [...s.tint],
      speed: [200, 460], angle: [-2.7, -0.4], gravity: 900, life: [0.8, 1.3], size: [8, 14], spin: 0, rotate: false,
    });
  }

  private jet(x: number, y: number, angle: [number, number], speed: [number, number], tint: readonly number[]): void {
    this.ctx.fx.spawn(this.ctx.layers.fxBack, {
      x, y, shape: 'drop', tint: [...tint], speed, angle,
      gravity: 700, drag: 0.15, life: [0.6, 0.9], size: [5, 8], spin: 0, rotate: false, alpha: 0.85,
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt);
    this.acc += dt;
    const rate = this.boost > 0 ? 0.012 : 0.03;
    const s = SHOWS[this.show];
    const big = 1 + this.boost * 0.5;
    const R = this.R;
    while (this.acc > rate) {
      this.acc -= rate;
      const k = Math.floor(Math.random() * this.jets);
      const jx = this.x - R + 40 + k * ((R * 2 - 80) / (this.jets - 1));
      const by = this.y - 36;
      switch (s.name) {
        case 'center':
          this.jet(this.x, this.y - 66, [-1.65, -1.49], [520 * big, 600 * big], s.tint);
          if (Math.random() < 0.4) this.jet(jx, by, [-1.7, -1.45], [200, 260], s.tint);
          break;
        case 'ring': {
          // ring jets arc in toward the middle
          const inward = jx < this.x ? [-1.25, -1.05] : [-2.1, -1.9];
          this.jet(jx, by, inward as [number, number], [360 * big, 420 * big], s.tint);
          if (Math.random() < 0.3) this.jet(this.x, this.y - 66, [-1.62, -1.52], [380, 440], s.tint);
          break;
        }
        case 'wave': {
          // a crest that travels left to right across the jets
          const crest = (Math.sin(this.t * 2.2 - k * 0.8) + 1) / 2;
          this.jet(jx, by, [-1.62, -1.52], [160 + crest * 380 * big, 200 + crest * 400 * big], s.tint);
          break;
        }
        case 'all':
          this.jet(this.x, this.y - 66, [-1.66, -1.48], [560 * big, 640 * big], s.tint);
          this.jet(jx, by, jx < this.x ? [-1.3, -1.1] : [-2.05, -1.85], [380 * big, 440 * big], s.tint);
          break;
      }
    }
    // pucks shimmer
    this.pucks.forEach((p, k) => (p.alpha = 0.75 + 0.25 * Math.sin(this.t * 4 + k)));
    this.drawWater(s.name, s.tint[0], big);
  }

  private drawWater(show: string, tint: number, big: number): void {
    const w = this.water.clear();
    const R = this.R;
    const wob = Math.sin(this.t * 9) * 4;
    const column = (x: number, base: number, h: number, width: number) => {
      w.roundRect(x - width / 2, base - h, width, h, width / 2).fill({ color: P.white, alpha: 0.75 });
      w.roundRect(x - width / 4, base - h + 6, width / 2, h - 12, width / 4).fill({ color: tint, alpha: 0.5 });
      w.ellipse(x, base - h, width * 0.9, width * 0.45).fill({ color: P.white, alpha: 0.85 });
    };
    const arc = (x: number, base: number, h: number, dx: number) => {
      w.moveTo(x, base).quadraticCurveTo(x + dx / 2, base - h * 2, x + dx, base).stroke({ width: 5, color: P.white, alpha: 0.7, cap: 'round' });
    };
    const centerH = (show === 'center' || show === 'all' ? 230 : show === 'ring' ? 110 : 60) * big + wob;
    // the big center jet: a broad column with a foaming plume on top
    column(0, -64, centerH, 30);
    for (const [dx, dy, r] of [[-16, 4, 14], [16, 4, 14], [0, -8, 18], [-26, 18, 10], [26, 18, 10]]) {
      w.circle(dx + Math.sin(this.t * 7 + dx) * 2, -64 - centerH + dy, r).fill({ color: P.white, alpha: 0.8 });
    }
    for (let k = 0; k < this.jets; k++) {
      const jx = -R + 40 + k * ((R * 2 - 80) / (this.jets - 1));
      if (show === 'ring' || show === 'all') arc(jx, -36, 70 * big, (jx < 0 ? 1 : -1) * Math.min(120, Math.abs(jx) * 0.6));
      else if (show === 'wave') column(jx, -36, 20 + ((Math.sin(this.t * 2.2 - k * 0.8) + 1) / 2) * 110 * big, 10);
      else column(jx, -36, 30 + wob, 8);
    }
  }
}

/** All positions are relative to x0 (the end of the Main Street bridge). */
export function buildJacksonville(ctx: Ctx, x0: number = X0): CitySet {
  const props: Prop[] = [];
  // The St. Johns along the near side, all the way through downtown.
  props.push(new RiverBand(ctx, x0 - 240, LEN + 340, true, 240));
  props.push(new Tugboat(ctx, x0 - 100, LEN - 200, 0.15));
  props.push(new Pelicans(ctx, x0 + 1250, 3, 150));
  props.push(new Pelicans(ctx, x0 + 4500, 2, 170));

  // Downtown: towers (tallest in the game) with mid-rises between, back to front by x.
  props.push(new MidRise(ctx, x0 + 300, 170, 260, 0xe8dcc8, 1));
  props.push(new Tower(ctx, x0 + 640, { variant: 'granite', w: 200, h: 560, note: 2 }));
  props.push(new MidRise(ctx, x0 + 780, 150, 320, 0xcfd8e0, 2));
  props.push(new Tower(ctx, x0 + 1100, { variant: 'crown', w: 210, h: 700, note: 4 }));
  props.push(new Tower(ctx, x0 + 1420, { variant: 'slab', w: 190, h: 620, note: 0 }));
  props.push(new MidRise(ctx, x0 + 1560, 140, 230, 0xf0e2c0, 3));
  props.push(new TreatyOak(ctx, x0 + 2150));
  props.push(new Tower(ctx, x0 + 2780, { variant: 'slab', w: 170, h: 520, note: 3, look: { body: 0x4a6a86, shade: 0x3d5a74 } }));
  props.push(new MidRise(ctx, x0 + 2920, 160, 280, 0xd9e4ea, 4));
  props.push(new Tower(ctx, x0 + 3260, { variant: 'crown', w: 180, h: 600, note: 5, look: { body: 0x9ec3c9, shade: 0x86adb4 } }));
  props.push(new Tower(ctx, x0 + 3560, { variant: 'granite', w: 170, h: 480, note: 1 }));
  props.push(new MidRise(ctx, x0 + 3700, 150, 240, 0xe8dcc8, 5));

  // Riverwalk palms (tall Washingtonias), between the buildings and along the rail.
  [250, 1850, 2550, 4100, 5500, 5900].forEach((dx, k) => props.push(new TallPalm(ctx, x0 + dx, WALK + 4, 360 + (k % 3) * 40, (k % 2 ? 1 : -1) * 0.05)));
  props.push(new FriendshipFountain(ctx, x0 + 4800));
  return { props, doorX: x0 + 3900 };
}
