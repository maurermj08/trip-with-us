// Hype for Potato World on the way: countdown signs, billboards and the NEXT EXIT gantry.
import { Container, Graphics } from 'pixi.js';
import { Prop } from '../props/Prop';
import type { Ctx } from '../core/Ctx';
import { P } from '../style/palette';
import { R, contactShadow, cornerRect } from '../style/shapes';
import { greenPanel, signText } from './Signs';
import { PARK, potatoDome, spud } from '../landmarks/kit/potatoArt';

export type PotatoBoard = 'potato-castle' | 'potato-monorail' | 'potato-almost';

const W = 520;
const H = 220;

/** Board face with the right-side shade and the top highlight (same frame as Signs.ts boards). */
function face(b: Graphics, color: number, shade: number): void {
  b.roundRect(-W / 2, -230, W, H, R.sign).fill(color);
  cornerRect(b, -W / 2 + W * 0.72, -230, W * 0.28, H, 0, R.sign, R.sign, 0).fill(shade);
  b.roundRect(-W / 2, -230, W, 3, 2).fill({ color: P.white, alpha: 0.45 });
}

/** A little castle with potato domes, base centre at (x, y), scale s. */
export function miniCastle(g: Graphics, x: number, y: number, s: number, wall: number = PARK.pink, keep: number = PARK.lavender): void {
  g.roundRect(x - 22 * s, y - 120 * s, 44 * s, 70 * s, 4 * s).fill(keep);
  potatoDome(g, x, y - 120 * s, 20 * s);
  for (const side of [-1, 1]) {
    g.roundRect(x + side * 40 * s - 13 * s, y - 92 * s, 26 * s, 92 * s, 4 * s).fill(wall);
    potatoDome(g, x + side * 40 * s, y - 92 * s, 15 * s);
  }
  g.roundRect(x - 52 * s, y - 56 * s, 104 * s, 56 * s, 4 * s).fill(wall);
  g.roundRect(x - 12 * s, y - 34 * s, 24 * s, 34 * s, 12 * s).fill(PARK.purple);
}

function castleBoard(c: Container): void {
  const b = new Graphics();
  face(b, 0x7b5cc4, 0x6c4fb3);
  // a sunset behind the castle, in soft bands
  const bands = [0xffb37a, 0xff9e8a, 0xf58fae, 0xc98fd6];
  bands.forEach((col, k) => b.roundRect(-246, -216 + k * 38, 230, 40, k === 0 ? 10 : 0).fill(col));
  b.circle(-130, -110, 34).fill(0xffe08a);
  miniCastle(b, -130, -62, 1.0);
  // fireworks sparks
  for (const [fx, fy, col] of [[-210, -190, P.white], [-60, -196, PARK.gold], [-36, -150, P.white]] as const) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.roundRect(fx + Math.cos(a) * 10 - 2, fy + Math.sin(a) * 10 - 2, 4, 4, 2).fill(col);
    }
  }
  b.roundRect(0, -60, 246, 40, 6).fill(PARK.gold);
  c.addChild(b);
  const name = signText('POTATO', 50, P.white, '900');
  name.position.set(122, -186);
  const world = signText('WORLD', 50, PARK.gold, '900');
  world.position.set(122, -138);
  const tag = signText('SPUDTACULAR!', 22, PARK.purpleDark, '900');
  tag.position.set(123, -40);
  c.addChild(name, world, tag);
}

