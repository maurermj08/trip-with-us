import type { Container } from 'pixi.js';

export const ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutSine: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

interface Tween {
  t: number;
  dur: number;
  fn: (p: number) => void;
  ease: (t: number) => number;
  done?: () => void;
  delay: number;
  owner?: object;
}

interface WobbleState {
  t: number;
  dur: number;
  amp: number;
  squash: number;
  baseRot: number;
  baseSX: number;
  baseSY: number;
}

/** Tiny tween runner plus "toy" reactions (wobble, squash) that never stack badly. */
export class Tweens {
  private list: Tween[] = [];
  private wobbles = new Map<Container, WobbleState>();
  private timers: { t: number; fn: () => void }[] = [];

  add(dur: number, fn: (p: number) => void, opts: { ease?: (t: number) => number; done?: () => void; delay?: number; owner?: object } = {}): void {
    this.list.push({ t: 0, dur, fn, ease: opts.ease ?? ease.linear, done: opts.done, delay: opts.delay ?? 0, owner: opts.owner });
  }

  after(seconds: number, fn: () => void): void {
    this.timers.push({ t: seconds, fn });
  }

  cancel(owner: object): void {
    this.list = this.list.filter((tw) => tw.owner !== owner);
  }

  /** Damped rotation wobble around the object's pivot plus a little squash. */
  wobble(obj: Container, amp = 0.12, dur = 0.8, squash = 0.08): void {
    const cur = this.wobbles.get(obj);
    if (cur) {
      cur.t = 0;
      cur.amp = Math.max(amp, cur.amp * 0.6);
      cur.squash = squash;
      return;
    }
    this.wobbles.set(obj, {
      t: 0, dur, amp, squash,
      baseRot: obj.rotation, baseSX: obj.scale.x, baseSY: obj.scale.y,
    });
  }

  update(dt: number): void {
    // Callbacks may clear() and replace the lists; keep iterating the arrays we started with.
    const timers = this.timers;
    for (let i = timers.length - 1; i >= 0; i--) {
      const tm = timers[i];
      if (!tm) continue;
      tm.t -= dt;
      if (tm.t <= 0) {
        timers.splice(i, 1);
        try {
          tm.fn();
        } catch (e) {
          console.warn('timer dropped', e);
        }
      }
    }
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const tw = list[i];
      if (!tw) continue;
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      try {
        tw.fn(tw.ease(p));
        if (p >= 1) {
          list.splice(list.indexOf(tw), 1);
          tw.done?.();
        }
      } catch (e) {
        // One broken tween (e.g. its target was destroyed) must never freeze the game.
        const k = list.indexOf(tw);
        if (k >= 0) list.splice(k, 1);
        console.warn('tween dropped', e);
      }
    }
    for (const [obj, w] of this.wobbles) {
      w.t += dt;
      if (obj.destroyed) {
        this.wobbles.delete(obj);
        continue;
      }
      const p = w.t / w.dur;
      if (p >= 1) {
        obj.rotation = w.baseRot;
        obj.scale.set(w.baseSX, w.baseSY);
        this.wobbles.delete(obj);
        continue;
      }
      const decay = (1 - p) ** 2;
      obj.rotation = w.baseRot + Math.sin(w.t * 22) * w.amp * decay;
      const s = Math.sin(w.t * 18) * w.squash * decay;
      obj.scale.set(w.baseSX * (1 + s), w.baseSY * (1 - s));
    }
  }

  clear(): void {
    this.list = [];
    this.timers = [];
    this.wobbles.clear();
  }
}
