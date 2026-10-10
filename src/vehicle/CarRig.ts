// Everything about the player's car except its physics: the view, contact shadow,
// pitch, and the "car reacts" layer (sounds, dust, exhaust, wind streaks, hazards).
import { Container, Graphics } from 'pixi.js';
import type { Sfx } from '../audio/Sfx';
import type { Particles } from '../fx/Particles';
import { P } from '../style/palette';
import { contactShadow } from '../style/shapes';
import { surfaceAt } from '../world/Terrain';
import type { CarController, CarEvent } from './CarController';
import { CAR_HALF, MiniView } from './MiniView';

export interface CarRigLayers {
  car: Container;
  shadow: Container;
  /** In front of the car (dust, exhaust). */
  fx: Container;
  /** Behind the car (wind streaks). */
  behind: Container;
}

export class CarRig {
  readonly view = new MiniView();
  private shadow = new Graphics();
  private distance = 0;
  private prevVx = 0;
  private exhaustT = 0;
  private streakT = 0;
  private beeped = false;

  constructor(
    readonly car: CarController,
    private sfx: Sfx,
    private fx: Particles,
    private layers: CarRigLayers,
  ) {
    layers.car.addChild(this.view);
    layers.shadow.addChild(this.shadow);
  }

  /** Generous hit area: kids' fingers are big. */
  hitTest(wx: number, wy: number, pad = 24): boolean {
    const c = this.car;
    return wx > c.x - CAR_HALF - pad && wx < c.x + CAR_HALF + pad && wy > -c.alt - 100 - pad && wy < -c.alt + pad;
  }

  /** Contact with a prop: squash, headlight flash, squeak. */
  bump(strength: number): void {
    this.view.bounce(30 + strength * 60);
    this.view.flashLights();
    if (strength > 0.25) this.sfx.squeak();
  }

  /** Tapping the car: honk and a little hop. */
  honk(): void {
    this.sfx.honk();
    this.view.flashLights();
    this.car.hop(240);
    this.fx.emit(this.layers.fx, { x: this.car.x + 60, y: -this.car.alt - 110, count: 3, shape: 'circle', tint: [0xfff27a, P.white], speed: [60, 140], angle: [-2.2, -0.9], gravity: -40, life: [0.4, 0.7], size: [10, 16], grow: 0.3 });
  }

  handleEvents(events: CarEvent[]): void {
    const car = this.car, v = this.view;
    for (const e of events) {
      switch (e.type) {
        case 'hop':
          this.sfx.boing();
          v.bounce(-40);
          this.dust(0.5);
          break;
        case 'fly':
          this.sfx.whoosh();
          this.sfx.beepBeep();
          v.flashLights();
          this.dust(0.8);
          break;
        case 'takeoff':
          this.sfx.whoosh();
          this.beeped = false;
          break;
        case 'land': {
          const k = Math.min(1.5, e.impact / 600);
          if (e.impact > 120) {
            this.sfx.thump(k);
            this.dust(k);
            v.bounce(e.impact * 0.07);
            if (e.impact > 380) v.flashLights();
          }
          break;
        }
        case 'grab':
          v.setHazards(true);
          break;
        case 'drop':
          if (car.speed > 300) this.sfx.whoosh();
          break;
        case 'endBump':
          this.sfx.boing(0.9);
          this.bump(0.6);
          break;
      }
    }
    // Airtime sets off the hazards and a beep-beep.
    if (!car.held && car.onGround) {
      v.setHazards(false);
      this.beeped = false;
    } else if (!car.onGround && car.airTime > 0.3 && !car.held) {
      v.setHazards(true);
      if (!this.beeped) {
        this.beeped = true;
        this.sfx.beepBeep();
      }
    }
  }

  private dust(k: number): void {
    const car = this.car;
    const gy = -surfaceAt(car.x);
    for (const wx of [car.x - 65, car.x + 65]) {
      this.fx.emit(this.layers.fx, { x: wx, y: gy - 4, count: Math.round(3 + k * 4), shape: 'circle', tint: [0xe9e0cf, 0xd8cdb8], speed: [40, 160 * k + 40], angle: [-3.0, -0.15], gravity: -30, drag: 2, life: [0.4, 0.9], size: [10, 18], grow: 1.8, alpha: 0.75 });
    }
  }

  update(dt: number, throttle: boolean, brake: boolean, engineOn: boolean): void {
    const car = this.car, v = this.view;
    this.distance += car.vx * dt;
    const accel = (car.vx - this.prevVx) / Math.max(dt, 1e-3);
    this.prevVx = car.vx;
    v.braking = brake && car.speed > 5;

    // Pitch: follow the road slope on the ground, nose up when climbing in the air.
    let target: number;
    if (car.held) target = Math.max(-0.3, Math.min(0.3, car.vx / 3000));
    else if (car.onGround) target = -Math.atan((surfaceAt(car.x + 40) - surfaceAt(car.x - 40)) / 80);
    else target = Math.max(-0.32, Math.min(0.28, -car.vy / 1600));
    v.pitch += (target - v.pitch) * Math.min(1, dt * (car.onGround ? 14 : 4));
    v.position.set(car.x, -car.alt);
    v.update(dt, this.distance, car.onGround ? accel : 0, car.held);

    // Contact shadow stays on the ground and shrinks with height.
    const k = Math.max(0.35, 1 - Math.max(0, car.height) / 500);
    this.shadow.clear();
    contactShadow(this.shadow, car.x, -surfaceAt(car.x) + 1, 210 * k, 0.15 * k);

    // Exhaust puffs scale with speed; wind streaks while flying.
    if (engineOn) {
      this.exhaustT -= dt;
      if (this.exhaustT <= 0) {
        this.exhaustT = throttle ? 0.07 : 0.22 - Math.min(0.12, car.speed / 6000);
        this.fx.emit(this.layers.fx, {
          x: car.x - 102, y: -car.alt - 14, count: 1, shape: 'circle', tint: [0xe8e8e8, 0xdcdcdc], speed: [20, 50],
          angle: [Math.PI - 0.3, Math.PI + 0.1], vx: -car.vx * 0.15, gravity: -40, drag: 1.5, life: [0.5, 0.9], size: [8, 12], grow: 2.4, alpha: 0.7,
        });
      }
    }
    if (!car.onGround && car.speed > 300 && !car.held) {
      this.streakT -= dt;
      if (this.streakT <= 0) {
        this.streakT = 0.05;
        this.fx.emit(this.layers.behind, {
          x: car.x - 120 + Math.random() * 60, y: -car.alt - 20 - Math.random() * 70, count: 1, shape: 'streak', tint: P.white,
          speed: [0, 0], vx: car.vx * 0.4, gravity: 0, life: [0.25, 0.4], size: [40, 70], alpha: 0.6, spin: 0, rotate: false,
        });
      }
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
    this.shadow.destroy();
  }
}