function monorailBoard(c: Container): void {
  const b = new Graphics();
  face(b, PARK.teal, 0x23918b);
  // sky panel with the beam and a two-car train (no face: one windscreen strip)
  b.roundRect(-246, -216, 236, 150, 10).fill(0xbfe6f5);
  b.roundRect(-246, -100, 236, 12, 6).fill(P.white);
  for (const px of [-210, -80]) b.roundRect(px - 6, -90, 12, 30, 4).fill(P.white);
  for (const [cx, col] of [[-196, PARK.coral], [-104, PARK.purple]] as const) {
    b.roundRect(cx - 44, -142, 88, 40, 18).fill(PARK.cream);
    b.roundRect(cx - 40, -117, 80, 8, 4).fill(col);
    for (let k = 0; k < 3; k++) b.roundRect(cx - 32 + k * 22, -134, 15, 12, 4).fill(PARK.sky);
  }
  b.ellipse(-56, -122, 18, 20).fill(PARK.cream);
  b.roundRect(-62, -136, 18, 11, 5.5).fill(0xa9d3ea);
  for (const [lx, ly] of [[-244, -134], [-240, -124], [-246, -114]]) b.roundRect(lx, ly, 10, 3, 1.5).fill({ color: P.white, alpha: 0.9 });
  miniCastle(b, -150, -60, 0.4);
  b.roundRect(-246, -60, 492, 40, 6).fill(PARK.gold);
  c.addChild(b);
  const ride = signText('RIDE THE', 28, P.white, '900');
  ride.position.set(120, -186);
  const mono = signText('MONORAIL!', 40, P.white, '900');
  mono.position.set(120, -138);
  const tag = signText('AT POTATO WORLD  ·  ORLANDO', 18, PARK.purpleDark, '900');
  tag.position.set(0, -40);
  c.addChild(ride, mono, tag);
}

function almostBoard(c: Container): void {
  const b = new Graphics();
  face(b, 0xffb347, 0xf5a332);
  // a happy potato in a party hat (no face), with confetti
  spud(b, -150, -110, 150, 104);
  b.poly([-170, -166, -120, -166, -150, -232]).fill(PARK.purple);
  b.poly([-160, -186, -134, -186, -142, -206, -150, -206]).fill(PARK.gold);
  b.circle(-150, -234, 9).fill(PARK.pink);
  for (const [cx, cy, col, r] of [[-236, -200, PARK.teal, 0.4], [-70, -206, PARK.coral, -0.3], [-80, -160, PARK.purple, 0.8], [-232, -140, P.white, -0.6], [-210, -60, PARK.coral, 0.2]] as const) {
    const pc = new Graphics().roundRect(-7, -3, 14, 6, 3).fill(col);
    pc.position.set(cx, cy);
    pc.rotation = r;
    c.addChild(pc);
  }
  b.roundRect(-246, -60, 492, 40, 6).fill(PARK.purple);
  c.addChildAt(b, 0);
  const q = signText('ARE WE THERE YET?', 26, PARK.purpleDark, '900');
  q.position.set(110, -192);
  const a = signText('ALMOST!', 64, P.white, '900');
  a.position.set(110, -132);
  const tag = signText('POTATO WORLD  ·  NEXT EXIT', 18, P.white, '900');
  tag.position.set(0, -40);
  c.addChild(q, a, tag);
}

/** Billboard faces for the potato designs (drawn into the 520×220 board at y -230). */
export const POTATO_BOARDS: Record<PotatoBoard, (c: Container) => void> = {
  'potato-castle': castleBoard,
  'potato-monorail': monorailBoard,
  'potato-almost': almostBoard,
};

function post(g: Graphics, x: number, top: number, bottom: number, w = 6): void {
  g.roundRect(x - w / 2, top, w, bottom - top, 2).fill(P.signPost);
  g.rect(x + w / 2 - 2, top, 2, bottom - top).fill({ color: P.black, alpha: 0.08 });
}

