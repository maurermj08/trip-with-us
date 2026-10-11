// Shrimp boats working the Georgia coast, on the water behind the barrier. Each one bobs and
// drifts with gulls circling its nets. Tap: a toot, the outrigger booms swing down, the nets
// dip and come back up full (splash + shrimp sparkle). Tap again while it's busy: it chugs
// along with a wake and smoke puffs, then drifts back.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken } from '../style/palette';
import { block } from '../style/shapes';
import { ease } from '../core/Tween';
import { rand } from '../core/rng';

/** Waterline: a little above the barrier top (-72) so the whole hull shows over it. */
/** Waterline: just above the barrier top (-72), level with the scenery water behind it. */
const WATER_Y = -78;
const ROPE = 0x6b5a4a;
const NET = 0x9aa3ad;

/** Boat x positions: the Georgia coast stretches (and one in the marsh before the port). */
export const FISHING_BOAT_X = [150600, 177800, 180900, 184300, 203300, 207000];

export interface BoatLook {
  hull: number;
  stripe: number;
  cabin: number;
  roof: number;
  flag: number;
}

export const BOAT_LOOKS: BoatLook[] = [
  { hull: 0xffffff, stripe: 0xd8392b, cabin: 0xf6f3ea, roof: 0xd8392b, flag: 0x2f7fd0 },
  { hull: 0x3f9a8a, stripe: 0xffffff, cabin: 0xf6f3ea, roof: 0x2f6f63, flag: 0xf2b33d },
  { hull: 0x2f4d7a, stripe: 0xf2b33d, cabin: 0xf6f3ea, roof: 0xd8392b, flag: 0xffffff },
];

interface Gull {
  c: Container;
  wing: Graphics;
  a: number;
  r: number;
  speed: number;
  cy: number;
  dive: number;
}

/** Outrigger angles from straight up: stowed (nearly upright) and fishing (spread out). */
const BOOM_UP = 0.32;
const BOOM_DOWN = 1.22;
const BOOM_LEN = 116;
const MAST_X = -34;
const PIVOT_Y = -30;
const MAST_TOP = -138;

export class ShrimpBoat extends Prop {
  private boat = new Container();
  private booms: Container[] = [];
  private nets: Graphics[] = [];
  private rig = new Graphics();
  private flag = new Graphics();
  private wakeBack = new Graphics();
  /** Water patch + front lip: they slide along with the boat (but don't bob). */
  private waterBack = new Container();
  private waterFront = new Container();
  private gulls: Gull[] = [];
  private t = rand(0, 10);
  /** 0 = booms stowed, 1 = booms out fishing. */
  private spread = 0;
  private hauling = false;
  /** How far the boat has chugged from home, and its speed. */
  private off = 0;
  private v = 0;
  private chugT = 0;
  private puffT = 0;

