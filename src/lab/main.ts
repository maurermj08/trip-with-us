// Vehicle Lab (dev only, `npm run lab`): preview vehicle art exactly as the game renders it,
// compare with reference photos, try paints/wheels/accessories, and see validator output.
// Saving an SVG in Illustrator reloads this page automatically (Vite watches art/).
import '@fontsource/overpass/700.css';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { art } from '../vehicle/art/registry';
import { buildVehicle, pixelsPerUnit, type VehicleBuild } from '../vehicle/art/VehicleBuild';
import { VehicleView } from '../vehicle/VehicleView';
import { defaultChoice, SLOT_IDS, type VehicleChoice } from '../vehicle/art/schema';
import { validateVehicle } from '../vehicle/art/validate';
import { browserDom } from '../vehicle/art/svgDoc';
import { rasterStats } from '../vehicle/art/rasterize';

interface RefInfo { image: string; wheelFront: [number, number]; wheelRear: [number, number]; flipX?: boolean }
const refs = import.meta.glob<RefInfo>('/art/vehicles/*/reference.json', { eager: true, import: 'default' });

const params = new URLSearchParams(location.search);
const state = {
  vehicleId: params.get('car') ?? [...art.vehicles.keys()][0],
  choice: null as VehicleChoice | null,
  zoom: 2.4,
  speed: 0,
  wet: 0,
  mud: 0,
  pitch: 0,
  braking: false,
  hazards: false,
  anchors: params.has('anchors'),
  trueProps: params.has('true'),
  refOn: params.has('ref'),
  refAlpha: Number(params.get('alpha') ?? 0.5),
  magenta: false,
  lineup: !params.has('solo'),
};

