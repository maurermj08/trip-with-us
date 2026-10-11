// River-city pieces: a riverwalk with the river on the near side of the road, tall Washingtonia
// palms, pelicans on pilings and a tug pushing a barge. Used by Jacksonville (the St. Johns).
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P, darken } from '../../style/palette';
import { block, contactShadow } from '../../style/shapes';
import { rand } from '../../core/rng';

const RIVER = P.water;
const RIVER_DEEP = 0x52a4d4;
/** Top of the water band (world y, near side of the road). */
export const RIVER_TOP = 62;

// ---------- The river along the near side, with a railed riverwalk ----------
export class RiverBand extends Prop {
  private glints: Graphics[] = [];
  private t = 0;
  /**
   * `openLeft`: the water runs straight on to the left (it continues the water under a bridge);
   * the walk and its rail then start `walkFrom` units in, where the bridge lands.
   */
  constructor(ctx: Ctx, x: number, private len: number, openLeft = false, walkFrom = 0) {
    super(ctx, x, 0);
    this.layer = 'front';
    const g = new Graphics();
    const L = len;
    const w0 = walkFrom;
    const bottom = 420;
    // water, with the shoreline curving away at the ends (open on the left where it continues
    // the river under a bridge)
    if (openLeft) g.moveTo(-60, bottom).lineTo(-60, RIVER_TOP);
    else g.moveTo(-140, bottom).quadraticCurveTo(-60, RIVER_TOP, 60, RIVER_TOP);
    g.lineTo(L - 60, RIVER_TOP).quadraticCurveTo(L + 60, RIVER_TOP, L + 140, bottom).closePath().fill(RIVER);
    // deeper water further out; it eases in from nothing on an open left end (no hard block)
    const deep: number[] = [];
    const dTop = (px: number) => {
      const tl = openLeft ? (px + 60) / 520 : (px - 40) / 300;
      const t = Math.max(0, Math.min(1, tl, (L - 40 - px) / 420));
      return RIVER_TOP + 70 + (1 - t * t * (3 - 2 * t)) * (bottom - RIVER_TOP - 70);
    };
    const dx0 = openLeft ? -60 : 40;
    for (let px = dx0; px < L - 40; px += 40) deep.push(px, dTop(px));
    deep.push(L - 40, dTop(L - 40));
    deep.push(L - 40, bottom, dx0, bottom);
    g.poly(deep).fill(RIVER_DEEP);
    // The riverwalk: a stone seawall face, pavers between the road and the rail, and a rounded
    // end where it meets the shore under the bridge's last stretch.
    const wl = w0 + 20;
    g.roundRect(wl, RIVER_TOP - 4, L - wl, 14, 6).fill(0xbdb5a3);
    g.rect(wl + 6, RIVER_TOP + 6, L - wl - 6, 3).fill({ color: darken(RIVER, 0.2), alpha: 0.35 });
    g.roundRect(wl, 32, L - wl, RIVER_TOP - 28, 10).fill(0xe6e0d2);
    for (let px = wl + 24; px < L; px += 40) g.rect(px, 38, 1.5, RIVER_TOP - 38).fill({ color: P.black, alpha: 0.05 });
    // rail along the walk, starting with a sturdier end post
    const r0 = wl + 18;
    g.roundRect(r0, RIVER_TOP - 26, L - r0, 4, 2).fill(P.white);
    g.roundRect(r0 - 3, RIVER_TOP - 32, 8, 30, 3).fill(P.white);
    for (let px = r0 + 34; px < L; px += 34) g.roundRect(px, RIVER_TOP - 26, 3, 24, 1.5).fill(P.white);
    this.view.addChild(g);
    for (let k = 0; k < Math.floor(L / 260); k++) {
      const s = new Graphics().roundRect(0, 0, rand(30, 70), 3, 1.5).fill({ color: P.white, alpha: 0.6 });
      s.position.set(k * 260 + rand(40, 200), RIVER_TOP + rand(20, 160));
      this.glints.push(s);
      this.view.addChild(s);
    }
    this.hits = [{ x: 0, y: RIVER_TOP, w: L, h: 180 }];
    this.extent = [-300, L + 300];
  }

