// The Port of Savannah, just before the Talmadge Bridge: a big container ship at the quay and
// ship-to-shore gantry cranes that shuttle containers between a yard truck and the ship's deck.
// Everything stands behind the interstate barrier. Tap a crane: warning bells and a lift cycle;
// tap the ship: its horn and a puff from the funnel. Cranes also work on their own, slowly.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P, darken, lighten } from '../style/palette';
import { block, contactShadow, cornerRect } from '../style/shapes';
import { ease } from '../core/Tween';
import { BRIDGES } from '../world/Route';

/** Ground line behind the barrier (the barrier top is at -72). */
const BASE = -78;
const CONTAINERS = [0xd8564a, 0x2f7fd0, 0xf2b33d, 0x3fa36b, 0xe8833a, 0x8e6bbf, 0x2aa7a0];
const CW = 64; // container (seen side-on)
const CH = 24;
const WHITE = 0xeef0f2;
const WHITE_SH = 0xd6dbe0;

/** A ribbed shipping container, top-left at (x, y). */
export function drawContainer(g: Graphics, x: number, y: number, color: number, w = CW, h = CH): void {
  g.roundRect(x, y, w, h, 2).fill(color);
  cornerRect(g, x + w * 0.72, y, w * 0.28, h, 0, 2, 2, 0).fill({ color: P.black, alpha: 0.08 });
  for (let r = 1; r < 8; r++) g.rect(x + (r * w) / 8 - 0.75, y + 3, 1.5, h - 6).fill({ color: P.black, alpha: 0.1 });
  g.roundRect(x + 1, y, w - 2, 2, 1).fill({ color: P.white, alpha: 0.35 });
  // door end with its locking bars
  g.rect(x + w - 6, y + 3, 1.5, h - 6).fill({ color: darken(color, 0.3), alpha: 0.8 });
}

// ---------- The container ship (tap: horn and a puff of smoke) ----------
export class ContainerShip extends Prop {
  private ship = new Container();
  private slots = new Map<number, Graphics>();
  private t = 0;
  private funnelX: number;

  /** `slots`: world x of each crane's working slot (the deck there stays two containers high). */
  constructor(ctx: Ctx, x: number, readonly len = 2700, slots: number[] = []) {
    super(ctx, x, BASE - 4);
    this.layer = 'back';
    this.view.zIndex = -1;
    const g = new Graphics();
    const hull = 0x2b4a6f, hullSh = 0x233d5c, red = 0xc8473d;
    const deck = -96;
    // Hull: raked bow on the left, square stern on the right; red boot topping at the waterline.
    g.moveTo(-40, deck).lineTo(len, deck).lineTo(len - 6, 0).lineTo(30, 0).quadraticCurveTo(-10, -30, -40, deck).fill(hull);
    g.rect(len * 0.72, deck + 4, len * 0.28 - 8, -deck - 4).fill(hullSh);
    g.moveTo(-8, -24).lineTo(len - 4, -24).lineTo(len - 6, 0).lineTo(30, 0).quadraticCurveTo(10, -10, -8, -24).fill(red);
    g.roundRect(-36, deck, len + 30, 5, 2).fill(lighten(hull, 0.35));
    // a white sheer stripe and draft marks at bow and stern
    g.roundRect(-20, deck + 14, len + 10, 4, 2).fill({ color: P.white, alpha: 0.75 });
    for (const mx of [56, len - 40]) for (let k = 0; k < 3; k++) g.roundRect(mx, -30 - k * 14, 10, 3, 1.5).fill({ color: P.white, alpha: 0.7 });
    // Anchor and hawse pipe near the bow, and a white stripe of portholes astern.
    g.circle(40, deck + 26, 8).fill(darken(hull, 0.3));
    g.roundRect(34, deck + 32, 12, 16, 4).fill(0x5d6670);
    // Deck containers in bays (gaps left at each crane's working slot).
    const stern = len - 330;
    let col = 0;
    for (let bx = 120; bx < stern - CW; bx += CW + 4) {
      const atSlot = slots.some((sx) => Math.abs(x + bx + CW / 2 - sx) < CW + 10);
      const rows = atSlot ? 2 : 2 + ((col * 7) % 3 === 0 ? 1 : 0);
      for (let r = 0; r < rows; r++) drawContainer(g, bx, deck - (r + 1) * CH - r, CONTAINERS[(col * 3 + r * 5) % CONTAINERS.length]);
      col++;
    }
    // Superstructure at the stern: white decks with windows, bridge wings, and the funnel.
    const sx = stern + 40;
    block(g, sx, deck - 190, 170, 190, P.white, { radius: 6, shade: 0xe4e8ec });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.roundRect(sx + 14 + c * 25, deck - 176 + r * 34, 14, 12, 3).fill(0x8fb6d0);
    g.roundRect(sx - 30, deck - 200, 230, 16, 5).fill(P.white);
    g.roundRect(sx - 24, deck - 196, 218, 6, 3).fill(0x8fb6d0);
    this.funnelX = sx + 120;
    block(g, this.funnelX - 26, deck - 270, 52, 72, 0xe7e2d8, { radius: 6, shade: 0xd4cec2 });
    g.roundRect(this.funnelX - 26, deck - 250, 52, 16, 3).fill(0x2aa7a0);
    g.roundRect(this.funnelX - 28, deck - 276, 56, 10, 4).fill(0x2b2f33);
    // Mast with a little flag on the bow.
    g.roundRect(60, deck - 110, 4, 110, 2).fill(0x5d6670);
    g.poly([64, deck - 110, 92, deck - 102, 64, deck - 94]).fill(0xf2b33d);
    this.ship.addChild(g);
    this.view.addChild(this.ship);
    this.hits = [{ x: -40, y: deck - 280, w: len, h: -deck + 280 }];
    this.extent = [-300, len + 300];
  }

