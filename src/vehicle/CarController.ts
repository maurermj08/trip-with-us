// Toy car physics: 1D motion along the road plus vertical hops and flight.
// Pure logic (no rendering) so it can be unit tested.

export const CAR = {
  maxSpeed: 900,
  accel: 560,
  brake: 1300,
  coastDrag: 0.18,
  rollDrag: 45,
  airDrag: 0.04,
  gravity: 1900,
  hopV: 640,
  flySpeed: 420,
  flyKick: 520,
  liftAccel: 1400,
  maxClimb: 430,
  maxAlt: 540,
  cruiseAlt: 420,
  glideGravity: 950,
  glideMaxFall: 520,
  launchBonus: 220,
  maxThrowSpeed: 900,
  /** Holding brake at a standstill backs up after this pause (so a stop stays a stop). */
  reverseDelay: 0.35,
  /** Backwards is a full mirror of forwards: same pickup and top speed, hops and flight. */
  reverseAccel: 560,
  maxReverse: 900,
  /** Approaching the end of the road the car eases to a stop (never a crash) at this decel. */
  endDecel: 900,
};

export interface CarInput {
  throttle: boolean;
  brake: boolean;
  lift: boolean;
  /** Brake held by the child (not a scripted stop): after a pause at a standstill, back up. */
  reverse?: boolean;
  /** When the car is being dragged: the desired position. */
  hold: { x: number; alt: number } | null;
}

export type CarEvent =
  | { type: 'land'; impact: number }
  | { type: 'hop' }
  | { type: 'fly' }
  | { type: 'takeoff'; vy: number }
  | { type: 'grab' }
  | { type: 'drop' }
  | { type: 'endBump'; speed: number };

export const NO_INPUT: CarInput = { throttle: false, brake: false, lift: false, hold: null };

export class CarController {
  x: number;
  alt: number;
  vx = 0;
  vy = 0;
  onGround = true;
  held = false;
  flying = false;
  airTime = 0;
  private liftWasDown = false;
  /** Seconds the brake has been held at a standstill (or while backing up). */
  private reverseT = 0;

  constructor(
    private surface: (x: number) => number,
    public minX: number,
    public maxX: number,
    x0: number,
  ) {
    this.x = x0;
    this.alt = surface(x0);
  }

  get speed(): number {
    return Math.abs(this.vx);
  }

  /** Height above whatever is under the car. */
  get height(): number {
    return this.alt - this.surface(this.x);
  }