  constructor(ctx: Ctx, x: number, private look: BoatLook = BOAT_LOOKS[0], private dir: 1 | -1 = 1) {
    super(ctx, x, WATER_Y);
    this.layer = 'back';

    // The boat floats in the scenery water behind the barrier (no water patch of its own,
    // which made it look like it hovered above the river).
    this.view.addChild(this.waterBack, this.wakeBack);

    // The boat (facing `dir`): rigging behind, then booms, hull, cabin.
    this.boat.scale.x = dir;
    this.boat.addChild(this.rig);
    for (const s of [-1, 1]) {
      const boom = new Container();
      const bg = new Graphics();
      bg.roundRect(-2, -BOOM_LEN, 4, BOOM_LEN, 2).fill(ROPE);
      bg.circle(0, -BOOM_LEN, 3.5).fill(darken(ROPE, 0.2));
      boom.addChild(bg);
      boom.position.set(MAST_X, PIVOT_Y);
      boom.rotation = s * BOOM_UP;
      this.booms.push(boom);
      this.boat.addChild(boom);
      const net = new Graphics();
      this.nets.push(net);
      this.boat.addChild(net);
    }
    const g = new Graphics();
    const L = this.look;
    // mast with a crossbar and a crow's nest light
    g.roundRect(MAST_X - 2.5, MAST_TOP, 5, -MAST_TOP - 18, 2).fill(darken(ROPE, 0.1));
    g.roundRect(MAST_X - 16, MAST_TOP + 22, 32, 4, 2).fill(darken(ROPE, 0.1));
    g.circle(MAST_X, MAST_TOP - 3, 4).fill(0xfff1a8);
    // hull: low stern on the left, the bow sweeping up on the right
    g.moveTo(-86, -24)
      .lineTo(66, -24)
      .quadraticCurveTo(90, -26, 102, -40)
      .quadraticCurveTo(98, -8, 80, 4)
      .lineTo(-74, 4)
      .quadraticCurveTo(-88, 2, -88, -12)
      .closePath()
      .fill(L.hull);
    g.moveTo(-86, -8).lineTo(94, -8).lineTo(90, -2).lineTo(-87, -2).closePath().fill(L.stripe);
    g.roundRect(-86, -26, 156, 4, 2).fill({ color: P.white, alpha: 0.55 });
    g.moveTo(46, -24).lineTo(66, -24).quadraticCurveTo(90, -26, 102, -40).quadraticCurveTo(98, -8, 80, 4).lineTo(46, 4).closePath().fill({ color: P.black, alpha: 0.07 });
    // wheelhouse with one long window band (no faces), roof and a stack
    block(g, 2, -66, 50, 42, L.cabin, { radius: 4 });
    g.roundRect(8, -58, 38, 11, 4).fill(0x8fb6d0);
    g.roundRect(10, -57, 9, 9, 3).fill({ color: P.white, alpha: 0.45 });
    g.roundRect(-2, -72, 58, 8, 4).fill(L.roof);
    g.roundRect(-12, -78, 9, 34, 3).fill(0x3a3f45);
    g.roundRect(-12, -72, 9, 5, 2).fill(L.roof);
    // life ring and deck clutter
    g.circle(36, -34, 6).fill(0xf28b3c).circle(36, -34, 3).fill(L.cabin);
    g.roundRect(-70, -34, 26, 10, 3).fill(0xc9b38c);
    this.boat.addChild(g);
    // flag at the masthead
    this.flag.position.set(MAST_X, MAST_TOP + 4);
    this.flag.poly([0, 0, 26, 6, 0, 13]).fill(L.flag);
    this.boat.addChild(this.flag);
    this.view.addChild(this.boat);

    // A thin lip of water over the hull's bottom so it sits in the water, not on it.
    const lip = new Graphics();
    lip.roundRect(-150, -1, 300, 7, 3.5).fill({ color: P.water, alpha: 0.85 });
    lip.roundRect(-110, 0, 70, 2, 1).fill({ color: P.white, alpha: 0.6 });
    this.waterFront.addChild(lip);
    this.view.addChild(this.waterFront);

    // Gulls circling over the nets.
    for (let k = 0; k < 3; k++) {
      const c = new Container();
      const body = new Graphics();
      body.ellipse(0, 0, 8, 4.5).fill(P.white);
      body.circle(7, -2, 3.5).fill(P.white);
      body.poly([10, -2.5, 15, -1.5, 10, -0.5]).fill(0xf2b33d);
      const wing = new Graphics();
      wing.poly([-2, 0, -12, -9, -16, -6, -6, 1]).fill(0xb9c2cc);
      wing.poly([2, 0, 6, -10, 10, -8, 6, 1]).fill(0xd5dbe1);
      c.addChild(wing, body);
      this.gulls.push({ c, wing, a: rand(0, Math.PI * 2), r: rand(40, 80), speed: rand(0.6, 1.0) * (k % 2 ? 1 : -1), cy: -175 - k * 14, dive: 0 });
      this.view.addChild(c);
    }

    this.hits = [{ x: -130, y: MAST_TOP - 20, w: 260, h: -MAST_TOP + 30 }];
    this.extent = [-900, 900];
    this.layoutNets();
  }

  hintTarget(): Container {
    return this.boat;
  }

