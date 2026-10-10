// One small, complete story per trip: Leave → Travel → Arrive → Greet → fresh trip.
// Steps run in a fixed order; nothing is ever blocked and nothing is saved.
import type { Container } from 'pixi.js';
import type { Ctx } from '../core/Ctx';
import type { Suitcase } from '../landmarks/Home';
import { launchFirework, type Greeters } from '../landmarks/Charleston';
import { ARRIVE_X, CAR_START_X, GREET_X } from '../world/Route';
import { rand } from '../core/rng';

export type Phase = 'leave' | 'travel' | 'arrive' | 'greet';

export interface DirectorHost {
  startEngine(): void;
  /** The greeting is over: iris back to the garage for a fresh trip. */
  endTrip(): void;
  setDusk(t: number): void;
  showGoHint(): void;
}

export class TripDirector {
  phase: Phase = 'leave';
  engineOn = false;
  private greetT = 0;
  private nextReady = false;
  private fireworksLeft = 0;
  private fireworkT = 0;
  private resetting = false;

  private get hornPitch(): number {
    return this.ctx.carView.build.def.sound?.hornPitch ?? 1;
  }

  constructor(
    private ctx: Ctx,
    private host: DirectorHost,
    private suitcase: Suitcase,
    private greeters: Greeters,
  ) {}

  /** Returns true if the tap was used by the story (otherwise the car just honks). */
  onCarTap(): boolean {
    if (this.phase === 'leave' && !this.engineOn) {
      this.startEngine();
      return true;
    }
    if (this.phase === 'greet' && this.nextReady && !this.resetting) {
      this.resetting = true;
      this.ctx.sfx.honk(this.hornPitch);
      this.ctx.tweens.after(0.35, () => this.host.endTrip());
      return true;
    }
    return false;
  }

  /** Throttle before the engine is on just starts it: never blocked. */
  onThrottle(): void {
    if (!this.engineOn) this.startEngine();
  }

  /** Debug: skip the leave step (engine on, suitcase already on the roof). */
  skipLeave(): void {
    this.suitcase.loadNow();
    if (!this.engineOn) this.startEngine();
  }

  private startEngine(): void {
    this.engineOn = true;
    this.ctx.sfx.door();
    this.ctx.tweens.after(0.18, () => this.ctx.sfx.door());
    this.ctx.tweens.after(0.35, () => this.ctx.sfx.engineStart());
    this.ctx.tweens.after(0.9, () => this.ctx.sfx.honk(this.hornPitch));
    this.ctx.carView.flashLights();
    this.ctx.carView.bounce(25);
    this.host.startEngine();
    if (this.phase === 'leave') this.phase = 'travel';
  }

  onSkyTap(wx: number, wy: number): void {
    if (this.phase === 'greet') launchFirework(this.ctx, wx, Math.min(wy, -250));
  }

  update(dt: number): void {
    const car = this.ctx.car;

    // If the car leaves without the suitcase, it hops along after it.
    if (!this.suitcase.loaded && car.x > CAR_START_X + 220) this.suitcase.chase();

    if ((this.phase === 'travel' || this.phase === 'leave') && car.x > ARRIVE_X) {
      if (!this.engineOn) this.startEngine();
      this.phase = 'arrive';
    }
    if (this.phase === 'arrive' && car.x > GREET_X && car.speed < 60 && car.onGround && !car.held) {
      this.phase = 'greet';
      this.greetT = 0;
      this.greeters.emerge();
      this.ctx.sfx.chime();
      this.fireworksLeft = 6;
      this.fireworkT = 1.2;
    }
    if (this.phase === 'greet') {
      this.greetT += dt;
      this.host.setDusk(Math.min(1, this.greetT / 5));
      if (!this.nextReady && (this.greetT > 6 || (this.greeters.allGreeted && this.greetT > 3))) this.nextReady = true;
      this.fireworkT -= dt;
      if (this.fireworksLeft > 0 && this.fireworkT <= 0) {
        this.fireworksLeft--;
        this.fireworkT = rand(0.7, 1.4);
        const x = this.ctx.camX() + rand(-200, this.ctx.viewWidth() * 0.5);
        launchFirework(this.ctx, x, rand(-560, -360));
      }
    }
  }

  /** What should jiggle when the child pauses. */
  hintTargets(): Container[] {
    switch (this.phase) {
      case 'leave':
        return this.suitcase.loaded ? [this.ctx.carView] : [this.suitcase.hintTarget()];
      case 'travel':
      case 'arrive':
        this.host.showGoHint();
        return [this.ctx.carView];
      case 'greet':
        if (this.nextReady) return [this.ctx.carView];
        return [this.greeters.hintTarget()];
    }
  }
}
