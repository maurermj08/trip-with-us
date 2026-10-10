// The Garage: pick a vehicle before the trip. Brand → model → paint / wheels / accessories
// on a scrolling shelf; the chosen car sits on a turntable; drive out the open door to go.
import { Container, Graphics, type Renderer } from 'pixi.js';
import type { Sfx } from '../audio/Sfx';
import type { Particles } from '../fx/Particles';
import type { Tweens } from '../core/Tween';
import { ease } from '../core/Tween';
import type { Camera } from '../core/Camera';
import type { ArtRegistry } from '../vehicle/art/registry';
import { buildVehicle, pixelsPerUnit, type VehicleBuild } from '../vehicle/art/VehicleBuild';
import { VehicleView } from '../vehicle/VehicleView';
import type { VehicleChoice } from '../vehicle/art/schema';
import { GarageModel, type Catalog, type ChipSpec } from './GarageModel';
import { Shelf } from './Shelf';
import { ThumbFactory } from './thumbs';
import { drawRoom, drawStripes, lamp, paintCans, roomLayout, tireStack, tool, turntable, type RoomLayout } from './garageRoom';
import { contactShadow } from '../style/shapes';
import { P } from '../style/palette';

export interface GarageServices {
  sfx: Sfx;
  fx: Particles;
  tweens: Tweens;
  art: ArtRegistry;
  cam: Camera;
  renderer: Renderer;
  /** Ripple + note for touches that hit nothing else (every touch answers). */
  touch(sx: number, sy: number): void;
  /** The child chose to leave: start the trip with this vehicle. */
  onGo(choice: VehicleChoice): void;
}

const HERO_SCALE = 1.55;

export function catalogOf(reg: ArtRegistry): Catalog {
  return {
    brands: [...reg.brands.values()],
    vehiclesOf: (b) => reg.vehiclesOf(b),
    vehicle: (id) => reg.vehicle(id),
    accessory: (id) => reg.accessories.get(id),
    wheelName: (id) => reg.wheels.get(id)?.name ?? id,
  };
}

interface Tappable {
  c: Container;
  tap(): void;
}

export class Garage extends Container {
  readonly model: GarageModel;
  private room = new Graphics();
  private decor = new Container();
  private table = turntable();
  private lampParts = lamp(60);
  private heroLayer = new Container();
  private heroShadow = new Graphics();
  private doorArrow = new Graphics();
  private shelf: Shelf;
  private thumbs: ThumbFactory;
  private tappables: Tappable[] = [];
  private L!: RoomLayout;

  private hero: VehicleView | null = null;
  private heroBuild: VehicleBuild | null = null;
  private heroReq = 0;
  private distance = 0;
  private spin = 0;
  private spinSpeed = 0.3;
  private lampSwing = 0;
  private lampV = 0;
  private time = 0;
  private leaving = false;
  private pointer: { id: number; x: number; y: number; onShelf: boolean; onHero: boolean; startX: number } | null = null;

  constructor(private svc: GarageServices, choice: VehicleChoice) {
    super();
    this.model = new GarageModel(catalogOf(svc.art), choice);
    this.model.level = 'custom';
    this.thumbs = new ThumbFactory(svc.art, () => svc.cam.scale * svc.renderer.resolution);
    this.shelf = new Shelf(this.thumbs, svc.tweens, (s) => this.pick(s));
    this.addChild(this.room, this.decor, this.table.root, this.heroShadow, this.heroLayer, this.lampParts.root, this.doorArrow, this.shelf);
    this.buildDecor();
    this.layout();
    this.shelf.accent = this.accent();
    this.shelf.setChips(this.model.chips(), this.model.choice, true);
    void this.showHero(this.model.choice, false);
  }

  private accent(): number {
    const b = this.svc.art.brands.get(this.model.brandId);
    return b ? parseInt(b.color.replace('#', ''), 16) : 0x2f80d1;
  }

  // ---------- layout & decor ----------

  layout(): void {
    const { viewW, viewH } = this.svc.cam;
    this.shelf.layout(viewW, viewH);
    this.L = roomLayout(viewW, viewH, this.shelf.top);
    drawRoom(this.room, this.L);
    this.table.root.position.set(this.L.heroX, this.L.floorY + 6);
    this.lampParts.root.position.set(this.L.heroX, 0);
    if (this.hero && !this.leaving) this.hero.x = this.L.heroX;
    this.heroLayer.y = this.L.floorY;
    this.placeDecor();
  }

