// A generic airport behind the interstate barrier, small (regional) or large (international).
// The star is the runway: a plane holds at the start, spools up, rolls and climbs away across the
// sky (on a tap, or by itself when the car comes by), and a new one taxis out a few seconds later.
// Around it: terminal (PA chime, travelers), control tower (tap: next takeoff), hangar with a
// prop plane, windsock, fuel truck and a baggage train. The large one adds jet bridges with parked
// planes, a radar, approach "rabbit" lights and a landing plane every ~40 s.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, SKIN, darken } from '../style/palette';
import { block, contactShadow, cornerRect } from '../style/shapes';
import { ease } from '../core/Tween';
import { rand } from '../core/rng';
import type { AirportSpec } from '../world/Route';
import { LIVERIES, makePlane, makePropPlane, type Livery, type PlaneView } from './kit/planes';

/** Where airport buildings stand (behind the runway). */
const APRON = -98;
/** The runway band (its bottom edge hides behind the barrier at -72). */
const RUNWAY_TOP = -100;
const RUNWAY_BOTTOM = -70;
/** Where plane wheels touch. */
const WHEELS = -86;

const CONCRETE = 0xe8e4dc;
const CONCRETE_SHADE = 0xd6d1c6;
const GLASS = 0x9fd0ee;
const GLASS_DARK = 0x7fb6dc;
const SUITCASE = 0x2fa3a0;

export const AIRPORT_Z = { building: 0, apron: 1, field: 4 };

// ---------- The runway and its planes ----------
type Phase = 'taxi' | 'hold' | 'spool' | 'roll' | 'climb' | 'approach' | 'rollout' | 'gone';

interface Flight {
  pv: PlaneView;
  phase: Phase;
  /** Local x of the main gear, altitude above the runway, speed, pitch. */
  px: number;
  alt: number;
  v: number;
  pitch: number;
  t: number;
  waggle: number;
  departing: boolean;
  /** Approach: touchdown x and start point. */
  tx?: number;
  sx?: number;
  sAlt?: number;
}

export class Airfield extends Prop {
  private flights: Flight[] = [];
  private lights: Graphics[] = [];
  private nextLivery = rand(0, 4) | 0;
  private respawn = -1;
  private queued = false;
  private landingIn = 4;
  private beaconT = 0;
  readonly holdX = 260;

  constructor(ctx: Ctx, x: number, readonly len: number, readonly large: boolean) {
    super(ctx, x, 0);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.field;
    const g = new Graphics();
    // Grass shoulder, runway, centreline dashes, threshold stripes.
    g.rect(-600, RUNWAY_TOP - 8, len + 1200, RUNWAY_BOTTOM - RUNWAY_TOP + 8).fill(0x8cc66b);
    g.roundRect(-120, RUNWAY_TOP, len + 240, RUNWAY_BOTTOM - RUNWAY_TOP, 6).fill(0x8a9096);
    g.rect(-120, RUNWAY_TOP, len + 240, 2).fill({ color: P.white, alpha: 0.35 });
    for (let lx = 300; lx < len - 100; lx += 160) g.roundRect(lx, -87, 80, 4, 2).fill({ color: P.white, alpha: 0.9 });
    for (let k = 0; k < 6; k++) g.roundRect(-80 + k * 22, -96, 12, 18, 2).fill({ color: P.white, alpha: 0.85 });
    for (let k = 0; k < 6; k++) g.roundRect(len + 80 - k * 22 - 12, -96, 12, 18, 2).fill({ color: P.white, alpha: 0.85 });
    this.view.addChild(g);
    // Edge lights (twinkle when tapped).
    for (let lx = -100; lx <= len + 100; lx += 140) {
      const l = new Graphics().circle(0, 0, 3).fill(lx < 0 ? 0x6fe08a : 0xfff6c8);
      l.position.set(lx, RUNWAY_TOP + 1);
      l.alpha = 0.7;
      this.lights.push(l);
      this.view.addChild(l);
    }
    this.hits = [{ x: -120, y: RUNWAY_TOP - 10, w: len + 240, h: 26 }];
    this.extent = [-1500, len + 4000];
    this.spawnTaxi(true);
  }

  // ----- planes -----

  private newPlane(): PlaneView {
    const livery: Livery = LIVERIES[this.nextLivery++ % LIVERIES.length];
    const pv = makePlane(livery, this.large ? 430 : 360);
    this.view.addChild(pv.view);
    return pv;
  }

  /** A fresh plane rolls in from the taxiway to the hold point (or is already there at build). */
  private spawnTaxi(ready = false): void {
    const pv = this.newPlane();
    const f: Flight = { pv, phase: ready ? 'hold' : 'taxi', px: ready ? this.holdX : this.holdX - 520, alt: 0, v: 130, pitch: 0, t: ready ? 10 : 0, waggle: 0, departing: true };
    pv.view.alpha = ready ? 1 : 0;
    this.flights.push(f);
    this.place(f);
  }

