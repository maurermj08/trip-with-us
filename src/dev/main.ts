// /dev: the kitchen-sink sandbox. Browse every vehicle, part, prop, sign, landmark, city piece,
// background, scene, effect and sound; run their interactions; zoom/pan; copy reference IDs.
import '@fontsource/overpass/700.css';
import '@fontsource/overpass/800.css';
import '@fontsource/overpass/900.css';
import { Application } from 'pixi.js';
import { Sandbox, type Backdrop, type Context } from './Sandbox';
import { buildCatalog, type DevItem } from './catalog';
import { applyParams, configId, parseId, type Cfg, type Field } from './ids';
import { art } from '../vehicle/art/registry';

const $ = (id: string) => document.getElementById(id)!;

/** Tiny DOM builder: props are assigned (class/style become attributes). */
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string | null)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = String(v);
    else if (k === 'style') e.setAttribute('style', String(v));
    else (e as unknown as Record<string, unknown>)[k] = v;
  }
  for (const k of kids) if (k !== null) e.append(k);
  return e;
}

function toast(msg: string): void {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1200);
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Copied: ' + text);
}

// ---------- boot ----------

await Promise.race([Promise.all(['700', '800', '900'].map((w) => document.fonts.load(`${w} 32px Overpass`))), new Promise((r) => setTimeout(r, 2500))]);