  private toot(): void {
    const s = this.ctx.sfx.s;
    for (const [d, dur] of [[0, 0.22], [0.3, 0.42]]) {
      s.tone({ freq: 233, dur, hold: dur - 0.06, type: 'sawtooth', gain: 0.06, delay: d, attack: 0.03, filter: 900, q: 2 });
      s.tone({ freq: 349, dur, hold: dur - 0.06, type: 'sine', gain: 0.04, delay: d, attack: 0.03 });
    }
  }

  private gullCall(): void {
    const s = this.ctx.sfx.s;
    for (const d of [0, 0.16, 0.3]) s.tone({ freq: rand(1300, 1500), to: rand(900, 1050), dur: 0.12, type: 'triangle', gain: 0.04, delay: d });
  }

  onTap(): void {
    if (this.hauling) {
      this.chug();
      return;
    }
    this.hauling = true;
    const { tweens, sfx } = this.ctx;
    this.toot();
    // Booms swing out, nets dip in, a pause, then the catch comes up and the booms stow.
    tweens.add(0.9, (p) => (this.spread = p), { ease: ease.inOutSine, delay: 0.35, done: () => sfx.splash(0.8) });
    tweens.after(1.3, () => this.splashAtNets(['drop'], [P.water, P.white], 10));
    tweens.add(0.9, (p) => (this.spread = 1 - p), {
      ease: ease.inOutSine,
      delay: 2.4,
      done: () => {
        this.hauling = false;
        sfx.sparkle();
      },
    });
    tweens.after(2.5, () => {
      this.splashAtNets(['drop'], [P.water, P.white], 8);
      this.splashAtNets(['star', 'circle'], [0xff9e9e, 0xffc2b0, 0xdfe8ee, 0xfff27a], 10);
      this.gullCall();
      for (const gl of this.gulls) gl.dive = 1;
    });
  }

  /** Off it goes, chugging along with a wake and smoke, then it drifts home again. */
  private chug(): void {
    if (this.chugT > 0) return;
    this.chugT = 2.6;
    this.v = 0;
    const s = this.ctx.sfx.s;
    for (let k = 0; k < 8; k++) s.tone({ freq: 70, to: 55, dur: 0.1, type: 'square', gain: 0.05, delay: k * 0.16, filter: 380 });
    this.toot();
  }

  private splashAtNets(shapes: ('drop' | 'star' | 'circle')[], tint: number[], count: number): void {
    for (const s of [-1, 1]) {
      const tipX = MAST_X + Math.sin(s * BOOM_DOWN) * BOOM_LEN;
      const wx = this.view.x + this.boat.x + tipX * this.dir;
      for (const shape of shapes) {
        this.ctx.fx.emit(this.ctx.layers.fxBack, {
          x: wx, y: this.view.y - 4, count: Math.ceil(count / shapes.length), shape, tint,
          speed: [120, 320], angle: [-2.5, -0.6], gravity: 900, life: [0.5, 0.9], size: [6, 11], rotate: false,
        });
      }
    }
  }

  /** Redraw nets and rigging for the current boom angle. */
  private layoutNets(): void {
    const sp = this.spread;
    this.rig.clear();
    this.booms.forEach((boom, i) => {
      const s = i === 0 ? -1 : 1;
      const ang = s * (BOOM_UP + (BOOM_DOWN - BOOM_UP) * sp);
      boom.rotation = ang;
      const tx = MAST_X + Math.sin(ang) * BOOM_LEN;
      const ty = PIVOT_Y - Math.cos(ang) * BOOM_LEN;
      // stay from the masthead to the boom tip
      this.rig.moveTo(MAST_X, MAST_TOP + 6).lineTo(tx, ty).stroke({ width: 1.5, color: ROPE, alpha: 0.8 });
      // the net hangs from the tip: bundled when stowed, dipping into the water when out
      const net = this.nets[i];
      net.clear();
      const bottom = Math.max(ty + 26, ty + (6 - ty) * sp);
      const halfW = 7 + 9 * sp;
      net.moveTo(tx, ty).lineTo(tx, bottom - 18).stroke({ width: 1.5, color: ROPE });
      net.poly([tx - halfW, bottom - 18, tx + halfW, bottom - 18, tx + halfW * 0.4, bottom, tx - halfW * 0.4, bottom]).fill({ color: NET, alpha: 0.85 });
      for (let k = 1; k < 3; k++) net.rect(tx - halfW + 1, bottom - 18 + k * 6, halfW * 2 - 2, 1).fill({ color: darken(NET, 0.25), alpha: 0.6 });
    });
  }