  private holding(): Flight | undefined {
    return this.flights.find((f) => f.departing && (f.phase === 'hold' || f.phase === 'taxi'));
  }

  /** Clear the plane at the hold point for takeoff (from a tap on it or on the tower). */
  takeoff(): void {
    const f = this.holding();
    if (!f) return;
    if (f.phase === 'taxi') {
      this.queued = true;
      return;
    }
    f.phase = 'spool';
    f.t = 0;
    this.ctx.sfx.jetSpool();
  }

  private place(f: Flight): void {
    const { pv } = f;
    pv.view.position.set(f.px, WHEELS - f.alt);
    pv.body.rotation = f.pitch + Math.sin(f.t * 22) * f.waggle;
    pv.shadow.y = f.alt;
    pv.shadow.alpha = Math.max(0, 1 - f.alt / 220);
  }

  private retractGear(f: Flight): void {
    const gear = f.pv.gear;
    this.ctx.tweens.add(0.8, (p) => !gear.destroyed && ((gear.scale.y = 1 - p), (gear.alpha = 1 - p)), { ease: ease.inOutSine });
  }

  private startLanding(): boolean {
    const camLocal = this.ctx.camX() - this.x;
    const sx = camLocal - this.ctx.viewWidth() * 0.4;
    const tx = sx + 2100;
    if (tx < 500 || tx > this.len - 1600) return false;
    const pv = this.newPlane();
    pv.gear.alpha = 1;
    this.flights.push({ pv, phase: 'approach', px: sx, alt: 400, v: 640, pitch: -0.06, t: 0, waggle: 0, departing: false, tx, sx, sAlt: 400 });
    return true;
  }

  update(dt: number): void {
    const car = this.ctx.car;
    this.beaconT += dt;
    for (const f of this.flights) {
      f.t += dt;
      f.waggle = Math.max(0, f.waggle - dt * 0.12);
      f.pv.beacon.alpha = Math.sin(this.beaconT * 7 + f.px * 0.01) > 0.6 ? 1 : 0.25;
      switch (f.phase) {
        case 'taxi':
          f.px += f.v * dt;
          f.pv.view.alpha = Math.min(1, f.pv.view.alpha + dt * 1.2);
          if (f.px >= this.holdX) {
            f.px = this.holdX;
            f.phase = 'hold';
            f.t = 0;
            if (this.queued) {
              this.queued = false;
              this.takeoff();
            }
          }
          break;
        case 'hold': {
          // The car coming past is the takeoff cue (after a moment at the hold point). Timed by the
          // car's speed so the plane rotates and climbs while it's on screen.
          const d = car.x - (this.x + this.holdX);
          if (f.t > 2.5 && car.speed > 60 && d < 300 && d > -400 - car.vx * 1.2) this.takeoff();
          break;
        }
        case 'spool':
          f.pv.body.y = Math.sin(f.t * 60) * 0.6;
          if (f.t > 1.2) {
            f.phase = 'roll';
            f.v = 0;
            f.pv.body.y = 0;
            this.ctx.sfx.jetRoar();
          }
          break;
        case 'roll':
          f.v += 800 * dt;
          f.px += f.v * dt;
          if (f.v > 520) {
            f.phase = 'climb';
            f.t = 0;
          }
          break;
        case 'climb':
          // Cartoon climb: steep and quick, so it outruns the car and rises across the screen.
          f.v = Math.min(f.v + 1000 * dt, 2000);
          f.pitch = Math.max(-0.28, f.pitch - dt * 0.6);
          f.alt += f.v * 0.3 * dt;
          f.px += f.v * dt;
          if (f.alt > 50 && f.pv.gear.scale.y === 1 && f.pv.gear.alpha === 1) this.retractGear(f);
          if (f.alt > 1300 || f.px > this.len + 3600) f.phase = 'gone';
          break;
        case 'approach': {
          f.px += f.v * dt;
          const p = Math.min(1, (f.px - f.sx!) / (f.tx! - f.sx!));
          f.alt = f.sAlt! * (1 - p) * (1 - p * 0.3);
          if (p >= 1) {
            f.alt = 0;
            f.phase = 'rollout';
            f.t = 0;
            this.ctx.sfx.fwoomp();
            for (const dx of [0, 0.4 * f.pv.length]) {
              this.ctx.fx.emit(this.ctx.layers.fxBack, { x: this.x + f.px + dx - 10, y: WHEELS - 2, count: 6, shape: 'circle', tint: [0xe8e8e8, P.white], speed: [30, 90], angle: [-3, -1.9], gravity: -20, drag: 2, life: [0.6, 1.1], size: [10, 18], grow: 1.8, alpha: 0.7 });
            }
          }
          break;
        }
        case 'rollout':
          f.pitch = Math.min(0, f.pitch + dt * 0.2);
          f.v = Math.max(140, f.v - 280 * dt);
          f.px += f.v * dt;
          if (f.v <= 140) f.pv.view.alpha = Math.max(0, f.pv.view.alpha - dt * 0.5);
          if (f.pv.view.alpha <= 0 || f.px > this.len + 200) f.phase = 'gone';
          break;
        case 'gone':
          break;
      }
      if (f.phase !== 'gone') this.place(f);
    }
    // Clear finished flights; a new plane taxis out ~5 s after a departure.
    for (const f of this.flights.filter((q) => q.phase === 'gone')) {
      f.pv.view.destroy({ children: true });
      if (f.departing) this.respawn = 5;
    }
    this.flights = this.flights.filter((q) => q.phase !== 'gone');
    if (this.respawn > 0) {
      this.respawn -= dt;
      if (this.respawn <= 0) this.spawnTaxi();
    }
    if (this.large) {
      this.landingIn -= dt;
      if (this.landingIn <= 0) this.landingIn = this.startLanding() ? 40 : 3;
    }
  }