/** Small roadside countdown sign: "POTATO WORLD / n MI". */
export class PotatoCountdown extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number, public miles: number) {
    super(ctx, x, 70);
    this.layer = 'front';
    const g = new Graphics();
    contactShadow(g, -40, 0, 22);
    contactShadow(g, 40, 0, 22);
    post(g, -40, -150, 0, 7);
    post(g, 40, -150, 0, 7);
    this.view.addChild(g);
    const p = new Graphics();
    p.roundRect(-96, -128, 192, 116, R.sign).fill(PARK.purple);
    p.roundRect(-90, -122, 184, 104, R.sign - 3).stroke({ width: 3, color: P.white });
    cornerRect(p, -96 + 192 * 0.72, -128, 192 * 0.28, 116, 0, R.sign, R.sign, 0).fill({ color: P.black, alpha: 0.08 });
    // icon badge: a little castle on a gold disc
    p.circle(-52, -70, 34).fill(PARK.gold);
    miniCastle(p, -52, -44, 0.42);
    this.sign.addChild(p);
    const name = signText('POTATO\nWORLD', 15, P.white, '900');
    name.style.lineHeight = 15;
    name.position.set(30, -96);
    const n = signText(`${miles} MI`, miles >= 100 ? 28 : 32, PARK.gold, '900');
    n.position.set(30, -50);
    this.sign.addChild(name, n);
    this.sign.position.set(0, -40);
    this.view.addChild(this.sign);
    this.hits = [{ x: -100, y: -180, w: 200, h: 180 }];
    this.extent = [-300, 300];
  }

  hintTarget(): Container {
    return this.sign;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.sign, 0.12, 0.9, 0.08);
    // the closer we get, the higher the note
    this.ctx.sfx.pluck(Math.max(0, 9 - Math.round(Math.log2(this.miles))) + 3, 0.18);
    this.ctx.sfx.sparkle();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x, y: this.y - 160, count: 8, shape: 'star', tint: [PARK.gold, P.white, PARK.pink], speed: [80, 220], gravity: 160, life: [0.5, 0.9], size: [8, 14] });
  }
}

/** Overhead gantry over the road: "POTATO WORLD / NEXT EXIT" with a potato icon. */
export class PotatoGantry extends Prop {
  private sign = new Container();
  constructor(ctx: Ctx, x: number) {
    super(ctx, x, -70);
    this.layer = 'back';
    const g = new Graphics();
    contactShadow(g, -230, 0, 40);
    post(g, -230, -420, 0, 14);
    g.roundRect(-236, -424, 500, 14, 5).fill(P.signPost);
    g.roundRect(-236, -412, 500, 4, 2).fill({ color: P.black, alpha: 0.1 });
    this.view.addChild(g);
    const p = new Graphics();
    greenPanel(p, -160, -400, 380, 120);
    // exit tab on top, in the park colors
    p.roundRect(84, -432, 130, 38, R.sign).fill(PARK.purple);
    p.roundRect(89, -427, 120, 28, R.sign - 3).stroke({ width: 2.5, color: P.white });
    p.circle(-112, -340, 36).fill(PARK.cream);
    spud(p, -112, -340, 52, 38, PARK.gold);
    this.sign.addChild(p);
    const name = signText('POTATO WORLD', 32, P.white, '900');
    name.position.set(50, -358);
    const next = signText('NEXT EXIT', 20, P.white);
    next.position.set(50, -314);
    const tab = signText('EXIT 64', 17, P.white, '900');
    tab.position.set(149, -413);
    this.sign.addChild(name, next, tab);
    this.sign.pivot.set(30, -410);
    this.sign.position.set(30, -410);
    this.view.addChild(this.sign);
    this.hits = [{ x: -240, y: -440, w: 470, h: 440 }];
    this.extent = [-500, 500];
  }

  hintTarget(): Container {
    return this.sign;
  }

  onTap(): void {
    this.ctx.tweens.wobble(this.sign, 0.04, 0.9, 0.03);
    this.ctx.sfx.chime();
    this.ctx.fx.emit(this.ctx.layers.fx, { x: this.x + 50, y: this.y - 420, count: 10, shape: 'confetti', tint: [PARK.coral, PARK.gold, PARK.teal, PARK.purple], speed: [80, 220], gravity: 260, life: [0.8, 1.2], size: [8, 12], spin: 6 });
  }
}