  update(dt: number): void {
    this.t += dt;
    // Bob and rock; a slow drift around home (plus any chug offset springing back).
    if (this.chugT > 0) {
      this.chugT -= dt;
      this.v = Math.min(160, this.v + 220 * dt);
      this.puffT -= dt;
      if (this.puffT <= 0) {
        this.puffT = 0.18;
        const stackX = this.view.x + this.boat.x - 8 * this.dir;
        this.ctx.fx.emit(this.ctx.layers.fxBack, { x: stackX, y: this.view.y - 80, count: 1, shape: 'circle', tint: [0xd9d9d9, 0xc7c7c7], speed: [20, 50], angle: [-2.2, -1.6], gravity: -50, drag: 1.2, life: [0.6, 1.0], size: [8, 12], grow: 2, alpha: 0.7 });
        this.ctx.fx.emit(this.ctx.layers.fxBack, { x: this.view.x + this.boat.x - 86 * this.dir, y: this.view.y + 2, count: 2, shape: 'circle', tint: P.white, speed: [10, 40], angle: [-3, -0.1], gravity: 0, drag: 2, life: [0.5, 0.9], size: [6, 10], grow: 1.5, alpha: 0.7 });
      }
    } else {
      this.v = Math.max(0, this.v - 120 * dt);
    }
    this.off += this.v * this.dir * dt;
    if (this.v === 0) this.off -= this.off * Math.min(1, dt * 0.25);
    this.off = Math.max(-280, Math.min(280, this.off));
    const drift = Math.sin(this.t * 0.18) * 30;
    this.boat.x = this.off + drift;
    this.waterBack.x = this.waterFront.x = this.boat.x;
    this.boat.y = Math.sin(this.t * 1.6) * 2.2;
    this.boat.rotation = Math.sin(this.t * 1.05) * 0.03 - (this.v / 160) * 0.03 * this.dir;
    this.flag.scale.y = 1 + Math.sin(this.t * 9) * 0.12;
    // A little bow wave while moving.
    this.wakeBack.clear();
    if (this.v > 5) {
      const k = this.v / 160;
      const bx = this.boat.x + 96 * this.dir;
      this.wakeBack.ellipse(bx, 0, 18 * k + 6, 4).fill({ color: P.white, alpha: 0.6 * k });
      const len = 150 * k;
      const sx = this.dir > 0 ? this.boat.x - 88 - len : this.boat.x + 88;
      this.wakeBack.roundRect(sx, -1, len, 3, 1.5).fill({ color: P.white, alpha: 0.5 * k });
    }
    if (this.hauling || this.spread > 0) this.layoutNets();
    // Gulls: lazy circles over the boat; after a haul they flap fast and swoop at the nets.
    for (const gl of this.gulls) {
      gl.dive = Math.max(0, gl.dive - dt * 0.6);
      gl.a += gl.speed * dt * (1 + gl.dive * 1.5);
      const cx = this.boat.x + MAST_X * this.dir;
      const swoop = Math.sin(gl.dive * Math.PI) * 70;
      gl.c.position.set(cx + Math.cos(gl.a) * gl.r, gl.cy + Math.sin(gl.a) * gl.r * 0.35 + swoop);
      gl.c.scale.x = Math.sin(gl.a) * Math.sign(gl.speed) > 0 ? -1 : 1;
      gl.wing.scale.y = Math.sin(this.t * (6 + gl.dive * 14) + gl.r) * 0.9;
    }
  }
}

/** Every shrimp boat along the coast. */
export function buildFishingBoats(ctx: Ctx): Prop[] {
  return FISHING_BOAT_X.map((x, i) => new ShrimpBoat(ctx, x, BOAT_LOOKS[i % BOAT_LOOKS.length], i % 2 ? -1 : 1));
}