  // ----- taps -----

  private flightAt(wx: number, wy: number, pad: number): Flight | undefined {
    const lx = wx - this.x, ly = wy - this.y;
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      const L = f.pv.length;
      const cx = f.pv.view.x, by = f.pv.view.y;
      if (lx > cx - 0.48 * L - pad && lx < cx + 0.55 * L + pad && ly > by - 0.38 * L - pad && ly < by + pad) return f;
    }
    return undefined;
  }

  hitTest(wx: number, wy: number, pad = 18): boolean {
    return !!this.flightAt(wx, wy, pad) || super.hitTest(wx, wy, pad);
  }

  hintTarget(): Container {
    return this.holding()?.pv.body ?? this.view;
  }

  onTap(wx: number, wy: number): void {
    const f = this.flightAt(wx, wy, 18);
    if (f && (f.phase === 'hold' || f.phase === 'taxi')) {
      this.ctx.sfx.beepBeep();
      this.ctx.tweens.wobble(f.pv.body, 0.02, 0.5, 0.04);
      this.takeoff();
      return;
    }
    if (f) {
      // In the air (or rolling): a friendly wing waggle.
      f.waggle = 0.09;
      this.ctx.sfx.whistleUp();
      this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x + f.pv.view.x, y: f.pv.view.y - f.pv.length * 0.15, count: 8, shape: 'star', tint: [0xfff27a, P.white], speed: [80, 200], gravity: 100, life: [0.5, 0.9], size: [8, 12] });
      return;
    }
    // The runway itself: the edge lights run toward the far end.
    this.ctx.sfx.pluck(rand(0, 5) | 0, 0.12);
    const lx = wx - this.x;
    this.lights.forEach((l) => {
      const d = Math.abs(l.x - lx);
      if (d > 1400) return;
      this.ctx.tweens.add(0.5, (p) => !l.destroyed && (l.alpha = 0.7 + Math.sin(p * Math.PI) * 0.3, l.scale.set(1 + Math.sin(p * Math.PI) * 1.4)), { delay: d / 2400 });
    });
  }
}

// ---------- Terminal ----------
interface Walker { c: Container; leg: Graphics }

export class Terminal extends Prop {
  private glass = { x: 0, w: 0, floor: 0 };
  private walkers = 0;

