// The bottom tray: one row of big chips that scrolls with momentum. Tap picks, drag scrolls.
import { Container, Graphics, Text } from 'pixi.js';
import type { ChipSpec } from './GarageModel';
import type { Thumb, ThumbFactory } from './thumbs';
import type { Tweens } from '../core/Tween';
import { ease } from '../core/Tween';
import type { VehicleChoice } from '../vehicle/art/schema';
import { SIGN_FONT } from '../signs/Signs';

export const CHIP = { w: 124, h: 116, divider: 46, gap: 12, radius: 18 };
export const TRAY_H = 150;

class Chip extends Container {
  readonly card = new Graphics();
  readonly pic = new Container();
  thumb: Thumb | null = null;
  w: number;

  constructor(public spec: ChipSpec, accent: number) {
    super();
    const divider = spec.kind === 'divider';
    this.w = divider ? CHIP.divider : CHIP.w;
    this.addChild(this.card, this.pic);
    this.pic.position.set(this.w / 2, divider ? CHIP.h / 2 : 46);
    if (!divider) {
      const caption = new Text({
        text: spec.caption,
        style: { fontFamily: SIGN_FONT, fontWeight: '700', fontSize: 14, fill: 0x4a5568, align: 'center', wordWrap: true, wordWrapWidth: CHIP.w - 12, lineHeight: 15 },
        resolution: 3,
      });
      caption.anchor.set(0.5, 0);
      caption.alpha = 0.75;
      caption.position.set(this.w / 2, 84);
      this.addChild(caption);
    }
    this.draw(accent);
    this.pivot.set(this.w / 2, CHIP.h / 2);
  }

  draw(accent: number): void {
    const g = this.card;
    g.clear();
    const s = this.spec;
    if (s.kind === 'divider') return;
    const crumb = s.kind === 'crumb-brand' || s.kind === 'crumb-model';
    g.roundRect(2, 5, this.w - 4, CHIP.h - 2, CHIP.radius).fill({ color: 0x000000, alpha: 0.12 });
    g.roundRect(0, 0, this.w, CHIP.h, CHIP.radius).fill(crumb ? 0xe8edf3 : 0xffffff);
    g.roundRect(0, 0, this.w, 4, 2).fill({ color: 0xffffff, alpha: 0.6 });
    if (s.selected) g.roundRect(-3, -3, this.w + 6, CHIP.h + 6, CHIP.radius + 3).stroke({ width: 5, color: accent });
    if (crumb) {
      // A small "back" notch on the left edge (a shape, not text).
      g.moveTo(10, CHIP.h / 2 - 9).lineTo(3, CHIP.h / 2).lineTo(10, CHIP.h / 2 + 9).stroke({ width: 4, color: 0x9aa5b4, cap: 'round', join: 'round' });
    }
  }
}

export class Shelf extends Container {
  private tray = new Graphics();
  private strip = new Container();
  private maskG = new Graphics();
  private chips = new Map<string, Chip>();
  private order: Chip[] = [];
  private scroll = 0;
  private vel = 0;
  private dragging = false;
  private downX = 0;
  private lastX = 0;
  private lastT = 0;
  private pressed: Chip | null = null;
  private width_ = 1024;
  private contentW = 0;
  accent = 0x2f80d1;

  constructor(private thumbs: ThumbFactory, private tweens: Tweens, private onPick: (spec: ChipSpec) => void) {
    super();
    this.addChild(this.tray, this.strip, this.maskG);
    this.strip.mask = this.maskG;
  }

  layout(viewW: number, viewH: number): void {
    this.width_ = viewW;
    this.position.set(0, viewH - TRAY_H);
    const g = this.tray;
    g.clear();
    g.roundRect(10, 0, viewW - 20, TRAY_H - 10, 26).fill({ color: 0x3b4252, alpha: 0.18 });
    g.roundRect(10, 0, viewW - 20, 6, 3).fill({ color: 0xffffff, alpha: 0.25 });
    this.maskG.clear().roundRect(14, 0, viewW - 28, TRAY_H - 10, 24).fill(0xffffff);
    this.strip.y = 14 + CHIP.h / 2;
    this.clampScroll(true);
  }