  private buildDecor(): void {
    const tools = [tool('wrench', 0), tool('hammer', 0xe94b3c), tool('screwdriver', 0x2f80d1), tool('saw', 0xf7c934)];
    tools.forEach((t, i) => {
      t.label = `tool${i}`;
      this.decor.addChild(t);
      this.tappables.push({ c: t, tap: () => {
        this.svc.tweens.wobble(t, 0.35, 1.0, 0);
        this.svc.sfx.bonk();
      } });
    });
    const tires = tireStack();
    tires.label = 'tires';
    this.decor.addChild(tires);
    this.tappables.push({ c: tires, tap: () => {
      this.svc.tweens.wobble(tires, 0.06, 0.8, 0.15);
      this.svc.sfx.boing(0.8);
    } });
    paintCans(5).forEach((can, i) => {
      can.label = `can${i}`;
      this.decor.addChild(can);
      this.tappables.push({ c: can, tap: () => {
        this.svc.sfx.pluck(5 + i * 2, 0.16);
        const y0 = can.y;
        this.svc.tweens.add(0.4, (p) => (can.y = y0 - Math.sin(p * Math.PI) * 24), { owner: can, done: () => (can.y = y0) });
      } });
    });
    this.tappables.push({ c: this.lampParts.root, tap: () => {
      this.lampV += 2.2;
      this.svc.sfx.tick();
      this.svc.sfx.s.tone({ freq: 1200, to: 900, dur: 0.15, type: 'sine', gain: 0.08 });
    } });
  }

  private placeDecor(): void {
    const L = this.L;
    const pbW = Math.min(260, L.heroX - 220);
    const showBoard = pbW > 120;
    this.decor.children.forEach((c) => {
      const name = c.label ?? '';
      if (name.startsWith('tool')) {
        const i = Number(name.slice(4));
        c.visible = showBoard;
        c.position.set(40 + 30 + i * ((pbW - 60) / 3), 92 + 40);
      } else if (name === 'tires') {
        c.position.set(Math.max(80, L.heroX - 330), L.floorY + 2);
      } else if (name.startsWith('can')) {
        const i = Number(name.slice(3));
        c.position.set(L.door.x - 70 - i * 40, 92 + 30 + 52);
      }
    });
    // shelf board for the cans
    const g = this.room;
    const right = L.door.x - 40, left = right - 5 * 40 - 20;
    g.roundRect(left, 92 + 30 + 52, right - left, 10, 3).fill(0x9c7a55);
    g.roundRect(left, 92 + 30 + 52, right - left, 3, 1.5).fill({ color: P.white, alpha: 0.35 });
  }

  // ---------- hero car ----------

  private async showHero(choice: VehicleChoice, drop = true): Promise<void> {
    const req = ++this.heroReq;
    const ppu = pixelsPerUnit(this.svc.cam.scale, this.svc.renderer.resolution, HERO_SCALE);
    const build = await buildVehicle(this.svc.art, { ...choice, accessoryIds: [...choice.accessoryIds] }, ppu);
    if (req !== this.heroReq || this.destroyed) {
      build.destroy();
      return;
    }
    const sameModel = this.heroBuild?.def.id === build.def.id;
    this.hero?.destroy({ children: true });
    this.heroBuild?.destroy();
    this.heroBuild = build;
    const v = new VehicleView(build);
    v.scale.set(HERO_SCALE);
    v.x = this.L.heroX;
    this.hero = v;
    this.heroLayer.addChild(v);
    this.heroShadow.clear();
    contactShadow(this.heroShadow, this.L.heroX, this.L.floorY + 2, build.dims.length * HERO_SCALE * 1.02, 0.16);
    if (drop && !sameModel) {
      // New model drops onto the turntable with a bounce.
      this.spinSpeed = 4;
      this.svc.tweens.add(0.55, (p) => (v.y = -140 * (1 - p)), { ease: ease.outQuad, done: () => {
        v.bounce(70);
        this.svc.sfx.thump(0.5);
      } });
    } else if (drop) {
      v.bounce(40);
      v.flashLights();
    }
  }

  // ---------- choosing ----------

  private pick(spec: ChipSpec): void {
    if (this.leaving) return;
    const ch = this.model.select(spec);
    const sfx = this.svc.sfx;
    switch (spec.kind) {
      case 'brand': case 'model': sfx.boing(1.1); break;
      case 'crumb-brand': case 'crumb-model': sfx.whoosh(); break;
      case 'paint': sfx.splash(0.6); break;
      case 'wheel': sfx.bonk(); break;
      case 'accessory': this.model.choice.accessoryIds.includes(spec.id) ? sfx.ding() : sfx.pop(); break;
      default: sfx.tick();
    }
    if (ch.vehicle || ch.look) void this.showHero(this.model.choice);
    this.shelf.accent = this.accent();
    this.shelf.setChips(this.model.chips(), this.model.choice, ch.level);
    if (ch.level) {
      const sel = this.model.chips().find((c) => c.selected);
      if (sel) this.shelf.reveal(sel.key);
    }
  }

  go(): void {
    if (this.leaving || !this.hero) return;
    this.leaving = true;
    const v = this.hero;
    const sfx = this.svc.sfx;
    sfx.door();
    this.svc.tweens.after(0.2, () => sfx.engineStart());
    this.svc.tweens.after(0.6, () => sfx.honk(this.heroBuild?.def.sound?.hornPitch ?? 1));
    v.flashLights();
    const x0 = v.x, x1 = this.L.door.x + this.L.door.w + 400;
    this.svc.tweens.add(1.6, (p) => (v.x = x0 + (x1 - x0) * p), { ease: ease.inQuad, delay: 0.5 });
    this.svc.tweens.after(0.9, () => this.svc.onGo({ ...this.model.choice, accessoryIds: [...this.model.choice.accessoryIds] }));
  }

