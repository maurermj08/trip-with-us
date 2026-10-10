import type { Container } from 'pixi.js';
import type { Sfx } from '../audio/Sfx';
import type { Particles } from '../fx/Particles';
import type { Tweens } from './Tween';
import type { CarController } from '../vehicle/CarController';
import type { MiniView } from '../vehicle/MiniView';

/** Shared services handed to props and landmarks. */
export interface Ctx {
  sfx: Sfx;
  fx: Particles;
  tweens: Tweens;
  car: CarController;
  carView: MiniView;
  /** World-space layers (parallax factor 1). */
  layers: {
    back: Container;
    roadDecor: Container;
    mid: Container;
    front: Container;
    fx: Container;
    /** Effects drawn just over the back props (behind the road). */
    fxBack: Container;
    /** Far sky effects (fireworks), behind everything in the world. */
    skyFx: Container;
  };
  /** Camera position (world x at the screen anchor). */
  camX: () => number;
  viewWidth: () => number;
  /** Car reaction to contact: squash, headlight flash, squeak. */
  bumpCar: (strength: number) => void;
}
