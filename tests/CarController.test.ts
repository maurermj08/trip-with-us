import { describe, expect, it } from 'vitest';
import { CAR, CarController, NO_INPUT, type CarEvent, type CarInput } from '../src/vehicle/CarController';
import { surfaceAt } from '../src/world/Terrain';
import { RAMPS, WORLD_END } from '../src/world/Route';

const flat = () => 0;
const DT = 1 / 60;

function run(car: CarController, input: CarInput, seconds: number): CarEvent[] {
  const all: CarEvent[] = [];
  for (let t = 0; t < seconds; t += DT) all.push(...car.step(DT, input));
  return all;
}

describe('CarController', () => {
  it('accelerates up to max speed', () => {
    const car = new CarController(flat, 0, 1e6, 100);
    run(car, { ...NO_INPUT, throttle: true }, 4);
    expect(car.vx).toBeCloseTo(CAR.maxSpeed, 0);
  });

  it('brakes to a full stop', () => {
    const car = new CarController(flat, 0, 1e6, 100);
    run(car, { ...NO_INPUT, throttle: true }, 3);
    run(car, { ...NO_INPUT, brake: true }, 2);
    expect(car.vx).toBe(0);
  });

  it('backs up when brake is held at a standstill', () => {
    const car = new CarController(flat, 0, 1e6, 5000);
    run(car, { ...NO_INPUT, throttle: true }, 1);
    // ~0.45 s to stop from ~560, then a short pause before backing up.
    run(car, { ...NO_INPUT, brake: true, reverse: true }, 0.6);
    expect(car.vx).toBe(0);
    const x = car.x;
    run(car, { ...NO_INPUT, brake: true, reverse: true }, 3);
    expect(car.vx).toBe(-CAR.maxReverse);
    expect(car.x).toBeLessThan(x);
    run(car, { ...NO_INPUT, throttle: true }, 1);
    expect(car.vx).toBeGreaterThan(0);
  });

  it('can hop and fly while going backwards at full speed', () => {
    const car = new CarController(flat, 0, 1e6, 50000);
    const back = { ...NO_INPUT, brake: true, reverse: true };
    run(car, back, 3);
    expect(car.vx).toBe(-CAR.maxSpeed);
    // A hop keeps the backwards speed (no braking in the air).
    run(car, { ...back, lift: true }, 0.1);
    expect(car.onGround).toBe(false);
    expect(car.flying).toBe(true);
    run(car, { ...back, lift: true }, 1);
    expect(car.vx).toBe(-CAR.maxSpeed);
    expect(car.height).toBeGreaterThan(100);
  });

  it('a scripted stop (brake without reverse) never backs up', () => {
    const car = new CarController(flat, 0, 1e6, 5000);
    run(car, { ...NO_INPUT, brake: true }, 3);
    expect(car.vx).toBe(0);
  });

  it('coasts down gently without input', () => {
    const car = new CarController(flat, 0, 1e6, 100);
    run(car, { ...NO_INPUT, throttle: true }, 3);
    const v = car.vx;
    run(car, NO_INPUT, 1);
    expect(car.vx).toBeLessThan(v);
    expect(car.vx).toBeGreaterThan(v * 0.5);
  });

  it('hops at low speed', () => {
    const car = new CarController(flat, 0, 1e6, 100);
    const ev = car.step(DT, { ...NO_INPUT, lift: true });
    expect(ev.map((e) => e.type)).toContain('hop');
    expect(car.flying).toBe(false);
    const evs = run(car, NO_INPUT, 2);
    expect(evs.map((e) => e.type)).toContain('land');
    expect(car.onGround).toBe(true);
    expect(car.alt).toBe(0);
  });

  it('flies at high speed and lands softly after letting go', () => {
    const car = new CarController(flat, 0, 1e6, 100);
    run(car, { ...NO_INPUT, throttle: true }, 3);
    const ev = run(car, { ...NO_INPUT, throttle: true, lift: true }, 3);
    expect(ev.map((e) => e.type)).toContain('fly');
    expect(car.alt).toBeGreaterThan(200);
    expect(car.alt).toBeLessThanOrEqual(CAR.maxAlt + 1);
    const land = run(car, NO_INPUT, 5).find((e) => e.type === 'land');
    expect(land).toBeTruthy();
    if (land?.type === 'land') expect(land.impact).toBeLessThanOrEqual(CAR.glideMaxFall + 1);
  });

  it('never leaves the world bounds, easing to a stop at the end of the road', () => {
    const car = new CarController(surfaceAt, 0, WORLD_END, WORLD_END - 3000);
    run(car, { ...NO_INPUT, throttle: true }, 8);
    expect(car.x).toBeLessThanOrEqual(WORLD_END);
    expect(car.x).toBeGreaterThan(WORLD_END - 5);
    expect(car.vx).toBeLessThan(5);
    const back = new CarController(flat, 0, 1000, 10);
    run(back, { ...NO_INPUT, hold: { x: -500, alt: 0 } }, 1);
    run(back, NO_INPUT, 1);
    expect(back.x).toBeGreaterThanOrEqual(0);
  });

  it('launches off a ramp at speed', () => {
    const r = RAMPS[0];
    const car = new CarController(surfaceAt, 0, WORLD_END, r.x - 3000);
    const evs = run(car, { ...NO_INPUT, throttle: true }, 5);
    expect(evs.map((e) => e.type)).toContain('takeoff');
  });

  it('rolls off a ramp slowly without teleporting', () => {
    const r = RAMPS[0];
    const car = new CarController(surfaceAt, 0, WORLD_END, r.x + r.len - 5);
    car.vx = 60;
    let maxDrop = 0;
    let prev = car.alt;
    for (let i = 0; i < 120; i++) {
      car.step(DT, NO_INPUT);
      maxDrop = Math.max(maxDrop, prev - car.alt);
      prev = car.alt;
    }
    expect(maxDrop).toBeLessThan(40);
    expect(car.alt).toBe(0);
  });

  it('can be dragged and thrown', () => {
    const car = new CarController(flat, 0, 1e6, 100);
    let hx = 100;
    for (let i = 0; i < 30; i++) {
      hx += 15;
      car.step(DT, { ...NO_INPUT, hold: { x: hx, alt: 200 } });
    }
    expect(car.held).toBe(true);
    const ev = car.step(DT, NO_INPUT);
    expect(ev.map((e) => e.type)).toContain('drop');
    expect(car.vx).toBeGreaterThan(300);
    run(car, NO_INPUT, 3);
    expect(car.onGround).toBe(true);
  });
});