  constructor(ctx: Ctx, x: number, readonly w: number, readonly large: boolean) {
    super(ctx, x, APRON);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.building;
    const h = large ? 190 : 140;
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w * 1.02, 0.1);
    // Concrete body, glass wall, and the wave roof floating over it.
    block(g, 0, -h, w, h, CONCRETE, { landmark: true, shade: CONCRETE_SHADE });
    const gx = 18, gw = w - 36, gTop = -h + 26, gBot = -22;
    g.roundRect(gx, gTop, gw, gBot - gTop, 4).fill(GLASS);
    cornerRect(g, gx + gw * 0.72, gTop, gw * 0.28, gBot - gTop, 0, 4, 4, 0).fill(GLASS_DARK);
    for (let mx = gx + 40; mx < gx + gw; mx += 40) g.rect(mx - 1.5, gTop, 3, gBot - gTop).fill({ color: P.white, alpha: 0.7 });
    if (large) g.rect(gx, (gTop + gBot) / 2 - 2, gw, 5).fill(CONCRETE);
    for (let k = 0; k < Math.floor(gw / 260); k++) {
      const sx = gx + 40 + k * 260;
      g.poly([sx, gBot, sx + 34, gBot, sx + 94, gTop, sx + 60, gTop]).fill({ color: P.white, alpha: 0.22 });
    }
    // Wave roof.
    const waves = Math.max(2, Math.round(w / 500));
    const roofY = -h - 6;
    g.moveTo(-30, roofY + 14);
    for (let k = 0; k < waves; k++) {
      const a = -30 + ((w + 60) * k) / waves, b = -30 + ((w + 60) * (k + 1)) / waves;
      g.quadraticCurveTo((a + b) / 2, roofY - 46, b, roofY + 6);
    }
    g.lineTo(w + 30, roofY + 22).lineTo(-30, roofY + 22).closePath().fill(0xf6f7f9);
    g.roundRect(-30, roofY + 16, w + 60, 8, 4).fill(0xc9ced5);
    // Entrance canopy and doors.
    const ex = large ? w * 0.18 : w * 0.3;
    g.roundRect(ex - 60, -54, 120, 10, 4).fill(0xc9ced5);
    g.roundRect(ex - 30, -44, 60, 44, 3).fill(0x5d7d96);
    g.rect(ex - 1, -44, 2, 44).fill({ color: P.white, alpha: 0.6 });
    // A round plane-icon badge (no airport name).
    g.circle(w * 0.5, -h + 13, 11).fill(0x2f6fb5);
    g.poly([w * 0.5 - 7, -h + 14, w * 0.5 + 8, -h + 12, w * 0.5 + 8, -h + 15]).fill(P.white);
    g.poly([w * 0.5 - 1, -h + 13, w * 0.5 + 3, -h + 13, w * 0.5 - 3, -h + 5]).fill(P.white);
    this.view.addChild(g);
    this.glass = { x: gx, w: gw, floor: gBot };

    if (large) {
      // Jet bridges reaching out to two parked planes (nose toward the terminal: facing -x is not
      // possible in side view, so they're parked broadside, nose right, like the departing ones).
      const gates = [w * 0.42, w * 0.72];
      gates.forEach((gxp, i) => {
        const pv = makePlane(LIVERIES[(i + 1) % LIVERIES.length], 300);
        pv.view.position.set(gxp, 14);
        this.view.addChild(pv.view);
        const jb = new Graphics();
        jb.roundRect(gxp + 40, -86, 120, 30, 10).fill(0xdfe3e8);
        jb.roundRect(gxp + 40, -86, 120, 3, 1.5).fill({ color: P.white, alpha: 0.6 });
        jb.roundRect(gxp + 140, -62, 10, 62, 3).fill(0x9aa3ad);
        jb.circle(gxp + 145, -2, 6).fill(0x2b2f33);
        jb.roundRect(gxp + 150, -90, 30, 38, 8).fill(0xc9ced5);
        this.view.addChild(jb);
      });
    }
    this.hits = [{ x: -30, y: -h - 60, w: w + 60, h: h + 60 }];
    this.extent = [-300, w + 300];
  }

  onTap(wx: number): void {
    this.ctx.sfx.paChime();
    this.ctx.tweens.wobble(this.view, 0.004, 0.5, 0.01);
    if (this.walkers > 8) return;
    // Tiny travelers stroll across the glass with their suitcases.
    const lx = Math.max(this.glass.x + 40, Math.min(this.glass.x + this.glass.w - 40, wx - this.x));
    const n = 3 + ((Math.random() * 2) | 0);
    for (let k = 0; k < n; k++) this.walk(lx + (k - n / 2) * 34, k % 2 ? 1 : -1, k * 0.25);
  }

  private walk(x0: number, dir: number, delay: number): void {
    const w = this.makeWalker();
    w.c.position.set(x0, this.glass.floor);
    w.c.scale.x = dir;
    w.c.alpha = 0;
    this.view.addChild(w.c);
    this.walkers++;
    const dist = rand(160, 260) * dir;
    this.ctx.tweens.add(3.2, (p) => {
      if (w.c.destroyed) return;
      w.c.x = x0 + dist * p;
      w.c.y = this.glass.floor - Math.abs(Math.sin(p * 24)) * 1.5;
      w.leg.rotation = Math.sin(p * 24) * 0.4;
      w.c.alpha = Math.min(1, p * 8, (1 - p) * 8);
    }, {
      delay,
      done: () => {
        this.walkers--;
        if (!w.c.destroyed) w.c.destroy({ children: true });
      },
    });
  }

  private makeWalker(): Walker {
    const c = new Container();
    const shirt = [0xe9637a, 0x3f7fd1, 0xf7c934, 0x7fbf6a, 0xc5a3ff][(Math.random() * 5) | 0];
    const leg = new Graphics().roundRect(-2, 0, 4, 10, 2).fill(0x3b4a5c);
    leg.position.set(0, -10);
    const g = new Graphics();
    g.roundRect(-2, -10, 4, 10, 2).fill(0x3b4a5c);
    g.roundRect(-5, -24, 10, 15, 4).fill(shirt);
    g.circle(0, -28, 4.5).fill(SKIN[(Math.random() * SKIN.length) | 0]);
    // rolling suitcase behind them
    g.roundRect(-14, -12, 8, 11, 2).fill(Math.random() < 0.3 ? SUITCASE : [0xf28b82, 0x5b6d8a, 0xf2b33d][(Math.random() * 3) | 0]);
    g.roundRect(-11, -18, 2, 7, 1).fill(0x55606b);
    c.addChild(leg, g);
    return { c, leg };
  }
}

