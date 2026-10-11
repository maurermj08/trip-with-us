// Jacksonville's blue Main Street lift bridge, standing across the St. Johns River downstream of
// our I-95 crossing. It is a separate bridge in the distance: scaled down, standing on the far
// water line (level, never following our road's arch), with tall piers so its deck clears our
// barrier while we cross the top of our bridge. It sorts behind every other back prop. Its
// approach ramps dive down behind our barrier at both ends. Tap: crossing bells, the lift span
// rises (counterweights drop) while a tall-masted sailboat glides under, then it lowers again.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../../props/Prop';
import type { Ctx } from '../../core/Ctx';
import { ease } from '../../core/Tween';
import { P } from '../../style/palette';
import { ROAD_FAR } from '../../world/Road';

const BLUE = 0x2f7fd0;
const BLUE_DARK = 0x2566ad;
const BLUE_LIGHT = 0x5a9be0;
const PIER = 0xc9ced5;
/** Distance scale: the whole bridge is drawn at this size. */
const S = 0.65;
/** World y of the distant water line (level, just below our barrier top on flat road). */
const WATERLINE = ROAD_FAR - 34;

// Unscaled design units (before S). The lift span's bottom chord sits at y = 0 (deck level).
/** Clearance from the water up to the deck (tall, like the real lift bridge). */
const WATER = 220;
/** Tower tops above the deck. */
const TOWER_H = 340;
/** Between the tower centers (= the lift span length). */
const GAP = 560;
const TOWER_W = 70;
/** Each arched approach truss. */
const APPROACH = 460;
/** The concrete approach ramps that slope down to the shore at each end. */
const RAMP = 300;
const SPAN_H = 60;
const LIFT = 210;
const HALF = GAP / 2 + TOWER_W / 2 + APPROACH;

/** A lattice tower: two legs with X-bracing and floor struts. */
function trussTower(g: Graphics, cx: number, top: number, bottom: number, w: number): void {
  const leg = 11;
  g.roundRect(cx - w / 2, top, leg, bottom - top, 3).fill(BLUE);
  g.roundRect(cx + w / 2 - leg, top, leg, bottom - top, 3).fill(BLUE_DARK);
  const step = 52;
  for (let y = top + 14; y + step <= bottom - 6; y += step) {
    g.moveTo(cx - w / 2 + leg, y).lineTo(cx + w / 2 - leg, y + step).stroke({ width: 4, color: BLUE, cap: 'round' });
    g.moveTo(cx + w / 2 - leg, y).lineTo(cx - w / 2 + leg, y + step).stroke({ width: 4, color: BLUE_DARK, cap: 'round' });
    g.rect(cx - w / 2 + leg, y - 2, w - leg * 2, 5).fill(BLUE);
  }
}

/** A Pratt through-truss; `arched` gives the camelback approach spans their curved top chord. */
function truss(g: Graphics, x0: number, len: number, h: number, arched = false): void {
  const chord = 9;
  g.roundRect(x0, -chord, len, chord, 3).fill(BLUE);
  const topAt = (t: number) => -(arched ? h * (0.35 + 0.65 * Math.sin(t * Math.PI)) : h);
  const n = Math.max(3, Math.round(len / 55));
  const pts: number[] = [];
  for (let k = 0; k <= n; k++) pts.push(x0 + (k / n) * len, topAt(k / n));
  for (let k = 0; k < n; k++) {
    const [ax, ay, bx, by] = [pts[k * 2], pts[k * 2 + 1], pts[k * 2 + 2], pts[k * 2 + 3]];
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: chord, color: BLUE, cap: 'round' });
    g.moveTo(ax, ay).lineTo(ax, -chord).stroke({ width: 4, color: BLUE_DARK });
    // diagonals lean toward the middle (Pratt pattern)
    const mid = k < n / 2;
    g.moveTo(mid ? bx : ax, mid ? by : ay).lineTo(mid ? ax : bx, -chord).stroke({ width: 3, color: BLUE_LIGHT });
  }
  g.moveTo(pts[n * 2], pts[n * 2 + 1]).lineTo(pts[n * 2], -chord).stroke({ width: 4, color: BLUE_DARK });
}