  onTap(wx: number, wy: number): void {
    this.ctx.sfx.plip();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: wx, y: wy, count: 8, shape: 'drop', tint: [RIVER, P.white], speed: [80, 220], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.7], size: [6, 10], rotate: false });
  }

  update(dt: number): void {
    this.t += dt;
    this.glints.forEach((s, k) => {
      s.x += dt * 12;
      if (s.x > this.len - 80) s.x = 40;
      s.alpha = 0.4 + 0.4 * Math.sin(this.t * 1.5 + k);
    });
  }
}

// ---------- Washingtonia palm: tall skinny trunk, small crown, brown skirt ----------
export function tallPalm(g: Graphics, x: number, y: number, h: number, lean = 0): { cx: number; cy: number } {
  const steps = 10;
  const pts: number[] = [];
  const back: number[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const px = x + lean * h * t * t;
    const half = 7 - t * 2.5;
    pts.push(px - half, y - h * t);
    back.unshift(px + half, y - h * t);
  }
  g.poly([...pts, ...back]).fill(0x9a8068);
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    g.roundRect(x + lean * h * t * t - 5, y - h * t, 10, 2, 1).fill({ color: darken(0x9a8068, 0.15), alpha: 0.6 });
  }
  const cx = x + lean * h, cy = y - h;
  // skirt of old fronds
  g.ellipse(cx, cy + 20, 13, 24).fill(0xb58f5c);
  for (let k = -2; k <= 2; k++) g.roundRect(cx + k * 5 - 1.5, cy + 8, 3, 30 - Math.abs(k) * 4, 1.5).fill(0x9c7a4c);
  return { cx, cy };
}

function palmCrownTall(g: Graphics, r: number): void {
  // a round fan of fronds; the outer ones droop
  for (let k = 0; k < 13; k++) {
    const a = -Math.PI / 2 + (k - 6) * 0.42;
    const len = r * (k % 2 ? 0.8 : 1);
    const droop = Math.max(0, Math.abs(k - 6) - 2) * r * 0.12;
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len * 0.7 + droop;
    const mx = ex * 0.55, my = ey * 0.55 - r * 0.18;
    g.moveTo(0, 0).quadraticCurveTo(mx - 8, my - 8, ex, ey).quadraticCurveTo(mx + 8, my + 8, 0, 0).fill(k % 2 ? 0x4f9a52 : 0x5fae5a);
  }
  g.circle(0, 0, 9).fill(0x4a8a46);
}

export class TallPalm extends Prop {
  private crown = new Container();
  constructor(ctx: Ctx, x: number, y: number, h = 380, lean = 0.05, front = false) {
    super(ctx, x, y);
    this.layer = front ? 'front' : 'back';
    const g = new Graphics();
    contactShadow(g, 0, 0, 60);
    const { cx, cy } = tallPalm(g, 0, 0, h, lean);
    this.view.addChild(g);
    const c = new Graphics();
    palmCrownTall(c, 70);
    this.crown.addChild(c);
    this.crown.position.set(cx, cy);
    this.view.addChild(this.crown);
    this.hits = [{ x: cx - 60, y: cy - 60, w: 120, h: 90 }, { x: -14, y: -h, w: 28, h }];
    this.extent = [-200, 200];
  }

  hintTarget(): Container {
    return this.crown;
  }

  onTap(): void {
    this.ctx.sfx.rustle();
    this.ctx.tweens.wobble(this.crown, 0.14, 1.1, 0.04);
  }
}

// ---------- Pelicans on pilings: tap one and it dives for a fish ----------
// Each pelican is ONE rigged bird: a container holding the far wing, body, neck + head (with the
// bill and pouch) and the near wing. The whole bird moves as one; only the wings, head and pouch
// animate inside it, so nothing can drift apart.
const PEL_BODY = 0xe9e5dd;
const PEL_GREY = 0x9a958e;
const PEL_DARK = 0x6f6a64;
const PEL_BILL = 0xf2a33d;

interface PelicanRig {
  bird: Container;
  body: Container;
  head: Container;
  pouch: Graphics;
  fish: Graphics;
  wings: Container[];
}

