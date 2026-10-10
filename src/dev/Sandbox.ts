// The /dev sandbox viewport: same layers, props, physics and effects as the game, but with a
// free camera (pan / zoom / pinch), optional road or full-scene context, overlays, and a test
// car that can drive through anything.
import { Application, Container, Graphics } from 'pixi.js';
import { Synth } from '../audio/Synth';
import { Sfx } from '../audio/Sfx';
import { EngineSound } from '../audio/Engine';
import { Particles } from '../fx/Particles';
import { Tweens } from '../core/Tween';
import type { Ctx } from '../core/Ctx';
import { CarController, NO_INPUT, type CarInput } from '../vehicle/CarController';
import { CarRig } from '../vehicle/CarRig';
import { buildVehicle, pixelsPerUnit, type VehicleBuild } from '../vehicle/art/VehicleBuild';
import { art } from '../vehicle/art/registry';
import { defaultChoice } from '../vehicle/art/schema';
import { surfaceAt } from '../world/Terrain';
import type { ChunkLayer } from '../world/ChunkLayer';
import { cloudLayer, farLayer, foregroundLayer, nearLayer, skylineLayer } from '../world/Scenery';
import { roadLayer } from '../world/Road';
import { Sky } from '../world/Sky';
import type { Prop } from '../props/Prop';
import type { Cfg } from './ids';

export type Context = 'none' | 'road' | 'scene';
export type Backdrop = 'plain' | 'checker' | 'sky';
export type LayerName = 'clouds' | 'skyline' | 'far' | 'near' | 'road' | 'foreground';

export interface Focus { x: number; y: number; w: number; h: number }
export interface Action { label: string; run(): void }

/** What an item hands back once built. */
export interface Built {
  /** World-space box to frame ("Fit"). */
  focus: Focus;
  actions?: Action[];
  /** Called every frame with the current settings (live fields read here). */
  update?(dt: number, cfg: Cfg): void;
  /** Extra overlay drawing (anchors…), world space. */
  overlay?(g: Graphics, cfg: Cfg): void;
  /** Custom tap handling for non-prop items; return true if handled. */
  tap?(wx: number, wy: number): boolean;
  /** Text shown in the inspector (validation, notes). */
  info?(): string;
  /** Items that own the pointer and the whole view (the garage). */
  pointer?: { down(e: PointerEvent): void; move(e: PointerEvent): void; up(e: PointerEvent): void };
  /** Rebuild when the zoom changes a lot (rasterized art). */
  zoomSensitive?: boolean;
  /** Named parts (e.g. "body/mirror") that can be highlighted and referenced. */
  parts?: { path: string; depth: number }[];
  /** Highlight a part (null clears). */
  setPart?(path: string | null): void;
  /** The smallest named part under a world point. */
  partAt?(wx: number, wy: number): string | null;
  destroy?(): void;
}

export interface DevEnv {
  ctx: Ctx;
  app: Application;
  sfx: Sfx;
  fx: Particles;
  tweens: Tweens;
  /** Register a prop: added to its layer, tappable, updated and bump-tested. */
  addProp<T extends Prop>(p: T): T;
  /** Add any display object to a world layer. */
  addDisplay(c: Container, layer?: 'back' | 'mid' | 'car' | 'front' | 'fx'): void;
  /** Screen-space mount (for whole scenes like the garage). */
  screen: Container;
  setLayerVisible(name: LayerName, on: boolean): void;
  setSky(gold: number, dusk: number, morning?: number): void;
  /** Pixels per art unit for crisp art at the current zoom. */
  ppu(extraScale?: number): number;
  zoom(): number;
  testCar: TestCar;
  viewSize(): { w: number; h: number };
}

export interface TestCar {
  driveThrough(fromX: number, toX: number): void;
  park(x: number): void;
  hide(): void;
}

const ITEM_LAYERS = ['skyFx', 'back', 'fxBack', 'roadDecor', 'mid', 'front', 'fx'] as const;

export class Sandbox implements DevEnv {
  readonly synth = new Synth();
  readonly sfx = new Sfx(this.synth);
  readonly engine = new EngineSound(this.synth);
  readonly tweens = new Tweens();
  readonly fx: Particles;
  readonly ctx!: Ctx;
  readonly screen = new Container();

