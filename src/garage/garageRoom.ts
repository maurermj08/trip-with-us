// The garage interior, drawn in the diorama style: back wall, pegboard with tools,
// paint-can shelf, concrete floor, turntable, and the big sunny door on the right.
import { Container, Graphics } from 'pixi.js';
import { P, darken, lighten } from '../style/palette';
import { block, contactShadow, cornerRect, roundTree } from '../style/shapes';

export interface RoomLayout {
  viewW: number;
  viewH: number;
  floorY: number;
  heroX: number;
  door: { x: number; y: number; w: number; h: number };
}

export function roomLayout(viewW: number, viewH: number, trayTop: number): RoomLayout {
  const floorY = trayTop - 34;
  const doorW = Math.min(300, viewW * 0.27);
  return {
    viewW, viewH, floorY,
    heroX: (viewW - doorW) * 0.5,
    door: { x: viewW - doorW - 24, y: 96, w: doorW, h: floorY - 96 },
  };
}

const WALL = 0xf1e3c8;
const FLOOR = 0xc9ced6;

export function drawRoom(g: Graphics, L: RoomLayout): void {
  const { viewW: W, viewH: H, floorY, door } = L;
  g.clear();
  // wall with soft planks
  g.rect(0, 0, W, floorY).fill(WALL);
  for (let x = 0; x < W; x += 64) g.rect(x, 0, 2, floorY).fill({ color: P.black, alpha: 0.035 });
  g.rect(0, 0, W, 54).fill(darken(WALL, 0.06));
  g.rect(0, 54, W, 4).fill({ color: P.white, alpha: 0.45 });
  // floor
  g.rect(0, floorY, W, H - floorY).fill(FLOOR);
  g.rect(0, floorY, W, 10).fill(darken(FLOOR, 0.08));
  g.rect(0, floorY + 10, W, 3).fill({ color: P.white, alpha: 0.35 });
  for (let x = -40; x < W; x += 180) g.rect(x, floorY + 60, 120, 6).fill({ color: 0xf2c94c, alpha: 0.55 });

  // big open door: the outside world, where the trip begins
  const { x, y, w, h } = door;
  g.roundRect(x - 14, y - 14, w + 28, h + 14, 10).fill(0xb79b73);
  cornerRect(g, x - 14 + (w + 28) * 0.72, y - 14, (w + 28) * 0.28, h + 14, 0, 10, 0, 0).fill({ color: P.black, alpha: 0.07 });
  g.rect(x, y, w, h).fill(P.skyTop);
  g.rect(x, y + h * 0.45, w, h * 0.55).fill(P.skyBottom);
  g.circle(x + w * 0.75, y + h * 0.22, Math.min(28, w * 0.1)).fill(0xfff1a8);
  g.rect(x, y + h * 0.72, w, h * 0.28).fill(P.grass);
  roundTree(g, x + w * 0.28, y + h * 0.74, Math.min(90, w * 0.33));
  g.poly([x + w * 0.35, y + h, x + w * 0.65, y + h, x + w * 0.58, y + h * 0.72, x + w * 0.46, y + h * 0.72]).fill(0x9aa0a8);
  // rolled-up shutter
  g.rect(x, y, w, 26).fill(0xd9dde2);
  for (let k = 0; k < 4; k++) g.rect(x, y + 4 + k * 6, w, 2).fill({ color: P.black, alpha: 0.08 });

  // pegboard with tools (left)
  const pb = { x: 40, y: 92, w: Math.min(260, L.heroX - 220), h: 170 };
  if (pb.w > 120) {
    block(g, pb.x, pb.y, pb.w, pb.h, 0xc9a77a, { radius: 8 });
    for (let yy = pb.y + 14; yy < pb.y + pb.h - 8; yy += 16) {
      for (let xx = pb.x + 14; xx < pb.x + pb.w - 8; xx += 16) g.circle(xx, yy, 2).fill({ color: P.black, alpha: 0.18 });
    }
  }
}