function makePelican(): PelicanRig {
  const bird = new Container();
  const body = new Container();
  // A wing: a long rounded feather shape from the shoulder backwards, with dark flight feathers.
  const wing = (near: boolean) => {
    const w = new Container();
    const g = new Graphics();
    g.moveTo(0, 0).quadraticCurveTo(-20, -16, -54, -6).quadraticCurveTo(-60, -2, -56, 4)
      .quadraticCurveTo(-28, 10, 0, 8).closePath().fill(near ? PEL_GREY : PEL_DARK);
    g.moveTo(-34, 0).quadraticCurveTo(-48, -6, -58, -2).quadraticCurveTo(-56, 5, -36, 6).closePath().fill(near ? PEL_DARK : 0x57524d);
    w.addChild(g);
    w.position.set(6, -22);
    return w;
  };
  const far = wing(false);
  const near = wing(true);
  const g = new Graphics();
  // tail + body
  g.poly([-26, -20, -40, -24, -38, -14, -24, -12]).fill(PEL_GREY);
  g.ellipse(-2, -18, 26, 14).fill(PEL_BODY);
  g.ellipse(4, -12, 18, 7).fill({ color: 0xffffff, alpha: 0.5 });
  // feet
  g.roundRect(-6, -6, 5, 8, 2).fill(0x8a6a4a);
  g.roundRect(4, -6, 5, 8, 2).fill(0x8a6a4a);
  body.addChild(g);
  // neck + head (pivot at the base of the neck)
  const head = new Container();
  const h = new Graphics();
  h.moveTo(-6, 0).quadraticCurveTo(-10, -18, -2, -30).lineTo(8, -30).quadraticCurveTo(2, -16, 6, 0).closePath().fill(PEL_BODY);
  h.circle(2, -34, 9).fill(0xf6f2ea);
  h.ellipse(-2, -40, 6, 3).fill(0xf2d16b);
  h.circle(5, -36, 1.9).fill(0x24262a);
  // long bill (upper mandible) with the hooked tip
  h.moveTo(6, -38).lineTo(44, -34).quadraticCurveTo(48, -33, 46, -30).lineTo(8, -31).closePath().fill(PEL_BILL);
  const pouch = new Graphics();
  pouch.moveTo(0, 0).quadraticCurveTo(18, 7, 36, 1).lineTo(36, 0).closePath().fill(0xe8913a);
  pouch.position.set(8, -31);
  const fish = new Graphics();
  fish.ellipse(0, 0, 9, 4).fill(0x9fb7c8);
  fish.poly([8, 0, 15, -5, 15, 5]).fill(0x9fb7c8);
  fish.position.set(44, -30);
  fish.visible = false;
  head.addChild(h, pouch, fish);
  head.position.set(14, -26);
  bird.addChild(far, body, head, near);
  return { bird, body, head, pouch, fish, wings: [far, near] };
}

type PelicanState = 'perch' | 'takeoff' | 'glide' | 'dive' | 'swim' | 'gulp' | 'flyback' | 'land';

interface Pelican {
  rig: PelicanRig;
  home: { x: number; y: number };
  dir: number;
  state: PelicanState;
  t: number;
  /** Idle fidget timer and which fidget is running. */
  idleT: number;
  fidget: 'none' | 'look' | 'preen' | 'stretch';
  fidgetT: number;
  /** Where it splashed down, and the flight path endpoints for the current leg. */
  water: { x: number; y: number };
  from: { x: number; y: number };
}

const DUR: Record<PelicanState, number> = { perch: 0, takeoff: 0.45, glide: 0.9, dive: 0.4, swim: 0.6, gulp: 0.8, flyback: 1.2, land: 0.4 };