  private bg = new Graphics();
  private sky = new Sky();
  private view = new Container();
  private world = new Container();
  private overlayG = new Graphics();
  private parallax: Record<Exclude<LayerName, 'road'>, ChunkLayer> = {
    clouds: cloudLayer(), skyline: skylineLayer(), far: farLayer(), near: nearLayer(), foreground: foregroundLayer(),
  };
  private road = roadLayer();
  private layerOn: Record<LayerName, boolean> = { clouds: true, skyline: true, far: true, near: true, road: true, foreground: true };
  private L = {
    skyFx: new Container(), back: new Container(), fxBack: new Container(), roadDecor: new Container(),
    mid: new Container(), shadow: new Container(), car: new Container(), carRig: new Container(), front: new Container(), fx: new Container(),
  };

  // camera
  cx = 0;
  cy = -60;
  private zoom_ = 1;
  follow = true;

  // view options
  context: Context = 'none';
  backdrop: Backdrop = 'plain';
  showGround = true;
  showBounds = false;
  showGrid = false;
  timeScale = 1;
  paused = false;

  // item
  private props: Prop[] = [];
  private built: Built | null = null;
  private cfg: Cfg = {};
  onZoomRebuild: (() => void) | null = null;
  private zoomAtBuild = 1;
  private zoomTimer = 0;

  /** When on, a canvas tap picks a named part instead of tapping things. */
  pickPart = false;
  onPartPicked: ((path: string) => void) | null = null;

  // test car
  car!: CarController;
  rig!: CarRig;
  private carBuild: VehicleBuild | null = null;
  private driving: { toX: number } | null = null;
  keyDrive = false;
  private keys = new Set<string>();
  readonly testCar: TestCar;

  // pointer
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>();
  private moved = false;
  private pinchDist = 0;

