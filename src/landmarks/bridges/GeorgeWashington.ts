// New York's George Washington Bridge over the Hudson: our road is its deck. Two huge grey
// steel lattice towers (the famous open frame with arched portals), the main cables draped
// between them and down to the anchorages, and a forest of vertical suspenders to the deck.
// Tap a tower: its necklace lights and beacons twinkle and the cables give a deep harp pluck.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { P } from '../../style/palette';
import { roadHeight } from '../../world/Terrain';
import { ROAD_FAR, ROAD_NEAR } from '../../world/Road';
import type { BridgeSpec } from '../../world/Route';

const STEEL = 0x9aa6b2;
const STEEL_DARK = 0x83909d;
const STEEL_LIGHT = 0xb5c0ca;
const CABLE = 0x7d8995;
const TOWER_H = 560; // above the deck
const TOWER_W = 150;

/** The deck's far edge at world x (where cables and towers meet the road), in world y. */
const deckY = (x: number) => -roadHeight(x) + ROAD_FAR;

/** Where the towers stand and how the main cable hangs. */
function geometry(spec: BridgeSpec) {
  const t1 = spec.start + 1700;
  const t2 = spec.end - 1700;
  const a1 = spec.start + 150;
  const a2 = spec.end - 150;
  const topY = (x: number) => deckY(x) - TOWER_H + 40;
  const sag = 60; // lowest point of the main span above the deck
  /** Main cable y at world x (null outside the anchorages). */
  const cableY = (x: number): number | null => {
    if (x < a1 || x > a2) return null;
    if (x >= t1 && x <= t2) {
      const u = (x - t1) / (t2 - t1);
      const mid = deckY((t1 + t2) / 2) - sag;
      const top = topY(t1);
      // parabola through both tower tops with its low point at mid-span
      return mid + (top - mid) * Math.pow(2 * u - 1, 2);
    }
    // side spans: a gentle sag from the tower top down to the anchorage at the deck
    const [ta, xa] = x < t1 ? [t1, a1] : [t2, a2];
    const u = (x - xa) / (ta - xa); // 0 at the anchorage → 1 at the tower
    const y0 = deckY(xa) - 10, y1 = topY(ta);
    return y0 + (y1 - y0) * Math.pow(u, 1.5);
  };
  return { t1, t2, a1, a2, cableY, topY };
}

// ---------- The main cables, suspenders and necklace lights (one long prop) ----------
export class GwbCables extends Prop {
  private lights: Graphics[] = [];
  private cable = new Container();
  private t = 0;
  private sparkle = 0;

  constructor(ctx: Ctx, spec: BridgeSpec) {
    super(ctx, 0, 0);
    this.layer = 'back';
    this.view.zIndex = -2;
    const { a1, a2, cableY } = geometry(spec);
    const g = new Graphics();
    // suspenders every 46 units, hanging from the cable to the deck
    for (let x = a1 + 40; x < a2 - 40; x += 46) {
      const cy = cableY(x);
      if (cy === null) continue;
      const dy = deckY(x);
      if (dy - cy < 14) continue;
      g.moveTo(x, cy).lineTo(x, dy).stroke({ width: 1.6, color: CABLE, alpha: 0.85 });
    }
    // the main cable (two parallel cables read as one thick rope with a highlight)
    const pts: number[] = [];
    for (let x = a1; x <= a2; x += 30) pts.push(x, cableY(x)!);
    pts.push(a2, cableY(a2)!);
    const line = (dy: number, width: number, color: number, alpha = 1) => {
      g.moveTo(pts[0], pts[1] + dy);
      for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1] + dy);
      g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
    };
    line(0, 9, CABLE);
    line(-2.5, 2.5, STEEL_LIGHT, 0.8);
    // anchorage blocks at both ends (granite, half hidden by the barrier)
    for (const ax of [a1, a2]) {
      const dy = deckY(ax);
      g.roundRect(ax - 34, dy - 30, 68, 40, 6).fill(0xb9b2a4);
      g.roundRect(ax - 34, dy - 30, 68, 4, 2).fill({ color: P.white, alpha: 0.4 });
    }
    this.cable.addChild(g);
    this.view.addChild(this.cable);
    // the "necklace": a string of lights along the main span
    for (let x = a1 + 60; x < a2 - 60; x += 120) {
      const cy = cableY(x);
      if (cy === null) continue;
      const l = new Graphics().circle(0, 0, 4).fill(0xfff1a8);
      l.position.set(x, cy + 1);
      l.alpha = 0.35;
      this.lights.push(l);
      this.view.addChild(l);
    }
    this.hits = [];
    this.extent = [spec.start - 600, spec.end + 600];
  }

  /** Twinkle the necklace (called by the towers). */
  twinkle(): void {
    this.sparkle = 2.4;
  }

  update(dt: number): void {
    this.t += dt;
    this.sparkle = Math.max(0, this.sparkle - dt);
    this.lights.forEach((l, k) => {
      if (this.sparkle > 0) {
        const wave = Math.sin(this.t * 10 - k * 0.6);
        l.alpha = 0.35 + 0.65 * Math.max(0, wave);
        l.tint = [0xfff1a8, 0xffffff, 0xbfe6ff][k % 3];
      } else {
        l.alpha = 0.35 + 0.12 * Math.sin(this.t * 1.5 + k * 0.4);
        l.tint = 0xffffff;
      }
    });
  }
}