const stage = $('stage');
const app = new Application();
await app.init({ resizeTo: stage, antialias: true, background: 0xeef2f6, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
stage.prepend(app.canvas);
const sandbox = new Sandbox(app);
const vehicleIds = [...art.vehicles.keys()];
const DEFAULT_CAR = art.vehicles.has('mini-countryman-2019') ? 'mini-countryman-2019' : vehicleIds[0];
await sandbox.init(DEFAULT_CAR);

const catalog = buildCatalog();
const byId = new Map(catalog.map((i) => [i.id, i]));

/** Settings every item gets: world context and the test car (both part of the config ID). */
function viewFields(item: DevItem): Field[] {
  return [
    { key: 'ctx', label: 'Context', type: 'select', options: [['none', 'Plain'], ['road', 'Road'], ['scene', 'Full scene']], default: item.context ?? 'none' },
    { key: 'car', label: 'Test car', type: 'select', options: vehicleIds.map((v) => [v, art.vehicle(v).model]), default: DEFAULT_CAR },
  ];
}

const allFields = (item: DevItem) => [...(item.fields ?? []), ...viewFields(item)];

const state = {
  item: catalog[0],
  cfg: {} as Cfg,
  gen: 0,
  /** Selected named part, e.g. "body/mirror" (vehicles). */
  part: null as string | null,
};

// ---------- loading items ----------

async function load(item: DevItem, cfg: Cfg, refit: boolean): Promise<void> {
  const gen = ++state.gen;
  state.item = item;
  state.cfg = cfg;
  sandbox.clear();
  sandbox.context = cfg.ctx as Context;
  if (cfg.car !== undefined && sandbox.ctx.carView.build.def.id !== cfg.car) await sandbox.setTestVehicle(String(cfg.car));
  let built;
  try {
    built = await item.build(sandbox, cfg);
  } catch (e) {
    console.error(e);
    renderInspector(String(e));
    return;
  }
  if (gen !== state.gen) {
    built.destroy?.();
    return;
  }
  sandbox.show(built, cfg, refit);
  sandbox.onZoomRebuild = () => void load(state.item, state.cfg, false);
  if (state.part && !built.parts?.some((p) => p.path === state.part)) state.part = null;
  if (!built.parts) sandbox.pickPart = false;
  built.setPart?.(state.part);
  renderSidebarActive();
  renderInspector();
  syncIds();
}

/** Open an item by Object ID or Config ID (also accepts a full /dev/#… URL). */
function open(id: string): boolean {
  const { objectId, params } = parseId(id.replace(/^.*#/, ''));
  const item = byId.get(objectId);
  if (!item) return false;
  state.part = params.part ? decodeURIComponent(params.part) : null;
  void load(item, applyParams(allFields(item), params), true);
  return true;
}

function ids(): { object: string; config: string; part: string | null } {
  const config = configId(state.item.id, allFields(state.item), state.cfg);
  const part = state.part ? `${config}${config.includes('?') ? '&' : '?'}part=${state.part}` : null;
  return { object: state.item.id, config, part };
}

function syncIds(): void {
  const { object, config, part } = ids();
  const oi = document.getElementById('obj-id') as HTMLTextAreaElement | null;
  const ci = document.getElementById('cfg-id') as HTMLTextAreaElement | null;
  const pi = document.getElementById('part-id') as HTMLTextAreaElement | null;
  if (oi) (oi.value = object), fitArea(oi);
  if (ci) (ci.value = config), fitArea(ci);
  if (pi) (pi.value = part ?? ''), fitArea(pi);
  history.replaceState(null, '', '#' + (part ?? config));
}

/** Select (or clear) a named part: highlight it and update the part reference ID. */
function selectPart(path: string | null): void {
  state.part = path;
  sandbox.current?.setPart?.(path);
  for (const [p, b] of partButtons) b.classList.toggle('active', p === path);
  syncIds();
}

/** Grow a read-only ID box so long config IDs are fully visible. */
function fitArea(t: HTMLTextAreaElement): void {
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 2 + 'px';
}

function setField(f: Field, v: Cfg[string]): void {
  state.cfg = { ...state.cfg, [f.key]: v };
  if (f.live) {
    sandbox.setCfg(state.cfg);
    syncIds();
  } else {
    void load(state.item, state.cfg, f.key === 'ctx');
  }
}

// ---------- toolbar ----------

function toolbar(): void {
  const tb = $('toolbar');
  const zoomOut = h('button', { title: 'Zoom out (-)', onclick: () => sandbox.setZoom(sandbox.zoom() / 1.25) }, '−');
  const zoomIn = h('button', { title: 'Zoom in (+)', onclick: () => sandbox.setZoom(sandbox.zoom() * 1.25) }, '+');
  const zoomRange = h('input', { type: 'range', min: '-3', max: '2.08', step: '0.01', style: 'width:120px', oninput: () => sandbox.setZoom(Math.exp(Number(zoomRange.value))) }) as HTMLInputElement;
  const fit = h('button', { title: 'Fit item (F)', onclick: () => sandbox.fit() }, 'Fit');
  const one = h('button', { title: 'Actual size (0)', onclick: () => sandbox.setZoom(1) }, '1:1');

  const backdrop = h('select', { onchange: () => (sandbox.backdrop = backdrop.value as Backdrop) }) as HTMLSelectElement;
  for (const [v, t] of [['plain', 'Plain'], ['checker', 'Checker'], ['sky', 'Game sky']]) backdrop.append(h('option', { value: v }, t));

  const toggle = (label: string, title: string, get: () => boolean, set: (v: boolean) => void) => {
    const b = h('button', { title, onclick: () => (set(!get()), b.classList.toggle('on', get())) }, label);
    b.classList.toggle('on', get());
    return b;
  };

  const goto = h('input', { type: 'text', placeholder: 'Paste a reference ID…', style: 'width:220px' }) as HTMLInputElement;
  const go = () => {
    if (!open(goto.value)) toast('Unknown ID: ' + goto.value);
    else goto.value = '';
  };
  goto.addEventListener('keydown', (e) => e.key === 'Enter' && go());

  const drive = toggle('Drive (← → ↑)', 'Drive the test car with the keyboard', () => sandbox.keyDrive, (v) => {
    sandbox.keyDrive = v;
    if (v) {
      const f = sandbox.current?.focus;
      sandbox.testCar.park(f ? f.x - 160 : 0);
      sandbox.follow = true;
    }
  });
  const pause = toggle('Pause', 'Pause animation', () => sandbox.paused, (v) => (sandbox.paused = v));
  const speed = h('select', { title: 'Time scale', onchange: () => (sandbox.timeScale = Number(speed.value)) }) as HTMLSelectElement;
  for (const s of ['1', '0.5', '0.25', '2']) speed.append(h('option', { value: s }, `${s}×`));

  tb.append(
    h('span', { class: 'brand' }, 'i95 /dev'),
    h('div', { class: 'group' }, goto, h('button', { class: 'primary', onclick: go }, 'Go')),
    h('div', { class: 'group' }, h('label', {}, 'Zoom'), zoomOut, zoomRange, zoomIn, fit, one),
    h('div', { class: 'group' }, h('label', {}, 'Backdrop'), backdrop,
      toggle('Ground', 'Ground line', () => sandbox.showGround, (v) => (sandbox.showGround = v)),
      toggle('Bounds', 'Hit boxes (magenta), drive-through zones (orange), focus (green)', () => sandbox.showBounds, (v) => (sandbox.showBounds = v)),
      toggle('Grid', 'World grid', () => sandbox.showGrid, (v) => (sandbox.showGrid = v))),
    h('div', { class: 'group' }, h('label', {}, 'Test car'), drive,
      toggle('Follow', 'Camera follows the test car while it drives', () => sandbox.follow, (v) => (sandbox.follow = v))),
    h('div', { class: 'group' }, pause, speed),
  );

  // Keep the zoom slider in sync with wheel/pinch zooming.
  app.ticker.add(() => {
    if (document.activeElement !== zoomRange) zoomRange.value = String(Math.log(sandbox.zoom()));
    $('hud').textContent = `${Math.round(sandbox.zoom() * 100)}% · x ${Math.round(sandbox.cx)} y ${Math.round(sandbox.cy)} · drag to pan · wheel/pinch to zoom · click to interact`;
  });
}

// ---------- sidebar ----------

const itemButtons = new Map<string, HTMLButtonElement>();

function sidebar(): void {
  const sb = $('sidebar');
  const search = h('input', { type: 'search', placeholder: 'Search items…' }) as HTMLInputElement;
  sb.append(search);
  const groups = new Map<string, DevItem[]>();
  for (const it of catalog) groups.set(it.category, [...(groups.get(it.category) ?? []), it]);
  const sections: { det: HTMLDetailsElement; items: [DevItem, HTMLButtonElement][] }[] = [];
  for (const [cat, items] of groups) {
    const det = h('details', { open: true }) as HTMLDetailsElement;
    det.append(h('summary', {}, cat, h('span', { class: 'count' }, String(items.length))));
    const list: [DevItem, HTMLButtonElement][] = [];
    for (const it of items) {
      const b = h('button', { class: 'item', title: it.id, onclick: () => open(it.id) }, it.label) as HTMLButtonElement;
      itemButtons.set(it.id, b);
      det.append(b);
      list.push([it, b]);
    }
    sb.append(det);
    sections.push({ det, items: list });
  }
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    for (const s of sections) {
      let any = false;
      for (const [it, b] of s.items) {
        const hit = !q || it.label.toLowerCase().includes(q) || it.id.includes(q);
        b.style.display = hit ? '' : 'none';
        any ||= hit;
      }
      s.det.style.display = any ? '' : 'none';
      if (q) s.det.open = true;
    }
  });
}

function renderSidebarActive(): void {
  for (const [id, b] of itemButtons) b.classList.toggle('active', id === state.item.id);
  itemButtons.get(state.item.id)?.scrollIntoView({ block: 'nearest' });
}

// ---------- inspector ----------

function fieldControl(f: Field): HTMLElement {
  const v = state.cfg[f.key];
  switch (f.type) {
    case 'select': {
      const s = h('select', { onchange: () => setField(f, s.value) }) as HTMLSelectElement;
      for (const [val, label] of f.options) s.append(h('option', { value: val, selected: val === v }, label));
      return h('div', { class: 'field' }, h('span', {}, f.label), s, h('span'));
    }
    case 'multi': {
      const box = h('div', { class: 'multi' });
      for (const [val, label] of f.options) {
        const c = h('input', { type: 'checkbox', checked: (v as string[]).includes(val) }) as HTMLInputElement;
        c.onchange = () => {
          const cur = new Set(state.cfg[f.key] as string[]);
          if (c.checked) cur.add(val);
          else cur.delete(val);
          setField(f, [...cur]);
        };
        box.append(h('label', {}, c, ' ', label));
      }
      return h('div', { class: 'field' }, h('span', {}, f.label), box, h('span'));
    }
    case 'range': {
      const out = h('span', { class: 'val' }, String(v));
      const r = h('input', { type: 'range', min: String(f.min), max: String(f.max), step: String(f.step), value: String(v) }) as HTMLInputElement;
      r.oninput = () => {
        out.textContent = r.value;
        if (f.live) setField(f, Number(r.value));
      };
      r.onchange = () => !f.live && setField(f, Number(r.value));
      return h('div', { class: 'field' }, h('span', {}, f.label), r, out);
    }
    case 'bool': {
      const c = h('input', { type: 'checkbox', checked: !!v, onchange: () => setField(f, c.checked) }) as HTMLInputElement;
      return h('label', { class: 'field check' }, c, f.label);
    }
    case 'color': {
      const c = h('input', { type: 'color', value: String(v), onchange: () => setField(f, c.value) }) as HTMLInputElement;
      return h('div', { class: 'field' }, h('span', {}, f.label), c, h('span'));
    }
  }
}

function renderInspector(error?: string): void {
  const ins = $('inspector');
  const item = state.item;
  const built = sandbox.current;
  const { object, config, part } = ids();
  const idRow = (id: string, label: string, value: string, help: string) => {
    const input = h('textarea', { id, readOnly: true, value, title: help, rows: 1, spellcheck: false, onclick: () => input.select() }) as HTMLTextAreaElement;
    queueMicrotask(() => fitArea(input));
    return h('div', {}, h('div', { class: 'idlabel' }, label), h('div', { class: 'idrow' }, input, h('button', { onclick: () => copy(input.value) }, 'Copy')));
  };
  ins.replaceChildren(
    h('h2', {}, item.label),
    h('div', { class: 'cat' }, item.category),
    h('h3', {}, 'Reference IDs'),
    idRow('obj-id', 'Object', object, 'Just this object'),
    idRow('cfg-id', 'Object + config', config, 'This object with its current settings. Paste it into "Go" (or the URL #) to restore.'),
  );
  partButtons.clear();
  if (built?.parts?.length) {
    ins.append(idRow('part-id', 'Object + config + part', part ?? '', 'Same as above, plus the selected part. Pick one in Parts below or on the canvas.'));
    if (!part) ins.append(h('div', { class: 'help' }, 'Select a part below (or turn on "Pick on canvas") to get this ID.'));
  }
  if (error) ins.append(h('pre', { class: 'info', style: 'color:var(--danger)' }, error));

  const fields = allFields(item);
  if (fields.length) {
    ins.append(h('h3', {}, 'Settings'));
    for (const f of fields) ins.append(fieldControl(f));
    ins.append(h('button', { onclick: () => void load(item, applyParams(fields, {}), false) }, 'Reset settings'));
  }
  if (built?.actions?.length) {
    ins.append(h('h3', {}, 'Actions'));
    ins.append(h('div', { class: 'actions' }, ...built.actions.map((a) => h('button', { onclick: () => {
      sandbox.synth.unlock();
      a.run();
    } }, a.label))));
  }
  if (built?.parts?.length) {
    const pick = h('button', { title: 'Click the canvas to select the part under the cursor', onclick: () => {
      sandbox.pickPart = !sandbox.pickPart;
      pick.classList.toggle('on', sandbox.pickPart);
    } }, 'Pick on canvas');
    pick.classList.toggle('on', sandbox.pickPart);
    const list = h('div', { class: 'parts' });
    for (const p of built.parts) {
      const b = h('button', {
        class: 'part' + (p.path === state.part ? ' active' : ''),
        title: p.path,
        style: `padding-left:${8 + p.depth * 14}px`,
        onclick: () => selectPart(p.path === state.part ? null : p.path),
        onmouseenter: () => built.setPart?.(p.path),
        onmouseleave: () => built.setPart?.(state.part),
      }, p.path.split('/').pop()!) as HTMLButtonElement;
      partButtons.set(p.path, b);
      list.append(b);
    }
    ins.append(
      h('h3', {}, 'Parts'),
      h('div', { class: 'actions', style: 'margin-bottom:6px' }, pick, h('button', { onclick: () => selectPart(null) }, 'Clear')),
      list,
    );
  }
  const info = built?.info?.();
  if (info) ins.append(h('h3', {}, 'Info'), h('pre', { class: 'info' }, info));
  ins.append(
    h('h3', {}, 'Tips'),
    h('div', { class: 'help' }, 'Click things on the canvas to tap them, like in the game. Drag to pan; wheel or pinch to zoom. Keys: [ ] previous/next item · F fit · 0 actual size · + / − zoom · Esc clear part. Turn on "Drive" to drive the test car with ← → ↑ / space.'),
  );
}

const partButtons = new Map<string, HTMLButtonElement>();
sandbox.onPartPicked = (path) => {
  selectPart(path);
  partButtons.get(path)?.scrollIntoView({ block: 'nearest' });
};

// ---------- keyboard ----------

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input,select,textarea')) return;
  if (sandbox.keyDrive && ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) return;
  const i = catalog.indexOf(state.item);
  if (e.key === 'Escape') selectPart(null);
  else if (e.key === ']') open(catalog[(i + 1) % catalog.length].id);
  else if (e.key === '[') open(catalog[(i - 1 + catalog.length) % catalog.length].id);
  else if (e.key === 'f' || e.key === 'F') sandbox.fit();
  else if (e.key === '0') sandbox.setZoom(1);
  else if (e.key === '+' || e.key === '=') sandbox.setZoom(sandbox.zoom() * 1.25);
  else if (e.key === '-') sandbox.setZoom(sandbox.zoom() / 1.25);
});

window.addEventListener('hashchange', () => {
  const want = location.hash.slice(1);
  const cur = ids();
  if (want && decodeURIComponent(want) !== (cur.part ?? cur.config)) open(decodeURIComponent(want));
});

toolbar();
sidebar();
if (!location.hash || !open(decodeURIComponent(location.hash.slice(1)))) open(catalog[0].id);

(window as unknown as { dev: unknown }).dev = { sandbox, catalog, open, ids, get state() { return state; } };