  constructor(readonly app: Application) {
    this.fx = new Particles(app.renderer);
    const L = this.L;
    L.back.sortableChildren = true;
    this.world.addChild(L.skyFx, L.back, L.fxBack, this.road, L.roadDecor, L.mid, L.shadow, L.car, L.carRig, L.front, L.fx, this.overlayG);
    const p = this.parallax;
    this.view.addChild(p.clouds, p.skyline, p.far, p.near, this.world, p.foreground);
    app.stage.addChild(this.bg, this.sky, this.view, this.screen);

    this.testCar = {
      driveThrough: (fromX, toX) => {
        this.car.teleport(fromX);
        this.rig.view.visible = true;
        this.driving = { toX };
      },
      park: (x) => {
        this.driving = null;
        this.car.teleport(x);
        this.rig.view.visible = true;
      },
      hide: () => {
        this.driving = null;
        this.car.teleport(-1e6);
        this.rig.view.visible = false;
      },
    };

    const canvas = app.canvas;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.closest?.('input,select,textarea')) return;
      if (this.keyDrive && ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.key);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
    app.ticker.add((t) => this.frame(Math.min(t.deltaMS / 1000, 1 / 20)));
  }

  /** Must run before items are built: the test car is part of every Ctx. */
  async init(testVehicleId: string): Promise<void> {
    this.car = new CarController(surfaceAt, -2e6, 2e6, -1e6);
    await this.setTestVehicle(testVehicleId);
  }

  async setTestVehicle(id: string): Promise<void> {
    const build = await buildVehicle(art, defaultChoice(art.vehicle(id)), pixelsPerUnit(1, this.app.renderer.resolution));
    const vis = this.rig?.view.visible ?? false;
    this.rig?.destroy();
    this.carBuild?.destroy();
    this.carBuild = build;
    this.rig = new CarRig(this.car, build, this.sfx, this.fx, { car: this.L.carRig, shadow: this.L.shadow, fx: this.L.fx, behind: this.L.mid });
    this.rig.view.visible = vis;
    const L = this.L;
    (this as { ctx: Ctx }).ctx = {
      sfx: this.sfx,
      fx: this.fx,
      tweens: this.tweens,
      car: this.car,
      carView: this.rig.view,
      layers: { back: L.back, roadDecor: L.roadDecor, mid: L.mid, front: L.front, fx: L.fx, fxBack: L.fxBack, skyFx: L.skyFx },
      camX: () => this.cx,
      viewWidth: () => this.viewSize().w / this.zoom_,
      bumpCar: (s) => this.rig.bump(s),
    };
  }

  // ---------- DevEnv ----------

  addProp<T extends Prop>(p: T): T {
    this.props.push(p);
    this.L[p.layer].addChild(p.view);
    return p;
  }

  addDisplay(c: Container, layer: 'back' | 'mid' | 'car' | 'front' | 'fx' = 'car'): void {
    this.L[layer].addChild(c);
  }

  setLayerVisible(name: LayerName, on: boolean): void {
    this.layerOn[name] = on;
  }

  setSky(gold: number, dusk: number, morning = 0): void {
    this.view.tint = this.sky.update(morning, gold, dusk);
  }

  ppu(extra = 1): number {
    return pixelsPerUnit(this.zoom_, this.app.renderer.resolution, extra);
  }

  zoom(): number {
    return this.zoom_;
  }

  viewSize(): { w: number; h: number } {
    return { w: this.app.screen.width, h: this.app.screen.height };
  }

  // ---------- item lifecycle ----------

  clear(): void {
    this.built?.destroy?.();
    this.built = null;
    this.tweens.clear();
    this.fx.clear();
    for (const p of this.props) p.destroy();
    this.props = [];
    for (const name of ITEM_LAYERS) this.L[name].removeChildren().forEach((c) => c.destroy({ children: true }));
    this.L.car.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.screen.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.view.tint = 0xffffff;
    this.testCar.hide();
    this.keyDrive = false;
    for (const k of Object.keys(this.layerOn) as LayerName[]) this.layerOn[k] = true;
  }

  show(built: Built, cfg: Cfg, refit: boolean): void {
    this.built = built;
    this.cfg = cfg;
    this.zoomAtBuild = this.zoom_;
    if (refit) this.fit();
  }

  setCfg(cfg: Cfg): void {
    this.cfg = cfg;
  }

  get current(): Built | null {
    return this.built;
  }

  fit(): void {
    const f = this.built?.focus;
    if (!f) return;
    const { w, h } = this.viewSize();
    this.zoom_ = Math.max(0.05, Math.min(8, Math.min(w / (f.w * 1.25), h / (f.h * 1.35))));
    this.cx = f.x + f.w / 2;
    this.cy = f.y + f.h / 2;
    this.zoomAtBuild = this.zoom_;
  }

  setZoom(z: number, aboutX?: number, aboutY?: number): void {
    const { w, h } = this.viewSize();
    const ax = aboutX ?? w / 2, ay = aboutY ?? h / 2;
    const before = this.toWorld(ax, ay);
    this.zoom_ = Math.max(0.05, Math.min(8, z));
    const after = this.toWorld(ax, ay);
    this.cx += before.x - after.x;
    this.cy += before.y - after.y;
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    const { w, h } = this.viewSize();
    return { x: this.cx + (sx - w / 2) / this.zoom_, y: this.cy + (sy - h / 2) / this.zoom_ };
  }

  // ---------- input ----------

  private local(e: PointerEvent | WheelEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Same event, with client coordinates relative to the canvas (for whole-scene items). */
  private localEvent(e: PointerEvent): PointerEvent {
    const p = this.local(e);
    return { pointerId: e.pointerId, clientX: p.x, clientY: p.y, preventDefault: () => e.preventDefault() } as PointerEvent;
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.synth.unlock();
    if (this.built?.pointer) {
      this.built.pointer.down(this.localEvent(e));
      return;
    }
    const p = this.local(e);
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y });
    this.moved = false;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    try {
      this.app.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  private onMove = (e: PointerEvent): void => {
    if (this.built?.pointer) {
      this.built.pointer.move(this.localEvent(e));
      return;
    }
    const st = this.pointers.get(e.pointerId);
    if (!st) return;
    const p = this.local(e);
    if (this.pointers.size === 2) {
      st.x = p.x;
      st.y = p.y;
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) this.setZoom(this.zoom_ * (d / this.pinchDist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      this.pinchDist = d;
      this.moved = true;
      return;
    }
    if (Math.hypot(p.x - st.sx, p.y - st.sy) > 6) this.moved = true;
    if (this.moved) {
      this.cx -= (p.x - st.x) / this.zoom_;
      this.cy -= (p.y - st.y) / this.zoom_;
      this.follow = false;
    }
    st.x = p.x;
    st.y = p.y;
  };

  private onUp = (e: PointerEvent): void => {
    if (this.built?.pointer) {
      this.built.pointer.up(this.localEvent(e));
      return;
    }
    const st = this.pointers.get(e.pointerId);
    if (!st) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0 && !this.moved) this.tapAt(st.x, st.y);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.built?.pointer) return;
    const p = this.local(e);
    this.setZoom(this.zoom_ * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
  };

  /** Taps behave like the game: the car honks, props answer, empty space ripples. */
  tapAt(sx: number, sy: number): void {
    const w = this.toWorld(sx, sy);
    if (this.pickPart && this.built?.partAt) {
      const path = this.built.partAt(w.x, w.y);
      if (path) this.onPartPicked?.(path);
      return;
    }
    if (this.rig.view.visible && this.rig.hitTest(w.x, w.y)) {
      this.rig.honk();
      return;
    }
    if (this.built?.tap?.(w.x, w.y)) return;
    const L = this.L;
    const byView = new Map(this.props.map((p) => [p.view, p] as const));
    for (const layer of [L.front, L.mid, L.roadDecor, L.back]) {
      for (let i = layer.children.length - 1; i >= 0; i--) {
        const p = byView.get(layer.children[i] as Container);
        if (p && p.view.visible && p.hitTest(w.x, w.y)) {
          p.onTap(w.x, w.y);
          return;
        }
      }
    }
    this.fx.emit(this.L.fx, { x: w.x, y: w.y, count: 1, shape: 'circle', tint: 0xffffff, speed: [0, 0], gravity: 0, life: [0.45, 0.45], size: [24 / this.zoom_, 24 / this.zoom_], grow: 5, alpha: 0.5, spin: 0 });
    this.sfx.pluck(Math.floor((1 - sy / this.viewSize().h) * 11), 0.1);
  }

  // ---------- frame ----------

  private frame(rawDt: number): void {
    const dt = this.paused ? 0 : rawDt * this.timeScale;
    const { w, h } = this.viewSize();

    // Test car: drive-through or keyboard driving with the real physics.
    if (this.car && this.rig) {
      let input: CarInput = NO_INPUT;
      if (this.driving) {
        input = { ...NO_INPUT, throttle: true };
        if (this.car.x > this.driving.toX) {
          this.driving = null;
        }
      } else if (this.keyDrive) {
        input = {
          throttle: this.keys.has('ArrowRight') || this.keys.has('d'),
          brake: this.keys.has('ArrowLeft') || this.keys.has('a'),
          lift: this.keys.has('ArrowUp') || this.keys.has(' ') || this.keys.has('w'),
          hold: null,
        };
      }
      if (dt > 0) {
        this.rig.handleEvents(this.car.step(dt, input));
        this.rig.update(dt, input.throttle, input.brake, this.rig.view.visible);
      }
      if (this.follow && this.rig.view.visible && (this.driving || this.keyDrive)) {
        this.cx += (this.car.x - this.cx) * Math.min(1, rawDt * 4);
      }
      this.engine.update(this.rig.view.visible ? Math.min(1, this.car.speed / 900) : 0, input.throttle, !this.car.onGround, 0);
      this.engine.setRunning(this.rig.view.visible && (!!this.driving || this.keyDrive));
    }

    if (dt > 0) {
      for (const p of this.props) {
        p.update(dt);
        if (p.bumpHalf > 0 && this.rig?.view.visible) {
          const inside = Math.abs(this.car.x - p.x) < p.bumpHalf + this.rig.view.dims.half * 0.85 && this.car.height < p.bumpHeight;
          if (inside && !p.carInside) p.onBump();
          if (!inside && p.carInside) p.onLeave();
          p.carInside = inside;
        }
      }
      this.built?.update?.(dt, this.cfg);
      this.tweens.update(dt);
      this.fx.update(dt);
    }

    // Debounced re-raster for crisp art after zooming.
    if (this.built?.zoomSensitive && this.onZoomRebuild) {
      const ratio = this.zoom_ / this.zoomAtBuild;
      if (ratio > 1.4 || ratio < 0.6) {
        this.zoomTimer += rawDt;
        if (this.zoomTimer > 0.4) {
          this.zoomTimer = 0;
          this.zoomAtBuild = this.zoom_;
          this.onZoomRebuild();
        }
      } else this.zoomTimer = 0;
    }

    // Camera and layers.
    this.view.position.set(w / 2, h / 2);
    this.view.scale.set(this.zoom_);
    this.world.position.set(-this.cx, -this.cy);
    const left = w / 2 / this.zoom_ + 50, right = left;
    const scene = this.context === 'scene';
    for (const [name, l] of Object.entries(this.parallax) as [LayerName, ChunkLayer][]) {
      l.visible = scene && this.layerOn[name];
      if (!l.visible) continue;
      l.position.set(-this.cx * l.factor, -this.cy * l.factor);
      l.updateChunks(this.cx, left, right);
    }
    this.road.visible = this.context !== 'none' && this.layerOn.road;
    if (this.road.visible) this.road.updateChunks(this.cx, left, right);
    this.world.visible = !this.built?.pointer;

    this.drawBackdrop(w, h);
    this.drawOverlay(w, h);
  }

  private drawBackdrop(w: number, h: number): void {
    const g = this.bg;
    g.clear();
    const sky = this.backdrop === 'sky' || this.context === 'scene';
    this.sky.visible = sky && !this.built?.pointer;
    if (sky) {
      this.sky.resize(w, h, h * 0.75);
      return;
    }
    if (this.backdrop === 'checker') {
      g.rect(0, 0, w, h).fill(0xf4f6f9);
      const s = 16;
      for (let y = 0; y < h; y += s) for (let x = (y / s) % 2 ? s : 0; x < w; x += s * 2) g.rect(x, y, s, s).fill(0xe6eaf0);
    } else {
      g.rect(0, 0, w, h).fill(0xeef2f6);
    }
  }

  private drawOverlay(w: number, h: number): void {
    const g = this.overlayG;
    g.clear();
    const z = this.zoom_;
    const tl = this.toWorld(0, 0), br = this.toWorld(w, h);
    if (this.showGrid) {
      const step = z > 1.5 ? 10 : z > 0.4 ? 50 : 500;
      for (let x = Math.floor(tl.x / step) * step; x < br.x; x += step) g.rect(x, tl.y, 1 / z, br.y - tl.y).fill({ color: 0x5b8def, alpha: x % (step * 10) === 0 ? 0.35 : 0.12 });
      for (let y = Math.floor(tl.y / step) * step; y < br.y; y += step) g.rect(tl.x, y, br.x - tl.x, 1 / z).fill({ color: 0x5b8def, alpha: y % (step * 10) === 0 ? 0.35 : 0.12 });
    }
    if (this.showGround) g.rect(tl.x, -0.5 / z, br.x - tl.x, 1.5 / z).fill({ color: 0x00b7ff, alpha: 0.8 });
    if (this.showBounds) {
      const lw = 1.5 / z;
      for (const p of this.props) {
        for (const r of p.hits) g.rect(p.view.x + r.x, p.view.y + r.y, r.w, r.h).stroke({ width: lw, color: 0xff00ff, alpha: 0.8 });
        if (p.bumpHalf > 0) g.rect(p.x - p.bumpHalf, -p.bumpHeight, p.bumpHalf * 2, p.bumpHeight).stroke({ width: lw, color: 0xffa000, alpha: 0.8 });
      }
      const f = this.built?.focus;
      if (f) g.rect(f.x, f.y, f.w, f.h).stroke({ width: lw, color: 0x00c853, alpha: 0.6 });
    }
    this.built?.overlay?.(g, this.cfg);
  }

  // ---------- debug hooks ----------

  get propCount(): number {
    return this.props.length;
  }
}

export type { Prop };
