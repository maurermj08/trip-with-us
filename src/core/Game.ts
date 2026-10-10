// Top-level orchestrator: owns the scene graph and services, builds/tears down a trip,
// routes input, and runs the frame loop. Feature logic lives in the modules it wires up.
import { Application, Container } from 'pixi.js';
import { Synth } from '../audio/Synth';
import { Sfx } from '../audio/Sfx';
import { EngineSound } from '../audio/Engine';
import { Particles } from '../fx/Particles';
import { Iris } from '../fx/Iris';
import { Tweens } from './Tween';
import { Camera } from './Camera';
import { IdleHinter } from './IdleHinter';
import { Input, type InputHost, type Zone } from './Input';
import type { Ctx } from './Ctx';
import { CAR, CarController } from '../vehicle/CarController';
import { CarRig } from '../vehicle/CarRig';
import { CAR_HALF } from '../vehicle/MiniView';
import { surfaceAt } from '../world/Terrain';
import { CAR_START_X, GOLDEN_HOUR, ROUTE, WORLD_END, WORLD_START } from '../world/Route';
import type { ChunkLayer } from '../world/ChunkLayer';
import { cloudLayer, farLayer, foregroundLayer, nearLayer, skylineLayer } from '../world/Scenery';
import { roadLayer } from '../world/Road';
import { Sky } from '../world/Sky';
import { createProp } from '../world/PropFactory';
import type { Prop } from '../props/Prop';
import { buildHome } from '../landmarks/Home';
import { buildDuckies } from '../landmarks/Duckies';
import { buildBridge, buildCharleston } from '../landmarks/Charleston';
import { TripDirector } from '../trip/TripDirector';
import { P } from '../style/palette';

export class Game implements InputHost {
  readonly root = new Container();
  private sky = new Sky();
  /** Positioned at the camera anchor and scaled by zoom; parallax layers live inside. */
  private scene = new Container();
  private clouds = cloudLayer();
  private skyline = skylineLayer();
  private far = farLayer();
  private near = nearLayer();
  private foreground = foregroundLayer();
  /** Parallax factor 1: the road and everything that interacts with the car. */
  private world = new Container();
  private road = roadLayer();
  private layers = {
    skyFx: new Container(),
    back: new Container(),
    fxBack: new Container(),
    roadDecor: new Container(),
    mid: new Container(),
    shadow: new Container(),
    car: new Container(),
    front: new Container(),
    fx: new Container(),
  };
  private screenFx = new Container();

  readonly synth = new Synth();
  readonly sfx = new Sfx(this.synth);
  private engine = new EngineSound(this.synth);
  readonly tweens = new Tweens();
  readonly fx: Particles;
  readonly cam = new Camera();
  private hinter = new IdleHinter(this.tweens, this.sfx);
  private iris = new Iris(this.tweens, this.sfx);
  private input: Input;

  car!: CarController;
  private rig!: CarRig;
  private props: Prop[] = [];
  private director!: TripDirector;
  private dusk = 0;