// ---------- Control tower ----------
export class ControlTower extends Prop {
  private beam = new Graphics();
  private t = 0;
  onCleared?: () => void;

  constructor(ctx: Ctx, x: number, readonly height = 300) {
    super(ctx, x, APRON);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.building;
    const g = new Graphics();
    const H = height;
    contactShadow(g, 0, 0, 90, 0.1);
    g.roundRect(-40, -40, 80, 40, 6).fill(CONCRETE);
    g.poly([-22, -40, -16, -H + 60, 16, -H + 60, 22, -40]).fill(CONCRETE);
    g.poly([16 - 32 * 0.28, -H + 60, 16, -H + 60, 22, -40, 22 - 44 * 0.28, -40]).fill(CONCRETE_SHADE);
    for (let y = -80; y > -H + 80; y -= 46) g.roundRect(-4, y, 8, 14, 3).fill(GLASS_DARK);
    // Cab: dark glass that leans out, a white roof, an antenna and the beacon.
    g.roundRect(-46, -H + 52, 92, 12, 4).fill(0xdcd9d1);
    g.poly([-44, -H + 52, -54, -H + 10, 54, -H + 10, 44, -H + 52]).fill(0x34495e);
    g.poly([-38, -H + 48, -46, -H + 14, -30, -H + 14, -24, -H + 48]).fill({ color: P.white, alpha: 0.22 });
    for (const mx of [-18, 0, 18]) g.rect(mx - 1, -H + 12, 2, 38).fill({ color: 0x5f7a90, alpha: 0.9 });
    g.roundRect(-60, -H - 2, 120, 14, 6).fill(0xf6f7f9);
    g.roundRect(-60, -H - 2, 120, 3, 1.5).fill({ color: P.white, alpha: 0.8 });
    g.roundRect(-14, -H - 14, 28, 13, 4).fill(0xdcd9d1);
    g.roundRect(18, -H - 50, 3, 48, 1.5).fill(0x8e959e);
    g.circle(19.5, -H - 52, 3).fill(0xe5483f);
    this.view.addChild(g);
    this.beam.position.set(0, -H - 20);
    this.view.addChild(this.beam);
    this.hits = [{ x: -60, y: -H - 50, w: 120, h: H + 50 }];
    this.extent = [-300, 300];
  }

  update(dt: number): void {
    // Rotating beacon: alternates green and white as it turns.
    this.t += dt;
    const a = this.t * 3.2;
    const c = Math.cos(a);
    this.beam.clear();
    this.beam.ellipse(0, 0, 9 * Math.abs(c) + 2, 7).fill(Math.sin(a) > 0 ? 0x6fe08a : 0xffffff);
    this.beam.alpha = 0.55 + 0.45 * Math.abs(c);
  }

  onTap(): void {
    this.ctx.sfx.chime();
    this.ctx.tweens.wobble(this.view, 0.012, 0.8, 0.02);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - this.height - 30, count: 8, shape: 'star', tint: [0x6fe08a, P.white], speed: [60, 180], gravity: 80, life: [0.5, 0.9], size: [8, 12] });
    this.onCleared?.();
  }
}

// ---------- Radar (large airport) ----------
export class Radar extends Prop {
  private dish = new Graphics();
  private t = 0;
  private boost = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, APRON);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.building;
    const g = new Graphics();
    contactShadow(g, 0, 0, 50, 0.1);
    g.poly([-16, 0, -4, -110, 4, -110, 16, 0]).fill(0xb9c0c8);
    for (let y = -20; y > -100; y -= 22) g.rect(-12 + (-y / 110) * 8, y, 24 - (-y / 110) * 16, 3).fill(0xa0a8b1);
    g.roundRect(-14, -122, 28, 14, 5).fill(0xdcd9d1);
    this.view.addChild(g);
    this.dish.roundRect(-38, -14, 76, 16, 8).fill(0xf6f7f9);
    this.dish.roundRect(-38, -14, 76, 4, 2).fill(0xd6dbe1);
    this.dish.roundRect(-3, 0, 6, 10, 2).fill(0x8e959e);
    this.dish.position.set(0, -128);
    this.view.addChild(this.dish);
    this.hits = [{ x: -40, y: -150, w: 80, h: 150 }];
  }

  update(dt: number): void {
    this.boost = Math.max(0, this.boost - dt);
    this.t += dt * (this.boost > 0 ? 5 : 1.4);
    this.dish.scale.x = Math.cos(this.t);
  }

  onTap(): void {
    this.boost = 3;
    this.ctx.sfx.whistleUp();
  }
}