/** A tappable tool on the pegboard (wobbles and clanks). */
export function tool(kind: 'wrench' | 'hammer' | 'screwdriver' | 'saw', color: number): Container {
  const c = new Container();
  const g = new Graphics();
  if (kind === 'wrench') {
    g.roundRect(-5, -10, 10, 74, 5).fill(0xb8c0c8);
    g.circle(0, -12, 13).fill(0xb8c0c8);
    g.roundRect(-5, -28, 10, 16, 3).fill(0xc9a77a);
    g.circle(0, 66, 10).fill(0xb8c0c8);
    g.circle(0, 66, 4.5).fill(0xc9a77a);
  } else if (kind === 'hammer') {
    g.roundRect(-5, 0, 10, 70, 5).fill(color);
    g.roundRect(-24, -12, 48, 18, 6).fill(0x7d858f);
  } else if (kind === 'screwdriver') {
    g.roundRect(-8, 0, 16, 36, 7).fill(color);
    g.roundRect(-3, 34, 6, 34, 2).fill(0xb8c0c8);
  } else {
    g.roundRect(-12, 0, 24, 26, 8).fill(color);
    g.poly([-10, 26, 12, 26, 18, 82, -4, 82]).fill(0xd5dbe1);
  }
  g.circle(0, -2, 3).fill({ color: P.black, alpha: 0.25 });
  c.addChild(g);
  return c;
}

/** Stack of spare tires (tap: boing). */
export function tireStack(): Container {
  const c = new Container();
  const g = new Graphics();
  contactShadow(g, 0, 0, 110);
  for (let k = 0; k < 3; k++) {
    const y = -k * 30;
    g.roundRect(-48, y - 30, 96, 30, 14).fill(0x2a2d31);
    g.roundRect(-30, y - 24, 60, 18, 8).fill(0x3d4249);
    g.roundRect(-44, y - 28, 88, 3, 1.5).fill({ color: P.white, alpha: 0.12 });
  }
  c.addChild(g);
  return c;
}

/** Shelf of paint cans (tap a can: it hops and plays a note). */
export function paintCans(n: number): Container[] {
  const colors = [0xe94b3c, 0xf7c934, 0x2f80d1, 0x4caf50, 0xc5a3ff, 0xf28b82];
  const out: Container[] = [];
  for (let i = 0; i < n; i++) {
    const c = new Container();
    const g = new Graphics();
    const col = colors[i % colors.length];
    g.roundRect(-16, -40, 32, 40, 6).fill(0xd9dde2);
    g.roundRect(-16, -30, 32, 20, 3).fill(col);
    g.roundRect(-18, -44, 36, 7, 3).fill(darken(0xd9dde2, 0.15));
    g.roundRect(-12, -52, 24, 4, 2).fill({ color: lighten(col, 0.2), alpha: 0.9 });
    g.rect(16 - 32 * 0.28, -40, 32 * 0.28, 40).fill({ color: P.black, alpha: 0.07 });
    c.addChild(g);
    out.push(c);
  }
  return out;
}

/** Hanging shop lamp over the turntable (tap: it swings and flickers). */
export function lamp(cordLen: number): { root: Container; glow: Graphics } {
  const root = new Container();
  const g = new Graphics();
  g.rect(-1.5, 0, 3, cordLen).fill(0x4a4f57);
  g.moveTo(-34, cordLen + 22).quadraticCurveTo(0, cordLen - 14, 34, cordLen + 22).closePath().fill(0x2f6d5a);
  g.roundRect(-36, cordLen + 18, 72, 6, 3).fill(darken(0x2f6d5a, 0.15));
  const glow = new Graphics();
  glow.poly([-30, cordLen + 24, 30, cordLen + 24, 140, cordLen + 330, -140, cordLen + 330]).fill({ color: 0xfff3c4, alpha: 0.18 });
  glow.ellipse(0, cordLen + 24, 14, 6).fill(0xfffbe6);
  root.addChild(glow, g);
  return { root, glow };
}

/** Turntable disk with rotating stripes. */
export function turntable(): { root: Container; stripes: Graphics } {
  const root = new Container();
  const base = new Graphics();
  base.ellipse(0, 8, 236, 34).fill(darken(FLOOR, 0.2));
  base.ellipse(0, 0, 230, 30).fill(0xe3e7ec);
  const stripes = new Graphics();
  root.addChild(base, stripes);
  return { root, stripes };
}

export function drawStripes(g: Graphics, phase: number): void {
  g.clear();
  for (let k = 0; k < 12; k++) {
    const a = phase + (k / 12) * Math.PI * 2;
    const x = Math.cos(a) * 200;
    const y = Math.sin(a) * 24;
    if (Math.sin(a) > -0.2) g.ellipse(x, y, 16 * (0.5 + 0.5 * Math.sin(a)), 3).fill({ color: 0x9aa3ad, alpha: 0.35 });
  }
}
