import type { Graphics } from 'pixi.js';
import { P } from '../style/palette';

/** The Duckies mascot: a friendly cartoon duck in a red cap, facing right. Centered at 0,0. */
export function drawDuck(g: Graphics, s = 1): Graphics {
  // body
  g.ellipse(-6 * s, 34 * s, 46 * s, 32 * s).fill(P.duckYellow);
  g.ellipse(-16 * s, 34 * s, 24 * s, 14 * s).fill(P.duckYellowDark);
  // head
  g.circle(0, -12 * s, 40 * s).fill(P.duckYellow);
  g.circle(-14 * s, -28 * s, 12 * s).fill({ color: P.white, alpha: 0.25 });
  // bill
  g.roundRect(22 * s, -10 * s, 40 * s, 16 * s, 8 * s).fill(P.duckOrange);
  g.roundRect(24 * s, 2 * s, 34 * s, 10 * s, 5 * s).fill(0xf08422);
  // eye
  g.circle(14 * s, -22 * s, 9 * s).fill(P.white);
  g.circle(17 * s, -21 * s, 5 * s).fill(0x1b1b1b);
  g.circle(18.5 * s, -23 * s, 1.8 * s).fill(P.white);
  // cheek
  g.circle(4 * s, -2 * s, 6 * s).fill({ color: 0xff8a7a, alpha: 0.5 });
  // cap with brim
  g.moveTo(-34 * s, -30 * s)
    .quadraticCurveTo(-30 * s, -62 * s, 2 * s, -60 * s)
    .quadraticCurveTo(28 * s, -58 * s, 30 * s, -34 * s)
    .closePath()
    .fill(P.cap);
  g.roundRect(14 * s, -38 * s, 34 * s, 9 * s, 4.5 * s).fill(P.duckiesRedDark);
  g.circle(-2 * s, -60 * s, 5 * s).fill(P.duckiesRedDark);
  g.roundRect(-26 * s, -50 * s, 20 * s, 4 * s, 2 * s).fill({ color: P.white, alpha: 0.3 });
  return g;
}