const app = new Application();
await app.init({ resizeTo: document.getElementById('stage')!, antialias: true, background: 0xeef2f6, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
document.getElementById('stage')!.appendChild(app.canvas);
(window as unknown as { lab: unknown }).lab = { state, rebuild: () => rebuild(), get view() { return view; }, get build() { return build; } };

const world = new Container();
app.stage.addChild(world);
let build: VehicleBuild | null = null;
let view: VehicleView | null = null;
const overlay = new Graphics();
const refLayer = new Container();
const lineup = new Container();
let distance = 0;

const panel = document.getElementById('panel')!;

function choice(): VehicleChoice {
  if (!state.choice || state.choice.vehicleId !== state.vehicleId) {
    state.choice = defaultChoice(art.vehicle(state.vehicleId));
    // ?acc=roof-box,black-pack&wheel=steelie (handy for screenshots)
    if (params.get('acc')) state.choice.accessoryIds = params.get('acc')!.split(',');
    if (params.get('wheel')) state.choice.wheelId = params.get('wheel')!;
  }
  return state.choice;
}

async function rebuild(): Promise<void> {
  const c = { ...choice() };
  const def = art.vehicle(c.vehicleId);
  if (state.magenta) {
    // Recolor test: every slot goes loud so un-tokened colors stand out.
    const test = { ...def, paints: [{ id: 'magenta', name: 'test', swatch: '#ff00ff', slots: Object.fromEntries(SLOT_IDS.map((s) => [s, '#ff00ff'])) }] };
    art.vehicles.set(def.id, test);
    c.paintId = 'magenta';
  }
  const ppu = pixelsPerUnit(state.zoom, app.renderer.resolution);
  const next = await buildVehicle(art, c, ppu);
  if (state.magenta) art.vehicles.set(def.id, def);
  view?.destroy({ children: true });
  build?.destroy();
  build = next;
  view = new VehicleView(build, { trueProportions: state.trueProps });
  world.removeChildren();
  world.addChild(view, refLayer, overlay);
  await drawRef();
  drawOverlay();
  await drawLineup();
  renderPanel();
}

async function drawRef(): Promise<void> {
  refLayer.removeChildren();
  const ref = refs[`/art/vehicles/${state.vehicleId}/reference.json`];
  if (!ref || !state.refOn || !build) return;
  let tex: Texture;
  try {
    tex = await Assets.load<Texture>('/' + ref.image);
  } catch {
    return;
  }
  const m = build.measure;
  // Align photo wheel centers to the art's wheel centers (true proportions).
  const [front, rear] = m.wheels;
  const s = Math.abs(front.x - rear.x) / Math.abs(ref.wheelFront[0] - ref.wheelRear[0]);
  const sx = ref.flipX ? -s : s;
  const sp = new Sprite(tex);
  sp.scale.set(sx, s);
  sp.position.set(front.x - ref.wheelFront[0] * sx, front.y - ref.wheelFront[1] * s);
  sp.alpha = state.refAlpha;
  refLayer.addChild(sp);
}

function drawOverlay(): void {
  overlay.clear();
  overlay.rect(-400, 0, 800, 1).fill(0x00b7ff);
  if (!state.anchors || !view) return;
  const d = view.dims;
  overlay.rect(-d.half, -d.height, d.length, d.height).stroke({ width: 1, color: 0xff00ff, alpha: 0.6 });
  for (const w of d.wheels) overlay.circle(w.x, w.y, w.r).stroke({ width: 1, color: 0x00c853 });
  overlay.circle(d.head.x, d.head.y, 4).fill(0xffd600);
  overlay.circle(d.tail.x, d.tail.y, 4).fill(0xff1744);
  for (const h of d.hazards) overlay.circle(h.x, h.y, 3).fill(0xff9100);
  overlay.rect(d.roof.x - d.roof.len / 2, d.roof.y - 1, d.roof.len, 2).fill(0x2979ff);
  overlay.circle(d.exhaust.x, d.exhaust.y, 3).fill(0x616161);
  overlay.circle(d.hitch.x, d.hitch.y, 3).fill(0x6d4c41);
}

async function drawLineup(): Promise<void> {
  lineup.removeChildren().forEach((c) => c.destroy({ children: true }));
  if (!state.lineup) return;
  let x = 0;
  for (const def of art.vehicles.values()) {
    const b = await buildVehicle(art, defaultChoice(def), pixelsPerUnit(1, app.renderer.resolution));
    const v = new VehicleView(b);
    v.position.set(x + b.dims.half, 0);
    x += b.dims.length + 40;
    lineup.addChild(v);
  }
  lineup.pivot.set(x / 2, 0);
}

function layout(): void {
  const w = app.renderer.width / app.renderer.resolution, h = app.renderer.height / app.renderer.resolution;
  world.position.set(w / 2, h * (state.lineup ? 0.55 : 0.7));
  world.scale.set(state.zoom);
  lineup.position.set(w / 2, h * 0.9);
  lineup.scale.set(0.8);
  if (!lineup.parent) app.stage.addChild(lineup);
}

app.ticker.add((t) => {
  const dt = t.deltaMS / 1000;
  layout();
  if (!view) return;
  distance += state.speed * dt;
  view.wetness = state.wet;
  view.muddiness = state.mud / 1.3;
  view.braking = state.braking;
  view.setHazards(state.hazards);
  view.pitch = state.pitch;
  view.update(dt, distance, 0, false);
  view.wetness = state.wet;
  for (const c of lineup.children) (c as VehicleView).update(dt, distance, 0, false);
});

// ---------- panel ----------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}

function span(text: string, width: number): HTMLSpanElement {
  const s = el('span', { textContent: text });
  s.style.width = width + 'px';
  return s;
}

function select(label: string, options: [string, string][], value: string, on: (v: string) => void): HTMLElement {
  const s = el('select');
  for (const [v, t] of options) s.append(el('option', { value: v, textContent: t, selected: v === value }));
  s.onchange = () => on(s.value);
  return el('label', {}, span(label, 70), s);
}

function slider(label: string, min: number, max: number, step: number, value: number, on: (v: number) => void): HTMLElement {
  const i = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  const out = span(String(value), 34);
  i.oninput = () => {
    out.textContent = i.value;
    on(Number(i.value));
  };
  return el('label', {}, span(label, 70), i, out);
}

function check(label: string, value: boolean, on: (v: boolean) => void): HTMLElement {
  const i = el('input', { type: 'checkbox', checked: value });
  i.onchange = () => on(i.checked);
  return el('label', {}, i, label);
}

function renderPanel(): void {
  const def = art.vehicle(state.vehicleId);
  const c = choice();
  panel.replaceChildren();
  panel.append(el('h1', { textContent: 'i95 Vehicle Lab' }));
  panel.append(select('Vehicle', [...art.vehicles.values()].map((v) => [v.id, `${art.brands.get(v.brand)?.name ?? v.brand} ${v.year} ${v.model}`]), state.vehicleId, (v) => {
    state.vehicleId = v;
    void rebuild();
  }));
  panel.append(select('Paint', def.paints.map((p) => [p.id, p.name]), c.paintId, (v) => ((c.paintId = v), void rebuild())));
  panel.append(select('Wheels', def.wheels.options.map((w) => [w, art.wheels.get(w)?.name ?? w]), c.wheelId, (v) => ((c.wheelId = v), void rebuild())));
  panel.append(el('h2', { textContent: 'Accessories' }));
  for (const id of def.accessories) {
    const a = art.accessories.get(id)!;
    panel.append(check(a.name, c.accessoryIds.includes(id), (on) => {
      c.accessoryIds = on ? [...c.accessoryIds.filter((x) => !(a.excludes ?? []).includes(x)), id] : c.accessoryIds.filter((x) => x !== id);
      void rebuild();
    }));
  }
  panel.append(el('h2', { textContent: 'Animate' }));
  panel.append(slider('Speed', 0, 900, 10, state.speed, (v) => (state.speed = v)));
  panel.append(slider('Pitch', -0.3, 0.3, 0.01, state.pitch, (v) => (state.pitch = v)));
  panel.append(slider('Wet', 0, 1, 0.05, state.wet, (v) => (state.wet = v)));
  panel.append(slider('Mud', 0, 1, 0.05, state.mud, (v) => (state.mud = v)));
  panel.append(slider('Zoom', 0.8, 4, 0.1, state.zoom, (v) => {
    state.zoom = v;
  }));
  const row = el('div', { className: 'row' });
  row.append(
    el('button', { textContent: 'Bounce', onclick: () => view?.bounce(60) }),
    el('button', { textContent: 'Lights', onclick: () => view?.flashLights() }),
    el('button', { textContent: 'Brake', onclick: () => (state.braking = !state.braking) }),
    el('button', { textContent: 'Hazards', onclick: () => (state.hazards = !state.hazards) }),
    el('button', { textContent: 'Re-render', onclick: () => void rebuild() }),
  );
  panel.append(row);
  panel.append(el('h2', { textContent: 'Overlays' }));
  panel.append(check('Anchors & size box', state.anchors, (v) => ((state.anchors = v), drawOverlay())));
  panel.append(check('True proportions (no squash)', state.trueProps, (v) => ((state.trueProps = v), void rebuild())));
  panel.append(check('Reference photo (dev only)', state.refOn, (v) => ((state.refOn = v), void drawRef())));
  panel.append(slider('Photo', 0, 1, 0.05, state.refAlpha, (v) => {
    state.refAlpha = v;
    for (const s of refLayer.children) s.alpha = v;
  }));
  panel.append(check('Recolor test (all slots magenta)', state.magenta, (v) => ((state.magenta = v), void rebuild())));
  panel.append(check('Show lineup', state.lineup, (v) => ((state.lineup = v), void drawLineup())));

  panel.append(el('h2', { textContent: 'Validation' }));
  void art.vehicleSvg(def.id).then((svg) => {
    const r = validateVehicle(svg, def, browserDom);
    const pre = el('pre');
    if (!r.errors.length && !r.warnings.length) pre.append(el('span', { className: 'ok', textContent: 'All checks pass.' }));
    for (const e of r.errors) pre.append(el('div', { className: 'err', textContent: 'ERROR ' + e }));
    for (const w of r.warnings) pre.append(el('div', { className: 'warn', textContent: 'warn ' + w }));
    validation.replaceChildren(pre);
  });
  const validation = el('div');
  panel.append(validation);

  if (build) {
    const d = build.dims;
    panel.append(el('h2', { textContent: 'In-game size' }));
    panel.append(el('pre', { textContent: `length ${d.length.toFixed(0)}  height ${d.height.toFixed(0)}  wheel r ${d.wheels[0].r.toFixed(1)}\nppu ${build.body.tex.source.resolution}  live textures ${rasterStats().liveTextures}` }));
  }
  panel.append(el('h2', { textContent: 'Files to edit' }));
  const files = el('div', { id: 'files' });
  files.innerHTML = [
    `<code>art/vehicles/${def.id}/art.svg</code>  (Illustrator)`,
    `<code>art/vehicles/${def.id}/vehicle.json</code>  (colors, wheels, accessories)`,
    `<code>art/vehicles/${def.id}/spec.json</code>  (generator input)`,
    `<code>art/wheels/${c.wheelId}.svg</code>`,
  ].join('<br>');
  panel.append(files);
}

await rebuild();