// ---------- Hangar (doors slide open on a little prop plane) ----------
export class Hangar extends Prop {
  private doors: Graphics[] = [];
  private prop: Graphics;
  private open = 0;
  private openFor = 0;
  private moving = false;

  constructor(ctx: Ctx, x: number, readonly w = 560, readonly h = 210) {
    super(ctx, x, APRON);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.building;
    const g = new Graphics();
    contactShadow(g, w / 2, 0, w, 0.1);
    // Curved roof over plain walls.
    g.moveTo(0, -h * 0.55).quadraticCurveTo(w / 2, -h * 1.25, w, -h * 0.55).lineTo(w, 0).lineTo(0, 0).closePath().fill(0xb7c3cf);
    g.moveTo(w * 0.72, -h * 0.8).quadraticCurveTo(w * 0.9, -h * 0.65, w, -h * 0.55).lineTo(w, 0).lineTo(w * 0.72, 0).closePath().fill(0xa6b3c0);
    for (let k = 1; k < 9; k++) {
      const rx = (w * k) / 9;
      const top = -h * 0.55 - Math.sin((k / 9) * Math.PI) * h * 0.35;
      g.rect(rx - 1, top + 4, 2, -top - 4).fill({ color: P.white, alpha: 0.25 });
    }
    g.moveTo(8, -h * 0.57).quadraticCurveTo(w / 2, -h * 1.22, w - 8, -h * 0.57).stroke({ width: 4, color: P.white, alpha: 0.45, cap: 'round' });
    // Dark interior behind the doors, with a little plane in it.
    const dx = w * 0.12, dw = w * 0.76, dh = h * 0.62;
    g.roundRect(dx, -dh, dw, dh, 4).fill(0x3d4650);
    this.view.addChild(g);
    const pp = makePropPlane(0xe9637a, Math.min(170, dw * 0.45));
    pp.view.position.set(w / 2, 0);
    this.prop = pp.prop;
    this.view.addChild(pp.view);
    for (let k = 0; k < 2; k++) {
      const d = new Graphics();
      d.roundRect(0, -dh, dw / 2, dh, 3).fill(k ? 0xd4dbe2 : 0xdfe5eb);
      for (let s = 1; s < 4; s++) d.rect((dw / 2) * (s / 4) - 1, -dh + 4, 2, dh - 8).fill({ color: P.black, alpha: 0.08 });
      d.roundRect(0, -dh, dw / 2, 3, 1.5).fill({ color: P.white, alpha: 0.6 });
      d.position.set(dx + k * (dw / 2), 0);
      this.doors.push(d);
      this.view.addChild(d);
    }
    this.hits = [{ x: 0, y: -h * 0.95, w, h: h * 0.95 }];
    this.extent = [-300, w + 300];
  }

  hintTarget(): Container {
    return this.doors[1];
  }

  private slide(to: number): void {
    this.moving = true;
    const from = this.open;
    const dw = this.w * 0.76;
    this.ctx.sfx.whoosh();
    this.ctx.tweens.add(1.4, (p) => {
      if (this.view.destroyed) return;
      this.open = from + (to - from) * p;
      // Folding doors: each concertinas toward its side of the opening.
      this.doors[0].scale.x = 1 - this.open * 0.82;
      this.doors[1].scale.x = 1 - this.open * 0.82;
      this.doors[1].x = this.w * 0.12 + dw / 2 + (dw / 2) * this.open * 0.82;
    }, { ease: ease.inOutSine, done: () => ((this.moving = false), this.ctx.sfx.fwoomp()) });
  }

  onTap(): void {
    if (this.moving) return;
    if (this.open < 0.5) {
      this.slide(1);
      this.openFor = 7;
      this.ctx.tweens.after(1.0, () => this.ctx.sfx.engineStart());
    } else {
      this.ctx.sfx.boing(1.3);
      this.openFor = 7;
    }
  }

  update(dt: number): void {
    if (this.open > 0.5) this.prop.scale.y = Math.cos(performance.now() / 22);
    else this.prop.scale.y = 1;
    if (this.openFor > 0 && !this.moving) {
      this.openFor -= dt;
      if (this.openFor <= 0) this.slide(0);
    }
  }
}

