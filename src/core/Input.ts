// Two control schemes at once, no mode switch:
//  - Zones: hold right half to go, left half to brake; touching high lifts (hop / fly).
//  - Direct: press on the car and drag it around.
// Every touch also gets an immediate sound + motion answer (handled by the game).

export type Zone = 'go' | 'brake' | 'lift' | 'liftGo';

export interface InputHost {
  /** Design-unit view size. */
  viewW(): number;
  viewH(): number;
  /** CSS px → design units. */
  toDesign(px: number, py: number): { x: number; y: number };
  /** Design (screen) → world. */
  toWorld(sx: number, sy: number): { x: number; y: number };
  hitCar(wx: number, wy: number): boolean;
  /** Returns true if a tappable thing answered the touch. */
  tapThing(wx: number, wy: number): boolean;
  onCarTap(): void;
  onCarGrab(): void;
  /** Every non-car touch; `thing` says whether something in the world already answered. */
  onZoneTouch(sx: number, sy: number, zone: Zone, wx: number, wy: number, thing: boolean): void;
  onAnyInput(): void;
  carPos(): { x: number; alt: number };
}

interface PointerState {
  role: 'car' | Zone;
  startX: number;
  startY: number;
  dragging: boolean;
  offX: number;
  offAlt: number;
  lastX: number;
  lastY: number;
}

const LIFT_BAND = 0.3;
const DRAG_START = 12;

export class Input {
  private pointers = new Map<number, PointerState>();
  private keys = new Set<string>();
  liftKey = false;

  constructor(private el: HTMLElement, private host: InputHost) {
    el.addEventListener('pointerdown', this.down, { passive: false });
    window.addEventListener('pointermove', this.move, { passive: false });
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', () => {
      this.pointers.clear();
      this.keys.clear();
    });
    // Stop iOS from zooming / scrolling / showing callouts.
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    document.addEventListener('gesturestart', stop);
    document.addEventListener('dblclick', stop);
    el.addEventListener('contextmenu', stop);
  }

  zoneFor(sx: number, sy: number): Zone {
    const high = sy < this.host.viewH() * LIFT_BAND;
    const right = sx > this.host.viewW() / 2;
    if (high) return right ? 'liftGo' : 'lift';
    return right ? 'go' : 'brake';
  }

  private down = (e: PointerEvent): void => {
    e.preventDefault();
    this.host.onAnyInput();
    const s = this.host.toDesign(e.clientX, e.clientY);
    const w = this.host.toWorld(s.x, s.y);
    let st: PointerState;
    if (this.host.hitCar(w.x, w.y)) {
      const c = this.host.carPos();
      st = { role: 'car', startX: s.x, startY: s.y, dragging: false, offX: c.x - w.x, offAlt: c.alt + w.y, lastX: s.x, lastY: s.y };
    } else {
      // Tapping a thing answers it, and the touch still drives (zones never get blocked).
      const thing = this.host.tapThing(w.x, w.y);
      const zone = this.zoneFor(s.x, s.y);
      this.host.onZoneTouch(s.x, s.y, zone, w.x, w.y, thing);
      st = { role: zone, startX: s.x, startY: s.y, dragging: false, offX: 0, offAlt: 0, lastX: s.x, lastY: s.y };
    }
    this.pointers.set(e.pointerId, st);
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* not all browsers allow capture here */
    }
  };

  private move = (e: PointerEvent): void => {
    const st = this.pointers.get(e.pointerId);
    if (!st) return;
    const s = this.host.toDesign(e.clientX, e.clientY);
    st.lastX = s.x;
    st.lastY = s.y;
    if (st.role === 'car' && !st.dragging && Math.hypot(s.x - st.startX, s.y - st.startY) > DRAG_START) {
      st.dragging = true;
      this.host.onCarGrab();
    }
    if (st.dragging) this.host.onAnyInput();
  };

  private up = (e: PointerEvent): void => {
    const st = this.pointers.get(e.pointerId);
    if (!st) return;
    this.pointers.delete(e.pointerId);
    if (st.role === 'car' && !st.dragging) this.host.onCarTap();
  };

  private keyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (['arrowright', 'arrowleft', 'arrowup', ' ', 'd', 'a', 'w', 'h'].includes(k)) e.preventDefault();
    this.keys.add(k);
    this.host.onAnyInput();
    if (k === 'h') this.host.onCarTap();
  };

  private keyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  /** Desired car position while it is being dragged, or null. */
  hold(): { x: number; alt: number } | null {
    for (const st of this.pointers.values()) {
      if (st.role === 'car' && st.dragging) {
        const w = this.host.toWorld(st.lastX, st.lastY);
        return { x: w.x + st.offX, alt: -w.y + st.offAlt };
      }
    }
    return null;
  }

  state(): { throttle: boolean; brake: boolean; lift: boolean } {
    let throttle = this.keys.has('arrowright') || this.keys.has('d');
    let brake = this.keys.has('arrowleft') || this.keys.has('a');
    let lift = this.keys.has('arrowup') || this.keys.has(' ') || this.keys.has('w');
    for (const st of this.pointers.values()) {
      // Zones follow the finger as it slides.
      if (st.role === 'car') continue;
      const z = this.zoneFor(st.lastX, st.lastY);
      if (z === 'go' || z === 'liftGo') throttle = true;
      if (z === 'brake') brake = true;
      if (z === 'lift' || z === 'liftGo') lift = true;
    }
    return { throttle, brake: brake && !throttle, lift };
  }

  get touching(): boolean {
    return this.pointers.size > 0;
  }
}