  // ---------- input (garage owns the pointer while open) ----------

  private toDesign(e: PointerEvent) {
    return this.svc.cam.toDesign(e.clientX, e.clientY);
  }

  private hitBounds(c: Container, e: PointerEvent, pad = 10): boolean {
    const b = c.getBounds();
    return e.clientX >= b.minX - pad && e.clientX <= b.maxX + pad && e.clientY >= b.minY - pad && e.clientY <= b.maxY + pad;
  }

  onDown(e: PointerEvent): void {
    if (this.leaving) return;
    const p = this.toDesign(e);
    const onShelf = this.shelf.contains(p.x, p.y);
    const onHero = !onShelf && !!this.hero && this.hitBounds(this.hero, e);
    this.pointer = { id: e.pointerId, x: p.x, y: p.y, onShelf, onHero, startX: p.x };
    if (onShelf) {
      this.shelf.down(p.x);
      return;
    }
    if (onHero) return;
    const d = this.L.door;
    if (p.x >= d.x && p.x <= d.x + d.w && p.y >= d.y && p.y <= d.y + d.h) {
      this.svc.touch(p.x, p.y);
      this.go();
      return;
    }
    for (const t of this.tappables) {
      if (t.c.visible && this.hitBounds(t.c, e)) {
        t.tap();
        return;
      }
    }
    this.svc.touch(p.x, p.y);
  }

  onMove(e: PointerEvent): void {
    if (!this.pointer || this.pointer.id !== e.pointerId) return;
    const p = this.toDesign(e);
    this.pointer.x = p.x;
    if (this.pointer.onShelf) this.shelf.move(p.x);
    if (this.pointer.onHero && this.hero && !this.leaving) {
      // Drag the car toward the door: past a point, it drives out.
      const dx = Math.max(0, p.x - this.pointer.startX);
      this.hero.x = this.L.heroX + dx * 0.6;
      if (dx > 160) this.go();
    }
  }

  onUp(e: PointerEvent): void {
    const ptr = this.pointer;
    if (!ptr || ptr.id !== e.pointerId) return;
    this.pointer = null;
    if (ptr.onShelf) this.shelf.up();
    if (ptr.onHero && this.hero && !this.leaving) {
      if (Math.abs(ptr.x - ptr.startX) < 12) {
        this.svc.sfx.honk(this.heroBuild?.def.sound?.hornPitch ?? 1);
        this.hero.flashLights();
        this.hero.bounce(-50);
      }
      const v = this.hero, from = v.x;
      this.svc.tweens.add(0.3, (q) => (v.x = from + (this.L.heroX - from) * q), { ease: ease.outBack });
    }
  }

  // ---------- frame ----------

  update(dt: number): void {
    this.time += dt;
    this.shelf.update(dt);
    this.spinSpeed += (0.3 - this.spinSpeed) * Math.min(1, dt * 1.5);
    this.spin += this.spinSpeed * dt;
    drawStripes(this.table.stripes, this.spin);
    if (this.hero) {
      if (this.leaving) this.distance += 600 * dt;
      this.hero.update(dt, this.distance, 0, false);
      this.heroShadow.x = this.hero.x - this.L.heroX;
    }
    this.lampV += (-this.lampSwing * 30 - this.lampV * 2.5) * dt;
    this.lampSwing += this.lampV * dt;
    this.lampParts.root.rotation = this.lampSwing * 0.25;
    this.lampParts.glow.alpha = 0.85 + Math.sin(this.time * 31) * 0.05 * Math.min(1, Math.abs(this.lampV));

    // Pulsing "go" chevrons in the door (a shape, never text).
    const g = this.doorArrow;
    g.clear();
    const d = this.L.door;
    const a = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(this.time * 4));
    for (let k = 0; k < 3; k++) {
      const x = d.x + d.w * 0.32 + k * 34 + Math.sin(this.time * 4) * 5, y = d.y + d.h * 0.5;
      g.moveTo(x - 12, y - 24).lineTo(x + 10, y).lineTo(x - 12, y + 24).stroke({ width: 10, color: P.white, alpha: a * (1 - k * 0.25), cap: 'round', join: 'round' });
    }
  }

  /** Idle hint: jiggle the car (tap me) and the first option chip. */
  hintTargets(): Container[] {
    const out: Container[] = [];
    if (this.hero) out.push(this.hero);
    const chip = this.shelf.hintChip();
    if (chip) out.push(chip);
    return out;
  }

  /** Playtest hook: pick a chip by key (e.g. "brand:subaru", "acc:roof-box"). */
  debugPick(key: string): boolean {
    const c = this.model.chips().find((s) => s.key === key);
    if (c) this.pick(c);
    return !!c;
  }

  /** Where the iris closes (the door). */
  irisPoint(): { x: number; y: number } {
    return { x: this.L.door.x + this.L.door.w / 2, y: this.L.floorY - 80 };
  }

  override destroy(): void {
    this.heroReq++;
    this.thumbs.destroyAll();
    this.heroBuild?.destroy();
    super.destroy({ children: true });
  }
}