  /** Show a new set of chips; chips that stay keep their picture. */
  setChips(specs: ChipSpec[], choice: VehicleChoice, animate: boolean): void {
    const keep = new Set(specs.map((s) => s.key));
    for (const [k, c] of this.chips) {
      if (!keep.has(k)) {
        c.pic.removeChildren(); // pictures are cached by ThumbFactory; don't destroy them
        c.destroy({ children: true });
        this.chips.delete(k);
      }
    }
    this.order = [];
    let x = 24;
    specs.forEach((spec, i) => {
      let c = this.chips.get(spec.key);
      if (!c) {
        c = new Chip(spec, this.accent);
        this.chips.set(spec.key, c);
        this.strip.addChild(c);
        this.load(c, choice);
        if (animate) {
          c.alpha = 0;
          const cc = c;
          this.tweens.add(0.35, (p) => {
            if (cc.destroyed) return;
            cc.alpha = p;
            cc.scale.set(0.7 + 0.3 * p);
          }, { ease: ease.outBack, delay: i * 0.03 });
        }
      } else {
        const changedPic = c.spec.kind === 'wheel';
        c.spec = spec;
        c.draw(this.accent);
        if (changedPic) this.load(c, choice);
      }
      c.x = x + c.w / 2;
      x += c.w + CHIP.gap;
      this.order.push(c);
    });
    this.contentW = x + 12;
    if (animate) this.scroll = 0;
    this.clampScroll(true);
  }

  private load(c: Chip, choice: VehicleChoice): void {
    void this.thumbs.get(c.spec, choice).then((t) => {
      if (c.destroyed) return;
      c.pic.removeChildren();
      if (c.thumb && c.thumb !== t) c.thumb = null;
      c.thumb = t;
      // Thumbs are shared; wrap so the same picture can live in one chip at a time.
      if (t.display.parent && t.display.parent !== c.pic) t.display.removeFromParent();
      c.pic.addChild(t.display);
      c.pic.alpha = 0;
      this.tweens.add(0.2, (p) => !c.destroyed && (c.pic.alpha = p));
    }, (e) => console.warn('thumbnail failed', c.spec.key, e));
  }

  /** Design-space y of the tray top. */
  get top(): number {
    return this.y;
  }

  contains(_x: number, y: number): boolean {
    return y >= this.y;
  }

  private chipAt(x: number): Chip | null {
    const lx = x - this.strip.x;
    for (const c of this.order) if (Math.abs(lx - c.x) <= c.w / 2 + CHIP.gap / 2) return c;
    return null;
  }

  down(x: number): void {
    this.dragging = false;
    this.downX = this.lastX = x;
    this.lastT = performance.now();
    this.vel = 0;
    this.pressed = this.chipAt(x);
    if (this.pressed && this.pressed.spec.kind !== 'divider') this.pressed.scale.set(0.93);
  }

  move(x: number): void {
    if (!this.dragging && Math.abs(x - this.downX) > 10) {
      this.dragging = true;
      this.pressed?.scale.set(1);
    }
    if (!this.dragging) return;
    const now = performance.now();
    const dx = x - this.lastX;
    this.scroll -= dx;
    this.vel = (-dx / Math.max(1, now - this.lastT)) * 1000;
    this.lastX = x;
    this.lastT = now;
  }

  up(): void {
    const c = this.pressed;
    this.pressed = null;
    if (c) this.tweens.add(0.25, (p) => !c.destroyed && c.scale.set(0.93 + 0.07 * ease.outBack(p)));
    if (!this.dragging && c) this.onPick(c.spec);
    this.dragging = false;
  }

  /** Scroll so a chip is visible (e.g. the selected one). */
  reveal(key: string): void {
    const c = this.chips.get(key);
    if (!c) return;
    const target = c.x - this.width_ / 2;
    this.scroll = target;
    this.clampScroll(true);
  }

  private clampScroll(hard: boolean): void {
    const max = Math.max(0, this.contentW - this.width_);
    if (hard) this.scroll = Math.max(0, Math.min(max, this.scroll));
    this.strip.x = -this.scroll;
  }

  update(dt: number): void {
    if (!this.dragging) {
      this.scroll += this.vel * dt;
      this.vel *= Math.exp(-4 * dt);
      const max = Math.max(0, this.contentW - this.width_);
      // Rubber-band back inside the ends.
      if (this.scroll < 0) this.scroll += (0 - this.scroll) * Math.min(1, dt * 10);
      if (this.scroll > max) this.scroll += (max - this.scroll) * Math.min(1, dt * 10);
    }
    this.strip.x = -this.scroll;
    this.thumbs.pump(2);
  }

  hintChip(): Container | null {
    return this.order.find((c) => c.spec.kind !== 'divider' && !c.spec.kind.startsWith('crumb')) ?? null;
  }
}