// ---------- A lattice steel tower ----------
/** Draws the tower face: two braced legs, three portal arches, a cap with the cable saddle. */
function drawTower(g: Graphics, top: number, base: number): void {
  const w = TOWER_W;
  const legW = 34;
  const H = base - top;
  // Legs taper slightly toward the top.
  const leg = (side: -1 | 1, color: number) => {
    const xo = side * (w / 2), xi = side * (w / 2 - legW);
    const xot = side * (w / 2 - 6), xit = side * (w / 2 - legW + 2);
    g.poly([xo, base, xi, base, xit, top + 26, xot, top + 26]).fill(color);
  };
  leg(-1, STEEL);
  leg(1, STEEL_DARK);
  // Open lattice inside each leg: little X braces.
  for (const side of [-1, 1] as const) {
    for (let y = top + 50; y < base - 20; y += 36) {
      const xa = side * (w / 2 - 6), xb = side * (w / 2 - legW + 4);
      g.moveTo(xa, y).lineTo(xb, y + 30).stroke({ width: 3, color: side < 0 ? 0x7a8794 : 0x6a7784 });
      g.moveTo(xb, y).lineTo(xa, y + 30).stroke({ width: 3, color: side < 0 ? 0x7a8794 : 0x6a7784 });
      g.rect(Math.min(xa, xb), y + 30, Math.abs(xa - xb), 3).fill(side < 0 ? 0x7a8794 : 0x6a7784);
    }
  }
  // Portal frames between the legs: three horizontal girders, each with an arch below it.
  const inner = w / 2 - legW;
  const portals = [top + 30, top + H * 0.36, top + H * 0.68];
  portals.forEach((py, i) => {
    const gh = i === 0 ? 46 : 30;
    g.roundRect(-inner - 2, py, inner * 2 + 4, gh, 4).fill(STEEL);
    g.roundRect(-inner - 2, py, inner * 2 + 4, 3, 1.5).fill({ color: P.white, alpha: 0.4 });
    // the arch: a curved girder under the beam
    const ay = py + gh;
    g.moveTo(-inner, ay).quadraticCurveTo(-inner, ay + 44, 0, ay + 48).quadraticCurveTo(inner, ay + 44, inner, ay)
      .lineTo(inner, ay + 8).quadraticCurveTo(inner - 6, ay + 34, 0, ay + 38).quadraticCurveTo(-inner + 6, ay + 34, -inner, ay + 8)
      .closePath().fill(STEEL_DARK);
    // lattice inside the beam
    for (let x = -inner + 10; x < inner - 10; x += 16) {
      g.moveTo(x, py + 6).lineTo(x + 12, py + gh - 6).stroke({ width: 1.6, color: STEEL_DARK, alpha: 0.6 });
    }
  });
  // cap with the cable saddles
  g.roundRect(-w / 2 - 6, top, w + 12, 30, 8).fill(STEEL_LIGHT);
  g.roundRect(-w / 2 - 6, top, w + 12, 4, 2).fill({ color: P.white, alpha: 0.45 });
  for (const sx of [-w / 2 + 16, w / 2 - 16]) g.roundRect(sx - 12, top - 12, 24, 16, 6).fill(STEEL_DARK);
}

export class GwbTower extends Prop {
  private beacons: Graphics[] = [];
  private frame = new Container();
  private t = Math.random() * 3;

