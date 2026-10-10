import { BRIDGES, RAMPS } from './Route';

/** Height of the road itself (up is positive). Flat except where it arches over a bridge. */
export function roadHeight(x: number): number {
  for (const { start, rise, top, fall, end } of BRIDGES) {
    if (x <= start || x >= end) continue;
    if (x < start + rise) return top * (0.5 - 0.5 * Math.cos(((x - start) / rise) * Math.PI));
    if (x > end - fall) return top * (0.5 - 0.5 * Math.cos(((end - x) / fall) * Math.PI));
    return top;
  }
  return 0;
}

export function rampHeight(x: number): number {
  for (const r of RAMPS) {
    if (x >= r.x && x <= r.x + r.len) {
      const t = (x - r.x) / r.len;
      return r.height * t * t;
    }
  }
  return 0;
}

/** What the wheels actually roll on. */
export function surfaceAt(x: number): number {
  return roadHeight(x) + rampHeight(x);
}