/** A tall-masted sailboat (the reason the span lifts). Origin at the water line, bow to +x. */
function tallShip(): Container {
  const c = new Container();
  const g = new Graphics();
  g.poly([-70, -20, 70, -20, 86, -32, 60, 8, -60, 8]).fill(P.white);
  g.roundRect(-64, -6, 124, 6, 3).fill(0x2f5f8a);
  g.roundRect(-30, -40, 48, 22, 6).fill(0xf3efe4);
  g.roundRect(-24, -34, 10, 8, 2).fill(0x9fcbe2);
  g.roundRect(-8, -34, 10, 8, 2).fill(0x9fcbe2);
  // two masts with sails, taller than the closed deck
  for (const [mx, mh] of [[-14, 300], [36, 250]] as const) {
    g.rect(mx - 2.5, -20 - mh, 5, mh).fill(0x8a6a4e);
    g.poly([mx + 4, -14 - mh, mx + 4, -40, mx + 4 + mh * 0.32, -40]).fill(0xfdfbf5);
    g.poly([mx - 4, -10 - mh * 0.85, mx - 4, -40, mx - 4 - mh * 0.24, -40]).fill(0xf0ebdf);
  }
  g.poly([-12, -330, -12, -316, 6, -323]).fill(0xe5483f);
  g.ellipse(0, 8, 96, 6).fill({ color: P.white, alpha: 0.5 });
  c.addChild(g);
  return c;
}

export class LiftBridge extends Prop {
  private inner = new Container();
  private span = new Container();
  private weights: Container[] = [];
  private ship = tallShip();
  private busy = false;