  constructor(ctx: Ctx, x: number, private cables: GwbCables | null = null) {
    super(ctx, x, 0);
    this.layer = 'back';
    this.view.zIndex = -1;
    const base = deckY(x) + 30; // the barrier hides the foot
    const top = deckY(x) - TOWER_H;
    const g = new Graphics();
    drawTower(g, top, base);
    this.frame.addChild(g);
    this.view.addChild(this.frame);
    for (const bx of [-TOWER_W / 2 + 16, TOWER_W / 2 - 16]) {
      const b = new Graphics().circle(0, 0, 5).fill(0xe5483f);
      b.position.set(bx, top - 18);
      this.beacons.push(b);
      this.view.addChild(b);
    }
    this.hits = [{ x: -TOWER_W / 2 - 10, y: top - 30, w: TOWER_W + 20, h: base - top + 30 }];
    this.extent = [-900, 900];
  }

  hintTarget(): Container {
    return this.frame;
  }

  onTap(): void {
    const s = this.ctx.sfx;
    // a deep bridge-horn chord, then the cables "pluck" down a scale
    for (const [f, gain] of [[98, 0.07], [147, 0.06], [196, 0.04]]) s.s.tone({ freq: f, dur: 1.4, hold: 1.0, type: 'sawtooth', gain, attack: 0.08, filter: 600, q: 2 });
    [0, 2, 4, 7, 9].forEach((st, i) => this.ctx.tweens.after(0.35 + i * 0.09, () => s.pluck(9 - st, 0.1)));
    this.cables?.twinkle();
    this.ctx.tweens.wobble(this.frame, 0.004, 0.8, 0);
    this.beacons.forEach((b) => this.ctx.tweens.add(1.2, (p) => !b.destroyed && b.scale.set(1 + Math.sin(p * Math.PI * 4) * 0.6)));
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: deckY(this.x) - TOWER_H - 20, count: 14, shape: 'star', tint: [0xfff1a8, P.white, 0xe5483f], speed: [80, 240], gravity: 120, drag: 1, life: [0.7, 1.2], size: [8, 14] });
  }

  update(dt: number): void {
    this.t += dt;
    const on = Math.sin(this.t * Math.PI * 1.6) > 0;
    for (const b of this.beacons) b.alpha = on ? 1 : 0.3;
  }
}

/** The tower legs below the deck, down to their granite piers in the river (drawn over the water). */
export class GwbTowerBase extends Prop {
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, 0);
    this.layer = 'roadDecor';
    const top = deckY(x) + ROAD_NEAR - ROAD_FAR + 40; // just under the deck slab
    const water = 64;
    const g = new Graphics();
    if (water > top) {
      for (const side of [-1, 1] as const) {
        const xo = side * (TOWER_W / 2), xi = side * (TOWER_W / 2 - 34);
        g.poly([xo, top, xi, top, xi, water + 4, xo, water + 4]).fill(side < 0 ? STEEL : STEEL_DARK);
      }
      g.roundRect(-TOWER_W / 2 + 34, top + 6, TOWER_W - 68, 22, 4).fill(STEEL);
    }
    // granite pier footing in the water
    g.roundRect(-TOWER_W / 2 - 22, water - 6, TOWER_W + 44, 46, 10).fill(0xc9c1b2);
    g.roundRect(-TOWER_W / 2 - 22, water - 6, TOWER_W + 44, 5, 2.5).fill({ color: P.white, alpha: 0.4 });
    g.rect(TOWER_W / 2 + 22 - (TOWER_W + 44) * 0.28, water - 1, (TOWER_W + 44) * 0.28, 41).fill({ color: P.black, alpha: 0.07 });
    g.roundRect(-TOWER_W / 2 - 30, water + 36, TOWER_W + 60, 5, 2.5).fill({ color: P.white, alpha: 0.5 });
    this.view.addChild(g);
    this.hits = [{ x: -TOWER_W / 2 - 22, y: top, w: TOWER_W + 44, h: water + 40 - top }];
    this.extent = [-400, 400];
  }

  onTap(wx: number, wy: number): void {
    this.ctx.sfx.splash(0.8);
    this.ctx.fx.emit(this.ctx.layers.fx, { x: wx, y: wy, count: 10, shape: 'drop', tint: [P.water, P.white], speed: [120, 260], angle: [-2.6, -0.5], gravity: 900, life: [0.4, 0.8], size: [6, 10], rotate: false });
  }
}

export function buildGwb(ctx: Ctx, spec: BridgeSpec): Prop[] {
  const { t1, t2 } = geometry(spec);
  const cables = new GwbCables(ctx, spec);
  return [cables, new GwbTower(ctx, t1, cables), new GwbTower(ctx, t2, cables), new GwbTowerBase(ctx, t1), new GwbTowerBase(ctx, t2)];
}