export class Pelicans extends Prop {
  private birds: Pelican[] = [];
  constructor(ctx: Ctx, x: number, count = 3, spacing = 150) {
    super(ctx, x, 0);
    this.layer = 'front';
    const g = new Graphics();
    for (let k = 0; k < count; k++) {
      const px = k * spacing, top = RIVER_TOP + 34 + (k % 2) * 14;
      const len = 150;
      g.roundRect(px - 9, top, 18, len, 6).fill(0x8a6a4a);
      g.roundRect(px + 3, top, 6, len, 3).fill({ color: P.black, alpha: 0.1 });
      g.ellipse(px, top + 1, 9, 3).fill(0xa7845f);
      // the water line around the piling
      g.ellipse(px, top + len - 8, 22, 4).fill({ color: P.white, alpha: 0.45 });
      g.rect(px - 9, top + len - 8, 18, 10).fill(RIVER);
    }
    this.view.addChild(g);
    for (let k = 0; k < count; k++) {
      const rig = makePelican();
      const home = { x: k * spacing, y: RIVER_TOP + 34 + (k % 2) * 14 + 2 };
      const dir = k % 2 ? -1 : 1;
      rig.bird.position.set(home.x, home.y);
      rig.bird.scale.x = dir;
      this.view.addChild(rig.bird);
      this.birds.push({
        rig, home, dir, state: 'perch', t: 0, idleT: rand(1.5, 5), fidget: 'none', fidgetT: 0,
        water: { x: home.x, y: home.y }, from: { x: home.x, y: home.y },
      });
    }
    this.hits = [{ x: -50, y: RIVER_TOP - 30, w: (count - 1) * spacing + 100, h: 150 }];
    this.extent = [-400, count * spacing + 400];
  }

  hintTarget(): Container {
    return this.birds[0].rig.bird;
  }

  onTap(wx: number): void {
    const lx = wx - this.x;
    const free = this.birds.filter((b) => b.state === 'perch').sort((a, b) => Math.abs(a.home.x - lx) - Math.abs(b.home.x - lx));
    const b = free[0];
    if (!b) {
      this.ctx.sfx.squeak();
      return;
    }
    this.setFidget(b, 'none');
    b.state = 'takeoff';
    b.t = 0;
    b.from = { x: b.home.x, y: b.home.y };
    // dive spot: out over the open water, in the direction it faces
    b.water = { x: b.home.x + b.dir * rand(150, 220), y: RIVER_TOP + 150 };
    this.ctx.sfx.whoosh();
  }

  private setFidget(b: Pelican, f: Pelican['fidget']): void {
    b.fidget = f;
    b.fidgetT = 0;
    b.rig.head.rotation = 0;
    b.rig.head.scale.x = 1;
    b.rig.wings.forEach((w) => (w.rotation = 0));
  }

  /** Flap the wings (far wing lags a touch): `amp` 0 = folded, 1 = full flaps. */
  private flap(b: Pelican, phase: number, amp: number, spread: number): void {
    const [far, near] = b.rig.wings;
    const base = -spread;
    near.rotation = base + Math.sin(phase) * 0.9 * amp;
    far.rotation = base * 0.85 + Math.sin(phase - 0.5) * 0.8 * amp;
  }