// ---------- Windsock ----------
export class Windsock extends Prop {
  private sock = new Container();
  private t = rand(0, 5);
  private gust = 0;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, RUNWAY_TOP);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.apron;
    const g = new Graphics();
    contactShadow(g, 0, 0, 30, 0.1);
    g.roundRect(-3, -130, 6, 130, 3).fill(0xc9ced5);
    g.circle(0, -132, 5).fill(0xe5483f);
    this.view.addChild(g);
    const s = new Graphics();
    for (let k = 0; k < 5; k++) {
      const x0 = k * 18, r0 = 13 - k * 1.6, r1 = 13 - (k + 1) * 1.6;
      s.poly([x0, -r0, x0 + 18, -r1, x0 + 18, r1, x0, r0]).fill(k % 2 ? P.white : 0xf27d2b);
    }
    s.roundRect(-3, -14, 6, 28, 3).fill(0xc9ced5);
    this.sock.addChild(s);
    this.sock.position.set(3, -118);
    this.view.addChild(this.sock);
    this.hits = [{ x: -10, y: -140, w: 110, h: 140 }];
  }

  hintTarget(): Container {
    return this.sock;
  }

  update(dt: number): void {
    this.t += dt;
    this.gust = Math.max(0, this.gust - dt * 0.4);
    const wind = 0.75 + Math.sin(this.t * 0.7) * 0.15 + this.gust;
    this.sock.scale.x = Math.min(1.15, wind);
    this.sock.rotation = (1 - Math.min(1, wind)) * 0.9 + Math.sin(this.t * 5) * 0.05;
  }

  onTap(): void {
    this.gust = 0.6;
    this.ctx.sfx.whoosh();
  }
}

// ---------- Apron vehicles (no faces) ----------
function wheel(g: Graphics, x: number, r = 9): void {
  g.circle(x, -r, r).fill(0x2b2f33);
  g.circle(x, -r, r * 0.42).fill(0x9aa3ad);
}

export class FuelTruck extends Prop {
  private body = new Container();

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, RUNWAY_TOP);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.apron;
    const g = new Graphics();
    contactShadow(g, 0, 0, 170, 0.12);
    // tank
    g.roundRect(-84, -62, 112, 46, 20).fill(0xf6f7f9);
    g.roundRect(-84, -62, 112, 3, 1.5).fill({ color: P.white, alpha: 0.8 });
    g.roundRect(-84, -36, 112, 8, 2).fill(0xf2b33d);
    g.rect(28 - 112 * 0.28, -60, 112 * 0.28 - 4, 42).fill({ color: P.black, alpha: 0.05 });
    // chassis and cab (window, no face)
    g.roundRect(-90, -22, 176, 12, 4).fill(0x55606b);
    g.roundRect(34, -66, 52, 50, 10).fill(0xf2b33d);
    g.roundRect(48, -60, 32, 20, 5).fill(GLASS);
    g.poly([52, -42, 60, -42, 70, -60, 62, -60]).fill({ color: P.white, alpha: 0.4 });
    g.roundRect(34, -66, 52, 3, 1.5).fill({ color: P.white, alpha: 0.45 });
    g.roundRect(78, -30, 10, 6, 3).fill(0xfff3c4);
    for (const wx of [-62, -38, 60]) wheel(g, wx, 11);
    this.body.addChild(g);
    this.view.addChild(this.body);
    this.hits = [{ x: -90, y: -70, w: 180, h: 70 }];
  }

  hintTarget(): Container {
    return this.body;
  }

  onTap(): void {
    this.ctx.sfx.beepBeep();
    this.ctx.tweens.wobble(this.body, 0.04, 0.6, 0.08);
    this.ctx.tweens.add(0.4, (p) => !this.body.destroyed && (this.body.y = -Math.sin(p * Math.PI) * 10));
  }
}

export class BaggageTrain extends Prop {
  private train = new Container();
  private bags: Graphics[] = [];
  private dir = 1;
  private pause = 0;
  private hop = 0;