  constructor(ctx: Ctx, x: number) {
    super(ctx, x, WATERLINE);
    this.layer = 'back';
    this.view.zIndex = -10;
    this.inner.scale.set(S);
    this.inner.position.set(0, -WATER * S);
    this.view.addChild(this.inner);
    const g = new Graphics();
    // Concrete approach ramps sloping down to the shore at each end, on slim piers.
    const deckT = 12;
    for (const side of [-1, 1]) {
      const x0 = side * HALF, x1 = side * (HALF + RAMP);
      g.poly([x0, -deckT, x1, WATER * 0.75 - deckT, x1, WATER * 0.75 + 6, x0, 6]).fill(0xd8dce1);
      g.poly([x0, 2, x1, WATER * 0.75 + 2, x1, WATER * 0.75 + 6, x0, 6]).fill(0xbfc5cc);
      for (const t of [0.35, 0.75]) {
        const px = x0 + (x1 - x0) * t, top = WATER * 0.75 * t + 4;
        g.roundRect(px - 10, top, 20, WATER - top + 10, 5).fill(PIER);
      }
    }
    // Piers into the water under each truss end and each tower.
    const pierXs = [-HALF, -GAP / 2 - TOWER_W / 2 - APPROACH / 2, -GAP / 2, GAP / 2, GAP / 2 + TOWER_W / 2 + APPROACH / 2, HALF];
    for (const px of pierXs) {
      const tower = Math.abs(Math.abs(px) - GAP / 2) < 1;
      const w = tower ? 54 : 30;
      g.roundRect(px - w / 2, 0, w, WATER + 10, 6).fill(PIER);
      g.rect(px + w / 2 - w * 0.28, 0, w * 0.28, WATER + 10).fill({ color: P.black, alpha: 0.07 });
      g.ellipse(px, WATER + 2, w * 0.9, 5).fill({ color: P.white, alpha: 0.45 });
    }
    // Arched approach trusses either side, with their deck.
    truss(g, -HALF, APPROACH, 96, true);
    truss(g, GAP / 2 + TOWER_W / 2, APPROACH, 96, true);
    // The towers, with a machine house on top of each.
    for (const tx of [-GAP / 2, GAP / 2]) {
      trussTower(g, tx, -TOWER_H, WATER, TOWER_W);
      g.roundRect(tx - 48, -TOWER_H - 44, 96, 48, 8).fill(BLUE);
      g.rect(tx + 48 - 96 * 0.28, -TOWER_H - 40, 96 * 0.28 - 4, 40).fill(BLUE_DARK);
      g.roundRect(tx - 48, -TOWER_H - 44, 96, 4, 2).fill({ color: P.white, alpha: 0.45 });
      g.roundRect(tx - 32, -TOWER_H - 32, 18, 14, 3).fill(0xcfe4f2);
      g.roundRect(tx + 6, -TOWER_H - 32, 18, 14, 3).fill(0xcfe4f2);
      g.circle(tx, -TOWER_H - 54, 6).fill(0xe5483f);
    }
    this.inner.addChild(g);
    // Counterweights hang inside the towers and move opposite to the span.
    for (const tx of [-GAP / 2, GAP / 2]) {
      const w = new Container();
      const wg = new Graphics();
      wg.roundRect(-22, 0, 44, 46, 6).fill(0x9aa3ad);
      wg.rect(22 - 12, 0, 12, 46).fill({ color: P.black, alpha: 0.08 });
      w.addChild(wg);
      w.position.set(tx, -TOWER_H + 30);
      this.weights.push(w);
      this.inner.addChild(w);
    }
    // The lift span between the towers.
    const sg = new Graphics();
    truss(sg, -GAP / 2 + TOWER_W / 2, GAP - TOWER_W, SPAN_H);
    sg.roundRect(-GAP / 2 + TOWER_W / 2, -2, GAP - TOWER_W, 6, 3).fill(BLUE_DARK);
    this.span.addChild(sg);
    // The ship sails behind the span (between the towers) on the far water line.
    this.ship.position.set(-HALF - RAMP - 300, WATER);
    this.ship.visible = false;
    this.inner.addChild(this.ship, this.span);

    const top = -(WATER + TOWER_H + 60) * S;
    this.hits = [{ x: -HALF * S, y: top, w: HALF * 2 * S, h: (TOWER_H + 60) * S }];
    this.extent = [-(HALF + RAMP + 400) * S - 300, (HALF + RAMP + 400) * S + 300];
  }

  hintTarget(): Container {
    return this.span;
  }

  onTap(): void {
    if (this.busy) {
      this.ctx.sfx.crossingBell();
      return;
    }
    this.busy = true;
    const { sfx, tweens } = this.ctx;
    [0, 0.3, 0.6, 0.9].forEach((d) => tweens.after(d, () => sfx.crossingBell()));
    const w0 = this.weights.map((w) => w.y);
    const move = (p: number) => {
      if (this.span.destroyed) return;
      this.span.y = -LIFT * p;
      this.weights.forEach((w, i) => (w.y = w0[i] + LIFT * 0.85 * p));
    };
    // Up, the tug slips under, then back down.
    tweens.add(1.8, (p) => move(p), { ease: ease.inOutSine, delay: 0.5 });
    // The tall ship glides through once the span is up (its masts would never clear the deck).
    const x0 = -HALF - RAMP - 300, x1 = HALF + RAMP + 300;
    tweens.after(2.1, () => {
      if (this.ship.destroyed) return;
      this.ship.visible = true;
      this.ship.alpha = 0;
      sfx.shipHorn();
    });
    tweens.add(3.2, (p) => {
      if (this.ship.destroyed) return;
      this.ship.x = x0 + (x1 - x0) * p;
      this.ship.y = WATER + Math.sin(p * Math.PI * 8) * 2;
      this.ship.alpha = Math.min(1, p * 6, (1 - p) * 6);
    }, { delay: 2.1, done: () => !this.ship.destroyed && (this.ship.visible = false) });
    tweens.add(1.8, (p) => move(1 - p), {
      ease: ease.inOutSine, delay: 5.5,
      done: () => {
        this.busy = false;
        sfx.thump(0.3);
      },
    });
  }
}
