import { describe, expect, it } from 'vitest';
import {
  AIRPORTS, ARRIVE_X, BRIDGES, CITIES, FINAL_CITY, GREET_X, KEEP_OUT, MILES, RAMPS, ROUTE, WORLD_END, WORLD_START,
  WATER_REGIONS, ZONE_LIST, bridgeAt, regionAt, timeOfDay, zoneAt,
} from '../src/world/Route';
import { roadHeight } from '../src/world/Terrain';

const miles = ROUTE.filter((p) => p.kind === 'mile');

describe('Route', () => {
  it('mile markers count down 100 to 1 as x increases', () => {
    expect(miles.map((m) => m.n)).toEqual(Array.from({ length: 100 }, (_, i) => 100 - i));
    for (let i = 1; i < miles.length; i++) expect(miles[i].x).toBeGreaterThan(miles[i - 1].x);
  });

  it('mile markers stay out of bridges, cities, airports and Duckies', () => {
    for (const m of miles) for (const [a, b] of KEEP_OUT) expect(m.x < a || m.x > b).toBe(true);
    expect(MILES.length).toBe(100);
  });

  it('every set piece is inside the world', () => {
    for (const p of ROUTE) {
      expect(p.x).toBeGreaterThan(WORLD_START);
      expect(p.x + (p.len ?? 0)).toBeLessThan(WORLD_END);
    }
  });

  it('the trip ends inside Potato World, just after Orlando', () => {
    expect(FINAL_CITY.id).toBe('potato-world');
    const orlando = CITIES.find((c) => c.id === 'orlando')!;
    const last = BRIDGES.at(-1)!;
    expect(miles.at(-1)!.x).toBeLessThan(last.start);
    expect(FINAL_CITY.x0).toBeGreaterThan(orlando.x0 + orlando.len);
    expect(FINAL_CITY.x0 - (orlando.x0 + orlando.len)).toBeLessThan(5000);
    expect(ARRIVE_X).toBeGreaterThanOrEqual(FINAL_CITY.x0);
    expect(GREET_X).toBeGreaterThan(FINAL_CITY.x0);
    expect(GREET_X).toBeLessThan(WORLD_END);
    expect(roadHeight(ARRIVE_X)).toBe(0);
  });

  it('cities are in order, do not overlap, and each starts where its bridge ends', () => {
    expect(CITIES.map((c) => c.id)).toEqual(['new-york', 'washington', 'richmond', 'charleston', 'savannah', 'jacksonville', 'orlando', 'potato-world']);
    for (let i = 1; i < CITIES.length; i++) expect(CITIES[i].x0).toBeGreaterThan(CITIES[i - 1].x0 + CITIES[i - 1].len);
    expect(CITIES.filter((c) => c.final).map((c) => c.id)).toEqual(['potato-world']);
    for (const c of CITIES.filter((cc) => cc.bridge)) {
      const b = BRIDGES.find((br) => br.id === c.bridge)!;
      expect(b.end).toBe(c.x0);
      expect(roadHeight(b.start + b.rise + 10)).toBe(b.top);
      expect(roadHeight(c.x0 + 10)).toBe(0);
    }
  });

  it('water bridges cross water regions; the flyover does not', () => {
    for (const b of BRIDGES) {
      const mid = (b.start + b.end) / 2;
      expect(bridgeAt(mid)).toBe(b);
      if (b.under === 'water') expect(WATER_REGIONS.has(regionAt(mid))).toBe(true);
    }
    expect(BRIDGES.find((b) => b.kind === 'flyover')!.under).toBe('ground');
  });

  it('zones do not overlap, and cities are open road while bridges and airports are not', () => {
    for (let i = 1; i < ZONE_LIST.length; i++) expect(ZONE_LIST[i].a).toBeGreaterThanOrEqual(ZONE_LIST[i - 1].b);
    for (const c of CITIES) expect(zoneAt(c.x0 + 1000)?.open).toBe(true);
    for (const a of AIRPORTS) expect(zoneAt(a.x0 + 1000)?.open).toBe(false);
    // Between cities the interstate barrier comes back.
    expect(zoneAt(CITIES[0].x0 + CITIES[0].len + 2000)).toBeNull();
  });

  it('ramps do not overlap bridges, zones or mile markers', () => {
    for (const r of RAMPS) {
      for (const [a, b] of KEEP_OUT) expect(r.x + r.len < a || r.x > b).toBe(true);
      for (const m of miles) expect(m.x < r.x - 300 || m.x > r.x + r.len + 300).toBe(true);
    }
  });

  it('signs sit in the right legs', () => {
    const welcome = (st: string) => ROUTE.find((p) => p.kind === 'welcome' && p.state === st)!.x;
    const city = (id: string) => CITIES.find((c) => c.id === id)!;
    // Driving south: NY, NJ, MD, DC, VA, NC, SC, GA, FL, in that order.
    const order = ['NY', 'NJ', 'MD', 'DC', 'VA', 'NC', 'SC', 'GA', 'FL'].map(welcome);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(welcome('NY')).toBeLessThan(city('new-york').x0);
    expect(welcome('DC')).toBeLessThan(city('washington').x0);
    expect(welcome('VA')).toBeGreaterThan(city('washington').x0);
    expect(welcome('VA')).toBeLessThan(city('richmond').x0);
    expect(welcome('NC')).toBeGreaterThan(city('richmond').x0);
    expect(welcome('SC')).toBeLessThan(city('charleston').x0);
    expect(welcome('GA')).toBeGreaterThan(city('charleston').x0);
    expect(welcome('GA')).toBeLessThan(city('savannah').x0 + city('savannah').len);
    expect(welcome('FL')).toBeGreaterThan(city('savannah').x0);
    expect(welcome('FL')).toBeLessThan(city('jacksonville').x0);
    for (const g of ROUTE.filter((p) => p.kind === 'guide' && p.city !== 'airport' && p.city !== 'downtown-orlando')) {
      const c = city(g.city!);
      const prev = CITIES[CITIES.indexOf(c) - 1];
      expect(g.x).toBeLessThan(c.x0);
      if (prev) expect(g.x).toBeGreaterThan(prev.x0);
    }
  });

  it('every set piece stays off bridges and out of city streets', () => {
    for (const p of ROUTE.filter((q) => q.kind !== 'welcome' && q.kind !== 'ramp' && q.kind !== 'mile')) {
      const z = zoneAt(p.x);
      if (z && (z.kind === 'bridge' || z.kind === 'city')) throw new Error(`${p.kind} at ${p.x} is in ${z.id}`);
    }
  });

  it('puddles and mud never come in runs, and mud patches stay small', () => {
    const wet = ROUTE.filter((p) => p.kind === 'puddle' || p.kind === 'mud');
    for (let i = 1; i < wet.length; i++) expect(wet[i].x - wet[i - 1].x).toBeGreaterThanOrEqual(3500);
    for (const m of wet.filter((p) => p.kind === 'mud')) expect(m.len ?? 0).toBeLessThanOrEqual(300);
  });

  it('Potato World hype stays behind the road (no near-shoulder ads)', () => {
    expect(ROUTE.filter((p) => p.kind === 'potato-countdown')).toEqual([]);
    expect(ROUTE.filter((p) => p.kind === 'billboard' && p.design?.startsWith('potato')).length).toBeGreaterThanOrEqual(3);
  });

  it('the sky goes morning → day → golden', () => {
    expect(timeOfDay(0).morning).toBe(1);
    expect(timeOfDay(60000)).toEqual({ morning: 0, gold: 0 });
    expect(timeOfDay(FINAL_CITY.x0).gold).toBe(1);
    expect(timeOfDay(AIRPORTS[1].x0 + AIRPORTS[1].len).gold).toBeGreaterThan(0);
  });
});