  update(dt: number): void {
    for (const b of this.birds) {
      const r = b.rig;
      if (r.bird.destroyed) continue;
      b.t += dt;
      const p = DUR[b.state] ? Math.min(1, b.t / DUR[b.state]) : 0;
      const sm = p * p * (3 - 2 * p);
      const next = (s: PelicanState) => {
        b.state = s;
        b.t = 0;
      };
      switch (b.state) {
        case 'perch': {
          r.bird.position.set(b.home.x, b.home.y);
          r.bird.rotation = 0;
          r.body.y = Math.sin(b.t * 1.7 + b.home.x) * 0.6;
          b.idleT -= dt;
          if (b.fidget === 'none' && b.idleT <= 0) {
            const opts = ['look', 'preen', 'stretch'] as const;
            this.setFidget(b, opts[Math.floor(Math.random() * 3)]);
            b.idleT = rand(3, 7);
          }
          if (b.fidget !== 'none') {
            b.fidgetT += dt;
            const q = Math.min(1, b.fidgetT / 1.6);
            const bump = Math.sin(q * Math.PI);
            if (b.fidget === 'look') {
              // glance back over its shoulder, then forward again
              r.head.scale.x = q > 0.3 && q < 0.7 ? -1 : 1;
              r.head.rotation = -0.15 * bump;
            } else if (b.fidget === 'preen') {
              r.head.rotation = 0.9 * bump;
            } else {
              // a big wing stretch
              r.wings[1].rotation = -1.4 * bump;
              r.wings[0].rotation = -1.1 * bump;
            }
            if (q >= 1) this.setFidget(b, 'none');
          }
          break;
        }
        case 'takeoff': {
          // crouch, then spring up and out with big flaps
          const up = p < 0.3 ? 4 * (p / 0.3) : 4 - 64 * ((p - 0.3) / 0.7);
          r.bird.position.set(b.home.x + b.dir * 40 * sm, b.home.y + up);
          r.bird.rotation = -0.15 * b.dir * sm;
          this.flap(b, b.t * 22, p < 0.3 ? 0 : 1, 0.5);
          if (p >= 1) next('glide');
          break;
        }
        case 'glide': {
          // arc out over the water, wings spread with a lazy flap
          const sx = b.home.x + b.dir * 40, ex = b.water.x;
          r.bird.position.set(sx + (ex - sx) * sm, b.home.y - 60 - Math.sin(p * Math.PI) * 30);
          r.bird.rotation = -0.1 * b.dir;
          this.flap(b, b.t * 9, 0.35, 1.0);
          if (p >= 1) next('dive');
          break;
        }
        case 'dive': {
          // fold the wings back and plunge, bill first
          const y0 = b.home.y - 60;
          r.bird.position.set(b.water.x + b.dir * 10 * p, y0 + (b.water.y - y0) * p * p);
          r.bird.rotation = b.dir * 1.35 * Math.min(1, p * 2);
          r.wings.forEach((w) => (w.rotation = 0.5 * sm));
          if (p >= 1) {
            this.ctx.sfx.splash(0.9);
            const { fx, layers } = this.ctx;
            fx.emit(layers.fx, { x: this.x + b.water.x, y: this.y + b.water.y, count: 14, shape: 'drop', tint: [RIVER, P.white, 0xbfe6ff], speed: [140, 340], angle: [-2.7, -0.45], gravity: 900, life: [0.5, 0.9], size: [6, 11], rotate: false });
            r.bird.alpha = 0;
            next('swim');
          }
          break;
        }
        case 'swim': {
          // bobs back up, sitting on the water with a fish in its bill and a full pouch
          r.bird.alpha = Math.min(1, p * 3);
          r.bird.rotation = 0;
          r.bird.position.set(b.water.x, b.water.y - 6 + Math.sin(b.t * 6) * 1.5);
          r.wings.forEach((w) => (w.rotation = 0));
          r.fish.visible = p < 0.8;
          r.pouch.scale.y = 1 + 1.6 * sm;
          if (p >= 1) next('gulp');
          break;
        }
        case 'gulp': {
          // toss the head back and swallow
          r.fish.visible = false;
          r.head.rotation = -0.7 * Math.sin(p * Math.PI);
          r.pouch.scale.y = 2.6 - 1.6 * sm;
          r.bird.position.set(b.water.x, b.water.y - 6 + Math.sin(b.t * 6) * 1.5);
          if (b.t - dt < 0.25 && b.t >= 0.25) this.ctx.sfx.gulp();
          if (p >= 1) {
            r.head.rotation = 0;
            r.pouch.scale.y = 1;
            b.from = { x: b.water.x, y: b.water.y - 6 };
            next('flyback');
          }
          break;
        }
        case 'flyback': {
          // run along the water flapping, lift off, arc home (turned around to face home)
          const toHome = Math.sign(b.home.x - b.from.x) || -b.dir;
          r.bird.scale.x = toHome;
          const x = b.from.x + (b.home.x - b.from.x) * sm;
          const y = b.from.y + (b.home.y - 40 - b.from.y) * sm - Math.sin(p * Math.PI) * 50;
          r.bird.position.set(x, y);
          r.bird.rotation = -0.12 * toHome * Math.sin(p * Math.PI);
          this.flap(b, b.t * 16, 1, 0.6);
          if (p >= 1) next('land');
          break;
        }
        case 'land': {
          // glide down onto the piling, wings spread then folded, a little settle
          r.bird.position.set(b.home.x, b.home.y - 40 * (1 - sm));
          r.bird.rotation = 0;
          this.flap(b, 0, 0, 1.1 * (1 - sm));
          r.body.scale.y = 1 - 0.08 * Math.sin(p * Math.PI);
          if (p >= 1) {
            r.body.scale.y = 1;
            r.bird.scale.x = b.dir;
            this.setFidget(b, 'none');
            b.idleT = rand(2, 5);
            next('perch');
          }
          break;
        }
      }
    }
  }
}

