import { describe, expect, it } from 'vitest';
import { ROUTE, WORLD_END, WORLD_START, BRIDGE, ARRIVE_X, GREET_X, RAMPS } from '../src/world/Route';
import { roadHeight } from '../src/world/Terrain';

describe('Route', () => {
  it('mile markers count down 10 to 1 as x increases', () => {
    const miles = ROUTE.filter((p) => p.kind === 'mile');
    expect(miles.map((m) => m.n)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    for (let i = 1; i < miles.length; i++) expect(miles[i].x).toBeGreaterThan(miles[i - 1].x);
  });

  it('every set piece is inside the world', () => {
    for (const p of ROUTE) {
      expect(p.x).toBeGreaterThan(WORLD_START);
      expect(p.x + (p.len ?? 0)).toBeLessThan(WORLD_END);
    }
  });

  it('the trip ends in Charleston after the bridge', () => {
    const lastMile = ROUTE.filter((p) => p.kind === 'mile').at(-1)!;
    expect(lastMile.x).toBeLessThan(BRIDGE.start);
    expect(ARRIVE_X).toBeGreaterThanOrEqual(BRIDGE.end);
    expect(GREET_X).toBeLessThan(WORLD_END);
    expect(roadHeight(BRIDGE.start + BRIDGE.rise + 10)).toBe(BRIDGE.top);
    expect(roadHeight(ARRIVE_X)).toBe(0);
  });

  it('ramps do not overlap the bridge or mile markers', () => {
    const miles = ROUTE.filter((p) => p.kind === 'mile');
    for (const r of RAMPS) {
      expect(r.x + r.len < BRIDGE.start || r.x > BRIDGE.end).toBe(true);
      for (const m of miles) expect(m.x < r.x - 300 || m.x > r.x + r.len + 300).toBe(true);
    }
  });
});