  /** Deck height (local) at the top of the containers for a world x. */
  readonly deckTop = -96 - 2 * CH - 2;

  /** A container slot on deck at world x that a crane loads and unloads. */
  slotAt(wx: number): Graphics {
    let s = this.slots.get(wx);
    if (!s) {
      s = new Graphics();
      drawContainer(s, -CW / 2, -CH, CONTAINERS[Math.abs(Math.round(wx / 97)) % CONTAINERS.length]);
      s.position.set(wx - this.x, this.deckTop);
      s.visible = false;
      this.ship.addChild(s);
      this.slots.set(wx, s);
    }
    return s;
  }

  hintTarget(): Container {
    return this.ship;
  }

  onTap(): void {
    this.ctx.sfx.shipHorn();
    this.ctx.tweens.wobble(this.ship, 0.004, 1.2, 0.01);
    this.ctx.fx.emit(this.ctx.layers.fxBack, {
      x: this.x + this.funnelX, y: this.y - 96 - 280, count: 10, shape: 'circle', tint: [0xf2f2f2, 0xdcdcdc],
      speed: [40, 120], angle: [-2.0, -1.2], gravity: -50, drag: 0.8, life: [1.2, 2.0], size: [16, 26], grow: 2.4, alpha: 0.8,
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.ship.y = Math.sin(this.t * 0.9) * 1.5;
    // A lazy wisp from the funnel now and then.
    if (Math.random() < dt * 0.5) {
      this.ctx.fx.emit(this.ctx.layers.fxBack, {
        x: this.x + this.funnelX, y: this.y - 96 - 280, count: 1, shape: 'circle', tint: [0xf2f2f2, 0xe2e2e2],
        speed: [20, 50], angle: [-1.9, -1.3], gravity: -30, drag: 0.6, life: [1.5, 2.2], size: [14, 20], grow: 2.6, alpha: 0.55,
      });
    }
  }
}

// ---------- Ship-to-shore gantry crane ----------
interface Move {
  trolley: number;
  hook: number;
  dur: number;
  at?: () => void;
}

/** Trolley travel limits and hook heights (local, container top). */
const TROLLEY_QUAY = 0;
const HOOK_TOP = -228;
const QUAY_TOP = -34 - CH;

export class PortCrane extends Prop {
  private trolley = new Graphics();
  private cable = new Graphics();
  private spreader = new Container();
  private carried = new Graphics();
  private quaySlot = new Graphics();
  private lights: Graphics[] = [];
  private tx = TROLLEY_QUAY;
  private hook = HOOK_TOP;
  private moves: Move[] = [];
  private from = { trolley: TROLLEY_QUAY, hook: HOOK_TOP };
  private mt = 0;
  private wait: number;
  private loading = true;
  private speed = 1;
  private t = 0;
  private readonly shipX: number;
  private readonly shipTop: number;

  constructor(ctx: Ctx, x: number, private ship: ContainerShip | null, accent = 0xd8564a, phase = 0, reach = 300) {
    super(ctx, x, BASE);
    this.layer = 'back';
    this.shipX = -reach + 30;
    this.shipTop = ship ? ship.y + ship.deckTop - CH - BASE : -150;
    this.wait = 2 + phase;
    const g = new Graphics();
    const h = 262, boomY = -292;
    contactShadow(g, 0, 0, 220);
    // Rails, sill beam and the two legs (portal frame side-on), white with a soft shade.
    g.roundRect(-110, -6, 220, 6, 3).fill(0x8a9099);
    for (const lx of [-74, 74]) {
      g.roundRect(lx - 9, -h, 18, h, 4).fill(WHITE);
      g.rect(lx + 9 - 5, -h, 5, h).fill(WHITE_SH);
      g.roundRect(lx - 16, -14, 32, 14, 4).fill(accentDark(accent));
    }
    g.roundRect(-84, -150, 168, 14, 4).fill(WHITE);
    g.moveTo(-66, -150).lineTo(66, -h + 12).stroke({ width: 7, color: WHITE });
    g.roundRect(-90, -h - 8, 180, 22, 5).fill(WHITE);
    // The apex frame and its stays to the boom tip and the back reach.
    g.poly([-6, -h - 8, 22, -h - 112, 40, -h - 112, 50, -h - 8]).fill(WHITE);
    g.moveTo(26, -h - 106).lineTo(-reach + 10, boomY + 4).stroke({ width: 4, color: WHITE });
    g.moveTo(36, -h - 106).lineTo(-reach * 0.45, boomY + 2).stroke({ width: 3, color: WHITE });
    g.moveTo(36, -h - 106).lineTo(150, boomY + 4).stroke({ width: 4, color: WHITE });
    // The boom: a long girder in the crane's color with lattice lines.
    g.roundRect(-reach, boomY, reach + 170, 18, 5).fill(accent);
    g.roundRect(-reach, boomY, reach + 170, 4, 2).fill({ color: P.white, alpha: 0.4 });
    for (let bx = -reach + 14; bx < 160; bx += 28) {
      g.moveTo(bx, boomY + 16).lineTo(bx + 14, boomY + 4).stroke({ width: 2, color: lighten(accent, 0.35), alpha: 0.8 });
    }
    // Machinery house on the back reach, and the operator's cab under the boom.
    block(g, 70, boomY - 34, 90, 36, accent, { radius: 5, shade: accentDark(accent) });
    g.roundRect(84, boomY - 26, 22, 12, 3).fill({ color: P.white, alpha: 0.7 });
    this.view.addChild(g);

    // The yard truck that brings and takes the containers.
    const truck = new Graphics();
    truck.roundRect(-58, -34, 116, 10, 3).fill(0x4b525b);
    truck.roundRect(48, -60, 40, 36, 6).fill(0xf2b33d);
    truck.roundRect(56, -54, 22, 14, 3).fill(0xcfe4f2);
    for (const wx of [-40, -14, 64]) truck.circle(wx, -18, 9).fill(0x2b2f33).circle(wx, -18, 4).fill(0x9aa3ad);
    this.view.addChild(truck);
    drawContainer(this.quaySlot, -CW / 2, 0, CONTAINERS[Math.abs(Math.round(x / 131)) % CONTAINERS.length]);
    this.quaySlot.y = QUAY_TOP;
    this.view.addChild(this.quaySlot);

    // Moving parts: cable, trolley, the spreader with (sometimes) a container hanging under it.
    this.view.addChild(this.cable);
    this.trolley.roundRect(-20, -8, 40, 14, 4).fill(0x5d6670);
    this.trolley.roundRect(-20, -8, 40, 3, 1.5).fill({ color: P.white, alpha: 0.4 });
    this.trolley.y = boomY + 22;
    this.view.addChild(this.trolley);
    const sp = new Graphics();
    sp.roundRect(-CW / 2 - 4, -8, CW + 8, 8, 3).fill(0xf2b33d);
    sp.roundRect(-10, -14, 20, 8, 3).fill(0x5d6670);
    this.spreader.addChild(this.carried, sp);
    this.view.addChild(this.spreader);
    this.carried.visible = false;

    // Warning lights: apex top and boom tip.
    for (const [lx, ly] of [[31, -h - 120], [-reach + 6, boomY - 4]] as const) {
      const l = new Graphics().circle(0, 0, 5).fill(0xe5483f);
      l.position.set(lx, ly);
      this.lights.push(l);
      this.view.addChild(l);
    }
    this.place();
    this.hits = [
      { x: -100, y: -h - 120, w: 270, h: h + 120 },
      { x: -reach, y: boomY - 10, w: reach, h: 40 },
    ];
    this.extent = [-reach - 300, 500];
  }

  hintTarget(): Container {
    return this.spreader;
  }

  private place(): void {
    this.trolley.x = this.tx;
    this.spreader.position.set(this.tx, this.hook);
    const top = this.trolley.y + 6;
    this.cable.clear();
    for (const dx of [-12, 12]) this.cable.moveTo(this.tx + dx, top).lineTo(this.tx + dx * 0.6, this.hook - 14).stroke({ width: 1.6, color: 0x3a3f45 });
  }

  /** One full trip: quay → ship (loading) or ship → quay (unloading), then back home. */
  private plan(): void {
    const ship = this.ship?.slotAt(this.x + this.shipX);
    const pick = this.loading ? { trolley: TROLLEY_QUAY, hook: QUAY_TOP } : { trolley: this.shipX, hook: this.shipTop };
    const drop = this.loading ? { trolley: this.shipX, hook: this.shipTop } : { trolley: TROLLEY_QUAY, hook: QUAY_TOP };
    const fromSlot = this.loading ? this.quaySlot : ship;
    const toSlot = this.loading ? ship : this.quaySlot;
    const color = CONTAINERS[Math.floor(Math.random() * CONTAINERS.length)];
    this.moves = [
      { trolley: pick.trolley, hook: HOOK_TOP, dur: Math.abs(pick.trolley - this.tx) / 160 + 0.2 },
      { trolley: pick.trolley, hook: pick.hook, dur: 1.4 },
      {
        trolley: pick.trolley, hook: pick.hook, dur: 0.4,
        at: () => {
          this.carried.clear();
          drawContainer(this.carried, -CW / 2, 0, color);
          this.carried.visible = true;
          if (fromSlot) fromSlot.visible = false;
          this.ctx.sfx.tick();
        },
      },
      { trolley: pick.trolley, hook: HOOK_TOP, dur: 1.6 },
      { trolley: drop.trolley, hook: HOOK_TOP, dur: Math.abs(drop.trolley - pick.trolley) / 140 + 0.3 },
      { trolley: drop.trolley, hook: drop.hook, dur: 1.5 },
      {
        trolley: drop.trolley, hook: drop.hook, dur: 0.4,
        at: () => {
          this.carried.visible = false;
          if (toSlot) {
            toSlot.clear();
            drawContainer(toSlot, -CW / 2, toSlot === this.quaySlot ? 0 : -CH, color);
            toSlot.visible = true;
          }
          if (this.near()) this.ctx.sfx.thump(0.35);
          this.ctx.fx.emit(this.ctx.layers.fxBack, {
            x: this.x + drop.trolley, y: this.y + drop.hook + CH, count: 5, shape: 'circle', tint: [0xe9e0cf, 0xd8cdb8],
            speed: [30, 90], angle: [-3, -0.2], gravity: -20, drag: 2, life: [0.4, 0.8], size: [8, 14], grow: 1.6, alpha: 0.7,
          });
        },
      },
      { trolley: drop.trolley, hook: HOOK_TOP, dur: 1.4 },
      { trolley: TROLLEY_QUAY, hook: HOOK_TOP, dur: Math.abs(drop.trolley) / 160 + 0.3 },
    ];
    this.from = { trolley: this.tx, hook: this.hook };
    this.mt = 0;
    this.loading = !this.loading;
  }

  private near(): boolean {
    return Math.abs(this.ctx.car.x - this.x) < 1400;
  }

  onTap(): void {
    // Warning bells, the lights flash, and a lift starts right away (or hurries up).
    [0, 0.3].forEach((d) => this.ctx.tweens.after(d, () => this.ctx.sfx.crossingBell()));
    this.ctx.tweens.wobble(this.spreader, 0.12, 0.7, 0);
    this.speed = 1.8;
    if (this.moves.length === 0) {
      this.wait = 0;
      this.plan();
    }
  }

  update(dt: number): void {
    this.t += dt;
    const blink = Math.sin(this.t * Math.PI * 1.6) > 0.2;
    this.lights.forEach((l, k) => (l.alpha = (k === 0 ? blink : !blink) ? 1 : 0.25));
    if (this.moves.length === 0) {
      this.speed = 1;
      this.wait -= dt;
      if (this.wait <= 0) {
        this.wait = 3 + Math.random() * 4;
        this.plan();
      }
      return;
    }
    const m = this.moves[0];
    this.mt += dt * this.speed;
    const p = ease.inOutSine(Math.min(1, this.mt / m.dur));
    this.tx = this.from.trolley + (m.trolley - this.from.trolley) * p;
    this.hook = this.from.hook + (m.hook - this.from.hook) * p;
    this.place();
    if (this.mt >= m.dur) {
      m.at?.();
      this.moves.shift();
      this.from = { trolley: m.trolley, hook: m.hook };
      this.mt = 0;
    }
  }
}

function accentDark(c: number): number {
  return darken(c, 0.15);
}

/** Port positions: the ship and cranes end well before the Talmadge's climb. */
const TALMADGE = BRIDGES.find((b) => b.id === 'talmadge')!;
export const PORT_X0 = TALMADGE.start - 3500;

export function buildPort(ctx: Ctx, x0: number = PORT_X0): Prop[] {
  const at = [700, 1450, 2200].map((dx) => x0 + dx);
  const reach = 300;
  const ship = new ContainerShip(ctx, x0, 2700, at.map((cx) => cx - reach + 30));
  const cranes = at.map((cx, k) => new PortCrane(ctx, cx, ship, k === 1 ? 0x3f78c4 : 0xd8564a, k * 2.5, reach));
  return [ship, ...cranes];
}