// ---------- Tug pushing a barge up the river (tap: horn and smoke puffs) ----------
export class Tugboat extends Prop {
  private boat = new Container();
  private stack = new Container();
  private dist: number;
  private pos = 0;
  constructor(ctx: Ctx, x: number, span: number, start = 0.2) {
    super(ctx, x, RIVER_TOP + 46);
    this.layer = 'front';
    this.dist = span;
    this.pos = start * span;
    const g = new Graphics();
    // barge in front (to the right) with colorful containers
    g.roundRect(70, -10, 300, 30, 10).fill(0x7d6a5a);
    g.roundRect(70, -10, 300, 6, 3).fill(0x95806d);
    const colors = [0xe9637a, 0x3f7fd1, 0xf2b33d, 0x5aa357, 0xe9637a, 0x3f7fd1];
    colors.forEach((c, k) => block(g, 86 + (k % 3) * 92, -46 - Math.floor(k / 3) * 34, 86, 34, c, { radius: 3 }));
    // tug: hull, cabin, wheelhouse windows (no face), stack
    g.roundRect(-70, -6, 140, 30, 14).fill(0xd8392b);
    g.roundRect(-70, -6, 140, 6, 3).fill(0x24262a);
    g.roundRect(56, -14, 18, 34, 8).fill(0x3a3a3a);
    block(g, -40, -46, 70, 40, P.white, { radius: 5 });
    block(g, -30, -78, 52, 34, P.white, { radius: 5 });
    g.roundRect(-24, -70, 40, 12, 3).fill(0x7fb6dc);
    g.roundRect(-60, 8, 120, 6, 3).fill({ color: P.black, alpha: 0.15 });
    this.boat.addChild(g);
    const s = new Graphics();
    s.roundRect(-8, -40, 16, 40, 4).fill(0x24262a);
    s.roundRect(-8, -32, 16, 6, 2).fill(0xf2b33d);
    this.stack.addChild(s);
    this.stack.position.set(-50, -40);
    this.boat.addChild(this.stack);
    this.view.addChild(this.boat);
    this.hits = [];
    this.extent = [-400, span + 600];
    this.syncHits();
  }

  private syncHits(): void {
    this.boat.x = this.pos;
    this.hits = [{ x: this.pos - 80, y: -90, w: 460, h: 120 }];
  }

  hintTarget(): Container {
    return this.boat;
  }

  onTap(): void {
    this.ctx.sfx.shipHorn();
    this.ctx.tweens.wobble(this.boat, 0.03, 1, 0.03);
    this.ctx.tweens.wobble(this.stack, 0.15, 0.8, 0.1);
    for (let k = 0; k < 3; k++) {
      this.ctx.tweens.after(k * 0.25, () => this.ctx.fx.emit(this.ctx.layers.fx, {
        x: this.x + this.boat.x - 50, y: this.y - 84, count: 1, shape: 'circle', tint: 0xe9edf1, speed: [30, 60], angle: [-2, -1.4], gravity: -40, life: [1.2, 1.6], size: [16, 22], grow: 2.2, alpha: 0.85,
      }));
    }
  }

  update(dt: number): void {
    // Chugs slowly upriver; loops back once it's past the end.
    this.pos += dt * 28;
    if (this.pos > this.dist) this.pos = 0;
    this.syncHits();
    this.boat.y = Math.sin(this.pos * 0.05) * 2;
    // Fade in and out at the ends of its run so the loop never pops.
    this.boat.alpha = Math.max(0, Math.min(1, this.pos / 200, (this.dist - this.pos) / 200));
  }
}