  step(dt: number, input: CarInput): CarEvent[] {
    const events: CarEvent[] = [];
    dt = Math.min(dt, 1 / 20);

    if (input.hold) {
      this.stepHeld(dt, input.hold, events);
      return events;
    }
    if (this.held) {
      this.held = false;
      this.vx = clamp(this.vx, -400, CAR.maxThrowSpeed);
      this.vy = clamp(this.vy, -900, 900);
      this.onGround = this.alt <= this.surface(this.x) + 0.5;
      if (this.onGround) this.vy = 0;
      events.push({ type: 'drop' });
    }

    // Horizontal: the child owns the pace.
    if (!input.brake) this.reverseT = 0;
    if (input.throttle) {
      this.vx += CAR.accel * dt * (this.vx < 0 ? 2.5 : 1);
      this.vx = Math.min(this.vx, CAR.maxSpeed);
    } else if (input.brake) {
      if (this.vx > 0) {
        this.vx = approach(this.vx, 0, CAR.brake * dt);
        this.reverseT = 0;
      } else if (input.reverse) {
        // Already rolling backwards (on the ground or in the air): keep speeding up, no pause.
        this.reverseT = this.vx < 0 ? CAR.reverseDelay + 1 : this.reverseT + dt;
        if (this.reverseT > CAR.reverseDelay) this.vx = Math.max(this.vx - CAR.reverseAccel * dt, -CAR.maxReverse);
      } else {
        this.vx = approach(this.vx, 0, CAR.brake * dt);
      }
    } else {
      const drag = this.onGround
        ? CAR.coastDrag * Math.abs(this.vx) + CAR.rollDrag
        : CAR.airDrag * Math.abs(this.vx);
      this.vx = approach(this.vx, 0, drag * dt);
    }

    // The end of the road: ease off so the car rolls to a gentle stop right at maxX.
    if (this.vx > 0) this.vx = Math.min(this.vx, Math.sqrt(2 * CAR.endDecel * Math.max(0, this.maxX - this.x)));

    // Lift: touching high hops at low speed and flies at high speed.
    const liftPressed = input.lift && !this.liftWasDown;
    this.liftWasDown = input.lift;
    const fast = Math.abs(this.vx) >= CAR.flySpeed;

    if (this.onGround && liftPressed) {
      this.onGround = false;
      if (fast) {
        this.flying = true;
        this.vy = CAR.flyKick;
        events.push({ type: 'fly' });
      } else {
        this.vy = CAR.hopV;
        events.push({ type: 'hop' });
      }
    } else if (!this.onGround && liftPressed && fast && !this.flying) {
      this.flying = true;
      events.push({ type: 'fly' });
    }

    if (!this.onGround) {
      const ground = this.surface(this.x);
      if (input.lift && this.flying) {
        // Climb smoothly toward a cruising height and hover there while held.
        const h = Math.max(0, this.alt - ground);
        const target = clamp((CAR.cruiseAlt - h) * 2.2, -220, CAR.maxClimb);
        this.vy = approach(this.vy, target, CAR.liftAccel * dt);
      } else if (input.lift) {
        this.vy -= CAR.gravity * 0.55 * dt;
      } else if (this.flying) {
        this.vy -= CAR.glideGravity * dt;
        this.vy = Math.max(this.vy, -CAR.glideMaxFall);
      } else {
        this.vy -= CAR.gravity * dt;
      }
      this.alt += this.vy * dt;
      this.airTime += dt;
    }

    this.x += this.vx * dt;
    this.clampX(events);

    const ground = this.surface(this.x);
    if (this.onGround) {
      const ballistic = this.alt + this.vy * dt;
      if (ground < ballistic - 3 - 0.5 * CAR.gravity * dt * dt) {
        // Rolled off an edge (the top of a ramp): launch or drop.
        this.onGround = false;
        this.airTime = 0;
        this.alt = ballistic;
        if (this.vy > 120) {
          this.vy += CAR.launchBonus;
          events.push({ type: 'takeoff', vy: this.vy });
        } else {
          this.vy = Math.max(this.vy, 0);
        }
      } else {
        this.vy = (ground - this.alt) / dt;
        this.alt = ground;
      }
    } else if (this.alt <= ground) {
      const impact = Math.max(0, -this.vy);
      this.alt = ground;
      this.flying = false;
      this.airTime = 0;
      events.push({ type: 'land', impact });
      if (impact > 420) {
        this.vy = impact * 0.22;
        this.alt = ground + 0.01;
      } else {
        this.vy = 0;
        this.onGround = true;
      }
    }
    return events;
  }

  /** A little hop, e.g. when the car is tapped. */
  hop(v = 260): void {
    if (this.held) return;
    if (this.onGround) {
      this.onGround = false;
      this.vy = v;
      this.airTime = 0;
    }
  }

  teleport(x: number): void {
    this.x = x;
    this.alt = this.surface(x);
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.flying = false;
    this.held = false;
  }

  private stepHeld(dt: number, hold: { x: number; alt: number }, events: CarEvent[]): void {
    if (!this.held) {
      this.held = true;
      this.flying = false;
      events.push({ type: 'grab' });
    }
    const k = 1 - Math.exp(-dt * 16);
    const tx = clamp(hold.x, this.minX, this.maxX);
    const ground = this.surface(tx);
    const talt = Math.max(hold.alt, ground);
    const nx = this.x + (tx - this.x) * k;
    const nalt = Math.max(this.surface(nx), this.alt + (talt - this.alt) * k);
    // Smoothed velocity so a flick throws the car.
    this.vx += ((nx - this.x) / dt - this.vx) * 0.35;
    this.vy += ((nalt - this.alt) / dt - this.vy) * 0.35;
    this.x = nx;
    this.alt = nalt;
    this.onGround = false;
  }

  private clampX(events: CarEvent[]): void {
    if (this.x >= this.maxX) {
      this.x = this.maxX;
      if (this.vx > 60) {
        events.push({ type: 'endBump', speed: this.vx });
        if (this.onGround) {
          this.onGround = false;
          this.vy = Math.min(120 + this.vx * 0.4, 380);
        }
        this.vx = -this.vx * 0.2;
      } else if (this.vx > 0) {
        this.vx = 0;
      }
    } else if (this.x <= this.minX) {
      this.x = this.minX;
      if (this.vx < 0) this.vx = 0;
    }
  }
}

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

function approach(v: number, target: number, step: number): number {
  if (v > target) return Math.max(target, v - step);
  if (v < target) return Math.min(target, v + step);
  return v;
}