  constructor(app: Application) {
    this.fx = new Particles(app.renderer);
    app.stage.addChild(this.root);

    const L = this.layers;
    // The road chunks contain the median barrier, so things that stand "behind" it
    // (cows, Duckies, Rainbow Row) are under the road but over the near scenery.
    this.world.addChild(L.skyFx, L.back, L.fxBack, this.road, L.roadDecor, L.mid, L.shadow, L.car, L.front, L.fx);
    this.scene.addChild(this.clouds, this.skyline, this.far, this.near, this.world, this.foreground);
    this.root.addChild(this.sky, this.scene, this.screenFx, this.hinter.goHint, this.iris);

    this.input = new Input(app.canvas, this);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));

    this.buildTrip();
    app.ticker.add((t) => this.update(Math.min(t.deltaMS / 1000, 1 / 20)));
  }

  // ---------- trip lifecycle ----------

  private buildTrip(): void {
    const L = this.layers;
    this.car = new CarController(surfaceAt, WORLD_START + 120, WORLD_END, CAR_START_X);
    this.rig = new CarRig(this.car, this.sfx, this.fx, { car: L.car, shadow: L.shadow, fx: L.fx, behind: L.mid });

    const ctx: Ctx = {
      sfx: this.sfx,
      fx: this.fx,
      tweens: this.tweens,
      car: this.car,
      carView: this.rig.view,
      layers: { back: L.back, roadDecor: L.roadDecor, mid: L.mid, front: L.front, fx: L.fx, fxBack: L.fxBack, skyFx: L.skyFx },
      camX: () => this.cam.x,
      viewWidth: () => this.cam.viewW / this.cam.zoom,
      bumpCar: (s) => this.rig.bump(s),
    };

    const home = buildHome(ctx);
    const charleston = buildCharleston(ctx);
    this.props = [
      ...ROUTE.map((p) => createProp(ctx, p)),
      ...home.props,
      ...buildDuckies(ctx),
      ...buildBridge(ctx),
      ...charleston.props,
    ];
    for (const p of this.props) L[p.layer].addChild(p.view);

    this.director = new TripDirector(ctx, {
      startEngine: () => this.engine.setRunning(true),
      resetTrip: () => this.resetTrip(),
      setDusk: (t) => (this.dusk = t),
      showGoHint: () => this.hinter.showGoHint(),
    }, home.suitcase, charleston.greeters);

    this.engine.setRunning(false);
    this.dusk = 0;
    this.hinter.reset();
    this.cam.reset();
  }

  private destroyTrip(): void {
    this.tweens.clear();
    this.fx.clear();
    for (const p of this.props) p.destroy();
    this.props = [];
    this.rig.destroy();
    for (const c of Object.values(this.layers)) c.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    for (const l of this.chunkLayers()) l.reset();
  }

  /** Iris out on the car, build a fresh trip at home, iris back in. */
  resetTrip(): void {
    this.iris.play(Math.hypot(this.cam.viewW, this.cam.viewH), () => {
      this.destroyTrip();
      this.buildTrip();
    });
  }

  private get busy(): boolean {
    return this.iris.busy;
  }

  private chunkLayers(): ChunkLayer[] {
    return [this.clouds, this.skyline, this.far, this.near, this.foreground, this.road];
  }

  private resize(): void {
    this.cam.resize(window.innerWidth, window.innerHeight);
    this.root.scale.set(this.cam.scale);
    this.sky.resize(this.cam.viewW, this.cam.viewH, this.cam.anchorY);
  }

  // ---------- input host ----------

  viewW(): number {
    return this.cam.viewW;
  }
  viewH(): number {
    return this.cam.viewH;
  }
  toDesign(px: number, py: number) {
    return this.cam.toDesign(px, py);
  }
  toWorld(sx: number, sy: number) {
    return this.cam.toWorld(sx, sy);
  }
  carPos() {
    return { x: this.car.x, alt: this.car.alt };
  }

  hitCar(wx: number, wy: number): boolean {
    return !this.busy && this.rig.hitTest(wx, wy);
  }

  /** Front-most tappable prop under the point answers the tap. */
  tapThing(wx: number, wy: number): boolean {
    if (this.busy) return false;
    const byView = new Map(this.props.map((p) => [p.view, p] as const));
    const L = this.layers;
    for (const layer of [L.front, L.mid, L.roadDecor, L.back]) {
      for (let i = layer.children.length - 1; i >= 0; i--) {
        const p = byView.get(layer.children[i] as Container);
        if (p && p.view.visible && p.hitTest(wx, wy)) {
          p.onTap(wx, wy);
          return true;
        }
      }
    }
    return false;
  }

  onCarTap(): void {
    if (this.busy) return;
    this.synth.unlock();
    if (!this.director.onCarTap()) this.rig.honk();
  }

  onCarGrab(): void {
    this.synth.unlock();
    this.director.onThrottle();
    this.sfx.boing(1.5);
  }

  /** Every touch answers: a ripple and (if nothing else answered) a note pitched by height. */
  onZoneTouch(sx: number, sy: number, zone: Zone, wx: number, wy: number, thing: boolean): void {
    this.synth.unlock();
    this.fx.emit(this.screenFx, { x: sx, y: sy, count: 1, shape: 'circle', tint: P.white, speed: [0, 0], gravity: 0, life: [0.45, 0.45], size: [24, 24], grow: 5, alpha: 0.35, spin: 0 });
    const high = zone === 'lift' || zone === 'liftGo';
    if (!thing) this.sfx.pluck(Math.floor((1 - sy / this.cam.viewH) * 11), high ? 0.15 : 0.07);
    if (zone === 'go' || zone === 'liftGo') this.director.onThrottle();
    if (high && !thing) this.director.onSkyTap(wx, wy);
  }

  onAnyInput(): void {
    this.synth.unlock();
    this.hinter.poke();
  }

  // ---------- frame ----------

  private update(dt: number): void {
    const car = this.car;
    const inp = this.input.state();
    if (inp.throttle) this.director.onThrottle();
    const drive = this.busy ? { throttle: false, brake: true, lift: false } : inp;
    const hold = this.busy ? null : this.input.hold();
    this.rig.handleEvents(car.step(dt, { ...drive, hold }));

    this.director.update(dt);
    this.rig.update(dt, drive.throttle, drive.brake, this.director.engineOn);
    this.updateProps(dt);
    this.updateCamera(dt);
    this.tweens.update(dt);
    this.fx.update(dt);

    const gold = Math.max(0, Math.min(1, (car.x - GOLDEN_HOUR.start) / GOLDEN_HOUR.len));
    this.scene.tint = this.sky.update(gold, this.dusk);
    this.hinter.update(dt, !this.input.touching && !this.busy, () => this.director.hintTargets(), this.cam.viewW, this.cam.anchorY);
    const c = this.cam.toScreen(car.x, -car.alt - 45);
    this.iris.draw(this.cam.viewW, this.cam.viewH, c.x, c.y);

    this.engine.update(Math.min(1, car.speed / CAR.maxSpeed), drive.throttle && this.director.engineOn, !car.onGround, Math.min(1, car.height / CAR.maxAlt));
  }

  /** Cull, update and run drive-through (bump) checks for props near the camera. */
  private updateProps(dt: number): void {
    const car = this.car;
    const halfView = this.cam.viewW / this.cam.zoom;
    const left = this.cam.x - halfView - 400, right = this.cam.x + halfView + 400;
    for (const p of this.props) {
      const vis = p.x + p.extent[1] > left && p.x + p.extent[0] < right;
      p.view.visible = vis;
      if (vis || Math.abs(p.x - car.x) < 3000) p.update(dt);
      if (p.bumpHalf > 0) {
        const inside = Math.abs(car.x - p.x) < p.bumpHalf + CAR_HALF * 0.85 && car.height < p.bumpHeight;
        if (inside && !p.carInside) p.onBump();
        if (!inside && p.carInside) p.onLeave();
        p.carInside = inside;
      }
    }
  }

  private updateCamera(dt: number): void {
    const cam = this.cam;
    const frameHome = this.director.phase === 'leave' && this.car.x < CAR_START_X + 200;
    cam.update(dt, this.car, frameHome);
    this.scene.position.set(cam.anchorX, cam.anchorY);
    this.scene.scale.set(cam.zoom);
    const drift = performance.now() / 1000 * 6;
    for (const l of [this.clouds, this.skyline, this.far, this.near, this.foreground]) {
      const f = l.factor;
      const d = l === this.clouds ? drift : 0;
      l.position.set(-cam.x * f - d, -cam.y * f);
      l.updateChunks(cam.x + d / f, cam.left, cam.right);
    }
    // The road lives inside the world container (factor 1), which carries the offset.
    this.road.updateChunks(cam.x, cam.left, cam.right);
    this.world.position.set(-cam.x, -cam.y);
  }

  // ---------- debug (used by ?debug=1 and tools/playtest.mjs) ----------

  debugInfo(): string {
    return `x ${this.car.x.toFixed(0)}  v ${this.car.vx.toFixed(0)}  h ${this.car.height.toFixed(0)}  ${this.director.phase}  zoom ${this.cam.zoom.toFixed(2)}`;
  }

  /** World point → CSS pixels. */
  debugToScreen(wx: number, wy: number): { x: number; y: number } {
    const s = this.cam.toScreen(wx, wy);
    return { x: s.x * this.cam.scale, y: s.y * this.cam.scale };
  }

  debugJump(x: number): void {
    this.director.skipLeave();
    this.car.teleport(x);
    this.cam.x = x;
  }
}