  /** Shuttles between x and x + range. */
  constructor(ctx: Ctx, x: number, private range = 600) {
    super(ctx, x, RUNWAY_TOP);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.apron;
    const g = new Graphics();
    contactShadow(g, -60, 0, 260, 0.1);
    // tug (no face)
    g.roundRect(30, -30, 50, 22, 8).fill(0xf27d2b);
    g.roundRect(52, -50, 26, 22, 6).fill(0xf27d2b);
    g.roundRect(56, -46, 18, 12, 3).fill(GLASS);
    g.roundRect(30, -30, 50, 3, 1.5).fill({ color: P.white, alpha: 0.45 });
    wheel(g, 42, 8);
    wheel(g, 70, 8);
    // carts
    for (let k = 0; k < 3; k++) {
      const cx = -40 - k * 70;
      g.roundRect(cx + 24, -16, 16, 3, 1.5).fill(0x55606b);
      g.roundRect(cx - 28, -20, 56, 8, 3).fill(0x8e959e);
      wheel(g, cx - 16, 6);
      wheel(g, cx + 16, 6);
    }
    this.train.addChild(g);
    const colors = [SUITCASE, 0xf28b82, 0x5b6d8a, 0xf2b33d, 0xc5a3ff, 0x7fbf6a];
    for (let k = 0; k < 6; k++) {
      const b = new Graphics();
      const c = colors[k % colors.length];
      b.roundRect(-11, -18, 22, 18, 4).fill(c);
      b.roundRect(-11, -18, 22, 3, 1.5).fill({ color: P.white, alpha: 0.4 });
      b.roundRect(-4, -22, 8, 5, 2).fill(darken(c, 0.3));
      b.position.set(-40 - Math.floor(k / 2) * 70 + (k % 2 ? 12 : -12), -20);
      this.bags.push(b);
      this.train.addChild(b);
    }
    this.view.addChild(this.train);
    this.hits = [{ x: -220, y: -60, w: 310, h: 60 }];
    this.extent = [-400, range + 400];
  }

  hintTarget(): Container {
    return this.train;
  }

  update(dt: number): void {
    this.hop = Math.max(0, this.hop - dt);
    if (this.pause > 0) {
      this.pause -= dt;
    } else {
      this.train.x += this.dir * 70 * dt;
      if (this.train.x > this.range || this.train.x < 0) {
        this.train.x = Math.max(0, Math.min(this.range, this.train.x));
        this.dir *= -1;
        this.pause = 2.5;
      }
    }
    this.hits[0].x = -220 + this.train.x;
    this.bags.forEach((b, k) => (b.y = -20 - Math.abs(Math.sin(this.hop * 14 + k)) * this.hop * 30));
  }

  onTap(): void {
    this.ctx.sfx.beepBeep();
    this.hop = 0.8;
  }
}

// ---------- Approach "rabbit" lights (large airport) ----------
export class ApproachLights extends Prop {
  private lamps: Graphics[] = [];
  private t = 0;
  private fast = 0;

  constructor(ctx: Ctx, x: number, readonly count = 9) {
    super(ctx, x, RUNWAY_TOP + 4);
    this.layer = 'back';
    this.view.zIndex = AIRPORT_Z.field + 1;
    const g = new Graphics();
    for (let k = 0; k < count; k++) {
      const lx = k * 64;
      g.roundRect(lx - 2, -26, 4, 26, 2).fill(0x8e959e);
      g.roundRect(lx - 12, -30, 24, 5, 2).fill(0x6b737c);
    }
    this.view.addChild(g);
    for (let k = 0; k < count; k++) {
      const l = new Graphics().circle(0, 0, 5).fill(0xfffbe6);
      l.position.set(k * 64, -32);
      this.lamps.push(l);
      this.view.addChild(l);
    }
    this.hits = [{ x: -16, y: -44, w: count * 64, h: 48 }];
  }

  update(dt: number): void {
    this.fast = Math.max(0, this.fast - dt);
    this.t += dt * (this.fast > 0 ? 3 : 1);
    const head = (this.t * 1.4 % 1) * (this.count + 3);
    this.lamps.forEach((l, k) => {
      const d = head - k;
      const on = d >= 0 && d < 1.2;
      l.alpha = on ? 1 : 0.3;
      l.scale.set(on ? 1.6 : 1);
    });
  }

  onTap(): void {
    this.fast = 3;
    this.ctx.sfx.sparkle();
  }
}

/** The whole airport, positioned from its spec (all of it behind the barrier). */
export function buildAirport(ctx: Ctx, spec: AirportSpec): Prop[] {
  const { x0, len } = spec;
  const large = spec.size === 'large';
  const field = new Airfield(ctx, x0, len, large);
  const tower = new ControlTower(ctx, x0 + (large ? 3300 : 2250), large ? 400 : 300);
  tower.onCleared = () => field.takeoff();
  const props: Prop[] = [
    field,
    new Terminal(ctx, x0 + (large ? 900 : 900), large ? 2000 : 1050, large),
    tower,
    new FuelTruck(ctx, x0 + (large ? 3050 : 2050)),
    new BaggageTrain(ctx, x0 + (large ? 3600 : 2550), large ? 700 : 450),
    new Hangar(ctx, x0 + (large ? 4500 : 3100), large ? 680 : 520, large ? 240 : 200),
    new Windsock(ctx, x0 + (large ? 5700 : 3900)),
  ];
  if (large) props.push(new Radar(ctx, x0 + 3700), new ApproachLights(ctx, x0 - 700));
  return props;
}

