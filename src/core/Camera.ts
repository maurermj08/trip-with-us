import { CAR, type CarController } from '../vehicle/CarController';
import { roadHeight } from '../world/Terrain';
import { WORLD_END, WORLD_START } from '../world/Route';

/** Design height: every layout number is in these units (iPad landscape = 1024×768). */
export const DESIGN_H = 768;
/** The road contact line sits this fraction of DESIGN_H above the bottom of the screen. */
const GROUND_FROM_BOTTOM = 0.3;
/** Horizontal screen position of the camera anchor (the car rests here when cruising). */
const ANCHOR_X = 0.36;

/**
 * Follows the car with speed look-ahead, rises when the car flies, zooms out with speed.
 * World units: x grows toward the destination, y grows downward, road contact line y = 0.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  /** Design-unit view size and the screen point that world (x, y) maps to. */
  viewW = 1024;
  viewH = DESIGN_H;
  anchorX = 0;
  anchorY = 0;
  /** CSS px per design unit. */
  scale = 1;

  resize(cssW: number, cssH: number): void {
    this.scale = Math.min(cssH / DESIGN_H, cssW / 900);
    this.viewW = cssW / this.scale;
    this.viewH = cssH / this.scale;
    this.anchorX = this.viewW * ANCHOR_X;
    this.anchorY = this.viewH - DESIGN_H * GROUND_FROM_BOTTOM;
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }

  /** Smallest camera x that keeps the left screen edge at the world start. */
  get minX(): number {
    return WORLD_START + this.anchorX / this.zoom - 30;
  }

  /** `frameHome`: hold the camera at the world start so the house is in view. */
  update(dt: number, car: CarController, frameHome: boolean): void {
    const speed01 = Math.min(1, car.speed / CAR.maxSpeed);
    const zoomTarget = 1 - 0.12 * speed01 - 0.08 * Math.min(1, Math.max(0, car.height) / 450);
    this.zoom += (zoomTarget - this.zoom) * Math.min(1, dt * 1.5);
    const tx = frameHome ? this.minX : car.x + Math.max(-260, Math.min(260, car.vx * 0.3));
    this.x += (tx - this.x) * Math.min(1, dt * 4);
    const maxX = WORLD_END + 900 - (this.viewW - this.anchorX) / this.zoom;
    this.x = Math.max(this.minX, Math.min(maxX, this.x));
    const road = roadHeight(car.x);
    const ty = -road - Math.max(0, car.alt - road - 160) * 0.85;
    this.y += (ty - this.y) * Math.min(1, dt * 3);
  }

  /** Visible extent left/right of the anchor, in world units. */
  get left(): number {
    return this.anchorX / this.zoom;
  }
  get right(): number {
    return (this.viewW - this.anchorX) / this.zoom;
  }

  toDesign(px: number, py: number): { x: number; y: number } {
    return { x: px / this.scale, y: py / this.scale };
  }

  /** Design (screen) units → world. */
  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: this.x + (sx - this.anchorX) / this.zoom, y: this.y + (sy - this.anchorY) / this.zoom };
  }

  /** World → design (screen) units. */
  toScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: this.anchorX + (wx - this.x) * this.zoom, y: this.anchorY + (wy - this.y) * this.zoom };
  }
}
