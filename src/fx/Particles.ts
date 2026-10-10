import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { rand } from '../core/rng';

export type Shape = 'circle' | 'square' | 'heart' | 'star' | 'confetti' | 'drop' | 'streak' | 'feather';

interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  life: number;
  max: number;
  spin: number;
  size0: number;
  size1: number;
  alpha0: number;
  fade: boolean;
  onDie?: (p: Particle) => void;
  trail?: () => void;
}

export interface EmitOpts {
  x: number;
  y: number;
  count?: number;
  shape?: Shape;
  tint?: number | number[];
  speed?: [number, number];
  /** Radians, screen space (0 = right, -PI/2 = up). */
  angle?: [number, number];
  gravity?: number;
  drag?: number;
  life?: [number, number];
  size?: [number, number];
  /** Final size multiplier. */
  grow?: number;
  spin?: number;
  alpha?: number;
  fade?: boolean;
  spread?: number;
  vx?: number;
  vy?: number;
  rotate?: boolean;
}

const BASE = 32;

/** One pooled particle system; emits into any container (world or screen). */
export class Particles {
  private tex: Record<Shape, Texture>;
  private live: Particle[] = [];
  private pool: Sprite[] = [];

  constructor(renderer: Renderer) {
    const make = (draw: (g: Graphics) => void) => {
      const g = new Graphics();
      draw(g);
      const t = renderer.generateTexture({ target: g, resolution: 2, antialias: true });
      g.destroy();
      return t;
    };
    const h = BASE / 2;
    this.tex = {
      circle: make((g) => g.circle(h, h, h).fill(0xffffff)),
      square: make((g) => g.roundRect(0, 0, BASE, BASE, 5).fill(0xffffff)),
      confetti: make((g) => g.roundRect(0, 0, BASE, BASE * 0.5, 4).fill(0xffffff)),
      drop: make((g) => g.moveTo(h, 0).quadraticCurveTo(BASE, BASE * 0.7, h, BASE).quadraticCurveTo(0, BASE * 0.7, h, 0).fill(0xffffff)),
      streak: make((g) => g.roundRect(0, 0, BASE * 2, 6, 3).fill(0xffffff)),
      feather: make((g) => g.ellipse(h, h * 0.5, h, h * 0.35).fill(0xffffff)),
      heart: make((g) => {
        g.moveTo(h, BASE * 0.9)
          .bezierCurveTo(-4, BASE * 0.45, 4, -2, h, BASE * 0.28)
          .bezierCurveTo(BASE - 4, -2, BASE + 4, BASE * 0.45, h, BASE * 0.9)
          .fill(0xffffff);
      }),
      star: make((g) => {
        const pts: number[] = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = i % 2 ? h * 0.48 : h;
          pts.push(h + Math.cos(a) * r, h + Math.sin(a) * r);
        }
        g.poly(pts).fill(0xffffff);
      }),
    };
  }

  emit(into: Container, o: EmitOpts): void {
    const n = o.count ?? 8;
    for (let i = 0; i < n; i++) this.spawn(into, o);
  }

  spawn(into: Container, o: EmitOpts, onDie?: (p: Particle) => void): Particle {
    const s = this.pool.pop() ?? new Sprite();
    s.texture = this.tex[o.shape ?? 'circle'];
    s.anchor.set(0.5);
    const tints = Array.isArray(o.tint) ? o.tint : [o.tint ?? 0xffffff];
    s.tint = tints[Math.floor(Math.random() * tints.length)];
    const spread = o.spread ?? 0;
    s.position.set(o.x + rand(-spread, spread), o.y + rand(-spread * 0.5, spread * 0.5));
    s.rotation = o.rotate === false ? 0 : rand(0, Math.PI * 2);
    const a = rand(...(o.angle ?? [0, Math.PI * 2]));
    const sp = rand(...(o.speed ?? [100, 300]));
    const size = rand(...(o.size ?? [8, 14]));
    s.alpha = o.alpha ?? 1;
    s.visible = true;
    into.addChild(s);
    const life = rand(...(o.life ?? [0.6, 1.1]));
    const p: Particle = {
      s,
      vx: Math.cos(a) * sp + (o.vx ?? 0),
      vy: Math.sin(a) * sp + (o.vy ?? 0),
      gravity: o.gravity ?? 600,
      drag: o.drag ?? 0.5,
      life,
      max: life,
      spin: (o.spin ?? 4) * (Math.random() < 0.5 ? -1 : 1),
      size0: size,
      size1: size * (o.grow ?? 1),
      alpha0: o.alpha ?? 1,
      fade: o.fade ?? true,
      onDie,
    };
    s.scale.set(size / BASE);
    this.live.push(p);
    return p;
  }

  /** A firework: a rising spark that bursts into colored stars. */
  firework(into: Container, x: number, y: number, targetY: number, colors: number[], onBurst?: () => void): void {
    const rise = Math.max(0.5, Math.min(1.1, (y - targetY) / 700));
    const vy = -(y - targetY) / rise;
    const rocket = this.spawn(into, {
      x, y, count: 1, shape: 'circle', tint: 0xfff3c4, speed: [0, 0], gravity: 0, drag: 0,
      life: [rise, rise], size: [7, 7], spin: 0, fade: false, vy,
    }, (p) => {
      onBurst?.();
      const bx = p.s.x, by = p.s.y;
      this.emit(into, { x: bx, y: by, count: 34, shape: 'star', tint: colors, speed: [160, 420], gravity: 140, drag: 1.4, life: [0.9, 1.6], size: [10, 18], spin: 3 });
      this.emit(into, { x: bx, y: by, count: 14, shape: 'circle', tint: 0xffffff, speed: [40, 200], gravity: 80, drag: 1.6, life: [0.4, 0.8], size: [6, 10] });
    });
    rocket.trail = () => {
      this.emit(into, { x: rocket.s.x, y: rocket.s.y, count: 1, shape: 'circle', tint: 0xffd88a, speed: [0, 30], gravity: 60, life: [0.25, 0.45], size: [4, 7], grow: 0.2 });
    };
  }

  update(dt: number): void {
    const live = this.live;
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.life -= dt;
      if (p.life <= 0 || p.s.destroyed || !p.s.parent) {
        live.splice(i, 1);
        if (!p.s.destroyed) {
          const cb = p.onDie;
          if (cb && p.s.parent) cb(p);
          p.s.removeFromParent();
          p.s.visible = false;
          this.pool.push(p.s);
        }
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      const t = 1 - p.life / p.max;
      p.s.scale.set((p.size0 + (p.size1 - p.size0) * t) / BASE);
      if (p.fade) p.s.alpha = p.alpha0 * Math.min(1, (1 - t) * 2.5);
      p.trail?.();
    }
  }

  clear(): void {
    for (const p of this.live) {
      if (!p.s.destroyed) {
        p.s.removeFromParent();
        this.pool.push(p.s);
      }
    }
    this.live = [];
  }
}
